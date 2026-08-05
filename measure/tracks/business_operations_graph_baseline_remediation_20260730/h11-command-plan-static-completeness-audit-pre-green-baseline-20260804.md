# H11 Command-Plan Static Completeness Audit Pre-Green Baseline

This artifact freezes the complete static command-plan completeness audit for
the R1 v3 Podman execution-closure runner. It is a Red baseline with a
stop-and-report finding, not acceptance evidence.

- Captured date: 2026-08-04
- Runner path: measure/business_operations_graph_baseline_execution_closure_v3_podman.py
- Pre-Red runner SHA-256: dcf2831c32ea434dd153c3ba51abe18b357956c695d309647c6b98f861b1430f
- Test path: measure/tests/test_business_operations_graph_baseline_execution_closure.py
- Pre-Red full test SHA-256: ecd2738db9f65754a9eb35266df84b0d7c105da33a90fd956951ca77881a2ece
- Post-Red full test SHA-256: 392e396e89192ccd2a9446396c5c967451fa7e603dfca35ca2f2ca40f702354b
- Runner delta: **zero** — the audit found a stop-and-report condition, so no
  runner line changed. Reversing the (empty) H11 runner edit set reconstructs
  the pre-Green runner at `dcf2831c…` byte-for-byte trivially.
- Live finding: preserved attempt-0005 proves the trace stage passes end to
  end (H6/H7/H9a/H9b closed) and the transaction advanced to gate
  `accounts-test`, which exited 1 because
  `apps/accounts/scripts/product-role-rejection.test.ts` failed with
  `Failed to resolve entry for package "@reading-advantage/domain"` — the
  frozen domain exports point at `./dist/*`, the host has `packages/domain/dist`
  built, and the container does not, because the runner build plan builds only
  `build-db`, `build-auth`, `build-backend` and NOT `build-domain`. Raw
  receipts: `r1-v3-podman-execution-attempt-20260804-0005/raw/receipt-accounts-test.{stdout,stderr}.txt`
  (32/33 tests pass; only this resolution failure).

## Audit scope and method

Every gate/command in the runner's command plan was enumerated from the four
plan lists: runner lines 90-100 (`BUILDS`, `FR4`, `NONINSTALL_PNPM_COMMANDS`),
lines 5216-5237 (stage allowlist), lines 7988-7992 (prerequisite build loop),
and lines 10325-10342 (expected command order). For each test/build gate the
workspace packages its code surface imports were determined by scanning the
FROZEN R1 v2 archive
(`r1-task2-source-and-graph-v2-20260801/snapshot.archive.json`) source — never
the live worktree, which drifts from the frozen archive for db, domain,
game-contracts, game-cartridges, and advantage-play-kit. Import statements
were extracted with comments and string literals excluded. The audit includes
the transitive build-time (non-test `src/`) workspace imports of every build
that would be added, because each build is itself a gate with its own
resolution surface; this is what makes the audit complete "in one pass, not one
attempt per missing package".

## Audit table

Legend: dist-based = the package `exports`/`main`/`types` point at `./dist/*`;
built in plan = the plan runs that package's build before the gate. The frozen
`@reading-advantage/config` exports point at source files (`./tsconfig`,
`./eslint`, `./tailwind`) and it has no build script, so it never requires a
build and is listed as non-dist N/A.

### FR4 gates (test/build gates)

| Gate | Workspace deps in code surface | Dist-based? | Built in plan? | Verdict |
|---|---|---|---|---|
| `accounts-test` (`pnpm --filter accounts test`) | `@reading-advantage/auth` (direct + via `marketing/app/lib/company-oidc.ts`, `sales-advantage/lib/company-oidc.ts`, `codecamp-advantage/lib/company-oidc.ts`) | yes | yes (`build-auth`) | OK |
| | `@reading-advantage/db` (direct + via the two lib files) | yes | yes (`build-db`) | OK |
| | `@reading-advantage/backend` (direct) | yes | yes (`build-backend`) | OK |
| | `@reading-advantage/domain` (via `apps/codecamp-advantage/lib/company-oidc.ts` and `apps/sales-advantage/lib/company-oidc.ts`, cross-app imports of the accounts test) | yes | **no** | **MISSING — `build-domain` required** |
| | `@reading-advantage/config` (tsconfig/eslint devDep) | no (source exports, no build script) | N/A | OK |
| `accounts-check-types` (`pnpm --filter accounts check-types`) | identical to `accounts-test` (`tsconfig.test.json` includes the test files) | yes | `build-domain` **no** | **MISSING — same as accounts-test** |
| `backend-test` (`pnpm --filter @reading-advantage/backend test`) | `@reading-advantage/db` | yes | yes (`build-db`) | OK |
| | `@reading-advantage/config` | no | N/A | OK |
| `backend-check-types` (`pnpm --filter @reading-advantage/backend check-types`) | identical to `backend-test` | yes | yes | OK |

### Build gates — the closure required before the FR4 gates

For the FR4 gates to resolve, `build-domain` must run; domain's frozen build
(`tsc`) then requires its build-time workspace imports to resolve, and each of
those builds requires its own imports, transitively. The resulting closure is:

| Build gate (proposed) | Build-time workspace deps | Hermetically buildable from the frozen archive? | Verdict |
|---|---|---|---|
| `build-db` (existing) | none | yes | OK |
| `build-auth` (existing) | db | yes | OK |
| `build-practice-core` | none | yes | OK |
| `build-knowledge-space-core` | none | yes | OK |
| `build-game-contracts` | none | yes (frozen version; proven in-container by the retained workspace-DAG derived builds of attempts 0002/0005) | OK |
| `build-activity-tutorial` | none | yes | OK |
| `build-integrations-github` | none | yes | OK |
| `build-activity-runtime` | practice-core | **no** — frozen build script `node scripts/clean-dist.mjs && tsc`; `scripts/clean-dist.mjs` is ABSENT from the frozen archive (worktree-only). Verified exit 1 on the host with the file removed: `Error: Cannot find module '…/activity-runtime/scripts/clean-dist.mjs'` | **BLOCKED — archive-absent pre-step** |
| `build-srs-engine` | practice-core | yes | OK |
| `build-advantage-play-kit` | game-contracts | yes (frozen version; proven in-container by the runtime build of attempts 0002/0005) | OK |
| `build-codecamp-knowledge` | knowledge-space-core, activity-runtime, activity-tutorial, advantage-play-kit | **no** — frozen build script `tsc && node scripts/copy-data.mjs`; `scripts/copy-data.mjs` is ABSENT from the frozen archive (worktree-only) | **BLOCKED — archive-absent pre-step** |
| `build-domain` | db, auth, activity-runtime, activity-tutorial, codecamp-knowledge, game-contracts, integrations-github, srs-engine | **no** — two of its build-time deps (`activity-runtime`, `codecamp-knowledge`) cannot build hermetically | **BLOCKED transitively** |
| `build-backend` (existing) | db | yes | OK |

Not required by any gate or closure build: `@reading-advantage/types` (frozen
domain source mentions it only in comments; nothing in the closure imports it
at build time), `@reading-advantage/api` and `@reading-advantage/webhooks`
(no gate or closure build imports them), `@reading-advantage/ai`,
`@reading-advantage/storage`, `@reading-advantage/game-cartridges` (the frozen
domain — unlike the worktree — does not import them at build time; the
worktree's dragon-rider files are not in the frozen archive).

## Stop-and-report finding (H11 contract item 4)

The audit is complete and reveals that the FR4 gates require the closure above,
but two closure builds reference package-local `.mjs` pre-steps that the frozen
R1 v2 archive does not capture:

- `@reading-advantage/activity-runtime` — frozen build
  `node scripts/clean-dist.mjs && tsc`; `packages/activity-runtime/scripts/clean-dist.mjs`
  is worktree-only (verified absent from the archive entry index; verified
  host exit 1 with the file removed).
- `@reading-advantage/codecamp-knowledge` — frozen build
  `tsc && node scripts/copy-data.mjs`; `packages/codecamp-knowledge/scripts/copy-data.mjs`
  is worktree-only.

This is the same `.mjs`-capture gap that H2/H9b repaired only for the
direct-runtime source packet (baseline-Git binding of
`generate-standard-pack-release.mjs`); the V2 manifest discovery admitted only
`.ts`/`.tsx`/`.mts`/`.cts`, so these build pre-steps were never archived.

Consequence: any plan addition that makes the accounts gates reachable
(`build-domain` at minimum, or the full closure) would deterministically fail
inside the hermetic container — `build-activity-runtime` and/or
`build-codecamp-knowledge` exit nonzero, and the runner correctly preserves
that as a blocked upstream-prerequisite-build attempt. Shipping such a plan is
the "one attempt per missing package" anti-pattern the audit exists to prevent,
and fixing it would require adding files to the frozen closure or changing
frozen source/manifests/build scripts — both outside this slice's authorized
surface ("frozen evidence dirs" read-only; "never disguise it by modifying
package source, manifest, exports, tsconfig, build script, lockfile, or the
closure").

Per H11 contract item 4, this slice **stops and reports** instead of
improvising: the runner's command plan is left byte-unchanged at
`dcf2831c…`, the audit above is the deliverable, and the four new Red tests
encode the audit as regression evidence. A future slice must resolve the
archive-absent pre-steps (closure/supplement capture of the two `.mjs` files,
or an equivalent frozen-input change) before the plan addition can go Green.

## Red receipt (failing test, pre-fix)

The four new audit tests, run against the unchanged pre-Green runner:

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -q -k "command_plan"

Result: **4 failed in 9.93s** (75 deselected):

1. `test_command_plan_gate_import_surfaces_are_all_prerequisite_built` —
   `AssertionError: '@reading-advantage/domain' not found in
   {'@reading-advantage/db': 'build-db', '@reading-advantage/auth':
   'build-auth', '@reading-advantage/backend': 'build-backend'} : dist-exports
   package @reading-advantage/domain must be built before gate accounts-test`
   — the exact live attempt-0005 failure.
2. `test_command_plan_builds_domain_after_its_workspace_dep_builds_and_before_gates` —
   `build-domain must be in the command plan before every gate that needs it`.
3. `test_command_plan_build_closure_is_topologically_complete` — the plan's
   build set is `{db, auth, backend}` and must equal the audit closure.
4. `test_command_plan_frozen_build_presteps_are_archive_present` —
   `@reading-advantage/activity-runtime build pre-step scripts/clean-dist.mjs
   absent from the frozen archive` (and the same for codecamp-knowledge) — the
   stop-and-report finding pinned as a regression test that flips Green only
   when the closure captures the missing `.mjs` pre-steps.

Focused-suite green baseline receipt (pre-fix, the shared no-Podman
30-test selection; my additions are additive and not selected by it):

    PYTHONDONTWRITEBYTECODE=1 python3 -m pytest measure/tests/test_business_operations_graph_baseline_execution_closure.py -k "(preseal or production_materialize or candidate_failure_evidence or trace_event_cap or trace_capture_failure_evidence or directory_enumeration or unknown_trace_event_kind or phase_level_failure or bijection_failure_detail or module_load)" -q
    30 passed, 49 deselected in 39.60s

## Pinned-digest disposition (H11 contract item 3)

No pinned digest changes were required: the command plan did not legitimately
change (stop-and-report), so no frozen test pinning the plan digest went Red,
and no inventory/receipt-shape assertion is affected by an additional command.
The four Red tests are pure additions to the test file; the 30-test focused
suite and every frozen attempt-file digest pin remain unchanged.

## Frozen boundary (H11 contract item 4)

Byte-unchanged: the trace stage semantics, the parser/validator/tracer, the H6
cap line, the H7 directory-enumeration and H9a bijection-detail payloads, the
H9b module-load machinery, the H8/H10 phase-level publisher and validator, the
happy path, and every frozen candidate/attempt evidence directory
(`r1-v3-podman-execution-attempt-20260804-0005` preserved as the live finding).

## Authorship

The audit (frozen-archive import scans, worktree-vs-archive diff, and the host
verification of the archive-absent pre-step failure), the four Red test
methods, and the Red/focused runs were performed in-loop for this slice against
the real runner and the real test file. No Podman, pnpm, or real closure
transaction was run.
