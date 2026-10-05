# Plan — Primary Class Quest (semester 2)

Starts after `primary_avatar_shop_20261005`. Measure TDD workflow; one commit per task; a
separate agent reviews each phase.

## Phase 0: Discovery
- [ ] Read the class challenge domain, contracts, routes, and panels; map what the quest reuses and what it adds
- [ ] Write the quest template list (3 or more) with en and th copy, bosses from the Forge enemy catalog, and goal sets; owner review
- [ ] Set the target constants and the HP and power-up numbers in one domain module with tests

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
