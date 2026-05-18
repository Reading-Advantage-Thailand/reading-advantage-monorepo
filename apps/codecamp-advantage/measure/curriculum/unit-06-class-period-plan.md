# Unit 06 Class Period Plans: Testing with Vitest

---

## Period 1: Writing Unit Tests

**Duration:** ~60 minutes

### Opening (5 min)

- Tests prove your code works and protect against regressions
- The Reading Advantage monorepo requires tests for all new backend code
- Today: write your first unit tests with Vitest 4.1.5

### Activity: Set Up Vitest (10 min)

```bash
pnpm add -D vitest@4.1.5
```

Add to `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

Create `vitest.config.ts`:
```typescript
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
  },
});
```

### Activity: First Test — AAA Pattern (20 min)

```typescript
// src/utils.ts
export const truncate = (text: string, maxLength: number = 100): string => {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
};

// src/__tests__/utils.test.ts
import { describe, it, expect } from "vitest";
import { truncate } from "../utils.js";

describe("truncate", () => {
  it("returns the original text when shorter than maxLength", () => {
    // Arrange
    const text = "Hello";
    const maxLength = 10;

    // Act
    const result = truncate(text, maxLength);

    // Assert
    expect(result).toBe("Hello");
  });

  it("truncates text and adds ellipsis when longer than maxLength", () => {
    const result = truncate("Hello, World!", 5);
    expect(result).toBe("Hello...");
  });

  it("returns the original text when exactly maxLength", () => {
    const result = truncate("Hello", 5);
    expect(result).toBe("Hello");
  });

  it("uses 100 as default maxLength", () => {
    const longText = "a".repeat(101);
    const result = truncate(longText);
    expect(result).toBe("a".repeat(100) + "...");
  });
});
```

Run: `pnpm test`

### Activity: More Matchers (15 min)

```typescript
// src/__tests__/utils.test.ts — more tests

import { formatDate } from "../utils.js";

describe("formatDate", () => {
  it("formats a date in English long format", () => {
    const date = new Date("2026-01-15");
    const result = formatDate(date);
    expect(result).toBe("January 15, 2026");
  });

  it("throws for invalid date", () => {
    expect(() => formatDate(new Date("invalid"))).toThrow();
  });
});

// Object comparison with toEqual
describe("array helpers", () => {
  const skills = [
    { name: "HTML", category: "frontend" },
    { name: "CSS", category: "frontend" },
    { name: "Git", category: "tools" },
  ];

  it("filters by category", () => {
    const result = filterByCategory(skills, "frontend");
    expect(result).toEqual([
      { name: "HTML", category: "frontend" },
      { name: "CSS", category: "frontend" },
    ]);
  });

  it("returns empty array when no match", () => {
    const result = filterByCategory(skills, "backend");
    expect(result).toEqual([]);
    expect(result).toHaveLength(0);
  });
});
```

### Activity: Commit (5 min)

```bash
git add src/__tests__/ utils.ts vitest.config.ts package.json
git commit -m "feat: add Vitest unit tests for utility functions"
git push
```

### Closing (5 min)

- Unit tests with AAA pattern, matchers ✓
- Preview: Period 2 covers mocking

---

## Period 2: Mocking

**Duration:** ~60 minutes

### Opening (5 min)

- Real code calls APIs, reads files, talks to databases
- Tests need to control these dependencies
- Today: mock functions and modules with `vi.fn()` and `vi.mock()`

### Activity: vi.fn() — Mock Functions (20 min)

```typescript
// Mock a callback
import { describe, it, expect, vi } from "vitest";

const onClick = vi.fn(); // Creates a mock function

onClick("hello");
onClick("world");

expect(onClick).toHaveBeenCalled();          // Called at least once
expect(onClick).toHaveBeenCalledTimes(2);    // Called exactly twice
expect(onClick).toHaveBeenCalledWith("hello"); // Called with specific args

// Mock return value
const getUserName = vi.fn().mockReturnValue("Alice");
expect(getUserName()).toBe("Alice");

// Mock implementation
const calculate = vi.fn((a: number, b: number) => a + b);
expect(calculate(2, 3)).toBe(5);
```

### Activity: vi.mock() — Mock Modules (20 min)

```typescript
// src/__tests__/api.test.ts
import { describe, it, expect, vi } from "vitest";

// Mock the fetch API globally
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

import { loadProjects } from "../api.js";

describe("loadProjects", () => {
  it("fetches and returns project data", async () => {
    // Arrange
    const mockProjects = [
      { id: 1, title: "Portfolio", description: "My site" },
    ];
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockProjects),
    });

    // Act
    const result = await loadProjects();

    // Assert
    expect(result).toEqual(mockProjects);
    expect(mockFetch).toHaveBeenCalledWith("./data/projects.json");
  });

  it("throws when response is not ok", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      statusText: "Internal Server Error",
    });

    await expect(loadProjects()).rejects.toThrow("HTTP 500");
  });
});
```

### Activity: Mocking Zod Validation (10 min)

```typescript
// Test that validation errors are handled
describe("contact form validation", () => {
  it("returns errors for invalid form data", () => {
    const result = contactFormSchema.safeParse({
      name: "",
      email: "not-email",
      message: "Hi",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues).toHaveLength(3);
    }
  });

  it("passes for valid form data", () => {
    const result = contactFormSchema.safeParse({
      name: "Alice",
      email: "alice@example.com",
      message: "Hello, I'd like to connect!",
    });

    expect(result.success).toBe(true);
  });
});
```

### Activity: Commit (5 min)

```bash
git add src/__tests__/api.test.ts
git commit -m "feat: add mocked tests for API fetch and Zod validation"
git push
```

### Closing

- Mocking with vi.fn() and vi.mock() ✓
- Preview: Period 3 covers async testing and TDD

---

## Period 3: Async Testing and TDD

**Duration:** ~60 minutes

### Opening (5 min)

- Most real code is async (API calls, database queries)
- TDD: write the test first, then write the code
- Today: test async code and practice the TDD cycle

### Activity: Testing Async Functions (20 min)

```typescript
describe("async helpers", () => {
  it("resolves with data for successful fetch", async () => {
    const mockData = { id: 1, name: "Test" };
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockData),
    });

    // Option 1: await + expect
    const result = await loadProject(1);
    expect(result).toEqual(mockData);

    // Option 2: resolves matcher
    await expect(loadProject(1)).resolves.toEqual(mockData);
  });

  it("rejects with error for failed fetch", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 404,
      statusText: "Not Found",
    });

    await expect(loadProject(999)).rejects.toThrow("HTTP 404");
  });

  it("handles network errors", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));

    await expect(loadProject(1)).rejects.toThrow("Network error");
  });
});
```

### Activity: TDD — Red, Green, Refactor (25 min)

**The TDD Cycle:**
1. **RED** — Write a failing test (it describes what you want)
2. **GREEN** — Write the minimum code to make it pass
3. **REFACTOR** — Clean up while keeping tests green

Practice: Build a `validateEmail` function using TDD.

```typescript
// Step 1: RED — write the test first
// src/__tests__/validate-email.test.ts
import { describe, it, expect } from "vitest";
import { validateEmail } from "../validate-email.js";

describe("validateEmail", () => {
  it("returns valid for a correct email", () => {
    expect(validateEmail("user@example.com")).toEqual({ valid: true });
  });

  it("returns invalid for missing @", () => {
    expect(validateEmail("userexample.com")).toEqual({
      valid: false,
      error: "Missing @ symbol",
    });
  });

  it("returns invalid for empty string", () => {
    expect(validateEmail("")).toEqual({
      valid: false,
      error: "Email is required",
    });
  });

  it("returns invalid for spaces", () => {
    expect(validateEmail("user @example.com")).toEqual({
      valid: false,
      error: "Email cannot contain spaces",
    });
  });
});
```

Run: `pnpm test` → all tests fail (RED) ✓

```typescript
// Step 2: GREEN — write the minimum code
// src/validate-email.ts
export const validateEmail = (email: string) => {
  if (!email) return { valid: false, error: "Email is required" };
  if (email.includes(" ")) return { valid: false, error: "Email cannot contain spaces" };
  if (!email.includes("@")) return { valid: false, error: "Missing @ symbol" };
  return { valid: true };
};
```

Run: `pnpm test` → all tests pass (GREEN) ✓

```typescript
// Step 3: REFACTOR — can we simplify? (tests still pass)
export const validateEmail = (email: string) => {
  if (!email) return { valid: false, error: "Email is required" };
  if (/\s/.test(email)) return { valid: false, error: "Email cannot contain spaces" };
  if (!email.includes("@")) return { valid: false, error: "Missing @ symbol" };
  return { valid: true };
};
```

### Activity: Commit (10 min)

```bash
git add src/validate-email.ts src/__tests__/validate-email.test.ts
git commit -m "feat: add validateEmail function built with TDD"
git push
```

### Closing

- Async testing, TDD cycle ✓
- Preview: Period 4 covers coverage and quiz

---

## Period 4: Coverage, Exercise, Quiz

**Duration:** ~60 minutes

### Opening (5 min)

- Test coverage tells you what code your tests exercise
- Reading Advantage targets >80% coverage for new code
- Today: measure coverage, complete the exercise, take the quiz

### Activity: Measuring Coverage (15 min)

```bash
pnpm add -D @vitest/coverage-v8
```

```bash
# Run with coverage
pnpm vitest run --coverage
```

Output shows per-file coverage:
```
% Stmts  % Branch  % Funcs  % Lines  Uncovered Line #s
--------|---------|--------|---------|-------------------
  85.71 |    75    |  100   |  85.71  | 12-14
```

Key metrics:
- **Statements** — how many statements were executed
- **Branches** — how many if/else paths were taken
- **Functions** — how many functions were called
- **Lines** — how many lines were executed

**What >80% coverage means:**
- At least 80% of statements, branches, functions, and lines are tested
- Not 100% — some error paths or edge cases may not be worth testing
- Focus on testing **behavior**, not lines

### Activity: Exercise — Write Tests Using TDD (30 min)

**Exercise repo:** `codecamp-exercise-vitest`

The intern forks the exercise repo which contains:
- `src/string-utils.ts` — with empty function signatures and JSDoc descriptions
- `src/__tests__/string-utils.test.ts` — with empty test blocks
- A README with requirements

Requirements — build these functions using TDD (write test first):

1. `capitalize(str: string): string` — capitalize the first letter
   - "hello" → "Hello", "" → "", "a" → "A"

2. `camelCase(str: string): string` — convert kebab/snake case to camelCase
   - "hello-world" → "helloWorld", "my_var_name" → "myVarName"

3. `pluralize(word: string, count: number): string` — singular/plural
   - ("cat", 1) → "cat", ("cat", 2) → "cats", ("sheep", 2) → "sheep"

4. `parseQueryString(query: string): Record<string, string>`
   - "?name=Alice&age=20" → { name: "Alice", age: "20" }
   - "" → {}
   - "?key" → { key: "" }

5. Write tests for each function using the AAA pattern
6. Achieve >80% coverage
7. Use `vi.fn()` or `vi.mock()` where appropriate

The intern creates a branch, implements, and opens a PR for LLM review.

### Quiz (10 min)

5 questions covering:

1. What is the AAA pattern? (Arrange, Act, Assert — structure for test clarity)
2. What does `vi.fn()` create? (a mock function you can assert against)
3. What are the three steps of TDD? (Red → Green → Refactor)
4. What does `--coverage` measure? (percentage of code exercised by tests)
5. Why mock fetch in tests instead of calling the real API? (deterministic, fast, no network dependency)

### Closing

- Testing unit complete — portfolio has tests
- **Phase A complete!** The Personal Portfolio Website is built, styled, interactive, typed, and tested
- Next: Phase B — React, APIs, and Next.js
