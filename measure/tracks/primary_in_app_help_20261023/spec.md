# Spec: Primary in-app help with the What's New videos

Track: `primary_in_app_help_20261023` · Owner request 2026-10-23 · Status: draft, waits for the owner decisions in section 6.

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
- FR-3 Player. The panel plays the selected video in the app: native `<video controls playsInline preload="none" poster>`. A 9:16 video plays in a portrait box, and a 16:9 video plays in a landscape box. The video starts only after a tap. Closing the panel stops the video.
- FR-4 Fallback. When no video matches the page, the panel shows the general videos (teacher: A2 overview and E7 manual; student: C2 "where are the buttons" and C1 home). A teacher panel also links to `/teacher/manual`.
- FR-5 Registry. One typed registry (`lib/help/videos.ts`) holds every video: `id`, `audience` (teacher | student | parent), `format` (9x16 | 16x9), `routes` (route patterns in the app's folder form, for example `/teacher/class-roster/[classroomId]/qr-cards`), `general` (true for the area fallback), `title` ({ th, en }), `media` (storage keys of the mp4 and the poster), `youtubeId` (optional), `durationSec`, and `enabled`.
- FR-6 Only approved videos show. An entry shows only when `enabled` is true. A video is enabled when Daniel uploaded it (it has a `youtubeId` in PR's JSON) and no hold note applies (section 7).
- FR-7 Languages. The videos are Thai. The panel titles come from the registry (th, en). In the vi, cn, and tw interfaces, the panel uses the English titles and shows the note "Thai narration".
- FR-8 Media receiving step. A Monorepo script copies the enabled videos and posters from the PR folder to the bucket under `help/whats-new/<id>.mp4` and `<id>.jpg`. It checks each file with ffprobe (H.264 and AAC, `moov` before `mdat`; if not, it re-muxes with `-movflags +faststart` and no re-encode). A runbook `docs/runbooks/help-video-sync.md` describes the step. The app reads the URLs from `getStorageUrl` (`lib/storage-config.ts`).
- FR-9 Help index. `/teacher/help` lists all enabled teacher videos by area (sign-in, class roster, class book and lessons, reports, games and challenges, avatars, Class Quest, manual). The student panel has an "All videos" view inside the panel (no new student page).
- FR-10 Manual link. Each `/teacher/manual` section shows a "Watch the video" link when a registry video has the same route as the section.

## 4. Non-functional requirements

- NFR-1 No sound and no download before a tap (`preload="none"`; the poster is a small JPG).
- NFR-2 The student never leaves the app from help. No YouTube links on student screens.
- NFR-3 No new third-party request on page load. The help panel loads its media only when it opens.
- NFR-4 Accessibility: the panel is a shadcn `Dialog` (focus trap, Escape closes). Touch targets are 44 px or more on student screens.
- NFR-5 No database table and no migration in release 1. The registry is static code.
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
| D4 | teacher | `.../lessons/[number]/projector` (hold: the plan says the Oct 11 merge changed the screen) | |
| D5 | teacher | `.../lessons/[number]/rehearsal` | |
| J4 | teacher | `.../lessons/[number]/print`, `.../lessons/[number]` | |
| D6 | teacher | `/teacher/class-roster/[classroomId]/books/[classBookId]/progress` and `/progress/[studentId]` | |
| E7 | teacher | `/teacher/manual` | yes |
| A2 | teacher | `/teacher/dashboard` | yes |
| G3 | teacher | `/teacher/class-roster/[classroomId]/reedy` | |
| C1 | student | `/student/home` | yes |
| C2 | student | (every student page) | yes |

The not-uploaded videos get their routes when they go live. Their routes in the PR plan are notes, not checked paths. Main groups: student pages C3 to C11 (read, lesson, assignments, vocabulary, sentences, history, reports, profile), teacher pages E1 to E6 (dashboard, my classes, enrollment, assignments, reports, game challenges), avatars F1 to F5, Class Quest H1 to H9, games I0 to I28 (one per game, `/student/games/...`).

## 6. Owner decisions (with the recommendation)

1. Hosting. Recommendation: (a) our own bucket. The app plays the mp4 files from Google Storage with the native player. All 91 files are ready now, with no wait for the uploads. No YouTube suggestions, logos, or links reach children. The app works where a school network blocks YouTube. Cost: about 0.6 GB of storage and about USD 0.12 for each GB of traffic (2,000 plays a month is about 13 GB, about USD 1.6). (b) YouTube embeds (`youtube-nocookie`, from PR's JSON): no hosting, but only the uploaded videos work, YouTube can show other videos at the end, and some school networks block YouTube. Teachers can still get an "Open on YouTube" link in (a).
2. Which videos show. Recommendation: the upload rule of FR-6 (Daniel's upload is the approval), plus the hold notes. Alternative: enable every built video after a PR currency check.
3. Sign-in help. Recommendation: yes, one link on the sign-in pages (B5, B1, B2), because sign-in is the first problem for a new class.
4. Plays log. Recommendation: no log in release 1. A later release can count plays per video to show which features confuse users.

## 7. Hold notes (from the PR track)

- D4 (projector view): the screen changed after the recording. Hold until a retake.
- G3 (Reedy for teachers): it was recorded before G1, so the demo shows 0:00. It can stay live; G1 is not built.
- C2, F1, F2, F3 were retaken on 2026-10-22 (a sign-in name was visible). Use only the retake files.
- A screen that changes after a recording needs a new look check before its video is enabled.

## 8. Acceptance

- AC-1 On `/teacher/class-roster/<id>/qr-cards`, the help panel lists B4 first, and B4 plays in a 16:9 box after a tap.
- AC-2 On `/student/home` (phone, 390 px), the panel lists C1 first, and C1 plays in a 9:16 box. No YouTube element is on the page.
- AC-3 On a page with no video (for example `/teacher/my-students`), the panel shows A2 and E7 and the manual link.
- AC-4 Each route pattern in the registry matches a real `page.tsx` folder (a unit test reads the route tree).
- AC-5 Each enabled entry has its mp4 and poster in the bucket (the receiving step reports 0 missing).
- AC-6 No request for a video or poster happens before the panel opens (network log in the browser check).
