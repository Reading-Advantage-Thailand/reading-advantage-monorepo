# Implementation Plan: www Storytime Advantage song section

> **Track ID:** `www_storytime_song_embed_20261104` · **Spec:** [spec.md](./spec.md)
> **Branch:** `www/storytime-song-embed` in `/home/daniebo/Desktop/rama-worktrees/www-storytime-song`. The branch merged into master at `d5a315686`. The branch and the worktree were removed on 2026-11-04.

## Rules

- PM 2026-11-03: light lane. One maker, one checker later, then Daniel's look check.
- No spec review, strategy, Red/Green split, or Reviews A/B/C apply.
- Markers: `[ ]` pending, `[~]` active, `[x]` done, `[b]` human gate.
- Tests run only for files touched. Heavy commands use `HEAVY_PREFLIGHT_WAIT_S=3600` and `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Use `../../node_modules/.bin/<tool>` from `apps/www-reading-advantage`. Exit 75 or 201 means a wait: wait 5 minutes, then run the command again.
- Run one heavy command at a time. Run vitest with `--maxWorkers=1`.
- Commit by path. Do not use `git add -A`, do not commit `graph.db`, do not push, merge, or deploy. The push, the merge, and the deploy of task 1.7 ran under Daniel's gate.
- Commit headers are lower case, at most 100 characters, and include `(track_id: www_storytime_song_embed_20261104)`.
- Check each source SHA-256 before the copy. Add no hash field to any file.

## Phase 1: Song section and player

- [x] 1.0 Open the track and check the inputs. Test: AC-2. Done in commit `03d7ad371`. Track files only. The copy file SHA-256 is `9ac0e73676aea7e080c9b146c6ba02d0c48c7b9b831b6d50cc280b18a7379fa7` and matches `MANIFEST.txt`. The desktop poster SHA-256 is `abef5e066eceabbd3bebab1851f5bdf1c2ac08dc220fe8e524466d68bca28b50` and matches the package `MANIFEST.txt`. The phone poster SHA-256 is `47365f3136529fc2e97da40d92d727c74bb549212b1505ebdc8aeb5d58fa0a18` and matches the same file. The hand-off files stay read only.
- [x] 1.1 Write the failing tests. Test: AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12. Done in commit `fc0b2c1f7`. The component test file is `src/components/products/storytime-song-player.test.tsx`. The page content test file is `src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx`. The fixture gains the song copy. The Red run failed with exit code 1: 2 files failed, 8 tests failed, 39 tests passed. The component suite failed to load because the component file did not exist yet.
- [x] 1.2 Build the component, the page section, the locale strings, and the posters. Test: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13, AC-14. Done in commit `30df1746b`. The component file is `src/components/products/storytime-song-player.tsx`. The page holds the heading, the text, and the player between the three text columns and the picture grid. The locale file holds the four song keys in en and th. The zh file holds the four zh song keys and keeps every other zh key equal to en. The poster files are `public/images/storytime-advantage/song-week-1-desktop-poster.jpg` and `public/images/storytime-advantage/song-week-1-phone-poster.jpg`. The bytes are unchanged: `sha256sum` gave `abef5e066eceabbd3bebab1851f5bdf1c2ac08dc220fe8e524466d68bca28b50` and `47365f3136529fc2e97da40d92d727c74bb549212b1505ebdc8aeb5d58fa0a18` after the copy. The Green run passed with exit code 0: 3 files and 61 tests passed.
  - The player box uses the `aspect-9/16` class under 768 px and the `aspect-video` class from 768 px. The width cap uses the theme token `--container-storytime-song` (45vh), so the box height stays at 80vh or less. The ESLint rule `shadcn/no-arbitrary-values` forbids a width in brackets.
  - The play control is a native button with the label as its accessible name. The poster image has an empty alt. The focus moves to the frame after it loads.
- [x] 1.3 Run the focused gates. Test: AC-14. Done in commit `30df1746b`.
  - Test command: `../../node_modules/.bin/vitest run --maxWorkers=1 "src/app/[locale]/(marketing)/products/storytime-advantage/page.test.tsx" "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" src/components/products/storytime-song-player.test.tsx` — exit 0; 3 files and 61 tests passed.
  - Wider test command: the same command with `src/__tests__/phase-2-seo-remaining-static.red.test.ts`, `src/__tests__/phase-3-i18n.red.test.ts`, `src/__tests__/phase-3-group-b-types.test.ts`, and `src/__tests__/phase-4-browser-regressions-final.red.test.tsx` — exit 0; 7 files and 83 tests passed.
  - ESLint command: `../../node_modules/.bin/eslint --no-warn-ignored src/components/products/storytime-song-player.tsx src/components/products/storytime-song-player.test.tsx "src/app/[locale]/(marketing)/products/storytime-advantage/page.tsx" "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" src/locales/pages/products/storytime-advantage.ts src/__tests__/fixtures/storytime-page-expected.ts` — exit 0.
  - Typecheck command: `../../node_modules/.bin/tsc --noEmit` — exit 0.
  - The first ESLint run gave 3 errors: the theme token name did not match the CSS, and the outline offset used brackets. The corrected run gave 0 errors.
- [x] 1.4 Build, start, and capture. Test: AC-13, AC-15. Done in commit `30df1746b`. The final capture script is in commit `a4df384b2`.
  - Build command: `../../node_modules/.bin/next build` — exit 0; the compile and the typecheck passed. The standalone output warning stays.
  - Server command: `../../node_modules/.bin/next start --port "$PORT"` — started on a free port. The wrapper stopped the server with the PID from `ss -ltnp` (PID 1180961 in the last run).
  - Capture command: `CAPTURE_DIR=/home/daniebo/Desktop/a46-www-storytime-song-captures PORT="$PORT" node scripts/capture-storytime-song.mjs` — exit 0; 10 PNG files written.
  - The capture checks: every page returned HTTP 200. Every page made 0 requests to a host with "youtube" or "google" in its name before the tap. The server HTML of en and th holds no "youtube" string. The 1440 views loaded the desktop poster. The 390 and 360 views loaded the phone poster. The poster alt is empty. After the tap each page holds one frame with the right video ID on the privacy host. The frame title is "Video of the week 1 song “Hello, I am Pip”, Storytime Advantage". The box ratio is 16:9 at 1440 and 9:16 at 390 and 360. The box width at 1440 is 768 px. The box height on a phone is 636 px at 390 and 583 px at 360, so both stay under 80% of the screen height. No page had horizontal overflow.
  - The player text holds "Storytime Advantage Unit 1 - Hello, I am Pip (Desktop Version)" and "Reading Advantage". The video element reports no error, is not paused, and reaches ready state 4. The first capture run gave a black player box, because the capture ran before the player chrome painted. The script now waits for the player title. The final run shows the player with its controls and the video surface.
  - Capture paths: `/home/daniebo/Desktop/a46-www-storytime-song-captures/en-desktop-before.png`, `en-desktop-after.png`, `en-phone-before.png`, `en-phone-after.png`, `th-desktop-before.png`, `th-desktop-after.png`, `th-phone-before.png`, `th-phone-after.png`, `th-phone-360-before.png`, `th-phone-360-after.png`.
- [x] 1.5 Record the evidence. Test: AC-15. Done in commit `a4df384b2`. The test counts, the exit codes, and the capture paths are in this plan. The evidence commit holds the plan and the final capture script.
- [x] 1.8 Fix round 1. Test: AC-2, AC-5, AC-13, AC-15. Done in commit `309f0c9fa`.
  - Look fix: the play circle and the label chip moved out of the poster title. The control now sits at the foot of the poster box, centred horizontally, in one row. The dim overlay stays. The whole box is still one button, so a tap anywhere plays.
  - The poster text bands came from the poster files. The title "Hello, I Am Pip" runs from 44% to 57% of the poster height. The line "Level 2 · Week 1 · Names and greetings" runs from 78% to 86%. The lower third holds that line, so the control went below it. The control sits at 86.8% to 97.9% of the box at 1440, at 91.0% to 98.6% at 390, and at 90.2% to 98.5% at 360. Both the title and the "Level 2" line stay clear at all three widths.
  - Checker note N1: the component test presses Space on the play button and gets the player.
  - Checker note N2: the component test and the page content test check that the markup holds no `google` string.
  - Test command: `../../node_modules/.bin/vitest run --maxWorkers=1 "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx" src/components/products/storytime-song-player.test.tsx` — exit 0; 2 files and 61 tests passed.
  - Typecheck command: `cd apps/www-reading-advantage && ../../node_modules/.bin/tsc --noEmit` — exit 0. The first run of this command ran outside the heavy lock. The PM rule of 2026-11-04 came after it. The run was repeated through the heavy lock and gave the same exit code 0.
  - ESLint command: `../../node_modules/.bin/eslint --no-warn-ignored src/components/products/storytime-song-player.tsx src/components/products/storytime-song-player.test.tsx "src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx"` — exit 0. ESLint on the changed files stays light under the PM rule.
  - Build command: `../../node_modules/.bin/next build` — exit 0. The standalone output warning stays.
  - Capture command: `CAPTURE_DIR=/home/daniebo/Desktop/a46-www-storytime-song-captures PORT="$PORT" node scripts/capture-storytime-song.mjs` — exit 0; 10 PNG files written over the old ones. Every page returned HTTP 200. Every page made 0 requests to a host with "youtube" or "google" in its name before the tap. The right poster loaded at each width. The right video ID loaded after the tap. No page had horizontal overflow. The wrapper stopped the server with the PID from `ss -ltnp` (PID 1230060).
  - Heavy rule of the PM, 2026-11-04: an app-wide tsc, an app-wide lint, a test suite, and a build run only through `heavy-run.sh`. ESLint on the changed files and a single test file stay light. Exit 75 or 201 means a wait of 5 minutes and one more run.
- [x] 1.6 Daniel's look check. Test: AC-2, AC-13, AC-15. Done 2026-11-04 at 14:51 ICT. Daniel answered "Accepted" on the PM note. The PM read the word as his push word for A-46 only. The ten captures are in `/home/daniebo/Desktop/a46-www-storytime-song-captures/`. The Thai song strings were in the look and passed. The zh song strings stay a PR draft, and a contracted Chinese speaker checks them after the push. The look fix is commit `309f0c9fa`, and the fix round 1 evidence commit is `f3611d47c`.
- [x] 1.7 Merge or push. Test: AC-15. Done 2026-11-04. The PM ran `git push origin f3611d47c:master` at 15:04 ICT (`dd1c4133f..f3611d47c`) after a clean pre-push scan by the Monorepo orchestrator and by the PM. The local merge is `d5a315686`, with parents `ded3f2c66` and `f3611d47c`. The worktree `rama-worktrees/www-storytime-song` and the local branch `www/storytime-song-embed` are removed. No remote branch existed. The deploy run `41796713212` ("CD — www-reading-advantage") at `f3611d47c` finished at 08:17:32Z, which is 15:17:32 ICT. The live commit is `f3611d47c`. The live check at 15:2x ICT passed for en, th, and zh: HTTP 200 on `/products/storytime-advantage`, one song heading and one button per locale, 0 YouTube strings before the tap, and both posters HTTP 200. The CI run `41796713259` at `f3611d47c` failed only on the step "Architecture boundary check". The same step failed at `dd1c4133f` and at `7db52a49d`. Track A-32 owns that step.

## Copy decisions

- The en, th, and zh strings come from hand-off section (a), word for word. The song title "Hello, I am Pip" stays in English in all three locales.
- The Thai strings were Daniel's draft. He accepted them in the look check on 2026-11-04.
- The zh strings are the PR draft from hand-off line 19. They go live with the push. A contracted Chinese speaker checks them after the push.
- Every other zh key stays equal to en. The zh rule of A-45 stays for all other keys.
- The copy gives no date and no price. The copy makes no learning claim.
- The section holds the week 1 song only. The other weeks wait for Daniel's approval of each song.

## Security check

The app holds no Content-Security-Policy. The files `next.config.ts`, `src/proxy.ts`, `nginx.conf`, `Dockerfile`, and `cloudbuild.yaml` hold no policy and no frame source list. The build adds no source. The privacy host `https://www.youtube-nocookie.com` needs no allow list entry.

## Player decisions

- The `<picture>` holds the phone poster under 768 px and the desktop poster from 768 px. The media rule is `(max-width: 767px)`.
- The box uses a 9:16 ratio under 768 px and a 16:9 ratio from 768 px. The box width is limited to 45vh under 768 px, so the height stays at 80vh or less.
- The player reads `window.matchMedia('(max-width: 767px)').matches` once, at the tap.
- The player uses the privacy-enhanced host `www.youtube-nocookie.com`.
- The URL holds `autoplay=1`, `rel=0`, and `playsinline=1`.
- The page holds no video host request before the tap. The server HTML holds no `youtube` string.

## Poster decisions

| Source file | SHA-256 | Target file | Size |
|---|---|---|---|
| `l2/media/w01/song-poster.jpg` | `abef5e066eceabbd3bebab1851f5bdf1c2ac08dc220fe8e524466d68bca28b50` | `public/images/storytime-advantage/song-week-1-desktop-poster.jpg` | 1280×720 |
| `l2/media/w01/song-phone-poster.jpg` | `47365f3136529fc2e97da40d92d727c74bb549212b1505ebdc8aeb5d58fa0a18` | `public/images/storytime-advantage/song-week-1-phone-poster.jpg` | 720×1280 |

The build copies the bytes. It does not re-encode them. It adds no hash field to any file.

## Capture list

| File | Locale | Width | State |
|---|---|---:|---|
| `en-desktop-before.png` | en | 1440 | poster |
| `en-desktop-after.png` | en | 1440 | player |
| `en-phone-before.png` | en | 390 | poster |
| `en-phone-after.png` | en | 390 | player |
| `th-desktop-before.png` | th | 1440 | poster |
| `th-desktop-after.png` | th | 1440 | player |
| `th-phone-before.png` | th | 390 | poster |
| `th-phone-after.png` | th | 390 | player |
| `th-phone-360-before.png` | th | 360 | poster |
| `th-phone-360-after.png` | th | 360 | player |

## Out of scope

- The weeks 2 to 8 songs.
- Any change to the other page sections.
- Any further push, merge, or deploy after task 1.7.
- A Storytime app build.
- Any hash field in a new file.
