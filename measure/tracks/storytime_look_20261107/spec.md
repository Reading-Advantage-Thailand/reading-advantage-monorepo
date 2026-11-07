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

Phase 1 fixes eight council findings in the four route files. Phase 2 ports the look of the option that Daniel picks.

## 2. Sources

- Council report (read only): `~/.local/state/ui-council/storytime-w01-live/round-1.md` (19 ranked findings) and `round-1/shots/`.
- Look study (read only): `~/Desktop/handoff/storytime-look-options-20261107/` (`LOOK-NOTE.md`, `CHECKS.txt`, three options). Option 1 "Storybook Quest" is the recommended option (the only option in the family of the books and of Primary; it answers the lowest axis, look consistency).
- PM decisions, 2026-11-07: the Phase 1 batch is accepted; M-3 stands (no pictures in the lyric list), so council finding 10 is dropped; the English label of item 6 is "Read the words".
- Files: the four route files of `apps/storytime/app/[locale]/st/[level]/[week]/` (`page.tsx`, `decodable.tsx`, `reader.tsx`, `song.tsx`), `app/[locale]/not-found.tsx`, `messages/en.json`, and `messages/th.json`.

## 3. Functional requirements

Evidence classes: **automated**, **person-checked**, **owner-passed**.

### FR-1 UI council round 1 fixes (Phase 1)

Source: the UI council round 1 on week 1 live (`~/.local/state/ui-council/storytime-w01-live/round-1.md`, 19 findings, total 59.5, read only). PM decisions, 2026-11-07: the batch is accepted; M-3 stands (no pictures in the lyric list), so finding 10 is dropped; the English label of item 6 is "Read the words". The look port of Daniel's pick is a later phase (FR-2, Phase 2).

Acceptance:

- AC-1.1 (automated) `/th/st/2/2` (a week that is not open) answers 404 with a text that says the week is not open yet and does not hold "Go back to the QR code". It holds one link or button of 48 px or more whose target is the highest open week of level 2 (`/th/st/2/1` today, by `loadVisibleWeek`). English and Thai copy are tested.
- AC-1.2 (automated) For a level with no open week, the not-open page holds no such button (`buttons` equals 0).
- AC-1.3 (automated) The decodable page for week 1 renders the sentence "A nest." with no space before the full stop, and the chips "a", "and", and "can" in the case of the source. No rendered text of the sentence or the chips is the upper-case form of the source.
- AC-1.4 (person-checked, then automated) A person check on a real phone records whether the video area goes blank white while the song plays. If it does, the media element keeps its `poster` and no hiding style in the playing state (test).
- AC-1.5 (automated) After a press on Next, the old sentence stays in the page until the load event of the new picture (or 3 seconds), then both change together.
- AC-1.6 (automated) While a sound plays, its button has `aria-pressed="true"` and an active label. Next is the filled main button of 48 px or more. A page count "1 / N" sits between the arrows and updates on each turn (N from the week data; the test asserts N is greater than 1).
- AC-1.7 (automated) The English label of the decodable card is "Read the words". The Thai label is "อ่านคำ".
- AC-1.8 (automated) The rendered week page for `/th/st/2/1` and `/en/st/2/1` lists no sub-resource that answers 404 (the list is asserted not empty first).
- AC-1.9 (automated) The reader sentence has one even word gap: the sentence has no `justify` alignment, no `word-spacing` above 0.35 em, and its text with single spaces equals the source sentence ("Hello, I am May."). A browser check at phone, tablet, and phone landscape finds the gaps between neighbouring words within 2 px of each other.

Council findings 4 (song title height), 17 (current-lyric highlight), and 19 (thumbnail above label) are not in this track unless Phase 2 answers them (option 1 answers 17 and 19).

### FR-2 Look port of the picked option (Phase 2)

Phase 2 edits the same four route files as Phase 1, so it starts after the Phase 1 checkpoint. It waits for Daniel's pick. Council findings 11, 14, 15, and 16 (the look) belong here. The look study estimate (`LOOK-NOTE.md` section 4):

| | Option 1 | Option 2 | Option 3 |
|---|---|---|---|
| Work | 3.5 days | 2 days | 2.5 days |
| Before 2026-11-20 | Yes, if Green starts by 2026-11-12: gates pass 2026-11-17, look check 2026-11-18. Later start: 2026-11-24. | Yes: gates pass 2026-11-14 if it starts 2026-11-11. | Yes: gates pass 2026-11-16, if the frontispiece uses the read-along cover. |

Phase 2 ships on 2026-11-20 only if its gates pass in time. Asset gaps (study section 3): no cut-out pictures of the cast, no painted places at final size (WebP, 1080 x 1920 and 1920 x 1080, under 250 KB), and the bar, crest, and plaque are stand-ins. Each gap that blocks a gate goes to the orchestrator.

Rules from the study that bind every option: the read-along text, the decodable sentence, and the lyric list stay plain; the lyric list has no pictures (M-3); all targets are 48 px or more; there is one main action on each screen; Storytime plays only recorded files (no synthetic tone); Storytime is 2D only (no WebGL); motion is off with `prefers-reduced-motion`.

Acceptance:

- AC-2.1 (owner-passed) Daniel's pick of an option is recorded with his words and the date.
- AC-2.2 (automated) For the 24 captures of the study (phone, tablet, phone landscape, English and Thai, four pages): console errors 0, broken pictures 0, targets under 48 px 0, clipped text 0, page overflow 0, text contrast failures 0. The capture list is asserted to hold 24 entries.
- AC-2.3 (automated) The sentence, the lyric list, and the read-along text carry no decoration class of the look; the lyric list holds no `img`; the code holds no WebGL call and no synthetic audio tone; motion rules sit under `prefers-reduced-motion`.
- AC-2.4 (automated) The UI council round 2 total is 85.0 or more (the council goal), with the same shots list as round 1.
- AC-2.5 (owner-passed) Daniel's look check passes. The record names the commit and the word.

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
