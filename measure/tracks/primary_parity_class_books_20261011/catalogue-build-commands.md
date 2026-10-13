# Catalogue build: commands for the cloud run (orchestrator or owner step)

The agent did not run Cloud Build and did not write to a bucket. Run these steps in order.
The archive comes from a Workbooks commit with `git archive`. The commit must be `08bb160` or later:
earlier commits (for example `eeeddfd`) have no `print/*.json` files.

Workbooks commit: `08bb160b8cfb4b95252546e6fd0e9ccc31fe3817`. It holds 70 approved packages and 70 print files in the five book folders.
`git archive` writes the commit id in the tar header. The build log prints it as `archive commit:`.

## 1. Make the archive and check it (local, read only)

    W=~/Desktop/Workbooks; C=08bb160b8cfb4b95252546e6fd0e9ccc31fe3817
    P=""; for d in origins-1 origins-2 origins-3.1 origins-3.2 quest-4; do
      P="$P :(glob)content/primary/$d/*.json :(glob)content/primary/$d/print/*.json"; done
    git -C $W archive --format=tar.gz $C $P dashboard/lib/teacher-manual/i18n \
      ":(glob)Teacher guide/step-*.md" -o /tmp/workbooks-08bb160.tgz
    tar -tzf /tmp/workbooks-08bb160.tgz | grep -c '/print/.*\.json$'      # 70
    tar -tzf /tmp/workbooks-08bb160.tgz | grep -c '/step-.*\.md$'         # 26
    gzip -dc /tmp/workbooks-08bb160.tgz | head -c 4096 | grep -a -o 'comment=[0-9a-f]\{40\}'   # the commit id

Do not use `tar` on a working folder, and do not archive all of `content/primary` (it holds 2.7 GB).

## 2. Upload the archive (bucket write)

    gcloud storage cp /tmp/workbooks-08bb160.tgz gs://primary-advantage_cloudbuild/source/workbooks-08bb160.tgz \
      --project=primary-advantage

## 3. Upload the source context of the frozen commit

Use the same method as for the ETL build (a source tgz of the frozen commit that holds
`apps/primary-advantage/cloudbuild-catalogue.yaml` and the pnpm lockfile). Name it `<context>.tgz`.

## 4. Run the catalogue build (after the ETL build, before the deploy)

    gcloud builds submit gs://primary-advantage_cloudbuild/source/<context>.tgz \
      --project=primary-advantage --region=asia-southeast1 \
      --config=apps/primary-advantage/cloudbuild-catalogue.yaml \
      --substitutions=_TARGET_DATABASE_URL=<secret name of the target>,_WORKBOOKS_ARCHIVE=gs://primary-advantage_cloudbuild/source/workbooks-08bb160.tgz

For a rehearsal copy, set `_TARGET_DATABASE_URL` to the secret of that copy. The default is
`PRIMARY_V2_DATABASE_URL`.

## 5. Read the log

Expected lines: `archive commit: 08bb160b8cfb4b95252546e6fd0e9ccc31fe3817`, `70 lessons: ... 0 failed. Print data: 70 stored`, `en: 13 steps`, `th: 13 steps`.
Give the owner each `unmapped` line (the legacy article is not in `primary_legacy_id_map`).
The build fails and prints `FAILED <package>` when a package fails, and `STOP: expected 70 lessons with print data` when a print file is missing. Run the build again after a fix.
The import is idempotent: a second run gives the same rows.

## Change of a Workbooks path

The build reads only: `content/primary/{origins-1,origins-2,origins-3.1,origins-3.2,quest-4}/*.json`,
`dashboard/lib/teacher-manual/i18n/*.ts`, and `Teacher guide/step-*.md`.
After a change of one of them, make a new archive from the new Workbooks commit and run steps 1 to 5.
