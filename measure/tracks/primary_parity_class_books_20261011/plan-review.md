# Plan review: class books

## Phase D: Design (RPG skin)

Review of `git diff f3bdc71bb..HEAD`: it holds docs and mock text files only. No app code, no
schema, no server code, no locale file changed. No Critical or High finding.

- Low: the mock source and the two harness scripts are `.txt` files in `design/`. The harness
  uses a `node_modules` symlink in the scratch area, so a rerun needs that symlink.
- Low: the captures use the system font. The real page uses Fredoka and Mitr through next/font.
  The look check judges layout and colour; line breaks in Thai can differ.
- Medium (for S3 and S4): the proposed key `lessonTitle` must not clash with the existing object
  `TeacherUi.classBook.lesson`. Use a new key name. Each new key goes in all five locale files.
- Medium (for S5): the dashboard row for a class with no book links to
  `/teacher/class-roster/<id>#class-book`. The anchor needs `scroll-mt` under the sticky header.

## Phase S1: Load the catalogue and the guide after the ETL

Review of the phase diff: one Cloud Build config, one contract test, and track docs. No app code,
no schema, no locale file. No Critical or High finding.

- Medium: the cloud steps (archive fetch, Cloud SQL proxy, install) did not run. Only the import text ran
  locally against a clone. The first cloud run is the real test of `fetch-archive` and the proxy socket.
- Medium: the `pnpm install --frozen-lockfile` of the whole monorepo runs in the build, as in the ETL
  build. A lighter install (`--filter @reading-advantage/domain...`) can cut the time. Not done: the ETL pattern is tested.
- Low: `_EXPECTED_LESSONS` is 70 for Workbooks `eeeddfd`. A new package needs the new value in the submit command.
- Low: the build reads the secret version `latest`, as the ETL config does. The cutover sheet must gate on version 1.
- Low: the `--dry-run` pass of the plan was not run; the real run on a clone replaced it.
- Low: the contract test checks the YAML text only (like the deploy gate test). It cannot run the build.
- Lesson: `pnpm --filter <pkg> <script> <abs paths>` passes the arguments through (pnpm 11), so the
  scripts need no wrapper. The tsx import of the Workbooks `i18n/*.ts` files works from an archive copy.
