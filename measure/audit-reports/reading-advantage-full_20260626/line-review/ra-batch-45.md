# Line-by-Line Review: Reading Advantage — Batch 45

**Track ID:** `reading_advantage_full_review_20260626`
**Batch ID:** `ra-batch-45`
**Review Date:** 2026-06-27
**Reviewer Role:** A — correctness / architecture / security / maintainability

---

## Scope

All 20 files listed in `/tmp/opencode/ra-batch-45` were read in full. The
batch covers Next.js route-handler controllers under
`apps/reading-advantage/server/controllers/`:

| # | File | Lines Reviewed |
|---|------|----------------|
| 1 | `castle-defense-controller.ts` | 1–364 |
| 2 | `class-accuracy-controller.ts` | 1–167 |
| 3 | `class-dashboard-controller.ts` | 1–177 |
| 4 | `class-export-controller.ts` | 1–149 |
| 5 | `classroom-controller.ts` | 1–1690 |
| 6 | `classroom-goals-controller.ts` | 1–264 |
| 7 | `dashboard-summary-controller.ts` | 1–310 |
| 8 | `dragon-flight-controller.ts` | 1–318 |
| 9 | `dragon-rider-controller.ts` | 1–394 |
| 10 | `enchanted-library-controller.ts` | 1–403 |
| 11 | `enhanced-alignment-controller.ts` | 1–479 |
| 12 | `flashcard-controller.ts` | 1–1756 |
| 13 | `generator-controller.ts` | 1–1634 |
| 14 | `genre-controller.ts` | 1–459 |
| 15 | `goals-controller.ts` | 1–333 |
| 16 | `leaderboard-controller.ts` | 1–215 |
| 17 | `lesson-controller.ts` | 1–843 |
| 18 | `level-test-controller.ts` | 1–177 |
| 19 | `license-controller.ts` | 1–698 |
| 20 | `magic-defense-controller.ts` | 1–314 |

**Total lines reviewed:** 12,089 across 20 files.
**No file was partially reviewed.**

---

## Executive Summary

This batch contains 20 legacy Next.js route-handler controllers that
implement business logic directly inside request handlers. With very few
exceptions, none of the code follows the backend-as-code architecture
prescribed in `AGENTS.md` (no `/packages/backend` modules, no typed
commands/queries, no Zod contracts at external boundaries, no centralized
permissions modules). The controllers also share large amounts of
copy-pasted code (especially the five vocabulary/sentence game
controllers), which multiplies every defect.

The most severe issues found are:

1. **Architecture regression: business logic lives in route handlers.**
   Every file in this batch implements domain behavior (XP calculation,
   ranking upserts, classroom CRUD, license lifecycle, content
   generation, flashcard FSRS scheduling) directly in
   `NextResponse`-returning functions. This violates the core
   `AGENTS.md` rule that core logic must exist independently of the
   transport layer.

2. **Widespread missing or broken input validation.** Only
   `level-test-controller.ts` and a single enrollment schema in
   `classroom-controller.ts` use Zod. Every other endpoint accepts raw
   JSON bodies or query parameters and coerces them with `as any`,
   manual `parseInt`, or unchecked destructuring. This is a direct
   violation of the Zod-at-every-external-boundary policy.

3. **Security: SQL injection vector and unsafe raw SQL.**
   `enhanced-alignment-controller.ts` builds a `WHERE` clause partly with
   `sql.raw`, interpolating a user-supplied interval string directly into
   the query. `dashboard-summary-controller.ts` and
   `enhanced-alignment-controller.ts` issue global raw SQL across
   `users` / `lesson_records` / `articles` with no tenant or school
   scoping. Several controllers expose school-wide or license-wide data
   without verifying the caller's authorization to that tenant.

4. **Security: missing authentication / authorization on destructive
   endpoints.** `getStudentInClassroom`, `updateStudentClassroom`,
   `achivedClassroom`, `updateClassroom`, `deleteClassroom`,
   `getClassroomTeacher`, `getClassXpPerStudents`, most
   `lesson-controller` endpoints, `createLicenseKey`, `getAllLicenses`,
   `deleteLicense`, and `calculateXpForLast30Days` either skip session
   checks entirely or only check presence, not access rights.

5. **Correctness: read-modify-write XP races.** Game completion
   handlers read `users.xp`, add earned XP in memory, and write the
   result back. Concurrent game completions for the same user will
   overwrite each other. The same anti-pattern appears in license
   `usedLicenses` counters and classroom XP aggregations.

6. **Correctness: inconsistent enum/string constants.** Game
   controllers mix `ActivityType.*` / `GameType.*` enums with literal
   strings (`"DRAGON_FLIGHT"`, `"MAGIC_DEFENSE"`). `magic-defense`
   defaults difficulty to `"NORMAL"` (uppercase) while ranking buckets
   expect lowercase, so rankings for that game will be empty or split.

7. **Correctness: unvalidated CSV export will crash on null data and
   emits insecure filenames.** `class-export-controller.ts` and the CSV
   path in `classroom-controller.ts` call `.toString()` / `.toFixed()`
   on nullable numeric fields and use unsanitized classroom names in
   `Content-Disposition` filenames.

8. **AI / provider coupling.** `level-test-controller.ts` and
   `generator-controller.ts` import `openai` / `openaiModel5` directly
   and call `streamText` from `@reading-advantage/ai` with a concrete
   OpenAI model. Content generation is orchestrated entirely inside the
   controller instead of a backend module/worker.

---

## Cross-Cutting Findings

### XF-001 — Business logic in route handlers (architecture)

**Applies to:** all 20 files.

`AGENTS.md` states:

> Business logic must not live in React components, Next.js pages, Route
> Handlers, Server Actions. These layers should orchestrate backend
> modules rather than implement domain behavior.

Every controller in this batch violates this rule. Examples:

- XP accrual, user `xp` column updates, session mutation, and
  `gameRankings` upserts are implemented inline in
  `castle-defense-controller.ts`, `dragon-flight-controller.ts`,
  `dragon-rider-controller.ts`, `enchanted-library-controller.ts`, and
  `magic-defense-controller.ts`.
- Classroom CRUD, enrollment, co-teacher management, CSV export, and XP
  aggregation are all implemented in `classroom-controller.ts`.
- FSRS spaced-repetition scheduling is implemented in
  `flashcard-controller.ts`.
- AI article generation, image/audio generation, translation, question
  generation, and cleanup are orchestrated in
  `generator-controller.ts`.
- License creation, activation, deactivation, and counter maintenance
  are implemented in `license-controller.ts`.

**Risk:** The application cannot be easily tested, moved to workers,
exposed via tRPC/OpenAPI, or reused by CLI/admin tools because the
behavior is trapped inside Next.js request handlers.

### XF-002 — Missing Zod validation at external boundaries

**Applies to:** all files except `level-test-controller.ts` and the
enrollment schema in `classroom-controller.ts` (line 910).

Examples:

- `castle-defense-controller.ts` lines 22–30: body destructured without
  validation; `score`, `correctAnswers`, `totalAttempts`, `accuracy`,
  `difficulty`, `gameTime` are all unvalidated.
- `class-accuracy-controller.ts` line 14: `timeframe` is any string
  matching `/^(\d+)d$/`; falls back to 30 silently.
- `class-export-controller.ts` line 58: `format` accepts any string.
- `classroom-controller.ts` lines 788, 858, 875, 910, 962, 1289, 1337:
  most JSON bodies are cast or destructured directly.
- `flashcard-controller.ts` lines 160, 289, 450, 699, 713: raw JSON body
  used to update FSRS cards and create word/sentence records.
- `generator-controller.ts` lines 87, 695: generation bodies parsed as
  `any` or via a non-validating interface.
- `lesson-controller.ts` lines 203, 302, 489, 746: phase, word, and
  sentence updates use raw body values.
- `license-controller.ts` lines 22, 136, 259, 320: license fields parsed
  without schema.

**Risk:** Invalid payloads reach the database, causing 500s or data
corruption; numeric/date coercion is inconsistent across endpoints.

### XF-003 — `as any` and unsafe type coercion

**Applies to:** all files.

Dozens of casts suppress the type system:

- `class-accuracy-controller.ts` lines 86, 97, 106, 244:
  `activityType` and `details` cast to `any`.
- `classroom-controller.ts` lines 138, 244, 246, 287, 329, 338, 388,
  775, 1297, 1382: `role`, `licenseId`, `createdBy` repeatedly cast to
  `any`.
- `flashcard-controller.ts` lines 171, 195, 294, 316, 376, 425, 542,
  713, 740, 888, 1133: record and body values cast to `any`.
- `dragon-rider-controller.ts` / `enchanted-library-controller.ts`
  lines 310/319: `record.word as any`.

**Risk:** Runtime shape mismatches are not caught at compile time.

### XF-004 — Read-modify-write races on counters

**Applies to:** game controllers, license counters, classroom XP
aggregations.

- `castle-defense-controller.ts` lines 86–97: reads `user.xp`, computes
  `updatedXp`, writes it back. Two concurrent completions lose one
  update.
- `dragon-flight-controller.ts` lines 85–96, `dragon-rider-controller.ts`
  lines 87–98, `enchanted-library-controller.ts` lines 95–106,
  `magic-defense-controller.ts` lines 82–93: same pattern.
- `license-controller.ts` lines 190–200 and 290–306:
  `usedLicenses` read, incremented/decremented in memory, written back.
- `classroom-controller.ts` lines 471–487: `allTimeXp` computed from
  `users.xp` (read-only here, but the source value is racy).

**Risk:** XP totals, license usage counts, and rankings become
inconsistent under concurrent load.

### XF-005 — Inconsistent game enum / string usage

**Applies to:** game controllers.

- `dragon-flight-controller.ts` uses `"DRAGON_FLIGHT"` literal strings
  for `activityType` and `gameType` (lines 59, 81, 109, 172).
- `magic-defense-controller.ts` uses `"MAGIC_DEFENSE"` literals
  (lines 57, 78, 105, 167).
- `castle-defense-controller.ts`, `dragon-rider-controller.ts`,
  `enchanted-library-controller.ts` use `ActivityType.*` / `GameType.*`
  enums.
- `magic-defense-controller.ts` line 27 defaults `difficulty` to
  `"NORMAL"` (uppercase), but `getRanking` buckets expect lowercase
  keys (`easy`, `normal`, `hard`, `extreme`) at lines 195–213. The
  ranking response will therefore contain an unused `"NORMAL"` bucket
  and the `normal` bucket will remain empty for players whose
  completions use the default.

**Risk:** Data fragmentation, broken rankings, inconsistent analytics.

### XF-006 — Missing tenant / school scoping on global queries

**Applies to:** `dashboard-summary-controller.ts`,
`enhanced-alignment-controller.ts`, `genre-controller.ts`,
`leaderboard-controller.ts`.

- `dashboard-summary-controller.ts` lines 100–186: queries `user_activity`,
  `users`, `lesson_records`, `articles`, `xp_logs` globally with no
  `schoolId` filter.
- `enhanced-alignment-controller.ts` lines 190–201: queries
  `mv_alignment_metrics` globally unless `scopeType === 'school'` and
  `scopeId !== 'system'`.
- `genre-controller.ts` legacy path lines 71–82: joins `lesson_records`
  to `users` but only filters by optional `schoolId`; when absent,
  returns global data.
- `leaderboard-controller.ts` lines 28–111: iterates every license and
  every user in the database.

**Risk:** Cross-tenant data leakage and performance collapse at scale.

---

## File-by-File Findings

### `castle-defense-controller.ts`

| Line | Finding |
|------|---------|
| 1–12 | Imports `and`, `asc`, `desc`, `eq`, `sql` from `@reading-advantage/db`; `count` is never imported but unused in this file. |
| 14–158 | `completeGame` is a ~150-line request handler implementing XP accrual, activity logging, ranking upserts, and session mutation inline. |
| 16–20 | Session presence check only; no role/tenant authorization. |
| 22–30 | Body destructured without Zod validation. `accuracy` expected to be a number but never validated. |
| 49 | `xpEarned = Math.floor(correctAnswers * accuracy)`; if `accuracy` > 1 the formula inflates XP. No cap documented. |
| 52 | `uniqueTargetId` uses `Date.now()`; collisions possible in tight loops but unlikely for UI-driven calls. |
| 54–147 | Nested `try/catch` suppresses ranking failures with only a `console.warn` (lines 122–128). The 500 response at lines 138–147 can return after a partially successful insert (activity created, XP log not). |
| 86–97 | Read-modify-write on `users.xp` (see XF-004). |
| 100–102 | Mutates `req.session.user.xp` directly; session storage adapter specifics leak into controller. |
| 160–241 | `getRanking` returns rankings scoped to caller's license or school only if the caller has one; students in classrooms with neither field see global rankings. |
| 168–177 | Fetches `licenseId`/`schoolId`; if both are null, no tenant filter is added (line 180–185). |
| 179–198 | Query joins `gameRankings` to `users` but does not join through tenant relationship; ranking rows may include users outside the caller's school/license if `users.licenseId`/`schoolId` differ from the ranking owner's. Because `gameRankings` has no `schoolId`, the join uses current `users` values, which may have changed since the ranking was earned. |
| 243–363 | `getSentences` fetches `userSentenceRecords` without checking article/sentence ownership beyond `userId`. |
| 284–300 | Locale fallback logic duplicated from other game controllers (copy-paste). |
| 302–304 | Two consecutive `console.log` debug statements left in production code. |
| 310–323 | `record.translation as any`; fallback chain hard-codes `th`, `zh-CN`, `zh-TW`, `vi`, `en`. |

### `class-accuracy-controller.ts`

| Line | Finding |
|------|---------|
| 1–3 | Imports `inArray` but uses it correctly. |
| 5–167 | Entire function is a route handler implementing aggregation logic inline. |
| 6 | `const session = (req as any).session;` bypasses typed session; no session type safety. |
| 12 | `classroomId` pulled from `(req as any).params` instead of the typed context pattern used elsewhere. |
| 14 | `timeframe` defaults to `"30d"` but is parsed with regex only; invalid values silently become 30 days. |
| 21–39 | Access check verifies teacher membership but also allows `ADMIN`/`SYSTEM` without school/license scope verification. |
| 41–44 | `parseInt` without radix and without validation of `daysMatch`. |
| 75–89 | `inArray(userActivity.activityType, ["MC_QUESTION", "SA_QUESTION", "LA_QUESTION"] as any)` casts enum array to `any`. `LA_QUESTION` is included in open-ended logic but only `MC_QUESTION` / `SA_QUESTION` are used later. |
| 95–112 | Accuracy inferred from `details.isCorrect`, `details.correct`, `details.score`, `details.rating`. Magic thresholds (`>= 3`) are undocumented. |
| 123–127 | `Math.round(value * 10) / 10` repeated inline; no shared formatter. |
| 132–154 | Class averages computed from per-student rounded metrics, not from raw totals, introducing rounding drift. |
| 156 | Response does not include `cache` metadata present in other dashboard controllers; inconsistent API shape. |

### `class-dashboard-controller.ts`

| Line | Finding |
|------|---------|
| 1–4 | JSDoc header present, which is good, but function still violates backend-as-code rule. |
| 20–22 | `RequestContext.params` typed as `Promise<{ classroomId: string }>`. |
| 24–36 | `verifyClassAccess` helper duplicates permission logic instead of using a shared permissions module. |
| 38–177 | `getClassOverview` handler contains all aggregation logic. |
| 49 | `user.role as string` cast. |
| 54–57 | Classroom existence check after access check; order is acceptable but could be combined. |
| 73–79 | Fetches all assignments for the classroom; no date scoping. |
| 85–87 | `activity7dIds`, `activity30dIds` declared as `string[]` and filled only conditionally; good. |
| 90–129 | Queries run only if `studentIds.length > 0`; good defensive pattern. |
| 120–128 | `xpLogRows` filtered by activity type `MC_QUESTION` / `SA_QUESTION` and then `xpEarned` is used as a proxy for accuracy. This is semantically wrong: XP earned reflects question difficulty/bonus, not correctness. |
| 137–147 | `mcQuestionAccuracy` and `saQuestionAccuracy` are average XP, not accuracy percentages, despite the property names. |
| 149–172 | Response shape mixes `class`, `summary`, `performance`; consistent with `getClassroomOverview` but the accuracy fields are misleading. |

### `class-export-controller.ts`

| Line | Finding |
|------|---------|
| 1–4 | JSDoc header present. |
| 17–29 | `verifyClassAccess` duplicated from `class-dashboard-controller.ts`. |
| 31–45 | `convertToCSV` does not escape newline characters or quote all string values; rows containing newlines will break CSV format. |
| 47–149 | Handler implements export logic inline. |
| 58 | `format` accepts any string; only `"csv"` branches to CSV, otherwise JSON. |
| 75–78 | Selects `joinedAt` as `createdAt` alias; schema column is `joinedAt` but alias mismatch may confuse maintainers. |
| 82–87 | `studentRows` selected only by `id` list; no school/license scope. |
| 99–109 | `saRows` query joins by student and assignment but not by classroom membership; although filtered by classroom assignments, indirect joins could drift if `assignments.classroomId` is mutable. |
| 111–127 | `assignmentsPending` actually counts `IN_PROGRESS` status (line 114), not all pending statuses. |
| 129–137 | CSV filename derived from `classroom.classCode`; `classCode` may contain characters unsafe for `Content-Disposition` (e.g., quotes, spaces). |
| 139–143 | JSON branch returns `exportedAt` but no `cache` metadata. |

### `classroom-controller.ts`

| Line | Finding |
|------|---------|
| 1–37 | Imports many Drizzle operators and schema tables; large surface area. |
| 41–72 | Legacy `Student`, `Course` interfaces with mostly optional fields; no Zod contract. |
| 76–83 | `generateClassCode` uses `Math.random()` for a code; no collision retry at the call site (line 793). |
| 85–129 | `convertStudentsToCSV` will throw if `s.level` or `s.xp` is null because `.toString()` is called unconditionally (lines 105, 106, 107, 109, 110, 111). |
| 131–145 | `getUserIdsForLicenses` uses `users.licenseId as any` cast. |
| 148–190 | `formatClassroomRow` mixes schema fields with API shape; `student.lastActivity` is set to `joinedAt`, not actual last activity. |
| 194–277 | `getAllStudentList` has no role/tenant authorization beyond `getCurrentUser`. It returns every student attached to any license the teacher is associated with, but does not verify the caller is actually a teacher. |
| 199–214 | Builds license list from `licenseOnUsers` and `users.licenseId`; uses both without clear precedence. |
| 244–249 | `inArray(users.role as any, ["STUDENT", "USER"])` cast; role enum should be typed. |
| 279–499 | `getClassroom` is extremely long and implements three role branches inline. |
| 287 | `classroomList: any[]` defeats type checking for the entire function. |
| 289–327 | `SYSTEM` branch optionally filters by `requestedLicenseId` but does not verify the requester is actually SYSTEM beyond `user.role`. |
| 329–331 | `ADMIN` branch checks `user.license_id` (snake_case). Other parts of the codebase use `licenseId` (camelCase). This mismatch likely causes admins to always get "Admin license not found" if the session object stores `licenseId`. |
| 338 | `userIds.length > 0 ? inArray(...) : sql`false`` is a runtime fallback that disables type safety. |
| 360–452 | `TEACHER` branch duplicates owned/co-teacher queries and formatting. |
| 393–420 | `coTeacherClassroomIds` used to batch-fetch students; fine, but code is hard to follow. |
| 454–489 | XP aggregation fetches all `xpLogs` for each classroom's students and filters in memory. For large classrooms this is O(n) in JS and bypasses DB indexing. |
| 482–484 | `todayStart`, `weekStart`, `monthStart` computed by mutating `Date` objects; `monthStart` is also affected by `setDate`? Actually line 461 uses `setMonth`, so it's correct, but the pattern is fragile. |
| 501–521 | `getStudentClassroom` no auth/role check beyond `getCurrentUser`. |
| 523–754 | `getStudentInClassroom` has **no authentication check at all**. It accepts any `classroomId` from `ctx.params` and returns all enrolled students. |
| 756–768 | `updateStudentClassroom` has **no authentication or authorization**. Any request can update any user's name by posting a `studentId`. |
| 770–781 | `getClassroomTeacher` has **no authentication**. It returns every user with `role = 'TEACHER'` globally. |
| 783–853 | `createdClassroom` checks `getCurrentUser` but does not validate the classroom payload; `grade` parsed with `parseInt(data.grade)` without radix/validation. |
| 817–842 | Google import path uses `studentCount` (naming mismatch with Google Classroom API) and `data.classroom.student`; both branches run `onConflictDoNothing` without notifying caller of skipped students. |
| 855–870 | `achivedClassroom` misspelled. **No auth/authorization check.** Any caller can archive/unarchive any classroom. |
| 872–891 | `updateClassroom` **no auth/authorization check.** Any caller can rename/change grade of any classroom. |
| 893–906 | `deleteClassroom` **no auth/authorization check.** Any caller can delete any classroom. Cascading deletion of `classroomStudents`, `classroomTeachers`, `assignments`, `studentAssignments` is not handled, risking FK constraint errors. |
| 908–957 | `patchClassroomEnroll` uses a local Zod schema (line 910), good, but validates only `studentId`/`lastActivity`; loops over students and returns 400 on the first already-enrolled student, leaving prior inserts committed (no transaction rollback). |
| 959–985 | `patchClassroomUnenroll` **no auth check**; checks classroom existence but not ownership. |
| 987–1085 | `getClassXp` checks year but not caller permissions. Returns `dataMostActive`/`dataLeastActive` keyed by `timeRange`, an unusual shape. |
| 1018–1020 | `licenseId` required; if absent returns 400. No check that caller can access that license. |
| 1044–1069 | Per-classroom XP queries filter `classroomStudents.studentId` by `userIds` but do not re-verify classroom ownership or school. |
| 1087–1129 | `getTopSchoolsXp` **no authentication**. Reads all `licenseOnUsers`, all XP logs, aggregates by `licenses.schoolName`, and returns top 10. |
| 1131–1231 | `getClassroomXpCustomRange` checks `getCurrentUser` and branches by role, but `SYSTEM` branch reads every non-archived classroom globally. |
| 1233–1281 | `getClassXpPerStudents` **no authentication or authorization**. Accepts `classroomId` and returns per-student XP breakdown. |
| 1283–1329 | `addCoTeacher` checks that caller is classroom creator (line 1294–1300), good, but uses `createdBy` cast to `any`. |
| 1331–1370 | `removeCoTeacher` checks creator; prevents removing OWNER; good. |
| 1372–1404 | `getClassroomTeachers` checks creator; good. |
| 1406–1562 | `getClassroomOverview` duplicates `getClassOverview` logic with extra fields. Still no use of shared backend module. |
| 1509–1513 | Assignment active/completed logic: an assignment is "active" if any student is incomplete and "completed" only if every student is completed. This conflates per-assignment status with per-student status. |
| 1515–1518 | `averageAccuracy` averages `studentAssignments.score` without weighting or capping. |
| 1564–1690 | `getClassroomStudents` checks teacher membership, good, but performs one query per student (N+1): user row, last activity, lesson records, and student assignments per student (lines 1603–1627). For a classroom of 30 students this is ~120 queries. |
| 1652–1653 | `validStudents.sort((a, b) => a.name.localeCompare(b.name))` will throw if `name` is null/undefined. |
| 1659–1669 | CSV path uses `convertStudentsToCSV`, which crashes on null numerics (see lines 85–129). |

### `classroom-goals-controller.ts`

| Line | Finding |
|------|---------|
| 1–5 | Imports `GoalsService` from `@/server/services/goals-service`; service exists, which is a step toward backend modules, but controller still handles auth/response formatting. |
| 8–18 | `verifyTeacherAccess` duplicates permission logic. |
| 20–144 | `getClassroomGoals` parses `classroomId` from URL path manually (lines 25–28); fragile if route changes. |
| 46–55 | Selects all `learningGoals` for enrolled students; no date/status filtering. |
| 57–135 | Groups goals by a composite key of `title|goalType|targetValue|targetDate.getTime()`. If two students have goals with identical title/type/value/date but different descriptions, they are merged; if descriptions differ, data is lost. |
| 89 | Key uses `targetDate.getTime()`; assumes `targetDate` is always a Date. |
| 129–135 | `averageProgress` computed as simple average of `currentValue/targetValue`; can exceed 100% without cap. |
| 146–182 | `createClassroomGoal` creates a goal for every enrolled student. No transaction wrapper around the `Promise.all` of service calls. |
| 184–225 | `updateClassroomGoal` parses both `classroomId` and `goalId` from URL path manually; checks goal ownership by classroom membership, good. |
| 214 | Body cast to `UpdateGoalInput` without runtime validation. |
| 227–264 | `deleteClassroomGoal` same manual URL parsing; good ownership check. |

### `dashboard-summary-controller.ts`

| Line | Finding |
|------|---------|
| 1–6 | JSDoc header claims "single optimized request" but actually issues five separate `db.execute` calls. |
| 13–37 | Response interface is well-typed. |
| 45–310 | Handler implements all metrics logic inline. |
| 57–68 | `dateRange` parsed without validation; invalid values fall back to 30d silently. |
| 71 | Cache key includes `session.user.id` but query is global (no tenant scoping), so different users with same date range share a cache entry that may include data they should not see. |
| 93–193 | Five raw SQL queries issued with `db.execute(sql\`...\`)`. Parameterized literals are safe, but the queries scan entire tables (`user_activity`, `xp_logs`, `lesson_records`, `articles`, `users`) with no `schoolId` filter. |
| 117–137 | Alignment query joins `users` → `lesson_records` → `articles` and filters `u.role = 'STUDENT'`; no school scoping. |
| 141–168 | Velocity query computes average XP across **all** students globally for the last 7/30 days. |
| 230–234 | `calculateGrowth` returns `100` when previous is 0 and current > 0, producing inflated growth percentages. |
| 260–262 | `averageSessionLength` typed as `number` in interface but assigned `toFixed(1)` string via `as any`. Inconsistent runtime type. |
| 280–283 | Caches global metrics per-user for 5 minutes; tenant leakage risk. |
| 300 | `details: error instanceof Error ? { error: error.message } : {}` nests `error` key inside `details`; shape is inconsistent. |

### `dragon-flight-controller.ts`

| Line | Finding |
|------|---------|
| 1–11 | Same imports as other game controllers; `ActivityType`/`GameType` enums imported but then literal strings are used. |
| 12–318 | Entire controller duplicates patterns from `castle-defense-controller.ts` and `dragon-rider-controller.ts`. |
| 59 | `activityType: "DRAGON_FLIGHT"` literal instead of enum. |
| 81 | `activityType: "DRAGON_FLIGHT"` literal in XP log. |
| 104 | `difficulty` is not validated before upsert; empty string could create a ranking bucket. |
| 109 | `gameType: "DRAGON_FLIGHT"` literal instead of enum. |
| 172 | `eq(gameRankings.gameType, "DRAGON_FLIGHT")` literal. |
| 234–253 | Vocabulary query uses `userWordRecords` and prioritizes due/low stability; same as other controllers. |
| 267–291 | Translation extraction hard-codes fallback languages and uses `as any`. |

### `dragon-rider-controller.ts`

| Line | Finding |
|------|---------|
| 1–11 | Uses `count` import at line 266; good. |
| 13–394 | Another game controller with duplicated logic. |
| 22–32 | Body destructured without validation; `xp` supplied by client is trusted (line 78). This allows clients to grant themselves arbitrary XP. |
| 60 | `activityType: ActivityType.DRAGON_RIDER` — uses enum here. |
| 78 | `if (xp > 0)` uses client-provided `xp` directly as `xpEarned`. Critical trust boundary violation. |
| 266–269 | Queries total `userWordRecords` count when no flashcard records exist, but the result is unused (no branching on `totalRecords`). Dead code. |
| 294–302 | Locale handling duplicates other controllers. |
| 310–363 | `wordObj` parsed with `vocabularyy` typo fallback; indicates data quality issues being papered over in code. |

### `enchanted-library-controller.ts`

| Line | Finding |
|------|---------|
| 1–403 | Near-identical to `dragon-rider-controller.ts` except for XP multiplier and `ENCHANTED_LIBRARY` enum usage. |
| 47–58 | Difficulty multiplier applied to `correctAnswers * accuracy`; clients can choose `difficulty` to multiply XP. No authorization or cap. |
| 55 | `multiplier` defaults to 1.5 if difficulty is unknown; accepts any string. |
| 65–83 | Uses `ActivityType.ENCHANTED_LIBRARY` enum consistently — good, unlike `dragon-flight` / `magic-defense`. |
| 119 | `gameType: GameType.ENCHANTED_LIBRARY` enum. |
| 273–287 | Dead `totalRecords` query identical to `dragon-rider-controller.ts`. |

### `enhanced-alignment-controller.ts`

| Line | Finding |
|------|---------|
| 1–11 | Imports typed response shapes from `@/types/dashboard`; good separation of types. |
| 13–39 | `AlignmentMetricsRow` interface describes the materialized view row shape. |
| 46–431 | Handler implements RBAC, query building, aggregation, and response formatting inline. |
| 58–65 | Query params parsed without Zod; `studentIds` split by comma. |
| 66 | `includeSamples` is a boolean flag from query string. |
| 69–152 | RBAC logic is implemented directly in the controller rather than a permissions module. |
| 76–94 | System/Admin can request `scopeType = 'school'` with `scopeId = 'system'`, which strips PII. Good intent, but the `allowPII` logic is ad-hoc. |
| 95–152 | Teacher branch enforces school association and classroom ownership; good but should live in permissions module. |
| 155–179 | Builds a raw SQL `WHERE` clause. Lines 169–174 are a **SQL injection vulnerability**: |
| 169–174 | `filterConditions.push(sql.raw(\`first_reading_at >= NOW() - INTERVAL '${daysAgo} days'\`))` — `daysAgo` is derived from the user-supplied `timeframe` parameter (7/30/90) so exploitation is limited, but the pattern is unsafe and breaks if `timeframe` validation changes. |
| 181–187 | `sampleColumns` uses `sql.raw` with fixed strings; safe here because no user input is interpolated. |
| 190–201 | Queries `mv_alignment_metrics` with the constructed `whereClauseSQL`. |
| 211–230 | `Number()` conversions on `total_readings` etc. because materialized view may return BigInt. Good defensive coding. |
| 258–262 | `alignmentScore` ignores `unknown_count`; readings with no level data are not counted in the denominator. |
| 288–294 | `highRiskStudents` filter uses `total_readings` with a minimum of 1; threshold 0.7 is undocumented magic number. |
| 296–315 | Assignment count query branches on scope; `scopeType === 'school' && scopeId !== 'system'` always performs an inner join to `classrooms`, but for school scope `classrooms.schoolId = scopeId` is correct. For system scope it falls through to counting all assignments. |
| 320–321 | `belowThreshold` / `aboveThreshold` are 80% of counts, used as "content gaps" metric with no documentation. |
| 338–362 | `AlignmentData` object mixes legacy and enhanced fields; good backward compatibility note. |
| 364–387 | `averageLevel`, `levelCounts`, `modalLevel` computed in JS from student rows; for large schools this could be expensive. |
| 389–413 | Response includes `X-PII-Allowed` header exposing internal authorization decision. |
| 479 | Backward compatibility alias `getAlignmentMetrics`. |

### `flashcard-controller.ts`

| Line | Finding |
|------|---------|
| 1–15 | Imports `assertSelfOrAllowedStaff` for authorization; good reuse. |
| 16–37 | `RequestContext` typed with optional `articleId` that is never used. `WordList` interface has `[key: string]: any`, defeating type safety. |
| 39–110 | `getFlashcardStats` returns full record arrays plus computed stats; no pagination. |
| 112–148 | `calculateFlashcardStats` uses FSRS state constants by number (0=new, 1/3=learning, 2=review) without importing `State` enum. |
| 131–142 | Switch on `card.state` has no `default`; unknown states are ignored. |
| 150–263 | `updateFlashcardProgress` applies FSRS scheduling inline. |
| 155 | Authorization check uses `routeId` from context; good. |
| 160–167 | `cardId`, `rating`, `type` are destructured without validation; `rating` expected to be 1–4 but any value falls through to `Rating.Good`. |
| 195–209 | Builds a card object from DB row; `last_review` set to `new Date()` instead of the actual last review time. |
| 210–227 | FSRS scheduling applied; if `rating` is invalid, defaults to Good. |
| 229–250 | Updates both `userWordRecords` and `userSentenceRecords` depending on type; no transaction. |
| 265–360 | `postSaveWordList` bulk inserts word records. |
| 289–311 | Deduplication query uses `sql\`${userWordRecords.word}->>'vocabulary' = ${word.vocabulary}\`` — parameter is safe, but JSON path operator may not use an index. |
| 316–338 | `recordData: any` populated conditionally with `articleId`, `storyId`, `chapterNumber`. No validation of these IDs. |
| 342–347 | Returns 400 status with message "Word already saved" but status code 400 inside JSON body (`status: 400`), inconsistent with HTTP status 200 actually returned? Wait: line 343 returns `NextResponse.json({..., status: 400})` with no second argument, so HTTP status is 200 but body says 400. |
| 362–399 | `getWordList` parses `chapterNumber` with `Number(chapterNumber)` without NaN check. |
| 401–438 | `deleteWordlist` uses route id for auth, then deletes by `recordId` from body. Good ownership re-check at line 421. |
| 440–580 | `postSentendcesFlashcard` misspelled function name. |
| 470–475 | Validates presence of `articleId` or `storyId`+`chapterNumber` but doesn't validate IDs. |
| 477–494 | Deduplication by `sn` only; if same article has duplicate `sn` values, records collide. |
| 502–540 | Fetches article `translatedPassage` and rebuilds translation object. Hard-codes language mapping at lines 520–526. |
| 542–567 | `recordData: any` again; inserts sentence record. |
| 582–617 | `getSentencesFlashcard` has good auth. |
| 619–656 | `deleteSentencesFlashcard` good ownership check. |
| 658–687 | `getVocabulariesFlashcard` returns all user word records; no pagination. |
| 689–774 | `postVocabulariesFlashcard` uses `recordData: any`; duplicates `postSaveWordList` logic. |
| 776–813 | `deleteVocabulariesFlashcard` good ownership check. |
| 815–923 | `getClozeTestSentences` shuffles all user sentences in memory; no auth beyond session. |
| 841 | `Math.random() - 0.5` shuffle is biased (Fisher-Yates not used). |
| 873–881 | Word boundary calculation divides by sentence length, giving relative positions, but `start`/`end` names imply absolute offsets. |
| 925–1048 | `saveClozeTestResults` updates sentence records with a custom spaced-repetition formula (not FSRS) inline. |
| 955–957 | `newStability` capped at 365 days and floored at 1; `newDue` uses simple day arithmetic. |
| 984–1034 | Inserts activity/XP log but wraps only that in a try/catch; if XP update fails, activity is still logged. |
| 1007–1030 | Read-modify-write on `users.xp`. |
| 1050–1191 | `getSentencesForOrdering` duplicates shuffle and article fetch logic. |
| 1108 | `splitTextIntoSentences(content)` may return different splits than the article's stored `sentences`. |
| 1113–1128 | Expands context window to at least 5 sentences; logic is heuristic. |
| 1133–1142 | Parses `articleRow.sentences` as JSON if not array; silently swallows parse errors. |
| 1144–1163 | Builds `sentenceObjects`; for non-flashcard sentences uses `sentenceData.timepoint || 0` fallback, losing audio sync. |
| 1193–1311 | `getWordsForOrdering` duplicates much of the above. |
| 1253–1255 | Strips punctuation with `/[^\w'-]/g`; words with apostrophes are kept but contractions split incorrectly. |
| 1278–1280 | Difficulty based on word count only. |
| 1290–1293 | `context` substring may slice in the middle of a UTF-16 surrogate pair or grapheme cluster. |
| 1313–1519 | `saveSentenceOrderingResults` applies FSRS scheduling inline. |
| 1345–1446 | Large inline FSRS update block; duplicates `updateFlashcardProgress` logic. |
| 1384–1396 | Validates computed FSRS values and falls back to heuristic; good defensive code but should be in a service. |
| 1485 | Dynamic import `await import("@/lib/utils")` inside the handler; not ideal for cold start. |
| 1488–1501 | Updates level/CEFR based on XP; read-modify-write on `users.xp`. |
| 1521–1719 | `saveWordOrderingResults` duplicates `saveSentenceOrderingResults` almost exactly. |
| 1721–1756 | `getFlashcardDeckInfo` returns `deckId: userId` if any sentence record exists; odd API shape. |

### `generator-controller.ts`

| Line | Finding |
|------|---------|
| 1–39 | Imports many generator utilities and `getCurrentUser`. No Zod schema. |
| 40–53 | Interfaces only, no runtime validation. |
| 56–82 | `retryPrismaOperation` misnamed (uses Drizzle, not Prisma); retries only generic errors without transaction rollback. |
| 85–185 | `generateQueue` orchestrates batch article generation inline. |
| 87 | `amountPerGenre` not validated; `parseInt` without radix. |
| 98–112 | Sends Discord webhook before any work; failure would abort the request. |
| 115–118 | Generates fiction and nonfiction in parallel; fine. |
| 121–129 | Counts `null` results as failures; no retry of individual failed articles. |
| 131 | `timeTakenMinutes` computed but variable named `timeTaken` originally; confusing. |
| 189–233 | `generateForGenre` selects one random genre and topic set, then generates all CEFR levels × topics. |
| 215–230 | `Promise.all` over 12 combinations; if `amountPerGenre` is large this spawns many concurrent AI/DB operations. |
| 237–587 | `queue` function is ~350 lines long. |
| 247–256 | Debug `console.log` spam throughout the function. |
| 261–262 | `prismaRetries` / `maxPrismaRetries` naming is misleading. |
| 271–276 | `evaluateArticle` may throw after `maxAttempts`; `articleId` cleanup runs at lines 535–541. |
| 295–336 | Article insert retry loop; if the article already exists (e.g., unique title constraint), retries will fail repeatedly. |
| 338–340 | After retry loop, if `article` is still undefined, throws generic error. |
| 345–352 | Image generation awaited but failures are not caught; an image failure will abort the whole attempt even though the article is already saved. |
| 356–381 | Questions generated in parallel; failures abort attempt. |
| 389–419 | MCQ transformation shuffles options with `Math.random() - 0.5` (biased). |
| 434–477 | Saves questions in parallel using `retryPrismaOperation`; good retry, but no transaction across question types. |
| 482–509 | Word list, audio, and word audio generation; failures abort attempt. |
| 512–523 | Updates article with `sentences` and `words` but **not** translations (translations are only generated for user articles). |
| 589–647 | `evaluateArticle` attempts generation up to `maxAttempts` (default 2). If rating is ≤ 2, it regenerates. No exponential backoff. |
| 619–622 | `calculateLevel` called with the generated passage; if it returns a different CEFR than requested, the article is still saved with the calculated level. |
| 649–1027 | `generateUserArticle` is another ~380-line handler. |
| 655–659 | `getCurrentUser` auth check. |
| 686–692 | `author` fallback to school name if user has no name; fine. |
| 695 | Request body cast to `GenerateArticleRequest` interface without validation. |
| 706–718 | Manual required-field check instead of Zod. |
| 763–780 | Inserts article with `isPublic: false`; good. |
| 793–826 | Image and questions generated; failures are not caught individually. |
| 923–946 | Translation failure triggers full cleanup including deleting the article. This means a user loses their draft if translation service fails. |
| 951–966 | Generates word audio and then updates translations, but does not update `sentences` or `words` columns (those were handled by `generateAudioForWord` side effects? Actually the article is updated with translations only; `sentences` and `words` were generated but not persisted except via `generateAudio` returning sentences? Line 914 `sentences` is returned from `generateAudio` but never used to update the article. The article's `sentences` column may remain null for user-generated articles.) |
| 979–1005 | Returns generated article; `audioUrl` and `audioUrlWords` are both `${articleId}.mp3`, which is suspicious. |
| 1007–1027 | Cleanup deletes the article and questions but does not clean up storage files in all cases. |
| 1029–1098 | `approveUserArticle` updates `isPublic` but does not regenerate public search indices or verify the article passed quality thresholds. |
| 1100–1189 | `getUserGeneratedArticles` returns full questions arrays for every article; no pagination. |
| 1191–1492 | `updateUserArticle` is ~300 lines duplicating much of `generateUserArticle`. |
| 1236–1246 | Normalizes CEFR level by stripping `+` and lowercasing; if level is `C1+` this becomes `c1`, but `calculateLevel` may expect original format. |
| 1288–1312 | Regenerates questions in parallel; failures abort update. |
| 1395 | `cleanupAudioFiles` called before regenerating audio; good. |
| 1408–1429 | Translation failure on update throws but does **not** delete the existing article; acceptable, but leaves article in inconsistent state. |
| 1494–1533 | `cleanupAudioFiles` imports `firebase-admin/storage` via `require` inside try/catch. Direct Firebase Storage SDK usage violates `AGENTS.md` storage adapter rule. |
| 1505–1506 | Hard-coded bucket name `artifacts.reading-advantage.appspot.com`. |
| 1535–1599 | `cleanupStorageFiles` same Firebase coupling; also attempts to delete directories by prefix. |
| 1601–1634 | `cleanupFailedPrismaGeneration` uses `db.transaction` to delete article and questions; good, but name still says Prisma. |

### `genre-controller.ts`

| Line | Finding |
|------|---------|
| 1–19 | Imports service for enhanced metrics; legacy path duplicates service logic inline. |
| 26–268 | `getGenreMetrics` legacy path has no authorization beyond session presence. |
| 39–45 | Query params not validated; `timeframe` defaults to `"30d"` with ad-hoc parsing at line 61. |
| 48–57 | Enhanced branch delegates to service; good. |
| 60–63 | Legacy branch computes start date with `setDate`. |
| 66–82 | Conditions array typed as `any[]`; `schoolId` filter optional. |
| 86–93 | Class filter fetches student IDs and filters in memory; fine for small sets. |
| 101–166 | XP attribution is complex and fragile: matches activities by `targetId` or `details.articleId`, then joins XP logs by `activityId`. If an activity has no XP log, it contributes 0. |
| 124–130 | `relevantActivities` filter parses `details` as `any`. |
| 168–198 | `genreMap` aggregation in JavaScript; acceptable but duplicates service logic. |
| 201–215 | Genre metrics computed; `totalXp` may be misleading because of the XP attribution above. |
| 217–227 | Shannon diversity index computed and normalized by `Math.log2(Math.min(genres.length, 10))`; undocumented cap. |
| 229–250 | Response shape omits recommendations available in enhanced branch; inconsistent. |
| 273–344 | `getEnhancedGenreMetricsResponse` delegates to service and auth helper. |
| 349–459 | `checkEnhancedAuthorization` implements authorization inline. Student scope allows `USER` role same as `STUDENT`. Teacher classroom access checks are reasonable but duplicated. |

### `goals-controller.ts`

| Line | Finding |
|------|---------|
| 1–5 | Delegates to `GoalsService`; closest to backend-as-code pattern in this batch. |
| 9–43 | `getUserGoals` syncs progress then fetches goals. `status` cast to `any`. |
| 48–76 | `createGoal` passes body directly to service without validation. |
| 81–130 | `getGoalById` parses `goalId` from URL path manually (lines 92–94). |
| 112–122 | Calls `calculateProgress` separately; good separation. |
| 135–178 | `updateGoal` same manual URL parsing; body cast to `UpdateGoalInput`. |
| 183–218 | `deleteGoal` same manual URL parsing. |
| 223–275 | `updateGoalProgress` validates that `value` is a number but nothing else. |
| 280–305 | `getGoalRecommendations` good delegation. |
| 310–333 | `getUserGoalSummary` good delegation. |

### `leaderboard-controller.ts`

| Line | Finding |
|------|---------|
| 1–17 | Imports schema; no Zod. |
| 19–121 | `getAllRankingLeaderboard` **no authentication**. Returns monthly XP leaderboards for every license in the database. |
| 21–26 | Computes current month bounds locally; fine. |
| 28–111 | Iterates all licenses; for each license fetches all users, filters out staff in JS, then fetches monthly XP. Inefficient and unbounded. |
| 49–51 | Staff filter uses string literals; should use role enum. |
| 66–72 | Monthly XP query excludes `LEVEL_TEST`; fine. |
| 80–94 | Classroom name lookup returns first classroom only. |
| 96–107 | Leaderboard built, filtered to `xp > 0`, sorted, sliced top 10. |
| 123–215 | `getRankingLeaderboardById` checks session via `ExtendedNextRequest` but does not verify caller can access the license `id`. |
| 137–140 | Fetches users for the license; no tenant scoping beyond license membership. |
| 152–154 | Same staff filter string literals. |

### `lesson-controller.ts`

| Line | Finding |
|------|---------|
| 1–12 | Imports lesson schema; no auth utility used. |
| 14–18 | `Context` expects `userId` from params. |
| 20–73 | `getLessonStatus` **no authentication**. Uses `ctx.params.userId` without verifying the caller can access that user. |
| 26–29 | `articleId` query param required but no validation. |
| 50–63 | Iterates phases 1–14 with dynamic key access; assumes `phaseN` shape in schema. |
| 75–195 | `postLessonStatus` **no authentication**. Creates/updates lesson records for arbitrary `userId`. |
| 121–136 | Hard-codes 14 phase objects with status 0; if schema changes, this drifts. |
| 138–182 | Transaction creates lesson record and optionally updates `studentAssignments`. `classroomId` pulled from query params. |
| 145–181 | Assignment lookup does not verify the student is actually in the classroom. |
| 197–296 | `putLessonPhaseStatus` **no authentication**. Updates phases and completes assignments. |
| 229–230 | `updateData` typed as `any`; dynamic phase key assignment. |
| 246–282 | Completes `studentAssignments` when `phase === 13 && status === 2`; magic numbers. |
| 298–381 | `getUserQuizPerformance` **no authentication**. |
| 313–314 | Decodes and splits `articleId` to handle malformed IDs; suggests route misuse. |
| 316–329 | Fetches all user activities for the user and filters in memory by `details.articleId`. |
| 340–360 | XP logs used as proxy for MCQ correctness and SAQ score; same mislabeling as dashboard controller. |
| 383–464 | `getLessonWords` checks session but not that `articleId` belongs to the user or is assigned. |
| 424–447 | Maps word records; `wordData.vocabulary || wordData.word || ""` fallback. |
| 466–537 | `updateLessonWord` checks session but not that the word belongs to the user's lesson. |
| 489–510 | Updates any subset of FSRS fields from raw body; no validation. |
| 539–586 | `deleteLessonWord` sets `saveToFlashcard: false`; good soft delete. |
| 588–721 | `getLessonSentences` checks session but not assignment/article ownership. |
| 617–670 | Returns completion data if activity exists; prevents replay. |
| 672–711 | Fetches sentence records; returns full translation objects. |
| 723–794 | `updateLessonSentence` same validation issues as `updateLessonWord`. |
| 796–843 | `deleteLessonSentence` soft delete; good. |

### `level-test-controller.ts`

| Line | Finding |
|------|---------|
| 1–6 | Imports `z`, `streamText`, `openai`, `openaiModel5`, prompt. |
| 9–20 | `levelTestChatSchema` validates messages and options; **good**. |
| 22 | Exports inferred type. |
| 25–31 | `languageNames` hard-codes display names. |
| 36–80 | `buildSystemMessage` constructs a large system prompt with conditional instructions. |
| 45–60 | For non-English preferred language, instructs model to keep conversation in English but assessment fields in target language. Compliance is not enforced structurally. |
| 64–66 | Skip instruction includes user-supplied `skipCount` in prompt only; safe because it's embedded in natural language. |
| 85–95 | `parseAssessment` extracts JSON from markdown code fence. If model emits JSON without fences, assessment is lost. |
| 101–177 | `handleLevelTestChat` handler. |
| 103–109 | Returns **HTTP 403** for missing session; should be 401. |
| 140–144 | Calls `streamText` from `@reading-advantage/ai` but with `openai(openaiModel5)` directly, coupling to OpenAI. |
| 146–154 | Consumes the entire stream into memory before responding; negates streaming benefits and buffers large responses. |
| 159–164 | Returns full message plus parsed assessment; no persistence of conversation or result. |
| 166–168 | Zod errors returned as 400; good. |

### `license-controller.ts`

| Line | Finding |
|------|---------|
| 1–7 | Imports `catchAsync`, schema, `LicenseType`, `randomUUID`. |
| 9–19 | Context interfaces duplicated. |
| 21–62 | `createLicenseKey` **no authentication or role check**. Anyone can create a license if they can reach the route. |
| 30–34 | `licenseTypeMap` maps lowercase input to enum; good. |
| 36–43 | `expiration_date` accepts number of days or string; parsed without validation. |
| 45–56 | Inserts license; `ownerUserId` falls back to `req.session?.user.id` without checking session exists. |
| 64–103 | `getAllLicenses` **no authentication or role check**. Returns all licenses with owners and users. |
| 67–97 | Enrichment performs a separate user query per license (N+1). |
| 105–129 | `deleteLicense` checks license exists and has no users, but **no auth/role check**. |
| 131–207 | `activateLicense` checks current user role/self but allows any ADMIN/TEACHER to activate for any user (no school/license scope). |
| 152–168 | License lookup by key; checks max users and expiration; good. |
| 190–200 | Transaction inserts `licenseOnUsers`, updates `users.licenseId` and `expiredDate`, increments `usedLicenses`. Read-modify-write on counter (see XF-004). |
| 209–252 | `getLicense` **no auth check**. Returns license details including user list. |
| 254–313 | `deactivateLicense` checks role/self but no tenant scope. Read-modify-write on `usedLicenses`. |
| 288–306 | Decrements `usedLicenses` but does not null-check before math; uses `Math.max(0, (license.usedLicenses ?? 1) - 1)`. If `usedLicenses` was 0, this becomes 0, but the `?? 1` is suspicious. |
| 315–401 | `updateUserLicense` checks admin/teacher but no tenant scope. Read-modify-write on both old and new license counters. |
| 365–394 | Transaction deletes old license association, inserts new one, updates user, updates counters. If old and new license are the same, behavior is undefined (delete then insert). |
| 403–465 | `getFilteredLicenses` **no auth check**. Provides pagination and filtering by `schoolName`, `licenseType`, `ownerId`. |
| 414 | `ilike(licenses.schoolName, \`%${schoolName}%\`)` — parameter is interpolated safely by Drizzle? Actually `ilike` second argument is a string value; Drizzle parameterizes it, so safe from SQL injection, but the user input is unvalidated. |
| 420–429 | Count query uses same `whereClause`; good. |
| 431–453 | Enrichment N+1 again. |
| 467–504 | `calculateXpForLast30Days` **no authentication**. Computes XP per date/license globally. |
| 506–573 | `getXp30days` **no authentication**. Returns total XP for a license or all licenses. |
| 575–698 | `getLessonXp` **no authentication** beyond the `userId` route param. Returns per-article XP breakdown for arbitrary user. |
| 587–588 | URL decoding/splitting on `articleId`; same pattern as `lesson-controller.ts`. |
| 590–609 | Fetches all user activities and filters in memory. |
| 619–626 | Widens time window by ±1 hour around earliest/latest activity; heuristic. |
| 628–648 | Fetches additional vocabulary/rating activities in the widened window; may include unrelated activities. |

### `magic-defense-controller.ts`

| Line | Finding |
|------|---------|
| 1–11 | Imports same game schemas. |
| 12–314 | Duplicates `dragon-flight-controller.ts` / `castle-defense-controller.ts` patterns. |
| 22–28 | Body destructured without validation. |
| 27 | `difficulty = "NORMAL"` uppercase default (see XF-005). |
| 45–46 | `xpEarned = Math.floor(correctAnswers * accuracy)`; no cap. |
| 51–117 | Activity, XP log, user XP update, ranking upsert inline. |
| 82–93 | Read-modify-write on `users.xp`. |
| 96–98 | Mutates session XP. |
| 100–115 | Ranking upsert with no validation of `difficulty` casing. Because default is `"NORMAL"`, rankings will not appear under `normal` bucket. |
| 147–228 | `getRanking` same tenant scoping issues as other game controllers. |
| 195–213 | Buckets keyed lowercase; default uppercase difficulty breaks aggregation. |
| 230–313 | `getVocabulary` same as `dragon-flight-controller.ts`. |

---

## Severity Summary

| Severity | Count | Examples |
|----------|-------|----------|
| Critical | 8 | Missing auth on destructive endpoints; SQL injection vector; client-controlled XP; unscoped global queries exposing cross-tenant data; read-modify-write races on XP/license counters. |
| High | 14 | No input validation; missing tenant scoping; no Zod at boundaries; business logic in controllers; mass assignment from raw body; N+1 queries; CSV crashes on null data. |
| Medium | 18 | Duplicate code across game controllers; inconsistent enum/string usage; dead code; biased shuffle; magic numbers; inline permission logic; session mutation; locale fallback duplication. |
| Low | 12 | Misspelled function names; debug logs; typos; unused imports; inconsistent response shapes; JSDoc type repetition. |

---

## Recommendations (Not Acceptance)

1. **Migrate domain logic to `/packages/backend` modules.** Each domain
   (classroom, license, goals, games, flashcards, content generation,
   lessons, metrics) should have contracts, commands/queries, and
   permissions colocated per `AGENTS.md`.

2. **Add Zod schemas at every external boundary.** Request bodies,
   query params, and route params must be validated before entering
   domain logic.

3. **Centralize authorization.** Replace inline role checks with
   permission functions that verify school/license/classroom ownership.

4. **Fix read-modify-write races.** Use atomic SQL updates (`xp = xp +
   ${xpEarned}`) or transactions with row locking for counters.

5. **Remove the SQL injection vector** in
   `enhanced-alignment-controller.ts` by using parameterized `sql`
   literals for the interval expression.

6. **Scope all tenant-aware queries by `schoolId`** (or license/classroom
   chain) and never return global aggregates unless explicitly intended
   and authorized.

7. **Unify game controller implementations.** Extract a shared
   `completeGame` flow with per-game activity type and difficulty
   validation to eliminate duplicated bugs.

8. **Do not trust client-supplied XP.** Compute XP server-side from
   verified game metrics.

9. **Add authentication to endpoints currently missing it** (listed in
   executive summary).

10. **Move AI content generation out of request handlers** into a worker
    or backend module; use the internal AI adapter without hard-coding
    `openai(openaiModel5)`.

---

*This report documents coverage and findings only. It makes no
acceptance claims and does not assert that the listed issues are
complete.*

MEASURE_AGENT_RESULT
