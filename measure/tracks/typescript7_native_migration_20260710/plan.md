# Plan: TypeScript 7 Native Compiler Migration

> Amended 2026-11-05 (Daniel via the PM; Author model: claude-code/claude-sonnet-5-5).
> The end state has ONE compiler: TypeScript 7 (tsgo). The dual-compiler design is removed.
> Read the Amendment Note in `spec.md` for the owner decisions, word for word.
>
> Constraints for every phase: run each heavy step through
> `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`, one at a time.
> Heavy steps run only after 22:00 ICT, and only when no Storytime heavy run waits.
> Use `--maxWorkers=1` for vitest. No push. No deploy. Add no new hash field.
> Stage only the paths that this track owns.

## Phase 1: Contract & Schema Definition [checkpoint: 476835906]

> Checkpoint note (Mid Red, 2026-11-05). The measure-guard blocks a Phase 2 start
> while this heading has no checkpoint marker. Phase 1 work ended at commit
> `476835906`. The Phase 1 acceptance result is `fail`
> (`phase-1-acceptance-result.json`). Its three blocking findings are the 38
> against 39 tsconfig count, the 31-workspace baseline scope, and a red global
> marker gate from three unrelated untracked tracks. The owner amendment of
> 2026-11-05 (commit `0daf35478`) declares Phase 1 to be finished history. It
> records the count mismatch as a known defect. It sets the default that Phases
> 2 to 4 proceed. The checkpoint marker below records that closure.
>
> The marker is a disclosed closure of Phase 1 history; it is not acceptance evidence. A Phase 1 acceptance under the amended spec runs before the Phase 2 acceptance (PM decision, 2026-11-05).

> Phase 1 is history. Superseded outputs: `dual-compiler-contract.json` and
> `diagnostic-parity-ledger.json`. Inputs that stay: `compiler-baseline.json`,
> `surface-inventory.json`, `phase1-workspace-baseline.json`, and
> `phase1-pre-existing-failures.json`. See `spec.md` for the full table.
> Old Phase 2 to 4 check (2026-11-05): `git log` for this track id and for this directory
> shows only Measure files (strategy, Phase 1 artifacts, baseline, a completeness mode, daily
> reviews). No implementation exists. No manifest, lockfile, or `tsconfig` changed. The old
> `[~]` tasks were replaced, not ported.

- [x] Task: Capture the compiler and repository baseline. [commit: f68897ac]
  - [x] Record source SHA, `git status -sb`, Node/pnpm versions, CPU/memory, Turbo
    concurrency, and resolved TypeScript versions.
  - [x] Save TypeScript 5.9 diagnostic and timing evidence for all workspaces.
  - [x] Classify pre-existing failures separately from migration acceptance gates.
  - [x] Refresh `graph.db` if it is older than 24 hours and save graph statistics.
- [x] Task: Inventory the complete TypeScript integration surface. [commit: f68897ac]
  - [x] Enumerate all manifests, catalogs, aliases, `tsc` scripts, tsconfigs, compiler
    plugins, API imports, and TypeScript peer dependencies.
  - [x] Map Next.js, Vinext/Vite, ESLint, Jest, Vitest, ts-node, tsx, tsup, Drizzle,
    commitlint, and config-loader compiler ownership.
  - [x] Identify emit/declaration builds separately from `--noEmit` checks.
- [x] Task: Define the dual-compiler package contract. [commit: f68897ac]
  - [x] Specify exact TypeScript 7.0.2 and TypeScript 6.0.2 aliases in the workspace
    catalog without ambiguous executable resolution.
  - [x] Define native, compatibility, parity, and rollback commands.
  - [x] Define which tools must remain on the TypeScript 6 programmatic API.
- [x] Task: Define diagnostic, benchmark, and rollout evidence schemas. [commit: f68897ac]
  - [x] Specify normalized diagnostic records and reviewed-exception fields.
  - [x] Specify benchmark records for elapsed time, RSS, diagnostics, CPU/checkers,
    cache state, and exit status.
  - [x] Specify CI observation records and rollback triggers.
- [b] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) (deferred:product-owner)

## Phase 2: vinext 1.x upgrade (PM step 0)

- [x] Task: Check the vinext 1.x peer requirements. [commit: 3abb7dcc1]
  - What: read the vinext 1.x `peerDependencies` and engines from the npm registry (current
    release was 1.4.3 on 2026-11-03). Compare them with Vite 8.1.0, React, and Node in
    `apps/marketing/package.json` and `apps/activity-vinext-fixture/package.json`.
  - Files: `apps/marketing/package.json`, `apps/activity-vinext-fixture/package.json`
    (read only), one note in `measure/tracks/typescript7_native_migration_20260710/evidence/`.
  - Done when: the note lists each peer range and marks it "met" or "not met" for Vite, React,
    and Node. If any range is "not met", the task stops and asks the PM before Task 2.
- [x] Task: Upgrade the two apps to vinext 1.x. [commit: c0e2cfbb1]
  - What: change the `vinext` version in the two apps to the current 1.x and refresh the
    lockfile for those entries only. Heavy steps run under `heavy-run.sh`, after 22:00 ICT.
  - Files: `apps/marketing/package.json`, `apps/activity-vinext-fixture/package.json`,
    `pnpm-lock.yaml`, and app files only if the build fails because of vinext 1.x.
  - Done when: `git diff --stat` shows only these two apps and their lockfile entries;
    `pnpm --filter marketing build` and `pnpm --filter activity-vinext-fixture build` exit 0;
    `pnpm --filter marketing test` (vitest `--maxWorkers=1`) exits 0; no deploy ran.
- [x] Task: Record the vinext result for the trial baseline. [commit: 71ae73509]
  - What: note the vinext version, the Vite version that resolves, and any build warning.
  - Files: the evidence note from Task 1.
  - Done when: the note names the resolved `vinext` and `vite` versions with commands that
    reproduce them (`pnpm why vinext`, `pnpm why vite`).
- [b] Task: Measure - User Manual Verification 'Phase 2: vinext 1.x upgrade (PM step 0)' (Protocol in workflow.md) (deferred:product-owner)

### Red phase evidence (Mid Red, 2026-11-05)

- Role: Mid Red. Track: `typescript7_native_migration_20260710`. Phase: `Phase 2: vinext 1.x upgrade (PM step 0)`.
- phase_base_sha: `5841dc528b0bcd22f426f043d86ba9dc7939a448`. role_base_sha: `5841dc528b0bcd22f426f043d86ba9dc7939a448`.
- New test file: `measure/tests/test_typescript7_native_migration_phase2.py`. It holds 23 tests.
- Red command: `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase2`.
- Red result: `Ran 23 tests in 0.038s` and `FAILED (failures=16)`. The run has no `errors=` part.
- The failure count equals the count of test-strategy.md section 4.3. There is no difference.
- Tests that pass at base (7): the five `P2CheckerTests` cases and the two `P2T2PeerGuardTests`
  cases. They guard the range checker and the installed package. They must pass after the upgrade.
- Tests that fail at base (16): the six `P2T1PeerNoteTests` cases, the four
  `P2T2DeclarationTests` cases, the two `P2T2ScopeTests` cases, and the four
  `P2T3ResolvedNoteTests` cases. Fourteen fail because the Task 1 note is missing. Two fail
  because the variable `P2_GREEN_COMMITS` is unset. No test fails for another reason.
- Every base failure comes from an assertion. No test raises an exception at base.
- Note contract: the docstring of the test file holds the JSON schema of the three fenced blocks
  in `evidence/phase2-vinext-peer-check.md`. The Green role writes that note.
- Candidate rule: the tests read the candidate from the note. They hold for any stable 1.x
  candidate that the note proves. The PM decision of 2026-11-05 names vinext 1.2.0.
- Deviation 1: the orchestrator cannot set the task markers because it is read-only. Mid Red set
  the three Phase 2 tasks to `[~]` in the plan evidence commit. The strategy names the
  orchestrator as the actor (section 8, question 5).
- Deviation 2: the measure-guard blocked the marker change. The Phase 1 heading had no
  checkpoint. Mid Red added `[checkpoint: 476835906]` to that heading and a note that records
  the red Phase 1 acceptance result and the owner amendment.
- Deviation 3: the peer guard requires the peers `react`, `react-dom`, and `vite`. It checks
  `@vitejs/plugin-react` and `@vitejs/plugin-rsc` when the release declares them. A release
  that drops a peer cannot break the repository.
- No install, build, type check, or heavy job ran. The role ran read commands and the light
  Red command only.
- Files changed by this role: `measure/tests/test_typescript7_native_migration_phase2.py` and
  this plan.

#### Task 1 Green evidence (Junior Green, 2026-11-05)

- Role: Measure Junior Green. Model: opencode-go/deepseek-v4.1-flash. Task 1 only.
- phase_base_sha: `5841dc528b0bcd22f426f043d86ba9dc7939a448`. role_base_sha: `11903d304caf8f34ffcdf76ecc4559ee25a61f1a`.
- Implementation commit: `3abb7dcc1c769acfe0ee81eab3f706878b2b109d`. It adds the note
  `evidence/phase2-vinext-peer-check.md` and the React 19.3.1 tech-debt row.
- Registry reads: `npm view vinext@1.2.0 peerDependencies engines --json` (also 1.2.1 and
  1.4.3). No install, build, type check, or deploy ran. No `package.json` or lockfile changed.
- Candidate: vinext 1.2.0 (PM option (a)). React `^19.2.6` is met by 19.2.9. Vite `^8.0.0` is
  met by 8.1.6. Node `>=22` is met by 24.19.0. Plugin-react `^5.1.4 || ^6.0.0` is met by 6.0.3.
- The optional peer `@vitejs/plugin-rsc` (`^0.5.37`) is not met by the installed 0.5.27.
  `apps/marketing/package.json:36` declares `^0.5.27`.
- The note records `overall: "not met"` and `decision: "stop-ask-pm"`. Task 2 does not start.
- Gate G2.1: the `P2CheckerTests` and `P2T1PeerNoteTests` command gives `Ran 11 tests in
  0.012s` and `OK`, exit 0. The gate checks that the note is true; it does not require "met".
- Checkpoint note: two sentences added at the end. The marker and the Phase 1 text stay.
- Tasks 2 and 3 stay `[~]`. No archive move. No `tracks.md` change.

#### Tasks 2 and 3 Green evidence (closed, 2026-11-06)

- Role: Measure Junior Green. Model: opencode-go/deepseek-v4.1-flash. Tasks 2 and 3.
- phase_base_sha: `5841dc528b0bcd22f426f043d86ba9dc7939a448`. role_base_sha: `acf282174cee08106897661d1343fd353a29eb20`.
- Task 2 commit: `c0e2cfbb1cbd4a2771c50bd62b3c153d05dd878e`. It sets vinext 1.2.0 in the
  two apps, resolves `@vitejs/plugin-rsc` 0.5.38 inside the declared `^0.5.27` range, adds
  `apps/activity-vinext-fixture/vite.config.ts`, and refreshes the lockfile.
- Task 3 commit: `71ae73509260a064aa4c94d5cdf2202d0e30b5f6`. It adds the `resolved-after`
  and `gate-results` blocks and the raw gate logs.
- Resolved versions: vinext 1.2.0, vite 8.1.6, react 19.2.9, `@vitejs/plugin-rsc` 0.5.38,
  Node 24.19.0.
- Heavy gates all exit 0: H0/H1 types for both apps, H0/H1 builds for both apps, the H0/H1
  fixture probe (HTTP 200 and marker), H0/H1 marketing tests (65 files, 573 tests), and
  `H1-install` (`pnpm install --frozen-lockfile`).
- Red retry `2111434dd` fixed the scope test defect. The helper `_lock_change_is_in_scope`
  now uses `APP_PATHS` (`apps/marketing`, `apps/activity-vinext-fixture`) and four
  `P2T2ScopeRuleTests` cases guard it. The file holds 27 tests.
- Full Phase 2 gate with `P2_GREEN_COMMITS="c0e2cfbb1 71ae73509"`: `Ran 27 tests in 0.392s`
  and `OK`, exit 0.
- The new file `apps/activity-vinext-fixture/vite.config.ts` is justified in the note with
  `phase2/raw-logs/H1-build-fixture.log`. Review C applies because a Green commit touches
  `vite.config.ts` (strategy line 293).
- The lockfile diff stays in the two app importers and the `packages` and `snapshots`
  sections. `pnpm-workspace.yaml` is unchanged. No deploy ran.

## Phase 3: TypeScript 7 trial (PM step 1)

- [ ] Task: Create the trial worktree with the latest stable TypeScript 7.0.x.
  - What: make a git worktree on a new branch from master. Install the latest stable 7.0.x
    there only. 7.1 beta is not the gate version.
  - Files: the worktree only. The main checkout and its `pnpm-lock.yaml` stay unchanged.
  - Done when: `git -C <main> diff --quiet -- pnpm-lock.yaml package.json pnpm-workspace.yaml`
    exits 0 after the install; the worktree reports `tsc --version` 7.0.x with the exact number
    recorded.
- [ ] Task: Run the type checks on the trial install and record memory and time.
  - What: run `check-types` in each of the 31 workspaces one at a time under `heavy-run.sh`,
    with peak RSS (`/usr/bin/time -v`) and wall time. Use the same method as
    `capture-phase1-baseline.py`. Do not edit any `tsconfig`; record `types: []` and
    `baseUrl` errors as findings.
  - Files: trial evidence under `measure/tracks/typescript7_native_migration_20260710/evidence/`.
  - Done when: each workspace has an exit status, a diagnostic count, a peak RSS in MiB, and a
    wall time; `apps/reading-advantage` is marked "no valid 5.9.3 baseline"; the data covers
    31 of 31 workspaces.
- [ ] Task: Run the tests on the trial install.
  - What: run the tests of every workspace with a test script under `heavy-run.sh`, one at a
    time, with vitest `--maxWorkers=1`. Default reading of Daniel's point 4: tests run on the
    trial install.
  - Files: trial evidence (same folder).
  - Done when: each test workspace has an exit status and a pass and fail count, and each
    failure is compared with `phase1-pre-existing-failures.json`.
- [ ] Task: List the regressions.
  - What: separate new TypeScript 7 regressions from pre-existing failures. Name a cause class
    for each regression (for example `types` default, removed option, diagnostic change).
  - Files: `measure/tracks/typescript7_native_migration_20260710/evidence/` regression list.
  - Done when: every failing workspace is "pre-existing" (with the baseline entry) or
    "regression" (with a cause class); no entry is unclassified.
- [ ] Task: Run the 7.1 beta as one extra data point.
  - What: in the same worktree, repeat the type check on `packages/types`, `packages/domain`,
    and `apps/primary-advantage` with the 7.1 beta. Label the result "extra data point".
  - Files: trial evidence (same folder).
  - Done when: the table has a separate, labeled 7.1 beta row; no gate decision uses it.
- [ ] Task: Write the one-compiler plan and the report to the PM.
  - What: (a) show how `typescript-eslint` stops needing the TypeScript 5 API: the Oxlint
    type-aware path through tsgolint on typescript-go; (b) list every other consumer of the
    TypeScript JS API from `surface-inventory.json` (the type check inside `next build`,
    `tsup --dts`, `ts-node`, `tsconfck`, `drizzle-kit`, ESLint config loaders, commitlint,
    and any other tool that imports `typescript`) with its TypeScript 7 state and the action
    that removes the second install; (c) keep tsrs out; (d) give the PM the regression list
    and a memory and time table against `compiler-baseline.json`.
  - Files: `measure/tracks/typescript7_native_migration_20260710/evidence/` report; no change
    to `compiler-baseline.json` hash coverage.
  - Done when: every consumer in `surface-inventory.json` `ownership_matrix` has a row with
    state and action; the table has a 5.9.3 column and a 7.0.x column for memory and time;
    the report ends with a decision request to Daniel.
- [ ] Task: Remove the trial worktree and branch.
  - What: after the report, run `git worktree remove <path>`, `git worktree prune`, and
    `git branch -d <branch>`. Delete trial build output.
  - Files: none in the main checkout.
  - Done when: `git worktree list` and `git branch -a` show no trial item.
- [b] Task: Measure - User Manual Verification 'Phase 3: TypeScript 7 trial (PM step 1)' (Protocol in workflow.md) (deferred:product-owner)

## Phase 4: Cloudflare preparation, not the move (PM step 2)

- [ ] Task: Inventory the Node-only dependencies.
  - What: for each Node-only dependency, give the `package.json` path and line and the import
    sites (file and line). Start with `sharp` (`apps/science-advantage`,
    `apps/www-reading-advantage`, `apps/primary-advantage`, `apps/reading-advantage`), `pg`
    (`apps/codecamp-advantage`, `apps/primary-advantage`, `apps/reading-advantage`),
    `@node-rs/argon2` (`packages/auth`, `apps/primary-advantage`), `firebase-admin` and
    `@google-cloud/*` (`apps/reading-advantage`), then the others the A-49 study lists
    (`postgres`, `bcryptjs`, `nodemailer`, `services/`). Use `grep` and `build-graph`.
  - Files: `measure/tracks/typescript7_native_migration_20260710/cloudflare-node-inventory.md`
    (new, read-only inputs).
  - Done when: each row has a path, a line, and at least one import site, or the text "no
    import site found"; a second `grep` of `package.json` files finds no Node-only dependency
    that the inventory misses.
- [ ] Task: Write the adapter plan.
  - What: for `packages/db`, storage, auth, and integrations, state the current state, the
    adapter interface, the owner module, and the rule that apps do not import these packages
    directly. Mark each app import that already goes through an adapter and each that does not.
  - Files: `cloudflare-node-inventory.md` (adapter section).
  - Done when: each of the four areas has a current-state count of direct app imports, a
    target interface name, and an ordered list of the apps to change; no code moved.
- [ ] Task: Answer Daniel's question 3 with evidence.
  - What: answer "Has it not done that?" from the inventory: which parts are transportable
    now, which are not, and the number of direct imports that block a Workers build.
  - Files: `cloudflare-node-inventory.md` (answer section).
  - Done when: the answer cites at least one counted fact per area and names the separate
    Cloudflare track as the owner of the move; `git diff --stat` shows no file outside this
    track changed in the phase.
- [b] Task: Measure - User Manual Verification 'Phase 4: Cloudflare preparation, not the move (PM step 2)' (Protocol in workflow.md) (deferred:product-owner)

## Phase 5: Rollout to one compiler (after Daniel decides on the PM step 1 report)

> Every task below is `[b]` with `deferred:pm` until the PM decides on the Phase 3 report.

- [b] Task: Make TypeScript 7 the only compiler (deferred:pm)
  - What: pin the exact 7.0.x in the workspace; remove the `overrides.typescript` 5.9.3 pin and
    the second install; fix each `tsconfig` with narrow `types` lists; remove `baseUrl` from
    `apps/marketing/tsconfig.json`.
  - Files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/*/tsconfig*.json`,
    `packages/*/tsconfig*.json`, `apps/marketing/tsconfig.json`.
  - Done when: `pnpm why typescript` shows one major version; `pnpm install --frozen-lockfile`
    exits 0; every `check-types` script exits as the Phase 1 baseline allows; `git grep` finds
    no new `@ts-ignore`, `@ts-nocheck`, or `ignoreBuildErrors`.
- [b] Task: Move linting off the TypeScript 5 API (deferred:pm)
  - What: apply the Phase 3 plan for `typescript-eslint` (Oxlint type-aware through tsgolint),
    pin the rule set, and move or remove each other API consumer from the Phase 3 table.
  - Files: `packages/config/eslint/`, app `eslint.config.mjs` files, an Oxlint config, `package.json`
    files that list the old tools.
  - Done when: `pnpm turbo run lint` exits as the baseline allows with the second install gone;
    each consumer row from Phase 3 is marked "done".
- [b] Task: Route CI and Turbo to TypeScript 7 (deferred:pm)
  - What: update `turbo.json` and `.github/workflows/ci.yml`; bound checker count under Turbo;
    observe three representative CI runs.
  - Files: `turbo.json`, `.github/workflows/ci.yml`.
  - Done when: three CI runs finish with no new nondeterminism, memory failure, or cache error;
    the checker setting is written in the CI file.
- [b] Task: Update operator documents (deferred:pm)
  - What: update `measure/tech-stack.md` and the operator notes for editor setup, checker
    count, fallback, and rollback. Mark `typescript6_major_migration` superseded.
  - Files: `measure/tech-stack.md`, `measure/tracks.md`, operator notes under `docs/`.
  - Done when: the documents name TypeScript 7 as the only compiler and give one rollback
    command; `grep -n "TypeScript 6" measure/tech-stack.md` shows no bridge text.
- [b] Task: Run Measure doctor and final acceptance (deferred:pm)
  - What: run `measure/generate.sh` and `measure/doctor.sh` with their documented commands;
    run the aggregate `lint`, `test`, `check-types`, and `build` gates under `heavy-run.sh`;
    complete the change-quality review against `spec.md` and this plan.
  - Files: generated Measure files; review notes in the track folder.
  - Done when: doctor exits 0; no migration-caused regression remains against the baseline;
    no Critical or High finding is open.
- [b] Task: Measure - User Manual Verification 'Phase 5: Rollout to one compiler' (Protocol in workflow.md) (deferred:pm)
