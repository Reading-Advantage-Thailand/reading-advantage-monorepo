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

## Phase 1: Contract & Schema Definition

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

- [ ] Task: Check the vinext 1.x peer requirements.
  - What: read the vinext 1.x `peerDependencies` and engines from the npm registry (current
    release was 1.4.3 on 2026-11-03). Compare them with Vite 8.1.0, React, and Node in
    `apps/marketing/package.json` and `apps/activity-vinext-fixture/package.json`.
  - Files: `apps/marketing/package.json`, `apps/activity-vinext-fixture/package.json`
    (read only), one note in `measure/tracks/typescript7_native_migration_20260710/evidence/`.
  - Done when: the note lists each peer range and marks it "met" or "not met" for Vite, React,
    and Node. If any range is "not met", the task stops and asks the PM before Task 2.
- [ ] Task: Upgrade the two apps to vinext 1.x.
  - What: change the `vinext` version in the two apps to the current 1.x and refresh the
    lockfile for those entries only. Heavy steps run under `heavy-run.sh`, after 22:00 ICT.
  - Files: `apps/marketing/package.json`, `apps/activity-vinext-fixture/package.json`,
    `pnpm-lock.yaml`, and app files only if the build fails because of vinext 1.x.
  - Done when: `git diff --stat` shows only these two apps and their lockfile entries;
    `pnpm --filter marketing build` and `pnpm --filter activity-vinext-fixture build` exit 0;
    `pnpm --filter marketing test` (vitest `--maxWorkers=1`) exits 0; no deploy ran.
- [ ] Task: Record the vinext result for the trial baseline.
  - What: note the vinext version, the Vite version that resolves, and any build warning.
  - Files: the evidence note from Task 1.
  - Done when: the note names the resolved `vinext` and `vite` versions with commands that
    reproduce them (`pnpm why vinext`, `pnpm why vite`).
- [b] Task: Measure - User Manual Verification 'Phase 2: vinext 1.x upgrade (PM step 0)' (Protocol in workflow.md) (deferred:product-owner)

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

> Every task below is `[b]` with `deferred:daniel` until Daniel decides on the Phase 3 report.

- [b] Task: Make TypeScript 7 the only compiler (deferred:daniel)
  - What: pin the exact 7.0.x in the workspace; remove the `overrides.typescript` 5.9.3 pin and
    the second install; fix each `tsconfig` with narrow `types` lists; remove `baseUrl` from
    `apps/marketing/tsconfig.json`.
  - Files: `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `apps/*/tsconfig*.json`,
    `packages/*/tsconfig*.json`, `apps/marketing/tsconfig.json`.
  - Done when: `pnpm why typescript` shows one major version; `pnpm install --frozen-lockfile`
    exits 0; every `check-types` script exits as the Phase 1 baseline allows; `git grep` finds
    no new `@ts-ignore`, `@ts-nocheck`, or `ignoreBuildErrors`.
- [b] Task: Move linting off the TypeScript 5 API (deferred:daniel)
  - What: apply the Phase 3 plan for `typescript-eslint` (Oxlint type-aware through tsgolint),
    pin the rule set, and move or remove each other API consumer from the Phase 3 table.
  - Files: `packages/config/eslint/`, app `eslint.config.mjs` files, an Oxlint config, `package.json`
    files that list the old tools.
  - Done when: `pnpm turbo run lint` exits as the baseline allows with the second install gone;
    each consumer row from Phase 3 is marked "done".
- [b] Task: Route CI and Turbo to TypeScript 7 (deferred:daniel)
  - What: update `turbo.json` and `.github/workflows/ci.yml`; bound checker count under Turbo;
    observe three representative CI runs.
  - Files: `turbo.json`, `.github/workflows/ci.yml`.
  - Done when: three CI runs finish with no new nondeterminism, memory failure, or cache error;
    the checker setting is written in the CI file.
- [b] Task: Update operator documents (deferred:daniel)
  - What: update `measure/tech-stack.md` and the operator notes for editor setup, checker
    count, fallback, and rollback. Mark `typescript6_major_migration` superseded.
  - Files: `measure/tech-stack.md`, `measure/tracks.md`, operator notes under `docs/`.
  - Done when: the documents name TypeScript 7 as the only compiler and give one rollback
    command; `grep -n "TypeScript 6" measure/tech-stack.md` shows no bridge text.
- [b] Task: Run Measure doctor and final acceptance (deferred:daniel)
  - What: run `measure/generate.sh` and `measure/doctor.sh` with their documented commands;
    run the aggregate `lint`, `test`, `check-types`, and `build` gates under `heavy-run.sh`;
    complete the change-quality review against `spec.md` and this plan.
  - Files: generated Measure files; review notes in the track folder.
  - Done when: doctor exits 0; no migration-caused regression remains against the baseline;
    no Critical or High finding is open.
- [b] Task: Measure - User Manual Verification 'Phase 5: Rollout to one compiler' (Protocol in workflow.md) (deferred:daniel)
