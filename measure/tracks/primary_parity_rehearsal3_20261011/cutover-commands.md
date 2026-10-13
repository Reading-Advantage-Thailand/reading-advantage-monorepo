# Rehearsal 3 and the next cutover: command sheet base

Base copy of `measure/tracks/primary_legacy_data_migration_20261004/cutover-commands-20261011.md`
(taken 2026-10-12, unchanged below). The "Rehearsal 3 delta" section first marks
every step that changes for rehearsal 3. The frozen commit is still open; Phase 3
writes it into the tables.

## Rehearsal 3 delta (marks on the base tables)

| # | Change for rehearsal 3 |
|---|---|
| R1 | Same command with a new name: `Backup_Primary_<yyyymmdd>-r3.sql.gz`. New R1b: the contact export test below; record the row count, then delete the rehearsal file. |
| R2 | Same (owner). |
| R3 | Build context of the frozen commit (Phase 3 records it). |
| R4 | Same ETL command at `--required-migration 0073_primary_lesson_attempts`. Stories, chapters, and chapter questions load; chapter rows keep a NULL `article_id`. Tutor read check must still give `MATCH`; student sample 5 of 5. New R4b: the catalogue and guide imports (C7b command, `_EXPECTED_LESSONS=70`). |
| R5 | Same with the label `rehearsal3`: `bash ~/Desktop/primary-cutover-inputs/after-etl.sh rehearsal3`. Move old hand-out files away first (they block a rerun). |
| R6 | Same with `--tag=rehearsal3` (the tag is free on 2026-10-12). Record the image digest. |
| R7 | Same script (`scripts/primary-parity/cutover-check.mjs`) at the `rehearsal3` tag URL, plus the new blocks of `rehearsal-3-changes.md` §5: class book assign and lesson, story chapter, staff view mode, lesson resume, old game URL redirect, PWA manifest and worker 200, five public files, and the "qr" block. |
| R8 | Same export pattern with a rehearsal 3 name. Graph runs its tags and evidence backfills on the local copy: expect tags 250/250 articles, 5000 questions, rows 5123/5466/3426; evidence about 1541 jobs and 1615 committed (sources: `primary_objective_tags_20261006/plan.md`, rehearsal 2 record). Workbooks runs the CNT-01 injector write on the same copy: `inject-lessons.ts <pkg> --target new --db-env <VAR> --no-backup --no-upload --no-tutor` then `verify-lessons.ts --target new`. |
| C2 | Check only: the trigger already prints `True`, the five jobs show `PAUSED`. |
| C4b (new) | Contact export from the final backup (FR-3): the `\copy` command below. |
| C5 | `master` already holds the merge of 2026-10-11 (`0a29d574e`). Next: the owner merges `primary-parity-integration` into `master` after a `git merge-tree` check with no conflict. |
| C7 | Context file of the new frozen commit; gate checks `cloudbuild-etl.yaml` against that commit and the `latest` version of `PRIMARY_V2_DATABASE_URL`. New C7b right after C7: catalogue build after the ETL: `gcloud builds submit gs://primary-advantage_cloudbuild/source/<context>.tgz --project=primary-advantage --region=asia-southeast1 --config=apps/primary-advantage/cloudbuild-catalogue.yaml --substitutions=_WORKBOOKS_ARCHIVE=gs://primary-advantage_cloudbuild/source/<archive>.tgz` (the import passes the archive commit with `--workbooks-commit`). Make the archive with `git archive` of Workbooks `08bb160b8cfb4b95252546e6fd0e9ccc31fe3817` (`catalogue-build-commands.md` §1); the config pins secret version 1. Pass: `70 lessons`, `0 failed`, `Print data: 70 stored`, `en: 13 steps`, `th: 13 steps`. |
| C8 | New label (for example `cutover2`), or move the old files away first. |
| C9 | Tag rule from the read-only check of 2026-10-12: tags `rehearsal1`, `rehearsal2`, and `cutover` are taken (`cutover` sits on `00130-daq`), traffic is 100% on legacy `00125-9wd`. Use a new tag name, or remove the old tag first (owner decision, member question 3). Set `TUTOR_LESSON_URL_TEMPLATE` before the deploy when Tutor has the `/b/` route. Check that the rehearsal 3 image still exists first. |
| C10 | New `NEW_PASSWORDS_OUT` file, the new tag URL as `BASE`, and the new R7 checks. |
| C13 | Agent: the R7 checks on the domain, plus the PWA AC-2 `curl -I` on the tag URL: `curl -sI "$BASE/serwist/sw.js"` gives 200, a JavaScript MIME type, `Service-Worker-Allowed: /`, `Cache-Control: no-cache`. Owner: the printed QR scans, plus a phone with the installed legacy app (PWA AC-4, new worker replaces the old one: the worker has a navigation `fetch` handler, and Cache storage lists only `primary-v2-offline-v1`; steps 5-6 of `primary_parity_pwa_20261011/runbook-checks.md`). |

Contact export (one `psql \copy`; runs on a local restore of the backup, writes
outside every repository with mode 600):

```sql
\copy (SELECT id, created_at, status, inquiry, CASE WHEN left(name,1) IN ('=','+','-','@',chr(9),chr(10),chr(13)) THEN ''''||name ELSE name END AS name, CASE WHEN left(institution,1) IN ('=','+','-','@',chr(9),chr(10),chr(13)) THEN ''''||institution ELSE institution END AS institution, CASE WHEN left(email,1) IN ('=','+','-','@',chr(9),chr(10),chr(13)) THEN ''''||email ELSE email END AS email, CASE WHEN left(message,1) IN ('=','+','-','@',chr(9),chr(10),chr(13)) THEN ''''||message ELSE message END AS message FROM contact_messages ORDER BY created_at) TO '~/Desktop/primary-cutover-inputs/contact-messages-<yyyymmdd>.csv' CSV HEADER
```

Base copy starts here. "Rehearsal 2" rows below are history; the delta table
above says what changes.

# Rehearsal 2 (2026-10-10) and cutover (2026-10-11): command sheet

The steps of cutover spec §8 and §9 (`docs/deployment/primary-cutover-migration-spec.md` 1.10) as
commands. "Agent" steps need no database password. "Owner" steps read a password from Secret
Manager, or are outward actions that need the owner's go.

Superseded: this sheet ran on 2026-10-11 and stopped after C10. The command sheet of
`primary_parity_rehearsal3_20261011` replaces it. See [primary_parity_20261011](../../sets/primary_parity_20261011.md).

Status: rehearsal 2 is complete and passed (2026-10-09 06:05 Bangkok, `rehearsal-2-20261010.md`).
The cutover runs on Sunday 2026-10-11. Review fixes of 2026-10-10 (outside review of integration
`7d2d51fd9`): C7 secret-version gate, C10 `BASE`, trigger off in C2, C13 QR scans, rollback data loss.

Fixed names: project `primary-advantage`, Cloud SQL instance `reading-advantage:asia-southeast1:cloud-sql`
(project `reading-advantage`), service `primary-advantage-app` (region `asia-southeast1`), legacy
revision `primary-advantage-app-00125-9wd`, target database `primary_v2`, secret
`PRIMARY_V2_DATABASE_URL` (version 1), domain `primary.reading-advantage.com`.

Frozen code: the Primary build inputs (`apps/primary-advantage`, `packages`, the lockfile and the
root files) at integration `cfef79c88`, the commit that rehearsal 2 built (no change since, checked
2026-10-10). Any change to the build inputs after rehearsal 2 needs a new rehearsal.

## Rehearsal 2 (done 2026-10-08 to 2026-10-09: pass; planned for Saturday 2026-10-10)

| # | Who | Step | Command |
|---|---|---|---|
| R1 | Agent | Backup of the legacy database | `gcloud sql export sql cloud-sql gs://backupsqldatabase/Backup_Primary_2026-10-10.sql.gz --database=primary_advantage --project=reading-advantage` |
| R2 | Owner (the auto-mode classifier refuses the drop for the agent) | New empty target (the roles and the grant of §8 step 2 are instance-wide and stay) | `gcloud sql databases delete primary_v2 --instance=cloud-sql --project=reading-advantage --quiet` then `gcloud sql databases create primary_v2 --instance=cloud-sql --project=reading-advantage` |
| R3 | Agent | Build context of the frozen commit | `git archive --format=tar.gz -o primary-ctx-<rev>.tgz <rev> package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .pnpmfile.cjs .dockerignore apps/primary-advantage packages`, then `gcloud storage cp` to `gs://primary-advantage_cloudbuild/source/` |
| R4 | Agent | ETL inside GCP: guard, migrate, doctor, ETL, Tutor read check, student sample | `gcloud builds submit gs://primary-advantage_cloudbuild/source/primary-ctx-<rev>.tgz --project=primary-advantage --region=asia-southeast1 --config=apps/primary-advantage/cloudbuild-etl.yaml` (regional: next to the database) |
| R5 | Owner | Temporary passwords (hand-out) and the printed-link check | `bash ~/Desktop/primary-cutover-inputs/after-etl.sh rehearsal2` |
| R6 | Agent | The cutover image, deployed without traffic | `gcloud builds submit <same context> --project=primary-advantage --region=asia-southeast1 --config=<cloudbuild.yaml with --no-traffic --tag=rehearsal2>`; record the image `asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/primary-advantage-app:<BUILD_ID>` |
| R7 | Agent | §10 browser check at the `rehearsal2` tag URL, five public files from the image | `.qa-tmp/rehearsal1-gonogo.mjs` (BASE = tag URL); `curl` of `/packs/avatar/1.1.0/catalog.json`, one 3D `pack.json`, `/assets/apk/primary-chibi-2d/v1/pack.json`, `/rpg/skin.json`, `/login-image.png` |
| R8 | Agent | Local copy for graph (backfills) and Workbooks (verify) | `gcloud sql export sql cloud-sql gs://backupsqldatabase/primary_v2_rehearsal2_20261010.sql.gz --database=primary_v2`, download, restore as `primary_rehearsal2_20261010` |
| R9 | Agent | Record the timings in `rehearsal-2-20261010.md` | |

R6 runs after R4: both run migrate on `primary_v2`.

## Cutover (Sunday 2026-10-11, evening Bangkok)

| # | Who | Step | Command |
|---|---|---|---|
| C1 | Owner | Tell the team in the group chat that Primary is closed for the evening | |
| C2 | Agent | Legacy automation is off: the five legacy scheduler jobs are still paused, and the legacy build trigger is turned off now, before C9 (a legacy deploy after C9 can replace the cutover revision) | `gcloud scheduler jobs list --project=primary-advantage --location=us-central1` and `--location=asia-southeast1`; then `gcloud beta builds triggers export primary-advantege-prod --project=primary-advantage --destination=t.yaml`, add `disabled: true`, `gcloud builds triggers import --project=primary-advantage --source=t.yaml`; `gcloud builds triggers describe primary-advantege-prod --project=primary-advantage --format="value(disabled)"` prints `True` |
| C3 | — | Stop legacy writes: an announcement only (owner decision 2026-10-09), no command. A write after C4 is lost | |
| C4 | Agent | Final backup | `gcloud sql export sql cloud-sql gs://backupsqldatabase/Backup_Primary_2026-10-11.sql.gz --database=primary_advantage --project=reading-advantage` |
| C5 | Owner + agent | Merge `primary-parity-integration` into `master` (no conflict on 2026-10-08), push both branches. The master push starts a www deploy: `cd-www-reading-advantage.yml` runs on a master push that changes `packages/**` or the lockfile (about 15 minutes; the merge of 2026-10-06 deployed with no failure). No rehearsal tested this www version. A failed www build does not affect Primary: www stays on its current revision | Owner pushes. Then the agent checks the www deploy: `gh run list --workflow=cd-www-reading-advantage.yml --branch=master --limit=3`. If the run fails, tell the owner; the cutover continues |
| C6 | Owner | New empty target | as R2. If the drop says that other sessions use the database, wait 15 minutes for the idle rehearsal instances to stop, then run it again |
| C7 | Agent | ETL inside GCP (as R4, with the context file of rehearsal 2). First a gate: C7, C8, and C9 must use secret version 1. The ETL config and `after-etl.sh` read `latest`, and C9 pins `:1`. Version 1 is the `primary_v2` URL of rehearsal 2 (R4 wrote through it, the R8 export of `primary_v2` had the 664 users). If a gate check fails, stop and tell the owner | Gate: (1) `gcloud secrets versions describe latest --secret=PRIMARY_V2_DATABASE_URL --project=primary-advantage --format="value(name)"` prints `projects/1064299189080/secrets/PRIMARY_V2_DATABASE_URL/versions/1`; (2) `git -C $HOME/Desktop/rama-worktrees/integration diff --quiet cfef79c88 -- apps/primary-advantage/cloudbuild-etl.yaml` exits 0. ETL: `gcloud builds submit gs://primary-advantage_cloudbuild/source/primary-ctx-cfef79c88.tgz --project=primary-advantage --region=asia-southeast1 --config=$HOME/Desktop/rama-worktrees/integration/apps/primary-advantage/cloudbuild-etl.yaml` |
| C8 | Owner | Temporary passwords and the printed-link check | `bash ~/Desktop/primary-cutover-inputs/after-etl.sh cutover`; the team keeps `handout-cutover-primary_v2.csv` private |
| C9 | Agent | The rehearsal 2 image, secret pinned, no traffic | `gcloud run services update primary-advantage-app --project=primary-advantage --region=asia-southeast1 --image=asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/primary-advantage-app@sha256:d9eeb81fd6e97021b3dbc8332cfd55e68e7c9acb23538cc71f2f690dc5f8a14f --update-secrets=DATABASE_URL=PRIMARY_V2_DATABASE_URL:1 --no-traffic --tag=cutover` (the R6 image of build 735fb4ab; valid only if rehearsal 2 passes) |
| C10 | Agent + owner | §10 at the `cutover` tag URL with the demo teacher, the demo admin, and the demo class; the owner signs in with the own system account on a phone (temporary password, then a new one) | From the main checkout: `BASE=https://cutover---primary-advantage-app-kxpqzttnmq-as.a.run.app NEW_PASSWORDS_OUT=~/Desktop/primary-cutover-inputs/check-passwords-cutover.csv node .qa-tmp/rehearsal1-gonogo.mjs <hand-out> <demo teacher> <demo admin> - first` (`demo-teacher@primary-advantage.com`, `demo-admin@primary-advantage.com`). The script uses `http://localhost:3000` when `BASE` is not set, so always set `BASE`. C9 prints the tag URL: it must be the `BASE` value (same service URL as the `rehearsal2` tag). A rerun is safe: the script signs in with the kept password and continues an open class. The demo class list shows "Student (." five times; the script picks by position (rehearsal 2 finding 1) |
| C11 | Owner go, agent | Route the traffic. Before the owner's go, the agent shows that the trigger is still off and that no legacy deploy runs | Before the go: `gcloud builds triggers describe primary-advantege-prod --project=primary-advantage --format="value(disabled)"` prints `True`; `gcloud builds list --project=primary-advantage --ongoing` and the same with `--region=asia-southeast1` show no build. After the go: `gcloud run services update-traffic primary-advantage-app --project=primary-advantage --region=asia-southeast1 --to-tags=cutover=100` |
| C12 | Agent | Check the routing after the switch (the trigger step moved to C2) | `gcloud run services describe primary-advantage-app --project=primary-advantage --region=asia-southeast1 --format="yaml(status.traffic)"`: 100% on the C9 revision (tag `cutover`); `primary-advantage-app-00125-9wd` stays, with no traffic, for rollback |
| C13 | Agent, then owner | Smoke check on `https://primary.reading-advantage.com`, then the owner scans printed QR codes with a phone camera (spec §10) | Agent: sign-in page, one article by its old URL, the five public files. Owner: scan at least five printed QR codes, one of them the writing QR code; each scan must open a working page. If a check or a scan fails, stop before C14: the agent opens the failed URL and reports the cause, and the owner decides: go on to C14 and fix later, hold C14 until a fix, or roll back (below) |
| C14 | Owner and team | Hand-out list to the teachers, reset links for Google-only teachers, phone calls; each teacher prints the class sheets | runbook steps 9 and 10 |

If the cutover stops before C11, the traffic stays on the legacy revision and no rollback is
necessary. The legacy trigger stays off until the owner asks to turn it on again (import with
`disabled: false`).

Rollback (owner decision only, within 24 hours): `gcloud run services update-traffic primary-advantage-app --project=primary-advantage --region=asia-southeast1 --to-revisions=primary-advantage-app-00125-9wd=100`.
Data loss: the legacy revision reads only the legacy database. So a rollback loses every write to the
new database after C11 (spec §9): new passwords, class codes and class sheets, reading history, XP,
and flashcards. Before C14 these are only the writes of the check accounts. The legacy database has
no block (C3), so no database command is necessary. The legacy trigger stays off.

## Accounts for the production check (owner decision 2026-10-09)

The check sets a new password for the teacher and the admin, and the class sheet sets new
passwords for the whole class. So on production the script uses the demo teacher, the demo admin,
and the demo class (5 students), and skips the system user (`-`). The script writes the new demo
passwords to `~/Desktop/primary-cutover-inputs/check-passwords-cutover.csv` (mode 600); it never
prints a password. The owner checks the system role with the own account on a phone.

## Tutor (owner decision 2026-10-09)

Tutor keeps reading the legacy database on Sunday. It switches after its staging check, in the
first week (spec §9 step 8).
