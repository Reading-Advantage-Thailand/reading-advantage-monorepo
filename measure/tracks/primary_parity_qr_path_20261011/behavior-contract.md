# Behavior contract — primary_parity_qr_path_20261011 (acceptance A1 to A5)

Template: `docs/runbooks/primary-behavior-contract-template.md`. Legacy revision `bfea121`.
Legacy reference: the printed old QR codes. They print `https://primary.reading-advantage.com/student/read/<cuid>`
(example: `~/Desktop/Workbooks/primary/origins-3.1-a0/01-My New City Plane Trip _workbook.json`, field `article_url`).
The writing code prints `<article_url>/writing` (`~/Desktop/Workbooks/dashboard/lib/template-renderer.ts:127-131`).
Legacy has no `/b/` route.

## 1. Rows and owner decisions

| Row (triage ID) | Short name | Owner decision | Date |
| --- | --- | --- | --- |
| QR-01 | Reading QR code of a printed lesson | Workbooks decision D1, option B (`/b/<book>/<n>`) | 2026-10-01 |
| QR-02 | Writing QR code of a printed lesson | Same decision; the writing code is `<article_url>/writing` | 2026-10-01 |
| QR-03 | Teacher scans a code | Spec S3 (teacher goes to the lesson page of the class book) | 2026-10-12 |
| QR-04 | Printed URL with no locale | Spec S5 | 2026-10-12 |
| QR-05 | Cases that are not normal | Spec S4 (a clear page for each case) | 2026-10-12 |

The row names are local to this track. The triage JSON has no row for this track.

## 2. Legacy behavior

| Page or action | Roles | User does | App shows or does | Source (`file:line` at `bfea121`) |
| --- | --- | --- | --- | --- |
| Reading code, signed out | PUBLIC | Scans `/student/read/<cuid>` | The proxy sends the reader to `/auth/signin` with `callbackUrl=/student/read/<cuid>` (no locale) | `proxy.ts:193-210` |
| Reading code, signed in | STUDENT, TEACHER, ADMIN, SYSTEM | Scans the code | The article page: article, word list, quiz cards (MC, SA, LA). A teacher also sees the assign button. | `app/[locale]/(student)/student/read/[articleId]/page.tsx:41-49,143` |
| Reading code, no session on the page | any | Opens the page with no user | `redirect("/auth/signin")` with no return path | same file, line 44 |
| Writing code | any | Scans `/student/read/<cuid>/writing` | No such route in the legacy app: the generic not-found page. The folder `student/read/[articleId]/` holds only `page.tsx`, `loading.tsx`, `error.tsx`. | `app/[locale]/(student)/student/read/[articleId]/` (tree at `bfea121`) |
| Printed URL with no locale | any | Scans a code with no locale | The next-intl middleware redirects to a locale path | `proxy.ts` (matcher) |
| Unknown article id | any | Scans a wrong code | The article model finds no row; the page shows an error state | `server/models/articleModel` via `page.tsx:49` |
| Tutor family | any | Scans a code | No special path. The code opens Primary. | none |

## 3. Data read and written

| Item | Kind | Columns or detail | Read or write | Permission check | Source |
| --- | --- | --- | --- | --- | --- |
| Article | legacy table `article` | cuid id, text, questions | read | session user (`getCurrentUser`) | `page.tsx:41-49` |
| Book lesson | new table `primary_book_lessons` | `key`, `number`, `title`, `article_id`, `approved`, `legacy_article_id` | read | none for the landing text (book name, title, lesson count only) | new: `packages/domain/src/primary-books/lesson-support.ts` |
| Book | new table `primary_books` | `key`, `name`, `lesson_count` | read | none | same |
| Class book | new table `primary_class_books` | class, book, current lesson | read (teacher branch) | `class:read`, `user.schoolId` | `findTeacherClassBook` in `lesson-support.ts` |
| Return path | query `callbackUrl` | a same-site book path only | read | allow-list `bookCallbackPath` | `lib/safe-callback-path.ts` |

Side effects: one structured log event for each case that is not normal (case name, book key, number; no user name). No XP, email, file, or AI call.

## 4. New target

- Drizzle tables: no schema change and no migration.
- Domain functions (Zod input and output): the book link lookup in `packages/domain/src/primary-books/` (defined in Phase S4 of the plan); `resolveBookLesson`.
- Permission action for `assertCan`: `class:read` (teacher branch).
- TenantDB class: the book tables are global; the lookup uses `unscoped` with a reason, as `resolveBookLesson` does.
- AI adapter use: none.
- RPG skin components: `Scene`, `Panel`, `Plaque`, `RpgLink`, `RpgButton`.
- Routes (with the locale): `/<locale>/b/<book>/<n>`, `/<locale>/b/<book>/<n>/writing`, redirects to `/student/lesson/<article>`, `/student/read/<article>`, `/teacher/class-roster/<class>/lessons/<n>`.
  The printed URL has no locale: `/b/<book>/<n>` gets one redirect to `/th/b/<book>/<n>` (or the Accept-Language locale).

## 5. Differences on purpose

| Difference | Reason | Owner decision and date |
| --- | --- | --- |
| A signed-out reader sees a landing with two choices, not the sign-in page | Tutor Advantage families scan the same code (F-10); no automatic signal exists | default of Member Question 3, 2026-10-12 |
| The Tutor choice shows only when `TUTOR_LESSON_URL_TEMPLATE` exists | Tutor route pattern is not decided | default of Member Question 1, 2026-10-12 |
| The reading code opens the lesson flow for a student; the writing code opens the article page | Workbook-first lesson flow; the article page holds the writing question | default of Member Question 2, 2026-10-12 |
| The writing code works (legacy: not found) | The old printed `/writing` suffix had no target | spec S3 |
| Book path works after sign-in for a student (legacy callback was dropped on the student tab) | Spec S1 | 2026-10-12 |
| The text "This lesson is not ready yet. Ask your teacher." | default of Member Question 4 | 2026-10-12 |
| Old printed codes (`/student/read/<cuid>`) keep their legacy behavior through the cutover resolver D3 | Out of scope (spec) | n/a |

## 6. Acceptance rows

The pair ids are in `acceptance-pairs.json`. Legacy path in each pair: the raw legacy article id of Origins 3.2 lesson 1
(`cmtyina5w000ps601n6htj9g3`). The new path uses the book key and number, so it needs no `{map:...}` placeholder.

| Pair id | Legacy page | New page | Role | Observable behavior | Data check | Result |
| --- | --- | --- | --- | --- | --- | --- |
| QR-A1 | `/en/student/read/<cuid>` | `/en/b/o3-2/1` | PUBLIC | Landing with the book name, the lesson title, the school choice | `qr-path-data-checks.sql` (1, 2) | batch 2 |
| QR-A1b | same | same, after the school choice | PUBLIC | Sign-in page keeps `callbackUrl=/en/b/o3-2/1` | none | batch 2 |
| QR-A1c | same | same | STUDENT | Lesson flow of the linked article | check 2, 3 | batch 2 |
| QR-A2 | `/en/student/read/<cuid>/writing` | `/en/b/o3-2/1/writing` | PUBLIC | Landing with "Writing task" | check 2 | batch 2 |
| QR-A2b | `/en/student/read/<cuid>` | `/en/b/o3-2/1/writing` | STUDENT | Article page with the writing question | check 2, 3 | batch 2 |
| QR-A3 | `/en/student/read/<cuid>` | `/en/b/o3-2/1` | TEACHER | Lesson page of the class that has the book | check 6 | batch 2 |
| QR-A4 | `/th/student/read/<cuid>` | `/th/b/o3-2/1` | PUBLIC | Locale path loads; unprefixed URL: one redirect (curl in `acceptance.md`) | none | batch 2 |
| QR-A5a | unknown article id | `/en/b/zz/1` | STUDENT | "Book not known" page, status below 500 | check 5 | batch 2 |
| QR-A5b | unknown article id | `/en/b/o3-2/999` | STUDENT | "No such lesson" page with "Lessons 1 to 14", status below 500 | check 4 | batch 2 |

## 7. ETL and runbook changes

Command sheet row C13 and spec section 10 (rehearsal 3 member): see `runbook-changes.md` in this folder.
The cutover check `scripts/primary-parity/cutover-check.mjs` has the block "QR path". No ETL step and no backfill change.
