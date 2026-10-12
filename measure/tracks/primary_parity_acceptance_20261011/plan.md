# Plan — Side-by-side acceptance kit for the Primary parity work

The kit is in `scripts/primary-parity/` (outside the Primary build inputs). Tests:
`npx vitest run --root scripts/primary-parity`. Type check:
`npx tsc --noEmit -p scripts/primary-parity/tsconfig.json`. Commit subjects use
`chore(primary): <subject> (track_id: primary_parity_acceptance_20261011)`; the header and each body
line have 100 characters or less. Machine rules: one heavy job at a time; tell the peer sessions
before a build; no dev server; no run with 25 students.

## Phase 1: Contract & Schema Definition [checkpoint: e92f32b88]

- [x] Task: Define the pair list contract
    - [x] Write the Zod schemas `PairList`, `Pair`, and `Check` in `scripts/primary-parity/pairs.ts` (spec FR-7), with the defaults for `widths` and `colorSchemes`
    - [x] Define the placeholder grammar `{map:<table>:<legacyId>}` and `{user:<ROLE>}` as a type and a JSDoc example
    - [x] Write `scripts/primary-parity/tsconfig.json` (strict, `noEmit`, module `nodenext`)
- [x] Task: Define the accounts file contract
    - [x] Write the Zod schema `AccountsFile` in `scripts/primary-parity/accounts-file.ts`: for each role, the user id, the legacy sign-in, and the new sign-in (spec FR-5)
    - [x] Write the JSDoc rule: the file has mode 600 and is outside every repository
- [x] Task: Write the behavior contract template
    - [x] Write `docs/runbooks/primary-behavior-contract-template.md` with the seven sections of spec FR-11
- [x] Task: Make a sample of the report layout
    - [x] Write `scripts/primary-parity/fixtures/sample-report.html` from two placeholder images (no real data)
    - [x] Send the sample and the template to the owner; record the answer in `measure/tracks/primary_parity_acceptance_20261011/look-check.md` (AC-7) - owner answer pending (async); the file `look-check.md` holds the status
- [x] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) - look check pending (owner, async)
    - Steps: (1) Open `~/Desktop/primary-parity-progress/captures/acceptance/phase1/sample-report.html` and check the layout. (2) Read the template `docs/runbooks/primary-behavior-contract-template.md` and check the seven sections. (3) Run `node_modules/.bin/tsc -p scripts/primary-parity/tsconfig.json` from the repository root: no error.

## Phase 2: Test [checkpoint: 7c71879da]

- [x] Task: Write the tests of the pair list (red)
    - [x] `scripts/primary-parity/__tests__/pairs.test.ts`: a valid file parses; a missing `checks` fails; the defaults apply; each placeholder resolves through a fake map; an unknown placeholder fails
    - [x] Add a fixture with a password-like field and assert that the schema refuses it
- [x] Task: Write the tests of the guards (red)
    - [x] `scripts/primary-parity/__tests__/guards.test.ts`: a refusal for each case of spec FR-6 (remote host, `primary_advantage`, legacy URL with no marker, new URL with a marker, remote base URL, output inside a repository), and a pass for the good case
    - [x] Use a fake read-only query function for `findLegacyDatabaseMarkers`
- [x] Task: Write the tests of the legacy credential (red)
    - [x] `scripts/primary-parity/__tests__/legacy-credential.test.ts`: the hash has the format `<32 hex>:<128 hex>`; a check with the algorithm of legacy `lib/password.ts:8-45` (scrypt N 16384, r 16, p 1, 64 bytes, NFKC) accepts the password and refuses another
- [x] Task: Write the tests of the report (red)
    - [x] `scripts/primary-parity/__tests__/report.test.ts`: the text lines only in legacy and only in new; the markdown table of the checklist; relative image paths in the HTML; "not captured" for a missing file; no field of the accounts file in the output
- [x] Task: Run the tests and record the red state
    - [x] Run `npx vitest run --root scripts/primary-parity` and record that each new test fails
        - Red state: 4 files; pairs 17 tests. 3 files (guards, legacy-credential, report) fail at import (module missing). `pairs.test.ts`: 9 of 17 fail (resolvePlaceholders and the password query check); 8 schema tests pass on the Phase 1 schema (the strict schema already refuses unknown fields).
- [x] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)
    - Steps: run `node_modules/.bin/vitest run --root scripts/primary-parity` from the repository root; expect failures for the missing modules and for `resolvePlaceholders`.

## Phase 3: Implement [checkpoint: 76a78e65c]

- [x] Task: Implement the pair list and the guards (green) [37e125ba4]
    - [x] Implement `scripts/primary-parity/pairs.ts` and `scripts/primary-parity/guards.ts`; import `findLegacyDatabaseMarkers` and `isInsideDirectory` (spec F-11)
    - Note: `isInsideDirectory` is not imported. The guard walks up to a `.git` folder, as the test needs.
- [x] Task: Implement the accounts script (green) [6a2e3f4eb]
    - [x] Implement `scripts/primary-parity/legacy-credential.ts` with `node:crypto` scrypt
    - [x] Implement `scripts/primary-parity/accounts.ts`: pick or take the users, write the legacy password accounts and the class code, read the new usernames, print the `issue-temporary-passwords.ts` command, write `accounts.json` with mode 600
    - Note: `AccountsFile` got an optional `classroomId` (new student class) and `requireRoles` (checks each needed role; the capture script calls it). The legacy column is `"codeExpiresAt"`, not `code_expires_at` (spec F-3 is wrong).
- [x] Task: Implement the capture script [aec4758ed]
    - [x] Implement the sign-in for each app and role in `scripts/primary-parity/sign-in.ts`: legacy staff tab with email and password; legacy class code and name; new staff login with the forced change (pattern of `.qa-tmp/rehearsal1-gonogo.mjs:62-104`); new student with the class sheet row of the matched username
    - [x] Implement `scripts/primary-parity/capture.ts` (spec FR-8) with `serviceWorkers: "block"` in each browser context
    - Note: written, type checked, and the guard path run. A browser run needs the heavy lock; the smoke run tests it. New student: the capture reads the class sheet row of the matched teacher (needs `classroomId` in `accounts.json`).
- [x] Task: Implement the report script (green) [832135ac3]
    - [x] Implement `scripts/primary-parity/report.ts` (spec FR-9); run the report tests
    - Note: 50 of 50 tests pass in `scripts/primary-parity`.
- [x] Task: Copy the go/no-go script into the repository (spec FR-13) [b3fa2c572]
    - [x] Copy `.qa-tmp/rehearsal1-gonogo.mjs` of the main checkout to `scripts/primary-parity/cutover-check.mjs` with no change in behavior; change only the usage line
    - [x] Tell the class books, stories, and staff student view sessions the new path
    - New path for the peer sessions (class books, stories, staff student view): `scripts/primary-parity/cutover-check.mjs`. The orchestrator tells them.
- [x] Task: Write the runbook [67c69b2e5]
    - [x] Write `docs/runbooks/primary-parity-acceptance.md` (spec FR-12) with the commands of FR-1 to FR-10 and the summary template of FR-10
- [x] Task: Make the matched copies (heavy job, alone)
    - [x] Download the C4 backup to `~/Desktop/primary-parity-acceptance/backups/`; restore it as `primary_legacy_20261011`; record the time
        - 32 s download, 14 s restore (one harmless error: `transaction_timeout`). Users 671, articles 626.
    - [x] Create `primary_parity_20261011`; run the guard, the migrations, the doctor, the ETL with the three inputs, and `student-sample-check`; record the counts and the time
        - Guard OK (legacy refused), migrate 8 s, doctor OK, ETL 15 s (users 664, classrooms 31, articles 626, lesson_progress 263), sample 5 of 5. Details in the private `timing.md` and `etl-report.md`.
- [x] Task: Build and start the legacy app (heavy job, alone)
    - [x] Export `bfea121` to `~/Desktop/primary-parity-acceptance/legacy-app/`; write the kit env file (spec FR-2)
    - [x] Run `npm ci`, `npx prisma generate`, and the build with 4 GB; record the time and `free -m`
        - Path used: local build, no image pull. `npm ci` of npm 11 refuses the legacy lock file (out of sync), so the run used `npx npm@10 ci`. The network timed out three times; the final run was `ci --ignore-scripts`, then `npm rebuild esbuild @prisma/engines` and `prisma generate`. Build 306 s with 4 GB, no memory failure.
    - [x] If the build fails from memory, stop and ask the owner (spec Member question 2); check the source commit of the image before a pull
        - Not needed. Default of Member question 2 not used.
- [x] Task: Run the smoke run (spec FR-14)
    - [x] Write `measure/tracks/primary_parity_acceptance_20261011/acceptance-pairs.json` with the pairs SYS-01, ADM-01, and STU-05
    - [x] Make clones of both copies; run `accounts.ts`; run `issue-temporary-passwords.ts` on the new clone
        - `accounts.ts` needs `--teacher`, `--admin`, and `--student` together; `--student` alone is ignored. The run used a student with a finished lesson.
    - [x] Capture the legacy side; stop the legacy server
    - [x] Build the new app at the integration HEAD; capture the new side; stop the server
        - New commit 0048f9620, build 415 s.
    - [x] Run the report; check AC-1 to AC-5; write `measure/tracks/primary_parity_acceptance_20261011/acceptance.md`
    - [x] Send the report to the owner for the look check; record the answer - look check pending (owner, async). Copy: `~/Desktop/primary-parity-progress/captures/acceptance/smoke/report.html`
- [x] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) - look check pending (owner, async)
    - Steps: (1) Open `~/Desktop/primary-parity-progress/captures/acceptance/smoke/report.html` and check that each pair shows legacy and new side by side at 375 and 1280 px. (2) Check SYS-01: legacy metric cards against the new heading only. (3) Check ADM-01: legacy KPI cards against three "Data unavailable" cards. (4) Check STU-05: legacy "Start Again" button against no restart button. (5) Run `node_modules/.bin/vitest run --root scripts/primary-parity` from the repository root: all tests pass.

## Phase 4: Generate Docs & Doctor

- [ ] Task: Run the checks of the kit
    - [ ] Run `npx vitest run --root scripts/primary-parity` and the type check: both pass
    - [ ] Check the JSDoc of each export of `scripts/primary-parity/` (`scripts/verify-jsdoc.sh` covers only the shared packages)
    - [ ] Search the repository and the private reports for each password of the run (AC-3): no hit
- [ ] Task: Run the Measure scripts, one at a time
    - [ ] Run `bash measure/generate.sh` and stage the files that it changes
    - [ ] Run `bash measure/doctor.sh`; correct each failure that names a file of this track
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
