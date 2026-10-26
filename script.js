const STORAGE_KEY = "todos";
const ERROR_DURATION_MS = 2000;

const form = document.querySelector("#todo-form");
const input = document.querySelector("#todo-input");
const dueDateInput = document.querySelector("#todo-due-date");
const errorMessage = document.querySelector("#input-error");
const todoList = document.querySelector("#todo-list");
const emptyState = document.querySelector("#empty-state");
const progressText = document.querySelector("#progress-text");
const progressBar = document.querySelector('[role="progressbar"]');
const progressFill = document.querySelector("#progress-fill");
const filterButtons = document.querySelectorAll("[data-filter]");
const deleteDialog = document.querySelector("#delete-dialog");
const deleteDialogMessage = document.querySelector("#delete-dialog-message");

let todos = loadTodos();
let activeFilter = "ALL";
let errorTimerId;
let pendingDeleteId;

function isTodoItem(value) {
  return (
    value !== null &&
    typeof value === "object" &&
    typeof value.id === "string" &&
    typeof value.text === "string" &&
    typeof value.done === "boolean" &&
    typeof value.createdAt === "number"
  );
}

function loadTodos() {
  const storedTodos = localStorage.getItem(STORAGE_KEY);

  if (storedTodos === null) {
    return [];
  }

  try {
    const parsedTodos = JSON.parse(storedTodos);
    return Array.isArray(parsedTodos) ? parsedTodos.filter(isTodoItem) : [];
  } catch (error) {
    console.warn('저장된 할 일 데이터를 읽을 수 없어 빈 목록으로 시작합니다.', error);
    return [];
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch (error) {
    console.error('할 일 목록을 localStorage에 저장하지 못했습니다.', error);
  }
}

function clearInputError() {
  window.clearTimeout(errorTimerId);
  errorTimerId = undefined;
  errorMessage.textContent = "";
  errorMessage.classList.add("hidden");
}

function showInputError() {
  window.clearTimeout(errorTimerId);
  errorMessage.textContent = "할 일을 입력해주세요";
  errorMessage.classList.remove("hidden");
  errorTimerId = window.setTimeout(clearInputError, ERROR_DURATION_MS);
}

function addTodo() {
  const text = input.value.trim();

  if (!text) {
    showInputError();
    input.focus();
    return;
  }

  todos.unshift({
    id: crypto.randomUUID(),
    text,
    done: false,
    createdAt: Date.now(),
    dueDate: dueDateInput.value,
  });

  input.value = "";
  dueDateInput.value = "";
  clearInputError();
  saveTodos();
  render();
  input.focus();
}

function getVisibleTodos() {
  if (activeFilter === "ACTIVE") {
    return todos.filter((todo) => !todo.done);
  }

  if (activeFilter === "COMPLETED") {
    return todos.filter((todo) => todo.done);
  }

  return todos;
}

function updateProgress() {
  const completedCount = todos.filter((todo) => todo.done).length;
  const percentage =
    todos.length === 0 ? 0 : Math.round((completedCount / todos.length) * 100);

  progressText.textContent = `완료 ${completedCount} / 전체 ${todos.length} (${percentage}%)`;
  progressFill.style.width = `${percentage}%`;
  progressBar.setAttribute("aria-valuenow", String(percentage));
}

function createTodoElement(todo) {
  const item = document.createElement("li");
  item.className =
    "todo-item flex min-w-0 items-center gap-3 rounded-lg border px-3 py-2";

  const label = document.createElement("label");
  label.className = "flex min-h-11 min-w-0 flex-1 cursor-pointer items-center gap-3";

  const checkbox = document.createElement("input");
  checkbox.className = "h-5 w-5 shrink-0 accent-rose-500";
  checkbox.type = "checkbox";
  checkbox.checked = todo.done;
  checkbox.setAttribute("aria-label", `${todo.text} 완료`);
  checkbox.addEventListener("change", () => {
    const targetTodo = todos.find((itemTodo) => itemTodo.id === todo.id);
    if (!targetTodo) {
      return;
    }

    targetTodo.done = checkbox.checked;
    if (checkbox.checked) {
      createCompletionEffect(checkbox);
    }
    saveTodos();
    render();
  });

  const details = document.createElement("span");
  details.className = "flex min-w-0 flex-1 flex-col gap-1";

  const text = document.createElement("span");
  text.className = "todo-text min-w-0 text-sm";
  text.textContent = todo.text;
  if (todo.done) {
    text.classList.add("text-slate-400", "line-through");
  } else {
    text.classList.add("text-slate-800");
  }

  if (
    typeof todo.dueDate === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(todo.dueDate)
  ) {
    const dueDate = document.createElement("time");
    dueDate.className = "todo-date";
    dueDate.dateTime = todo.dueDate;
    dueDate.textContent = `마감 · ${todo.dueDate.replaceAll("-", ". ")}`;
    details.append(text, dueDate);
  } else {
    details.append(text);
  }
  label.append(checkbox, details);

  const deleteButton = document.createElement("button");
  deleteButton.className =
    "min-h-11 min-w-11 shrink-0 rounded-lg border border-red-300 px-2 text-sm font-medium text-red-600 transition hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500";
  deleteButton.type = "button";
  deleteButton.textContent = "삭제";
  deleteButton.setAttribute("aria-label", `${todo.text} 삭제`);
  deleteButton.addEventListener("click", () => {
    pendingDeleteId = todo.id;
    deleteDialogMessage.textContent = `“${todo.text}” 할 일을 목록에서 삭제합니다.`;
    deleteDialog.returnValue = "";
    deleteDialog.showModal();
  });

  item.append(label, deleteButton);
  return item;
}

function createCompletionEffect(anchor) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }

  const colors = ["#fb7185", "#f9a8d4", "#fbbf24", "#a78bfa", "#6ee7b7"];
  const bounds = anchor.getBoundingClientRect();

  colors.concat(colors, colors).forEach((color, index) => {
    const particle = document.createElement("span");
    particle.className = "confetti-piece";
    particle.setAttribute("aria-hidden", "true");
    particle.style.left = `${bounds.left + bounds.width / 2}px`;
    particle.style.top = `${bounds.top + bounds.height / 2}px`;
    particle.style.setProperty("--confetti-color", color);
    particle.style.setProperty("--confetti-x", `${(index % 6 - 2.5) * 13}px`);
    particle.style.setProperty(
      "--confetti-y",
      `${-24 - Math.floor(index / 6) * 12}px`,
    );
    particle.addEventListener("animationend", () => particle.remove(), {
      once: true,
    });
    document.body.append(particle);
  });
}

function updateFilters() {
  filterButtons.forEach((button) => {
    const isActive = button.dataset.filter === activeFilter;
    button.setAttribute("aria-pressed", String(isActive));
    button.classList.toggle("bg-rose-400", isActive);
    button.classList.toggle("border-rose-400", isActive);
    button.classList.toggle("border-rose-200", !isActive);
    button.classList.toggle("text-white", isActive);
    button.classList.toggle("text-rose-800", !isActive);
    button.classList.toggle("hover:bg-rose-50", !isActive);
  });
}

function updateEmptyState(visibleTodos) {
  if (todos.length === 0) {
    emptyState.textContent = "아직 할 일이 없어요. 위에서 추가해보세요!";
  } else if (activeFilter === "ACTIVE" && visibleTodos.length === 0) {
    emptyState.textContent = "진행 중인 할 일이 없어요.";
  } else if (activeFilter === "COMPLETED" && visibleTodos.length === 0) {
    emptyState.textContent = "완료한 할 일이 없어요.";
  } else {
    emptyState.textContent = "";
  }

  const shouldShowEmptyState = emptyState.textContent !== "";
  emptyState.classList.toggle("hidden", !shouldShowEmptyState);
  emptyState.classList.toggle("flex", shouldShowEmptyState);
}

function render() {
  const visibleTodos = getVisibleTodos();
  todoList.replaceChildren(...visibleTodos.map(createTodoElement));
  updateProgress();
  updateFilters();
  updateEmptyState(visibleTodos);
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  addTodo();
});

input.addEventListener("input", clearInputError);

filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    activeFilter = button.dataset.filter;
    render();
  });
});

deleteDialog.addEventListener("close", () => {
  if (deleteDialog.returnValue === "confirm" && pendingDeleteId !== undefined) {
    todos = todos.filter((todo) => todo.id !== pendingDeleteId);
    saveTodos();
    render();
  }

  pendingDeleteId = undefined;
});

render();
