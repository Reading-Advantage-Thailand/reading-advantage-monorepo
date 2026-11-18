# Traffic move checklist for 2026-11-20 (dry run)

Track: `storytime_at_home_release_20261106`. Plan tasks 3.1 and 2b.10.
This file is a checklist. It deploys nothing and moves no traffic.
Every command below comes from a file in this repository. The citation sits under the command.

## Facts

- Daniel, PM, 2026-11-18 05:36, "2. Ok" means two things. Storytime deploys from the candidate/receipt commit. Primary Advantage may go live with the 4 commits.
- A traffic move runs only on 2026-11-20 and only on Daniel's word.
- The report states the traffic before and after each move.
- The push builds hold no traffic. The Storytime tag is `st-<8 of BUILD_ID>` (scripts/ci/apps.json:33). The Primary tag is `pa-<8 of BUILD_ID>` (scripts/ci/apps.json:21).
- CD run 44206736219 built both apps at `e5924cd11`. The Primary Cloud Build id starts `117e96d3`. The Primary tag is `pa-117e96d3`.
- The Cloud Build logs use `CLOUD_LOGGING_ONLY` (apps/primary-advantage/cloudbuild.yaml:85, apps/storytime/cloudbuild.yaml:54). The GitHub log shows no build log line.
- The Primary range holds 5 commits under `apps/primary-advantage`, not 4. Section 3.3 lists all 5.

## 1. Common steps

### 1.1 Gates before any move

1. Run the Storytime gate. It runs the build, the types, the lint, and the tests.

   ```
   bash apps/storytime/__tests__/phase1-quality-gates.sh
   ```

   plan.md:40. The script enters heavy-run itself (apps/storytime/__tests__/phase1-quality-gates.sh:8).

2. Run the type check of the app.

   ```
   cd apps/storytime && ../../node_modules/.bin/tsc --noEmit
   ```

   plan.md:39.

3. Run the Docker smoke through heavy-run.

   ```
   SMOKE_STORE_ROOT=/home/daniebo/.local/share/storytime-smoke-1001/storage SMOKE_STORE_RUNROOT=/run/user/1001/storytime-smoke bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'bash apps/storytime/__tests__/phase3-docker-smoke.sh'
   ```

   This shell user is uid 1001. The old store belongs to uid 1000, so the prefix sets the uid 1001 store. Plan task 3.1, its deploy sub-bullet, names the script. The script enters heavy-run itself (apps/storytime/__tests__/phase3-docker-smoke.sh:168). If the first run stops on the Next.js security notice, run it once more; the rerun continues (plan task 3.1, retry rule).

4. Run the browser gate through heavy-run.

   ```
   SMOKE_STORE_ROOT=/home/daniebo/.local/share/storytime-smoke-1001/storage SMOKE_STORE_RUNROOT=/run/user/1001/storytime-smoke bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c 'bash apps/storytime/__tests__/phase3-browser-gate.sh'
   ```

   This shell user is uid 1001. The old store belongs to uid 1000, so the prefix sets the uid 1001 store. Plan task 3.1, its deploy sub-bullet, names the script. The script enters heavy-run itself (apps/storytime/__tests__/phase3-browser-gate.sh:5). If the first run stops on the Next.js security notice, run it once more; the rerun continues (plan task 3.1, retry rule).

5. Read the phase acceptance record of the receipt head. The record must show `"verdict": "pass"`. The file name pattern is `measure/runs/storytime_at_home_release_20261106/phase-acceptance-<phase>-<sha>.json`. The example is `measure/runs/storytime_at_home_release_20261106/phase-acceptance-p2-7b0ec07ab.json`.

6. Stop when any gate fails. Do not move traffic.

### 1.2 Sign in to gcloud

1. Daniel runs `gcloud auth login` before the read steps.
2. Read the traffic with gcloud when the sign-in works.
3. Read the CD run logs when the sign-in fails. The Cloud Build logs live in Cloud Logging, because the build files set `logging: CLOUD_LOGGING_ONLY` (apps/primary-advantage/cloudbuild.yaml:85, apps/storytime/cloudbuild.yaml:54).

### 1.3 Read the traffic before the move

Run this command for the service of the app. The service is `storytime-app` or `primary-advantage-app`.

```
gcloud run services describe <service> --region=asia-southeast1 --project=primary-advantage --format='json(status.latestReadyRevisionName,status.traffic)'
```

docs/runbooks/traffic-moves.md:102.

Record the revision name and the percent of every traffic row. The report needs both values.

### 1.4 Find the tag of the build to move

1. Read the build id in the GitHub Actions run `CD — apps` of the push. The job `Build and deploy <app>` prints the id in the log of the step `Submit Cloud Build`. The first 8 characters of the id end the tag. (docs/runbooks/traffic-moves.md:31-33, :90-91)

2. List the newest revisions of the service.

   ```
   gcloud run revisions list --service=primary-advantage-app --region=asia-southeast1 --project=primary-advantage --limit=5 --format='table(metadata.name,metadata.creationTimestamp)'
   ```

   docs/runbooks/traffic-moves.md:97. The Storytime form has no limit and no format:

   ```
   gcloud run revisions list --service storytime-app --project primary-advantage --region asia-southeast1
   ```

   docs/runbooks/storytime-deploy.md:98.

3. Read the tag list of the service.

   ```
   gcloud run services describe primary-advantage-app --region=asia-southeast1 --project=primary-advantage --format="value(status.traffic.extract(tag).flatten())"
   ```

   docs/runbooks/traffic-moves.md:95. The Storytime form is:

   ```
   gcloud run services describe storytime-app --project primary-advantage --region asia-southeast1 --format='value(status.traffic)'
   ```

   docs/runbooks/storytime-deploy.md:35.

4. List the past builds when the run log holds no build id.

   ```
   gcloud builds list --project=primary-advantage --limit=5 --format='table(id,createTime,status)'
   ```

   docs/runbooks/traffic-moves.md:93.

5. Write down the tag, the revision name, and the tag URL of the revision.

## 2. Storytime (service `storytime-app`)

### 2.1 Before the move

1. Confirm the deploy commit. It is the candidate/receipt commit (PM, 2026-11-18 05:36). Read the sha with `git rev-parse HEAD`.

2. Check the media of the published weeks in the private bucket, file by file.
   - Run `sha256sum -c MANIFEST.txt` in each hand-off folder (plan.md:30).
   - Count the bucket objects: `gcloud storage ls gs://storytime-app-media/** | wc -l` (test-strategy.md:669).
   - Check the anonymous read of one key: `curl -s -o /dev/null -w '%{http_code}' https://storage.googleapis.com/storytime-app-media/<a w01 key>` gives 403 (test-strategy.md:666).
   - Record the count `bucket_files_ok=<n>` (test-strategy.md:987).

3. Read the traffic before the move (section 1.3).

4. Run the live traffic guard against the target revision.

   ```
   node_modules/.bin/tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision storytime-app-<revision>
   ```

   docs/runbooks/storytime-deploy.md:56. Exit 0 means the revision and the service hold no review switch. Exit 1 names the switch that is still set. Do not move the traffic after exit 1.

5. Print the removal argument.

   ```
   node_modules/.bin/tsx apps/storytime/scripts/review/live-traffic-guard.ts --print-remove-arg
   ```

   docs/runbooks/storytime-deploy.md:68. The printed text is `--remove-env-vars=STORYTIME_REVIEW_DRAFT_WEEKS,STORYTIME_SHOW_DRAFT_MEDIA,STORYTIME_TEACHER_ROUTES` (docs/runbooks/storytime-deploy.md:72).

6. Read the image of the candidate revision `storytime-app-00031-jek` (tag `st-178dd0fb`, built by CD run 44239707392 from commit `3804ab55a`).

   ```
   gcloud run revisions describe storytime-app-00031-jek --project primary-advantage --region asia-southeast1 --format='value(status.imageDigest)'
   ```

   The digest reads `asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/storytime-app@sha256:17aa55e3c3988d80a9ada19db0fb52ad065bdeb8c896ba40e44c3e5acc60386b`. A push of any file under `apps/storytime/` builds a new candidate. After that push, replace the revision name with the new candidate revision, and read its revision and digest with the same command. docs/runbooks/storytime-deploy.md:133.

7. Compare the env names of the candidate revision and the live revision.

   ```
   gcloud run revisions describe storytime-app-00031-jek --project primary-advantage --region asia-southeast1 --format='value(spec.containers[0].env.name)'
   gcloud run revisions describe <live revision> --project primary-advantage --region asia-southeast1 --format='value(spec.containers[0].env.name)'
   ```

   docs/runbooks/storytime-deploy.md:177-178. The candidate holds 9 names: `NODE_ENV`, `NEXT_PUBLIC_STORAGE_BUCKET_NAME`, `STORYTIME_MEDIA_BASE`, `STORYTIME_DATABASE_URL`, `STORYTIME_STORAGE_ACCESS_KEY`, `STORYTIME_STORAGE_SECRET_KEY`, and the three review switches. After step 8 the new revision must hold the first 6 names and none of the 3 switches. Stop and report to Daniel only when a name lies outside this set.

8. Remove the three review switches when the guard failed. Pin the candidate image, hold no traffic, and use a new tag.

   ```
   gcloud run services update storytime-app --project primary-advantage --region asia-southeast1 --remove-env-vars=STORYTIME_REVIEW_DRAFT_WEEKS,STORYTIME_SHOW_DRAFT_MEDIA,STORYTIME_TEACHER_ROUTES --image=asia-southeast1-docker.pkg.dev/primary-advantage/primary-advantage-repo/storytime-app@sha256:17aa55e3c3988d80a9ada19db0fb52ad065bdeb8c896ba40e44c3e5acc60386b --no-traffic --tag=<new tag>
   ```

   The update form is at docs/runbooks/storytime-deploy.md:143 and :149. The removal argument is at :72. Plan task 3.1 names the same three names.

9. Read the env names of the new revision of that update (all three switches absent), then check the tag URL of that revision. Use the curl form of docs/runbooks/storytime-deploy.md:42.

10. Wait for Daniel's word.

### 2.2 The traffic move

1. Move the traffic to the target revision.

   ```
   gcloud run services update-traffic storytime-app --project primary-advantage --region asia-southeast1 --to-revisions=storytime-app-<revision>=100
   ```

   docs/runbooks/storytime-deploy.md:81.

2. Read the traffic after the move (section 1.3). The report needs the before and the after.

### 2.3 Rollback

1. Daniel gives the go for the rollback (docs/runbooks/storytime-deploy.md:84).

2. Run the guard against the previous revision.

   ```
   node_modules/.bin/tsx apps/storytime/scripts/review/live-traffic-guard.ts --revision <previous-revision>
   ```

   docs/runbooks/storytime-deploy.md:88.

3. Move the traffic back to the previous revision.

   ```
   gcloud run services update-traffic storytime-app --project primary-advantage --region asia-southeast1 --to-revisions=<previous-revision>=100
   ```

   docs/runbooks/storytime-deploy.md:94. The live revision of the plan is `storytime-app-00011-dut` (docs/runbooks/storytime-deploy.md:228). Confirm it with the revisions list of section 1.4.

### 2.4 After the move

1. Remove the public read of the prefix `gs://primary-app-storage/storytime-app/`. The old prefix `storytime/` stays. plan.md:90. The repo holds no command for this step. See section 5.

2. Re-apply the www sign-in copy on master.

   ```
   git cherry-pick ca3155932
   ```

   plan.md:90. The commit waits on master until the traffic move.

3. Run the www page tests. plan.md:90.

4. Run the live printed-URL check with one family session cookie.

   ```
   cd apps/storytime && STORYTIME_CHECK_COOKIE=<cookie> ../../node_modules/.bin/tsx scripts/checks/printed-urls-live.ts --revision <revision>
   ```

   The script path and its flags are at apps/storytime/scripts/checks/printed-urls-live.ts:36-38. The pass rule is at test-strategy.md:990. The check passes when `urls_rendered=<n>` equals `urls_checked=<n>` and `urls_failed=0`. Never print the cookie.

### 2.5 Page checks on the live host

The host is `https://storytime.reading-advantage.com`. The curl form is at docs/runbooks/storytime-deploy.md:42.

1. Sign in as the family account `staff-01`. The password is in the card file outside the repository (plan task 3.1, the release 1 account batch lines). The sign-in POST form is at apps/storytime/__tests__/phase3-docker-smoke.sh:228-236. The session cookie name is `__Host-st_session`.

2. Check each week page of the published weeks with the cookie.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' -H "Cookie: <cookie>" "https://storytime.reading-advantage.com/th/st/2/1"
   ```

   Run it for `/th/st/2/1` to `/th/st/2/7`. Each answers 200.

3. Check the draft week.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' -H "Cookie: <cookie>" "https://storytime.reading-advantage.com/th/st/2/8"
   ```

   It answers 404.

4. Check the join page.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://storytime.reading-advantage.com/th/join"
   ```

   It answers 200. The page holds no `data-draft` marker (apps/storytime/__tests__/phase3-join-copy-approved.test.ts:156-164).

5. Check the sign-in page.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://storytime.reading-advantage.com/th/sign-in"
   ```

   It answers 200.

6. Check the signed-out week page.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://storytime.reading-advantage.com/th/st/2/1"
   ```

   It answers 307. The Location names `/th/sign-in?next=%2Fth%2Fst%2F2%2F1` (apps/storytime/__tests__/phase3-docker-smoke.sh:330, plan.md:96).

## 3. Primary Advantage (service `primary-advantage-app`)

### 3.1 The traffic file

1. Read the release commit sha of the push. It is the 40-character lowercase sha of `e5924cd11`.

2. Read the tag of the push build. It is `pa-<8 of BUILD_ID>`. The Primary Cloud Build id of CD run 44206736219 starts `117e96d3`. The tag is `pa-117e96d3`.

3. Start the traffic file from the repository root at the commit of the push.

   ```
   gcloud builds submit --project=primary-advantage --config=apps/primary-advantage/cloudbuild-traffic.yaml --substitutions=_RELEASE_COMMIT_SHA=<lowercase 40-character release commit>,_TAG=pa-<8> .
   ```

   The form comes from docs/runbooks/traffic-moves.md:23-25 and :73. The file and its two substitutions are at docs/runbooks/traffic-moves.md:53-58.

4. Start from a clean checkout of the release commit. An untracked file stops the build (docs/runbooks/traffic-moves.md:81-82).

### 3.2 The steps the file runs

The steps run in this order (apps/primary-advantage/cloudbuild-traffic.yaml:9-67).

1. `bind-release-source` compares the upload with the release commit (apps/primary-advantage/cloudbuild-traffic.yaml:12-19).
2. `refuse-legacy-db` is a read-only guard on the legacy database (apps/primary-advantage/cloudbuild-traffic.yaml:29-36).
3. `migrate-db` applies the migrations (apps/primary-advantage/cloudbuild-traffic.yaml:38-45).
4. `doctor-check` fails closed unless the ledger matches the journal. It keeps `--required-migration 0074_primary_help_events` (apps/primary-advantage/cloudbuild-traffic.yaml:47-54, docs/runbooks/traffic-moves.md:85).
5. `update-traffic` sends 100 percent of the traffic to the tag `_TAG` (apps/primary-advantage/cloudbuild-traffic.yaml:57-67, docs/runbooks/traffic-moves.md:86).

A failed database step stops the build. The traffic does not move (docs/runbooks/traffic-moves.md:17-18).

### 3.3 The commits in the range

Run:

```
git log --format='%h %s' 80ac554b4..e5924cd11 -- apps/primary-advantage
```

The command prints 5 commits. The PM order names 4. The fifth commit changes only a text file of the app.

1. `3df26644d` fix(cd): build primary with no traffic on push (track_id: master_push_readiness_20261112). It changes `apps/primary-advantage/cloudbuild.yaml`.
2. `573161b77` chore(agents): trim agent prompts after prompt audit. It changes only `apps/primary-advantage/AGENTS.md`.
3. `4cd4993ea` fix(storytime): classify printed urls without redirects (track_id: storytime_app_rebuild_20261025). It changes `apps/primary-advantage/hooks/use-player-skin.ts`.
4. `53628b4f8` test(storytime): pin rollback guard and env rules (track_id: storytime_app_rebuild_20261025). It changes one test file of the app.
5. `7d76f2157` feat(storytime): primary imports the shared read-along (track_id: storytime_app_rebuild_20261025). It changes the read-along files of the app.

### 3.4 Smoke check on the tagged URL

1. Read the revision that holds the tag `pa-<8>` (section 1.4).
2. Read the tag URL of that revision. The form is `https://pa-<8>---primary-advantage-app-<hash>-<region-alias>.a.run.app` (measure/archive/primary_class_code_six_hours_20261112/plan.md:60).
3. Check the pages on that URL before the move.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://pa-<8>---primary-advantage-app-<hash>-<region-alias>.a.run.app/en"
   curl -s -o /dev/null -w '%{http_code}\n' "https://pa-<8>---primary-advantage-app-<hash>-<region-alias>.a.run.app/en/auth/signin"
   ```

   Both answer 200 (measure/archive/primary_class_code_six_hours_20261112/plan.md:58).

### 3.5 Page checks on the live host

The host is `https://primary.reading-advantage.com`.

1. Check the home page.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://primary.reading-advantage.com/en"
   ```

   It answers 200 (measure/archive/primary_class_code_six_hours_20261112/plan.md:102).

2. Check the sign-in page.

   ```
   curl -s -o /dev/null -w '%{http_code}\n' "https://primary.reading-advantage.com/en/auth/signin"
   ```

   It answers 200 (same line).

3. Sign in one student account in a browser. The traffic runbook names no account. See section 5.

### 3.6 Rollback

1. Move the traffic back to the revision of the before-reading step.

   ```
   gcloud run services update-traffic primary-advantage-app --project=primary-advantage --region=asia-southeast1 --to-revisions=<before-revision>=100
   ```

   The rule is at docs/runbooks/traffic-moves.md:34. The rollback does not undo a database step.

2. Read the traffic after the rollback (section 1.3).

## 4. Report template

Fill one table per app. The time is Bangkok time.

| App | Before revision | Before percent | After revision | After percent | Page checks | Time (Bangkok) |
| --- | --- | --- | --- | --- | --- | --- |
| storytime-app | | | | | | |
| primary-advantage-app | | | | | | |

The Storytime rows:

- `/th/st/2/1` to `/th/st/2/7` = 200 with the session of `staff-01`.
- `/th/st/2/8` = 404.
- `/th/join` = 200 with no `data-draft` marker.
- `/th/sign-in` = 200.
- Signed-out `/th/st/2/1` = 307 to the sign-in.

The Primary rows:

- `/en` = 200.
- `/en/auth/signin` = 200.
- One student sign-in = the result and the account name.

## 5. Commands that the repo does not hold

1. The removal of the public read of the prefix `gs://primary-app-storage/storytime-app/`. plan.md:90 names the requirement. No repo file holds the command. The PM gives it before the step.
2. The bucket download for the per-file media check of section 2.1. The strategy names the check (test-strategy.md:986-987) and the bucket list (test-strategy.md:669). No repo file holds a download command.
3. The Primary student account for the sign-in of section 3.5. The traffic runbook names no account.
