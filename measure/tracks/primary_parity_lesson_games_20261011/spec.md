# Spec: Chibi Quest games in the vocabulary step and the sentence step of the lesson

Track ID: `primary_parity_lesson_games_20261011`
Type: feature (story-shaped spec)
Triage row: STU-14 (owner choice "keep", 2026-10-11) with the owner note: "In `/Desktop/tutor-advantage,
you will see that the vocabulary and the sentence games are included in the lesson plan.
Investigate. We should use our developed mini-games here if we can." The follow-up decision of
2026-10-11 makes it a new item before the cutover: "Chibi Quest mini-games in a vocabulary game
step and a sentence game step of the lesson (STU-14, Tutor TutorGuidePlan pattern)".

## Overview

Tutor Advantage has a vocabulary game phase and a sentence game phase in each lesson. The Primary
lesson has a 2D matching game in task 10 and four 2D sentence activities in task 12. The Chibi Quest
cartridges (`packages/game-cartridges-3d`) run only on the games pages, with the student's saved
words from all articles.

This track puts the cartridges into the two practice steps of the lesson, with the words and
sentences of the lesson. Task 10 becomes the vocabulary game step, and task 12 becomes the sentence
game step. The 2D games stay as the fallback. The teacher gets a teacher-led game on the projector
page of the class book lesson, for the two practice steps of the lesson plan. The lesson keeps its
14 app steps, so the step map, the workbook-first lock, and the progress data do not change.

The track uses only the new game host (`components/games/game-host.tsx` with
`@reading-advantage/advantage-play-kit-3d`). It never uses `packages/game-cartridges`, which
`primary_parity_cleanup_20261011` removes (M4). It changes no ETL code and no runbook step.

**Sprint goal:** A student plays a Chibi Quest vocabulary game and a sentence game with the lesson items, and a teacher runs these games on the projector.

## Track Set

This track is member 7 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_cleanup_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Reference Behavior

**Tutor Advantage** (`~/Desktop/tutor-advantage`, head `6b3cbf6`):

- The phases come from `apps/tutor-pwa/src/lib/lessonPhases.ts:8-27` (18 phases; 10
  `VOCABULARY_GAME`, 14 `SENTENCE_GAME`; `GAME_PHASES = [10, 14]` at 52-55).
  `TutorGuidePlan.ts` holds only the tour text and focus points of each phase (phase 10 at 78-82,
  phase 14 at 98-102; game tour 621-712). No phase has a duration.
- `PhaseManager.tsx` (`renderGamePhase`, 2825-3100) runs a game in steps: vote, ready, teacher
  demo and tutorial on the tutor screen, countdown, play on the students' phones, results ranking.
  The words come from `articleData.words` and the sentences from `articleData.sentences`
  (2832-2842).
- Six games are playable (`apps/tutor-pwa/src/lib/liveLessonGames.ts:12-19`): `dragon-flight`,
  `wizard-vs-zombie`, `enchanted-library`, `rune-match` (vocabulary), `castle-defense`,
  `potion-rush` (sentences). The `*TeachingGame.tsx` files in `apps/tutor-pwa/src/components/lesson/`
  are plain React demos for the tutor screen; none keeps a score or XP. A student result goes to
  the lesson score (`services/learning-service/src/websockets/lessonHandler.ts:1140-1166`), not to XP.

**Legacy Primary** (`bfea121`): task 10 was a choice of four games with the last result
(`components/lesson/games/lesson-vocabulary-matching.tsx:63-67, 99-125`: `rpg-battle`,
`rune-match`, `dragon-rider`, `enchanted-library`; `/api/lessons/[articleId]/vocabulary/*`;
commits `6f501f0`, `2ba3c3a`). The XP came from the client
(`app/api/lessons/[articleId]/vocabulary/route.ts:124-128`). All four games are Chibi Quest
cartridges in the monorepo registry now.

## Verified Facts (monorepo, integration `ca8869cea`)

- The 14 tasks are in `components/lesson/lesson-progress-bar.tsx:390-462`: task 10 is
  `TaskVocabularyMatching` (425-428), task 12 is `TaskSentenceActivities` (433-436, a picker of
  sentence order, cloze, word order, and sentence matching).
- The step map (`packages/domain/src/primary-books/step-map.ts:20-34`): workbook step 9
  "Vocabulary Practice" opens app steps 9 and 10; workbook step 10 "Sentence Practice" opens app
  steps 11 and 12.
- `components/lesson/games/lesson-matching-game.tsx` reads the student's saved cards of the article
  (`getLessonFlashcards`, domain `listPrimaryArticleCards`) and awards XP through
  `updateUserActivity` (`actions/user.ts`, server table `XP_AWARD_BY_ACTIVITY`, 5 XP). Its end
  screen shows "20" XP and "5/5" (lines 576, 584), not the real values.
- The new host: `components/games/game-host.tsx` mounts `StoryGameHost`
  (`@reading-advantage/advantage-play-kit-3d/react`). It takes an `input` prop. It hard-codes
  `helper={false}` (216). With `save={false}`, `onCompleted` never fires (141). The kit host
  hard-codes `sessionMode: 'playing'` (`packages/advantage-play-kit-3d/src/host/story-game.ts:214`).
- `packages/game-cartridges-3d/src/registry.ts` lists 28 cartridges. Every cartridge has a 3D and a
  2D (Phaser) renderer. Vocabulary games need 4 words (`rune-match` needs 6); sentence games need
  3 sentences. Tutor's `wizard-vs-zombie` is probably the cartridge `hero-vs-zombie` (a guess from
  the name and its heroes; check in Phase D).
- The renderer choice (`packages/advantage-play-kit-3d/src/device/gate.ts:93-139`,
  `factory/select.ts:42-57`): a device without WebGL2, with a software renderer, or with low memory
  gets the 2D renderer. The 2D mode setting (`chibi-quest` storage, `?renderer=phaser`) forces 2D.
- `/api/v1/apk/practice` and `/api/v1/apk/complete` refuse every role but STUDENT
  (`practice/route.ts:55`, `complete/route.ts:29`). The practice input today is the student's saved
  words of all articles (`listPrimaryPracticeInput`), not the lesson's words.
- `buildPracticeInput` (`packages/domain/src/games/practice-input.ts:97-135`) makes a
  `PracticeInput` from word and sentence rows. The article snapshot of words and sentences is
  `sentencs_and_words_for_flashcard` (`packages/db/src/schema/primary.ts:161-172`).
- `storyCompletionInput` accepts an `articleId` and stores it in `metadata.articleId`
  (`lib/story-games/completion.ts:24, 34`), and the mastery evidence source reads it
  (`packages/domain/src/primary-mastery/evidence-sources.ts:160`). `hostCompletionInput`
  (`lib/games/completion.ts:84`) never passes it.
- No lesson file imports `GameHost` or a cartridge. The projector (`components/teacher/projector-view.tsx`)
  shows paragraphs, the glossary, and the questions only. The guide links steps 1, 9, and 10 to
  `/teacher/game-challenges` (`components/teacher/guide-steps.tsx:8`, `guide-overlay.tsx`).
- Game XP is `calculateGameXP` (`packages/domain/src/games/xp.ts:24-36`, at most 10). The check
  `duration < 60_000` compares seconds (`lib/games/completion.ts:68`) with milliseconds, so the
  speed bonus almost always applies. `recordGameCompletion` does not update `users.xp` (STU-08 of
  `primary_parity_quick_fixes_20261011` changes this).

## Stories

### Story S1: Make the game input from the lesson
**As a** student
**I want** the lesson games to use the words and sentences of this lesson
**So that** the game practices what I just read

**Acceptance Criteria:**
- Given an article with a flashcard snapshot, When `getLessonPracticeInput` runs for a student of the school, Then it returns a valid `PracticeInput` with the id `lesson:<articleId>`.
- Given the same input, When the test reads it, Then it has at most 10 words and 8 sentences, the translation of the locale, and the rules of `buildPracticeInput`.
- Given a teacher who manages a class book with this lesson, When the function runs for the projector, Then it returns the same input.
- Given a user of another school, or a student with no access to the article, When the function runs, Then it throws FORBIDDEN.
- Given an article with 3 words, When the input is made, Then the step lists only the cartridges whose `missingItems` is 0, and it shows the 2D fallback when no cartridge is open.

**Estimate:** M
**Priority:** Must

### Story S2: Play a vocabulary game in task 10
**As a** student
**I want** to choose one of four Chibi Quest vocabulary games in task 10, with my last result for each
**So that** the vocabulary practice is a game that I want to play

**Acceptance Criteria:**
- Given task 10 of a lesson, When it opens, Then it shows four vocabulary cartridges as objects of the RPG skin (default: the legacy four, `rpg-battle`, `rune-match`, `dragon-rider`, `enchanted-library`).
- Given the same step, When it shows, Then each cartridge shows its last result for this lesson (correct of total), and a "Simple game" choice opens the 2D matching game.
- Given a choice, When the student plays, Then the game runs in the lesson page with the lesson input, through `GameHost`, with the 3D or the 2D renderer of the device setting.
- Given a game that ends, When the result saves, Then it saves through `/api/v1/apk/complete` with `metadata.articleId`, and the step shows the real correct count and the real XP.
- Given a cartridge that fails to load or to start, When the error shows, Then the step offers the 2D matching game in its place.
- Given the workbook-first lock of a teacher-led class, When workbook step 9 is not done, Then task 10 stays locked, as today.

**Estimate:** L
**Priority:** Must

### Story S3: Play a sentence game in task 12
**As a** student
**I want** to choose a Chibi Quest sentence game in task 12, next to the four sentence activities
**So that** I practice the sentences of the lesson in a game

**Acceptance Criteria:**
- Given task 12, When it opens, Then it shows the sentence cartridges (default: `castle-defense`, `potion-rush`) first, with the last result, and below them the four existing sentence activities.
- Given a choice of a cartridge, When the student plays, Then the game uses the sentences of the lesson and saves as in S2.
- Given fewer than 3 sentences in the lesson, When task 12 opens, Then the cartridges show as locked with the reason, and the four activities stay open.
- Given a cartridge that fails to load or to start, When the error shows, Then the step points to the four activities.

**Estimate:** L
**Priority:** Must

### Story S4: Lead a game on the projector
**As a** teacher
**I want** a game panel on the projector page of the lesson, for the vocabulary step and the sentence step
**So that** I can show the game to the class before the students play, as Tutor does

**Acceptance Criteria:**
- Given the projector page of a class book lesson, When the teacher opens the game panel, Then it lists the vocabulary and the sentence cartridges of S2 and S3 with the lesson input.
- Given a choice, When the game runs, Then it runs full screen with the answer hint on (`helper`), and nothing saves (no completion, no XP, no class progress).
- Given the guide steps 9 and 10 (`guide-steps.tsx`, `guide-overlay.tsx`), When the teacher clicks "Open the games", Then the projector game panel of the lesson opens; step 1 keeps the link to `/teacher/game-challenges`.
- Given a projector without WebGL2, When the game runs, Then the 2D renderer runs.
- Given a teacher who does not manage the class book, When the panel loads, Then it gets FORBIDDEN, as the projector page does.

**Estimate:** M
**Priority:** Should

### Story S5: Save nothing in a rehearsal or a preview
**As a** teacher
**I want** the lesson games to save nothing when I rehearse a lesson or view a student page
**So that** no false result or XP goes into the reports

**Acceptance Criteria:**
- Given the rehearsal page (`.../lessons/[number]/rehearsal`), When the teacher plays a lesson game, Then the game runs with `save={false}`, the step still sees the end of the game, and no request goes to `/api/v1/apk/complete`.
- Given the staff preview mode of `primary_parity_staff_student_view_20261011`, When staff play a lesson game, Then nothing saves.
- Given `GameHost` with `save={false}`, When the game ends, Then a new callback gives the result to the page.

**Estimate:** S
**Priority:** Must

## Non-Functional Requirements

- Domain code: `getLessonPracticeInput` in `packages/domain/src/games/` with a Zod contract
  (`gamePracticeInputRequestSchema` pattern), `assertCan`, and TenantDB scoping by `schoolId`.
- A new route or server action for the lesson input stays thin. The teacher path does not use
  `/api/v1/apk/practice` (students only).
- `GameHost` gets the smallest change: an `articleId`, a `helper`, and a result callback that fires
  also with `save={false}`. No change in `packages/advantage-play-kit-3d` unless a test proves
  the need.
- The step pages use the RPG skin (`docs/primary-rpg-skin.md` rules 3 to 6; the arena place for
  games). 48 px targets. 375 px and 1280 px, day and night.
- Strings in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json`.
- New Primary server code logs with `apps/primary-advantage/lib/observability/logger.ts`.
- No new dependency. No schema change and no migration.

## Acceptance Criteria (track level)

The side-by-side kit of `primary_parity_acceptance_20261011` checks these on a rehearsal copy:

| Check | Legacy page (`bfea121`) | New page | Role | Observable behavior |
| --- | --- | --- | --- | --- |
| A1 | `/student/lesson/<article>` task 10 (choice of 4 games with the last result) | `/student/lesson/<article>` task 10 | STUDENT | The same four games as cartridges, with the last result and "Simple game"; a game with the lesson words. |
| A2 | `/student/lesson/<article>` task 12 | the same | STUDENT | Sentence cartridges first, then the four activities. |
| A3 | none | `.../books/<classBook>/lessons/<n>/projector` | TEACHER | The game panel runs a cartridge with the lesson words; nothing saves. |
| A4 | none | `.../lessons/<n>/rehearsal` task 10 | TEACHER | The game ends; no completion request. |
| A5 | none | task 10 with `?renderer=phaser` | STUDENT | The 2D renderer runs the same game. |

- Domain tests (Vitest) and app tests (Vitest) pass. A browser run on a phone size (375 px) and on
  a projector size (1280 px) with 2 or 3 demo students.
- The owner's look check passes on captures at 375 px and 1280 px, day and night.

## Out of Scope

- Live class play with a vote and a ranking (the full Tutor flow). Primary has class challenges and
  Class Quest for live play.
- A class challenge filled with the lesson words (see Member Question 3).
- New app steps or a change of `APP_STEP_COUNT`, the step map, or the progress data.
- The old host `packages/game-cartridges` and its pages (`primary_parity_cleanup_20261011`, M4).
- The XP rule of `calculateGameXP` and the seconds or milliseconds check (reported to the owner as a
  finding for `primary_parity_quick_fixes_20261011`).
- A port of Tutor's `*TeachingGame.tsx` components.

## Risks

- A cartridge needs enough items. An article with fewer than 4 words opens no vocabulary cartridge,
  and the step shows only the 2D game. Phase S1 counts the words and sentences of the five printed
  books on the rehearsal copy.
- A 3D game on a weak school phone can be slow. The 2D renderer and the 2D mode setting cover it;
  the browser run checks one low-memory profile.
- The lesson summary and the reports read `user_activity` for task 10. A cartridge result is in
  `game_completions`. The summary must read both (S2), or the student sees no XP for the step.

## Member Questions (owner)

1. XP of a lesson game. Default: the game rule for each run (at most 10 XP), as on the games page
   and as legacy task 10 gave XP for each game. Does the owner want XP only once for each step?
2. The cartridge lists. Default for task 10: the four legacy games (`rpg-battle`, `rune-match`,
   `dragon-rider`, `enchanted-library`). Default for task 12: Tutor's two playable sentence games
   (`castle-defense`, `potion-rush`). The other choice for task 10 is Tutor's four
   (`dragon-flight`, `hero-vs-zombie`, `enchanted-library`, `rune-match`). Which lists does the
   owner want?
3. Teacher-led mode. Default: a demo on the projector that saves nothing. Does the owner also want
   a button that starts a class challenge with the lesson words (students play on their phones)?
