# Phase 4 browser and HTTP re-check: Sept 15 QA defects and auth fixes

Date: 2026-10-04. App: apps/primary-advantage, `next dev` on port 3100 (port 3000 was in use), local Postgres `primary_advantage`, seeded QA users.
Method "HTTP" means real requests with real session cookies from `POST /api/auth/login`.
Method "Browser" means Chromium (Playwright, channel chrome) with a logged-in context.
All checks ran after the second-round auth fixes. The third-round review fixes (M-1, M-2) are not in this run.

## Sept 15 QA defects (FR-1..FR-8)

| Check | Method | Result | Evidence | Fix commit |
|---|---|---|---|---|
| FR-1 | Browser | PASS | Class code QACLASSA showed a picker with 4 names. A pick and sign-in returned 200 and landed on /en/student/read. The QA users sign in with username and password, so a throwaway student was made for this check (removed after). | ed50d20ba |
| FR-2 | Browser | PASS | Article bbbbbbbb-0000-4000-8000-000000000001 has passage NULL. The read view rendered with no page error and 3 "Start Quiz" buttons. Start Quiz opened "Question 1 of 2". Lesson tasks 3, 5 and 13 rendered; task 13 showed "AI Reading Assistant". | 1e8141c50 |
| FR-3 | Browser | PASS | In en, th, cn, tw and vi the student sidebar has 7 links with real hrefs and 0 lock icons. Mouse click -> /en/student/games and /en/student/history. Enter -> /en/student/assignments and /en/student/vocabulary. The only href="#" is the footer "Back to top" link. | ecdab4e58 |
| FR-4 | Browser | PASS | The Games label shows in all 5 locales (Games, เกม, 游戏, 遊戲, Trò chơi). 0 MISSING_MESSAGE errors in the console and in the server log. | 4461973c3, 3799fc6c9 |
| FR-5 | HTTP | PASS | admin-a gets only school-A rows from /api/teachers, /api/students and /api/classrooms. admin-b gets only school-B rows. | d69c92c0c, 7e6ba137f |
| FR-6 | Browser | PASS | qa-student-a3: `GET /api/v1/apk/content?mode=sentence&locale=th` returned 16 cards, 106 words. Realm Carver showed "Sentences to practice 15 items" (capped at 100 words), no word-limit error, no page error. "Play now" started the game (1 canvas). | 7ca6bd931, e7223b343 |
| FR-7 | Browser | PASS | Locale menu on /en/student/vocabulary: Thai -> /th/student/vocabulary, then English -> /en/student/vocabulary. | 878378cd2 |
| FR-8 | Browser | PASS | Admin import page posts to `/api/upload/csv`. Good CSV (2 students): 200, page shows "Inserted: 2 Skipped (duplicate in file): 0 Skipped (already exist): 0". Bad email CSV: 400 "Row 2: Invalid email format 'not-an-email'". `apps/primary-advantage/temp/` is empty after both. | 5a96b75d2 |

## Other Phase 4 fixes

| Check | Method | Result | Evidence | Fix commit |
|---|---|---|---|---|
| Streak | Browser plus unit test | PASS | No page shows `streakDays` today. The page that calls `getDashboardData` (/en/student/vocabulary) loaded with no error. `lib/__tests__/streak.test.ts` covers the count. | dcf0a64d4 |
| Paused clause | Browser | PASS | `StudentCartridgeHost` ran Realm Carver to the game canvas with 0 page errors. | d5271d4ae |
| Upload temp files | Browser | PASS | See FR-8: no file stays in `temp/` after a 200 or a 400. | 68e85a061 |
| Cross-school assignment | HTTP | PASS | teacher-a on school-B assignment ...0b: 403 `{"error":"Forbidden"}`. On school-A assignment ...0a: 200. | 3f814930c |

## Auth fixes (security review rounds 1 and 2)

| Check | Method | Result | Evidence |
|---|---|---|---|
| Sign-in | HTTP | PASS | 6 QA users sign in with 200. Wrong password and unknown user both return 401 with the same body `{"message":"Invalid username or password"}`. |
| C1 takeover by teacher create | HTTP | PASS | admin-a POST /api/teachers with qa-admin-b or qa-teacher-b email, force false and true: 400 "This account cannot be added as a teacher". Both victims still sign in with the original password; the attacker password returns 401. |
| H1 and M1 password change | HTTP | PASS | admin-a PATCH own password: 403. admin-a PATCH qa-teacher-a password: 200, and the old teacher session returns `{"session":null}`. audit_events has `auth:password_reset`, target qa-teacher-a, actor qa-admin-a, actor_role ADMIN. |
| H2 cross-school edit | HTTP | PASS | PUT /api/teachers/<teacher-b>: 404 "Teacher not found". PUT /api/students/<student-b1>: 404 "Student not found". Both still sign in with the original password. |
| Reset route | HTTP | PASS | admin-a POST /api/auth/reset-password on teacher-b: 403; teacher-b keeps the original password. On teacher-a: 200, and the new password signs in. After a reset back, the original password signs in and the temporary password returns 401. |

## Observations (not fixed in Lane A)

- Locale menu labels: `messages/*.json` key `LocaleSwitcher.locale` shows `cn {🇨🇳 台灣}` and `tw {🇹🇼 中文}`. The text for cn and tw looks swapped. Navigation is correct.
- `POST /api/upload/csv` returns `filePath` (an absolute server path) and the message "File is now ready for processing" after the route deleted the file.
- The CSV role column accepts only lowercase `student` or `teacher`. "Student" gets a clear 400 message.
- /api/teachers and /api/students list only users with `user_roles` rows. The QA seed does not create them.

## Local rows

Added and kept as local fixtures for rehearsal QA (primary_advantage only):
- user_roles: 79ec1eca-d465-4bad-b374-271132573dd7 (teacher-a), aeb10733-eaf8-4072-af47-466cec5158f2 (teacher-b), daaf2db2-8791-49a4-8d8e-aea722bdf0bd (student-a1), ca73c1d9-7886-4b35-a439-959076408379 (student-b1).
- articles bbbbbbbb-0000-4000-8000-000000000001 (passage NULL); multiple_choice_questions ...a1, ...a2; short_answer_questions ...b1; long_answer_questions ...c1.
- user_lesson_progress bde7d752-2004-41ee-8477-59d2a643cd5f (qa-student-a1 on the article above).

Added and removed after the checks:
- users 62bd66a2-26f1-4d9f-b74d-110d0827daab (fr1-student), a7a63c9d-afd7-4925-9c8b-899bc179b8a2 (fr8-one), d14af9f8-24cc-4f51-99fc-523dca80f557 (fr8-two), with their classroom_students rows (cascade).

Also made by the checks: auth sessions and audit events.

## Limits

- The third-round review fixes (M-1, M-2) need their own HTTP re-check.
- No SYSTEM sign-in exists locally, so SYSTEM-only screens were not checked.
