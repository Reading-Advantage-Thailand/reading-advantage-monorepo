# Plan: Primary in-app help with the What's New videos

Status: shelved, not done (PM 2026-11-27)

Track: `primary_in_app_help_20261023` · Spec: [spec.md](./spec.md) · Branch: a new branch from master after the Boonyathat deploy (not primary-parity-integration).

Plan APPROVED by Daniel on 2026-10-23 ("Approve the help system plan").

Paths are under `apps/primary-advantage/` unless they start with `packages/`, `docs/`, or `measure/`. Each task follows `measure/workflow.md` (red, green, refactor, commit, SHA in this file). Heavy jobs (tsc, vitest, browser) run under `~/Desktop/primary-parity-progress/heavy.lock`.

## Phase 0: Owner decisions

- [x] 0.1 Daniel answered spec section 6 (2026-10-23): both hosts (teacher YouTube when uploaded, student own file), all videos approved, sign-in help yes, plays log in the system role. `41c49d02a`
- [x] 0.2 PR confirmed the hold list and the retake files (2026-10-23, spec section 7); D4 has no hold; C11 and E5 retaken (PR `309b529`). `5bb5464f3`
- [x] 0.3 Daniel decided (2026-10-23, advantage-pr `985499f`): B1, B2, B5, A2 stay as they are; no hold, no retake. `87507f754`

## Phase 1: Registry and matcher

- [x] 1.1 `lib/help/videos.ts`: the Zod schema of an entry (FR-5) and the 16 live videos (spec section 5). Test: unique ids, every enabled entry has a title in th and en, a 9x16 entry is a student or parent video. `44fcd02`
- [x] 1.2 `lib/help/match.ts`: `helpVideosFor(pathname, audience)` gives the matched videos (more specific pattern first) and then the general videos. Test: AC-1 and AC-3 paths, a dynamic segment, a path with a query, the student fallback. `44fcd02`
- [x] 1.3 Route check test: every route pattern in the registry matches a `page.tsx` folder under `app/[locale]/` (AC-4). `44fcd02`
- [x] 1.4 The other built videos (72; G1 and G4 have no file): routes checked by 1.3; each game video points at its own game (`/student/games/apk/<id>`); trailers, boss shorts, the parent video, F6, and D7 have no page (they show in "All videos" only); English titles. `44fcd02` (1.1 to 1.4 in one commit, because the route check uses the matcher)

## Phase 2: Media receiving step

- [x] 2.1 `scripts/help/stage-help-videos.ts`: reads the registry and PR's folder, checks each enabled video (mp4 and poster exist, `moov` before `mdat`, H.264 + AAC, length within 2 s), hard-links the files into `<out>/help/whats-new/<id>.mp4|jpg`, and writes `lib/help/youtube-ids.json`. It uploads nothing: the runbook's `gcloud storage rsync` uploads (the Primary bucket uses a Google service account, not the S3 adapter of `packages/storage`; all 91 PR files already had `moov` first, so no re-mux step). Tests: `scripts/help/__tests__/stage-lib.test.ts` (7). First run: 88 staged, 0 problems, 16 on YouTube. `c443fcb`
- [x] 2.2 `docs/runbooks/help-video-sync.md`: when to run (after each upload day), the command, the check of the result (AC-5). `c443fcb`
- [x] 2.3 First run: all enabled videos (about 0.6 GB) to the production bucket (owner go, because it writes to production storage). Daniel's go D1 (2026-10-23 15:19 Bangkok); 88 videos and 88 posters uploaded, all 176 answer 200; help check 24/24 on 3005. `d18cdb86c`

## Phase 3: Help button and panel

- [x] 3.1 `components/help/help-button.tsx` (client): the icon button in both header clusters of `components/shared/app-layout.tsx`. It reads the path and the area. Messages: a new `Help` namespace in `messages/th.json` and `messages/en.json`; vi, cn, tw use the English text. `351d9a833` (review fix `71aec455d`: vi, cn, tw translated, because their other namespaces are translated)
- [x] 3.2 `components/help/help-panel.tsx`: the shadcn `Dialog` with the list (title, length, poster) and the player (FR-3): the poster and a play button first; after the tap, the teacher gets the `youtube-nocookie` embed when a `youtubeId` exists (with "Play without YouTube"), else the native player; the student always gets the native player. Portrait box for 9x16, landscape box for 16x9, stop on close. Empty state (FR-4). Test: the list order, the box shape, no media or iframe before a tap, no iframe on a student panel, pause on close. `351d9a833` (review fix `71aec455d`: an error message when our file does not load, focus back to the row)
- [x] 3.3 Sign-in links: "How do I sign in?" on `/auth/signin` (by tab) and `/auth/card`, which open the same panel with B5, B1, or B2 (native player on these public pages). `6b698f1c7` (deviation: the teacher tab uses the teacher audience, so B1 can play from YouTube after a tap)
- [x] 3.4 Phase check: tsc, the changed tests, the change-quality review, and the owner's manual check plan. Review fixes `71aec455d`; the browser check on 3005 found a portrait box with no width, fixed in `8921dc6c8`; then `run2/help-check-23.mjs` 23/23.

## Phase 4: Help events and the system report

- [x] 4.1 Schema: `primary_help_events` (`id`, `school_id`, `role`, `event` open|play, `video_id`, `route_pattern`, `source` youtube|file|null, `matched`, `created_at`; no user id) in `packages/db`, a Drizzle migration, and the FLAT class in `packages/domain/src/tenant-registry.ts` (the coverage test must pass). `7f657f0a2` (migration 0074, sentinel, Cloud Build doctor requires 0074)
- [x] 4.2 `packages/domain`: `recordHelpEvent` (Zod input and output, any signed-in role, the school from the session, the video id from the registry list) and `helpEventReport` (system role only; 7 and 30 day counts per video and role, opens per page, opens with no match; optional school filter). Tests with the mock DB. `2b591da3e`, review fixes `4acb2a42c` (the server turns a segment with a digit into [id]; plays per source)
- [x] 4.3 Route `POST /api/v1/help/events` (thin, same-origin check) and the panel calls (fire and forget; a failure never blocks the video). Tests. `a7a794c23`, review fixes `4acb2a42c` (Sec-Fetch-Site, else the forwarded host; 30 events a minute per user)
- [x] 4.4 `app/[locale]/system/help/page.tsx` and a system sidebar entry. Test: the system role sees the report; a teacher gets no access (AC-8). `fe8bae268`. Browser check `run2/help-events-check-23.mjs` 11/11 on the local test copy with 0074.

## Phase 5: Help index and manual links

- [x] 5.1 `app/[locale]/teacher/help/page.tsx`: all enabled teacher videos by area (FR-9). Sidebar entry under the manual. Test. `0673e70db` (areas from the routes, `lib/help/areas.ts`; `?play=<id>` opens a video)
- [x] 5.2 The student "All videos" view inside the panel. `0673e70db`
- [x] 5.3 `/teacher/manual`: a "Watch the video" link on each section with a matching video (FR-10). Test. `53d1b76fc` (one video id per section in `lib/teacher-manual-guide.ts`)

## Phase 6: Verification and release

- [x] 6.1 Browser check on the local server (3005): AC-1, AC-2, AC-3, AC-6, AC-7, AC-8 on desktop 1280 px and phone 390 px, in th and en. Done 2026-10-23 on 3005 (branch head ee2d9d710): `run2/help-check-23.mjs` 24/24 (with a 360x640 phone), `help-events-check-23.mjs` 11/11, `help-index-check-23.mjs` 9/9. `ee2d9d710`
- [x] 6.2 PR look check of the button and the panel (captures on the live review page). PR findings `help-pr-look-check-23-findings.md` (routes M1 to M7, order, Thai T1 to T4, look L1 to L4); PR defaults applied in `ee2d9d710`; Daniel's Thai check is L1 to L3 on the review page. `ee2d9d710`
- [x] 6.3 Daniel's look check, then the deploy with the next Primary deploy (the migration runs in the build's migrate step). Look check passed 2026-10-23 (T, S, G, Y, L all pass); D2a keep B1/B2/B5/A2 on; D4 date format done in ac59e3c0c (browser check passed); D3 deploy go, steps in help-deploy-steps-20261023.md. Deploy done: the help build ran 2026-10-23 (Cloud Build fa6c40b0, --no-traffic, tag approved, revision primary-advantage-app-00141-nuh; its tag URL serves the Thai sign-in help link and the old 16-id set). Its migrate step ran migration 0074; its doctor step requires 0074. The a35 build (2026-10-30, revision primary-advantage-app-00143-zop) serves 100% of the traffic now; it contains the help system and the 2026-10-26 youtube-ids refresh. Live checks 2026-11-07: the sign-in page shows the Thai help link; POST /api/v1/help/events gives 401 with no session; the bucket file C1.mp4 gives 200; a live JS chunk contains the new id D1; /th/system/help, /th/teacher/help, /th/teacher/manual give 307 to the sign-in (routes exist). D5 (YouTube for students) did not pass before the merge, so the live code keeps FR-3: the student panel plays our own file. D5 stays open for Daniel; a pass now needs a new change and a new deploy. `39dbc3e9e`
- [ ] 6.4 After each upload day: PR refreshes the links JSON; Monorepo runs the receiving step (new `youtube-ids.json`), and the teacher panel moves that video to YouTube with the next deploy. Run 2026-10-26 (PR 7f5624c, 32 live): Red pins the duplicate-id rule in stage-lib.test.ts. Run 2026-11-07: PR's daily job refreshed the links JSON (checked 2026-11-07T02:34Z, 62 live, 26 not uploaded; the file is uncommitted in the PR repo). The stage step ran under flock: 88 of 88 staged, 0 problems; `youtube-ids.json` moved 31 → 62 ids (+31, none removed, none changed). Help tests 58/58 and manual tests 12/12 under flock. A bucket rsync dry-run listed no new or changed file, so this run needed no upload. The teacher panel plays the 31 new videos from YouTube after the next Primary deploy. Ids commit `e64a8994c`.
  - Run 2026-11-27: PR links checked 2026-11-26T21:00:49Z. Staged 88 of 88 under flock, with 0 problems. IDs: 62 → 82 (+20, none removed or changed), commit `a49ba2b63`. I6, I8, I20, I22, I23 and A4 have no YouTube ID. All 88 registry entries retain valid route mappings. Hold B3: its narration says the class closes after three hours. The app now offers three different durations. Remove its manual video link (`5d4b32e41`). E2 and the other roster videos still describe valid actions. C4, C5, J2, J6 and J7 retain the same lesson or reading controls after the shared player change. C12 retains the Stories and Class Quest routes; no video points to the removed Storytime route. Dependency build, help and manual tests (83/83), type check and lint each exit 0. All 20 new IDs belong to student videos. FR-3 prohibits YouTube playback for students, and the teacher index does not list them. The required new YouTube embed check cannot pass without a change to the approved spec. Traffic stays held. Evidence: `/tmp/opencode/primary-help-1127/results.json`, `registry-review.json`, `stage.log`, `tests.log`, `types.log`, `lint.log`.
    - Candidate: push `61a02ddf7`, CD run `45912710185`, Cloud Build `9b983104-1204-4671-a321-2ee194f7b2ce` succeeded. The CD traffic check failed with `traffic: ERROR: could not describe primary-advantage-app`. Revision `primary-advantage-app-00155-xah` has no traffic. Revision `primary-advantage-app-00141-q2d` serves 100%. Chromium checks on the build tag `pa-9b983104` passed for the home and sign-in pages at 390 and 1280 px. The protected help and game pages redirect to sign-in. No teacher smoke account was found in the deployment instructions. The sign-in scripts contain the new I4 YouTube ID at both widths. No page has an overflow or a console error. The 30-minute log query found 0 ERROR entries for each revision at 2026-11-27T00:07Z; the candidate was nine minutes old. No temporary tag or traffic build ran. The authenticated help and game checks, new-video embed check, 30-minute candidate observation, traffic move and live checks remain open. Evidence: `/tmp/opencode/primary-help-1127/tagged-public-checks.json`, `results.json`, `cd.log`, `current-traffic.json`.

    - PM board check 2026-11-27: the latest PR file (07:52 ICT, 85 rows) matches all 82 committed IDs. None of the six held IDs has an upload. The first 30 minutes of the candidate revision and the same interval on the serving revision each contain zero ERROR entries. Evidence: `/tmp/opencode/primary-help-1127/primary-advantage-app-00155-xah-first30m-errors.txt`, `/tmp/opencode/primary-help-1127/primary-advantage-app-00141-q2d-first30m-errors.txt`. No temporary check tag exists. Keep the build tag for the next release.
    - traffic move waits: Primary Advantage is last for platform changes (Daniel, 2026-11-27); route with the next Primary traffic move after the same changes ran clean on the other apps

## Size

Phases 1 to 3: about 2 days. Phase 4: about 1.5 days. Phase 5: about 1 day. Each upload day after release: about 15 minutes.
