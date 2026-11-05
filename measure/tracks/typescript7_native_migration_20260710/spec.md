# Specification: TypeScript 7 Native Compiler Migration

## Amendment Note (2026-11-05)

- Date: 2026-11-05.
- Source: Daniel, through the PM (Google Tasks, 2026-11-05 18:50 ICT).
- Author model: claude-code/claude-sonnet-5-5.
- Effect: this amendment replaces the dual-compiler design with a one-compiler design.
  It also adds a vinext upgrade, a Cloudflare preparation inventory, and a gated rollout.

### Owner decisions (Daniel, word for word)

"1. Roll this into the typescript 7 (7.1?) migration. Is ts-go a better option here? 2. I'm interested in improving the performance of our dev and our prod, not in having a second compiler. 3. Cloudflare move will get a separate track, but preparation for the cloudflare move should be in the Typescript 7 track. The entire architecture of our monorepo was supposed to make the system transportable to Cloudflare or elsewhere with little hassle. Has it not done that? 4. You can't run tests on the trial install and then we can determine if there are significant regressions. 5. Vinext is a one line change and the app is not critical, so we can upgrade it first, then do the typescript testing."

"This" in point 1 is the A-49 study (`/home/daniebo/Desktop/handoff/a49-cloudflare-stack/report.md`).

### How the track reads each decision

| Point | Reading | Effect on the track |
| --- | --- | --- |
| 1 | The A-49 work joins this track. | The track uses tsgo, which is TypeScript 7 itself (see "Answer to question 1"). |
| 2 | The goal is speed in dev and prod. The end state has one compiler. | FR-2 (dual-compiler contract) is removed. TypeScript 6 is no longer a bridge. |
| 3 | Preparation for Cloudflare stays here. The move is a separate track. | Phase 4 is an inventory and a plan. No code moves. |
| 4 | **Default reading:** "You can run tests on the trial install". | Phase 3 runs the tests and the type checks on the trial install. See open question 1. |
| 5 | vinext goes first. TypeScript testing goes second. | Phase 2 upgrades vinext. Phase 3 starts after Phase 2. |

The PM reads point 4 as "You can run tests on the trial install". Daniel may correct this
reading. The default stays in force until Daniel corrects it.

### Answer to question 1 (from the A-49 study)

tsgo is the Microsoft Go port of TypeScript, and it is TypeScript 7 itself. tsrs is a Rust
port of that Go code. tsrs is a beta (0.22.0, TypeScript 7.1 beta target) and its package
name changed three times in October 2026. Therefore this track uses tsgo, which means
TypeScript 7. tsrs stays out of this track. The 7.1 beta is one extra data point only.

### Phase 1 outputs after this amendment

Phase 1 is finished history. Its tasks stay `[x]` with commit f68897ac. Commits 32346d6a and
476835906 added the all-workspace baseline and the completeness check.

| Phase 1 output | State | Reason |
| --- | --- | --- |
| `dual-compiler-contract.json` | **Superseded** | It defines two compilers. The end state has one. |
| `diagnostic-parity-ledger.json` | **Superseded** | It records TypeScript 6/7 parity. The TypeScript 6 oracle no longer exists. |
| `measure/tests/test_typescript7_native_migration_phase1.py` | History | It checks the superseded contract file. Do not extend it. |
| `test-strategy.md` | Stale | The strategy role rewrites it next. Do not edit it in this amendment. |
| `compiler-baseline.json` | **Input** | The trial compares memory and time against its TypeScript 5.9.3 values. |
| `surface-inventory.json` | **Input** | It lists the tools that use the TypeScript API. The one-compiler plan uses it. |
| `phase1-workspace-baseline.json`, `phase1-pre-existing-failures.json`, `capture-phase1-baseline.py`, `evidence/` | **Input** | They separate old failures from new regressions. |
| `benchmark-record-schema.json`, `rollout-record-schema.json` | Kept, not required | The trial reports one table. Use a schema only if the table needs it. |

The verified counts replace the old audit counts. The workspace count is 31 (not 21). The
manifest count with TypeScript is 35 (not 25). The `tsconfig` count is 39 (not 24). The
`surface-inventory.json` list holds 38 entries for the 39 count. That mismatch is a known
defect and this amendment does not fix it.

## Overview

Move the monorepo to one compiler: TypeScript 7 (tsgo), the official Microsoft compiler. The
end state has no second TypeScript install. A second compiler would add memory and time cost,
and Daniel rejects it.

The track has four working steps and one gated step:

1. Upgrade `apps/marketing` and `apps/activity-vinext-fixture` to vinext 1.x (PM step 0).
2. Run a TypeScript 7 trial in a git worktree and report regressions, memory, and time
   (PM step 1).
3. Inventory the Node-only dependencies and plan the adapters for a later Cloudflare move
   (PM step 2). No code moves.
4. After Daniel decides on the PM step 1 report, roll out TypeScript 7 as the only compiler.

The Cloudflare move itself is a separate track.

## Baseline and Evidence

The Phase 1 baseline stays valid. Use these facts:

- The workspace resolves TypeScript 5.9.3 through `pnpm-workspace.yaml` `overrides.typescript`.
- 31 workspaces have a `check-types` script. 35 manifests declare TypeScript. 39 `tsconfig`
  files exist.
- The host has 4 CPUs and 7.5 GB memory. Swap use was high at capture time.
- `apps/reading-advantage` ended its TypeScript 5.9.3 check with exit 134 (out of memory). It
  has no valid baseline. The trial records this again and does not claim a regression for it.
- 15 of 31 baseline workspaces are marked as contaminated by an unrelated dirty worktree.
- `apps/marketing/tsconfig.json` line 7 sets `baseUrl`. TypeScript 7 removes `baseUrl`.
- TypeScript 7 sets the default of `types` to an empty list. A probe of `packages/types`
  failed for this reason.
- `apps/marketing` and `apps/activity-vinext-fixture` declare vinext 0.2.0 and Vite 8.1.0.
  The npm registry listed vinext 1.4.3 on 2026-11-03 (A-49 study).
- No Cloudflare configuration exists in the repository (A-49 study).

## Constraints

- **Heavy steps.** Run every heavy step through
  `bash /home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh -c '<cmd>'`. Run one at a
  time. Heavy steps are `pnpm install`, builds, full tests, and type checks over the repository.
- **Time window.** For this track, heavy steps run only after 22:00 ICT. They run only when no
  Storytime heavy run waits (PM, 2026-11-05). Storytime keeps the priority.
- **Memory.** The machine has 7 GB of memory. Run vitest with `--maxWorkers=1`.
- **No push and no deploy.** This applies to every phase of this track.
- **Hashing policy (AGENTS.md).** Add no new hash field. Do not widen hash coverage in
  `compiler-baseline.json` or in the schemas.
- **Trial isolation.** The trial install lives in a git worktree. The main checkout and its
  lockfile do not change in Phase 3.
- **Worktree cleanup.** Remove the trial worktree and branch when Phase 3 ends, as AGENTS.md
  requires. Report any item left behind.
- **Staging.** The repository has many untracked files from other sessions. Stage only the
  paths that this track owns.

## Functional Requirements

### FR-1: Keep the Reproducible Baseline (done in Phase 1)

- The Phase 1 baseline, inventory, and failure classification stay as inputs.
- The trial compares against `compiler-baseline.json` and `phase1-pre-existing-failures.json`.
  It does not convert an old failure into a TypeScript 7 regression.

### FR-2: Upgrade vinext to 1.x (PM step 0)

- Check the vinext 1.x peer requirements before the change. For example, check the Vite major,
  the React range, and the Node range. Record the result.
- Move `apps/marketing` and `apps/activity-vinext-fixture` from vinext 0.2.0 to the current
  vinext 1.x. Keep the change to these two apps and the lockfile entries that follow from it.
- Build and tests of both apps pass. No deploy happens.
- If the peer check shows a Vite major change, record it and stop for a decision before the edit.

### FR-3: Run the TypeScript 7 Trial (PM step 1)

- The gates use the latest stable 7.0.x. The 7.1 beta is one extra data point only.
- Install in a git worktree. The main checkout and its lockfile do not change.
- Run the type checks and the tests there. List every regression against the Phase 1 baseline.
- Record peak memory and wall time against the 5.9.3 values in `compiler-baseline.json`.
- Output to the PM: the regression list and a memory and time table.
- Treat a faster run with missing diagnostics as a failed measurement.

### FR-4: Plan for ONE Compiler (PM step 1)

- Plan how `typescript-eslint` stops needing the TypeScript 5 API. The study says Oxlint
  type-aware rules run on typescript-go through tsgolint. Therefore the Oxlint move can remove
  the second install.
- List every other consumer of the TypeScript JS API from `surface-inventory.json`. Include the
  type check inside `next build`, `tsup --dts`, `ts-node`, `tsconfck`, `drizzle-kit`, the ESLint
  config loaders, commitlint, and any other tool that imports `typescript`.
- For each consumer, give the state under TypeScript 7 and the action that removes the second
  install.
- Keep tsrs out of the plan.

### FR-5: Prepare for the Cloudflare Move (PM step 2)

- Inventory each Node-only dependency. Give the `package.json` path and line and the import
  sites. Examples: `sharp` in `apps/science-advantage` and `apps/www-reading-advantage`, `pg` in
  `apps/codecamp-advantage`, `@node-rs/argon2` in `packages/auth`, `firebase-admin` and
  `@google-cloud/*` in `apps/reading-advantage`. The study lists more in `primary-advantage`,
  `reading-advantage`, and `services`.
- Write the adapter plan for `packages/db`, storage, auth, and integrations. The goal: apps do
  not import these packages directly.
- Answer Daniel's question 3 ("Has it not done that?") with evidence from the inventory.
- No code moves in this phase.

### FR-6: Roll Out One Compiler (gated)

Daniel decides on the PM step 1 report before any task in this requirement starts.

- TypeScript 7 becomes the only compiler. The second TypeScript install is removed.
- Fix each `tsconfig` for TypeScript 7: explicit narrow `types` lists, and no `baseUrl` in
  `apps/marketing/tsconfig.json`. Do not use a monorepo-wide `types: ["*"]` unless evidence
  shows narrow lists are impractical.
- Move linting so that no tool needs the TypeScript 5 API (see FR-4).
- Route `check-types` and eligible builds to TypeScript 7. Bound checker count under Turbo.
- Update CI. Observe at least three representative CI runs.
- Update operator documents and `measure/tech-stack.md`.
- Add no `@ts-ignore`, `@ts-nocheck`, wider `skipLibCheck`, or `ignoreBuildErrors` escape.
- Run Measure doctor and the final acceptance review.

## Non-Functional Requirements

- Compiler versions are exact or pinned centrally. No floating major range.
- Type safety does not weaken to obtain a pass.
- No runtime behavior, provider integration, database schema, or deployment architecture
  changes in Phases 2 to 4.
- Evidence is saved under this track in a machine-readable form where practical.
- Unrelated dirty-worktree changes are never staged or committed.

## Acceptance Criteria

Each criterion maps to a requirement and a plan phase.

| # | Criterion | FR | Phase |
| --- | --- | --- | --- |
| 1 | vinext peer requirements are recorded for vinext 1.x. | FR-2 | 2 |
| 2 | Both vinext apps declare vinext 1.x. Their builds and tests pass. No deploy happened. | FR-2 | 2 |
| 3 | Only the two apps and their lockfile entries changed in the vinext commit. | FR-2 | 2 |
| 4 | The trial worktree runs the latest stable 7.0.x. The main lockfile has no diff. | FR-3 | 3 |
| 5 | The regression list separates new regressions from old failures. | FR-3 | 3 |
| 6 | The table gives peak memory and wall time for 7.0.x and for the 5.9.3 baseline. | FR-3 | 3 |
| 7 | The 7.1 beta result, if present, is labeled as one extra data point. | FR-3 | 3 |
| 8 | The one-compiler plan covers `typescript-eslint` and every consumer in the inventory. | FR-4 | 3 |
| 9 | The Node-only inventory gives path, line, and import sites for each dependency. | FR-5 | 4 |
| 10 | The adapter plan covers `packages/db`, storage, auth, and integrations. | FR-5 | 4 |
| 11 | The Phase 4 report answers question 3 with evidence, and no code moved. | FR-5 | 4 |
| 12 | After Daniel's decision, TypeScript 7 is the only compiler and the second install is gone. | FR-6 | 5 |
| 13 | After Daniel's decision, all `tsconfig` files pass under TypeScript 7 without escapes. | FR-6 | 5 |
| 14 | After Daniel's decision, lint runs without the TypeScript 5 API. | FR-6 | 5 |
| 15 | After Daniel's decision, CI runs TypeScript 7 and three runs are observed. | FR-6 | 5 |
| 16 | After Daniel's decision, operator documents describe the one-compiler setup. | FR-6 | 5 |
| 17 | No new hash field exists, and `compiler-baseline.json` hash coverage did not grow. | all | all |

## Out of Scope

- tsrs and any other beta compiler.
- The Cloudflare move itself (a separate track).
- Moving code, or changing dependencies, in the Node-only inventory phase.
- A second compiler or a TypeScript 6 bridge in the end state.
- Upgrading unrelated frameworks, test runners, or build tools.
- Any deploy or push.
- Application type refactors, unless TypeScript 7 exposes a real incompatibility.

## Risks

- vinext 1.x may need a newer Vite or React major. The peer check in Phase 2 finds this first.
- The host has 4 CPUs and 7 GB memory. TypeScript 7 uses parallel checkers, so memory peaks may
  rise. The trial records this and does not assume a gain.
- `apps/reading-advantage` has no valid 5.9.3 baseline. Its trial result is informational.
- Oxlint type-aware rules are outside semver, so new errors can appear at any version. The
  rollout phase must pin the rule set.
- `next build` runs its own type check. The trial proves which compiler it loads.

## Open Questions (defaults are in force)

1. Point 4: does Daniel mean "You can run tests on the trial install" (default) or "You can't"?
   Default: run tests on the trial install.
2. Does the Phase 1 manual verification (`[b]`, `deferred:product-owner`) block Phases 2 to 4?
   Default: no. Phases 2 to 4 are read-only or isolated, so they proceed.
3. Which 7.0.x patch? Default: the latest stable 7.0.x on the day of the trial. Record the
   number.

## References

- `/home/daniebo/Desktop/handoff/a49-cloudflare-stack/report.md` (A-49 study)
- `compiler-baseline.json`, `surface-inventory.json`, `phase1-pre-existing-failures.json`
- `review-2026-07-15.md`
- `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `.github/workflows/ci.yml`
- `packages/config/tsconfig/base.json`, `packages/config/eslint/index.js`
- `measure/workflow.md`, `AGENTS.md`
