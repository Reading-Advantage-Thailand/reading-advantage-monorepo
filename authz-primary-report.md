# Primary Advantage server routes: authorization audit at 01f2acfe8

## Summary

- Scope: 104 `route.ts` files (134 handlers), 37 server actions in 13 files, and the `packages/api` routes they re-export.
- The middleware matcher skips `/api`, so each route guards itself. 120 handlers and all data actions refuse signed-out callers.
- Signed-out reachable (14): 9 public by design (login, logout, session, temporary-password, 4 student sign-ins, avatar catalog).
- The other 5: `schools/ranking` POST (access key), `impersonate` (env flag, else 404), `send` (no-op), 2 dead actions.
- Cross-school reach: none found. Every id-taking handler is scoped through TenantDB or a school or class guard.
- Cross-class reach inside one school: 2 upload routes (finding 2); broad same-school reads on 3 user routes (finding 10).
- Validation: zod on most writes; manual or none on about 30 GET paths and 6 server actions.
- Findings: 1 high, 8 medium, the rest low. The main risks are XP minting, AI cost abuse and a rate-limit bypass.
- None of the findings leaks data across schools.
- Tests: not run, because `node_modules` is not installed here. All results come from reading the code down to the query.

## Legend

- **Auth:** the helper that loads the session.
  - `cU`: `currentUser` or `getCurrentUser` (`lib/session.ts`).
  - `gCS`: `getCurrentSession`.
  - `tH`: `teacherHandler` (`lib/student-login/http.ts`).
  - `sH`: `studentHandler` (`lib/student-login/http.ts`).
  - `factory`: the `packages/api` challenge factory.
  - `aA`: `avatarActor`.
  - `vA`: `voiceActor`.
  - `requireRole`: the `packages/api` auth guard.
- **Guards:**
  - `preview`: `guardStudentRoute` or `guardStudentAction`. Staff get a read-only refusal.
  - `aC`: the shared `authorizeClassroom` guard (`packages/domain/src/student-login/access.ts:30`). It admits a TEACHER who owns or co-teaches the class, or an ADMIN of the class's school. The class is read through TenantDB.
  - `GAC`: `getAccessibleClassroom` (`server/models/classroomModel.ts:50`).
  - `CMC`: `canManageClassroom` (`server/utils/assignment-access.ts:29`).
  - `MC`: `managedClass` (`packages/domain/src/primary-books/class-books.ts:53`).
  - `SSC`: `schoolScopeConditions`.
- **Error shape:** `{error}` means a JSON body `{ error: string }` with a 4xx or 5xx status.
- **Reach:** the widest caller who gets data.

## Full table

### Auth and student sign-in (`app/api/auth/**`, re-exports of `packages/api` and `lib/student-login`)

| Route | Method | Auth | Role check | Scoping of reads and writes | Validation | Error shape | Reach |
|---|---|---|---|---|---|---|---|
| auth/login | POST | none (it is the login) | – | username lookup | zod | `{message}` 400/401/403/429/503/500 | public by design |
| auth/logout | POST | cookie, optional | – | deletes the caller's own session | n/a | `{success}` | self only |
| auth/session | GET | cookie | – | the caller's own user row | n/a | `{session:null}` | self only |
| auth/impersonate | POST | none | none | fixed list of 4 demo users, SYSTEM included | zod | `{message}` 404/400/500 | 404 in production. Outside production with `IMPERSONATION_ENABLED=true`, a signed-out caller gets a SYSTEM session |
| auth/register | POST | `requireRole` TEACHER | TEACHER, ADMIN, SYSTEM | role forced to STUDENT; school forced to the caller's school, except for SYSTEM | zod | `{message}` 400/401/403/409/500 | own school |
| auth/reset-password | POST | `requireRole` TEACHER | `authorizeResetTarget`: the actor must outrank the target | same school required; school-less targets refused | zod | 403 for both "not found" and "refused" | own school (a teacher can reset any student of the school) |
| auth/temporary-password | POST | none (the temporary password is the proof) | – | needs `temporaryPasswordIssuedAt` | zod + `passwordSchema` | 400/401/429/500 | public by design |
| student/class-session/start, class-session/end, roster, lockouts, card-token/issue, picture-password/assign, picture-password/setting | POST | `tH` (401 without a session, 403 unless the session is `full`) | `aC` | class and school on every query | zod + JSON-only (415) | `{message, code}` 401/403/404/415/423/429/503 | own class (teacher), own school (admin) |
| student/card-token/rotate, picture-password/reset | POST | `tH` | `aC` | the student must be in that class and that school | zod | same | own class or own school |
| student/class-passwords/reset | POST | `tH`, 5 per 10 min per class | `aC` | class and school; STUDENT targets only | zod | same | own class or own school |
| student/student-password/reset | POST | `tH`, 30 per 10 min per class | `aC` | the student must be in the class | zod | same | own class or own school |
| student/code | POST | `sH`, no session | – | code lookup spans all schools by design; the name list is scoped to the class | zod + JSON-only | same | public by design |
| student/picture | POST | `sH` | – | the student must be in the session's class and school; lock after 5 tries | zod | 401/423 | public by design |
| student/code-only | POST | `sH` | – | same as `picture`; works only when picture passwords are off | zod | 401/403 | public by design |
| student/qr | POST | `sH` | – | token hash joined to the credential's school; needs an open class session | zod | 401/429 | public by design |
| actions/signinAction.ts#signInAction | action | none | – | – | zod | `{error}` | dead code, no importer |
| actions/signupAction.ts#signUpAction | action | none | – | writes nothing | – | always `{error}` | refuses every call |

### Users, schools, licenses, uploads, teachers, students

| Route | Method | Auth | Role check | Scoping of reads and writes | Validation | Error shape | Reach |
|---|---|---|---|---|---|---|---|
| users/[id] | PATCH | `cU` | `admin:users` + `isAdminOrSystem`; role and password writes need `canSetPasswordFor` and `roleAtLeast` | TenantDB + `canAccessSchoolResource` | zod `patchUserBodySchema` | `{error}` 400/401/403/404/500 | own school |
| users/[id]/activity | GET | `cU` | `user:read` | TenantDB + `canReadUserResource` | none (id only) | `{error}` | own school, any staff member |
| users/[id]/article-records | GET | `cU` | `user:read` | same | zod query | `{error}` | own school, any staff member |
| users/[id]/reminder-reread | GET | `cU` | `user:read` | same | none | `{error}` | own school, any staff member |
| users/me | PATCH | `gCS` + full sign-in | self | the caller's own id through TenantDB | zod | `{error, fieldErrors}` | self only |
| users/me/school | GET | `cU` | `user:read`; the license view is for school admins | the caller's school | none | `{error}` | self |
| users/me/school | POST | `cU` | TEACHER, ADMIN or SYSTEM with no school | creates a school and makes the caller its ADMIN | zod | `{error, details}` | self |
| users/me/school | PATCH | `cU` | `canManageSchool` | the caller's school | zod | `{error, details}` | own school |
| users/me/school | DELETE | `cU` | `admin:users` + owner | the caller's school | none | `{error}` | own school |
| users/me/school/admins | POST | `cU` | `admin:users` + `canManageSchool`; the target must be TEACHER or ADMIN | TenantDB | zod | `{error, details}` | own school |
| users/me/school/admins/[adminId] | DELETE | `cU` | `admin:users` + `canManageSchool`; only the owner or SYSTEM removes the owner | TenantDB | none | `{error}` | own school |
| users/me/school/seat-holders | GET | `cU` | `assertCanViewSchoolLicense` | the caller's school | zod page | `{error}` | own school |
| users/search | GET | `cU` | `user:list` + staff role | TenantDB | manual (`q` of 2+ chars) | `{error}` | own school |
| users/activitylog/[id] | POST | `cU` | `preview`; the id must equal the caller | self | zod, but the parsed body is ignored | unhandled 500 | self only (always fails) |
| schools | GET, POST | `cU` | SYSTEM only | global | zod (POST) | `{error, details}` | SYSTEM |
| schools/ranking | POST | `x-access-key`, constant-time compare | key holder | global recompute | none | `{error}` | key holder |
| schools/ranking | GET | `cU` | `student:read:own`; only SYSTEM may pass `schoolId` | own school | none | `{error}` | own school |
| licenses | GET | `cU` | ADMIN or SYSTEM | TenantDB for ADMIN | manual | `{error}` | own school |
| licenses | POST, DELETE | `cU` | SYSTEM only | unscoped | zod (POST); manual (DELETE) | `{error, details}` | SYSTEM |
| licenses/[id] | GET | `cU` | ADMIN or SYSTEM | TenantDB for ADMIN | none (a bad id gives 500) | `{error}` | own school |
| licenses/[id] | PUT, DELETE | `cU` | SYSTEM only | unscoped | zod (PUT) | `{error, details}` | SYSTEM |
| upload/csv | POST | `cU` | `student:import` (TEACHER+) | rows get the session school; classes are matched by name across the whole school, with no class-ownership check | manual (headers, email regex, 5 MB) | `{error, details}` | own school, any class |
| upload/classes | POST | `cU` | `student:import` | same | zod per row | `{error, details}` | own school, any class |
| upload/csv/cleanup | DELETE, POST | `cU` | `canRunContentTooling` (ADMIN, SYSTEM) | local `temp/` only | zod basename (no traversal) | `{error}` | ADMIN/SYSTEM |
| send | POST | **none** | none | none; the send call is commented out | none | `{message}` | signed-out; does nothing |
| teachers | GET | `validateUser` | `checkAdminPermissions` | `SSC` (only SYSTEM picks a school) | partial | `{error}` | own school |
| teachers | POST | `validateUser` | admin gate; the ADMIN role needs ADMIN rank | `resolveCreationSchoolId`; classes scoped | zod | `{error, requiresConfirmation}` | own school |
| teachers/[id] | GET, PUT, DELETE | `validateUser` | admin gate + `canSetPasswordFor` / `canChangeRoleFor` | `SSC` + teacher-role filter | zod (PUT) | `{error}` | own school |
| teachers/[id]/move | POST | `cU` | SYSTEM only | domain `moveTeacherToSchool` | zod | `{error, code}` | SYSTEM |
| teachers/assignments | GET | `cU` | `isAssignmentManager` | `CMC` | manual | `{error}` | own class or own school |
| students | GET, POST | `validateUser` | admin gate | `SSC`; the class must be in the caller's school | zod (POST) | `{error}` | own school |
| students/[id] | GET, PUT, DELETE | `validateUser` | admin gate; strict rank for password and delete | `SSC` + student-role filter | zod (PUT) | `{error}` | own school |
| students/[id]/assignments | GET | `cU` | `canReadStudentRecords` | class-scoped | none | `{error}` | own class or own school |
| students/leaderboard | GET | `cU` | `student:read:own` | own school | none | `{error}` | own school |

### Classrooms, assignments, class books, lessons, articles, chatbot

| Route | Method | Auth | Role check | Scoping of reads and writes | Validation | Error shape | Reach |
|---|---|---|---|---|---|---|---|
| articles | GET | `cU` | none; students get a level band | global content, drafts hidden | manual; `limit` has no cap | `{error}`; text 500 | any signed-in user |
| articles/[articleId] | GET | `cU` | none | global article; activity filtered by the caller's id | zod uuid | `{error}` 401/404/500 | any signed-in user |
| articles/[articleId] | POST, PUT, PATCH, DELETE | stub | – | – | – | `{error}` 404 | nothing |
| articles/questions/[articleId] | GET | `cU` | none | global questions, **answer key included**; results filtered by the caller's id | zod enum | text 400/500 | any signed-in user |
| articles/questions/[articleId] | POST | `cU` | `preview`, STUDENT | inserts the caller's own `userActivity` row | zod body; path id not checked | `{error}` | self only |
| articles/questions/feedback | – | no handler exported | – | – | – | Next default | not reachable |
| assignments | GET | `cU` | staff | `CMC` on `classroomId` and on the assignment's class | manual | `{error}` / `{message}` | own class or own school |
| assignments | POST | `cU` | staff | `CMC`; every student must be enrolled | zod | `{error, issues}` | own class or own school |
| assignments/[id] | GET | `cU` | same school; a student needs their own row; a teacher must teach the class | same | none | `{error}`; a missing id gives 200 `null` | own school |
| assignments/[id] | POST | `cU` | `preview`, STUDENT | needs the caller's own `studentAssignments` row | zod | `{error}` | self only |
| assignments/[id]/progress | GET | `cU` | none | filtered by the caller's id | none | `{error}` | self only |
| assignments/activity/[id] | GET | `cU` | staff get null | filtered by the caller's id | none | `{error}` | self only |
| class-books/[classBookId]/progress | GET | `cU` | `class:read` + `MC` | same school, owner or co-teacher | none | `{error}` 403/500 | own class |
| lessons/[articleId] | GET | `cU` | none | global article and questions, answer key included | none | `{error}` | any signed-in user |
| lessons/[articleId] | POST | `cU` | `preview`, STUDENT | writes only the caller's rows | manual; `timeSpent` has no bound | `{error}` | self only |
| lessons/[articleId]/activity, lessons/[articleId]/progress | GET | `cU` | none | filtered by the caller's id | none | `{error}` | self only |
| assistant/lesson-chatbot | POST | `cU` | **none** (any role) | no DB; the client supplies the article text for the system prompt | zod with length caps | `{error}` / `{errors}` | any signed-in user, no rate limit |
| classroom | GET | `cU` | staff | own school; a teacher sees only own classes | n/a | `{error}` | own classes or own school |
| classroom | POST | `cU` | staff (a refusal returns 400) | the caller's school; the caller becomes owner | manual (`name` present) | `{error}` | own school |
| classroom/[id] | GET, PATCH, DELETE | `cU` | staff; changing teachers needs `class:teachers:assign` (ADMIN) | `GAC`; added teachers must belong to the school | zod (PATCH) | `{error}`; 500 sends `error.message` | own class or own school |
| classroom/[id]/available-students, enroll, unenroll, generate-code | GET, POST, DELETE | `cU` | staff | `GAC`; the student must be in the class's school | manual | `{error}`; 500 sends `error.message` | own class or own school |
| classroom/students | GET | `cU` | SYSTEM, ADMIN or TEACHER | admin: own school; teacher: own classes | n/a | `{error}` | own school or own classes |
| classrooms | GET | `cU` | `admin:dashboard` + ADMIN/SYSTEM | TenantDB; only SYSTEM may pass `schoolId` | zod uuid | `{error}` | own school |

### Flashcards, `v1` (apk, avatar, quest, help, class avatars), voice

| Route | Method | Auth | Role check | Scoping of reads and writes | Validation | Error shape | Reach |
|---|---|---|---|---|---|---|---|
| flashcard/cards/[cardId]/review | POST | `cU` | `preview` + `article:read` | the card's deck must belong to the caller; pays 15 XP on every call | manual (rating 1–4) | `{error}` | self only |
| flashcard/deck-id | GET | `cU` | `article:read` | deck owned by the caller | n/a | `{success, error}` | self only |
| flashcard/decks/[deckId]/due | GET | `cU` | `article:read` | deck id + owner; reads the whole `card_reviews` table | manual | `{error}` | self only |
| flashcard/decks/[deckId]/sentences-for-cloze, sentences-for-matching, sentences-for-ordering, words-for-ordering | GET | `cU` | `article:read` | deck id + owner | manual | `{error}` | self only |
| same 4 routes | POST | `cU` | `preview` + `article:read` | `parseDeckGameSubmit` checks the owner; XP on every play | zod (score 0–1000) | `{error}` | self only |
| flashcard/save/[id] | POST | `cU` (the body is read first) | `preview` | read only | none | `{error}` | self only |
| v1/apk/challenges | GET | `factory` (session + school) | `challenges:read` + class access | TenantDB | zod | `{error:{code,message}}` | own school, own class |
| v1/apk/challenges | POST | `factory` + same-origin | TEACHER/ADMIN; a teacher must own the class | TenantDB | zod | same | own school |
| v1/apk/challenges/classes | GET | `factory` | STUDENT | enrolled classes | zod | same | self only |
| v1/apk/challenges/teacher-classes | GET | `factory` | TEACHER/ADMIN | a teacher sees only own classes | zod | same | own school |
| v1/apk/challenges/runs | POST | `factory` + same-origin | `preview` + `challenges:start` + class access | TenantDB + membership | zod | same | own class |
| v1/apk/complete | POST | `cU` | `preview` + STUDENT | TenantDB; XP to the caller; dedup key chosen by the client | zod strict | `{error:{code,message}}` | self only |
| v1/apk/content, v1/apk/practice | GET | `cU` | STUDENT | the caller's own records | zod | same | self only |
| v1/apk/rpg | GET, PATCH | `cU` | STUDENT; PATCH adds `preview` | self | zod | same | self only |
| v1/avatar/catalog | GET | none | none | static catalog | n/a | n/a | public by design |
| v1/avatar, v1/avatar/shop | GET | `aA` | `preview` | the caller's school and id | n/a | `{error, message}` | self only |
| v1/avatar/loadout, v1/avatar/purchase | POST | `aA` | `preview` + `assertStudentRecordWriter` | self; GP capped per day | zod | same | self only |
| v1/classroom/[classroomId]/avatars | GET | `aA` | `MC` | the class must be in the caller's school | none | same | own class |
| v1/classroom/[classroomId]/avatars/[userId]/reset | POST | `aA` | `MC` | the student must be in the class | none | same | own class |
| v1/help/events | POST | `gCS` + same-origin + 30/min | `HELP_EVENT_RECORD` | the caller's school | zod | `{error}` | own school |
| v1/quest | POST | `cU` | `MC` + challenge create | the caller's school | zod | same | own class |
| v1/quest/[questId] | DELETE | `cU` | `MC` | `questById` filters by school | zod | same | own class |
| v1/quest/[questId]/state | GET | `cU` | `MC` | filtered by school | ids | same | own class |
| v1/quest/[questId]/status | POST | `cU` | `MC` | filtered by school; state machine | zod | same | own class |
| v1/quest/battle | GET | `cU` | none needed | the caller's open quest | n/a | same | self only |
| v1/quest/heartbeat | POST | `cU` | `preview` + `assertStudentRecordWriter` | quest in the caller's school + membership | zod | same | self only |
| voice/entitlement | GET | `vA` | STUDENT + school | self | n/a | `{error, message}` | self only |
| voice/sessions | GET | `vA` | STUDENT | the caller's sessions | n/a | same | self only |
| voice/sessions | POST | `vA` | `preview`, STUDENT, full sign-in, avatar, lock, monthly quota | self | zod (SDP up to 100k) | same | self only |
| voice/sessions/[sessionId]/connected, voice/sessions/[sessionId]/end | POST | `vA` | `preview` | `studentUserId === user.id` | zod | same | self only |

### Server actions (`apps/primary-advantage/actions/*.ts`)

| Action | Auth | Role check | Scoping | Validation | Error shape | Reach |
|---|---|---|---|---|---|---|
| avatar#setAvatarProfileAction | `cU` | `preview` | self | domain zod | `{success, error}` | self only |
| classroom#createClassroomCode | `cU` | `isStaffRole` + `GAC` | school filter | none (id) | `{success, error}` | own class or own school |
| lesson-attempts#restartLessonAction | `cU` | `preview` + `assertStudentRecordWriter` | self | zod | `{success, error}` | self only |
| lesson-games#getLessonGameInputAction | `cU` | `games:read:own`; staff go through `managedClassBook` | school check | zod | `{success, error}` | self, or own-school class |
| lesson-games#getLessonGameResultsAction | `cU` | `games:read:own` | self | zod | same | self only |
| class-books#assignClassBookAction, setCurrentLessonAction, markLessonTaughtAction, markStepDoneAction, teachLessonAgainAction | `cU` | `class:update` + `MC` / `managedClassBook` | class in the caller's school | domain zod | `{success, error}` | own class |
| practice#getSentencesForOrderingGame, getFlashcardDeckId | `cU` | none | deck owned by the caller | none | `{success, error}` | self only (the first one always fails) |
| user#updateUserActivity | `cU` | `preview` | self | **none**: `type` and `articleId` are free | `{error}` | self only; pays XP for any claimed type |
| article#fetchArticleActivity, getLessonSummaryData | `cU` | `preview` / staff get an empty model | self | none | `{error}` | self only |
| question#retakeQuiz | `cU` | `preview` | deletes the caller's `user_activity` row for any type | **none** | `{error}` | self only; resets the XP dedup |
| question#finishQuiz | `cU` | `preview` | self | **none**; the MC score comes from the client | `{error}` | self only; mints XP |
| question#getFeedback | `cU` | **none** (any role, no preview guard) | article by id | zod without length caps | raw output or a throw | any signed-in user; paid AI call |
| story-question#submitChapterMcq, retakeChapterMcq, getChapterWrittenFeedback | `cU` | `preview` | self; MCQ graded on the server | zod | `{error}` | self only |
| story-question#submitChapterWritten | `cU` | `preview` | self | zod, but the score comes from the client (capped at 5 or 25) | `{error}` | self only |
| flashcard#saveFlashcard | `cU` | `preview` | the caller's deck | **none** (unbounded arrays) | `{status, message}` | self only |
| flashcard#getUserFlashcardDecks, getDashboardData, getAllSentenceCards, getLessonOrderingSentences, getLessonClozeTestSentences, getLessonOrderingWords, getLessonFlashcards | `cU` | none (staff get preview cards) | decks owned by the caller | none | `{success, error}` | self only |
| flashcard#getDeckCards | `cU` | `progress:read:own` | deck id + owner | zod | same | self only |
| flashcard#deleteFlashcardCard, reviewCard, saveArticleToFlashcard, saveChapterToFlashcard | `cU` | `preview` | card or deck owned by the caller | manual or zod uuid | same | self only |

## Top 10 findings, ordered by risk

1. **`apps/primary-advantage/actions/question.ts:21` (`retakeQuiz`) with `:90` (`finishQuiz`). High.**
   - **What is wrong:**
     - `retakeQuiz` deletes the caller's `user_activity` row for any type without validation. That row is the only thing that stops `awardQuestionXp` paying twice.
     - `finishQuiz` counts an MC answer as correct when the client's `answer` equals its own `isCorrect`, and `responses` has no length limit.
     - Together, a signed-in student can loop and mint unlimited XP. The same loop works for stories through `submitChapterWritten` with a client score of 25.
   - **Smallest fix:** keep the XP log row on retake and refuse a second award for the same user, type and target.
2. **`apps/primary-advantage/app/api/upload/csv/route.ts:473` and `apps/primary-advantage/app/api/upload/classes/route.ts:169`. Medium.**
   - **What is wrong:** any TEACHER may import. Imported rows join an existing class by name across the whole school, with no `canManageClassroom` check. A teacher can therefore put students, or new TEACHER accounts from `teachers.csv`, into another teacher's class. This also gets around the admin-only `POST /api/teachers`.
   - **Smallest fix:** call `canManageClassroom` on each matched class, and refuse teacher rows for callers below ADMIN.
3. **`apps/primary-advantage/app/api/assistant/lesson-chatbot/route.ts:30`. Medium.**
   - **What is wrong:** any signed-in user can call the chatbot in a loop with about 280k characters of client-written context. The client's `title`, `passage` and `summary` go straight into the system prompt. So the route works as an unmetered, general-purpose AI proxy on the school's account.
   - **Smallest fix:** add a per-user rate limit, and load the article text on the server from an `articleId`.
4. **`apps/primary-advantage/actions/question.ts:174` (`getFeedback`). Medium.**
   - **What is wrong:** any signed-in user of any role triggers a paid AI call, with no rate limit and no length caps on the question or answer fields.
   - **Smallest fix:** add `.max()` caps to the feedback schemas in `lib/zod.ts` and the per-user `consumeRateLimit` that `/api/v1/help/events` uses.
5. **`packages/api/src/routes/auth/client-ip.ts:55`. Medium.**
   - **What is wrong:** `TRUST_PROXY_COUNT` is not set in `apps/primary-advantage/cloudbuild.yaml`, so the client IP is the leftmost `X-Forwarded-For` value, which the client controls. A caller who sends a fresh value on each request gets past every per-IP limit: login, student code entry and QR misses. A caller can also lock out a school's real IP.
   - **Smallest fix:** set `TRUST_PROXY_COUNT` in the Cloud Run service env.
6. **`apps/primary-advantage/server/models/articleModel.ts:216`, with `server/controllers/userController.ts:27`. Medium.**
   - **What is wrong:** the student question routes (`articles/questions`, `lessons/[articleId]`, `assignments/[id]`) return the full question rows, including `correctAnswer` and `sampleAnswer`. The score comes from the client's `progress` array. A student can read the key and post a perfect score.
   - **Smallest fix:** strip the answer fields from student replies and mark answers on the server.
7. **`apps/primary-advantage/app/api/v1/apk/complete/route.ts:63`. Medium.**
   - **What is wrong:** XP comes from the client-reported `correctAnswers`, at most 10 per call. Dedup uses a client-chosen `idempotencyKey`, so a fresh UUID on each call pays 10 XP every time.
   - **Smallest fix:** require a run id issued by the server and pay once per run.
8. **`apps/primary-advantage/app/api/flashcard/cards/[cardId]/review/route.ts:144`. Medium.**
   - **What is wrong:**
     - Every review POST on an owned card pays 15 XP, with no due-date check.
     - The four deck-game POSTs pay XP on every play.
     - `saveFlashcard` accepts unbounded decks, so a student can raise the per-play cap.
   - **Smallest fix:** pay review XP only when the card is due, and deck-game XP once per deck per day.
9. **`packages/api/src/routes/auth/login.ts:110`. Medium.**
   - **What is wrong:** login parses JSON without checking `Content-Type`. A cross-site `text/plain` form can sign a victim's browser into the attacker's account (login CSRF). The student handlers already block this case with 415.
   - **Smallest fix:** refuse non-`application/json` bodies with 415, as `parseBody` in `lib/student-login/http.ts` does.
10. **`apps/primary-advantage/app/api/users/[id]/activity/route.ts:53`, `article-records/route.ts:68`, `reminder-reread/route.ts:46`. Low to medium.**
    - **What is wrong:** `canReadUserResource` lets any same-school TEACHER read the activity, XP and reading history of any user in the school: other teachers, admins, and students outside their classes. `students/[id]/assignments` uses the stricter class check.
    - **Smallest fix:** use `canReadStudentRecords` on these three routes.

### Also noted (lower risk)

- **Global miss bucket:** `packages/domain/src/student-login/rate-limits.ts:40`. 200 wrong codes in 10 minutes block code sign-in for every school. This is in the spec as a known risk.
- **Picture-password guessing:** `packages/domain/src/student-login/picture-password.ts:27`. There are 1728 sequences, and the 5-try lock resets every 5 minutes, so a classmate can guess in about an hour. This is in the spec as a known risk.
- **Rate-limit race:** `packages/auth/src/rate-limit.ts:297`. The login limit is read before the failure is written, so a parallel burst gets more tries.
- **Demo password:** `packages/api/src/routes/auth/impersonate.ts:98`. Impersonation creates `system_demo` with the fixed password `Password123!` whenever it is enabled.
- **Unvalidated activity type:** `actions/user.ts:166`. `updateUserActivity` pays table XP for any claimed type, with no validation.
- **Legacy admin rows:** `server/utils/auth.ts:250`. A leftover legacy `user_roles` "admin" row passes the admin gate on the teacher and student routes. This stays within the account's own school.
- **School create:** `app/api/users/me/school/route.ts:149`. The role upgrade runs before the school insert, outside a transaction.
- **School delete:** `app/api/users/me/school/route.ts:467`. The delete likely fails on the `users.school_id` foreign key, and it writes no audit event.
- **Leaked error text:** `server/controllers/classroomController.ts:102` and four more lines in that file return raw `error.message` in 500 bodies.
- **Leaked file path:** `app/api/upload/csv/route.ts:584` returns the absolute server file path.
- **Uncapped paging:** `server/controllers/articleController.ts:22`. `GET /api/articles?limit=1000000` returns the whole article table.
- **Path ids:** most path ids are not checked as uuids, so a bad id gives 500 instead of 400.
- **Dead and no-op routes:** `app/api/send/route.ts:4` (a no-op) and `actions/signinAction.ts` (dead code) can both be deleted.
