# Storytime week sync

## Source hand-off

The PM orchestrator records the Workbooks repository commit that owns the week files and schema.
Do not select a different commit during a sync.

## Receive weeks

From the monorepo root, run the receiver with the handed-off commit:

```bash
node_modules/.bin/tsx apps/storytime/scripts/receive-weeks.ts --commit <workbooks-commit>
```

Do not run the receiver through `pnpm --filter storytime exec`. That form turns every exit code
into 1, so you cannot see the code 64. Run `--help` to print the arguments.

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
| `--help` | Print the arguments and the exit codes, and exit with code 0. | None. |

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
   If a write fails, the receiver tries every restore step and every cleanup step. It restores
   each original file and deletes each new file and each stage file. The receiver then exits with
   code 1. The content folder stays as it was. If a step also fails, the message says that the
   folder is not fully restored and names each file that is not restored.
4. **Cover the whole set at a new commit.** A run at a commit that differs from `source.json`
   must cover every file that `source.json` lists. A run that leaves a week out exits with
   code 64 and changes nothing. Run all weeks again.
5. **Merge at the recorded commit.** A run at the commit that `source.json` records adds its
   weeks to the file list. The list keeps the other weeks.
6. **Stop at a leftover file.** The receiver looks in the content folder for a file whose name
   ends with `.tmp-<suffix>` or `.orig-<suffix>`, where the suffix holds letters, digits, and
   underscores. The pattern is `\.(tmp|orig)-\w+$`, and it is the same pattern as the code.
   A failed run can leave such a file. The receiver prints the
   exact path of each leftover file and exits with code 1 before it reads or writes anything.
   The reason: a `.orig-` file can hold the only copy of an original, and
   a new run must not hide it. A warning is not enough, because the operator can miss it.
   A match may also be an unrelated file that a user made, for example `operator.orig-notes`.
   Follow "Recover from a failed run", then run the receiver again.

### Exit codes

| Code | Meaning |
| --- | --- |
| 0 | The receiver wrote all files. |
| 64 | The request is wrong: a bad argument, a commit that does not exist, or a subset run at a new commit. Nothing changed. |
| 1 | Another failure: a source file is missing, a week breaks the contract, a leftover file or a link stands in the content folder, or a write failed. The content folder is as it was before the run, unless the message says that it is not fully restored. |

## Verify the output

1. Read the receiver output. It lists each written week, its media files, and its missing
   pictures. A missing picture shows the text `missing:` and the place of the picture. The last
   line gives the number of weeks in the record and the number of weeks in this run.
   The receiver lists a missing page picture, cover, family-word picture, or song-line picture.
   Only a missing page picture hides the week from the at-home page (spec FR-5). The other
   missing pictures do not hide the week.
2. Compare the commit in `apps/storytime/content/source.json` with the PM hand-off.
3. Compare the received week names with the PM hand-off.
4. Run the receiver a second time with the same commit. Then run
   `git diff --exit-code apps/storytime/content`. The command must show no difference
   when the first run was already committed.

## Recover from a failed run

A failed run leaves the content folder as it was. If you suspect a change, run
`git status apps/storytime/content`. To discard an unwanted change, run
`git restore apps/storytime/content`. Then correct the cause and run the receiver again.

If the message says that the folder is not fully restored, or if the receiver stops at a leftover
file, do these steps. Do not delete any file and do not run `git restore` before step 4.

1. Read the message. It names each file that is not restored, each `.orig-` copy, and each
   leftover `.tmp-` file.
2. A file with a name that holds `.orig-` is a copy of an original that the receiver could not put
   back. It can hold the only copy of an uncommitted original. A `.tmp-` file holds new text that
   the receiver did not finish, unless the message names it as the full copy: that file holds the
   original of the target. Keep all of them.
3. For each `.orig-` copy and each full copy, compare it with its target and with Git:
   `git diff --no-index <copy> <target>`, then `git diff -- <target>`. If the copy differs from the
   committed file, the copy holds bytes that Git does not hold.
4. Make a decision for each target, and write it down:
   - To keep the original: copy the `.orig-` file or the full copy over the target
     (`cp <copy> <target>`). Then run
     `git diff -- <target>` and check that it shows the changes you expect.
   - To use the committed file: run `git restore <target>`. Do this only when the copy holds
     nothing that you need.
   - To discard an untracked target: `git restore <target>` fails and `git diff -- <target>` shows
     nothing, because Git does not track the file. Delete the target to discard it. Keep the copy
     with `cp <copy> <target>` when the copy holds bytes that Git does not hold.
5. After each target holds the bytes you chose, delete the `.orig-` copy and the `.tmp-` files for
   that target, including a `.tmp-` file that holds the full copy. This is an explicit decision. A
   clean `git status` does not prove that the original came back, because `git restore` also
   discards uncommitted changes.
6. Run `git status apps/storytime/content`. Check that no `.tmp-` or `.orig-` file stands in the
   content folder. Then run the receiver again.
