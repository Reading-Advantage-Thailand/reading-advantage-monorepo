# Rehearsal 2 (2026-10-10) and cutover (2026-10-11): command sheet

The steps of cutover spec §8 and §9 (`docs/deployment/primary-cutover-migration-spec.md` 1.8) as
commands. "Agent" steps need no database password. "Owner" steps read a password from Secret
Manager, or are outward actions that need the owner's go.

Fixed names: project `primary-advantage`, Cloud SQL instance `reading-advantage:asia-southeast1:cloud-sql`
(project `reading-advantage`), service `primary-advantage-app` (region `asia-southeast1`), legacy
revision `primary-advantage-app-00125-9wd`, target database `primary_v2`, secret
`PRIMARY_V2_DATABASE_URL` (version 1), domain `primary.reading-advantage.com`.

Frozen code: the Primary build inputs (`apps/primary-advantage`, `packages`, the lockfile and the
root files) at the integration commit that rehearsal 2 builds (on 2026-10-08: `cfef79c88`). Any
change to the build inputs after rehearsal 2 needs a new rehearsal.

## Rehearsal 2 (Saturday 2026-10-10)

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
| C2 | Agent | The five legacy scheduler jobs are still paused | `gcloud scheduler jobs list --project=primary-advantage --location=us-central1` and `--location=asia-southeast1` |
| C3 | — | Stop legacy writes: an announcement only (owner decision 2026-10-09), no command. A write after C4 is lost | |
| C4 | Agent | Final backup | `gcloud sql export sql cloud-sql gs://backupsqldatabase/Backup_Primary_2026-10-11.sql.gz --database=primary_advantage --project=reading-advantage` |
| C5 | Owner + agent | Merge `primary-parity-integration` into `master` (no conflict on 2026-10-08), push both branches | Owner pushes |
| C6 | Owner | New empty target | as R2 |
| C7 | Agent | ETL inside GCP | as R4 (same context file as rehearsal 2) |
| C8 | Owner | Temporary passwords and the printed-link check | `bash ~/Desktop/primary-cutover-inputs/after-etl.sh cutover`; the team keeps `handout-cutover-primary_v2.csv` private |
| C9 | Agent | The rehearsal 2 image, secret pinned, no traffic | `gcloud run services update primary-advantage-app --project=primary-advantage --region=asia-southeast1 --image=asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/primary-advantage-app@sha256:d9eeb81fd6e97021b3dbc8332cfd55e68e7c9acb23538cc71f2f690dc5f8a14f --update-secrets=DATABASE_URL=PRIMARY_V2_DATABASE_URL:1 --no-traffic --tag=cutover` (the R6 image of build 735fb4ab; valid only if rehearsal 2 passes) |
| C10 | Agent + owner | §10 at the `cutover` tag URL with the demo teacher, the demo admin, and the demo class; the owner signs in with the own system account on a phone (temporary password, then a new one) | `NEW_PASSWORDS_OUT=~/Desktop/primary-cutover-inputs/check-passwords-cutover.csv node .qa-tmp/rehearsal1-gonogo.mjs <hand-out> <demo teacher> <demo admin> - first` |
| C11 | Owner go, agent | Route the traffic | `gcloud run services update-traffic primary-advantage-app --project=primary-advantage --region=asia-southeast1 --to-tags=cutover=100` |
| C12 | Agent | Turn off the legacy build trigger | `gcloud beta builds triggers export primary-advantege-prod --project=primary-advantage --destination=t.yaml`; add `disabled: true`; `gcloud builds triggers import --project=primary-advantage --source=t.yaml` |
| C13 | Agent | Smoke check on `https://primary.reading-advantage.com` | sign-in page, one article by its old URL, the five public files |
| C14 | Owner and team | Hand-out list to the teachers, reset links for Google-only teachers, phone calls; each teacher prints the class sheets | runbook steps 9 and 10 |

Rollback (decide within 24 hours): `gcloud run services update-traffic primary-advantage-app --project=primary-advantage --region=asia-southeast1 --to-revisions=primary-advantage-app-00125-9wd=100`. The legacy database has no block (C3), so nothing else is needed.

## Accounts for the production check (owner decision 2026-10-09)

The check sets a new password for the teacher and the admin, and the class sheet sets new
passwords for the whole class. So on production the script uses the demo teacher, the demo admin,
and the demo class (5 students), and skips the system user (`-`). The script writes the new demo
passwords to `~/Desktop/primary-cutover-inputs/check-passwords-cutover.csv` (mode 600); it never
prints a password. The owner checks the system role with the own account on a phone.

## Tutor (owner decision 2026-10-09)

Tutor keeps reading the legacy database on Sunday. It switches after its staging check, in the
first week (spec §9 step 8).
