
## Phase S2 review (2026-10-12)

Diff: `1d749bd63..27cacde92` and the S2 notes. No Critical or High finding.

- Low: re-importing a package without its print file replaces `package` and so removes an old `printLesson`. The next import of the full archive restores it. Keep the print folder in each archive.
- Low: `workbooksCommit` is optional in the contract. The Cloud Build import step reads it from the archive header; a local run without `--workbooks-commit` stores no commit.
- Low: `build-graph update` was not run (brief: graph.db is read-only for helpers). The orchestrator may update it after the merge.
- Info: `measure/doctor.sh` reports A13 (`agents_md_audit_science_advantage_20260603`); it is not from this track.
- Security: the print JSON is validated by Zod at the import boundary and stored as data. S3 must escape it; only `vocab_fill` keeps markup.
- Lesson for the shared file: `legacyWorkbookLessonSchema` already accepts a string or an array in `article_image_url`, so no new union was necessary. It strips unknown keys, so the print contract uses `.passthrough()`.
