# Unit 04 Class Period Plans: JavaScript Fundamentals

---

## Period 1: Variables, Types, Operators

**Duration:** ~60 minutes

### Opening (5 min)

- JavaScript makes web pages interactive
- It's the language of the browser (and now the server via Node.js)
- Today: variables, data types, and basic operations

### Activity: Variables — const, let, never var (15 min)

```javascript
// const — cannot be reassigned (use by default)
const name = "Alice";
const PI = 3.14159;

// let — can be reassigned (use only when needed)
let score = 0;
score = 10; // OK

// var — NEVER USE THIS (legacy, has scoping bugs)
// var age = 25; // ❌ Don't do this
```

Why no `var`?
- `var` is function-scoped (not block-scoped) → bugs with `if` and `for`
- `var` is hoisted → confusing behavior
- `const` and `let` fix both issues

### Activity: Data Types (15 min)

```javascript
// Primitives
const str = "Hello";           // string
const num = 42;                // number
const float = 3.14;            // number (no separate float type)
const bool = true;             // boolean
const nothing = null;          // intentional empty value
const notDefined = undefined;  // variable declared but not assigned

// Reference types
const arr = [1, 2, 3];                    // array
const obj = { name: "Alice", age: 20 };   // object

// typeof
typeof str;        // "string"
typeof num;        // "number"
typeof bool;       // "boolean"
typeof nothing;    // "object" (historical bug in JS)
typeof notDefined; // "undefined"
typeof arr;        // "object"
typeof obj;        // "object"
```

### Activity: Operators (15 min)

```javascript
// Arithmetic
2 + 3;    // 5
10 - 4;   // 6
3 * 4;    // 12
10 / 3;   // 3.333...
10 % 3;   // 1 (remainder)
2 ** 3;   // 8 (exponent)

// Comparison
1 === 1;    // true  (strict equality — USE THIS)
1 == "1";   // true  (loose equality — AVOID)
1 !== 2;    // true  (strict inequality)
1 > 2;      // false

// Logical
true && false;  // false (AND)
true || false;  // true  (OR)
!true;          // false (NOT)

// Nullish coalescing (useful for defaults)
const value = null ?? "default";  // "default"
const zero = 0 ?? "default";      // 0 (nullish coalescing respects 0 and "")
```

### Activity: Add a script.js to Portfolio (10 min)

```html
<!-- Add before </body> in index.html -->
<script src="script.js"></script>
```

```javascript
// script.js
const studentName = "Your Name";
const currentYear = new Date().getFullYear();

console.log(`Welcome, ${studentName}!`);
console.log(`Current year: ${currentYear}`);
```

```bash
git add script.js index.html
git commit -m "feat: add JavaScript to portfolio with basic variables"
git push
```

### Closing (5 min)

- Variables (const/let), types, operators ✓
- Preview: Period 2 covers functions and scope

---

## Period 2: Functions and Scope

**Duration:** ~60 minutes

### Opening (5 min)

- Functions are reusable blocks of code
- Scope determines where variables are accessible
- Today: write functions and understand scope

### Activity: Function Declarations vs Expressions vs Arrow (20 min)

```javascript
// Function declaration (hoisted — can call before definition)
function greet(name) {
  return `Hello, ${name}!`;
}

// Function expression (not hoisted)
const greet2 = function (name) {
  return `Hello, ${name}!`;
};

// Arrow function (concise, preferred for callbacks)
const greet3 = (name) => `Hello, ${name}!`;

// Arrow with multiple statements
const greet4 = (name) => {
  const greeting = `Hello, ${name}!`;
  return greeting;
};

// Default parameters
const greet5 = (name = "World") => `Hello, ${name}!`;
greet5();       // "Hello, World!"
greet5("Alice"); // "Hello, Alice!"
```

**When to use which:**
- Arrow functions: callbacks, short utility functions (preferred in Reading Advantage codebase)
- Function declarations: top-level named functions where hoisting helps readability

### Activity: Scope — Block, Function, Global (15 min)

```javascript
// Global scope
const global = "I'm global";

function example() {
  // Function scope
  const local = "I'm local to example()";

  if (true) {
    // Block scope
    const block = "I'm in the if block";
    console.log(global); // ✓
    console.log(local);  // ✓
    console.log(block);  // ✓
  }

  console.log(block); // ❌ ReferenceError!
}

// Closures — a function remembers its outer scope
function createCounter() {
  let count = 0;
  return () => {
    count += 1;
    return count;
  };
}

const counter = createCounter();
counter(); // 1
counter(); // 2
counter(); // 3
```

Closures are used heavily in React (hooks are closures).

### Activity: Write Utility Functions for Portfolio (15 min)

```javascript
// Format a date nicely
const formatDate = (date) => {
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(date);
};

// Create an HTML element with content
const createElement = (tag, text) => {
  const el = document.createElement(tag);
  el.textContent = text;
  return el;
};

// Truncate long text
const truncate = (text, maxLength = 100) => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};
```

### Activity: Commit (5 min)

```bash
git add script.js
git commit -m "feat: add utility functions with arrow syntax and closures"
git push
```

### Closing

- Functions (declaration, expression, arrow) and scope ✓
- Preview: Period 3 covers DOM manipulation

---

## Period 3: DOM Manipulation

**Duration:** ~60 minutes

### Opening (5 min)

- The DOM (Document Object Model) is the browser's representation of your HTML
- JavaScript can read and modify the DOM in real time
- Today: select, create, modify, and remove DOM elements

### Activity: Selecting Elements (15 min)

```javascript
// By ID (returns single element)
const hero = document.getElementById("hero");

// By CSS selector (returns first match)
const firstLink = document.querySelector("nav a");

// By CSS selector (returns all matches as NodeList)
const allSections = document.querySelectorAll("section");

// By class (returns HTMLCollection)
const cards = document.getElementsByClassName("project-card");
```

### Activity: Modifying Elements (15 min)

```javascript
// Change text
hero.querySelector("h1").textContent = "Updated Name";

// Change HTML
hero.querySelector("p").innerHTML = "Aspiring <strong>Full-Stack</strong> Developer";

// Change styles
hero.style.backgroundColor = "#0f3460";

// Add/remove/toggle classes
hero.classList.add("highlight");
hero.classList.remove("highlight");
hero.classList.toggle("highlight");

// Change attributes
document.querySelector("nav a").setAttribute("href", "#hero");
```

### Activity: Building the Dark Mode Toggle (20 min)

```javascript
const toggleButton = document.createElement("button");
toggleButton.textContent = "🌙 Dark Mode";
toggleButton.classList.add("dark-mode-toggle");
document.querySelector("header").appendChild(toggleButton);

toggleButton.addEventListener("click", () => {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  toggleButton.textContent = isDark ? "☀️ Light Mode" : "🌙 Dark Mode";
});
```

Add dark mode styles to `styles.css`:
```css
body.dark-mode {
  background-color: #1a1a2e;
  color: #fafafa;
}

body.dark-mode header {
  background-color: #0f3460;
}

body.dark-mode .project-card {
  background-color: #16213e;
  border-color: #2d3a5c;
  color: #fafafa;
}
```

Add the button to `index.html` header.

### Activity: Commit (5 min)

```bash
git add script.js styles.css index.html
git commit -m "feat: add dark mode toggle with DOM manipulation"
git push
```

### Closing

- DOM manipulation: select, modify, create, toggle ✓
- Preview: Period 4 covers events and form handling

---

## Period 4: Events and Form Handling

**Duration:** ~60 minutes

### Opening (5 min)

- Events are how the browser tells JavaScript that something happened
- Clicks, key presses, form submissions, scroll, resize
- Today: handle events and build a contact form

### Activity: Event Listeners (15 min)

```javascript
// Basic click
button.addEventListener("click", () => {
  console.log("Clicked!");
});

// Event object
document.addEventListener("keydown", (event) => {
  console.log(`Key pressed: ${event.key}`);
});

// Prevent default behavior
form.addEventListener("submit", (event) => {
  event.preventDefault(); // Stop page reload
  console.log("Form submitted!");
});

// Event delegation (handle events on parent)
document.querySelector("nav").addEventListener("click", (event) => {
  if (event.target.tagName === "A") {
    console.log(`Navigating to ${event.target.getAttribute("href")}`);
  }
});
```

### Activity: Build a Contact Form (25 min)

Add to `index.html`:
```html
<section id="contact">
  <h2>Contact Me</h2>
  <form id="contact-form">
    <div>
      <label for="name">Name</label>
      <input type="text" id="name" name="name" required>
    </div>
    <div>
      <label for="email">Email</label>
      <input type="email" id="email" name="email" required>
    </div>
    <div>
      <label for="message">Message</label>
      <textarea id="message" name="message" rows="4" required></textarea>
    </div>
    <button type="submit">Send Message</button>
    <p id="form-status"></p>
  </form>
</section>
```

Add to `script.js`:
```javascript
const form = document.getElementById("contact-form");
const status = document.getElementById("form-status");

form.addEventListener("submit", (event) => {
  event.preventDefault();

  const name = form.name.value.trim();
  const email = form.email.value.trim();
  const message = form.message.value.trim();

  // Validation
  if (!name || !email || !message) {
    status.textContent = "Please fill in all fields.";
    status.style.color = "red";
    return;
  }

  if (!email.includes("@")) {
    status.textContent = "Please enter a valid email.";
    status.style.color = "red";
    return;
  }

  // "Send" (we'll make this real in the API unit)
  status.textContent = `Thanks, ${name}! Message received.`;
  status.style.color = "green";
  form.reset();
});
```

Style the form in `styles.css` with Flexbox layout for the form fields.

### Activity: Commit (5 min)

```bash
git add script.js styles.css index.html
git commit -m "feat: add contact form with client-side validation"
git push
```

### Closing

- Events and form handling ✓
- Preview: Period 5 covers arrays, objects, and array methods

---

## Period 5: Arrays and Objects

**Duration:** ~60 minutes

### Opening (5 min)

- Arrays and objects are how we structure data in JavaScript
- Array methods are used constantly in React (map for rendering lists, filter for search, find for lookups)
- Today: master the data structures you'll use every day

### Activity: Array Methods (25 min)

```javascript
const skills = ["HTML", "CSS", "JavaScript", "Git", "Node.js"];

// map — transform each element (used constantly in React for rendering lists)
const upperSkills = skills.map((skill) => skill.toUpperCase());
// ["HTML", "CSS", "JAVASCRIPT", "GIT", "NODE.JS"]

// filter — keep elements that match a condition
const longSkills = skills.filter((skill) => skill.length > 3);
// ["HTML", "CSS", "JavaScript", "Node.js"]

// find — get the first matching element
const js = skills.find((skill) => skill.includes("Java"));
// "JavaScript"

// some / every — boolean checks
skills.some((skill) => skill === "CSS");    // true
skills.every((skill) => skill.length > 2);  // true

// reduce — accumulate a value
const totalLength = skills.reduce((sum, skill) => sum + skill.length, 0);
// 27

// sort — alphabetical by default, numeric needs comparator
const sorted = [...skills].sort();  // Spread to avoid mutating original
const nums = [3, 1, 4, 1, 5];
nums.sort((a, b) => a - b);  // Numeric sort: [1, 1, 3, 4, 5]

// includes — check membership
skills.includes("CSS"); // true
```

### Activity: Objects and Destructuring (20 min)

```javascript
const project = {
  title: "Personal Portfolio",
  description: "My first website",
  technologies: ["HTML", "CSS", "JavaScript"],
  status: "in-progress",
  author: {
    name: "Alice",
    role: "Intern",
  },
};

// Access properties
project.title;                    // dot notation
project["description"];           // bracket notation (dynamic keys)

// Destructuring
const { title, description } = project;
const { name, role } = project.author;

// Nested destructuring
const { author: { name: authorName } } = project;

// Spread operator (copy and merge)
const updatedProject = {
  ...project,
  status: "completed",  // override
  url: "https://alice.dev",  // add new
};

const moreTechs = [...project.technologies, "TypeScript"];
```

### Activity: Build a Dynamic Skills Section (10 min)

```javascript
// Project data as an array of objects
const projects = [
  { title: "Personal Portfolio", desc: "My first website", tech: ["HTML", "CSS", "JS"] },
  { title: "Calculator", desc: "A simple calculator", tech: ["HTML", "CSS", "JS"] },
  { title: "Todo App", desc: "Track your tasks", tech: ["HTML", "CSS", "JS"] },
];

// Render projects dynamically
const projectsGrid = document.querySelector(".projects-grid");
projectsGrid.innerHTML = projects
  .map((project) => `
    <article class="project-card">
      <h3>${project.title}</h3>
      <p>${project.desc}</p>
      <p><small>${project.tech.join(", ")}</small></p>
    </article>
  `)
  .join("");
```

### Activity: Commit (5 min)

```bash
git add script.js
git commit -m "feat: add dynamic project rendering with array methods"
git push
```

### Closing

- Arrays (map, filter, find, reduce), objects, destructuring, spread ✓
- Preview: Period 6 covers async/await and Promises

---

## Period 6: Async/Await and Promises

**Duration:** ~60 minutes

### Opening (5 min)

- JavaScript is single-threaded but non-blocking
- Async code lets you wait for things (API calls, file reads) without freezing the UI
- Today: Promises and async/await

### Activity: Understanding Promises (15 min)

```javascript
// A Promise represents a value that will be available later
// States: pending → fulfilled ✅ or rejected ❌

// Creating a promise
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Using .then() (old style — understand it, but prefer async/await)
delay(1000)
  .then(() => console.log("1 second later"))
  .then(() => delay(1000))
  .then(() => console.log("2 seconds later"));

// Using async/await (preferred — looks synchronous)
const example = async () => {
  await delay(1000);
  console.log("1 second later");
  await delay(1000);
  console.log("2 seconds later");
};
```

### Activity: Error Handling with try/catch (15 min)

```javascript
const fetchUserData = async (userId) => {
  try {
    const response = await fetch(`/api/users/${userId}`);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error("Failed to fetch user:", error.message);
    return null;
  }
};
```

Key points:
- Always use try/catch with async/await
- Always check `response.ok` — fetch doesn't throw on 404/500
- `response.json()` is also async — it returns a Promise

### Activity: Fetch Data for Portfolio (15 min)

Create `data/projects.json`:
```json
[
  { "id": 1, "title": "Personal Portfolio", "desc": "My first website", "tech": ["HTML", "CSS", "JS"] },
  { "id": 2, "title": "Calculator", "desc": "A simple calculator", "tech": ["HTML", "CSS", "JS"] },
  { "id": 3, "title": "Todo App", "desc": "Track your tasks", "tech": ["HTML", "CSS", "JS"] }
]
```

```javascript
const loadProjects = async () => {
  try {
    const response = await fetch("./data/projects.json");
    if (!response.ok) throw new Error("Failed to load projects");
    const projects = await response.json();

    const grid = document.querySelector(".projects-grid");
    grid.innerHTML = projects
      .map((p) => `
        <article class="project-card">
          <h3>${p.title}</h3>
          <p>${p.desc}</p>
          <p><small>${p.tech.join(", ")}</small></p>
        </article>
      `)
      .join("");
  } catch (error) {
    console.error("Error loading projects:", error);
  }
};

loadProjects();
```

### Activity: Commit (5 min)

```bash
git add script.js data/projects.json
git commit -m "feat: load project data asynchronously from JSON"
git push
```

### Closing (5 min)

- async/await, try/catch, Fetch API ✓
- Preview: Period 7 covers the Fetch API in depth

---

## Period 7: Fetch API and Error Handling

**Duration:** ~60 minutes

### Opening (5 min)

- Last period: basic fetch ✓
- Today: deep dive into HTTP methods, headers, error handling patterns

### Activity: HTTP Methods and Headers (15 min)

```javascript
// GET — read data (default)
const getProjects = async () => {
  const response = await fetch("/api/projects");
  return response.json();
};

// POST — create data
const createProject = async (project) => {
  const response = await fetch("/api/projects", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  return response.json();
};

// PUT — replace data
const updateProject = async (id, project) => {
  const response = await fetch(`/api/projects/${id}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(project),
  });
  return response.json();
};

// DELETE — remove data
const deleteProject = async (id) => {
  const response = await fetch(`/api/projects/${id}`, {
    method: "DELETE",
  });
  if (!response.ok) throw new Error("Delete failed");
};
```

### Activity: Robust Error Handling (15 min)

```javascript
class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

const apiFetch = async (url, options = {}) => {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
    });

    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      throw new ApiError(response.status, body.message || response.statusText);
    }

    // Handle 204 No Content
    if (response.status === 204) return null;

    return response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(0, `Network error: ${error.message}`);
  }
};
```

### Activity: Build a Filterable Skills Section (25 min)

```javascript
const skillsData = [
  { name: "HTML", category: "frontend", level: "learning" },
  { name: "CSS", category: "frontend", level: "learning" },
  { name: "JavaScript", category: "frontend", level: "learning" },
  { name: "Git", category: "tools", level: "learning" },
  { name: "Node.js", category: "backend", level: "learning" },
  { name: "PostgreSQL", category: "backend", level: "not-started" },
  { name: "React", category: "frontend", level: "not-started" },
  { name: "TypeScript", category: "frontend", level: "not-started" },
];

const renderSkills = (filter = "all") => {
  const filtered = filter === "all"
    ? skillsData
    : skillsData.filter((s) => s.category === filter);

  const ul = document.querySelector("#skills ul");
  ul.innerHTML = filtered
    .map((skill) => `<li class="skill-${skill.level}">${skill.name}</li>`)
    .join("");
};

// Add filter buttons
const filterContainer = document.createElement("div");
filterContainer.classList.add("skill-filters");
["all", "frontend", "backend", "tools"].forEach((category) => {
  const btn = document.createElement("button");
  btn.textContent = category.charAt(0).toUpperCase() + category.slice(1);
  btn.addEventListener("click", () => renderSkills(category));
  filterContainer.appendChild(btn);
});
document.querySelector("#skills").insertBefore(filterContainer, document.querySelector("#skills ul"));

renderSkills(); // Initial render
```

### Activity: Commit (5 min)

```bash
git add script.js
git commit -m "feat: add filterable skills section with API patterns"
git push
```

### Closing

- Fetch API (GET/POST/PUT/DELETE), error handling, filterable UI ✓
- Preview: Period 8 wraps up JavaScript with exercise and quiz

---

## Period 8: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- JavaScript fundamentals complete
- Today: exercise and quiz to validate your knowledge

### Activity: Exercise — Build a Dynamic Searchable List (40 min)

**Exercise repo:** `codecamp-javascript-exercise`

The intern forks the exercise repo which contains:
- A `data/users.json` with 20 user objects: `{ id, name, email, role, department }`
- An empty `index.html` and `script.js`
- A README with requirements

Requirements:
1. Fetch `users.json` on page load using async/await
2. Render all users as a card list (name, email, role, department)
3. Add a search input that filters users by name as you type (use the `input` event)
4. Add filter buttons for departments (All, Engineering, Design, Marketing)
5. Show "No users found" when the filter returns empty results
6. Handle fetch errors gracefully — show an error message if the data fails to load
7. Use array methods (map, filter) and template literals
8. Use arrow functions throughout

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What is the difference between `const` and `let`? (const can't be reassigned, let can)
2. What does `array.map()` return? (a new array with transformed elements)
3. Why do we use `event.preventDefault()` on form submit? (stop page reload)
4. How do you handle errors in async/await? (try/catch)
5. What does `response.json()` return? (a Promise that resolves to the parsed JSON)

### Closing

- JavaScript unit complete — portfolio has interactivity
- Next unit: TypeScript — converting JavaScript to TypeScript
