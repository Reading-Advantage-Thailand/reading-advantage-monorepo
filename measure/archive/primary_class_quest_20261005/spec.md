# Spec — Primary Class Quest (semester 2)

Track ID: `primary_class_quest_20261005`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md) (semester 2)
Source plan: `advantage-forge/docs/chibi-quest-progression.md`, sections "Guild Mode", "The
battle", and "Safety rules" (Phase 4). Internal name: Guild Mode. Product name: **Class Quest**.
Guardrails: `advantage-pr/14-reports/reading-advantage-mastery-led-student-experience-strategy-2026-06.md`
section 8 (cooperative asynchronous PvE first, no public ranking).

## Owner decisions (2026-10-05)

1. Starts in semester 2 after `primary_avatar_shop_20261005` (GP rewards need the ledger).
2. The projector shows a **dashboard** only (portraits, HP bars, a boss meter, a feed of hits).
   The 3D composite from the Forge plan is deferred. The model is the Wayground (Quizizz) live
   session: students join on their own devices, the teacher projects one page, and the page
   updates as answers come in. Differences from Wayground: no leaderboard and no rank on any
   shared screen; the class fights one boss together; a setback is a rest, never a game over.
3. The teacher picks the week's quest from a **fixed list** of quest templates. Custom quests
   come later.
4. Name: Class Quest in the UI (Thai name to be chosen with the copy).

## Context

A week is one quest. On Monday the teacher assigns a quest from the list. Students earn
power-ups all week from goals, accuracy, and streaks. In the last minutes of the last period
the class fights a boss together: each student plays on their own device, and the teacher
projects the dashboard. Phones post completions and short heartbeats over plain HTTP; the
dashboard polls. No websocket and no shared simulation.

What exists today in the monorepo: class challenge definitions (start, expiry, target), runs,
contributions tied to verified game completions, four API routes, the teacher create panel,
and the student catalog with "Class progress: n of target" (`packages/domain/src/challenges`,
`packages/game-contracts/src/challenges.ts`, `packages/db/src/schema/game-challenges.ts`).
Completion evidence carries `correctAnswers` and `accuracy`. Forge has the boss simulation
(`src/host/classBoss.ts`: damage = correct answers x 2, helpers never ranked) and the avatar
portraits. Lane F delivers the student portrait and the portrait package. The shop track
delivers the GP ledger.

## Functional Requirements

### Season
- FR-1 (quest templates): A fixed list of quest templates in code (not in the database): a
  title in en and th, a boss (name, art key, base HP per student), the game and content mode
  for the battle (from `CARTRIDGE_CHALLENGE_CAPABILITIES`), and the goal set. The first list
  has at least three templates with different bosses and goal sets.
- FR-2 (assign): The teacher assigns one template to a class for a week: start (Monday
  00:00 Asia/Bangkok by default), battle time (date and time), and the class. One open quest
  per class. Stored as `primary_class_quest` (schoolId, classId, templateId, challengeId FK to
  a class challenge definition created at the same time, startsAt, battleAt, bossTarget,
  status `open` | `battle` | `done`, createdBy). The teacher can cancel before the battle.
- FR-3 (boss target): Fixed at assignment: roster size x expected damage per student x expected
  participation. The constants live in one domain function with defaults from the Forge plan
  (expected damage 20, participation 0.7) and are tuned from the first two seasons' data. The
  target never changes during the week.
- FR-4 (meter): The quest card shows the boss, the days left, the class meter (committed
  damage toward the target), and the student's own power-ups on the student home (a slot like
  the Reedy meter) and on the teacher dashboard and class page.

### Power-ups
- FR-5 (goals): Goals come from the template's goal set and read existing data only: reading
  days this week (`user_activity`), accuracy on the week's questions (`article_activity_logs`),
  streak days (`countStreakDays`), and lesson steps done. Never raw volume, never speed.
- FR-6 (power-ups): Each goal met gives one named power-up (shield: blocks one HP loss; sharp
  blade: +1 damage per correct answer for the battle; rally horn: +25% damage for 60 seconds,
  once). A cap per student per week (default 3). Stored in `primary_class_quest_power_up`
  (schoolId, userId, questId, goalKey, powerUp, earnedAt; unique per goal). Evaluated by a
  domain function that runs on the student home load and on the battle start, idempotent.

### Battle
- FR-7 (flow): Three states driven by the teacher from the dashboard: rally (students open the
  battle page and post "present"), play (the challenge run; 5 minutes by default), and result.
  The teacher starts and ends each state. A refresh of any screen loses nothing.
- FR-8 (damage and HP): Correct answers are damage (x2, plus power-ups). A wrong answer costs
  1 HP of 5. At 0 HP the student rests 10 seconds and returns with half HP. Committed damage
  comes from verified completions through the existing contribution path. The phone posts a
  heartbeat every 10 seconds and after each answer: `{ runId, answered, correct, hp,
  powerUpsUsed }` to `primary_class_quest_heartbeat` (latest per run, idempotent).
- FR-9 (phone page): `/student/quest/battle`: the boss, the student's portrait, the HP bar,
  the damage counter, the power-up buttons, and the game. 48 px targets; en and th; works at
  375 px; reduced motion.
- FR-10 (projector dashboard): `/teacher/quest/[id]/live`, one page for the projector:
  the boss with its HP meter (committed, plus a lighter pending segment from heartbeats), the
  class as a grid of portraits with HP bars (a bar dims after 60 seconds without a heartbeat),
  a feed of hits, the state controls, and a countdown. Polls every 3 to 5 seconds. Large
  type for a projector. No names ranked, no scores per student on this screen.
- FR-11 (result): The boss falls or holds. The dashboard shows the class total and every
  helper (play order, never damage order). Rewards post to the GP ledger (`battle` reason,
  one row per participant, idempotent on questId + userId) and a class banner when the boss
  falls. The teacher's own view may show who played and who did not.

### Safety (from the plan)
- FR-12: No ranking on any shared screen. No real money, no random rewards, no trading. The
  avatar shows the display name only. A student without an avatar plays with the base
  portrait.

## Schema (additive only, `primary_` prefix)

`primary_class_quest`, `primary_class_quest_power_up`, `primary_class_quest_heartbeat`. The
class challenge tables stay as they are; a quest references one challenge definition.
`--required-migration` in the Primary `cloudbuild.yaml`.

## Non-goals

- The 3D composite screen. Real-time transport. Guild war (class against class).
- Custom quests built by the teacher (a later track). A solo boss for classes without a quest
  (open question in the plan).
- Changes to game internals: the battle runs an existing challenge-capable game.

## Acceptance Criteria

- Domain tests: target formula, one open quest per class, goal evaluation idempotent and
  capped, heartbeat latest-per-run, damage and HP rules with power-ups, reward idempotency.
- A seeded class of 25 runs a full week in a test clock: goals earn power-ups, the meter
  moves, the battle runs through rally, play, and result, and the dashboard shows every HP
  bar from heartbeats with no ranking.
- Browser session by a vision agent at 375 (phone) and 1280 (projector): no Critical or High.
- `pnpm test`, tsc, ESLint green. The Tutor read test is unaffected.
