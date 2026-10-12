# Runbook: Primary parity acceptance kit

Track: `primary_parity_acceptance_20261011`. Code: `scripts/primary-parity/`.
This runbook shows how to compare legacy `bfea121` with the new Primary app on two matched copies
of one school database. Run the commands from the repository root unless a line says otherwise.

## Rules

- Run one heavy job at a time. Before each build: stop every other heavy job, run `free -m` and record
  it, and tell the peer sessions (Forge, Workbooks, graph). The kit never starts a dev server.
- Never use the shared database `primary_advantage`. The two copies stay read only. Each run uses clones.
- Never print or commit a password, a class code, or a real name. Captures and reports stay in the private folder.
- Do not change the legacy repository `~/Desktop/primary-advantage`. Check `git -C ~/Desktop/primary-advantage status --short` stays empty.
- Heavy commands run under the shared lock, for example
  `flock ~/Desktop/primary-parity-progress/heavy.lock nice <command>`.
- The kit leaves out the email, reCAPTCHA, storage write, Google sign-in, and AI keys (Member question 1).
  A feature that needs an AI key does not run in a capture.

## Private folder layout

`~/Desktop/primary-parity-acceptance/` (mode 700, outside every repository):

| Path | Content |
| --- | --- |
| `backups/` | The downloaded backup |
| `legacy-app/` | `git archive` export of `bfea121`, the kit env file, `node_modules`, `.next` |
| `accounts.json` (mode 600) | The matched users and sign-in data |
| `handout.csv` (mode 600) | Temporary passwords of the new clone |
| `state/` | Browser state files (mode 600) |
| `captures/<member>/` | PNG, text, `capture-*.json`, `report.html`, `report.md` |
| `timing.md` | Time and `free -m` of each heavy step |

Create it once: `mkdir -p ~/Desktop/primary-parity-acceptance/{backups,state,captures} && chmod 700 ~/Desktop/primary-parity-acceptance`.

## 1. Matched copies (FR-1)

Start the local Postgres: `pnpm db:start`, then wait for `pg_isready -h localhost -p 5432`.
Set `DATE=<yyyymmdd>` and `P=~/Desktop/primary-parity-acceptance`.

```bash
gsutil cp gs://backupsqldatabase/Backup_Primary_2026-10-11.sql.gz $P/backups/
createdb -h localhost -U postgres primary_legacy_$DATE
gunzip -c $P/backups/Backup_Primary_2026-10-11.sql.gz | psql -h localhost -U postgres -d primary_legacy_$DATE -q
```

Two errors are harmless: the role `cloudsqlsuperuser` and `transaction_timeout`.

```bash
createdb -h localhost -U postgres primary_parity_$DATE
export DATABASE_URL=postgres://<user>@localhost:5432/primary_parity_$DATE DIRECT_DATABASE_URL=$DATABASE_URL
pnpm --filter @reading-advantage/db exec tsx scripts/refuse-legacy-db.ts
(cd packages/db && npx tsx scripts/migrate.ts)
pnpm --filter @reading-advantage/db run doctor --check --required-migration 0071_primary_temporary_password
LEGACY_DATABASE_URL=postgres://<user>@localhost:5432/primary_legacy_$DATE \
  pnpm --filter @reading-advantage/db legacy-import --report $P/etl-report.md \
  --roles ~/Desktop/primary-cutover-inputs/roles.json \
  --usernames ~/Desktop/primary-cutover-inputs/usernames.json \
  --teachers ~/Desktop/primary-cutover-inputs/teachers.json
pnpm --filter @reading-advantage/db run student-sample-check --legacy <legacy url> --target <new url> --students 5
```

Then run the catalogue and guide imports of `primary_parity_class_books_20261011`, when that member has them.
Record the time and the counts in `timing.md`.

## 2. Clones for a run

```bash
createdb -h localhost -U postgres -T primary_legacy_$DATE primary_legacy_run_$DATE
createdb -h localhost -U postgres -T primary_parity_$DATE primary_parity_run_$DATE
export LEGACY_DATABASE_URL=postgres://<user>@localhost:5432/primary_legacy_run_$DATE
export NEW_DATABASE_URL=postgres://<user>@localhost:5432/primary_parity_run_$DATE
```

Drop the clones after the run (`dropdb`). The two copies stay as they are.

## 3. Accounts (FR-5)

```bash
npx tsx scripts/primary-parity/accounts.ts            # writes accounts.json (mode 600)
(cd apps/primary-advantage && DATABASE_URL="$NEW_DATABASE_URL" npx tsx scripts/issue-temporary-passwords.ts \
  --apply --system <system username> --out $P/handout.csv)
```

`accounts.ts` prints the exact second command. It picks one SYSTEM user, one ADMIN and one TEACHER of one
school, and one STUDENT of a class of that teacher. Use `--system`, `--admin`, `--teacher`, and `--student`
to name the user ids. Each option works alone: the script then finds the other users that fit. The console hint shows the role and the user id of the SYSTEM user, not a name or an email.
`issue-temporary-passwords.ts` refuses to overwrite an existing `--out` file. Delete or rename the old handout first, because the old passwords are stale after a new run.
Use `--force` to replace an existing `accounts.json`.
The first new-app capture does the forced password change of each staff user and keeps the new password in `accounts.json`.
The student of the new app signs in with the row of the class sheet that the matched teacher makes.

## 4. Legacy app (FR-2, FR-4)

Build once. The export stays on disk.

```bash
mkdir -p $P/legacy-app && git -C ~/Desktop/primary-advantage archive bfea121 | tar -x -C $P/legacy-app
```

Write `$P/legacy-app/.env.local` (mode 600) with these names only: `DATABASE_URL` (the legacy clone),
`BETTER_AUTH_SECRET` and `AUTH_SECRET` (new random values), `BETTER_AUTH_URL`, `NEXT_PUBLIC_BETTER_AUTH_URL`,
`AUTH_URL`, and `APP_URL` (all `http://localhost:3100`), `STORAGE_BUCKET_NAME=primary-app-storage`,
`CONTACT_EMAIL_ENABLED=false`, `NODE_ENV=production`. Do not copy the legacy `.env.local`.

```bash
cd $P/legacy-app
# npm 11 refuses the legacy lock file; use npm 10: npx --yes npm@10 ci --prefer-offline --no-audit --no-fund
# On a slow network: ci --ignore-scripts, then npm rebuild esbuild @prisma/engines.
flock ~/Desktop/primary-parity-progress/heavy.lock nice bash -c 'npm ci && npx prisma generate && NODE_OPTIONS=--max-old-space-size=4096 npx next build'
PORT=3100 npx next start      # keep this shell; stop it after the legacy captures (kill the PID on the port: ss -ltnp)
```

If the build fails from memory, pull the legacy production image (`primary-advantage-app-00125-9wd`) and run it
with Podman. Check the source commit of the image first.

## 5. Legacy captures (FR-8)

```bash
npx tsx scripts/primary-parity/capture.ts --app legacy --base http://localhost:3100 \
  --pairs measure/tracks/<member>/acceptance-pairs.json --accounts $P/accounts.json --out $P/captures
```

Stop the legacy server.

## 6. New app (FR-3)

```bash
flock ~/Desktop/primary-parity-progress/heavy.lock nice pnpm --filter primary-advantage build
DATABASE_URL="$NEW_DATABASE_URL" DIRECT_DATABASE_URL="$NEW_DATABASE_URL" PORT=3005 pnpm --filter primary-advantage start
npx tsx scripts/primary-parity/capture.ts --app new --base http://localhost:3005 \
  --pairs measure/tracks/<member>/acceptance-pairs.json --accounts $P/accounts.json --out $P/captures \
  --handout $P/handout.csv
```

Record the commit under test (`git rev-parse --short HEAD`). Stop the new server.

## 7. Report (FR-9)

```bash
npx tsx scripts/primary-parity/report.ts --pairs measure/tracks/<member>/acceptance-pairs.json \
  --out $P/captures --commit <sha> --legacy-db primary_legacy_$DATE --new-db primary_parity_$DATE
```

Open `$P/captures/<member>/report.html`. Fill the Result and Note cells of the checklist (in the HTML copy or in `acceptance.md`).

## 8. Pair list (FR-7)

`measure/tracks/<member>/acceptance-pairs.json` has: `member`, and `pairs[]` with `id`, `rows`, `role`,
`legacyPath`, `newPath` (with the locale), `widths` (default `[375, 1280]`), `colorSchemes` (default `["light"]`),
`waitFor` (`{legacy?, new?}` selectors), `steps` (module with `legacy(page)` and `new(page)`), and `checks[]`
(`id`, `behavior`). Paths may use `{map:<table>:<legacyId>}` and `{user:<ROLE>}`. The file holds no name,
password, or class code; the schema refuses an unknown field and a secret query key.

## 9. Summary in the repository (FR-10)

Each member writes `measure/tracks/<member>/acceptance.md`. Do not put captures of real names in the repository.

```markdown
# Acceptance: <member>

- Date: <yyyy-mm-dd>
- Legacy revision: bfea121
- New commit: <sha>
- Copies: primary_legacy_<yyyymmdd>, primary_parity_<yyyymmdd>

| Pair | Check | Result (pass, fail, difference on purpose) | Note |
| --- | --- | --- | --- |

Owner look check: <date and answer, or "pending">
```

## 10. Go/no-go script (FR-13)

`scripts/primary-parity/cutover-check.mjs` is the rehearsal 1 go/no-go browser check, copied with no change in behavior.
Usage: `[NEW_PASSWORDS_OUT=<private csv>] node scripts/primary-parity/cutover-check.mjs <handout.csv> <teacher username> <admin username> <system username or -> <classroomId | class name | first>`.
Set `BASE` (default `http://localhost:3000`) and `SHOTS`. Members add their blocks to this file; rehearsal 3 runs it.

## 11. Batch run (several members at once)

The orchestrator runs the captures of several members on one build. Let `PAIRS` be the list of `--pairs measure/tracks/<member>/acceptance-pairs.json` options, one for each member.

1. Clone the matched copies once (section 2).
2. Run `accounts.ts` once. It makes one user of each role for all members. Then issue the temporary passwords (section 3).
3. Capture legacy once for the union of the pair lists. The legacy app in `$P/legacy-app` is built; do not rebuild it.
   `npx tsx scripts/primary-parity/capture.ts --app legacy --base http://localhost:3100 $PAIRS --accounts $P/accounts.json --out $P/captures`
4. Stop the legacy server. Build the new app once at the integration HEAD (section 6). Start it and capture the new side with the same `$PAIRS` and `--handout $P/handout.csv`. Stop the server.
5. Run `report.ts` once for each member (section 7). The output goes to `$P/captures/<member>/`.
6. Drop the two clones (`dropdb`) and delete `apps/primary-advantage/.next`. Keep `legacy-app` and the two matched copies.

`capture.ts` takes several `--pairs` options. It signs in once for each role, and it writes the files of each member in the folder of that member.

## 12. Checks of the kit

```bash
node_modules/.bin/vitest run --root scripts/primary-parity
node_modules/.bin/tsc --noEmit -p scripts/primary-parity/tsconfig.json
```

Guards (FR-6) refuse: a non-local database host, the database `primary_advantage`, a legacy URL with no legacy
marker, a new URL with a legacy marker, a base URL that is not `http://localhost:<port>`, and an output file inside a git repository.
