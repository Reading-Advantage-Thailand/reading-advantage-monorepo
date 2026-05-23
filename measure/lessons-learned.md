# Lessons Learned

> This file is curated working memory, not an append-only log. Keep it at or below **50 lines**.
> Remove or condense entries that are no longer relevant to near-term planning.

## Architecture & Design

- (2026-05-02, shared_backend_api) Domain layer must not depend on `@trpc/server`. Use standard `Error` in domain and map to `TRPCError` in routers. This keeps domain testable without tRPC context.
- (2026-05-02, shared_backend_api) Every workspace package that uses `.js` extensions in TypeScript imports must build to `dist/` and export `dist/` in `package.json`. Next.js `transpilePackages` does not reliably resolve `.js` → `.ts` for ESM workspace packages.

## Recurring Gotchas

- (2026-05-02, shared_backend_api) `AuthProvider` calling `refreshSession` on mount creates a race condition: tests rendering `useRequireAuth` must pre-seed tokens AND mock `auth.refresh` + `auth.session` fetches. The hook throws during render when `!isLoading && !isAuthenticated`, so either establish auth before render or `expect().toThrow()` in a dedicated test.
- (2026-05-02, shared_backend_api) `tsup` bundles can accidentally pull React hooks into the main barrel (`dist/index.js`). Server components importing `cn` from that barrel will fail. Keep hooks in a separate subpath export (`./hooks`).

## Patterns That Worked Well

- (2026-05-02, shared_backend_api) Extracting business logic from tRPC routers into domain functions (`createAssignment`, `recordActivity`, etc.) made permission checks and tenant scoping testable in isolation.
- (2026-05-02, shared_backend_api) Using `insert(...).onConflictDoUpdate(...)` with a `uniqueIndex` on `(userId, lessonId)` provided a clean upsert pattern for `lessonProgress` without manual read-then-write.
- (2026-05-02, shared_backend_api) Adding database-level unique constraints (`classroomStudents`, `studentAssignments`, `accounts`, `verificationTokens`) prevents duplicate data at the source.

## Testing & Mocking

- (2026-05-02, review_remediation) Drizzle query-builder mocks must return **thenable objects**, not plain functions. `db.select().from().where()` returns an object that is awaited directly. If `.where()` returns a function object, `await` will not call it — it will return the function itself. Use `Object.assign(Promise.resolve(value), { limit: ..., innerJoin: ... })` for chain mocks.
- (2026-05-02, review_remediation) Cross-tenant authorization checks must be tested explicitly. `assertCan()` only checks role permissions; it does NOT verify school/class ownership. Every domain function that queries by caller-supplied ID needs an ownership guard and a corresponding cross-tenant test.

## Planning Improvements

- (2026-05-02, shared_backend_api) Fixing package exports and build outputs took ~30 min but unblocked all three apps. Always verify that workspace packages with ESM `.js` imports have proper `dist/` exports before trying to debug Next.js module resolution.
- (2026-05-02, review_remediation) When adding DB constraints in Drizzle schema, always generate a migration (`drizzle-kit generate`) in the same track. Schema-only constraints don't protect production data until the migration runs.
- (2026-05-14, codecamp_advantage) Mock-DB unit tests can pass while real DB constraints are violated. Always verify schema alignment with a real database smoke test before considering schema tasks complete.
- (2026-05-14, codecamp_advantage) GitHub webhook handlers should normalize payload URLs before matching against stored repo URLs (trailing slashes, `.git` suffixes). URL mismatch caused silent webhook drops.
- (2026-05-14, codecamp_advantage) Streaming LLM responses via `streamText` with `toDataStreamResponse()` require careful client-side handling. The `useChatStream` hook must buffer partial chunks and only persist complete assistant messages to the DB.
- (2026-05-15, codecamp_advantage) Separating curriculum seed data into a pure data module (`codecamp-curriculum-data.ts`) makes it testable independently from the seed script and enables curriculum content review without DB access.
- (2026-05-15, codecamp_review) API route handlers (Next.js `/api/`) bypass the tRPC/domain layer invariant. Always route through domain functions with `assertCan()` and TenantDB — never import raw `db` for queries.
- (2026-05-15, codecamp_review) Client-facing input schemas must never accept fields that could be used for privilege escalation (e.g., `role: "assistant"` on chat messages). Keep injection-prone fields as internal-only parameters in domain functions.
- (2026-05-15, codecamp_review) `adminProcedure` in tRPC provides defense-in-depth alongside client-side role checks. Never rely solely on UI-level auth gating — tRPC procedures for admin data must use `adminProcedure`, not `protectedProcedure`.
- (2026-05-15, codecamp_review) `reviewedAt` timestamps must be conditionally set: only stamp when the review status is terminal (not "pending"). Re-triggering a webhook sets status back to "pending", which should preserve the previous `reviewedAt`.
- (2026-05-15, codecamp_review) Mock-DB `selectResults` returns the same array for all queries. When a domain function makes multiple selects needing different results, use `selectSequence` to provide per-call result arrays.
- (2026-05-22, prisma_drizzle_schema_unification) `drizzle-kit generate` requires a TTY for rename detection prompts. In non-TTY environments (Claude Code, CI), write migration SQL by hand and add journal entry manually. Snapshot files can lag behind journal entries — that is fine for hand-written migrations.
- (2026-05-22, prisma_drizzle_schema_unification) Mock-DB's `from()` result needs `.limit()` and `.offset()` attached for domain queries that skip `.where()` (e.g., `listStories`). Added in `mock-db.ts` — update when writing no-filter list queries.
- (2026-05-22, prisma_drizzle_schema_unification) Cross-app collision rubric: tables with <30% column overlap, incompatible FK graphs, or different business domains should KEEP-SEPARATE with prefixed names (e.g., `science_classes`, `science_assignments`). Do not force unification just because names collide.
- (2026-05-23, prisma_drizzle_reading_controllers) Prisma `where: { schoolId }` on relation-less models (e.g., `UserActivity` had no `schoolId`) failed silently at runtime. When migrating to Drizzle, route those filters through a join on `users.schoolId` — preserves the controller signature, fixes the bug. Plan called `gameRankings`/`lessonRecords` Track 4 slices but they are PORT-AS-IS — verify table existence in `packages/db/src/schema/` before deferring. Prisma migrations directory holds two kinds of SQL: schema changes (replaced by the unified Drizzle migration) and custom raw SQL (CREATE MATERIALIZED VIEW, REFRESH triggers); before deleting, grep for `MATERIALIZED VIEW\|REFRESH` and preserve those at `db-migrations/legacy-matviews/` — they have no Drizzle-generator equivalent and prod still needs them.
- (2026-05-23, prisma_drizzle_reading_controllers) Raw-SQL strings inside controllers/services are invisible to TypeScript and to schema-rename tooling — they survive a Prisma→Drizzle migration with the OLD table/column names baked in (`"UserActivity"`, `"XPLogs"`, `a."createdAt"`, singular `article`). Audit every `db.execute(sql\`...\`)` and every raw-SQL helper at migration time, and add a per-SQL test that renders the query through `PgDialect.sqlToQuery` and greps for the unified names — type-check, lint, and build all pass without catching this.
- (2026-05-23, prisma_drizzle_reading_controllers) Manual `$n` interpolation into `sql.raw(...)` is unsafe and silently mishandles non-string parameter types (Date, json, boolean). Convert `$n`-based helpers to `sql.join([sql.raw(literal), sql\`${value}\`, ...])` so Drizzle/postgres-js binds every value through the driver. Throw on missing bind values; do not let them produce malformed SQL.
- (2026-05-23, prisma_drizzle_science_controllers) Prisma implicit M:N tables (`_LessonToStandard`, `_CurriculumUnitToLesson`, `_ClassToStudent`, `_QuizQuestionToStandard`) have NO Drizzle equivalent and are invisible to schema-audit tools that only look at top-level `model X { ... }` blocks. When porting a Prisma schema to Drizzle, grep for `Standard[]`/`Lesson[]`/`Class[]`-style array fields on both sides of every relation — each pair without an explicit through-table needs an explicit Drizzle junction with composite PK and matching `ON DELETE CASCADE` semantics. Discovered during Track 3 pilot; fixed by adding migration 0015 with 4 junctions.
- (2026-05-23, science_test_infra_drizzle) `prisma db push --force-reset` cannot share a database with applied Drizzle migrations — Prisma's `CREATE TYPE` has no `IF NOT EXISTS` path and aborts on enums Drizzle already created. When migrating an app off Prisma, the test-DB provisioning needs to swap to `drizzle-kit migrate` _early_ (not at the end), otherwise integration tests are unverifiable for the whole migration. Cleanest split: separate test DB on the same container (one `createdb`, zero compose changes), one-shot `globalSetup` for migration, per-test truncate-and-reseed for fixtures.
