# Spec: QR code path for printed books (/b/<book>/<n>)

Track ID: `primary_parity_qr_path_20261011`
Type: feature (story-shaped spec)
Source: Workbooks decision D1, option B (decided 2026-10-01): the route must be live by 2026-11-10.

## Overview

Printed Origins 3.2, Quest 4, and the insert print a stable URL `https://primary.reading-advantage.com/b/<book>/<n>`.
Each printed lesson has two QR codes: a reading code and a writing code. The server must send the reader to the right lesson.
The route `/b/<book>/<n>` exists (feature FR-16 of the books track). It does the happy path only.

This track finds each gap between that route and the printed-book job, and closes it.
A reader who is signed out must come back to the same lesson after sign-in.
The writing code needs a target. A Tutor Advantage family needs a way to reach Tutor.
Every case that is not normal needs a clear page. The track adds one go/no-go check.

**Sprint goal:** A reader who scans a printed D1-B QR code, reading or writing, reaches the right lesson after sign-in, or sees a clear page that says what to do.

## Track Set

This track is member 4 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: primary_parity_class_books_20261011. The shared decisions and the start gate in the set overview apply to this track.

## Verified Facts (2026-10-12, integration `ca8869cea`)

Paths are in `apps/primary-advantage` unless stated.

- F-1. **What the book prints.** The Workbooks renderer prints the reading code from `lesson.article_url`
  (`~/Desktop/Workbooks/dashboard/lib/template-renderer.ts:119-121`). It prints the writing code from
  `writing_practice_url`, and when that is empty it prints `<article_url>/writing` (lines 127-131). Both
  fields are optional (`dashboard/lib/workbook-schema.ts:87,106`). So a D1-B book needs only
  `article_url = https://primary.reading-advantage.com/b/<book>/<n>`. The writing URL is then `/b/<book>/<n>/writing`.
  Old books print `/student/read/<articleId>` and `.../writing` (plan D1, `docs/content-plans/primary-origins-3.2-plan.md:120`).
- F-2. **Old books.** The cutover resolver D3 handles old ids (`docs/deployment/primary-cutover-migration-spec.md:70`).
  `app/[locale]/(student)/student/read/[articleId]/page.tsx:78-84` (the `isUuid` check is line 79) redirects a non-UUID id to the migrated article. The `/writing` page
  redirects to the article page (`.../read/[articleId]/writing/page.tsx:9-11`), because the article page holds the writing question.
- F-3. **The current route.** `app/[locale]/b/[book]/[n]/page.tsx`:
  - a bad number gives `notFound()` (line 17); an unknown lesson gives `notFound()` (line 19);
  - a signed-out reader goes to `/auth/signin` with no return path (line 21);
  - a student goes to `/student/lesson/<articleId>?type=article`, or to `/student/home` when the lesson has no article or is not approved (lines 22-24);
  - any other role goes to the lesson page of the first class that has the book, or to `/teacher/my-classes` (lines 25-26).
  The tests assert these results (`__tests__/page.test.tsx:31-62`). There is no `/writing` child route.
- F-4. **The resolver.** `resolveBookLesson` returns one lesson row or null (`packages/domain/src/primary-books/lesson-support.ts:122-132`).
  Null means an unknown book, or a lesson number that is not in the catalogue. The caller cannot tell the two apart.
  The book keys are `o1`, `o2`, `o3-1`, `o3-2`, `q4` (`packages/domain/src/primary-books/mapping.ts:9-15`).
  `approved` is a column of `primary_book_lessons` (`packages/db/src/schema/primary-books.ts:56`).
- F-5. **Proxy and locale.** `proxy.ts` runs the next-intl middleware on every path except api, `_next`, and any path with a dot
  (matcher, lines 96-97). The routing has `defaultLocale: "th"` and no `localePrefix` setting (`i18n/routing.ts:3-9`), so a path with no locale gets a redirect to a locale path.
  A test proves this for `/` only (`lib/__tests__/default-locale.test.ts:36-38`: "sends a visitor without a locale in the path to /th"). No test covers `/b/...`. A book key has a hyphen and no dot, so the matcher includes it.
  The proxy computes `locale` as the first path segment (line 16). For `/b/o3-2/5` that value is `b`. The value is used only in the sign-in and protected branches (lines 20-53, 59-86), which a `/b/` path does not enter.
- F-6. **No protection, so no return path.** `/b` is not in `protectedRoutes` (`lib/route-policies.ts:14-22`). For a protected path the proxy sets
  `callbackUrl` (`proxy.ts:69-70`). For `/b/...` nothing sets it, and the page redirect in F-3 sets none. The old `/student/read/...` QR codes work because `/student` is protected.
- F-7. **Sign-in return path.** `safeCallbackPath` keeps only a same-site path that starts with one `/`, has no `//` and no backslash, and removes the locale (`lib/safe-callback-path.ts:11-16`).
  The staff form uses it and goes to the path after sign-in (`components/auth/teacher-signin-form.tsx:33,41-43`; it also runs after the forced password change, line 80).
  The student forms (class code, picture card, password) use `useEnterAfterSignIn` (`components/student-login/code-sign-in.tsx:156,176`, `card-sign-in.tsx:43`, `password-sign-in.tsx:49`).
  That hook accepts only a path under `/student` (`lib/safe-callback-path.ts:24-27`; `components/student-login/use-student-home.ts:24`). So `/b/o3-2/5` as a callback is dropped for a student, who lands on the student home.
  A staff user who signs in on the student tab goes to `/auth/signin` and the proxy sends the user home (`password-sign-in.tsx:49`).
- F-8. **Roles.** `ROLES` has `INTERN`, `STUDENT`, `TEACHER`, `ADMIN`, `SYSTEM`, `SALES_REP`, `SALES_ADMIN` (`packages/auth/src/roles.ts:2-8`). Page code 25-26 treats every non-student as a teacher.
  `findTeacherClassBook` needs `class:read`, needs `user.schoolId`, and the page swallows its error (`lesson-support.ts:140-141`; `page.tsx:25`). A SYSTEM user has no `schoolId`, so the result is the class list with no reason shown.
- F-9. **Tutor side.** Tutor has no `/b/` route. Spec T8 says Tutor "needs one route in the student LIFF" such as `/b/<bookCode>/<lessonNumber>`, and "a way for the Primary server to send non-Primary visitors to it (a LINE LIFF link)"; details wait for the decision
  (`~/Desktop/tutor-advantage/docs/specs/2026-10-tutor-catalogue-and-platform-spec.md:113-117`). The LIFF id is an environment value (`apps/student-liff/src/components/providers/LiffProvider.tsx:82`).
  Tutor spec T3 takes the article id from the last path segment of `article_url` (line 63). A D1-B URL ends in a lesson number, so T3 breaks for these books.
- F-10. **No automatic signal.** Nothing in the request tells Primary that a reader is a Tutor family. A signed-out scan has no cookie, no account, and no school. The route needs the reader to choose.
- F-11. **Not found page.** The catch-all page is a generic 404 with a "go back" button and no RPG skin (`app/[locale]/[...not-found]/page.tsx:1-40`). The unauthorized page is plain text (`app/[locale]/unauthorized/page.tsx:7-17`).
  The article page has an RPG not-found state with a link back (`.../read/[articleId]/page.tsx:89-103`).
- F-12. **Go/no-go.** Command sheet row C13 has the agent open the sign-in page and one article by its old URL, and the owner scan printed codes
  (`measure/tracks/primary_legacy_data_migration_20261004/cutover-commands-20261011.md:52`). It has no `/b/` check. The spec §10 lists QR scans (`docs/deployment/primary-cutover-migration-spec.md:163-164`).
- F-13. **Logger.** `lib/observability/logger.ts:51-77` exports `logger.info|warn|error(event, payload)`.

## Stories

### Story S1: Return to the same lesson after sign-in
**As a** student or teacher who scans a printed code while signed out
**I want** to come back to the same lesson after I sign in
**So that** I do not search for the lesson by hand

**Acceptance Criteria:**
- Given a signed-out reader and `/th/b/o3-2/5`, When the page loads, Then the reader goes to `/th/auth/signin?callbackUrl=/th/b/o3-2/5` (the locale form that `proxy.ts:70` already uses).
- Given the same link with `/writing` at the end, When the page loads, Then the callback keeps `/writing`.
- Given a student who signs in with the class code, the picture card, or the password, When the sign-in succeeds, Then the student goes to the callback path and then to the lesson (F-7).
- Given a teacher or an admin who signs in on the staff tab, When the sign-in succeeds, Then the user goes to the callback path. This holds after a forced password change too.
- Given a callback that is not a book path for a student (`//evil.example`, `https://x`, `/b/..%2f..`, `/teacher/dashboard`), When the student signs in, Then the student goes to the student home.
- Given a staff user who signs in on the student tab, When the sign-in succeeds, Then the proxy sends the user to the role home, as today.

**Estimate:** M
**Priority:** Must

### Story S2: Signed-out landing for Primary and Tutor readers
**As a** reader who scans a printed code
**I want** a page that asks which app I use
**So that** I reach Primary Advantage or Tutor Advantage and not a sign-in page that is wrong for me

**Acceptance Criteria:**
- Given a signed-out reader, When the page loads, Then the reader sees a landing in the RPG skin with the book name and the lesson title, and two choices.
- Given choice 1, "My school uses Primary Advantage", When the reader selects it, Then the reader goes to the sign-in page with the callback of S1.
- Given choice 2, "I study with Tutor Advantage", When the reader selects it, Then the reader goes to the Tutor lesson URL for the same book and lesson (Member Question 1).
- Given no Tutor URL setting, When the landing loads, Then choice 2 does not show, and the reader sees the sign-in choice only.
- Given a signed-in reader, When the page loads, Then the landing does not show and the reader goes straight to the target.
- Given the landing, When a reader uses a phone at 375 px, Then each choice is 48 px high or more and the page works in day and night mode.
- Given the Tutor URL, When the server builds it, Then the URL comes from a setting and a book key plus a number, never from a request value.

**Estimate:** M
**Priority:** Must

### Story S3: Writing QR code target
**As a** student who scans the writing code
**I want** to open the writing task of the lesson
**So that** I write without a search

**Acceptance Criteria:**
- Given `/b/o3-2/5/writing`, When a signed-in student opens it and the lesson has a published article, Then the student goes to `/student/read/<articleId>`, the page that holds the writing question (F-2).
- Given the same link, When a signed-in teacher opens it, Then the teacher goes to the lesson page of the class book (as for the reading code).
- Given the same link and a signed-out reader, When the page loads, Then the reader sees the landing of S2 and the callback keeps `/writing`.
- Given a link `/b/o3-2/5/other`, When it loads, Then the reader sees the page of S4 for "unknown address".
- Given the reading code and the writing code of one lesson, When the same student scans both, Then the first goes to the lesson flow and the second goes to the article page (Member Question 2).

**Estimate:** S
**Priority:** Must

### Story S4: A clear page for every case that is not the normal one
**As a** reader
**I want** a page that says what is wrong and what to do
**So that** I do not see a blank 404 or a silent redirect

**Acceptance Criteria:**
- Given an unknown book key, When a reader opens the link, Then the page says the book is not known and names no book list; it links to the student home or the teacher class list by role.
- Given a lesson number that is not in a known book, When a reader opens the link, Then the page names the book and gives the number range ("Lessons 1 to 14").
- Given a number that is not a whole number of 1 or more, When a reader opens the link, Then the page is the same as for an unknown lesson.
- Given a lesson with no article or not approved, When a student opens the link, Then the page says the lesson is not ready and links to the student home. A teacher still reaches the lesson page.
- Given a teacher with no class that has the book, When the teacher opens the link, Then the page says no class uses the book and links to the class list, with the assign step named.
- Given a SYSTEM user or an ADMIN with no school class, When the user opens the link, Then the page says this link is for a class teacher and links to the role home.
- Given a role that is not student, teacher, admin, or system, When the user opens the link, Then the page says the link is not for this account.
- Given any of these cases, When the server handles it, Then it logs one event through `lib/observability/logger.ts` with the case name, the book key, and the number, and with no user name.
- Given a database error in the lookup, When the server handles it, Then the reader sees a retry page and the server logs `book_link.lookup_failed`.
- Given the five locale files (`en`, `th`, `cn`, `tw`, `vi`), When the key-parity check runs, Then every new key is in every file.

**Estimate:** M
**Priority:** Must

### Story S5: Prove the printed URL without a locale
**As a** cutover operator
**I want** a test that the unprefixed printed URL reaches the locale route
**So that** a printed book never meets a loop or a lost path

**Acceptance Criteria:**
- Given `/b/o3-2/5` and `/b/o3-2/5/writing`, When the proxy runs, Then each redirects once to a locale path (`/th/...`, or the locale of the Accept-Language header) and keeps the full path and the query.
- Given the locale path, When the proxy runs again, Then it does not redirect (no loop).
- Given each of the five book keys (`o1`, `o2`, `o3-1`, `o3-2`, `q4`), When the matcher tests the path, Then the proxy runs for it (the key has no dot).
- Given a signed-out reader on a `/b/` path, When the proxy runs, Then it does not send the reader to sign-in (the page does, with the callback of S1).

**Estimate:** S
**Priority:** Must

### Story S6: Check one /b/ URL in the go/no-go script
**As a** cutover operator
**I want** the go/no-go check to scan one `/b/` URL signed out, sign in, and see the lesson
**So that** a broken printed route stops the cutover

**Acceptance Criteria:**
- Given the tag URL and the demo class, When the check opens `/b/o3-2/1` signed out, Then it sees the landing with the book name.
- Given the landing, When the check selects the school choice and signs in as the demo student with the class code, Then the check ends on the lesson flow of the linked article.
- Given `/b/o3-2/1/writing`, When the check repeats the steps, Then it ends on the article page.
- Given `/b/zz/1` and `/b/o3-2/999`, When the check opens them, Then each shows its S4 page and the HTTP status is not 5xx.
- Given any check fails, When the script ends, Then it names the failed check and counts it as a stop.
- Given the command sheet, When `primary_parity_rehearsal3_20261011` writes it, Then row C13 names one `/b/` URL for the agent and one printed `/b/` code for the owner (when the books exist).

**Estimate:** S
**Priority:** Must

## Non-Functional Requirements

- RPG skin (`components/rpg/*`, `docs/primary-rpg-skin.md`): `Scene`, `Panel`, `Plaque`, `RpgLink`, `RpgButton`. Buttons are 48 px or more. 375 px and 1280 px, day and night.
- The lookup is a domain function with a Zod output contract in `packages/domain/src/primary-books/`. It uses TenantDB `unscoped` with a reason, as `resolveBookLesson` does. The route holds no business logic.
- A return path is a same-site relative path only. The check has an allow-list for book paths and no open redirect.
- The landing and the cases reveal no private data: the page shows the book name, the lesson title, and the lesson count only.
- Logging uses `lib/observability/logger.ts`. No `console.error`.
- No schema change and no migration. The catalogue already has what the route needs. The ETL and the runbook have no change from this track, except the C13 and §10 text that rehearsal 3 collects.

## Acceptance Criteria (track level)

The side-by-side kit checks these on a rehearsal copy. Legacy has no `/b/` route; the printed old QR code is the legacy reference.

| Check | Legacy page (`bfea121`) | New page | Role | Observable behavior |
| --- | --- | --- | --- | --- |
| A1 | printed `/student/read/<cuid>` | `/en/b/o3-2/1` (reading) | PUBLIC then STUDENT | Landing, sign-in with the class code, then the lesson flow of the linked article. |
| A2 | printed `/student/read/<cuid>/writing` | `/en/b/o3-2/1/writing` | PUBLIC then STUDENT | Landing, sign-in, then the article page with the writing question. |
| A3 | none | `/en/b/o3-2/1` | TEACHER | Landing, staff sign-in, then the lesson page of the class that has the book. |
| A4 | none | `/b/o3-2/1` (no locale) | PUBLIC | One redirect to a locale path that keeps the path. |
| A5 | none | `/en/b/zz/1`, `/en/b/o3-2/999` | STUDENT | A clear page for each, status not 5xx. |

- Domain tests (Vitest, `packages/domain`) and app tests (Vitest, `apps/primary-advantage`) pass.
- The owner's look check passes on captures at 375 px and 1280 px, day and night.

## Peer requests

- **Workbooks session.** For Origins 3.2, Quest 4, and the insert, set `article_url` of every lesson to
  `https://primary.reading-advantage.com/b/<book>/<n>` with the keys of `BOOKS` (`o3-2`, `q4`, and the book of the insert, probably `o3-1` lesson 12; confirm).
  Leave `writing_practice_url` empty, so the renderer prints the `/writing` suffix (F-1). Make sure the injector and the verify script do not read the article id from the last path segment of `article_url` for these books.
- **Tutor session.** Add a Tutor lesson route that opens a lesson by Primary book key and lesson number, and give the URL pattern for Member Question 1. Change T3 so that it resolves a D1-B `article_url` by book key and number, not by the last path segment (F-9).
- **Rehearsal 3 member.** Add the C13 and §10 text of S6 to the new command sheet.

## Out of Scope

- Printing the QR codes, the template change, and the books (Workbooks).
- The Tutor route itself (Tutor session).
- An automatic Primary or Tutor detection. No signal exists (F-10).
- Remembering the reader's choice in a cookie.
- Old-book QR codes. D3 of the cutover spec covers them (F-2).
- A student read-only preview for a lesson the class has not opened. The lesson page rules stay as they are.

## Member Questions (owner)

1. Tutor link. Default: a setting `TUTOR_LESSON_URL_TEMPLATE` (for example `https://liff.line.me/<LIFF_ID>/b/{book}/{n}`). Choice 2 shows only when the setting exists. The Tutor session gives the pattern. Does the owner accept this, or does the owner want a fixed Tutor page?
2. Reading code target for a student. Default: the lesson flow (today's behavior), and the writing code opens the article page. Old printed codes open the article page for both. Does the owner want both new codes on the article page?
3. Landing for a signed-out reader. Default: always show the two choices, school first, no cookie. Does the owner want a school-only sign-in link with a small "Tutor Advantage?" line instead?
4. Text for "lesson not ready" (student). Default: "This lesson is not ready yet. Ask your teacher." Does the owner want other words?
