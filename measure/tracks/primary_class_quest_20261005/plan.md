# Plan — Primary Class Quest (semester 2)

Starts after `primary_avatar_shop_20261005`. Measure TDD workflow; one commit per task; a
separate agent reviews each phase.

## Phase 0: Discovery
- [x] Read the class challenge domain, contracts, routes, and panels; the map is in "Discovery map (2026-10-06)" below
- [x] Quest template list: four templates in `packages/domain/src/primary-quest/templates.ts` (Goblin King, Lich, Ember the Fire Dragon, Iron Golem; bosses are Forge roster names), en and th copy, one goal per power-up. Owner review open: the Thai copy and the Thai feature name "ภารกิจห้องเรียน"
- [x] Numbers in `packages/domain/src/primary-quest/rules.ts` with 14 tests: `bossTarget`, `hitDamage`, `applyWrongAnswer`, `canEarnPowerUp`

## Phase 1: Contracts and schema
- [ ] `class-quest.ts` contracts in `packages/game-contracts` (template, quest, power-up, heartbeat, dashboard state; strict zod)
- [ ] Additive migrations: `primary_class_quest`, `primary_class_quest_power_up`, `primary_class_quest_heartbeat`; `--required-migration`

## Phase 2: Season (tests first)
- [ ] `assignClassQuest` (creates the challenge definition and the quest; one open per class; fixed target), `cancelClassQuest`
- [ ] Goal evaluators over existing data; `awardPowerUps` idempotent and capped
- [ ] Quest card data: `getStudentQuestCard`, `getTeacherQuestCard`
- [ ] Teacher assign page (`/teacher/quest`: pick a template, class, battle time) and the quest card on the teacher dashboard and class page
- [ ] Student home quest card (a slot next to the Reedy meter; a request to the UX owner if needed)

## Phase 3: Battle (tests first)
- [ ] State machine: rally, play, result; teacher controls; countdown; idempotent transitions
- [ ] Heartbeat route and store; damage and HP rules with power-ups; committed damage via the contribution path
- [ ] Phone battle page with the portrait, HP bar, power-up buttons, and the game run
- [ ] Projector dashboard: boss meter with the pending segment, portrait grid with HP bars, hit feed, state controls; polls every 3 to 5 seconds
- [ ] Result: helpers in play order, GP rewards (idempotent), class banner

## Phase 4: Verify
- [ ] Seeded 25-student week in a test clock (spec acceptance)
- [ ] Vision-agent browser sessions at 375 and 1280; fix Critical and High
- [ ] Separate-agent review; runbook note for teachers (how to run a battle in 8 minutes); retrospective

## Gates
- [ ] Tests, tsc, ESLint green; Tutor read test unaffected
- [ ] No ranking on any shared screen (checked in the review)

## Discovery map (2026-10-06)

Reused as is:
- `game_challenge_definitions`, `game_challenge_runs`, `game_challenge_contributions` and the domain in `packages/domain/src/challenges` (`createClassChallenge`, `startClassChallengeRun`, `recordChallengeContribution`, `listClassChallenges`). A quest creates one definition at assignment (`startsAt` Monday, `expiresAt` the battle end, `target` = `bossTarget(roster)`), so the existing contribution path commits the battle damage: one contribution per student per challenge (`school_challenge_user_unique`), so committed damage is one completion per student. The pending segment from heartbeats carries the per-answer detail.
- Routes `/api/v1/apk/challenges/{runs,classes,teacher-classes}` through `lib/apk/challenge-dependencies.ts` and `ApkChallengeRouteDependencies`; `resolveGameCapability` checks `CARTRIDGE_CHALLENGE_CAPABILITIES` (wizard-vs-zombie, dragon-flight, dragon-rider; all vocabulary; modalities reading and read-to-select-audio).
- The teacher create panel `TeacherChallengePanel` (play-kit) on `/teacher/game-challenges`; the student catalog in `StudentCartridgeHost`.
- Goal data: reading days from `user_activity.createdAt` (Bangkok days, `countStreakDays` in primary-home/streak.ts); accuracy from `user_activity.details.score` on MC rows (`actions/question.ts`); streak from `countStreakDays`; lesson steps from `primary_student_lesson_steps.status = 'done'`.
- GP: `primary_gp_ledger` with `reason` `battle` and `sourceKey` `quest:<questId>` (unique per user), so the reward is idempotent by the existing unique index.
- Portraits: `AvatarPortrait` and `getClassAvatars` from the avatar shop track.

Added by this track (Phase 1 onward):
- Tables `primary_class_quest`, `primary_class_quest_power_up`, `primary_class_quest_heartbeat` (FLAT, `schoolId`).
- Contracts `class-quest.ts` in game-contracts; domain module `primary-quest` (rules and templates exist; season, goals, battle to come).
- Pages `/teacher/quest`, `/teacher/quest/[id]/live`, `/student/quest/battle`; the quest card on the student home and the teacher dashboard.

Open items for the owner:
- Battle content: a challenge definition needs vocabulary items. Proposal: at assignment, take the words of the class's current book (the class-book lesson words, as the flashcard decks do); fall back to the teacher's own list from the existing panel. Decide before Phase 2.
- GP reward placeholders: 50 GP per participant and 25 GP more when the boss falls (`BATTLE_GP`, `BOSS_FALLEN_GP`).
- Separate-agent reviews: not possible under the no-subagent rule; the browser walk-through and the tests stand in.
