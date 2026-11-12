# Runbook: Primary automatic releases and manual traffic moves

Primary Advantage deploys automatically after an affected push to `master`, as authorized by
the owner on 2026-11-12 in track `primary_class_code_six_hours_20261112`. Its push build checks
and migrates the Primary database, deploys the app, and restores traffic to the latest revision.
This supersedes decision D1 of `per_app_cicd_20261107` for Primary only.

The other gated apps keep decisions D1, D2, and D7: their push builds deploy with `--no-traffic`
and a tag, without production database steps or a traffic move. A person starts their traffic
files by hand on Daniel's word. The Primary traffic file remains a manual fallback. No GitHub
workflow runs a `cloudbuild-traffic.yaml` file.

## Rules for every manual traffic file

- The new revision must start against the old schema. The push deploys the new code before the
  database steps run. The database steps run later, inside the traffic file.
- Each traffic file runs the database steps first and the traffic move (`update-traffic`) last.
  A failed database step stops the build, and the traffic does not move.
- Each traffic file sends 100 percent of the traffic to the tag of the new revision. It never
  names a revision by number. The one exception is the `sales-advantage` file: it moves the
  traffic to the revision that its step `capture-company-candidate` records (see the section
  `sales-advantage`).
- Start a traffic file with `gcloud builds submit --project=<project> --config=<file> .` from
  the repository root at the commit of the push. Add `--substitutions=<name>=<value>` for each
  substitution that the section names.
- The first step of each traffic file, `bind-release-source`, needs the release commit on the
  upstream `master`. A live traffic run passes only after the first push of that commit to
  `master`.
- Start from a clean checkout of the release commit. An untracked file in the upload stops the
  build, because the first step compares every uploaded file with the commit.
- Find the build of a push in the GitHub Actions run `CD — apps` of that push. The job
  `Build and deploy <app>` prints the Cloud Build id in the log of the step
  `Submit Cloud Build`. The first 8 characters of that id are the end of the tag.
- The rollback is a traffic move to the previous revision. It does not undo a database step.

## primary-advantage

### Automatic push release

File: `apps/primary-advantage/cloudbuild.yaml`. Project: `primary-advantage`.
An affected push to the default branch `master` runs this file through `CD — apps`.
Primary is a direct deployment in `scripts/ci/apps.json`; the other app modes are unchanged.

Steps, in order: `build-image`, `push-image`, `refuse-legacy-db`, `migrate-db`, `doctor-check`,
`deploy-cloudrun`, `update-traffic`.

- `refuse-legacy-db` runs before any migration and refuses the legacy database that Tutor reads.
- The database steps keep the separate `PRIMARY_V2_DATABASE_URL` secret and the Cloud SQL proxy.
- `doctor-check` requires `0074_primary_help_events` before deployment.
- The app deploys after the database checks pass. A failed step stops the remaining steps.
- The final `update-traffic` uses `--to-latest`. This restores the automatic latest-revision
  routing policy even when an earlier manual release pinned traffic to a specific revision.
- A normal push needs no tag or separate traffic run. Database migrations are not undone by a
  later deployment failure or rollback.

Verify the resulting revision and traffic after the build succeeds:

```
gcloud run services describe primary-advantage-app --region=asia-southeast1 --project=primary-advantage --format='json(status.latestReadyRevisionName,status.traffic)'
```

The serving traffic entry should send 100 percent to the latest revision. Confirm the public
app and the changed behavior before calling the release complete.

### Manual fallback for a tagged candidate

File: `apps/primary-advantage/cloudbuild-traffic.yaml`. Project: `primary-advantage`.
Use this file only for an intentional manual promotion of a tagged candidate, such as a revision
created before automatic deployment was restored. It retains its release-source binding and
database gates. The candidate must start against the old schema.

Substitutions: `_RELEASE_COMMIT_SHA`, the candidate release commit, and `_TAG`, its tag,
for example `pa-1a2b3c4d`. This fallback sends traffic to that tag. The next successful automatic
push release restores `--to-latest` routing.

Steps, in order: `bind-release-source`, `refuse-legacy-db`, `migrate-db`, `doctor-check`,
`update-traffic`.

- `bind-release-source` is the first step. It runs `scripts/ci/verify-traffic-source.sh` with
  `_RELEASE_COMMIT_SHA`. The script loads the upstream `master` from GitHub and proves that the
  release commit is on it and that the uploaded files equal the tree of that commit. A file that
  the commit holds in the upload scope and the upload lacks stops the build (`missing:`). A file
  that the upload holds and the commit lacks stops the build (`extra:`). A file that the
  `.gcloudignore` of the commit excludes also gives an `extra:` line. A file with other bytes, or
  another type (file or link), stops the build (`differs:`). A submodule entry in the upload scope
  stops the build (`submodule:`). The build then stops before `refuse-legacy-db`, the first step
  that reads the source, and the database does not change. The step installs nothing, and its log
  starts with the two lines `GNU bash, version ...` and `git version ...`.
- Pass `--substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>` with the
  substitutions that this section names. The release commit is the commit of the push. A missing
  or empty value fails the bind step closed, so the run stops at step 1.
- The step stops with `the release commit <sha> is not on the upstream master; merge it into
  master first, then start the traffic run from a commit on master` when the upstream `master`
  does not hold the commit. Merge the commit into `master`, push it, and start the run again.
- If the step stops at its tool check, the log names the missing tool. The fix is another image
  that holds `git` and `bash`, written in the same quoted-tag form with no digest.
- Start from a clean checkout of the release commit. An untracked file in the upload stops the
  build, because the step compares every uploaded file with the commit.
- `refuse-legacy-db` is a read-only guard. It refuses to migrate the legacy Primary database
  that Tutor reads.
- `doctor-check` keeps its argument `--required-migration 0074_primary_help_events`.

Find an earlier candidate tag:

- For a candidate created by the former no-traffic push build, read the build id in the GitHub Actions log (step `Submit Cloud Build`). `_TAG` is `pa-` plus the first 8 characters of that id.
- Or list past builds and find the original no-traffic build of that candidate. Automatic
  push builds do not create a `pa-` tag:
  `gcloud builds list --project=primary-advantage --limit=5 --format='table(id,createTime,status)'`.
- Check that the revision exists with this tag. Read the tag list of the service:
  `gcloud run services describe primary-advantage-app --region=asia-southeast1 --project=primary-advantage --format="value(status.traffic.extract(tag).flatten())"`.
  List the newest revisions with
  `gcloud run revisions list --service=primary-advantage-app --region=asia-southeast1 --project=primary-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`.

## accounts

File: `apps/accounts/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitutions:
`_RELEASE_COMMIT_SHA`, the release commit, and `_TAG`, for example `ac-1a2b3c4d`. The push file
`apps/accounts/cloudbuild.yaml` holds no database step. The new revision must start against the
old schema.

Steps, in order: `bind-release-source`, `migrate-company-identity`, `bootstrap-company-identity`,
`doctor-company-identity`, `bootstrap-production-identity`, `runtime-db-contract`,
`update-traffic`.

- `bind-release-source` is the first step. It runs `scripts/ci/verify-traffic-source.sh` with
  `_RELEASE_COMMIT_SHA`. The script loads the upstream `master` from GitHub and proves that the
  release commit is on it and that the uploaded files equal the tree of that commit. A file that
  the commit holds in the upload scope and the upload lacks stops the build (`missing:`). A file
  that the upload holds and the commit lacks stops the build (`extra:`). A file that the
  `.gcloudignore` of the commit excludes also gives an `extra:` line. A file with other bytes, or
  another type (file or link), stops the build (`differs:`). A submodule entry in the upload scope
  stops the build (`submodule:`). The build then stops before `migrate-company-identity`, the first
  step that reads the source, and the database does not change. The step installs nothing, and its
  log starts with the two lines `GNU bash, version ...` and `git version ...`.
- Pass `--substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>` with the
  substitutions that this section names. The release commit is the commit of the push. A missing
  or empty value fails the bind step closed, so the run stops at step 1.
- The step stops with `the release commit <sha> is not on the upstream master; merge it into
  master first, then start the traffic run from a commit on master` when the upstream `master`
  does not hold the commit. Merge the commit into `master`, push it, and start the run again.
- If the step stops at its tool check, the log names the missing tool. The fix is another image
  that holds `git` and `bash`, written in the same quoted-tag form with no digest.
- Start from a clean checkout of the release commit. An untracked file in the upload stops the
  build, because the step compares every uploaded file with the commit.

Find the tag after a push:

- Read the build id in the GitHub Actions log of the push job (step `Submit Cloud Build`). `_TAG` is `ac-` plus the first 8 characters of this id.
- Or list the builds of the project and read the newest build id:
  `gcloud builds list --project=reading-advantage --limit=5 --format='table(id,createTime,status)'`.
- Check that the revision exists with this tag. Read the tag list of the service:
  `gcloud run services describe accounts --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.extract(tag).flatten())"`.
  List the newest revisions with
  `gcloud run revisions list --service=accounts --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`.

## accounting

File: `apps/accounting/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitution:
`_RELEASE_COMMIT_SHA`, the release commit. The traffic goes to the tag `candidate`, which the
latest push owns. The push file
`apps/accounting/cloudbuild.yaml` holds no database step. The new revision must start against the
old schema.

Steps, in order: `bind-release-source`, `migrate-db`, `doctor-check`, `runtime-db-contract`,
`update-traffic`.

- `bind-release-source` is the first step. It runs `scripts/ci/verify-traffic-source.sh` with
  `_RELEASE_COMMIT_SHA`. The script loads the upstream `master` from GitHub and proves that the
  release commit is on it and that the uploaded files equal the tree of that commit. A file that
  the commit holds in the upload scope and the upload lacks stops the build (`missing:`). A file
  that the upload holds and the commit lacks stops the build (`extra:`). A file that the
  `.gcloudignore` of the commit excludes also gives an `extra:` line. A file with other bytes, or
  another type (file or link), stops the build (`differs:`). A submodule entry in the upload scope
  stops the build (`submodule:`). The build then stops before `migrate-db`, the first step that
  reads the source, and the database does not change. The step installs nothing, and its log
  starts with the two lines `GNU bash, version ...` and `git version ...`.
- Pass `--substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>` with the
  substitutions that this section names. The release commit is the commit of the push. A missing
  or empty value fails the bind step closed, so the run stops at step 1.
- The step stops with `the release commit <sha> is not on the upstream master; merge it into
  master first, then start the traffic run from a commit on master` when the upstream `master`
  does not hold the commit. Merge the commit into `master`, push it, and start the run again.
- If the step stops at its tool check, the log names the missing tool. The fix is another image
  that holds `git` and `bash`, written in the same quoted-tag form with no digest.
- Start from a clean checkout of the release commit. An untracked file in the upload stops the
  build, because the step compares every uploaded file with the commit.

Find the tag after a push: the tag is the fixed name `candidate`. No tag substitution is needed.

- Check which revision holds the tag now:
  `gcloud run services describe accounting --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.filter(tag='candidate').extract(revisionName).flatten())"`.
- Limit: every later push moves the tag `candidate` to its new revision. The traffic file sends the
  traffic to the revision that holds the tag when the file runs, not to a build that a person names.
  Compare the revision with the newest revision from
  `gcloud run revisions list --service=accounting --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`
  and with the push build in the GitHub Actions log before the run.

## codecamp-advantage

File: `apps/codecamp-advantage/cloudbuild-traffic.yaml`. Project: `reading-advantage`.
Substitution: `_RELEASE_COMMIT_SHA`, the release commit. The traffic goes to the tag
`sso-candidate`, which the latest push owns. The push file
`apps/codecamp-advantage/cloudbuild.yaml` holds no database step. The new revision must start
against the old schema.

Steps, in order: `bind-release-source`, `migrate-db`, `doctor-check`,
`configure-review-worker-scheduler`, `update-traffic`.

Order: release source bind, migrate, doctor check, review worker scheduler, traffic move.

- `bind-release-source` is the first step. It runs `scripts/ci/verify-traffic-source.sh` with
  `_RELEASE_COMMIT_SHA`. The script loads the upstream `master` from GitHub and proves that the
  release commit is on it and that the uploaded files equal the tree of that commit. A file that
  the commit holds in the upload scope and the upload lacks stops the build (`missing:`). A file
  that the upload holds and the commit lacks stops the build (`extra:`). A file that the
  `.gcloudignore` of the commit excludes also gives an `extra:` line. A file with other bytes, or
  another type (file or link), stops the build (`differs:`). A submodule entry in the upload scope
  stops the build (`submodule:`). The build then stops before `migrate-db`, the first step that
  reads the source, and the database does not change. The step installs nothing, and its log
  starts with the two lines `GNU bash, version ...` and `git version ...`.
- Pass `--substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>` with the
  substitutions that this section names. The release commit is the commit of the push. A missing
  or empty value fails the bind step closed, so the run stops at step 1.
- The step stops with `the release commit <sha> is not on the upstream master; merge it into
  master first, then start the traffic run from a commit on master` when the upstream `master`
  does not hold the commit. Merge the commit into `master`, push it, and start the run again.
- If the step stops at its tool check, the log names the missing tool. The fix is another image
  that holds `git` and `bash`, written in the same quoted-tag form with no digest.
- Start from a clean checkout of the release commit. An untracked file in the upload stops the
  build, because the step compares every uploaded file with the commit.
- `configure-review-worker-scheduler` runs
  `apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh` with `PROJECT_ID` and the
  secret `CODECAMP_REVIEW_WORKER_TICK_TOKEN` in `secretEnv`. It creates or updates the Cloud
  Scheduler job `codecamp-review-worker-tick`. That job calls the live host every 2 minutes.
  - The step needs `cloudscheduler.jobs.get`, `cloudscheduler.jobs.create`, and
    `cloudscheduler.jobs.update` for the Cloud Build service account of project
    `reading-advantage`. The grant is a precondition of the first traffic move. Plan task 1.7
    (`deferred:pm`) makes the narrowest grant that covers the three permissions. The PM records
    the command. That task has not run yet.
  - Without the grant, the run stops after `doctor-check`. The database is then migrated, and the
    traffic stays on the old revision. A failed traffic move already allows that state.
  - Daniel's gate at the traffic move is only his traffic word.

Find the tag after a push: the tag is the fixed name `sso-candidate`. No tag substitution is
needed.

- Check which revision holds the tag now:
  `gcloud run services describe codecamp-advantage --region=asia-southeast1 --project=reading-advantage --format="value(status.traffic.filter(tag='sso-candidate').extract(revisionName).flatten())"`.
- Limit: every later push moves the tag `sso-candidate` to its new revision. The traffic file sends
  the traffic to the revision that holds the tag when the file runs, not to a build that a person
  names. Compare the revision with the newest revision from
  `gcloud run revisions list --service=codecamp-advantage --region=asia-southeast1 --project=reading-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'`
  and with the push build in the GitHub Actions log before the run.

## marketing

File: `apps/marketing/cloudbuild-traffic.yaml`. Project: `reading-advantage`. Substitutions:
`_RELEASE_COMMIT_SHA`, the release commit, and `_TAG`, the candidate tag of the push build. The
tag is `c` plus the first segment of the
`BUILD_ID` of the push build, for example `c1a2b3c4d`. The push file
`apps/marketing/cloudbuild.yaml` holds no database step. The new revision must start against the
old schema.

Steps, in order: `bind-release-source`, `migrate-db`, `doctor-check`, `runtime-db-contract`,
`update-traffic`.

- `bind-release-source` is the first step. It runs `scripts/ci/verify-traffic-source.sh` with
  `_RELEASE_COMMIT_SHA`. The script loads the upstream `master` from GitHub and proves that the
  release commit is on it and that the uploaded files equal the tree of that commit. A file that
  the commit holds in the upload scope and the upload lacks stops the build (`missing:`). A file
  that the upload holds and the commit lacks stops the build (`extra:`). A file that the
  `.gcloudignore` of the commit excludes also gives an `extra:` line. A file with other bytes, or
  another type (file or link), stops the build (`differs:`). A submodule entry in the upload scope
  stops the build (`submodule:`). The build then stops before `migrate-db`, the first step that
  reads the source, and the database does not change. The step installs nothing, and its log
  starts with the two lines `GNU bash, version ...` and `git version ...`.
- Pass `--substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>` with the
  substitutions that this section names. The release commit is the commit of the push. A missing
  or empty value fails the bind step closed, so the run stops at step 1.
- The step stops with `the release commit <sha> is not on the upstream master; merge it into
  master first, then start the traffic run from a commit on master` when the upstream `master`
  does not hold the commit. Merge the commit into `master`, push it, and start the run again.
- If the step stops at its tool check, the log names the missing tool. The fix is another image
  that holds `git` and `bash`, written in the same quoted-tag form with no digest.
- Start from a clean checkout of the release commit. An untracked file in the upload stops the
  build, because the step compares every uploaded file with the commit.

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

A push builds no sales revision, because the push file needs three release inputs that a push
cannot give. A person first runs the push file by hand, from a clean checkout of the release
commit:

```
gcloud builds submit --project=reading-advantage --config=apps/sales-advantage/cloudbuild.yaml --substitutions=_RELEASE_COMMIT_SHA=...,_CURRICULUM_BACKUP_NOT_BEFORE=...,_RELEASE_SOURCE_MANIFEST_SHA256=... .
```

The build id of that build is `_PUSH_BUILD_ID` of the traffic file.

Steps, in order: `bind-release-source`, `verify-curriculum-backup`, `migrate-db`, `doctor-check`,
`build-curriculum-workspace-deps`, `seed-production-curriculum`, `verify-production-curriculum`,
`runtime-db-contract`, `capture-legacy-rollback`, `verify-repair-verify-legacy-rollback`,
`capture-company-candidate`, `update-traffic`.

- `bind-release-source` is the first step. It runs `scripts/ci/verify-traffic-source.sh` with
  `_RELEASE_COMMIT_SHA`. The script loads the upstream `master` from GitHub and proves that the
  release commit is on it and that the uploaded files equal the tree of that commit. A file that
  the commit holds in the upload scope and the upload lacks stops the build (`missing:`). A file
  that the upload holds and the commit lacks stops the build (`extra:`). A file that the
  `.gcloudignore` of the commit excludes also gives an `extra:` line. A file with other bytes, or
  another type (file or link), stops the build (`differs:`). A submodule entry in the upload scope
  stops the build (`submodule:`). The build then stops before `verify-curriculum-backup`, the
  first step that reads the source, and before `migrate-db`, so the database does not change. The
  step installs nothing, and its log starts with the two lines `GNU bash, version ...` and
  `git version ...`.
- Pass `--substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>` with the
  substitutions that this section names. The release commit is the commit of the push. A missing
  or empty value fails the bind step closed, so the run stops at step 1.
- The step stops with `the release commit <sha> is not on the upstream master; merge it into
  master first, then start the traffic run from a commit on master` when the upstream `master`
  does not hold the commit. Merge the commit into `master`, push it, and start the run again.
- If the step stops at its tool check, the log names the missing tool. The fix is another image
  that holds `git` and `bash`, written in the same quoted-tag form with no digest.
- The upload is the repository root `.`, the folder where you run `gcloud builds submit`. The
  script reads the scope from the `.gcloudignore` of the commit. The folder `measure/` is outside
  the upload, and the script does not use `create-sales-release-archive.sh`.
- Start from a clean checkout of the release commit. An untracked file in the upload stops the
  build, because the script compares every uploaded file with the commit.
- The step needs the release commit on the upstream `master`. A run passes only after the first
  push of that commit to `master`.
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

- `_RELEASE_COMMIT_SHA` is the exact lowercase 40-character commit of the release. The step
  `bind-release-source` compares the upload with this commit, and it rejects any other form
  before it loads anything. The step `verify-curriculum-backup` rejects any other form too.
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
- The workbooks app has no Cloud Run service now. The push CD skips the app. The app returns when
  a Workbooks web app has a plan (PM decision, 2026-11-09).
- The push CD skips `sales-advantage`. A push builds no sales revision, because the push file
  needs three release inputs that a push cannot give (`_RELEASE_COMMIT_SHA`,
  `_CURRICULUM_BACKUP_NOT_BEFORE`, `_RELEASE_SOURCE_MANIFEST_SHA256`). A person starts the push
  file by hand (see the section `sales-advantage`).
- The push file of `marketing` holds the default `REQUIRED_RELEASE_COMMIT_SHA` in
  `_RELEASE_COMMIT_SHA`. The job of `cd-apps.yml` for `marketing` passes the pushed commit
  (`--substitutions=_RELEASE_COMMIT_SHA=<commit>`), because that is the only `REQUIRED_` default in
  the file.
