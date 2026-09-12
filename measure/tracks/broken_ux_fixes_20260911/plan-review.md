# Phase Code Review: Reading Broken UX Fixes

- Track ID: `broken_ux_fixes_20260911`
- App: `apps/reading-advantage`
- Revision range: `8174d4920^..2a6c13ea0`
- Commit count: 10
- Review date: 2026-09-12
- Reviewer note: this review reads the committed diff of the range and the current
  state of the files that the track touched. The working tree holds uncommitted
  changes from the APK track in `apps/advantage-games`. This review ignores those
  changes. Two files that the track edited were later moved or deleted by the
  `component_deduplication_20260911` track. This review traces those files with
  `git log --follow` and reports the successor state.

## Findings

### 1. High — FR-10 is not implemented; the games page has no page-level auth gate

Evidence: `apps/reading-advantage/app/[locale]/(student)/student/games/page.tsx:10-16`.
The page calls `getCurrentUser()` and then accepts a null session:
`const user = sessionUser ? toUserContext(sessionUser) : null;`. The page has no
`redirect("/auth/signin")` call. Sibling pages add that gate:
`app/[locale]/(student)/student/read/page.tsx:10`,
`app/[locale]/(student)/student/stories/page.tsx:10`, and
`app/[locale]/(student)/student/history/page.tsx:24`.

The spec records the owner decision at `measure/tracks/broken_ux_fixes_20260911/spec.md:52`:
**"Owner decision 2026-09-11: games require sign-in."** The plan still marks the
task BLOCKED at `measure/tracks/broken_ux_fixes_20260911/plan.md:35`. The decision
exists, so the block is stale.

The middleware gives a second control. `apps/reading-advantage/middleware.ts:188-196`
redirects an unauthenticated request for a non-public path to `/auth/signin`, and
`middleware.ts:17-26` excludes `/student/games` from `publicPages`. The games
catalog is therefore closed today.

Failure scenario: an edit to `publicPages` or to the middleware matcher at
`middleware.ts:204` removes the only control, and the games catalog becomes public.
The signed-out branch in `page.tsx:11` keeps a supported render path for a null
user, so no error stops the page. AC-9 fails.

### 2. High — Phase 2 is skipped; FR-1, FR-7, and FR-9 have no behavioral test

Evidence: `measure/tracks/broken_ux_fixes_20260911/plan.md:18-22` holds four
unchecked boxes. `plan.md:36` marks the test task done with "13/13 new tests".
The 13 tests are static source scans only. See
`apps/reading-advantage/__test__/broken-ux-fixes.test.ts:69-75` (FR-1),
`:125-129` (FR-7), and `:146-150` (FR-9). A repository search finds no test that
renders `StudentDashboardContent` and asserts the pushed URL, no test that mocks
`speechSynthesis`, and no test that opens `ChatBotFloatingChatButton`.

This breaks a recorded lesson. `measure/lessons-learned.md` states:
"Source-text regex tests (`env-guards.test.ts`) prove the source *looks* correct,
not that it behaves correctly. Always prefer behavior tests that import and
exercise the module." A second entry names structural assertions a "test gaming"
smell.

Failure scenario: the FR-7 guard counts `speechSynthesis.cancel()` occurrences and
passes when the count is 2 or more. A later edit can move both calls into dead code
or into an unrelated handler, and the guard stays green while the audio overlap
returns.

### 3. Medium — FR-1 leaves inert type buttons on `/student/read?genre=...`

Evidence: `apps/reading-advantage/components/select.tsx:55-59` and `:61-72`.
`getArticleType()` tests three combinations that all need `type`. A URL that
carries `genre` alone matches none of them, so the function returns `"article"`.
`handleButtonClick` tests the same three combinations, so it sets no parameter and
pushes the unchanged query string.

The article filter itself works.
`apps/reading-advantage/server/controllers/article-controller.ts:160-164` applies
`genre ? eq(articles.genre, genre) : undefined` independent of `type`, so the list
shows the chosen genre.

Failure scenario: a student clicks a genre tile on the dashboard, lands on the
article list, then clicks the "Fiction" button. The button does nothing. The
student must click "back" first.

### 4. Medium — FR-4 does not restore client-side navigation

Evidence: every edited component imports the plain router. See
`apps/reading-advantage/components/teacher/my-classes.tsx:13`,
`components/teacher/my-students.tsx:14`,
`components/teacher/class-roster.tsx:5`,
`components/teacher/assignment-page.tsx:33`,
`components/dashboard/class-detail-dashboard.tsx:4`,
`components/dashboard/class-summary-table.tsx:40`, and
`components/dashboard/student-dashboard-content.tsx:23`. Each line reads
`import { useRouter } from "next/navigation";`.

The app defines a locale-aware router at `apps/reading-advantage/i18n/routing.ts:12`
and sets `localePrefix: "always"` at `i18n/routing.ts:9`. A push such as
`router.push("/teacher/reports/123")` at `components/dashboard/class-summary-table.tsx:201`
therefore produces a path with no locale segment. The middleware must redirect that
path before the page renders.

FR-4 states the goal at `spec.md:27`: "so navigation stays client-side". The change
removes the `NEXT_PUBLIC_BASE_URL` prefix, which is an improvement over a full page
load, but the navigation still costs a server redirect. The middleware picks the
locale from detection, not from the current URL, so a user who browses under `/th`
can land on the default locale.

### 5. Medium — a third matching fork keeps the commented-out `"use client"`

Evidence: `apps/reading-advantage/components/lesson/lesson-matching-word.tsx:2`
reads `// "use client";`. The file makes 13 hook calls. FR-5 named two files only,
and the track fixed both. `git log --follow` shows that
`component_deduplication_20260911` merged `components/vocabulary/tab-matching-words.tsx`
into `components/matching.tsx` in commit `5f03223b3`, and that merged file keeps the
restored directive at `components/matching.tsx:2`.

The third fork works today because its only importer is a client component:
`apps/reading-advantage/components/lesson/phases/phase12-sentence-activities.tsx:1`
declares `"use client"`.

Failure scenario: a server component imports `lesson-matching-word.tsx`. React then
throws on the first `useState` call and the lesson phase fails to render.

### 6. Low — the track edited a file that a later track deleted

Evidence: `git log --oneline -- apps/reading-advantage/components/teacher/reports.tsx`
shows the FR-2 edit `eb5737126` and the FR-4 edit `5ef0affdd`, then the deletion
`a3bebd80c` from `component_deduplication_20260911`. The plan counts that file in
its FR-4 deviation note at `plan.md:29`. The work is lost, but no defect remains.

### 7. Low — the "Settings" button now opens the class list

Evidence: `apps/reading-advantage/components/dashboard/class-detail-dashboard.tsx:118-129`.
The button keeps the `Settings` icon and the `t("settings")` label, and it now
pushes `/teacher/my-classes`. The spec permits this choice at `spec.md:22`
("Point it to `/teacher/my-classes` or remove the button"). The label misleads the
teacher, because the target page is a class list, not a settings page.

### 8. Low — the diff leaves Prettier-dirty formatting

Evidence: `apps/reading-advantage/components/teacher/my-classes.tsx:153-155` and
`:161-165`. The shortened calls stay wrapped across three or five lines, and
Prettier collapses each to one line. The same pattern appears in
`components/teacher/my-students.tsx`, `components/teacher/class-roster.tsx`, and
`components/dashboard/class-detail-dashboard.tsx:121-124`.

`AGENTS.md` Ponytail Rule 6 states: "Can it fit on one line? Keep it on one line."
A `npx prettier --check` run on the touched files reports all of them as dirty. Some
of that dirt is repository-wide and pre-existing, but these wrapped calls come from
this track.

### 9. Low — the static guards carry no counterexample fixture

Evidence: `apps/reading-advantage/__test__/broken-ux-fixes.test.ts:78-84`, `:87-92`,
`:95-100`, `:102-107`, and `:132-137`. Each scan collects offenders and asserts
`expect(offenders).toEqual([])`.

`measure/lessons-learned.md` states: "Every source-scan guard must ship with a
counterexample fixture (a file that DOES contain the banned pattern) and assert it
IS detected." Failure scenario: a path change makes `collectSourceFiles` return an
empty list. Every scan then passes and the guard reports nothing.

### 10. Low — the chatbot can render an empty bot bubble

Evidence: `apps/reading-advantage/components/chatbot-floating-button.tsx:66-69`
sets `text: data?.text ?? ""`. The render at `:143-150` always draws the bubble and
the `Bot` icon. When the API returns a body with no `text` field, the student sees
an empty bubble with no error text. The old code showed `" : undefined"`, so this is
an improvement, but the failure stays silent.

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 Fix broken genre links | Implemented, with defect 3 | `components/dashboard/student-dashboard-content.tsx:74` pushes `/student/read?genre=...`. The route exists at `app/[locale]/(student)/student/read/page.tsx`. The filter works at `server/controllers/article-controller.ts:163`. The type buttons stay inert (finding 3). |
| FR-2 Fix `captoliza` class typos | Implemented, scope widened | `grep -rn "captoliza" app components lib` returns zero hits. The track removed 20 occurrences in 10 files, not 2. The plan records the deviation at `plan.md:27`. |
| FR-3 Fix teacher 404 links | Implemented | `components/dashboard/class-summary-table.tsx:201` pushes `/teacher/reports/${classId}`, and the route exists at `app/[locale]/(teacher)/teacher/reports/[classroomId]/`. `components/dashboard/class-detail-dashboard.tsx:123` pushes `/teacher/my-classes` (finding 7). |
| FR-4 Remove Thai-locale redirects and absolute navigations | Partly implemented | `grep -rn "/th/teacher" app components` returns zero hits. `app/[locale]/(teacher)/teacher/reports/page.tsx:11` redirects to `/teacher/dashboard`. All 11 `NEXT_PUBLIC_BASE_URL` prefixes are gone from `router.push`. The navigation is still not client-side (finding 4). |
| FR-5 Restore `"use client"` in matching components | Implemented for the named files | `components/matching.tsx:2` declares `"use client"`. `components/vocabulary/tab-matching-words.tsx` merged into that file in commit `5f03223b3`. A third fork keeps the defect (finding 5). |
| FR-6 Remove the `act` import | Implemented | `components/student-assignment-dashboard.tsx:2` reads `import React, { useCallback, useEffect, useState } from "react";`. |
| FR-7 Stop overlapping flashcard speech | Implemented | `components/flashcards/flashcard-game.tsx:340` calls `speechSynthesis.cancel()` before `speak()` at `:343`. The unmount cleanup runs at `:146-153`. The `en-US` voice stays at `:342`. This is the only `speechSynthesis.speak` call site in the app. |
| FR-8 Fix visual typos and console imports | Implemented | `app/[locale]/(student)/student/read/[articleId]/page.tsx:145` reads `max-w-[400px]`. `grep -rn 'from "console"' app components lib` returns zero hits. |
| FR-9 Stop the chatbot from wiping history | Implemented | `components/chatbot-floating-button.tsx:103-106` no longer calls `setMessages([])`. The `" : "` prefix is gone at `:67`. See finding 10 for a minor side effect. |
| FR-10 Games page auth policy | Not implemented | `app/[locale]/(student)/student/games/page.tsx` holds no `redirect("/auth/signin")` call. See finding 1. |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 Genre click reaches `/student/read` and renders the list | Pass | `components/dashboard/student-dashboard-content.tsx:74` and `components/select.tsx:182-195` render `ArticleShowcaseCard` items. The genre filter applies at `server/controllers/article-controller.ts:163`. |
| AC-2 No `captoliza` and no `/teacher/class-detail/` | Pass | Both greps over `app`, `components`, and `lib` return zero hits. |
| AC-3 No `/th/` redirect and no `NEXT_PUBLIC_BASE_URL` in `router.push` | Pass | `grep -rn '/th/teacher'` returns zero hits. `grep -rn 'router\.push(\s*`\$\{process\.env\.NEXT_PUBLIC_BASE_URL'` returns zero hits. The remaining `NEXT_PUBLIC_BASE_URL` uses are `fetch` calls to `/api/v1/...`, which stay in scope. |
| AC-4 Both matching components start with `"use client"` | Pass | `components/matching.tsx:2` declares the directive. The second file merged into the first, and `__test__/broken-ux-fixes.test.ts:114-118` asserts the merge. |
| AC-5 No `act` import in the assignment dashboard | Pass | `components/student-assignment-dashboard.tsx:2`. |
| AC-6 Rapid flashcard flips never overlap speech | Pass by code reading | `components/flashcards/flashcard-game.tsx:340` cancels before each speak. No behavioral test proves it (finding 2). |
| AC-7 No `import { log } from "console"` | Pass | The grep returns zero hits. |
| AC-8 Chatbot open and close preserves the conversation | Pass by code reading | `components/chatbot-floating-button.tsx:31` holds the state, and the open handler at `:103-106` clears only `userInput`. No behavioral test proves it (finding 2). |
| AC-9 Games page auth matches the owner policy and sibling pages | **Fail** | `app/[locale]/(student)/student/games/page.tsx` has no auth gate. Sibling pages have one. See finding 1. |

## Plan Accuracy

1. **Stale block on FR-10.** `plan.md:35` marks the task "BLOCKED on owner decision".
   The owner decision exists in two places: `spec.md:52` and `plan.md:14`. The block
   is no longer true, and the task is simply not done.
2. **Phase 2 unchecked while Phase 3 claims done.** `plan.md:18-22` holds four
   unchecked boxes. `plan.md:36` claims the test task is complete. The two states
   conflict, because the Phase 3 claim counts only the Phase 1 static guards.
3. **All 10 commit hashes are valid.** Each short hash in `plan.md` names a real
   commit, and `git merge-base --is-ancestor` confirms each one is an ancestor of
   HEAD. No dangling reference exists.
4. **The three recorded deviations match the code.** The FR-2 note (10 components,
   20 occurrences), the FR-3 note (`components/dashboard/class-summary-table.tsx`),
   and the FR-4 note (11 prefixes across `components/teacher/`) all match the diff.
5. **`metadata.json` is stale.** The file records `"status": "new"`,
   `"actual_tasks": null`, and `"deviation_notes": ""`. The plan records nine done
   tasks and three deviations.
6. **Phase 4 is open.** `plan.md:41-43` holds three unchecked tasks: the docs
   update, the doctor and lint gates, and the manual verification.
7. **Two later tracks changed this track's files.** `component_deduplication_20260911`
   deleted `components/teacher/reports.tsx` in `a3bebd80c` and merged
   `components/vocabulary/tab-matching-words.tsx` in `5f03223b3`. The same track
   updated `__test__/broken-ux-fixes.test.ts` in `aea7aabf1`. The plan does not
   record these follow-on changes.

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest __test__/broken-ux-fixes.test.ts 2>&1 | tail -40
```

Output:

```
Test Suites: 1 passed, 1 total
Tests:       13 passed, 13 total
Snapshots:   0 total
Time:        14.042 s
Ran all test suites matching __test__/broken-ux-fixes.test.ts.
```

Summary: the track suite is green. All 13 tests are static source scans. The suite
proves that the source text matches the fixes. It does not exercise any component.

## Verdict

**STOP.** Two High findings block this track:

1. **Finding 1 — FR-10 is not implemented.** The owner approved the sign-in
   requirement on 2026-09-11, and the games page still has no gate. AC-9 fails.
   Action: add `if (!user) return redirect("/auth/signin");` to
   `app/[locale]/(student)/student/games/page.tsx`, then check the FR-10 box in
   `plan.md`.
2. **Finding 2 — Phase 2 is skipped.** FR-1, FR-7, and FR-9 have static string
   checks only. Action: write the three behavioral tests that `plan.md:18-22`
   names, or record a deviation that the owner approves.

Three Medium findings need an owner decision before closeout: finding 3 (inert type
buttons), finding 4 (navigation is still a server redirect), and finding 5 (the
third matching fork). The five Low findings are safe to defer.
