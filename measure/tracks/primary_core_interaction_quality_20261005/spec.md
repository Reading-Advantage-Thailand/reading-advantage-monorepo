# Spec — Primary Core Interaction Quality

Track ID: `primary_core_interaction_quality_20261005`
Type: feature
Program: [primary-tutor-parity-program](../../primary-tutor-parity-program.md)
Lane: G

## Context

Lane C (`primary_ux_rework_20261003`) rebuilt the page frames of Primary Advantage: tokens,
navigation, the student home, and the loading, empty, and error states of each screen. It made
no change inside the core interaction components. Its plan records the reader, the audio, the
flashcard decks, the practice activities, the lesson task components, and the games as
"unchanged". The Phase 0 audit still lists faults inside them.

Three September tracks changed these internals and carry the status "implemented pending
manual verification": `primary_audio_highlight_correctness_20260912`,
`primary_loading_state_correctness_20260912`, and
`primary_component_deduplication_20260912`. Nobody has watched audio playback, word
highlighting, or a flashcard review in a browser since those changes. Lane A browser-verified
the authorization tracks only.

Tutor Advantage is not the reference for these internals. The Tutor reader is one page with one
speaker button and no word highlighting. The Tutor vocabulary review is a 12-card flip with
again, good, and easy. Primary is richer in both places. Parity here means the same quality bar
inside the new shell: correct, child-friendly, Thai copy, 48 px targets, reduced motion, brand
tokens, and keyboard paths.

## Files this lane owns

From the start of the lane, these files belong to Lane G. Lane C requests changes here and
does not edit them. Lane G requests changes to `styles/globals.css`, the navigation, the page
shells, and `packages/ui` from Lane C.

- `components/articles/*` (`article-content.tsx`, `sentence.tsx`, `word-list.tsx`, `questions/*`)
- `components/audio-button.tsx`, `hooks/useAudioSegment.ts`, `lib/audio-highlight.ts`
- `components/flashcards/*`, `components/practice/*`, `actions/flashcard.ts`
- `components/lesson/task/*`, `components/lesson/games/*`, `components/lesson/practice/*`,
  `lesson-language-question.tsx`, `lesson-card.tsx` (not `lesson-step-rail.tsx` and
  `lesson-progress-bar.tsx`, which are the Lane C shell)
- `components/apk/*` copy only; game internals stay as they are

## Functional Requirements

- FR-1 (verify the September tracks): Run every requirement of the three September tracks in
  a real browser on seeded data (a class with students, articles with audio and word
  timestamps, due flashcards). Record pass or fail per requirement in
  `measure/tracks/primary_core_interaction_quality_20261005/verification.md`. A failing item
  gets a failing test, then a fix, in this lane. Update the status of the three September
  tracks when the record is complete.
- FR-2 (reader): In `article-content.tsx` audio playback and word highlighting stay correct
  through play, pause, seek, sentence click, word click, and unmount. One highlight timer chain
  runs at a time. The translation panel and "save to flashcards" use Thai and English copy.
  Controls are 48 px, use the brand tokens, and have a keyboard path. An audio load failure
  shows a short message with a retry. An article with no audio hides the audio control. The
  highlight animation respects `prefers-reduced-motion`.
- FR-3 (one audio control): Every audio slice in the app plays through `useAudioSegment`.
  `AudioButton` calls `load()` when the URL changes. A missing or zero end time plays to the
  end. The button shows a visible playing state and has a localized accessible name. Cleanup
  pauses the audio.
- FR-4 (vocabulary and sentence review): The FSRS review flow in `deck-view.tsx` and
  `flashcard-game.tsx` keeps its algorithm. Toasts and labels move to next-intl keys in en and
  th (vi, cn, tw get English). "Cards studied today" and the flashcard streak count by
  Asia/Bangkok calendar day through `@reading-advantage/domain/calendar-day` and
  `countStreakDays`; the streak query reads bounded rows, not every activity row of the year.
  The four rating buttons are 48 px with text labels. The card flip respects reduced motion.
  Empty and error states use the shared `EmptyState` and `ErrorState`. The audio per card is
  correct (FR-3).
- FR-5 (practice activities): Cloze, matching, order words, and order sentences use the brand
  tokens, Thai and English copy (including toasts), a keyboard path, and explicit empty and
  error states (the matching game spinner today has neither). Audio pauses on cleanup. The
  word-order index fix is verified in the browser.
- FR-6 (lesson task components): The fourteen task components match the Lane C lesson shell.
  `task-introduction.tsx` hides an empty CEFR or level badge and an empty objective, and gives
  the estimated read time a unit. Loading flags clear on every exit in
  `task-preview-vocabulary.tsx`, `task-vocabulary-collection.tsx`, and
  `task-sentence-collection.tsx`. `task-reading.tsx` uses the same highlight path as the
  reader. Copy is Thai and English.
- FR-7 (games catalog copy): The catalog panels show Thai and English text, dates in the
  locale format, no expired challenge, and distinct descriptions for Dragon Flight and Dragon
  Rider. The panel source is `packages/advantage-play-kit/src/react` and the catalog data is in
  `game-cartridges`; agree the change with the APK owner before editing, or pass the copy in
  as props from the Primary page. Game internals do not change.
- FR-8 (quality bar): axe reports 0 serious violations inside these components. Screenshots at
  375, 768, and 1280 exist for each component state in `measure/qa/browser-<date>/lane-g/`
  (PNG files stay out of Git; the inventory JSON is committed). Every behavior change ships
  with a Vitest test. Shared pieces go to `packages/ui` through a Lane C request. No schema
  change.

## Non-goals

- Game internals and the APK host runtime.
- FSRS algorithm changes or a new SRS package.
- New activity types or a new lesson flow (Lane D+E).
- Moving `server/models` behind the domain package (semester 2).
- Reedy (Lane F).

## Acceptance Criteria

- `verification.md` records pass or fail for every requirement of the three September tracks,
  with the fix commit for each failure.
- A vision agent records one browser session per flow at 375 and 1280: read an article with
  audio and highlighting, review a vocabulary deck to the end, finish one practice activity,
  and run a lesson from the introduction to the first flashcard task. No Critical or High finding.
- `pnpm --filter primary-advantage test` is green. tsc and ESLint report 0 errors.
- The Tutor read test is unaffected (no schema change).
- The three September tracks have a final status.
