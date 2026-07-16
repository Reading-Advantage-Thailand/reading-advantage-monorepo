# Test Strategy: TypeScript 7 Native Compiler Migration

**Tech Lead / strategy role.** This strategy freezes per-phase Red/Green/closeout
contracts, scope discipline, resource-budget shape, and applicability for the dual-
compiler migration. It proves the TypeScript 6 → TypeScript 7 transition is correct,
diagnostic-equivalent, resource-safe, and reversible. It does **not** author source,
alter runtime behavior, or touch unrelated dirty work.

This track supersedes the deferred `typescript6_major_migration` stub. TypeScript 6
remains in scope only as the compatibility bridge required by TypeScript 7.0 tooling
(typescript-eslint, ts-node, tsconfck, tsup); TypeScript 7 is the new native compiler.

---

## 0. Baseline, Graph Freshness, and Environment

- **Role-base SHA:** `1e535e8be68cf90b67517651f83e9e66f3fe5c24` (the commit that
  contained the spec and plan for this track; pre-strategy).
- **Strategy commit SHA:** the post-commit `HEAD` recorded by the orchestrator
  immediately after this file is committed. That SHA — not the role-base SHA, not
  any uncommitted worktree SHA — is the immutable `phase_base_sha` against which
  Phase 1 evidence is gathered and Phase 2 contracts are pinned.
- **`graph.db` freshness:** before any phase reads the graph, run
  `stat -c %Y graph.db` and compare to `date +%s`. If the age is > 24 h
  (86400 s), run `build-graph scan . ./graph.db` first; otherwise the existing
  graph may be used as-is. The strategy does **not** assert the graph is fresh;
  it requires the timestamp check.
- **Package manager:** pnpm `11.8.0` (`packageManager` field in root
  `package.json`). All commands use `pnpm`; no `npm` or `yarn` substitutions.
- **Workspace catalog:** `pnpm-workspace.yaml` `catalog` section. Aliases for
  TypeScript 7 and the TypeScript 6 compatibility alias are added there (or via
  per-package `pnpm.packageExtensions` if the catalog slot is unavailable). The
  strategy does **not** edit `turbo.json` global concurrency; Turbo concurrency
  is controlled per command via `TURBO_CONCURRENCY=1` or `--concurrency=1`.

## 1. Hardware Posture, Resource Capture, and Fail-Closed Triggers

The migration must be measurable and reproducible on a constrained host without
escalating into swap thrashing or OOM kills.

| Surface | Required default |
|---|---|
| Turbo concurrency for every Red/Green/closeout command | `1` (set via `TURBO_CONCURRENCY=1` or `--concurrency=1`) |
| TypeScript 7 `--checkers` | Compare `1` and `2`; selected value is documented after Phase 3g; `--checkers > 2` is rejected. |
| TypeScript 7 `--builders` (project references) | Not adopted (out of scope per spec). |
| Test runner workers | Inherited per package (no wholesale runner migration). |

**Resource signals captured by every benchmark and diagnostic run:**

- wall-clock elapsed time (`/usr/bin/time -v`)
- peak RSS (`Maximum resident set size` from `/usr/bin/time -v`)
- signed swap delta (read once before and after; recorded as `after - before`;
  negative values are valid when swap use decreases)
- process count (`pgrep -fc tsc` + `pgrep -fc node` at sample points)
- diagnostic count (normalized stdout+stderr)
- Turbo cache state (`turbo run ... --summarize --json` parsed via `json.loads`)
- exit status and signal (`WIFSIGNALED`, `WTERMSIG`)
- spawned-process-group aggregate (sum of `VmRSS` across the `pgid` of the
  spawned `tsc` process; sampled every quarter-second via `/proc/<pid>/status`)

**Fail-closed triggers** (run is marked `invalid`, never silently passed):

- swap delta exceeds the per-phase ceiling recorded in `compiler-baseline.json`.
- spawned-process-group aggregate `VmRSS` exceeds the per-phase ceiling
  recorded in `compiler-baseline.json`.
- a compiler run completes `exit 0` with a different diagnostic count than the
  parity ledger claims for the same tsconfig (false speedup).
- `dmesg | tail -n 50` shows an OOM-kill for any node/tsc worker since the
  run start **when `dmesg` is available**. If `dmesg` is not readable on the
  host (container / sandbox without `CAP_SYSLOG`), the harness records
  `dmesg: unavailable` in the run record and relies on exit-status, signal,
  process-group RSS, and swap-delta evidence alone. The harness does not
  fail solely because `dmesg` is unavailable.

Live benchmarks **abort** before swap/OOM thresholds: the harness samples the
spawned-process-group aggregate `VmRSS` every quarter-second and sends `SIGTERM` to
the entire spawned process group if aggregate RSS exceeds the exact
`stop_loss_process_group_rss_kib` value (80 % of the recorded RSS ceiling) or
positive swap growth exceeds the exact `stop_loss_swap_delta_kib` value (50 %
of the recorded swap ceiling). It then waits a bounded **5 seconds** grace
period, sends `SIGKILL` to any surviving process-group members, waits for every
child, and verifies the process group is fully reaped before recording the run
invalid. **No live benchmark intentionally drives the host into OOM.** Synthetic
fixtures are used to prove the parser / stop-loss paths (§5); OOM behavior
itself is not exercised on the host.

## 2. Surfaces the Strategy Distinguishes

The migration has five distinct work surfaces. Conflating them is a primary
source of false positives (A5). Every Red/Green command names which surface it
exercises.

1. **Native source checks** — `tsc --noEmit` against application/library source.
2. **Test-source checks** — `tsc --noEmit` against `*.test.ts(x)` files using the
   workspace's existing test tsconfig. The surface most exposed to TS 7's new
   `types: []` default.
3. **Declaration emit** — `tsc --emitDeclarationOnly` for packages that ship
   `.d.ts`. Byte-comparable (or reviewed diff ledger) before a workspace is
   allowed to flip its build to TS 7.
4. **Bundling** — Next.js, Vinext/Vite, tsup. Proven indirectly via
   `pnpm why typescript` plus a captured diagnostic from a minimal one-route
   workspace, not by re-running full app builds inside the migration gate.
5. **Test runtime** — Vitest, Jest, Playwright. Proven by loading each runner
   under the TS 7 environment (or under the TS 6 compatibility API per the
   ownership matrix) and exercising a representative subset.

Baseline commands respect each workspace's existing `tsconfig` (including any
`skipLibCheck` already declared in `packages/db/tsconfig.build.json` and
`packages/config/tsconfig/base.json`). The migration does **not** add
`--skipLibCheck` to commands whose tsconfig does not already declare it.

## 3. Compiler / Tool Ownership Matrix

The matrix below is an **inventory hypothesis to verify during Phase 1**, not
a binding decision. Each row is promoted to "binding" only when the Phase 1
inventory proves the consumer's compiler-resolution behavior. Only consumers
**proven** to embed the TypeScript programmatic API stay on TypeScript 6;
rows whose Phase 1 evidence does not confirm programmatic-API usage are
re-classified as "TS 7 eligible" and re-tested.

| Tool / consumer | Hypothesized compiler | Alias (catalog or per-package) | Binding? |
|---|---|---|---|
| Root + workspace `check-types` (after cutover) | TypeScript 7 | TS 7 catalog alias | **binding** (target) |
| `tsc` invocations in package `build` scripts that emit JS + `.d.ts` | TypeScript 7 (only after byte-equivalence or reviewed diff) | same | **binding** (target) |
| `typescript-eslint` | TypeScript 6 (`typescript` package) — programmatic API consumer | direct `typescript@6.0.2` | hypothesis; promoted if Phase 1 inventory confirms programmatic API |
| `ts-node` | TypeScript 6 — programmatic API consumer | same | hypothesis; promoted if Phase 1 inventory confirms programmatic API |
| `tsup` | TypeScript 6 — programmatic API consumer (per spec) | same | hypothesis; promoted if Phase 1 inventory confirms programmatic API |
| `tsconfck` | TypeScript 6 — programmatic API consumer | same | hypothesis; promoted if Phase 1 inventory confirms programmatic API |
| `commitlint` (transitive peer) | TypeScript 6 | same | hypothesis; promoted if Phase 1 inventory confirms programmatic API |
| `vitest` / `@vitest/*` runner | TypeScript 6 (or TS 7 — depends on whether the runner embeds the compiler) | same or TS 7 alias | **hypothesis**; Phase 1 inventory + Phase 2 smoke harness reclassify |
| `jest` / `ts-jest` runner | TypeScript 6 (or TS 7) | same or TS 7 alias | **hypothesis**; Phase 1 inventory + Phase 2 smoke harness reclassify |
| `@playwright/test` runner | TypeScript 6 (or TS 7) | same or TS 7 alias | **hypothesis**; preserved verbatim regardless (no wholesale migration) |
| Next.js `next build` / `next typegen` | Mixed; depends on whether Next.js invokes the workspace `tsc` or its bundled compiler | mixed; documented | **hypothesis**; proven per app via `pnpm why typescript` and `.next/types/` resolution |
| Vinext/Vite `vite build` | Same as Next.js | same | **hypothesis**; proven per app |
| Drizzle Kit / `drizzle-kit` CLI | TypeScript 6 (peer) | same | hypothesis; promoted if Phase 1 inventory confirms programmatic API |
| ESLint flat config loaders | TypeScript 6 | same | hypothesis; promoted if Phase 1 inventory confirms programmatic API |

A row marked **binding** is committed for the track. A row marked
**hypothesis** is re-tested by the Phase 2 compiler-consumer smoke harness;
its outcome (TS 6 confirmed, TS 7 confirmed, or "no programmatic API found")
drives Phase 3 row promotion. Only consumers **proven** to embed the
TypeScript programmatic API stay on TypeScript 6. Unproven rows default to
TS 7 unless the smoke harness shows otherwise.

## 4. Acceptance Order

The harness measures in this strict order. Reordering is rejected because each
step produces evidence the next step consumes.

1. `packages/types`
2. `packages/db`
3. `packages/domain`
4. `packages/auth`
5. Other shared packages (`config`, `ui`, `utils`, `integrations/*`)
6. `apps/advantage-games`
7. `apps/science-advantage`
8. `apps/primary-advantage`
9. `apps/reading-advantage` (benchmark keystone)
10. Remaining apps (`codecamp-advantage`, `sales-advantage`, `marketing`, `www-reading-advantage`, `activity-vinext-fixture`)
11. Full Turbo `check-types` graph (uncached, then warm)

"Smallest shared package first" is a determinism guarantee, not a speed
optimization. A green `packages/types` proves the alias layout before larger
surfaces can mislead the parity harness.

## 5. Phase Test Approach

### Phase 1 — Contract & Schema Definition (artifact-only)

**Phase 1 Red** writes schema-shape and baseline tests under
`measure/tests/test_typescript7_native_migration_phase1.py`. Each test
asserts the presence, JSON parseability, and required-key shape of one of
the six committed JSON artifacts. The tests reference the artifacts by
path, not by content.

**Phase 1 Green** writes the six JSON artifacts under
`measure/tracks/typescript7_native_migration_20260710/`:

- `compiler-baseline.json` — resolved `typescript` versions, Node + pnpm versions,
  CPU count, total RAM, `free -m`, Turbo concurrency setting, role-base SHA,
  `phase_base_sha`, `graph.db` mtime, and policy-derived resource ceilings plus
  their 80 % RSS / 50 % swap stop-loss thresholds.
- `surface-inventory.json` — every `tsconfig*.json`, every `tsc` script, every
  peer dep on `typescript`, every catalog alias, plus the inventory hypothesis
  outcomes from §3 (programmatic-API usage verified or not).
- `dual-compiler-contract.json` — alias lines for the catalog, four command
  names (`check-types:native`, `check-types:compat`, `check-types:parity`,
  `check-types:rollback`), and the §3 ownership matrix with each row marked
  "binding" or "hypothesis".
- `diagnostic-parity-ledger.json` — JSON array; empty `[]` is a valid
  initial state when the Phase 2 parity harness reports an empty normalized
  TS 6 ∩ TS 7 diff for every tsconfig. Populated when intentional TS 7
  differences are reviewed in Phase 3.
- `benchmark-record-schema.json` — JSON Schema defining per-run records
  (elapsed_ms, peak_rss_kib, swap_delta_kib, oom_kill_count, process_count,
  diagnostic_count, exit_status, signal, turbo_cache_state, tsconfig_path,
  compiler_version, --checkers, host_idle_class).
- `rollout-record-schema.json` — JSON Schema for CI observation rows
  (run_id, lane, ts7_gate_exit, ts6_parity_exit, cache_state,
  order_dependent_diff_count, peak_rss_kib). The two diagnostic-difference
  fields are zero only after the complete ledger-aware Phase 3 parity oracle
  accepts all 39 configs; `null` keeps a rejected or incomplete observation
  non-promotable. Turbo's truncated task logs remain raw troubleshooting
  evidence and never determine rollout parity.

Validation uses the Python standard library only: `json.JSONDecodeError`,
schema-shape tests (assert presence and types of required keys), and one
existing repo validator (`measure/doctor.sh` against the committed schemas).
**No `ajv` is added** — the repo does not currently depend on `ajv`, and the
strategy must not introduce a new dependency for schema validation.

**Phase 1 Red command:**
```
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_typescript7_native_migration_phase1
```
Exits non-zero: the six JSON artifacts and the schema-shape test do not
exist yet.

**Phase 1 Green / closeout gate:** the same command exits 0, plus the
orchestrator audit:
```
bash tests/orchestrator_catalog.sh && \
bash tests/orchestrator_marker_vocabulary.sh && \
bash tests/orchestrator_supervisor_invariants.sh && \
bash measure/doctor.sh
```

**Risk:** medium. Schema drift between Phase 1 and Phase 3 corrupts later
evidence. Defense: Phase 1 closeout re-runs the audit after the schemas are
committed.

### Phase 2 — Test (Red contracts) → Phase 2 Green (reusable harness)

**The focused test suite is
`measure/tests/test_typescript7_native_migration_phase2.py`.** It runs on
Python 3.12 and is the single source of truth for Phase 2 acceptance.

Every plan phase must complete its own canonical
Red → Green → reviews → phase-acceptance cycle. **Phase 2 cannot defer
implementation needed for its tests to Phase 3.** Phase 2 Red owns failing
tests and fixtures only; **Phase 2 Green implements the reusable harness
logic and contracts** required to make the failing tests pass — and **only
that implementation**. Phase 2 Green does **not** change package resolution,
tsconfigs, workspace scripts, the lockfile, or any production/toolchain
behavior. Phase 3 then applies the already-green harnesses to the real
TS 6 → TS 7 migration; that is where catalog aliases, tsconfig fixes, and
lockfile changes happen.

Phase 2 Green is bounded to:

- the Python harness modules (`measure/tests/test_typescript7_native_migration_phase2.py`
  and any helper modules it imports);
- the Phase 2 fixtures under
  `measure/tracks/typescript7_native_migration_20260710/fixtures/`;
- the Phase 2 refutation fixtures (same directory);
- the Phase 2 schema-shape additions to `compiler-baseline.json`,
  `surface-inventory.json`, `dual-compiler-contract.json`,
  `benchmark-record-schema.json`, and `rollout-record-schema.json` (only
  Phase 2 may add fields to these; Phase 3 reads but does not extend them
  except for the parity ledger, which Phase 3 owns exclusively).

Phase 2 Green does **not** touch `pnpm-workspace.yaml`, `pnpm-lock.yaml`,
any `package.json`, any `tsconfig*.json`, any `next.config.ts`, any
`vite.config.ts`, any `turbo.json`, any `eslint.config.mjs`, or any
production source. The Phase 2 §5.2 tsconfig contract is a **read-only
shape test** in Phase 2 — it parses the existing tsconfigs and asserts
their shape; it does not modify them. The Phase 2 §5.1 resolver contract is
a **read-only** inspection of the *current* resolution state (whatever
that state is at `phase_base_sha`) plus a written assertion of what
"two distinct physical installations" would look like. Phase 2 Green does
not install or alias TypeScript 7 in the workspace.

Phase 2 exercises process-launching, normalization, monitoring, and rejection
logic with a **deterministic fixture executable** for each compiler/tool role.
Each fixture executable runs as a **real subprocess** in its own OS process
group; `node:child_process` and Python subprocess APIs are not mocked. These
fixtures are compiler stand-ins with pinned stdout, stderr, exit status, signal,
and resource-record inputs. They do not claim that TypeScript 6 or TypeScript 7
is installed. Phase 3, after the exact aliases are installed, replaces those
fixture command paths with the installed compiler and tool paths.

Five contract harnesses:

1. **Package-resolution contract.** Asserts that `pnpm why -r typescript`
   resolves to two distinct physical installations: TS 6 (via `typescript`)
   and TS 7 (via the catalog alias). Asserts that `node -e "console.log(
   require.resolve('typescript'))"` resolves under TS 6's tree. In Phase 2
   Green, this contract is implemented as a **pure-inspection harness** that
   captures the current resolution state and compares it against the
   expected post-cutover shape using a deterministic fixture resolver
   executable launched as a real subprocess. The harness does not invoke
   `pnpm install`, edit the catalog, or re-resolve; it inspects.
2. **tsconfig compatibility contract.** Loads each `tsconfig*.json` and asserts
   absence of removed options (`baseUrl` outside marketing's transition plan;
   legacy `moduleResolution: "node"` not under bundler; deprecated
   `suppressExcessPropertyErrors`) and the **appropriate** ambient-globals
   posture: a narrow, explicit `types` array **only where globals are
   consumed**. An explicit empty `types: []` array is valid when the
   inventory proves no ambient globals are needed and TS 7 semantics are
   unchanged. Inherited omission of `types` (no `types` key at all) is
   valid under the same condition.
3. **Diagnostic parity harness.** For each `(tsconfig, compiler-version)` pair,
   launches deterministic TS 6 and TS 7 fixture executables as real OS
   subprocesses, normalizes their pinned output (strip absolute paths, strip
   timing, normalize CRLF, sort by file→line→column→code), and asserts the
   normalized sets are equal modulo the
   entries in `diagnostic-parity-ledger.json`. **An empty
   `diagnostic-parity-ledger.json` is a valid Phase 2 Green state** when the
   exact normalized TS 6 ∩ TS 7 diff for every tsconfig is empty. The harness
   rejects only: (i) an **unexplained non-empty diff** (TS 6 or TS 7 reports
   diagnostics the other does not, with no ledger entry justifying the
   difference), or (ii) a **vacuous comparison with no compiler runs** (the
   harness exited 0 without invoking either fixture executable).
4. **Benchmark harness.** Wraps `/usr/bin/time -v` around a deterministic
   benchmark fixture executable launched as a real OS subprocess; parses
   `Maximum resident set size` and
   `Elapsed (wall clock) time` via labeled keys (not regex); asserts the host
   was idle at start by sampling `vmstat 1 3` and requiring CPU idle ≥ 70 %.
   Otherwise the run is recorded as `invalid`, not passed. Resource
   monitoring observes the **spawned process group aggregate** (`pgid` of
   the spawned fixture executable), not `/proc/$$`; if `dmesg` is unavailable the run
   record notes it and the harness relies on exit/signal/process-group
   RSS/swap evidence.
5. **Compiler-consumer smoke harness.** For each row in the §3 matrix,
   launches a deterministic fixture executable as a real OS subprocess and
   verifies that the classifier maps its pinned resolution/output evidence to
   `binding (TS 6)`, `binding (TS 7)`, or `no programmatic API found`.
   Counterexamples cover non-zero exits, missing resolution evidence, and
   ambiguous compiler ownership. Phase 2 proves the smoke/classification logic
   only; it does not execute the workspace's actual ESLint, ts-node, tsx, tsup,
   Vitest, Jest, Playwright, Drizzle Kit, commitlint, Next.js, or Vinext commands.
   Phase 3f runs those installed commands and writes the resulting row
   reclassification into `surface-inventory.json`.

**Refutations (live adversarial probes):**

- **Missing-diagnostic.** With one diagnostic line removed from the captured
  TS 6 stream (a sentinel injected into a fixture tsconfig), the harness
  reports a "missing TS 7 diagnostic" finding. Falsifies A5.
- **False-speedup.** A benchmark with `exit 0` and `diagnostic_count == 0`
  for a tsconfig the parity ledger knows emits ≥ 1 diagnostic is rejected.
  Falsifies A5.
- **Alias-swap.** A temporary mutation that renames the TS 7 catalog alias
  causes the resolver contract to fail. Falsifies A5 and tests supply-chain
  pinning.
- **Resource-parser stop-loss (synthetic).** A fixture input file containing
  a malformed labeled integer (string `"NaN"`, boolean, negative, or
  above-ceiling value) for `peak_rss_kib` or `swap_delta_kib` causes the
  benchmark harness to reject the record. The harness's stop-loss path is
  exercised without driving the host toward OOM.

**Turbo cache invalidation contract:** runs `pnpm turbo run check-types
--force` once and captures the cache state JSON. Then mutates the compiler
identity (temporarily renames the TS 7 alias to force re-resolution) and
asserts that `pnpm turbo run check-types` re-executes (`cache.bypassed ==
true`). Refutation: a mutation that does not bust the cache fails. In Phase
2 Green, this contract is a **pure-assertion harness** that verifies the
cache-invalidation contract shape; Phase 3 performs the actual cutover that
triggers the contract.

**Phase 2 Red command:**
```
PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v \
  measure.tests.test_typescript7_native_migration_phase2
```
Exits non-zero: the five contract harnesses and their refutations do not
exist yet.

**Phase 2 Green / closeout gate:** the same command exits 0, plus:
```
PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile \
  measure/tests/test_typescript7_native_migration_phase2.py
```
All four refutations must also exit 0 on their deliberately broken fixtures.
**Phase 2 phase-acceptance requires this Green state before Phase 3 may
begin.** Reviews A (correctness/architecture) and B (security/supply-chain)
sign off on the harnesses in Phase 2; Review C and UX browser review are
not applicable at this phase.

**Risk:** critical. Defines the migration's falsifiability. A vacuous parity
harness (A4) or digit-only regex (A3) here is unrecoverable later.

### Phase 3 — Apply Already-Green Harnesses to the Real Migration

Phase 3 applies the **already-green** Phase 2 harnesses to the real
TypeScript 6 → TypeScript 7 migration. The harnesses themselves are not
authored in Phase 3; Phase 3 changes the *workspace state* (catalog
aliases, tsconfigs, lockfile, workspace scripts) and re-runs the harnesses
to confirm they remain green against the new state. Phase 3 may add new
fixtures, new sample inputs, and new captured evidence; it does not edit
the Phase 2 harness logic, contracts, or refutation shapes.

After Sub-phase 3a installs the exact aliases, the parity and benchmark
harnesses run the **real installed TypeScript 6** compiler and the **real installed TypeScript 7** compiler across the inventoried workspaces. Fixture
executables remain only for the Phase 2 contract/refutation suite.

**Sub-phase 3a — alias install.** Change the direct root `typescript` dependency
and `pnpm-workspace.yaml` override to exactly `6.0.2`, add the separate exact
`typescript7: npm:typescript@7.0.2` alias, and do not use
`@typescript/typescript6` because its wrapper depends on floating
`@typescript/old: npm:typescript@^6`. Run `pnpm install` to regenerate the
lockfile, then prove the installed layout with
`node node_modules/typescript/bin/tsc --version` = `Version 6.0.2` and
`node node_modules/typescript7/bin/tsc --version` = `Version 7.0.2`. Re-run
the already-green Phase 2 §5.1 contract against the new resolution state. **No aggregate
`pnpm turbo run check-types` is invoked in 3a.**

**Sub-phase 3b — tsconfig fixes.** Update each tsconfig with the
appropriate ambient-globals posture per §6: a narrow, explicit `types` array
**only where globals are consumed**; explicit empty `types: []` where the
inventory proves no ambient globals are needed and TS 7 semantics are
unchanged; inherited omission where the same condition holds under the
current base config. Remove `apps/marketing/tsconfig.json`'s `baseUrl`.
Re-run the already-green Phase 2 §5.2 contract. **No aggregate
`pnpm turbo run check-types` is invoked in 3b.**

**Sub-phase 3c — parity reconciliation.** Run the already-green Phase 2
§5.3 parity harness across all tsconfigs with the real installed compiler
binaries from both exact aliases. For every difference, either (i) fix in the
owning workspace with no escape hatch (no
`skipLibCheck` expansion, no `ignoreBuildErrors`, no `@ts-ignore`/
`@ts-nocheck` blanket), or (ii) record in `diagnostic-parity-ledger.json`
with a review note. **An empty ledger is a valid Phase 3c state** when the
exact normalized TS 6 ∩ TS 7 diff for every tsconfig is empty. The harness
rejects only an **unexplained non-empty diff** or a **vacuous comparison
with no compiler runs**.

**Sub-phase 3d — `check-types` cutover.** Workspace-by-workspace, flip
`check-types` to invoke the TS 7 binary. Order is §4. The first workspace is
`packages/types`; the last is `apps/reading-advantage`. A flipped workspace
that introduces a new diagnostic reverts to TS 6 before the next workspace
is touched.

**Sub-phase 3e — declaration-emit cutover.** For each emitting package,
capture TS 6 emitted bytes, flip the build to TS 7, capture again, diff. Diff
must be byte-equal (Green) or fully accounted for in
`declaration-emit-diff-ledger.json`. **One package per commit.**

**Sub-phase 3f — bounded test-runner rationalization.** Allowed only when a
runner genuinely cannot load under TS 7 and the alternative is to pin it to
TS 6 via the §3 matrix. The default is **no change**. A wholesale
`jest → vitest` migration is rejected. Playwright is preserved. Run the
minimal installed commands for the applicable §3 rows: `eslint
--print-config <fixture>`, `ts-node -e '...'`, `tsx -e '...'`, `tsup --help`,
`vitest <one unit file>`, `jest <one unit file>`, `@playwright/test --list`,
`drizzle-kit --help`, and `commitlint --from HEAD~1 --to HEAD --verbose`.
Next.js and Vinext are proven indirectly via installed resolution evidence and
the one-route workspace, without a full app build in this sub-phase. Write the
observed ownership classifications to `surface-inventory.json`.

**Sub-phase 3g — benchmark suite.** Runs the already-green Phase 2 §5.4
harness against the §4 order using the installed TypeScript 6 and TypeScript
7 compiler binaries, each workspace with `--checkers 1` and
`--checkers 2`, three cold samples + three warm samples per setting. Medians
are recorded. The acceptance threshold (spec §FR-6): ≥ 3× median speedup
for `apps/reading-advantage` standalone, or ≥ 2× for the uncached full Turbo
`check-types` graph — unless a documented bottleneck shows TypeScript is no
longer the dominant cost. A faster run with missing diagnostics (the Phase 2
false-speedup refutation) is not a 3× — it is a test failure.

**Sub-phase 3h — CI rollout.** Add a temporary non-blocking CI lane running
TS 7 in parallel with the TS 6 gate. Three representative CI runs are
observed; after the third consecutive run is clean, the TS 7 lane becomes
required. CI observation records go to `ci-observation/<run-id>.json`
using `rollout-record-schema.json`, where `<run-id>` is the real CI
identifier. **Three observed runs are an external live gate; this track
cannot claim 100 % rollout completion without three real run IDs and their
exit statuses recorded.**

**Sub-phase 3i — Turbo cache verification.** The already-green Phase 2 §5
cache-invalidation contract must pass on the post-cutover monorepo. A cache
miss on a tsconfig-only edit, or a cache hit on a compiler-identity edit,
is a Phase 3 closeout block.

**Phase 3 Green gate (per sub-phase):** the already-green Phase 2 contract
for that sub-phase exits 0 against the post-cutover state. No aggregate
`pnpm turbo run …` is invoked until Phase 4.

**Risk:** critical. The cutover phase. Every aggregate command from the
gates (`pnpm turbo run lint | test | check-types | build`) is invoked only
in Phase 4.

### Phase 4 — Acceptance and Closeout

Phase 4 runs the complete migration acceptance gates. No new tests are
introduced; existing ones are invoked and durable documentation is updated.

The full aggregate gate command is four **separate** commands, each
recorded individually with the §1 resource measurements attached:

```
TURBO_CONCURRENCY=1 pnpm turbo run lint
TURBO_CONCURRENCY=1 pnpm turbo run test
TURBO_CONCURRENCY=1 pnpm turbo run check-types
TURBO_CONCURRENCY=1 pnpm turbo run build
```

Each must exit 0 against the post-cutover monorepo. Pre-existing failures
are reconciled against `compiler-baseline.json` and classified as
"pre-existing" (allowed) or "migration-caused" (blocker). The classification
goes to `gate-reconciliation-<task>.json`; a migration-caused regression is
a stop-loss. The freezeinstall consistency gate is then run:

```
pnpm install --frozen-lockfile
```

This is a **post-lockfile consistency gate** — it confirms an existing
lockfile still resolves after changes; it is **not** the command used to
regenerate a changed lockfile (that is plain `pnpm install`, which was run
in Phase 3a).

`measure/generate.sh` and `measure/doctor.sh` are run per plan task.
Generated diffs are reviewed for unrelated churn (A10). `graph.db` is updated
for changed manifests, scripts, and configurations. `measure/tech-stack.md`
is updated with TypeScript 7 as the compiler, TypeScript 6 as the temporary
compatibility API, the alias names, the chosen local/CI `--checkers` value,
the benchmark medians, the fallback command, and the rollback path.

`typescript6_major_migration` is marked superseded in `measure/tracks.md`.
A follow-up track stub for TypeScript 7.1+ compatibility-package removal is
appended.

**Risk:** high. Aggregate-suite timebomb risk on a constrained host. Guards:
`TURBO_CONCURRENCY=1`, per-task resource ceiling derived from Phase 3g
medians + 50 %, explicit pre-existing reconciliation against
`compiler-baseline.json`.

## 6. Unrelated Dirty Work — Discipline (no stash, no revert)

The worktree at the role-base SHA contains unrelated modified files. The
strategy does **not** stash, revert, or modify that work. Instead:

- **Worktree snapshot.** Before any benchmark or parity run, capture the
  worktree state with `git status --porcelain --ignored > /tmp/snapshot.txt`
  and `git diff --stat > /tmp/snapshot-diffstat.txt`. The snapshot is
  evidence, not an intervention.
- **Path-scoped staging.** Every commit by this track is
  `git add <track-specific paths only>` followed by `git diff --cached
  --stat` for verification. Paths under `apps/<unrelated-app>/`,
  `packages/<unrelated-package>/`, and other track directories are never
  staged.
- **Fail-closed overlap detection.** A pre-commit hook (or an explicit
  pre-commit shell script run by the implementer) calls
  `git diff --cached --name-only` and compares the list against the
  allowlist `{measure/tracks/typescript7_native_migration_20260710/**,
  pnpm-workspace.yaml, pnpm-lock.yaml, packages/<ts-affected>/tsconfig*.json,
  apps/<ts-affected>/tsconfig*.json, measure/tech-stack.md}`. If any path
  outside the allowlist is staged, the commit is aborted. The hook is
  recorded in `commit-allowlist.txt` next to this strategy.

This discipline preserves unrelated dirty work, keeps bisect clean, and
makes the migration's blast radius explicit and auditable.

## 7. Live-Proof Plan (Targeted Red → Green/Closeout Per Phase)

| Phase | Targeted Red command (must fail before code) | Green / closeout gate (must pass) | Surface | Risk |
|------:|:---|:---|:---|:---|
| 1 | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase1` | `bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_supervisor_invariants.sh && bash measure/doctor.sh` and the same unittest exits 0 | Artifact | medium |
| 2 | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase2` | Same exits 0 + `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_typescript7_native_migration_phase2.py` + four refutations (missing-diagnostic, false-speedup, alias-swap, resource-parser-stop-loss) exit 0 on deliberately broken fixtures. Phase 2 Green implements the reusable harness logic/contracts only; deterministic fixture executables run as real OS subprocesses, while no package resolution, tsconfig, workspace script, lockfile, or production/toolchain changes are permitted in Phase 2. | Live (fixture subprocesses) | critical |
| 3a | `pnpm why -r typescript` shows only TS 5.9 | `pnpm why -r typescript` shows exactly two trees (TS 6 + TS 7); resolver refutation exits 0 | Live (resolver only) | medium |
| 3b | tsconfig contract reports `baseUrl` present | Same contract exits 0; new contract for narrow `types` arrays exits 0 | Artifact | medium |
| 3c | parity harness reports a difference for one tsconfig | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase2.ParityContract` exits 0; `diagnostic-parity-ledger.json` validates as JSON with required keys. An empty ledger is a valid Green state when the normalized TS 6 ∩ TS 7 diff for every tsconfig is empty; the harness rejects only an unexplained non-empty diff or a vacuous comparison with zero compiler runs. | Live | high |
| 3d | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase3.Phase3dCheckTypesCutoverContract` fails while the first workspace uses bare `tsc`; record the direct TS 6 and TS 7 baseline exits without manufacturing a source failure | `pnpm --filter @reading-advantage/types run check-types` exits 0 with the exact TS 7 alias path; its `:compat` and `:rollback` scripts both exit 0 through the exact TS 6 path. Repeat the routing contract and native/compat evidence per workspace in §4 order. | Live (native source) | critical |
| 3e | byte diff between TS 6 and TS 7 `.d.ts` output for one package is non-empty | Diff empty for `packages/types` and `packages/db`, or fully accounted for in `declaration-emit-diff-ledger.json` | Live (declaration emit) | high |
| 3f | n/a (default is no change) | If a runner needs TS 6 pinning, the §3 row exists and the resolver contract still passes | Live | medium |
| 3g | benchmark harness records `diagnostic_count == 0` against `apps/reading-advantage` (false-speedup refutation) | Medians recorded per workspace; chosen `--checkers` documented in `measure/tech-stack.md` | Live (benchmark) | critical |
| 3h | CI lane missing | Three CI runs recorded in `ci-observation/<real-run-id>.json`; third is required-blocking | Live (rollout, external) | high |
| 3i | `pnpm turbo run check-types` cache hit after a compiler-identity edit (refutation) | Cache miss on compiler-identity edit; cache hit on a non-TS source edit | Live (cache) | high |
| 4 | n/a | `TURBO_CONCURRENCY=1 pnpm turbo run lint && TURBO_CONCURRENCY=1 pnpm turbo run test && TURBO_CONCURRENCY=1 pnpm turbo run check-types && TURBO_CONCURRENCY=1 pnpm turbo run build` (each recorded separately) all exit 0; `pnpm install --frozen-lockfile` exits 0; `measure/doctor.sh` exits 0; `measure/generate.sh` produces no unrelated churn | Live (aggregate) | high |

The `phase_base_sha` capture point is **immediately after** this strategy
file lands via `git commit`. The orchestrator runs, in order:

1. `git add measure/tracks/typescript7_native_migration_20260710/test-strategy.md`
2. `git diff --cached --stat` (verify only the strategy file is staged)
3. `git commit -m "<conventional>"` (with
   `(track_id: typescript7_native_migration_20260710)` per AGENTS.md)
4. `git rev-parse HEAD` → record as `phase_base_sha` for this track

The SHA must be the commit containing this exact strategy text, **not** the
role-base SHA `1e535e8be68cf90b67517651f83e9e66f3fe5c24` and **not** any
uncommitted worktree SHA. Drift between the recorded `phase_base_sha` and the
actual HEAD is an A15 finding.

## 8. Fixtures, Mocks, and Live-Behavior Proof Expectations

**Fixtures** live under
`measure/tracks/typescript7_native_migration_20260710/fixtures/`:

- `parity-broken-diagnostic/` — deterministic TS 6 and TS 7 fixture
  executables whose pinned streams differ by exactly one diagnostic (used by
  the missing-diagnostic refutation).
- `benchmark-empty-fixture/` — a deterministic benchmark fixture executable
  whose pinned exit is zero and diagnostic count is zero while its fixture
  ledger expects at least one diagnostic (used by the false-speedup refutation).
- `alias-swap-fixture/` — a temporary `package.json` whose `typescript`
  resolution is mutated mid-test (used by the alias-swap refutation).
- `resource-parser-fixtures/` — synthetic JSON lines with malformed
  labeled integers (string `"NaN"`, boolean, negative, above-ceiling) for
  `peak_rss_kib` and `swap_delta_kib` (used by the resource-parser stop-loss
  refutation; no host stress required).
- `tsconfig-matrix/` — the 24 tsconfig paths grouped by emit/no-emit and
  ambient-globals consumption.
- `runner-fixtures/` — deterministic fixture executables and pinned output for
  each compiler-consumer classification outcome.

All fixtures are **committed in their phase by the Red role**, not
retroactively at the pre-strategy role-base SHA. Phase 2 Red commits the
fixtures alongside the failing tests that reference them; Phase 3 may
commit additional sample-input fixtures but does not move or rewrite the
Phase 2 fixtures. Fixtures are pinned by path inside the strategy's commit
allowlist (§6); a fixture whose path is missing or whose SHA-256 does not
match the Phase 2 commit is treated as not-yet-committed. They are **not**
in-process mocks: Phase 2 launches them as real OS subprocesses. They are also
not the TypeScript compilers; the real installed binaries are reserved for
Phase 3 after alias installation.

**Mocks** of `node:child_process` are forbidden in the §5.3, §5.4, §5.5
harnesses. Subprocesses are real. The only mocks used are: (i) the
`pgrep`-based process-count assertion, tolerating transient churn; (ii) the
`@commitlint/load` peer-resolution check.

**Live-behavior proof** records subprocess output to
`evidence/<phase>/<workspace>/<compiler>/<run>.jsonl`. Phase 2 records real OS
subprocess behavior from deterministic fixture executables. Phase 3 records
the installed compiler/tool subprocesses against real workspaces. Phase 3
Green signals reference those files by SHA-256 via `hashlib.sha256`, a
labeled-integer parse (anti-A3).

**Artifact vs live behavior:** the Phase 1 JSON Schemas are documentation;
their JSON-Schema validators are artifact tests, not live behavior. The five
Phase 2 contract harnesses are live process-behavior tests over fixture
executables, not proof of installed compiler behavior. Phase 3 parity,
benchmark, and smoke runs are live toolchain behavior. The CI observation
records are live behavior (CI is the live system). The Phase 4 aggregate
`pnpm turbo run …` calls are live behavior.

## 9. Architecture Guardrails

- **No production source changes in Phase 1 or Phase 2.** Schemas, fixtures,
  and contract tests are the only new artifacts before Phase 3a.
- **No blanket suppressions.** No `skipLibCheck` expansion. No
  `ignoreBuildErrors: true`. No `@ts-ignore` / `@ts-nocheck` /
  `@ts-expect-error` blanket. Each suppression, if ever justified, is
  per-line with a code comment naming the diagnostic and the reviewed parity
  ledger entry.
- **No test-runner migration.** Jest stays Jest, Vitest stays Vitest,
  Playwright stays Playwright. The §3 matrix is the only place TS 6 pinning
  for tooling is allowed; pinning is the action, not migration.
- **Compiler identity participates in Turbo cache keys.** The strategy
  requires an explicit `inputs` extension for `check-types` (compiler version
  hash, tsconfig path hash, `--checkers` value) so a TS 7 → TS 6 → TS 7
  cycle busts the cache.
- **No project references** (out of scope per spec).
- **No escape hatches.** `ignoreBuildErrors`, `skipLibCheck` expansion, and
  blanket suppressions are negative tests (refutations) only; they are
  never an enabled config.
- **Unrelated dirty work is preserved.** See §6.

## 10. Changed-Contract Risks

| Contract | Risk if changed | Detection |
|---|---|---|
| Workspace catalog alias names | Tools silently resolve to TS 7 → tooling peer breakage | `pnpm why -r typescript` snapshot in `compiler-baseline.json`; resolver refutation §5 |
| `diagnostic-parity-ledger.json` schema | Silent acceptance of TS 7-only diagnostics as "expected" | JSON shape + required-key check; per-entry `reviewed_by` field |
| `benchmark-record-schema.json` fields | False speedups accepted (A5) | Labeled-integer parse + missing-diagnostic refutation + resource-parser refutation |
| `rollout-record-schema.json` fields | CI nondeterminism accepted as normal | Phase 4 reconciliation against Phase 3g medians; field drift caught by shape check |
| Ownership matrix (§3) rows | A new consumer silently picks TS 7 and breaks | Phase 2 §5 inventory sweep on every Phase 3 commit; `pnpm why -r typescript` re-run |
| `--checkers` value | Under-tuned workers waste budget on constrained host | Phase 3g records both 1 and 2; chosen value documented in `measure/tech-stack.md` |
| Turbo `inputs` for `check-types` | Stale cache hides a compiler-identity regression | §5 cache refutation; CI cache-bust observable in `ci-observation/<run>.json` |
| Frozen install policy | Untracked peer change | `pnpm install --frozen-lockfile` is the Phase 4 post-lockfile consistency gate |
| The 24-tsconfig inventory | New tsconfig added without classification | §5.2 contract rerun on every Phase 3 commit; an unknown tsconfig is a stop-loss |

A change to any contract requires a new Phase 1 / Phase 2 / Phase 3 commit,
not an in-flight edit.

## 11. Intentionally-Red Aggregate-Suite Handling

The aggregate gates (`pnpm turbo run lint | test | check-types | build`) are
red by design before Phase 3 cuts them over. The strategy prescribes the
following discipline to prevent A4 (vacuous pass):

- During Phase 2 the test file
  `measure/tests/test_typescript7_native_migration_phase2.py` is intentionally
  red; every Phase 2 commit adds one contract assertion. A passing run with
  zero contract assertions is A4 — fix or revert.
- During Phase 3a–3b no aggregate `pnpm turbo run check-types` is invoked.
  Aggregate gates are workspace-scoped (`pnpm --filter <pkg> …`) until
  Phase 4.
- During Phase 3g the benchmark harness is intentionally red for tsconfigs
  that have not yet been flipped; the harness records the workspace as
  `not_flipped_yet`, not `passing`. A workspace labeled `not_flipped_yet`
  may not be claimed as Green.
- An empty `diagnostic-parity-ledger.json` at Phase 3c closeout is **valid**
  when the exact normalized TS 6 ∩ TS 7 diff for every tsconfig is empty;
  the ledger remains empty and the Phase 3c gate passes. An empty ledger is
  **not** valid when one or more tsconfigs produced a non-empty diff that
  was not explained — that is an A4 finding and a Phase 3c block.
- During Phase 4 the aggregate suite is invoked once and recorded. A
  pre-existing failure (one that already existed at role-base SHA) is
  classified as pre-existing in `gate-reconciliation-<task>.json` and is
  allowed; a migration-caused failure is a stop-loss.

No `describe.skip`, `it.skip`, `.todo`, `.skip`, or path-ignore glob is
introduced. The pre-existing 49 ESLint errors in `primary-advantage` and
the mixed Jest/Vitest status remain pre-existing and are tracked in
`measure/tech-debt.md`, not masked.

## 12. Anti-Pattern Coverage (falsifiability matrix)

Every Phase 2 contract test has a falsification condition. The matrix below
maps each anti-pattern from `measure/anti-patterns.md` to the defending test
and its refutation.

| ID | Defended by (phase, harness, refutation) | Falsification condition |
|---|---|---|
| A1 | The supervisor is unchanged by this track; the catalog audit `tests/orchestrator_catalog.sh` exits 0 in the Phase 1 closeout gate. | A free-text mutation of the supervisor regex must not bypass the catalog gate. |
| A2 | n/a (no publish gate). | The track does not introduce a publish gate. |
| A3 | Phase 2 §5.4 benchmark harness parses `Maximum resident set size` and `Elapsed (wall clock) time` via labeled keys. Phase 4 reconciliation parses `diagnostic_count` as a JSON integer with explicit key. Resource-parser refutation covers malformed labeled integers. | A `/usr/bin/time -v` line containing only a date or a path must not pass as elapsed time; a JSON string `"1"` must not pass as `diagnostic_count`; a string `"NaN"` for `peak_rss_kib` must not pass. |
| A4 | Phase 2 contract assertions each count ≥ 1 element by construction; the Phase 1 audit must exit 0 with at least one schema artifact present; the Phase 3 Green state requires ≥ 1 `[x]` task with evidence. An empty `diagnostic-parity-ledger.json` is a valid Phase 3c state when the exact normalized TS 6 ∩ TS 7 diff for every tsconfig is empty. The harness rejects only an unexplained non-empty diff or a vacuous comparison with no compiler runs. | A vacuous Phase 2 run with 0 assertions fails; a Phase 3c run with a non-empty unexplained diff fails; a Phase 3c run with an empty diff plus zero compiler invocations fails. |
| A5 | Missing-diagnostic, false-speedup, and alias-swap refutations in Phase 2. | A parity run that reports "all checks pass" while omitting a refutation is rejected; a benchmark median that omits the false-speedup guard is rejected. |
| A6 | `measure/tracks.md` entry remains `[ ]` until Phase 4 acceptance; `metadata.json.status` remains `"new"` until then. Phase 4 closeout asserts `metadata.json.status == "complete"` is absent before closeout. | A premature `metadata.json.status == "complete"` is an A6 finding. |
| A7 | Phase 2 contract harness uses no exclusion filter on diagnostic codes; comparison is set-equality. | An exclusion of a real diagnostic class (e.g., "skip TS6133 unused") is rejected. |
| A8 | Plan tasks use only `[x]`, `[~]`, and `[b] deferred:<owner>`. Phase 1 closeout runs `tests/orchestrator_marker_vocabulary.sh`. | A `[ ]` (space) marker in `plan.md` fails the gate. |
| A9 | The strategy file lives at `measure/tracks/typescript7_native_migration_20260710/test-strategy.md` while the track is active. | If the track is archived mid-strategy, the resolver helper from the catalog applies. |
| A10 | Phase 4 runs `measure/generate.sh` and `measure/doctor.sh`; generated diff is reviewed for unrelated churn; `graph.db` is updated for changed manifests/scripts/configurations. | A generated diff that includes an unrelated change is rejected. |
| A11 | n/a (not a review track). | n/a |
| A12 | Phase 1 audit runs `tests/orchestrator_catalog.sh`; every A-entry's `Guard:` line resolves to a real test file or `none`. | A new `Guard:` reference without a real test file is rejected. |
| A13 | n/a (track is active). | n/a |
| A14 | Phase 2 / Phase 4 detector scripts use `rg -n '<regex>'` only, never `rg -nE`. Phase 4 audit runs `tests/orchestrator_detector_syntax.sh`. | A `rg -nE` invocation in any detector script fails the gate. |
| A15 | Phase 4 closeout captures pre/post SHAs and binds them to the strategy commit; any fix that modifies `test-strategy.md` after closeout must supersede the receipt. | A receipt whose hash does not match HEAD fails the gate. |

## 13. Risk Classification Summary

| Phase | Risk | Driver |
|---|---|---|
| 1 | medium | Schema drift between Phase 1 and Phase 3 corrupts later evidence |
| 2 | **critical** | Defines every later phase's falsifiability |
| 3a | medium | Alias install failure is recoverable; resolver contract catches it |
| 3b | medium | tsconfig fixes are reversible; contract test catches regressions |
| 3c | high | Parity reconciliation must be honest; A5 refutation is the guard |
| 3d | **critical** | `check-types` cutover is the migration; one flipped workspace at a time |
| 3e | high | Declaration-emit differences may be invisible without byte-comparison |
| 3f | medium | Bounded test-runner pinning; default is no change |
| 3g | **critical** | Benchmark suite must fail closed on swap / false speedup |
| 3h | high | CI rollout nondeterminism; three representative runs required |
| 3i | high | Turbo cache invalidation is the only way to know the cutover stuck |
| 4 | high | Aggregate suite on a constrained host; pre-existing reconciliation is the discipline |

## 14. Applicability Summary

Canonical roles (per AGENTS.md / workflow):

- **Review A = correctness/architecture.** Contract shape, ownership matrix,
  tsconfig correctness, declaration-emit equivalence, Turbo cache contract.
- **Review B = security/supply-chain.** Alias pinning, peer-dependency
  validation, `pnpm install --frozen-lockfile` exit code, freezeinstall,
  catalog tampering (alias-swap refutation).
- **Review C = UX/API/route/user-flow.** Only triggered if a Phase 3 deferred
  Next.js regression requires a route-level reproof; otherwise not applicable.
- **Adversarial testing (separate role).** Owns the four Phase 2 refutations
  and reruns them in Phase 4.
- **UX browser review (separate role).** Not applicable for a compiler
  migration. Triggered only if Phase 3 surfaces a Next.js / Vite-bundled
  regression that requires in-browser reproof; in that case a single small
  workspace (`apps/marketing`) is exercised once via the agent-browser
  skill and the result recorded. Full UX browser review remains out of scope.

| Gate | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|:---:|:---:|:---:|:---:|
| Phase acceptance | yes (artifact gate) | yes (5 contract gates) | yes (per sub-phase) | yes (aggregate gate) |
| Review A | n/a | yes (contract shape) | yes (ownership + tsconfig) | yes (closeout) |
| Review B | n/a | yes (resolver + alias-swap) | yes (alias install + freezeinstall) | yes (`--frozen-lockfile`, audit) |
| Review C | n/a | n/a | conditional (deferred Next.js regression only) | conditional |
| Adversarial testing | n/a | yes (4 refutations) | yes (refutations rerun) | yes (final refutation sweep) |
| UX browser review | n/a | n/a | conditional | conditional |
| Final acceptance / closeout | n/a | n/a | n/a | yes |
| Closeout | n/a | n/a | n/a | yes |
