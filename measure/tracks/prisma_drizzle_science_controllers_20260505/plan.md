# Implementation Plan: science-advantage Non-Auth Prisma → Drizzle

> **Status:** Unblocked. Track 1 (`prisma_drizzle_schema_unification_20260505`) completed
> 2026-05-22 — the Drizzle `science_*` tables, migration `0013`, and domain helpers
> (`gamification`, `curriculum`, `quiz`) all exist.
>
> **Who this plan is for:** an implementing team new to this migration. Read **Section 0** in
> full first — it is the whole recipe. Phases 1–7 just apply it to a file list.
>
> **Inventory (re-verify on day 1):** 2026-05-23 grep showed **96 files** in
> `apps/science-advantage/` importing Prisma (excluding the auto-generated `lib/generated/zod/`,
> which has hundreds of dead files). Auth tables are already on Drizzle
> (`science_auth_migration_20260503`) — auth logic is **out of scope** here; only its leftover
> Prisma *imports* get cleaned up in Phase 6.

---

## 0. Before You Start

### 0.0 Task: Re-verify the inventory

```bash
cd apps/science-advantage
grep -rln "@prisma\|lib/prisma" --include=*.ts --include=*.tsx . \
  | grep -vE "node_modules|/.next/|/dist/|lib/generated"
grep -oE "prisma\.[a-zA-Z]+" app/api/<route>/route.ts | sort -u
```

### 0.1 Environment setup — IMPORTANT: a dependency is missing

Unlike reading-advantage, **science-advantage does NOT depend on `@reading-advantage/domain`**.
It only has `db`, `auth`, `auth-client`, `api`. The Track 1 domain helpers (`curriculum`,
`quiz`, `gamification`) cannot be imported until you add the dep. This is **Phase 0, Task 1**:

```bash
cd apps/science-advantage
pnpm add "@reading-advantage/domain@workspace:*"
```

Then, from repo root:

```bash
pnpm install
docker compose up -d
pnpm --filter @reading-advantage/db build
pnpm --filter @reading-advantage/domain build
pnpm --filter @reading-advantage/db migrate
```

Test command (**science-advantage runs on Vitest**):

```bash
CI=true pnpm --filter science-advantage test
CI=true pnpm --filter science-advantage test -- lessons   # single-file while iterating
```

Reference files to read once: `packages/db/src/schema/science.ts` (all `science_*` tables),
`packages/domain/src/{curriculum,quiz,gamification}/index.ts`,
`measure/archive/prisma_drizzle_schema_unification_20260505/audit.md`.

### 0.2 The loop — what "done" looks like for ONE file

Behavior-preserving refactor — **not** red/green feature TDD. For each file:

1. **Characterization test first** — pin the current observable behavior (response JSON, status,
   rows written) against the *current Prisma* code; confirm green. Write one if the path has
   non-trivial logic and none exists.
2. **Swap Prisma → Drizzle** (0.4–0.6).
3. **Same test still green.**
4. **One file = one commit:** `refactor(science): migrate <file> off Prisma`. Mark the task
   `[x]` with the 7-char SHA per `workflow.md`.

### 0.3 The Prisma client here is a DEFAULT export

science-advantage's `lib/prisma.ts` does `export default prisma`, so files do
`import prisma from "@/lib/prisma"`. (reading-advantage uses a *named* export — do not copy
recipes between the two apps blindly.) Replace with:

```ts
import { db, eq, and, inArray, desc, sql, count } from "@reading-advantage/db";
import { scienceLessons, scienceClasses } from "@reading-advantage/db/schema";
```

### 0.4 Prisma → Drizzle translation cheat-sheet

Same as Track 2 — `findUnique`→`select().where().limit(1)` then `[row]`; `findMany`→`select()`;
`create`→`insert().values().returning()`; `update`→`update().set().where().returning()`;
`delete`→`delete().where()`; `count`→`select({c:count()})`; `upsert`→`onConflictDoUpdate`;
`$transaction`→`db.transaction()`; relations (`include`) → explicit `.leftJoin()` or a second
query. `findUnique` returns `null`, Drizzle returns `[]` — keep the existing `if (!row)` branch.

### 0.5 Drizzle table names are `science_`-prefixed

Track 1's audit kept the science tables **separate** from reading-advantage's (different FK
graphs, different tenant scope). The Prisma model → Drizzle table map:

| Prisma model (`prisma.X`) | Drizzle table export | Domain helper | Notes |
|---------------------------|----------------------|---------------|-------|
| `class` | `scienceClasses` | — | KEEP-SEPARATE; scoped by `teacherId` |
| `curriculumUnit` | `scienceCurriculumUnits` | — | FK → `scienceClasses` |
| `standard` | `scienceStandards` | — | — |
| `standardMastery` | `scienceStandardMastery` | — | — |
| `lesson` | `scienceLessons` | `domain.curriculum` | KEEP-SEPARATE; `getScienceLesson`, `listScienceLessons`, `createScienceLesson` |
| `quizQuestion` | `scienceQuizQuestions` | — | KEEP-SEPARATE; jsonb `correctAnswer` |
| `attempt` | `scienceAttempts` | `domain.quiz` | `submitScienceAttempt`, `getStudentScienceAttempts` |
| `questionResponse` | `scienceQuestionResponses` | — | — |
| `lessonCompletion` | `scienceLessonCompletions` | — | — |
| `masteryRun` | `scienceMasteryRuns` | — | — |
| `assignment` | `scienceAssignments` | — | KEEP-SEPARATE from reading's `assignments` |
| `gamificationProfile` | `gamificationProfiles` | `domain.gamification` | **global — no `schoolId`** |
| `achievement` | `achievements` | — | **global — no `schoolId`** |
| `user` | `users` | `domain.users` | auth — already on Drizzle; only swap imports |

### 0.6 Raw `db` vs domain helpers, tenant scoping, read/write seam

- Default to **raw `db` from `@reading-advantage/db`** for a 1:1 behavior-preserving swap. Use a
  Track 1 domain helper only when its behavior already matches the path exactly (same guard,
  same shape) — adding an `assertCan()` the route never had would change behavior.
- **`gamificationProfiles` and `achievements` are global tables (no `schoolId`).** Do NOT wrap
  their access in `TenantDB` / `createTenantDB` — use raw `db`. (`TenantDB` throws on `db.query`
  and warns on a null `schoolId`; it is for tenant-scoped tables only.)
- **Read/write seam (FR-7):** any domain helper you add or edit is *either* a pure read (only
  `SELECT`) *or* a write — never both. Reads are named `get*`/`list*`/`count*`/`exists*`/`find*`;
  everything else is a write. Split mixed read/write paths when you migrate them.

### 0.7 Prisma enums and the generated Zod artifact

- `import { StandardsAlignment } from "@prisma/client"` (and any other enum) → replace with a
  local string-union const. `lib/schemas/validate-json.ts` uses `StandardsAlignment` — pull the
  member list from `prisma/schema.prisma` and define it in `lib/schemas/` or a new `lib/enums.ts`.
- `lib/generated/zod/` is auto-generated by `prisma-zod-generator`. Only **two** files import it:
  `lib/validations/class.ts` and `lib/validations/student-classes.ts`. Track 1 did **not** ship
  co-located Zod inference, so those two files must be **hand-rewritten** with plain Zod schemas
  (derive shapes from `packages/db/src/schema/science.ts`, or add `drizzle-zod` and use
  `createInsertSchema(scienceClasses)`). Once those two importers are gone, the whole
  `lib/generated/zod/` directory deletes cleanly. This is a Phase 4 / Phase 6 task — see below.

### 0.8 Gotchas (from `measure/lessons-learned.md`)

- Vitest mock-DB chains must be **thenable** — `db.select().from().where()` is awaited directly;
  a chain mock is `Object.assign(Promise.resolve(rows), { limit, orderBy, ... })`, not a function.
  Prefer real-DB integration tests where science-advantage already has `*.integration.test.ts`.
- A `@reading-advantage/*` workspace package must be built to `dist/` before this app resolves
  it — if an import fails, run that package's `build`.
- Mock-DB unit tests can pass while real DB constraints fail — run at least the
  `*.integration.test.ts` suites against a real migrated DB before closing a phase.

### Deferring to Track 4

If a path cannot map cleanly onto the unified schema, do not force it — leave it on Prisma,
migrate everything around it, and add a row to
`prisma_drizzle_slice_cleanup_20260505/spec.md` "Non-Generalizable Surface List" with the file
path and reason. Flag it to the reviewer.

---

## Worked Example (read before Phase 1)

`app/api/lessons/[lessonSlug]/route.ts` — touches one model (`lesson`):

```ts
// ---- BEFORE ----
import prisma from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ lessonSlug: string }> }) {
  const { lessonSlug } = await params;
  const lesson = await prisma.lesson.findUnique({ where: { slug: lessonSlug } });
  if (!lesson) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(lesson);
}

// ---- AFTER ----
import { db, eq } from "@reading-advantage/db";
import { scienceLessons } from "@reading-advantage/db/schema";

export async function GET(_req: Request, { params }: { params: Promise<{ lessonSlug: string }> }) {
  const { lessonSlug } = await params;
  const [lesson] = await db
    .select().from(scienceLessons).where(eq(scienceLessons.slug, lessonSlug)).limit(1);
  if (!lesson) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json(lesson);
}
```

The characterization test (`lessons/[lessonSlug]/route.integration.test.ts` already exists) must
be green against BEFORE and stay green against AFTER.

---

## Phase 0: Setup

- [x] Task: Add `@reading-advantage/domain` to `apps/science-advantage/package.json`; `pnpm install`; build `db` + `domain`; run migrations (Section 0.1). Verify `import { curriculum } from "@reading-advantage/domain"` type-checks. [84d3009]
- [x] Task: **Schema gap fix** (Track 1 follow-up) — add 4 M:N junction tables to `packages/db/src/schema/science.ts` (`science_lesson_standards`, `science_unit_lessons`, `science_class_students`, `science_question_standards`); generate migration `0015`; apply locally; build `db` + `domain` clean. Required by the pilot route and most of Phase 1/4 paths. [f818827]
- [x] Task: **Pilot** — migrate `app/api/lessons/[lessonSlug]/route.ts` per the worked example. Pause, confirm the loop with the reviewer before continuing. [9d40a9e]
- [-] Task: Measure - User Manual Verification 'Setup' (Protocol in workflow.md) — _deferred; all manual QA gates batched to a single end-of-track pass per user direction 2026-05-24_

## Phase 1: Curriculum, lessons & standards

> **Prerequisite:** sub-track `science_test_infra_drizzle_migration_20260523` complete (test DB on Drizzle migrations; per-file truncate-and-reseed pattern; pilot `route.integration.test.ts` proves the loop). Without it, every controller migration in Phases 1–5 is unverifiable at runtime.
>
> **Deviation 2026-05-24:** The original ordering put `app/api/lessons/[lessonSlug]/quiz/route.ts` as the first Phase 1 task, but it depends on `processMasteryRun()` (Phase 2), `awardXp`/`updateStreakForProfile` (Phase 3), and `checkBadgeConditions` (Phase 3) — all of which are still on Prisma and would read/write the wrong tables the moment the route is swapped. The existing integration test was also already broken (Prisma tables no longer exist in the test DB post-test-infra-migration). Quiz route is moved to **Phase 2.5** (executed after the helpers it depends on are on Drizzle); the simpler Phase 1 routes that don't touch gamification/mastery proceed first.

- [x] Task: Migrate `lib/services/classes/get-class-detail.ts` (class, curriculumUnit) [3312144]
- [x] Task: Migrate `lib/ai/recommendation-context.ts` (curriculumUnit, standardMastery) [33a4d73]
- [x] Task: Migrate `lib/schemas/validate-json.ts` — swap `StandardsAlignment` enum import (0.7); confirm `lib/schemas/lesson-slug.schema` paths still resolve [6b29adf]
- [x] Task: Migrate `app/api/lessons/[lessonSlug]/quiz/route.ts` (attempt, gamificationProfile, lesson, lessonCompletion, masteryRun) — _unblocked now that helpers are on Drizzle_ [be15807]
- [x] Task: Migrate `app/api/classes/[classId]/curriculum/route.ts` (class, curriculumUnit, lessonCompletion) [23391c2]
- [x] Task: Migrate `app/api/classes/[classId]/analytics/overview/route.ts` (class, lesson, lessonCompletion) [bca632f]
- [x] Task: Migrate `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (class, lesson, lessonCompletion, questionResponse) [bdcc5a6]
- [x] Task: Update integration test `lib/schemas/__tests__/curriculum-identifiers.integration.test.ts` (+ `content-migration.test.ts`, `curriculum-identifiers.test.ts`) against Drizzle [56804e0]
- [-] Task: Measure - User Manual Verification 'Curriculum & Lessons' (Protocol in workflow.md) — _deferred to end-of-track batch_

## Phase 2: Quiz, attempts & mastery

- [x] Task: Migrate `lib/services/mastery/mastery-worker.ts` (attempt, masteryRun, standardMastery) [6c5c446]
- [x] Task: Update tests `tests/lib/mastery-pipeline.test.ts` against Drizzle — _replaced with mastery-worker.integration.test.ts (5 real-DB tests)_ [6c5c446]
- [x] Task: Migrate `lib/services/mastery/standard-mastery.ts` — _was 'types-only' in plan but had runtime DB code; ported to Drizzle onConflictDoUpdate; replaced prisma/__tests__/standard-mastery.test.ts with co-located integration test (9 real-DB tests)_ [3d1101b]
- [x] Task: Migrate `app/api/ai/recommendations/route.ts` (attempt) — _also added `users.grade_level` Drizzle column (migration 0016) to fill schema gap_ [486de0e]
- [x] Task: Migrate `app/api/ai/update-mastery/route.ts` (attempt, masteryRun) [4d6031b]
- [x] Task: Migrate `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` (attempt, lesson, user) [5e8e3a7]
- [x] Task: Migrate `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` (lesson, lessonCompletion, user) [fd07ed2]
- [x] [a5a5aee] Task: Migrate `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` (attempt, class, lesson, lessonCompletion)
- [x] [44342e3] Task: Migrate `app/api/students/[studentId]/mastery-profile/route.ts` (masteryRun, standard, standardMastery, user)
- [x] Task: Update tests `tests/api/ai-update-mastery.integration.test.ts`, `tests/api/lesson-analytics.integration.test.ts` against Drizzle — _both deleted and replaced with co-located Drizzle integration suites: lesson-analytics in [bdcc5a6], ai-update-mastery in [4d6031b]_
- [-] Task: Measure - User Manual Verification 'Quiz / Mastery' (Protocol in workflow.md) — _deferred to end-of-track batch_

## Phase 3: Gamification

`gamificationProfiles` and `achievements` are **global** — use raw `db`, not `TenantDB` (0.6).

- [x] Task: Migrate `lib/gamification/xp.ts` (gamificationProfile) — _pulled ahead from Phase 3 per 2026-05-24 deviation_ [adf2c3d]
- [x] Task: Migrate `lib/gamification/streak.ts` (gamificationProfile) — _pulled ahead from Phase 3_ [de7d867]
- [x] Task: Migrate `lib/gamification/badges.ts` (achievement, attempt, curriculumUnit, gamificationProfile, lessonCompletion) — _pulled ahead from Phase 3; old mock test replaced with badges.integration.test.ts_ [1fea05c]
- [x] [2cccfe3] Task: Migrate `app/api/students/me/gamification/route.ts` (achievement, gamificationProfile)
- [x] [cce3000] Task: Migrate `app/api/students/[studentId]/gamification-profile/route.ts` (achievement, gamificationProfile)
- [x] [67f676a] Task: Migrate `app/api/students/[studentId]/achievements/route.ts` (achievement)
- [x] Task: Update test `lib/gamification/badges.test.ts` against Drizzle — _completed alongside badges.ts migration; rewritten as badges.integration.test.ts (20 real-DB tests)_ [1fea05c]
- [-] Task: Measure - User Manual Verification 'Gamification' (Protocol in workflow.md) — _deferred to end-of-track batch_

## Phase 4: Classes, assignments & teacher surfaces

- [x] Task: Migrate `lib/services/classes/get-student-classes.ts` (class) [f662db3]
- [x] Task: Migrate `lib/utils/generateJoinCode.ts` (class) and `lib/utils/class-format.ts` (types-only) [41d2b92]
- [x] [20bd954] Task: Rewrite `lib/validations/class.ts` and `lib/validations/student-classes.ts` with hand-written Zod (or `drizzle-zod`) — removes the only two `lib/generated/zod/` importers (0.7)
- [x] [a71dd65] Task: Migrate `app/api/classes/route.ts`, `classes/join/route.ts`, `classes/[classId]/route.ts` (class) — one commit each [c5db00e, 2456154, a71dd65]
- [x] [5904528] Task: Migrate `app/api/classes/[classId]/roster/route.ts` (class, user) and `classes/[classId]/assignments/route.ts` (assignment, class, lesson) [93e31c4, 5904528]
- [x] [6320022] Task: Migrate `app/api/students/[studentId]/assignments/route.ts` (assignment)
- [x] [0323d6c] Task: Migrate `app/api/teachers/dashboard/route.ts` (class, lessonCompletion, standardMastery)
- [x] [dc960ef] Task: Migrate `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` (class, standardMastery) and `lib/interventions/detect-alerts.ts` (types-only)
- [x] [74bdf22] Task: Migrate server components `app/(teacher)/teacher/page.tsx`, `app/(teacher)/teacher/classes/page.tsx` [5e5767a, 74bdf22]
- [x] [7ac8062] Task: Migrate components `class-card.tsx`, `class-detail-header.tsx`, `class-snapshot-panel.tsx`, `teacher-dashboard-classes.tsx`
- [x] Task: Update tests `tests/lib/get-student-classes.test.ts`, `tests/api/class-detail.test.ts`, `classes-join.test.ts`, `classes.test.ts`, `class-analytics-overview.integration.test.ts`, `teacher-dashboard.integration.test.ts` against Drizzle — triage outcome: all 6 files previously handled in earlier route/service migrations; 0 files required action this task.
  • get-student-classes.test.ts: deleted [f662db3]; superseded by `lib/services/classes/get-student-classes.integration.test.ts` [f662db3]
  • class-detail.test.ts: deleted [c5db00e]; superseded by `app/api/classes/[classId]/route.integration.test.ts` [c5db00e]
  • classes-join.test.ts: deleted [a71dd65]; superseded by `app/api/classes/join/route.integration.test.ts` [a71dd65]
  • classes.test.ts: deleted [2456154]; superseded by `app/api/classes/route.integration.test.ts` [2456154]
  • class-analytics-overview.integration.test.ts: deleted [bca632f]; superseded by `app/api/classes/[classId]/analytics/overview/route.integration.test.ts` [bca632f]
  • teacher-dashboard.integration.test.ts: deleted [0323d6c]; superseded by `app/api/teachers/dashboard/route.integration.test.ts` [0323d6c]
- [-] Task: Measure - User Manual Verification 'Classes & Assignments' (Protocol in workflow.md) — _deferred to end-of-track batch_

## Phase 5: AI types & remaining lib

- [x] [59c8251] Task: Migrate `lib/ai/types.ts` (types-only — swap `@prisma/client` type imports for `typeof <table>.$inferSelect`)
- [x] [76227c8] Task: Re-grep `lib/` and `app/api/` for any file still importing Prisma and migrate it (catch-all for inventory drift) — 3 stale Prisma-importing route integration tests deleted (already 100% broken pre-existing: Prisma against Drizzle-managed test DB + route wrappers now delegate to `@reading-advantage/api/routes/auth`; coverage retained in `packages/api/src/__tests__/auth-routes.test.ts`). Remaining `@prisma/client` reference is `lib/prisma.ts` (Phase 7) and doc-comment-only mentions in `lib/enums.ts`, `lib/validations/{class,student-classes}.ts`. [ca51372, fa86cfe, 76227c8]
- [-] Task: Measure - User Manual Verification 'Remaining lib' (Protocol in workflow.md) — _deferred to end-of-track batch_

## Phase 6: Seeds, scripts, generated artifacts & leftover test imports

- [x] [09a22d3] Task: Rewrite or retire `prisma/seed-functions/*` (seed-activity-data, seed-curriculum-units, seed-demo-data, seed-lessons, seed-questions, seed-standards, validate-json) against Drizzle — _all 7 files ported to Drizzle and moved to `scripts/seed/`. One commit per file: [cd53875: validate-json, 0230de5: seed-standards, d1c9fbb: seed-curriculum-units, 2235c8f: seed-lessons, d801264: seed-questions, f73cd5f: seed-demo-data, 09a22d3: seed-activity-data]. `prisma/seed-functions/update-seed-files.ts` remains (out of scope — one-off data transform, not consumed by `seed.ts`); will be cleaned up alongside the broader Prisma removal in Phase 7. `tests/seed-activity.integration.test.ts` Drizzle-ported in 09a22d3 but kept skipped — pre-existing seed-data validator drift (VOCABULARY_MATCH object-shaped options in g3-being-a-scientist-questions.json) causes seedQuestions to process.exit(1); independent of this port. `prisma/seed.ts` entrypoints now break — that is the next task (line 270)._
- [x] [bf82c9e] Task: Rewrite or retire `prisma/seed.ts`, `prisma/seed-demo-users.ts`, root `seed-users.ts`, `create-test-users.ts` against Drizzle [d54afd0: seed.ts (rewrite), c90090d: seed-demo-users (rewrite), bf539c2: seed-users (retired — dead, no callers, no credentials), bf82c9e: create-test-users (rewrite)]
- [x] Task: Migrate `scripts/*` (backfill-mastery [9c24b7a], dev-interventions [ab96871], migrate-lesson-content [54d7cb5], seed-activity-data [09a22d3 — unblocked by line-269 seed-functions rewrite], test-curriculum-endpoint [37f2066]) and `scripts/__tests__/migrate-lesson-content.test.ts` [f6996de]
- [x] Task: Migrate `prisma/migrations/20260429000000_add_lesson_bilingual_fields/backfill-thai-titles.ts` (one-off backfill — retire if already applied) — _ported to Drizzle and moved to `scripts/backfill-thai-titles.ts`; original Prisma .ts deleted; migration.sql left for Phase 7 wholesale removal_ [bb2a7ad]
- [x] [098362f] Task: Fix leftover Prisma imports in already-migrated auth tests — `lib/auth/server.integration.test.ts`, `session-id-separation.test.ts`, `session.integration.test.ts`, `session.unit.test.ts` (DELETED), `lib/prisma.test.ts` (DELETED). Rewritten on Drizzle; auth logic unchanged. 44/44 pass.
- [x] Task: Migrate remaining `tests/` files — `tests/api/*`, `tests/lib/test-utils.ts`, `tests/schema.test.ts`, `tests/seed-activity.integration.test.ts` [f9e642f: tests/lib/test-utils.ts (deleted — no consumers, all-Prisma helpers), 5a47758: tests/schema.test.ts (deleted — Prisma schema-validation suite, obsolete; superseded by Drizzle migrations + co-located *.integration.test.ts), cb04ed5: tests/seed-activity.integration.test.ts (deferred via describe.skip — blocked by Phase 6 line 263 prisma/seed-functions/* migration); LEAVE (no Prisma, behavior-preserving): tests/api/student-classes.test.ts + tests/lib/{bilingual-schema,class-validations,display-preference,from-zod,grade4-normalization,mastery-calculator,seed-validation}.test.{ts,tsx} — 65/65 pass (display-preference pre-existing DOM-matcher failure out of scope)]
- [x] Task: Delete `lib/generated/zod/` entirely (no importers remain after Phase 4) and confirm `prisma-zod-generator` config is removed [eab9aee]
- [-] Task: Measure - User Manual Verification 'Seeds / Scripts / Generated' (Protocol in workflow.md) — _deferred to end-of-track batch_

## Phase 7: Prisma removal & final verification

- [ ] Task: Confirm zero non-generated Prisma references
    - [ ] Sub-task: `grep -rln "@prisma\|@/lib/prisma" apps/science-advantage --include=*.ts --include=*.tsx | grep -vE "node_modules|/.next/|lib/generated"` returns nothing
- [ ] Task: Delete Prisma surface
    - [ ] Sub-task: Delete `apps/science-advantage/lib/prisma.ts` and `lib/prisma.test.ts`
    - [ ] Sub-task: Delete `apps/science-advantage/prisma/` (schema, migrations, seed)
    - [ ] Sub-task: Delete `prisma.config.ts`
    - [ ] Sub-task: Strip `prisma`, `@prisma/client`, `prisma-zod-generator` from `package.json` (and any `prebuild`/`postinstall` prisma scripts)
- [ ] Task: Re-evaluate `ignoreBuildErrors` (tech debt 2026-05-03 `auth_strategy_review`) — remove it if the build is now clean; if two `next` versions still conflict, leave it and update the tech-debt note
- [ ] Task: Verify clean install + build + test
    - [ ] Sub-task: `pnpm install`
    - [ ] Sub-task: `pnpm --filter science-advantage build`
    - [ ] Sub-task: `CI=true pnpm --filter science-advantage test` green
- [ ] Task: Close tech-debt entry `science_auth` (2026-05-03, non-auth Prisma still in use); append any deferred slices to Track 4's spec
- [ ] Task: Add lessons-learned entries for non-obvious reshape handling (≤50-line cap — prune first)
- [-] Task: Measure - User Manual Verification 'Prisma Removal' (Protocol in workflow.md) — _deferred to end-of-track batch_
