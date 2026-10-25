# Runbook: storytime-app deploy (Cloud Run)

Track `storytime_app_rebuild_20261025`, spec FR-1, plan task 1.5. The service is `storytime-app`
in region `asia-southeast1`, project `primary-advantage`. Every deploy and every traffic move
waits for Daniel's go. A new revision never takes traffic by itself: the build deploys the
revision with `--no-traffic` and a revision tag, and a later traffic step moves the traffic.

## Steps

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
   and deploys the `storytime-app` service with `--no-traffic --tag=st-$BUILD_ID`.

3. Check the tagged revision URL before any traffic move. Read the tag URL of the new revision:

   ```
   gcloud run services describe storytime-app --project primary-advantage --region asia-southeast1 --format='value(status.traffic)'
   ```

   Then check the printed route on the tagged URL. The tag URL has the form
   `https://st-<build-id>---storytime-app-<hash>-<region-alias>.a.run.app`:

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://st-<build-id>---storytime-app-<hash>-<region-alias>.a.run.app/th/st/2/1"
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
