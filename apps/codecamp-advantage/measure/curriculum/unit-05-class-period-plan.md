# Unit 05 Class Period Plans: TypeScript

---

## Period 1: Type Annotations, Interfaces, Type Aliases

**Duration:** ~60 minutes

### Opening (5 min)

- TypeScript = JavaScript + types
- Catches bugs at compile time instead of runtime
- Used throughout the Reading Advantage monorepo — every file is `.ts` or `.tsx`

### Activity: Basic Type Annotations (20 min)

```typescript
// Variables
const name: string = "Alice";
const age: number = 20;
const isActive: boolean = true;
const items: string[] = ["HTML", "CSS", "JS"];
const scores: number[] = [95, 87, 100];

// Alternative array syntax
const items2: Array<string> = ["HTML", "CSS", "JS"];

// Functions — parameter and return types
const greet = (name: string): string => {
  return `Hello, ${name}!`;
};

// Void — function doesn't return anything
const logMessage = (message: string): void => {
  console.log(message);
};

// Never — function never returns (throws or infinite loop)
const fail = (message: string): never => {
  throw new Error(message);
};
```

### Activity: Interfaces and Type Aliases (20 min)

```typescript
// Interface — describes the shape of an object
interface Project {
  id: number;
  title: string;
  description: string;
  technologies: string[];
  status: "not-started" | "in-progress" | "completed"; // Union of literal types
  url?: string; // Optional property
}

// Using the interface
const portfolio: Project = {
  id: 1,
  title: "Personal Portfolio",
  description: "My first website",
  technologies: ["HTML", "CSS", "JS"],
  status: "in-progress",
  // url is optional — no error
};

// Type alias — similar but more flexible
type Status = "not-started" | "in-progress" | "completed";

type ProjectId = string | number; // Union type

// Type alias for function signatures
type Validator = (value: unknown) => boolean;

// When to use interface vs type:
// - Interface: object shapes (can be extended/merged)
// - Type: unions, intersections, utility types
```

### Activity: Convert Portfolio Data to TypeScript (10 min)

```typescript
// Create types.ts
interface Skill {
  name: string;
  category: "frontend" | "backend" | "tools";
  level: "not-started" | "learning" | "comfortable";
}

interface ContactFormData {
  name: string;
  email: string;
  message: string;
}
```

### Activity: Commit (5 min)

```bash
git add types.ts script.ts
git commit -m "feat: add TypeScript types and interfaces for portfolio data"
git push
```

### Closing

- Type annotations, interfaces, type aliases ✓
- Preview: Period 2 covers generics and type narrowing

---

## Period 2: Generics and Type Narrowing

**Duration:** ~60 minutes

### Opening (5 min)

- Generics let you write functions that work with any type while staying type-safe
- Type narrowing lets TypeScript understand what type a value is at runtime
- Both are used heavily in the Reading Advantage codebase (Drizzle queries, tRPC procedures)

### Activity: Generics (25 min)

```typescript
// Basic generic — a function that works with any type
const identity = <T>(value: T): T => {
  return value;
};

identity<string>("hello");  // string
identity<number>(42);       // number
identity("auto");           // string (TypeScript infers T)

// Generic with constraints
const getFirstElement = <T>(array: T[]): T | undefined => {
  return array[0];
};

getFirstElement(["a", "b"]);  // string | undefined
getFirstElement([1, 2, 3]);   // number | undefined

// Generic with key constraint
const getProperty = <T, K extends keyof T>(obj: T, key: K): T[K] => {
  return obj[key];
};

const project = { title: "Portfolio", status: "in-progress" };
getProperty(project, "title");   // string
getProperty(project, "status");  // "not-started" | "in-progress" | "completed"
// getProperty(project, "url");  // ❌ Compile error — "url" is not a key

// Generic interface (this is how tRPC and Drizzle work!)
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

const response: ApiResponse<Project> = {
  data: portfolio,
  success: true,
};
```

### Activity: Type Narrowing (20 min)

```typescript
// typeof narrowing
const processValue = (value: string | number) => {
  if (typeof value === "string") {
    return value.toUpperCase(); // TypeScript knows it's a string
  }
  return value * 2; // TypeScript knows it's a number
};

// instanceof narrowing
const getLength = (value: string | string[]) => {
  if (value instanceof Array) {
    return value.length; // string[]
  }
  return value.length; // string
};

// Discriminated union (very common in Reading Advantage)
type Result<T> =
  | { success: true; data: T }
  | { success: false; error: string };

const handleResult = <T>(result: Result<T>) => {
  if (result.success) {
    console.log(result.data); // TypeScript knows data exists
  } else {
    console.error(result.error); // TypeScript knows error exists
  }
};

// Truthiness narrowing
const printName = (name: string | null | undefined) => {
  if (name) {
    console.log(name.toUpperCase()); // string (not null/undefined)
  }
};
```

### Activity: Apply Generics to Portfolio Utilities (10 min)

```typescript
// Generic filter function
const filterByCategory = <T extends { category: string }>(
  items: T[],
  category: string
): T[] => {
  return items.filter((item) => item.category === category);
};

// Generic API response wrapper
interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

const createSuccessResponse = <T>(data: T): ApiResponse<T> => ({
  data,
  success: true,
});

const createErrorResponse = (error: string): ApiResponse<never> => ({
  data: undefined as never,
  success: false,
  error,
});
```

### Activity: Commit (5 min)

```bash
git add types.ts script.ts
git commit -m "feat: add generics and type narrowing to portfolio utilities"
git push
```

### Closing

- Generics (constraints, interfaces, inference) and type narrowing ✓
- Preview: Period 3 covers Zod validation

---

## Period 3: Zod Runtime Validation

**Duration:** ~60 minutes

### Opening (5 min)

- TypeScript checks types at compile time only
- At runtime, all types are erased — data from APIs, forms, and files could be anything
- Zod 3.25.76 validates data at runtime AND generates TypeScript types
- Used throughout Reading Advantage for API input validation and tRPC procedures

### Activity: Zod Basics (20 min)

```typescript
import { z } from "zod"; // zod@3.25.76

// Primitive schemas
const nameSchema = z.string().min(1, "Name is required");
const emailSchema = z.string().email("Invalid email");
const ageSchema = z.number().int().positive().max(150);

// Object schemas (this is how tRPC input validation works)
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

// Parse — throws on invalid data
try {
  const result = contactFormSchema.parse({
    name: "Alice",
    email: "alice@example.com",
    message: "Hello there!",
  });
  console.log(result); // Typed as { name: string; email: string; message: string }
} catch (error) {
  console.error(error); // ZodError with detailed issues
}

// SafeParse — returns result object (never throws)
const result = contactFormSchema.safeParse({
  name: "",
  email: "not-an-email",
  message: "Hi",
});

if (!result.success) {
  console.error(result.error.issues);
  // [
  //   { path: ["name"], message: "Name is required" },
  //   { path: ["email"], message: "Invalid email address" },
  //   { path: ["message"], message: "Message must be at least 10 characters" },
  // ]
}
```

### Activity: Derive TypeScript Types from Zod (15 min)

```typescript
// Infer TypeScript types from Zod schemas — single source of truth!
type ContactForm = z.infer<typeof contactFormSchema>;
// Equivalent to: { name: string; email: string; message: string }

// This is how Reading Advantage does it:
// packages/types defines Zod schemas
// packages/api imports them for tRPC input validation
// packages/domain uses the inferred types
// Everyone agrees on the shape because it comes from one schema

const projectSchema = z.object({
  id: z.number(),
  title: z.string(),
  description: z.string(),
  technologies: z.array(z.string()),
  status: z.enum(["not-started", "in-progress", "completed"]),
  url: z.string().url().optional(),
});

type Project = z.infer<typeof projectSchema>;
```

### Activity: Add Zod Validation to Contact Form (15 min)

```typescript
const contactFormSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  message: z.string().min(10, "Message must be at least 10 characters"),
});

type ContactForm = z.infer<typeof contactFormSchema>;

const handleFormSubmit = (formData: unknown): { success: boolean; errors?: string[] } => {
  const result = contactFormSchema.safeParse(formData);

  if (!result.success) {
    const errors = result.error.issues.map((issue) => issue.message);
    return { success: false, errors };
  }

  const data: ContactForm = result.data;
  console.log("Valid form data:", data);
  return { success: true };
};
```

### Activity: Commit (5 min)

```bash
git add script.ts
git commit -m "feat: add Zod validation to contact form"
git push
```

### Closing

- Zod schemas, safeParse, type inference ✓
- Preview: Period 4 covers the JS → TS conversion process

---

## Period 4: Converting JavaScript to TypeScript

**Duration:** ~60 minutes

### Opening (5 min)

- Converting an existing JS project to TS is a real-world skill
- The Reading Advantage monorepo went through this migration (some apps still use Prisma/JS)
- Today: convert the portfolio from JS to TS step by step

### Activity: Set Up TypeScript in the Portfolio (15 min)

1. Install TypeScript and create config:
   ```bash
   pnpm add -D typescript@5.9.3
   ```

2. Create `tsconfig.json`:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ES2022",
       "moduleResolution": "bundler",
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "outDir": "./dist",
       "rootDir": "./src"
     },
     "include": ["src/**/*"],
     "exclude": ["node_modules", "dist"]
   }
   ```

3. Move files:
   ```bash
   mkdir src
   mv script.js src/index.ts
   ```

### Activity: Incremental Conversion Strategy (20 min)

The Reading Advantage approach: **incremental, not big-bang**

1. **Rename `.js` → `.ts`** one file at a time
2. **Fix type errors** that appear (start with `any`, then refine)
3. **Add interfaces** for data structures
4. **Replace `any`** with proper types
5. **Add Zod schemas** at API boundaries

For the portfolio:
```typescript
// src/index.ts — converted from script.js

import { z } from "zod";

// Types (previously untyped)
interface Skill {
  name: string;
  category: "frontend" | "backend" | "tools";
  level: "not-started" | "learning" | "comfortable";
}

interface Project {
  id: number;
  title: string;
  description: string;
  technologies: string[];
  url?: string;
}

const contactFormSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  message: z.string().min(10),
});

// Functions (previously had no parameter/return types)
const renderSkills = (skills: Skill[], filter: string = "all"): void => {
  const filtered = filter === "all"
    ? skills
    : skills.filter((s) => s.category === filter);

  const ul = document.querySelector("#skills ul");
  if (!ul) return; // strict null check!

  ul.innerHTML = filtered
    .map((skill) => `<li class="skill-${skill.level}">${skill.name}</li>`)
    .join("");
};

const loadProjects = async (): Promise<Project[]> => {
  const response = await fetch("./data/projects.json");
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
};
```

### Activity: Fix Common Type Errors (15 min)

```typescript
// Error: Object is possibly null
const hero = document.getElementById("hero");
hero.querySelector("h1").textContent = "New"; // ❌ hero could be null

// Fix 1: Early return
const hero = document.getElementById("hero");
if (!hero) return;
hero.querySelector("h1")!.textContent = "New"; // non-null assertion (use sparingly)

// Fix 2: Optional chaining
document.getElementById("hero")?.querySelector("h1")?.remove();

// Error: Type 'string' is not assignable to type '"frontend" | "backend" | "tools"'
const category = "frontend" as const; // literal type

// Error: Parameter 'event' implicitly has an 'any' type
form.addEventListener("submit", (event: Event) => {
  event.preventDefault();
});
```

### Activity: Commit (5 min)

```bash
git add -A
git commit -m "feat: convert portfolio from JavaScript to TypeScript"
git push
```

### Closing

- JS → TS conversion strategy ✓
- Preview: Period 5 wraps up with exercise and quiz

---

## Period 5: Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- TypeScript unit nearly complete
- Today: exercise and quiz

### Activity: Exercise — Convert a JS Module to TypeScript with Zod (40 min)

**Exercise repo:** `codecamp-typescript-exercise`

The intern forks the exercise repo which contains:
- `src/users.js` — a module with functions to fetch, filter, and sort users
- `src/api.js` — a module with a generic fetch wrapper
- `data/users.json` — sample data
- A README with requirements

Requirements:
1. Rename `.js` → `.ts` and fix all type errors
2. Create an interface for the User object: `{ id: number; name: string; email: string; role: "admin" | "editor" | "viewer"; department: string }`
3. Add type annotations to all function parameters and return types
4. Create a Zod schema for User and derive the TypeScript type from it
5. Add Zod validation when parsing the JSON response from fetch
6. Use generics for the API fetch wrapper: `apiFetch<T>(url: string): Promise<T>`
7. Handle null checks with early returns (no non-null assertions)
8. `strict: true` in tsconfig — no `any` types allowed

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What is the difference between an interface and a type alias? (interface = object shape, extendable; type = unions, intersections, utilities)
2. How do you derive a TypeScript type from a Zod schema? (`z.infer<typeof schema>`)
3. What does `strict: true` enable in tsconfig? (noImplicitAny, strictNullChecks, etc.)
4. How do you narrow a union type `string | number`? (typeof check: `if (typeof x === "string")`)
5. Why use Zod when TypeScript already has types? (TypeScript checks compile-time only; Zod validates at runtime)

### Closing

- TypeScript unit complete — portfolio is now type-safe
- Next unit: Testing with Vitest
