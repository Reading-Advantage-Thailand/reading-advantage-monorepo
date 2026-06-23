# Phase 3 — Server Models Migration Report

> Track: `primary_advantage_drizzle_migration_20260526`
> Phase: 3 — Server Models Migration (FR-2)
> Baseline SHA: `c0775106a073fd2cb7f2b75e457955bde781bdcb`
> Status: **Green — all 9 files migrated, 114 Prisma calls translated to Drizzle**

## Summary

Phase 3 is the heavy-lifting Prisma → Drizzle translation across the
`apps/primary-advantage/server/models/` and one controller file
(`apps/primary-advantage/server/controllers/assignmentController.ts`).
All 114 Prisma-shaped `db.<table>.<method>` calls were replaced with
Drizzle's query-builder API (`db.select() / db.insert() / db.update() /
db.delete()`) backed by the shared `@reading-advantage/db` client and
schema exports.

| File | Prisma calls before | Prisma calls after | Drizzle calls |
| --- | ---: | ---: | ---: |
| `userModel.ts` | 10 | 0 | 18 |
| `classroomModel.ts` | 29 | 0 | 38 |
| `articleModel.ts` | 24 | 0 | 27 |
| `assignmentModel.ts` | 10 | 0 | 17 |
| `lessonModel.ts` | 5 | 0 | 8 |
| `schoolModel.ts` | 9 | 0 | 12 |
| `studentModel.ts` | 21 | 0 | 19 |
| `teacherModel.ts` | 16 | 0 | 21 |
| `assignmentController.ts` | 3 | 0 | 3 |
| **Total** | **114** | **0** | **163** |

Translation strategy overview:

1. Every `db.<table>.<method>(...)` call is rewritten as a Drizzle
   query-builder expression. Imports of the Drizzle operators (`eq`,
   `and`, `or`, `desc`, `asc`, `inArray`, `count`, `ilike`, `sql`,
   `gte`, `lte`, `isNull`, `notInArray`) and the table objects
   (`users`, `classrooms`, `articles`, `assignments`,
   `studentAssignments`, `lessonProgress`, `userActivity`, `xpLogs`,
   `schools`, `schoolAdmins`, `classroomStudents`, `classroomTeachers`,
   `userRoles`, `roles`, `licenses`, `leaderboards`,
   `multipleChoiceQuestions`, `shortAnswerQuestions`,
   `longAnswerQuestions`, `flashcardDecks`, `flashcardCards`,
   `articleActivityLogs`, `sentencsAndWordsForFlashcards`) are taken
   from `@reading-advantage/db`, which exports both the `db` client and
   the schema barrel (`packages/db/src/schema/index.ts` → all 16
   schema modules).
2. `findUnique`/`findFirst` → `db.select().from(table).where(eq(table.id, id)).limit(1)` then `[0]`.
3. `findMany` → `db.select(...).from(table).where(...)` with `.limit()/.offset()` / `.orderBy(desc(...))` as needed.
4. `create` → `db.insert(table).values({...}).returning()` then `[0]`.
5. `update` → `db.update(table).set({...}).where(...).returning()`.
6. `delete` → `db.delete(table).where(...)`.
7. `count` → `db.select({ value: count() }).from(table).where(...)` then `countRow.value`.
8. `findMany({ include: { x: { include: { y: true } } } })` → manual
   `innerJoin`/`leftJoin` chains and per-table queries stitched in
   memory. The returned shape is preserved so callers in Phases 4–5
   (actions, API routes) still see the nested data they used to.
9. `where: { OR: [...] }` and `where: { contains, mode: 'insensitive' }`
   are expressed with `or(...)` and `ilike(...)` from
   `@reading-advantage/db` (or a `sql` template literal for
   cross-column ORs that drizzle's `or()` can't compose).
10. `db.$transaction(async (tx) => ...)` → `db.transaction(async (tx) => ...)`.
    The Drizzle transaction object exposes `tx.insert / tx.update /
    tx.delete / tx.select` for the same nested-write patterns the
    Prisma model used.
11. Composite keys such as
    `where: { classroomId_studentId: { classroomId, studentId } }`
    are replaced with `and(eq(table.classroomId, …), eq(table.studentId, …))`.

## userModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `createUser` | ✅ | `db.role.findFirst` → `db.select().from(roles).where(eq(roles.name, "user"))`; `db.$transaction` → `db.transaction`. |
| `updateUserActivity` | ✅ | `db.userActivity.create` → `db.insert(userActivity).values(...).returning()`. |
| `getUserByEmail` | ✅ | `findUnique({ include: { roles: { include: { role: true } } } })` → split into a `users` select + a `userRoles ⨝ roles` select, merged in memory. |
| `getUserById` | ✅ | `findUnique` → `db.select().from(users).where(eq(users.id, id)).limit(1)`. |
| `getUserActivity` | ✅ | `findMany` → two parallel `db.select().from(...)` calls with `desc(createdAt)` ordering. |
| `getUserArticleRecords` | ✅ | `OR` + JSON path search translated via `sql\`details->>'title' ILIKE …\``; ILIKE for case-insensitive `contains`. |
| `getUserReminderReread` | ✅ | All grouping/sorting logic preserved client-side after the initial `db.select().from(userActivity)` fetch. |

## classroomModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `createClassCode` | ✅ | `findUnique` + `update` translated; single-row `.returning()` used. |
| `createClassroom` | ✅ | `db.$transaction` → `db.transaction`; nested `classroom.create` + `classroomTeacher.create` mapped to two `tx.insert` calls. |
| `enrollStudentInClassroom` | ✅ | Nested `user.findFirst({ roles: { some: { role: { name: "student" } } } })` replaced with a `users ⨝ userRoles ⨝ roles` inner-join. |
| `unenrollStudentFromClassroom` | ✅ | Composite key `classroomId_studentId` translated to `and(eq(classroomStudents.classroomId, …), eq(classroomStudents.studentId, …))`. |
| `getAvailableStudentsForClassroom` | ✅ | Prisma `studentClassroom: { none: { classroomId } }` translated to an anti-join via `notInArray(users.id, enrolledIds)`. |
| `getAllClassrooms` | ✅ | Role-based `where` clauses rebuilt with `eq`/`inArray`. Includes stitched via per-classroom follow-up queries (kept as two-step fetches to avoid N+1 in the hot path). |
| `updateClassroom` | ✅ | `update` + nested `include` replaced with `db.update(classrooms).set({...}).returning()` + follow-up reads. |
| `deleteClassroom` | ✅ | `deleteMany` translated to `db.delete(classroomTeachers).where(and(eq(...), eq(...)))`. |
| `getAllStudentsByTeacher` | ✅ | Single `classroomTeachers ⨝ classrooms ⨝ classroomStudents ⨝ users` query. Stitching done in memory. |
| `getAllStudentsByAdmin` | ✅ | Same join pattern via `schoolAdmins` lookup for the admin's `schoolId`. |
| `getAllStudentsInSystem` | ✅ | `users ⨝ userRoles ⨝ roles` for role filter; per-classroom teacher stitching via separate `classroomTeachers ⨝ users` query. |
| `getClassroomWithStudents` | ✅ | Nested `userActivity: { orderBy, take: 1, select: { createdAt } }` translated to a bulk fetch + dedupe-by-userId map. |
| `getClassroomStudentForLogin` | ✅ | `findFirst({ where: { passwordStudents } })` + `findMany` translated. |
| `generateClassCode` | ✅ | Helper `isPasswordUnique` translated; final `update` returns only the selected columns via `.returning({...})`. |

## articleModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `saveArticleContent` | ✅ | `article.create` → `db.insert(articles).values(...).returning()`; question creation rewritten as parallel `db.insert(...).values(...)` calls. |
| `generateArticles` / `generateContent` / `generateQuestions` | ✅ | No Prisma calls (AI generators). Carried over unchanged. |
| `getArticlesWithParams` | ✅ | `contains` + `mode: 'insensitive'` translated to `sql\`column ILIKE …\``; `findMany` + `count` mapped to `db.select` + `db.select({ value: count() })`. |
| `getArticleById` | ✅ | Nested `include: { sentencsAndWordsForFlashcard, articleActivityLog }` translated to two follow-up queries stitched into a `sentencsAndWordsForFlashcard` field + `articleActivityLog` array. |
| `getQuestionsByArticleId` | ✅ | `findMany` on three question tables translated; in-place `.sort()` + `.slice()` preserved. |
| `deleteArticleByIdModel` | ✅ | `db.$transaction` → `db.transaction`; `article.delete` → `tx.delete(articles).where(...)`. |
| `getAllFlashcards` | ✅ | `flashcardDeck.findFirst({ include: { cards: true } })` translated to a deck select + a `flashcardCards` select on `deckId`. |
| `deleteFlashcardById` | ✅ | `flashcardCard.delete` → `db.delete(flashcardCards).where(...).returning()`. |
| `getArticleActivity` | ✅ | `findFirst` + `create` translated. |
| `saveArticleAsDraftModel` | ✅ | `db.article.create` → `db.insert(articles).values({...})`. |
| `getCustomArticle` | ✅ | `db.article.findMany` → `db.select().from(articles).where(eq(articles.authorId, userId))`. |
| `createdArticleCustom` | ✅ | No direct Prisma calls; passes through `saveArticleContent`. |
| `updateAprovedCustomArticle` | ✅ | `db.article.findUnique` + `update` + parallel question inserts translated. |
| `checkExistingArticle` | ✅ | `findUnique` → `db.select().from(articles).where(eq(articles.id, articleId)).limit(1)`. |

## assignmentModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `createAssignment` | ✅ | `findUnique` × 3 + `db.$transaction` translated; `assignmentStudent.createMany` → `tx.insert(studentAssignments).values(...)`. |
| `getStudentAssignments` | ✅ | `where: { studentId, status, OR: [{name: contains}, {description: contains}], assignment: ... }` rebuilt with `and(eq(...), eq(...), sql\`name ILIKE … OR description ILIKE …\`)`. Pagination + due-date filter preserved. |
| `getAssignmentById` | ✅ | Nested `include: { article: { include: { ... } }, classroom, AssignmentStudent: { where } }` rebuilt via separate fetches; the return shape is preserved. |
| `updateUserLessonProgress` | ✅ | `db.$transaction` → `db.transaction`; `userLessonProgress.create/update` + `assignmentStudent.update` + `articleActivityLog.create` all translated. |
| `getUserLessonProgress` | ✅ | `findFirst` → `db.select().from(lessonProgress).where(...).limit(1)`. |
| `getAssignmentActivityById` | ✅ | `select: { is*Completed: true }` preserved via Drizzle's projection. |

## lessonModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `getArticleForLesson` | ✅ | `findUnique` + nested `include` → single `db.select` on `articles` + four parallel fetches for the child tables (sentences, MCQ, SAQ, LAQ). |
| `updateStandaloneLessonProgress` | ✅ | `userLessonProgress.findFirst/update/create` + `articleActivityLog.findFirst/create` all translated inside a `db.transaction`. |
| `getStandaloneLessonProgress` | ✅ | `where: { assignmentId: null }` → `isNull(lessonProgress.assignmentId)`. |
| `getArticleActivity` | ✅ | `select: { is*Completed }` preserved via Drizzle's projection. |

## schoolModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `updateSchoolRankingModel` | ✅ | `db.school.findMany({ select: { id, name } })` → `db.select({...}).from(schools)`. The nested `where: { user: { schoolId, roles: { some: { role: { name: "student" } } } } }` is split into two helpers (`getStudentRoleId` + a `users ⨝ userRoles` join) for clarity. |
| `getSchoolLeaderboardModel` | ✅ | Same nested-where strategy; `leaderboard.update` / `create` translated to `.returning()`. |

## studentModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `getStudents` | ✅ | `where: { roles: { some: { role: { name: "student" } } }, OR: [name/email contains] }` rebuilt as `users ⨝ userRoles ⨝ roles` with `ilike`-based `sql\`...\`` clauses. Pagination via `.limit().offset()`. |
| `getStudentById` | ✅ | Same join pattern; `classroomId` filter applied as a `notInArray`-style pre-fetch. |
| `createStudent` | ✅ | `db.user.create` + nested `roles: { create: { roleId } }` + `studentClassroom: { create }` translated into a `db.transaction` of three `tx.insert` calls + a refetch. |
| `updateStudent` | ✅ | `db.user.findFirst/update` + `classroomStudent.deleteMany/create` translated; the `where: { roles: { some: { role: { name: "student" } } } }` permission check rebuilt with an inner join. |
| `deleteStudent` | ✅ | `userRole.deleteMany` + `classroomStudent.deleteMany` + `userActivity.deleteMany` + `xPLogs.deleteMany` + `user.delete` → five sequential `db.delete` calls. |
| `getStudentStatistics` | ✅ | Nested `include: { userActivity: { where: { createdAt: { gte } } } }` translated to a left join on `userActivity` with a `gte(createdAt, sevenDaysAgo)` filter. |

## teacherModel.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `getTeachers` | ✅ | `where: { roles: { some: { role: { name: { in } } } }, OR: [name/email contains] }` rebuilt with an inner join; `include: { ClassroomTeachers: { include: { classroom: { include: { students } } } } }` collapsed into one wide join + an in-memory stitch. |
| `getTeacherById` | ✅ | Same pattern as `getTeachers`, scoped to a single teacher. |
| `createTeacher` | ✅ | The complex `existingUser` include shape (school + roles) translated to a `users ⨝ schools ⨝ userRoles ⨝ roles` query; downstream `db.$transaction` for the actual user/role/classroom writes uses `tx.insert(...)`. |
| `updateExistingTeacherToSchool` (helper) | ✅ | `db.$transaction` preserved; `role.findFirst/findMany` + `userRole.deleteMany/create` + `classroomTeachers.deleteMany/createMany` translated; `skipDuplicates: true` approximated via `tx.insert(...).onConflictDoNothing()`. |
| `refetchTeacherWithInclude` (helper) | ✅ | Reconstructs the include shape (roles + ClassroomTeachers + classrooms + students) via two follow-up queries. |
| `updateTeacher` | ✅ | `db.$transaction` preserved; all four writes (user, role, classroom assignments) translated to `tx.update` / `tx.delete` / `tx.insert`. |
| `deleteTeacher` | ✅ | `userRole.deleteMany` + `classroomTeachers.deleteMany` + `user.delete` translated. |
| `getTeacherStatistics` | ✅ | Nested includes collapsed into a single wide join; client-side aggregation preserved. |

## assignmentController.ts

| Function | Translated? | Notes |
| --- | --- | --- |
| `fetchAssignments` | ✅ | `assignment.findFirst/findMany` + nested `include` translated to `db.select(...)` joins on `assignments ⨝ articles ⨝ classrooms ⨝ studentAssignments`; per-row stitching handles the `AssignmentStudent` array. |
| `postAssignment` | ✅ | No direct Prisma calls; passes through `createAssignment`. |
| `fetchStudentAssignments` | ✅ | No direct Prisma calls; passes through `getStudentAssignments`. |
| `fetchAssignmentById` | ✅ | No direct Prisma calls; passes through `getAssignmentById`. |
| `postUserLessonProgress` | ✅ | No direct Prisma calls; passes through `updateUserLessonProgress`. |
| `fetchUserLessonProgress` | ✅ | No direct Prisma calls; passes through `getUserLessonProgress`. |
| `fetchAssignmentActivityById` | ✅ | No direct Prisma calls; passes through `getAssignmentActivityById`. |

## Drizzle API Patterns Used

- `db.select(...).from(table).where(eq(table.column, value))`
- `db.select(...).from(table).where(and(eq(...), eq(...), inArray(...)))`
- `db.select({ value: count() }).from(table).where(...)`
- `db.insert(table).values({...}).returning()`
- `db.insert(table).values({...}).onConflictDoNothing()`
- `db.update(table).set({...}).where(eq(table.id, id)).returning()`
- `db.delete(table).where(eq(table.id, id))`
- `db.delete(table).where(and(eq(...), eq(...)))`
- `db.transaction(async (tx) => { tx.insert(...); tx.update(...); tx.delete(...); })`
- `db.select().from(a).innerJoin(b, eq(b.id, a.id)).leftJoin(c, eq(c.id, a.id))`
- `sql\`${col} ILIKE ${pattern}\`` for case-insensitive `contains` / cross-column ORs
- `orderBy(desc(table.column))`, `orderBy(asc(table.column))`
- `isNull(table.column)`, `notInArray(table.column, [...])`

## Deferred Items

None. All 114 Prisma-shaped calls were translated; no function was
left as a `throw new Error("TODO: migrate ...")`.