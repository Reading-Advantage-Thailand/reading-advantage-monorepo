# Continued app review

The recorded logs contain 213 diagnostics across 85 files: Primary has 131 across 43 files; Reading has 82 across 42 files.
I inspected each reported source location. I grouped related diagnostics below without excluding existing files.
This pass identifies repair assignments. It does not claim complete caller validation or runtime verification for every group.

## Urgent confirmed defects

1. Primary classroom authorization uses lowercase roles against uppercase session roles.
   `server/controllers/classroomController.ts:65,250,300,346,384` contains the mismatches.
   `lib/session.ts` returns the shared session user directly.
   Classroom reads accept any session. Class code generation accepts STUDENT sessions and updates by classroom identifier alone.
   Enrollment computes a teacher identifier but never uses it.
   Correcting letter case alone leaves missing authorization checks.
   Enforce school and teacher ownership before reads, enrollment, unenrollment, available-student queries, and code generation.
   Verify denied roles and foreign classrooms produce zero writes.
2. Primary CSV imports shadow the roles table with `const roles = await db.select().from(roles)` at line 728.
   Student and teacher imports throw before creating their role map.
   Both upload routes also query `users.id` with a school identifier. Use the schools table.
3. Primary completion components call undefined `update` and `session` after successful writes.
   These calls throw after persistence and can prevent refresh or completion feedback.
   Reuse the current auth-client refresh API. School updates must reload authoritative roles rather than assigning client roles.
4. Primary article pages call `flatMap` on one flashcard row.
   The page contract and returned database shape disagree. Normalize the result and handle absent flashcards.
5. Both apps omit required database fields in existing writers.
   Primary article writes omit `content`. Multiple-choice writes omit numeric `correctAnswer` in both apps.
   Assignment writers omit `type`; Reading also omits `teacherId`.
   Primary classroom writers omit `teacherId`. Lesson progress writers omit `lessonId`.
   Primary user writers omit required identity fields.
   Use existing creation contracts and validate the source values. Avoid defaults that invent identifiers or answers.

## Complete diagnostic inventory

Paths in each table are relative to the named app. Counts refer to the recorded logs.
The listed next action includes unresolved contract investigation where needed.

### Primary Advantage

| File | Lines | Count | Next action |
| --- | --- | --- | --- |
| `actions/test.ts` | 19, 118 | 3 | Validate article passage. Pass the stored image description as a string. |
| `app/[locale]/(student)/student/read/[articleId]/page.tsx` | 88, 100, 101, 104, 108, 109, 112 | 7 | Reconcile the returned database shape with the component contract. Verify nullable values and empty collections. |
| `app/[locale]/(student)/student/read/page.tsx` | 164 | 1 | Reconcile the returned database shape with the component contract. Verify nullable values and empty collections. |
| `app/[locale]/(student)/student/reports/page.tsx` | 31, 35, 39, 43 | 4 | Reconcile the returned database shape with the component contract. Verify nullable values and empty collections. |
| `app/[locale]/(student)/student/sentences/page.tsx` | 54 | 1 | Reconcile the returned database shape with the component contract. Verify nullable values and empty collections. |
| `app/[locale]/teacher/student-progress/[id]/page.tsx` | 36, 40, 44, 48 | 4 | Reconcile the returned database shape with the component contract. Verify nullable values and empty collections. |
| `app/api/upload/classes/route.ts` | 179, 728, 729 | 4 | Rename the roles result. Query schools for school details. Verify student and teacher CSV imports. |
| `app/api/upload/csv/route.ts` | 59 | 1 | Query schools for school details. Verify school-scoped CSV imports. |
| `components/articles/questions/mc-question-card.tsx` | 29, 107 | 2 | Use the existing application activity constants. A Drizzle enum has no MC_QUESTION property. |
| `components/articles/questions/sa-question-content.tsx` | 114, 116 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/dashboard/user-reading-chart.tsx` | 54 | 1 | Use the existing application activity constants. Verify ARTICLE_READ filtering. |
| `components/lesson/games/lesson-sentence-cloze-test.tsx` | 524, 526 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/games/lesson-sentence-flashcard.tsx` | 230, 232 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/games/lesson-sentence-matching.tsx` | 217, 219 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/games/lesson-sentence-order.tsx` | 304, 306 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/games/lesson-vocabulary-flashcard-card.tsx` | 236, 238 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/games/lesson-vocabulary-matching.tsx` | 215, 217 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/pratice/lesson-task-mcq.tsx` | 208, 210 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/pratice/lesson-task-saq.tsx` | 101, 103 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/lesson/task/task-lesson-summary.tsx` | 80, 82 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/nav/user-account-nav.tsx` | 106, 107, 108, 115, 122, 144 | 7 | Use uppercase session roles. Verify every role-specific navigation link. |
| `components/pratice/cloze-test-game.tsx` | 522, 524 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/pratice/matching-game.tsx` | 247, 249 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/pratice/order-sentences-game.tsx` | 298, 300 | 2 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/school/school-detail.tsx` | 124, 125, 126 | 3 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/school/school-profile-form.tsx` | 107, 108, 109 | 3 | Replace undefined update/session calls with the existing authoritative session refresh API. |
| `components/shared/app-layout.tsx` | 47, 49, 80 | 3 | Use uppercase STUDENT. Handle a missing school before the leaderboard query. |
| `components/student-assignment-table.tsx` | 33, 69, 312, 314, 327 | 5 | Use studentAssignments and its existing status contract. Remove the nonexistent assignmentStudents import. |
| `components/system/edit-license-form.tsx` | 112, 114, 116, 193, 196, 213, 239, 277, 308, 330, 373 | 11 | Normalize nullable license defaults. Then reassess cascading React Hook Form generic errors. |
| `components/teacher/my-students.tsx` | 192 | 1 | Compare the session role with SYSTEM. |
| `lib/test.ts` | 6 | 1 | Use an existing storage operation or remove the obsolete unused probe after caller verification. |
| `server/controllers/classroomController.ts` | 65, 189, 194, 198, 250, 300, 346, 384 | 9 | Enforce role, school, and ownership checks. Correct uppercase role comparisons. |
| `server/models/articleModel.ts` | 182, 228, 643, 743, 752, 754, 774 | 7 | Supply content and validated correctAnswer. Guard nullable passage and image fields before generation. |
| `server/models/assignmentModel.ts` | 76, 386 | 2 | Supply assignment type and the actual lesson identifier. Verify progress creation. |
| `server/models/classroomModel.ts` | 75, 91, 102, 172, 885 | 5 | Supply teacherId. Read nested student.users.id and flat teacherRows[0] correctly. Enforce access before mutation. |
| `server/models/lessonModel.ts` | 105 | 1 | Resolve the actual lessonId before progress insertion. Verify new and existing progress. |
| `server/models/studentModel.ts` | 74, 199, 315, 401, 552, 596 | 6 | Reject missing tenant identifiers before queries. Use the existing user creation contract for required identity fields. |
| `server/models/teacherModel.ts` | 159, 280, 374, 429, 531 | 5 | Normalize nullable presentation fields and numeric grades. Use the existing user creation contract. |
| `server/models/userModel.ts` | 51 | 1 | Use the existing user creation contract for required identity fields. |
| `server/utils/assistant.ts` | 52, 116 | 2 | Handle missing cefrLevel before calling replace. |
| `server/utils/genaretors/image-generator.ts` | 4, 5, 8 | 3 | Use the existing AI adapter. The quarantine exports createVertex, not vertex or the imported error classes. |
| `server/utils/genaretors/sentence-translator.ts` | 149 | 1 | Normalize or reject missing CEFR input according to the translator contract. |
| `server/utils/genaretors/story-generator.ts` | 50 | 1 | Use the installed SDK output-token setting through the existing adapter. |

### Reading Advantage

| File | Lines | Count | Next action |
| --- | --- | --- | --- |
| `__test__/security/rbac.test.ts` | 77, 106, 139, 166, 199, 230, 261, 294, 323, 354, 385 | 11 | Add the required username to session fixtures. Preserve role and tenant denial cases. |
| `__tests__/controllers/zod-validation-red.test.ts` | 103, 165, 193 | 3 | Use NextRequest constructor input types. Supply the required handler context. |
| `__tests__/host-proof-game-client.test.tsx` | 40 | 1 | Type the mock parameter tuple consistently with the wrapped function. |
| `app/[locale]/(student)/student/dashboard/page.tsx` | 28, 30 | 2 | Normalize nullable session level and XP. Reports must use display_name rather than name. |
| `app/[locale]/(student)/student/read/[articleId]/page.tsx` | 164 | 1 | Normalize nullable session level and XP. Reports must use display_name rather than name. |
| `app/[locale]/(student)/student/read/page.tsx` | 25 | 1 | Normalize nullable session level and XP. Reports must use display_name rather than name. |
| `app/[locale]/(student)/student/reports/page.tsx` | 26, 28, 30 | 3 | Normalize nullable session level and XP. Reports must use display_name rather than name. |
| `app/[locale]/(student)/student/stories/[storyId]/[chapterNumber]/page.tsx` | 81 | 1 | Normalize nullable session level and XP. Reports must use display_name rather than name. |
| `app/[locale]/(student)/student/stories/page.tsx` | 25 | 1 | Normalize nullable session level and XP. Reports must use display_name rather than name. |
| `app/[locale]/(system)/system/license/create-license-form.tsx` | 75 | 1 | Reconcile the license service contract with the submitted legacy field names. |
| `app/api/v1/classroom/oauth2/classroom/courses/[courseId]/route.ts` | 71, 73, 79, 112, 114, 120 | 6 | Handle omitted Google students and missing classroom documents. Verify the legacy database adapter before retaining this route. |
| `components/dashboard/teacher-effectiveness.tsx` | 189, 190 | 2 | Read the teacher record from the scatter payload. Validate teacherId before invoking the callback. |
| `components/flash-card.tsx` | 9 | 1 | Use native crypto.randomUUID for transient identifiers after confirming existing usage requirements. |
| `components/lesson/lesson-sentense-flash-card.tsx` | 8 | 1 | Use native crypto.randomUUID for transient identifiers after confirming existing usage requirements. |
| `components/lesson/lesson-vocabulary-flash-card.tsx` | 9 | 1 | Use native crypto.randomUUID for transient identifiers after confirming existing usage requirements. |
| `components/lesson/phases/phase1-introduction.tsx` | 37 | 1 | Validate the locale against the existing supported locale list. |
| `components/practic/quote-item.tsx` | 147 | 1 | Align drag style types with the installed React CSS types. Verify actual style incompatibility before casting. |
| `components/questions/laq-question-card.tsx` | 363 | 1 | Validate the locale before indexing feedbackLanguage. |
| `components/select.tsx` | 133, 138, 139 | 3 | Use string interpolation or existing rich translation syntax. Plain translations reject JSX values. |
| `components/shared/app-layout.tsx` | 88 | 1 | Normalize nullable XP and level at the session presentation boundary. |
| `components/stories-chapter-question/laq-question-card.tsx` | 341 | 1 | Validate the locale before indexing feedbackLanguage. |
| `components/stories-select.tsx` | 223, 228, 229 | 3 | Use string interpolation or existing rich translation syntax. Plain translations reject JSX values. |
| `components/ui/calendar-heatmap.tsx` | 148 | 1 | Use the installed DayPicker component API instead of removed IconLeft and IconRight fields. |
| `components/ui/calendar.tsx` | 32, 34, 43 | 3 | Narrow DayPicker mode before reading onSelect. Preserve single and range selection contracts. |
| `components/vocabulary/tab-flash-card.tsx` | 9 | 1 | Use native crypto.randomUUID for transient identifiers after confirming existing usage requirements. |
| `i18n/routing.ts` | 11 | 1 | Import useLocale from next-intl. createNavigation does not return useLocale. |
| `lib/cache/fallback-queries.ts` | 133, 237 | 2 | Normalize SQL and fallback results to the same row-array contract. Avoid requiring postgres metadata on plain arrays. |
| `lib/host-proof-config.test.ts` | 11, 17 | 2 | Replace the environment object through the test framework. Restore absent variables by deletion. |
| `lib/pagination/smart-paginator.ts` | 22 | 1 | Import SQL from drizzle-orm or use the existing database type export. |
| `scripts/seed/demo-seed.ts` | 198 | 1 | Use the persisted role contract. USER is absent from the database enum. |
| `scripts/seed/seed.ts` | 461 | 1 | Supply assignment type and the actual teacherId. |
| `server/controllers/assignment-controller.ts` | 384, 959 | 2 | Supply assignment type and teacherId. Handle nullable articleId in assignment metrics. |
| `server/controllers/generator-controller.ts` | 462, 917, 1399 | 3 | Convert generated answers to validated numeric correctAnswer values in all three writers. |
| `server/controllers/genre-controller.ts` | 368 | 1 | Use the persisted role contract. USER is absent from the database enum. |
| `server/controllers/metrics-controller.ts` | 297 | 1 | Handle assignments without an article in the metrics contract. |
| `server/controllers/student-dashboard-controller.ts` | 114 | 1 | Represent or normalize absent email according to the response contract. |
| `server/controllers/teacher-assignment-controller.ts` | 131, 154 | 2 | Represent or normalize absent teacher emails in both result paths. |
| `server/controllers/teacher-dashboard-controller.ts` | 128 | 1 | Represent or normalize absent email according to the response contract. |
| `server/controllers/validator-controller.ts` | 112, 231, 242 | 3 | Inspect the legacy Firestore replacement before repairing types. Snapshot documents and article data are unusable under its contract. |
| `server/models/license.ts` | 48 | 1 | Reconcile legacy license fields with the current License contract and service writes. |
| `server/services/ai-insight-service.ts` | 151, 271, 371, 445, 1138 | 5 | Replace obsolete maxTokens settings through the existing adapter in all five calls. |
| `server/utils/generators/audio-generator.ts` | 17 | 2 | Import existing helpers from @reading-advantage/utils/ffmpeg-process. The root export omits them. |

## Coverage still required

The earlier report checked selected routes and 35 focused tests. It did not exercise these important flows.
These are review assignments, not confirmed defects.

| App | Required deeper evaluation |
| --- | --- |
| accounting | Approval transitions, concurrent decisions, attachment authorization, replacement cleanup, export tenant isolation, and actual database constraints. |
| accounts | OIDC authorization and token exchange, redirect validation, employee role changes, session revocation, and disabled accounts. |
| activity-vinext-fixture | Render and complete the tutorial. Verify asset loading and repeated mount cleanup. |
| advantage-games | Content selection, start-to-completion flow, completion replay, session expiry, XP persistence, and each changed cartridge host. |
| codecamp-advantage | Enrollment, mastery persistence, practice submission, tutor authorization, GitHub callbacks, and company session expiry. |
| marketing | Media uploads, video generation jobs, project ownership, artifact download, cancellation, and provider failures. |
| primary-advantage | Classroom authorization, CSV imports, user creation, assignment creation, lesson completion, reports, and license changes. |
| reading-advantage | Assignment creation, article generation, quiz persistence, story completion, flashcard scheduling, calendar selection, and license creation. |
| sales-advantage | Consent withdrawal, recording deletion, retention execution, attempt ownership, provider retries, and mastery persistence. |
| science-advantage | Lesson completion, assessment scoring, class membership, assignments, impersonation exit, and report isolation. |
| www-reading-advantage | Contact submission, locale redirects, missing content, sitemap generation, build output, and external-link handling. |

## Evidence and limits

I read root instructions, the Measure skill, project workflow, track specification, plan, and both earlier app reviews.
The graph query for getCurrentUser returned ambiguous app symbols. I checked current source directly.
I inspected source around every recorded diagnostic. Shared database schemas confirm required content, teacherId, username, and displayUsername fields.
The utils package exports ffmpeg helpers through its existing subpath.
The AI quarantine exports createVertex and omits the three imported Primary symbols.

Git status showed no changes in the urgent classroom controller or either CSV route when inspected.
The workspace contains extensive existing changes. None received an automatic scope exclusion.
I made no application edits and ran no runtime tests during this pass.
Further caller checks remain necessary for the schema, legacy Firestore, license, report, and form groups before implementation.
The orchestrator requested this report early to release the agent slot for urgent repairs.

## Orchestrator correction

The current shared auth provider exposes login and logout only. It has no session refresh method.
The earlier recommendation to reuse an existing refresh API was incorrect.
The Primary UI repair must evaluate server refresh behavior and add only the missing behavior required by current callers.
A new refresh method must reject stale responses after logout or a newer authentication action.
