# Cloud ETL step for the stories (orchestrator or owner step)

Phase S1 does not run Cloud Build. The helper ran the local reconciliation instead (`etl-run.md`).
This file holds the exact commands for the Cloud Build run into a new rehearsal target.

The target database is `primary_stories_s1`, never a shared copy (not `primary_v2`, not `primary_advantage`).
The build needs the code of the commit that holds migration `0072_primary_stories` and the stories ETL.

## 1. Secret for the new target (owner, uses the Secret Manager password)

Follow step 1 of `~/Desktop/primary-cutover-inputs/rehearsal1-cloud.sh`, with the secret name
`PRIMARY_STORIES_S1_DATABASE_URL` and the database name `primary_stories_s1`. The secret holds the legacy
URL with the path `/primary_stories_s1` and the `host` parameter only. Create the database on the
instance first (the migration user needs the `durable_job_audit_owner` SET grant; it is instance-wide
and exists since 2026-10-08).

## 2. Upload the source and run the build

```bash
cd ~/Desktop/rama-worktrees/<lane with the stories commit>
git archive HEAD | gzip > /tmp/primary-stories-s1.tgz
gcloud storage cp /tmp/primary-stories-s1.tgz gs://primary-advantage_cloudbuild/source/primary-stories-s1.tgz
gcloud builds submit gs://primary-advantage_cloudbuild/source/primary-stories-s1.tgz \
  --project=primary-advantage --region=asia-southeast1 \
  --config=apps/primary-advantage/cloudbuild-etl.yaml \
  --substitutions=_TARGET_DATABASE_URL=PRIMARY_STORIES_S1_DATABASE_URL
```

## 3. What to check in the build log

- `doctor` ends with a clean line for `0072_primary_stories`.
- The ETL table rows show: stories read 412 and written 412; story_chapters read 3,296 and written 3,296.
- Chapter question rows: MCQ 32,960, SAQ 16,480, LAQ 16,480 in the chapter rows; flashcard source rows 3,296.
- The report shows no "stories deferred" skip. The note "0 chapters had no audio key" shows.
- The Tutor read check ends with a match (chapter rows have a NULL `article_id`, so the views show no chapter row by article).

## 4. Read-only checks after the build

```bash
gcloud storage ls gs://primary-app-storage/audios/story/chapter/ | head -10
gcloud storage ls gs://primary-app-storage/images/story/ | head -10
```

Then run `story-data-checks.sql` against `primary_stories_s1` (SELECT only). Drop the database when the
check is done.
