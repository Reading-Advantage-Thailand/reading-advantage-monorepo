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
  cache (only `primary-v2-offline-v1`), and does not reload on the second open.

## 2. New items for rehearsal 3

### 2.1 Migrations and `--required-migration` tags

- New migrations: `0072_primary_stories` (stories S1) and
  `0073_primary_lesson_attempts` (lesson repeat). `0073` is the highest file in
  `packages/db/drizzle/` on 2026-10-12.
- `apps/primary-advantage/cloudbuild.yaml:52` and
  `apps/primary-advantage/cloudbuild-etl.yaml:50` both pin
  `--required-migration 0073_primary_lesson_attempts`. Grep confirms both on
  2026-10-12. The three values agree.
- Lesson repeat changes the ETL (correction of 2026-10-13: commit `e54be7f78`).
  `splitLessonProgress` in `packages/db/src/migrations-data/primary-legacy-import.ts`
  keeps the latest row of each (user, article) as the current `lesson_progress`
  row and imports each older duplicate as a closed attempt in
  `primary_lesson_attempts` (close reason `legacy_import`). After the browser
  check on the rehearsal copy, run `lesson-repeat-data-checks.sql`.
- Lesson-attempts ETL row. Expected counts on the 2026-10-11 backup (source:
  lesson repeat `plan.md`, local run on `primary_etl_repeat_s1`): legacy
  `user_lesson_progress` 289 rows, 266 (user, article) pairs, 23 pairs with
  duplicates; after the import `lesson_progress` 263 rows, 40 current rows with
  `assignment_id`, `primary_lesson_attempts` 23 rows (all `legacy_import`,
  numbered from 1). Expected skips: 3 rows with the reason "user not migrated".
  A skip with the reason "duplicate (user, article) not kept as an attempt: the
  user has no school" is new; the expected count is 0. A different count on
  the rehearsal copy needs a look before the run counts as passed.

### 2.2 Catalogue import runbook step

- Config: `apps/primary-advantage/cloudbuild-catalogue.yaml`. It reads
  `_WORKBOOKS_ARCHIVE` (required), `_TARGET_DATABASE_URL` (default
  `PRIMARY_V2_DATABASE_URL`), and `_EXPECTED_LESSONS` (default `70`).
- The archive must hold `content/primary/<book>/*.json` and
  `content/primary/<book>/print/*.json` for the 5 books
  (`origins-1`, `origins-2`, `origins-3.1`, `origins-3.2`, `quest-4`), the manual
  `i18n` folder, and `Teacher guide/step-*.md`. Make it with
  `git archive` (see `catalogue-build-commands.md` §1), not plain `tar`. Pin the Workbooks commit
  `08bb160b8cfb4b95252546e6fd0e9ccc31fe3817`. The print-lesson import run used the same commit (source:
  `primary_parity_print_lesson_20261011/import-run.md`). The build passes the
  archive commit to the import with `--workbooks-commit`.

### 2.3 AI environment values and the live SAQ check

- The new service needs `PROJECT_ID` (env) and `OPENAI_API_KEY`,
  `VERTEX_CLIENT_EMAIL`, `VERTEX_PRIVATE_KEY` (secrets). Source: cleanup Phase 8
  (`primary_parity_cleanup_20261011/plan.md:193`,
  `behavior-contract-fr13.md:56`); `cloudbuild.yaml:74-77,83` already sets them.
- Vertex location is now `global` (legacy used `us-central1`). The location is a
  constant in `apps/primary-advantage/lib/ai/models.ts:35`. The variable
  `PRIMARY_AI_FEEDBACK_MODEL` changes only the model name; it cannot change the
  location. If `global` does not serve the model for this project, a code change
  is needed. The variable `PRIMARY_AI_CHATBOT_MODEL` sets the OpenAI chatbot
  model (default `gpt-4o-mini`); leave it unset unless the owner decides.
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
- Expected story load counts on the 2026-10-11 backup (source: stories
  `etl-run.md`; the second run gives the same table): stories 412 (all with
  `image`), chapters 3,296, chapter MCQ 32,949 (11 skipped: answer not among the
  options), chapter SAQ 16,480, chapter LAQ 16,480, chapter flashcard source
  rows 3,296, chapter flashcard cards 0 (2 decks of users who do not move),
  `STORIES_*` activity rows 11 (3 are duplicates or users who do not move).
  Check: no "stories deferred" skip in the report.

### 2.7 Print data placement

- Print data lives in `primary_book_lessons.package.printLesson` (source:
  `packages/domain/src/primary-books/mapping.ts` `toLessonPackageJson`,
  `print/print-lesson.ts` `printLessonOf`). No migration (source: print lesson
  `spec.md:186`, `plan.md:60`).

### 2.8 Dockerfile and image-layer check

- `apps/primary-advantage/Dockerfile` now deletes the ElvGames files of the other
  apps in the builder stage, under `/app/apps/primary-advantage/.next/standalone/`,
  before the runner stage copies the tree (review H-4, 2026-10-13). The runner
  stage has no `rm` line. The old layout kept the bytes in a runner layer.
- R6 image-layer check (agent step, after the push, before the deploy). Run it in
  Cloud Build or on any Docker host that can pull the image. Replace `<image>`
  with the pushed image and its digest:

```bash
docker pull <image>
docker save <image> -o image.tar
mkdir layers && tar -xf image.tar -C layers
# Each layer is a tar file. A hit in any layer is a failure.
for f in $(find layers -type f); do tar -tf "$f" 2>/dev/null | grep standard-pack-qc && echo "STOP hit in $f"; done
echo "layer check done"
```

  Pass: no `STOP` line. The machine cannot build the image locally (7 GB box), so
  this check runs only in Cloud Build.
- R7 URL check on the tag URL: `curl -s -o /dev/null -w '%{http_code}\n'
  "$BASE/assets/apk/standard-pack-qc/manifest.json"` gives `404`.

### 2.9 Browser-check blocks of `cutover-check.mjs`

Each block runs by default. An env switch with the value `off` skips it. All
blocks need the hand-out CSV, the teacher, admin, and system usernames, and the
class argument of the usage line.

| Block (check name prefix) | Env switch | Preconditions |
|---|---|---|
| class book ("class book ...") | `CLASS_BOOK_CHECK=off` | Catalogue import done (C7b, 70 lessons). The teacher owns the class. It assigns Origins 3.2 teacher-led (an upsert; a rerun passes). |
| Teacher Manual ("manual ...") | `MANUAL_CHECK=off` | Runs inside the class book block, so it needs the same preconditions. It marks steps 1 to 3 and "Mark taught" on lesson 1: use a fresh clone for each run. |
| QR path ("qr ...") | `QR_CHECK=off` | The book is assigned to the class (class book block on). The open class code of the class exists. |
| stories ("stories ...") | `STORIES_CHECK=off` | The story rows of migration 0072 are loaded (stories ETL). A student session exists. |
| staff view ("staff ...") | `STAFF_VIEW_CHECK=off` | Teacher, admin, and system user sign in. It reads student pages only (GET). The teacher run follows the first managed class book when the home lists one. |

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
| `primary_parity_cleanup_20261011` | none | §2.3, §2.8 |
| `primary_parity_class_books_20261011` | collected | §1.1, §2.2 |
| `primary_parity_staff_student_view_20261011` | none | — |
| `primary_parity_admin_dashboard_20261011` | none | — |
| `primary_parity_teacher_home_20261011` | none | — |
| `primary_parity_system_dashboard_20261011` | none | — |
| `primary_parity_school_management_20261011` | none | — |
| `primary_parity_stories_20261011` | none | §2.1, §2.6 |
| `primary_parity_read_along_20261011` | none | — |
| `primary_parity_lesson_repeat_20261011` | ETL change (no `runbook-changes.md`) | §2.1 |
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
- Image-layer check and the `standard-pack-qc` 404 check (section 2.8).
- Lesson-attempts ETL counts (section 2.1) and story load counts (section 2.6).
- Image liveness: the rehearsal 3 image still exists before C9 (images older
  than 30 days expire; only the 5 newest stay).
