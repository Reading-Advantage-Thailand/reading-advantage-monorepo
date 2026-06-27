# SA-Batch-06 Line Review Report

**Track:** `science_advantage_review_20260626`  
**Batch:** `sa-batch-06`  
**Date:** 2026-06-27  
**Reviewer:** AI line-review agent  
**Scope:** 20 files — auth UI, class card components, gamification animations + tests, lesson block tests  
**Focus:** correctness, security/tenancy/auth, AGENTS compliance, test quality, architecture baseline/golden-path patterns  
**Policy:** No app code edits; no acceptance/closeout claims.

---

## Files Reviewed

| # | File | Lines |
|---|------|-------|
| 1 | `apps/science-advantage/components/features/auth/signin-container.tsx` | 43 |
| 2 | `apps/science-advantage/components/features/auth/signin-form.tsx` | 149 |
| 3 | `apps/science-advantage/components/features/auth/user-menu.tsx` | 126 |
| 4 | `apps/science-advantage/components/features/classes/class-card-skeleton.tsx` | 22 |
| 5 | `apps/science-advantage/components/features/classes/class-card.tsx` | 83 |
| 6 | `apps/science-advantage/components/features/classes/create-class-form.tsx` | 248 |
| 7 | `apps/science-advantage/components/features/gamification/__tests__/badge-unlock-animation.test.tsx` | 128 |
| 8 | `apps/science-advantage/components/features/gamification/__tests__/confetti-celebration.test.tsx` | 108 |
| 9 | `apps/science-advantage/components/features/gamification/__tests__/level-up-animation.test.tsx` | 164 |
| 10 | `apps/science-advantage/components/features/gamification/badge-unlock-animation.tsx` | 84 |
| 11 | `apps/science-advantage/components/features/gamification/confetti-celebration.tsx` | 174 |
| 12 | `apps/science-advantage/components/features/gamification/level-up-animation.tsx` | 104 |
| 13 | `apps/science-advantage/components/features/lesson/__tests__/image-gallery.test.tsx` | 147 |
| 14 | `apps/science-advantage/components/features/lesson/__tests__/lesson-player.test.tsx` | 560 |
| 15 | `apps/science-advantage/components/features/lesson/__tests__/materials-block.test.tsx` | 97 |
| 16 | `apps/science-advantage/components/features/lesson/__tests__/procedure-block.test.tsx` | 124 |
| 17 | `apps/science-advantage/components/features/lesson/__tests__/quiz-block.test.tsx` | 273 |
| 18 | `apps/science-advantage/components/features/lesson/__tests__/reading-passage-block.test.tsx` | 98 |
| 19 | `apps/science-advantage/components/features/lesson/__tests__/review-block.test.tsx` | 174 |
| 20 | `apps/science-advantage/components/features/lesson/__tests__/text-block.test.tsx` | 112 |

---

## Finding Summary

| Severity | Count |
|----------|-------|
| CRITICAL | 0 |
| HIGH | 1 |
| MEDIUM | 8 |
| LOW | 5 |
| **Total** | **14** |

---

## Findings

### F-SA-B06-001 — Demo credentials bundled in client JS regardless of environment

**File:** `signin-form.tsx`  
**Lines:** 12–17  
**Severity:** MEDIUM  
**Category:** Security

`DEMO_ACCOUNTS` is defined as a module-level const containing four sets of username/password credentials. These are referenced on line 132 inside JSX that is dead-code-eliminated when `NODE_ENV === "production"` (early return on line 28). However, the credentials are still present in the module scope of the client bundle. Production dead-code elimination depends on the bundler correctly removing the conditional branch; if tree-shaking fails, credentials leak to production.

**Recommendation:** Guard the entire import or use a dynamic `await import()` inside the dev branch.

---

### F-SA-B06-002 — Post-login redirect always goes to `/student` regardless of role

**File:** `signin-form.tsx`  
**Line:** 54  
**Severity:** MEDIUM  
**Category:** Correctness / UX

After successful login via `await login(username, password)`, the redirect target is hardcoded to `router.push('/student')`. The comment on line 53 says "session will be available after page reload" but does not account for roles such as `TEACHER`, `ADMIN`, or `SYSTEM`, who should be redirected to their respective dashboards (`/teacher`, `/admin`, `/system`).

**Recommendation:** Read the user's role from the session/auth state after login and redirect accordingly.

---

### F-SA-B06-003 — `ROLE_HIERARCHY` missing auth roles from shared adapter

**File:** `user-menu.tsx`  
**Line:** 26–31  
**Severity:** MEDIUM  
**Category:** Correctness / Tenancy

The role hierarchy defines only `STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM`. The shared auth adapter (`@reading-advantage/auth-client` / `AuthUser.role`) also includes `"INTERN"`, `"SALES_REP"`, and `"SALES_ADMIN"`. These unmapped roles produce `undefined` when looked up on line 39.

**Recommendation:** Add all union members from `AuthUser.role` to the hierarchy, or add a fallback that assigns a minimum level for unknown roles.

---

### F-SA-B06-004 — Unhandled role silently hides all navigation items

**File:** `user-menu.tsx`  
**Line:** 39, 83  
**Severity:** HIGH  
**Category:** Correctness

When a user has a role not present in `ROLE_HIERARCHY` (e.g., `INTERN`, `SALES_REP`, `SALES_ADMIN`), `ROLE_HIERARCHY[userRole]` returns `undefined`. The filter on line 83 evaluates `undefined >= item.requiredLevel`, which is `false` for all items. The user sees an empty navigation menu with no explanation.

This is a direct consequence of F-SA-B06-003 but is raised separately because its impact (silently empty nav) is a user-facing bug.

**Recommendation:** Same as B06-003 — handle all roles and provide a fallback.

---

### F-SA-B06-005 — Unnecessary `"use client"` on skeleton component

**File:** `class-card-skeleton.tsx`  
**Line:** 1  
**Severity:** LOW  
**Category:** Architecture / RSC / AGENTS compliance

`ClassCardSkeleton` uses no hooks, browser APIs, event handlers, or state. The `"use client"` directive forces client-side rendering for a purely presentational component, defeating RSC optimization.

**Recommendation:** Remove `"use client"`.

---

### F-SA-B06-006 — Unnecessary `"use client"` on class card component

**File:** `class-card.tsx`  
**Line:** 1  
**Severity:** LOW  
**Category:** Architecture / RSC / AGENTS compliance

Same as B06-005. `ClassCard` is a pure presentational component (renders a `<Link>` with formatted text). No hooks or browser APIs are used.

**Recommendation:** Remove `"use client"`.

---

### F-SA-B06-007 — API response type defined inline rather than shared contract

**File:** `create-class-form.tsx`  
**Lines:** 68–84  
**Severity:** LOW  
**Category:** Architecture / Golden path

`CreateClassResponse` is defined as a local type union inside the component file. The monorepo pattern (per AGENTS.md) encourages shared Zod contracts in `@reading-advantage/types`. An inline type cannot be reused by the API route handler or tests and is prone to drift.

**Recommendation:** Define the response contract in `@reading-advantage/types` or the owning backend module.

---

### F-SA-B06-008 — Direct `fetch` to API route instead of domain function call

**File:** `create-class-form.tsx`  
**Line:** 106  
**Severity:** MEDIUM  
**Category:** Architecture / AGENTS compliance

The component calls `fetch("/api/classes", { method: "POST", ... })` directly. Per AGENTS.md: "Core business logic must not depend on a transport layer" and "business logic must not live in React components." This pattern couples the UI to the API route path and bypasses the backend module abstraction.

**Recommendation:** Use a client library function or server action that calls the domain function directly.

---

### F-SA-B06-009 — `clientLogger.error` suppressed in production, making production debugging opaque

**File:** `create-class-form.tsx`  
**Line:** 145 (invokes `client-logger.ts` line 14)  
**Severity:** MEDIUM  
**Category:** Observability

`client-logger.ts` line 14 returns early when `process.env.NODE_ENV === 'production'`. This means production errors — including `"Unable to create class"` toast triggers — produce no console trail. Developers cannot diagnose production issues from client-side logs.

**Recommendation:** Route production errors to a remote logging service instead of suppressing them. At minimum, log errors unconditionally to a telemetry endpoint.

---

### F-SA-B06-010 — Fake timers not restored in `afterEach`, risking cross-test contamination

**Files:**  
- `badge-unlock-animation.test.tsx` (lines 79, 92)  
- `confetti-celebration.test.tsx` (lines 69, 94)  
- `level-up-animation.test.tsx` (lines 71, 84)  

**Severity:** MEDIUM  
**Category:** Test quality

`vi.useRealTimers()` is called inside individual test `it()` blocks but not in the shared `afterEach`. If a fake-timer test throws before reaching `vi.useRealTimers()`, the fake timer state leaks to subsequent tests, causing them to hang or behave unexpectedly.

**Recommendation:** Add `vi.useRealTimers()` to the `afterEach` hook in each test file that uses `vi.useFakeTimers()`.

---

### F-SA-B06-011 — Vacuously-passing assertion in reduced-motion particles test

**File:** `level-up-animation.test.tsx`  
**Line:** 143  
**Severity:** MEDIUM  
**Category:** Test quality

```ts
expect(true).toBe(true);
```

This assertion is a no-op that always passes. It was presumably intended to handle the case where no `[aria-hidden="true"]` container exists, but the pattern guarantees the test passes regardless of whether particles are correctly hidden. If the component later regresses and renders particles despite reduced motion, this test will not catch it.

**Recommendation:** Replace with a conditional assertion that is meaningful: either `expect(container).toBeNull()` or `expect(particles.length).toBe(0)` with a simpler DOM query.

---

### F-SA-B06-012 — Unused `userEvent` import

**File:** `level-up-animation.test.tsx`  
**Line:** 3  
**Severity:** LOW  
**Category:** Code quality

`userEvent` from `@testing-library/user-event` is imported but never used in this test file. All user interactions are handled via `fireEvent` equivalents or direct render checks.

**Recommendation:** Remove the unused import.

---

### F-SA-B06-013 — Type import should use `import type` syntax

**File:** `badge-unlock-animation.tsx`  
**Line:** 5  
**Severity:** LOW  
**Category:** Code quality / AGENTS compliance

```ts
import { BadgeDefinition } from '@/lib/gamification/badges.constants';
```

`BadgeDefinition` is an interface (a type-only export). Per project conventions (and the `@typescript-eslint/consistent-type-imports` rule that typically ships with the toolchain), this should use `import type`.

**Recommendation:** Change to `import type { BadgeDefinition } from '@/lib/gamification/badges.constants'`.

---

### F-SA-B06-014 — Incomplete `defaultValues` for form fields

**File:** `create-class-form.tsx`  
**Lines:** 90–92  
**Severity:** MEDIUM  
**Category:** Correctness / UX

```ts
defaultValues: {
  name: "",
} as Partial<CreateClassFormInput>,
```

Only `name` is given a default value. `gradeLevel` and `standardsAlignment` are left `undefined`. When the Select components for these fields initially receive `undefined`, they render without a selection. Once the user makes a selection, react-hook-form transitions from uncontrolled to controlled, which can trigger React lifecycle warnings and cause subtle form-state issues.

**Recommendation:** Provide explicit default values for all form fields.

---

## Findings by File

| File | Findings |
|------|----------|
| `signin-container.tsx` | — |
| `signin-form.tsx` | **F-SA-B06-001**, **F-SA-B06-002** |
| `user-menu.tsx` | **F-SA-B06-003**, **F-SA-B06-004** |
| `class-card-skeleton.tsx` | **F-SA-B06-005** |
| `class-card.tsx` | **F-SA-B06-006** |
| `create-class-form.tsx` | **F-SA-B06-007**, **F-SA-B06-008**, **F-SA-B06-009**, **F-SA-B06-014** |
| `badge-unlock-animation.test.tsx` | **F-SA-B06-010** |
| `confetti-celebration.test.tsx` | **F-SA-B06-010** |
| `level-up-animation.test.tsx` | **F-SA-B06-010**, **F-SA-B06-011**, **F-SA-B06-012** |
| `badge-unlock-animation.tsx` | **F-SA-B06-013** |
| `confetti-celebration.tsx` | — |
| `level-up-animation.tsx` | — |
| `image-gallery.test.tsx` | — |
| `lesson-player.test.tsx` | — |
| `materials-block.test.tsx` | — |
| `procedure-block.test.tsx` | — |
| `quiz-block.test.tsx` | — |
| `reading-passage-block.test.tsx` | — |
| `review-block.test.tsx` | — |
| `text-block.test.tsx` | — |

---

## Strengths Observed

1. **Comprehensive test coverage**: `lesson-player.test.tsx` (560 lines) is an exemplary test file covering rendering of all block types, bilingual content, error boundaries, IntersectionObserver callbacks, accessibility, and reduced-motion. The fixture pattern (`createTextBlock`, `createVocabularyBlock`, etc.) is clean and reusable.

2. **Consistent bilingual pattern**: Every lesson block test and production component handles EN/TH content with proper fallback when Thai is missing — demonstrated across `text-block.test.tsx` (lines 72–85), `reading-passage-block.test.tsx` (lines 74–80), and `procedure-block.test.tsx` (lines 115–122).

3. **Accessibility-first**: Multiple components use `role="alert"`, `aria-label`, `aria-hidden`, and `role="region"` — verified in tests for badge (line 48), level-up (line 40), confetti (line 65), lesson player (line 486), quiz (line 253), and review (line 162).

4. **Reduced-motion support**: All three gamification components check `(prefers-reduced-motion: reduce)` and either skip animations or render a static fallback. Tests verify this behavior explicitly (e.g., `confetti-celebration.test.tsx` line 50, `level-up-animation.test.tsx` line 87).

5. **Auth adapter usage**: Both `signin-form.tsx` and `user-menu.tsx` correctly call `useAuth()` from `@reading-advantage/auth-client` rather than accessing auth internals directly — aligning with AGENTS.md adapter policy.

---

## Weak Patterns

1. **`"use client"` overuse**: Both `class-card-skeleton.tsx` and `class-card.tsx` use `"use client"` unnecessarily, forcing client-side rendering for purely presentational components. This pattern was common in early Next.js 13/14 adoption but should be cleaned up for RSC optimization.

2. **No shared response contracts**: `create-class-form.tsx` defines its API response type inline (lines 68–84) instead of using a shared Zod contract from `@reading-advantage/types`. This couples the component to a specific API shape and prevents reuse.

3. **Direct `fetch` to API routes**: `create-class-form.tsx` line 106 calls `fetch("/api/classes", ...)` instead of invoking a domain function or client library. This couples the UI to the API route path and makes it harder to migrate between transport layers (AGENTS.md violation).

4. **Production logging suppression**: `client-logger.ts` silences all log levels in production. While suppressing `console.debug`/`console.info` in production is reasonable, suppressing `console.error` means production errors are invisible to developers.

5. **Fake-timer cleanup risk**: Three test files use `vi.useFakeTimers()` without restoring in `afterEach`. A test failure before `vi.useRealTimers()` leaks fake timer state to subsequent tests.

---

## Limitations

- **No runtime execution**: Findings are based on static analysis and code reading. Tests were not run. Some findings may not reproduce in actual test runs.
- **No cross-file data-flow tracing**: API route handlers, domain functions, and database queries referenced by these components were not reviewed. The review assumes the interfaces at the component boundary are correct.
- **No CSS/animation rendering review**: Animation classes (`animate-badge-unlock`, `animate-level-up`, `particle-burst`) are assumed to exist in the Tailwind config or global CSS; actual rendering was not verified.
- **No dependency graph walk**: Imports were verified against the files that exist at HEAD, but indirect re-export chains (e.g., through `@/lib/enums` → `@reading-advantage/types`) were only spot-checked.
- **`dev-impersonation-panel.tsx` excluded**: Referenced on `signin-container.tsx` line 4 but not in this batch's file list.

---

## Conclusion

The 20 files in SA-batch-06 are **generally well-structured** with good test coverage, consistent bilingual patterns, and strong accessibility support. The lesson-block tests are particularly thorough.

**14 findings** were identified: 1 HIGH, 8 MEDIUM, 5 LOW. The highest-impact issues are the silent-empty-nav bug for unhandled roles (F-SA-B06-004) and the demo-credential bundling concern (F-SA-B06-001). The most common medium-severity issues are related to test isolation (fake-timer cleanup) and architecture pattern violations (direct fetch, missing domain abstraction).

No CRITICAL security or tenancy issues were found. All components correctly use the auth adapter; no multi-tenancy concerns apply to these UI-layer files (they operate at the presentation boundary). This batch does not contain backend domain functions, so the "every query scoped by `schoolId`" rule was not applicable.
