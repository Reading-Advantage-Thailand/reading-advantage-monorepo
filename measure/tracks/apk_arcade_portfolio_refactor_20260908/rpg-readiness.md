# P5.1 RPG readiness

## Scope

This review covers identity, mastery, XP, quests, inventory, rewards, and game completion consumers.

This review does not implement RPG features. It does not accept Phase 5.

The owner requires written Thai targets with English audio answers. RPG work must preserve that learning direction.

## Current readiness

| Area | Reusable base | Readiness | Main gap |
| --- | --- | --- | --- |
| Identity | First-party users, sessions, and school scope | Partial | No persistent cosmetic identity contract exists. |
| Completion | Shared completion contract and domain command | Strong base | Three host adapters do not share one transport implementation. |
| XP | Server-calculated game XP and an idempotent ledger | Partial | Three stored XP views can disagree. |
| Mastery | Science mastery and a generic persistence port | Partial | No approved game evidence mapping exists. |
| Rewards | Science achievements table and badge rules | Limited | Badge rules remain inside the Science app. |
| Quests | None | Missing | No quest definition, progress, or grant service exists. |
| Inventory | None for persistent student cosmetics | Missing | A game-local inventory is transient mechanic state. |

## Exact reusable modules

### Identity and tenancy

- `packages/db/src/schema/users.ts` defines persistent users, schools, and sessions.
- `users.id` is the stable student identity. `users.schoolId` supplies the tenant boundary.
- `users.image` can display an account image. It does not represent an equipped RPG cosmetic.
- `packages/auth/src/tenant.ts` defines `UserContext` and `Tenant`.
- `packages/auth/src/session.ts` provides `validateSession()` for the shared database session.
- `packages/domain/src/db-contract.ts` provides `createTenantDB()` for school-scoped access.
- `packages/domain/src/tenant-registry.ts` marks `gameCompletions`, `gamificationProfiles`, and `achievements` as `FLAT` tables.

These modules can identify a student and enforce a school boundary. A new RPG profile should reference the existing user and school.

The session view contains `users.xp` and `users.level`. It does not contain `users.image` or any cosmetic selection.

### Authoritative game completion

- `packages/game-contracts/src/educational-io.ts` freezes the cartridge input as `{ term, translation }`.
- The same file freezes `GameResults` at five fields.
- `packages/game-contracts/src/completion.ts` provides `mapGameResultsToCompletionInput()`.
- `packages/domain/src/games/schema.ts` rejects client XP and other unknown completion fields.
- `packages/domain/src/games/xp.ts` provides `calculateGameXP()`.
- `packages/domain/src/games/mutations.ts` provides `recordGameCompletion()`.
- `packages/domain/src/games/queries.ts` provides `getGameCompletions()` and `getSchoolLeaderboard()`.
- `packages/db/src/schema/analytics.ts` defines `gameCompletions` and `xpLogs`.

`recordGameCompletion()` calculates XP on the server. It writes the completion and XP log in one transaction.

The unique completion key is `(schoolId, userId, activityId)`. The XP log also rejects a duplicate `(userId, activityId)`.

The command validates answer-audio counts before it writes. This check blocks inconsistent answer totals at the domain boundary.

The three current APK completion consumers are:

- `apps/advantage-games/src/app/api/v1/apk/complete/route.ts`
- `apps/reading-advantage/app/api/v1/apk/complete/route.ts`
- `apps/primary-advantage/app/api/v1/apk/complete/route.ts`

Each route requires a student session and a school. Each route calls `recordGameCompletion()`.

The Advantage Games route uses `createApkCompletionRoute()`. That adapter also checks the request origin and blocks server-owned metadata keys.

The Reading and Primary routes use separate adapters. They do not apply the same metadata denylist.

Future RPG grants must use the saved completion row. They must not trust client score, XP, identity, or open metadata.

### Thai to English evidence

- `packages/game-contracts/src/listening.ts` defines `readToSelectAudioSessionConfigSchema`.
- The fixed prompt locale is `th-TH`. The fixed answer locale is `en-US`.
- The prompt field is `translation`. The answer field is `term`.
- `readToSelectAudioEvidenceSchema` records ordered answer attempts and completed playback.
- `completionMetadataSchema` validates the reserved `learningEvidence` value.

A future quest can require this exact validated modality. It must inspect saved evidence through a domain query.

The old reverse listening mode remains unavailable for Wizard. A quest must not require that mode.

### XP and profile reads

- `gameCompletions.xpEarned` stores the award beside the authoritative game result.
- `xpLogs` supplies the existing total in `packages/domain/src/progress/queries.ts`.
- `gamificationProfiles` stores a separate XP, level, streak, and activity time.
- `packages/domain/src/gamification/queries.ts` reads that profile.
- `packages/domain/src/students/get-my-gamification.ts` reads that profile and recent achievements.
- `packages/domain/src/students/get-student-gamification-profile.ts` creates and reads the same profile.
- `users` also stores separate `xp` and `level` columns.

Game completion writes `gameCompletions` and `xpLogs`. It does not update `gamificationProfiles` or `users`.

Current profile screens can therefore omit game XP. A session can also expose another XP total.

`packages/domain/src/gamification/mutations.ts` only provides an administrator overwrite. It is not an idempotent award command.

### Science rewards

- `packages/db/src/schema/science.ts` defines `gamificationProfiles` and `achievements`.
- `achievements` has one row per user and badge type.
- `apps/science-advantage/lib/gamification/xp.ts` awards profile XP.
- `apps/science-advantage/lib/gamification/streak.ts` updates a profile streak.
- `apps/science-advantage/lib/gamification/badges.ts` evaluates and grants badges.
- `packages/domain/src/quiz/submit-attempt.ts` coordinates these operations for a Science quiz.

The data tables can support simple profile totals and unique badges. The app-local commands cannot serve as shared RPG domain services.

The current badge rules inspect Science records. They do not define cosmetic ownership, equipment, or quest rewards.

### Mastery

- `packages/domain/src/mastery/persistence-contracts.ts` defines `mastery.persistence.v1` records and commands.
- `MasteryPersistencePort` supports an atomic, idempotent evidence commit.
- The records include a school, student, objective, evidence source, and proficiency state.
- `packages/domain/src/mastery/record-run.ts` processes completed Science quiz attempts.
- `packages/domain/src/students/get-student-mastery-profile.ts` reads Science standard mastery.

The generic persistence contract offers useful transaction and retry patterns. It does not yet accept APK completion evidence.

The Science path depends on Science attempts, questions, and standards. RPG XP must stay separate from educational mastery.

## Missing RPG services

The repository has no persistent student quest service. It has no quest lifecycle, eligibility rule, progress record, or claim receipt.

The repository has no persistent cosmetic inventory service. It has no item catalog, ownership row, equipped slot, or grant command.

`apps/advantage-games/src/lib/games/castleDefense.ts` contains a player inventory. That array stores words during one game.

The Castle Defense array must not become the RPG inventory. It has no user, school, persistence, or reward ownership.

## Decisions required before P5.2

1. Select one canonical XP total for student profiles.
2. Define how existing `xpLogs`, `gamificationProfiles`, and `users.xp` reconcile.
3. Define the first cosmetic item set and equipped slots.
4. Define each quest trigger from saved completion facts.
5. Define quest periods, reset rules, and completion limits.
6. Define an idempotency key for each reward grant.
7. Define whether earlier valid completions can satisfy a new quest.
8. Define a mastery mapping for validated learning evidence, if required.

## Recommended ownership boundary

Add RPG contracts and commands under a shared backend domain module. Keep the three Next.js routes as thin adapters.

Use the authenticated user and tenant from the server session. Never accept a student ID or school ID from a reward payload.

Use `recordGameCompletion()` as the trusted gameplay input. Add reward grants through a tenant-scoped, idempotent transaction.

Keep cosmetic rewards separate from score, difficulty, health, and ranked gameplay power. Store cosmetic selection as profile presentation data.

Keep mastery changes behind a separate evidence command. Do not convert survival score or time played into mastery.

Preserve the educational ABI and language direction. `term` remains English, and `translation` remains Thai for Wizard content.

## Required P5 tests

- Reject a reward request for another school.
- Return the same result for a replayed grant.
- Prevent a second grant after concurrent completion requests.
- Roll back an interrupted completion and reward transaction.
- Reject client XP, reward values, item identifiers, and quest completion flags.
- Keep a cosmetic change out of leaderboard calculations.
- Keep game XP separate from mastery state.
- Verify Thai prompts and English audio answers for modality quests.

P5.1 establishes a bounded source review. P5.2 must define concrete rewards and quest rules for review.
