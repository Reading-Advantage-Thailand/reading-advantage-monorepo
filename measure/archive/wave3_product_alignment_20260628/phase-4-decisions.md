# Phase 4 — Tenant-Safe Persistence and Leaderboards (Frozen 2026-07-05)

> **Track:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `78f17dc3` (HEAD at strategy authoring; Phases 0/1/2 complete and
> accepted; Phase 3 complete and accepted at `f512f802`/`78f17dc3`).
> **Owner:** `measure-strategy` (this cycle) — decisions recorded from audit evidence
> (`advantage-games_20260626/`) and current source reality at HEAD `78f17dc3`.
> **Spec gate:** `spec.md` §Acceptance Criteria — "Leaderboard/progress persistence is
> tenant-safe and covered by tests."
> **Import policy gate:** `phase-0-decisions.md` Decision 3 — Phase 4 must close D-04
> (leaderboard tables lack tenant key), D-06 (host mutations lack Zod), and the
> race-safe fire-once Tier 2 item deferred from Phase 3 Decision 3.4 before the
> `haunted-library` pilot import gate in Phase 5 may proceed.
> **Phase 3 handoff:** `phase-3-decisions.md` Decision 3.4 explicitly recorded the
> `xpLogs` unique constraint and `gameCompletions` table as Phase 4 Tier 2 items.
> Phase 3 proved the *logic* of fire-once with a mock DB; Phase 4 makes it race-safe
> at the DB level and adds the tenant-safe persistence layer.

This document freezes the product/technical decisions for Phase 4. It is the
persistence shape Jr-Green implements and the falsifiability anchor Mid-Red writes
tests against. Tier 1 items are evidence-grounded and `[x]`-actable; Tier 2 items
are `[b] deferred:po` or `[b] deferred:infra` with a precise owner question.

---

## Decision framework

Phase 3 was the **contract** phase (shared Zod schema, server-side XP formula,
fire-once logic proven with a mock DB). Phase 4 is the **tenant-safe persistence**
phase. The split is honest:

- **Phase 3 (complete):** the shared Zod contract, the server-side XP formula, the
  idempotent domain function signature and logic. Proven at the unit level with a
  mock DB. No schema migration. No `schoolId` column on game tables. No leaderboard
  persistence.
- **Phase 4 (this phase):** the `gameCompletions` table migration (FLAT, `schoolId`),
  the `xpLogs` unique constraint for race-safe fire-once, the `leaderboards.schoolId`
  notNull migration, the `gameRankings` deprecation (no new writes), the
  server-backed leaderboard domain query, the host-mutation Zod (D-06 Tier 1), and
  the PGlite live-DB proof of tenant isolation.
- **Phase 5 (deferred):** embeddable runtime, i18n, shared package, and the
  `haunted-library` import-harness proof. Gated on Phases 3 AND 4 green per
  `phase-0-decisions.md` Decision 3.

This split keeps Phase 4 falsifiable without entangling it with Phase 5's
host-import wiring. The persistence + tenant isolation is the load-bearing artifact;
the host import is downstream.

---

## Decision 4.1 — Persistence shape (D-04, B46-021, B46-025, B46-036)

**Question:** Where do game completions persist, and how is the fire-once guard made
race-safe?

**Source reality at HEAD `78f17dc3`:**

- Phase 3's `recordGameCompletion` (`packages/domain/src/games/mutations.ts`) writes
  to `xpLogs` with `activityId = game:<gameType>:<idempotencyKey>` and
  `activityType: "GAME_COMPLETION"`. The fire-once guard is `SELECT-before-INSERT` —
  racy under concurrent completion calls (Phase 3 Decision 3.4 explicitly recorded
  this as a Phase 4 dependency).
- `xpLogs` (`packages/db/src/schema/analytics.ts:8`) is REFERENTIAL — no `schoolId`
  column. It is the generic XP ledger, read by `progress/queries.ts#getStudentProgress`
  (`SUM(xpLogs.xpEarned) WHERE userId = ?`) and `reports/queries.ts`. Adding `schoolId`
  to `xpLogs` would require backfilling every historical row and would change the
  classification of a hot table read by multiple non-game code paths.
- `gameRankings` (`analytics.ts:22`) is REFERENTIAL — no `schoolId` column, with a
  unique constraint on `(userId, gameType, difficulty)`. It is the *intended*
  leaderboard aggregation table but is not currently written by any code path in
  `packages/domain` (grep confirms zero write sites outside the schema definition).
- `leaderboards` (`primary.ts:227`) is FLAT but `schoolId` is **nullable**
  (`uuid("school_id").references(...)` — no `.notNull()`), so TenantDB's auto-scope
  on `eq(table.schoolId, tenant.schoolId)` does not protect against null-`schoolId`
  rows leaking across schools (B46-027).
- `getStudentProgress` (`progress/queries.ts:72-75`) reads `xpTotal` from `xpLogs`.
  Phase 4 must not break this read path.

### Decision 4.1 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen — three coordinated changes:**

1. **New `gameCompletions` table (FLAT, tenant-safe):**

   ```ts
   // packages/db/src/schema/analytics.ts (added)
   export const gameCompletions = pgTable("game_completions", {
     id: uuid("id").primaryKey().defaultRandom(),
     schoolId: uuid("school_id").notNull().references(() => schools.id, { onDelete: "cascade" }),
     userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
     gameType: text("game_type").notNull(),
     difficulty: text("difficulty").notNull(),
     score: integer("score").notNull(),
     accuracy: real("accuracy").notNull(),          // 0..1 fractional (canonical)
     correctAnswers: integer("correct_answers").notNull(),
     totalAttempts: integer("total_attempts").notNull(),
     duration: integer("duration").notNull(),       // ms
     victory: boolean("victory").notNull(),
     xpEarned: integer("xp_earned").notNull(),
     activityId: text("activity_id").notNull(),     // = game:<gameType>:<idempotencyKey>
     clientTimestamp: bigint("client_timestamp", { mode: "number" }),
     metadata: jsonb("metadata"),
     createdAt: timestamp("created_at").defaultNow().notNull(),
   }, (table) => [
     unique("game_completions_school_user_activity_unique")
       .on(table.schoolId, table.userId, table.activityId),
     index("game_completions_school_game_difficulty_idx")
       .on(table.schoolId, table.gameType, table.difficulty),
   ]);
   ```

   Registered FLAT in `tenant-registry.ts`. TenantDB auto-injects
   `eq(gameCompletions.schoolId, tenant.schoolId)` on every select/insert/update/delete.
   The unique constraint `(schoolId, userId, activityId)` makes the leaderboard
   record tenant-safe AND idempotent at the DB level.

2. **`xpLogs` unique constraint (race-safe fire-once, closes Phase 3 Decision 3.4):**

   ```sql
   -- migration: add unique constraint on xp_logs(user_id, activity_id)
   ALTER TABLE xp_logs
     ADD CONSTRAINT xp_logs_user_activity_unique UNIQUE (user_id, activity_id);
   ```

   `xpLogs` remains REFERENTIAL (no `schoolId` column — see Decision 4.2 for why).
   The unique constraint makes the `SELECT-before-INSERT` pattern in Phase 3's
   `recordGameCompletion` race-safe: two concurrent calls with the same
   `(userId, activityId)` result in exactly one successful INSERT and one
   unique-violation that the domain function catches and returns as
   `{ duplicate: true, xpEarned: 0 }`.

3. **Dual-write in `recordGameCompletion` (keep `xpLogs` as the XP ledger):**

   `recordGameCompletion` is migrated to write to BOTH tables in a single
   `db.transaction()`:

   - `gameCompletions` (FLAT, tenant-scoped, full contract payload) — the
     tenant-safe leaderboard record.
   - `xpLogs` (REFERENTIAL, XP ledger) — so `getStudentProgress#xpTotal` continues
     to aggregate game XP without a read-side change.

   The dual-write is honest: `xpLogs` is the existing XP ledger read by non-game
   code paths; `gameCompletions` is the new tenant-safe game record. The unique
   constraint on `gameCompletions(schoolId, userId, activityId)` is the primary
   idempotency guard; the `xpLogs(userId, activityId)` constraint is the secondary
   guard that keeps the XP ledger consistent. The `SELECT-before-INSERT` remains as
   the fast-path common-case dedup (avoids the throw-on-constraint-violation cost in
   the common duplicate case), but the unique constraints are the race-safe
   guarantee.

**Out of scope (Phase 5+):** migrating additional games to write to
`gameCompletions` (only `haunted-library` is wired in Phase 3; the remaining 25
games migrate in Phase 5+ per `phase-0-decisions.md` Decision 3). Wiring the
host-app import (Phase 5).

---

## Decision 4.2 — Tenant registry reclassification (B46-021, B46-025, B46-027, B46-036)

**Question:** How are the four game-persistence tables classified after Phase 4, and
what happens to the `leaderboards.schoolId` nullable gap (B46-027)?

**Source reality at HEAD `78f17dc3` (from `tenant-registry.ts`):**

- `xpLogs` — REFERENTIAL (line 198). No `schoolId` column.
- `gameRankings` — REFERENTIAL (line 199). No `schoolId` column.
- `leaderboards` — FLAT (line 102), but `schoolId` is nullable (`primary.ts:229`).
- `tenant-coverage.test.ts:194-195` lists `xpLogs` and `gameRankings` in
  `REFERENTIAL_TABLE_NAMES` — the tenant-coverage CI gate passes today because both
  are registered. B46-036 ("tenant-coverage CI red") was true at audit time
  (2026-06-26) but has since been resolved by registering both as REFERENTIAL. The
  remaining D-04 gap is the *nullable* `leaderboards.schoolId` (B46-027) and the
  absence of a tenant-safe game-completion record.

### Decision 4.2 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen — four coordinated classification changes:**

1. **`gameCompletions` — FLAT (new).** Registered FLAT with `schoolId` notNull
   (Decision 4.1). TenantDB auto-scopes all access by `tenant.schoolId`.

2. **`leaderboards.schoolId` — migrated to `notNull` (B46-027 closure).**

   ```sql
   -- migration: backfill null schoolId rows with a sentinel, then set notNull
   -- OR (preferred if the table is empty in production): delete null-schoolId rows
   UPDATE leaderboards SET school_id = '<sentinel-school-uuid>' WHERE school_id IS NULL;
   ALTER TABLE leaderboards ALTER COLUMN school_id SET NOT NULL;
   ```

   The migration choice (backfill-and-notNull vs delete-null-rows) is a `[b]
   deferred:infra` operational decision for the deploy engineer: it depends on
   whether `leaderboards` has production rows at deploy time. The Tier 1 *contract*
   is: after migration, `leaderboards.schoolId` is `notNull`, and a FLAT insert
   without `schoolId` is rejected by TenantDB (M-SF-2 fail-closed). The PGlite
   live-DB test (Decision 4.6) asserts the notNull contract regardless of the
   operational backfill choice.

3. **`xpLogs` — REMAINS REFERENTIAL (no `schoolId` column).** This is honest:
   `xpLogs` is the generic XP ledger, scoped by `userId` FK. Game completions
   dual-write to `xpLogs` (for `xpTotal` aggregation) AND `gameCompletions` (for
   tenant-safe leaderboard queries). Adding `schoolId` to `xpLogs` would require
   backfilling every historical XP row and would change the classification of a hot
   table read by `progress/queries.ts` and `reports/queries.ts`. Phase 4 does NOT
   take that risk; the dual-write delivers tenant-safety at the `gameCompletions`
   layer without disturbing the `xpLogs` read path.

4. **`gameRankings` — REMAINS REFERENTIAL; deprecated (no new writes).**
   `gameRankings` is not dropped (destructive migration, out of scope). It is
   *deprecated*: no Phase 4 code path writes to it, and the leaderboard query
   (Decision 4.3) reads from `gameCompletions`, not `gameRankings`. A code comment
   in `tenant-registry.ts` and `analytics.ts` marks `gameRankings` as deprecated,
   pointing to `gameCompletions` as the source of truth. A future cleanup track may
   drop `gameRankings` once all readers are migrated.

**Out of scope (Phase 5+ / cleanup track):** dropping `gameRankings`; adding
`schoolId` to `xpLogs`; migrating `xpLogs` from REFERENTIAL to FLAT.

---

## Decision 4.3 — Server-backed leaderboard query (D-04, B22-007, B23-004, B24-021)

**Question:** How does a host app fetch a tenant-safe leaderboard, and what replaces
the localStorage-only / `force-static` mock `createRankingRoute` pattern?

**Source reality at HEAD `78f17dc3`:**

- `apps/advantage-games/src/lib/games/api/rankingRoute.ts` is `force-static` and
  returns `EMPTY_RANKINGS` (`{ easy: [], normal: [], hard: [], extreme: [] }`) — no
  DB, no auth, no tenant scoping (B23-004/B24-004/-021).
- `apps/advantage-games/src/components/games/game/RankingDialog.tsx` fetches
  `/api/v1/games/magic-defense/ranking` and renders the (always-empty) response.
  The difficulty keys are `["easy", "normal", "hard", "extreme"]` — note `normal`,
  which conflicts with the Phase 3 canonical `medium` (B21-018).
- No domain query exists for school-scoped leaderboard reads. `packages/domain/src/games/queries.ts`
  has `getGameCompletions` (per-user read) but no `getSchoolLeaderboard`.

### Decision 4.3 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:**

1. **New domain query `getSchoolLeaderboard`:**

   ```ts
   // packages/domain/src/games/queries.ts (added)
   export async function getSchoolLeaderboard({
     db, user, tenant, input,
   }: {
     db: TenantDB;
     user: UserContext;
     tenant: Tenant;
     input: { gameType: GameType; difficulty?: GameDifficulty; limit?: number };
   }): Promise<LeaderboardEntry[]> {
     assertCan(user, "games:read:own", tenant);
     // gameCompletions is FLAT — TenantDB auto-scopes by tenant.schoolId.
     // No unscoped() escape hatch — this is the tenant-safety guarantee.
     const limit = Math.min(input.limit ?? 50, 100);
     const rows = await db
       .select({
         userId: gameCompletions.userId,
         totalXp: sql<number>`SUM(${gameCompletions.xpEarned})`,
         bestScore: sql<number>`MAX(${gameCompletions.score})`,
         bestAccuracy: sql<number>`MAX(${gameCompletions.accuracy})`,
         attempts: sql<number>`COUNT(*)`,
       })
       .from(gameCompletions)
       .where(and(
         eq(gameCompletions.gameType, input.gameType),
         input.difficulty
           ? eq(gameCompletions.difficulty, input.difficulty)
           : undefined,
       ))
       .groupBy(gameCompletions.userId)
       .orderBy(desc(sql`SUM(${gameCompletions.xpEarned})`))
       .limit(limit);
     return rows;
   }
   ```

   The query goes through TenantDB **without** `unscoped()` — `gameCompletions` is
   FLAT, so TenantDB auto-injects `eq(gameCompletions.schoolId, tenant.schoolId)`.
   This is the load-bearing tenant-safety property: a school-A user's completion is
   *impossible* to read via a school-B tenant context, because the WHERE clause is
   injected by the TenantDB proxy, not by the caller.

2. **Shared `LeaderboardResponseSchema` (Zod):**

   ```ts
   // packages/domain/src/games/schema.ts (added)
   export const leaderboardEntrySchema = z.object({
     userId: z.string(),
     totalXp: z.number().int().min(0),
     bestScore: z.number().int().min(0),
     bestAccuracy: z.number().min(0).max(1),
     attempts: z.number().int().min(0),
   });
   export const leaderboardResponseSchema = z.object({
     rankings: z.array(leaderboardEntrySchema),
     schoolScoped: z.literal(true),  // honest marker — not a global leaderboard
   });
   ```

   The standalone `apps/advantage-games/src/lib/games/api/rankingRoute.ts` is
   rewritten to validate its (still-mock) response via `leaderboardResponseSchema`
   and to use the canonical `medium` difficulty key (B21-018 closure). The
   `RankingDialog.tsx` difficulty tabs are updated to `["easy", "medium", "hard",
   "extreme"]`. The standalone route remains `force-static` (mock) — it does NOT
   call `getSchoolLeaderboard` (no DB, no auth in the standalone app, per Phase 3
   Decision 3.7). When a host app imports the game (Phase 5+), the host route
   handler calls `getSchoolLeaderboard` with a real `TenantDB`.

3. **`getGameCompletions` (Phase 3 per-user read) is migrated to read from
   `gameCompletions` (FLAT, tenant-scoped) instead of `xpLogs` (REFERENTIAL).** The
   per-user read becomes tenant-safe: a school-A user's game completions are
   invisible to a school-B tenant context. Phase 3's `getGameCompletions` used
   `db.unscoped("xpLogs is REFERENTIAL...")` and filtered by `userId` only — Phase 4
   removes the `unscoped()` escape hatch and reads from the FLAT
   `gameCompletions` table.

**Out of scope (Phase 5+):** wiring the host-app route handler that calls
`getSchoolLeaderboard`; migrating the `RankingDialog` to call the host route
(instead of the standalone mock route); migrating additional games' ranking routes.

---

## Decision 4.4 — Host-mutation Zod (D-06 Tier 1, B46-031)

**Question:** How does Phase 4 harden `recordActivity` and `updateLessonProgress`
against unvalidated input (D-06)?

**Source reality at HEAD `78f17dc3` (`packages/domain/src/progress/mutations.ts`):**

- `recordActivity({ db, user, tenant, input: { activityType: string; xpEarned?:
  number; metadata?: string } })` — no Zod schema; accepts any `activityType` string
  and any `xpEarned` number (B46-031). This is the D-02/B46-031 hole that Phase 3
  explicitly left for Phase 4.
- `updateLessonProgress({ db, user, tenant, input: { lessonId: string; status:
  string; progress: number } })` — no Zod schema; accepts any `lessonId` (including
  cross-tenant), any `status` string, any `progress` number (B46-032/B46-033).
- `lessons` (`packages/db/src/schema/content.ts:43`) has NO `schoolId` column — it
  is global content. The D-06 `lessonId` tenant-ownership check cannot be a simple
  `lessons.schoolId` lookup; it requires an `assignments → classrooms.schoolId` join
  chain (a lesson is assigned to a classroom, which belongs to a school).

### Decision 4.4 (`[x]` Tier 1 — Zod validation; `[b] deferred:infra` Tier 2 — lessonId ownership)

**Policy frozen — Tier 1 only:**

1. **`recordActivityInputSchema` and `updateLessonProgressInputSchema`** in
   `packages/domain/src/progress/schema.ts`:

   ```ts
   export const recordActivityInputSchema = z.object({
     activityType: z.string().min(1).max(64),
     xpEarned: z.number().int().min(0).max(100).optional(),
     metadata: z.string().max(4096).optional(),
   }).strict();

   export const updateLessonProgressInputSchema = z.object({
     lessonId: z.string().uuid(),
     status: z.enum(["not_started", "in_progress", "completed"]),
     progress: z.number().min(0).max(100),
   }).strict();
   ```

   Both functions `.parse(input)` before any DB write. `xpEarned` is bounded
   `0..100` (closes B46-031 — unbounded XP). `status` is an enum (closes
   free-text status). `.strict()` rejects unknown keys.

2. **`recordActivity` and `updateLessonProgress` call `.parse(input)` at function
   entry.** The existing `assertCan(user, "progress:record", tenant)` call remains
   first (auth before validation, matching `recordGameCompletion`'s order).

**Tier 2 — `[b] deferred:infra` (lessonId tenant-ownership check):**

The D-06 `lessonId` tenant-ownership check (B46-032/B46-033) requires verifying
that the `lessonId` belongs to a lesson assigned in the user's school. Because
`lessons` has no `schoolId` column (it is global content), the check requires an
`assignments.classroomId → classrooms.schoolId` join — a behavior change that needs
its own test surface (what if the lesson is assigned in multiple classrooms across
schools? what if there is no assignment? what about lessons assigned via future
non-classroom paths?). Phase 4 does NOT silently add this check; it explicitly
defers it to a follow-up infra track. The Tier 1 Zod validation closes the
*unvalidated-input* portion of D-06; the *cross-tenant lessonId* portion remains
open and is recorded in `plan.md` Phase 6 as `[b] deferred:infra`.

**Out of scope (Tier 2 / follow-up track):** `lessonId` tenant-ownership check;
migrating `lessons` to add `schoolId`; migrating `userActivity` to add `schoolId`.

---

## Decision 4.5 — Race-safe fire-once (closes Phase 3 Decision 3.4 Tier 2)

**Question:** How does Phase 4 make the Phase 3 `SELECT-before-INSERT` fire-once
guard race-safe?

**Source reality at HEAD `78f17dc3`:**

- Phase 3's `recordGameCompletion` does `SELECT` then `INSERT` with no DB-level
  uniqueness guarantee. Two concurrent calls with the same `idempotencyKey` both see
  `existing.length === 0` and both INSERT — duplicate XP award (the exact B28-017/
  B30-002 failure Phase 3 aimed to close).
- Phase 3 Decision 3.4 explicitly recorded: "Phase 4 adds the DB-level guarantee:
  a unique constraint on `(userId, activityId)` on `xpLogs` (or a new
  `gameCompletions` table with the unique constraint). The Phase 3
  `SELECT-before-INSERT` is racy under concurrency; Phase 4's unique constraint
  makes it race-safe."

### Decision 4.5 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen (delegates to Decision 4.1 for the constraint DDL):**

1. **Unique constraint on `xpLogs(userId, activityId)`** (Decision 4.1 §2).
2. **Unique constraint on `gameCompletions(schoolId, userId, activityId)`**
   (Decision 4.1 §1).
3. **`recordGameCompletion` catches the unique-violation as the duplicate signal.**
   The `SELECT-before-INSERT` remains as the fast-path common-case dedup (avoids
   the throw-on-constraint-violation cost in the common duplicate case). When the
   SELECT misses (concurrent call), the INSERT throws a unique-violation; the
   domain function catches it and returns `{ duplicate: true, xpEarned: 0,
   activityId, status: 200 }`. The catch is specific to unique-violation error
   codes (Postgres `23505`); other errors propagate.

   ```ts
   try {
     await tx.insert(gameCompletions).values({ ... });
     await tx.insert(xpLogs).values({ ... });
   } catch (err) {
     if (isUniqueViolation(err)) {
       return { xpEarned: 0, activityId, duplicate: true, status: 200 };
     }
     throw err;
   }
   ```

4. **PGlite live-DB proof (Decision 4.6)** asserts that two concurrent
   `recordGameCompletion` calls with the same `idempotencyKey` result in exactly
   one successful insert and one `duplicate: true` response. This is the
   race-safety proof that Phase 3 could not deliver with a mock DB.

**Out of scope:** none — this closes the Phase 3 Tier 2 item completely.

---

## Decision 4.6 — Test runner and gate commands

**Question:** What are the Red/Green gate commands for Phase 4, given the
persistence work spans `packages/domain` (vitest + PGlite) and `apps/advantage-games`
(jest)?

**Source reality at HEAD `78f17dc3`:**

- `packages/domain/package.json` `"test": "vitest run"` — vitest.
- `apps/advantage-games/package.json` `"test": "jest"` — jest.
- `apps/marketing/app/__tests__/helpers/testDb.ts` is the established PGlite
  in-process Postgres harness pattern (used by `phase-8-projects-live.test.ts`).
  Phase 4 mirrors this in `packages/domain/src/__tests__/helpers/testDb.ts` (new).
- `packages/domain/src/__tests__/games.test.ts` (Phase 3) uses mock-DB; Phase 4
  keeps it (contract logic) AND adds `games-live.test.ts` (PGlite live-DB proof).

### Decision 4.6 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:**

- **RED_TEST_COMMAND (Phase 4):**
  ```bash
  pnpm --filter @reading-advantage/domain test -- games-live
  ```
  (vitest, bounded to the new `games-live.test.ts` file). Mid-Red may also run the
  bounded jest Red:
  ```bash
  pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute
  ```
  to prove the rewritten `rankingRoute.test.ts` fails for the intended reason
  (shared `LeaderboardResponseSchema` rejection of the legacy `normal` key and
  empty-rankings shape).

- **GREEN_TEST_COMMAND (Phase 4):**
  ```bash
  pnpm --filter @reading-advantage/domain test -- games
  pnpm --filter @reading-advantage/domain test -- games-live
  ```
  (vitest, both the Phase 3 contract tests AND the new PGlite live-DB tests pass).
  Jr-Green also runs:
  ```bash
  pnpm --filter vocabulary-games test --testPathPatterns=rankingRoute
  ```
  to prove the rewritten `rankingRoute.test.ts` passes.

- **PROJECT_LINT:** `pnpm --filter @reading-advantage/domain lint && pnpm --filter vocabulary-games lint`
- **PROJECT_CHECKS:** `pnpm --filter @reading-advantage/domain check-types && pnpm --filter vocabulary-games check-types`
  Plus `pnpm --filter @reading-advantage/db check-types` (the new `gameCompletions`
  table is in `packages/db`).
- **PROJECT_TESTS (acceptance):** `pnpm --filter @reading-advantage/domain test && pnpm --filter vocabulary-games test && pnpm --filter @reading-advantage/db test`

- **Tenant-coverage gate:** `pnpm --filter @reading-advantage/domain test -- tenant-coverage`
  must remain green — the new `gameCompletions` table MUST be registered in
  `tenant-registry.ts` (FR-6 build-failure guard). The `leaderboards.schoolId`
  notNull migration must not break the FLAT classification.

**PGlite live-DB harness:**

```ts
// packages/domain/src/__tests__/helpers/testDb.ts (new, mirrors marketing pattern)
import { PGlite } from "@electric-sql/pglite";
// ... createTestDb() creates an in-process Postgres, runs the drizzle migrations
// (including the new game_completions table + unique constraints), returns
// { db, tenantDb, teardown }.
```

The PGlite harness is a devDependency; it is imported only from test helpers
(matching the marketing `testDb.ts` header comment). It runs the *real* drizzle
schema (not a hand-rolled DDL), so a schema definition bug in `gameCompletions`
fails the live-DB test, not just the type check.

**Aggregate suite:** Per `measure/tracks.md:112-115`, the monorepo aggregate suite
is red at baseline from pre-existing, owner-labeled failures. Phase 4 does NOT
attempt to green the aggregate. The gate is scoped to the three filters above plus
the tenant-coverage filter. Any non-domain / non-vocabulary-games / non-db red is
pre-existing and labeled as such in `known_failures`.

---

## Decision 4.7 — Scope honesty (what Phase 4 does NOT do)

**Question:** What scope-creep risks does Phase 4 explicitly decline?

### Decision 4.7 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen — Phase 4 does NOT:**

1. **Migrate any additional game to the shared contract.** Only `haunted-library`
   was migrated in Phase 3. The remaining 25 games migrate in Phase 5+ per
   `phase-0-decisions.md` Decision 3, gated by per-game readiness. Phase 4 delivers
   the *persistence layer*; it does not retro-migrate games.

2. **Wire the host-app import.** Phase 5 owns the embeddable runtime + host
   progress integration proof. Phase 4 delivers the domain query
   (`getSchoolLeaderboard`) and the shared `LeaderboardResponseSchema`; the host
   route handler that calls them is Phase 5.

3. **Add `schoolId` to `xpLogs`.** `xpLogs` remains REFERENTIAL (Decision 4.2 §3).
   The dual-write delivers tenant-safety at the `gameCompletions` layer without
   disturbing the `xpLogs` read path (`getStudentProgress#xpTotal`).

4. **Drop `gameRankings`.** Destructive migration, out of scope. `gameRankings` is
   deprecated (no new writes; leaderboard reads from `gameCompletions`). A future
   cleanup track may drop it.

5. **Add the `lessonId` tenant-ownership check.** D-06 Tier 2 `[b] deferred:infra`
   (Decision 4.4). Requires an assignments-based ownership query, not a simple
   column lookup. Phase 4 closes the *Zod validation* portion of D-06 only.

6. **Migrate `lessons` to add `schoolId`.** `lessons` is global content (a lesson
   can be assigned in multiple schools). Adding `schoolId` would be a semantic
   change, not a schema migration. Out of scope.

7. **Extend the `activity_type` pgEnum.** Phase 3 used the literal string
   `"GAME_COMPLETION"` (the `xpLogs.activityType` column is `text`, not the
   pgEnum — see `packages/db/src/schema/analytics.ts:15`). Phase 4 keeps this
   approach; the pgEnum extension remains a future cleanup.

---

## Summary table

| # | Decision | Tier 1 (automatable, `[x]`) | Tier 2 (PO/infra-gated, `[b] deferred`) |
|---|----------|------------------------------|------------------------------------------|
| 4.1 | Persistence shape | New `gameCompletions` FLAT table (schoolId notNull, unique constraint); `xpLogs` unique constraint `(userId, activityId)`; dual-write in `recordGameCompletion` | (none) |
| 4.2 | Tenant registry reclassification | `gameCompletions` FLAT (new); `leaderboards.schoolId` notNull migration (B46-027 closure); `xpLogs` REFERENTIAL (unchanged); `gameRankings` REFERENTIAL + deprecated (no new writes) | Drop `gameRankings` (future cleanup track); add `schoolId` to `xpLogs` (out of scope) |
| 4.3 | Server-backed leaderboard | `getSchoolLeaderboard` domain query over `gameCompletions` (FLAT, auto-scoped); shared `LeaderboardResponseSchema`; standalone `rankingRoute.ts` validates via schema + canonical `medium` key | Host-app route handler wiring (Phase 5); `RankingDialog` host-route migration (Phase 5) |
| 4.4 | Host-mutation Zod (D-06) | `recordActivityInputSchema` + `updateLessonProgressInputSchema` (Zod, `.strict()`); both functions `.parse(input)`; `xpEarned` bounded 0..100 | `lessonId` tenant-ownership check (requires assignments join — follow-up infra track) |
| 4.5 | Race-safe fire-once | Unique constraints (Decision 4.1); `recordGameCompletion` catches unique-violation as duplicate signal; SELECT-before-INSERT remains as fast-path | (none — closes Phase 3 Decision 3.4 Tier 2) |
| 4.6 | Test runner and gates | vitest (`packages/domain`) + PGlite live-DB harness (new `helpers/testDb.ts`); jest (`apps/advantage-games`) rewritten `rankingRoute.test.ts`; tenant-coverage gate | (none) |
| 4.7 | Scope honesty | Seven explicit non-goals (no additional game migration; no host wiring; no `xpLogs` schoolId; no `gameRankings` drop; no `lessonId` ownership check; no `lessons` schoolId; no `activity_type` pgEnum extension) | (none) |

---

## What this enables for Phase 4

Phase 4 (Tenant-Safe Persistence and Leaderboards) may proceed against **all Tier 1
decisions immediately**. Mid-Red writes tests against:

- A PGlite live-DB proof that a school-A `recordGameCompletion` insert is **invisible**
  to a school-B `getSchoolLeaderboard` query (D-04/B46-021 defense). Positive
  control: the school-A query returns the row.
- A PGlite live-DB proof that two concurrent `recordGameCompletion` calls with the
  same `idempotencyKey` result in exactly one insert and one `duplicate: true`
  response (B28-017/B30-002 race-safety closure).
- A schema/migration test that `leaderboards.schoolId` is `notNull` after migration
  (B46-027 closure) and that a FLAT insert without `schoolId` is rejected.
- A domain test that `getSchoolLeaderboard` reads from `gameCompletions` (not
  `gameRankings`) and goes through TenantDB without `unscoped()` (A4: assert the
  query source table is `gameCompletions`).
- A domain test that `recordActivity` and `updateLessonProgress` reject invalid
  inputs via Zod (D-06 Tier 1: `xpEarned > 100` rejected; `status: "fake"`
  rejected; unknown keys rejected).
- A jest test that the rewritten `rankingRoute.ts` validates its response via
  `leaderboardResponseSchema` and uses the canonical `medium` difficulty key.

Tier 2 items remain `[b] deferred:infra` in `plan.md` Phase 6 and are **not**
invented by Phase 4. Phase 5 owns the host-app import wiring; a future cleanup
track owns the `gameRankings` drop and the `lessonId` ownership check.

---

## Anti-pattern defense summary (carried to test-strategy §0.D)

| Anti-pattern | Phase 4 defense |
|---|---|
| **A4** Vacuous-pass | Every PGlite live-DB test pairs a positive control (school-A row visible to school-A) with a negative control (school-A row invisible to school-B). A query that returns empty for everyone fails the positive control. Every race-safety test asserts exactly one insert succeeds (not zero, not two). |
| **A5** False-claim text | `plan.md` Phase 4 task text must not say "tenant-safe persistence" / "race-safe fire-once" / "leaderboard secured" unless `pnpm --filter @reading-advantage/domain test -- games-live` exits 0. The cited command is the source of truth. |
| **A6** Registry overstatement | `measure/tracks.md` must not claim D-04/D-06 "resolved" until Phase 4 acceptance passes. The CA-013 / MR-H05 findings stay "open" until Phase 5 pilot import green. |
| **A3** Digit-only count | Leaderboard rank/count assertions emit labeled integers (`"Leaderboard row count: N"`, `"School-A XP total: N"`, `"Insert call count: N"`) and parse; no bare `expect(count).toBeTruthy()`. |
| **A7** Over-broad filter | Tenant-leak tests match exact `schoolId` literals (`"school-A"`, `"school-B"`), not bare words like "school"/"user" (which appear legitimately in joins). |
| **A9** Archived track paths | New tests reference `packages/domain/src/games/`, `packages/db/src/schema/analytics.ts`, and `apps/advantage-games/src/` only; no runtime dependency on `measure/tracks/<id>/`. Provenance comments may cite `phase-4-decisions.md` but no runtime dependency. |
| **A2** Consent-blind publish | N/A (no publish flow in Phase 4). |
| **A10** Generated-facts drift | PGlite live-DB tests run the real drizzle schema; they do NOT regenerate `measure/generated/`. Consciously not applicable. |
| **A11** Executed review track | N/A (implementation phase). |
| **A1/A8/A12/A13** | Orchestrator-internal or closeout classes; consciously not applicable to Phase 4 product tests. |
