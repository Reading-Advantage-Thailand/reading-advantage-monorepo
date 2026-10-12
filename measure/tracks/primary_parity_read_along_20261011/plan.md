# Plan: Read-along that follows the voice

Paths are relative to `apps/primary-advantage` unless they start with `packages/` or `measure/`.
Each task follows the TDD order of `measure/workflow.md`. Tests use Vitest (`vitest.config.ts`; DOM
tests add `// @vitest-environment jsdom`; the render helper is
`components/__tests__/helpers/render-with-messages.tsx`). Start after
`primary_parity_quick_fixes_20261011` has merged `lib/paragraph-utils.ts` (STU-07).

## Phase 0: Design [checkpoint: fd2696367]

- [x] Task: Collect the real data shapes
    - [x] Write `scripts/profile-read-along.ts` (read only): count the articles with `sentences`, the sentences with `words: []`, and the sentences where the display words and the audio words differ in number; include the Workbooks-injected articles _(the data has no marker for them; the profile covers all 622 articles)_
    - [x] Run it once against a production copy (read only, for example `primary_etl_20261007`); save the result in `measure/tracks/primary_parity_read_along_20261011/data-profile.md`
    - [x] Export 10 to 12 real `sentences` arrays as fixtures in `lib/read-along/__tests__/fixtures/` (contractions, curly quotes, numbers, hyphens, a dropped audio word, an extra audio word, `words: []`) _(5 real fixtures: the data has no `words: []`, no extra audio word, and no same-count mismatch; Phase S1 derives those from the real files)_
- [x] Task: Design the read-along in the RPG skin
    - [x] Mock the sentence band and the word mark (FR-10 colours), the paused state, the follow scroll, the one player (phone bottom bar, desktop frame), the speed sign, and the sentence buttons
    - [x] Mock the keyboard focus on a sentence; check the 48 px targets _(48 px and 56 px, measured)_
    - [x] Captures at 375 px and 1280 px, day and night, in `measure/tracks/primary_parity_read_along_20261011/design/` _(PNG files are outside the repository; `design/captures.md` lists the paths)_
- [x] Task: Fill the behavior contract before the build
    - [x] Copy `docs/runbooks/primary-behavior-contract-template.md` (kit FR-11) to `measure/tracks/primary_parity_read_along_20261011/behavior-contract.md` and fill its seven sections (STU-10 and the September timer fixes that stay)
    - [x] Write `measure/tracks/primary_parity_read_along_20261011/acceptance-pairs.json` with the pairs of the spec acceptance criteria (kit FR-7) _(validated with `PairList`)_
- [x] Task: Owner look check of the design (and the speed list of spec D3); record the answers in `design/decisions.md` — look check pending (owner, async). Default used: speeds 0.75×, 1×, 1.25×.
- [x] Task: Measure - User Manual Verification 'Phase 0: Design' (Protocol in workflow.md) — look check pending (owner, async)
    - Manual verification steps: (1) open the PNG files in `design/captures.md` at 375 px and 1280 px, day and night; (2) check that the lit word, the band, and the hint line read well; (3) check that the player buttons are large enough; (4) tell the orchestrator the answer on the speed list and the hint line.

## Phase S1: The highlight follows the voice [checkpoint: 853a21cc9]
_Story ref: spec.md#story-s1_

- [x] Task: Contracts for the alignment and the position
    - [x] `lib/read-along/align.ts`: the types `DisplayWord`, `WordMaps` (`audioToDisplay`, `displayToAudio`) and the signatures of `splitDisplayWords` and `buildWordMaps`; a Zod schema for `SentenceTimepoint` that accepts the real shapes (`words` can be empty); JSDoc
    - [x] `lib/read-along/position.ts`: the type `ReadAlongPosition` and the signature of `findPosition(sentences, time, previous)`
- [x] Task: Tests for the alignment and the position
    - [x] `lib/read-along/__tests__/align.test.ts`: each fixture; the legacy tiers (exact, up to 3 joined tokens, prefix, suffix, Levenshtein 1); curly quotes and contractions; the resync after a dropped and an extra audio word; the display words after the last audio word; the maps stay in order
    - [x] `lib/read-along/__tests__/position.test.ts`: inside a word, in a gap (sticky word), between sentences (sticky sentence), the 0.3 s closest rule, a sentence change resets the word, the time before the first word
- [x] Task: Implement the alignment and the position
    - [x] `lib/read-along/align.ts`, `lib/read-along/position.ts`
- [x] Task: Tests for the loop
    - [x] `hooks/__tests__/use-read-along.test.tsx`: one rAF callback for each frame while playing; none while paused; the loop stops on pause, seek, sentence change, close, and unmount (FR-1, FR-12); `isPlaying` from `onPlay` and `onPause` (FR-9)
- [x] Task: Implement the loop and connect the article page
    - [x] `hooks/use-read-along.ts`
    - [x] `components/read-along/read-along-passage.tsx` (create it, or change it if `primary_parity_stories_20261011` created it, spec D6); render the paragraphs with `lib/paragraph-utils.ts` _(props differ from the spec: the host owns the audio; see spec.md Decisions)_
    - [x] `components/articles/article-content.tsx`: use the component; remove `handleTimeUpdate`, the 100 ms chain, and the dead code at lines 702-943
    - [x] Update `components/articles/__tests__/article-content-highlight.behavior.test.tsx`: the intent of each September case stays (no timer after unmount; the language select), with the rAF loop instead of the chain
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S1: The highlight follows the voice' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual verification steps: (1) open the PNG files in `~/Desktop/primary-parity-progress/captures/read_along/phaseS1/` at 375 px and 1280 px, day and night; (2) check that the blue word is the word in the caption name (I'll, Where, the after a dropped audio word); (3) on a real article page, play the audio and watch that the lit word follows the voice, including after a contraction or a curly quote; (4) pause: the mark stays on the last word.

## Phase S2: Tap a word or a sentence to play from there [checkpoint: 8e2865cd0]
_Story ref: spec.md#story-s2_

- [x] Task: Contract for the seek
    - [x] `lib/read-along/position.ts`: `seekTimeForWord(sentence, audioWordIndex)` _(takes the audio word index that the host already has; no `maps` needed)_ and `seekTimeForSentence(sentence)` (start minus `SEEK_EPSILON` of `lib/audio-highlight.ts`)
- [x] Task: Tests for the seek
    - [x] `lib/read-along/__tests__/position.test.ts`: the seek time through `displayToAudio`; a sentence with `words: []` seeks to the sentence start
    - [x] `components/read-along/__tests__/read-along-passage.test.tsx`: a word tap in read-along mode seeks and plays; a tap on the band outside a word plays the sentence; outside read-along mode the sentence has no tab stop and no button role _(the page has no word menu: the old menu does not exist in the component)_; each sentence is one tab stop and Enter plays it
- [x] Task: Implement the seek
    - [x] `components/read-along/read-along-passage.tsx`: word and sentence targets; `role` and `tabIndex` on the sentence, not on each word
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S2: Tap a word or a sentence to play from there' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual verification steps: (1) open the PNG files in `~/Desktop/primary-parity-progress/captures/read_along/phaseS2/` (tap and focus, 375 px and 1280 px, day and night); (2) check that the tapped word is blue and the focus ring on the sentence is visible; (3) on a real article page, turn the audio on and tap a word: the voice starts at that word; (4) tap the band outside a word: the voice starts at the sentence; (5) press Tab: one stop for each sentence; press Enter: the sentence plays.

## Phase S3: One clear player [checkpoint: b7952d902]
_Story ref: spec.md#story-s3_

- [x] Task: Contract for the player
    - [x] `components/read-along/read-along-player.tsx`: props (playing, speed, the sentence index, the count, the callbacks); the speed list from the design decision
- [x] Task: Tests for the player
    - [x] `components/read-along/__tests__/read-along-player.test.tsx`: Previous, Replay, and Next play from the right sentence; the first and the last sentence; the speed sign is controlled; 48 px targets (class check on the RPG button)
    - [x] Follow scroll: the current sentence scrolls into view; a manual scroll stops it until the next play
- [x] Task: Implement the player
    - [x] `components/read-along/read-along-player.tsx` with the RPG buttons and a `Sign` for the speed
    - [x] `components/articles/article-content.tsx`: remove the two old player copies (lines 489-608 and 627-675)
    - [x] Copy keys in `messages/{en,th,cn,tw,vi}.json`
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S3: One clear player' (Protocol in workflow.md) - look check pending (owner, async)
    - Defaults used: speeds 0.75x, 1x, 1.25x (spec decision); the translation text shows inside the player panel; the language select stays in the top row only.
    - Manual verification steps: (1) open the PNG files in `~/Desktop/primary-parity-progress/captures/read_along/phaseS3/` (playing at 0.75x, 1x, 1.25x, paused, first and last sentence; 375 px and 1280 px, day and night); (2) on a real article page open the audio: one player shows, and no second bar appears when you scroll; (3) tap Previous, Replay, Next: the voice starts at the sentence before, the same sentence, the sentence after; (4) tap the speed sign: 0.75x, then 1x, then 1.25x; (5) while the voice plays, the sentence stays near the upper third; scroll by hand: the follow stops until you press play again.

## Phase S4: The lesson reading step uses the same read-along [checkpoint: 861401f74]
_Story ref: spec.md#story-s4_

- [x] Task: Contract for the lesson reading step
    - [x] `components/lesson/task/task-reading.tsx`: the host passes the built props to `read-along-passage.tsx`: `sentences` (from `parseSentences`), `passage`, `position`, `active`, `currentSentenceRef`, `renderBlockMedia`, and `onWordTap`. The host owns the audio element, the speed, `handleWordTap`, and `handlePlaySentence`. The translation text shows in a box above the title. _(The plan text `{ sentences, passage, audioUrl, translations }` was wrong: the host owns the audio.)_
- [x] Task: Tests for the lesson reading step
    - [x] Update `components/lesson/task/__tests__/task-reading-highlight.behavior.test.tsx`: the rAF loop (one frame, none after pause or unmount, no timer), the word tap seeks and plays, the band tap plays the sentence, one shared player, the play button. The intent of the cleanup case stays. `task-reading-speed.test.tsx` uses the speed sign (3 speeds); its three intents stay.
- [x] Task: Implement the lesson reading step
    - [x] `components/lesson/task/task-reading.tsx`: uses `useReadAlong`, `useFollowScroll`, `ReadAlongPassage`, `ReadAlongPlayer`; the own timer, the own word click, and the old controls card are removed. The unmount cleanup keeps the audio element in a variable (React clears the ref first).
- [x] Task: Generate docs and run doctor (`measure/generate.sh`, then `measure/doctor.sh`)
- [x] Task: Measure - User Manual Verification 'Phase S4: The lesson reading step uses the same read-along' (Protocol in workflow.md) - look check pending (owner, async)
    - Defaults used: the lesson shows the shared player at all times (no "open audio" button); speeds 0.75x, 1x, 1.25x; with translation on, a tap on a sentence shows its translation and does not play.
    - Manual verification steps: (1) open a lesson reading step; one player shows at the bottom; (2) press play: the lit word follows the voice; (3) tap a word: the voice starts there; tap the band outside a word: the voice starts at the sentence; (4) press the speed sign: 0.75x, 1x, 1.25x; (5) turn translation on and tap a sentence: the translation shows above the title.

## Phase A: Acceptance

- [ ] Task: Run the kit of `primary_parity_acceptance_20261011` (`scripts/primary-parity/capture.ts` for each app, then `report.ts`) with `acceptance-pairs.json`; use one student account and the 3 articles of the data profile; record a screen capture with audio for each article in both apps (batch capture (orchestrator))
- [ ] Task: Captures at 375 px and 1280 px, day and night, for the owner look check (AC-5) (batch capture (orchestrator))
- [~] Task: Tell the Tutor session that `lib/read-along/align.ts` replaces the alignment that `buildPrimaryWordMap` copies (orchestrator or owner step: deliver the note `tutor-note.md`)
- [x] Task: Write `measure/tracks/primary_parity_read_along_20261011/acceptance.md` from the runbook template (kit FR-10), with the owner look check _(result rows empty: filled after the batch)_
- [x] Task: Measure - User Manual Verification 'Phase A: Acceptance' (Protocol in workflow.md) - look check pending (owner, async)
    - Manual verification steps: (1) after the batch, open `report.html` and fill the Result column of `acceptance.md`; (2) play each of the 3 articles in the new app and check that the lit word is the spoken word; (3) open the lesson reading step at 375 px and check that the player bar does not cover the footer (M-11); (4) look at the player at 375 px and 1280 px, day and night.
    - Pair list notes: RA-A4 now uses the clean article lesson (`?type=article`) because the assignment id may have no reading step (M-3); RA-A5 checks the bar position at 375 px (M-11).
