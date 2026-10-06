# Chibi Quest in Primary Advantage: the RPG theme in daily activities

Version: 0.1 (draft)
Date: 2026-10-05
Status: Planned for semester 2. Owner: Daniel Bo.
Sources: `advantage-forge/docs/chibi-quest-progression.md`, `advantage-forge/docs/avatar-system.md`,
`advantage-forge/docs/demo-monster-encounters.md`, `advantage-forge/docs/apk-2d3d-program.md`,
`advantage-pr/14-reports/reading-advantage-mastery-led-student-experience-strategy-2026-06.md`
(sections 8 and 9), `mastery-advantage/english/README.md` (PA levels 1-14 on GSE 10-70).

## Owner decisions (2026-10-05)

1. The expedition loop is the core in-app loop: read first, then encounters built from the
   article, then a result. The Forge Monster Encounters demo is the model.
2. The school leaderboard is replaced by guild milestones. No student is ranked on a shared screen.
3. The world map uses the Forge locations, and its regions follow the Mastery Advantage skill
   tree: one region per Primary Advantage level (14 levels, GSE 10-70, Young Learners), grouped
   into four lands by CEFR band (Pre-A1 levels 1-3, A1 levels 4-6, A2 levels 7-9, B1 and up
   levels 10-14).
4. This program file holds the plan, with one track per wave.

## The frame

The student is an adventurer. An article is an expedition. The class is a guild, and the teacher
is the guild master. The semester is a campaign across a map. The home screen is the camp. Every
feature below is one of these five seen from another side.

## Guardrails (every track)

Reading comes first in every loop (the encounter never opens before the article). Rewards are
deterministic. Nothing measures speed. Nothing ranks a student on a shared screen. No random
boxes, no real money, no trading, no free-text names. Thai-first copy. Portraits only on phones;
3D only where the device check allows it, with the 2D view as the fallback. The theme never sits
between the child and the article. Schema is additive with the `primary_` prefix.

## Waves and tracks

| Wave | Track | Runs after | Content |
|---|---|---|---|
| 1 | [primary_quest_reskins_20261005](./tracks/primary_quest_reskins_20261005/) | Lane G (core interaction quality) | Reskins with no schema: daily quest board, campfire streak, training yard, lesson trail, party formation, quest log, guild cards, titles, mascots, sound cues |
| 2 | [primary_expedition_loop_20261005](./tracks/primary_expedition_loop_20261005/) | the APK 3D port merge, Lane F portraits, the avatar shop | The expedition after every article (Monster Encounters port), the world map by level, the class spell on the projector, the campaign certificate |
| 3 | [primary_guild_hall_20261005](./tracks/primary_guild_hall_20261005/) | Class Quest | The guild hall, guild milestones in place of the leaderboard, the class bestiary, familiars |

Semester-2 order (default, owner to confirm): Lane G Phases 1-4, then wave 1, then the avatar
shop, then wave 2, then Class Quest, then wave 3. Wave 1 has no schema and may run beside the
shop track when memory allows two lanes.

## Dependencies outside this program

- The APK 3D port (`apk3d-games-port` branch, track `apk3d_games_port_20261003`): the 3D kit,
  the 29 cartridges, the `story-input` contract, and the Primary `StoryGamesClient` host exist
  on that branch. The pull request, review, and deploy are pending. Monster Encounters is not in
  `game-cartridges-3d` yet; wave 2 ports it.
- Lane F: the avatar profile, the picker, and the portrait package.
- `primary_avatar_shop_20261005`: the GP ledger for quest rewards.
- `primary_class_quest_20261005`: the boss battle and the projector dashboard, reused by the
  class spell and the guild hall.
- Mastery Advantage: the level mapping only. The engine port into Primary is not required for the
  map; the map reads `users.level` today and the knowledge state later.

## Open questions

1. Thai names for the five frame words (adventurer, expedition, guild, campaign, camp) and for
   Class Quest.
2. Whether the familiar (wave 3) is one deterministic companion per milestone, or a choice.
3. Whether the campaign certificate is printed by the teacher or sent home as a PDF.
