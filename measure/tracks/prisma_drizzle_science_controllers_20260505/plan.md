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

- [ ] Task: Add `@reading-advantage/domain` to `apps/science-advantage/package.json`; `pnpm install`; build `db` + `domain`; run migrations (Section 0.1). Verify `import { curriculum } from "@reading-advantage/domain"` type-checks.
- [ ] Task: **Pilot** — migrate `app/api/lessons/[lessonSlug]/route.ts` per the worked example. Pause, confirm the loop with the reviewer before continuing.
- [ ] Task: Measure - User Manual Verification 'Setup' (Protocol in workflow.md)

## Phase 1: Curriculum, lessons & standards

- [ ] Task: Migrate `lib/services/classes/get-class-detail.ts` (class, curriculumUnit)
- [ ] Task: Migrate `lib/ai/recommendation-context.ts` (curriculumUnit, standardMastery)
- [ ] Task: Migrate `lib/schemas/validate-json.ts` — swap `StandardsAlignment` enum import (0.7); confirm `lib/schemas/lesson-slug.schema` paths still resolve
- [ ] Task: Migrate `app/api/lessons/[lessonSlug]/quiz/route.ts` (attempt, gamificationProfile, lesson, lessonCompletion, masteryRun)
- [ ] Task: Migrate `app/api/classes/[classId]/curriculum/route.ts` (class, curriculumUnit, lessonCompletion)
- [ ] Task: Migrate `app/api/classes/[classId]/analytics/overview/route.ts` (class, lesson, lessonCompletion)
- [ ] Task: Migrate `app/api/classes/[classId]/lessons/[lessonId]/analytics/route.ts` (class, lesson, lessonCompletion, questionResponse)
- [ ] Task: Update integration test `lib/schemas/__tests__/curriculum-identifiers.integration.test.ts` (+ `content-migration.test.ts`, `curriculum-identifiers.test.ts`) against Drizzle
- [ ] Task: Measure - User Manual Verification 'Curriculum & Lessons' (Protocol in workflow.md)

## Phase 2: Quiz, attempts & mastery

- [ ] Task: Migrate `lib/services/mastery/mastery-worker.ts` (attempt, masteryRun, standardMastery)
- [ ] Task: Migrate `lib/services/mastery/standard-mastery.ts` (types-only — swap `@prisma/client` imports)
- [ ] Task: Migrate `app/api/ai/recommendations/route.ts` (attempt)
- [ ] Task: Migrate `app/api/ai/update-mastery/route.ts` (attempt, masteryRun)
- [ ] Task: Migrate `app/api/students/[studentId]/lessons/[lessonId]/analytics/route.ts` (attempt, lesson, user)
- [ ] Task: Migrate `app/api/students/[studentId]/lessons/[lessonId]/progress/route.ts` (lesson, lessonCompletion, user)
- [ ] Task: Migrate `app/api/students/[studentId]/classes/[classId]/analytics/route.ts` (attempt, class, lesson, lessonCompletion)
- [ ] Task: Migrate `app/api/students/[studentId]/mastery-profile/route.ts` (masteryRun, standard, standardMastery, user)
- [ ] Task: Update tests `tests/lib/mastery-pipeline.test.ts`, `prisma/__tests__/standard-mastery.test.ts`, `tests/api/ai-update-mastery.integration.test.ts`, `tests/api/lesson-analytics.integration.test.ts` against Drizzle
- [ ] Task: Measure - User Manual Verification 'Quiz / Mastery' (Protocol in workflow.md)

## Phase 3: Gamification

`gamificationProfiles` and `achievements` are **global** — use raw `db`, not `TenantDB` (0.6).

- [ ] Task: Migrate `lib/gamification/xp.ts` (gamificationProfile)
- [ ] Task: Migrate `lib/gamification/streak.ts` (gamificationProfile)
- [ ] Task: Migrate `lib/gamification/badges.ts` (achievement, attempt, curriculumUnit, gamificationProfile, lessonCompletion)
- [ ] Task: Migrate `app/api/students/me/gamification/route.ts` (achievement, gamificationProfile)
- [ ] Task: Migrate `app/api/students/[studentId]/gamification-profile/route.ts` (achievement, gamificationProfile)
- [ ] Task: Migrate `app/api/students/[studentId]/achievements/route.ts` (achievement)
- [ ] Task: Update test `lib/gamification/badges.test.ts` against Drizzle
- [ ] Task: Measure - User Manual Verification 'Gamification' (Protocol in workflow.md)

## Phase 4: Classes, assignments & teacher surfaces

- [ ] Task: Migrate `lib/services/classes/get-student-classes.ts` (class)
- [ ] Task: Migrate `lib/utils/generateJoinCode.ts` (class) and `lib/utils/class-format.ts` (types-only)
- [ ] Task: Rewrite `lib/validations/class.ts` and `lib/validations/student-classes.ts` with hand-written Zod (or `drizzle-zod`) — removes the only two `lib/generated/zod/` importers (0.7)
- [ ] Task: Migrate `app/api/classes/route.ts`, `classes/join/route.ts`, `classes/[classId]/route.ts` (class) — one commit each
- [ ] Task: Migrate `app/api/classes/[classId]/roster/route.ts` (class, user) and `classes/[classId]/assignments/route.ts` (assignment, class, lesson)
- [ ] Task: Migrate `app/api/students/[studentId]/assignments/route.ts` (assignment)
- [ ] Task: Migrate `app/api/teachers/dashboard/route.ts` (class, lessonCompletion, standardMastery)
- [ ] Task: Migrate `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` (class, standardMastery) and `lib/interventions/detect-alerts.ts` (types-only)
- [ ] Task: Migrate server components `app/(teacher)/teacher/page.tsx`, `app/(teacher)/teacher/classes/page.tsx`
- [ ] Task: Migrate components `class-card.tsx`, `class-detail-header.tsx`, `class-snapshot-panel.tsx`, `teacher-dashboard-classes.tsx`
- [ ] Task: Update tests `tests/lib/get-student-classes.test.ts`, `tests/api/class-detail.test.ts`, `classes-join.test.ts`, `classes.test.ts`, `class-analytics-overview.integration.test.ts`, `teacher-dashboard.integration.test.ts` against Drizzle
- [ ] Task: Measure - User Manual Verification 'Classes & Assignments' (Protocol in workflow.md)

## Phase 5: AI types & remaining lib

- [ ] Task: Migrate `lib/ai/types.ts` (types-only — swap `@prisma/client` type imports for `typeof <table>.$inferSelect`)
- [ ] Task: Re-grep `lib/` and `app/api/` for any file still importing Prisma and migrate it (catch-all for inventory drift)
- [ ] Task: Measure - User Manual Verification 'Remaining lib' (Protocol in workflow.md)

## Phase 6: Seeds, scripts, generated artifacts & leftover test imports

- [ ] Task: Rewrite or retire `prisma/seed-functions/*` (seed-activity-data, seed-curriculum-units, seed-demo-data, seed-lessons, seed-questions, seed-standards, validate-json) against Drizzle
- [ ] Task: Rewrite or retire `prisma/seed.ts`, `prisma/seed-demo-users.ts`, root `seed-users.ts`, `create-test-users.ts` against Drizzle
- [ ] Task: Migrate `scripts/*` (backfill-mastery, dev-interventions, migrate-lesson-content, seed-activity-data, test-curriculum-endpoint) and `scripts/__tests__/migrate-lesson-content.test.ts`
- [ ] Task: Migrate `prisma/migrations/20260429000000_add_lesson_bilingual_fields/backfill-thai-titles.ts` (one-off backfill — retire if already applied)
- [ ] Task: Fix leftover Prisma imports in already-migrated auth tests — `lib/auth/server.integration.test.ts`, `session-id-separation.test.ts`, `session.integration.test.ts`, `session.unit.test.ts`, `lib/prisma.test.ts` (auth logic unchanged; just remove the `lib/prisma`/`@prisma/client` imports / test fixtures)
- [ ] Task: Migrate remaining `tests/` files — `tests/api/*`, `tests/lib/test-utils.ts`, `tests/schema.test.ts`, `tests/seed-activity.integration.test.ts`
- [ ] Task: Delete `lib/generated/zod/` entirely (no importers remain after Phase 4) and confirm `prisma-zod-generator` config is removed
- [ ] Task: Measure - User Manual Verification 'Seeds / Scripts / Generated' (Protocol in workflow.md)

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
- [ ] Task: Measure - User Manual Verification 'Prisma Removal' (Protocol in workflow.md)
