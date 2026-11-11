# Runbook: storytime-app deploy (Cloud Run)

Track `storytime_app_rebuild_20261025`, spec FR-1, plan task 1.5. The service is `storytime-app`
in region `asia-southeast1`, project `primary-advantage`. Every deploy and every traffic move
waits for Daniel's go. A new revision never takes traffic by itself: the build deploys the
revision with `--no-traffic` and a revision tag, and a later traffic step moves the traffic.

## Steps

Note (2026-11-07): after `.github/workflows/cd-apps.yml` lands on master, a push that affects
`storytime` builds the revision with `--no-traffic` and the tag `st-<first 8 characters of BUILD_ID>`.
Steps 1 and 2 below apply only when the workflow did not run for the commit. The traffic move
(step 4) still waits for Daniel's word.

1. Archive the exact commit that Daniel approved. The archive is the build source, so the
   deployed revision matches one commit:

   ```
   git archive --format=tar.gz -o /tmp/storytime-<commit>.tar.gz <commit>
   ```

2. Build and deploy the new revision with no traffic. Daniel gives the go for this deploy:

   ```
   gcloud builds submit --region asia-southeast1 --config apps/storytime/cloudbuild.yaml --project primary-advantage /tmp/storytime-<commit>.tar.gz
   ```

   The build pushes the image
   `asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/storytime-app:$BUILD_ID`
   and deploys the `storytime-app` service with `--no-traffic --tag=st-<first 8 characters of BUILD_ID>`.

3. Check the tagged revision URL before any traffic move. Read the tag URL of the new revision:

   ```
   gcloud run services describe storytime-app --project primary-advantage --region asia-southeast1 --format='value(status.traffic)'
   ```

   Then check the printed route on the tagged URL. The tag URL has the form
   `https://st-<first 8 characters of build-id>---storytime-app-<hash>-<region-alias>.a.run.app`:

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://st-<first-8-of-build-id>---storytime-app-<hash>-<region-alias>.a.run.app/th/st/2/1"
   ```

   Phase 1 expects 404 on `/th/st/2/1`: the route exists, and the week content comes in
   Phase 3. From Phase 3 on, the printed path answers 200. Daniel reads the check result and
   gives the go for the traffic step.

4. Move the traffic to the new revision. Only Daniel's go starts a traffic move:

   ```
   gcloud run services update-traffic storytime-app --project primary-advantage --region asia-southeast1 --to-revisions=storytime-app-<revision>=100
   ```

5. Rollback. Daniel gives the go for the rollback. A rollback is a traffic move to the previous
   revision, not a new deploy:

   ```
   gcloud run services update-traffic storytime-app --project primary-advantage --region asia-southeast1 --to-revisions=<previous-revision>=100
   ```

   The previous revision is the last revision that served 100 percent of the traffic. List the
   revisions with `gcloud run revisions list --service storytime-app --project primary-advantage --region asia-southeast1`.

## Facts

- The service answers the printed paths `/<locale>/st/<level>/<week>` for the locales `th` and `en`.
- The build needs no database and no secrets (milestone 1).
- The image repository is `primary-advantage-repo`; the image name is `storytime-app`.

## The teacher routes flag (2026-11-11)

- The environment variable `STORYTIME_TEACHER_ROUTES` turns the teacher routes
  (`/<locale>/teacher/...`) on. The on value is `1`. Every other value, and no value, keeps
  the flag off by default.
- The flag is off by default, and it is the only access control of the teacher routes until
  Q1: with the flag off, every signed-in request to a teacher route answers 404. Do not set
  the flag in the Dockerfile or `cloudbuild.yaml`.
- A services update builds the new revision from the template of the latest
  revision, not from the revision that serves the traffic. The build workflow deploys every
  push with `--no-traffic`, so the latest revision can be a build that Daniel has not
  approved. Before the flag commands, read the traffic split and the image of the live
  revision:

  ```
  gcloud run services describe storytime-app --project primary-advantage --region asia-southeast1 --format='value(status.traffic)'
  gcloud run revisions describe <live revision> --project primary-advantage --region asia-southeast1 --format='value(status.imageDigest)'
  ```

  The read command prints the image of the live revision as a full reference with its
  `@sha256:` digest. Paste the value into `--image` as it is.

- Turn the flag on with one variable change, the image of the live revision pinned, no
  traffic, and a new tag. Daniel gives the go for this update:

  ```
  gcloud run services update storytime-app --project primary-advantage --region asia-southeast1 --update-env-vars STORYTIME_TEACHER_ROUTES=1 --image=<the live revision image reference with its digest> --no-traffic --tag=teacher-flag-on
  ```

- The way back removes the one variable and pins the same live image:

  ```
  gcloud run services update storytime-app --project primary-advantage --region asia-southeast1 --remove-env-vars STORYTIME_TEACHER_ROUTES --image=<the live revision image reference with its digest> --no-traffic --tag=teacher-flag-off
  ```

- `--update-env-vars` adds or changes the one variable and keeps the rest of the service
  environment. Do not replace the whole variable set of the service: the sign-in and the
  media stop without their variables.
- The commands do not keep the traffic place by themselves: a services update makes a
  revision, and that revision serves traffic at once when the service sends its traffic to
  the latest revision. They hold no traffic only because of the `--no-traffic` flag on each
  command.
- The flag stays in the service template after the on command: every later build revision
  carries `STORYTIME_TEACHER_ROUTES=1`, and a traffic rollback does not remove it. A revision cannot change,
  so the off command with the live image does not clear the flag from a new build revision
  that already carries it. Before any traffic step of a new build, compare the environment
  of the new build revision with that of the live revision and check the flag state, in
  this order:

  1. Sign in as the teacher on the tag URL host first, because a session cookie is bound to
     one host.
  2. In the signed-in browser, open the tag URL of the new build and check `/th/teacher/2/1`
     the way step 3 checks a tagged build: 200 with a teacher session and the flag on, and
     404 with the flag off.
  3. Compare the names in the environment of the new build revision and of the live
     revision:

     ```
     gcloud run revisions describe <new revision> --project primary-advantage --region asia-southeast1 --format='value(spec.containers[0].env.name)'
     gcloud run revisions describe <live revision> --project primary-advantage --region asia-southeast1 --format='value(spec.containers[0].env.name)'
     ```

     The compare prints the variable names, not their values. Each command prints one line
     with the names separated by `;`. The names compare shows that no env name differs
     except `STORYTIME_TEACHER_ROUTES`. The flag state shows only through the 200 or 404
     check of `/th/teacher/2/1` on the tag URL; no command prints a value, so no secret
     value reaches a log.
  4. When the check shows the flag on and the live revision holds no flag, the new build
     does not get traffic as it is: run the off command with `--image` set to the image reference of the new build
     (read it with the same imageDigest describe command on the new revision).
  5. Check the tag URL of the revision that this command makes (404 with the flag off) and
     compare the names of that off revision with the live revision the same way.
  6. Then name that revision in step 4: the traffic step (step 4) then names that revision,
     and only Daniel's go starts it.

  Find the new revision name with
  `gcloud run revisions list --service storytime-app --project primary-advantage --region asia-southeast1`.

## Facts (2026-11-07)

These facts come from the test deploy of 2026-11-07. The tag rule below is in the file
`apps/storytime/cloudbuild.yaml`. No build has run it yet.

- The test deploy used an archive of the Dockerfile `COPY` set in place of the whole commit.
  The archive held 154 files (about 3 MB): `package.json`, `pnpm-lock.yaml`,
  `pnpm-workspace.yaml`, `turbo.json`, `.pnpmfile.cjs`, `.dockerignore`, `apps/storytime`,
  `packages/config`, and `packages/read-along`.
- The service needs the environment variable
  `STORYTIME_MEDIA_BASE=https://storage.googleapis.com/primary-app-storage/storytime-app`.
  It was set on 2026-11-07.
- The media of the new app sit under `gs://primary-app-storage/storytime-app/`. They have public
  read until the login phase.
- The ingress was `internal`: every public address answered 404. The ingress is now `all`.
  The rollback is `--ingress=internal`.
- The traffic must not move to `storytime-app-00008-tmb` (the rejected build) while the ingress
  is `all`.
- The live revision is `storytime-app-00011-dut`.
- The tag and the service name together must have 46 characters or less. Build `4907d929`
  failed at the deploy step with this text: `traffic tag 'st-4907d929-48ae-4f4f-8983-e7666d8407a1'
  and service name 'storytime-app' together are too long. Combined traffic tag and service name
  cannot exceed 46 characters.` The tag rule is `st-` plus the first 8 characters of `BUILD_ID`.
  The tag and the service name `storytime-app` then have 24 characters.
