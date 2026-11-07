# Implementation Plan: Storytime look and council fixes

> **Track ID:** `storytime_look_20261107` · **Spec:** [spec.md](./spec.md)
> **Dates:** Phase 1 before the at-home deploy of 2026-11-20 (the at-home Phase 3 waits for its checkpoint). Phase 2 Green starts by 2026-11-12 if Daniel has picked.

## Rules for this plan

- Markers: `[ ]` pending, `[~]` in progress, `[x]` done, and `[b] … deferred:<owner>` at a human gate. A task in phase N+1 starts only after the heading of phase N has its checkpoint (measure-guard).
- An `[x]` note names the commit and the evidence class: automated, person-checked, or owner-passed.
- Hard gates stay with Daniel: his look pick, his look check, and every deploy. No push and no deploy.
- Each task follows `measure/workflow.md`: tests first, then code, then one commit with `(track_id: storytime_look_20261107)`. The commit header is 100 characters or less.
- Stage named paths only. Never run `git add -A` or `git add .`.
- Heavy jobs run one at a time through `HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`. Vitest uses `--maxWorkers=1` and targeted files.
- No new hash, checksum field, or provenance file (AGENTS.md hashing policy).
- Role lines are not plan tasks. Each phase has a "Roles" note paragraph instead (the role gates count every non-deferred `- [ ]` line as an incomplete task).

## Phase 1: Council fixes

Source: `~/.local/state/ui-council/storytime-w01-live/round-1.md` (19 ranked findings, total 59.5) and `round-1/shots/`. PM decisions of 2026-11-07: the batch below is accepted; M-3 stands (no pictures in the lyric list), so council finding 10 is dropped; the English label of item 6 is "Read the words". Each task with a test that can hold it starts with a Red test in its own commit, then Green. Files: the four route files of `apps/storytime/app/[locale]/st/[level]/[week]/`, `app/[locale]/not-found.tsx`, `messages/en.json`, and `messages/th.json`. Spec: FR-1.

Roles after Green: the spec review and the test strategy (another model family than `claude-code/claude-sonnet-5-5`) run before Red. Reviews A and C, the browser check of the 404 page, the decodable page, the song, and the reader at phone, tablet, and phone landscape in English and Thai, and the phase acceptance run after the tasks. The orchestrator runs them. They are not plan tasks. The acceptance role appends `[checkpoint: <sha>]` to this heading.

- [ ] 1.1 The 404 page (council finding 1; AC-1.1, AC-1.2). The page for a week that is not open (for example `/th/st/2/2`) says that the week is not open yet and no longer says "Go back to the QR code". It shows one button of 48 px or more that opens the open week of the same level. Rule for which week: the highest open week of that level, by `loadVisibleWeek` (`lib/content.ts`). When the level has no open week, the page shows no button. English and Thai copy; the Thai text is a draft for Daniel's copy check. Red test, then Green. Evidence class: automated.
- [ ] 1.2 Decodable case and full stop (council finding 5; AC-1.3). The sentence and the tricky-word chips keep the case of the source text: the sentence reads "A nest." and the chips read "a", "and", "can" (shipped `content/l2/w01.json`: `books[1].audio.sentences[0].sentence` and `books[1].soundsPage.tricky`). No `toUpperCase` call stays (`decodable.tsx` lines 541 and 596 today). No space comes before the full stop. Red test, then Green. Evidence class: automated.
- [ ] 1.3 Song, playing state on a phone (council findings 9 and 13; AC-1.4). Step 1, a person check on a real phone, first: does the video area go blank white while the song plays? The headless capture showed it. Record the result with the phone model. Evidence class: person-checked. Step 2, only if the blank is real: keep the poster or the current frame visible while the song plays. A Red test holds that the media element keeps its `poster` attribute and has no `hidden` style or `display: none` in the playing state. If the blank is not real, close the task with the person-check record and no code change. Evidence class: person-checked, then automated.
- [ ] 1.4 Reader page turn (council finding 12; AC-1.5). The picture and the sentence change together: after a press on Next, the old sentence stays until the new picture has loaded (the `load` event of the image, with a timeout of 3 seconds so a failed image cannot freeze the page). Red test, then Green. Evidence class: automated.
- [ ] 1.5 Feedback and Next (council findings 3, 6, 7, and 8; AC-1.6). The buttons "Play the sound" and the reader audio buttons show a visible playing state (an active label and `aria-pressed="true"`) while the sound plays. Next is the main filled button, at 48 px or more, and the audio buttons stay outlined. A page count "1 / N" sits between the arrows and updates on each turn; N is the page count of the week data. Red test, then Green. Evidence class: automated.
- [ ] 1.6 Week card label (council finding 2; AC-1.7). The English label of the decodable card changes from "Decodable" to "Read the words" (`messages/en.json`, key `tileDecodable`). The Thai label stays "อ่านคำ". Red test, then Green. Evidence class: automated.
- [ ] 1.7 The unidentified 404 resource (AC-1.8). Find the one resource of the week page that answers 404 (a console error) with a browser run of `/th/st/2/1` and `/en/st/2/1`, name it in the commit message, and remove the cause. Red test: the page response holds no URL that the test server answers with 404 (the test lists the sub-resource URLs of the rendered page and asserts the list is not empty before it checks each one). Evidence class: automated.
- [ ] 1.8 Reader word gaps (council finding 18; AC-1.9). The words of the sentence sit at an even gap, so the sentence reads as normal text on every size (phone, tablet, phone landscape). Red test, then Green. Evidence class: automated.

## Phase 2: Look port of the picked option

Phase 2 edits the same four route files as Phase 1, so it starts after the Phase 1 checkpoint. Source: `~/Desktop/handoff/storytime-look-options-20261107/` (option 1 "Storybook Quest" is recommended; the estimate is in `LOOK-NOTE.md` section 4: option 1 takes 3.5 days, and Green must start by 2026-11-12 for the gates to pass on 2026-11-17). Findings 11, 14, 15, and 16. Spec: FR-2.

Roles after Green: Reviews A and C, the adversarial round, the browser review at phone, tablet, and phone landscape in English and Thai, the UI council round 2, and the phase acceptance run after the tasks. The orchestrator runs them. They are not plan tasks.

- [b] 2.1 Daniel picks an option of the look study. Record his words and the date (AC-2.1). deferred:daniel
- [ ] 2.2 Red tests for the picked option (AC-2.2, AC-2.3): the 24-capture check, the plain-text rule, the 2D and recorded-sound rules, the reduced-motion rule. Run red, commit alone. Evidence class: automated.
- [ ] 2.3 Green: port the look (for option 1: `look.css`, a new `frame.tsx`, `layout.tsx`, the four route files, 5 painted places in two sizes, 4 SVG files, 2 fonts; the study counts 3 new unit tests and 1 changed test). Any asset gap of spec FR-2 that blocks a gate goes to the orchestrator. Evidence class: automated.
- [ ] 2.4 Gates: targeted tests, `tsc`, ESLint, the browser gate `phase3-browser-gate.sh`, and the UI council round 2 score of 85.0 or more (AC-2.4), through `heavy-run`. Evidence class: automated.
- [b] 2.5 Daniel's look check of the tagged build (AC-2.5). deferred:daniel
