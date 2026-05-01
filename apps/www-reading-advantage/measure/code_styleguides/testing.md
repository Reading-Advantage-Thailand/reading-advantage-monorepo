# Testing Conventions

## Overview

This project uses Vitest for unit/integration tests and Playwright for E2E tests.

## Running Tests

```bash
npm test           # Run unit tests once
npm run test:watch # Run unit tests in watch mode
npm run test:coverage # Run with coverage report
npm run test:e2e  # Run E2E tests
```

## Test File Naming

- Unit/Integration tests: `*.test.ts` or `*.test.tsx` in `src/`
- E2E tests: `*.spec.ts` in `e2e/`

## Writing Unit Tests

### Basic structure

```typescript
import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ComponentName from "@/path/to/component";

afterEach(() => {
  cleanup();
});

describe("ComponentName", () => {
  it("does something specific", () => {
    render(<ComponentName prop="value" />);
    expect(screen.getByRole("heading")).toBeInTheDocument();
  });
});
```

### Mocking next/navigation

```typescript
vi.mock("next/navigation", () => ({
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    replace: vi.fn(),
    refresh: vi.fn(),
  })),
  usePathname: vi.fn(() => "/"),
}));
```

### Mocking next-international

```typescript
vi.mock("@/locales/client", () => ({
  useScopedI18n: vi.fn((scope: string) => (key: string) => `${scope}.${key}`),
  useCurrentLocale: vi.fn(() => "en"),
  useChangeLocale: vi.fn(() => vi.fn()),
}));

vi.mock("@/locales/server", () => ({
  getScopedI18n: vi.fn(
    (scope: string) => async (key: string) => `${scope}.${key}`,
  ),
}));
```

### Testing utility functions

Utility functions in `src/lib/` should be exported and tested directly:

```typescript
import { describe, it, expect } from "vitest";
import { utilityFunction } from "@/lib/utils";

describe("utilityFunction", () => {
  it("handles happy path", () => {
    expect(utilityFunction("input")).toBe("expected");
  });

  it("handles edge case", () => {
    expect(utilityFunction("")).toBe("default");
  });
});
```

## Writing E2E Tests

### Basic structure

```typescript
import { test, expect } from "@playwright/test";

test.describe("Page Name", () => {
  test("does something", async ({ page }) => {
    await page.goto("/en/page");
    await expect(page.getByRole("heading", { name: "Title" })).toBeVisible();
  });
});
```

### Navigation

Use `exact: true` with `getByRole` or `getByText` to avoid ambiguity:

```typescript
// Prefer this (exact match)
page.getByRole("heading", { name: "Exact Title", exact: true });

// Avoid this (matches partial text)
page.getByRole("heading", { name: /title/i });
```

### URL assertions

```typescript
await expect(page).toHaveURL(/.*\/en\/products/);
```

## Coverage Targets

- Utility functions: >80% line coverage
- Components: Core functionality covered
- E2E: Critical user paths

## CI Integration

- Unit tests run on every PR
- E2E tests run on every PR (non-blocking initially)
- Both must pass before merge (E2E can be made blocking in future)
