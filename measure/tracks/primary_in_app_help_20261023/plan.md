# Plan: Primary in-app help with the What's New videos

Track: `primary_in_app_help_20261023` · Spec: [spec.md](./spec.md) · Branch: a new branch from master after the Boonyathat deploy (not primary-parity-integration).

Paths are under `apps/primary-advantage/` unless they start with `docs/` or `measure/`. Each task follows `measure/workflow.md` (red, green, refactor, commit, SHA in this file). Heavy jobs (tsc, vitest, browser) run under `~/Desktop/primary-parity-progress/heavy.lock`.

## Phase 0: Owner decisions

- [ ] 0.1 Daniel answers spec section 6: hosting (bucket or YouTube), the enable rule, sign-in help, plays log.
- [ ] 0.2 PR confirms the hold notes (spec section 7) and the retake files.

## Phase 1: Registry and matcher

- [ ] 1.1 `lib/help/videos.ts`: the Zod schema of an entry (FR-5) and the registry with the 16 live videos (spec section 5). Test: unique ids, every enabled entry has a title in th and en, a 9x16 entry is a student or parent video.
- [ ] 1.2 `lib/help/match.ts`: `helpVideosFor(pathname, audience)` gives the matched videos (more specific pattern first) and then the general videos. Test: AC-1 and AC-3 paths, a dynamic segment, a path with a query, the student fallback.
- [ ] 1.3 Route check test: every route pattern in the registry matches a `page.tsx` folder under `app/[locale]/` (AC-4).

## Phase 2: Media receiving step (if the owner chooses the bucket)

- [ ] 2.1 `scripts/help/sync-help-videos.ts`: reads PR's links JSON and the local files, keeps the enabled ids, checks each mp4 with ffprobe (H.264, AAC, `moov` before `mdat`; re-mux with faststart if necessary), and uploads `help/whats-new/<id>.mp4` and `<id>.jpg` through `packages/storage`. Dry-run mode prints the plan. Test: the selection and the check logic, with a mocked storage driver.
- [ ] 2.2 `docs/runbooks/help-video-sync.md`: when to run (after each upload day), the command, the check of the result (AC-5).
- [ ] 2.3 First run: the 16 live videos to the production bucket (owner go, because it writes to production storage).

## Phase 3: Help button and panel

- [ ] 3.1 `components/help/help-button.tsx` (client): the icon button in both header clusters of `components/shared/app-layout.tsx`. It reads the path and the area. Messages: a new `Help` namespace in `messages/th.json` and `messages/en.json`; vi, cn, tw use the English text (add `Help` to `i18n/public-fallback.ts` only if the sign-in link needs it).
- [ ] 3.2 `components/help/help-panel.tsx`: the shadcn `Dialog` with the list (title, length, poster) and the player (FR-3). Portrait box for 9x16, landscape box for 16x9, `preload="none"`, stop on close. Empty state (FR-4). Test: the list order, the box shape, no media element before a tap, pause on close.
- [ ] 3.3 Sign-in links: "How do I sign in?" on `/auth/signin` (by tab) and `/auth/card`, which open the same panel with B5, B1, or B2.
- [ ] 3.4 Phase check: tsc, the changed tests, the change-quality review, and the owner's manual check plan.

## Phase 4: Help index and manual links

- [ ] 4.1 `app/[locale]/teacher/help/page.tsx`: all enabled teacher videos by area (FR-9). Sidebar entry under the manual. Test.
- [ ] 4.2 The student "All videos" view inside the panel.
- [ ] 4.3 `/teacher/manual`: a "Watch the video" link on each section with a matching video (FR-10). Test.

## Phase 5: Verification and release

- [ ] 5.1 Browser check on the local server (3005): AC-1, AC-2, AC-3, AC-6 on desktop 1280 px and phone 390 px, in th and en.
- [ ] 5.2 PR look check of the button and the panel (captures on the live review page).
- [ ] 5.3 Daniel's look check, then the deploy with the next Primary deploy.
- [ ] 5.4 After each upload day: PR refreshes the JSON, Monorepo adds the new routes to the registry and runs the receiving step.

## Size

Phases 1 to 3: about 2 days. Phase 4: about 1 day. Each upload day after release: about 30 minutes (registry rows and the receiving step).
