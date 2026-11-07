# Test strategy: Storytime look and council fixes

> **Track:** `storytime_look_20261107` · **Spec:** [spec.md](./spec.md) · **Plan:** [plan.md](./plan.md)
> **Scope:** Phase 1 `## Phase 1: Council fixes` in full (section P1). Phase 2 `## Phase 2: Look port of the picked option` as an outline (section P2).
> **Written:** 2026-11-07 at role base `d8e73fc6c` (spec review passed in round 2). Model: claude-code/claude-sonnet-5-5 (PM rule: no Opus).
> **Related strategy:** [storytime_at_home_release_20261106/test-strategy.md](../storytime_at_home_release_20261106/test-strategy.md). Its section 1.1 (heavy jobs) and section P2b.4 (targeted command shape) apply here.
> **Facts:** each "measured" fact was read on 2026-11-07 at `d8e73fc6c`. One heavy job ran (fact M1). Red and Green must measure again.

## 1. Rules for every phase of this track

### 1.1 Heavy jobs

- Every Vitest, `tsc`, ESLint, build, and browser run goes through one wrapper:

  ```bash
  HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'
  ```

- Every Vitest command uses `CI=true` and `--maxWorkers=1`, runs on targeted files, and runs in the foreground. One heavy job runs at a time (7 GB machine).
- A server and its client run in ONE job with `trap 'kill $SERVER_PID' EXIT`.
- The gate scripts `phase3-browser-gate.sh` and `phase1-quality-gates.sh` enter `heavy-run.sh` themselves. Run them plain with `bash <script>`.
- The root suite `pnpm turbo run test` is red for reasons outside this track. No gate uses it.
- Light work needs no lock: reads, `rg -n`, and `git show|log|diff|rev-parse`.

### 1.2 Hash rule

- This track adds no hash, no checksum field, no manifest, and no provenance file (AGENTS.md hashing policy). Git commit identity is the provenance.
- The PNG test reads the 8-byte file signature and the IHDR size fields. A file signature is a format check, not a hash.

### 1.3 Evidence classes

- **Artifact test:** reads a file and checks text, class tokens, or structure. jsdom loads no CSS, so a class-token test is an artifact test. It never proves layout.
- **Function-level live test:** renders the real component or calls the real function on the shipped `content/l2/w01.json`. It proves behavior in jsdom, not in a browser.
- **Browser run:** a real Chrome on a built app. It proves layout, computed style, targets, gaps, and the console. AC-1.8 (head link) and AC-1.9 (gaps within 2 px) need it.
- **Person check:** a human on a real phone (task 1.3 step 1). No role fakes it.
- A plan `[x]` note names the commit, the evidence class, the exit code, and the labeled counts (A5).

### 1.4 Capture of `phase_base_sha`

- This file embeds no SHA. A SHA from before this strategy commit is not valid.
- The orchestrator captures it with `git rev-parse HEAD` after three events: the commit of this strategy, the answers to the questions of section 4 (at least Q1, Q2, and Q5), and the start of Red. The capture happens before the Red role starts. The orchestrator records the full SHA in the Red evidence.
- Master is shared with the login track (section 2.2). `phase_base_sha..HEAD` therefore holds login commits. Scope checks use the commits of this track only:
  `git log <phase_base_sha>..HEAD --format=%H --grep='track_id: storytime_look_20261107'`, then `git show --name-only --format= <sha>` for each. Label: `look_out_of_scope_paths=<n>`; the Phase 1 closeout needs 0 (the allowed paths are in closeout item 3 of P1.4).
- Phase 2 gets its own capture by the same command after the Phase 1 checkpoint.

### 1.5 Shared anti-pattern defenses

The catalog is `measure/anti-patterns.md`. Per-task coverage is in P1.7.

| ID | Defense in this track | Falsification condition |
|---|---|---|
| A3 | Every count is a labeled integer in the assertion message or the evidence line: `no_link_cases=<n>`, `pairs_checked=<n>`, `pages_n=<n>`. The check parses the integer after the label. | A bare number or a date passes a count check. |
| A4 | Each loop asserts its input set first: cases greater than 6, pairs equal to 128, pages greater than 1, words greater than 0. A characterization case that passes at the base is named in the Red evidence with its reason. | A loop over zero cases exits 0. A Red file with no failing case at the base (except a named characterization file) is vacuous. |
| A5 | The plan note quotes the exit code and the labeled counts of the command it cites. A person-check record names the phone model and a labeled line `phone_blank=yes` or `phone_blank=no`. | The plan says "pass" and the cited command exits non-zero. A note with no phone model closes task 1.3. |
| A9 | No test reads a `measure/tracks/` path, the council report, or the study folder under `~/Desktop/handoff/`. Tests read repo files only. Detector: `rg -n 'measure/tracks|ui-council|handoff/storytime' apps/storytime/__tests__/look-*` exits 1. | A look test contains one of these strings. |
| A14 | Detectors use `rg -n '<regex>'`. Exit 1 means no hit. Exit 2 is a failure. | A detector with a bad option reports zero hits. |
| A16 | All work runs in the shared master tree. Scratch folders are plain directories made with `mktemp -d` under `/tmp`, not worktrees. | `git worktree list \| wc -l` differs from the count at the capture (8 at the base). |

## 2. Measured facts that shape the tests

### 2.1 Facts

| # | Fact | How measured |
|---|---|---|
| M1 | The targeted Storytime command of the login strategy (glob `release-receipt-pin`, `release-weeks-readiness`, `phase1-*` to `phase4-*`; no `login-*`, no `look-*`) exits 0 with `Test Files 59 passed (59)` and `Tests 452 passed (452)`. Failed 0. Skipped 0. Duration 95.76 s. The output holds many `Not implemented: HTMLMediaElement's pause() method` lines (jsdom noise, not a failure). | One `heavy-run.sh` job, 2026-11-07, output in `/tmp/look-base-run.txt`. |
| M1a | That glob misses `__tests__/release-adversarial.test.ts` (added by `811f05f36`). Run alone it exits 0 with `Test Files 1 passed (1)` and `Tests 26 passed (26)`. The look command therefore uses the glob `__tests__/release-*.test.ts`. The base of the look command is `files=60` and `tests_passed=478`, where 478 is the sum of two measured runs (452 + 26). Green verifies the sum in its first run. | A second `heavy-run.sh` job, 2026-11-07, output in `/tmp/look-rel-adv.txt`. |
| M2 | `apps/storytime/__tests__` holds 70 `*.test.ts(x)` files at the base: 60 old files and 10 `login-*` Red files of the login track, plus `helpers/fake-store.ts`. At the base `d8e73fc6c` the login files were untracked. The login track committed them during this role (`50bd7e68e`, `701e76f53`), so HEAD is now `701e76f53`. The `login-*` files fail by design. The look commands name their files, so the login Red files never enter a look run. | `ls`, `git status --short`, `git log`. |
| M3 | `LEVEL_MAX` is 4 and `WEEK_MAX` is 32 (`lib/contracts/week.ts:468,471`). `highestOpenWeeks()` therefore tries 128 files (127 fail with `ENOENT`). Only `content/l2/` holds files: `w01.json` to `w08.json`. `w01` is `published` and ready. `w02` to `w08` are `draft`. | `ls`, `python3` read of `w01.json`. |
| M4 | The `w01` decodable book (`books[1]`) has `audio.sentences[0].sentence` = "A nest." and `soundsPage.tricky` = `["a","and","can"]`. The reader book (`books[0]`) has page 1 "Hello, I am Pat." and page 2 "Hello, I am May.". Both books have 8 pages. The song has `poster`, `posterPhone`, `video`, and `videoPhone`. | `python3` read of `w01.json`. |
| M5 | `decodable.tsx` calls `toUpperCase()` on the word buttons (line 541) and on the tricky chips (line 596). Its text node for a space is a separate `<span>`, so the paragraph `textContent` at the base is "A NEST." (the existing test `expectedText` pins this). The "no space before the full stop" part of AC-1.3 therefore already holds in the DOM at the base. | Read `decodable.tsx`, `phase3-adversarial-r2-pieces.test.tsx`. |
| M6 | **The reader word gap has a layout cause, not a text-align cause.** `reader.tsx` passes `tapTargetFloor` to `ReadAlongPassage`. The passage then gives each word `inline-flex min-h-[44px] min-w-[44px] items-center justify-center`. A short word ("I", "am") sits centered in a 44 px box, so the visible gap grows. The package has no `justify` and no `word-spacing`. The AC-1.9 checks of the spec (no `justify`, no `word-spacing` above 0.35 em, single-space text equals the source) would all pass at the base. Red must add a check that fails at the base (P1.2, task 1.8). | Read `read-along-passage.tsx`, `globals.css`. |
| M7 | `packages/read-along` has one consumer app: `apps/storytime` (`grep -ln read-along apps/*/package.json` prints one file). The package test `read-along-passage.test.tsx` does not name `tapTargetFloor` or the 44 px floor (grep found no hit in the package tests). | `grep -ln`. |
| M8 | The song component keeps `playing` state from the `play`, `pause`, and `ended` events of the `<video>`. The stage `<div class="song-stage" data-phone>` has no `data-playing` and no inline style. The poster is set only as the `poster` attribute (`song.tsx:122`). | Read `song.tsx`. |
| M9 | The reader audio buttons are `readToMe`, `myTurn`, and `slow` (`reader.tsx`, lines about 449 to 467). The Next arrow and the audio buttons share one class string (`border border-neutral-300`). No button has `aria-pressed`. The reader has no page count. The `<img>` of the page has `loading="lazy"`. | Read `reader.tsx`. |
| M10 | `proxy.ts` returns `NextResponse.next()` for `FILE_PATH` (`/\.[^/]+$/`) before any other rule, so `/icon.png` passes today. The login track adds a cookie rule in this file. A rule placed before the file test would send `/icon.png` of a stranger to the sign-in page. | Read `proxy.ts`. |
| M11 | `app/[locale]/not-found.tsx` is a server component with no props. The 404 renders under `[locale]`. `app/icon.png` and `app/favicon.ico` do not exist. | `ls app`. |
| M12 | The week page builds media URLs from `mediaBase` in `page.tsx`, `decodable.tsx` (4 places), `reader.tsx` (4 places), `song.tsx` (2 places), and `questions.tsx` (2 places). The login track (task 2b.6) replaces them with signed URLs from `signWeekMedia`. The prop name and shape after that change are not pinned in the login strategy. | `rg -n 'mediaBase\|mediaUrl'`. |
| M13 | `phase3-home-render.test.tsx` and `phase3-adversarial-r3-tiles.test.tsx` name the key `tileDecodable` and not its English value. Task 1.6 breaks neither file. | `grep -n`. |
| M14 | Not measured: `tsc --noEmit` and ESLint at the base. The untracked login Red files may change the `tsc` result. Green records both exit codes before its first change. | Cost of a heavy job. |
| M15 | `git worktree list \| wc -l` prints 8 and the branch is `master`. | Light read. |

### 2.2 Files that both tracks touch, and the merge order

Login track: `storytime_at_home_release_20261106`, Phase 2b. Its Red role writes `login-*.test.ts(x)` and `helpers/` now. Its Green changes `proxy.ts`, the page guards, and the week page media URLs (tasks 2b.4 and 2b.6). **PM order: login 2b first, the look fixes second.**

| File | Login track | Look Phase 1 | Handling |
|---|---|---|---|
| `app/[locale]/st/[level]/[week]/page.tsx` | page guard; `signWeekMedia` map in place of `mediaBase` | 1.5 passes the `playerPlaying` label to the reader | Look Green waits for the login 2b.6 commit, then rebases. |
| `.../decodable.tsx` | media URL prop (4 places) | 1.2 (case), 1.5 (playing state, default label) | Same. |
| `.../reader.tsx` | media URL prop (4 places) | 1.4 (turn), 1.5 (feedback), 1.8 (gap) | Same. |
| `.../song.tsx` | media URL prop (2 places) | 1.3 (poster under the playing video) | Same. The poster URL then is a signed URL. |
| `.../questions.tsx` | media URL prop (2 places) | unchanged in Phase 1 | Phase 2 restyles it after both. |
| `messages/en.json`, `messages/th.json` | sign-in and join keys | 1.1 (4 keys), 1.5 (`playerPlaying`), 1.6 (`tileDecodable` value) | Both append keys. Merge by union. The parity test of `phase3-messages.test.ts` is the check. |
| `__tests__/phase3-messages.test.ts` | may extend sets for its keys | 1.1 extends `ENGLISH_VALUE_KEYS` | Hand merge. Run the file after the merge. |
| `__tests__/phase3-browser-gate.sh` | signs in first | none (look runs it only) | Look does not edit it. |
| `proxy.ts` | cookie rule | none (one characterization test reads it) | Look edits nothing. The test of `/icon.png` guards the login Green (case I3 of P1.2). |
| `__tests__/helpers/` | owns `fake-store.ts` | one new file `look-render.tsx` | Different name. No conflict. |

Files only the look track touches: `app/[locale]/not-found.tsx`, the new `not-found-view.tsx`, `lib/content.ts`, `lib/route-parse.ts`, `app/icon.png`, and the `look-*` tests.

**Default rule (Q1).** Tasks 1.1, 1.6, and 1.7 touch no login-Green file except the two message files. They may commit before the login 2b.6 commit. Tasks 1.2, 1.3, 1.4, 1.5, and 1.8 (Green) wait for the login 2b.6 commit. Red for all tasks may run now, because the Red files are new and have no login name. Look Red tests render components with the base props (`mediaBase`). A single helper (`look-render.tsx`) builds the media props, so the login merge changes one file. Tests check a media URL with `endsWith(<file>)`, never with an exact URL.

## 3. Phase summary

| Phase | Risk | Review A | Review B (security) | Review C (UX/API) | Adversarial | Browser review |
|---|---|---|---|---|---|---|
| P1 Council fixes | medium | yes | no | **yes (required)** | yes (focused, one round) | **yes (required)** |
| P2 Look port of option 1 | high | yes | no | **yes (required)** | yes | **yes (required)** + UI council round 2 |

The reasons are in P1.6 and P2.

## P1: Council fixes

**Risk: medium.** The phase changes child-facing text, audio-button state, page-turn timing, and a 404 view. It adds one exported function in `lib/content.ts` and one in `lib/route-parse.ts`. It adds no auth, no database, no network, and no secret. It shares five source files with the login track, so a bad merge could change behavior of the signed-media path. Task risk: 1.1 medium, 1.2 low, 1.3 medium (needs a person), 1.4 medium (page state and audio), 1.5 medium, 1.6 low, 1.7 low, 1.8 medium (shared package).

`ROOT=/home/daniebo/Desktop/reading-advantage-monorepo`. `HEAVY` is the wrapper of section 1.1. Every Red file loads the module with `existsSync` first and then a dynamic import (the pattern of `phase3-entry-route.test.tsx`), so a Red failure is an assertion with a message and not a load error. A Red output with `Cannot find module` or `ENOENT` is a defect of the Red test.

Each look test file that renders a component starts with `// @vitest-environment jsdom`. It stubs `HTMLMediaElement.prototype.play` (returns a resolved promise) and `pause`, and `window.matchMedia`, in `beforeEach`, and restores them in `afterEach`. It unsets `STORYTIME_CONTENT_DIR` and `STORYTIME_SHOW_DRAFT_MEDIA` before a content case and restores them after (the pattern of `phase3-media-gate.test.ts`).

### P1.1 Red: command and expected failure for each task

**Red rule.** Red edits the 4 old test files of AC-1.10 to the new expectation. They then fail at the base for the right reason, and Green changes only code. Each look file is its own commit (plan rule). Each Red commit leaves the file red and the rest of the suite green.

**Per-task Red command** (shape; replace the file list):

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 <files>'
```

| Task | `<files>` | Expected at the base |
|---|---|---|
| 1.1 | `__tests__/look-not-found.test.tsx __tests__/phase3-not-found.test.tsx __tests__/phase3-messages.test.ts` | Exit 1. `look-not-found` fails in every case with `Missing apps/storytime/app/[locale]/not-found-view.tsx` or `lib/content.ts must export highestOpenWeeks` or `lib/route-parse.ts must export parseStorytimePath`. `phase3-not-found` fails 1 case (the new keys are absent). `phase3-messages` fails the new-key parity case. The old cases of both old files pass. |
| 1.2 | `__tests__/look-decodable-case.test.tsx __tests__/phase3-adversarial-r2-pieces.test.tsx __tests__/phase3-adversarial-r3-pieces.test.tsx` | Exit 1. Failure message: expected "A nest." and received "A NEST."; chips expected `a`,`and`,`can` and received `A`,`AND`,`CAN`; the edited cases of r2 and r3 fail the same way. Passing at the base (named characterization): the "no space before the full stop" case (M5). |
| 1.3 | `__tests__/look-song-playing.test.tsx` | **Held until the person check (P1.3).** If `phone_blank=yes`: exit 1, assertion `expected data-playing="true" after the play event, received null`, and `expected inline background-image to hold the poster URL`. If `phone_blank=no`: no file is written. |
| 1.4 | `__tests__/look-reader-turn.test.tsx` | Exit 1. Assertion `the old sentence "Hello, I am Pat." must stay until the new picture loads`, received "Hello, I am May." at once. The no-image case (immediate change) passes at the base (characterization). |
| 1.5 | `__tests__/look-feedback.test.tsx` | Exit 1. Assertions: `aria-pressed` expected "true" and received null (decodable and reader); label "Playing" absent; Next has no fill token; page count `1 / 8` absent. The audio-failure case (not pressed after a rejected play) passes at the base (characterization). |
| 1.6 | `__tests__/look-week-card-label.test.tsx` | Exit 1. Expected "Read the words", received "Decodable". The Thai case ("อ่านคำ") passes at the base (characterization). |
| 1.7 | `__tests__/look-app-icon.test.ts` | Exit 1. `Missing apps/storytime/app/icon.png`. The proxy case I3 passes at the base (characterization, M10). |
| 1.8 | `__tests__/look-reader-gap.test.tsx` | Exit 1. Assertion `a reader word has a layout box wider than its text (min-w-[44px] with justify-center), word box rule`, received `min-w-[44px]`. The spec checks (no `justify`, no `word-spacing`, single-space text) pass at the base (characterization, M6). |

**Combined Red evidence** (the orchestrator may run all Red files in one job at the end of Red): exit 1; `look_files=7` (or 8 with 1.3); every look file fails at least 1 case; the passing cases are exactly the named characterization cases. The Red evidence lists each passing case of a look file with its reason (A4).

### P1.2 Test content for each task (what the case asserts, and the broken copy)

A "broken copy" is a mutant that the test must reject. Green does not need to build the mutant. The Red role proves the rejection with a small in-test double (a stub component or a clone), and records `mutants_rejected=<n>`.

**Task 1.1: `look-not-found.test.tsx`** (AC-1.1, AC-1.2; evidence: function-level live test).

- Mock `next/navigation` `usePathname` per case. Render `NotFoundView` with `openWeeks` and `locale`, and read messages from the real `messages/*.json`. The view needs no `next-intl` context: it receives text through the real JSON files in the test, as `phase3-not-found.test.tsx` does.
- A1 open week: path `/th/st/2/2`, `openWeeks={ {2:1} }`. Assert the text of `notOpenThai` (lang `th`) and `notOpenEnglish` (lang `en`) and exactly one link. The link `href` equals `/th/st/2/1`. Its text holds `openWeekThai` and `openWeekEnglish` with `{week}` replaced by 1. Its class set gives a minimum height of 48 px or more (`min-h-12` or higher, or `min-h-[48px]`; parse the token, accept `min-h-N` with N >= 12). Mutant: `min-h-11` is rejected.
- A2 `{2: null}` on `/th/st/2/2`: same text, `links` equals 0.
- AC-1.2 no-link cases, each with `links` equal to 0 and the current text `notFoundThai` and `notFoundEnglish`: `/de/st/2/2`, `/th/st/x/y`, `/th/st/2/99`, `/th/st/4/1` (`openWeeks={ {2:1} }`, key 4 absent), `/th/st/9/1`, `/th/teacher/2/1`, and `usePathname()` equal to `null`. Add `/th/st/2/01`, `/th/st/2/0`, and `/th/st/2/1/` as extra no-parse cases. Label `no_link_cases=<n>` and assert `n > 6` before the loop (A4). Every case also asserts that the "not open" text is absent.
- Hostile href: for `/th/st/2/2?next=https://evil.example`, `//evil.example/st/2/2`, and `/th/st/2/2#x`, the link (if any) has `href` exactly `/th/st/2/1`. The `href` is built from the known locale and two integers. It never echoes the path. Label `href_probe_cases=<n>`, `n >= 3`.
- Parse unit cases for `parseStorytimePath(pathname, locales)`: at least 3 accepted and at least 12 rejected (non-canonical numbers, leading zero, `LEVEL_MAX + 1`, `WEEK_MAX + 1`, unknown locale, upper-case locale, missing segment, extra segment, trailing slash, empty string, encoded slash `%2F`, whitespace). Label `parse_accepted=<n>` and `parse_rejected=<n>`. A spy on `console.warn`/`console.log` shows 0 calls (it writes no log).
- `highestOpenWeeks()` on the shipped content equals `{2: 1}` (env unset). For every level 1 to `LEVEL_MAX` and week 1 to `WEEK_MAX`, the open state agrees with `loadVisibleWeek(level, week) !== null`. Label `pairs_checked=128`; assert it equals `LEVEL_MAX * WEEK_MAX`. `console.warn` calls inside `highestOpenWeeks` are 0.
- Live mutants on a temp content folder (`STORYTIME_CONTENT_DIR`, `mktemp -d`): (a) copy `w01` as `w01`, and a clone of `w01` with `meta.key = "st2/2"`, `meta.week = 2` as `w02` (both ready) gives `{2: 2}`; (b) a gap (`w01` and `w03` ready, no `w02`) gives `{2: 3}`; (c) a level folder with only a draft week gives `{2: null}`; (d) a clone of `w01` whose `approval.audio` is `draft` is closed without `STORYTIME_SHOW_DRAFT_MEDIA` and open with `1`, same as `loadVisibleWeek`. A stub that returns the constant `{2:1}` fails (a) and (b).
- Structure (parsed imports, A1): `not-found-view.tsx` starts with the `"use client"` directive; it imports neither `node:fs` nor `lib/content`; `not-found.tsx` has no `"use client"`, takes no props, and imports `lib/content`.
- Existing tests (Red edits): `phase3-not-found.test.tsx` lines 41 and 42 keep the equal-value rule and add it for the 4 new keys; `phase3-messages.test.ts` line 17 `ENGLISH_VALUE_KEYS` adds `notOpenEnglish` and `openWeekEnglish`, and the key parity covers the 4 new keys. Falsification: a message file that lacks one new key fails parity.

**Task 1.2: `look-decodable-case.test.tsx`** (AC-1.3; evidence: function-level live test plus detector).

- Render the shipped `w01` decodable book. The paragraph `textContent` of page 1 equals "A nest." The tricky chip buttons read `a`, `and`, and `can` in that order. Label `chips=3`.
- Source case is kept, not lowered: a clone page with the text "Pat can tap. I am Sam." renders exactly that text (capital letters kept), and the w06 page 3 renders "Tap, tap, tap!". A mutant with `toLowerCase` fails on "Pat" and "I". A mutant with `toUpperCase` fails on all.
- The word buttons keep one tap button per word (the old count rule).
- Full stop: the stop shares the flex item with its word (the F151 structure). The paragraph text has no space before the stop.
- Detector (light, run by Green; exit 1 expected): `rg -n 'toUpperCase|toLocaleUpperCase|text-transform|\buppercase\b' apps/storytime/app apps/storytime/lib` after comments are stripped. A CSS `uppercase` class would show source case in the DOM and upper case on screen, so the test cannot see it. The browser run reads the computed `text-transform` of the sentence and the chips: `none`.
- Existing tests (Red edits): in `phase3-adversarial-r2-pieces.test.tsx` the `expectedText` helper and the button names use the source case (lines 68 to 70, 99, 115, 127); in `phase3-adversarial-r3-pieces.test.tsx` the same for lines 43, 44, 93, 99, 134, 142 (for example "TAP, TAP, TAP!" becomes "Tap, tap, tap!"). Each edit has a one-line reason in the commit body.

**Task 1.3: `look-song-playing.test.tsx`** (AC-1.4; written only after the person check, P1.3).

- Render `StorytimeSong` with the shipped `w01` song (poster and posterPhone present; assert both are non-empty first, A4). Fire `play` on the `<video>`. Assert `.song-stage` has `data-playing="true"` and an inline `style.backgroundImage` that holds `url(` and ends the URL with the poster file name. Do not assert the `poster` attribute.
- Phone variant: `matchMedia` stub returns `matches: true` for the phone query. The background holds `posterPhone`; the regular variant holds `poster`.
- Fire `pause`: `data-playing` is not "true". Fire `play` then `ended`: the same. A `play` that is rejected (the stub rejects): `data-playing` is not "true" (no stuck state).
- Before any `play`: no `data-playing="true"` (the base state).
- Falsification: a mutant that sets the attribute on render (not on `play`) fails the "before play" case.

**Task 1.4: `look-reader-turn.test.tsx`** (AC-1.5; evidence: function-level live test with fake timers).

- Pin (Q8): the new picture is an `<img>` in the document whose `src` ends with the page-2 `image.file`. The test dispatches `load` on that element. It does not reach a detached `new Image()`.
- Render `StorytimeReader` with the shipped `w01` reader book. Press Next. Assert the sentence text is still "Hello, I am Pat." and the page count (if present) still reads the old page. Dispatch `load` on the new picture. Assert the sentence is "Hello, I am May." and the picture and the sentence belong to page 2 together.
- Timeout: with `vi.useFakeTimers()`, after Next and no `load`, at 2999 ms the old sentence stays; at 3000 ms the new one shows. An `error` event on the picture lets the page change (at once or by the timeout; assert at most 3000 ms).
- Rapid turns: Next, Next before any `load` ends on page 3 only after its own load or timeout, and the page 2 sentence never stays on screen. Previous after Next behaves the same way.
- No picture (clone with `image` removed from page 2): the sentence changes at once. This case passes at the base (characterization) and guards a freeze when no `load` can come.
- Audio during the hold: press "Read it to me" inside the hold window. The audio uses the sentences of the page that is shown (page 1) and no state mixes pages. (Review note: Green decides the state split; the case pins the visible result.)

**Task 1.5: `look-feedback.test.tsx`** (AC-1.6; artifact plus function-level live test).

- Decodable: click "Play the sound". The decodable stub `play()` resolves; fire `play` on the audio element. The button has `aria-pressed="true"` and its text is exactly the label `playing` ("Playing"; Thai default label "กำลังเล่น"). Fire `ended`: `aria-pressed` is not "true" and the text is the play label again. A rejected `play()` leaves `aria-pressed` not "true" and shows the alert (no stuck state).
- Reader: for each audio button (`readToMe`, `myTurn`, `slow`), while its sound plays (Q4 rule), that button has `aria-pressed="true"` and the text "Playing". At most one button is pressed at a time. Label `pressed_max=1`. The reader receives `labels.playing` from the caller (the `ReaderLabels` field is pinned as `playing`).
- Next is the filled main button: it has a fill token (`bg-*` that is not `bg-white`, `bg-transparent`, or `bg-neutral-*`), a text color token, and a minimum height of 48 px or more. The audio buttons keep the outline (`border`) and no fill token. This is an artifact test. Phase 2 restyles these classes, and the browser run reads computed `background-color` and `min-height` (P1.4).
- Page count: the text `1 / 8` (N from `book.pages.length`; assert `pages_n=8` and `pages_n > 1`) sits in DOM order after the Previous arrow and before the Next arrow (`compareDocumentPosition`). After a turn (with the `look-render` helper `turnPage()` that presses Next and advances 3000 ms), it reads `2 / 8`. After Previous, `1 / 8`. At page 8 Next is disabled and the count reads `8 / 8`.
- Count and sentence change together (cross-task pin with 1.4): the count never reads `2 / 8` while the page 1 sentence shows.

**Task 1.6: `look-week-card-label.test.tsx`** (AC-1.7).

- `messages/en.json` `tileDecodable` equals "Read the words". `messages/th.json` `tileDecodable` equals "อ่านคำ".
- Function-level live test: render the week page for `w01` with the real English messages (the harness of `phase3-home-render.test.tsx`). The second card label reads "Read the words" and the text "Decodable" occurs 0 times on the page (`decodable_label_hits=0`). Mutant: a page that reads another key fails.
- Detector: `rg -n '"Decodable"' apps/storytime/messages` exits 1.

**Task 1.7: `look-app-icon.test.ts`** (AC-1.8; artifact test, no server).

- `apps/storytime/app/icon.png` exists. Its first 8 bytes equal `89 50 4E 47 0D 0A 1A 0A`. Bytes 12 to 15 read `IHDR`. Width (bytes 16 to 19) and height (bytes 20 to 23) are each 32 or more. The file size is 20480 bytes or less. The last 12 bytes are the `IEND` chunk (a truncated file is rejected). Labeled output: `icon_w=<n> icon_h=<n> icon_bytes=<n>`.
- Broken copies (in-test buffers): a JPEG header, a 16 x 16 PNG, a 21 KB buffer, and a PNG cut before `IEND` are each rejected. The test code is a function `checkIcon(buffer)` that the test calls on the file and on the 4 buffers.
- Case I3 (characterization, passes at the base): call `proxy` with a `NextRequest` for `/icon.png` and no cookie. The answer is not a redirect to a sign-in path (status is not 307 and has no `location` header with `sign-in`). After the login Green this case must still pass. If the login Green breaks it, the login Green fixes `proxy.ts` (not the look track).
- The head link `/icon.png` and zero failed requests on `/th/st/2/1` and `/en/st/2/1` are browser rows (P1.4). The first browser run names the resource of the console 404. A resource other than `/favicon.ico` goes to the orchestrator.
- Asset origin is person-checked: the commit body names the Forge or owned source file. No hash is added.

**Task 1.8: `look-reader-gap.test.tsx`** (AC-1.9; artifact plus function-level live test).

- Render page 1 and page 2 of the shipped reader book. For each page: the sentence text with single spaces equals the source ("Hello, I am Pat." and "Hello, I am May."); no ancestor of the words up to the book frame has `text-justify`, `justify-between`, `justify-around`, `justify-evenly`, or an inline `text-align: justify`; no `word-spacing` above 0.35 em in a class token or inline style. These three checks pass at the base.
- **The check that fails at the base (M6):** no `[data-word]` element of the reader passage has a layout width floor (`min-w-*` or `w-*`) together with `justify-center`. The 44 px target comes from an expanded hit area that does not change layout (Q5). Label `word_boxes=<n>`; assert `n >= 7` (page 1 holds Hello, I, am, Pat plus any extras) before the loop. A mutant that restores `min-w-[44px] justify-center` fails.
- The tap target stays: a word is still reachable by a tap target of 44 px or more. The artifact test checks that a hit-area class or a pseudo-element rule exists; the browser run measures it.
- The browser run measures the gaps (P1.4): at phone (390 x 844), tablet (768 x 1024), and phone landscape (844 x 390), the gap between each pair of neighbouring words on page 1 and page 2 is within 2 px of the other gaps. Label `gap_max_delta_px=<n>`; pass at 2 or less.

### P1.3 Task 1.3, step 1: the person check (human gate)

- A person with a real phone opens week 1 song on the live site (or the tagged build) and plays the song. The person records the phone model, the browser, and whether the video area goes blank white while the song plays.
- The record is one plan note: `phone_model=<model>; phone_blank=yes|no`. The check parses the label `phone_blank=` and its value (A3, A5). A note with no model or no label does not close step 1.
- If `phone_blank=no`: the task closes with the record and no code and no test file. `look-song-playing.test.tsx` is not written (a test of an unreal bug would be dead code).
- If `phone_blank=yes`: step 2 runs (Red, then Green).
- No role fakes this check. A headless capture (the council shot) is not this check.
- The phase checkpoint waits for step 1. The other 7 tasks do not wait for it.

### P1.4 Green gates and the phase check

**Targeted Green command** (task level; the base glob plus the look files):

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1 __tests__/release-*.test.ts __tests__/phase1-*.test.ts __tests__/phase2-*.test.ts __tests__/phase3-*.test.ts __tests__/phase3-*.test.tsx __tests__/phase4-*.test.ts __tests__/phase4-*.test.tsx __tests__/look-*.test.ts __tests__/look-*.test.tsx'
```

- Expected after all tasks: exit 0; `Test Files` = 60 + 7 = 67 (68 with `look-song-playing`); `tests_failed=0`; `tests_skipped=0`; `tests_passed = 478 + new_tests`, where `new_tests` is the count of the look files run alone (M1a). A lower total means a deleted or skipped old test (A4, A5).
- Per-task Green gate: the Red files of that task exit 0 (each with at least 1 test that ran), plus the old files that the task edited.
- When the login track is merged first, the combined command adds `__tests__/login-*.test.ts __tests__/login-*.test.tsx __tests__/make-accounts.test.ts`. The file count then is 60 + 11 + 7 = 78 (79 with 1.3). The login strategy gives `files=70` for its own command (it does not run `release-adversarial.test.ts`).

**Type, lint, and detector gates** (task 1.8 and the phase check):

```bash
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && ../../node_modules/.bin/tsc --noEmit'
HEAVY_MIN_AVAIL_MB=1500 HEAVY_PREFLIGHT_WAIT_S=3600 bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'cd /home/daniebo/Desktop/reading-advantage-monorepo/apps/storytime && ../../node_modules/.bin/eslint <the changed .ts and .tsx files>'
```

- Both exit 0. The `.json`, `.png`, and `.sh` files have no ESLint run. If the base `tsc` was non-zero (M14), Green quotes the base count and shows no new error in a file of this track.
- Detectors (light; exit codes as listed; exit 2 is a failure): `rg -n 'toUpperCase|text-transform|\buppercase\b' apps/storytime/app apps/storytime/lib` exits 1 (comments stripped); `rg -n '"Decodable"' apps/storytime/messages` exits 1; `rg -n 'measure/tracks|ui-council|handoff/storytime' apps/storytime/__tests__/look-*` exits 1.

**Browser run** (phase check; role of the orchestrator; evidence: browser run). A new script `apps/storytime/__tests__/look-phase1-browser-gate.sh` (Q6) follows the pattern of `phase3-browser-gate.sh`: one `HEAVY` job; `next build`; `next start` on a free port with a ready fixture from shipped `w01`; Chrome through `@playwright/test`; a trap that kills the server. When the login track is merged, the script signs in first with the seeded account of `phase2b-browser-gate.sh` (a stranger gets a 307 before any 404 view). Rows (each prints `PASS:` or `FAIL:` and a labeled value):

1. `/th/st/2/2` and `/en/st/2/2` (draft week): the 404 view shows the "not open yet" text and one link of height 48 px or more to `/th/st/2/1` or `/en/st/2/1`; click it, the week page loads. `/th/st/4/1`: the old text, no link.
2. Head link `link[rel~="icon"][href^="/icon.png"]` exists on `/th/st/2/1` and `/en/st/2/1`; `/icon.png` answers 200 `image/png` with no session; failed requests and console errors on both pages: `console_errors=0`, `failed_requests=0`. The first run names any failing resource.
3. Decodable page 1: computed `text-transform` of the sentence and the chips is `none`; the sentence reads "A nest.".
4. Reader at phone, tablet, and phone landscape, `th` and `en`, page 1 and page 2: `gap_max_delta_px` 2 or less; Next has a non-transparent computed `background-color` and `min-height` 48 px or more; the audio buttons have a transparent background; the count reads `1 / 8` then `2 / 8` after a turn; no text is clipped, `page_overflow=0`.
5. Song page (only when 1.3 had `phone_blank=yes`): the `.song-stage` computed background-image holds the poster after `play`.

The row count is asserted greater than 0 before the verdict (A4). The script prints `=== Total: <n> checks (PASS=<p>, FAIL=<f>) ===`. `phase3-browser-gate.sh` also runs once at the final HEAD (it exits 0 with the same PASS count as the base; Green measures that base count once before the first change and quotes `phase3_browser_pass=<n>`).

**Closeout gate** (phase level). Items 1 to 9 run after the login 2b checkpoint (Q1). Without it the whole-app suite holds the login Red files and fails by design.

1. The targeted Green command, `tsc`, and ESLint exit 0 with the counts above.
2. All Red files of the plan tasks exist, and `git log --format=%H --grep='track_id: storytime_look_20261107' -- apps/storytime/__tests__/look-*` shows each Red commit before its Green commit (`red_before_green=<n>` equals the number of tasks that had a test).
3. `look_out_of_scope_paths=0` (section 1.4). The allowed paths: `apps/storytime/app/[locale]/st/[level]/[week]/{page,decodable,reader,song}.tsx`, `apps/storytime/app/[locale]/not-found.tsx`, `apps/storytime/app/[locale]/not-found-view.tsx`, `apps/storytime/app/icon.png`, `apps/storytime/lib/content.ts`, `apps/storytime/lib/route-parse.ts`, `apps/storytime/messages/{en,th}.json`, `packages/read-along/components/read-along/**`, `apps/storytime/__tests__/look-*`, `apps/storytime/__tests__/helpers/look-render.tsx`, the 4 old tests of AC-1.10, `apps/storytime/__tests__/look-phase1-browser-gate.sh`, and the track files under `measure/`. `questions.tsx` is not allowed in Phase 1 (`git diff` of it is empty).
4. `phase1-quality-gates.sh` exits 0 with `=== Total: 2 checks (PASS=2, FAIL=0) ===`.
5. The browser run: exit 0, `FAIL=0`, `console_errors=0`.
6. Task 1.3 has its person-check record (`phone_model` and `phone_blank`).
7. `git worktree list | wc -l` equals the count at the capture (A16).
8. `build-graph update ./graph.db <files>` runs once for `lib/content.ts`, `lib/route-parse.ts`, `not-found.tsx`, and `not-found-view.tsx` (new exports; A10, AGENTS.md).
9. Review A, Review C, the adversarial record, and the browser review. The phase acceptance role writes `[checkpoint: <sha>]` after them.

### P1.5 Fixtures, mocks, and live proof

- All week data comes from the shipped `content/l2/w01.json` and from `structuredClone` of it with one change made in the test. No week fixture file goes under `__tests__/`. A temp content folder for `highestOpenWeeks` is made with `mkdtemp` and removed in `afterEach`.
- Mocks: `next/navigation` (`usePathname`), `HTMLMediaElement` `play`/`pause`, `window.matchMedia`, and fake timers. These mocks cannot prove layout, CSS, or real audio. The browser run proves layout. Real audio on a real phone is a person check (task 1.3 only).
- `look-render.tsx` (new helper, not a test file) holds `renderReader()`, `renderDecodable()`, `renderSong()`, `turnPage()`, and `mediaProps()`. After the login merge, only `mediaProps()` changes.
- No test mocks `loadVisibleWeek` or `highestOpenWeeks` when the case claims to prove them. A mock of the module under test proves the mock (A2).

### P1.6 Review applicability

| Review | Applies | Reason and scope |
|---|---|---|
| Review A (code) | **yes** | Five source files and the message files are shared with the login track. Review A checks the merge result, the thin-component rule (business logic stays out of components), `highestOpenWeeks` placement and its 128-read cost, the client/server split of the 404 view, the change in `packages/read-along`, and the old-test edits. |
| Review B (security) | **no** | The phase adds no auth, no session, no database, no storage call, and no secret. The one input risk (a hostile path in the 404 link) has its own cases (`href_probe_cases`) and goes to Review A and to the adversarial round. If the orchestrator adds a path-based redirect or a cookie, Review B becomes required. |
| Review C (UX/API) | **yes (required)** | Child-facing labels ("Read the words", "Playing"), `aria-pressed` toggle design (label swap vs a stable name), the page count (`aria-live`), 48 px targets, the Thai drafts for Daniel's sitting on 2026-11-16, and the pinned exports `highestOpenWeeks` and `parseStorytimePath`. |
| Adversarial testing | **yes (focused, one round)** | Hostile paths and `usePathname()` values, rapid page turns, a rejected `play()`, an image that never loads, two audio buttons in one tap, an empty `openWeeks`, and `STORYTIME_SHOW_DRAFT_MEDIA` combinations. The adversarial role adds tests only in `apps/storytime/__tests__/`. |
| Browser review (UX) | **yes (required)** | AC-1.8 and AC-1.9 can only be proven in a browser. The review covers phone, tablet, and phone landscape in English and Thai, and the 404 click path. |
| Real-phone person check | **yes (task 1.3 only)** | A human gate. See P1.3. |

### P1.7 Anti-pattern coverage per task

| Task | Anti-patterns | Defense | Falsification condition |
|---|---|---|---|
| 1.1 | A2, A3, A4, A1 | Both directions in each case (open week shows link; others show none). Live mutants on a temp folder, not a stub. Labeled counts `no_link_cases`, `pairs_checked`, `parse_rejected`. Parsed imports for the client/server split. | A constant `{2:1}` stub passes; a loop over 0 cases passes; a comment that says `node:fs` fails the scan. |
| 1.2 | A2, A7 | Source-case check with a capital-letter clone. Detector with comment stripping. Browser row for computed `text-transform`. | A CSS `uppercase` class passes the DOM test; a `toLowerCase` mutant passes. |
| 1.3 | A5, A3 | A person-check record with `phone_model` and `phone_blank=` parsed as labeled values. No test without the record. | A note with no model closes the step; a headless capture counts as the check. |
| 1.4 | A4, A2 | The no-image case guards a freeze. Fake timers at 2999 and 3000 ms. The picture is a real `<img>` in the document. | A stub that changes the sentence at once passes; a failed image freezes the page. |
| 1.5 | A3, A4, A2 | `pages_n > 1` before the loop. `pressed_max=1`. Count order by `compareDocumentPosition`. The class-token Next test is named an artifact test and has computed-style rows in the browser run. | A stuck `aria-pressed` after a rejected `play()` passes; a count outside the arrows passes. |
| 1.6 | A1, A2 | Exact string equality, not `includes`. The live page render, not only the JSON read. | The page reads another key and the JSON test alone still passes. |
| 1.7 | A4, A15 | Four broken buffers. `IEND` check. No hash. Case I3 guards the login proxy. | A 16 x 16 or truncated PNG passes; a hash field appears in the test. |
| 1.8 | A4, A5 | The check that fails at the base (M6) is stated, so Red is not vacuous. The browser measure is the AC-1.9 proof. | The three spec checks alone pass at the base and the task closes without a layout change. |

A6 (registry-note overstatement) applies to every `[x]` note: no note says "council fixed" or "gaps even" without the browser row. A15 (stale receipt hashes) does not apply: this track has no role receipt. A16 is in section 1.5. A8, A10 (see closeout item 8), A11, A12, and A13 are not phase risks.

### P1.8 Architecture guardrails and changed-contract risks

- Business logic stays out of components: `highestOpenWeeks` lives in `lib/content.ts` and the path parse in `lib/route-parse.ts`. The client child only reads the path and renders.
- No new dependency. The PNG test reads bytes with `node:fs`. No image library.
- No provider SDK. No `console.log`. `highestOpenWeeks` and `parseStorytimePath` write no log. `loadVisibleWeek` keeps its log lines.
- Changed contracts: the `ReaderLabels` type gains `playing` (callers: `page.tsx` and the tests that build labels; `tsc` finds a missed fixture); the decodable default labels gain `playing`; `lib/content.ts` and `lib/route-parse.ts` gain exports (additive); the message files gain 5 keys and change 1 value; `app/icon.png` is a new public file served without a session (M10).
- A change in `packages/read-along` (task 1.8) changes the passage for its one consumer (M7). Green runs the package tests: `cd packages/read-along && CI=true ../../node_modules/.bin/vitest run --maxWorkers=1` through `HEAVY`, exit 0, with the count quoted.
- `questions.tsx` stays unchanged (closeout item 3).
- Thai strings are drafts for Daniel's sitting on 2026-11-16. They carry no approval claim.

## P2: Look port of the picked option (outline)

**Risk: high.** Phase 2 touches all five route files, `layout.tsx`, a new `frame.tsx`, `look.css`, 5 painted places in two sizes, 4 SVG files, and 2 fonts. It has a hard date (Green by 2026-11-12; gates 2026-11-17; Daniel's look check 2026-11-18; deploy 2026-11-20). The full strategy is written at the Phase 1 checkpoint, with its own `phase_base_sha` capture and its own measurements.

- **Red (task 2.2).** `look-hero-fix.test.ts` reads `look.css` and pins 220 CSS px (cover card), 96 CSS px (hero band, activity screens), and 120 CSS px (hero band, reader at 1024 x 768). A separate plain-text test: the sentence, the lyric list, and the read-along text carry no decoration class of the look; the lyric list holds no `img`. A scan test: no WebGL call and no synthetic audio tone (parsed imports and identifiers, not word search in comments); every `animation` and `transition` rule sits under `prefers-reduced-motion` (a brace-aware parse, not a line grep). The capture list of AC-2.2 holds 24 entries (labeled `captures=24`). Expected at the base: each fails with a message.
- **Green gates (task 2.4).** Targeted tests, `tsc`, ESLint, and `phase3-browser-gate.sh` through `heavy-run`. The browser measures AC-2.6 to AC-2.8 as ranges (220 to 240, 92 to 100, 116 to 124 CSS px) and checks that the Play button, the arrows, and the button row are inside the first view. The pin (CSS value) and the range (measured) are two different checks (A5). Assets: WebP under 250 KB and 1080 x 1920 or 1920 x 1080 (file-size and dimension test, no hash); no 16 px edge glitch (a pixel-row check of the edge columns); fonts through `next/font/local`.
- **Phase 1 tests that Phase 2 changes.** The class-token tests of task 1.5 (Next fill, audio outline) are artifact tests. Phase 2 Green updates them with a reason when the look moves the fill into `look.css`. The computed-style browser rows stay.
- **UI council round 2 (AC-2.4).** The PM runs it. The check parses the labeled line `Total:` of the report and the shot count (A3). Nothing fakes a score. Total 85.0 or more is the gate.
- **Human gates.** Daniel's look check (task 2.5) and every deploy. No role fakes them.
- **Review applicability.** Review A yes; Review B no (no auth, data, or secret); Review C yes (required); adversarial yes (viewport extremes, long Thai text, reduced motion, a missing asset); browser review yes (required, 24 captures); UI council round 2 yes.
- **Anti-patterns.** A2 (a class-token test cannot prove the look: the browser rows do), A3 and A4 (`captures=24`), A5 (pin versus range), A6 (a score claim needs the report), A7 (reduced-motion scan must read rules, not words), A14, A16.

## 4. Questions for the orchestrator (the defaults apply if no answer comes)

| # | Question | Default |
|---|---|---|
| Q1 | Merge order and dates. The PM order is login 2b first, look second. Look Phase 2 Green must start by 2026-11-12, and Phase 2 needs the Phase 1 checkpoint. The login Green targets run to 2026-11-14 (2b.6: 2026-11-13). If the login 2b.6 commit is late, Phase 1 Green on the shared files (1.2 to 1.5, 1.8) delays Phase 2. | Look Red runs now. Tasks 1.1, 1.6, and 1.7 (no shared source file) may commit before login. Tasks 1.2, 1.3, 1.4, 1.5, and 1.8 Green wait for the login 2b.6 commit. The orchestrator checks the login state on 2026-11-10. If 2b.6 is not committed by then, the orchestrator asks the PM whether look Green on the shared files goes first and login rebases. |
| Q2 | Task 1.3 person check. Who holds the real phone, and by when? | The PM names the person. Target 2026-11-12. The checkpoint waits. If no record exists on 2026-11-13, the orchestrator reports to the PM. No role fakes it. |
| Q3 | AC-1.6 says "Next" and "a page count" with no screen name. Do the filled Next and the page count apply to the reader only, or to the decodable page too? | Reader only (council findings 6, 7, and 8 name the reader). The decodable page gets only the playing state. |
| Q4 | Which reader audio button is "pressed" while a sound plays? "My turn" is silent until a word tap. | A button is pressed only while the audio element plays in its own mode (`readToMe` in listen mode, `slow` in slow mode, `myTurn` during a word cut). At most one is pressed. |
| Q5 | The word gap (M6) comes from the 44 px word box (`tapTargetFloor`). The spec checks alone would pass at the base. The 44 px target and an even gap conflict if the box is in layout. | Red adds the check "no layout width floor with `justify-center` on a reader word". Green keeps a 44 px or larger tap target with an expanded hit area that does not change layout (in `packages/read-along`, its only consumer is Storytime) or an app CSS rule. |
| Q6 | Who writes the Phase 1 browser script? The plan has no task for it. | A new file `look-phase1-browser-gate.sh`, written by the orchestrator's browser-check role in its own commit before the browser review. Look does not edit `phase3-browser-gate.sh` (the login track edits it). |
| Q7 | Add the proxy case I3 (`/icon.png` of a stranger is not redirected) to task 1.7? It is outside the plan text, and it guards the login Green. | Yes. It passes at the base (characterization). |
| Q8 | Pin for task 1.4: the new picture is an `<img>` in the document with the page file in `src`, so a test can send its `load` event. | Accept. Green may preload with a hidden `<img>`, not with a detached `Image` object. |
| Q9 | Does Red or Green edit the 4 old tests of AC-1.10? | Red edits them to the new expectation. They fail at the base with the right reason. Green changes code only. |
