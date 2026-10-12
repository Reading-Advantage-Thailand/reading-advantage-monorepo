# Class book browser check (Story S2)

Status: the check is written. It has NOT run. The run is a batch step of the orchestrator.
Reason: it needs the catalogue import on a `_run_` clone and the UI of S3, S4, and S5 in the build.
The check of the card order (card above the sign-in panel) fails on a build without S4.

## The checks

Script: `scripts/primary-parity/cutover-check.mjs` (block "Class book (spec S2)"). Pure helpers:
`scripts/primary-parity/class-book-checks.mjs` (tested in `__tests__/class-book-checks.test.mjs`).
The block runs by default after the Read list check. `CLASS_BOOK_CHECK=off` skips it.
It uses the same accounts as the other blocks: the teacher argument, the class argument, and the
first student that the script signs in with the class code (student 1). It reads no extra password.

| # | Check name (as the script prints it) | Story S2 criterion |
|---|---|---|
| 1 | `class book: the book card is above the sign-in panel` | card above `#class-login` |
| 2 | `class book: the assign form lists Primary Advantage Origins 3.2` | catalogue is not empty |
| 3 | `class book: the page shows "Book assigned."` | assign in teacher-led mode |
| 4 | `class book: the card links to the lesson plan of the book` | lesson plan link |
| 5 | `class book: lesson 1 page shows the lesson title` | lesson title |
| 6 | `class book: lesson 1 page shows the 13 guide steps` | 13 guide steps |
| 7 | `class book: lesson 1 page has the projector link` | projector link |
| 8 | `class book: lesson 1 page shows the answer key` | answer key (not empty) |
| 9 | `class book: lesson 1 is linked to an article` | no "not linked" text |
| 10 | `class book: projector shows the article text` | article text of the migrated article |
| 11 | `class book: student opens /b/o3-2/1 in the lesson flow` | student lands on `/student/lesson/<article>` |

A failed check prints `FAIL <name>` and the script exits 1 (a stop). A thrown error prints
`FAIL class book: block error`.
Second run: the assign form stays on the page when the book is assigned. The assign is an upsert
(`assignClassBook`), so check 3 passes again. Checks 4 to 11 read the same book.

Accounts: the demo teacher (`demo-teacher@primary-advantage.com`) and the demo class on the tag
URL; on a local clone, the teacher and class that `accounts.ts` picked. The student is the first
unique name in the class list (the demo class has no unique name: the script picks by position).

## Run steps (orchestrator, one heavy job under the lock)

Use a `_run_` clone, never the stored copy. `$DATE` is the date of the stored copy, `$P` is
`~/Desktop/primary-parity-acceptance`, `$U` is the Postgres user.

1. Clone: `createdb -h localhost -U postgres -T primary_parity_$DATE primary_parity_run_$DATE`
   `export NEW_DATABASE_URL=postgres://$U@localhost:5432/primary_parity_run_$DATE`
   `export DATABASE_URL=$NEW_DATABASE_URL DIRECT_DATABASE_URL=$NEW_DATABASE_URL`
2. Accounts and hand-out: run section 3 of `docs/runbooks/primary-parity-acceptance.md`
   (`accounts.ts`, then `issue-temporary-passwords.ts --apply --system <id> --out $P/handout.csv`).
   Delete the old hand-out first. Take the teacher and admin usernames from `accounts.json`.
3. Catalogue import on the clone (text of the `import` step of `cloudbuild-catalogue.yaml`):
   ```
   WB=$P/workbooks-eeeddfd
   (cd packages/db && npx tsx scripts/refuse-legacy-db.ts)
   pnpm --filter @reading-advantage/db build
   pnpm --filter @reading-advantage/domain import-lesson-packages \
     $WB/content/primary/origins-1 $WB/content/primary/origins-2 $WB/content/primary/origins-3.1 \
     $WB/content/primary/origins-3.2 $WB/content/primary/quest-4      # expect "70 lessons: ... 0 failed."
   pnpm --filter @reading-advantage/domain import-lesson-guides --workbooks $WB   # expect "en: 13 steps", "th: 13 steps"
   ```
   If `$WB` does not exist, unpack the archive first (see `catalogue-build-commands.md`, step 1).
4. Check the disk (`df -h /home`, 3 GB free or more). Merge S3, S4, and S5 first. Then build and start:
   ```
   flock ~/Desktop/primary-parity-progress/heavy.lock bash -c '
     nice pnpm --filter primary-advantage build
     PORT=3005 pnpm --filter primary-advantage start & SRV=$!
     until curl -sf http://localhost:3005/en/auth/signin >/dev/null; do sleep 3; done
     BASE=http://localhost:3005 SHOTS=<shots folder> NEW_PASSWORDS_OUT=<private csv> \
       node scripts/primary-parity/cutover-check.mjs $P/handout.csv <teacher username> <admin username> - first
     kill $SRV'
   ```
   The class argument may be the class id or the exact class name instead of `first`.
5. Run the script a second time (the same command). All checks must pass again (assigned book).
6. Copy the printed result list and the PNG paths into `browser-check/result.md` (no PNG in git).
   Stop the server, delete `apps/primary-advantage/.next`, and drop the clone (`dropdb`).

Script rules: it reads the passwords from the hand-out and from the private `NEW_PASSWORDS_OUT`
file only. It prints no password and no name.


## Teacher Manual claims (Story S6)

Block "Teacher Manual claims (spec S6)" in `cutover-check.mjs`. It runs inside the class book block, after
the projector check, with the same accounts (demo teacher, student 1 of the class). `MANUAL_CHECK=off` skips it.
Pure judges: `scripts/primary-parity/class-book-checks.mjs` (tests in `__tests__/class-book-checks.test.mjs`, 12 pass).
The claim list and the code check are in `../manual-check.md`.

| # | Check name | Claim |
|---|---|---|
| 12 | `manual: the how-to list has 5 steps` | howTo list |
| 13 | `manual: The 13 steps shows the imported guide` | 13 steps |
| 14 | `manual howTo2: the student step stays closed before the teacher marks it` | howTo2 |
| 15 | `manual howTo2: the student step opens after the teacher marks it` | howTo2 |
| 16-18 | `manual howTo3: the guide shows the teacher actions / the teacher language / the full script` | howTo3 |
| 19-20 | `manual howTo4: the projector focuses one paragraph / reveals an answer` | howTo4 |
| 21 | `manual howTo5: the progress grid shows the student` | howTo5 |
| 22 | `manual howTo5: Mark taught moves the pointer` | howTo5 |

howTo1 is check 3 of the S2 list ("Book assigned."). The block writes to the class: it unmarks and marks steps 1 to 3
of lesson 1, marks lesson 1 taught, and then makes lesson 1 current again. Run it one time on each fresh `_run_` clone.
On a second run the block skips "Mark taught" (lesson 1 is taught) and the check passes with the note "skipped".

Run steps: the same as above (steps 1 to 6). The class argument should be the class id `cmhwuko0p000ds60dha8z70ig`
mapped to the new id (or `first`), so that the acceptance pairs `CB-A1` to `CB-A3` read the same class.
New captures in `$SHOTS`: `teacher-manual.png`, `teacher-manual-howto2-plan.png`, `student1-manual-howto2-lesson.png`,
`teacher-manual-howto4-projector.png`, `teacher-manual-howto5-progress.png`, `teacher-manual-howto5-taught.png`.
Write the result list (claim, account, page, pass or fail, capture) into `../manual-check.md`, table "Browser run".
Selector risk (no browser run yet): the step toggles (`ul[aria-label="Workbook steps done in class"]`), the student book
list (`ol[aria-label="Lessons"]`), the pointer text (`Lesson N of M`), and the buttons "Next", "Show answer", "Mark taught", "Make current".
