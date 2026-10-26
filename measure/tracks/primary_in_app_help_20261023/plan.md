# Plan: Primary in-app help with the What's New videos

Track: `primary_in_app_help_20261023` · Spec: [spec.md](./spec.md) · Branch: a new branch from master after the Boonyathat deploy (not primary-parity-integration).

Plan APPROVED by Daniel on 2026-10-23 ("Approve the help system plan").

Paths are under `apps/primary-advantage/` unless they start with `packages/`, `docs/`, or `measure/`. Each task follows `measure/workflow.md` (red, green, refactor, commit, SHA in this file). Heavy jobs (tsc, vitest, browser) run under `~/Desktop/primary-parity-progress/heavy.lock`.

## Phase 0: Owner decisions

- [x] 0.1 Daniel answered spec section 6 (2026-10-23): both hosts (teacher YouTube when uploaded, student own file), all videos approved, sign-in help yes, plays log in the system role.
- [x] 0.2 PR confirmed the hold list and the retake files (2026-10-23, spec section 7); D4 has no hold; C11 and E5 retaken (PR `309b529`).
- [x] 0.3 Daniel decided (2026-10-23, advantage-pr `985499f`): B1, B2, B5, A2 stay as they are; no hold, no retake.

## Phase 1: Registry and matcher

- [x] 1.1 `lib/help/videos.ts`: the Zod schema of an entry (FR-5) and the 16 live videos (spec section 5). Test: unique ids, every enabled entry has a title in th and en, a 9x16 entry is a student or parent video.
- [x] 1.2 `lib/help/match.ts`: `helpVideosFor(pathname, audience)` gives the matched videos (more specific pattern first) and then the general videos. Test: AC-1 and AC-3 paths, a dynamic segment, a path with a query, the student fallback.
- [x] 1.3 Route check test: every route pattern in the registry matches a `page.tsx` folder under `app/[locale]/` (AC-4).
- [x] 1.4 The other built videos (72; G1 and G4 have no file): routes checked by 1.3; each game video points at its own game (`/student/games/apk/<id>`); trailers, boss shorts, the parent video, F6, and D7 have no page (they show in "All videos" only); English titles. `44fcd02` (1.1 to 1.4 in one commit, because the route check uses the matcher)

## Phase 2: Media receiving step

- [x] 2.1 `scripts/help/stage-help-videos.ts`: reads the registry and PR's folder, checks each enabled video (mp4 and poster exist, `moov` before `mdat`, H.264 + AAC, length within 2 s), hard-links the files into `<out>/help/whats-new/<id>.mp4|jpg`, and writes `lib/help/youtube-ids.json`. It uploads nothing: the runbook's `gcloud storage rsync` uploads (the Primary bucket uses a Google service account, not the S3 adapter of `packages/storage`; all 91 PR files already had `moov` first, so no re-mux step). Tests: `scripts/help/__tests__/stage-lib.test.ts` (7). First run: 88 staged, 0 problems, 16 on YouTube. `c443fcb`
- [x] 2.2 `docs/runbooks/help-video-sync.md`: when to run (after each upload day), the command, the check of the result (AC-5). `c443fcb`
- [x] 2.3 First run: all enabled videos (about 0.6 GB) to the production bucket (owner go, because it writes to production storage). Daniel's go D1 (2026-10-23 15:19 Bangkok); 88 videos and 88 posters uploaded, all 176 answer 200; help check 24/24 on 3005.

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

- [x] 6.1 Browser check on the local server (3005): AC-1, AC-2, AC-3, AC-6, AC-7, AC-8 on desktop 1280 px and phone 390 px, in th and en. Done 2026-10-23 on 3005 (branch head ee2d9d710): `run2/help-check-23.mjs` 24/24 (with a 360x640 phone), `help-events-check-23.mjs` 11/11, `help-index-check-23.mjs` 9/9.
- [x] 6.2 PR look check of the button and the panel (captures on the live review page). PR findings `help-pr-look-check-23-findings.md` (routes M1 to M7, order, Thai T1 to T4, look L1 to L4); PR defaults applied in `ee2d9d710`; Daniel's Thai check is L1 to L3 on the review page.
- [~] 6.3 Daniel's look check, then the deploy with the next Primary deploy (the migration runs in the build's migrate step). Look check passed 2026-10-23 (T, S, G, Y, L all pass); D2a keep B1/B2/B5/A2 on; D4 date format done in ac59e3c0c (browser check passed); D3 deploy go, steps in help-deploy-steps-20261023.md; D5 (YouTube for students) open.
- [~] 6.4 After each upload day: PR refreshes the links JSON; Monorepo runs the receiving step (new `youtube-ids.json`), and the teacher panel moves that video to YouTube with the next deploy. Run 2026-10-26 (PR 7f5624c, 32 live): Red pins the duplicate-id rule in stage-lib.test.ts.

## Size

Phases 1 to 3: about 2 days. Phase 4: about 1.5 days. Phase 5: about 1 day. Each upload day after release: about 15 minutes.
