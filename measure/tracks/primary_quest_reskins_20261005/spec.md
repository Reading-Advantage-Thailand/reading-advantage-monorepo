# Spec — Chibi Quest Reskins (wave 1, semester 2)

Track ID: `primary_quest_reskins_20261005`
Type: feature
Program: [chibi-quest-primary-program](../../chibi-quest-primary-program.md)

## Context

Wave 1 puts the RPG frame on the daily activities with no schema change and no new game. Every
item reuses Lane C screens, Lane F portraits, Lane G components, and Forge art (items, icons,
enemies, familiars, locations). Each item is copy, art, and layout. The learning logic does not change.

## Functional Requirements

- FR-1 (daily quest board): Three quests a day on the student home: read one story, review ten
  cards, play one game. Each shows done or not from existing activity data. A small fixed GP
  reward when the ledger exists; until then, a stamp. Cap: three a day.
- FR-2 (campfire streak): The streak is a fire on the home screen. One rest day a week keeps it
  lit. A lost streak shows ashes and a kind line, never a penalty. Uses `countStreakDays`.
- FR-3 (training yard): The flashcard review keeps FSRS and its four ratings, with child names
  (dodge, hit, strong hit, critical) and Forge item art on the cards. Due cards are "today's
  sparring partners".
- FR-4 (spellbook and scroll case): Saved words show as spell cards and saved sentences as
  scrolls, with Forge item art by part of speech. Breadth opens a cover; counts are private.
- FR-5 (lesson trail): The Lane C step rail shows the 13 steps as waypoints on a path with four
  camps (the four periods). The rail logic and the step order do not change.
- FR-6 (morning drill and party formation): The bell-ringer game link gets the training-yard
  frame. The pair-conversation step shows the two portraits and a quest card with the prompt.
- FR-7 (quest log): The writing step is a journal page with the portrait and the expedition name.
- FR-8 (guild cards): The QR login card prints the portrait as an adventurer's guild card. The
  picture-password grid uses Forge item icons (same shapes and colors rule as Lane B).
- FR-9 (titles): Apprentice, Scribe, Scroll Keeper, Sage by level bands; shown under the
  portrait; never bought.
- FR-10 (mascots and sound): Forge enemies and NPCs in empty and error states (gap list V9).
  RPG sound cues through the Lane C sound set with the per-student mute.
- FR-11 (copy): All new copy in en and th. Reduced motion for every animation.

## Non-goals

New tables, new games, changes to FSRS, to lesson steps, or to XP rules.

## Acceptance Criteria

- Vision QA at 375, 768, and 1280 for every touched screen; no Critical or High.
- axe 0 serious. Tests for every component and for the daily-quest and streak evaluators.
- The full Primary test suite, tsc, and ESLint are green.
