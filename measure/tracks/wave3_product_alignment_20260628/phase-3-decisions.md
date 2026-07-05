# Phase 3 — Advantage Games Completion and Scoring Contract (Frozen 2026-07-05)

> **Track:** `wave3_product_alignment_20260628`
> **Baseline SHA:** `8900196e` (HEAD at strategy authoring; Phases 0/1/2 complete and accepted)
> **Owner:** `measure-strategy` (this cycle) — decisions recorded from audit evidence
> (`advantage-games_20260626/`) and current source reality at HEAD `8900196e`.
> **Spec gate:** `spec.md` §Acceptance Criteria — "Advantage Games completion/scoring
> contract is a single shared Zod schema with server-side XP calculation and idempotent
> completion."
> **Import policy gate:** `phase-0-decisions.md` Decision 3 — Phase 3 must close D-01
> (shared completion contract), D-02 (client-trusted XP), D-05 (activity/game-type enum),
> and the fire-once portion of B28-017/B30-002 before the `haunted-library` pilot import
> gate in Phase 5 may proceed.

This document freezes the product/technical decisions for Phase 3. It is the contract
shape Jr-Green implements and the falsifiability anchor Mid-Red writes tests against.
Tier 1 items are evidence-grounded and `[x]`-actable; Tier 2 items are `[b] deferred:po`
or `[b] deferred:infra` with a precise owner question.

---

## Decision framework

Phase 3 is the **contract** phase. Phase 4 is the **tenant-safe persistence** phase. The
split is honest:

- **Phase 3 (this phase):** the shared Zod contract, the server-side XP formula, the
  idempotent domain function signature and logic. Proven at the unit level with a mock
  DB. No schema migration. No `schoolId` column. No leaderboard persistence.
- **Phase 4:** the `gameCompletions`/`xpLogs`/`gameRankings`/`leaderboards` tenant-safe
  schema/migration, the tenant-registry reclassification, the host-mutation Zod (D-06),
  and the server-backed leaderboard.

This split keeps Phase 3 falsifiable without entangling it with Phase 4's migration
work. The contract is the load-bearing artifact; the persistence is downstream.

---

## Decision 3.1 — Where the shared contract lives

**Question:** Where does the shared game-completion Zod schema and domain function live?

**Source reality at HEAD `8900196e`:**

- The current completion contract lives in
  `apps/advantage-games/src/lib/games/api/types.ts` (a `CompleteRequest` TypeScript type
  with `xp?: number`, `accuracy`, `correctAnswers`, `totalAttempts`, `difficulty`, and
  game-specific fields `dragonCount`/`bossPower`/`victory`). It is **not** a Zod schema.
- The current route handler `apps/advantage-games/src/lib/games/api/completeRoute.ts`
  is `force-static` (mock), trusts client `xp` (`xpEarned = xp ?? ...`), and generates
  `activityId = mock-activity-${Date.now()}` — no persistence, no fire-once guard.
- The existing domain layer has `packages/domain/src/progress/mutations.ts#recordActivity`
  which also accepts `xpEarned?: number` (D-02/B46-031) — but `recordActivity` is a
  generic activity ledger, not a game-completion contract.
- AGENTS.md §Backend-as-Code requires business logic in `/packages/backend` (here
  `/packages/domain`), not in route handlers or app-level `lib/`.

### Decision 3.1 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:** Create a new `packages/domain/src/games/` module with the standard
7-file structure (matching `progress/`, `codecamp/`, `sales/`):

```
packages/domain/src/games/
  schema.ts        — GameCompletionInputSchema, GameCompletionResultSchema (Zod)
  contracts.ts     — re-exports types
  mutations.ts     — recordGameCompletion({ db, user, tenant, input })
  queries.ts       — getGameCompletions (read-side, for tests/host)
  permissions.ts   — games:complete, games:read:own
  errors.ts        — DuplicateCompletionError, InvalidGameCompletionError
  index.ts         — barrel
```

Plus a pure XP module:

```
packages/domain/src/games/
  xp.ts            — calculateGameXP(input): number  (pure, unit-tested)
```

Rationale:
- Matches the AGENTS.md §Backend Function Pattern and the existing `progress/` module
  shape (schema/contracts/queries/mutations/permissions/errors/index).
- Keeps the contract in the domain layer, callable from any host app's Server Action /
  Route Handler / Worker — not coupled to `apps/advantage-games` route handlers.
- `apps/advantage-games/src/lib/games/api/completeRoute.ts` is rewritten to validate via
  `GameCompletionInputSchema` and delegate to `recordGameCompletion`. The route remains
  `force-static` (standalone mock), but the *contract* it mocks is now the real shared
  schema. When a host app imports the game (Phase 5+), it calls `recordGameCompletion`
  directly with a real `TenantDB`.

**Out of scope (Phase 4):** `gameCompletions` table migration, `schoolId` column,
tenant-registry reclassification of `xpLogs`/`gameRankings`/`leaderboards`, host-mutation
Zod on `recordActivity`/`updateLessonProgress` (D-06).

---

## Decision 3.2 — Contract shape (D-01, D-05)

**Question:** What fields does the shared `GameCompletionInputSchema` define, and what
is the canonical unit for each?

**Source reality at HEAD `8900196e` (from `advantage-games_20260626/findings.md` §D):**

- **D-01:** 5+ `/complete` payload shapes exist; accuracy unit varies (0–1 vs ×100)
  (B21-002 theme, B21-037, B25-002, B22-026).
- **D-05:** `activityType`/`gameType` are free text; the existing `activityType`
  pgEnum omits games entirely (B46-022, B46-030).
- `gameCards.ts` already defines 26 canonical game slugs (plus 3 placeholders
  `astral-mage`/`babel-architect`/`sorcerer-ziggurat`); these are the de-facto
  `gameType` vocabulary.
- `hauntedLibrary.ts#calculateXP` uses `accuracy = correctAnswers / totalAttempts`
  (fractional 0..1) — the canonical unit.
- `completeRoute.ts` accepts `xp?: number` (D-02/B25-001) and game-specific fields
  `dragonCount`/`bossPower` (B23-007/B24-007 dead contract fields).

### Decision 3.2 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:** The `GameCompletionInputSchema` is:

```ts
export const gameTypeEnum = z.enum([
  "castle-defense", "dragon-rider", "magic-defense", "rpg-battle",
  "dragon-flight", "wizard-vs-zombie", "enchanted-library", "rune-match",
  "alchemists-synthesis", "potion-rush", "dungeon-liberator", "spellweavers-run",
  "shadow-gate-dungeon", "rune-forge-chamber", "village-guardian",
  "labyrinth-goblin-king", "abyssal-well", "archers-revenge", "storm-castle-tower",
  "griffin-sky-joust", "realm-carver", "paladins-twin-soul", "griffin-riders-escape",
  "devourer-slime", "haunted-library", "gryphon-patrol",
  // 3 placeholders excluded — they have no implementation and cannot complete.
]);

export const gameDifficultyEnum = z.enum(["easy", "medium", "hard", "extreme"]);

export const gameCompletionInputSchema = z.object({
  gameType: gameTypeEnum,
  difficulty: gameDifficultyEnum,
  score: z.number().int().min(0),
  accuracy: z.number().min(0).max(1),           // fractional 0..1 (canonical; rejects ×100)
  correctAnswers: z.number().int().min(0),
  totalAttempts: z.number().int().min(0),
  duration: z.number().int().min(0),            // gameplay ms
  victory: z.boolean(),
  idempotencyKey: z.string().uuid(),            // client-supplied; fire-once
  clientTimestamp: z.number().int(),            // client clock ms; for skew detection
  metadata: z.record(z.string(), z.unknown()).optional(),
}).strict();                                    // reject unknown keys (no `xp`, no `dragonCount`)
```

The `GameCompletionResultSchema` is:

```ts
export const gameCompletionResultSchema = z.object({
  xpEarned: z.number().int().min(0),            // server-computed; never client-supplied
  activityId: z.string(),                       // = idempotencyKey (stable across retries)
  duplicate: z.boolean(),                       // true if a prior completion was found
  status: z.literal(200),
});
```

**Canonical-unit decisions (D-01):**
- `accuracy` is **fractional 0..1**. The route handler rejects `accuracy > 1` (the ×100
  unit). `hauntedLibrary.ts` already uses 0..1; games currently sending ×100 must
  divide-by-100 before calling the contract (migration work; only `haunted-library` is
  migrated this phase).
- `difficulty` is **`medium`** (not `normal`). The `normal` vs `medium` mismatch
  (B21-018) is resolved by standardizing on `medium` (matches `hauntedLibrary.ts`).
  `extreme` is included for forward compatibility (some games' RankingDialog use it).
- `score` is the game's internal score (NOT XP). `score` is informational; only
  `xpEarned` affects persistence.
- `duration` is in **milliseconds** (matches `hauntedLibrary.ts#time`).

**Game-specific fields (D-01/B23-007/B24-007):**
- `dragonCount`, `bossPower`, and other game-specific fields are **rejected** by
  `.strict()`. Games that need to attach extra context use `metadata` (an optional
  string-keyed record). The contract does not enumerate game-specific fields.

**Idempotency (D-02/B28-017/B30-002):**
- `idempotencyKey` is a client-supplied UUID. The domain function looks up
  `(userId, gameType, idempotencyKey)` before inserting; if found, returns
  `{ duplicate: true, xpEarned: 0, activityId: idempotencyKey }`.
- `activityId` in the result **equals** `idempotencyKey` (stable across retries). The
  current `mock-activity-${Date.now()}` pattern (B23-008/B24-008 collision risk) is
  removed.

**`activityType` enum (D-05):**
- Phase 3 does **not** extend the existing `activity_type` pgEnum (that's a schema
  migration owned by Phase 4). Instead, the domain function uses the literal string
  `"GAME_COMPLETION"` for `xpLogs.activityType` (which is a `text` column, not the
  pgEnum — see `packages/db/src/schema/analytics.ts:15`). Phase 4 may migrate the
  `activity_type` pgEnum to include `"GAME_COMPLETION"` and `gameType` values.

**Out of scope (Phase 4):** `activity_type` pgEnum extension, `gameCompletions` table,
`schoolId` column, host-mutation Zod on `recordActivity`/`updateLessonProgress`.

---

## Decision 3.3 — Server-side XP formula (D-02, B25-001)

**Question:** How is `xpEarned` computed server-side, and what rejects client-supplied XP?

**Source reality at HEAD `8900196e`:**

- `apps/advantage-games/src/lib/xp.ts#calculateXP(score, correctAnswers, totalAttempts)`
  returns `Math.floor(correctAnswers * accuracy)` — a *different* formula from
  `hauntedLibrary.ts#calculateXP(state)` which returns
  `Math.min(10, correctAnswers + bonus)` (bonus for accuracy/lives/time).
- `completeRoute.ts` accepts `xp?: number` and echoes it: `xpEarned = xp ?? ...` (D-02).
- `packages/domain/src/progress/mutations.ts#recordActivity` accepts `xpEarned?: number`
  (B46-031) — but this is the *generic* activity ledger, not the game contract. Its
  hardening is Phase 4 (D-06).

### Decision 3.3 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:**

1. **The `GameCompletionInputSchema` has NO `xp` field** (Decision 3.2). The `.strict()`
   reject catches any client that sends `xp`. This is the primary D-02 defense.

2. **`calculateGameXP(input): number`** is a pure function in
   `packages/domain/src/games/xp.ts`. It takes the validated `GameCompletionInput` (no
   `xp` field) and returns a non-negative integer.

3. **Canonical formula (sentence + vocabulary games):**
   ```ts
   export function calculateGameXP(input: GameCompletionInput): number {
     if (input.totalAttempts === 0) return 0;
     const accuracy = input.correctAnswers / input.totalAttempts;
     const base = input.correctAnswers;
     let bonus = 0;
     if (accuracy === 1) bonus += 2;
     if (input.victory) bonus += 1;
     if (input.duration < 60_000) bonus += 1;
     return Math.min(10, base + bonus);
   }
   ```
   This matches `hauntedLibrary.ts#calculateXP` (the representative game) exactly,
   except `victory` replaces `lives / initialLives >= 0.5` (the contract has no `lives`
   field; `victory` is the canonical proxy). `Math.min(10, ...)` caps XP at 10 per
   completion — the same cap as the existing haunted-library formula and the
   multiplayer XP cap noted in B42-005/-026/-065.

4. **`recordGameCompletion` calls `calculateGameXP(input)`** and stores the result in
   `xpLogs.xpEarned`. The client-supplied `score` is informational only.

5. **The existing `apps/advantage-games/src/lib/xp.ts#calculateXP` is NOT modified in
   Phase 3.** It remains as a client-side preview (used by games that have not yet
   migrated). The server-side `calculateGameXP` is the source of truth. Phase 5/6
   migration may deprecated the client-side formula once all games migrate.

6. **`recordActivity` (generic) is NOT modified in Phase 3.** Its `xpEarned?: number`
   acceptance (B46-031) is D-06 host-mutation hardening, owned by Phase 4. Phase 3
   creates the *new* `recordGameCompletion` function; it does not touch the existing
   generic activity ledger.

**Bounds (D-02):**
- `xpEarned` is `z.number().int().min(0)` in the result schema.
- `calculateGameXP` returns `Math.min(10, ...)` — hard cap at 10.
- A client sending `xp: 1000000` is rejected by `.strict()` (the `xp` key is unknown).
- A client sending `correctAnswers: 1000000` produces `xpEarned = Math.min(10, 1000000) = 10` — bounded.

**Out of scope (Phase 4):** `recordActivity` Zod hardening (D-06), `updateLessonProgress`
tenant ownership check (D-06).

---

## Decision 3.4 — Fire-once completion guard (B28-017, B30-002)

**Question:** How does the contract prevent duplicate `onComplete` awards (dragon-flight
boss-tick duplicate, gryphon-patrol duplicate)?

**Source reality at HEAD `8900196e`:**

- `dragon-flight`/`dragon-rider` call `onComplete` every boss tick (B30-002) — each
  tick awards XP.
- `gryphon-patrol` has duplicate `onComplete` (B28-017).
- `completeRoute.ts` has no persistence, no dedup — every POST returns a fresh
  `mock-activity-${Date.now()}` activityId.
- `xpLogs` has no unique constraint on `(userId, activityId)`; `activityId` is
  `text` and currently set to `mock-activity-<timestamp>`.

### Decision 3.4 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:**

1. **`idempotencyKey` (Decision 3.2) is the fire-once key.** The client generates a UUID
   per game session and sends it in the completion payload. Retries (network failure,
   boss-tick duplicate, React strict-mode double-invoke) send the same UUID.

2. **`recordGameCompletion` logic:**
   ```ts
   export async function recordGameCompletion({ db, user, tenant, input }) {
     assertCan(user, "games:complete", tenant);
     const parsed = gameCompletionInputSchema.parse(input);  // also rejects `xp`
     const xpEarned = calculateGameXP(parsed);

     const rawDb = db.unscoped("xpLogs is REFERENTIAL, scoped via userId FK");
     // Fire-once: look up by (userId, gameType, idempotencyKey)
     const activityId = `game:${parsed.gameType}:${parsed.idempotencyKey}`;
     const existing = await rawDb.select().from(xpLogs)
       .where(and(eq(xpLogs.userId, user.id), eq(xpLogs.activityId, activityId)))
       .limit(1);
     if (existing.length > 0) {
       return { xpEarned: 0, activityId, duplicate: true, status: 200 };
     }
     await rawDb.insert(xpLogs).values({
       userId: user.id,
       xpEarned,
       activityId,
       activityType: "GAME_COMPLETION",
     });
     return { xpEarned, activityId, duplicate: false, status: 200 };
   }
   ```

3. **`activityId` format:** `game:<gameType>:<idempotencyKey>`. This is greppable and
   namespaced (distinct from `mock-activity-*` and other activity sources). The
   `idempotencyKey` UUID is the dedup key.

4. **Phase 3 proves the fire-once *logic* with a mock DB.** The unit test mocks
   `db.select` to return an existing row on the second call and asserts
   `duplicate: true, xpEarned: 0` with no `db.insert`. This is the honest control: the
   *contract* and *logic* are proven; the *DB unique constraint* lands in Phase 4.

5. **Phase 4 adds the DB-level guarantee:** a unique constraint on
   `(userId, activityId)` on `xpLogs` (or a new `gameCompletions` table with the
   unique constraint). The Phase 3 `SELECT-before-INSERT` is racy under concurrency;
   Phase 4's unique constraint makes it race-safe. The Phase 3 strategy explicitly
   records this as a Phase 4 dependency.

**Duplicate-award behavior:**
- The duplicate completion returns `200` (not `409`), with `duplicate: true` and
  `xpEarned: 0`. This is intentional: the client did not error, the completion was
  already recorded, and the client should not award XP again. A `409` would surface as
  a game-breaking error to the student.

**Out of scope (Phase 4):** DB unique constraint on `xpLogs` (or new `gameCompletions`
table), race-safe fire-once, tenant-safe persistence.

---

## Decision 3.5 — Representative game migration

**Question:** Which game is migrated to the shared contract in Phase 3?

**Source reality at HEAD `8900196e` (from `game-readiness-matrix.md`):**

- All 26 implemented games are NOT-READY or AT-RISK.
- `haunted-library` is "AT-RISK (best-behaved on counts, sends real counts B21-235)"
  — the only game that already sends accurate `correctAnswers`/`totalAttempts`.
- `hauntedLibrary.ts#calculateXP` already uses the canonical 0..1 accuracy and the
  `Math.min(10, base + bonus)` formula (Decision 3.3).
- `HauntedLibraryGame.tsx#onComplete` sends `{ xp, accuracy, correctAnswers, totalAttempts }`
  — the `xp` field must be removed and `idempotencyKey`/`gameType`/`difficulty`/`duration`/`victory`
  added.

### Decision 3.5 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:** `haunted-library` is the representative game migrated in Phase 3.

Migration scope:
1. `HauntedLibraryGame.tsx#onComplete` payload is rebuilt to match
   `GameCompletionInputSchema`:
   - Add `gameType: "haunted-library"`.
   - Add `difficulty` (already in `LibraryState.difficulty`).
   - Add `duration: finalState.time` (already in `LibraryState.time`).
   - Add `victory: finalState.phase === "victory"`.
   - Add `idempotencyKey: crypto.randomUUID()` (generated once per game session,
     stored in a `useRef`).
   - Add `clientTimestamp: Date.now()`.
   - Add `score: finalState.score`.
   - **Remove `xp`** — the server computes it.
2. The `onComplete` callback (passed by the page) POSTs to
   `/api/v1/games/haunted-library/complete` with the contract payload.
3. `apps/advantage-games/src/app/api/v1/games/haunted-library/complete/route.ts` is
   rewritten to call `createCompleteRoute()` (which now validates via
   `GameCompletionInputSchema` and delegates to `recordGameCompletion`).
4. The existing `hauntedLibrary.ts#calculateXP` (client-side) is **kept** as a
   preview for the end-screen display, but the server-side `calculateGameXP` is the
   source of truth for awarded XP. The end-screen may show "XP: (pending)" or the
   client-side preview until the server response arrives.

**Out of scope (Phase 5+):** migrating the remaining 25 games. Each game migrates one
batch at a time, gated by its `game-readiness-matrix.md` per-game blockers. NOT-READY
games (labyrinth-goblin-king, abyssal-well, etc.) must fix their per-game blockers
before migration.

---

## Decision 3.6 — Test runner and gate commands

**Question:** What are the Red/Green gate commands for Phase 3, given the contract spans
`packages/domain` (vitest) and `apps/advantage-games` (jest)?

**Source reality at HEAD `8900196e`:**

- `packages/domain/package.json` `"test": "vitest run"` — vitest.
- `apps/advantage-games/package.json` `"test": "jest"` — jest.
- The existing `completeRoute.test.ts` (jest) asserts `xp: 100` is echoed back —
  this test must be rewritten to assert `xp` is rejected (true Red → Green).

### Decision 3.6 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:**

- **RED_TEST_COMMAND (Phase 3):**
  ```bash
  pnpm --filter @reading-advantage/domain test -- games
  ```
  (vitest, bounded to the new `games.test.ts` file). Mid-Red may also run the jest
  bounded Red:
  ```bash
  pnpm --filter vocabulary-games test --testPathPatterns=completeRoute
  ```
  to prove the rewritten `completeRoute.test.ts` fails for the intended reason
  (contract rejection of `xp`).

- **GREEN_TEST_COMMAND (Phase 3):**
  ```bash
  pnpm --filter @reading-advantage/domain test -- games
  ```
  (vitest, the new `games.test.ts` passes). Jr-Green also runs:
  ```bash
  pnpm --filter vocabulary-games test --testPathPatterns=completeRoute
  ```
  to prove the rewritten `completeRoute.test.ts` passes.

- **PROJECT_LINT:** `pnpm --filter @reading-advantage/domain lint && pnpm --filter vocabulary-games lint`
- **PROJECT_CHECKS:** `pnpm --filter @reading-advantage/domain check-types && pnpm --filter vocabulary-games check-types`
- **PROJECT_TESTS (acceptance):** `pnpm --filter @reading-advantage/domain test && pnpm --filter vocabulary-games test`

**Aggregate suite:** Per `measure/tracks.md:112-115`, the monorepo aggregate suite is
red at baseline from pre-existing, owner-labeled failures. Phase 3 does NOT attempt to
green the aggregate. The gate is scoped to the two filters above. Any non-domain /
non-vocabulary-games red is pre-existing and labeled as such in `known_failures`.

**Test file locations:**
- `packages/domain/src/__tests__/games.test.ts` (vitest) — contract validation, XP
  formula, fire-once guard, permissions.
- `apps/advantage-games/src/lib/games/api/completeRoute.test.ts` (jest, rewritten) —
  route handler validation and delegation.
- `apps/advantage-games/src/components/games/sentence/haunted-library/HauntedLibraryGame.test.tsx`
  (jest, extended) — `onComplete` payload shape (asserts `idempotencyKey`/`gameType`
  present, `xp` absent).

---

## Decision 3.7 — Auth and tenant honesty (Phase 3 standalone)

**Question:** How does Phase 3 handle the fact that `apps/advantage-games` has no auth
and no `schoolId`, while the contract's `recordGameCompletion` takes a `tenant`?

**Source reality at HEAD `8900196e`:**

- `apps/advantage-games` has NO auth (grep for `next-auth`/`getSession`/`requireAuth`
  in `src/` returns 0 hits; `next-auth` is in `package.json` but unused).
- The games app is standalone (not imported into Reading/Primary yet — Phase 5+ gate).
- `recordGameCompletion` signature includes `tenant: Tenant` (matching `recordActivity`
  pattern). The standalone games app has no `tenant`.

### Decision 3.7 (`[x]` — fully evidence-grounded, no PO gate)

**Policy frozen:** Phase 3 uses the same honest-control split as Phase 2 marketing:

- **Domain function (`recordGameCompletion`):** requires a real `TenantDB`, `UserContext`,
  and `Tenant`. It calls `assertCan(user, "games:complete", tenant)`. This is the
  contract that host apps (Reading/Primary) call when importing the game.

- **Standalone games app route handler (`completeRoute.ts`):** remains `force-static`
  (mock). It validates the input via `GameCompletionInputSchema` (proving the contract
  rejection works) but does NOT call `recordGameCompletion` with a real DB — it returns
  a mock `{ xpEarned: calculateGameXP(parsed), activityId, duplicate: false, status: 200 }`
  response. This is honest: the standalone app has no DB, no auth, no tenant; the
  contract is proven at the schema and formula level, and the domain function is proven
  at the unit level with a mock DB.

- **The route handler's mock response uses `calculateGameXP`** (the real server-side
  formula), so the standalone app's XP display matches what the host app would award.
  This is the "preview" behavior: the student sees the XP they would earn; the host
  app's `recordGameCompletion` is what actually persists it.

- **Phase 4 wires real persistence** when the game is imported into a host app with a
  real `TenantDB`. The standalone app remains mock-only.

This split is documented in `packages/domain/src/games/mutations.ts` JSDoc and in
`apps/advantage-games/src/lib/games/api/completeRoute.ts` JSDoc, and asserted by a
test that verifies the route handler returns a mock response without invoking a real
DB (the `db` mock is never called).

**Out of scope (Phase 4):** real persistence in the standalone app (not needed — the
standalone app is a preview/sandbox; persistence happens in the host app).

---

## Summary table

| # | Decision | Tier 1 (automatable, `[x]`) | Tier 2 (PO/infra-gated, `[b] deferred`) |
|---|----------|------------------------------|------------------------------------------|
| 3.1 | Where the shared contract lives | New `packages/domain/src/games/` module (7-file structure) | (none) |
| 3.2 | Contract shape | `GameCompletionInputSchema` with 10 fields + `.strict()`; `gameTypeEnum` from `gameCards.ts`; `accuracy` 0..1; `difficulty` enum with `medium` canonical | `activity_type` pgEnum extension (Phase 4 — schema migration) |
| 3.3 | Server-side XP formula | `calculateGameXP` pure function; `Math.min(10, base + bonus)`; `xp` field rejected by `.strict()` | (none) |
| 3.4 | Fire-once guard | `idempotencyKey` UUID; `SELECT-before-INSERT` on `xpLogs`; `activityId = game:<gameType>:<idempotencyKey>`; `duplicate: true` on retry | DB unique constraint on `xpLogs` (Phase 4 — race-safe) |
| 3.5 | Representative game | `haunted-library` migrated; `onComplete` payload rebuilt; `xp` removed; `idempotencyKey`/`gameType`/`duration`/`victory` added | Remaining 25 games migration (Phase 5+ — gated by per-game readiness) |
| 3.6 | Test runner and gates | vitest (`packages/domain`) + jest (`apps/advantage-games`); bounded Red filters | (none) |
| 3.7 | Auth and tenant honesty | Domain function requires real `TenantDB`/`UserContext`/`Tenant`; standalone route remains mock but validates via real schema | Real persistence in standalone app (Phase 4 — not needed for preview) |

---

## What this enables for Phase 3

Phase 3 (Advantage Games Completion and Scoring Contract) may proceed against **all
Tier 1 decisions immediately**. Mid-Red writes tests against:

- The `GameCompletionInputSchema` rejects `xp`, `accuracy > 1`, unknown keys, invalid
  `gameType`, missing `idempotencyKey`.
- `calculateGameXP` returns the canonical formula result; caps at 10; returns 0 for
  `totalAttempts === 0`.
- `recordGameCompletion` calls `assertCan(user, "games:complete", tenant)`, computes XP
  server-side, checks for existing completion by `(userId, gameType, idempotencyKey)`,
  and returns `duplicate: true` on retry without inserting.
- `HauntedLibraryGame.tsx#onComplete` sends the contract payload (with
  `idempotencyKey`, without `xp`).
- `completeRoute.ts` validates via the schema and returns a mock response using the
  real `calculateGameXP`.

Tier 2 items remain `[b] deferred:po` or `[b] deferred:infra` in `plan.md` and are
**not** invented by Phase 3. Phase 4 owns the persistence/migration work; Phase 5+
owns the remaining-games migration.

---

## Anti-pattern defense summary (carried to test-strategy §0.C)

| Anti-pattern | Phase 3 defense |
|---|---|
| **A4** Vacuous-pass | Every schema-rejection test has a positive control (valid payload accepted). Every fire-once test has a first-call (insert) and second-call (duplicate) pair. |
| **A5** False-claim text | `plan.md` Phase 3 task text must not say "contract enforced" unless `pnpm --filter @reading-advantage/domain test -- games` exits 0. |
| **A6** Registry overstatement | `measure/tracks.md` must not claim D-01/D-02/D-05 "resolved" until Phase 3 acceptance passes. The CA-013 / MR-H05 findings stay "open" until Phase 5 pilot import. |
| **A3** Digit-only count | XP formula tests emit labeled integers (`"XP earned: N"`) and parse; no bare `expect(xp).toBeTruthy()`. |
| **A7** Over-broad filter | Schema-rejection tests match exact invalid keys (`xp`, `dragonCount`), not bare words like "score"/"bonus". |
| **A9** Archived track paths | New tests reference `packages/domain/src/games/` and `apps/advantage-games/src/` only; no runtime dependency on `measure/tracks/<id>/`. |
| **A2** Consent-blind publish | N/A (no publish flow in Phase 3). |
| **A1/A8/A10/A11/A12/A13** | Orchestrator-internal or closeout classes; consciously not applicable to Phase 3 product tests. |
