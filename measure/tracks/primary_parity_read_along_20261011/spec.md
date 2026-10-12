# Spec: Read-along that follows the voice

Track ID: `primary_parity_read_along_20261011`. Type: feature. App: `apps/primary-advantage`.
Triage row: STU-10. Owner note: "Improve the UX here. The legacy app was not very good at this."

## Overview

When a student plays the audio of an article, the word highlight and a tap on a word can go to the
wrong word. Legacy `bfea121` maps the words of the audio to the words on the screen
(`buildWordMaps`). The monorepo uses the audio word index as the screen word index, so one
contraction, one curly quote, or one dropped audio word moves every later highlight.

This track ports the alignment as a tested module and keeps the timer fixes of September. It also
designs a better read-along:

- The highlight follows the voice.
- A tap on a word plays from that word.
- The player has sentence buttons that work and a speed control.
- The text scrolls with the voice.

**Sprint goal:** On every migrated article with word timings, the lit word is the word that the
voice says, and a tap on a word plays from that word, on a phone and on a desktop.

## Track Set

This track is member 6 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_quick_fixes_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Context (verified 2026-10-11 at integration `ca8869cea`)

Paths are relative to `apps/primary-advantage` unless the path starts with `packages/` or `measure/`.
"Legacy" is `/home/daniebo/Desktop/primary-advantage` at `bfea121`.

### Legacy behavior

- `components/articles/article-content.tsx:115-207` `buildWordMaps(sentence)`: the display words come
  from `splitIntoDisplayParts` (lines 47-72) and `isActualWordPart` (75-77); the audio words are
  `sentence.words`. One forward cursor tries, in order: an exact match, up to 3 joined audio tokens,
  a prefix, a suffix, a Levenshtein distance of 1 or less, and then a 1:1 position fallback. It gives
  `audioToDisplay` and `displayToAudio` maps.
- The maps drive the highlight (lines 261-264) and the seek (`handleWordClick`, lines 428-442).
- `hooks/use-audio-player.ts`: a `requestAnimationFrame` loop (lines 118-197); `findCurrentPosition`
  (60-115) keeps the last sentence and word during gaps and takes the closest word within 0.3 s;
  `seekToWord` seeks to `word.start - 0.05` (320-342).
- `git log -S buildWordMaps` gives only commit `5d47d8c`. Its message ("Refactor styles and improve
  accessibility across components") does not name the alignment.
- Legacy weak points:
  - No resync after a dropped or an extra audio word. The position fallback then moves every later word.
  - The display words after the last audio word get no map.
  - The split pattern has straight quotes only. So `didn’t` or `“Hello` becomes one part that is not
    a word, and the index moves.
  - Legacy has no test for `buildWordMaps` or the hook.

### Monorepo today

- `components/articles/article-content.tsx:229-304` `handleTimeUpdate`: a scan on `onTimeUpdate`
  (about 4 times a second). A new sentence sets the word index to 0 (lines 251-253). The audio word
  index is the display word index. A jump of more than one word steps through the skipped words with
  a 100 ms `setTimeout` chain (`highlightTimerRef`, lines 282-299).
- `handleWordClick` (lines 332-359) seeks to `start - 0.1` and plays after 50 ms.
- Two copies of the player: the fixed bottom bar (lines 489-608) and the inline player (627-675).
  The SkipBack and SkipForward buttons have no `onClick` (lines 564-585 and 633-655); they do nothing.
  Speed is a controlled select (0.5 to 1.5).
- Every word is `role="button"` with `tabIndex=0` (lines 1092-1107), so a keyboard user tabs
  through each word of the text.
- `components/lesson/task/task-reading.tsx` (the lesson reading step) has its own copy of the timer
  (line 101), the word click (178), and the paragraph match (407).
- The paragraph match `paragraph.includes(sentence.sentence.trim())` (`article-content.tsx:966-973`)
  drops a sentence that matches no paragraph and can show a short sentence twice.
  `primary_parity_quick_fixes_20261011` FR-9 (STU-07) ports `lib/paragraph-utils.ts` and uses it in both
  files; this track builds on it.
- September fixes (`measure/tracks/primary_audio_highlight_correctness_20260912`, status
  `implemented_pending_manual_verification`):
  - FR-1: hold the highlight timer in a ref; clear it on pause, seek, sentence change, and unmount.
  - FR-9: no `currentTime` state; `isPlaying` from `onPlay` and `onPause`; controlled speed selects.
  - FR-10: three distinct colours in both themes (`lib/audio-highlight.ts` `HIGHLIGHT_CLASSES`).
  - FR-12: cancel the word-click timer and the chain on close.
  - The article-content part landed in commit `1e7386a7e`. Tests:
    `components/articles/__tests__/article-content-highlight.behavior.test.tsx`,
    `lib/__tests__/audio-highlight.test.ts`, `components/lesson/task/__tests__/task-reading-highlight.behavior.test.tsx`.

### The data

- `articles.sentences` (jsonb, `packages/db/src/schema/content.ts:30`) holds the sentence timings and
  the word timings in one array: `SentenceTimepoint { sentence, startTime, endTime, words: { word,
  start, end }[], translations? }` (`types/index.d.ts:210-228`). `articles.words` is the vocabulary
  list (`WordListTimestamp` with `timeSeconds`), not read-along data. No `timepoints` column exists in
  legacy or in the monorepo.
- The ETL copies `audio_url` and `sentences` as they are (`packages/db/src/migrations-data/primary-legacy-import.ts:551`,
  `mapArticle` lines 275-278). So the migrated articles have the same timings as legacy.
- No ETL report counts the articles with word timings. Legacy writes `words: []` for a sentence that
  its aligner cannot match (`server/utils/genaretors/audio-generator.ts:211-360`). The Workbooks
  injector made 222 of the production articles; their timing quality is not measured.
- Test fixtures in the monorepo are small and synthetic (`article-content-highlight.behavior.test.tsx:45-55`);
  none has a contraction, a curly quote, or a dropped token.
- Story chapters use the same `sentences` shape (legacy `StoryChapter.sentences`); see D6.

## Design

- **D1 What the student sees while the audio plays.** The current sentence has a soft band, and the
  current word has a strong mark (the three colours of FR-10). Between two words the last word stays
  marked. When the voice reaches a line out of view, the text scrolls. The current sentence stays in
  the upper third. A scroll by hand stops this until the next play. When the audio pauses, the mark
  stays on the last word.
- **D2 Tap to play from a word.** In read-along mode, a tap on a word plays from that word
  (`start - 0.05`). Outside read-along mode, a tap on a word does what it does today (the word
  menu). A tap on a sentence band outside a word plays from the start of that sentence.
- **D3 One player.** One player component replaces the two copies. It has play and pause, previous
  sentence, replay the sentence, next sentence, and a speed sign (0.75×, 1×, 1.25×). The owner may ask
  for 0.5× and 1.5× too. On a phone the player is a bar at the bottom, above the toolbar; on a
  desktop it sits in the reading frame. The text column has no decoration (`docs/primary-rpg-skin.md`
  §2 rule 4).
- **D4 Keyboard.** Each sentence is one tab stop; Enter or Space plays from it. Words are not tab
  stops. The player buttons are 48 px.
- **D5 Modules.**
  - `lib/read-along/align.ts` (pure): the display split with straight and curly quotes; the word maps
    with the legacy tiers; a resync that looks ahead up to 4 audio words; a map for the display words
    after the last audio word.
  - `lib/read-along/position.ts` (pure): the current sentence and word, with the sticky rules and the
    0.3 s rule.
  - `hooks/use-read-along.ts`: one `requestAnimationFrame` loop while the audio plays.
  - `components/read-along/read-along-passage.tsx`: props `{ sentences, passage, audioUrl, translations }`.
  - The rAF loop replaces the 100 ms chain. The September intents stay: the loop stops on pause, seek,
    sentence change, close, and unmount; `isPlaying` comes from `onPlay` and `onPause`; the speed is
    controlled.
- **D6 Shared with stories.** `primary_parity_stories_20261011` uses the same component for chapters.
  If the stories track runs first, it moves the passage and audio part out of `article-content.tsx`
  into `components/read-along/read-along-passage.tsx` with no change of behavior. This track then
  changes that component. If this track runs first, the stories track only uses it.
- **D7 No timings.** A sentence with `words: []` gets the sentence band only, and a tap plays from
  the sentence start. An article with no `sentences` shows the text with no read-along button, as
  today.

## Stories

### Story S1: The highlight follows the voice
**As a** student
**I want** the lit word to be the word that the voice says
**So that** I can follow the text with my eyes while I listen

**Acceptance Criteria:**
- Given the real `sentences` fixtures (contractions, curly quotes, numbers, hyphens, a dropped audio word, an extra audio word, a sentence with `words: []`), When the word maps are built, Then every audio word maps to the display word that it says, and the maps stay in order.
- Given a sentence where the audio drops one word, When the next words play, Then the highlight goes back to the right word within one word (the resync).
- Given the audio is in a gap between two words or two sentences, When the time passes, Then the last word stays marked and no other word lights up.
- Given the student pauses, seeks, closes the player, or leaves the page, When that happens, Then the highlight loop stops and no timer stays (September FR-1 and FR-12).
- Given the data profile of the production copy, When it runs, Then the track folder has the counts of articles with timings, sentences with `words: []`, and sentences where the maps needed the resync.

**Estimate:** M
**Priority:** Must

### Story S2: Tap a word or a sentence to play from there
**As a** student
**I want** to tap a word or a sentence and hear the voice from that point
**So that** I can listen again to the part that I did not understand

**Acceptance Criteria:**
- Given read-along mode, When the student taps a word, Then the audio plays from the start of that word and that word lights up.
- Given read-along mode, When the student taps the sentence band outside a word, Then the audio plays from the start of that sentence.
- Given a keyboard user, When the user tabs, Then each sentence is one stop, and Enter plays from that sentence.
- Given a sentence with no word timings, When the student taps a word in it, Then the audio plays from the start of the sentence.

**Estimate:** S
**Priority:** Must

### Story S3: One clear player
**As a** student
**I want** one player with play, the sentence buttons, and the speed
**So that** I control the voice with large buttons that all work

**Acceptance Criteria:**
- Given read-along mode, When the page renders, Then one player shows (a bottom bar on a phone, in the reading frame on a desktop) and every button has a 48 px target.
- Given the audio plays sentence 3, When the student selects "Previous sentence", "Replay", or "Next sentence", Then the audio plays from the start of sentence 2, 3, or 4.
- Given the student picks 0.75×, When the audio plays, Then the speed changes and the highlight stays on the spoken word.
- Given the voice reaches a sentence out of view, When the student did not scroll by hand, Then the text scrolls so that the sentence is in view.

**Estimate:** M
**Priority:** Should

### Story S4: The lesson reading step uses the same read-along
**As a** student in a lesson
**I want** the reading step of the lesson to work like the article page
**So that** the highlight and the tap are right in the lesson too

**Acceptance Criteria:**
- Given the reading step of a lesson (`components/lesson/task/task-reading.tsx`), When the audio plays, Then the read-along component of the article page shows the highlight with the same maps.
- Given the reading step, When the student taps a word, Then the audio plays from that word.
- Given the existing test `task-reading-highlight.behavior.test.tsx`, When it runs after the change, Then its intent passes with the new loop.

**Estimate:** S
**Priority:** Should

## Decisions (defaults used, 2026-10-12)

The owner decided that the set runs with no stop. These defaults stand until the owner changes them.
The full table is in `design/decisions.md`. Each item is: look check pending (owner, async).

- Speed list (D3): 0.75×, 1×, 1.25×; one tap on the sign goes to the next speed.
- Tap sign: one hint line above the text, and the green hover on words; no mark on each word.
- Follow scroll: the current sentence stays at about 30% of the viewport height.
- Data finding: real audio gaps are 1 to 7 words (`data-profile.md`), so the resync of D5 must bridge 7 words, not 4.

## Non-Functional Requirements

- NFR-1: No new dependency. Reuse `lib/audio-highlight.ts`, `lib/paragraph-utils.ts` (from
  `primary_parity_quick_fixes_20261011`), the RPG skin components, and the existing audio element.
- NFR-2: The alignment and the position modules are pure functions with JSDoc and unit tests on real
  data shapes. Coverage of the new modules is above 80%.
- NFR-3: The loop costs one `requestAnimationFrame` callback for each frame while the audio plays
  and none while it is paused.
- NFR-4: No schema change, no ETL change, no runbook change. The data profile is read only.
- NFR-5: Copy in en, th, cn, tw, and vi message files.

## Acceptance Criteria (track level, for the side-by-side kit)

Run each check with the kit of `primary_parity_acceptance_20261011` on its matched database copies
(the same data in both apps), with a student account in both apps. Pick 3 articles from the data profile: one clean, one with
contractions or curly quotes, and one where the maps needed the resync.

- AC-1: Legacy `/student/read/<legacy id>` and new `/student/read/<new id>`, play each article: in the
  new app the lit word is the spoken word through the whole text (screen recording with audio); note
  where legacy goes wrong.
- AC-2: Tap 5 words in the middle of sentences: the new app plays from each tapped word.
- AC-3: Previous, Replay, and Next sentence, and 0.75×: each works in the new app. Record what the
  legacy player offers for the same actions.
- AC-4: The lesson reading step of one lesson with the same article: the same behavior as AC-1 and AC-2.
- AC-5: Owner look check of the player and the highlight at 375 px and 1280 px, day and night.

## Out of Scope

- The audio generator and its aligner (`server/utils/generators/audio-generator.ts`); the app makes no
  content (shared decision of 2026-10-11).
- New timings for articles with `words: []` (a Workbooks job if the profile shows many).
- The Tutor copy of the alignment (`tutor-advantage` `ArticleDisplay.tsx` `buildPrimaryWordMap`); tell
  the Tutor session when this module is done.
- The vocabulary audio of the word list (`articles.words`, `audio_word_url`).
- The story chapter page (`primary_parity_stories_20261011` uses the component, D6).
