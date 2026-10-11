# Spec — Side-by-side acceptance kit for the Primary parity work

Track ID: `primary_parity_acceptance_20261011`
Type: chore (Classic FR list)
Owner decision: Q-03 "both" (2026-10-11): a side-by-side browser check against legacy `bfea121` on a
rehearsal copy with the same school data, then the owner's look check.

## Overview

Every port member of the set must show that the new page does the job of the legacy page. A matching
route name is not evidence. So each member needs the same tool: legacy `bfea121` and the new build,
each on a local copy of the same school data, the same user signed in to each app, captures of each
page pair, and a report that puts the pairs side by side with a behavior checklist.

This track builds that kit. It makes a matched pair of local database copies from one legacy backup,
runs one app at a time with a production build, signs in the same users in both apps, captures a list
of page pairs, and writes a report for each member. It also gives the behavior contract template that
each port member fills before it builds. The kit lives outside the Primary build inputs, so a fix to
the kit after a freeze does not change the frozen build.

## Track Set

This track is member 1 of the track set [Primary Parity Before the Cutover](../../sets/primary_parity_20261011.md). Depends on: none. The shared decisions and the start gate in the set overview apply to this track.

## Verified Facts (2026-10-11, integration `ca8869cea`, legacy `bfea121`)

- F-1. **Legacy app.** Next.js 16 with Prisma 6.19 and npm (`package.json`, `package-lock.json`).
  Scripts: `build` (`next build`), `start` (`next start`), `prisma:generate`. The checkout has no
  `node_modules` and no `.next`. `next.config.ts` sets `output: "standalone"` and wraps the config
  with Serwist (a service worker). The Dockerfile builds on Node 22 with
  `NODE_OPTIONS=--max-old-space-size=8192`; this machine has 7 GB.
- F-2. **Legacy environment.** `.env.local` has these names: `ACCESS_KEY`, `APP_URL`,
  `AUDIO_API_KEY`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `AUTH_SECRET`, `AUTH_TRUST_HOST`,
  `AUTH_URL`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `CONTACT_EMAIL_ENABLED`,
  `CONTACT_NOTIFY_EMAIL`, `DATABASE_URL`, `GOOGLE_API_KEY`, `GOOGLE_GENERATIVE_AI_API_KEY`,
  `NEXT_PUBLIC_BETTER_AUTH_URL`, `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`, `NODE_ENV`, `OPENAI_API_KEY`,
  `PROJECT_ID`, `RECAPTCHA_SECRET_KEY`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`,
  `STORAGE_BUCKET_NAME`, `STORAGE_CLIENT_EMAIL`, `STORAGE_PRIVATE_KEY`, `VERTEX_CLIENT_EMAIL`,
  `VERTEX_PRIVATE_KEY`. Its `DATABASE_URL` points at a Docker host (`my_postgres:5432/myapp`). It
  holds live keys for email, reCAPTCHA, storage writes, AI, and Google sign-in, and
  `CONTACT_EMAIL_ENABLED` is `"true"`. The kit must not use this file.
- F-3. **Legacy sign-in.** Better-Auth with email and password, and Google (`lib/auth.ts:18-55`).
  Password hashes are scrypt `<hex salt>:<hex key>` with N 16384, r 16, p 1, 64 bytes, NFKC
  (`lib/password.ts:8-45`); bcrypt hashes also pass. Staff use the "teacher" tab with email and
  password (`app/[locale]/auth/signin/page.tsx:19-28`). Most teachers use Google today, so most staff
  have no password account. A student types the class code and picks the name
  (`components/auth/student-signin-form.tsx:42-120`). The class code is the column
  `classrooms.password_students`, with an optional `code_expires_at`
  (`server/models/classroomModel.ts:821-840`, `lib/auth.ts:127-128`).
- F-4. **Legacy files.** Pictures and audio load from public URLs
  `https://storage.googleapis.com/<bucket>/<path>` (`lib/storage-config.ts:6-20`). Only a write needs
  `STORAGE_PRIVATE_KEY`.
- F-5. **New app.** Package `primary-advantage`. `build` is
  `NODE_OPTIONS=--max-old-space-size=4096 next build` (after `prebuild`, the asset sync); `start` is
  `next start`. `.env` points at the local pool (port 6432) and the direct port (5432); `.env.local`
  is a copy of the legacy names and points at `my_postgres`. The process environment wins over the env
  files, so the kit sets `DATABASE_URL` and `DIRECT_DATABASE_URL` in the shell. Rehearsal 1 did this:
  `next build` (9 min), then `next start` on port 3005
  (`measure/tracks/primary_legacy_data_migration_20261004/rehearsal-1-20261008.md:71-72`). The theme
  follows the system setting (`app/[locale]/layout.tsx:111-114`), so a browser color scheme selects
  day or night.
- F-6. **New sign-in.** Staff use the Teacher tab with username and password (`/api/auth/login`). A
  temporary password gives 403 and the forced change. `.qa-tmp/rehearsal1-gonogo.mjs` (main checkout,
  untracked) signs in this way, keeps each new password in a private file (`NEW_PASSWORDS_OUT`), and
  never prints a password. It also starts a class, signs a student in with the code and the name, and
  reads a username and password from the class sheet. `tests/e2e/visual-baselines.spec.ts` signs in
  through `/api/auth/login` and takes full-page captures at 375, 768, and 1280 px.
- F-7. **Matching rows.** The ETL keeps the legacy user id (`packages/db/src/migrations-data/primary-legacy-import.ts:144-151`),
  so a user has the same `users.id` in both copies. Staff usernames are `lower(email)` (decision D6),
  except the two accounts of `usernames.json` (the part before "@"). Students get a username of two
  words and two digits. Classes, articles, and the other rows get new ids through
  `primary_legacy_id_map` (`packages/db/src/schema/primary.ts:244-255`). The new app opens an old
  article id by a redirect.
- F-8. **Private inputs.** `~/Desktop/primary-cutover-inputs/` (mode 700) holds the ETL inputs
  `roles.json`, `usernames.json`, and `teachers.json`, the script `after-etl.sh`, and the hand-out
  files (header `school,name,role,username,temporary password`). The kit reads only the three ETL
  inputs.
- F-9. **Local copies.** `primary_legacy_20261007` (legacy export of 2026-10-07) and
  `primary_rehearsal2_20261010` (the ETL of the backup of 2026-10-08) come from two backups, so they
  are not a matched pair. The C4 backup `gs://backupsqldatabase/Backup_Primary_2026-10-11.sql.gz`
  (30,420,669 bytes) is the newest legacy state. Rehearsal 2 restored a dump on the local Postgres in
  7 s, with two harmless errors (role `cloudsqlsuperuser`, `transaction_timeout`). `pnpm db:start`
  starts the local Postgres 16 (port 5432) and the pool (port 6432).
- F-10. **Build inputs.** The frozen Primary build inputs are `apps/primary-advantage`, `packages`,
  the lockfile, and the root files of the build context (`cutover-commands-20261011.md` R3). The root
  `scripts/` folder is outside them. The root `node_modules` has `playwright`, `zod`, `postgres`,
  `vitest`, and `tsx`.
- F-11. **Code to reuse.** `findLegacyDatabaseMarkers` (`packages/db/src/legacy-db-guard.ts`) finds
  the legacy tables `public.article` and `public._prisma_migrations`. `isInsideDirectory`
  (`apps/primary-advantage/lib/cutover/temporary-passwords.ts:55-58`) checks a path against a folder.
  `apps/primary-advantage/scripts/issue-temporary-passwords.ts` gives staff temporary passwords and
  refuses an output file inside the repository.

## Functional Requirements

- FR-1. **Matched copies.** One legacy backup gives both copies. The default backup is the C4 backup
  of F-9. The runbook (FR-12) gives the commands:
  1. Download the backup to the private folder and restore it as `primary_legacy_<yyyymmdd>`.
  2. Create `primary_parity_<yyyymmdd>`. Run the guard (`packages/db/scripts/refuse-legacy-db.ts`),
     the migrations (`npx tsx scripts/migrate.ts` in `packages/db`), and the migration doctor.
  3. Run the ETL from the legacy copy with `--roles`, `--usernames`, and `--teachers` (F-8), then
     `student-sample-check`.
  4. Run the catalogue and guide imports as `primary_parity_class_books_20261011` defines them, when
     that member has them.
  The two copies stay read only. Each run uses clones made with `createdb -T <copy>`. The kit never
  uses the shared local database `primary_advantage`.
- FR-2. **Legacy app run.** Export legacy `bfea121` with `git archive` into
  `~/Desktop/primary-parity-acceptance/legacy-app/`, so the legacy repository gets no file. Write a
  kit env file there with these values: `DATABASE_URL` = the legacy clone; `BETTER_AUTH_SECRET` and
  `AUTH_SECRET` = a new random local value; `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`,
  `AUTH_URL`, and `APP_URL` = `http://localhost:3100`; `STORAGE_BUCKET_NAME` = `primary-app-storage`;
  `CONTACT_EMAIL_ENABLED` = `false`; `NODE_ENV` = `production`. Leave out the email, reCAPTCHA,
  storage write, Google sign-in, and AI keys (Member question 1). Then run `npm ci`,
  `npx prisma generate`, `NODE_OPTIONS=--max-old-space-size=4096 npx next build`, and
  `PORT=3100 npx next start`. The build runs once and stays on disk, because `bfea121` does not change.
- FR-3. **New app run.** Build the commit under test with `pnpm --filter primary-advantage build`.
  Start it with `DATABASE_URL` and `DIRECT_DATABASE_URL` set to the new clone and `PORT=3005`. Record
  the commit in the report.
- FR-4. **One app at a time.** The runbook gives this order: legacy build (once), legacy server,
  legacy captures, stop; new build, new server, new captures, stop; report. Before each build, the
  operator stops every other heavy job, records `free -m`, and tells the peer sessions (Forge,
  Workbooks, graph). The kit never starts a dev server.
- FR-5. **Accounts.** `scripts/primary-parity/accounts.ts`:
  1. Takes the user ids, or picks them: one SYSTEM user, one ADMIN and one TEACHER of one school, and
     one or two STUDENT users of a class of that teacher. Each user is in both copies.
  2. Legacy clone: writes a password account (`provider_id` = `credential`) with a scrypt hash in the
     format of F-3 for each staff user, with one new random kit password for each user. Reads the class
     code (`password_students`) of the student class, and sets a new random code if it is empty or
     expired.
  3. New clone: reads the usernames from `users`, and prints the command of
     `issue-temporary-passwords.ts` for the operator (with `--system` for the SYSTEM user and an
     `--out` file in the private folder).
  4. Writes `~/Desktop/primary-parity-acceptance/accounts.json` with mode 600: for each role, the user
     id, the legacy sign-in, and the new sign-in.
  The capture script (FR-8) does the forced change of each new staff user once and keeps the new
  password in the same file. For a new student, the matched teacher makes the class sheet, and the
  kit reads the row with the matched username. The kit never prints a password or a class code.
- FR-6. **Guards.** The kit refuses to run when a database host is not `localhost`, `127.0.0.1`, or
  `::1`; when a database is `primary_advantage`; when the legacy URL has no legacy marker or the new
  URL has one (F-11); when an app base URL is not `http://localhost:<port>`; or when an output file is
  inside a git repository. Each browser context blocks service workers, because legacy registers one.
- FR-7. **Pair list contract.** A Zod schema in `scripts/primary-parity/pairs.ts` defines
  `measure/tracks/<member>/acceptance-pairs.json`:
  - `member`: the track ID.
  - `pairs[]`: `id`; `rows` (triage IDs); `role` (`SYSTEM`, `ADMIN`, `TEACHER`, `STUDENT`, or
    `PUBLIC`); `legacyPath` and `newPath` (with the locale, for example `/en/system/dashboard`);
    `widths` (default `[375, 1280]`); `colorSchemes` (default `["light"]`); `waitFor` (an optional
    selector for each app); `steps` (an optional module that exports `legacy(page)` and `new(page)`,
    for a behavior that needs clicks); `checks[]` (`id` and the observable behavior).
  - Placeholders: `{map:<table>:<legacyId>}` (the new id from `primary_legacy_id_map`) and
    `{user:<ROLE>}` (the matched user id).
  The file has no name, no password, and no class code.
- FR-8. **Capture.** `npx tsx scripts/primary-parity/capture.ts --app legacy|new --base <url>
  --pairs <file> --accounts <file> --out <folder>`. It signs in once for each role and keeps the
  browser state in the private folder. For each pair, width, and color scheme, it opens the page
  (`load`, then a network idle wait of 30 s at most, 3 tries on a network error), waits for
  `waitFor`, runs `steps`, and saves a full-page PNG, the visible text of `main` (or `body`) as
  `.txt`, the HTTP status, the final URL, and the count of console errors. Layout:
  `<out>/<member>/<pair id>/<app>-<width>-<scheme>.png` and `.txt`, and `capture-<app>.json`.
- FR-9. **Report.** `npx tsx scripts/primary-parity/report.ts --pairs <file> --out <folder>` writes
  `report.html` and `report.md` in `<out>/<member>/`. For each pair: the rows, the role, the two
  paths, the legacy capture and the new capture side by side for each width, the status and the final
  URL, the text lines that only legacy has and that only the new app has (spaces normalized), and the
  checklist with empty "Result" and "Note" cells. A missing capture shows "not captured". The HTML
  uses relative image paths and loads no file from the network.
- FR-10. **Summary in the repository.** Each member writes `measure/tracks/<member>/acceptance.md`
  from the template in the runbook: the date, legacy `bfea121`, the new commit, the copy names, the
  result of each check, and the owner's look check. The captures and the report stay in the private
  folder, because they show real names. A capture that goes into the repository shows only the demo
  school or QA data.
- FR-11. **Behavior contract template.** `docs/runbooks/primary-behavior-contract-template.md`, with
  these sections:
  1. Rows and owner decisions (with dates).
  2. Legacy behavior: what the user does, what the app shows, and the roles, each with `file:line` at
     `bfea121`.
  3. Data read and written: tables and columns, routes, side effects (XP, logs, email), and the
     permission checks.
  4. New target: the Drizzle tables (and a migration, if the schema changes), the domain functions
     with Zod input and output, the permission action for `assertCan`, the TenantDB class (FLAT,
     EXEMPT, or REFERENTIAL), the AI adapter use, the RPG skin components, and the routes.
  5. Differences on purpose: the UX changes, each with the owner decision.
  6. Acceptance rows: pair id, legacy page, new page, role, observable behavior, data check, result.
  7. ETL and runbook changes, for `primary_parity_rehearsal3_20261011`.
- FR-12. **Runbook.** `docs/runbooks/primary-parity-acceptance.md` gives the full procedure of FR-1 to
  FR-10 as commands, the machine rules of FR-4, the private folder layout, and the summary template.
- FR-13. **Go/no-go script in the repository.** Copy `.qa-tmp/rehearsal1-gonogo.mjs` from the main
  checkout to `scripts/primary-parity/cutover-check.mjs` with no change in behavior. Then the members
  (class books, stories, staff student view) add their blocks to a tracked file, and rehearsal 3 runs
  it.
- FR-14. **Smoke run.** The first run uses three pairs from Table A of
  `primary_parity_records_20261011`: the system dashboard as SYSTEM (SYS-01), the admin dashboard as
  ADMIN (ADM-01), and the summary of a finished lesson as STUDENT (STU-05).

## Non-Functional Requirements

- NFR-1. No change to the Primary build inputs (F-10). The kit is in `scripts/primary-parity/`
  (TypeScript, run with `tsx`) and imports the helpers of F-11. It adds no dependency, because a new
  root dependency changes the lockfile.
- NFR-2. Every exported function has JSDoc (`AGENTS.md`). Tests use Vitest
  (`npx vitest run --root scripts/primary-parity`).
- NFR-3. No password, class code, database URL, or real name in the console output, the report text
  in the repository, or a commit. The private folder `~/Desktop/primary-parity-acceptance/` has mode
  700; the files with passwords have mode 600.
- NFR-4. The legacy repository and its working tree get no change (`git status --short` stays empty).
- NFR-5. No write to a production database or to the production bucket. The kit has no storage write
  key, no email key, and no Google sign-in key.
- NFR-6. The report is an internal tool page, not a product page. It does not use the RPG skin. The
  owner checks its layout once (Phase 1).

## Acceptance Criteria

- AC-1. On one matched pair of copies, the smoke run (FR-14) captures both apps at 375 px and 1280 px.
  The report shows: on `/en/system/dashboard` as SYSTEM, the legacy metric cards against the new
  heading and the text "System Dashboard Description"; on `/en/admin/dashboard` as ADMIN, the legacy
  KPI cards against three "Data unavailable" cards; on the lesson summary of the same finished lesson
  as STUDENT, the legacy restart button against no restart button.
- AC-2. For each of the four roles, the same `users.id` signs in to both apps.
- AC-3. A search of the console logs, the private reports, and the repository finds no password and no
  class code of the run.
- AC-4. The guard tests show a refusal for each case of FR-6.
- AC-5. After the run, `git -C ~/Desktop/primary-advantage status --short` is empty, and
  `git diff --stat <start>..HEAD -- apps/primary-advantage packages pnpm-lock.yaml` is empty.
- AC-6. The runbook records the time and the free memory of each heavy step, and no step ran next to
  another heavy step.
- AC-7. The owner accepts the report layout and the behavior contract template.

## Out of Scope

- The acceptance of any member's rows (each member runs its own pairs; rehearsal 3 runs all of them).
- A run of the kit on Cloud Run or against a production database.
- Changes to the legacy app, or a fix of a legacy bug to make a capture work.
- A pixel diff. The report compares captures side by side and compares the visible text; people judge
  the look.
- New checks in `cutover-check.mjs` (the members add them).

## Member Questions

1. **AI features.** The kit leaves out the AI keys, so the SAQ and LAQ feedback, the lesson chatbot,
   and the image tools do not run in a capture. Default: a member that changes an AI feature checks it
   with its tests and one run with the owner's key, and records the cost. Does the owner want the AI
   keys in the kit runs?
2. **Legacy build on 7 GB.** The legacy Dockerfile uses 8 GB for the build heap. The kit uses 4 GB.
   If the build fails from memory, the fallback is to pull the image of the legacy revision
   `primary-advantage-app-00125-9wd` and run it with Podman (no image build). Does the owner allow the
   pull of the production image for local use?
