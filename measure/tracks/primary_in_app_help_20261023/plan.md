# Plan: Primary in-app help with the What's New videos

Track: `primary_in_app_help_20261023` · Spec: [spec.md](./spec.md) · Branch: a new branch from master after the Boonyathat deploy (not primary-parity-integration).

Paths are under `apps/primary-advantage/` unless they start with `packages/`, `docs/`, or `measure/`. Each task follows `measure/workflow.md` (red, green, refactor, commit, SHA in this file). Heavy jobs (tsc, vitest, browser) run under `~/Desktop/primary-parity-progress/heavy.lock`.

## Phase 0: Owner decisions

- [x] 0.1 Daniel answered spec section 6 (2026-10-23): both hosts (teacher YouTube when uploaded, student own file), all videos approved, sign-in help yes, plays log in the system role.
- [x] 0.2 PR confirmed the hold list and the retake files (2026-10-23, spec section 7): hold C11 and E5 until PR's retakes; D4 has no hold.
- [ ] 0.3 Daniel decides B1, B2, B5, A2 (only the sign-in footer line changed to Thai after the recording). PR's default: no hold.

## Phase 1: Registry and matcher

- [ ] 1.1 `lib/help/videos.ts`: the Zod schema of an entry (FR-5) and the 16 live videos (spec section 5). Test: unique ids, every enabled entry has a title in th and en, a 9x16 entry is a student or parent video.
- [ ] 1.2 `lib/help/match.ts`: `helpVideosFor(pathname, audience)` gives the matched videos (more specific pattern first) and then the general videos. Test: AC-1 and AC-3 paths, a dynamic segment, a path with a query, the student fallback.
- [ ] 1.3 Route check test: every route pattern in the registry matches a `page.tsx` folder under `app/[locale]/` (AC-4).
- [ ] 1.4 The other 75 built videos: routes from the PR plan, checked by 1.3; English titles; hold flags from 0.2.

## Phase 2: Media receiving step

- [ ] 2.1 `scripts/help/sync-help-videos.ts`: reads PR's links JSON and the local files, keeps the enabled ids, checks each mp4 with ffprobe (H.264, AAC, `moov` before `mdat`; re-mux with faststart if necessary), uploads `help/whats-new/<id>.mp4` and `<id>.jpg` through `packages/storage`, and writes `lib/help/youtube-ids.json`. Dry-run mode prints the plan. Test: the selection, the check logic, and the JSON output, with a mocked storage driver.
- [ ] 2.2 `docs/runbooks/help-video-sync.md`: when to run (after each upload day), the command, the check of the result (AC-5).
- [ ] 2.3 First run: all enabled videos (about 0.6 GB) to the production bucket (owner go, because it writes to production storage).

## Phase 3: Help button and panel

- [ ] 3.1 `components/help/help-button.tsx` (client): the icon button in both header clusters of `components/shared/app-layout.tsx`. It reads the path and the area. Messages: a new `Help` namespace in `messages/th.json` and `messages/en.json`; vi, cn, tw use the English text.
- [ ] 3.2 `components/help/help-panel.tsx`: the shadcn `Dialog` with the list (title, length, poster) and the player (FR-3): the poster and a play button first; after the tap, the teacher gets the `youtube-nocookie` embed when a `youtubeId` exists (with "Play without YouTube"), else the native player; the student always gets the native player. Portrait box for 9x16, landscape box for 16x9, stop on close. Empty state (FR-4). Test: the list order, the box shape, no media or iframe before a tap, no iframe on a student panel, pause on close.
- [ ] 3.3 Sign-in links: "How do I sign in?" on `/auth/signin` (by tab) and `/auth/card`, which open the same panel with B5, B1, or B2 (native player on these public pages).
- [ ] 3.4 Phase check: tsc, the changed tests, the change-quality review, and the owner's manual check plan.

## Phase 4: Help events and the system report

- [ ] 4.1 Schema: `primary_help_events` (`id`, `school_id`, `role`, `event` open|play, `video_id`, `route_pattern`, `source` youtube|file|null, `matched`, `created_at`; no user id) in `packages/db`, a Drizzle migration, and the FLAT class in `packages/domain/src/tenant-registry.ts` (the coverage test must pass).
- [ ] 4.2 `packages/domain`: `recordHelpEvent` (Zod input and output, any signed-in role, the school from the session, the video id from the registry list) and `helpEventReport` (system role only; 7 and 30 day counts per video and role, opens per page, opens with no match; optional school filter). Tests with the mock DB.
- [ ] 4.3 Route `POST /api/v1/help/events` (thin, same-origin check) and the panel calls (fire and forget; a failure never blocks the video). Tests.
- [ ] 4.4 `app/[locale]/system/help/page.tsx` and a system sidebar entry. Test: the system role sees the report; a teacher gets no access (AC-8).

## Phase 5: Help index and manual links

- [ ] 5.1 `app/[locale]/teacher/help/page.tsx`: all enabled teacher videos by area (FR-9). Sidebar entry under the manual. Test.
- [ ] 5.2 The student "All videos" view inside the panel.
- [ ] 5.3 `/teacher/manual`: a "Watch the video" link on each section with a matching video (FR-10). Test.

## Phase 6: Verification and release

- [ ] 6.1 Browser check on the local server (3005): AC-1, AC-2, AC-3, AC-6, AC-7, AC-8 on desktop 1280 px and phone 390 px, in th and en.
- [ ] 6.2 PR look check of the button and the panel (captures on the live review page).
- [ ] 6.3 Daniel's look check, then the deploy with the next Primary deploy (the migration runs in the build's migrate step).
- [ ] 6.4 After each upload day: PR refreshes the links JSON; Monorepo runs the receiving step (new `youtube-ids.json`), and the teacher panel moves that video to YouTube with the next deploy.

## Size

Phases 1 to 3: about 2 days. Phase 4: about 1.5 days. Phase 5: about 1 day. Each upload day after release: about 15 minutes.
