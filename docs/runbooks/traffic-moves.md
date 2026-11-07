# Runbook: traffic moves of the gated apps

Track `per_app_cicd_20261107`, decisions D1, D2, and D7. A push to `master` builds a new
revision of each affected gated app with `--no-traffic` and a tag. No push changes a production
database, and no push moves traffic. A person starts the traffic file of an app by hand. Only
Daniel's word starts a traffic file. No workflow runs a traffic file.

## Rules for every traffic file

- The new revision must start against the old schema. The push deploys the new code before the
  database steps run. The database steps run later, inside the traffic file.
- Each traffic file runs the database steps first and the traffic move (`update-traffic`) last.
  A failed database step stops the build, and the traffic does not move.
- Each traffic file sends 100 percent of the traffic to the tag of the new revision. It never
  names a revision by number.
- Start a traffic file with `gcloud builds submit --project=<project> --config=<file> .` from
  the repository root at the commit of the push. Add `--substitutions=<name>=<value>` for each
  substitution that the section names.
- The rollback is a traffic move to the previous revision. It does not undo a database step.

## primary-advantage

File: `apps/primary-advantage/cloudbuild-traffic.yaml`. Project: `primary-advantage`.
Substitution: `_TAG`, the tag of the new revision, for example `pa-1a2b3c4d`. The push file
`apps/primary-advantage/cloudbuild.yaml` holds no database step. The new revision must start
against the old schema.

Steps, in order: `refuse-legacy-db`, `migrate-db`, `doctor-check`, `update-traffic`.

- `refuse-legacy-db` is a read-only guard. It refuses to migrate the legacy Primary database
  that Tutor reads.
- `doctor-check` keeps its argument `--required-migration 0074_primary_help_events`.

## accounts

File: `apps/accounts/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitution: `_TAG`,
for example `ac-1a2b3c4d`. The push file `apps/accounts/cloudbuild.yaml` holds no database step.
The new revision must start against the old schema.

Steps, in order: `migrate-company-identity`, `bootstrap-company-identity`,
`doctor-company-identity`, `bootstrap-production-identity`, `runtime-db-contract`,
`update-traffic`.

## accounting

File: `apps/accounting/cloudbuild-traffic.yaml`. Project: `reading-advantage`. No substitution:
the traffic goes to the tag `candidate`, which the latest push owns. The push file
`apps/accounting/cloudbuild.yaml` holds no database step. The new revision must start against the
old schema.

Steps, in order: `migrate-db`, `doctor-check`, `runtime-db-contract`, `update-traffic`.

## codecamp-advantage

File: `apps/codecamp-advantage/cloudbuild-traffic.yaml`. Project: `reading-advantage`. No
substitution: the traffic goes to the tag `sso-candidate`, which the latest push owns. The push
file `apps/codecamp-advantage/cloudbuild.yaml` holds no database step. The new revision must
start against the old schema.

Steps, in order: `migrate-db`, `doctor-check`, `update-traffic`.

## marketing

File: `apps/marketing/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitution:
`_TAG`, the candidate tag of the push build. The tag is `c` plus the first segment of the
`BUILD_ID` of the push build, for example `c1a2b3c4d`. The push file
`apps/marketing/cloudbuild.yaml` holds no database step. The new revision must start against the
old schema.

Steps, in order: `migrate-db`, `doctor-check`, `runtime-db-contract`, `update-traffic`.

## sales-advantage

File: `apps/sales-advantage/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitutions:
`_RELEASE_COMMIT_SHA`, `_CURRICULUM_BACKUP_ID`, and `_CURRICULUM_BACKUP_NOT_BEFORE` for the
backup guard, and `_PUSH_BUILD_ID`, the `BUILD_ID` of the push build whose image the tagged
revisions run. The traffic goes to the tag `candidate`, which the latest push owns. The push file
`apps/sales-advantage/cloudbuild.yaml` holds no database step. The new revision must start against
the old schema.

Steps, in order: `verify-curriculum-backup`, `migrate-db`, `doctor-check`,
`build-curriculum-workspace-deps`, `seed-production-curriculum`, `verify-production-curriculum`,
`runtime-db-contract`, `capture-legacy-rollback`, `verify-repair-verify-legacy-rollback`,
`update-traffic`.

- `verify-curriculum-backup` is the guard. It checks the curriculum backup before the seed.
- `capture-legacy-rollback` runs before `verify-repair-verify-legacy-rollback`. The second step
  reads the URL of the tagged `legacy-rollback` revision that the first step writes.

## Open limits (2026-11-07)

- No traffic file has run. The files are checked as text only.
- The step `capture-legacy-rollback` calls `capture-sales-cloud-run-tag.sh`. The script requires
  that the tagged revision is the latest created revision. After the push deploys the candidate,
  the tag `legacy-rollback` is no longer the latest created revision. The first run of the sales
  traffic file can fail at this check. Daniel and the owner of the sales app decide how to change
  the script.
- The workbooks app has no traffic file. A first service of the app must exist before a push can
  build a revision of it.
