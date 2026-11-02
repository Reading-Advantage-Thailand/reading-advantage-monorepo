# Storytime week sync

## Source hand-off

The PM orchestrator records the Workbooks repository commit that owns the week files and schema.
Do not select a different commit during a sync.

## Receive weeks

From the monorepo root, run the receiver with the handed-off commit:

```bash
pnpm --filter storytime exec tsx scripts/receive-weeks.ts --commit <workbooks-commit>
```

The receiver reads the weeks from `content/storytime/l<level>/w<nn>.json` in the Workbooks
repository. It writes them to `apps/storytime/content/l<level>/w<nn>.json`. It also writes
`apps/storytime/content/source.json`, which names the repository, the full commit, and the files.

### Arguments

| Argument | Meaning | Default |
| --- | --- | --- |
| `--commit` | The handed-off commit. Use 7 to 40 lower-case hexadecimal digits. The receiver records the full commit. | None. The argument is required. |
| `--level` | The Storytime level, 1 to 4. | `2` |
| `--weeks` | The weeks to receive. | `1-8` |
| `--source` | The Workbooks repository directory. | `$WORKBOOKS_DIR`, or `~/Desktop/Workbooks` |

The `--weeks` value is a list that a comma separates. Each item is one week number or a rising
range, for example `1-8`, `5`, or `1,3,5-7`. Each week number is from 1 to 32. The receiver
refuses any other item, for example `abc`, `3-1`, or `0`.

### Rules

1. **Validate before write.** The receiver reads and checks every requested week first. A week
   must obey the contract, and it must name the requested level and week. Its `meta.key` must be
   `st<level>/<week>`. No file changes until all weeks pass.
2. **Keep the status.** The receiver writes the source text unchanged. It does not change
   `meta.status`.
3. **Roll back a failed write.** The receiver writes all files, with `source.json` last, or none.
   If a write fails, the receiver restores each original file and deletes each new file. The
   receiver then exits with code 1. The content folder stays as it was.
4. **Cover the whole set at a new commit.** A run at a commit that differs from `source.json`
   must cover every file that `source.json` lists. A run that leaves a week out exits with
   code 64 and changes nothing. Run all weeks again.
5. **Merge at the recorded commit.** A run at the commit that `source.json` records adds its
   weeks to the file list. The list keeps the other weeks.

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | The receiver wrote all files. |
| 64 | The request is wrong: a bad argument, a commit that does not exist, or a subset run at a new commit. Nothing changed. |
| 1 | Another failure: a source file is missing, a week breaks the contract, or a write failed. The content folder is as it was before the run. |

## Verify the output

1. Read the receiver output. It lists each written week, its media files, and its missing
   pictures. A missing picture shows the text `missing:` and the place of the picture.
2. Compare the commit in `apps/storytime/content/source.json` with the PM hand-off.
3. Compare the received week names with the PM hand-off.
4. Run the receiver a second time with the same commit. Then run
   `git diff --exit-code apps/storytime/content`. The command must show no difference
   when the first run was already committed.

## Recover from a failed run

A failed run leaves the content folder as it was. If you suspect a change, run
`git status apps/storytime/content`. To discard an unwanted change, run
`git restore apps/storytime/content`. Then correct the cause and run the receiver again.
