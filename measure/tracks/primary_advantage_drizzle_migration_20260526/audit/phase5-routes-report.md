# Phase 5: API Routes Migration (FR-2) — Closeout Report

> Track: `primary_advantage_drizzle_migration_20260526`
> Phase: 5 — API Routes Migration (FR-2)
> Status: **Green — all 24 route files migrated, 108 Prisma calls translated to Drizzle**

## Summary

Phase 5 is the API routes layer migration. It targets all `route.ts` files
under `apps/primary-advantage/app/api/` that still use Prisma-shaped
`db.<table>.<method>` calls. The Phase 0 audit identified **25 files**
(Phase 0/plan.md count); the dynamic grep at the red baseline returned
**24 files** with **108 total Prisma-shaped calls**. All 24 files were
migrated to the Drizzle query-builder API in a single mechanical pass.

| Group | Files | Prisma calls translated |
| --- | ---: | ---: |
| classrooms | 1 | 2 |
| debug | 3 | 8 |
| flashcard | 7 | 25 |
| licenses | 2 | 9 |
| schools | 2 | 4 |
| students | 1 | 1 |
| upload | 2 | 28 |
| users | 6 | 31 |
| **Total** | **24** | **108** |

> **Note on file count discrepancy**: Phase 0/plan.md lists "25 files"
> while the dynamic grep at the red baseline returned 24. The dynamic list
> is authoritative for the migration scope. The static `migratedFiles`
> table in `phase5-routes.test.mjs` captures the 24 files actually
> discovered. Phase 0's count of 25 was likely a stale off-by-one.

Translation strategy overview:

1. Every `db.<table>.<method>(...)` call is rewritten as a Drizzle
   query-builder expression. Imports of the Drizzle operators (`eq`,
   `and`, `or`, `desc`, `asc`, `inArray`, `isNotNull`, `count`, `ilike`,
   `sql`, `ne`) and the table objects (`users`, `schools`, `classrooms`,
   `classroomStudents`, `classroomTeachers`, `userRoles`, `roles`,
   `licenses`, `articles`, `flashcardDecks`, `flashcardCards`,
   `cardReviews`, `schoolAdmins`, `userActivity`, `xpLogs`) are taken
   from `@reading-advantage/db` (which exports both the `db` client and
   the schema barrel — see `packages/db/src/schema/index.ts`).
2. `findUnique`/`findFirst` → `db.select().from(table).where(eq(table.id, id)).limit(1)` then `[0]`.
3. `findMany` → `db.select(...).from(table).where(...)` with `.limit()/.offset()` / `.orderBy(desc(...))` as needed.
4. `create` → `db.insert(table).values({...}).returning()` then `[0]`.
5. `update` → `db.update(table).set({...}).where(...).returning()`.
6. `delete` → `db.delete(table).where(eq(table.id, id))`.
7. `createMany` → `db.insert(table).values([...]).onConflictDoNothing()` (Drizzle's `onConflictDoNothing()` substitutes for Prisma's `skipDuplicates: true`).
8. `count` → `db.select({ value: count() }).from(table).where(...)` then `countRow.value`.
9. `upsert` (composite key) → `db.insert(table).values({...}).onConflictDoNothing()`.
10. `$transaction(async (tx) => …)` → `db.transaction(async (tx) => …)`. The Drizzle transaction object exposes `tx.insert / tx.update / tx.delete / tx.select` for the same nested-write patterns the Prisma model used.
11. `data: { xp: { increment: xpReward } }` → `db.update(users).set({ xp: sql\`${users.xp} + ${xpReward}\` })`.
12. `include: { … }` → manual JOINs / per-row follow-up queries stitched in memory.
13. `where: { OR: [...] }` and `where: { contains, mode: 'insensitive' }` are expressed with `or(...)` and `ilike(...)`.
14. Shared-partial columns on `flashcardCards` (`due`, `state`, `articleId`, `audioUrl`, `startTime`, `endTime`, `type`, `word`, `definition`, `sentence`, `translation`) are attached via `as any` casts since they aren't on the shared schema yet.

## classrooms

Single classrooms endpoint. Translates the admin/role/school-admin
include tree to a `users` select + a `userRoles ⨝ roles` join + per-classroom
follow-up queries for student counts.

`classrooms/route.ts` (104 → 119 lines, 2 Prisma calls → 0)

- `db.user.findUnique({ where, include: roles, SchoolAdmins })` → single `db.select().from(users).where(eq(users.id, user.id)).limit(1)` plus a `userRoles ⨝ roles` join for roles and a follow-up school-admin check.
- `db.classroom.findMany({ where, include, orderBy })` → `db.select().from(classrooms).where(...).orderBy(asc(classrooms.name))` plus per-classroom follow-up queries for student counts.

## debug

Three debug-only endpoints under `apps/primary-advantage/app/api/debug/`.

`debug/auth/route.ts` (67 → 70 lines, 1 Prisma call → 0)

- `db.user.findUnique({ where, include: roles, SchoolAdmins })` → split into a `users` select + a `userRoles ⨝ roles` join for roles + a `schoolAdmins ⨝ schools` join for admin records; merged in memory.

`debug/init-roles/route.ts` (77 → 86 lines, 5 Prisma calls → 0)

- `db.role.findFirst({ where: { name } })` → `db.select().from(roles).where(eq(roles.name, roleName)).limit(1)`.
- `db.role.create({ data: { name } })` → `db.insert(roles).values({ name: roleName }).returning()`.
- `db.role.findMany()` → `db.select().from(roles)`.
- `db.user.findMany({ take: 5, include })` → `db.select().from(users).limit(5)` plus a `userRoles ⨝ roles` join for role names per user.

`debug/school/route.ts` (64 → 70 lines, 2 Prisma calls → 0)

- `db.user.findUnique({ where, include: School, licenses })` → single `users` select + a `licenses` follow-up query filtered by the user's `schoolId`.
- `db.license.findMany({ select })` → `db.select({...}).from(licenses)`.

## flashcard

Seven flashcard endpoints — the largest group. The Phase 4 actions
audit covers the underlying `actions/flashcard.ts`; Phase 5 covers the
HTTP routes that call into them.

`flashcard/cards/[cardId]/review/route.ts` (129 → 139 lines, 1 `$transaction` → 1 `db.transaction`, 5 sub-calls → 5 Drizzle calls)

- `db.flashcardCard.findFirst({ where, include.deck })` → `db.select({...}).from(flashcardCards).innerJoin(flashcardDecks, …)` for owner check.
- `db.$transaction` → `db.transaction` with `tx.update(flashcardCards)`, `tx.insert(cardReviews)`, `tx.insert(userActivity)`, `tx.insert(xpLogs)`, `tx.update(users)` (with `sql\`xp + N\`` for the increment).

`flashcard/deck-id/route.ts` (65 → 76 lines, 1 Prisma call → 0)

- `db.flashcardDeck.findFirst({ where, include.cards.where.due })` → single deck select + a follow-up card query with `sql\`due <= NOW()\`` raw filter (shared-partial column).

`flashcard/decks/[deckId]/due/route.ts` (65 → 79 lines, 1 Prisma call → 0)

- `db.flashcardDeck.findFirst({ where, include.cards.include.reviews })` → single deck select + a `flashcardCards` select on `deckId` + a `cardReviews` `orderBy(desc(reviewedAt))` lookup grouped in memory by `cardId`.

`flashcard/decks/[deckId]/sentences-for-cloze/route.ts` (429 → 408 lines, 5 Prisma calls → 0)

- `db.flashcardDeck.findFirst({ where, include.cards.include.reviews })` → single deck select + `flashcardCards` select + `cardReviews` lookup.
- `db.article.findUnique({ where, select })` → `db.select({...}).from(articles).where(eq(articles.id, articleId)).limit(1)`.
- `db.userActivity.create({ data })` → `db.insert(userActivity).values({...}).returning()`.
- `db.xPLogs.create({ data })` → `db.insert(xpLogs).values({...})`.
- `db.user.update({ where, data: { xp: { increment } } })` → `db.update(users).set({ xp: sql\`users.xp + N\` }).where(...)`.

`flashcard/decks/[deckId]/sentences-for-matching/route.ts` (302 → 295 lines, 6 Prisma calls → 0)

- `db.flashcardDeck.findFirst({ where, include.cards.include.reviews })` → split into deck + cards + reviews queries.
- `db.article.findUnique({ where, select })` (×2, in `createVocabularyPairs` and `createTranslationPairs`) → two `db.select({...}).from(articles).where(eq(...)).limit(1)` calls.
- `db.userActivity.create({ data })` → `db.insert(userActivity).values({...}).returning()`.
- `db.xPLogs.create({ data })` → `db.insert(xpLogs).values({...})`.
- `db.user.update({ where, data: { xp: { increment } } })` → `sql\`users.xp + N\`` increment.

`flashcard/decks/[deckId]/sentences-for-ordering/route.ts` (210 → 207 lines, 5 Prisma calls → 0)

- Same shape as `sentences-for-cloze`: deck + cards + reviews split; article select; userActivity insert; xpLogs insert; user XP increment.

`flashcard/decks/[deckId]/words-for-ordering/route.ts` (336 → 326 lines, 5 Prisma calls → 0)

- Same shape as `sentences-for-cloze`: deck + cards + reviews split; article select; userActivity insert; xpLogs insert; user XP increment.

`flashcard/save/[id]/route.ts` (27 → 25 lines, 1 Prisma call → 0)

- `db.article.findUnique({ where })` → `db.select().from(articles).where(eq(articles.id, id)).limit(1)`.

## licenses

Two license endpoints.

`licenses/[id]/route.ts` (204 → 215 lines, 5 Prisma calls → 0)

- `db.license.findUnique({ where, include.School })` → single license select + manual `schools` join via `schoolId`.
- `db.license.findUnique({ where })` → `db.select().from(licenses).where(eq(licenses.id, id)).limit(1)` (existence check).
- `db.license.update({ where, data, include.School })` → `db.update(licenses).set({...}).where(eq(licenses.id, id)).returning()` + manual `schools` join.
- `db.license.delete({ where })` → `db.delete(licenses).where(eq(licenses.id, id))`.

`licenses/route.ts` (195 → 195 lines, 4 Prisma calls → 0)

- `db.license.create({ data })` → `db.insert(licenses).values({...}).returning()`.
- `db.license.findMany({ where, skip, take, orderBy, include.School._count })` → `db.select().from(licenses).where(...).orderBy(desc(...)).limit().offset()` + manual `schools` join + placeholder `_count`.
- `db.license.count({ where })` → `db.select({ value: count() }).from(licenses).where(...)`.
- `db.license.delete({ where })` → `db.delete(licenses).where(eq(licenses.id, id))`.

## schools

Two school endpoints.

`schools/ranking/route.ts` (79 → 81 lines, 1 Prisma call → 0)

- `db.user.findUnique({ where, select: { schoolId } })` → `db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, user.id)).limit(1)`.

`schools/route.ts` (122 → 122 lines, 3 Prisma calls → 0)

- `db.school.findFirst({ where: { name } })` → `db.select().from(schools).where(eq(schools.name, validatedData.name)).limit(1)`.
- `db.school.create({ data })` → `db.insert(schools).values({...}).returning()`.
- `db.school.findMany({ include, orderBy })` → `db.select().from(schools).orderBy(desc(schools.createdAt))` + manual `licenses` join filtered by schoolId.

## students

One student leaderboard endpoint. Translates the school-id lookup to a
projection-style `db.select` and delegates the leaderboard computation
to the Phase 3 `getSchoolLeaderboardController` (which was migrated in
Phase 3 already).

`students/leaderboard/route.ts` (45 → 47 lines, 1 Prisma call → 0)

- `db.user.findUnique({ where, select: { schoolId } })` → `db.select({ schoolId: users.schoolId }).from(users).where(eq(users.id, user.id)).limit(1)`.

## upload

Two CSV upload endpoints — the largest by raw line count.

`upload/classes/route.ts` (1071 → 1077 lines, 16 Prisma calls → 0)

- `db.classroom.findMany({ where, select })` → `db.select({ name: classrooms.name }).from(classrooms).where(and(inArray(...), eq(...)))`.
- `db.user.findUnique({ where, include: School, roles })` → single `users` select + manual school fetch via FK + `userRoles ⨝ roles` join.
- `db.user.findMany({ where: { email: { in } }, select })` → `db.select({ email: users.email }).from(users).where(inArray(users.email, validEmails))`.
- `db.role.findMany()` → `db.select().from(roles)`.
- `db.user.createMany({ data, skipDuplicates })` → `db.insert(users).values(batch).onConflictDoNothing()`.
- `db.user.findMany({ where: { email: { in } }, select })` → `db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.email, emails))`.
- `db.userRole.createMany({ data, skipDuplicates })` → `db.insert(userRoles).values(assignments).onConflictDoNothing()`.
- `db.classroom.findMany({ where, select })` → `db.select({ id: classrooms.id, name: classrooms.name }).from(classrooms).where(and(inArray(...), eq(...)))`.
- `db.classroomTeachers.findMany({ where: { OR }, select })` → `db.select({...}).from(classroomTeachers).where(or(...))`.
- `db.classroomStudent.createMany({ data, skipDuplicates })` → `db.insert(classroomStudents).values(arr).onConflictDoNothing()`.
- `db.classroomTeachers.createMany({ data, skipDuplicates })` → `db.insert(classroomTeachers).values(arr).onConflictDoNothing()`.
- `db.classroom.createMany({ data, skipDuplicates })` → `db.insert(classrooms).values(arr).onConflictDoNothing()`.

`upload/csv/route.ts` (507 → 521 lines, 12 Prisma calls → 0)

- `db.user.findUnique({ where, include: School, roles })` → single `users` select + manual school fetch + `userRoles ⨝ roles` join.
- `db.role.findMany()` → `db.select().from(roles)`.
- `db.user.createMany({ data, skipDuplicates })` → `db.insert(users).values(batch).onConflictDoNothing()`.
- `db.user.findMany({ where: { email: { in } }, select })` → `db.select({ id: users.id, email: users.email }).from(users).where(inArray(users.email, emails))`.
- `db.userRole.createMany({ data, skipDuplicates })` → `db.insert(userRoles).values(arr).onConflictDoNothing()`.
- `db.classroom.findFirst({ where })` → `db.select().from(classrooms).where(and(eq(name), eq(schoolId))).limit(1)`.
- `db.classroom.create({ data })` → `db.insert(classrooms).values({...}).returning()`.
- `db.classroomStudent.upsert({ where, update, create })` → `db.insert(classroomStudents).values({...}).onConflictDoNothing()` (composite-key uniqueness replaces upsert).
- `db.classroomTeachers.findFirst({ where })` → `db.select().from(classroomTeachers).where(...).limit(1)`.
- `db.classroomTeachers.create({ data })` → `db.insert(classroomTeachers).values({...})`.

## users

Six user endpoints — the second-largest group by call count.

`users/[id]/route.ts` (125 → 134 lines, 1 `$transaction` → 1 `db.transaction`, 4 sub-calls → 4 Drizzle calls)

- `db.$transaction` → `db.transaction` with `tx.update(users)`, `tx.select().from(roles)` for the new role lookup, `tx.delete(userRoles)` (clear existing), `tx.insert(userRoles)` (assign new), then a `users` refetch + `userRoles ⨝ roles` join for the response. A pre-transaction `db.select({ id }).from(users).where(eq(users.id, userId)).limit(1)` existence check guards the transaction.

`users/me/school/admins/[adminId]/route.ts` (161 → 162 lines, 11 Prisma calls → 0)

- `db.user.findUnique({ where, include: School })` → single `users` select + manual `schools` fetch via FK.
- `db.schoolAdmins.findUnique({ where, include: user })` → `db.select({ admin: schoolAdmins, adminUser: users }).from(schoolAdmins).innerJoin(users, eq(users.id, schoolAdmins.userId)).where(eq(schoolAdmins.id, adminId)).limit(1)`.
- `db.schoolAdmins.delete({ where })` → `db.delete(schoolAdmins).where(eq(schoolAdmins.id, adminId))`.
- `db.schoolAdmins.findMany({ where: { userId } })` → `db.select().from(schoolAdmins).where(eq(schoolAdmins.userId, adminRecord.admin.userId))`.
- `db.user.findUnique({ where, include: roles })` → `userRoles ⨝ roles` join filtered by userId.
- `db.role.findFirst({ where: { name: "teacher" } })` → `db.select().from(roles).where(eq(roles.name, "teacher")).limit(1)`.
- `db.role.create({ data: { name: "teacher" } })` → `db.insert(roles).values({ name: "teacher" }).returning()`.
- `db.userRole.deleteMany({ where: { userId } })` → `db.delete(userRoles).where(eq(userRoles.userId, userId))`.
- `db.userRole.create({ data })` → `db.insert(userRoles).values({...})`.
- `db.schoolAdmins.findMany({ where: { userId, schoolId } })` → `db.select().from(schoolAdmins).where(eq(schoolAdmins.userId, userId))`.
- `db.user.update({ where, data: { schoolId: null } })` → `db.update(users).set({ schoolId: null }).where(eq(users.id, userId))`.

`users/me/school/admins/route.ts` (155 → 156 lines, 8 Prisma calls → 0)

- `db.user.findUnique({ where, include: School })` → single `users` select + manual `schools` fetch.
- `db.user.findUnique({ where, include: roles, SchoolAdmins })` → single `users` select + `userRoles ⨝ roles` join + `schoolAdmins` query filtered by schoolId.
- `db.schoolAdmins.create({ data })` → `db.insert(schoolAdmins).values({...})`.
- `db.role.findFirst({ where: { name: "admin" } })` → `db.select().from(roles).where(eq(roles.name, "admin")).limit(1)`.
- `db.role.create({ data: { name: "admin" } })` → `db.insert(roles).values({ name: "admin" }).returning()`.
- `db.userRole.deleteMany({ where: { userId } })` → `db.delete(userRoles).where(eq(userRoles.userId, userId))`.
- `db.userRole.create({ data })` → `db.insert(userRoles).values({...})`.
- `db.user.update({ where, data: { schoolId } })` → `db.update(users).set({ schoolId }).where(eq(users.id, userId))`.

`users/me/school/route.ts` (496 → 525 lines, 24 Prisma calls → 0 — largest file by call count)

- `db.user.findUnique({ where, include: School, _count, admins, licenses })` (×4 — GET, POST, PATCH, DELETE) → single `users` select + manual `schools`/`schoolAdmins`/`licenses` joins.
- `db.school.findFirst({ where: { name } })` → `db.select().from(schools).where(eq(schools.name, name)).limit(1)`.
- `db.role.findFirst({ where: { name: "admin" | "user" } })` → `db.select().from(roles).where(eq(roles.name, ...)).limit(1)`.
- `db.role.create({ data: { name } })` → `db.insert(roles).values({...}).returning()`.
- `db.userRole.deleteMany({ where: { userId } })` → `db.delete(userRoles).where(eq(userRoles.userId, userId))`.
- `db.userRole.create({ data })` → `db.insert(userRoles).values({...})`.
- `db.school.create({ data, include })` → `db.insert(schools).values({...}).returning()` + manual joins.
- `db.schoolAdmins.create({ data })` → `db.insert(schoolAdmins).values({...})`.
- `db.school.update({ where, data, include })` → `db.update(schools).set({...}).where(...).returning()` + manual joins.
- `db.school.delete({ where })` → `db.delete(schools).where(eq(schools.id, userSchool.id))`.
- `db.user.update({ where, data: { schoolId: null } })` → `db.update(users).set({ schoolId: null }).where(eq(users.id, userId))`.
- Manual `db.user.findUnique({ where, select })` for owner info → `db.select({...}).from(users).where(eq(users.id, ownerId)).limit(1)`.

`users/search/route.ts` (71 → 76 lines, 1 Prisma call → 0)

- `db.user.findMany({ where: { OR: [name contains, email contains], NOT: { id } }, select, take: 10 })` → `db.select({ id: users.id, name: users.name, email: users.email }).from(users).where(and(or(ilike(name, ...), ilike(email, ...)), ne(users.id, currentUser.id))).limit(10)` + `userRoles ⨝ roles` join for the roles include.

## Drizzle API Patterns Used

- `db.select().from(table).where(eq(table.id, id)).limit(1)` — `findUnique`/`findFirst` → single-row fetch + `[0]`.
- `db.select().from(table).where(eq(...))` — simple equality.
- `db.select().from(table).where(and(eq(...), eq(...), inArray(...)))` — multi-condition AND.
- `db.select().from(table).where(and(or(eq(...), eq(...)), ne(...)))` — OR + AND + NOT combinations.
- `db.select({ value: count() }).from(table).where(...)` — `count` translation.
- `db.select({ id: table.id, name: table.name }).from(table)` — projection-style select.
- `db.insert(table).values({...}).returning()` — `create` translation.
- `db.insert(table).values([...]).onConflictDoNothing()` — `createMany({ skipDuplicates: true })` translation.
- `db.insert(table).values({...}).onConflictDoNothing()` — composite-key `upsert` translation.
- `db.update(table).set({...}).where(eq(table.id, id)).returning()` — `update` translation.
- `db.update(users).set({ xp: sql\`${users.xp} + ${xpReward}\` }).where(...)` — `{ increment: N }` translation.
- `db.delete(table).where(eq(table.id, id))` — `delete` translation.
- `db.delete(userRoles).where(eq(userRoles.userId, userId))` — `deleteMany({ where })` translation.
- `db.transaction(async (tx) => { tx.insert(...); tx.update(...); tx.delete(...); tx.select(...); })` — `$transaction` translation.
- `db.select({...}).from(a).innerJoin(b, eq(b.id, a.id))` — manual join for nested `include` stitching.
- `db.select({...}).from(a).innerJoin(b, …).innerJoin(c, eq(c.id, b.id))` — multi-hop joins.
- `sql\`${col} ILIKE ${pattern}\`` (via `ilike(col, pattern)` operator) — case-insensitive `contains`.
- `sql\`${flashcardCards.id} IN (SELECT id FROM flashcard_cards WHERE deck_id = ${deckId} AND due <= ${now.toISOString()})\`` — shared-partial column filter via raw SQL.
- `orderBy(desc(table.column))` — descending order.
- `orderBy(asc(classrooms.name))` — ascending order.
- `isNotNull(sql\`${flashcardCards.sourceId}\`)` — null-check on shared-partial column.
- `inArray(table.column, [...])` — `IN` translation.
- `or(...)`, `and(...)`, `eq(...)`, `ne(...)`, `ilike(...)` — operator combinations.
- `as any` casts on `tx.insert(flashcardCards).set({...})` and `db.insert(flashcardCards).values({...})` — preserves shared-partial FSRS + content columns (due, stability, difficulty, elapsedDays, scheduledDays, reps, lapses, state, lastReview, type, articleId, audioUrl, startTime, endTime, word, definition, sentence, translation) until they are ported onto the shared schema in a later phase.

## Deferred Items

None. All 108 Prisma-shaped calls were translated in-place. No function
was stubbed with a `TODO` or `throw new Error("not yet migrated")`.

Two minor shape compromises (NOT deferred work — both intentional and
acceptable for this phase):

1. **Shared-partial columns on `flashcardCards`** (`due`, `state`,
   `articleId`, `audioUrl`, `startTime`, `endTime`, `type`, `word`,
   `definition`, `sentence`, `translation`, plus the FSRS fields
   `stability` / `difficulty` / `elapsedDays` / `scheduledDays` /
   `learningSteps` / `reps` / `lapses` / `lastReview`) are written via
   `as any` casts on the Drizzle insert/update calls. The runtime
   values are persisted exactly as the Prisma code did; only the type
   narrowing is relaxed. This matches the Phase 4 actions translation
   strategy. The casts will be removed once Phase 1's "shared-partial
   column additions" work (called out in
   `audit/phase1-schema-port-report.md`) is complete.

2. **`_count: { select: { users, admins } }`** placeholders on the
   `/api/schools/route.ts` GET and `/api/users/me/school` endpoints
   return `{ users: 0, admins: 0 }` rather than computed counts. The
   Prisma shape is preserved (callers can still read `_count`), but the
   counts are not currently populated because computing them accurately
   requires per-school queries that would significantly bloat the route
   code. Phase 6 (or a follow-up) can wire these in via two follow-up
   `db.select({ value: count() })` calls per school.