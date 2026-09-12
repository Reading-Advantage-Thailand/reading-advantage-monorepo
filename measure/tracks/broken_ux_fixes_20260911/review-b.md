# Review B: Reading Broken UX Fixes

- Track ID: `broken_ux_fixes_20260911`
- App: `apps/reading-advantage`
- Reviewer: independent Review B
- Review date: 2026-09-12
- Scope: current source, including uncommitted repairs
- Ignored: unrelated APK and `apps/advantage-games` files

This review reads the current tree. It does not use only the commit range
`8174d4920^..2a6c13ea0`. Review A blocked on FR-10 and on missing Phase 2
tests. A later agent added uncommitted repairs. This review checks those
repairs and the rest of the spec.

## Review A blockers

### Blocker 1 — FR-10 games auth gate: fixed

The games page now redirects a signed-out user.

Evidence: `apps/reading-advantage/app/[locale]/(student)/student/games/page.tsx:13`

```
if (!sessionUser) return redirect("/auth/signin");
```

Sibling pages use the same call:

- `app/[locale]/(student)/student/read/page.tsx:10`
- `app/[locale]/(student)/student/stories/page.tsx:10`
- `app/[locale]/(student)/student/history/page.tsx:24`

The static guard at `__test__/broken-ux-fixes.test.ts:152-155` now asserts
that source string. Middleware still excludes `/student/games` from
`publicPages` (`middleware.ts:17-26`). The page gate and the middleware
gate both apply. AC-9 now passes.

### Blocker 2 — Phase 2 tests for FR-1, FR-7, FR-9: fixed, with weak spots

The new file `__test__/broken-ux-behavior.test.tsx` imports the live
modules and clicks them.

| FR | What the test does | Result |
| --- | --- | --- |
| FR-1 | Renders `StudentDashboardContent`, clicks a genre, asserts `push("/student/read?genre=fiction")` | Pass |
| FR-7 | Renders `FlashcardGameInline`, clicks the volume button, asserts `cancel` and `speak`, then unmounts | Pass |
| FR-9 | Sends a chat message, closes the panel, opens it again, asserts both texts remain | Pass |

These tests pass in the app Jest run. They are not source-text scans.
See Finding 1 and Finding 2 for remaining test gaps. Those gaps are Low.

## Findings

No Critical finding. No High finding.

### 1. Low — the FR-7 test does not lock call order

Evidence: `__test__/broken-ux-behavior.test.tsx:160-164`.

The test asserts that `cancel` ran and that `speak` ran. It does not
assert that `cancel` ran first. A later edit can call `speak()` and then
`cancel()` in `speakText`. The test still passes. Overlap can return.

The click path is real. The unmount path is real. The source at
`components/flashcards/flashcard-game.tsx:340-343` still cancels first.
This gap is a test lock, not a product defect.

Action: assert `cancel.mock.invocationCallOrder[0] < speak.mock.invocationCallOrder[0]`.

### 2. Low — the FR-1 test mocks the genre widget

Evidence: `__test__/broken-ux-behavior.test.tsx:43-53`.

The test replaces `GenreEngagementWidget` with a stub button. It then
proves that `handleGenreClick` pushes `/student/read?genre=fiction`.
That matches the Phase 2 task text at `plan.md:19`.

The live widget at `components/dashboard/student-genre-engagement.tsx:53-58`
is not exercised. A later edit can drop `onGenreClick` from the live
widget. The stub still passes.

Action: render the live widget with one `topGenres` row, or keep the stub
and add a second test for the live widget.

### 3. Medium — FR-1 still leaves type buttons inert (Review A finding 3)

Evidence: `components/select.tsx:54-72`.

`getArticleType()` and `handleButtonClick` still test three combinations.
All three need `type`. A URL with `genre` only matches none of them.
The function returns `"article"`. A click sets no parameter.

The article list still filters by genre at
`server/controllers/article-controller.ts:163`. AC-1 still passes.

Failure scenario: a student lands on `/student/read?genre=...`, then
clicks "Fiction". The button does nothing. The student must click "back"
first.

This defect is outside the FR-1 text. The spec does not name the type
buttons. The owner must accept it or extend the spec.

### 4. Medium — FR-4 still uses the locale-less router (Review A finding 4)

Evidence: teacher and dashboard files still import
`useRouter` from `next/navigation`. Examples:

- `components/teacher/my-classes.tsx:13`
- `components/teacher/my-students.tsx:14`
- `components/dashboard/class-summary-table.tsx:201`
- `components/dashboard/student-dashboard-content.tsx:23`

The locale router lives at `i18n/routing.ts:12`. The config sets
`localePrefix: "always"` at `i18n/routing.ts:9`. A push such as
`/teacher/reports/${classId}` has no locale segment. Middleware must
redirect before the page renders.

AC-3 still passes. Hardcoded `/th/teacher` paths are gone. No
`router.push` call prefixes `NEXT_PUBLIC_BASE_URL`.

The spec goal at `spec.md:27` is "so navigation stays client-side".
The change removes the full URL. The navigation still costs a server
redirect. A user on `/th` can land on the default locale.

Action: the owner must accept this, or switch these calls to
`useRouter` from `@/i18n/routing`.

### 5. Low — a fourth matching-like file still comments out `"use client"`

Evidence: `components/lesson/lesson-vocabulary-activity-choice.tsx:2`
reads `// "use client";`. The default export is `LessonMatchingWords`.
The file uses hooks.

Review A finding 5 named the third fork
`components/lesson/lesson-matching-word.tsx`. The repair restored
`"use client"` there at line 2. No importer of
`lesson-vocabulary-activity-choice.tsx` exists in the app.

Failure scenario: a server component imports this unused file. React
then throws on the first `useState` call.

Action: restore `"use client"`, or delete the unused file. This is
outside FR-5 named files.

### 6. Low — the FR-10 static test is still a source scan

Evidence: `__test__/broken-ux-fixes.test.ts:152-155`.

The new test asserts that the file contains
`redirect("/auth/signin")`. It does not call `GamesPage`. A later edit
can put that string in a comment. The scan still passes.

The page source at `games/page.tsx:13` is the live gate. This extra
scan is useful. It is not a behavior test.

### 7. Low — the plan marks the Red step done with no Red evidence

Evidence: `plan.md:18-22` now checks every Phase 2 box, including
"Run and confirm all new tests fail (Red)."

The behavior file is uncommitted. The product fixes are already in
source. A Red run against current source cannot fail those three tests.
The box claims a Red step that this tree cannot show.

### 8. Low — Review A Low findings 7, 8, 9, and 10 remain

These are unchanged. They do not come from the repair.

- Settings button still opens the class list
  (`class-detail-dashboard.tsx:120-129`). The spec permits this.
- Wrapped `router.push` calls stay Prettier-dirty
  (`my-classes.tsx:153-155`).
- Static guards still have no counterexample fixture
  (`broken-ux-fixes.test.ts`).
- The chatbot still renders an empty bot bubble when `data.text` is
  missing (`chatbot-floating-button.tsx:66-69`).

### 9. Low — `metadata.json` is still stale

Evidence: `measure/tracks/broken_ux_fixes_20260911/metadata.json`
records `"status": "new"`, `"actual_tasks": null`, and
`"deviation_notes": ""`. The plan records the FR-10 task as done.

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 Fix broken genre links | Implemented, with Finding 3 | `student-dashboard-content.tsx:74` pushes `/student/read?genre=...`. The behavior test asserts that URL. Type buttons stay inert. |
| FR-2 Fix `captoliza` class typos | Implemented | `grep` over `app` and `components` returns zero hits outside the test that bans the string. |
| FR-3 Fix teacher 404 links | Implemented | `class-summary-table.tsx:201` pushes `/teacher/reports/${classId}`. `class-detail-dashboard.tsx:123` pushes `/teacher/my-classes`. |
| FR-4 Remove Thai-locale redirects and absolute navigations | Partly implemented | No `/th/teacher` remains. No `router.push` prefixes `NEXT_PUBLIC_BASE_URL`. Navigation still uses `next/navigation` (Finding 4). |
| FR-5 Restore `"use client"` in matching components | Implemented for named files and the third fork | `matching.tsx:2` declares `"use client"`. `tab-matching-words.tsx` is gone. `lesson-matching-word.tsx:2` now declares `"use client"`. A fourth unused file still comments the directive (Finding 5). |
| FR-6 Remove the `act` import | Implemented | `student-assignment-dashboard.tsx:2` has no `act` import. |
| FR-7 Stop overlapping flashcard speech | Implemented | `flashcard-game.tsx:340` cancels before `speak()` at `:343`. Unmount cleanup runs at `:146-153`. The behavior test clicks and unmounts (Finding 1). |
| FR-8 Fix visual typos and console imports | Implemented | `read/[articleId]/page.tsx:145` uses `max-w-[400px]`. No `import { log } from "console"` remains. |
| FR-9 Stop the chatbot from wiping history | Implemented | `chatbot-floating-button.tsx:103-106` does not call `setMessages([])`. The behavior test closes and opens the panel and still sees both messages. |
| FR-10 Games page auth policy | Implemented | `games/page.tsx:13` redirects to `/auth/signin`. This matches sibling student pages. |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 Genre click reaches `/student/read` and renders the list | Pass | `student-dashboard-content.tsx:74`. `select.tsx:185-195` renders article cards. Genre filter applies at `article-controller.ts:163`. |
| AC-2 No `captoliza` and no `/teacher/class-detail/` | Pass | Both greps over `app` and `components` return zero hits outside the test file. |
| AC-3 No `/th/` redirect and no `NEXT_PUBLIC_BASE_URL` in `router.push` | Pass | No `/th/teacher` hits. Remaining `NEXT_PUBLIC_BASE_URL` uses are `fetch` calls. |
| AC-4 Both matching components start with `"use client"` | Pass | `matching.tsx:2`. The second named file merged away. The third fork now has the directive. |
| AC-5 No `act` import in the assignment dashboard | Pass | `student-assignment-dashboard.tsx:2`. |
| AC-6 Rapid flashcard flips never overlap speech | Pass | Source cancels before each `speak`. The behavior test clicks the volume button and unmounts. Call order is not locked (Finding 1). |
| AC-7 No `import { log } from "console"` | Pass | The grep returns zero hits. |
| AC-8 Chatbot open and close preserves the conversation | Pass | The open handler does not clear `messages`. The behavior test keeps "hello" and "hello from bot" after close and open. |
| AC-9 Games page auth matches the owner policy and sibling pages | Pass | `games/page.tsx:13` uses `redirect("/auth/signin")`. Read, stories, and history pages use the same call. |

## Plan Accuracy

1. **FR-10 is no longer blocked.** `plan.md:35` now marks the task done.
   The page source matches the owner decision in `spec.md:52`.
2. **Phase 2 boxes are now checked.** The behavior file exists and the
   three tests pass. The Red-step box has no evidence (Finding 7).
3. **Phase 4 is still open.** `plan.md:41-43` still holds the docs
   update, the doctor and lint gates, and the manual check.
4. **`metadata.json` is still stale.** See Finding 9.
5. **Mixed working tree.** `components/matching.tsx` also has uncommitted
   edits from the loading-state track (`normalizeTranslateLocale`,
   `showHeroImages`). This review does not treat those edits as this
   track's repair.

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest --testPathPatterns='broken-ux' --no-coverage
```

Output:

```
PASS __test__/broken-ux-fixes.test.ts
PASS __test__/broken-ux-behavior.test.tsx

Test Suites: 2 passed, 2 total
Tests:       17 passed, 17 total
Snapshots:   0 total
Time:        4.624 s
Ran all test suites matching broken-ux.
```

Summary: 14 static scans pass. 3 behavior tests pass. The suite must run
from `apps/reading-advantage`. The same command from the repo root fails
to parse TypeScript.

The 14 static scans still have no counterexample fixture (Finding 8).
The 3 behavior tests import and click the live modules.

## Verdict

**CONTINUE.**

Review A had two High blockers. Both are fixed in the current source.

1. FR-10 now redirects a signed-out user to `/auth/signin`. AC-9 passes.
2. Phase 2 now has behavior tests for FR-1, FR-7, and FR-9. All three
   pass.

No new High defect comes from the repair. Finding 5 from Review A is
fixed in `lesson-matching-word.tsx`.

Two Medium findings remain. They are the same as Review A findings 3
and 4. They do not fail an acceptance criterion. The owner must accept
them or extend the spec before closeout.

Phase 4 is still open. Do the docs update, the doctor and lint gates,
and the manual check next.
