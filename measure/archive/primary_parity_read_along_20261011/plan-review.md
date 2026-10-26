# Plan review: Phase 0 (design)

Phase review of `d4c6d51a1..fd2696367`. No Critical and no High finding.

## Medium

- M-1: The resync of spec D5 (look ahead 4 audio words) is too small. Real gaps are 1 to 7 words in
  58 production entries (`data-profile.md`). Phase S1 must use an anchor-based alignment, or a look-ahead of 8 or more.
- M-2: The data has no `words: []` entry, no extra audio word, and no same-count mismatch. Phase S1 must
  derive these fixtures from the 5 real files. The spec criterion "real fixtures" holds for the other shapes only.
- M-3: The acceptance pair RA-A4 uses the lesson of the acceptance track (`cmirl4sc5000ts60d7zuiqpjb`).
  That lesson may have no reading step with audio. The orchestrator must check it before the capture.

## Low

- L-1: 321 sentence entries hold more than one real sentence. The "sentence" of the read-along is one
  entry, not one real sentence. The previous and next buttons move by entry. Name this in the UI copy if the owner asks.
- L-2: The mock (scratch) shows the toolbar as a stand-in with the real `cq-toolbar` class and 4 plain labels.
- L-3: The mock has a 404 for the favicon only.
- L-4: The profile script prints with `console.log` (a CLI script, not Primary server code).

## Shortcuts and deviations

- The Workbooks-injected articles cannot be split out (no marker in the data). The profile covers all 622 articles.
- Five fixtures, not the 10 to 12 of the plan, because the data has no other shape.

## Lessons (for the orchestrator to move)

- `audio_url` and `sentences` carry audio words with the screen punctuation ("phone."). Any alignment
  must strip edge punctuation on both sides before it compares.
- A tsx script outside the app folder cannot import `postgres`. Run it from the app folder.

# Plan review: Phase S1 (the highlight follows the voice)

Phase review of `b878bccf2..HEAD`. No Critical and no High finding.

## Decision (M-1, recorded in spec.md D5)

The resync is anchor-based. When the next pair does not match, the code looks for the nearest pair of
positions, by total skip, that match exactly (or join up to 3 tokens). It looks up to 9 positions on each
side. Tests cover gaps of 1, 4, and 7 words (dropped and extra audio words) at the start, the middle,
and the end. On the production copy `primary_etl_20261007`, 119018 of 119019 audio words map to the
same word (19825 sentences). The one miss is an audio token with no letters ("...").

## Medium

- M-4: `parseSentences` returns an empty list when one entry has a wrong shape. The page then shows the
  plain passage and no read-along. All 622 production articles parse. A future bad row hides the
  read-along without an error report. Phase S3 may add a logged warning.
- M-5: The prefix and one-letter rules can pair a dropped audio word with a similar next word
  (for example "seven" and "seventeen"). The data check shows no such case. Keep the check in the Phase A data run.
- M-6: Tap on a word of a sentence with `words: []` does nothing in the host. Phase S2 changes it to play from the sentence start.

## Low

- L-5: Each word is still `role="button"` with `tabIndex=0`. Phase S2 moves the tab stop to the sentence.
- L-6: The follow scroll is still the old `scrollIntoView` (block center). Phase S3 moves it to 30%.
- L-7: The two old players stay in `article-content.tsx` until Phase S3. The previous and next buttons still do nothing there.
- L-8: `task-reading.tsx` keeps its own timer. Phase S4 changes it.
- L-9: The passage adds one space after each sentence. The old page had no space between two sentences in one block.
- L-10: `hooks/use-read-along.ts` ignores `timeupdate`. A browser that sends no `play` event for a muted autoplay would not move the mark. The page has no autoplay.

## Shortcuts and deviations

- The passage props are `{ sentences, passage, position, active, ... }`, not `{ sentences, passage, audioUrl, translations }`.
  The host owns the audio element (see spec.md Decisions). The translate menu uses a callback and a label.
- The hint line (design decision 5) and the "Close the audio" copy (decision 9) are not in this phase. They need copy keys (Phase S3).
- The hook test file `use-read-along.test.tsx` was first written against an inert stub for the red run.

## Lessons (for the orchestrator to move)

- `vi.useFakeTimers()` also fakes `requestAnimationFrame` and `clearTimeout`. Name the functions in `toFake` when a test stubs rAF.
- `renderHook` with `{ current: audio }` inside the callback makes a new ref object at each render. Hooks with an effect on the ref then re-run each render. Create the ref outside the callback.

# Plan review: Phase S2 (tap a word or a sentence)

Phase review of `9ce977a55..HEAD`. No Critical and no High finding. M-6 and L-5 are fixed.

## Medium

- M-7: The tap on the band calls `onWordTap(sentenceIndex, -1)`. The host uses -1 for "play from the sentence".
  The stories track reuses the component and must do the same in its host.

## Low

- L-11: `seekTimeForWord` takes the audio word index, not the screen word index and `maps` (as the plan said). The component already maps the index.
- L-12: A sentence with a translate menu keeps `role="button"` inside the context menu trigger. A right click opens the menu; a tap plays. Check this on a real touch device (long press).
- L-13: A tap on a word in a sentence that is not read-along active (`active` false) still calls `onWordTap`. The host ignores it when the player is closed.
- L-14: `measure/doctor.sh` reports A13 (stale archived directory `agents_md_audit_science_advantage_20260603`). This is not from this phase.

## Shortcuts and deviations

- No separate `onSentenceTap` prop: one callback with index -1.
- The captures use the S1 esbuild harness (`read_along-s2/` in the scratchpad), not the real page.

## Lessons (for the orchestrator to move)

- A keyboard handler on a sentence that holds clickable words must check `e.target === e.currentTarget`, else a key on a child fires the sentence action.
- A word click must call `stopPropagation`, else the sentence handler plays a second time.

# Plan review: Phase S3 (one clear player)

Phase review of `c95ef1174..HEAD`. No Critical and no High finding. L-6 and L-7 are fixed.

## Medium

- M-8: The fixed bottom bar of the old page had a second copy of the language select and the translate
  button. The new page has them in the top row only. The translation text shows inside the player panel
  while the player is open. A student who scrolls far down must scroll up to change the language
  (the sentence menu still opens the translation).
- M-9: The follow scroll stops on `wheel`, `touchmove`, and scroll keys, not on every `scroll` event.
  A scroll bar drag or a text-selection drag does not stop it. Check this on a real desktop.
- M-10: Previous is disabled on the first entry and Next on the last. Replay on "no sentence yet" plays entry 0.

## Low

- L-15: The speed in the player is a number state of the page. It resets to 1x when the audio closes (as before).
- L-16: The hint line shows while the audio is open; it has no "do not show again" control.
- L-17: `article-content.tsx` keeps 10 older lint warnings (unused `setLoading`, `isPanding`, `handleSaveToFlashcard`, and others). They are not from this phase.
- L-18: The speed label has a 73 px width at 0.75x and 1.25x (56 px at 1x). The row stays inside 343 px at 375 px.
- L-19: The captures use the S1 esbuild harness (`read_along-s3/` in the scratchpad) with the real player, hook, passage, and the RPG skin.

## Shortcuts and deviations

- The player has an optional `children` slot (used for the translation text). The plan did not name it.
- The two old players were removed with their IntersectionObserver, their fixed-bar spacer, and the 3 s scroll pause.
- Copy keys added to the `Components` namespace in the five locale files: `previousSentence`, `replaySentence`,
  `nextSentence`, `changeSpeed`, `closeAudio`, `readAlongHint`. Thai is by the helper: owner check pending. The keys `seekBack` and `seekForward` are now unused.

## Lessons (for the orchestrator to move)

- A follow scroll must not listen to `scroll` events: its own smooth scroll fires them. Listen to `wheel`, `touchmove`, and keys.

# Plan review: Phase S4 (the lesson reading step)

Phase review of `bb16da1a7..HEAD` (files of this phase only). No Critical and no High finding. L-8 is fixed.

## Medium

- M-11: The lesson shows the player at all times, with no "open audio" button. The fixed bar on a phone may sit
  near the lesson footer. Check this in the Phase A captures.
- M-12: Keys `Lesson.Reading.controls.*` and `translation.button` are unused now. They stay in the five locale files (no copy change in this phase).

## Low

- L-20: No new captures for S4 (the plan did not ask for them). The Phase A captures cover the lesson page.
- L-21: With translation on, the translation box is a plain block above the title, not near the sentence (the old absolute overlay is gone).

## Shortcuts and deviations

- The passage props are the built props, not `{ sentences, passage, audioUrl, translations }`. The plan text is corrected.
- No new copy keys. No new exports without JSDoc.

## Lessons (for the orchestrator to move)

- An unmount cleanup that reads `ref.current` finds null: React clears refs first. Keep the element in a variable in the effect.

# Plan review: Phase A (acceptance, prepared)

No code in this phase. The captures and the Tutor note delivery wait for the orchestrator.

## Medium

- M-13: Pair RA-A4 moved from the assignment id of the acceptance track to the clean article lesson
  (`?type=article`), as the quick fixes pairs do. The orchestrator must check in the batch that the reading step opens with audio.

## Low

- L-22: Pair RA-A5 checks the player bar at 375 px (M-11). A fix, if needed, belongs to a follow-up task.
