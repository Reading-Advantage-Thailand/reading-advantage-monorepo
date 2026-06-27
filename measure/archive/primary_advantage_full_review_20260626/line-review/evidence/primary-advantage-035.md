# Line Review Evidence: primary-advantage-035

Reviewer: coder-deepseek-v4-flash/primary-advantage-035
Files assigned: 1
Lines assigned: 1128

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx` | 1-1128 | reviewed | 7 |

## Findings

### LR-primary-advantage-035-001 — `update()` function and `session` variable not in scope (runtime error)

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:286-290`
- Evidence: Lines 286-290 call `update({ user: { ...session?.user } })`. Neither `update` nor `session` are defined anywhere in the component. The component imports `useSession` from `@reading-advantage/auth-client` (line 42) and destructures only `{ user }` on line 119. There is no `update` import, no `update` variable, no `session` variable. This appears to be leftover code from a copy-paste or an incomplete refactoring of a session-update pattern. This code executes when the game completes (all sentences answered), at which point it will throw a ReferenceError, preventing user activity from being saved.
- Impact: Runtime crash when user completes the word-ordering game. The `updateUserActivity` call on line 276 succeeds, but then lines 286-290 crash. The crash is unhandled (no try-catch around it), so the user will see an error page or unhandled rejection.
- Recommendation: Remove lines 286-290 entirely if session update is not needed, or define the proper `update` import and `session` variable from the auth client.

### LR-primary-advantage-035-002 — Backend logic in local server actions instead of shared domain package

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:39-40`
- Evidence: Lines 39-40 import `getLessonOrderingWords` from `@/actions/flashcard` and `updateUserActivity` from `@/actions/user`. These are Next.js Server Actions local to the app. The monorepo convention (root AGENTS.md) requires business logic in `packages/backend` domain modules, not in server actions. This couples the game component to a transport-specific action layer, preventing reuse from workers, CLI tools, or API routes.
- Impact: Business logic is not portable. The `getLessonOrderingWords` query and `updateUserActivity` mutation cannot be called from workers, cron jobs, or test fixtures without going through Next.js.
- Recommendation: Move ordering-words query and activity update to `packages/domain` (or `packages/backend`) as domain functions, then re-export thin server action wrappers if Next.js integration is needed.

### LR-primary-advantage-035-003 — Hardcoded language mapping duplicates i18n config

- Severity: Low
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:95-100`
- Evidence: Lines 95-100 define `SUPPORTED_LANGUAGES` as a hardcoded constant with emoji flags and labels (`th: "🇹🇭 Thai"`, `vi: "🇻🇳 Vietnamese"`, etc.). This duplicates the locale configuration in `/messages/` and the `i18n/routing.ts` setup. Primary Advantage may intentionally limit translation display languages (th, vi, cn, tw) versus the full set of UI locales, but this divergence is undocumented.
- Impact: Adding or changing a supported translation language requires updating this constant in addition to the i18n config. The emoji-flag presentation may also not match the desired UX for all regions.
- Recommendation: Either derive language labels from the next-intl locale config or add a comment documenting why this subset is hardcoded and how it should be maintained.

### LR-primary-advantage-035-004 — `console.error` instead of structured logging

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:148`
- Evidence: Line 149 uses `console.error("Error loading sentences:", error)` inside the `loadSentencesFromDeck` catch block. This bypasses the structured logging/observability framework. Error context (user ID, article ID, request trace) is lost.
- Impact: Production error diagnosis requires log scraping for unstructured console output. No error reporting service integration.
- Recommendation: Use a shared logger wrapper or error-reporting adapter that includes request context, user ID, and structured metadata.

### LR-primary-advantage-035-005 — `error: any` type in error handler

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:460`
- Evidence: Line 460 declares `handleError = (error: any) =>`. Using `any` loses type safety in error handling. The error object could be anything (Error, string, null, etc.).
- Impact: Potential runtime crashes if error is not an Error-like object. The cleanup callback in `handleError` accesses `audio.pause()` but `audio` has already been cleaned up in some paths.
- Recommendation: Use `unknown` and narrow the type, or use a structured error type.

### LR-primary-advantage-035-006 — Hand-rolled interfaces instead of inferred Drizzle types

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:44-93`
- Evidence: Lines 44-93 define `OrderWordData`, `ClickableWord`, and `OrderWordGameProps` as hand-rolled TypeScript interfaces. Where these shapes align with database rows (e.g., `words` array likely maps to a word/audio table), using `InferSelectModel<typeof table>` would be more maintainable and reduce drift between the component and schema.
- Impact: Schema changes require manual updates to these interfaces. No compile-time enforcement that the component's expected API shape matches the actual database.
- Recommendation: Where data originates from Drizzle queries, use `InferSelectModel` from `@reading-advantage/db`. Where the shape is purely frontend-derived, add a comment noting the source.

### LR-primary-advantage-035-007 — React hooks best-practice violations

- Severity: Low
- Fork-divergence category: Same root cause as Reading Advantage
- File: `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx:133-137, 187`
- Evidence: Two issues: (1) Lines 133-137, the mount-effect `useEffect` calls `loadSentencesFromDeck` with an empty dependency array. The function is defined with `async` inside the component body and recreates on every render, but the effect intentionally runs once. ESLint `react-hooks/exhaustive-deps` would flag this. (2) Line 187 uses `Date.now()` inside `shuffleWords` to generate unique IDs. If `shuffleWords` is called rapidly (e.g., React StrictMode double-render in development), IDs may collide.
- Impact: Development-mode warnings from lint rules. Rare ID collisions in development when StrictMode double-invokes the shuffle. No production impact due to render timing, but indicates inconsistent React patterns.
- Recommendation: Use `useRef` or `useId` for unique IDs instead of `Date.now()`. Add an ESLint disable comment explaining the mount-only intent for the useEffect with empty deps.

## No-Finding Notes

- All 1128 lines of `apps/primary-advantage/components/lesson/games/lesson-sentence-order-word.tsx` were read line-by-line. The 7 findings above cover all material issues identified. The remaining code (approximately 1100 lines of game rendering, state management, UI components, timer logic, hint controls, word interaction handling, and completion screens) is functionally sound for a client-side game component.

Key characteristics noted without findings:
- The component correctly uses `useTranslations` for i18n (line 107).
- The Fisher-Yates shuffle implementation (lines 176-196) is correct.
- The word selection/deselection logic (lines 244-257) is correct.
- The result display (lines 1032-1072) correctly shows correct vs incorrect feedback.
- The progress bar and timer (lines 160-169, 362-366) behave correctly.
- The hint system (highlight hints, audio hints, correct answer reveal) is correctly gated by user interaction.
- The start screen (lines 619-752) properly gates game start behind language selection.
- The game completion screen (lines 528-615) correctly displays stats and allows replay.
- Session reference to `@reading-advantage/auth-client` (line 42) is the correct shared auth adapter.
