# Plan review — primary_parity_acceptance_20261011

## Phase 1 (review of e92f32b88)

No Critical or High finding. Findings that stay:

- Low: the exported types (`PairListInput`, `PairListData`, `PairData`, `AccountsFileData`, `Placeholder`) have no JSDoc except `Placeholder`. Phase 4 JSDoc check must cover them.
- Low: the schema uses zod 3.25 (root version). `z.record` with an enum key gives a partial record, so a missing role is allowed. Phase 3 `accounts.ts` must check the roles that a pair list needs.
- Low: the `legacyPath` and `newPath` check needs a two-letter locale. A locale such as `zh-CN` is not used in the app routes (`en`, `th`, `cn`, `tw`, `vi`), so this is correct.
- Low: the `Check` field is `behavior` (spec FR-7 says "the observable behavior"). Phase 2 tests must use this name.
- Low: two small placeholder PNG files are in `scripts/primary-parity/fixtures/`. They are fixtures, not captures.
- Decision: `waitFor` is `{legacy?, new?}` (one selector for each app).

## Phase 2 (tests, red)

API that the tests fix for Phase 3 (names and shapes):

- `pairs.ts`: `resolvePlaceholders(path, {map(table, legacyId) => string|undefined, users: Partial<Record<role,string>>})`. It throws on an unknown kind, a missing map row, a missing user, or an unknown role. It must also make `PairList` refuse a `password=` query value in a path.
- `guards.ts`: `assertGuards({legacyUrl, newUrl, legacyQuery, newQuery, baseUrls, outputFiles})` (async). It throws an error with `code`: `remote-host`, `shared-database`, `legacy-marker-missing`, `legacy-marker-present`, `remote-base-url` (also https or no port), `output-in-repository` (a `.git` folder in a parent). The message holds no database password.
- `legacy-credential.ts`: `hashLegacyPassword(password)` and `verifyLegacyPassword({hash, password})`. The salt text is the hex string used as the scrypt salt string.
- `report.ts`: `diffLines(legacy, new)` returns `{onlyLegacy, onlyNew}`. `renderReport({list, captures})` returns `{markdown, html}`. Shot keys are `<width>-<scheme>`; `png` is relative.
- Low: the "no accounts field in output" test passes an extra `accounts` input and checks that its values are absent. It proves that the renderer ignores that input, not more.

## Phase 3, first part (implementation, review of 52bab3db8..HEAD)

No Critical or High finding. Findings and shortcuts that stay:

- Medium: the capture script and the sign-in helpers have no automated test. The selectors (legacy "Classroom Code", "Next", "Login"; new "Teacher" tab, "Make class sheet") come from the sources. The smoke run is the first test.
- Medium: the new STUDENT sign-in needs `classroomId` in `accounts.json`. `accounts.ts` reads it from `primary_legacy_id_map` with `table_name` `classrooms` or `classroom`. If the ETL uses another name, the smoke run finds it.
- Low: spec F-3 names the legacy column `code_expires_at`. The real column is `"codeExpiresAt"` (Prisma migration). `accounts.ts` uses the real name. Fix the spec text if the owner wants.
- Low: the guards do not import `isInsideDirectory` (spec F-11). The test needs a `.git` walk, so the guard has its own check.
- Low: `accounts.ts` marks `import.meta` as not usable. The kit is CommonJS (no `"type": "module"`), so the CLI entry uses `require.main === module`.
- Low: `report.ts` takes the copy names from `--legacy-db` and `--new-db`. It never reads `accounts.json`.
- Low: JSDoc exists on each export of the kit. `capture.ts` and `accounts.ts` main functions are private.
- Shortcut: `cutover-check.mjs` is outside the tsconfig and has no test (as FR-13 says: no change in behavior).
- Default used: Member question 1 (no AI keys in the kit runs). Member question 2 (a later helper decides on the image pull if the legacy build fails from memory).

## Phase 3, second part (smoke run)

No Critical or High finding in the kit. Findings and shortcuts that stay:

- Medium (ETL, for rehearsal 3): `lesson_progress` keeps the latest of duplicate rows per (user, article). When the latest row has no `assignment_id`, the finished assignment lesson loses its state in the new app (it opens at step 1). 28 of 263 new rows have an `assignment_id` (legacy 40 of 289). Owner or the lesson-repeat member must decide. See `acceptance.md`.
- Medium: the kit needs the lesson summary reached by a resume. A pair for a lesson in progress needs a `steps` module.
- Low: `accounts.ts` ignores `--student` unless `--teacher` and `--admin` are also given. Document in the runbook or accept the three together.
- Low: `accounts.ts` refuses to overwrite `handout.csv`: `issue-temporary-passwords.ts` still issued new passwords, so the older file was stale. Use a new `--out` name and rename it.
- Low: `legacy-cap` and `new-cap` shell wrappers used `npx next start`, which leaves a child `next-server`. Stop the server by the PID on the port (`ss -ltnp`), not by the parent PID.
- Low: `accounts.ts` prints a real staff email in the console hint (the SYSTEM username). It is not in a file of the repository.
- Shortcut: the legacy build used `npx npm@10 ci --ignore-scripts` plus a manual `npm rebuild esbuild @prisma/engines` because of the slow network. The result is the same lockfile tree.
- Lesson for lessons-learned: npm 11 `ci` refuses the legacy `package-lock.json` (missing optional platform packages); npm 10 accepts it. Disk was 97-99% full during the run (2.5 GB free).
- Runbook gap: step 4 should say `npx npm@10 ci` and name the stale-lock fix; step 3 should say `--teacher --admin --student` together.

## Phase 4 (checks and docs)

No Critical or High finding. Fixed in 4f7066a58: the three Low findings of the smoke run, and `capture.ts` takes several `--pairs` (new `rolesNeeded` in `pairs.ts`, tests in `__tests__/batch.test.ts`).

- Low: the SQL filters of `accounts.ts` for named ids have no automated test (needs a database). `pickCandidate` with named ids has a test.
- Low: `report.ts` runs once for each member by design; it has no batch option.
- Doctor: A13 (stale archived directory agents_md_audit_science_advantage_20260603) is not from this track.

## Review fixes 2026-10-12

- `guards.ts`: `checkDatabaseUrl` is exported. It refuses the protected list (shared database, older copies, ETL, rehearsal) and a URL with a `host` search param. In write mode it also refuses the matched copies and any name without `_run_`. `assertGuards` takes `writeTargets`; `accounts.ts` sets `["legacy"]`, because it writes passwords into the legacy clone.
- `capture.ts`: `loadIdMap` calls `checkDatabaseUrl` (read). The state dir and the handout path join the `assertOutsideRepository` check.
- `report.ts`: output paths pass `assertOutsideRepository`. A missing `.txt` is "not captured". The markdown fence grows when the text holds backticks.
- Runbook: npm 10 install line inside the flock command, `chmod 600` of `.env.local`, `chmod 700` of state and captures, port 3100 and 3005 checks, handout rename note in section 11, and a note that `cutover-check.mjs` stdout can hold names (the script stays unchanged, FR-13).
- Tests: 68 pass in the kit (`vitest run --root scripts/primary-parity`); the kit type check passes.
- Open Low: no automated test for the `loadIdMap` guard call (the file imports Playwright).
