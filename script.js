const STORAGE_KEY = "todos";
const ERROR_DURATION_MS = 2000;
const FILTERS = {
  ALL: "ALL",
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
};

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const errorMessage = document.querySelector("#todo-error");
const todoList = document.querySelector("#todo-list");
const emptyMessage = document.querySelector("#empty-message");
const progressText = document.querySelector("#progress-text");
const progressBar = document.querySelector("#progress-bar");
const progressContainer = document.querySelector(".progress");
const filterButtons = document.querySelectorAll(".filter-button");

let todos = loadTodos();
let selectedFilter = FILTERS.ALL;
let errorTimeoutId;

function isTodoItem(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.done === "boolean" &&
    typeof value.createdAt === "number"
  );
}

function loadTodos() {
  const savedTodos = localStorage.getItem(STORAGE_KEY);

  if (savedTodos === null) {
    return [];
  }

  try {
    const parsedTodos = JSON.parse(savedTodos);
    return Array.isArray(parsedTodos) ? parsedTodos.filter(isTodoItem) : [];
  } catch (error) {
    return [];
  }
}

function saveTodos() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
}

function clearInputError() {
  window.clearTimeout(errorTimeoutId);
  errorTimeoutId = undefined;
  errorMessage.hidden = true;
}

function showInputError() {
  window.clearTimeout(errorTimeoutId);
  errorMessage.hidden = false;
  errorTimeoutId = window.setTimeout(() => {
    errorMessage.hidden = true;
    errorTimeoutId = undefined;
  }, ERROR_DURATION_MS);
}

function getVisibleTodos() {
  if (selectedFilter === FILTERS.ACTIVE) {
    return todos.filter((todo) => !todo.done);
  }
  if (selectedFilter === FILTERS.COMPLETED) {
    return todos.filter((todo) => todo.done);
  }
  return todos;
}

function renderProgress() {
  const completedCount = todos.filter((todo) => todo.done).length;
  const percentage =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  progressText.textContent = `완료 ${completedCount} / 전체 ${todos.length} (${percentage}%)`;
  progressBar.style.width = `${percentage}%`;
  progressContainer.setAttribute("aria-valuenow", String(percentage));
}

function renderEmptyMessage(visibleTodos) {
  if (todos.length === 0) {
    emptyMessage.textContent = "아직 할 일이 없어요. 위에서 추가해보세요!";
  } else if (selectedFilter === FILTERS.ACTIVE && visibleTodos.length === 0) {
    emptyMessage.textContent = "진행 중인 할 일이 없어요.";
  } else if (selectedFilter === FILTERS.COMPLETED && visibleTodos.length === 0) {
    emptyMessage.textContent = "완료한 할 일이 없어요.";
  } else {
    emptyMessage.textContent = "";
  }

  emptyMessage.hidden = emptyMessage.textContent === "";
  todoList.hidden = !emptyMessage.hidden;
}

function createTodoElement(todo) {
  const item = document.createElement("li");
  item.className = "list-group-item d-flex align-items-center todo-item";

  const checkbox = document.createElement("input");
  checkbox.className = "form-check-input todo-checkbox";
  checkbox.type = "checkbox";
  checkbox.checked = todo.done;
  checkbox.setAttribute("aria-label", `${todo.text} 완료`);
  checkbox.addEventListener("change", () => {
    todo.done = checkbox.checked;
    saveTodos();
    render();
  });

  const text = document.createElement("span");
  text.className = "todo-text flex-grow-1";
  text.textContent = todo.text;
  text.classList.toggle("is-completed", todo.done);

  const deleteButton = document.createElement("button");
  deleteButton.className = "btn btn-outline-danger todo-delete";
  deleteButton.type = "button";
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `${todo.text} 삭제`);
  deleteButton.addEventListener("click", () => {
    todos = todos.filter((item) => item.id !== todo.id);
    saveTodos();
    render();
  });

  item.append(checkbox, text, deleteButton);
  return item;
}

function renderFilters() {
  for (const button of filterButtons) {
    const isSelected = button.dataset.filter === selectedFilter;
    button.classList.toggle("btn-primary", isSelected);
    button.classList.toggle("btn-outline-primary", !isSelected);
    button.setAttribute("aria-pressed", String(isSelected));
  }
}

function render() {
  const visibleTodos = getVisibleTodos();
  todoList.replaceChildren(...visibleTodos.map(createTodoElement));
  renderProgress();
  renderEmptyMessage(visibleTodos);
  renderFilters();
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  const text = input.value.trim();

  if (text === "") {
    showInputError();
    input.focus();
    return;
  }

  todos.unshift({
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: Date.now(),
  });
  saveTodos();
  clearInputError();
  input.value = "";
  render();
  input.focus();
});

input.addEventListener("input", clearInputError);

for (const button of filterButtons) {
  button.addEventListener("click", () => {
    selectedFilter = button.dataset.filter;
    render();
  });
}

render();
