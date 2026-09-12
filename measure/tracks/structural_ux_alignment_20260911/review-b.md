# Independent Review B: Reading Structural UX Alignment

- Track ID: `structural_ux_alignment_20260911`
- App: `apps/reading-advantage`
- Reviewer: Review B (independent second review)
- Review date: 2026-09-12
- Scope: current working-tree source. Unrelated APK dirty files are ignored.
- This review changed no application source. This review wrote only this report.

The first review is `plan-review.md`. That review gave STOP for four defects.

The four defects were client XP self-award, unscoped staff API, ADMIN school bypass, and placement that trusts client CEFR. This review checks those four repairs in the current source.

## Check Results

| Check | Result | Evidence |
| --- | --- | --- |
| 1. `postActivityLog` ignores client `xpEarned` and `isInitialLevelTest`; XP comes from activity type | Pass | `server/controllers/user-controller.ts:426-455` |
| 2. `assertSelfOrAllowedStaff` is async and enforces teacher classroom plus admin school scope; all former sync call sites await it | Pass | `server/controllers/auth-controller.ts:123-164`; 18 `await` call sites |
| 3. Student-progress ADMIN branch compares `school_id` | Pass | `app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:35-43` |
| 4. Placement reads a server-stored chat assessment; client level cannot set XP; unrecognized level does not write a blocking 0-XP row | Fail | Placement ignores request `level`. `postActivityLog` can still write the stored assessment. See F-B2. |

## Findings

### F-B1 (Critical) `putActivityLog` still writes client `xpEarned`

- Evidence: `apps/reading-advantage/server/controllers/user-controller.ts:587-610`
- Evidence: `apps/reading-advantage/app/api/v1/users/[id]/activitylog/route.ts:23`

`postActivityLog` now computes XP with `xpForActivityType`. `putActivityLog` on the same route still reads `data.xpEarned` from the body and writes it to `xp_logs` and `users.xp`.

```
if (!hasExistingXpLog && data.xpEarned && data.xpEarned > 0) {
  await db.insert(xpLogs).values({
    userId: id,
    xpEarned: data.xpEarned,
```

`assertSelfOrAllowedStaff` permits a user to write the user's own route id.

Failure scenario: a student signs in, then sends one PUT to `/api/v1/users/<own id>/activitylog` with a new `contentId` and `"xpEarned":221000`. The server adds 221000 XP. The student can repeat the request with a new target id.

The F-1 repair closed POST. It left PUT open. AC-4 fails.

### F-B2 (High) A client can plant the stored placement assessment through the activity log

- Evidence: `apps/reading-advantage/server/controllers/level-test-controller.ts:168-199`
- Evidence: `apps/reading-advantage/server/controllers/user-controller.ts:306-375`
- Evidence: `apps/reading-advantage/lib/enums.ts:20`
- Evidence: `apps/reading-advantage/components/models/user-activity-log-model.ts:60`

`handleLevelTestPlacement` reads `user_activity` where `activityType` is `LEVEL_TEST` and `targetId` is `pending-level-test-assessment`. It then calls `cefrToSystemXp` on that stored `level` and `sublevel`. The request body `level` is unused.

`handleLevelTestChat` writes that row after `validateAssessment`. That write is not exclusive. `parseActivityType("level_test")` returns `LEVEL_TEST`. `postActivityLog` accepts `contentId: "pending-level-test-assessment"` and stores `data.details` with no assessment schema check.

The placement handler casts `pending.details.assessment`. It does not run `assessmentSchema` again.

Failure scenario: a student posts a `level_test` activity with target `pending-level-test-assessment` and details `level: C2`, `sublevel: +`. The student then posts `{}` to `/api/v1/level-test/placement`. The server awards 221000 XP.

The client does not set XP on the placement body. The client still chooses the CEFR input that sets XP. AC-4 fails.

### F-B3 (High) `getStudentData` still has no staff scope

- Evidence: `apps/reading-advantage/server/controllers/user-controller.ts:1168-1206`
- Evidence: `apps/reading-advantage/app/api/v1/users/[id]/student-data/route.ts:16-17`
- Evidence: `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:20-21`

The first review named this endpoint. The page guard now compares school for ADMIN. `GET /api/v1/users/:id/activitylog` now uses the scoped helper. `getStudentData` still selects the student by route id after `protect` only.

The same gap exists on `getUserActivityData` (`user-controller.ts:1046`) and `getUserXpLogs` (`user-controller.ts:1259`). `resetUserProgress` (`user-controller.ts:1216`) has the same missing check and deletes the student's progress.

Failure scenario: a teacher from school A is redirected from the student-progress page for a student of school B. The same teacher then calls `GET /api/v1/users/<studentId>/student-data` and receives name, email, XP, level, and CEFR.

The page guard does not protect the data. AC-3 fails.

### F-B4 (High) `updateUser` still writes client `xp`

- Evidence: `apps/reading-advantage/server/controllers/user-controller.ts:254-267`
- Evidence: `apps/reading-advantage/app/api/v1/users/[id]/route.ts:22`

`PATCH /api/v1/users/:id` sets `xp: data.xp` from the body. `assertSelfOrAllowedStaff` permits self access. A student can set the student's own XP with one PATCH.

This path is outside the activity-log repair. AC-4 still requires that the client cannot set its own XP.

### F-B5 (Medium) No behavior test covers `assertSelfOrAllowedStaff`

- Evidence: no test file imports `assertSelfOrAllowedStaff`
- Evidence: `apps/reading-advantage/__tests__/controllers/activity-xp-authority.test.ts` uses a student session on the student's own id

The helper now queries classrooms and schools. A test that proves a cross-school teacher receives 403 is missing. A test that proves a same-school admin receives access is also missing. `measure/lessons-learned.md` (2026-05-02) requires explicit cross-tenant authorization tests.

### F-B6 (Medium) The FR-3 test is still a source scan

- Evidence: `apps/reading-advantage/__test__/structural-ux-part-a.test.ts:106-119`

The test looks for the strings `classroomTeachers`, `classroomStudents`, and `redirect("/teacher/dashboard")`. It does not run the page. It does not assert `school_id` or `users.schoolId` for the ADMIN branch. Phase 2 of `plan.md` still asks for a cross-school rejection test. That test does not exist.

### F-B7 (Medium) The student-progress page still fetches its own app over HTTP

- Evidence: `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:16-22, 67-71`

`fetchData` still builds an absolute URL and forwards headers. FR-2 listed only the read and lesson pages, so this page is outside the letter of FR-2. It still violates NFR-2.

### F-B8 (Medium) The FR-9 test and parser caveats from the first review remain

- Evidence: `apps/reading-advantage/__tests__/controllers/parse-activity-type.test.ts:42-54`
- Evidence: `apps/reading-advantage/server/controllers/user-controller.ts:128-137`

The circular `canonicalValues.has(expected)` assertion still always passes. `parseActivityType` still returns `LESSON_READ` and `LESSON_RATING`, which `lib/enums.ts` does not declare. The spec cause statement in `spec.md` FR-9 is still wrong.

### F-B9 (Medium) The placement tests do not pin CHECK 4

- Evidence: `apps/reading-advantage/__test__/structural-ux-part-a-placement.test.ts:120-146`

The test named "rejects an invalid assessment payload" returns 400 because no pending row exists. The schema now makes `level` optional, so `{ sublevel: "+" }` is valid. The old "unrecognized level" test was removed. No test plants a pending row through `postActivityLog`. No test proves an unrecognized stored level returns 400 with zero inserts.

### F-B10 (Low) SYSTEM still bypasses school scope

- Evidence: `apps/reading-advantage/server/controllers/auth-controller.ts:132`
- Evidence: `apps/reading-advantage/app/[locale]/(teacher)/teacher/student-progress/[studentId]/page.tsx:44`

The new comments state that SYSTEM is global. The first review named ADMIN and SYSTEM. CHECK 3 asks for the ADMIN branch only. The SYSTEM bypass matches the new comment.

### F-B11 (Low) Dead client code still sends the old self-award payload

- Evidence: `apps/reading-advantage/components/first-run-level-test.tsx:237-255`

No file imports `FirstRunLevelTest`. The file still posts `xpEarned` and `isInitialLevelTest: true`. `postActivityLog` now ignores those fields. The file remains a template for F-B1 and F-B2.

## Security Review

### CHECK 1 — `postActivityLog` XP authority — verdict: SAFE for POST

`xpForActivityType` maps a completed activity type to `UserXpEarned`. Incomplete activities award 0. `LEVEL_TEST` is absent from `ACTIVITY_XP`, so POST awards 0 XP for a level-test row.

`postActivityLog` no longer reads `data.xpEarned` or `data.isInitialLevelTest`. The `isInitialLevelTest` replace-XP branch is gone. The new test in `activity-xp-authority.test.ts:94-113` posts `xpEarned: 221000` with `isInitialLevelTest: true` and asserts the XP log stores 5.

The POST path is safe. The PUT sibling is not. See F-B1.

### CHECK 2 — `assertSelfOrAllowedStaff` — verdict: SAFE for former call sites

The helper is `async`. Self access still passes. SYSTEM still passes. ADMIN compares `sessionUser.school_id` to `users.schoolId` and denies a missing school on either side. TEACHER requires a `classroom_teachers` to `classroom_students` join on this teacher and this student. Other roles return false.

All 18 former call sites now `await` the helper:

- `user-controller.ts`: 202, 248, 299, 487, 632, 773
- `flashcard-controller.ts`: 44, 155, 271, 368, 409, 446, 589, 627, 664, 695, 784
- `assignment-controller.ts`: 764

`getStudentAssignments` does not return 403 on a failed check. It sets `targetStudentId` to the session user id. That fallback does not leak another student's assignments.

The helper is not used on `getStudentData`, `getUserActivityData`, `getUserXpLogs`, or `resetUserProgress`. See F-B3.

No test exercises the helper. See F-B5.

### CHECK 3 — student-progress ADMIN school scope — verdict: SAFE on the page

The ADMIN branch loads `users.schoolId` for the student and compares it to `user.school_id`. A missing student, a missing admin school, or a school mismatch redirects to `/teacher/dashboard` before the data fetches.

The teacher branch still uses the classroom join. A teacher from another school has no join row and is redirected.

The page still fetches student data over HTTP after the guard. The `student-data` API has no matching school check. See F-B3.

### CHECK 4 — placement assessment authority — verdict: NOT SAFE

What the repair does correctly:

- Chat validation now uses `z.enum` for CEFR `level` and `sublevel` (`level-test-controller.ts:32-33`).
- Chat stores the validated assessment under `pending-level-test-assessment`.
- Placement requires that stored row. Missing storage returns 400 with no insert.
- Placement uses `pendingAssessment.level` and `pendingAssessment.sublevel`. The request `level` is unused.
- `systemXp <= 0` returns 400 before the `LEVEL_TEST` insert. An unrecognized stored level does not write a blocking 0-XP row.
- `aiXp` still reaches `details` only.

Why the verdict is still NOT SAFE:

1. `postActivityLog` can insert or update the pending row with client `details` (F-B2).
2. Placement does not re-validate the stored assessment with `assessmentSchema`.
3. `putActivityLog` still writes client XP on the old activity-log route (F-B1).
4. `updateUser` still writes client `xp` (F-B4).

The first half of AC-4 holds for the placement body. The second half fails.

## Requirement Coverage

| FR | Status | Evidence |
| --- | --- | --- |
| FR-1 Server-side dashboard and goals | Implemented | Unchanged from the first review. This review did not re-audit FR-1. |
| FR-2 No self-HTTP fetch in read and lesson pages | Implemented | Unchanged from the first review. The student-progress page still self-fetches (F-B7). |
| FR-3 Student-progress role check | Partly implemented | ADMIN now compares `school_id` (CHECK 3). The `student-data` API stays unscoped (F-B3). |
| FR-4 Server-side level-test XP | Partly implemented | Placement ignores request `level` and reads a stored row. The stored row is writable through the activity log (F-B2). PUT activity log still trusts client XP (F-B1). |
| FR-5 Lesson page Promise.all and error state | Implemented | Unchanged from the first review. |
| FR-6 i18n pass | Implemented | Unchanged from the first review. This review did not re-audit locale files. |
| FR-7 Accessibility pass | Partly implemented | Games catalog remains deferred. This review ignored APK dirty files. |
| FR-8 Shell and navigation cleanup | Implemented | Unchanged from the first review. |
| FR-9 `parseActivityType` hotfix | Implemented, with caveats | Parser and unit tests unchanged. F-B8 remains. |

## Acceptance Criteria

| AC | Pass/Fail | Evidence |
| --- | --- | --- |
| AC-1 Dashboard and goals render server data; no metric or goals fetch on load | Pass | Unchanged from the first review. |
| AC-2 No server component self-HTTP fetch in read and lesson pages | Pass | Unchanged from the first review. |
| AC-3 A teacher cannot open another school's student-progress page | Fail | The page redirects a cross-school teacher. `GET /api/v1/users/:id/student-data` still returns the student (F-B3). |
| AC-4 Placement XP is server-computed; the client cannot set its own XP | Fail | Placement ignores request `level`. The client can still plant the stored assessment (F-B2) and set XP through PUT activity log (F-B1) and PATCH user (F-B4). |
| AC-5 No hardcoded English in the listed scopes for `en` and `th` | Pass | Unchanged from the first review. |
| AC-6 Matching cards, table rows, game cards, save and translate are keyboard reachable | Not verified here | The first review deferred game cards to the APK track. This review ignored APK dirty files. |
| AC-7 Teacher pages issue no student-leaderboard fetch | Pass | Unchanged from the first review. |
| AC-8 `test`, `check-types`, and `build` pass for reading-advantage | Not verified here | This review ran the four named test files only. |

## Test Result

Command:

```
cd apps/reading-advantage && CI=true npx jest --testPathPatterns='activity-xp-authority|structural-ux-part-a-placement|parse-activity-type|level-test-contract' --no-coverage
```

Output:

```
Test Suites: 4 passed, 4 total
Tests:       36 passed, 36 total
Snapshots:   0 total
Time:        3.827 s
```

All four named files pass. The tests do not cover F-B1, F-B2, F-B3, F-B4, or CHECK 2.

A run from the monorepo root with the same pattern fails to parse TypeScript. The command must run in `apps/reading-advantage`.

## Verdict

STOP. CHECK 1, CHECK 2, and CHECK 3 pass. CHECK 4 fails. One Critical finding and three High findings remain.

Blocking findings:

1. F-B1 (Critical) — `PUT /api/v1/users/:id/activitylog` still writes client `xpEarned`. Repair: use `xpForActivityType` in `putActivityLog`. Ignore client `xpEarned`.
2. F-B2 (High) — Placement reads a stored assessment that `postActivityLog` can write. Repair: write the pending assessment only from `handleLevelTestChat`, or sign the chat assessment and verify the signature at placement. Re-validate the stored assessment with `assessmentSchema`.
3. F-B3 (High) — `getStudentData` (and sibling user GETs plus `resetUserProgress`) skip `assertSelfOrAllowedStaff`. Repair: await the helper on every `/api/v1/users/:id/*` handler.
4. F-B4 (High) — `updateUser` writes client `xp`. Repair: drop `xp` from the client PATCH contract.

The Medium findings F-B5 through F-B9 need tests or a named owner before Phase 4 closes. The Low findings F-B10 and F-B11 may be recorded and deferred.
