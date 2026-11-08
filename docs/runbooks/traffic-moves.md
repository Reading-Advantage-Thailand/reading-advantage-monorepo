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
- Find the build of a push in the GitHub Actions run `CD — gated apps` of that push. The job
  `Build <app> with no traffic` prints the Cloud Build id in the log of the step
  `Submit Cloud Build`. The first 8 characters of that id are the end of the tag.
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

Find the tag after a push:

- Read the build id in the GitHub Actions log of the push job (step `Submit Cloud Build`). `_TAG` is `pa-` plus the first 8 characters of this id.
- Or list the builds of the project and read the newest build id:
  `gcloud builds list --project=primary-advantage --limit=5 --format='table(id,createTime,status)'`.
- Check that the revision exists with this tag. Read the tag list of the service:
  `gcloud run services describe primary-advantage-app --region=asia-southeast1 --project=primary-advantage --format="value(status.traffic.extract(tag).flatten())"`.
  List the newest revisions with
  `gcloud run revisions list --service=primary-advantage-app --region=asia-southeast1 --project=primary-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`.

## accounts

File: `apps/accounts/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitution: `_TAG`,
for example `ac-1a2b3c4d`. The push file `apps/accounts/cloudbuild.yaml` holds no database step.
The new revision must start against the old schema.

Steps, in order: `migrate-company-identity`, `bootstrap-company-identity`,
`doctor-company-identity`, `bootstrap-production-identity`, `runtime-db-contract`,
`update-traffic`.

Find the tag after a push:

- Read the build id in the GitHub Actions log of the push job (step `Submit Cloud Build`). `_TAG` is `ac-` plus the first 8 characters of this id.
- Or list the builds of the project and read the newest build id:
  `gcloud builds list --project=reading-advantage --limit=5 --format='table(id,createTime,status)'`.
- Check that the revision exists with this tag. Read the tag list of the service:
  `gcloud run services describe accounts --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.extract(tag).flatten())"`.
  List the newest revisions with
  `gcloud run revisions list --service=accounts --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`.

## accounting

File: `apps/accounting/cloudbuild-traffic.yaml`. Project: `reading-advantage`. No substitution:
the traffic goes to the tag `candidate`, which the latest push owns. The push file
`apps/accounting/cloudbuild.yaml` holds no database step. The new revision must start against the
old schema.

Steps, in order: `migrate-db`, `doctor-check`, `runtime-db-contract`, `update-traffic`.

Find the tag after a push: the tag is the fixed name `candidate`. No substitution is needed.

- Check which revision holds the tag now:
  `gcloud run services describe accounting --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.filter(tag='candidate').extract(revisionName).flatten())"`.
- Limit: every later push moves the tag `candidate` to its new revision. The traffic file sends the
  traffic to the revision that holds the tag when the file runs, not to a build that a person names.
  Compare the revision with the newest revision from
  `gcloud run revisions list --service=accounting --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`
  and with the push build in the GitHub Actions log before the run.

## codecamp-advantage

File: `apps/codecamp-advantage/cloudbuild-traffic.yaml`. Project: `reading-advantage`. No
substitution: the traffic goes to the tag `sso-candidate`, which the latest push owns. The push
file `apps/codecamp-advantage/cloudbuild.yaml` holds no database step. The new revision must
start against the old schema.

Steps, in order: `migrate-db`, `doctor-check`, `update-traffic`.

Find the tag after a push: the tag is the fixed name `sso-candidate`. No substitution is needed.

- Check which revision holds the tag now:
  `gcloud run services describe codecamp-advantage --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.filter(tag='sso-candidate').extract(revisionName).flatten())"`.
- Limit: every later push moves the tag `sso-candidate` to its new revision. The traffic file sends
  the traffic to the revision that holds the tag when the file runs, not to a build that a person
  names. Compare the revision with the newest revision from
  `gcloud run revisions list --service=codecamp-advantage --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`
  and with the push build in the GitHub Actions log before the run.

## marketing

File: `apps/marketing/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitution:
`_TAG`, the candidate tag of the push build. The tag is `c` plus the first segment of the
`BUILD_ID` of the push build, for example `c1a2b3c4d`. The push file
`apps/marketing/cloudbuild.yaml` holds no database step. The new revision must start against the
old schema.

Steps, in order: `migrate-db`, `doctor-check`, `runtime-db-contract`, `update-traffic`.

Find the tag after a push:

- Read the build id in the GitHub Actions log of the push job (step `Submit Cloud Build`). `_TAG` is `c` plus the first segment of this id (the characters before the first dash).
- Or list the builds of the project and read the newest build id:
  `gcloud builds list --project=reading-advantage --limit=5 --format='table(id,createTime,status)'`.
- Check that the revision exists with this tag. Read the tag list of the service:
  `gcloud run services describe marketing --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.extract(tag).flatten())"`.
  List the newest revisions with
  `gcloud run revisions list --service=marketing --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`.

## sales-advantage

File: `apps/sales-advantage/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitutions:
`_RELEASE_COMMIT_SHA`, `_CURRICULUM_BACKUP_ID`, and `_CURRICULUM_BACKUP_NOT_BEFORE` for the
backup guard, and `_PUSH_BUILD_ID`, the `BUILD_ID` of the push build whose image the tagged
revisions run. The traffic goes to the `candidate` revision of that push build, not to a tag. The
push file `apps/sales-advantage/cloudbuild.yaml` holds no database step. The new revision must
start against the old schema.

Steps, in order: `verify-curriculum-backup`, `migrate-db`, `doctor-check`,
`build-curriculum-workspace-deps`, `seed-production-curriculum`, `verify-production-curriculum`,
`runtime-db-contract`, `capture-legacy-rollback`, `verify-repair-verify-legacy-rollback`,
`capture-company-candidate`, `update-traffic`.

- `verify-curriculum-backup` is the guard. It checks the curriculum backup before the seed.
- `capture-company-candidate` runs after `verify-repair-verify-legacy-rollback`. It is the last
  step before the move.
- `capture-legacy-rollback` runs before `verify-repair-verify-legacy-rollback`. The second step
  reads the URL of the tagged `legacy-rollback` revision that the first step writes.

Find the tag and the build after a push:

- `_PUSH_BUILD_ID` is the full Cloud Build id of the push build. Read it in the GitHub Actions log of
  the push job (step `Submit Cloud Build`), or list the builds:
  `gcloud builds list --project=reading-advantage --limit=5 --format='table(id,createTime,status)'`.
- The tags `candidate` and `legacy-rollback` are fixed names. Check which revision holds them now:
  `gcloud run services describe sales-advantage --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.filter(tag='candidate').extract(revisionName).flatten())"`.
  List the newest revisions with
  `gcloud run revisions list --service=sales-advantage --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`.
- The step `capture-company-candidate` reads the image of `_PUSH_BUILD_ID` and fails unless the
  `candidate` revision runs that image. The step `update-traffic` then moves 100 percent of the
  traffic to the revision that this step records. A later push that moves the tag makes the
  capture fail, and the traffic does not move.

Where the other substitutions come from (each is a value of the release attempt; the file holds
the default `REQUIRED_...` for each, and the step refuses that default):

- `_RELEASE_COMMIT_SHA` is the exact lowercase 40-character commit of the release. It is the
  commit that `apps/sales-advantage/scripts/create-sales-release-archive.sh` archives. The step
  `verify-curriculum-backup` rejects any other form.
- `_CURRICULUM_BACKUP_ID` is the id of an on-demand backup run of the Cloud SQL instance
  `cloud-sql` in the project `reading-advantage`. The step reads it with the Cloud SQL Admin API.
  The backup must have the status `SUCCESSFUL` and the type `ON_DEMAND`. Its description must be
  `sales-curriculum-before-<commit>-not-before-<boundary>`, and it must end after the boundary.
- `_CURRICULUM_BACKUP_NOT_BEFORE` is the boundary: a UTC RFC3339 time such as
  `2026-11-07T10:00:00Z`. It is the same value that the description of the backup holds. It must not be in
  the future, and it must be 1 hour old or less when the step runs
  (`apps/sales-advantage/scripts/verify-sales-release-inputs.mjs`). A person creates the backup
  before the run; the traffic file does not create it.

## Open limits (2026-11-07)

- No traffic file has run. The files are checked as text only.
- The step `capture-legacy-rollback` calls `capture-sales-cloud-run-tag.sh`. The script requires
  that the tagged revision is the latest created revision. After the push deploys the candidate,
  the tag `legacy-rollback` is no longer the latest created revision. The first run of the sales
  traffic file can fail at this check. Daniel and the owner of the sales app decide how to change
  the script.
- The workbooks app has no traffic file. A first service of the app must exist before a push can
  build a revision of it.
- The push files of `marketing` and `sales-advantage` hold the default `REQUIRED_RELEASE_COMMIT_SHA`
  in `_RELEASE_COMMIT_SHA`. The job of `cd-apps.yml` for `marketing` passes the pushed commit
  (`--substitutions=_RELEASE_COMMIT_SHA=<commit>`), because that is the only `REQUIRED_` default in
  the file. The job for `sales-advantage` passes no substitution: its push file holds two more
  `REQUIRED_` defaults (`_CURRICULUM_BACKUP_NOT_BEFORE` and `_RELEASE_SOURCE_MANIFEST_SHA256`). The
  first step `validate-release-inputs` refuses the defaults, so the sales push build fails there
  until the PM decides how the inputs reach the build. This is an open limit.
