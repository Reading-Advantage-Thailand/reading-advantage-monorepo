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
- AC-1.4 (person-checked, then automated) A person check on a real phone records whether the video area goes blank white while the song plays. If it does, then after a `play` event of the video the `.song-stage` element has `data-playing="true"` and its inline `background-image` holds the poster URL, so the poster shows under a blank video frame. At the base the element has neither, so the test fails at the base. The test does not assert the `poster` attribute (a video ignores it during playback). The test file is `look-song-playing.test.tsx`.
- AC-1.5 (automated) After a press on Next, the old sentence stays in the page until the load event of the new picture (or 3 seconds), then both change together. The test file is `look-reader-turn.test.tsx`.
- AC-1.6 (automated) While a sound plays, its button (decodable "Play the sound" and each reader audio button) has `aria-pressed="true"` and shows the playing label (`playerPlaying`, "Playing" in English). Next is the filled main button of 48 px or more. A page count "1 / N" sits between the arrows and updates on each turn (N from the week data; the test asserts N is greater than 1). The test file is `look-feedback.test.tsx`.
- AC-1.7 (automated) The English label of the decodable card (`tileDecodable`) is "Read the words". The Thai label is "อ่านคำ". The test file is `look-week-card-label.test.tsx`.
- AC-1.8 (automated) The file `apps/storytime/app/icon.png` exists, is a PNG (the 8-byte signature), is at least 32 by 32 pixels, and is 20 KB or less. The unit test needs no server. The head link `/icon.png` and the end of the 404 on `/th/st/2/1` and `/en/st/2/1` are confirmed by the browser run of the phase check (the live site on 2026-11-07 answers 404 for `/favicon.ico` and the page holds no icon link, so the console 404 is almost surely that request; the first browser run names the resource, and a different resource goes to the orchestrator). The test file is `look-app-icon.test.ts`.
- AC-1.9 (automated) The reader sentence has one even word gap on page 1 ("Hello, I am Pat.") and on page 2 ("Hello, I am May."): the sentence has no `justify` alignment, no `word-spacing` above 0.35 em, and its text with single spaces equals the source sentence of that page. A browser check at phone, tablet, and phone landscape finds the gaps between neighbouring words within 2 px of each other. The test file is `look-reader-gap.test.tsx`.
- AC-1.10 (automated) The existing tests that the changes break are updated in the same commit, with the reason: `phase3-adversarial-r2-pieces.test.tsx` (lines 68 to 70, 99, 115, and 127 hard-code the upper-case text that AC-1.3 removes); `phase3-adversarial-r3-pieces.test.tsx` (lines 43 to 44, 93, 99, 134, and 142 hard-code the upper case, for example `expectedText` and "TAP, TAP, TAP!", that AC-1.3 removes); `phase3-not-found.test.tsx` (lines 41 and 42 require equal Thai and English values of the 404 keys; the rule stays, and the test also asserts it for the four new keys); and `phase3-messages.test.ts` (line 17: `ENGLISH_VALUE_KEYS` holds only `notFoundEnglish`, so the Latin-only rule for Thai strings would fail on `notOpenEnglish` and `openWeekEnglish` in `messages/th.json`; the set also holds those two keys). `phase3-messages.test.ts` holds the key parity of the new keys.

Council findings 4 (song title height), 17 (current-lyric highlight), and 19 (thumbnail above label) are not in this track unless Phase 2 answers them (option 1 answers 17 and 19).

### FR-2 Look port of the picked option (Phase 2)

Phase 2 edits the same route files as Phase 1, and `questions.tsx` too, so it starts after the Phase 1 checkpoint. It waits for Daniel's pick. Council findings 11, 14, 15, and 16 (the look) belong here. The look study estimate (`LOOK-NOTE.md` section 4):

| | Option 1 | Option 2 | Option 3 |
|---|---|---|---|
| Work | 3.5 days | 2 days | 2.5 days |
| Before 2026-11-20 | Yes, if Green starts by 2026-11-12: gates pass 2026-11-17, look check 2026-11-18. Later start: 2026-11-24. | Yes: gates pass 2026-11-14 if it starts 2026-11-11. | Yes: gates pass 2026-11-16, if the frontispiece uses the read-along cover. |

Phase 2 ships on 2026-11-20 only if its gates pass in time. Asset plan for option 1 (PM, 2026-11-07): Workbooks sends the final SVG pieces from the cover template by 2026-11-11 (the game bar, the crest, and the left and right plaque tips; they replace the stand-ins `q-bar`, `q-crest`, `q-tip-l`, and `q-tip-r`). Green makes the 5 places (meadow, grove, oak, trail, path) from the cover art `A-front-a1-clean`, `A-reader-a2-clean`, and `A-back-a1`, as WebP at 1080 x 1920 and 1920 x 1080, under 250 KB each, without the 16 px edge glitch. Option 1 uses no cast cut-out. Fonts: Fredoka and Mitr through `next/font/local`. Any other gap that blocks a gate goes to the orchestrator. Dates (PM, 2026-11-07): Phase 2 Green starts by 2026-11-12; after the look port checkpoint the PM runs the council on the fixed screens; Daniel's final look check is on 2026-11-18, and the deploy waits for his word.

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
