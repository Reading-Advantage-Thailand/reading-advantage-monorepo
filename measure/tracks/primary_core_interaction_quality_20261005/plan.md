# Plan — Primary Core Interaction Quality

Owner lane: G. Works in its own worktree (`rama-worktrees/lane-g`, branch
`primary/lane-g-core-interaction`) off `primary-parity-integration`. Lanes run one at a time on
the 7 GB machine (owner rule 2026-10-04). Default order, owner to confirm: Phase 0 right after
Lane C merges, then Lanes D+E and F, then Phases 1-4. The spec lists the files
this lane owns. Shell, `globals.css`, navigation, and `packages/ui` changes go to Lane C as a
request. Tests first; one commit per task; a separate agent reviews each phase.

## Phase 0: Verify the September tracks (FR-1, half a day)
- [ ] Seed a browser class: students, articles with audio and word timestamps, due vocabulary and sentence cards, one assignment with a lesson
- [ ] Walk every requirement of `primary_audio_highlight_correctness_20260912` (FR-1..FR-6) and `primary_loading_state_correctness_20260912` (FR-1..FR-4) in the browser; write `verification.md` with pass or fail per item
- [ ] Spot-check `primary_component_deduplication_20260912`: the merged fork pairs render in both the student and the lesson context
- [ ] Write a failing test for each failed item (fixes land in Phases 1-3)

## Phase 1: Audio and reader (FR-2, FR-3)
- [ ] `useAudioSegment` and `AudioButton`: `load()` on URL change, zero end time plays to the end, cleanup pauses, visible playing state, localized name; tests
- [ ] Reader highlight: one timer chain, cleared on pause, seek, sentence change, word click, and unmount; reduced motion; tests
- [ ] Reader copy, tokens, 48 px controls, keyboard path for words and sentences; audio failure message with retry; no-audio articles hide the control
- [ ] Translation panel and "save to flashcards" in en and th

## Phase 2: Review decks and practice (FR-4, FR-5)
- [ ] Flashcard toasts and labels to next-intl keys (en, th; English fallback in vi, cn, tw)
- [ ] "Cards studied today" and the flashcard streak by Bangkok day; bounded streak query; tests with `PgDialect`
- [ ] Rating buttons 48 px with labels; card flip reduced motion; shared `EmptyState` and `ErrorState`
- [ ] Practice activities: tokens, copy, keyboard path, matching-game empty and error states, audio pause on cleanup, word-order index verified

## Phase 3: Lesson tasks and catalog copy (FR-6, FR-7)
- [ ] `task-introduction.tsx`: hide empty badges and objectives, read time with a unit; tests
- [ ] Loading flags clear on every exit in the three collection tasks; tests
- [ ] `task-reading.tsx` uses the reader highlight path; the fourteen tasks use the lesson-shell tokens and en/th copy
- [ ] Catalog panels: en/th text, locale dates, no expired challenge, distinct descriptions (agree with the APK owner, or pass copy as props)

## Phase 4: Quality (FR-8)
- [ ] axe inside each component state; fix to 0 serious
- [ ] Screenshots at 375, 768, 1280 per component state; inventory JSON committed
- [ ] Vision agent browser sessions (spec acceptance); fix Critical and High
- [ ] Close the three September tracks with a final status; update `measure/tracks.md`

## Gates
- [ ] `pnpm --filter primary-advantage test`, tsc, ESLint green
- [ ] `verification.md` complete
- [ ] Separate-agent review of each phase, no open High finding
