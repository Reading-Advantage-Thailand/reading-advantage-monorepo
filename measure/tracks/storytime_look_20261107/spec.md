# Specification: Storytime look and council fixes

**Track ID:** `storytime_look_20261107`
**Type:** feature (classic FR list with acceptance checks)
**Status:** active. Opened 2026-11-07.
**Author model:** claude-code/claude-sonnet-5-5
**Owner chain:** Daniel (owner; look pick; look check; deploy word) → PM orchestrator → Monorepo orchestrator (track owner).
**Plan:** [plan.md](./plan.md)
**Related track:** [storytime_at_home_release_20261106](../storytime_at_home_release_20261106/). Its Phase 3 (the at-home deploy) waits for the Phase 1 checkpoint of this track.
**Moved here:** FR-1 and Phase 1 come from Phase 2c, and FR-2 and Phase 2 from Phase 2d, of the at-home plan (orchestrator decision, 2026-11-07, so that two Monorepo roles can run in parallel in different tracks).

## 1. Purpose

The UI council scored the live week 1 pages 59.5 of 100 on 2026-11-07 (goal 85.0; the lowest axis is look consistency, 1.5 of 5). Daniel, Google Tasks, 2026-11-07 07:43 ICT, word for word:

```
We had agreed that we would have a theme or look developed in the same vein as our primary advantage program which uses our assets to create a unique and engaging experience for the students
```

Phase 1 fixes eleven council findings (1, 2, 3, 5, 6, 7, 8, 9, 12, 13, and 18) in the route files, the 404 view, the messages, and the app icon. Phase 2 ports the look of the option that Daniel picks.

## 2. Sources

- Council report (read only): `~/.local/state/ui-council/storytime-w01-live/round-1.md` (19 ranked findings) and `round-1/shots/`.
- Look study (read only): `~/Desktop/handoff/storytime-look-options-20261107/` (`LOOK-NOTE.md`, `CHECKS.txt`, three options). Option 1 "Storybook Quest" is the recommended option (the only option in the family of the books and of Primary; it answers the lowest axis, look consistency).
- PM decisions, 2026-11-07: the Phase 1 batch is accepted; M-3 stands (no pictures in the lyric list), so council finding 10 is dropped; the English label of the decodable card (council finding 2) is "Read the words". Council findings 4, 10, 17, and 19 are not in Phase 1.
- Files: the five route files of `apps/storytime/app/[locale]/st/[level]/[week]/` (`page.tsx`, `decodable.tsx`, `questions.tsx`, `reader.tsx`, `song.tsx`), `app/[locale]/not-found.tsx`, `lib/content.ts`, `lib/route-parse.ts`, `messages/en.json`, and `messages/th.json`. Phase 1 does not change `questions.tsx`; Phase 2 restyles it, because it is the question screen of the reader and shares the frame, the cards, and the buttons.

## 3. Functional requirements

Evidence classes: **automated**, **person-checked**, **owner-passed**.

### FR-1 UI council round 1 fixes (Phase 1)

Source: the UI council round 1 on week 1 live (`~/.local/state/ui-council/storytime-w01-live/round-1.md`, 19 findings, total 59.5, read only). Phase 1 covers council findings 1, 2, 3, 5, 6, 7, 8, 9, 12, 13, and 18. PM decisions, 2026-11-07: the batch is accepted; M-3 stands (no pictures in the lyric list), so finding 10 is dropped; the English label of finding 2 is "Read the words". Each task has one new test file in `apps/storytime/__tests__/` (named in the plan).

**Pinned names.**

- `apps/storytime/lib/content.ts` exports `highestOpenWeeks(): Promise<Record<number, number | null>>`. A key is a level that has at least one week file; the value is the highest open week of that level, or `null` when the level has no open week. A week is open by the same rule as `loadVisibleWeek` (readiness gate and `STORYTIME_SHOW_DRAFT_MEDIA`), without its log lines. It reads the level 1 to `LEVEL_MAX` and the weeks 1 to `WEEK_MAX` with `loadWeek` (a missing file costs one failed `readFile`).
- `apps/storytime/lib/route-parse.ts` exports `parseStorytimePath(pathname: string, locales: readonly string[]): { locale: string; level: number; week: number } | null`. It accepts only `/<known locale>/st/<level>/<week>` with the bounds of `parseStorytimeRoute`, and it writes no log.
- `app/[locale]/not-found.tsx` stays a server component with no props. It calls `highestOpenWeeks()` and renders the client child `app/[locale]/not-found-view.tsx` (export `NotFoundView`, props `openWeeks` and `locale`). The child reads the path with `usePathname()` and parses it with `parseStorytimePath`. When `usePathname()` gives `null`, the child shows the current view.
- Message keys (all four in `messages/en.json` and `messages/th.json`, with equal values in both files, like `notFoundThai` and `notFoundEnglish`): `notOpenThai` = "สัปดาห์นี้ยังไม่เปิด กลับมาใหม่เร็ว ๆ นี้" (draft), `notOpenEnglish` = "This week is not open yet. Come back soon.", `openWeekThai` = "เปิดสัปดาห์ {week}" (draft), `openWeekEnglish` = "Open week {week}".
- Playing label: message key `playerPlaying` = "Playing" in `messages/en.json` and "กำลังเล่น" (draft) in `messages/th.json`; the decodable default labels hold the same two values as `playing`. Both Thai values are drafts for Daniel's sitting on 2026-11-16, like the Thai 404 draft.
- App icon: `apps/storytime/app/icon.png` (Next.js file convention), from an owned or Forge asset only.

Acceptance:

- AC-1.1 (automated) `NotFoundView` with the path `/th/st/2/2` and `openWeeks = {2: 1}` shows `notOpenThai` and `notOpenEnglish` and one link of 48 px or more (minimum height) with the text of `openWeekThai` and `openWeekEnglish` for week 1 and the target `/th/st/2/1`. With `{2: null}` (a level with files and no open week) it shows the same text and no link (`links` equals 0). The test file is `look-not-found.test.tsx`.
- AC-1.2 (automated) Every other 404 keeps the current text (`notFoundThai`, `notFoundEnglish`) and no link: an unknown locale (`/de/st/2/2`), an unparsable path (`/th/st/x/y`, `/th/st/2/99`), a level at or under `LEVEL_MAX` (4) that has no week file (`/th/st/4/1`; `content/l2/` holds the only week files, so levels 1, 3, and 4 have none and `openWeeks` holds no key 4), a level above `LEVEL_MAX` (`/th/st/9/1`, which does not parse), a level that has week files and no open week (a fixture: the test passes `openWeeks = {2: null}` to `NotFoundView` for `/th/st/2/2`, because no shipped level is in that state), the disabled teacher routes (`/th/teacher/2/1`), and `usePathname()` equal to `null`. The case list is asserted greater than 6 before each case runs. `highestOpenWeeks()` returns `{2: 1}` for the shipped content (week 1 published, week 2 draft), and for each level and week its answer agrees with `loadVisibleWeek`.
- AC-1.3 (automated) The decodable page for week 1 renders the sentence "A nest." with no space before the full stop, and the chips "a", "and", and "can" in the case of the source. No rendered text of the sentence or the chips is the upper-case form of the source. The test file is `look-decodable-case.test.tsx`.
- AC-1.4 (automated; the phone check is done) Before the video plays a frame (the `playing` event), the `.song-stage` element holds an inline `background-image` with the poster URL, the video keeps its `poster` attribute and `playsInline`, and `preload` is `"metadata"`. At the base the element has no such image and `preload` is `"none"`, so the test fails at the base. The test file is `look-song-playing.test.tsx`. The person check by Daniel on 2026-11-07 on his own phone, live revision `00011-dut`, recorded `phone_blank=no` and `phone_model=not given` (his words: "the video plays in the browser visibly with no overflow (the video fits in the viewport)"); the white area in the council capture came from the headless browser. The phone record is a check line for the look check of 2026-11-16 to 2026-11-18, not a gate.
- AC-1.5 (automated) After a press on Next, the old sentence stays in the page until the load event of the new picture (or 3 seconds), then both change together. The test file is `look-reader-turn.test.tsx`.
- AC-1.6 (automated) While a sound plays, its button (decodable "Play the sound" and each reader audio button) has `aria-pressed="true"` and shows the playing label (`playerPlaying`, "Playing" in English). Next is the filled main button of 48 px or more. A page count "1 / N" sits between the arrows and updates on each turn (N from the week data; the test asserts N is greater than 1). The test file is `look-feedback.test.tsx`.
- AC-1.7 (automated) The English label of the decodable card (`tileDecodable`) is "Read the words". The Thai label is "อ่านคำ". The test file is `look-week-card-label.test.tsx`.
- AC-1.8 (automated) The file `apps/storytime/app/icon.png` exists, is a PNG (the 8-byte signature), is at least 32 by 32 pixels, and is 20 KB or less. The unit test needs no server. The head link `/icon.png` and the end of the 404 on `/th/st/2/1` and `/en/st/2/1` are confirmed by the browser run of the phase check (the live site on 2026-11-07 answers 404 for `/favicon.ico` and the page holds no icon link, so the console 404 is almost surely that request; the first browser run names the resource, and a different resource goes to the orchestrator). The test file is `look-app-icon.test.ts`.
- AC-1.9 (automated) The reader sentence has one even word gap on page 1 ("Hello, I am Pat.") and on page 2 ("Hello, I am May."): the sentence has no `justify` alignment, no `word-spacing` above 0.35 em, and its text with single spaces equals the source sentence of that page. A browser check at phone, tablet, and phone landscape finds the gaps between neighbouring words within 2 px of each other. The test file is `look-reader-gap.test.tsx`.
- AC-1.10 (automated) The existing tests that the changes break are updated in the same commit, with the reason: `phase3-adversarial-r2-pieces.test.tsx` (lines 68 to 70, 99, 115, and 127 hard-code the upper-case text that AC-1.3 removes); `phase3-adversarial-r3-pieces.test.tsx` (lines 43 to 44, 93, 99, 134, and 142 hard-code the upper case, for example `expectedText` and "TAP, TAP, TAP!", that AC-1.3 removes); `phase3-not-found.test.tsx` (lines 41 and 42 require equal Thai and English values of the 404 keys; the rule stays, and the test also asserts it for the four new keys); and `phase3-messages.test.ts` (line 17: `ENGLISH_VALUE_KEYS` holds only `notFoundEnglish`, so the Latin-only rule for Thai strings would fail on `notOpenEnglish` and `openWeekEnglish` in `messages/th.json`; the set also holds those two keys). `phase3-messages.test.ts` holds the key parity of the new keys. `phase3-song-ui.test.tsx` (line 50 asserts `preload` "none"; AC-1.4 changes it to "metadata").
- AC-1.11 (automated) In the listen mode and in the slow mode, for every word of every page of week 1: the highlight shows one window for the word, in order, with no skipped word, and each window is visible for at least 120 ms (the 80 to 100 ms words borrow time from the next word). The count of words checked is asserted greater than 0 before each property. The highlight follows each frame through the read-along loop (`useReadAlong`), not the `timeupdate` event. The test file is `look-reader-highlight.test.tsx`. The live check of Daniel's five sentences ("Hello, I am Pat", "Sam", "Mia", "your teacher", and "Pip") on the deployed revision waits for the deploy word.
- AC-1.12 (automated) A tap on a word in the My turn mode plays that word's own clip from `books[].audio.wordClips` (lower-case word to clip file). It makes no seek and no stop on the sentence audio, and it plays no slice of it. A word with no clip is not a tap target. The count of tappable w01 words is asserted greater than 0, and each maps to its own clip (fixture of clips). The sentence playback and its highlight keep the sentence audio and its timings. The content schema accepts `wordClips`. The test file is `look-word-clip-tap.test.tsx`. The live check waits for the clip data from Workbooks (the bank has 11 of the 23 distinct w01 book words today) and for the deploy word.
- AC-1.13 (automated) With `song.videoLeadInSeconds` of 3.0, the active lyric line equals the sung line for every w01 line at the start, the middle, and the end of each line, for the video (regular and phone) and for the audio-only fallback (lead-in 0). The count of lines checked is asserted greater than 0. The content schema accepts `videoLeadInSeconds` (0 to 30, default 0). The test file is `look-song-line-offset.test.tsx`. The live check waits for Workbooks to add the field and for the deploy word.

Council findings 4 (song title height), 17 (current-lyric highlight), and 19 (thumbnail above label) are not in this track unless Phase 2 answers them (option 1 answers 17 and 19).

### FR-2 Look port of the picked option (Phase 2)

Phase 2 edits the same route files as Phase 1, and `questions.tsx` too, so it starts after the Phase 1 checkpoint. It waits for Daniel's pick. Council findings 11, 14, 15, and 16 (the look) belong here. The look study estimate (`LOOK-NOTE.md` section 4):

| | Option 1 | Option 2 | Option 3 |
|---|---|---|---|
| Work | 3.5 days | 2 days | 2.5 days |
| Before 2026-11-20 | Yes, if Green starts by 2026-11-12: gates pass 2026-11-17, look check 2026-11-18. Later start: 2026-11-24. | Yes: gates pass 2026-11-14 if it starts 2026-11-11. | Yes: gates pass 2026-11-16, if the frontispiece uses the read-along cover. |

Date update of 2026-11-09 (finding F4): the Phase 2 UX browser review and the phase acceptance run on 2026-11-09, so the Phase 2 checkpoint is expected on 2026-11-09 or 2026-11-10, before the table dates above. Phase 3 (FR-3) runs from 2026-11-10 to 2026-11-12. Phase 2 ships on 2026-11-20 only if its gates pass in time. Asset plan for option 1 (PM, 2026-11-07): Workbooks sends the final SVG pieces from the cover template by 2026-11-11 (the game bar, the crest, and the left and right plaque tips; they replace the stand-ins `q-bar`, `q-crest`, `q-tip-l`, and `q-tip-r`). Green makes the 5 places (meadow, grove, oak, trail, path) from the cover art `A-front-a1-clean`, `A-reader-a2-clean`, and `A-back-a1`, as WebP at 1080 x 1920 and 1920 x 1080, under 250 KB each, without the 16 px edge glitch. Option 1 uses no cast cut-out. Fonts: Fredoka and Mitr through `next/font/local`. Any other gap that blocks a gate goes to the orchestrator. Dates (PM, 2026-11-07): Phase 2 Green starts by 2026-11-12; after the look port checkpoint the PM runs the council on the fixed screens; Daniel's final look check is on 2026-11-18, and the deploy waits for his word.

Rules from the study that bind every option: the read-along text, the decodable sentence, and the lyric list stay plain; the lyric list has no pictures (M-3); all targets are 48 px or more; there is one main action on each screen; Storytime plays only recorded files (no synthetic tone); Storytime is 2D only (no WebGL); motion is off with `prefers-reduced-motion`.

Record of 2026-11-07: the UI council round 2 on the look options scored option 2 at 78.3, option 3 at 77.6, option 1 at 73.9, and the current look at 59.0 (`~/.local/state/ui-council/storytime-look-options/<set>/round-1.md`, where `<set>` is `s0-current`, `s1-storybook-quest`, `s2-classroom-rug`, or `s3-picture-book`). Daniel accepted the look on 2026-11-07 (his word in chat was "Acepted", relayed by the PM). The pick is option 1 (Storybook Quest) with the hero fix below; the hero fix comes from items 1 to 3 of `s1-storybook-quest/round-1.md`.

Hero fix for option 1 (items 1 to 3 of `~/.local/state/ui-council/storytime-look-options/s1-storybook-quest/round-1.md`):

1. Song, phone: the cover card is 220 CSS px high, so the gold Play button and the active line show in the first view.
2. Activity screens, phone: the hero band is 96 CSS px high (about 170 today), so the decodable arrows show in the first view.
3. Reader, tablet at 1024 by 768: the hero band is 120 CSS px high, so the button row shows above the fold.

Acceptance:

- AC-2.1 (owner-passed) Daniel's pick of an option is recorded with his words and the date. Recorded 2026-11-07: option 1, Storybook Quest, with the council hero fix; his word in chat was "Acepted" (relayed by the PM).
- AC-2.2 (automated) For the 24 captures of the study (phone, tablet, phone landscape, English and Thai, four pages): console errors 0, broken pictures 0, targets under 48 px 0, clipped text 0, page overflow 0, text contrast failures 0. The capture list is asserted to hold 24 entries.
- AC-2.3 (automated) The sentence, the lyric list, and the read-along text carry no decoration class of the look; the lyric list holds no `img`; the code holds no WebGL call and no synthetic audio tone; motion rules sit under `prefers-reduced-motion`.
- AC-2.4 (automated) The UI council round 2 total is 85.0 or more (the council goal), with the same shots list as round 1.
- AC-2.5 (owner-passed) Daniel's look check passes. The record names the commit and the word.
- AC-2.6 (automated, option 1) Song page on the phone viewport of the browser gate: the cover card has a computed height of 220 CSS px (pin) and a measured height from 220 to 240 CSS px passes (PM range), and the Play button and the active lyric line are inside the first view (bottom edge at or above the viewport height).
- AC-2.7 (automated, option 1) Decodable and question screens on the phone viewport: the hero band has a computed height of 96 CSS px (pin) and a measured height from 92 to 100 CSS px passes (orchestrator tolerance of 4 px around the PM value "about 96"), and the previous and next arrows are inside the first view.
- AC-2.8 (automated, option 1) Reader at 1024 by 768: the hero band has a computed height of 120 CSS px (pin) and a measured height from 116 to 124 CSS px passes (orchestrator tolerance of 4 px around the PM value "about 120"), and the button row is above the fold (bottom edge at or above 768).

### FR-3 Week content r3 import (Phase 3; amendment of 2026-11-09)

**Amendment date:** 2026-11-09. **Source:** the PM handoff of 2026-11-09, quoted exactly:

```
PM handoff, Storytime app packages r3 for weeks 02-07 (Workbooks 953f798e). Folders: ~/Desktop/handoff/w02-storytime-app-package-r3 through ~/Desktop/handoff/w07-storytime-app-package-r3. PM re-checked them: sha256sum -c on each MANIFEST passes (77, 70, 70, 80, 71, 74 payload files; 23, 20, 24, 28, 22, 24 word clips). With w01 r4 the packages hold 163 word clips. They follow your K17 contract: books[].audio.wordClips (lower-case word to a path relative to content/storytime/) and song.videoLeadInSeconds. Key rule K2: NFC; U+2019 and U+2018 become U+0027; lower case; outer characters other than a-z and the apostrophe removed; key matches ^[a-z]+('[a-z]+)*$. A word with no key has no clip and no tap target. What: import the r3 packages in place of the older w02-w07 packages. Why: word taps and song line times for all 7 weeks before the 11-14 18:00 capture. Done when: the app reads all 7 weeks, each wordClips path resolves, and the import test passes. Date: 11-12, after K2a and S4b. Put it into the look plan as a task; it uses your next light slot.
```

Facts checked on 2026-11-09:

- `apps/storytime/content/l2/w01.json` to `w08.json` hold no `wordClips` and no `videoLeadInSeconds`.
- `apps/storytime/content/source.json` pins Workbooks commit `82f88853615f2925d8f1c12b4571790305224178` for w01 to w08.
- The contract already accepts both fields (`lib/contracts/week.ts`: `wordClips` record and `videoLeadInSeconds`, 0 to 30).
- The packages `~/Desktop/handoff/w02-storytime-app-package-r3` to `w07-storytime-app-package-r3` and `w01-storytime-app-package-r4` exist. Each holds `MANIFEST.txt`, `l2/`, and `phonemes/`.
- Workbooks commit `953f798e` exists and holds `content/storytime/l2/w01.json` to `w08.json`.
- `scripts/receive-weeks.ts` resolves a commit with `git rev-parse` and writes `content/l2`. Its `mediaOf` already lists the clip entries (look task 1.10, test-strategy M24).

The handoff text says the packages hold `song.videoLeadInSeconds`. The measure of AC-3.4 below shows that only w01 r4 holds it; the PM accepted the lead-in 0 for the audio-only w02 to w07 songs on 2026-11-09.

The handoff names weeks 02 to 07 and a w01 r4 package. The "all 7 weeks" and the 163 clips need the w01 r4 package too, so FR-3 imports w01 to w07.

**Decisions with defaults** (the orchestrator may change one before Red starts):

- D1 Import path. Default (revision of 2026-11-09, review finding F2 and F3): run `receive-weeks.ts` at Workbooks `953f798e` for all eight weeks w01 to w08. The receiver guard (`mergedFiles`, `scripts/receive-weeks.ts`) refuses a run at a new commit that leaves a recorded week behind, so `source.json` keeps one commit and its shape does not change. Green then compares each received w01 to w07 file with the package JSON (w01 with the r4 package, w02 to w07 with the r3 packages) by parsed deep equality. Green records the diff between the received w08 and the shipped w08. On any difference, or if `953f798e` does not hold the r4 content of w01, Green stops and reports to the orchestrator. There is no silent package-JSON fallback, because `source.json` must name the true source.
- D2 Media. Default: the import changes `content/l2` and `source.json` only. The clip files stay in the handoff packages for the local gates. The upload of the clips to the media bucket is a separate task with `deferred:daniel` (a production write).
- D3 Hashing. Default: FR-3 adds no hash, checksum field, or provenance file. The `MANIFEST.txt` check (`sha256sum -c`) is the PM's handoff check. It is not a new test field.
- D4 Scope. Default: Phase 3 touches files that the at-home track `storytime_at_home_release_20261106` owns: `apps/storytime/content/l2/`, `apps/storytime/content/source.json`, and `apps/storytime/scripts/receive-weeks.ts` only if the receiver cannot read the r3 content (then Green stops first and reports). The at-home Phase 3 deploy waits for the Phase 3 checkpoint of this track, and the orchestrator tells the at-home track owner before the import commit.
- D5 Timing. Default (revision of 2026-11-09, finding F4): Phase 3 starts only after the Phase 2 checkpoint (plan rules). The Phase 2 UX browser review and the phase acceptance run on 2026-11-09, so the Phase 2 checkpoint is expected on 2026-11-09 or 2026-11-10. Phase 3 runs from 2026-11-10 to 2026-11-12, after K2a and S4b and before the capture of 2026-11-14 18:00. The dates of FR-2 (Daniel's look check on 2026-11-18) stay.

Acceptance:

- AC-3.1 (automated) All seven week files `w01.json` to `w07.json` parse with the week contract of `lib/contracts/week.ts`. The file count is asserted equal to 7. The test reads repository files only (test-strategy A9).
- AC-3.2 (automated) Every `wordClips` key in the seven weeks is in K2 form (NFC, U+2018 and U+2019 turned into U+0027, lower case, outer characters other than a-z and the apostrophe removed) and matches `^[a-z]+('[a-z]+)*$`. The key count is asserted greater than 0 before the property runs.
- AC-3.3 (automated) Every `wordClips` path in the seven weeks has the safe relative form: no `..`, no leading `/`, under the media folder of its week, and an audio extension. The path count is asserted greater than 0 first. The test does not read the handoff folders.
- AC-3.3a (automated, Green evidence command) Every `wordClips` path resolves to a file in its handoff package root (w01 r4, w02 to w07 r3 under `~/Desktop/handoff/`; the path is relative to `content/storytime/`). Task 3.2 or 3.3 runs the command and prints `clip_paths_checked=163 clip_paths_missing=0`. It is not a repository test, because the handoff folder is absent in CI.
- AC-3.4 (automated) The test reads the raw JSON, so it tells an absent field from 0. The w01 file has `song.videoLeadInSeconds` equal to 3 (the r4 package holds `video`, `videoPhone`, and the field). The w02 to w07 files hold no `song.video` and no `song.videoLeadInSeconds` field; their parsed value is the contract default 0. The PM accepted the lead-in 0 for these audio-only songs on 2026-11-09.
- AC-3.5 (automated) The sum of the per-week distinct `wordClips` key counts is 163. Measured on 2026-11-09 (distinct paths of `books[].audio.wordClips` in each package): w01 22, w02 23, w03 20, w04 24, w05 28, w06 22, w07 24. The test asserts the sum and each per-week count.
- AC-3.6 (automated) The look glob, the receiver tests, and the media coverage test `phase3-media-coverage.test.ts` (finding F13) pass after the import, with the `mediaOf` list covering every clip path. The test files outside the look glob that the import breaks are updated in the same commit, with the reason.
- AC-3.7 (automated) `source.json` keeps one commit, the full id of `953f798e`, and its shape does not change. Its file list holds w01 to w08 and matches the files in `content/l2`. The w08 diff against the shipped w08 is recorded in the Green evidence.
- AC-3.8 (owner-passed) Daniel or the PM confirms the upload of the clips to the media bucket. The task is deferred to Daniel (D2). Until then, the local gates read the handoff media root.
- AC-3.9 (automated) The draft week review switch. `apps/storytime/lib/content.ts` exports the constant `DRAFT_WEEKS_ENV` (the value `STORYTIME_REVIEW_DRAFT_WEEKS`) and the function `showDraftWeeks()`. The function returns `true` only for the exact value `1`, it is a server-side value, and it is never a `NEXT_PUBLIC_` name. In `loadVisibleWeek` and `highestOpenWeeks`, a blocker of `draft` with `showDraftWeeks()` true is judged by the rules of a published week: a missing page picture still blocks, and media that is not approved still needs `showDraftMedia()`. The log line for a shown draft week is `storytime week <key> shows a draft week (review switch)`. With the switch off the behavior does not change. The seven week files stay unchanged (`meta.status` stays `draft` for w02 to w07), and the teacher pages and `lib/teacher.ts` are out of scope. No deploy config sets the name. The test lists the tracked deploy files with `git ls-files` (`apps/storytime cloudbuild*.yaml`, `Dockerfile*`, `.env*` files, the storytime row of `scripts/ci/apps.json`, and `.github/workflows/*.yml`), asserts the file count above 0 first, and fails when a file holds `STORYTIME_REVIEW_DRAFT_WEEKS` or `NEXT_PUBLIC_STORYTIME_REVIEW`. The test file is `apps/storytime/__tests__/look-draft-week-switch.test.ts`.

PM decision, 2026-11-09 14:2x, recorded and quoted:

```
(1) Do not change meta.status in the week files. Workbooks owns that field, and w02-w07 stay draft until the Thai captions pass Daniel's check (11-16). (2) Add a review-only switch for draft weeks next to showDraftMedia() in lib/content.ts: off by default, set only in the local review environment, never in a deploy file or cloudbuild substitution. Add one test that proves no deploy config sets it. (3) If that switch is more than a small change, use the fallback ... Take (2) unless your author finds it large
```

The orchestrator took option (2), because the change is small. `apps/storytime/lib/content.ts` lines 26 to 34 hold `DRAFT_MEDIA_ENV` and `showDraftMedia()`, and `loadVisibleWeek` at lines 107 to 135 already has the branch for `media_not_approved`. Background: Review C found that w02 to w07 are `meta.status: "draft"`, so `readinessBlocker` (`lib/readiness.ts:95`) returns `draft` and `loadVisibleWeek` blocks them even with `STORYTIME_SHOW_DRAFT_MEDIA=1`. The P3.8 browser taps on w02 to w07 cannot run.

### FR-4 Brand chrome (Daniel, 2026-11-10)

**Source:** Daniel's cover notes of 2026-11-10, relayed by the PM, and the PM brief of 2026-11-10. Phase 2b builds this FR. The PM owns the capture check of 2026-11-10 20:00.

**Owner words.** Daniel, 2026-11-10:

```
we don't have a gaming theme
the Chrome should match the tone of the logo
should also fill the Chrome
```

**PM words** (not Daniel): the text is centered.

**State at the base** (read of the screen files, 2026-11-10):

- `apps/storytime/app/[locale]/frame.tsx` renders the game bar `[data-game-bar]` with its band icons and its progress bar. It renders the level and week label `[data-level-week]` as `aria-hidden`, and the game bar holds the one copy that a screen reader reads. It renders the sprout crest `[data-crest]` (`app/look/pieces/q-crest.svg`) and the title plaque.
- `apps/storytime/app/look.css` builds the plaque, the buttons, the tiles, and the frames from `--sq-blue`, `--sq-blue-top`, `--sq-blue-dark`, and `--sq-navy`.
- The frame renders on the week route only. `frame.tsx` has one consumer: `app/[locale]/st/[level]/[week]/page.tsx`.

**Requirement.**

(a) Remove the game bar. No screen renders `[data-game-bar]`, its band icons, or its progress bar. The plain level and week label stays as text: `[data-level-week]` is visible, and a screen reader reads it once. The screen-reader copy moves from the game bar to the label.

(b) The Storytime Advantage logo replaces the sprout crest. The vector source is `/home/daniebo/Desktop/advantage-pr/assets/logos/vector/square/storytime-advantage.svg` (read only; Green copies it into the app). The logo has a text alternative. Every screen that rendered the crest shows the logo.

(c) All chrome takes the logo tones: amber `#fcd34d` and brown `#92400e`. Chrome means the title banners, the buttons, the panel frames, and the section cards. White text sits on brown. Brown text sits on amber. No chrome rule uses a blue token.

(d) The banner title text fills about 80 % of the banner height. The title is centered both ways.

**Keep unchanged:** the art (the place pictures and the story pictures), the read-along behavior, and the per-word highlight. A blue element that is art or that is the per-word highlight is not chrome, and it stays.

**Screens covered** (read of the screen files, 2026-11-10):

1. The week home: `/<locale>/st/<level>/<week>` with no `?part=` value. It holds the title banner, the crest, the three part cards, and the parent panel.
2. The read-along book: `?part=book`. It is the reader part of the same route.
3. The decodable page: `?part=decodable`.
4. The song: `?part=song`.
5. The question screen of the reader (`questions.tsx`), inside the book part.
6. The teacher week `/<locale>/teacher/<level>/<week>`, the teacher day, and the 403 page (`teacher/forbidden.tsx`).
7. The 404 view (`not-found-view.tsx`).
8. The return fallback `/<locale>/st`.
9. The sign-in page `/<locale>/sign-in` and the "How to join" page `/<locale>/join`.

The look chrome of `app/look.css` reaches screens 1 to 5, because they render the frame and the look cards. Screens 6 to 9 hold their own header and their own controls. They render no game bar and no crest. They take the chrome tones only through a rule of `app/look.css` that already reaches them.

**Default before Red** (the orchestrator may change it): requirement (c) binds the chrome rules of screens 1 to 5, and the shared rules that reach the other screens. A full restyle of screens 6 to 9 is a separate change, because the sign-in page and the join page belong to the login track and the teacher pages belong to the teacher track.

**Relation to option 1.** This FR replaces the game parts of option 1 "Storybook Quest": the game bar, the crest, and the blue plaques. The rest of option 1 stays, such as the places, the cards, the fonts, and the hero heights of AC-2.6 to AC-2.8.

**Acceptance.**

- AC-4.1 (automated) No screen renders the game bar. A render of screens 1 to 5 in `en` and `th` holds no `[data-game-bar]`, no element with `role="progressbar"`, no `[data-progress]`, and no `[data-band-icon]`. The app sources hold no `data-game-bar` attribute, and `app/look.css` holds no `[data-game-bar]` rule and no `q-bar.svg` reference. The case count is asserted above 0 before the cases run. The test file is `look-brand-chrome.test.tsx`.
- AC-4.2 (automated) `[data-level-week]` is visible and a screen reader reads it once. The node holds no `aria-hidden="true"`, it is not clipped (no 1 px box and no `clip-path: inset(50%)`), and it holds the level and the week of the route in the words of the interface locale (`Level 2 · Week 1` in `en`, the Thai words in `th`). The rendered frame holds exactly one copy of that text: a text query finds one node, and no other node holds a hidden copy. The test file is `look-brand-chrome.test.tsx`.
- AC-4.3 (automated) The logo replaces the crest. The app holds one logo file, copied from the read-only source: an SVG with the `viewBox` `0 0 700 700`, the fill `#fcd34d`, and the title "Storytime Advantage". The frame renders one logo element `[data-logo]` with the text alternative "Storytime Advantage", on the `cover` variant and on the `band` variant, in `en` and `th`. The app sources hold no `data-crest` attribute and no `q-crest.svg` reference, and `app/look.css` holds no `[data-crest]` rule. The test file is `look-brand-chrome.test.tsx`.
- AC-4.4 (automated) The tones. `app/look.css` defines `--st-amber: #fcd34d` and `--st-brown: #92400e` at the root scope. Every chrome rule of the four families uses the two tokens: the title banner, the buttons, the panel frames, and the section cards. No such rule names `--sq-blue`, `--sq-blue-top`, `--sq-blue-dark`, or `--sq-navy`. The rule count is asserted above 0 for each of the four families before the check runs. A blue token that stays sits in an art rule or in the per-word highlight rule, and the test names it in the evidence. The test file is `look-brand-chrome.test.ts`.
- AC-4.5 (automated) White on brown and brown on amber. Each chrome rule with a `--st-brown` background sets `#fff` as its text color. Each chrome rule with a `--st-amber` background sets `--st-brown` as its text color. The browser capture run of task 2b.4 measures each pair and prints `chrome_contrast_min` of 4.5:1 or more. The test file is `look-brand-chrome.test.ts`. The browser rows sit in `look-phase2-browser-gate.sh`.
- AC-4.6 (automated) The banner title is centered both ways, and its font size is about 80 % of the banner height. At 390 x 844 in `en` and `th`, with the shipped w01 title, `text-align` is `center`, the text box is centered in the banner within 2 px at the top and at the bottom, and `title_font_px / banner_h_px` sits from 0.76 to 0.84. The same run prints `clipped_text=0` and `page_overflow=0`. The banner height is a value of the rule and not a value of the text. A fixture title of 60 characters may step down one size step, and it must hold `plaque_overflow_px=0` and `clipped_text=0`. The browser rows sit in `look-phase2-browser-gate.sh`.
- AC-4.7 (automated) The art, the read-along files, and the highlight files are unchanged over the phase range: `packages/read-along/`, `apps/storytime/lib/highlight-windows.ts`, and the place pictures `apps/storytime/app/look/places/*.webp`. The highlight and word-tap proofs of AC-1.11 and AC-1.12 stay green. The Green evidence prints the empty diff of those paths.
- AC-4.8 (owner-passed) Daniel's look check of the r2 captures passes. The record names the commit, the capture folder `~/Desktop/storytime-preview-20261110/captures/`, and his word.

## 4. Constraints

- Human gates (`[b] … deferred:daniel`): Daniel's pick, his look check, and every deploy and traffic move. No push and no deploy.
- Stage named paths only. Never run `git add -A` or `git add .`.
- No hash, checksum field, or provenance file (AGENTS.md hashing policy).
- Heavy jobs run one at a time through `HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`.
- Every asset comes from advantage-forge or the owned files of the study; no licensed pixel library.
- Commit headers are 100 characters or less, with the `track_id`.

## 5. Out of scope

- The login (track `storytime_at_home_release_20261106`, Phase 2b).
- The deploy (at-home Phase 3).
- The www Storytime page copy.
