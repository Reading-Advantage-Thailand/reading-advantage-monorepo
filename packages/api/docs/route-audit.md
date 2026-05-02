# Next.js API Route Audit

> Generated: 2026-05-02
> Scope: All `route.ts` files across the three main Next.js apps
> Total routes audited: **294**

---

## 1. Summary Tables

### 1.1 Route Counts by App and Tier

| App | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Total |
|-----|--------|--------|--------|--------|-------|
| reading-advantage | 50 | 30 | 98 | 27 | **205** |
| primary-advantage | 31 | 7 | 18 | 4 | **60** |
| science-advantage | 11 | 0 | 16 | 2 | **29** |
| **Grand Total** | **92** | **37** | **132** | **33** | **294** |

### 1.2 Route Counts by Domain

| Domain | reading-advantage | primary-advantage | science-advantage | Total |
|--------|-------------------|-------------------|-------------------|-------|
| Auth / Users | 18 | 8 | 6 | 32 |
| Classes / Classrooms | 25 | 12 | 8 | 45 |
| Assignments | 2 | 5 | 2 | 9 |
| Articles / Content | 16 | 8 | 2 | 26 |
| Flashcards | 14 | 7 | 0 | 21 |
| AI / Assistant | 13 | 1 | 2 | 16 |
| Stories | 14 | 0 | 0 | 14 |
| Games | 27 | 0 | 0 | 27 |
| Lessons | 6 | 3 | 2 | 11 |
| Metrics / Analytics | 14 | 0 | 5 | 19 |
| Admin / System | 14 | 0 | 0 | 14 |
| Goals | 5 | 0 | 0 | 5 |
| Activity | 5 | 0 | 0 | 5 |
| Licenses | 2 | 2 | 0 | 4 |
| Upload / CSV | 0 | 3 | 0 | 3 |
| Demo | 3 | 0 | 0 | 3 |
| Level Test | 2 | 0 | 0 | 2 |
| XP | 2 | 0 | 0 | 2 |
| Passage | 2 | 0 | 0 | 2 |
| Health | 1 | 0 | 0 | 1 |
| Telemetry | 1 | 0 | 0 | 1 |
| Notifications | 1 | 0 | 0 | 1 |
| Debug | 0 | 3 | 0 | 3 |
| Email | 0 | 1 | 0 | 1 |
| Student (top-level) | 1 | 3 | 1 | 5 |
| Schools | 0 | 2 | 0 | 2 |
| Teachers (top-level) | 0 | 2 | 1 | 3 |
| Gamification | 0 | 0 | 2 | 2 |

### 1.3 Tier Definitions

| Tier | Label | Criteria |
|------|-------|----------|
| **Tier 1** | Shared, high-traffic | Auth, users, classes, assignments -- serve multiple apps |
| **Tier 2** | Shared, medium-traffic | Articles, flashcards, reports |
| **Tier 3** | App-specific | Admin, demo, utilities, science lessons/curriculum |
| **Tier 4** | Complex / AI | AI generation, analytics, interventions |

### 1.4 Database Technology by App

| App | ORM | Schema Location |
|-----|-----|-----------------|
| reading-advantage | Prisma | `apps/reading-advantage/prisma/` |
| primary-advantage | Prisma | `apps/primary-advantage/prisma/` |
| science-advantage | Prisma | `apps/science-advantage/prisma/` |

---

## 2. Detailed Route Listings by Domain

---

### 2.1 AUTH

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET,POST | `/auth/[...nextauth]` | NextAuth.js catch-all handler (session, signin, signout, CSRF) | _(via NextAuth adapter)_ | Tier 1 |
| POST | `/auth/signup` | Create a new user account with email/password | `user` | Tier 1 |
| POST | `/auth/reset-password` | Generate password reset token and send reset email | `user`, `verificationToken` | Tier 1 |
| POST | `/auth/update-password` | Update user password (verifies Firebase ID token first) | `user` | Tier 1 |
| POST | `/auth/check-password-set` | Check if a user has a password configured | `user` | Tier 1 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET,POST | `/auth/[...nextauth]` | NextAuth.js catch-all handler | _(via NextAuth adapter)_ | Tier 1 |
| POST | `/auth/signin` | Validate credentials and sign in user | `user`, `role`, `userRole` | Tier 1 |

#### science-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/auth/google` | Initiate Google OAuth2 flow (redirect to Google) | _(none)_ | Tier 1 |
| GET | `/auth/google/callback` | Handle Google OAuth2 callback, create/link account | `user`, `account` | Tier 1 |
| POST | `/auth/login` | Email/password login with JWT token generation | `user` | Tier 1 |
| POST | `/auth/logout` | Clear session/token | _(none)_ | Tier 1 |
| GET | `/auth/session` | Get current session/user info | _(via JWT)_ | Tier 1 |
| POST | `/auth/impersonate` | Admin impersonate another user | `user` | Tier 1 |

---

### 2.2 USERS

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/users` | List/search users (with role, school filters) | `user`, `classroomStudent`, `license`, `licenseOnUser`, `userActivity`, `xPLog` | Tier 1 |
| POST | `/v1/users` | Create a new user | `user` | Tier 1 |
| PATCH | `/v1/users` | Update user fields | `user` | Tier 1 |
| DELETE | `/v1/users` | Delete a user | `user` | Tier 1 |
| GET | `/v1/users/[id]` | Get user by ID with activity summary | `user`, `userActivity` | Tier 1 |
| PATCH | `/v1/users/[id]` | Update user by ID | `user` | Tier 1 |
| GET | `/v1/users/[id]/activity-data` | Get user activity chart data | `userActivity` | Tier 1 |
| GET | `/v1/users/[id]/activitylog` | Get user activity log entries | `userActivity` | Tier 1 |
| POST | `/v1/users/[id]/activitylog` | Create activity log entry | `userActivity` | Tier 1 |
| PUT | `/v1/users/[id]/activitylog` | Update activity log entry | `userActivity` | Tier 1 |
| POST | `/v1/users/[id]/reset-all-progress` | Reset all reading progress for a user | `user`, `userActivity`, `xPLog`, `lessonRecord`, `userSentenceRecord`, `userWordRecord` | Tier 1 |
| GET | `/v1/users/[id]/student-data` | Get student-specific data (classroom, assignments) | `classroomStudent`, `user` | Tier 1 |
| GET | `/v1/users/[id]/xp-logs` | Get XP transaction logs for a user | `xPLog` | Tier 1 |
| GET | `/v1/users/assignments` | Get assignments for the current user | `assignment`, `studentAssignment` | Tier 1 |
| GET | `/v1/users/ranking` | Get user leaderboard ranking | `user`, `license` | Tier 1 |
| GET | `/v1/users/ranking/[id]` | Get ranking for a specific user | `user`, `license` | Tier 1 |
| GET,POST | `/v1/users/records/[id]` | Get or create reading records for a user | `lessonRecord`, `userActivity` | Tier 1 |
| GET | `/v1/users/sentences/[id]` | Get user sentence records | `userSentenceRecord` | Tier 2 |
| POST | `/v1/users/sentences/[id]` | Create user sentence record | `userSentenceRecord` | Tier 2 |
| DELETE | `/v1/users/sentences/[id]` | Delete user sentence record | `userSentenceRecord` | Tier 2 |
| GET | `/v1/users/vocabularies/[id]` | Get user vocabulary records | `userWordRecord` | Tier 2 |
| POST | `/v1/users/vocabularies/[id]` | Create user vocabulary record | `userWordRecord` | Tier 2 |
| DELETE | `/v1/users/vocabularies/[id]` | Delete user vocabulary record | `userWordRecord` | Tier 2 |
| GET | `/v1/users/wordlist/[id]` | Get user word list | `userWordRecord` | Tier 2 |
| POST | `/v1/users/wordlist/[id]` | Add word to user word list | `userWordRecord` | Tier 2 |
| DELETE | `/v1/users/wordlist/[id]` | Remove word from user word list | `userWordRecord` | Tier 2 |
| GET | `/v1/student/me` | Get current authenticated student profile | `user`, `classroomStudent` | Tier 1 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| PATCH | `/users/[id]` | Update user profile | `user` | Tier 1 |
| GET | `/users/search` | Search users by name or email | `user` | Tier 1 |
| GET | `/users/activitylog/[id]` | Get activity log for a user | `userActivity` | Tier 1 |
| POST | `/users/activitylog/[id]` | Create activity log entry | `userActivity` | Tier 1 |
| GET | `/users/[id]/article-records` | Get article reading records for a user | `articleActivityLog` | Tier 1 |
| GET | `/users/[id]/reminder-reread` | Get reminder/reread data for a user | `userLessonProgress` | Tier 1 |
| GET | `/users/me/school` | Get current user's school | `school`, `user`, `role`, `userRole` | Tier 1 |
| POST | `/users/me/school` | Create school for current user | `school`, `user`, `role`, `userRole` | Tier 1 |
| PATCH | `/users/me/school` | Update current user's school | `school`, `user`, `role`, `userRole` | Tier 1 |
| DELETE | `/users/me/school` | Delete current user's school | `school`, `user`, `role`, `userRole` | Tier 1 |
| POST | `/users/me/school/admins` | Add a school admin | `schoolAdmins`, `user`, `role`, `userRole` | Tier 1 |
| DELETE | `/users/me/school/admins/[adminId]` | Remove a school admin | `schoolAdmins`, `user`, `role`, `userRole` | Tier 1 |

---

### 2.3 CLASSES / CLASSROOMS

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/classroom` | List all classrooms for the teacher | `classroom`, `classroomStudent`, `classroomTeacher`, `user` | Tier 1 |
| POST | `/v1/classroom` | Create a new classroom | `classroom`, `license`, `licenseOnUser` | Tier 1 |
| GET | `/v1/classroom/[classroomId]` | Get classroom details | `classroom`, `classroomStudent`, `classroomTeacher` | Tier 1 |
| PATCH | `/v1/classroom/[classroomId]` | Update classroom | `classroom` | Tier 1 |
| DELETE | `/v1/classroom/[classroomId]` | Delete classroom | `classroom`, `classroomStudent` | Tier 1 |
| GET,PATCH | `/v1/classroom/[classroomId]/achived` | Get or toggle archived status | `classroom` | Tier 3 |
| GET | `/v1/classroom/[classroomId]/assignments` | List assignments for a classroom | `assignment`, `classroomStudent`, `studentAssignment` | Tier 1 |
| GET | `/v1/classroom/[classroomId]/assignments/[assignmentId]/students` | Get student progress for an assignment | `studentAssignment`, `classroomStudent`, `user` | Tier 1 |
| POST | `/v1/classroom/[classroomId]/assignment-notifications/send` | Send assignment notification to students | `assignmentNotification`, `assignment` | Tier 1 |
| GET | `/v1/classroom/[classroomId]/assignment-notifications/history` | Get notification history for a classroom | `assignmentNotification` | Tier 1 |
| PATCH | `/v1/classroom/[classroomId]/enroll` | Enroll students in classroom | `classroomStudent`, `user` | Tier 1 |
| PATCH | `/v1/classroom/[classroomId]/unenroll` | Unenroll students from classroom | `classroomStudent` | Tier 1 |
| GET | `/v1/classroom/[classroomId]/overview` | Get classroom dashboard overview | `classroomStudent`, `classroomTeacher`, `userActivity`, `xPLog` | Tier 1 |
| GET | `/v1/classroom/[classroomId]/students` | List students in a classroom | `classroomStudent`, `user` | Tier 1 |
| GET | `/v1/classroom/[classroomId]/teachers` | List teachers for a classroom | `classroomTeacher`, `user` | Tier 1 |
| POST | `/v1/classroom/[classroomId]/teachers` | Add teacher to classroom | `classroomTeacher` | Tier 1 |
| DELETE | `/v1/classroom/[classroomId]/teachers` | Remove teacher from classroom | `classroomTeacher` | Tier 1 |
| GET | `/v1/classroom/all-students` | List all students across teacher's classrooms | `classroomStudent`, `user` | Tier 1 |
| GET | `/v1/classroom/students` | Get students (role-based filtering) | `classroomStudent`, `user` | Tier 1 |
| PATCH | `/v1/classroom/students` | Update student classroom assignments | `classroomStudent` | Tier 1 |
| GET | `/v1/classroom/students/enroll` | Get enrollment form/students available to enroll | `classroomStudent`, `user` | Tier 1 |
| GET | `/v1/classroom/students/unenroll` | Get unenrollment data | `classroomStudent` | Tier 1 |
| GET,PATCH | `/v1/classroom/students/[studentId]` | Get or update a specific student | `classroomStudent`, `user` | Tier 1 |
| GET | `/v1/classroom/students/[studentId]/assignment-notifications/unread` | Get unread notifications for a student | `assignmentNotification` | Tier 1 |
| GET | `/v1/classroom/students/[studentId]/assignment-notifications/check/[assignmentId]` | Check notification status | `assignmentNotification` | Tier 1 |
| PATCH | `/v1/classroom/students/[studentId]/assignment-notifications/[notificationId]/acknowledge` | Acknowledge a notification | `assignmentNotification` | Tier 1 |
| GET | `/v1/classroom/xp-chart` | Get XP chart data for classrooms | `xPLog`, `classroomStudent` | Tier 2 |
| GET | `/v1/classroom/xp-custom-range` | Get XP data for custom date range | `xPLog`, `classroomStudent` | Tier 2 |
| GET | `/v1/classroom/xp-per-students/[classroomId]` | Get XP per student in a classroom | `xPLog`, `classroomStudent`, `user` | Tier 2 |
| GET,PATCH | `/v1/classroom/teachers` | List or update teachers across classrooms | `classroomTeacher`, `user` | Tier 1 |
| GET | `/v1/classroom/oauth2/link` | Initiate Google Classroom OAuth2 link | _(redirect to Google)_ | Tier 3 |
| GET | `/v1/classroom/oauth2/callback` | Handle Google Classroom OAuth2 callback | `user`, `classroom` | Tier 3 |
| GET | `/v1/classroom/oauth2/classroom/courses` | List Google Classroom courses | _(Google API)_ | Tier 3 |
| GET | `/v1/classroom/oauth2/classroom/courses/[courseId]` | Get Google Classroom course details | _(Google API)_ | Tier 3 |
| GET | `/v1/classroom/oauth2/unlink` | Unlink Google Classroom | `user` | Tier 3 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/classroom` | List classrooms for a teacher | `classroom`, `classroomStudent`, `classroomTeachers`, `user` | Tier 1 |
| POST | `/classroom` | Create a new classroom | `classroom`, `classroomTeachers` | Tier 1 |
| GET | `/classroom/[id]` | Get classroom with students | `classroom`, `classroomStudent`, `user` | Tier 1 |
| PATCH | `/classroom/[id]` | Update classroom | `classroom` | Tier 1 |
| DELETE | `/classroom/[id]` | Delete classroom | `classroom`, `classroomStudent`, `classroomTeachers` | Tier 1 |
| POST | `/classroom/[id]/enroll` | Enroll a student in a classroom | `classroomStudent`, `user` | Tier 1 |
| DELETE | `/classroom/[id]/unenroll` | Unenroll a student from a classroom | `classroomStudent` | Tier 1 |
| POST | `/classroom/[id]/generate-code` | Generate a new class join code | `classroom` | Tier 1 |
| GET | `/classroom/[id]/available-students` | Get students available for enrollment | `classroomStudent`, `user` | Tier 1 |
| GET | `/classroom/students` | Get students for current teacher/system | `classroomStudent`, `user` | Tier 1 |
| GET | `/classrooms` | Fetch classrooms for admin | `classroom`, `user` | Tier 1 |

#### science-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/classes` | List classes for current user | `class` | Tier 1 |
| POST | `/classes` | Create a new class | `class` | Tier 1 |
| GET | `/classes/[classId]` | Get class details | `class`, `lessonCompletion` | Tier 1 |
| PATCH | `/classes/[classId]` | Update class | `class` | Tier 1 |
| DELETE | `/classes/[classId]` | Delete class (checks for student progress) | `class`, `lessonCompletion` | Tier 1 |
| GET | `/classes/[classId]/roster` | Get class roster (students) | `class`, `user` | Tier 1 |
| DELETE | `/classes/[classId]/roster` | Remove student from class | `class`, `user` | Tier 1 |
| POST | `/classes/join` | Student joins a class via code | `class` | Tier 1 |

---

### 2.4 ASSIGNMENTS

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/assignments` | List assignments (filter by classroomId, articleId) | `assignment`, `classroomStudent`, `studentAssignment`, `article`, `user` | Tier 1 |
| POST | `/v1/assignments` | Create a new assignment | `assignment`, `studentAssignment`, `classroomStudent` | Tier 1 |
| PUT | `/v1/assignments` | Update an assignment | `assignment`, `studentAssignment` | Tier 1 |
| DELETE | `/v1/assignments` | Delete an assignment | `assignment`, `studentAssignment` | Tier 1 |
| GET | `/v1/assignment-notifications` | Get assignment notifications for a student | `assignmentNotification` | Tier 1 |
| POST | `/v1/assignment-notifications` | Create an assignment notification | `assignmentNotification` | Tier 1 |
| PATCH | `/v1/assignment-notifications` | Update notification status | `assignmentNotification` | Tier 1 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/assignments` | List assignments | `assignment`, `classroom`, `assignmentStudent`, `article` | Tier 1 |
| POST | `/assignments` | Create assignment | `assignment`, `assignmentStudent`, `classroom` | Tier 1 |
| GET | `/assignments/[id]` | Get assignment by ID | `assignment`, `assignmentStudent`, `article` | Tier 1 |
| POST | `/assignments/[id]` | Submit assignment response | `assignment`, `userLessonProgress` | Tier 1 |
| GET | `/assignments/[id]/progress` | Get assignment progress | `assignmentStudent`, `userLessonProgress` | Tier 1 |
| GET | `/assignments/activity/[id]` | Get activity data for an assignment | `articleActivityLog` | Tier 1 |
| GET | `/teachers/assignments` | List assignments for a teacher | `assignment`, `classroom` | Tier 1 |

#### science-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/classes/[classId]/assignments` | List assignments for a class | `assignment`, `class`, `lesson` | Tier 1 |
| POST | `/classes/[classId]/assignments` | Create an assignment for a class | `assignment`, `class`, `lesson` | Tier 1 |
| DELETE | `/classes/[classId]/assignments` | Delete an assignment | `assignment` | Tier 1 |
| GET | `/students/[studentId]/assignments` | Get assignments for a student | `assignment` | Tier 1 |

---

### 2.5 ARTICLES / CONTENT

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/articles` | List articles (with filters for type, genre, level) | `article`, `userActivity` | Tier 2 |
| GET | `/v1/articles/[article_id]` | Get article by ID | `article` | Tier 2 |
| DELETE | `/v1/articles/[article_id]` | Delete an article | `article` | Tier 2 |
| POST | `/v1/articles/generate` | Generate a new article via AI | `article`, `user` | Tier 4 |
| POST | `/v1/articles/generate/custom-generate` | Generate a custom article | `article`, `user` | Tier 4 |
| GET,POST | `/v1/articles/generate/custom-generate/user-generated` | List or create user-generated articles | `article`, `user` | Tier 4 |
| PUT | `/v1/articles/generate/custom-generate/user-generated/[articleId]` | Update a user-generated article | `article` | Tier 4 |
| POST | `/v1/articles/validate` | Validate article content | `article` | Tier 2 |
| GET | `/v1/articles/genres` | List available article genres | `article` | Tier 2 |
| GET | `/v1/articles/[article_id]/export-workbook` | Export article as a printable workbook | `article`, `chapter` | Tier 2 |
| POST | `/v1/articles/[article_id]/translate` | Translate article content | `article` | Tier 4 |
| GET,POST | `/v1/articles/[article_id]/questions/mcq` | List or create MCQ questions | `article`, `multipleChoiceQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/mcq/[question_id]` | Get or answer an MCQ question | `multipleChoiceQuestion`, `userActivity`, `xPLog` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/sa` | List or create short answer questions | `article`, `shortAnswerQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/sa/[question_id]` | Get or answer a short answer question | `shortAnswerQuestion`, `userActivity`, `xPLog` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/sa/[question_id]/rate` | Rate a short answer response | `shortAnswerQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/laq` | List or create long answer questions | `article`, `longAnswerQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/laq/[question_id]` | Get or answer a long answer question | `longAnswerQuestion`, `userActivity`, `xPLog` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/laq/[question_id]/getxp` | Award XP for LAQ completion | `longAnswerQuestion`, `xPLog` | Tier 2 |
| GET,POST | `/v1/articles/[article_id]/questions/laq/[question_id]/feedback` | Get AI feedback on LAQ response | `longAnswerQuestion`, `userActivity` | Tier 4 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/articles` | List articles | `article`, `flashcardDeck`, `flashcardCard`, `userActivity` | Tier 2 |
| GET | `/articles/[articleId]` | Get article by ID | `article`, `flashcardDeck`, `flashcardCard` | Tier 2 |
| POST | `/articles/generate` | Generate article via AI | `article`, `user` | Tier 4 |
| GET,POST | `/articles/generate/custom-generate` | List or create custom articles | `article`, `user` | Tier 4 |
| POST | `/articles/generate/custom-generate/save` | Save a custom-generated article | `article` | Tier 4 |
| POST | `/articles/generate/custom-generate/approve` | Approve a custom article | `article` | Tier 4 |
| GET,POST | `/articles/questions/[articleId]` | List or create questions for an article | `article`, `multipleChoiceQuestion`, `shortAnswerQuestion`, `longAnswerQuestion` | Tier 2 |
| POST | `/articles/questions/feedback` | Get AI feedback on question response | `article`, `longAnswerQuestion` | Tier 4 |

#### science-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/lessons/[lessonSlug]` | Get lesson content by slug | `lesson` | Tier 3 |
| GET,POST | `/lessons/[lessonSlug]/quiz` | Get or submit a quiz for a lesson | `lesson`, `attempt`, `lessonCompletion`, `gamificationProfile`, `masteryRun` | Tier 3 |

---

### 2.6 FLASHCARDS

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/flashcard/deck-id` | Find user's flashcard deck ID | `userSentenceRecord` | Tier 2 |
| GET | `/v1/flashcard/deck-info` | Get deck metadata | `userSentenceRecord`, `userWordRecord` | Tier 2 |
| GET | `/v1/flashcard/decks/[deckId]/sentences-for-cloze` | Get sentences for cloze test | `userSentenceRecord`, `article` | Tier 2 |
| GET | `/v1/flashcard/decks/[deckId]/sentences-for-ordering` | Get sentences for word ordering exercise | `userSentenceRecord`, `article` | Tier 2 |
| GET | `/v1/flashcard/decks/[deckId]/words-for-ordering` | Get words for ordering exercise | `userWordRecord`, `article` | Tier 2 |
| GET | `/v1/flashcard/sentences/[id]` | Get sentence flashcards for a user | `userSentenceRecord` | Tier 2 |
| GET | `/v1/flashcard/vocabularies/[id]` | Get vocabulary flashcards for a user | `userWordRecord` | Tier 2 |
| GET | `/v1/flashcard/stats/[id]` | Get flashcard statistics | `userSentenceRecord`, `userWordRecord` | Tier 2 |
| POST | `/v1/flashcard/progress/[id]` | Update flashcard progress (SRS) | `userSentenceRecord`, `userWordRecord` | Tier 2 |
| PUT | `/v1/flashcard/progress/[id]` | Replace flashcard progress | `userSentenceRecord`, `userWordRecord` | Tier 2 |
| POST | `/v1/flashcard/progress/update` | Batch update flashcard progress | `userSentenceRecord`, `userWordRecord` | Tier 2 |
| POST | `/v1/flashcard/progress/client` | Client-side progress sync | `userSentenceRecord`, `userWordRecord` | Tier 2 |
| POST | `/v1/flashcard/cloze-test/results` | Submit cloze test results | `userSentenceRecord`, `userActivity` | Tier 2 |
| POST | `/v1/flashcard/sentence-ordering` | Submit sentence ordering result | `userSentenceRecord`, `userActivity` | Tier 2 |
| POST | `/v1/flashcard/word-ordering` | Submit word ordering result | `userWordRecord`, `userActivity` | Tier 2 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/flashcard/deck-id` | Find user's flashcard deck ID | `flashcardDeck` | Tier 2 |
| GET | `/flashcard/decks/[deckId]/due` | Get due flashcards for a deck | `flashcardDeck` | Tier 2 |
| GET,POST | `/flashcard/decks/[deckId]/sentences-for-cloze` | Get or generate cloze-test sentences | `flashcardDeck`, `article`, `user`, `userActivity`, `xPLogs` | Tier 2 |
| GET,POST | `/flashcard/decks/[deckId]/sentences-for-matching` | Get or generate matching sentences | `flashcardDeck`, `article`, `user`, `userActivity`, `xPLogs` | Tier 2 |
| GET,POST | `/flashcard/decks/[deckId]/sentences-for-ordering` | Get or generate sentence ordering | `flashcardDeck`, `article`, `user`, `userActivity`, `xPLogs` | Tier 2 |
| GET,POST | `/flashcard/decks/[deckId]/words-for-ordering` | Get or generate word ordering | `flashcardDeck`, `article`, `user`, `userActivity`, `xPLogs` | Tier 2 |
| POST | `/flashcard/cards/[cardId]/review` | Review (SRS) a flashcard | `flashcardCard` | Tier 2 |
| POST | `/flashcard/save/[id]` | Save article flashcards | `article` | Tier 2 |

---

### 2.7 AI / ASSISTANT

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| POST | `/v1/assistant/chatbot` | AI chatbot conversation | `article`, `user` | Tier 4 |
| POST | `/v1/assistant/chatbot-question` | Generate chatbot question from article | `article`, `user` | Tier 4 |
| POST | `/v1/assistant/translate` | Translate text via AI | _(none - AI only)_ | Tier 4 |
| POST | `/v1/assistant/translate/[article_id]` | Translate an article via AI | `article` | Tier 4 |
| POST | `/v1/assistant/wordlist` | Generate word list from article via AI | `article`, `user` | Tier 4 |
| POST | `/v1/assistant/stories-wordlist` | Generate word list from story via AI | `chapter` | Tier 4 |
| POST | `/v1/assistant/stories-wordlist/[storyId]/[chapterNumber]` | Generate word list for a specific chapter | `chapter` | Tier 4 |
| POST | `/v1/assistant/stories-translate/[storyId]` | Translate a story via AI | `story`, `chapter` | Tier 4 |
| POST | `/v1/assistant/stories-translate/[storyId]/[chapterNumber]` | Translate a chapter via AI | `chapter` | Tier 4 |
| POST | `/v1/assistant/ts-fsrs-test/flash-card/[id]` | Test FSRS spaced repetition algorithm | `userSentenceRecord`, `userWordRecord` | Tier 4 |
| GET,POST | `/v1/ai/insights/action` | Take action on an AI insight | `aIInsight` | Tier 4 |
| POST | `/v1/ai/insights/dismiss` | Dismiss an AI insight | `aIInsight` | Tier 4 |
| DELETE | `/v1/ai/insights/cache` | Clear AI insights cache | `aIInsightCache` | Tier 4 |
| GET,POST | `/v1/ai/insights/refresh` | Refresh AI insights (scheduled) | `aIInsight`, `aIInsightCache`, `classroom`, `classroomTeacher`, `license`, `user` | Tier 4 |
| GET | `/v1/ai/summary` | Get AI-generated summary | `aIInsight` | Tier 4 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| POST | `/assistant/lesson-chatbot` | AI chatbot for lesson content | _(AI service)_ | Tier 4 |

#### science-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| POST | `/ai/recommendations` | Get AI-recommended next lessons | `attempt` | Tier 4 |
| POST | `/ai/update-mastery` | Recalculate mastery scores via AI | `attempt`, `masteryRun` | Tier 4 |

---

### 2.8 STORIES

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/stories` | List stories | `story`, `chapter`, `userActivity` | Tier 2 |
| POST | `/v1/stories/generate` | Generate a new story via AI | `story`, `chapter`, `user` | Tier 4 |
| GET | `/v1/stories/[storyId]` | Get story by ID | `story`, `chapter` | Tier 2 |
| DELETE | `/v1/stories/[storyId]` | Delete a story | `story`, `chapter` | Tier 2 |
| GET | `/v1/stories/[storyId]/[chapterNumber]` | Get a specific chapter | `chapter`, `userActivity` | Tier 2 |
| POST | `/v1/stories/[storyId]/[chapterNumber]` | Create or update a chapter | `chapter` | Tier 2 |
| PUT | `/v1/stories/[storyId]/[chapterNumber]` | Update chapter content | `chapter` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/mcq` | List or create MCQ for chapter | `story`, `multipleChoiceQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/mcq/[questionNumber]` | Get or answer MCQ | `multipleChoiceQuestion`, `userActivity`, `xPLog` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/sa` | List or create SA for chapter | `story`, `shortAnswerQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/sa/[questionNumber]` | Get or answer SA | `shortAnswerQuestion`, `userActivity`, `xPLog` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/sa/[questionNumber]/rate` | Rate SA response | `shortAnswerQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/laq` | List or create LAQ for chapter | `story`, `longAnswerQuestion`, `userActivity` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/laq/[questionNumber]` | Get or answer LAQ | `longAnswerQuestion`, `userActivity`, `xPLog` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/laq/[questionNumber]/getxp` | Award XP for LAQ | `longAnswerQuestion`, `xPLog` | Tier 2 |
| GET,POST | `/v1/stories/[storyId]/[chapterNumber]/question/laq/[questionNumber]/feedback` | AI feedback on LAQ | `longAnswerQuestion`, `userActivity` | Tier 4 |

_(reading-advantage only — stories are not present in primary-advantage or science-advantage)_

---

### 2.9 GAMES

All game routes are in **reading-advantage** only. Each game follows the same pattern: `complete` (POST), `ranking` (GET), and `vocabulary`/`sentences` (GET).

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| POST | `/v1/games/castle-defense/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userSentenceRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/castle-defense/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/castle-defense/sentences` | Get sentences for game | `userSentenceRecord` | Tier 3 |
| POST | `/v1/games/dragon-flight/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userWordRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/dragon-flight/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/dragon-flight/vocabulary` | Get vocabulary for game | `userWordRecord` | Tier 3 |
| POST | `/v1/games/dragon-rider/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userWordRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/dragon-rider/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/dragon-rider/vocabulary` | Get vocabulary for game | `userWordRecord` | Tier 3 |
| POST | `/v1/games/enchanted-library/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userWordRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/enchanted-library/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/enchanted-library/vocabulary` | Get vocabulary for game | `userWordRecord` | Tier 3 |
| POST | `/v1/games/magic-defense/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userWordRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/magic-defense/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/magic-defense/vocabulary` | Get vocabulary for game | `userWordRecord` | Tier 3 |
| POST | `/v1/games/potion-rush/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userSentenceRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/potion-rush/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/potion-rush/sentences` | Get sentences for game | `userSentenceRecord` | Tier 3 |
| POST | `/v1/games/rpg-battle/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userWordRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/rpg-battle/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/rpg-battle/vocabulary` | Get vocabulary for game | `userWordRecord` | Tier 3 |
| POST | `/v1/games/rune-match/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userWordRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/rune-match/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/rune-match/vocabulary` | Get vocabulary for game | `userWordRecord` | Tier 3 |
| POST | `/v1/games/wizard-vs-zombie/complete` | Record game completion | `gameRanking`, `user`, `userActivity`, `userWordRecord`, `xPLog` | Tier 3 |
| GET | `/v1/games/wizard-vs-zombie/ranking` | Get game leaderboard | `gameRanking`, `user` | Tier 3 |
| GET | `/v1/games/wizard-vs-zombie/vocabulary` | Get vocabulary for game | `userWordRecord` | Tier 3 |

---

### 2.10 LESSONS

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/lesson/[userId]` | Get lessons for a user | `lessonRecord`, `userActivity`, `userSentenceRecord`, `userWordRecord`, `xPLog` | Tier 3 |
| POST | `/v1/lesson/[userId]` | Create a lesson record | `lessonRecord`, `userActivity` | Tier 3 |
| PUT | `/v1/lesson/[userId]` | Update a lesson record | `lessonRecord`, `userActivity` | Tier 3 |
| GET | `/v1/lesson/[userId]/quize-performance` | Get quiz performance data | `lessonRecord`, `userActivity` | Tier 3 |
| GET | `/v1/lesson/sentences/[articleId]` | Get lesson sentences for an article | `lessonRecord`, `userSentenceRecord` | Tier 3 |
| PUT | `/v1/lesson/sentences/update/[sentenceId]` | Update a lesson sentence | `userSentenceRecord` | Tier 3 |
| DELETE | `/v1/lesson/sentences/update/[sentenceId]` | Delete a lesson sentence | `userSentenceRecord` | Tier 3 |
| GET | `/v1/lesson/words/[articleId]` | Get lesson words for an article | `lessonRecord`, `userWordRecord` | Tier 3 |
| POST | `/v1/lesson/words/update/[wordId]` | Update a lesson word | `userWordRecord` | Tier 3 |
| DELETE | `/v1/lesson/words/update/[wordId]` | Delete a lesson word | `userWordRecord` | Tier 3 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/lessons/[articleId]` | Get lesson content | `article`, `userLessonProgress`, `articleActivityLog` | Tier 3 |
| POST | `/lessons/[articleId]` | Submit lesson activity | `userLessonProgress`, `articleActivityLog` | Tier 3 |
| GET | `/lessons/[articleId]/activity` | Get lesson activity data | `articleActivityLog` | Tier 3 |
| GET | `/lessons/[articleId]/progress` | Get lesson progress | `userLessonProgress` | Tier 3 |

---

### 2.11 METRICS / ANALYTICS

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/metrics` | Get overall metrics dashboard | `assignment`, `userActivity` | Tier 3 |
| GET | `/v1/metrics/activity` | Get activity metrics | `userActivity`, `classroomStudent` | Tier 3 |
| GET | `/v1/metrics/velocity` | Get reading velocity metrics | `classroomStudent`, `classroomTeacher`, `user` | Tier 3 |
| GET | `/v1/metrics/genres` | Get genre distribution metrics | `classroomStudent`, `lessonRecord`, `user` | Tier 3 |
| GET | `/v1/metrics/assignments` | Get assignment metrics | `assignment`, `studentAssignment` | Tier 3 |
| GET | `/v1/metrics/assignments/funnel` | Get assignment funnel metrics | `assignment`, `user` | Tier 3 |
| GET | `/v1/metrics/dashboard-summary` | Get dashboard summary metrics | `user`, `classroomStudent`, `assignment`, `userActivity` | Tier 3 |
| GET | `/v1/metrics/alignment` | Get curriculum alignment metrics | `assignment`, `classroom` | Tier 3 |
| GET | `/v1/metrics/genres` | Get genre reading metrics | `lessonRecord` | Tier 3 |
| GET,POST | `/v1/metrics/srs` | Get or refresh SRS metrics | `classroomStudent`, `user` | Tier 3 |
| POST | `/v1/metrics/srs/refresh` | Force refresh SRS metrics | `classroomStudent`, `user` | Tier 3 |
| GET,POST | `/v1/metrics/srs/actions` | Get or execute SRS quick actions | `classroomStudent`, `user` | Tier 3 |
| GET | `/v1/metrics/stream` | Server-sent events stream for live metrics | _(in-memory)_ | Tier 3 |
| POST | `/v1/metrics/cache` | Clear metrics cache | _(cache layer)_ | Tier 3 |
| GET | `/v1/metrics/system` | Get system-wide metrics | `article`, `school`, `user`, `userActivity` | Tier 3 |
| GET | `/v1/metrics/health` | Get system health metrics | `classroomStudent`, `user` | Tier 3 |

---

### 2.12 ADMIN / SYSTEM

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/admin/overview` | Get admin overview dashboard | `user`, `school`, `classroomStudent`, `userActivity` | Tier 3 |
| GET,POST | `/v1/admin/dashboard` | Get or update admin dashboard | `user`, `school`, `article`, `classroomStudent`, `userActivity` | Tier 3 |
| GET | `/v1/admin/alerts` | Get admin alerts | `user`, `classroomStudent`, `assignment` | Tier 3 |
| GET | `/v1/admin/segments` | Get user segments for admin | `user`, `license` | Tier 3 |
| GET | `/v1/admin/teacher-assignments` | Get teacher assignment overview | `assignment`, `classroomTeacher`, `user` | Tier 3 |
| GET | `/v1/admin/teacher-effectiveness` | Get teacher effectiveness metrics | `classroomTeacher`, `user`, `userActivity`, `xPLog` | Tier 3 |
| GET | `/v1/system/dashboard` | Get system dashboard | `article`, `user`, `school` | Tier 3 |
| GET | `/v1/system/dashboard/getArticleByTypeGenre` | Get articles by type and genre | `article` | Tier 3 |
| GET | `/v1/system/dashboard/xpBySchools` | Get XP aggregated by schools | `xPLog`, `school` | Tier 3 |
| GET | `/v1/system/licenses` | Get system license overview | `license`, `licenseOnUser` | Tier 3 |
| GET | `/v1/system/lowest-rated-articles` | Get lowest-rated articles | `article` | Tier 3 |
| GET,POST | `/v1/system/refresh-views` | Refresh materialized views (scheduled) | _(database views)_ | Tier 3 |
| GET,POST | `/v1/system/refresh-views/manual` | Manually refresh materialized views | _(database views)_ | Tier 3 |
| GET | `/v1/system/school-classrooms` | Get classrooms by school | `classroom`, `license`, `licenseOnUser`, `user`, `xPLog` | Tier 3 |
| GET | `/v1/system/school-xp` | Get XP by school | `xPLog`, `school` | Tier 3 |

#### science-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/teachers/dashboard` | Get teacher dashboard data | `class`, `lessonCompletion`, `standardMastery` | Tier 3 |
| GET | `/teachers/classes/[classId]/intervention-alerts` | Get intervention alerts for a class | `class`, `standardMastery` | Tier 3 |

---

### 2.13 GOALS

#### reading-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/goals` | List learning goals | `learningGoal`, `classroomStudent` | Tier 3 |
| POST | `/v1/goals` | Create a learning goal | `learningGoal` | Tier 3 |
| GET | `/v1/goals/[id]` | Get a goal by ID | `learningGoal` | Tier 3 |
| PATCH | `/v1/goals/[id]` | Update a goal | `learningGoal` | Tier 3 |
| DELETE | `/v1/goals/[id]` | Delete a goal | `learningGoal` | Tier 3 |
| POST | `/v1/goals/[id]/progress` | Update goal progress | `learningGoal`, `classroomStudent` | Tier 3 |
| GET | `/v1/goals/recommendations` | Get goal recommendations | `learningGoal`, `classroomStudent` | Tier 3 |
| GET | `/v1/goals/summary` | Get goals summary | `learningGoal` | Tier 3 |

---

### 2.14 REPORTS (XP, Activity, Telemetry)

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/xp` | Get XP overview | `xPLog` | Tier 2 |
| GET | `/v1/xp/[userId]` | Get XP for a specific user | `xPLog` | Tier 2 |
| GET | `/v1/activity` | Get all user activity | `userActivity`, `classroomStudent`, `lessonRecord`, `license`, `licenseOnUser` | Tier 2 |
| GET | `/v1/activity/all` | Get all activity (system-wide) | `userActivity` | Tier 2 |
| GET | `/v1/activity/active-users` | Get active user counts | `userActivity`, `license`, `licenseOnUser` | Tier 2 |
| GET | `/v1/activity/daily-active-users` | Get daily active user counts | `userActivity` | Tier 2 |
| POST | `/v1/activity/update-all-activity` | Recalculate all activity records | `userActivity`, `classroomStudent`, `lessonRecord`, `license`, `licenseOnUser` | Tier 2 |
| POST | `/v1/telemetry/dashboard` | Submit telemetry dashboard data | _(telemetry store)_ | Tier 3 |

---

### 2.15 LICENSES

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/licenses` | List licenses | `license`, `licenseOnUser`, `user` | Tier 1 |
| POST | `/v1/licenses` | Create a license | `license`, `xPLog` | Tier 1 |
| GET | `/v1/licenses/[id]` | Get license by ID | `license`, `licenseOnUser` | Tier 1 |
| PATCH | `/v1/licenses/[id]` | Update license | `license` | Tier 1 |
| DELETE | `/v1/licenses/[id]` | Delete license | `license` | Tier 1 |

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/licenses` | List licenses | `license` | Tier 1 |
| POST | `/licenses` | Create a license | `license` | Tier 1 |
| DELETE | `/licenses` | Delete licenses | `license` | Tier 1 |
| GET | `/licenses/[id]` | Get license by ID | `license` | Tier 1 |
| PUT | `/licenses/[id]` | Update license | `license` | Tier 1 |
| DELETE | `/licenses/[id]` | Delete license by ID | `license` | Tier 1 |

---

### 2.16 STUDENTS (top-level)

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/students` | List students (admin) | `classroomStudent`, `user`, `userActivity`, `xPLogs` | Tier 1 |
| POST | `/students` | Create a student | `user`, `role`, `userRole`, `classroomStudent` | Tier 1 |
| GET | `/students/[id]` | Get student by ID | `user`, `classroomStudent`, `userActivity` | Tier 1 |
| PUT | `/students/[id]` | Update student | `user`, `classroomStudent` | Tier 1 |
| DELETE | `/students/[id]` | Delete student | `user`, `classroomStudent`, `userRole` | Tier 1 |
| GET | `/students/[id]/assignments` | Get student assignments | `assignment`, `assignmentStudent` | Tier 1 |
| GET | `/students/leaderboard` | Get student leaderboard | `user`, `classroomStudent`, `xPLogs` | Tier 2 |

#### science-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/student/classes` | Get classes for current student | `class`, `classStudent` | Tier 1 |
| GET | `/students/me/gamification` | Get current student gamification data | `gamificationProfile`, `achievement` | Tier 3 |
| GET | `/students/[studentId]/gamification-profile` | Get student gamification profile | `gamificationProfile`, `achievement` | Tier 3 |
| GET | `/students/[studentId]/achievements` | Get student achievements | `achievement` | Tier 3 |
| GET | `/students/[studentId]/assignments` | Get student assignments | `assignment` | Tier 1 |
| GET | `/students/[studentId]/classes/[classId]/analytics` | Get student analytics for a class | `attempt`, `class`, `lesson`, `lessonCompletion` | Tier 3 |
| GET | `/students/[studentId]/lessons/[lessonId]/analytics` | Get student analytics for a lesson | `attempt`, `lesson`, `user` | Tier 3 |
| GET | `/students/[studentId]/lessons/[lessonId]/progress` | Get student lesson progress | `lesson`, `lessonCompletion`, `user` | Tier 3 |
| GET | `/students/[studentId]/mastery-profile` | Get student mastery profile | `masteryRun`, `standard`, `standardMastery`, `user` | Tier 3 |

---

### 2.17 TEACHERS (top-level)

#### primary-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/teachers` | List teachers (admin) | `classroomTeachers`, `user`, `role`, `userRole` | Tier 1 |
| POST | `/teachers` | Create a teacher | `user`, `role`, `userRole`, `classroomTeachers` | Tier 1 |
| GET | `/teachers/[id]` | Get teacher by ID | `user`, `classroomTeachers`, `userActivity` | Tier 1 |
| PUT | `/teachers/[id]` | Update teacher | `user`, `classroomTeachers` | Tier 1 |
| DELETE | `/teachers/[id]` | Delete teacher | `user`, `classroomTeachers`, `userRole` | Tier 1 |

#### reading-advantage

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/teacher/classes` | Get teacher's classes | `classroomTeacher`, `classroom`, `user` | Tier 1 |
| GET | `/v1/teacher/overview` | Get teacher overview | `classroomTeacher`, `user`, `classroomStudent`, `userActivity` | Tier 1 |
| GET | `/v1/teacher/class/[classroomId]/overview` | Get class overview for teacher | `classroomStudent`, `classroomTeacher`, `userActivity`, `xPLog` | Tier 1 |
| GET | `/v1/teacher/class/[classroomId]/accuracy` | Get class accuracy metrics | `classroomStudent`, `userActivity` | Tier 1 |
| GET | `/v1/teacher/class/[classroomId]/export` | Export class data (CSV) | `classroomStudent`, `classroomTeacher`, `studentAssignment`, `user` | Tier 3 |
| GET,POST | `/v1/teacher/classroom/[classroomId]/goals` | List or create goals for a classroom | `learningGoal`, `classroomStudent` | Tier 3 |
| DELETE,PATCH | `/v1/teacher/classroom/[classroomId]/goals/[goalId]` | Update or delete a goal | `learningGoal` | Tier 3 |

---

### 2.18 UPLOAD / CSV

#### primary-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| POST | `/upload/csv` | Upload CSV file to bulk-import users/classes | `user`, `role`, `userRole`, `classroom`, `classroomStudent`, `classroomTeachers` | Tier 3 |
| POST | `/upload/classes` | Upload class data | `user`, `role`, `userRole`, `classroom`, `classroomStudent`, `classroomTeachers` | Tier 3 |
| DELETE,POST | `/upload/csv/cleanup` | Clean up uploaded CSV files | _(file system)_ | Tier 3 |

---

### 2.19 DEMO

#### reading-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/demo/accounts` | Get demo account credentials | `user` | Tier 3 |
| POST | `/v1/demo/refresh` | Reset demo data | `user`, `userActivity`, `xPLog` | Tier 3 |
| GET | `/v1/demo/status` | Check demo environment status | `user`, `userActivity` | Tier 3 |

---

### 2.20 PASSAGE

#### reading-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/passage` | Get passages (with filters) | `article` | Tier 2 |
| GET | `/v1/passage/[articleId]` | Get passage by article ID | `article` | Tier 2 |
| POST | `/v1/passage/[articleId]` | Create a passage for an article | `article` | Tier 2 |
| DELETE | `/v1/passage/[articleId]` | Delete a passage | `article` | Tier 2 |

---

### 2.21 LEVEL TEST

#### reading-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/v1/level-test` | Get level test configuration | `user` | Tier 3 |
| POST | `/v1/level-test/chat` | Submit level test chat response (AI-graded) | `user`, `userActivity` | Tier 4 |

---

### 2.22 HEALTH

#### reading-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET,POST | `/v1/health/database` | Database health check (requires SYSTEM/ADMIN role) | _(connection test)_ | Tier 3 |

---

### 2.23 EMAIL

#### primary-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| POST | `/send` | Send email via Resend | _(email service)_ | Tier 3 |

---

### 2.24 SCHOOLS

#### primary-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/schools` | List schools | `school` | Tier 1 |
| POST | `/schools` | Create a school | `school` | Tier 1 |
| GET,POST | `/schools/ranking` | Get school ranking | `user`, `school` | Tier 2 |

---

### 2.25 DEBUG

#### primary-advantage (only)

| Method | Path | Description | Tables | Tier |
|--------|------|-------------|--------|------|
| GET | `/debug/auth` | Debug authentication state | `user` | Tier 3 |
| GET,POST | `/debug/init-roles` | Initialize required roles in database | `role`, `user` | Tier 3 |
| GET | `/debug/school` | Debug school data | `license`, `user` | Tier 3 |

---

## 3. Database Table Usage Summary

### 3.1 Most-Accessed Tables (across all apps)

| Table | Route Count | Apps Using It |
|-------|-------------|---------------|
| `user` | 95 | RA, PA, SA |
| `userActivity` | 55 | RA, PA, SA |
| `classroomStudent` / `classStudent` | 40 | RA, PA, SA |
| `article` | 38 | RA, PA |
| `classroom` / `class` | 35 | RA, PA, SA |
| `xPLog` / `xPLogs` | 30 | RA, PA |
| `assignment` | 22 | RA, PA, SA |
| `userWordRecord` | 20 | RA |
| `userSentenceRecord` | 18 | RA |
| `lessonRecord` | 15 | RA |
| `license` | 15 | RA, PA |
| `classroomTeacher` / `classroomTeachers` | 14 | RA, PA |
| `gameRanking` | 12 | RA |
| `licenseOnUser` | 10 | RA |
| `multipleChoiceQuestion` | 10 | RA, PA |
| `shortAnswerQuestion` | 9 | RA, PA |
| `longAnswerQuestion` | 9 | RA, PA |
| `studentAssignment` / `assignmentStudent` | 8 | RA, PA |
| `story` | 7 | RA |
| `chapter` | 7 | RA |
| `assignmentNotification` | 7 | RA |
| `lessonCompletion` | 6 | SA |
| `aIInsight` | 5 | RA |
| `flashcardDeck` | 5 | PA |
| `flashcardCard` | 3 | PA |
| `role` | 5 | PA |
| `userRole` | 5 | PA |
| `learningGoal` | 5 | RA |
| `school` | 5 | RA, PA |
| `verificationToken` | 1 | RA |
| `account` | 1 | SA |
| `gamificationProfile` | 3 | SA |
| `achievement` | 3 | SA |
| `attempt` | 4 | SA |
| `masteryRun` | 3 | SA |
| `standard` | 1 | SA |
| `standardMastery` | 3 | SA |
| `curriculumUnit` | 1 | SA |
| `lesson` (SA) | 10 | SA |
| `questionResponse` | 1 | SA |
| `schoolAdmins` | 3 | PA |
| `aIInsightCache` | 1 | RA |
| `leaderboard` | 1 | PA |
| `articleActivityLog` | 3 | PA |
| `userLessonProgress` | 3 | PA |

---

## 4. Migration Priority Recommendations

### Tier 1 Routes (Highest Priority -- Migrate First)

These 92 routes handle authentication, user management, classroom operations, and assignments. They serve as the foundation for all other functionality. Migration should prioritize:

1. **Auth routes** (13 routes) -- Must work flawlessly; use NextAuth adapter carefully
2. **User CRUD** (39 routes) -- Core identity; ensure multi-tenant scoping
3. **Classroom operations** (45 routes) -- Complex relational queries; test enrollment flows thoroughly
4. **Assignment management** (9 routes) -- Ties users, classrooms, and content together
5. **License management** (8 routes) -- Tenant boundary enforcement

### Tier 2 Routes (Second Priority)

These 37 routes handle content delivery and progress tracking:

1. **Article content** (26 routes) -- Complex content/question relationships
2. **Flashcard/SRS** (21 routes) -- Spaced repetition logic must be preserved
3. **Reports/XP** (9 routes) -- Aggregation queries may need optimization

### Tier 3 Routes (Third Priority)

These 132 routes are app-specific features that can be migrated independently:

1. **Games** (27 routes) -- Self-contained; can migrate one game at a time
2. **Admin/System** (14 routes) -- Internal tools; lower user impact
3. **Goals** (8 routes) -- Standalone feature
4. **Science curriculum** (16 routes) -- App-specific domain
5. **Demo/Debug/Upload** (9 routes) -- Utilities; not user-facing

### Tier 4 Routes (Final Priority)

These 33 routes involve AI and complex integrations:

1. **AI generation** (16 routes) -- External API dependencies; test thoroughly
2. **AI insights** (5 routes) -- Caching layer complexity
3. **Translation** (5 routes) -- Multi-language support
4. **Level test** (2 routes) -- AI-graded assessment
5. **Story generation** (3 routes) -- Content generation pipeline

---

## 5. Notes

- **reading-advantage** uses a `next-connect` router pattern with controller files in `apps/reading-advantage/server/controllers/`. The actual Prisma table access is in those controllers, not in the route files themselves.
- **primary-advantage** uses a mix of direct Prisma calls in route files and controller/model patterns in `apps/primary-advantage/server/`.
- **science-advantage** has all Prisma calls directly in the route files (no controller abstraction layer).
- All three apps currently use **Prisma** as the ORM. The architecture docs reference Drizzle as the target, indicating a planned migration.
- The `games/` domain (27 routes in reading-advantage) is highly repetitive -- each game follows an identical `complete/ranking/vocabulary` pattern. These could be consolidated into a parameterized route during migration.
- Assignment notification routes (7 in RA) and flashcard routes (15 in RA, 8 in PA) are cross-app candidates for shared domain functions.
