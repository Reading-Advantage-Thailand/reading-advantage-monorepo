# Unit 07 Class Period Plans: React

---

## Period 1: Components and JSX

**Duration:** ~60 minutes

### Opening (5 min)

- React is a library for building user interfaces with reusable components
- Components are functions that return JSX (HTML-like syntax)
- React 19.2.5 is the version used in the Reading Advantage monorepo

### Activity: Set Up React SPA with Vite (10 min)

```bash
mkdir learning-dashboard
cd learning-dashboard
pnpm create vite . --template react-ts
pnpm install
pnpm dev
```

Project structure:
```
src/
├── App.tsx          # Root component
├── main.tsx         # Entry point
├── components/      # Reusable components
├── hooks/           # Custom hooks
└── types.ts         # Shared types
```

### Activity: Your First Component (15 min)

```tsx
// src/components/ModuleCard.tsx
interface ModuleCardProps {
  title: string;
  description: string;
  progress: number;
}

export function ModuleCard({ title, description, progress }: ModuleCardProps) {
  return (
    <div className="rounded-lg border p-6 shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-gray-400">{progress}% complete</p>
      </div>
    </div>
  );
}
```

Key JSX rules:
- Return a single root element (or use Fragment `<>...</>`)
- Use `className` instead of `class`
- Use `{}` for JavaScript expressions inside JSX
- Self-closing tags: `<img />`, `<br />`
- Boolean attributes: `disabled={true}` or just `disabled`

### Activity: Compose Components (20 min)

```tsx
// src/App.tsx
import { ModuleCard } from "./components/ModuleCard";

const modules = [
  { id: "1", title: "Dev Environment", description: "Set up your tools", progress: 100 },
  { id: "2", title: "Git & GitHub", description: "Version control", progress: 75 },
  { id: "3", title: "HTML & CSS", description: "Build web pages", progress: 40 },
];

export function App() {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="border-b bg-white px-6 py-4">
        <h1 className="text-2xl font-bold">Learning Dashboard</h1>
      </header>
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <ModuleCard
              key={mod.id}
              title={mod.title}
              description={mod.description}
              progress={mod.progress}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
```

Key concepts:
- **Composition**: `App` renders `ModuleCard` — that's composition
- **`map` for lists**: Always use `.map()` to render arrays
- **`key` prop**: Must be unique among siblings — helps React efficiently update the DOM

### Activity: Commit (10 min)

```bash
git init
git add -A
git commit -m "feat: scaffold React SPA with ModuleCard component"
```

Create the GitHub repo and push.

### Closing (5 min)

- Components, JSX, props, composition ✓
- Preview: Period 2 covers useState and event handling

---

## Period 2: State and Event Handling

**Duration:** ~60 minutes

### Opening (5 min)

- Props pass data down; state manages data that changes over time within a component
- Events are how users interact — clicks, input, form submissions

### Activity: useState — Managing Local State (20 min)

```tsx
import { useState } from "react";

export function Counter() {
  const [count, setCount] = useState(0);

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={() => setCount(count - 1)}
        className="rounded bg-gray-200 px-4 py-2"
      >
        -
      </button>
      <span className="text-2xl font-bold">{count}</span>
      <button
        onClick={() => setCount(count + 1)}
        className="rounded bg-blue-500 px-4 py-2 text-white"
      >
        +
      </button>
    </div>
  );
}
```

Rules of `useState`:
1. **Never mutate state directly** — always use the setter function
2. **State updates are asynchronous** — don't read state right after setting it
3. **Functional updates** when new state depends on old: `setCount(prev => prev + 1)`
4. **Initialize once** — the argument is only used on the first render

### Activity: Interactive Module Card (20 min)

```tsx
// src/components/ModuleCard.tsx — enhanced with state
import { useState } from "react";

interface ModuleCardProps {
  title: string;
  description: string;
  progress: number;
  lessons: string[];
}

export function ModuleCard({ title, description, progress, lessons }: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="rounded-lg border p-6 shadow-sm">
      <h3 className="text-xl font-semibold">{title}</h3>
      <p className="mt-2 text-sm text-gray-500">{description}</p>
      <div className="mt-4">
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="mt-3 text-sm text-blue-500 hover:underline"
      >
        {isExpanded ? "Hide lessons" : `Show ${lessons.length} lessons`}
      </button>
      {isExpanded && (
        <ul className="mt-3 space-y-2 border-t pt-3">
          {lessons.map((lesson, i) => (
            <li key={i} className="text-sm text-gray-600">{lesson}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Activity: Controlled Form Input (10 min)

```tsx
export function SearchBar({ onSearch }: { onSearch: (query: string) => void }) {
  const [query, setQuery] = useState("");

  return (
    <input
      type="text"
      value={query}
      onChange={(e) => {
        setQuery(e.target.value);
        onSearch(e.target.value);
      }}
      placeholder="Search modules..."
      className="w-full rounded-lg border px-4 py-2"
    />
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add interactive ModuleCard with useState and SearchBar"
git push
```

### Closing

- useState, event handling, controlled inputs ✓
- Preview: Period 3 covers useEffect and data fetching

---

## Period 3: useEffect and Data Fetching

**Duration:** ~60 minutes

### Opening (5 min)

- `useEffect` runs code after the component renders
- Used for: fetching data, subscriptions, timers, DOM manipulation
- Today: fetch data in a React component

### Activity: useEffect Basics (15 min)

```tsx
import { useState, useEffect } from "react";

// Basic effect — runs after every render
useEffect(() => {
  console.log("Component rendered");
});

// Empty dependency array — runs once on mount
useEffect(() => {
  console.log("Component mounted");
}, []);

// With dependencies — runs when deps change
useEffect(() => {
  console.log(`Count changed to ${count}`);
}, [count]);
```

**The dependency array is critical:**
- No array → runs after every render (usually wrong)
- `[]` → runs once on mount
- `[dep1, dep2]` → runs when any dep changes

**Rules:**
1. Include all variables from the component scope that the effect uses
2. Never lie about dependencies (eslint-plugin-react-hooks catches this)
3. Return a cleanup function for subscriptions/timers

### Activity: Fetching Data with useEffect (20 min)

```tsx
// src/hooks/useModules.ts
import { useState, useEffect } from "react";

interface Module {
  id: string;
  title: string;
  description: string;
  progress: number;
  lessons: string[];
}

export function useModules() {
  const [modules, setModules] = useState<Module[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchModules = async () => {
      try {
        const response = await fetch("/data/modules.json");
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        setModules(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load modules");
      } finally {
        setIsLoading(false);
      }
    };

    fetchModules();
  }, []);

  return { modules, isLoading, error };
}
```

```tsx
// src/App.tsx — using the custom hook
import { useModules } from "./hooks/useModules";
import { ModuleCard } from "./components/ModuleCard";

export function App() {
  const { modules, isLoading, error } = useModules();

  if (isLoading) return <div className="p-8 text-center">Loading...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <main className="container mx-auto px-6 py-8">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <ModuleCard key={mod.id} {...mod} />
          ))}
        </div>
      </main>
    </div>
  );
}
```

### Activity: Loading and Error States (15 min)

```tsx
// src/components/ModuleCardSkeleton.tsx
export function ModuleCardSkeleton() {
  return (
    <div className="animate-pulse rounded-lg border p-6">
      <div className="h-6 w-3/4 rounded bg-gray-200" />
      <div className="mt-3 h-4 w-full rounded bg-gray-200" />
      <div className="mt-4 h-2 w-full rounded bg-gray-200" />
    </div>
  );
}

// Usage in App:
if (isLoading) {
  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <ModuleCardSkeleton key={i} />
      ))}
    </div>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add useModules hook with loading and error states"
git push
```

### Closing

- useEffect, data fetching, loading/error states ✓
- Preview: Period 4 covers useContext and prop drilling

---

## Period 4: useContext and Prop Drilling

**Duration:** ~60 minutes

### Opening (5 min)

- Props pass data down one level at a time — "prop drilling"
- Context lets you share data across many levels without passing props
- Today: use context for theme (dark mode)

### Activity: The Problem — Prop Drilling (10 min)

```tsx
// Without context: passing theme through 3 levels
<App theme="dark">
  <Header theme="dark">
    <Nav theme="dark">
      <ThemeToggle theme="dark" onToggle={...} />
    </Nav>
  </Header>
</App>
```

This gets worse as the component tree grows. Context solves it.

### Activity: Creating and Using Context (25 min)

```tsx
// src/hooks/useTheme.tsx
import { createContext, useContext, useState, type ReactNode } from "react";

type Theme = "light" | "dark";

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
}
```

```tsx
// src/components/ThemeToggle.tsx
import { useTheme } from "../hooks/useTheme";

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme(); // No prop drilling!

  return (
    <button onClick={toggleTheme} className="rounded-lg border px-3 py-1">
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
```

```tsx
// src/main.tsx — wrap the app
import { ThemeProvider } from "./hooks/useTheme";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <ThemeProvider>
    <App />
  </ThemeProvider>
);
```

```tsx
// src/App.tsx — apply theme class
import { useTheme } from "./hooks/useTheme";

export function App() {
  const { theme } = useTheme();

  return (
    <div className={theme === "dark" ? "dark bg-gray-900 text-white" : "bg-gray-50"}>
      {/* ... */}
    </div>
  );
}
```

### Activity: When to Use Context vs Props (10 min)

**Use context when:**
- Data is needed by many components at different levels (theme, auth, locale)
- Passing props through intermediary components that don't use the data

**Use props when:**
- Data flows parent → child directly
- Only 1–2 levels of passing
- The component is specific about what it needs

**Don't use context for:**
- Data that changes frequently (causes re-renders on all consumers)
- State that only one component needs

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add ThemeProvider context for dark mode"
git push
```

### Closing (5 min)

- Context, ThemeProvider, custom hooks for context ✓
- Preview: Period 5 covers lists, keys, and conditional rendering

---

## Period 5: Lists, Keys, and Conditional Rendering

**Duration:** ~60 minutes

### Opening (5 min)

- Rendering lists and showing/hiding elements are fundamental React patterns
- The Reading Advantage dashboard renders lists of modules, lessons, students — everywhere

### Activity: Rendering Lists Properly (20 min)

```tsx
// ✅ Correct — unique, stable key from data
{modules.map((mod) => (
  <ModuleCard key={mod.id} title={mod.title} />
))}

// ❌ Wrong — array index as key (causes bugs with reordering/deleting)
{modules.map((mod, index) => (
  <ModuleCard key={index} title={mod.title} />
))}

// ❌ Wrong — duplicate keys
{items.map((item) => (
  <li key={item.category}>{item.name}</li>  // Multiple items can share a category
))}
```

**Why keys matter:**
- React uses keys to match old elements with new elements during re-render
- Bad keys → React re-creates DOM nodes unnecessarily → bugs, lost focus, poor performance
- Good keys → React efficiently updates only what changed

### Activity: Conditional Rendering Patterns (20 min)

```tsx
// Pattern 1: Ternary (either/or)
{isLoading ? <Spinner /> : <Content />}

// Pattern 2: && operator (show/hide)
{error && <ErrorMessage>{error}</ErrorMessage>}

// Pattern 3: Early return (guard clause)
if (isLoading) return <Spinner />;
if (error) return <ErrorMessage>{error}</ErrorMessage>;
return <Content />;

// Pattern 4: Enum object (multiple states)
const statusComponents = {
  idle: <IdleState />,
  loading: <LoadingState />,
  success: <SuccessState data={data} />,
  error: <ErrorState message={error} />,
};
return statusComponents[status];

// Pattern 5: Discriminated union with switch
type State = { status: "idle" } | { status: "loading" } | { status: "success"; data: Module[] } | { status: "error"; error: string };

function Dashboard({ state }: { state: State }) {
  switch (state.status) {
    case "idle": return <div>Click to load</div>;
    case "loading": return <Spinner />;
    case "success": return <ModuleList modules={state.data} />;
    case "error": return <ErrorBanner>{state.error}</ErrorBanner>;
  }
}
```

### Activity: Build the Lesson List Component (10 min)

```tsx
// src/components/LessonList.tsx
interface Lesson {
  id: string;
  title: string;
  type: "theory" | "exercise" | "quiz";
  status: "not_started" | "in_progress" | "completed";
}

interface LessonListProps {
  lessons: Lesson[];
  filter: string;
}

export function LessonList({ lessons, filter }: LessonListProps) {
  const filtered = filter === "all"
    ? lessons
    : lessons.filter((l) => l.type === filter);

  return (
    <div className="space-y-3">
      {filtered.length === 0 && (
        <p className="text-center text-gray-400">No lessons match this filter.</p>
      )}
      {filtered.map((lesson) => (
        <LessonItem key={lesson.id} lesson={lesson} />
      ))}
    </div>
  );
}

function LessonItem({ lesson }: { lesson: Lesson }) {
  const statusIcon = {
    not_started: "⭕",
    in_progress: "📖",
    completed: "✅",
  }[lesson.status];

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <span>{statusIcon}</span>
      <span className="flex-1">{lesson.title}</span>
      <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs">{lesson.type}</span>
    </div>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add LessonList with filtering and conditional rendering"
git push
```

### Closing

- Lists, keys, conditional rendering patterns ✓
- Preview: Period 6 covers forms and custom hooks

---

## Period 6: Forms and Custom Hooks

**Duration:** ~60 minutes

### Opening (5 min)

- Forms are how users input data — contact forms, search, login, quiz answers
- Custom hooks extract reusable logic from components
- Today: build a quiz component and extract a custom hook

### Activity: Controlled Form Pattern (15 min)

```tsx
// src/components/ContactForm.tsx
import { useState, type FormEvent } from "react";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactSchema>;

export function ContactForm() {
  const [formData, setFormData] = useState({ name: "", email: "", message: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    const result = contactSchema.safeParse(formData);
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0].toString();
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return <p className="text-green-600">Thanks for your message!</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="name" className="block text-sm font-medium">Name</label>
        <input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="mt-1 w-full rounded-lg border px-3 py-2"
        />
        {errors.name && <p className="mt-1 text-sm text-red-500">{errors.name}</p>}
      </div>
      {/* email and message fields follow the same pattern */}
      <button type="submit" className="rounded-lg bg-blue-500 px-4 py-2 text-white">
        Send
      </button>
    </form>
  );
}
```

### Activity: Custom Hook — useFormState (20 min)

```tsx
// src/hooks/useFormState.ts
import { useState, type FormEvent } from "react";
import { z } from "zod";

export function useFormState<T extends Record<string, unknown>>(
  schema: z.ZodType<T>,
  initialValues: T
) {
  const [values, setValues] = useState(initialValues);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);

  const setValue = (field: keyof T, value: string) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear error for this field on change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[field as string];
      return next;
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const result = schema.safeParse(values);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      result.error.issues.forEach((issue) => {
        const field = issue.path[0].toString();
        fieldErrors[field] = issue.message;
      });
      setErrors(fieldErrors);
      return;
    }

    setIsSubmitted(true);
  };

  return { values, errors, isSubmitted, setValue, handleSubmit };
}
```

### Activity: Build the Quiz Component (15 min)

```tsx
// src/components/Quiz.tsx
import { useState } from "react";

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
}

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  const score = submitted
    ? questions.filter((q) => answers[q.id] === q.correctAnswer).length
    : 0;

  return (
    <div className="space-y-6">
      {questions.map((q, i) => (
        <div key={q.id} className="rounded-lg border p-4">
          <p className="font-medium">{i + 1}. {q.question}</p>
          <div className="mt-3 space-y-2">
            {q.options.map((opt) => (
              <label
                key={opt}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 ${
                  answers[q.id] === opt ? "border-blue-500 bg-blue-50" : "hover:bg-gray-50"
                } ${submitted && opt === q.correctAnswer ? "border-green-500 bg-green-50" : ""} ${
                  submitted && answers[q.id] === opt && opt !== q.correctAnswer
                    ? "border-red-500 bg-red-50"
                    : ""
                }`}
              >
                <input
                  type="radio"
                  name={q.id}
                  value={opt}
                  checked={answers[q.id] === opt}
                  onChange={() => setAnswers({ ...answers, [q.id]: opt })}
                  disabled={submitted}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {submitted && (
            <p className="mt-3 text-sm text-gray-500">
              <strong>Explanation:</strong> {q.explanation}
            </p>
          )}
        </div>
      ))}
      {!submitted ? (
        <button
          onClick={() => setSubmitted(true)}
          disabled={Object.keys(answers).length < questions.length}
          className="rounded-lg bg-blue-500 px-4 py-2 text-white disabled:opacity-50"
        >
          Submit Quiz
        </button>
      ) : (
        <div className="rounded-lg bg-green-50 p-4">
          Score: {score}/{questions.length} ({Math.round((score / questions.length) * 100)}%)
        </div>
      )}
    </div>
  );
}
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: add Quiz component and useFormState custom hook"
git push
```

### Closing

- Forms, custom hooks, Quiz component ✓
- Preview: Period 7 wraps up React with exercise and quiz

---

## Period 7: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- React fundamentals complete
- Today: exercise and quiz

### Activity: Exercise — Build a Filterable Data Table (40 min)

**Exercise repo:** `codecamp-exercise-react`

The intern forks the exercise repo which contains:
- `data/students.json` — 15 student objects: `{ id, name, email, role, department, enrollDate, progress }`
- A README with requirements and a wireframe

Requirements:
1. Create a `StudentTable` component that renders all students
2. Add a `SearchBar` that filters students by name (case-insensitive)
3. Add filter buttons for departments (All, Engineering, Design, Marketing)
4. Add sorting: click column headers to sort ascending/descending
5. Use `useState` for search query, filter, and sort state
6. Extract a `useStudentFilters` custom hook that encapsulates all filter/sort logic
7. Use `useContext` for a `ThemeContext` (light/dark toggle)
8. Show a loading skeleton while data is being fetched (use `useEffect` + `setTimeout` to simulate)
9. Handle empty states: "No students found matching your search"
10. All components are typed with TypeScript (no `any`)

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. Why should you never use array index as a React key? (causes bugs when list items are reordered/deleted — React can't efficiently match elements)
2. What is the dependency array in useEffect for? (controls when the effect re-runs — only when listed dependencies change)
3. When should you use Context vs props? (context for data needed by many components at different nesting levels; props for direct parent→child)
4. What does a custom hook's name need to start with? (`use` — it's a convention React enforces via the rules of hooks)
5. What happens if you call `useState` inside a conditional? (violates rules of hooks — hooks must be called in the same order every render)

### Closing

- React unit complete — Learning Dashboard is a working SPA
- Next unit: API Fundamentals — connecting the dashboard to real data
