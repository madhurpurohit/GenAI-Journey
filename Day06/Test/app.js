// Todo App

var todos = [];

// Function to save todos to localStorage
function saveTodos() {
  localStorage.setItem('todos', JSON.stringify(todos));
}

// Function to load todos from localStorage
function loadTodos() {
  const storedTodos = localStorage.getItem('todos');
  if (storedTodos) {
    todos = JSON.parse(storedTodos);
  }
}

function addTodo() {
  var input = document.getElementById("todoInput");
  var text = input.value.trim();

  if (text === "") {
    alert("Please enter a task");
    return;
  }

  var todo = {
    id: Date.now(),
    text: text,
    completed: false,
  };

  todos.push(todo);
  saveTodos(); // Save after adding
  renderTodos();
  input.value = "";
  input.focus(); // Set focus back to input for better UX
}

function renderTodos() {
  var list = document.getElementById("todoList");
  list.innerHTML = "";

  if (todos.length === 0) {
    const emptyMessage = document.createElement('li');
    emptyMessage.textContent = 'No tasks yet. Add one above!';
    emptyMessage.classList.add('empty-message');
    list.appendChild(emptyMessage);
  }

  todos.forEach(function (todo) {
    var listItem = document.createElement("li");
    listItem.classList.add("todo-item");
    if (todo.completed) {
      listItem.classList.add("completed");
    }
    listItem.id = `todo-${todo.id}`;
    listItem.setAttribute('aria-label', `Task: ${todo.text}, ${todo.completed ? 'completed' : 'not completed'}`);


    var checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = todo.completed;
    checkbox.setAttribute('aria-label', `Mark "${todo.text}" as ${todo.completed ? 'not completed' : 'completed'}`);
    checkbox.onchange = function () { // Use onchange for checkboxes
      toggleTodo(todo.id);
    };

    var span = document.createElement("span");
    span.textContent = todo.text;
    span.classList.add('todo-text');

    var deleteButton = document.createElement("button");
    deleteButton.classList.add("delete-btn");
    deleteButton.textContent = "Delete";
    deleteButton.setAttribute('aria-label', `Delete task "${todo.text}"`);
    deleteButton.onclick = function () {
      deleteTodo(todo.id);
    };

    listItem.appendChild(checkbox);
    listItem.appendChild(span);
    listItem.appendChild(deleteButton);
    list.appendChild(listItem);
  });

  updateStats();
}

function toggleTodo(id) {
  for (var i = 0; i < todos.length; i++) {
    if (todos[i].id === id) {
      todos[i].completed = !todos[i].completed;
      break;
    }
  }
  saveTodos(); // Save after toggling
  renderTodos();
}

function deleteTodo(id) {
  todos = todos.filter(function (todo) {
    return todo.id !== id;
  });
  saveTodos(); // Save after deleting
  renderTodos();
}

function updateStats() {
  var totalSpan = document.getElementById("total");
  if (totalSpan) {
    totalSpan.textContent = todos.length;
  }
}

function clearAll() {
  todos = [];
  saveTodos(); // Save after clearing
  renderTodos();
}

function fetchData() {
  fetch("https://api.example.com/todos")
    .then(function (response) {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(function (data) {
      todos = data;
      saveTodos(); // Save fetched data
      renderTodos();
    })
    .catch(function (error) {
      console.error("Error fetching data:", error);
      alert("Failed to load todos. Please try again later.");
    });
}

function getUserName() {
  var user = null;
  if (user && user.name) {
    return user.name;
  }
  return "Guest";
}

const DISCOUNT_THRESHOLD_HIGH = 100;
const DISCOUNT_RATE_HIGH = 0.15;
const DISCOUNT_THRESHOLD_MEDIUM = 50;
const DISCOUNT_RATE_MEDIUM = 0.1;

function calculateDiscount(price) {
  if (price > DISCOUNT_THRESHOLD_HIGH) {
    return price * DISCOUNT_RATE_HIGH;
  } else if (price > DISCOUNT_THRESHOLD_MEDIUM) {
    return price * DISCOUNT_RATE_MEDIUM;
  }
  return 0;
}

// Initialize
document.addEventListener("DOMContentLoaded", function () {
  loadTodos(); // Load todos when the DOM is ready
  renderTodos(); // Render initial todos

  const addTodoButton = document.getElementById('addTodoButton');
  if (addTodoButton) {
    addTodoButton.addEventListener('click', addTodo);
  }

  const todoInput = document.getElementById('todoInput');
  if (todoInput) {
    todoInput.addEventListener('keypress', function(event) {
      if (event.key === 'Enter') {
        addTodo();
      }
    });
  }

  setTimeout(function() {
    // console.log('Delayed log');
  }, 1000);
});