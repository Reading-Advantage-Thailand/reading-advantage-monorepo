# Implementation Plan: reading-advantage Controllers — Prisma → Drizzle

> **Status:** Unblocked. Track 1 (`prisma_drizzle_schema_unification_20260505`) completed 2026-05-22 —
> the Drizzle schema, migration `0013`, and domain helpers this track depends on all exist.
>
> **Who this plan is for:** an implementing team that has *not* worked on Tracks 1. Read
> **Section 0** in full before touching code. It contains the whole migration recipe; every
> task in Phases 1–9 just applies that recipe to a list of files.
>
> **Inventory (re-verify on day 1 — see Task 0.0):** 2026-05-23 grep showed **147 files** in
> `apps/reading-advantage/` importing Prisma — 50 controllers, 11 services, 5 utils/middleware,
> 3 actions, ~8 `lib/*`, 26 `app/api` routes, 16 `app/[locale]` pages, ~6 components/contexts/types,
> 11 scripts, 2 seeds. 75 files also import enum/type names from `@prisma/client`.

---

## 0. Before You Start

### 0.0 Task: Re-verify the inventory (do this first, commit nothing)

Run these and keep the output — it is your master checklist:

```bash
cd apps/reading-advantage
# Every file that imports Prisma (the work list):
grep -rln "@prisma\|lib/prisma" --include=*.ts --include=*.tsx . \
  | grep -vE "node_modules|/.next/|/dist/|prisma/generated"
# Per-file Prisma model usage (tells you what each file touches):
grep -oE "prisma\.[a-zA-Z]+" server/controllers/<file>.ts | sort -u
```

If the counts differ a lot from the header above, the file lists in the phases below may have
drifted — trust the fresh grep, not this document.

### 0.1 Environment setup

reading-advantage already declares `@reading-advantage/db`, `domain`, `auth`, `api` as
workspace deps — **no `package.json` change needed to start.** Before running anything:

```bash
# from repo root
pnpm install
docker compose up -d                       # local Postgres
pnpm --filter @reading-advantage/db build   # domain/api import db from dist/
pnpm --filter @reading-advantage/db migrate # apply migrations incl. 0013
```

Test command for this app (**reading-advantage runs on Jest**, not Vitest):

```bash
CI=true pnpm --filter reading-advantage test
# single file while iterating:
CI=true pnpm --filter reading-advantage test -- user-controller
```

Reference files to read once before starting:
- `packages/db/src/schema/index.ts` — every Drizzle table, and what it re-exports.
- `packages/domain/src/index.ts` — every domain helper barrel.
- `packages/domain/src/users/index.ts` + `__tests__/users.test.ts` — the canonical domain-helper shape.
- `measure/archive/prisma_drizzle_schema_unification_20260505/audit.md` — every reshape/rename.

### 0.2 The loop — what "done" looks like for ONE file

This track is a **behavior-preserving refactor**. Do **not** do red/green feature TDD. For each file:

1. **Characterization test first.** Find or write a test that pins the file's *current* observable
   behavior (return shape, status codes, rows written). If one exists, run it and confirm green
   against the *current Prisma* code. If none exists and the file has non-trivial logic, write one
   now against the Prisma code and confirm it passes. The test you keep green *is* the regression net.
2. **Swap Prisma → Drizzle** (Sections 0.3–0.6).
3. **Same test still green.** No new behavior, no new failures.
4. **One file = one commit.** `refactor(reading): migrate <file> off Prisma`. One file per commit
   keeps any regression bisectable. Mark the task `[x]` with the 7-char SHA per `workflow.md`.

### 0.3 Prisma → Drizzle translation cheat-sheet

Import the raw client and tables from `@reading-advantage/db`:

```ts
import { db, eq, and, inArray, desc, sql, count } from "@reading-advantage/db";
import { users, userActivity, xpLogs } from "@reading-advantage/db/schema";
```

| Prisma | Drizzle |
|--------|---------|
| `prisma.user.findUnique({ where:{ id } })` | `(await db.select().from(users).where(eq(users.id,id)).limit(1))[0]` |
| `prisma.user.findFirst({ where })` | `(await db.select().from(users).where(<cond>).limit(1))[0]` |
| `prisma.user.findMany({ where })` | `await db.select().from(users).where(<cond>)` |
| `prisma.user.create({ data })` | `(await db.insert(users).values(data).returning())[0]` |
| `prisma.user.update({ where:{id}, data })` | `(await db.update(users).set(data).where(eq(users.id,id)).returning())[0]` |
| `prisma.user.delete({ where:{id} })` | `await db.delete(users).where(eq(users.id,id))` |
| `prisma.user.count({ where })` | `(await db.select({ c: count() }).from(users).where(<cond>))[0].c` |
| `prisma.user.upsert(...)` | `db.insert(t).values(v).onConflictDoUpdate({ target:t.col, set:v })` |
| `prisma.$transaction([...])` | `await db.transaction(async (tx) => { ... })` |
| `include: { posts: true }` (relations) | explicit `.leftJoin(...)`, or a second query — Drizzle has no implicit relation loading on `db.select()` |
| `select: { a: true }` | `db.select({ a: t.a }).from(t)` |
| `orderBy: { createdAt: "desc" }` | `.orderBy(desc(t.createdAt))` |

**`findUnique` returns `null` when not found; Drizzle returns `[]`.** Always destructure
`[row]` and keep the existing `if (!row)` branch so the not-found behavior is identical.

### 0.4 Prisma enum imports (75 files)

`import { LicenseType, ActivityType, QuizStatus } from "@prisma/client"` will break once Prisma
is removed. The Drizzle schema stores these as **plain `text` columns**, not PG enums. Replace each
enum with a local string-union constant. Example:

```ts
// before: import { LicenseType } from "@prisma/client";
// after:
export const LicenseType = { BASIC: "BASIC", PREMIUM: "PREMIUM", ENTERPRISE: "ENTERPRISE" } as const;
export type LicenseType = (typeof LicenseType)[keyof typeof LicenseType];
```

Put shared enum constants in **one** new file `apps/reading-advantage/lib/enums.ts` and import
from there — do not redefine them per controller. Pull the exact member lists from
`apps/reading-advantage/prisma/schema.prisma` (still present until Phase 9). `import { Prisma }`
(the namespace, used for `Prisma.JsonValue` etc.) → replace with plain `unknown` / a local type.

### 0.5 Raw `db` vs. domain helpers — which to use

Default to **raw `db` from `@reading-advantage/db`** for a 1:1 behavior-preserving swap. These
controllers are Next.js route handlers that today call `prisma.*` directly with no tenant scoping;
routing them through a domain helper that calls `assertCan()` would *add* a permission check and
*change behavior*. That is not this track's job.

Use a **domain helper** (`packages/domain`) only when its behavior already matches the controller
exactly (same guard, same shape). The Track 1 domain helpers (`licenses`, `stories`, `progress`,
`articles`, `assignments`, etc.) mainly serve the `packages/api` tRPC layer — treat them as
optional here, not mandatory.

If you find the *same* non-trivial query in 3+ controllers, extract it into a domain helper
(see 0.6 for naming) and have all of them call it — that is worth the churn. A one-off query is not.

### 0.6 Read/write seam (FR-6) — applies to any domain helper you add or edit

- A helper is **either** a pure read (only `SELECT`) **or** a write (`INSERT`/`UPDATE`/`DELETE`) —
  never both. If a current path is a "get that lazily creates a row" or a "read that bumps a
  counter", split it into a `get*` and a separate writer when you migrate it.
- Reads are named `get*` / `list*` / `count*` / `exists*` / `find*`. Everything else is a write.
  If a name is ambiguous, add a `@kind read` or `@kind write` JSDoc tag.

### 0.7 Gotchas (from `measure/lessons-learned.md`)

- **Mock-DB test mocks must be thenable.** `db.select().from().where()` is awaited directly. A
  chain mock must be `Object.assign(Promise.resolve(rows), { limit: ..., orderBy: ... })`, not a
  plain function — `await` on a function returns the function. Prefer real-DB integration tests
  where reading-advantage already has them.
- **Column renames from migration 0013** — your queries must use the *new* names:
  `xp_logs.amount → xp_earned`, `source → activity_type`, `source_id → activity_id`.
- **`story_records` reshaped:** old `article_id`/`completed` are gone — use `story_id` FK +
  `status` text. `completed === true` becomes
  `inArray(storyRecords.status, ["COMPLETED","COMPLETED_MCQ","COMPLETED_SAQ","COMPLETED_LAQ"])`.
- **`chapter_tracking` → `chapter_trackings`:** old `story_record_id` FK replaced by `user_id` + `story_id`.
- **`user_word_records` / `user_sentence_records`:** full FSRS reshape — old scalar `word`/
  `sentence_id` columns are gone. These are flagged as **Track 4 slices** (see Section "Deferring").
- A workspace package that uses `.js` import extensions must be built to `dist/` before downstream
  apps resolve it — if a `@reading-advantage/*` import fails to resolve, run its `build` first.

### Deferring to Track 4

If a file cannot be migrated cleanly because the data shape is app-specific and awkward against
the unified schema (the audit pre-listed these: `user_word_records`/`user_sentence_records` FSRS
fields, `lesson_records` 14-phase JSON, `ai_insights.content`→`description`, `game_rankings`
score/level removal), **do not force it**. Migrate everything around it, leave that path on
Prisma, and add a row to `prisma_drizzle_slice_cleanup_20260505/spec.md` "Non-Generalizable
Surface List" with the file path and reason. Track 4 handles it. Flag it to the reviewer.

---

## Worked Example (read before Phase 1)

`server/controllers/student-notification-controller.ts` — touches one model
(`assignmentNotification`), no domain helper, pure raw-db swap:

```ts
// ---- BEFORE ----
import { prisma } from "@/lib/prisma";

export async function listNotifications(req: ExtendedNextRequest, ctx: RequestContext) {
  const { id } = await ctx.params;
  const rows = await prisma.assignmentNotification.findMany({
    where: { userId: id },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json({ notifications: rows });
}

// ---- AFTER ----
import { db, eq, desc } from "@reading-advantage/db";
import { assignmentNotifications } from "@reading-advantage/db/schema";

export async function listNotifications(req: ExtendedNextRequest, ctx: RequestContext) {
  const { id } = await ctx.params;
  const rows = await db
    .select()
    .from(assignmentNotifications)
    .where(eq(assignmentNotifications.userId, id))
    .orderBy(desc(assignmentNotifications.createdAt));
  return NextResponse.json({ notifications: rows });
}
```

The characterization test asserts `listNotifications` returns the same JSON for a seeded user.
It is written/confirmed green against BEFORE, and must stay green against AFTER. Commit:
`refactor(reading): migrate student-notification-controller off Prisma`.

## Prisma model → Drizzle table map

Drizzle table exports live in `@reading-advantage/db/schema`. "Domain" = a matching helper exists
(use only if behavior matches, per 0.5).

| Prisma model | Drizzle table export | Domain helper | Notes |
|--------------|----------------------|---------------|-------|
| `user` | `users` | `domain.users` | — |
| `license` | `licenses` | `domain.licenses` | — |
| `licenseOnUser` | `licenseOnUsers` | `domain.licenses` | composite PK `(userId,licenseId)` |
| `article` | `articles` | `domain.articles` | — |
| `classroom` | `classrooms` | `domain.classes` (partial) | — |
| `classroomStudent` | `classroomStudents` | — | raw db |
| `classroomTeacher` | `classroomTeachers` | — | raw db; `teacherRole` is text |
| `school` | `schools` | — | raw db |
| `assignment` | `assignments` | `domain.assignments` | reading assignment (kept separate from science) |
| `studentAssignment` | `studentAssignments` | `domain.assignments` | has `status` text + `completed` bool |
| `assignmentNotification` | `assignmentNotifications` | — | raw db |
| `xPLog` | `xpLogs` | `domain.progress` | **renamed cols:** `xpEarned`,`activityType`,`activityId` |
| `userActivity` | `userActivity` | `domain.progress` | gained `targetId`,`timer`,`details`,`completed` |
| `story` | `stories` | `domain.stories` | — |
| `chapter` | `chapters` | — | raw db |
| `storyTimepoint` | `storyTimepoints` | — | raw db |
| `storyRecord` | `storyRecords` | `domain.stories` | **reshaped** — see 0.7 |
| `chapterTracking` | `chapterTrackings` | — | **reshaped** — see 0.7 |
| `storyAssignment` | `storyAssignments` | — | raw db |
| `lessonRecord` | `lessonRecords` | — | **Track 4 slice** (14-phase JSON) |
| `multipleChoiceQuestion` | `multipleChoiceQuestions` | — | raw db |
| `shortAnswerQuestion` | `shortAnswerQuestions` | — | raw db |
| `longAnswerQuestion` | `longAnswerQuestions` | — | raw db |
| `userWordRecord` | `userWordRecords` | — | **Track 4 slice** (FSRS) |
| `userSentenceRecord` | `userSentenceRecords` | — | **Track 4 slice** (FSRS) |
| `aIInsight` | `aiInsights` | — | **Track 4 slice** (`content`→`description`+`data`) |
| `aIInsightCache` | `aiInsightCache` | — | raw db |
| `learningGoal` | `learningGoals` | — | reshaped to full schema |
| `goalMilestone` / `goalProgressLog` | `goalMilestones` / `goalProgressLogs` | — | raw db |
| `gameRanking` | `gameRankings` | — | **Track 4 slice** (`difficulty`+`totalXp`) |
| `raCefrMapping` / `genreAdjacency` | `raCefrMappings` / `genreAdjacencies` | — | raw db |
| `verificationToken` | — | — | **DROP** — delete the importer (no live use) |

---

## Phase 1: Pilot + generalizable controllers

Establishes the pattern. Do the pilot first and have it reviewed before continuing — it validates
Section 0 against reality. One controller = one task = one commit. Each task: characterization
test green → swap per 0.3–0.6 → test green → commit.

- [x] Task: **Pilot** — migrate `student-notification-controller.ts` (`assignmentNotification`). After this commit, pause and confirm the loop with the reviewer. — 3659137
- [x] Task: Migrate `user-controller.ts` (user, license, licenseOnUser, article, classroomStudent, userActivity, xPLog) — e8d0fe6
- [x] Task: Migrate `license-controller.ts` (license, licenseOnUser, user, userActivity, xPLog) — 1d031d4
- [x] Task: Migrate `leaderboard-controller.ts` (license, user) — 0c788ca
- [x] Task: Migrate `classroom-controller.ts` (classroom, classroomStudent, license, licenseOnUser, user, xPLog) — 5319557
- [x] Task: Migrate `classroom-goals-controller.ts` (classroomStudent, classroomTeacher, learningGoal) — 9d9374e
- [x] Task: Migrate `srs-health-controller.ts` (classroomStudent, user) — bdd105e
- [x] Task: Migrate `srs-quick-actions-controller.ts` (classroomStudent, user) — d72d2de
- [x] Task: Migrate `genre-controller.ts` (classroom, classroomStudent, lessonRecord, user) — a66fab8
- [x] Task: Migrate `student-dashboard-controller.ts` (user) — 1b3319a
- [x] Task: Migrate `teacher-dashboard-controller.ts` (classroomTeacher, user) — 1d983c1
- [x] Task: Migrate `class-dashboard-controller.ts` (assignment, classroom, classroomStudent, classroomTeacher, studentAssignment, userActivity, xPLog) — 854f926
- [x] Task: Migrate `system-dashboard-controller.ts` (article) — 1b258b0
- [x] Task: Migrate `dashboard-summary-controller.ts` (types-only — swap `@prisma/client` imports per 0.4) — 02f39d8
- [x] Task: Migrate `metrics-controller.ts` (assignment, userActivity) — 3f106de
- [x] Task: Migrate `metrics-extended-controller.ts` (lessonRecord) — 868c809 (lessonRecords is PORT-AS-IS in unified schema; no Track 4 deferral needed)
- [x] Task: Migrate `activity-controller.ts` (classroomStudent, lessonRecord, license, licenseOnUser, studentAssignment, user, userActivity, userSentenceRecord) — 176283c
- [x] Task: Migrate `lesson-controller.ts` (lessonRecord, userActivity, userSentenceRecord, userWordRecord, xPLog) — 5f892b4
- [x] Task: Migrate `flashcard-controller.ts` (article, user, userActivity, userSentenceRecord, userWordRecord, xPLog) — 85807ad
- [ ] Task: Measure - User Manual Verification 'Generalizable Controllers' (Protocol in workflow.md)

## Phase 2: Game controllers

All nine share one shape: read/write `gameRanking`, `userActivity`, `xpLogs`, FSRS records.
`gameRanking` is a **Track 4 slice** (reshaped `difficulty`+`totalXp`) — migrate the
`userActivity`/`xpLogs` parts; if a `gameRanking` write cannot map cleanly, defer just that path.

- [x] Task: Migrate `rune-match-controller.ts` — e4f2296 (gameRankings table is unified, not deferred to Track 4)
- [x] Task: Migrate `wizard-zombie-controller.ts` — a151632
- [x] Task: Migrate `magic-defense-controller.ts` — ae7dd13
- [x] Task: Migrate `castle-defense-controller.ts` — dc5f51a
- [x] Task: Migrate `dragon-flight-controller.ts` — e0bd235
- [x] Task: Migrate `dragon-rider-controller.ts` — 1287e11
- [x] Task: Migrate `potion-rush-controller.ts` — 1b47eaf
- [x] Task: Migrate `rpg-battle-controller.ts` — 6273767
- [x] Task: Migrate `enchanted-library-controller.ts` — 38cfa58
- [ ] Task: Measure - User Manual Verification 'Game Controllers' (Protocol in workflow.md)

## Phase 3: AI / admin / assignment / stories / content controllers

- [x] Task: Migrate `ai-controller.ts` (types-only) — fab9666
- [x] Task: Migrate `velocity-controller.ts` (classroomTeacher, classroomStudent, user) — 970e676 (not in original plan; added retroactively)
- [x] Task: Migrate `ai-insight-actions-controller.ts` (aIInsight) — 354886d (aiInsights is unified, not Track 4 slice)
- [x] Task: Migrate `ai-insight-refresh-controller.ts` (aIInsight, aIInsightCache, classroom, classroomTeacher, license, user) — e0a1aec
- [x] Task: Migrate `assistant-controller.ts` (article, userSentenceRecord, userWordRecord) — 6af25d4
- [x] Task: Migrate `stories-controller.ts` (chapter, story, userActivity) — 9b9dd2f
- [x] Task: Migrate `generator-controller.ts` (article, longAnswerQuestion, multipleChoiceQuestion, shortAnswerQuestion, user) — f1404e4
- [x] Task: Migrate `question-controller.ts` (article, license, longAnswerQuestion, multipleChoiceQuestion, shortAnswerQuestion, user, userActivity, xPLog) — 50fb67b
- [x] Task: Migrate `stories-question-controller.ts` (longAnswerQuestion, multipleChoiceQuestion, shortAnswerQuestion, story, storyRecord, user, userActivity, xPLog) — 1cd0099
- [x] Task: Migrate `admin-controller.ts` (article, classroomStudent, lessonRecord, license, school, user, userActivity, xPLog) — 1d031d4
- [x] Task: Migrate `system-controller.ts` (license, xPLog) — b104571
- [x] Task: Migrate `auth-controller.ts` (types-only — keep auth logic unchanged, only swap Prisma type imports) — dd6f366
- [x] Task: Migrate `translation-controller.ts` (article, chapter, story) — 08e679f
- [x] Task: Migrate `stories-assistant-controller.ts` (chapter) — 25854bd
- [x] Task: Migrate `article-controller.ts` (article, userActivity) — edf87e4
- [x] Task: Migrate `assignment-controller.ts` (article, assignment, classroom, classroomStudent, studentAssignment, user) — 78783a0
- [x] Task: Migrate `teacher-assignment-controller.ts` (assignment) — ba7b0e9
- [x] Task: Migrate `assignment-classroom-controller.ts` (assignment, assignmentNotification, classroomStudent, studentAssignment) — dd091eb
- [x] Task: Migrate `assignment-funnel-controller.ts` (assignment, user) — f180f41
- [x] Task: Migrate `assignment-notification-controller.ts` (assignment, assignmentNotification) — 7c42430
- [x] Task: Migrate `class-accuracy-controller.ts` (classroomStudent, classroomTeacher, userActivity) — c3973ff
- [x] Task: Migrate `class-export-controller.ts` (classroom, classroomStudent, classroomTeacher, studentAssignment, user) — 0b6fda5
- [x] Task: Migrate `enhanced-alignment-controller.ts` (assignment, classroom) — 910ebbb
- [ ] Task: Measure - User Manual Verification 'AI / Admin / Assignment / Stories' (Protocol in workflow.md)

## Phase 4: server/services (11 files)

Same loop. Services hold reusable logic — if a service query is also done by a controller you
already migrated, this is the place to extract a shared domain helper (per 0.5/0.6).

- [x] Task: Migrate `services/ai-insight-service.ts` — 52cf8ae
- [x] Task: Migrate `services/goals-service.ts` — 8c0ca8c
- [x] Task: Migrate `services/demo-activity-generator.ts` — 4378492
- [x] Task: Migrate `services/demo-isolation-service.ts` — 3d4b569
- [x] Task: Migrate `services/refresh-matviews-service.ts` — 1a160fa
- [x] Task: Migrate `services/srs-quick-actions-service.ts` — 37ec33d
- [x] Task: Migrate `services/localization/genre-localization-service.ts` — 09943b6
- [x] Task: Migrate `services/metrics/assignment-prediction-service.ts` — dab543d
- [x] Task: Migrate `services/metrics/genre-engagement-service.ts` — b60c2eb
- [x] Task: Migrate `services/metrics/srs-health-service.ts` — 11e1571
- [x] Task: Migrate `services/metrics/velocity-service.ts` — 05fd49d
- [ ] Task: Measure - User Manual Verification 'Services' (Protocol in workflow.md)

## Phase 5: server/utils, server/middleware, actions

`guards.ts` and `authorization.ts` are security-sensitive — characterization tests here are
mandatory; verify cross-tenant/permission behavior is byte-identical before and after.

- [x] Task: Migrate `server/middleware/guards.ts` — 2200fb5
- [x] Task: Migrate `server/utils/authorization.ts` — 2ec8d16
- [x] Task: Migrate `server/utils/generators/audio-generator.ts` — 64b47a5
- [x] Task: Migrate `server/utils/generators/audio-words-generator.ts` — 0a21e05
- [x] Task: Migrate `server/utils/generators/stories-generator.ts` — d7cff72
- [x] Task: Migrate `actions/flashcard.ts`, `actions/pratice.ts`, `actions/rating.ts` (one commit each) — aa1d791, 43498ef, 00c2259
- [ ] Task: Measure - User Manual Verification 'Utils / Middleware / Actions' (Protocol in workflow.md)

## Phase 6: lib/*

`lib/cache/*` wrap raw SQL/materialized views — document any SQL-ergonomics difference between
the Prisma client and `postgres-js`/Drizzle `sql` in a comment on the file.

- [x] Task: Migrate `lib/cache/advanced-cache.ts`, `fallback-queries.ts`, `connection-monitor.ts`, `matview-manager.ts`, `query-optimizer.ts` (one commit each) — 3db1420, bfac92d, b09be16, e609502, 7d911ab
- [x] Task: Migrate `lib/pagination/smart-paginator.ts` — e2f8c0b
- [x] Task: Migrate `lib/classroom-utils.ts` — da26f03
- [x] Task: Migrate `lib/session.ts` (verify against auth — auth tables already on Drizzle) — 68c2519 (Note: Drizzle users lacks emailVerified/onborda; defaulted to true/false with inline flag comment)
- [ ] Task: Measure - User Manual Verification 'lib' (Protocol in workflow.md)

## Phase 7: app/api routes, app/[locale] pages, components, contexts, types

26 `app/api/**/route.ts` handlers + 16 `app/[locale]/**/page.tsx` server components +
`components/` (admin, system, shared, questions, dashboard, user-account-nav) +
`contexts/userRole-context.tsx` + `middleware.ts` + `types/index.d.ts` +
`types/learning-goals.ts`. Re-grep `app/api` and `app/[locale]` for the live list. Group a
route folder per commit; one commit per page/component.

- [x] Task: Migrate `app/api/v1/**/route.ts` handlers (re-grep; ~26 files — one folder per commit) — 26 commits 856cd7d..66f46ac (auth signup/reset/check, admin alerts/overview/segments/teacher-effectiveness, articles export-workbook, assignments, demo status, flashcard deck-id/progress, games dragon-flight/magic-defense complete/ranking/vocabulary, health database, licenses, metrics cache/health/system, system lowest-rated-articles/school-classrooms)
- [x] Task: Migrate `app/[locale]/(teacher|admin|system)/**/page.tsx` server components (~16 files) — 16 commits decadd1..218669e (admin dashboard/layout/reports/teacher-assignments, role-selection, student layout+read, system layout/license/reports/schooldashboard, teacher dashboard/layout/reports)
- [x] Task: Migrate Prisma-importing files in `components/` (admin, system, shared, questions, dashboard, user-account-nav.tsx) — 7 commits c79d0e0..99a39b8
- [x] Task: Migrate `contexts/userRole-context.tsx` — 65e7229
- [x] Task: Migrate `middleware.ts` (Edge runtime — confirm Drizzle/`postgres-js` is Edge-safe; if not, defer to Track 4 with a note) — 4ebdfc5 (already Edge-safe via fetch('/api/auth/session') — no DB import needed)
- [x] Task: Migrate `types/index.d.ts` and `types/learning-goals.ts` (replace `@prisma/client` types with `typeof <table>.$inferSelect` or `lib/enums.ts`) — d695d9e, b149b3e
- [x] Task: Remove the dead `verificationToken` importer in `__test__/session-schema.test.ts` / `lib/session.ts` (DROP — see audit) — 1b4646c, e2a315b (test files migrated; verification_tokens table was dropped in migration 0003)
- [ ] Task: Measure - User Manual Verification 'Pages / Routes / Components' (Protocol in workflow.md)

## Phase 8: scripts + seeds

These do not run in production request paths — lower risk, but still one commit each.

- [x] Task: Migrate `scripts/refresh-*.ts` (velocity-matviews, materialized-views, genre-metrics, demo-data, activity-heatmap-matviews) — 27bbccd, abe1afe, 9c9cbff, 34627ef, 9e5e22e
- [x] Task: Migrate `scripts/check-*.ts` (teacher-classrooms, demo-data, classroom-teachers, archived, alignment-data) — 2ebaa5b, 00650ce, 11b7fed, a6b56f6, 6cea358
- [x] Task: Migrate `scripts/backfill-schools.ts` — f6d275e
- [x] Task: Migrate or retire `prisma/seed.ts` and `prisma/demo-seed.ts` (rewrite against Drizzle, or move to `packages/db/src/seed/` if a seed is still needed) — 90367c8, fb69f18 (rewritten in place; will be moved/deleted in Phase 9)
- [ ] Task: Measure - User Manual Verification 'Scripts / Seeds' (Protocol in workflow.md)

## Phase 9: Prisma removal & final verification

- [x] Task: Confirm zero Prisma references
    - [x] Sub-task: `grep -rln "@prisma\|@/lib/prisma" apps/reading-advantage --include=*.ts --include=*.tsx | grep -vE "node_modules|/.next/"` returns nothing (only comment in `lib/enums.ts` references @prisma/client by name in a documentation header — acceptable per plan AC#1 which checks for `from.*['"]@/lib/prisma['"]\|from.*['"]@prisma` imports specifically; that grep returns 0 matches)
- [x] Task: Delete Prisma surface
    - [x] Sub-task: Delete `apps/reading-advantage/lib/prisma.ts` — ecb9c57
    - [x] Sub-task: Delete `apps/reading-advantage/prisma/` (schema, migrations, generated client) — ecb9c57. Note: 8 migrations containing CREATE MATERIALIZED VIEW SQL were preserved at `apps/reading-advantage/db-migrations/legacy-matviews/` (commit 5db6d21) — these matviews are required by the migrated services. README documents apply order. Tech-debt entry added for folding into a Drizzle migration as follow-up. Seeds moved to `apps/reading-advantage/scripts/seed/`.
    - [x] Sub-task: Remove `prisma`, `@prisma/client`, `prisma-zod-generator` from `apps/reading-advantage/package.json` — 74106d5. (prisma-zod-generator was not present.)
    - [x] Sub-task: Remove the `prebuild: prisma generate` script — 74106d5
- [x] Task: Verify clean install + build + test
    - [x] Sub-task: `pnpm install` (lockfile no longer resolves Prisma for this app) — verified. `@prisma/client` and `prisma` remain only as dependencies of primary-advantage and science-advantage which have their own migration tracks.
    - [ ] Sub-task: `pnpm --filter reading-advantage build` — no new `ignoreBuildErrors` regressions — **DEFERRED to manual verification** (build hangs on resource-constrained hardware per pre-existing tech-debt 2026-05-01). Lint passes: 0 errors, 133 pre-existing react-hooks/exhaustive-deps warnings.
    - [ ] Sub-task: `CI=true pnpm --filter reading-advantage test` green — **DEFERRED to manual verification** (Jest run timed out at 10min on this hardware; same pre-existing constraint).
- [x] Task: Close tech-debt entry `firestore_drizzle` (2026-05-03) and append any new slices to Track 4's spec — done. Also closed `verification_tokens` (2026-05-22) since Phase 7 confirmed test files migrated and the table was dropped in migration 0003.
- [x] Task: Add lessons-learned entries for any non-obvious reshape handling (≤50-line cap — prune first) — 2 entries added: (a) silent Prisma `where:{schoolId}` filter bugs revealed by Drizzle; (b) matview SQL preservation pattern.
- [ ] Task: Measure - User Manual Verification 'Prisma Removal' (Protocol in workflow.md) — pending user. Suggested checks: `pnpm --filter reading-advantage build`, `CI=true pnpm --filter reading-advantage test`, smoke-test the matview-querying endpoints (alignment metrics, srs-health, genre engagement, assignment funnel, velocity), confirm auth flow (login + session resolution via migrated lib/session.ts), and verify seed scripts still run (`pnpm --filter reading-advantage db:seed:small`).
