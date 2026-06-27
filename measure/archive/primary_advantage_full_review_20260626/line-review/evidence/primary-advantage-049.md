# Line Review Evidence: primary-advantage-049

Reviewer: coder-vocengine-ark-code-latest/primary-advantage-049
Files assigned: 2
Lines assigned: 1055

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/pratice/order-sentences-game.tsx` | 1-1027 | reviewed | 5 |
| `apps/primary-advantage/components/pratice/order-sentences-page.tsx` | 1-28 | reviewed | 0 |

## Findings

### LR-primary-advantage-049-001 — `handleNext` references undefined `update` and `session`, crashes on game finish

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:35,110,298-302`
- Evidence: Line 35 imports `import { useSession } from "@reading-advantage/auth-client";`. Line 110 destructures only `const { user } = useSession();` — it does not bind `session` or `update`. The else-branch of `handleNext` (lines 288-303) ends with `update({ user: { ...session?.user } });` on lines 298-302. Neither `update` nor `session` is declared anywhere in the component scope (verified: the only `useSession()` call is line 110, the only `update` token in the file is line 298, and `session` appears only at line 300). The public `useSession()` surface in `packages/auth-client/src/index.ts:16-23` returns exactly `{ user, isAuthenticated, isLoading }` — no `session` object and no `update` function. The identical broken block was independently found in the sibling pratice games (`matching-game.tsx` per LR-primary-advantage-048-001, plus `cloze-test-game.tsx` and `order-words-game.tsx`), confirming a copy-paste fork regression rather than an inherited Reading Advantage bug.
- Impact: When a primary student completes the final sentence-ordering group, `handleNext` enters the else-branch (line 288), sets `gameComplete`, POSTs the score (lines 290-296), calls `setIsPlaying(false)` (line 297), then throws `ReferenceError: update is not defined` on line 298. The throw escapes the `useCallback` and the click handler, surfacing a Next.js error overlay / blank screen. The score POST has already fired, so the server records progress, but the client never cleanly renders the game-complete celebration screen (lines 533-609). Every primary student who finishes the game hits this crash.
- Recommendation: Remove the dead `update({ user: { ...session?.user } })` block (lines 298-302) — `useSession()` exposes no such API in this codebase — or replace it with a documented internal auth-adapter call (e.g. `auth.refreshSession()`) once the shared auth migration lands per root AGENTS.md. Apply the same removal across `matching-game.tsx`, `cloze-test-game.tsx`, and `order-words-game.tsx`.

### LR-primary-advantage-049-002 — `handleNext` stale-closure: missing `score`, `timer`, `deckId` in dependency array reports wrong score to server

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:285-304`
- Evidence: `handleNext` is a `useCallback` whose dependency array (line 304) is `[currentIndex, activeSentences.length]`, yet the body reads `deckId` (line 290), `score` (line 293), and `timer` (line 294) inside the POST body. `score` is updated by `setScore((prev) => prev + 1)` (lines 219, 331) and `timer` is incremented every second by the timer effect (lines 147-155, `setTimer((prev) => prev + 1)`); both change independently of `currentIndex`. Because the callback is only re-created when `currentIndex` or `activeSentences.length` changes, the closure captures the `score`/`timer` values that were current the last time `currentIndex` changed — i.e. before the student arranged and scored the final group and before additional seconds elapsed. The sibling `matching-game.tsx` was not flagged for this exact pattern in LR-048, but the defect is concrete here because the POST payload depends on live mutable state.
- Impact: The score and elapsed time submitted to `/api/flashcard/decks/${deckId}/sentences-for-ordering` (POST, lines 290-296) are stale: the final correct answer's point and the last interval of play time are excluded, so the server persists an under-reported score for the student. For a single-group deck (`activeSentences.length === 1`), `currentIndex` never changes after mount, so `score` and `timer` are captured as `0`/`0` and the student's entire result is recorded as zero. This silently corrupts primary-student progress data.
- Recommendation: Add `score`, `timer`, and `deckId` to the dependency array on line 304, or refactor the POST to read the latest values via functional state access / a ref. Verify the same dependency completeness in the sibling pratice games' `handleNext`.

### LR-primary-advantage-049-003 — Score-submission POST has no error handling or response check

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:290-296`
- Evidence: The `await fetch(...)` that submits the final score (lines 290-296) is not wrapped in `try/catch`, does not check `response.ok`, and ignores the resolved value. This contrasts with `loadSentencesFromDeck` in the same file (lines 121-139), which wraps its fetch in `try/catch/finally` and checks `response.ok` before parsing. A network failure or non-2xx response on the score POST is silently swallowed (and, prior to the LR-049-001 crash being fixed, the subsequent `update(...)` throw would mask it entirely).
- Impact: If the score-submission request fails (offline, 4xx/5xx, timeout), the student receives no error feedback and the rejected promise becomes an unhandled rejection in the `useCallback`. Progress is silently lost with no retry path. For young primary users this means completed work can vanish without any visible signal to the student or supervising teacher.
- Recommendation: Wrap the POST in `try/catch`, check `response.ok`, and surface a `toast.error(...)` on failure (mirroring `loadSentencesFromDeck`). Consider a retry or queued submission for transient failures.

### LR-primary-advantage-049-004 — Direct `@reading-advantage/auth-client` import bypasses internal auth adapter contract

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:35,110`
- Evidence: Line 35 imports `useSession` directly from the `@reading-advantage/auth-client` package, and line 110 consumes it in a client component. The shared package's only public hook surface (`packages/auth-client/src/index.ts:16-23`) returns `{ user, isAuthenticated, isLoading }` — state only, no actions. Root AGENTS.md requires application code to depend only on the internal auth adapter (`auth.getCurrentUser()`, `auth.requireUser()`, `auth.requireRole()`, etc.) and lists the migration of `@reading-advantage/auth` toward the adapter pattern as an open "Known Issues" item. This component is not the adapter boundary. The same direct-import anti-pattern was flagged across the sibling pratice games (LR-primary-advantage-048-002).
- Impact: When the shared auth migration replaces the current package with a session-cookie adapter, every direct `useSession()` call site — including this one and the three sibling games — must change in lockstep, blocking the migration. The component also has no access to documented auth actions, which is part of why the broken `update(...)` block (LR-049-001) was written against an API that does not exist here.
- Recommendation: Resolve the user server-side via `auth.getCurrentUser()` in the parent server page (`order-sentences-page.tsx`) and pass it down as a prop, or consume a client-safe adapter hook once the shared package exports one. Do not let raw `useSession` survive the auth-migration track.

### LR-primary-advantage-049-005 — `user` destructured from `useSession()` but never read

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-sentences-game.tsx:110`
- Evidence: Line 110 reads `const { user } = useSession();`. The identifier `user` is never referenced anywhere else in the component (lines 111-1027); the only auth-adjacent code is the broken `session?.user` reference on line 300 (see LR-049-001), which is a different, undefined binding. `user` is therefore strictly dead — read once at destructuring and discarded.
- Impact: The component subscribes to auth-context changes via `useSession()` without using any of them, so an unrelated auth-context update (e.g. cookie refresh) re-renders this ~1000-line game and can reset transient drag/UI state mid-session for a primary student. The cost is paid with no functional benefit. Mirrors LR-primary-advantage-048-004 in `matching-game.tsx`.
- Recommendation: Either remove the `useSession()` consumption (and the line 35 import) entirely per LR-049-004, or put `user` to use (e.g. include `user.id` in the score POST body or display the student's name on the completion screen).

## No-Finding Notes

- `apps/primary-advantage/components/pratice/order-sentences-page.tsx`: reviewed line-by-line (1-28). Thin async server component (line 7) that fetches the deck id via the `getFlashcardDeckId()` Server Action (lines 2, 8) and localized strings via `getTranslations` (lines 5, 9). On failure it renders an error `Card` with `Header` (lines 11-25); on success it mounts `<OrderSentenceGame deckId={deckResult.deckId} />` (line 27). The Server Action is the correct data boundary per AGENTS.md — no Prisma import, no direct DB access, no inline auth/role checks, no tenant ID trusted from the frontend. Structurally identical to the already-reviewed `cloze-test-page.tsx` / `matching-page.tsx`. No findings.
