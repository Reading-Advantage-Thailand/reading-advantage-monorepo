# Findings — Section 5 (Database & Multi-Tenancy)

> **App:** `apps/science-advantage/`
> **Audit date:** 2026-06-03
> **Source checklist:** `checklist-partial-5.md`
> **Convention:** F-5xx = §5 findings. Severity follows `measure/agents-md-audit-protocol.md` table.

## Summary table

| # | Severity | Rule | Title |
|---|----------|------|-------|
| F-501 | **Critical** | 5.3 | Zero `schoolId` predicates in any of the 27 `route.ts` files; 19/68 schema tables have no `schoolId` column at all |
| F-502 | **High** | 5.4 | App does not use `createTenantDB` (`packages/domain/src/db-contract.ts`); tenancy is hand-rolled per route |
| F-503 | **Medium** | 5.8 | Most destructive migration (`0003_slow_firebrand.sql`) is well-commented inline but has no formal ADR; `0012_codecamp_intern_role.sql` has zero comments |
| F-504 | **Medium** | 5.9 | Zero `relations()` declarations in `packages/db/src/schema/`; 3 sites of raw `sql\`\`` in app code (not views/CTEs) |

---

### F-501: Zero `schoolId` predicates in any of the 27 `route.ts` files; 19/68 schema tables have no `schoolId` column at all
- **Rule:** 5.3
- **Severity:** **Critical**
- **Evidence:**
  - `rg 'schoolId' apps/science-advantage/app/api/` → **0 hits** (all 27 production `route.ts` files; excludes test files).
  - `rg 'schoolId' apps/science-advantage/` (whole app, includes tests + docs) → **9 hits, 0 in production code**: 3 in `lib/__tests__/proxy-role.test.ts` and `lib/auth/session-id-separation.test.ts` (test fixtures only); 6 in `docs/archive/architecture/data-models.md` (archived docs, pre-Prisma).
  - `rg 'schoolId: ctx\.schoolId|schoolId: user\.schoolId|schoolId: session\.schoolId' apps/science-advantage/` → **0 hits**.
  - Schema-level: `rg 'schoolId' packages/db/src/schema/` → **3 hits across 3 tables**: `users` (`users.ts:29`), `classrooms` (`classrooms.ts:9`), `licenses` (`licenses.ts:15`). The 19 `science_*` tables in `packages/db/src/schema/science.ts` (including `scienceClasses`, `scienceLessons`, `scienceCurriculumUnits`, `scienceQuizQuestions`, `scienceStandardMastery`, `scienceAttempts`, `scienceQuestionResponses`, `scienceLessonCompletions`, `scienceMasteryRuns`, `scienceAssignments`, `gamificationProfiles`, `achievements`, etc.) have **no `schoolId` column**.
  - Five sampled `route.ts` files (representative): all authorize via `teacherId === session.user.id` (teacher ownership) or `scienceClassStudents.studentId === session.user.id` (enrollment), with `isAdmin` bypass. See `checklist-partial-5.md` "Sample route.ts verification" table.
  - Compare to `packages/domain/src/assignments/index.ts:75`, `progress/index.ts:95`, `reports/index.ts:45` — these domain functions DO use `eq(classrooms.schoolId, tenant.schoolId!)`, but science-advantage does not import or invoke these domain functions for its own routes.
- **Impact:** The science-advantage data model is a **user-centric tenancy model**, not a `schoolId`-scoped tenancy model. A teacher in school A can see any class where they are `teacherId`, regardless of which `schoolId` the teacher's `users` row carries. A student in school A enrolled in a class can see other students in the same class regardless of `users.schoolId`. The `users.schoolId` column is set on row insert but is never read in any `route.ts` query. This is functionally acceptable for the pilot's "user joins a class via joinCode" model, but it is a **breach of AGENTS.md §Multi-Tenancy** ("Every query must be scoped by `schoolId`. Check `user.schoolId` or `tenant.schoolId`. Never trust tenant IDs from the frontend without verifying the user has access.") and creates two concrete risks:
  1. If a teacher's `users.schoolId` is changed (e.g. transfer to another school), their previous `scienceClasses` ownership persists — they retain full read/write access to all prior classes' data. There is no school-scoped invalidation.
  2. If a student has `users.schoolId = schoolA` and is enrolled in a class owned by a `schoolB` teacher (which the join-code model permits), the student can read `scienceQuestionResponses` and `scienceStandardMastery` for that class — and the model cannot enforce a "students are isolated to their school's classes" rule.
- **Suggested fix track:** "science-advantage — TenantDB Adoption & schoolId-on-science-tables". This is large; recommend splitting:
  - **Phase 1 (Medium, 1–2 weeks):** Decide architectural direction with the maintainer. Two paths:
    - (a) Add `schoolId` to the science tables and migrate to `createTenantDB` everywhere (AGENTS.md compliant; big schema change).
    - (b) Document science-advantage's user-centric model as an intentional deviation (add a `apps/science-advantage/AGENTS.md` deviation note; F-501 downgrades to Medium; §5.3 + §5.4 become DEFERRED).
  - **Phase 2 (1–2 weeks):** Scaffold `createTenantDB` calls in 5 of 27 `route.ts` files; prove the pattern works against the existing test fixtures.
  - **Phase 3 (2–3 weeks):** Roll the pattern to the remaining 22 `route.ts` files.
  - Reference AGENTS.md §"Multi-Tenancy"; cross-link to pilot F-001 (which flagged the same 27 route files as bypassing `@reading-advantage/domain`).

### F-502: App does not use `createTenantDB` (`packages/domain/src/db-contract.ts`); tenancy is hand-rolled per route
- **Rule:** 5.4
- **Severity:** **High**
- **Evidence:**
  - `rg 'createTenantDB|TenantDB' apps/science-advantage/` → **0 hits**.
  - `rg 'createTenantDB' packages/` → 16+ hits, all in `packages/api/src/routers/*.ts` and `packages/webhooks/src/github.ts`. The wrapper is implemented in `packages/domain/src/db-contract.ts:167` and used correctly by the tRPC and webhooks adapters.
  - No `apps/science-advantage/lib/db/tenant.ts`, `apps/science-advantage/lib/tenant.ts`, or equivalent file exists. `find apps/science-advantage -name 'tenant*'` returns nothing.
  - The science-advantage app does **not** use `@reading-advantage/api` or `@reading-advantage/domain` for its own routes — it bypasses both with direct `@reading-advantage/db` imports. This was already flagged as pilot F-001 (27 `route.ts` files import `db` directly; 0 use `@reading-advantage/domain`, `assertCan`, or `TenantDB`).
- **Impact:** Without `TenantDB` (or an equivalent proxy), tenant scoping is *not* structurally enforced — it depends on every route developer remembering to add the right predicate. Combined with F-501 (no `schoolId` columns on science tables), the science-advantage app has **no structural multi-tenant guardrail** at all. Even if Phase 1 (a) of F-501 is chosen, the routes still won't get the protection unless they migrate to `createTenantDB`.
- **Suggested fix track:** Same track as F-501 Phase 2 / Phase 3. Independently, even if F-501 goes with deviation path (b), `createTenantDB` should be adopted for the 3 tables that DO have `schoolId` (`users`, `classrooms`, `licenses`) so that future endpoints touching those tables inherit the proxy.

### F-503: Most destructive migration is well-commented inline but has no formal ADR; `0012_codecamp_intern_role.sql` has zero comments
- **Rule:** 5.8
- **Severity:** **Medium**
- **Evidence:**
  - `packages/db/drizzle/0003_slow_firebrand.sql` performs 2 `DROP TABLE`, 1 `ALTER TYPE … ADD VALUE`, 2 `DROP CONSTRAINT`, 13 `DROP COLUMN` across `users`/`accounts`/`sessions`. The file's 59 lines are dominated by inline comments (e.g. "Drop pre-unified-auth tables (replaced by Drizzle-based auth in @reading-advantage/auth)", "Email is optional in unified auth (username is the primary identifier)", "Remove JWT-era columns no longer used"). This is good.
  - `packages/db/drizzle/0015_science_junction_tables.sql:1-10` has a 10-line header comment referencing `measure/tracks/prisma_drizzle_science_controllers_20260505/plan.md`. Good.
  - `packages/db/drizzle/0008_codecamp_phase.sql:1-3` has 3 lines of comment ("Manual migration: Add phase column to codecamp_modules / Created for codecamp-advantage curriculum track (Phase 1)"). Adequate.
  - `packages/db/drizzle/0012_codecamp_intern_role.sql` is **1 line** with **zero comments** (`ALTER TYPE "role" ADD VALUE IF NOT EXISTS 'INTERN';`). This is a non-destructive additive change so the missing comment is minor, but the protocol requires every destructive migration to have a justification — `ADD VALUE` to a `pgEnum` is borderline.
  - `packages/db/drizzle/0016_users_grade_level.sql:1-7` has 7 lines of comment explaining the legacy Prisma origin. Good.
  - **No `docs/adr/` or `packages/db/docs/adr/` directory exists** in the monorepo. There is no formal ADR document. Inline comments in the migration file are the only artifact.
  - Cross-checked `measure/tracks/` — there is no `agents_md_audit_…` track for migration ADR hygiene, and no existing ADR convention.
- **Impact:** Destructive migrations are well-documented for the big ones (0003) but rely on inline comments; a future contributor reviewing the migrations directory has no central index of "why was this column dropped?" The protocol §5.8 calls for an ADR (Architecture Decision Record) specifically. The pilot F-004 incident (cookie-only admin guard) showed the cost of unreviewed security decisions; the same risk applies to migrations.
- **Suggested fix track:** "monorepo — Migration ADR Convention". 3–5 days. Create `packages/db/docs/adr/` with `0001-use-drizzle-not-prisma.md`, `0002-drop-jwt-era-accounts-columns.md` (reverse-engineered from `0003_slow_firebrand.sql`), `0003-add-intern-role.md`. Add a CI lint that fails on a `DROP TABLE` / `DROP COLUMN` line that isn't followed within 10 lines by a comment starting with `-- ADR:` or `-- Why:`. Low-medium priority — these migrations are already shipped, so this is a process improvement for future migrations.

### F-504: Zero `relations()` declarations in `packages/db/src/schema/`; 3 sites of raw `sql\`\`` in app code
- **Rule:** 5.9
- **Severity:** **Medium**
- **Evidence:**
  - `rg 'relations\(' packages/db/src/schema/` → **0 hits**. The Drizzle `relations()` API is unused.
  - Schema files use `references(() => users.id, { onDelete: "cascade" })` to declare FKs at the column level (good), but the relational query API (`db.query.users.findMany({ with: { accounts: true } })`) is not leveraged. The codebase compensates with `.innerJoin(table, eq(table.fk, ...))` patterns at every call site. See e.g. `apps/science-advantage/app/api/classes/route.ts:90-99`, `apps/science-advantage/app/api/lessons/[lessonSlug]/route.ts:73-87`, `apps/science-advantage/app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts:59-78`.
  - Raw `sql\`\`` usage in app code (3 sites, all in production code, none in views):
    - `apps/science-advantage/lib/services/mastery/standard-mastery.ts:68` — `evidenceCount: sql\`${scienceStandardMastery.evidenceCount} + ${evidenceDelta}\`` (arithmetic on a column + a TS variable).
    - `apps/science-advantage/app/api/teachers/dashboard/route.ts:163` — `lt(scienceStandardMastery.masteryLevel, sql\`0.6\`)` (constant literal — could be a regular number `0.6`).
    - `apps/science-advantage/app/api/teachers/classes/[classId]/intervention-alerts/route.ts:166` — `sql\`${interventionConfig.masteryFilterLevel}\`` (column reference).
  - Compare to `packages/domain/src/codecamp/index.ts:688,689,692,694,695,1079` (raw `sql\`\`` for status preservation in upserts). This is a wider pattern in the monorepo, not just the science app.
- **Impact:**
  - **Missing `relations()` blocks:** Drizzle's `relations()` enables the `db.query.tableName.findMany({ with: { … } })` syntax with type-safe JOIN inference. Without it, every JOIN is hand-written with `eq()` predicates, which is verbose and error-prone (silent broken JOINs if a FK column is renamed). Functional impact is small in the pilot (queries work) but the maintenance cost compounds as the schema grows.
  - **Raw SQL outside views:** The 3 sites in app code are all legitimate uses of `sql\`\`` for arithmetic or column references. The protocol reserves raw SQL for "views, CTEs, and matviews". These uses are not CTEs/views. Severity per the protocol: "Raw SQL outside views = Medium". They are isolated and small, so the per-finding severity is the protocol's nominal Medium.
- **Suggested fix track:** "packages/db — relations() + raw-SQL codemod". 1–2 weeks. Phase 1: add `relations()` blocks for the 5 most-queried aggregates (users→accounts, users→sessions, scienceClasses→scienceCurriculumUnits→scienceUnitLessons→scienceLessons, scienceAttempts→scienceQuestionResponses, classrooms→classroomStudents). Phase 2: migrate 5 hot queries in `packages/api/src/routers/*` from manual `innerJoin` to `db.query.*.findMany({ with: … })` as a proof of pattern. Phase 3: codemod the 3 raw `sql\`\`` sites in `apps/science-advantage` to parameter-binding equivalents (`gt(col, 0.6)` etc.) where applicable. Defer the `packages/domain/src/codecamp/index.ts` sites to a separate sub-track.
