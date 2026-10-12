# Rehearsal 3 change list (track `primary_parity_rehearsal3_20261011`)

Status: Phase 1 contract. The helper read the sources below on 2026-10-12 on
branch `primary-parity-integration`. It ran no database write and no build.

## 0. Start gate record (spec FR-1)

- (a) Member completion: pending. The orchestrator owns the registry check.
- (b) Public pages merge: pending. `git merge-base --is-ancestor c7228ab74 HEAD`
  returns NOT-ANCESTOR on 2026-10-12. Branch `primary/public-pages` sits at
  `c7228ab74`.
- (c) CNT-01 report: pending. The Workbooks session owns the real write of
  `inject-lessons.ts --target new` and the passing `verify-lessons.ts --target new`.

The gate is not passed yet. Rehearsal 3 starts after (a), (b), and (c) turn green.

## 1. Collected runbook changes

`measure/tracks/*/runbook-changes.md` returns two files on 2026-10-12. The PWA
track keeps the same content in `runbook-checks.md`. Section 3 names every other
member with "none".

### 1.1 Class books (source: `primary_parity_class_books_20261011/runbook-changes.md`)

- New Cloud Build file `apps/primary-advantage/cloudbuild-catalogue.yaml`.
- New runbook step 5b between the ETL and the deploy: build a Workbooks archive
  of the pinned commit, upload it to `gs://primary-advantage_cloudbuild/source/`,
  then run the catalogue build with `--substitutions=_WORKBOOKS_ARCHIVE=<path>`.
- New command sheet row C7b after C7. Pass lines: `70 lessons`, `0 failed`,
  `en: 13 steps`, `th: 13 steps`. The import is idempotent; it runs again after
  a fix. It runs after the ETL because it links lessons through
  `primary_legacy_id_map`. It can run in parallel with C8 and must end before C9.
- New go/no-go item under "Content and data": the class book works on the demo
  class (card above sign-in, teacher-led assign, lesson 1 with title, 13 guide
  steps, projector link, answer key, no "not linked" text, projector shows the
  article text, `/en/b/o3-2/1` lands in the lesson flow). A printed `/b/` link
  opens a lesson (owner scan in C13).

### 1.2 QR path (source: `primary_parity_qr_path_20261011/runbook-changes.md`)

- Command sheet row C13, agent step: run the `cutover-check.mjs` block "qr" at
  the tag URL. It opens `/b/o3-2/1` signed out, signs in with the open class
  code, ends on the lesson flow, opens `/b/o3-2/1/writing`, ends on an article
  page, and checks `/b/zz/1`, `/b/o3-2/999`, `/b/o3-2/5/other` stay below 500.
  Any failed check prints `STOP <name>` and exits 1. `QR_CHECK=off` skips it.
- Command sheet row C13, owner step: scan one printed `/b/` code and the writing
  code on a phone with no Primary session.
- Owner setting before C9: set `TUTOR_LESSON_URL_TEMPLATE` when Tutor has the
  `/b/` route. The value is `https://<host with {book} and {n}>`. It is optional.

### 1.3 PWA checks (source: `primary_parity_pwa_20261011/runbook-checks.md`)

- AC-2 `curl -I` on the rehearsal tag URL first, then on the domain after the
  switch: `/serwist/sw.js` gives 200, a JavaScript MIME type,
  `Service-Worker-Allowed: /`, `Cache-Control: no-cache`. The body holds
  `primary-v2-` and no `serwist-precache`.
- AC-4 phone check after the switch: a phone with the installed legacy app shows
  the new app, reloads at most once, runs `/serwist/sw.js`, keeps no legacy
  cache, and does not reload on the second open.

## 2. New items for rehearsal 3

### 2.1 Migrations and `--required-migration` tags

- New migrations: `0072_primary_stories` (stories S1) and
  `0073_primary_lesson_attempts` (lesson repeat). `0073` is the highest file in
  `packages/db/drizzle/` on 2026-10-12.
- `apps/primary-advantage/cloudbuild.yaml:52` and
  `apps/primary-advantage/cloudbuild-etl.yaml:50` both pin
  `--required-migration 0073_primary_lesson_attempts`. Grep confirms both on
  2026-10-12. The three values agree.
- Lesson repeat changes no ETL code (source: `primary_parity_lesson_repeat_20261011`
  `behavior-contract.md` §7). After the browser check on the rehearsal copy, run
  `lesson-repeat-data-checks.sql`.

### 2.2 Catalogue import runbook step

- Config: `apps/primary-advantage/cloudbuild-catalogue.yaml`. It reads
  `_WORKBOOKS_ARCHIVE` (required), `_TARGET_DATABASE_URL` (default
  `PRIMARY_V2_DATABASE_URL`), and `_EXPECTED_LESSONS` (default `70`).
- The archive must hold `content/primary/<book>/*.json` and
  `content/primary/<book>/print/*.json` for the 5 books
  (`origins-1`, `origins-2`, `origins-3.1`, `origins-3.2`, `quest-4`), the manual
  `i18n` folder, and `Teacher guide/step-*.md`. The Workbooks commit must be
  `08bb160` or later. The print-lesson import run used `08bb160b8cf...` (source:
  `primary_parity_print_lesson_20261011/import-run.md`). The build passes the
  archive commit to the import with `--workbooks-commit`.

### 2.3 AI environment values and the live SAQ check

- The new service needs `PROJECT_ID` (env) and `OPENAI_API_KEY`,
  `VERTEX_CLIENT_EMAIL`, `VERTEX_PRIVATE_KEY` (secrets). Source: cleanup Phase 8
  (`primary_parity_cleanup_20261011/plan.md:193`,
  `behavior-contract-fr13.md:56`); `cloudbuild.yaml:74-77,83` already sets them.
- Vertex location is now `global` (legacy used `us-central1`). If `global` does
  not serve the model for this project, set `PRIMARY_AI_FEEDBACK_MODEL`.
- Before the cutover, run one live SAQ feedback call check, then check one
  `ai_call` log line for each feature in the Cloud Run log after the deploy.

### 2.4 Public pages merge decision

- Rehearsal 3 covers English and the current Thai copy only (owner decision
  2026-10-12; cn/tw come later). The public pages track still scopes en, th, cn,
  tw (source: `primary_public_pages_20261007/spec.md` PP-8; cn/tw review pending
  per its `plan.md:26`).
- Branch `primary/public-pages` at `c7228ab74` merges into integration before
  rehearsal 3. Verified pending on 2026-10-12 (see section 0).

### 2.5 PWA checks for the runbook

- `/offline.html` serves (source: `apps/primary-advantage/public/offline.html`,
  `lib/pwa/constants.ts` `OFFLINE_FILES`, fixture server route).
- The takeover: AC-1 is the Playwright `pwa-takeover` project (proven per the PWA
  `acceptance.md`); AC-2 is the `curl -I` check in section 1.3.
- `TUTOR_LESSON_URL_TEMPLATE` feeds the QR landing (see section 1.2).

### 2.6 Stories ETL condition

- Chapter question rows and chapter flashcard rows have NULL `article_id`
  (source: stories `behavior-contract.md` §7). Already satisfied: the S1 local
  reconciliation counts 0 chapter MCQ rows with a non-NULL `article_id`
  (source: stories `etl-run.md`).

### 2.7 Print data placement

- Print data lives in `primary_book_lessons.package.printLesson` (source:
  `packages/domain/src/primary-books/mapping.ts` `toLessonPackageJson`,
  `print/print-lesson.ts` `printLessonOf`). No migration (source: print lesson
  `spec.md:186`, `plan.md:60`).

## 3. Members with no runbook change

"No" means the track folder holds no `runbook-changes.md` on 2026-10-12. The
"Covered in" column points at the section that records the member's rehearsal 3
effect, if any. This helper did not audit every member spec for hidden runbook
steps; the owner confirms the table at the Phase 1 review.

| Member | Runbook change | Covered in |
|---|---|---|
| `primary_parity_records_20261011` | none | — |
| `primary_parity_acceptance_20261011` | none new; owns `scripts/primary-parity/cutover-check.mjs` used by R7/C10 | — |
| `primary_parity_quick_fixes_20261011` | none | — |
| `primary_parity_cleanup_20261011` | none | §2.3 |
| `primary_parity_class_books_20261011` | collected | §1.1, §2.2 |
| `primary_parity_staff_student_view_20261011` | none | — |
| `primary_parity_admin_dashboard_20261011` | none | — |
| `primary_parity_teacher_home_20261011` | none | — |
| `primary_parity_system_dashboard_20261011` | none | — |
| `primary_parity_school_management_20261011` | none | — |
| `primary_parity_stories_20261011` | none | §2.1, §2.6 |
| `primary_parity_read_along_20261011` | none | — |
| `primary_parity_lesson_repeat_20261011` | none | §2.1 |
| `primary_parity_lesson_games_20261011` | none | — |
| `primary_parity_print_lesson_20261011` | none | §2.2, §2.7 |
| `primary_parity_pwa_20261011` | collected (`runbook-checks.md`) | §1.3, §2.5 |
| `primary_parity_qr_path_20261011` | collected | §1.2 |
| `primary_public_pages_20261007` | none | §2.4 |

`DROPPED_TABLES` check (`packages/db/src/migrations-data/primary-legacy-import.ts:68-83`,
read 2026-10-12): `contact_messages` reads "no target; export for the sales team
is an owner decision" (matches FR-3); `ai_providers` and `ai_task_configs` read
"AI configuration comes from the environment" (matches §2.3); no stories entry
stays (stories now load). No wrong reason found.

## 4. Gate definition

Rehearsal 3 starts when every line below is green:

1. Batch capture 2 reports carry no open Critical/High row.
2. Every track review reads pass-with-fixes or better, and the fixes landed.
3. The kit go/no-go is green on the rehearsal clone.
4. Type checks and the full suites are green on the integration HEAD to be tagged.

The FR-1 start gate (section 0) is part of this gate. Items (a), (b), and (c)
are still pending.

## 5. New go/no-go items for §10

- R7 browser block at the `rehearsal3` tag URL: a teacher assigns a class book
  and opens one of its lessons; a student opens a story chapter; a staff user
  opens a student page in view mode and saves nothing; a migrated student with a
  lesson in progress resumes at the right task; an old game URL redirects to its
  cartridge; the PWA manifest and the worker file return 200; then the five
  public files (update the list if cleanup changed the asset paths).
- Contact export test: the CSV row count equals
  `select count(*) from contact_messages` on the same copy, and no cell starts
  with `=`, `+`, `-`, or `@`. The rehearsal file is deleted after the count.
- QR block and owner phone scans (section 1.2); PWA AC-2 and AC-4 (section 1.3).
- Image liveness: the rehearsal 3 image still exists before C9 (images older
  than 30 days expire; only the 5 newest stay).
