# Catalogue build: commands for the cloud run (orchestrator or owner step)

The agent did not run Cloud Build and did not write to a bucket. Run these steps in order.
The archive is ready on the owner's machine: `~/Desktop/primary-parity-acceptance/workbooks-eeeddfd/`.

Workbooks commit: `eeeddfd`. It holds 70 approved packages in the five book folders.
The archive holds only JSON and Markdown files (99 files, 2.6 MB).

## 1. Check the archive (local, read only)

    A=~/Desktop/primary-parity-acceptance/workbooks-eeeddfd
    for d in origins-1 origins-2 origins-3.1 origins-3.2 quest-4; do ls $A/content/primary/$d/*.json | wc -l; done   # 14 each
    ls "$A/Teacher guide" | grep -c '^step-'                                                                         # 26

## 2. Pack and upload the archive (bucket write)

    tar -czf /tmp/workbooks-eeeddfd.tgz -C ~/Desktop/primary-parity-acceptance/workbooks-eeeddfd .
    gcloud storage cp /tmp/workbooks-eeeddfd.tgz gs://primary-advantage_cloudbuild/source/workbooks-eeeddfd.tgz \
      --project=primary-advantage

## 3. Upload the source context of the frozen commit

Use the same method as for the ETL build (a source tgz of the frozen commit that holds
`apps/primary-advantage/cloudbuild-catalogue.yaml` and the pnpm lockfile). Name it `<context>.tgz`.

## 4. Run the catalogue build (after the ETL build, before the deploy)

    gcloud builds submit gs://primary-advantage_cloudbuild/source/<context>.tgz \
      --project=primary-advantage --region=asia-southeast1 \
      --config=apps/primary-advantage/cloudbuild-catalogue.yaml \
      --substitutions=_TARGET_DATABASE_URL=<secret name of the target>,_WORKBOOKS_ARCHIVE=gs://primary-advantage_cloudbuild/source/workbooks-eeeddfd.tgz

For a rehearsal copy, set `_TARGET_DATABASE_URL` to the secret of that copy. The default is
`PRIMARY_V2_DATABASE_URL`.

## 5. Read the log

Expected lines: `70 lessons: ... 0 failed.`, `en: 13 steps`, `th: 13 steps`.
Give the owner each `unmapped` line (the legacy article is not in `primary_legacy_id_map`).
The build fails and prints `FAILED <package>` when a package fails. Run the build again after a fix.
The import is idempotent: a second run gives the same rows.

## Change of a Workbooks path

The build reads only: `content/primary/{origins-1,origins-2,origins-3.1,origins-3.2,quest-4}/*.json`,
`dashboard/lib/teacher-manual/i18n/*.ts`, and `Teacher guide/step-*.md`.
After a change of one of them, make a new archive from the new Workbooks commit and run steps 1 to 5.
