# Plan — Side-by-side acceptance kit for the Primary parity work

The kit is in `scripts/primary-parity/` (outside the Primary build inputs). Tests:
`npx vitest run --root scripts/primary-parity`. Type check:
`npx tsc --noEmit -p scripts/primary-parity/tsconfig.json`. Commit subjects use
`chore(primary): <subject> (track_id: primary_parity_acceptance_20261011)`; the header and each body
line have 100 characters or less. Machine rules: one heavy job at a time; tell the peer sessions
before a build; no dev server; no run with 25 students.

## Phase 1: Contract & Schema Definition

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

## Phase 2: Test

- [ ] Task: Write the tests of the pair list (red)
    - [ ] `scripts/primary-parity/__tests__/pairs.test.ts`: a valid file parses; a missing `checks` fails; the defaults apply; each placeholder resolves through a fake map; an unknown placeholder fails
    - [ ] Add a fixture with a password-like field and assert that the schema refuses it
- [ ] Task: Write the tests of the guards (red)
    - [ ] `scripts/primary-parity/__tests__/guards.test.ts`: a refusal for each case of spec FR-6 (remote host, `primary_advantage`, legacy URL with no marker, new URL with a marker, remote base URL, output inside a repository), and a pass for the good case
    - [ ] Use a fake read-only query function for `findLegacyDatabaseMarkers`
- [ ] Task: Write the tests of the legacy credential (red)
    - [ ] `scripts/primary-parity/__tests__/legacy-credential.test.ts`: the hash has the format `<32 hex>:<128 hex>`; a check with the algorithm of legacy `lib/password.ts:8-45` (scrypt N 16384, r 16, p 1, 64 bytes, NFKC) accepts the password and refuses another
- [ ] Task: Write the tests of the report (red)
    - [ ] `scripts/primary-parity/__tests__/report.test.ts`: the text lines only in legacy and only in new; the markdown table of the checklist; relative image paths in the HTML; "not captured" for a missing file; no field of the accounts file in the output
- [ ] Task: Run the tests and record the red state
    - [ ] Run `npx vitest run --root scripts/primary-parity` and record that each new test fails
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

## Phase 3: Implement

- [ ] Task: Implement the pair list and the guards (green)
    - [ ] Implement `scripts/primary-parity/pairs.ts` and `scripts/primary-parity/guards.ts`; import `findLegacyDatabaseMarkers` and `isInsideDirectory` (spec F-11)
- [ ] Task: Implement the accounts script (green)
    - [ ] Implement `scripts/primary-parity/legacy-credential.ts` with `node:crypto` scrypt
    - [ ] Implement `scripts/primary-parity/accounts.ts`: pick or take the users, write the legacy password accounts and the class code, read the new usernames, print the `issue-temporary-passwords.ts` command, write `accounts.json` with mode 600
- [ ] Task: Implement the capture script
    - [ ] Implement the sign-in for each app and role in `scripts/primary-parity/sign-in.ts`: legacy staff tab with email and password; legacy class code and name; new staff login with the forced change (pattern of `.qa-tmp/rehearsal1-gonogo.mjs:62-104`); new student with the class sheet row of the matched username
    - [ ] Implement `scripts/primary-parity/capture.ts` (spec FR-8) with `serviceWorkers: "block"` in each browser context
- [ ] Task: Implement the report script (green)
    - [ ] Implement `scripts/primary-parity/report.ts` (spec FR-9); run the report tests
- [ ] Task: Copy the go/no-go script into the repository (spec FR-13)
    - [ ] Copy `.qa-tmp/rehearsal1-gonogo.mjs` of the main checkout to `scripts/primary-parity/cutover-check.mjs` with no change in behavior; change only the usage line
    - [ ] Tell the class books, stories, and staff student view sessions the new path
- [ ] Task: Write the runbook
    - [ ] Write `docs/runbooks/primary-parity-acceptance.md` (spec FR-12) with the commands of FR-1 to FR-10 and the summary template of FR-10
- [ ] Task: Make the matched copies (heavy job, alone)
    - [ ] Download the C4 backup to `~/Desktop/primary-parity-acceptance/backups/`; restore it as `primary_legacy_20261011`; record the time
    - [ ] Create `primary_parity_20261011`; run the guard, the migrations, the doctor, the ETL with the three inputs, and `student-sample-check`; record the counts and the time
- [ ] Task: Build and start the legacy app (heavy job, alone)
    - [ ] Export `bfea121` to `~/Desktop/primary-parity-acceptance/legacy-app/`; write the kit env file (spec FR-2)
    - [ ] Run `npm ci`, `npx prisma generate`, and the build with 4 GB; record the time and `free -m`
    - [ ] If the build fails from memory, stop and ask the owner (spec Member question 2); check the source commit of the image before a pull
- [ ] Task: Run the smoke run (spec FR-14)
    - [ ] Write `measure/tracks/primary_parity_acceptance_20261011/acceptance-pairs.json` with the pairs SYS-01, ADM-01, and STU-05
    - [ ] Make clones of both copies; run `accounts.ts`; run `issue-temporary-passwords.ts` on the new clone
    - [ ] Capture the legacy side; stop the legacy server
    - [ ] Build the new app at the integration HEAD; capture the new side; stop the server
    - [ ] Run the report; check AC-1 to AC-5; write `measure/tracks/primary_parity_acceptance_20261011/acceptance.md`
    - [ ] Send the report to the owner for the look check; record the answer
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Run the checks of the kit
    - [ ] Run `npx vitest run --root scripts/primary-parity` and the type check: both pass
    - [ ] Check the JSDoc of each export of `scripts/primary-parity/` (`scripts/verify-jsdoc.sh` covers only the shared packages)
    - [ ] Search the repository and the private reports for each password of the run (AC-3): no hit
- [ ] Task: Run the Measure scripts, one at a time
    - [ ] Run `bash measure/generate.sh` and stage the files that it changes
    - [ ] Run `bash measure/doctor.sh`; correct each failure that names a file of this track
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
