# Implementation Plan: www Storytime Advantage song section

> **Track ID:** `www_storytime_song_embed_20261104` · **Spec:** [spec.md](./spec.md)
> **Branch:** `www/storytime-song-embed` in `/home/daniebo/Desktop/rama-worktrees/www-storytime-song`.

## Rules

- PM 2026-11-03: light lane. One maker, one checker later, then Daniel's look check.
- No spec review, strategy, Red/Green split, or Reviews A/B/C apply.
- Markers: `[ ]` pending, `[~]` active, `[x]` done, `[b]` human gate.
- Tests run only for files touched. Heavy commands use `HEAVY_PREFLIGHT_WAIT_S=3600` and `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<command>'`.
- Use `../../node_modules/.bin/<tool>` from `apps/www-reading-advantage`. Exit 75 or 201 means a wait: wait 5 minutes, then run the command again.
- Run one heavy command at a time. Run vitest with `--maxWorkers=1`.
- Commit by path. Do not use `git add -A`, do not commit `graph.db`, do not push, merge, or deploy.
- Commit headers are lower case, at most 100 characters, and include `(track_id: www_storytime_song_embed_20261104)`.
- Check each source SHA-256 before the copy. Add no hash field to any file.

## Phase 1: Song section and player

- [x] 1.0 Open the track and check the inputs. Test: AC-2. Track files only. The copy file SHA-256 is `9ac0e73676aea7e080c9b146c6ba02d0c48c7b9b831b6d50cc280b18a7379fa7` and matches `MANIFEST.txt`. The desktop poster SHA-256 is `abef5e066eceabbd3bebab1851f5bdf1c2ac08dc220fe8e524466d68bca28b50` and matches the package `MANIFEST.txt`. The phone poster SHA-256 is `47365f3136529fc2e97da40d92d727c74bb549212b1505ebdc8aeb5d58fa0a18` and matches the same file. The hand-off files stay read only.
- [ ] 1.1 Write the failing tests. Test: AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-12. The component test file is `src/components/products/storytime-song-player.test.tsx`. The page content test file is `src/app/[locale]/(marketing)/products/storytime-advantage/page.content.test.tsx`. The fixture gains the song copy. The Red run must fail.
- [ ] 1.2 Build the component, the page section, the locale strings, and the posters. Test: AC-1, AC-2, AC-3, AC-4, AC-5, AC-6, AC-7, AC-8, AC-9, AC-10, AC-11, AC-13, AC-14. The component file is `src/components/products/storytime-song-player.tsx`. The poster files are `public/images/storytime-advantage/song-week-1-desktop-poster.jpg` and `public/images/storytime-advantage/song-week-1-phone-poster.jpg`. The bytes stay unchanged. The Green run must pass.
- [ ] 1.3 Run the focused gates. Test: AC-14. Run vitest, `tsc --noEmit`, and ESLint on the changed files. Record each exit code.
- [ ] 1.4 Build, start, and capture. Test: AC-13, AC-15. Run one heavy call with `next build`, `next start` on a free port, the capture script, and the stop by the PID from `ss -ltnp`. Write ten PNG files to `/home/daniebo/Desktop/a46-www-storytime-song-captures/`.
- [ ] 1.5 Record the evidence. Test: AC-15. Put the test counts, the exit codes, and the capture paths in this plan. Commit the evidence by path.
- [ ] 1.6 Daniel's look check. Test: AC-2, AC-13, AC-15. The Thai draft and the zh draft stay marked as drafts. Daniel checks the look and the Thai.
- [ ] 1.7 Merge or push. Test: AC-15. The push and the merge stay with Daniel. No push and no merge happen in this track.

## Copy decisions

- The en, th, and zh strings come from hand-off section (a), word for word. The song title "Hello, I am Pip" stays in English in all three locales.
- The Thai strings are Daniel's draft. They wait for his check.
- The zh strings are the PR draft from hand-off line 19. They go live with the push. A contracted Chinese speaker checks them after the push.
- Every other zh key stays equal to en. The zh rule of A-45 stays for all other keys.
- The copy gives no date and no price. The copy makes no learning claim.
- The section holds the week 1 song only. The other weeks wait for Daniel's approval of each song.

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
- Any push, merge, or deploy.
- A Storytime app build.
- Any hash field in a new file.
