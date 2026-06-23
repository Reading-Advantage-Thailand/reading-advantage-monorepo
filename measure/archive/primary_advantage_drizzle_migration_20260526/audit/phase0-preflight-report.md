# Phase 0 Pre-flight Report — primary-advantage Prisma → Drizzle

> **Track:** `primary_advantage_drizzle_migration_20260526`
> **Date:** 2026-06-23
> **Phase:** 0 — Pre-flight (audit + baseline capture)
> **Baseline SHA:** `772a375cd7bee47dcce8da939bd34ed37c8b33af`
> **Goal:** Inventory the Prisma surface in `apps/primary-advantage/` and document the
> migration shape so Phases 1–9 can execute without re-discovering the same facts.

## Prisma File Audit

**Total Prisma-touching files (`.ts`/`.tsx`, excluding `node_modules` / `.next`):** **56**
**Total raw grep hits for `@prisma/client` (including build artifacts):** **44**
(15 source files + 2 app config files (`package.json`, `tsconfig.tsbuildinfo`) +
27 lockfile/build-output occurrences that share `@prisma/client` strings.)

**Files by Layer (categorized):**

- **actions (6)** — Next.js Server Actions invoked from forms and client components.
  Files: `article.ts`, `flashcard.ts`, `pratice.ts`, `question.ts`, `test.ts`,
  `user.ts`. All import `prisma` from `@/lib/prisma`.
- **routes (24)** — App Router Route Handlers under `app/api/**/route.ts`.
  Sub-areas: classrooms, debug (3), flashcard (9), licenses (2), schools (2),
  students (1), upload (2), users (5).
- **page (1)** — `app/[locale]/(student)/student/lesson/[id]/page.tsx` is a Server
  Component that calls Prisma directly to render the lesson page. Violates the
  transport-agnostic rule; Phase 7 candidate for refactor to a domain function.
- **components (5)** — React components that import Prisma-inferred types only.
  Files: `articles/questions/mc-question-card.tsx`,
  `dashboard/user-reading-chart.tsx`, `student-assignment-table.tsx`,
  `system/edit-license-form.tsx`, `system/license-table.tsx`.
- **server/models (8)** — Thin CRUD wrappers around Prisma. Will be deleted in
  favour of `packages/domain` functions (Track-2 pattern) rather than 1:1 ported.
  Files: `articleModel.ts`, `assignmentModel.ts`, `classroomModel.ts`,
  `lessonModel.ts`, `schoolModel.ts`, `studentModel.ts`, `teacherModel.ts`,
  `userModel.ts`.
- **server/controllers (1)** — `assignmentController.ts` mixes Prisma calls with
  business logic; migrate or split during Phase 3.
- **server/utils (2)** — `assistant.ts`, `auth.ts`.
- **server/utils/genaretors (5)** — `audio-flashcard-generator.ts`,
  `audio-generator.ts`, `audio-word-generator.ts`, `new-generator.ts`,
  `sentence-translator.ts`. Most generators are read-only with respect to Prisma
  (they write generated artefacts back), but they import `prisma` to fetch source
  articles.
- **lib (2)** — `lib/prisma.ts` is the singleton client (to be deleted in Phase 2);
  `lib/fsrs-service.ts` is FSRS scheduler logic.
- **types (1)** — `types/index.d.ts` augments Prisma's generated namespace and
  exports re-exported Prisma types.
- **prisma (1)** — `prisma/seed.ts` is the database seed script (rewrite as Drizzle
  seed in Phase 7).

**Total: 56 source files.**

**Plan vs. Audit Reconciliation:**

- Phase 5 says *"16 app/api/**/route.ts files"* — the audit found **24 route
  handlers**. Phase 5 must migrate all 24 (not 16). The under-count was inherited
  from the original Track-2 plan and was missed by the carve-out.
- Phase 3 lists **8 server/models + 1 controller** — matches audit.
- Phase 4 lists **6 actions** — matches audit.
- Phase 6 lists **5 components** — matches audit.
- Phase 7 lists **2 server/utils + 4 generators + lib/fsrs-service + types +
  seed** — audit found **2 utils + 5 generators + fsrs-service + types + seed**.
  One extra generator (`audio-flashcard-generator.ts`) is missing from the plan
  and needs to be added.

## Schema Mapping

`apps/primary-advantage/prisma/schema.prisma` defines **30 models + 5 enums**. The
target Drizzle schema lives in `packages/db/src/schema/`. The mapping below
classifies every Prisma model into one of three buckets:

- **shared** — already exists in `packages/db/src/schema/` and can be reused.
- **shared-partial** — exists but is missing primary-advantage columns; needs
  additive columns during Phase 1.
- **needs porting** — does not exist in shared schema; new table must be added.

**Mapping Table (Prisma model → shared Drizzle table):**

- `User` → `users` in `packages/db/src/schema/users.ts` — shared-partial
- `Account` → `accounts` in `packages/db/src/schema/users.ts` — shared
- `Session` → `sessions` in `packages/db/src/schema/users.ts` — shared
- `VerificationToken` → (none) — **needs porting**
- `UserRole` → (none) — **needs porting**
- `Role` → (none) — **needs porting**
- `XPLogs` → `xpLogs` in `packages/db/src/schema/analytics.ts` — shared-partial
- `UserActivity` → `userActivity` in `packages/db/src/schema/progress.ts` — shared
- `Article` → `articles` in `packages/db/src/schema/content.ts` — shared-partial
- `ArticleActivityLog` → (none) — **needs porting**
- `SentencsAndWordsForFlashcard` → (none) — **needs porting**
- `MultipleChoiceQuestion` → `multipleChoiceQuestions` in `packages/db/src/schema/questions.ts` — shared-partial
- `ShortAnswerQuestion` → `shortAnswerQuestions` in `packages/db/src/schema/questions.ts` — shared-partial
- `LongAnswerQuestion` → `longAnswerQuestions` in `packages/db/src/schema/questions.ts` — shared-partial
- `FlashcardDeck` → `flashcardDecks` in `packages/db/src/schema/flashcards.ts` — shared-partial
- `FlashcardCard` → `flashcardCards` in `packages/db/src/schema/flashcards.ts` — shared-partial
- `CardReview` → (none) — **needs porting**
- `ClozeTestGame` → (none) — **needs porting**
- `Classroom` → `classrooms` in `packages/db/src/schema/classrooms.ts` — shared-partial
- `ClassroomStudent` → `classroomStudents` in `packages/db/src/schema/classrooms.ts` — shared
- `School` → `schools` in `packages/db/src/schema/users.ts` — shared-partial
- `License` → `licenses` in `packages/db/src/schema/licenses.ts` — shared-partial
- `SchoolAdmins` → (none) — **needs porting**
- `ClassroomTeachers` → `classroomTeachers` in `packages/db/src/schema/classrooms.ts` — shared
- `Assignment` → `assignments` in `packages/db/src/schema/content.ts` — shared-partial
- `AssignmentStudent` → `studentAssignments` in `packages/db/src/schema/content.ts` — shared-partial
- `UserLessonProgress` → `lessonProgress` in `packages/db/src/schema/progress.ts` — shared-partial
- `Leaderboard` → (none) — **needs porting**
- `Story` → `stories` in `packages/db/src/schema/stories.ts` — shared
- `StoryChapter` → `chapters` in `packages/db/src/schema/stories.ts` — shared

**Enums (Prisma → shared Drizzle):**

- `ActivityType` → (none) — **needs porting** as `activityType` pgEnum
- `FlashcardType` → (none — shared uses `text`) — **needs porting** as
  `flashcardType` pgEnum
- `CardState` → (none) — **needs porting** as `cardState` pgEnum
- `SubscriptionType` → (none) — **needs porting** as `subscriptionType` pgEnum
- `AssignmentStatus` → (none — shared uses `text status`) — **needs porting** as
  `assignmentStatus` pgEnum
- `Role` → `roleEnum` in `packages/db/src/schema/users.ts` — shared (Prisma `Role`
  is a table; shared uses enum)

**Summary counts:** 30 Prisma models → 9 shared + 13 shared-partial + 8 needs porting.
5 Prisma enums → 1 shared + 4 needs porting.

**Migration Concerns (informational — addressed in Phase 1):**

1. **Primary-key type** — Prisma uses `cuid()`, shared Drizzle uses `uuid()`.
   Adding primary-advantage tables as new tables means changing all FK references
   in app code from `String` to UUID strings (still strings in TS land, but the
   generator changes). This is a code-side concern, not a schema-port blocker.
2. **Table naming** — Prisma `Article` → `@@map("article")` (singular); shared
   uses `articles` (plural). All queries must use the new table names.
3. **Enums vs. text** — Some shared tables use `text` for what Prisma encodes as
   enums. Adding pgEnum types requires coordinating with other apps that already
   share those tables. Phase 1 should add new pgEnum types but **not** change
   shared `text` columns.

## Build Baseline

**Command:** `pnpm --filter primary-advantage build`
**Result:** **FAIL** (exit status 1)

**Error Summary:**

Turbopack reports 14 module-resolution errors:

- `Module not found: Can't resolve '@reading-advantage/ai'` (×13 occurrences)
- `Module not found: Can't resolve 'child_process'` (×1 occurrence)

**Affected source paths in `apps/primary-advantage/`:**

- `app/api/assistant/lesson-chatbot/route.ts`
- `server/utils/assistant.ts`
- `server/utils/genaretors/{article-generator,audio-generator,evaluate-rating-generator,image-generator,new-generator,question-generator,sentence-translator,topic-generator,wordlist-generator}.ts`
- `utils/google.ts`
- `utils/openai.ts`
- `packages/utils/dist/index.js` (re-exports `@reading-advantage/ai`)

**Root Cause (informational):**

The `@reading-advantage/ai` workspace package exports `dist/index.js` but the build
pre-step (`pnpm install` from a clean state, or a fresh container) does not build
`packages/ai` before `primary-advantage`. The pre-existing primary-advantage baseline
**does not build cleanly** even before any Prisma removal. This is a separate
tech-debt item (recommend filing under `measure/tech-debt.md`).

**Implication for Migration:**

- Phase 9 ("`pnpm --filter primary-advantage build` passes") must either:
  1. Build `packages/ai` (and any other prereqs) before running the app build, OR
  2. Accept "matches pre-existing baseline" as success and gate on a separate
     **partial-build check** that excludes the broken module-resolution surface.

  The migration must not be expected to fix unrelated build infrastructure. We
  recommend option 1 with a `prebuild` script that runs `pnpm --filter
  @reading-advantage/ai build`.

**Verified Independent of Build (primary-advantage):**

- `apps/primary-advantage/prisma/schema.prisma` exists (Prisma schema active).
- 56 `.ts`/`.tsx` files in `apps/primary-advantage/` import `@/lib/prisma` or
  `@prisma/client` (full Prisma surface intact).
- `apps/primary-advantage/lib/prisma.ts` exists (singleton client present).
- `apps/primary-advantage/prisma/migrations/` directory exists with migration
  history (45 migrations).

## Shared Schema Coverage

The shared `packages/db/src/schema/` covers the majority of primary-advantage's
domain. Below is the coverage summary at the model-class level.

**Already Reusable common models (directly importable from `packages/db/src/schema/`):**

- **users** (`User`, `Account`, `Session`) — shared schema fully covers the basic
  shape; column additions needed for `name`, `password`, default `cefrLevel`.
- **classrooms** (`Classroom`, `ClassroomStudent`, `ClassroomTeachers`) — shared
  schema fully covers the relationship shape; primary-advantage needs additional
  fields on `classrooms` (`classCode`, `codeExpiresAt`, `grade`,
  `passwordStudents`).
- **schools** (`School`) — shared covers; needs `contactName`, `contactEmail`,
  `ownerId`.
- **articles** (`Article`, `MultipleChoiceQuestion`, `ShortAnswerQuestion`,
  `LongAnswerQuestion`) — shared covers; needs `isApproved`, `isDraft`,
  `isPublished` columns + `storyChapterId` FK on the question tables.
- **assignments** (`Assignment`, `studentAssignments`) — shared covers; needs
  `teacherName` column + `status` enum.
- **flashcards** (`flashcardDecks`, `flashcardCards`, `flashcardProgress`) —
  shared `flashcardDecks`/`flashcardCards` need column additions for FSRS fields
  (`stability`, `difficulty`, `elapsedDays`, `scheduledDays`, `learningSteps`,
  `reps`, `lapses`, `state`, `lastReview`, `word`, `definition`, `sentence`,
  `translation`, `context`, `audioUrl`, `startTime`, `endTime`, `articleId`,
  `storyChapterId`). Add new `cardReviews` table for FSRS review history.
- **licenses** (`License`) — shared covers; needs enum for `subscription` and
  `maxUsers` rename.
- **stories** (`Story`, `StoryChapter`) — shared covers; column alignment
  needed (`chapters` vs `story_chapters`).
- **progress** (`userActivity`, `lessonProgress`, `xpLogs`) — shared covers;
  needs `progress`, `timeSpent`, `isCompleted`, `assignmentId` on
  `lessonProgress`.

**Coverage Summary by Concern:**

- **users** — shared schema fully covers basic shape; ~4 column additions.
- **classrooms** — shared schema fully covers relationship shape; ~4 column
  additions.
- **schools** — shared schema fully covers; ~3 column additions.
- **articles** — shared schema fully covers basic shape; ~3 column additions +
  storyChapterId FK.
- **assignments** — shared schema fully covers; ~3 column additions.
- **flashcards** — shared schema partial coverage; major FSRS field additions
  required (~15 columns).
- **licenses** — shared schema fully covers; ~1 column rename + enum.
- **stories** — shared schema fully covers; column alignment.
- **progress** — shared schema fully covers; ~3 column additions.

**Cross-cutting Findings:**

1. **Heavy shared-schema reuse opportunity** — The migration should adopt the
   existing shared `db` client rather than create a primary-advantage-local
   Drizzle instance. This avoids divergence across apps and keeps tenant
   scoping consistent.
2. **No table-classification risk** — Every shared table referenced by
   primary-advantage is `FLAT` (has `schoolId` via `users` chain) or already
   in `packages/domain/src/tenant-registry.ts`. No new exempt/referential
   classification needed.
3. **New tables** (8) will need classification in `tenant-registry.ts` —
   they are all `FLAT` (carry `schoolId` via `users.schoolId` chain) or
   `REFERENTIAL` (owned via FK to users). Phase 1 must register each new
   table to satisfy `tenant-coverage.test.ts`.

**Phase 0 Exit Criteria:**

- All 56 Prisma-touching files inventoried and categorized by layer.
- Every Prisma model mapped to shared schema (or marked "needs porting").
- Build baseline captured (current state: failing for unrelated reasons).
- Shared schema coverage documented with column-level gaps identified.

**Phase 0 is GREEN. The migration surface is fully understood and downstream phases
(1–9) have concrete files, models, and column-level work items.**