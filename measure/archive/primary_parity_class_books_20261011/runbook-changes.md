# Runbook and go/no-go changes for rehearsal 3 (member `primary_parity_rehearsal3_20261011`)

Source: track `primary_parity_class_books_20261011`, phase S1. The new build config is
`apps/primary-advantage/cloudbuild-catalogue.yaml`. The commands are in `catalogue-build-commands.md`.

## 1. New step in the cutover runbook (docs/deployment/primary-cutover-migration-spec.md §9)

Insert between step 5 (ETL) and step 6 (deploy):

> 5b. Load the class book catalogue and the teacher guide into the new database, after the ETL and
> before the deploy. Make the Workbooks archive with `git archive` of the pinned Workbooks commit `08bb160b8cfb4b95252546e6fd0e9ccc31fe3817` (steps in `catalogue-build-commands.md`) (the five book folders,
> the manual `i18n` folder, and the `Teacher guide/step-*.md` files), upload it to
> `gs://primary-advantage_cloudbuild/source/`, then run `gcloud builds submit <context> --region=asia-southeast1 --config=apps/primary-advantage/cloudbuild-catalogue.yaml --substitutions=_WORKBOOKS_ARCHIVE=<archive path>`.
> The log must show `70 lessons`, `Print data: 70 stored`, `0 failed`, `en: 13 steps`, and `th: 13 steps`. Read each `unmapped`
> line and give it to the owner. Run it after the ETL, because the importer links each lesson to its
> migrated article through `primary_legacy_id_map`. Run it again after a fix: the import is idempotent.

## 2. New row in the cutover command sheet (cutover-commands, after C7)

| # | Who | Step | Command |
|---|---|---|---|
| C7b | Agent | Catalogue build after the ETL: use secret version 1 as in C7 (the catalogue config pins `_TARGET_SECRET_VERSION=1`; the ETL config reads `latest`, so gate on the same version) | Archive: `catalogue-build-commands.md` steps 1 to 3. Run: `gcloud builds submit gs://primary-advantage_cloudbuild/source/<context>.tgz --project=primary-advantage --region=asia-southeast1 --config=apps/primary-advantage/cloudbuild-catalogue.yaml --substitutions=_WORKBOOKS_ARCHIVE=gs://primary-advantage_cloudbuild/source/workbooks-08bb160.tgz`. Pass: `archive commit: 08bb160b8cfb4b95252546e6fd0e9ccc31fe3817`, `70 lessons`, `0 failed`, `Print data: 70 stored`, `en: 13 steps`, `th: 13 steps` |

C7b can run in parallel with C8 (the owner's temporary passwords). It must end before C9 and C10.

## 3. New item in the go/no-go checklist (§10, under "Content and data")

> - The class book works: on the demo class the book card is above the sign-in panel, the teacher
>   assigns Primary Advantage Origins 3.2 in teacher-led mode ("Book assigned."), lesson 1 of the
>   lesson plan shows the lesson title, the 13 guide steps, the projector link, and the answer key,
>   the text "This lesson is not linked to an article yet." does not show, the projector shows the
>   article text, and a signed-in demo student who opens `/en/b/o3-2/1` lands in the lesson flow of the
>   linked article, not on "not found". The browser check (story S2) runs these checks and counts a
>   failed check as a stop.

Also add to "Content and data": a printed class book QR link (`/b/<book>/<n>`) from Origins 3.2 or
Quest 4 opens a lesson (owner scan in C13).
