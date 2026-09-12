# Phase Code Review: Reading Structural UX Alignment

- Track ID: `structural_ux_alignment_20260911`
- App: `apps/reading-advantage`
- Revision range: `1d4ab96f7^..22f3dc292`
- Commit count: 15 track commits (plus 2 `chore(measure)` document commits in the range)
- Review date: 2026-09-12
- Reviewer note: this review reads the committed diff and the current source state only. The
  working tree holds uncommitted files from the unrelated APK track. The review changed no
  source file. The review wrote only this report.

## Findings

### F-1 (Critical) The client can still set its own XP through the old activity log endpoint

- Evidence: `apps/reading-advantage/server/controllers/user-controller.ts:397-435`
- Evidence: `apps/reading-advantage/server/controllers/auth-controller.ts:113-129`
- Evidence: `apps/reading-advantage/app/api/v1/users/[id]/activitylog/route.ts:22`

`postActivityLog` reads `data.xpEarned` from the request body and writes it to `xp_logs`. The
code then writes the result to `users.xp`:

```
const finalXp = data.isInitialLevelTest
  ? data.xpEarned
  : (currentUser?.xp || 0) + data.xpEarned;
```

`assertSelfOrAllowedStaff` permits a user to post to the user's own route id. The server does
not compute or limit `xpEarned`.

Failure scenario: a student signs in, then sends one POST to
`/api/v1/users/<own id>/activitylog` with `{"activityType":"level_test","contentId":"x",
"xpEarned":221000,"isInitialLevelTest":true}`. The server sets the student XP to 221000 and
recomputes the level and the CEFR level. Without `isInitialLevelTest` the same request adds
arbitrary XP repeatedly, once per new `targetId`. FR-4 added a new endpoint but left this path
open, so AC-4 fails.

### F-2 (High) Any teacher or admin reads any student data through the user API

- Evidence: `apps/reading-advantage/server/controllers/auth-controller.ts:113-129`
- Evidence: `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:60-63`

`assertSelfOrAllowedStaff` returns true for every `ADMIN` and every `TEACHER`, for every route
user id. The comment in the source states the scope check is optional and the code omits it.
The student-progress page itself calls `/api/v1/users/:id/activitylog` and
`/api/v1/users/:id/student-data` through `fetchData`.

Failure scenario: a teacher from another school opens the guarded page and receives a redirect.
The same teacher then calls `GET /api/v1/users/<studentId>/activitylog` directly and receives
the same data. The FR-3 page guard protects the page, not the data, so AC-3 fails.

### F-3 (High) The FR-3 guard applies no school scope to ADMIN and SYSTEM

- Evidence: `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:36`
- Evidence: `apps/reading-advantage/lib/session.ts:172` (`school_id` is present on the session user)
- Evidence: `packages/db/src/schema/users.ts:37` (`users.schoolId`)

The guard permits `Role.SYSTEM` and `Role.ADMIN` before it runs the classroom join. The code
compares no school. The session user already carries `school_id`, so the data for a school
comparison is available.

Failure scenario: an admin of school A opens `/teacher/student-progress/<student of school B>`
and reads the full progress of that student.

### F-4 (High) The placement endpoint trusts the CEFR level that the client sends

- Evidence: `apps/reading-advantage/server/controllers/level-test-controller.ts:108-115`
- Evidence: `apps/reading-advantage/server/controllers/level-test-controller.ts:169`
- Evidence: `apps/reading-advantage/lib/utils.ts:144-177`

The Zod schema accepts `level` and `sublevel` as free strings. The server computes `systemXp`
from those two strings only. The server does not verify that the AI produced the assessment,
and it does not replay the chat.

Failure scenario: a new student posts `{"level":"C2","sublevel":"+"}` to
`/api/v1/level-test/placement` and receives 221000 XP and RA level 18 on the first attempt.
The XP authority moved to the server, but the placement input stays under client control.

### F-5 (Medium) The FR-9 cause statement in the spec is wrong

- Evidence: `apps/reading-advantage/lib/enums.ts:13-42` (values are UPPERCASE)
- Evidence: `git show 975816594 -- apps/reading-advantage/server/controllers/user-controller.ts`

The spec states that `parseActivityType` "uppercases the input and compares against lowercase
enum values" and "returns null for every activity type". Both statements are wrong. Section
"FR-9 Activity Type Analysis" below gives the real cause. A wrong cause statement can lead the
team to repeat the same repair on the wrong code.

### F-6 (Medium) The FR-9 regression test proves the pure function only

- Evidence: `apps/reading-advantage/__tests__/controllers/parse-activity-type.test.ts:33-75`

The test imports `parseActivityType` and calls it directly. The test never calls
`postActivityLog` and never builds a request. The spec asks for "a regression test that proves
a valid activity type passes" at the endpoint. The test does not cover the second new 400 path,
the required target id.

One assertion is also circular:

```
const canonicalValues = new Set([
  ...Object.values(LibActivityType),
  ...Object.values(ModelActivityType).map((value) => value.toUpperCase()),
]);
...
expect(canonicalValues.has(expected)).toBe(true);
```

`expected` is always a model value in uppercase, and the set always holds every model value in
uppercase. The assertion always passes. It proves nothing about `lib/enums.ts`.

`measure/lessons-learned.md` (2026-06-12, post_24h_audit_remediation) states: "Always prefer
behavior tests that import and exercise the module."

### F-7 (Medium) `parseActivityType` returns values that no enum declares

- Evidence: `apps/reading-advantage/server/controllers/user-controller.ts:128-137`
- Evidence: `apps/reading-advantage/lib/enums.ts:13-42`
- Evidence: `packages/db/src/schema/primary.ts:34-52`

See Question C below for the full analysis.

### F-8 (Medium) The student-progress page still fetches its own app over HTTP

- Evidence: `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:16-22, 60-63`
- Evidence: `apps/reading-advantage/utils/fetch-data.ts:8-12`

`fetchData` builds an absolute URL from `NEXT_PUBLIC_BASE_URL` and forwards the incoming
headers. This is the same anti-pattern that FR-2 removed from the read and the lesson pages.
FR-2 lists only those two pages, so this page is outside the letter of FR-2. It stays against
NFR-2 and against the domain-layer rule in `AGENTS.md`.

### F-9 (Medium) An unrecognized level writes a zero-XP placement row that blocks a retry

- Evidence: `apps/reading-advantage/server/controllers/level-test-controller.ts:196-242`

The code inserts the `LEVEL_TEST` activity row before it checks `systemXp > 0`. When
`cefrToSystemXp` returns 0 for an unknown level string, the row still exists. Every later
request finds the existing row at line 183-194 and returns the placement without any XP.

Failure scenario: the AI returns a level string such as "A1 " or "Beginner". The student gets 0
XP, and the student can never receive a placement again.

### F-10 (Medium) FR-3 has no behavior test, only a source scan

- Evidence: `apps/reading-advantage/__test__/structural-ux-part-a.test.ts:106-119`

The test reads the page source and looks for the strings `classroomTeachers`,
`classroomStudents`, and `redirect("/teacher/dashboard")`. It never runs the page. Phase 2 of
`plan.md` asks for "Student-progress page rejects a teacher from another school
(403/redirect)". That test does not exist. `measure/lessons-learned.md` (2026-05-02,
review_remediation) states: "Cross-tenant authorization checks must be tested explicitly."

### F-11 (Low) The games catalog deferral is real and open

- Evidence: `apps/reading-advantage/components/apk/StudentGamesCatalog.tsx:91` (card `onClick`)
- Evidence: `git status --porcelain` reports the file as untracked (`??`)

The catalog card is a `Card` element with an `onClick` handler and no keyboard handler. The
file belongs to the uncommitted APK track, so this track could not edit it. The deferral note
in `plan.md` is correct and stays open. AC-6 fails for game cards.

### F-12 (Low) Hardcoded English strings remain in files that this track edited

- Evidence: `apps/reading-advantage/components/article-content.tsx:375` (`{loading ? "Loading" : ...}`)
- Evidence: `apps/reading-advantage/components/session-sync-redirect.tsx:27` (`Syncing your profile...`)

Commit `4af49b6` added the "Loading" string, and commit `1d4ab96` edited the redirect
component. Neither file is in the FR-6 scope list, so AC-5 still passes.

### F-13 (Low) Dead client code keeps the old self-award payload

- Evidence: `apps/reading-advantage/components/first-run-level-test.tsx:237-255`

No file imports `FirstRunLevelTest`. The component still posts `xpEarned` and
`isInitialLevelTest: true`. The file is a template for the vulnerable request in F-1.

### F-14 (Low) The plan boxes do not match the work

See section "Plan Accuracy".

## Security Review

### FR-3 student-progress ownership check — verdict: PARTLY SAFE

Commit `62ae099` adds the guard at
`apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:36-55`.

(a) Does the join prove that THIS teacher teaches THIS student? Yes. The query joins
`classroom_teachers` to `classroom_students` on `classroom_id`, then filters on
`classroomStudents.studentId = studentId` and `classroomTeachers.teacherId = user.id`. Both
tables reference `classrooms.id` with `onDelete: "cascade"`
(`packages/db/src/schema/classrooms.ts:25-48`), so a deleted classroom removes both rows. The
join is correct for the relation that it tests.

(b) Does the guard enforce school scope? No. The guard enforces classroom scope only. For a
user with role `TEACHER` the classroom scope is enough in practice, because a teacher of school
A holds no `classroom_teachers` row for a classroom of school B. For role `ADMIN` and role
`SYSTEM` the guard runs no check at all. An admin of school A can read a student of school B.
The session already carries `school_id`, and `classrooms.schoolId` exists, so a school
comparison is possible. See F-3.

(c) Is the failure mode a redirect? Yes. The code calls `return redirect("/teacher/dashboard")`
at line 53, before `getScopedI18n` and before the two data fetches at line 60-63. No student
data reaches the render.

The largest gap is not on the page. It is in the API that the page calls. See F-2. A blocked
user reads the same data with one direct API call.

### FR-4 level-test XP authority — verdict: NOT SAFE

Commit `afb45de` adds `POST /api/v1/level-test/placement` and
`handleLevelTestPlacement`.

What the commit does correctly:

- The Zod schema at `level-test-controller.ts:108-115` accepts `level`, `sublevel`,
  `messageCount`, `strengths`, `improvements`, and `aiXp`. It accepts no `systemXp` field and no
  `xpEarned` field.
- The server computes `systemXp` itself at line 169 with `cefrToSystemXp(level, sublevel)`.
- The `aiXp` field reaches the `details` JSON only (line 207). No code path uses it for the XP
  award.
- The client no longer imports `cefrToSystemXp` or `levelCalculation`
  (`components/level-test-chat.tsx`), and it posts to the new endpoint at line 372.
- The repeat guard at line 177-194 plus `onConflictDoNothing` at line 215 matches the unique
  constraint `user_activity_type_target_unique`
  (`packages/db/src/schema/progress.ts:24`), so a repeat awards no second XP.

Why the verdict is still NOT SAFE:

1. The old path stays open. `POST /api/v1/users/:id/activitylog` still accepts
   `xpEarned` and `isInitialLevelTest` from the body and writes them to `users.xp`. This is the
   Critical finding F-1. The FR-4 change does not close it, and nothing blocks it.
2. The new endpoint trusts the client-supplied CEFR level (F-4). The client chooses the input
   to the XP function, so the client still chooses the XP.

AC-4 states: "Placement XP is computed on the server; the client cannot set its own XP." The
first half holds. The second half fails.

## FR-9 Activity Type Analysis

### Question A — what the code did before `975816594`, and the real cause

The old code is in the diff of `975816594`:

```
const activityType = data.activityType.toUpperCase() as ActivityType;

if (!Object.values(ActivityType).includes(activityType)) {
  console.error("Invalid activity type:", activityType);
  return NextResponse.json({
    message: "Invalid activity type",
    status: 400,
  });
}
```

The old code also called `.toUpperCase()`, and it also compared against the same
`lib/enums.ts` `ActivityType`. The comparison behavior did not change.

The spec's stated cause is inaccurate on two points:

1. `lib/enums.ts` `ActivityType` holds UPPERCASE values, not lowercase values
   (`apps/reading-advantage/lib/enums.ts:13-42`). The uppercase input matched most of them.
2. The parser did not return null "for every activity type", and the endpoint did not return 400
   "for all clients". Most types matched and worked.

The parent hypothesis is close but needs one correction. The client enum in
`components/models/user-activity-log-model.ts:51-73` holds 21 values. Uppercased, 19 of them
exist in `lib/enums.ts`. Only two do not:

- `lesson_read` -> `LESSON_READ` (absent from `lib/enums.ts`)
- `lesson_rating` -> `LESSON_RATING` (absent from `lib/enums.ts`)

`lesson_flashcard` is NOT one of the failures. `lib/enums.ts:31` declares
`LESSON_FLASHCARD: "LESSON_FLASHCARD"`, so that type always passed.

`lesson_read` has three live senders:
`components/lesson/lesson-button.tsx:26`, `components/lesson/lesson-progress-bar.tsx:188`,
`:307`, and `:578`. `lesson_rating` has no sender.

The real cause of the visible regression is the response shape, not the comparison. Before
`975816594` the reject branch returned `NextResponse.json({ message, status: 400 })`. That is an
HTTP **200** response with a `status` field in the body. The lesson-read log silently did
nothing, and the client saw success. Commit `975816594` replaced it with
`NextResponse.json({ message }, { status: 400 })`, which is a real HTTP 400. The same two types
then produced a visible client error.

Commit `975816594` also added a second new 400 path. The new `resolveActivityTarget` returns
null when the body carries no `articleId`, no `storyId`, and no `contentId`, and the caller then
returns 400 (`user-controller.ts:282-288`). The old code accepted an empty target id. Any client
that posts without a target now receives 400. The FR-9 commit did not address this path, and the
regression test does not cover it.

Conclusion: the hotfix repairs a real gap, because `LESSON_READ` and `LESSON_RATING` now parse.
The spec's explanation of why the gap existed is wrong, and the spec's claim of an app-wide
quiz XP failure is too broad. Quiz types (`mc_question`, `sa_question`, `la_question`) always
parsed.

### Question B — does the hotfix create a new read-side bug? Severity: Low

No. The hotfix creates no new read-side bug.

Storage was already uppercase. The original import commit `60bc7c2dd` already wrote
`data.activityType.toUpperCase()` to `user_activity`. Every commit since then kept that
behavior. Production rows therefore hold UPPERCASE values today, and they held UPPERCASE values
before 2026-09-12. The hotfix changed nothing about the stored casing.

The read API lowercases on output. `getActivityLog` maps each row with
`activityType: activity.activityType.toLowerCase()`
(`apps/reading-advantage/server/controllers/user-controller.ts:686`). A second read path does
the same at line 1086. Every client that fetches `/api/v1/users/:id/activitylog` therefore
receives lowercase values, whatever the database holds.

The three cited client comparisons are safe:

- `components/rating-popup.tsx:89` compares against `ActivityType.ChapterRating`
  (`"chapter_rating"`). The data comes from `/api/v1/users/:id/activitylog` (line 77), so the
  value is lowercase. Safe.
- `components/lesson/lesson-vocabulary-flashcard-game.tsx:211` compares against
  `"lesson_flashcard"` from the same endpoint. Safe.
- `components/lesson/lesson-order-sentence.tsx:137` compares against `"sentence_ordering"` from
  the same endpoint. Safe.
- `components/dashboard/user-reading-chart.tsx:55-58` checks both casings. The extra check is
  harmless. It is evidence that a developer once saw uppercase values, but the current API path
  delivers lowercase.

The new writer in `level-test-controller.ts:200` writes `ActivityType.LEVEL_TEST`, which is
`"LEVEL_TEST"`. That matches the existing uppercase convention, so it is consistent.

Severity: Low. The finding is informational. One residual risk stays: the casing contract lives
in two `toLowerCase()` calls inside one controller. Any new read path that queries
`user_activity` directly and returns the raw column will break the lowercase client
comparisons. The track adds no test that pins this contract.

### Question C — type safety and data integrity of the returned value

`parseActivityType` declares the return type `ActivityType | null`
(`apps/reading-advantage/server/controllers/user-controller.ts:128`) and reaches that type with
a cast:

```
return isKnown ? (normalized as ActivityType) : null;
```

For the input `"lesson_read"` the function returns the string `"LESSON_READ"`. That value is
absent from `lib/enums.ts` `ActivityType` and absent from the `activity_type` pgEnum
(`packages/db/src/schema/primary.ts:34-52`). The cast therefore states a false fact to the
compiler.

Three consequences follow:

1. Type safety. Later code compares the result against enum members, for example
   `activityType === ActivityType.ARTICLE_READ` at `user-controller.ts:293`. TypeScript treats
   the value as a member of the union, so it flags no error, and the compiler gives no warning
   about the two out-of-union values. A `switch` with exhaustiveness checking over
   `ActivityType` would silently miss `LESSON_READ` and `LESSON_RATING`.
2. Data integrity. The function is the write gate. `LESSON_READ` rows already exist in
   `user_activity.activity_type` and in `xp_logs.activity_type`. Both columns are `text`, so the
   database accepts them. The schema comment at `primary.ts:29-33` says new code should use the
   pgEnum as the source of truth. A future migration that converts either column to the
   `activity_type` enum type will fail on those rows, because the enum lacks both labels.
3. Silent divergence. Three enums now disagree: `lib/enums.ts` (28 uppercase values),
   `components/models/user-activity-log-model.ts` (21 lowercase values), and the pgEnum
   (17 uppercase values). No test compares them. The hotfix widened the accepted set without
   widening any declaration.

Recommended repair, for the owner to schedule: add `LESSON_READ` and `LESSON_RATING` to
`lib/enums.ts`, then delete the second branch of `parseActivityType` so that one enum is the
single source of truth. Add a test that asserts every value of the client model enum, in
uppercase, exists in `lib/enums.ts`. Record the pgEnum divergence in `measure/tech-debt.md`.

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 Server-side dashboard and goals | Implemented | `hooks/student/useDashboardMetrice.ts` deleted; `server/services/metrics/student-dashboard-service.ts` added; `components/dashboard/student-dashboard-contract.ts` added; `app/[locale]/(student)/student/dashboard/page.tsx:1-7`; `components/goals/goals-page-content.tsx:41-48` takes `initialGoals` props |
| FR-2 No self-HTTP fetch in read and lesson pages | Implemented | `server/services/article-service.ts:9-10`; `server/services/classroom-service.ts`; no `fetch(` in `app/[locale]/(student)/student/read/[articleId]/page.tsx` or `.../lesson/[articleId]/page.tsx` |
| FR-3 Student-progress role check | Partly implemented | Guard at `app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:36-55`; no school scope for ADMIN and SYSTEM (F-3); the API is unscoped (F-2) |
| FR-4 Server-side level-test XP | Partly implemented | `server/controllers/level-test-controller.ts:134-245`; `lib/utils.ts:144`; the old self-award path stays open (F-1); the level input is client-controlled (F-4) |
| FR-5 Lesson page Promise.all and error state | Implemented | `app/[locale]/(student)/student/lesson/[articleId]/page.tsx:22-39` |
| FR-6 i18n pass | Implemented | `components/footer.tsx:10-36` (year computed, one contact email, no phone); `__test__/structural-ux-part-b-i18n.test.ts` passes 10 tests; 5 locale files updated in `d7d1778` and `461d92b` |
| FR-7 Accessibility pass | Partly implemented | `components/matching.tsx:329-335` button; `components/teacher/teacher-data-table.tsx:160-162` `tabIndex` and `onKeyDown`; `components/user-signin-form.tsx:76` `role="alert"`; `components/level-test-chat.tsx:518` `aria-live="polite"`; `components/sidebar-nav.tsx:2,23` `Link`; games catalog card deferred (F-11) |
| FR-8 Shell and navigation cleanup | Implemented | `lib/auth-guard.ts:1-38`; `configs/index-page-config.ts:7` `sharedMainNav`; `components/session-sync-redirect.tsx:8-13` `destination`; `app/[locale]/role-selection/page.tsx:27`; `disableLeaderboard={true}` in 4 layouts; `components/theme-wrapper.tsx` renamed; `contexts/userRole-context.tsx` deleted; 7 route-group `error.tsx` files; `components/user-account-nav.tsx:35-40` `useMemo` and expiry guard; `app/[locale]/(teacher)/teacher/workbook-generator/page.tsx` exists and is linked at `configs/teacher-page-config.ts:44` |
| FR-9 `parseActivityType` hotfix | Implemented, with caveats | `server/controllers/user-controller.ts:128-137`; `__tests__/controllers/parse-activity-type.test.ts`; the spec cause is wrong (F-5); the test is a unit test only (F-6); the return type is unsound (F-7) |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 Dashboard and goals render server data; no metric or goals fetch on load | Pass | `components/dashboard/student-dashboard-content.tsx:57-63` holds a telemetry effect only; `components/goals/goals-page-content.tsx:51-71` fetches only inside `refreshGoals`, which runs after a mutation |
| AC-2 No server component self-HTTP fetch in read and lesson pages | Pass | No `fetch(` and no `NEXT_PUBLIC_BASE_URL` in either page |
| AC-3 A teacher cannot open another school's student-progress page | Fail | The page guard blocks a cross-school teacher, but `server/controllers/auth-controller.ts:113-129` lets the same teacher read the same data through the API (F-2), and ADMIN bypasses the page guard (F-3) |
| AC-4 Placement XP is server-computed; the client cannot set its own XP | Fail | `server/controllers/user-controller.ts:397-435` still accepts `xpEarned` from the body (F-1); `level-test-controller.ts:169` trusts the client `level` (F-4) |
| AC-5 No hardcoded English in the listed scopes for `en` and `th` | Pass | `__test__/structural-ux-part-b-i18n.test.ts` passes; the two remaining English strings (F-12) sit outside the listed scopes |
| AC-6 Matching cards, table rows, game cards, save and translate are keyboard reachable | Fail | Matching, table rows, save-to-flashcard, and translate pass; the game card is still a `div` with `onClick` at `components/apk/StudentGamesCatalog.tsx:91` (F-11) |
| AC-7 Teacher pages issue no student-leaderboard fetch | Pass | `app/[locale]/(teacher)/teacher/layout.tsx:15` sets `disableLeaderboard={true}`; `components/shared/app-layout.tsx:69` skips `feactlearderboard()` |
| AC-8 `test`, `check-types`, and `build` pass for reading-advantage | Not verified here | Another agent runs the full monorepo suite. This review ran the track test files only. |

## Plan Accuracy

The plan is out of date in four ways.

1. Phase 1 and Phase 2 are fully unchecked, but the work exists. The contracts landed in
   `components/dashboard/student-dashboard-contract.ts` (commit `d275693`). The static and
   behavior tests landed inside the Phase 3 commits, not before them:
   `__test__/structural-ux-part-a.test.ts` (FR-1 to FR-5 static scans),
   `__test__/structural-ux-part-a-behavior.test.tsx`,
   `__test__/structural-ux-part-a-placement.test.ts` (the level-test behavior test),
   `__test__/structural-ux-shell-part1.test.ts` (the `disableLeaderboard` assertions), and
   `__test__/structural-ux-shell-part2.test.ts`. The Red-then-Green order was not followed, and
   the boxes were never checked. One planned Phase 2 test is missing: the student-progress
   cross-school rejection test (F-10).
2. The FR-9 task box is unchecked, but commit `22f3dc292` implements it. Confirmed. The commit
   changes `server/controllers/user-controller.ts:128-137` and adds
   `__tests__/controllers/parse-activity-type.test.ts`. Check this box.
3. The FR-7 deferral is still real. `apps/reading-advantage/components/apk/StudentGamesCatalog.tsx`
   is untracked in `git status --porcelain` and belongs to the APK track. The card at line 91
   still uses `onClick` with no `Link` and no keyboard handler. Keep the deferral and name an
   owner.
4. The FR-8 workbook-generator decision holds. The route file
   `app/[locale]/(teacher)/teacher/workbook-generator/page.tsx` exists, and
   `configs/teacher-page-config.ts:44` links `/teacher/workbook-generator`. The route is
   reachable from the teacher sidebar. The owner review is still pending, as the plan states.

Phase 4 is fully unchecked and matches reality: the doc updates, the tech-debt row, and the
doctor gates are open.

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest __tests__/controllers/parse-activity-type.test.ts \
  __test__/structural-ux-a11y.test.tsx __test__/structural-ux-page-cleanup.test.ts \
  __test__/structural-ux-part-a-behavior.test.tsx __test__/structural-ux-part-a-placement.test.ts \
  __test__/structural-ux-part-a.test.ts __test__/structural-ux-part-b-i18n.test.ts \
  __test__/structural-ux-shell-part1.test.ts __test__/structural-ux-shell-part2.test.ts
```

Output:

```
Test Suites: 9 passed, 9 total
Tests:       86 passed, 86 total
Snapshots:   0 total
Time:        47.975 s
```

All nine track test files pass. Note the limitation: 7 of the 9 files are source-text scans.
They prove the source looks correct. Only
`__test__/structural-ux-part-a-behavior.test.tsx` and
`__test__/structural-ux-part-a-placement.test.ts` exercise behavior.

## Verdict

STOP. The track has 1 Critical finding and 3 High findings. Two acceptance criteria fail, and a
third fails on the accessibility item that the plan defers.

Blocking findings:

1. F-1 (Critical) — `POST /api/v1/users/:id/activitylog` still lets a client set its own XP.
   Repair: compute `xpEarned` on the server from the activity type, and delete
   `isInitialLevelTest` from the request contract.
2. F-2 (High) — `assertSelfOrAllowedStaff` grants every teacher and every admin access to every
   user record. Repair: add a school check and a classroom check to the staff branch.
3. F-3 (High) — the FR-3 guard applies no school scope to ADMIN and SYSTEM. Repair: compare
   `user.school_id` against the student school for the ADMIN branch.
4. F-4 (High) — the placement endpoint trusts the client-supplied CEFR level. Repair: derive the
   level on the server, or sign the assessment when the chat endpoint returns it and verify the
   signature at the placement endpoint.

The Medium findings F-5 through F-10 should be fixed or recorded with a named owner before
Phase 4 closes. The Low findings F-11 through F-14 may be recorded and deferred.
