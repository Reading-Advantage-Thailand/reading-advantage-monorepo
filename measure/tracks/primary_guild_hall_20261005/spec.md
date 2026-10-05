# Spec — The Guild Hall, Milestones, Bestiary, Familiars (wave 3, semester 2)

Track ID: `primary_guild_hall_20261005`
Type: feature
Program: [chibi-quest-primary-program](../../chibi-quest-primary-program.md)

## Context

Owner decision 2026-10-05: the school leaderboard is replaced by guild milestones. The strategy
report forbids ranking students by XP, speed, or raw counts on any shared screen. The class is a
guild; shared screens show what the guild did together.

## Functional Requirements

- FR-1 (leaderboard out): Remove the school leaderboard from the student screens
  (`components/leaderboard.tsx`, `getSchoolLeaderboardController`). The teacher view keeps
  participation (who played this week), never a rank.
- FR-2 (guild milestones): Collective milestones per class, deterministic: the class read 100
  stories, every member read this week, the class cleared 20 expeditions, the class met 10 kinds
  of enemies. Each milestone has a banner and a date. Shown on the student home card and the
  guild hall. No per-student numbers on shared screens.
- FR-3 (guild hall): One class page for students: the class banner, Class Quest boss trophies,
  the milestones, and the bestiary. The teacher's guild hall adds participation and the quest
  controls.
- FR-4 (bestiary): Enemies appear as the class reads across genres and topics, from the Forge
  enemy catalog (68 kinds). Breadth fills it, not volume. An enemy card shows the Forge art and
  the stories that met it.
- FR-5 (familiars): A deterministic companion earned by a reading-day milestone (Forge cat,
  dog, fox, and the other familiars). It sits beside the portrait on the home screen and reacts
  to the streak. No random choice; the owner decides whether the student picks from the earned set.
- FR-6 (copy): en and th. Reduced motion.

## Schema (additive, `primary_` prefix)

`primary_guild_milestone` (schoolId, classId, milestoneKey, reachedAt), `primary_bestiary_entry`
(schoolId, classId, enemyKind, firstMetAt, articleId), `primary_familiar` (schoolId, userId,
familiarKey, earnedAt).

## Non-goals

Guild war (class against class). Trading. Any shared ranking.

## Acceptance Criteria

- No route renders a per-student rank on a shared screen (a test lists the removed components).
- Milestone and bestiary evaluators are idempotent with tests. Familiar grants are deterministic.
- Vision QA at 375 and 1280; axe 0 serious; full suite green.
