# Primary production cutover — 2026-10-11

Status: stopped after C10 (2026-10-11).

The owner authorized the reset, merge, push, deployment, and traffic switch after the required checks.

## Preflight

- Integration starts at `dc353d121` with a clean worktree.
- The Primary build inputs match rehearsal commit `cfef79c88`.
- Legacy revision `primary-advantage-app-00125-9wd` receives 100% of production traffic.
- All five legacy scheduler jobs remain paused.
- The legacy deployment trigger is disabled and verified.
- The target secret resolves to version 1 and database `primary_v2` on the documented Cloud SQL instance.
- The frozen source archive exists in Cloud Storage.
- The final staff credential file does not exist yet.
- The owner confirmed the team notice before the final backup.

## Remaining checks

- Final backup, database reset, and ETL.
- Student names and class memberships.
- Staff credentials and printed article links.
- Deployment without traffic and browser checks.
- Owner system login on a phone.
- Traffic switch and public checks. Did not run (C11 to C14 did not run).
- Five physical QR scans, including the writing QR. Did not run.
- Final production record and school instructions. Did not run.

## Execution

- C4: final backup operation `fd1519b6-f300-4b9e-a762-7f9c00000031` succeeded at `2026-10-11T12:21:46Z`.
- Backup: `gs://backupsqldatabase/Backup_Primary_2026-10-11.sql.gz`, 30,420,669 bytes.
- C5: master merge `0a29d574e` and integration `dc353d121` reached GitHub.
- The master merge preserves the frozen Primary build inputs.
- The www deployment started as GitHub run `38138912943`.
- C6: the documented `primary_v2` database was deleted and recreated successfully.
- C7: Cloud Build `3625ced6-abbe-4b4d-b4bd-2c9e4e2cdccd` started from the frozen source archive.
- The owner authorized the traffic switch after the required checks in the goal prompt.

- C7: Cloud Build succeeded at `2026-10-11T12:26:12Z`.
- Reconciliation: 664 users, 31 classes, and all 643 student memberships migrated.
- Every skipped row has a documented reason consistent with the rehearsal decisions.
- Tutor read comparison: `MATCH`. Five student-data samples match.
- C8: 21 staff temporary passwords issued; final CSV has mode 600 and no empty credentials.
- Staff roles: 8 teachers, 8 admins, and 5 system users.
- All 28 printed article IDs resolve to migrated articles.
- Complete comparison: all 643 student names, all 643 memberships, and all 31 class names match.
- C9: revision `primary-advantage-app-00130-daq` deployed with no traffic at tag `cutover`.
- The revision uses the rehearsal image and target secret version 1.
- The owner phone check is pending.

- All 21 saved staff passwords verified against the target credential hashes before the browser checks.
- C10: the cutover browser check passed 21 of 21 checks.
- The checks cover teacher and admin forced changes, rejected temporary passwords, class login, regenerated codes, and student home login.
- The checks also cover the printed writing URL and article pictures.
- All five public asset files return HTTP 200 from the cutover tag.
- A local curl TLS failure cleared with a TLS 1.2 retry; the server checks passed.
- The demo teacher and admin now use their changed passwords in the private `check-passwords-cutover.csv` file.
- The owner system login is in a separate private file, `owner-system-login.txt`.
- School sign-in instructions are saved outside the repository.
- The revision has no error log entries in the checked interval.
- C11 did not run. See the result section at the end.
- The www deployment completed successfully: GitHub run `38138912943`.

## Result: stopped after C10

1. The owner signed in to the system account on a computer and on a phone. The check passed.
2. The owner then found gaps. The system dashboard shows only a heading and a placeholder text
   (`apps/primary-advantage/app/[locale]/system/dashboard/page.tsx:7`). Staff cannot open the student
   pages. A teacher cannot assign the class book.
3. The cutover stopped after C10. C11 to C14 did not run. The legacy revision
   `primary-advantage-app-00125-9wd` keeps 100% of the traffic (read-only check on 2026-10-12).
4. The cause: the import `a56281cd4` matches legacy `1e1cc34` (471 of 480 files). The 122 later legacy
   commits are not in the monorepo. The earlier map compared route names, not page content.
5. The state that stays: `primary_v2` holds the ETL of the C4 backup and the 21 temporary passwords.
   Revision `primary-advantage-app-00130-daq` keeps the tag `cutover` with no traffic. `master` holds
   the merge `0a29d574e`, and the www deploy of run `38138912943` is live. The legacy build trigger
   stays off and the five scheduler jobs stay paused.
6. The triage and the next steps: the owner triage files are in `~/Desktop/primary-parity-triage/`.
   See the set overview `measure/sets/primary_parity_20261011.md`, the decisions in
   `measure/tracks/primary_parity_records_20261011/triage-decisions.md`, and rehearsal 3
   (`primary_parity_rehearsal3_20261011`).
