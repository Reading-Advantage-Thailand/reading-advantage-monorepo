# Plan — Primary Class Quest (semester 2)

Starts after `primary_avatar_shop_20261005`. Measure TDD workflow; one commit per task; a
separate agent reviews each phase.

## Phase 0: Discovery
- [x] Read the class challenge domain, contracts, routes, and panels; the map is in "Discovery map (2026-10-06)" below
- [x] Quest template list: four templates in `packages/domain/src/primary-quest/templates.ts` (Goblin King, Lich, Ember the Fire Dragon, Iron Golem; bosses are Forge roster names), en and th copy, one goal per power-up. Owner review open: the Thai copy and the Thai feature name "ภารกิจห้องเรียน"
- [x] Numbers in `packages/domain/src/primary-quest/rules.ts` with 14 tests: `bossTarget`, `hitDamage`, `applyWrongAnswer`, `canEarnPowerUp`

## Phase 1: Contracts and schema
- [x] `class-quest.ts` contracts in `packages/game-contracts` (template, goal, quest, assign input, power-up, heartbeat, student and teacher cards, dashboard state, battle state, status input; strict zod; 6 tests). Status is one column: `open`, `rally`, `play`, `result`, `done` (the spec's `battle` is the union of the three battle states)
- [x] Migration `0069_primary_class_quest`: the three tables (FLAT in the registry), one quest that is not done per class (partial unique index), the heartbeat keyed by school, quest, and user; `--required-migration 0069_primary_class_quest` in `cloudbuild.yaml`; applied locally

## Phase 2: Season (tests first)
- [x] `43f008c9c` `assignClassQuest` (the challenge definition from the current lesson glossary, the quest with a fixed target, one open per class by the partial unique index; the definition is removed when a parallel assignment won), `cancelClassQuest` (deletes the definition; the quest cascades)
- [x] `43f008c9c` Goal evaluators over `user_activity` (Bangkok days, MC responses), the streak, and `primary_student_lesson_steps`; `awardPowerUps` idempotent (unique per goal) and capped
- [x] `43f008c9c` `getStudentQuestCard`, `getTeacherQuestCard`; committed damage = correct answers x 2 (x 3 with a sharp blade) over the verified contributions
- [x] Teacher assign page `/teacher/quest` (template radio list with the goals, class select, battle time; `POST /api/v1/quest`), the quest card on the dashboard (one per class) and the class page (`classQuest` slot of the roster), cancel through `DELETE /api/v1/quest/:id`
- [x] Student home quest card after the Reedy meter; the home load runs `awardPowerUps` first. Messages `Quest.*` and `TeacherHome.quest` in en, th, cn, tw, vi

## Phase 3: Battle (tests first)
- [x] `9f53004d8` State machine `setQuestStatus`: open → rally → play → result → done, one step at a time, a repeat is a no-op, a skip or a step back is 409; countdown from `statusAt` and the state minutes; teacher control `POST /api/v1/quest/:id/status`
- [x] `9f53004d8` Heartbeat `POST /api/v1/quest/heartbeat` (latest per student and quest; marks used power-ups); committed damage through the existing contribution path (the battle challenge runs at medium difficulty, the only difficulty the Primary host accepts); the pending segment is the heartbeat damage of students without a committed hit
- [x] Phone page `/student/quest/battle`: boss meter with the pending segment and countdown, portrait with HP bar and damage counter, power-up toggles, the game (`StudentCartridgeHost` with the quest's challenge; new `onCompleted` prop), result banner; polls every 4 s, heartbeat every 10 s and after the saved completion. Deviation: the play kit has no per-answer event, so HP and damage update when the game is saved, not per answer; the rest at 0 HP is applied to the final tally (follow-up: a per-answer event in `APKGameHost`)
- [x] Projector `/teacher/quest/[id]/live`: boss meter with the pending segment, countdown, portrait grid with HP bars (dim when absent or stale), hit feed (last 8), one next-state button; polls every 4 s; no score per student on the screen (tested)
- [x] Result: helpers in play order, GP rewards once per participant when the result opens (`battle`, `quest:<id>`; +25 GP when the boss fell), banner on the phone and the projector

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
