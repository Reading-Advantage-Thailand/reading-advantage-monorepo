# Behavior contract — primary_parity_class_books_20261011 (acceptance A1 to A5)

Template: `docs/runbooks/primary-behavior-contract-template.md`. Legacy revision `bfea121`.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| TCH-01 | Class book, lesson guide, Teacher Manual | extend, timing before the cutover | 2026-10-11 |
| TCH-02 | Dashboard book slot | extend, timing before the cutover | 2026-10-11 |

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Class page | TEACHER | Opens `/teacher/class-roster/<class>` | The roster and the sign-in panel. No book card. | `app/[locale]/teacher/class-roster/[classroomId]/page.tsx` |
| Printed QR link | STUDENT | Scans the Origins 3.2 lesson 1 QR (`/student/read/<articleId>`) | The reading page of the article | `app/[locale]/(student)/student/read/[articleId]/page.tsx` |
| Teacher dashboard | TEACHER | Opens `/teacher/dashboard` | No class book slot | none (no such file) |
| Teacher Manual | TEACHER | Opens `/teacher/manual` | Not found: the legacy app has no manual route | none (no such file) |
| Lesson guide, projector, rehearsal | TEACHER | n/a | Do not exist in the legacy app | none |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Book catalogue | tables `primary_book_series`, `primary_books`, `primary_book_lessons` | key, name, lesson count, article link, package | read | `class:read` | `packages/domain/src/primary-books/class-books.ts:427` |
| Teacher guide | table `primary_lesson_guides` | 13 steps for `en` and `th` | read | none (global text) | `packages/domain/src/primary-books/guides.ts` |
| Class book | table `primary_class_books` | class, book, mode, current lesson | read, write (assign, set current, mark taught) | `class:update`, class ownership | `class-books.ts:143,267,282` |
| Steps done | table `primary_class_book_lessons` | `steps_done`, `taught_at` | read, write | `class:update` | `class-books.ts:304` |
| Dashboard slot | the tables above | one row for each class book of the teacher's classes | read | `class:list`, school scope | `class-books.ts:225` |

Side effects: none for XP, email, files, or AI calls.

## 4. New target

- Drizzle tables: no schema change and no migration.
- Domain functions: `listCatalogueBooks`, `listClassBooks`, `getTeacherBookSlots`, `markStepDone`, `markLessonTaught`, `getClassBookPacing`, `getLessonGuide`, `resolveBookLesson` (Zod contracts in `class-book-contracts.ts`).
- Permission action for `assertCan`: `class:read`, `class:update`, `class:list`.
- TenantDB class: the book tables are global (catalogue); the class book tables use the `UNSCOPED_REASON` pattern with the school filter.
- AI adapter use: none.
- RPG skin components: `Panel`, `Plaque`, `RpgLink`, `Meter` (class book card and slot).
- Routes: `/teacher/class-roster/<class>`, `.../books/<classBook>`, `.../lessons/<n>`, `.../lessons/<n>/projector`, `.../progress`, `/teacher/dashboard`, `/teacher/manual`, `/b/<book>/<n>`.

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| The class page, dashboard, and manual have a book feature that legacy lacks | A new feature (triage "extend") | 2026-10-11 |
| The printed QR opens `/b/o3-2/1`, which redirects a student to the lesson flow of the linked article | Replaces `/student/read/<cuid>`; the app lesson flow has the workbook-first lock | 2026-10-11 |
| The student sees the "Read" link only when step 3 is open | Workbook-first lock (teacher-led mode) | by design of track `primary_teacher_books_lesson_support_20261003` |

## 6. Acceptance rows

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| CB-A1 | class page | class page | TEACHER | Book card first; assign form lists 5 books | `class-book-data-checks.sql` A1 | batch capture (orchestrator) |
| CB-A2 | class page | lesson 1 page (steps) | TEACHER | Guide, projector link, answer key; no "not linked" text | SQL A2 | batch capture (orchestrator) |
| CB-A3 | dashboard | dashboard | TEACHER | Slot shows "Lesson 1 of 14" and the next step | SQL A3 | batch capture (orchestrator) |
| CB-A4 | `/en/student/read/cmtyina5w000ps601n6htj9g3` | `/en/b/o3-2/1` | STUDENT | Lesson flow of the linked article opens | SQL A4 | batch capture (orchestrator) |
| CB-A5 | `/en/teacher/manual` | `/en/teacher/manual` | TEACHER | 5 how-to steps; 13 steps show the guide | SQL guides; browser check "manual ..." | batch capture (orchestrator) |

Run order: the S2/S6 browser check first (it assigns the book and leaves lesson 1 current), then the captures.
Class: `cmhwuko0p000ds60dha8z70ig` (the class of the matched teacher, as in the quick fixes pairs).

## 7. ETL and runbook changes

none in this phase. The browser check block "Teacher Manual claims (spec S6)" is part of `cutover-check.mjs`
(`MANUAL_CHECK=off` skips it). `primary_parity_rehearsal3_20261011` runs it after the catalogue build.
