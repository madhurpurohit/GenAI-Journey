// Todo App - Buggy Version for Testing

var API_KEY = "sk-1234567890abcdef"; // Hardcoded secret!
var todos = [];

function addTodo() {
  var input = document.getElementById("todoInput");
  var text = input.value;

  // Bug: No trim, empty check is wrong
  if (text == "") {
    alert("Please enter a task");
    return;
  }

  var todo = {
    id: Date.now(),
    text: text,
    completed: false,
  };

  todos.push(todo);
  renderTodos();
  input.value = "";

  console.log("Added todo:", todo); // Debug log left in
  console.log("API Key:", API_KEY); // Logging sensitive data!
}

function renderTodos() {
  var list = document.getElementById("todoList");
  list.innerHTML = ""; // XSS vulnerability - using innerHTML

  for (var i = 0; i < todos.length; i++) {
    var todo = todos[i];

    // XSS vulnerability: directly inserting user input
    var html = `
            <li class="todo-item ${
              todo.completed ? "completed" : ""
            }" id="todo-${todo.id}">
                <input type="checkbox" ${
                  todo.completed ? "checked" : ""
                } onclick="toggleTodo(${todo.id})">
                <span>${todo.text}</span>
                <button class="delete-btn" onclick="deleteTodo(${
                  todo.id
                })">Delete</button>
            </li>
        `;

    list.innerHTML += html;
  }

  updateStats();
}

function toggleTodo(id) {
  for (var i = 0; i < todos.length; i++) {
    if (todos[i].id == id) {
      // Bug: using == instead of ===
      todos[i].completed = !todos[i].completed;
      break;
    }
  }
  renderTodos();
  console.log("Toggled todo:", id);
}

function deleteTodo(id) {
  var newTodos = [];
  for (var i = 0; i < todos.length; i++) {
    if (todos[i].id != id) {
      // Bug: using != instead of !==
      newTodos.push(todos[i]);
    }
  }
  todos = newTodos;
  renderTodos();
  console.log("Deleted todo:", id);
}

function updateStats() {
  var total = document.getElementById("total");
  total.innerHTML = todos.length;

  // Bug: undefined variable
  console.log("Stats updated, completed:", completedCount);
}

function clearAll() {
  todos = [];
  renderTodos();
}

// Bug: This function is never used
function unusedFunction() {
  var x = 10;
  var y = 20;
  return x + y;
}

// Dangerous: eval usage
function processUserInput(input) {
  eval(input); // Security vulnerability!
}

// Bug: Missing error handling
function fetchData() {
  fetch("https://api.example.com/todos")
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      todos = data;
      renderTodos();
    });
  // No .catch() for error handling!
}

// Bug: Potential null reference
function getUserName() {
  var user = null;
  return user.name; // Will crash!
}

// Magic numbers
function calculateDiscount(price) {
  if (price > 100) {
    return price * 0.15; // Magic number
  } else if (price > 50) {
    return price * 0.1; // Magic number
  }
  return 0;
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  console.log("App initialized");
  console.log("Environment:", "production");

  // Bug: setTimeout with string (implicit eval)
  setTimeout("console.log('Delayed log')", 1000);
});
