# Primary Advantage Cutover — Data and Login Migration Spec

Version 1.7 | Date 2026-10-08 | Status: Calendar (§11) approved by Daniel 2026-10-01; the rest is a draft | Owner: Daniel Bo | Scope: `apps/primary-advantage`, `packages/db`, `packages/auth`, `packages/api`

Related: `advantage-pr/08-strategy/product-strategy-2026-2027.md` §6 (October plan); `Workbooks/docs/content-plans/primary-origins-3.2-plan.md` (decision D1, QR URLs); `tutor-advantage/docs/specs/2026-10-tutor-catalogue-and-platform-spec.md` (Tutor side).

## 1. Summary

The cutover is a **database migration**, not only a login fix. The monorepo Primary build reads the shared Drizzle schema. Production Primary runs on the legacy Prisma schema. The two schemas differ in table names, ID types, and required columns. No script moves the data from one to the other.

- The monorepo reads `articles`, with a `uuid` primary key. The legacy database has `article`, with text cuid keys (`cmgq…`). Every printed Origins 2 and Origins 3.1 QR code carries a cuid.
- Almost every Primary table in the shared schema has a `uuid` key. The legacy tables have text cuid keys.
- `users.username` and `users.display_username` are `NOT NULL UNIQUE` in the shared schema. The legacy `users` table has no such columns.
- Tutor Advantage reads four legacy tables in the Primary database by name (`article`, `multiple_choice_questions`, `short_answer_questions`, `sentencs_and_words_for_flashcard`) with cuid IDs.

So a safe cutover needs five things: a new database with the shared schema, an ETL with an ID map, a resolver for old article IDs in printed books, a compatibility layer for Tutor, and the login changes. Section 11 gives a gate-based calendar. The announced downtime window (2026-10-01 to 2026-10-07) is too short for this work. The no-student window lasts to about 2026-10-24.

## 2. Evidence

| Fact | Source |
|---|---|
| Monorepo Primary uses `@reading-advantage/db` (Drizzle); Prisma removed | `measure/archive/primary_advantage_drizzle_migration_20260526/spec.md` (FR-1: "Migration generated and verified against a fresh database"; no production data step) |
| `articles.id` is `uuid` | `packages/db/src/schema/content.ts:7-8` |
| Article page reads `articles` by the route ID with no legacy-ID handling | `apps/primary-advantage/server/models/articleModel.ts:422-423`; `app/[locale]/(student)/student/read/[articleId]/page.tsx` |
| Legacy `Article` maps to table `article`, `id String @default(cuid())` | `~/Desktop/primary-advantage/prisma/schema.prisma:137-178` |
| Shared `users`: `username`, `display_username` NOT NULL UNIQUE; `role` is an upper-case enum | `packages/db/src/schema/users.ts:26-36`, `:5` |
| Legacy `users`: no username; `email` unique; `role` lower-case text (`student`, `teacher`, `admin`, `system`, `user`) | legacy `prisma/schema.prisma`; April backup |
| Login looks up `users.username`, then a `credential` account | `packages/api/src/routes/auth/login.ts:48-150` |
| Login returns 503 "Service temporarily unavailable" on a DB error in the user lookup, and logs `Login DB error (user lookup)` | same file |
| Password verify supports Argon2id and bcrypt only | `packages/auth/src/password.ts:36-47` |
| Legacy passwords: better-auth scrypt `hexsalt:hexkey`, and bcrypt re-hashed to scrypt on login | `~/Desktop/primary-advantage/lib/password.ts`, `lib/auth.ts:21-38` |
| Legacy student login: class code (`classrooms.password_students`) + choose your name; no per-student password | legacy `lib/auth.ts:115-160` (`signInStudent`) |
| Monorepo student login: posts `{ username: <student email>, password: <class code> }` to `/api/auth/login`, so each student needs a credential account whose hash is the class code | `components/auth/student-signin-form.tsx:97-105`, `:184`; `scripts/seed-host-proof-session.ts:146` |
| Regenerating a class code updates `classrooms.password_students` only, not student account hashes | `server/models/classroomModel.ts` (`generateClassCode`) |
| The student sign-in form expects `students[].student.email` and `.student.name`; the API returns flat `studentEmail` and `studentName` | `components/auth/student-signin-form.tsx:45-51`, `:184`; `server/models/classroomModel.ts` (`getClassroomStudentForLogin`) |
| Monorepo `cloudbuild.yaml` has the migration step commented out | `apps/primary-advantage/cloudbuild.yaml:21-26` |
| Tutor reads `article`, `multiple_choice_questions`, `short_answer_questions`, `sentencs_and_words_for_flashcard` by cuid | `tutor-advantage/services/learning-service/src/services/PrimaryAdvantageDB.ts:93-120` |
| No ETL or import script for legacy Primary data exists | `scripts/`, `packages/db/src/seed`, `apps/primary-advantage/scripts` (searched 2026-09-30) |

## 3. The 2026-09-24 failure (inference)

Both builds read the database URL from the secret named `DATABASE_URL`. If the monorepo revision pointed at the legacy database, the first query of every login (`SELECT … FROM users WHERE username = …`) failed on a missing column, and every login returned 503. This matches "all the logins failed."

Confirm it: open Cloud Logging for the rolled-back monorepo revision on 2026-09-24 and search for `Login DB error (user lookup)`. If the line is there with `column "username" does not exist`, this section is fact. Record the result in this file.

## 4. Data to move

Row counts from `Backup_Primary_2026-04-29.sql` (April 2026; production today is larger — take a fresh backup before the first rehearsal):

| Table | Rows | Table | Rows |
|---|---|---|---|
| users | 607 (583 student, 7 teacher, 7 admin, 3 system, 7 `user`) | multiple_choice_questions | 24,460 |
| accounts | 26 (18 credential, 8 google) | short_answer_questions | 12,230 |
| sessions | 1,648 (do not move) | long_answer_questions | 12,218 |
| schools | 4 | sentencs_and_words_for_flashcard | 2,446 |
| classrooms | 31 | flashcard_cards / decks | 2,398 / 310 |
| classroom_students / teachers | 583 / 18 | card_reviews | 372 |
| article | 174 | stories / story_chapters | 284 / 2,272 |
| article_activity_logs | 335 | user_activities / xp_logs | 1,613 / 1,640 |
| assignments / assignment_students | 14 / 336 | user_lesson_progress | 238 |

Password hashes in April: credential accounts 14 bcrypt, 4 scrypt; 8 Google accounts with no password.

## 5. Design decisions

| # | Decision | Recommendation | Why |
|---|---|---|---|
| D1 | Target database | A **new database** on the same Cloud SQL instance (for example `primary_v2`), with all `packages/db` migrations applied. The legacy database stays untouched. | Rollback is a revision switch. Nothing is destroyed. Tutor can keep reading the legacy database until it switches. |
| D2 | IDs | New rows get new `uuid` keys. A table `primary_legacy_id_map (table_name text, legacy_id text, new_id uuid, primary key (table_name, legacy_id))` records every remap. `users.id` and `accounts.id` are text and keep their legacy values. | Keeps the shared schema unchanged for Reading and CodeCamp. |
| D3 | Old article URLs | The article route accepts a non-UUID ID, looks it up in `primary_legacy_id_map`, and redirects to the UUID URL. Same for `/student/read/<id>/writing` (and add the `writing` page, or redirect it to the article). | Printed Origins 2 and 3.1 QR codes must keep working. |
| D4 | Tutor compatibility | A schema `tutor_compat` in the new database with four read-only views named like the legacy tables (`article`, `multiple_choice_questions`, `short_answer_questions`, `sentencs_and_words_for_flashcard`). Each view exposes `coalesce(legacy_id, id::text)` as `id` / `article_id` and the column names Tutor reads today. Tutor points `DATABASE_URL_PRIMARY_ADVANTAGE` at the new database as the read-only `tutor_reader` login (`packages/db/scripts/tutor-reader-grants.sql`), which sets `search_path=tutor_compat` on the role. | Tutor needs no code change to switch. Its stored article IDs stay valid. |
| D5 | Student login | Port the legacy semantics: a student-login endpoint takes `{ studentId, classCode }`, checks the class code against `classrooms.password_students` and expiry, checks membership, and creates a session. No per-student password. **Superseded** by track `primary_student_login_20261003`: the class code works only while the teacher has the class open (3 hours at most). Away from the classroom a student signs in only with the username and password from the class sheet (owner decision 2026-10-08: teachers print the class sheets at the cutover). | The current design breaks every time a teacher regenerates a code, and migrated students have no account. |
| D6 | Usernames | **Students (owner decision 2026-10-08):** a username of two simple English words and two digits (for example `bluetiger47`), the same rule as new students; never the email, never a class or grade part, because it follows the student for years. A rerun keeps a student username that the target has already. Students keep no email: `email` and `email_verified` stay null (owner decision 2026-10-08). **Staff:** `username = lower(email)`; `display_username = email`. For a user with no email, `username = lower(id)`. Check uniqueness before insert. | Emails are unique in the legacy table. Teachers already know their email. |
| D7 | Password formats | **Dropped (Daniel, 2026-10-04).** Teachers sign in only with Google today, so no live teacher has a scrypt or bcrypt hash. Bcrypt dual-read stays (commit `b3bf3ef0e`); scrypt is not added. | Students use class codes. Teachers get new credentials through D8. |
| D8 | Teacher credentials | No Google sign-in (Daniel, 2026-09-29); username and password only. **Decided 2026-10-04:** a script gives each migrated teacher a credential account with `username = lower(email)` (D6) and a random temporary password, and writes a hand-out list for the team. The teacher must change the temporary password at first sign-in (new nullable column plus a change-password step). | All teachers use Google sign-in today, so none has a password. Daniel is on holiday at cutover, so the team hands out the list. |
| D9 | Roles | `student→STUDENT`, `teacher→TEACHER`, `admin→ADMIN`, `system→SYSTEM`. The 7 `user` rows: Daniel lists them and assigns a role by hand before the final run. | `user` has no enum value. |
| D10 | Article pictures | **Decided 2026-10-06.** The bucket `primary-app-storage` keeps every file at its current key: `images/<legacyId>_<n>.png` and the audio paths stay as they are; the cutover renames no object. The ETL writes the legacy article id into `articles.image` (the picture key) for every migrated article. A new article has no picture key, and the app uses the article id. `getArticleImageUrl` reads the picture key first and the article id second (`apps/primary-advantage/lib/storage-config.ts`). The picture key is the same value that the `tutor_compat` view returns as `id` (D4), so Tutor builds the same `image_urls` as today. | D2 gives migrated articles new UUIDs, and the app built the picture URL from the article id. Without this rule every migrated story loses its pictures after the cutover. Tutor (`services/learning-service/src/services/PrimaryAdvantageDB.ts`) and the Workbooks injector both name pictures by the legacy id. |

## 6. ETL rules

Write the ETL as one idempotent script in `packages/db` (for example `src/migrations-data/primary-legacy-import.ts`). It reads the legacy database and writes the new one inside one transaction per table group. It writes `primary_legacy_id_map` as it goes. It ends with a reconciliation report: rows read, rows written, rows skipped with reason, per table.

Order: schools → users → accounts → classrooms → classroom_teachers / classroom_students → licenses → article → questions (MCQ, SAQ, LAQ) → sentencs_and_words_for_flashcard → stories / chapters → assignments → activity, progress, flashcards, XP, goals.

Known hazards found on 2026-09-30:

| Table | Hazard | Rule |
|---|---|---|
| `users` | `username`, `display_username` NOT NULL UNIQUE; `cefr_level` NOT NULL (default `A1-`); legacy students carry levels such as `A0` | D6; copy the legacy CEFR level as is |
| `accounts` | Password may be in `accounts.password` or in legacy `users.password` | Prefer `accounts.password` for `provider_id = 'credential'`; else create a credential account from `users.password`; do not copy Google tokens |
| `classrooms` | `teacher_id` is NOT NULL; legacy uses a join table (`classroom_teachers`: 18 rows for 31 classrooms) | First teacher in the join table; if none, the school's admin; list every fallback in the report |
| `multiple_choice_questions` | `correct_answer integer NOT NULL` (index into `options`); legacy has `answer` text | Compute the index by matching `answer` to `options`; skip and report rows with no match |
| `article` | Level labels: Origins 3.1 articles are at level 2; they belong at level 3 | Optional fix-up step: set `ra_level = 3`, `cefr_level = 'A0+'` for the 13 Origins 3.1 article IDs listed in `Workbooks/primary/origins-3.1-a0/*_workbook.json` |
| `article` | The bucket names pictures and audio by the legacy id; the new row gets a UUID | D10: write the legacy id into `articles.image`; copy `audio_url` and the other storage paths unchanged; report an article whose `images/<legacyId>_1.png` is absent from the bucket |
| All cuid-keyed tables | New `uuid` keys | D2; every foreign key is rewritten through `primary_legacy_id_map` |
| `primary_legacy_id_map` | The lane-h backfill (`packages/domain/scripts/backfill-primary-tags.ts`) joins Workbooks `tags.json` by legacy id | Write `table_name` as the legacy table names `article` (as the `tutor_compat` views of 0061 join it), `multiple_choice_questions`, `short_answer_questions`, `long_answer_questions` with `legacy_id` = the Prisma cuid and `new_id` = the new uuid; the ETL source is the local snapshot `primary_legacy_20261006` for rehearsals (the April snapshot lacks the 2026-10 content); run the backfill after every ETL run |
| `sessions`, `verifications` | Not needed | Do not move; everyone signs in again |
| Tables with no shared-schema target found by name (`assignment_students`, `logs`, `story_chapters`, `user_activities`, `user_lesson_progress`, `verifications`) | Target unknown | Find the target table or record "dropped" with a reason, before rehearsal 1 |

## 7. Code tasks

| ID | Package | Task | Done when |
|---|---|---|---|
| A1 | ~~`packages/auth`~~ | **Dropped (D7).** `verifyPassword` accepts better-auth scrypt: regex `^[0-9a-f]{32}:[0-9a-f]{128}$`; `scrypt(password.normalize("NFKC"), salt, { N: 16384, r: 16, p: 1, dkLen: 64 })` where `salt` is the **hex string itself** (as better-auth does), constant-time compare | Unit test with a hash made by the legacy `lib/password.ts` passes |
| A2 | `packages/auth` / `packages/api` | Re-hash bcrypt to Argon2id on successful login (done in `b3bf3ef0e`) | Test: after one login the stored hash starts with `$argon2id$` |
| A3 | `apps/primary-advantage`, `packages/api` | Student login endpoint (D5); sign-in form posts `{ studentId, classCode }` | Class-code login works for a migrated student with no account row; works again after the teacher regenerates the code |
| A4 | `apps/primary-advantage` | Fix the student list shape (form reads `student.student.email`; API returns `studentEmail`) | Picking a name after entering a class code renders the list and signs in |
| A5 | `apps/primary-advantage` | Legacy article-ID resolver on `student/read/[articleId]` and `/writing` (D3) | Five printed QR codes from Origins 2 and 3.1 open the right article after sign-in |
| A6 | `packages/db` | ETL script and `primary_legacy_id_map` (§6) | Rehearsal report shows zero unexplained skips |
| A7 | `packages/db` | `tutor_compat` views (D4) | Tutor's four queries return the same rows from the new database as from the legacy one, for every article in Tutor's catalogue |
| A8 | `apps/primary-advantage` | Teacher sign-in page asks for a username only; teacher usernames are `lower(email)` (owner decision 2026-10-04) | A teacher signs in with the email address they used before, typed as the username |
| A9 | `packages/db`, `apps/primary-advantage` | Teacher credential script, hand-out list, and forced password change at first sign-in (D8) | Every migrated teacher has a credential account before go-live; a temporary password works once, then the teacher must set a new one |
| A10 | `apps/primary-advantage`, `packages/db` | Picture key for migrated articles (D10): the app helper reads `articles.image` first (done on `primary/lane-f-reedy-preview`, track `primary_rpg_skin_20261006`); the ETL (A6) fills the column | After the rehearsal, a migrated article shows its picture on the Read list, the story page, and the lesson; a new article made after the cutover shows its picture too |

## 8. Rehearsal (run twice)

1. Take a fresh backup of the legacy Primary database. Restore it to a scratch database.
2. Create an empty database. Create the secret `PRIMARY_V2_DATABASE_URL` for it (a Cloud SQL socket URL; never add a version to the legacy `DATABASE_URL` secret). Grant the Primary Cloud Build service account `roles/cloudsql.client`. Run refuse-legacy-db, then migrate, then doctor against the new database (the Cloud Build steps do this). On Cloud SQL the `postgres` user is not a superuser, and migrations 0052 and 0054 make the migration user act as `durable_job_audit_owner` (`OWNER TO`, `SET ROLE`). So before the first migrate, the migration user creates the roles `durable_job_audit_owner` and `durable_job_queue_runtime` (`NOLOGIN NOINHERIT`) and runs `GRANT durable_job_audit_owner TO CURRENT_USER WITH INHERIT FALSE, SET TRUE`. Rehearsal 1 failed without it (`must be able to SET ROLE "durable_job_audit_owner"`). The roles and the grant are instance-wide, so they stay when the database is dropped.
3. Run the ETL (A6) from scratch to new. Read the reconciliation report. Fix and repeat until it is clean.
4. Run the monorepo Primary build against the new database (staging service or local).
5. Run the go/no-go checklist (§10).
6. Create the `tutor_reader` login and run `packages/db/scripts/tutor-reader-grants.sql` on the new database. Point a Tutor Advantage staging service at the new database as `tutor_reader` (A7). Open three Origins 3.1 lessons and one Reading Advantage Origins 2 lesson in Tutor.
7. Record the timings: backup, ETL, checks. The real cutover must fit in one evening.

Rehearsal 1 finds the problems. Rehearsal 2 runs on a new backup, end to end, with no code change in between.

## 9. Cutover-day runbook

1. Tell the team in the group chat. Put the legacy Primary service in maintenance mode (or stop traffic) so no one writes.
   Check that the five legacy Cloud Scheduler jobs in project `primary-advantage` (`generateArticle`, `ValidateArticles`, `ResetDemoAccount`, `generateStory`, `ValidateStorys`) are still paused: `gcloud scheduler jobs list --project=primary-advantage --location=us-central1` and `--location=asia-southeast1`. They write to the legacy database; the owner turned them off permanently on 2026-10-08.
2. Take the final backup of the legacy database. Keep it.
3. Push `primary-parity-integration` and `master` to GitHub (owner, 2026-10-06: both branches live only on the owner's computer until the cutover point; the owner runs the push, because auto mode can block it). The monorepo deploy in step 6 builds from GitHub.
4. Before the ETL, make sure the secret `PRIMARY_V2_DATABASE_URL` exists for the new database. Make sure the Primary Cloud Build service account has `roles/cloudsql.client`. Make sure the migration user can `SET ROLE durable_job_audit_owner` (§8 step 2). Run refuse-legacy-db, then migrate, then doctor against the new database. Never add a version to the legacy `DATABASE_URL` secret.
5. Run the ETL into the new database inside GCP: `gcloud builds submit <reduced context> --config=apps/primary-advantage/cloudbuild-etl.yaml` (guard, migrate, doctor, ETL, Tutor read check, student sample). Then, on the owner's machine, issue the temporary passwords and run the printed-link check. Check the reconciliation report in the build log. From the owner's machine the ETL took 90 minutes in rehearsal 1 (network tunnel), so do not run it there.
6. Deploy the monorepo revision with `DATABASE_URL` from `PRIMARY_V2_DATABASE_URL`. Pin the secret version for this deploy. Make the first monorepo deploy with `--no-traffic` (manual), or keep the build trigger disabled until cutover. Route traffic to it only after step 6 passes. Keep the legacy revision, unrouted, for rollback.
7. Run §10 on production.
8. Tutor: Wannachok switches `DATABASE_URL_PRIMARY_ADVANTAGE` to the new database with the `tutor_compat` search path, or keeps the legacy database until A7 passes on staging. The legacy database stays online and read-only until Tutor has switched.
9. Send reset links to Google-only teachers (A9). Phone Boonyathat's teachers with the new sign-in steps.
10. Each teacher makes and prints the class sheet for each class (class page → Class sheet → Make class sheet → Print) and gives each student a line of it (owner decision 2026-10-08). In class, students sign in with the class code and their name while the teacher has the class open (3 hours at most). Away from the classroom, they sign in only with the username and password from the sheet. A new sheet sets new passwords for the whole class.

**Rollback:** route traffic back to the legacy revision. It still points at the untouched legacy database, because the legacy revision keeps the `DATABASE_URL` secret and that secret never points at the new database. Any data written to the new database after go-live is lost on rollback; decide within 24 hours.

## 10. Go/no-go checklist

All items pass on the rehearsal and again on production.

**Five logins** (each on a phone and on a computer):

1. A migrated teacher signs in with the temporary password, is made to set a new password, and signs in again with it.
2. The same teacher cannot sign in with the temporary password after the change.
3. Every migrated teacher has a credential account, and the team holds the hand-out list.
4. A student, by class code and name, in a real Boonyathat class. Then the teacher regenerates the code and the student signs in with the new code.
5. The teacher ends the class and makes the class sheet. A student signs in with the username and password from the sheet while no class is open.

Also: one admin and one system user.

**Content and data**

- Every Origins 2 and Origins 3.1 article opens by its old URL (all 27 unique IDs, by script) and by at least five scanned printed QR codes.
- The writing QR code from a printed book opens a working page.
- A student's reading history, XP, and flashcards match the legacy database for five sampled students.
- A teacher sees the right classes and students.
- Reconciliation report: no unexplained skips.

**Tutor Advantage**

- Tutor opens three Origins 3.1 lessons and one Reading Advantage Origins 2 lesson from the new database through `tutor_compat`.

## 11. Calendar

| Date | Step |
|---|---|
| Oct 1 | Confirm §3 in the Cloud Run logs. Send a revised notice: Primary maintenance moves inside Oct 8–20. |
| Oct 1–7 | A1–A10. Content work continues on the legacy database: the Workbooks injector (`Workbooks/measure/tracks/primary_injector_20261001/`) writes the Origins 3.2, Quest 4, and insert lessons there from Oct 4, and the ETL carries them. No content writes on the cutover evening. The Workbooks verify script checks each rehearsal database against the lesson packages. |
| Oct 8–9 | Rehearsal 1 |
| Oct 12–13 | Rehearsal 2 |
| Oct 14–16 | Cutover evening, if rehearsal 2 passed |
| Oct 20 | Last cutover date. If the gate has not passed, Primary stays on the legacy build for semester 2. The next window is the March 2027 break. |
| Oct 22 | Freeze. No deploys until students are back and stable. |

## 12. Open questions

1. Which database does the `DATABASE_URL` secret for the monorepo Primary service point to today? (Answer §3.)
2. The 7 legacy `user`-role accounts: who are they, and which role?
3. Did the legacy app ever print a working `/writing` page? Scan a printed code.
4. Stable book-and-lesson QR URLs for new books (3.2 plan, decision D1): if chosen, add the route in A5.

## Revision history

- 1.7 — 2026-10-08 — Runbook step 5: the ETL runs in GCP (`cloudbuild-etl.yaml`); from the owner's machine it took 90 minutes. D6: students get a permanent two-word username and no email (owner). Rehearsal 1 cloud part: the Cloud SQL migration user needs `SET` membership in `durable_job_audit_owner` (§8 step 2, runbook step 4). Students: D5 superseded; teachers print class sheets for home sign-in (runbook step 10, checklist login 5; owner decision 2026-10-08).
- 1.6 — 2026-10-08 — Rehearsal 1: runbook step 1 checks that the five legacy scheduler jobs stay paused (owner: off permanently). Record: `measure/tracks/primary_legacy_data_migration_20261004/rehearsal-1-20261008.md`.
- 1.5 — 2026-10-06 — Runbook step 3: push the integration branch and master to GitHub at the cutover point (owner).
- 1.4 — 2026-10-06 — D10 decided: article pictures keep the legacy key (`articles.image`), the bucket stays as it is, Tutor sees no change. ETL rule and code task A10 added.
- 1.3 — 2026-10-04 — Review fixes: the monorepo pipeline uses its own secret `PRIMARY_V2_DATABASE_URL`; the Cloud SQL Auth Proxy runs in the migrate steps; the runbook adds the pre-ETL gate steps, a `--no-traffic` first deploy, and a pinned secret version.
- 1.2 — 2026-10-04 — D7 dropped (no live teacher passwords). D8 decided: temporary password plus forced change. ID map table renamed `primary_legacy_id_map` (program prefix rule). A5, A6, A7, A8, A9 move to track `primary_legacy_data_migration_20261004`.
- 1.1 — 2026-10-01 — Calendar in §11 approved by Daniel. Content now arrives through the Workbooks injector, not the admin tool.
- 1.0 — 2026-09-30 — First draft from code and April-backup evidence.
