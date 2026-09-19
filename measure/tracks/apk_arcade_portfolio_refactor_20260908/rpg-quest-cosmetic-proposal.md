# P5.2 and P5.3 quest and cosmetic proposal

## Status

This proposal prepares a small RPG reward implementation for review.

It does not add a migration or backend code. It does not accept Phase 5.

The design preserves server-calculated game XP. It does not infer language mastery from score, duration, or rewards.

## Source facts

- `packages/domain/src/games/mutations.ts` validates completion input and calculates XP on the server.
- The same command writes `gameCompletions` and `xpLogs` in one transaction.
- `packages/db/src/schema/analytics.ts` makes each completion unique by school, user, and activity.
- `packages/domain/src/db-contract.ts` applies the school scope to every `FLAT` table operation.
- `packages/db/src/schema/users.ts` provides the composite school and user identity.
- `packages/game-contracts/src/listening.ts` validates written Thai prompts and English audio answers.
- `packages/auth/src/permissions.ts` provides the current game completion and own-history permissions.
- `packages/game-cartridges/src/catalog-standard-art.ts` maps the current Wizard prop assets.
- `packages/game-cartridges/src/wizard-standard-art.ts` records each asset source, license, dimensions, and grid.

The current XP ledger stays authoritative. This proposal does not update `users.xp` or `gamificationProfiles.xp`.

## Reward set

All rewards use one `profile-emblem` slot. They have no effect on score, movement, health, difficulty, or XP.

| Cosmetic ID | Display name | Existing asset | Quest |
| --- | --- | --- | --- |
| `apprentice-wand` | Apprentice Wand | `staff-normal-1` candidate | `first-ward` |
| `graveyard-staff` | Graveyard Staff | `staff-blue-54` candidate | `complete-the-ward` |
| `echo-staff` | Echo Staff | `staff-purple-78` candidate | `perfect-english-audio` |

These 32px files exist in the reviewed standard pack. The ElvGames license permits game use with credit.

The candidates still need owner acceptance in the profile frame. The review must confirm legibility and credit placement.

## Quest rules

Each quest is permanent and can unlock once. Only a newly saved authoritative completion can trigger a reward.

Earlier completions do not unlock these initial rewards. A later backfill requires a separate reviewed task.

| Quest ID | Exact saved completion rule | Reward |
| --- | --- | --- |
| `first-ward` | `gameType` is `wizard-vs-zombie` and `totalAttempts` is at least one | `apprentice-wand` |
| `complete-the-ward` | The first rule passes and `victory` is true | `graveyard-staff` |
| `perfect-english-audio` | The second rule passes and the full answer-audio rule below passes | `echo-staff` |

The full answer-audio rule requires all these facts:

1. `learningEvidence` passes `readToSelectAudioEvidenceSchema`.
2. The prompt locale is `th-TH`, and the answer locale is `en-US`.
3. The prompt field is `translation`, and the answer field is `term`.
4. `questions.length` equals `itemCount`.
5. Every question ends with one `completedQuestion` attempt.
6. `totalAttempts` equals `itemCount`, and `correctAnswers` equals `itemCount`.

This rule proves a complete validated session. It does not prove independent language mastery.

## Browser-safe contracts

Add these contracts to `packages/game-contracts/src/rpg.ts`. Export them through the package index.

```ts
export const rpgQuestIdSchema = z.enum([
  "first-ward",
  "complete-the-ward",
  "perfect-english-audio",
]);

export const rpgCosmeticIdSchema = z.enum([
  "apprentice-wand",
  "graveyard-staff",
  "echo-staff",
]);

export const rpgCosmeticSlotSchema = z.literal("profile-emblem");

export const rpgCosmeticSchema = z.object({
  id: rpgCosmeticIdSchema,
  slot: rpgCosmeticSlotSchema,
  name: z.string().min(1).max(60),
  unlockedAt: z.string().datetime().nullable(),
  equipped: z.boolean(),
}).strict();

export const rpgQuestStateSchema = z.object({
  id: rpgQuestIdSchema,
  completed: z.boolean(),
  completedAt: z.string().datetime().nullable(),
  rewardId: rpgCosmeticIdSchema,
}).strict();

export const studentRpgStateSchema = z.object({
  schemaVersion: z.literal(1),
  equippedEmblemId: rpgCosmeticIdSchema.nullable(),
  cosmetics: z.array(rpgCosmeticSchema).length(3),
  quests: z.array(rpgQuestStateSchema).length(3),
}).strict();

export const equipRpgCosmeticInputSchema = z.object({
  cosmeticId: rpgCosmeticIdSchema,
}).strict();

export const equipRpgCosmeticResultSchema = z.object({
  equippedEmblemId: rpgCosmeticIdSchema,
}).strict();
```

Do not add XP, a user ID, a school ID, a quest claim, or an unlock flag to client input.

## Database ownership

Add schema definitions in `packages/db/src/schema/rpg.ts`. Add both tables to `packages/domain/src/tenant-registry.ts` as `FLAT`.

`studentCosmeticUnlocks` contains these columns:

- `id`: UUID primary key.
- `schoolId`: required school foreign key.
- `userId`: required user foreign key.
- `questId`: required text.
- `cosmeticId`: required text.
- `sourceCompletionId`: required `gameCompletions.id` foreign key.
- `unlockedAt`: required server timestamp.

Add unique constraints for `(schoolId, userId, questId)` and `(schoolId, userId, cosmeticId)`.

Add a composite foreign key from `(schoolId, userId)` to `users(schoolId, id)`.

`studentRpgProfiles` contains these columns:

- `schoolId`: required school foreign key.
- `userId`: required user foreign key.
- `equippedEmblemId`: nullable text.
- `updatedAt`: required server timestamp.

Use `(schoolId, userId)` as the primary key. Add the same composite user foreign key.

The equip command must verify the matching unlock inside its transaction. The nullable field permits the initial empty profile.

No quest progress table is required. The three quests are binary and use one trusted completion.

## Domain ownership

Create `packages/domain/src/rpg/` with `definitions.ts`, `contracts.ts`, `queries.ts`, `mutations.ts`, `permissions.ts`, and tests.

`definitions.ts` owns the fixed quest rules and reward mapping. The browser cannot submit these values as reward authority.

`grantCompletionCosmetics()` is an internal function. It accepts a transaction and the inserted completion row.

`getMyRpgState()` uses the authenticated user and tenant. It returns the three fixed definitions with current unlock state.

`equipMyRpgCosmetic()` accepts only `cosmeticId`. It checks ownership and updates the caller's tenant-scoped profile.

Add `rpg:read:own` and `rpg:equip:own`. The read and equip functions must use `user.id` and `tenant.schoolId`.

The grant function needs no public permission. `recordGameCompletion()` invokes it after `games:complete` authorization.

## Completion transaction

Keep `gameCompletionResultSchema` unchanged. Hosts still receive only the current authoritative completion result.

Use this future transaction order:

1. Parse the completion through `gameCompletionInputSchema`.
2. Calculate XP with `calculateGameXP()`.
3. Insert `gameCompletions` and return the saved row.
4. Insert the existing `xpLogs` entry.
5. Evaluate the three quests from the saved row.
6. Insert eligible unlock rows with conflict-safe uniqueness.
7. Commit all writes together.

An unexpected reward write failure must roll back the completion and XP write. The client can retry the same activity key.

The current broad unique-violation catch needs a bounded correction during implementation. It must distinguish a completion conflict from a reward conflict.

Use `onConflictDoNothing().returning()` for the completion insert. Return `duplicate: true` when that insert returns no row.

Use `onConflictDoNothing()` for each reward insert. This makes repeated eligible grants safe without changing XP.

One perfect victory can unlock all three cosmetics. Each unique constraint keeps every unlock fire-once.

## Route and UI integration

Keep the three completion routes thin. They continue to call `recordGameCompletion()` without new reward input.

Add a thin `GET` and `PATCH` RPG route beside each authenticated APK route:

- `GET` calls `getMyRpgState()`.
- `PATCH` parses `equipRpgCosmeticInputSchema` and calls `equipMyRpgCosmetic()`.

The first UI integration belongs on these student catalog pages:

- `apps/advantage-games/src/app/[locale]/(student)/student/games/page.tsx`
- `apps/reading-advantage/app/[locale]/(student)/student/games/page.tsx`
- `apps/primary-advantage/app/[locale]/(student)/student/games/page.tsx`

Render a small emblem and quest panel above the game cards. Keep locked rewards visible with their exact quest requirement.

Resolve each cosmetic through the current catalog edition binding. Do not copy asset paths into the reward response.

The result screen can add a later reward notice. That notice must read server state after a successful save.

## Required implementation tests

- Reject a client user ID, school ID, XP value, quest ID, or unlock flag.
- Reject an equip request for a locked cosmetic.
- Block a school B caller from school A unlocks and profiles.
- Grant each eligible cosmetic once across concurrent completion retries.
- Roll back completion, XP, and rewards after an unexpected transaction failure.
- Keep the current XP result and ledger amount unchanged.
- Keep score and duration outside the language mastery model.
- Reject reverse English prompt or Thai answer evidence for the audio quest.
- Reject partial, failed, cancelled, or incomplete answer-audio sessions.
- Keep earlier completions locked without a separate backfill.
- Resolve every cosmetic to an existing reviewed standard-pack binding.

## Review gates

The owner must review the three emblem roles on compact and wide catalog layouts.

The implementation needs a Drizzle migration and tenant coverage tests. It also needs domain, route, and UI tests.

No canonical XP reconciliation is required for this reward set. A separate track can resolve the three legacy XP views.
