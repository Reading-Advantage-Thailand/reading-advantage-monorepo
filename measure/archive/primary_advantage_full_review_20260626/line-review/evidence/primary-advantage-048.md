# Line Review Evidence: primary-advantage-048

Reviewer: coder-minimax-m3/primary-advantage-048
Files assigned: 3
Lines assigned: 1182

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/pratice/cloze-test-page.tsx` | 1-28 | reviewed | 0 |
| `apps/primary-advantage/components/pratice/matching-game.tsx` | 1-1126 | reviewed | 4 |
| `apps/primary-advantage/components/pratice/matching-page.tsx` | 1-28 | reviewed | 0 |

## Findings

### LR-primary-advantage-048-001 — `handleNext` references undefined `update` and `session`, crashes on last game

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/matching-game.tsx:41,134,247-251,253`
- Evidence: Line 41 imports `import { useSession } from "@reading-advantage/auth-client";`. Line 134 destructures only `const { user } = useSession();` — no `session`, no `update`. The body of `handleNext` (lines 234-253) on the final game (the `else` branch beginning at line 238) ends with `update({ user: { ...session?.user } });` on lines 247-251. The `useSession()` API exported from `packages/auth-client/src/index.ts:16-23` only returns `{ user, isAuthenticated, isLoading }` — it does not return `session` or `update`. The sibling pratice game components (`cloze-test-game.tsx:522-524`, `order-words-game.tsx:286-290`, `order-sentences-game.tsx:298-302`) carry the identical broken block, so this is a fork-specific copy-paste regression, not a Reading Advantage parent bug.
- Impact: When a primary student finishes the last matching set, `handleNext` reaches the else-branch (line 238), executes the POST to `/api/flashcard/decks/${deckId}/sentences-for-matching` (lines 239-245), and then throws a `ReferenceError: update is not defined` (or `session is not defined`) on line 247. The component crashes before `setIsPlaying(false)` on line 246 ever runs in the next render. The student sees the game-complete screen (lines 544-620) appear, then the page goes blank or shows a Next.js error overlay because the throw escapes `useCallback`. There is no try/catch around the `update()` call. A primary student who completes all matching sets will always crash, which means the score is reported to the server (the POST on line 239 ran) but the client never recovers to show the success UI.
- Recommendation: Either (a) remove lines 247-251 entirely — `useSession()` does not expose an `update` function in this codebase; the better-auth `useSession` would expose one but the file does not import it; (b) replace the block with a call to a documented internal adapter (`auth.refreshSession()` once the shared auth migration lands per AGENTS.md); or (c) wrap it in `try { update({ user: { ...user } }); } catch {}` as a temporary guard. The same fix must be applied to `cloze-test-game.tsx`, `order-words-game.tsx`, and `order-sentences-game.tsx`.

### LR-primary-advantage-048-002 — Direct `@reading-advantage/auth-client` import bypasses internal auth adapter contract

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/pratice/matching-game.tsx:41,134`
- Evidence: Line 41 imports `useSession` directly from the `@reading-advantage/auth-client` package. The shared package's only public hook surface is documented in `packages/auth-client/src/index.ts:16-23` and returns `{ user, isAuthenticated, isLoading }` — no actions, no update function, no session mutation. The AGENTS.md root policy requires application code to depend only on `auth.login()`, `auth.logout()`, `auth.getCurrentUser()`, `auth.requireUser()`, `auth.requireRole()`, `auth.changePassword()`. The root AGENTS.md also lists the migration of `@reading-advantage/auth` toward the adapter pattern as an open item in "Known Issues". Importing `useSession` directly from a transient package is acceptable only behind the auth adapter boundary; component files like this one are not the boundary.
- Impact: The pratice game components cannot exercise any of the documented auth actions (refresh, update, sign-out, role-gate). The `useSession()` consumer receives only state, so any action that needs to invalidate or refresh the session has to fall back to local-only handlers. When the shared auth migration replaces `@reading-advantage/auth` with a session-cookie adapter, every `useSession()` call site must change in lockstep. This pratice component (and the sibling cloze/order-words/order-sentences games) block that migration because the adapter contract is unfulfilled here.
- Recommendation: Move auth consumption to `auth.getCurrentUser()` (called from a server component or a Server Action wrapper) and pass the resolved user down as a prop. For the client-side needs of this game, gate UI via `useRequireRole("student")` if and when the shared package exports a client-safe role gate, or perform role gating in the parent server page (`matching-page.tsx`) and pass `isStudent` down. Do not let raw `useSession` survive the auth migration track.

### LR-primary-advantage-048-003 — Unused lucide imports inflate bundle for the matching game route

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/matching-game.tsx:23,34,35`
- Evidence: Lines 18-36 import fifteen lucide icons. Of these, `Shuffle` (line 23), `Link` (line 34), and `CornerDownRight` (line 35) are imported but never referenced anywhere else in the 1126-line file. Cross-grep confirms zero usages: `Shuffle` appears only at its import site, and `Link`/`CornerDownRight` likewise have no consumer. The other 12 icons (`ArrowLeft`, `RotateCcw`, `CheckCircle`, `XCircle`, `Trophy`, `Play`, `Clock`, `Target`, `Zap`, `Loader2`, `Languages`, `Volume2`, `Lightbulb`, `Eye`, `EyeOff`) are referenced in the JSX below. This is a clean fork-only lint violation; the parent Reading Advantage app does not duplicate these exact imports here.
- Impact: Adds roughly 3 lucide icon modules to the bundle of the `/student/sentences` route that renders this matching game. Modest bundle-weight cost. ESLint `no-unused-vars` would flag three issues; this file has been excluded from that lint pass historically (the project's ESLint config has 49 pre-existing errors per AGENTS.md "Known Issues", and this is one of them).
- Recommendation: Remove `Shuffle, Link, CornerDownRight` from the import on lines 18-36. If `Shuffle` is queued for a future "shuffle pairs" button, leave a `// TODO(shuffle)` comment so the next pass knows it was intentional, otherwise drop it.

### LR-primary-advantage-048-004 — `user` destructured from `useSession()` but never read

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/matching-game.tsx:134`
- Evidence: Line 134 reads `const { user } = useSession();`. Lines 135 through 1126 (the rest of the component) never reference `user`. The only auth-adjacent code that touches a user object is the broken block on lines 247-251, which references `session?.user` (not `user`) — see LR-048-001. The variable `user` is therefore strictly dead code; it is read once at destructuring time and discarded.
- Impact: Each render of the matching game subscribes the component to auth-context changes from `useSession()`, triggering a re-render whenever `user`, `isAuthenticated`, or `isLoading` changes — even though the matching game never displays any of them. For a primary student playing a 5+ minute matching session, an unrelated auth refresh (e.g., cookie refresh) will re-render the entire 1100-line component and reset transient UI state via the effect on lines 486-495.
- Recommendation: Either drop the destructuring (`useSession` itself is unused at this point and the import on line 41 should also be removed per LR-048-002), or actually use `user` — e.g., display the student's name in the game-complete screen or pass `user.id` to the score POST body on line 239-245. The current dead-read is the worst of both worlds: it pays the re-render cost without providing any functionality.

## No-Finding Notes

- `apps/primary-advantage/components/pratice/cloze-test-page.tsx`: reviewed line-by-line (1-28). This is a thin server component (line 7) that loads `getFlashcardDeckId()` from `@/actions/pratice` (line 2, line 9), renders an error card with `Header` and `Card`/`CardContent` when the deck fetch fails (lines 11-25), and otherwise mounts `<ClozeTestGame deckId={deckResult.deckId} />` (line 27). The `getFlashcardDeckId()` Server Action is the right boundary per AGENTS.md; this page does not import Prisma, does not hit the DB directly, and does not duplicate auth checks. No findings.
- `apps/primary-advantage/components/pratice/matching-page.tsx`: reviewed line-by-line (1-28). Structurally identical to `cloze-test-page.tsx` but targets `MatchingGame`. Same boundary pattern (server component → Server Action → client component), no inline DB calls, no Prisma imports, no role checks missing (delegated to the matching server route). No findings.