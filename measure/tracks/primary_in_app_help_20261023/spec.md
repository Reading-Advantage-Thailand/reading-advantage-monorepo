# Spec: Primary in-app help with the What's New videos

Track: `primary_in_app_help_20261023` · Owner request 2026-10-23 · Status: owner decisions recorded 2026-10-23 (section 6); plan ready for approval.

## 1. Goal

A teacher or a student who does not know how to use a page taps one help button. The app plays the short tutorial video for that page, in the app, with no search.

The videos exist. The PR session made them for the "What's New" series (PR repo `~/Desktop/advantage-pr`):

- Plan: `assets/video-assets/plans/2026-10-06-primary-whats-new-series.md` (v0.19). 83 planned videos (76 core, 7 optional), plus J1 to J7.
- Files: 91 mp4 files in `assets/videos/primary-whats-new/wave1|wave2|wave3/` (not in git, about 594 MB). Each video has a `.jpg` thumbnail.
- Live links: `assets/video-assets/plans/primary-whats-new-youtube-links.json` (PR `ec12877`). 16 videos are on YouTube now (12 teacher, 4 student). Daniel uploads at most 8 a day.
- Facts: Thai voice only, with burned-in Thai captions. Average 38 s (18 to 73 s), average 6.7 MB. Student videos are 9:16 (1080x1920). Teacher videos are 16:9 (1920x1080). Each video shows one feature, except the overviews (A1 to A3) and the trailers. The demo class has test data only.
- Stable key: the video id (A2, B5, C1, E7, I12). PR refreshes the JSON with `node scripts/video/whats-new/youtube.mjs`.

## 2. Users and places

- Teacher (desktop and tablet): the teacher shell header, right cluster (`components/shared/app-layout.tsx`, staff branch, next to `SoundToggle`).
- Student (phone and tablet): the student shell header, right cluster (student branch, next to `SoundToggle`).
- Sign-in pages (no shell): one "How do I sign in?" link on `/auth/signin` (teacher tab: B5; class code tab: B1) and on `/auth/card` (B2).
- Admin and system areas: no help in release 1.

## 3. Functional requirements

- FR-1 Help button. Every teacher and student page shows a help button (question mark icon, `h-8 w-8` ghost button, accessible name from the `Help` namespace). It uses the `SoundToggle` pattern (client component in the server `AppLayout`).
- FR-2 Context match. The button opens a help panel. The panel lists the videos for the current page first, then the general videos of the area. The match uses the current path from `usePathname` (`@/i18n/navigation`, without the locale) against route patterns in the registry. A more specific pattern ranks higher.
- FR-3 Player. The panel plays the selected video in the app. A 9:16 video plays in a portrait box, and a 16:9 video plays in a landscape box. The panel first shows the poster with a play button; the video loads only after a tap. Closing the panel stops the video.
  - Teacher panel: when the video has a `youtubeId`, the tap loads the `youtube-nocookie` embed (autoplay after the tap), so the play counts on the channel. A small "Play without YouTube" button switches to our own file (for school networks that block YouTube). When the video has no `youtubeId` yet, the panel plays our own file.
  - Student panel: always our own file in the native `<video controls playsInline>`. No YouTube element on student screens.
- FR-4 Fallback. When no video matches the page, the panel shows the general videos (teacher: A2 overview and E7 manual; student: C2 "where are the buttons" and C1 home). A teacher panel also links to `/teacher/manual`.
- FR-5 Registry. One typed registry (`lib/help/videos.ts`) holds every video: `id`, `audience` (teacher | student | parent), `format` (9x16 | 16x9), `routes` (route patterns in the app's folder form, for example `/teacher/class-roster/[classroomId]/qr-cards`, or a concrete path of a dynamic page, for example one game `/student/games/apk/potion-rush`), `general` (true for the area fallback), `title` ({ th, en }), `media` (storage keys of the mp4 and the poster), `youtubeId` (optional), `durationSec`, and `enabled`.
- FR-6 Every built video can show. Daniel approved all 91 videos (2026-10-23); the YouTube upload limit does not hold them back. An entry is `enabled` unless a hold note applies (section 7: the screen changed after the recording). The `youtubeId` only chooses the teacher player source (FR-3).
- FR-7 Languages. The videos are Thai. The panel titles come from the registry (th, en). In the vi, cn, and tw interfaces, the panel uses the English titles and shows the note "Thai narration".
- FR-8 Media receiving step. A Monorepo script stages the enabled videos and posters from the PR folder as `help/whats-new/<id>.mp4` and `<id>.jpg`, and one `gcloud storage rsync` (runbook) uploads them to the bucket with the public-read ACL. The script checks each file (H.264 and AAC, `moov` before `mdat`, the registry length). It also writes `lib/help/youtube-ids.json` ({ id: youtubeId }) from PR's links JSON, so each upload day changes one data file. A runbook `docs/runbooks/help-video-sync.md` describes the step. The app reads the URLs from `getStorageUrl` (`lib/storage-config.ts`).
- FR-9 Help index. `/teacher/help` lists all enabled teacher videos by area (sign-in, class roster, class book and lessons, reports, games and challenges, avatars, Class Quest, manual). The student panel has an "All videos" view inside the panel (no new student page).
- FR-10 Manual link. Each `/teacher/manual` section shows a "Watch the video" link when a registry video has the same route as the section.
- FR-11 Help events. The panel records two events: `open` (the route pattern and the number of matched videos) and `play` (the video id, the route pattern, the source `youtube` or `file`). One row has `school_id`, the role, the event, the video id, the route pattern, the source, and the time. It has no user id (children's data stays out). A backend function in `packages/domain` with Zod input and output writes the row; the route `POST /api/v1/help/events` is thin and checks the video id against the registry.
- FR-12 System report. `/system/help` (system role only) shows, for the last 7 and 30 days: plays per video (teacher and student), opens per page, and the pages where users opened help with no matching video. Optional filter by school.

## 4. Non-functional requirements

- NFR-1 No sound and no download before a tap (`preload="none"`; the poster is a small JPG).
- NFR-2 The student never leaves the app from help. No YouTube element or link on student screens.
- NFR-3 No new third-party request on page load or on panel open. The YouTube embed loads only after a teacher taps play.
- NFR-4 Accessibility: the panel is a shadcn `Dialog` (focus trap, Escape closes). Touch targets are 44 px or more on student screens.
- NFR-5 The registry is static code. One new table for the help events (FR-11), with a Drizzle migration and the FLAT class (it has `school_id`) in `packages/domain/src/tenant-registry.ts`.
- NFR-6 The service worker does not cache the videos (no change to `public/serwist/sw.js`).

## 5. First route map (the 16 live videos)

| Id | Audience | Route patterns | General |
|---|---|---|---|
| B5 | teacher | `/auth/signin` (teacher tab link) | |
| B1 | student | `/auth/signin` (class code tab link) | |
| B2 | student | `/auth/card` | |
| B3 | teacher | `/teacher/class-roster/[classroomId]` | |
| B4 | teacher | `/teacher/class-roster/[classroomId]/class-sheet`, `/teacher/class-roster/[classroomId]/qr-cards`, `/teacher/class-roster/[classroomId]` | |
| D2 | teacher | `/teacher/class-roster/[classroomId]`, `/teacher/class-roster/[classroomId]/books/[classBookId]` | |
| D3 | teacher | `/teacher/class-roster/[classroomId]/books/[classBookId]/lessons/[number]` | |
| D4 | teacher | `.../lessons/[number]/projector` | |
| D5 | teacher | `.../lessons/[number]/rehearsal` | |
| J4 | teacher | `.../lessons/[number]/print`, `.../lessons/[number]` | |
| D6 | teacher | `/teacher/class-roster/[classroomId]/books/[classBookId]/progress` and `/progress/[studentId]` | |
| E7 | teacher | `/teacher/manual` | yes |
| A2 | teacher | `/teacher/dashboard` | yes |
| G3 | teacher | `/teacher/class-roster/[classroomId]/reedy` | |
| C1 | student | `/student/home` | yes |
| C2 | student | (every student page) | yes |

All built videos are approved (section 6), so the registry maps the other 75 in plan task 1.4. Their routes in the PR plan are notes, not checked paths: each one is checked against the route tree (AC-4). Main groups: student pages C3 to C11 (read, lesson, assignments, vocabulary, sentences, history, reports, profile), teacher pages E1 to E6 (dashboard, my classes, enrollment, assignments, reports, game challenges), avatars F1 to F5, Class Quest H1 to H9, games I0 to I28 (one per game, `/student/games/...`).

## 6. Owner decisions (Daniel, 2026-10-23)

1. Hosting: both. Daniel accepted the bucket for its reasons, and he wants the help to bring views to the YouTube channel. So the teacher panel plays the YouTube embed when the video is on YouTube, and our own file when it is not yet uploaded or when YouTube is blocked. The student panel always plays our own file (no YouTube for children). See FR-3.
2. Approval: Daniel approved all videos. YouTube limits his uploads, so the upload is not the approval. Every built video is enabled, except a video with a hold note (section 7). See FR-6.
3. Sign-in help: yes ("Absolutely"). See section 2 and plan task 3.3.
4. Plays log: yes, shown in the system role. See FR-11 and FR-12.

## 7. Hold notes (PR check of 2026-10-23 against integration 923f87e91)

PR compared the build of each recording with the current code and looked at the recorded frames.

- Retaken, no hold (PR `309b529`, 2026-10-23): C11 (`wave2/c11-me-night-2d-th.mp4`, 44.1 s: Thai game descriptions on the story games page) and E5 (`wave2/e5-reports-th.mp4`, 44.6 s: Thai report dates and calendar, the new heatmap greens, the chart height). The first takes showed the English text of before `6915fb2ce`, `d8913133f`, and `6efeb7a5c`.
- No hold, Daniel's decision (2026-10-23, PR record advantage-pr `985499f`): B1, B2, B5, A2 (the sign-in page) stay as they are, with no retake. Only the footer line changed: it was English ("Printed English workbooks and a reading app for grades 3–6"), and `def50dcf6` made it Thai. The rest of the page is the same. These four are live on YouTube.
- No hold: D4 (projector view). The old note came from a name clash with open decision D4 in the PR plan; no projector file changed after the recording (2026-10-21 15:04, build `12996ea7d`).
- No hold: A4, F1, F2, F3, C2, F5, H4, H5, J6, I1 to I28, and all other videos (no change in the recorded frames).
- Retake files confirmed: C2, F1, F2, F3 (on `61b21d82b`, with the name cover), C6 and E4 (on `7cdf7b7b7`), C8 (on `7cdf7b7b7`). A1 was built again from the retakes.
- Rule for later: a screen that changes after a recording needs a new look check before its video stays enabled.

## 8. Acceptance

- AC-1 On `/teacher/class-roster/<id>/qr-cards`, the help panel lists B4 first, and B4 plays in a 16:9 box after a tap.
- AC-2 On `/student/home` (phone, 390 px), the panel lists C1 first, and C1 plays in a 9:16 box. No YouTube element is on the page.
- AC-3 On a page with no video (for example `/teacher/my-students`), the panel shows A2 and E7 and the manual link.
- AC-4 Each route pattern in the registry matches a real `page.tsx` folder (a unit test reads the route tree).
- AC-5 Each enabled entry has its mp4 and poster in the bucket (the receiving step reports 0 missing).
- AC-6 No request for a video or poster happens before the panel opens, and no YouTube request happens before a teacher taps play (network log in the browser check).
- AC-7 On a student page, the panel has no YouTube element. On a teacher page, a video with a `youtubeId` loads the `youtube-nocookie` embed after the tap, and "Play without YouTube" plays our file.
- AC-8 One play on a teacher page and one on a student page each add one `play` row with the right role and source, and no user id. `/system/help` shows both; a teacher account gets no access to `/system/help`.
