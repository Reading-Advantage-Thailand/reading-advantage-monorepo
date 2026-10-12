# Plan: Chibi Quest games in the vocabulary step and the sentence step of the lesson

Track: `primary_parity_lesson_games_20261011`. Branch: a lane branch from `primary-parity-integration`
after `primary_parity_cleanup_20261011` (M4 removes `packages/game-cartridges`). Tell the monorepo
session before any write to `primary-parity-integration`. Run one heavy job at a time (a 3D game in
a browser is a heavy job). Every task follows the TDD order of `measure/workflow.md`.

## Phase D: Design (RPG skin) [checkpoint: 9f38189cf]

- [x] Task: Check the cartridges and the lesson items
    - [x] Confirm that the legacy four (`rpg-battle`, `rune-match`, `dragon-rider`, `enchanted-library`) and `castle-defense`, `potion-rush` load with a `PracticeInput` of lesson size; confirm the Tutor name match `wizard-vs-zombie` and `hero-vs-zombie`
        - Static check: manifests need 4 words (`rune-match` 6; the sentence games 3 sentences). A lesson gives 10 words and 4 to 8 sentences. No cartridge was loaded in a browser (Phase S5 browser run). Forge confirmed the name match and the minimums (2026-10-12): see `design/look-check.md`.
    - [x] Count the words and sentences of the 70 lessons of the five printed books on the rehearsal copy (read only); list the lessons that open no cartridge
        - The catalogue is empty on the copy, so the counts come from the Workbooks package files. All 70 lessons meet every minimum. No lesson opens no cartridge. Table in `design/look-check.md`.
- [x] Task: Design the two steps and the projector panel
    - [x] Draw task 10: four cartridges as objects of the arena place (`docs/primary-rpg-skin.md` §3), the last result of each, the locked state, and "Simple game"
    - [x] Draw task 12: the sentence cartridges first, then the four activities
    - [x] Draw the projector game panel (1280 px and a 1920 px projector) and the full-screen run
- [x] Task: Captures and the owner's look check
    - [x] Capture at 375 px and 1280 px, day and night, into `measure/tracks/primary_parity_lesson_games_20261011/design/`
        - PNG files are outside the repository; `design/captures.md` lists the paths.
    - [x] Record the owner's answer and the answers to the Member Questions in `design/look-check.md`
        - Defaults used (Member Questions 1 to 3): look check pending (owner, async).
- [x] Task: Measure - User Manual Verification 'Phase D: Design (RPG skin)' (Protocol in workflow.md)
    - look check pending (owner, async). Steps: open each PNG of `design/captures.md`; check the four points of `design/look-check.md`; send changes to the monorepo session.

## Phase S1: Make the game input from the lesson [checkpoint: 628585040]
_Story ref: spec.md#story-s1_

- [x] Task: Define the contract
    - [x] `lessonPracticeInputRequestSchema` (article id, locale; for a teacher also the class book id and lesson number) and `LESSON_PRACTICE_INPUT_PREFIX` in `packages/domain/src/games/practice-input.ts`
- [x] Task: Write the tests (red)
    - [x] `packages/domain/src/games/__tests__/practice-input.test.ts` with `packages/domain/src/__tests__/mock-db.ts`: the input from the article snapshot (`sentencs_and_words_for_flashcard`); the limits; the locale; the id `lesson:<articleId>`; a student of another school and a teacher without the class book get FORBIDDEN
- [x] Task: Implement (green)
    - Commit 628585040. Items have ids `w<n>` and `s<n>`; the input id is `lesson:<articleId>`. The caller computes `missingFor`.
    - [x] `packages/domain/src/games/practice-input.ts`: `getLessonPracticeInput`, sharing the parse rules of `buildPracticeInput`; export it in the games index
    - [x] A thin server action `apps/primary-advantage/actions/lesson-games.ts` (`getLessonGameInputAction`) for the student and the teacher; a failure logs with `lib/observability/logger.ts`
- [x] Task: Docs and doctor
    - [x] JSDoc; skipped: graph.db read only (orchestrator rule); run `measure/generate.sh` and `measure/doctor.sh`
- [x] Task: Measure - User Manual Verification 'Phase S1: Make the game input from the lesson' (Protocol in workflow.md)
    - look check pending (owner, async). No UI in this phase. Steps: run `vitest run src/games/__tests__/practice-input.test.ts` in `packages/domain` (10 pass); in the lesson page of S2 the input shows from `getLessonGameInputAction`.

## Phase S2: Play a vocabulary game in task 10 [checkpoint: 385261fa7]
_Story ref: spec.md#story-s2_

- [x] Task: Define the contracts
    - [x] `LESSON_VOCABULARY_GAMES` and `LESSON_SENTENCE_GAMES` (the lists of the Member Question answer) in `apps/primary-advantage/lib/games/lesson-games.ts`
        - Commit 385261fa7. The lists hold the Member Question defaults; the file also holds the stand-in Forge sprite of each game.
    - [x] `getLessonGameResults` (the last result of each cartridge for one article and student, from `game_completions` with `metadata.articleId`) with a Zod output in `packages/domain/src/games/`
        - Commit 73e3e64fe. It returns `{ latest, totalXp }`, scoped to the user and the school; `gameId` comes from the `<id>-story` game type.
    - [x] The `articleId` prop and the result callback of `GameHost` (`components/games/game-host.tsx`); `articleId` reaches `storyCompletionInput` through `hostCompletionInput` (`lib/games/completion.ts`)
        - Commit b43d21627. The host also got `onResult` (fires with `save={false}`), `onLoadError`, and the server XP in `onCompleted`.
    - [x] Keys for the step texts in `apps/primary-advantage/messages/{en,th,cn,tw,vi}.json`
        - Namespace `LessonGames` in the five files. Thai by the helper: owner check pending.
- [x] Task: Write the tests (red)
    - [x] Domain: `getLessonGameResults` returns the latest run of each cartridge for the article only; school scoping
    - [x] App: `lib/games/__tests__/completion.test.ts`: the completion body holds `metadata.articleId`
    - [x] App: `components/games/__tests__/game-host.test.tsx`: the `articleId` prop; the error state calls the fallback callback
    - [x] App: `components/lesson/task/__tests__/task-vocabulary-game.test.tsx`: four cartridges with the last result; the locked state; "Simple game" opens `LessonMatchingGame`; a load error opens the matching game; the real XP after a run
    - [x] App: the lesson summary (`actions/article.ts` `getLessonSummaryData`) adds the game XP of the article
    - [x] A key-parity test for the new keys
        - Defect check ("Story completions never persist"): `gameTypeEnum` already holds the six lesson `-story` types. Tests added; no domain fix was needed.
- [x] Task: Implement (green)
    - [x] `components/games/game-host.tsx` and `lib/games/completion.ts`: the smallest change
    - [x] New `components/lesson/task/task-vocabulary-game.tsx`; `components/lesson/lesson-progress-bar.tsx` task 10 renders it; `task-vocabulary-matching.tsx` stays as the fallback
    - [x] `components/lesson/games/lesson-matching-game.tsx`: show the real XP and the real count on the end screen (it is the fallback now)
    - [x] `actions/article.ts`: the game XP in the summary
        - `getLessonSummaryData` adds `gameXp` to `totalXp`; a failed game read keeps the activity XP and logs.
- [x] Task: Docs and doctor
    - [x] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
        - skipped: graph.db read only (orchestrator rule). `measure/generate.sh` run as a check; `measure/generated` restored.
- [x] Task: Measure - User Manual Verification 'Phase S2: Play a vocabulary game in task 10' (Protocol in workflow.md)
    - look check pending (owner, async). Captures: `~/Desktop/primary-parity-progress/captures/lesson_games/phaseS2/` (`task10-<375|1280>-<day|night>.png`, `task10-locked-...`). Steps: (1) open a lesson on a school copy and go to task 10; (2) check four games, the last result of each, and "Simple game"; (3) play one game and leave it; check "You got x of y. +n XP"; (4) check that a game with too few words shows locked; (5) with `?renderer=phaser` check the 2D renderer. Defaults used: Member Questions 1 to 3 (XP for each run, legacy four games, no class challenge button).

## Phase S3: Play a sentence game in task 12 [checkpoint: 1c2570806]
_Story ref: spec.md#story-s3_

- [x] Task: Define the step
    - [x] The order of the sentence cartridges and the four activities in `components/lesson/task/task-sentence-activities.tsx`; keys in the five locale files
        - Commit 1c2570806. Keys `sentenceTitle`, `sentenceInputFailed`, `sentenceLoadFailed` in `LessonGames`. The games sit above the activities in every state of the step. Thai: owner check pending. The step also takes `save` (default true) for S5.
- [x] Task: Write the tests (red)
    - [x] `components/lesson/task/__tests__/task-sentence-activities.test.tsx`: the cartridges first with the last result; locked with fewer than 3 sentences while the four activities stay open; a load error points to the activities
        - Red run: 7 failed (7). Green after the change.
- [x] Task: Implement (green)
    - [x] `components/lesson/task/task-sentence-activities.tsx` with the shared lesson game picker of Phase S2
        - Commit 1c2570806. Also commit a2a6a8dcb: two domain test mocks got the class book module stub (orchestrator request).
- [x] Task: Docs and doctor
    - [x] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
        - build-graph update skipped: graph.db read only (orchestrator rule). doctor: only A13 fails (stale archived directory `agents_md_audit_science_advantage_20260603`, not from this track). `measure/generated` restored.
- [x] Task: Measure - User Manual Verification 'Phase S3: Play a sentence game in task 12' (Protocol in workflow.md)
    - look check pending (owner, async). Captures: `~/Desktop/primary-parity-progress/captures/lesson_games/phaseS3/` (`task12-<375|1280>-<day|night>.png`, `task12-locked-...`). Steps: (1) open a lesson and go to task 12; (2) check the two sentence games with the last result, and the four activities below; (3) play one game and leave it; check the result shows after the return; (4) check a lesson with 2 sentences: games locked with "Needs 3 sentences", activities open; (5) check that a game that fails to start shows the notice that points to the activities. Defaults used: Member Question 2 (castle-defense, potion-rush).

## Phase S4: Lead a game on the projector [checkpoint: 477b3c4ad]
_Story ref: spec.md#story-s4_

- [x] Task: Define the panel
    - [x] The `helper` prop of `GameHost` (passed to `StoryGameHost`); the projector panel props; keys in the five locale files
        - Commit b13b64158. Keys `TeacherUi.classBook.lesson.projectorGames` (title, hint, loading, inputFailed) in the five files; cn, tw, vi hold the English text like the rest of that namespace; Thai by the helper: owner check pending. The picker got `hideResults` (no last result and no New tag on the projector).
- [x] Task: Write the tests (red)
    - [x] App: `components/teacher/__tests__/projector-game-panel.test.tsx`: the two lists with the lesson input; `save={false}` and `helper` on; no request to `/api/v1/apk/complete`
    - [x] App: `components/teacher/__tests__/guide-steps.test.tsx` and the overlay test: steps 9 and 10 link to the projector panel; step 1 keeps `/teacher/game-challenges`
        - Red run: 4 tests failed and 1 suite failed (panel module absent) over 4 files; guide-steps 2 failed.
    - [x] App: the projector page refuses a teacher who does not manage the class book (existing test extended)
        - No projector page test existed: new `projector/../__tests__/projector-page.test.tsx` (panel with the class book and lesson; no panel without an article; a refused teacher gets not found). The server check is `getLessonPracticeInput` (S1 tests: FORBIDDEN without the class book).
- [x] Task: Implement (green)
    - [x] New `components/teacher/projector-game-panel.tsx`; `components/teacher/projector-view.tsx` and `.../lessons/[number]/projector/page.tsx` render it
        - Deviation: the page renders the panel (above `ProjectorView`), not `projector-view.tsx`; this keeps the view test free of server actions. The run is a full-screen `lg-run` layer; the game exit returns to the lists. The 2D renderer is the host default (no WebGL2 falls back inside the kit; checked in the S5 browser run).
    - [x] `components/teacher/guide-steps.tsx` and `guide-overlay.tsx`: the `gamesHref` of steps 9 and 10
        - New prop `projectorHref` and `gamesHrefOf`; the lesson page passes `<lesson>/projector#projector-games`. Commits 477b3c4ad and bce9093f1: see `plan-review.md` (commit mishap).
- [x] Task: Docs and doctor
    - [x] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
        - build-graph update skipped: graph.db read only (orchestrator rule). `measure/generated` restored.
- [x] Task: Measure - User Manual Verification 'Phase S4: Lead a game on the projector' (Protocol in workflow.md)
    - look check pending (owner, async). Captures: `~/Desktop/primary-parity-progress/captures/lesson_games/phaseS4/` (`panel-<375|1280|1920>-<day|night>.png`). Steps: (1) open the projector page of a class book lesson as the teacher of the class; (2) check the two lists: four vocabulary games and two sentence games, with no result text; (3) press Play: the game runs full screen with the answer hint on; (4) finish a run and leave it; check no XP and no new row in the student results; (5) open the lesson page, go to guide step 9 or 10 and press "Open the games": the projector page opens at the games; step 1 still opens the game challenges; (6) open the page as a teacher of another class: not found. Defaults used: Member Question 3 (a demo on the projector that saves nothing, no class challenge button).

## Phase S5: Save nothing in a rehearsal or a preview
_Story ref: spec.md#story-s5_

- [ ] Task: Define the save switch
    - [ ] One prop of the lesson flow (`LessonCard`, `lesson-progress-bar.tsx`) that sets `save={false}` for the rehearsal page and the staff preview mode of `primary_parity_staff_student_view_20261011`
- [ ] Task: Write the tests (red)
    - [ ] App: `.../lessons/[number]/rehearsal` renders the lesson games with `save={false}`; the step sees the end of a game; the staff preview does the same
- [ ] Task: Implement (green)
    - [ ] `app/[locale]/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]/rehearsal/page.tsx`, `components/lesson/lesson-progress-bar.tsx`, and the two task components
- [ ] Task: Browser run
    - [ ] On the rehearsal copy with 2 or 3 demo students: checks A1 to A5 of the spec at 375 px and 1280 px, and one run with `?renderer=phaser`; save the captures in `measure/tracks/primary_parity_lesson_games_20261011/browser-check/`
- [ ] Task: Final side-by-side check
    - [ ] Run the checks with the acceptance kit next to legacy task 10; send the captures to the owner
- [ ] Task: Docs and doctor
    - [ ] JSDoc; `build-graph update ./graph.db <changed files>`; run `measure/generate.sh` and `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S5: Save nothing in a rehearsal or a preview' (Protocol in workflow.md)
