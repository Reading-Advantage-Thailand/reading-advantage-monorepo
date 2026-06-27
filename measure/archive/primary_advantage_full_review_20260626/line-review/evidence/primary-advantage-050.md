# Line Review Evidence: primary-advantage-050

Reviewer: coder-minimax-m3/primary-advantage-050
Files assigned: 4
Lines assigned: 1199

## Coverage

| File | Reviewed ranges | Status | Findings |
|---|---|---|---:|
| `apps/primary-advantage/components/pratice/order-words-game.tsx` | 1-1125 | reviewed | 10 |
| `apps/primary-advantage/components/pratice/order-words-page.tsx` | 1-28 | reviewed | 0 |
| `apps/primary-advantage/components/progress-bar-xp.tsx` | 1-29 | reviewed | 2 |
| `apps/primary-advantage/components/providers/query-provider.tsx` | 1-17 | reviewed | 0 |

## Findings

### LR-primary-advantage-050-001 — `handleNext` references undefined `update` and `session`, crashes on game finish

- Severity: Critical
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:39,134,286-291`
- Evidence: Line 39 imports `import { useSession } from "@reading-advantage/auth-client";`. Line 134 destructures only `const { user } = useSession();` — `session` and `update` are not bound. The else-branch of `handleNext` (lines 273-292) ends with `update({ user: { ...session?.user } });` on lines 286-291. Neither `update` nor `session` is declared anywhere in the component scope (verified: the only `useSession()` call is line 134, `session` appears only at line 288, and `update` is only used at line 286; no `import { update }` exists). The public `useSession()` surface in `packages/auth-client/src/index.ts:16-23` returns exactly `{ user, isAuthenticated, isLoading }` — no `session` object and no `update` function. The same broken block was independently flagged on the sibling pratice games (`matching-game.tsx` per LR-primary-advantage-048-001, `order-sentences-game.tsx` per LR-primary-advantage-049-001, plus `cloze-test-game.tsx`), confirming a copy-paste fork regression rather than an inherited Reading Advantage bug.
- Impact: When a primary student completes the final sentence-ordering group, `handleNext` enters the else-branch (line 276), POSTs the score, calls `setIsPlaying(false)`, then throws `ReferenceError: update is not defined` on line 286. The throw escapes the `useCallback` and click handler, surfacing a Next.js error overlay / blank screen. The score POST has already fired (lines 278-284), so the server records progress, but the client never cleanly renders the game-complete celebration screen (lines 531-613). Every primary student who finishes the game hits this crash.
- Recommendation: Remove the dead `update({ user: { ...session?.user } })` block (lines 286-291) — `useSession()` exposes no such API in this codebase — or replace it with a documented internal auth-adapter call (e.g. `auth.refreshSession()`) once the shared auth migration lands per root AGENTS.md. Apply the same removal across the sibling pratice games flagged by LR-048-001 / LR-049-001.

### LR-primary-advantage-050-002 — `handleNext` stale-closure: missing `score`, `timer`, `deckId` in dependency array reports wrong score to server

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:273-292`
- Evidence: `handleNext` is a `useCallback` whose dependency array (line 292) is `[currentIndex, activeSentences.length]`, yet the body reads `deckId` (line 278), `score` (line 281), and `timer` (line 282) inside the POST body. `score` is updated by `setScore((prev) => prev + 1)` (lines 239, 321) and `timer` is incremented every second by the timer effect (lines 168-176, `setTimer((prev) => prev + 1)`); both change independently of `currentIndex`. Because the callback is only re-created when `currentIndex` or `activeSentences.length` changes, the closure captures the `score`/`timer` values that were current the last time `currentIndex` changed — i.e. before the student arranged and scored the final group and before additional seconds elapsed. This matches the exact pattern already flagged in `order-sentences-game.tsx` per LR-primary-advantage-049-002.
- Impact: The score and elapsed time submitted to `/api/flashcard/decks/${deckId}/words-for-ordering` (POST, lines 278-284) are stale: the final correct answer's point and the last interval of play time are excluded, so the server persists an under-reported score for the student. For a single-sentence deck (`activeSentences.length === 1`), `currentIndex` never changes after mount, so `score` and `timer` are captured as `0`/`0` and the student's entire result is recorded as zero. This silently corrupts primary-student progress data.
- Recommendation: Add `score`, `timer`, and `deckId` to the dependency array on line 292, or refactor the POST to read the latest values via functional state access / a ref. Verify the same dependency completeness in the sibling pratice games' `handleNext`.

### LR-primary-advantage-050-003 — Score-submission POST has no error handling or response check

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:278-284`
- Evidence: The `await fetch(...)` that submits the final score (lines 278-284) is not wrapped in `try/catch`, does not check `response.ok`, and ignores the resolved value. This contrasts with `loadSentencesFromDeck` in the same file (lines 142-160), which wraps its fetch in `try/catch/finally` and checks `response.ok` before parsing. A network failure or non-2xx response on the score POST is silently swallowed (and, prior to LR-050-001 being fixed, the subsequent `update(...)` throw would mask it entirely). Mirrors the exact pattern flagged in `order-sentences-game.tsx` per LR-primary-advantage-049-003.
- Impact: If the score-submission request fails (offline, 4xx/5xx, timeout), the student receives no error feedback and the rejected promise becomes an unhandled rejection in the `useCallback`. Progress is silently lost with no retry path. For young primary users this means completed work can vanish without any visible signal to the student or supervising teacher.
- Recommendation: Wrap the POST in `try/catch`, check `response.ok`, and surface a `toast.error(...)` on failure (mirroring `loadSentencesFromDeck`). Consider a retry or queued submission for transient failures.

### LR-primary-advantage-050-004 — Direct `@reading-advantage/auth-client` import bypasses internal auth adapter contract

- Severity: Medium
- Fork-divergence category: Shared package migration blocker
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:39,134`
- Evidence: Line 39 imports `useSession` directly from the `@reading-advantage/auth-client` package, and line 134 consumes it in a client component. The shared package's only public hook surface (`packages/auth-client/src/index.ts:16-23`) returns `{ user, isAuthenticated, isLoading }` — state only, no actions. Root AGENTS.md requires application code to depend only on the internal auth adapter (`auth.getCurrentUser()`, `auth.requireUser()`, `auth.requireRole()`, etc.) and lists the migration of `@reading-advantage/auth` toward the adapter pattern as an open "Known Issues" item. This component is not the adapter boundary. The same direct-import anti-pattern was flagged in `order-sentences-game.tsx` per LR-primary-advantage-049-004 and in `matching-game.tsx` per LR-primary-advantage-048-002.
- Impact: When the shared auth migration replaces the current package with a session-cookie adapter, every direct `useSession()` call site — including this one and the three sibling games — must change in lockstep, blocking the migration. The component also has no access to documented auth actions, which is part of why the broken `update(...)` block (LR-050-001) was written against an API that does not exist here.
- Recommendation: Resolve the user server-side via `auth.getCurrentUser()` in the parent server page (`order-words-page.tsx`) and pass it down as a prop, or consume a client-safe adapter hook once the shared package exports one. Do not let raw `useSession` survive the auth-migration track.

### LR-primary-advantage-050-005 — `user` destructured from `useSession()` but never read

- Severity: Low
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:134`
- Evidence: Line 134 reads `const { user } = useSession();`. The identifier `user` is never referenced anywhere else in the component (lines 1-1125); the only auth-adjacent code is the broken `session?.user` reference on line 288 (see LR-050-001), which is a different, undefined binding. `user` is therefore strictly dead — read once at destructuring and discarded. Mirrors LR-primary-advantage-048-004 and LR-primary-advantage-049-005 in the sibling pratice games.
- Impact: The component subscribes to auth-context changes via `useSession()` without using any of them, so an unrelated auth-context update (e.g. cookie refresh) re-renders this ~1100-line game and can reset transient drag/UI state mid-session for a primary student. The cost is paid with no functional benefit.
- Recommendation: Either remove the `useSession()` consumption (and the line 39 import) entirely per LR-050-004, or put `user` to use (e.g. include `user.id` in the score POST body or display the student's name on the completion screen).

### LR-primary-advantage-050-006 — `loadSentencesFromDeck` effect missing `sentences.length` and callback in dependency array

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:136-140`
- Evidence: The effect body (lines 136-140) reads `deckId`, `sentences.length`, and calls `loadSentencesFromDeck` (which is declared at lines 142-160). The dependency array is `[deckId]` only. `loadSentencesFromDeck` is not memoized (no `useCallback`) and is therefore recreated on every render with a fresh closure that closes over the latest `deckId`, `t`, `setIsLoading`, etc. The missing `sentences.length` dep means that if the parent `order-words-page.tsx` later provides a non-empty `sentences` prop, the effect would not re-run, but `loadSentencesFromDeck` would also not be re-evaluated with the new prop. ESLint react-hooks/exhaustive-deps will flag this.
- Impact: Subtle staleness: every render creates a new `loadSentencesFromDeck` function reference, so even though the effect doesn't run again, stale `t`/`deckId` references could persist if any side state changed since the previous effect. The visible symptom would be a stale translation string on the toast or a stale deckId in the URL after a navigation-driven prop change. For primary students the failure mode is a confusing error toast on retry.
- Recommendation: Wrap `loadSentencesFromDeck` in `useCallback` keyed on `[deckId, t]`, then add it (plus `sentences.length`) to the effect dependency array. Or use a ref-based pattern to keep the latest function while only depending on `deckId`.

### LR-primary-advantage-050-007 — `useEffect` keyed only on `currentSentence?.id` does not re-shuffle when the same sentence changes shape

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:206-216`
- Evidence: Lines 206-216 reset `availableWords`, `selectedWords`, `showResult`, `isCompleted`, `hasUserInteracted`, `showCorrectOrder` whenever `currentSentence?.id` or `shuffleWords` change. The body reads `currentSentence?.words` (lines 207-209). If a parent or store replaces the sentence object with the same `id` but different `words` (e.g. after a deck refresh), the effect skips the reset and the UI shows stale shuffled tiles. ESLint react-hooks/exhaustive-deps would flag the missing `currentSentence?.words` reference.
- Impact: After a deck hot-reload or a deckId change while the same sentence id is reused, the student sees the previously selected words frozen on the sentence-formation area while the "available words" bank still shows the stale pool. The `useEffect` for answer-checking (lines 219-248) would then check against the new `correctOrder` against the old selectedWords, producing a false correct/incorrect result.
- Recommendation: Add `currentSentence?.words` (or a stable hash) to the dependency array, or key the effect on a derived snapshot.

### LR-primary-advantage-050-008 — Answer-check effect missing `currentSentence.words.length` in dependency array

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:219-248`
- Evidence: The effect body reads `selectedWords.length === currentSentence.words.length` (line 227) to decide when to auto-complete. The dependency array (lines 243-248) is `[selectedWords, currentSentence?.correctOrder, isCompleted, hasUserInteracted]`. `currentSentence.words.length` is therefore a stale read inside the effect — if the sentence changes (via the line 206 effect) without `correctOrder` changing (unlikely but possible during refresh), the auto-complete gate uses the previous sentence's word count. ESLint react-hooks/exhaustive-deps would flag the missing `currentSentence?.words.length` reference.
- Impact: A primary student could trigger the auto-complete branch before selecting all words if the previous sentence had fewer words than the current one, marking the question correct without completing it. Or the opposite: never auto-complete on a long sentence after a short one. Either outcome silently mis-grades practice work.
- Recommendation: Include `currentSentence?.words.length` (or the full `currentSentence?.words` reference) in the dependency array.

### LR-primary-advantage-050-009 — `playHintAudio` stale closure on `currentIndex` can read wrong word's audio timestamps

- Severity: High
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:408-485`
- Evidence: `playHintAudio` is a `useCallback` whose dependency array (line 485) is `[currentSentence, isPlayingHintAudio]`. The body references `currentIndex` directly three times: `currentSentence.words[currentIndex].startTime!` (line 431), `currentSentence.words[currentIndex].endTime!` (line 448), and `currentSentence.words[currentIndex].audioUrl!` (line 476). `currentIndex` changes via `setCurrentIndex` in `handleNext` (line 275) and `handleRestartGame` (line 329), but since it is not in the dep array the callback holds the value of `currentIndex` from the last memoization. ESLint react-hooks/exhaustive-deps would flag the missing `currentIndex`.
- Impact: After advancing to a new sentence, the "Play order" hint button (line 936) plays audio from the previous sentence's word at the previous index — wrong word, possibly a word that no longer exists in the new sentence (which would throw a TypeError on `undefined.startTime`). For a primary student this surfaces either the wrong word's audio or a silent crash, undermining the explicit "primary-student adaptation risk" purpose of audio scaffolding for young readers.
- Recommendation: Add `currentIndex` to the dependency array on line 485, or move the audio hint to a child component keyed on the sentence id so the callback is naturally recreated per sentence.

### LR-primary-advantage-050-010 — Game-complete accuracy calculation divides by zero when `activeSentences.length === 0`

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/pratice/order-words-game.tsx:529`
- Evidence: Line 529 computes `const accuracy = Math.round((score / activeSentences.length) * 100);`. If `activeSentences.length === 0` the result is `NaN` and the completion screen (lines 531-613) renders `"NaN%"` in the green stat card (line 573). The start screen disables the start button when `activeSentences.length === 0` (line 733), but the game-complete path can still be reached if `gameComplete` is set via a stale closure or via the parent route navigating directly to the game with an empty deck.
- Impact: A primary student who finishes an empty/zero-sentence deck sees `"NaN%"` and a non-functional completion screen; no retry path because `handleRestartGame` (lines 328-335) zeroes state without re-loading the deck. Confusing UX for young readers and a data-quality red flag for teachers reviewing classroom progress.
- Recommendation: Guard the division with `activeSentences.length > 0 ? Math.round((score / activeSentences.length) * 100) : 0`, or block transition to the completion screen when `activeSentences.length === 0`.

### LR-primary-advantage-050-011 — Hardcoded "RA." brand label leaks Reading Advantage branding into Primary Advantage UI

- Severity: Medium
- Fork-divergence category: Intentional product divergence that needs documentation
- File: `apps/primary-advantage/components/progress-bar-xp.tsx:19`
- Evidence: Line 19 renders `<span className="font-bold text-cyan-500">RA. {currentLevel}</span>` — the literal prefix "RA." stands for Reading Advantage. A `grep` of the whole `apps/` tree (`grep -rn "RA\. "` apps/`) returns only this one file, confirming the label is unique to primary-advantage's XP bar and is not present anywhere in `apps/reading-advantage/components/` itself. The companion `LEVELS_XP` table in `apps/primary-advantage/lib/utils.ts:5-24` still uses the `raLevel` field name, indicating the fork kept Reading Advantage's level semantics verbatim.
- Impact: Primary-age students see "RA." in their personal XP/level indicator, which is brand-confusing for a fork that is supposed to be its own product (Reading Advantage vs Primary Advantage). Teachers onboarding classrooms may not recognize the badge as Primary Advantage's. Whether intentional (carryover from Reading Advantage level definitions) or accidental (forgotten rebranding), it is undocumented.
- Recommendation: Either rename the prefix to a Primary Advantage identifier (e.g. "PA.") and document the intentional rename in `fork-divergence.md`, or document explicitly that Primary Advantage intentionally reuses Reading Advantage's level system and that "RA." denotes that lineage.

### LR-primary-advantage-050-012 — `progressValue` divides by zero when `nextLevelXP` falls back to `0`

- Severity: Medium
- Fork-divergence category: Fork-specific regression
- File: `apps/primary-advantage/components/progress-bar-xp.tsx:12-14`
- Evidence: Line 13 computes `const nextLevelXP = LEVELS_XP.find((level) => level.min <= currentXP)?.max || 0;`. Line 14 then computes `const progressValue = (currentXP / nextLevelXP) * 100;`. If `currentXP < 0` (impossible per the UI) or if the `LEVELS_XP` table is replaced with one whose first entry has `min > 0`, no entry matches and `nextLevelXP` becomes `0`, producing `NaN` for `progressValue`. Even in the happy path, if `nextLevelXP` is `0` due to a configuration regression, `Progress value={NaN}` renders an empty bar with no error message.
- Impact: A primary student at an XP threshold that has no matching level entry sees an empty XP bar and no feedback. The defect is silent because the component does not validate `nextLevelXP > 0` before passing it to the division.
- Recommendation: Guard the division: `const progressValue = nextLevelXP > 0 ? (currentXP / nextLevelXP) * 100 : 0;`, or return an explicit "max level reached" state.

## No-Finding Notes

- `apps/primary-advantage/components/pratice/order-words-page.tsx`: reviewed line-by-line (1-28). Thin async server component (line 7) that fetches the deck id via the `getFlashcardDeckId()` Server Action (lines 2, 9) and localized strings via `getTranslations` (lines 5, 8). On failure it renders an error `Card` with `Header` (lines 11-25); on success it mounts `<OrderWordGame deckId={deckResult.deckId} />` (line 27). The Server Action is the correct data boundary per AGENTS.md — no Prisma import, no direct DB access, no inline auth/role checks, no tenant ID trusted from the frontend. Structurally identical to the already-reviewed `cloze-test-page.tsx` / `matching-page.tsx` / `order-sentences-page.tsx`. No findings.

- `apps/primary-advantage/components/providers/query-provider.tsx`: reviewed line-by-line (1-17). Minimal "use client" wrapper that calls `getQueryClient()` from `@/lib/get-query-client` (verified: `apps/primary-advantage/lib/get-query-client.ts` returns a singleton on the browser and a fresh client on the server via `isServer`, so calling `getQueryClient()` inline on every render of the provider is the documented Next.js + TanStack Query pattern). Wraps children with `<QueryClientProvider>` (lines 14-16). No business logic, no auth, no DB, no Prisma, no fetches. No findings.