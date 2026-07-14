# Test Strategy: TypeScript 7 Native Compiler Migration

**Tech Lead / strategy role.** This strategy freezes the per-phase Red/Green/closeout
contracts, scope discipline, resource-budget shape, and applicability matrix for the
dual-compiler migration. It is intentionally narrow: it proves the
TypeScript 6 → TypeScript 7 transition is correct, diagnostic-equivalent, resource-safe,
and reversible. It does **not** author TypeScript source, alter runtime behavior, or
re-license unrelated dirty work.

This track supersedes the deferred `typescript6_major_migration` stub. TypeScript 6
remains in scope only as the compatibility bridge required by TypeScript 7.0 tooling
(typescript-eslint, ts-node, tsconfck, tsup); TypeScript 7 is the new native
compiler. Acceptance depends on a stable, side-by-side resolution, not on a wholesale
removal of TypeScript 6.

---

## 0. Build-Graph Findings That Shape This Strategy

`graph.db` is fresh for this revision (refresh rule in spec §FR-1). The 2026-07-10
feasibility audit recorded 23,009 nodes across 2,777 files; the four largest
TypeScript surfaces by file count are `reading-advantage` (957 files),
`science-advantage` (400), `primary-advantage` (388), and `advantage-games` (274).
The audit also recorded 25 manifests declaring TypeScript, 24 `tsconfig*.json` files,
21 workspaces invoking `tsc` in build or `check-types` scripts, and one
(`apps/marketing/tsconfig.json`) using the removed `baseUrl`.

Because this is a compiler-toolchain migration, graph-wide blast-radius queries are
of limited value: TypeScript is infrastructure, not a graphed symbol. Strategy
decisions rely on filesystem probe plus `build-graph search` for any *future*
embeds of the `typescript` API in source code, and on `pnpm why typescript` /
`pnpm why -r typescript` for the runtime/peer surface.

The worktree at role-base SHA `1e535e8be68cf90b67517651f83e9e66f3fe5c24` is dirty
(254 modified files across unrelated apps). The strategy treats that dirty work as
**evidence-not-targets**: TS7 evidence is gathered with `--noEmit --skipLibCheck` and
sourced from the committed bytes at the role-base SHA, never from in-flight edits.
The implementer must `git stash -u -- <unrelated paths>` before any benchmark so
build-graph indexes do not shift under the harness.

## 1. Hardware and Concurrency Posture (low-RAM, fail-closed)

The mandate is **low-RAM machine, Turbo concurrency 1**. The migration must be
measurable and reproducible on a constrained host without ever escalating into swap
thrashing or OOM kills. The contract:

| Surface | Required default | Documented exception |
|---|---|---|
| `turbo.json` global `concurrency` for this track's runs | `1` | None — Turbo parallelism is intentionally suppressed for every Red/Green/closeout command. |
| `TURBO_CONCURRENCY` env | `1` (exported in every harness script) | none |
| `pnpm` parallel network/install workers | default (pnpm-9.x) | frozen install uses `pnpm install --frozen-lockfile --prefer-offline`; never `--reporter append-only` style parallelism. |
| TypeScript 7 `--checkers` flag in this track's commands | **compare `1` and `2`** | Selected value is documented after Phase 2/3 benchmarks; `--checkers > 2` is rejected unless the host has ≥2 GB free RSS during cold runs. |
| TypeScript 7 `--builders` (project references) | **not adopted** | out of scope per spec §Out of Scope. |
| Next.js / Vinext internal workers | inherited from app config | untouched; the harness compares emitted artifacts only. |
| Test runner workers (Vitest, Jest, Playwright) | inherited per package | the strategy does **not** introduce a wholesale Jest → Vitest migration. Bounded rationalization is allowed only when a runner genuinely cannot load under TS 7; see §3. |

**Resource measurements captured by every benchmark and every diagnostic run:**

- wall-clock elapsed time (`/usr/bin/time -v` or `time` + stopwatch)
- peak RSS (KiB) from `/usr/bin/time -v` `Maximum resident set size`
- swap activity (`/proc/$(pgrep -f tsc)/status` `VmSwap`, sampled at 250 ms)
- process count (`pgrep -c -f tsc` plus `pgrep -fc -f node`)
- diagnostic count (stdout + stderr, normalized)
- Turbo cache state (`turbo run ... --summarize` or `.turbo/runs` JSON)
- exit status

**Fail-closed triggers (any one fails the run, not the test):**

- `dmesg | tail -n 50` shows an OOM-kill for any node/tsc worker
- `VmSwap` rises by > 50 % from cold baseline before any compiler phase completes
- peak RSS exceeds an explicit ceiling per phase (Phase 3 sets the ceiling after
  Phase 2 measurement; default ceiling if unmeasured: 1.5 × peak RSS of the
  TypeScript 5.9 baseline)
- a compiler run completes with `exit 0` but a different diagnostic count than the
  parity ledger claims for the same tsconfig (treated as a *false speedup*)

The harness captures these signals to `measure/tracks/typescript7_native_migration_20260710/evidence/<phase>/<workspace>/<run>.jsonl` so the orchestrator audit can replay them.

## 2. Surfaces the Strategy Distinguishes

The migration has five distinct work surfaces. Conflating them is the single largest
source of false positives (A5 — false-claim text vs test reality). Every Red/Green
command below names which surface it exercises.

1. **Native source checks** — `tsc --noEmit` against application/library source
   (e.g., `pnpm --filter @reading-advantage/types exec tsc --noEmit -p tsconfig.json`).
2. **Test-source checks** — `tsc --noEmit` against `*.test.ts(x)` files using
   `tsconfig.test.json` or the workspace's existing test tsconfig. This surface is
   the one TS 7's new `types: []` default hits first (Node + Vitest + Jest globals).
3. **Declaration emit** — `tsc --emitDeclarationOnly` for packages that ship
   `.d.ts` (`packages/types`, `packages/db`). Byte-comparable (or reviewed diff
   ledger) before a workspace is allowed to flip its build to TS 7.
4. **Bundling** — Next.js, Vinext/Vite, tsup. Not authored by `tsc` directly; the
   strategy proves *the compiler the bundler embedded* via `pnpm why typescript` and
   via a captured diagnostic from `next build --debug` / `vite build` for one tiny
   workspace, **not** by re-running full app builds inside the migration gate.
5. **Test runtime** — Vitest, Jest, Playwright. The strategy proves the runners
   load under the TS 7 environment (or remain on the TS 6 compatibility API per the
   ownership matrix) and exercises a representative subset of test files for each.

## 3. Compiler / Tool Ownership Matrix (binding for the entire track)

| Tool / consumer | Compiler it must resolve | Allowed alias | Out of band? |
|---|---|---|---|
| Root `pnpm check-types` (after cutover) | TypeScript 7 | `tsc` → `typescript@7.0.2` | n/a |
| Workspace `check-types` scripts | TypeScript 7 | same | n/a |
| `tsc` invocations in package `build` scripts that emit JS + `.d.ts` | TypeScript 7 (only after byte-equivalence or reviewed diff) | same | n/a |
| `typescript-eslint` | TypeScript 6 (`typescript` package) | `typescript: npm:@typescript/typescript6@6.0.2` | YES (tooling peer; must keep its current resolution until upstream supports TS 7) |
| `ts-node` | TypeScript 6 | same | YES |
| `tsup` | TypeScript 6 (programmatic API) | same | YES |
| `tsconfck` | TypeScript 6 (programmatic API) | same | YES |
| `commitlint` (`@commitlint/load`) | TypeScript 6 (transitively, via tooling peers) | same | YES |
| `vitest` / `@vitest/*` | TypeScript 6 for the runner's type pipeline | same | YES |
| `jest` / `ts-jest` | TypeScript 6 for the runner | same | YES (no wholesale migration in this track) |
| `@playwright/test` | TypeScript 6 for the runner | same | YES (preserved verbatim per priority) |
| Next.js `next build` / `next typegen` | TypeScript 7 (workspace `tsc`) when invoked via a script; otherwise the Next.js-bundled compiler for inline typegen. Captured per app. | mixed; documented | conditional |
| Vinext/Vite `vite build` | Same as Next.js | same | conditional |
| Drizzle Kit / `drizzle-kit` CLI | TypeScript 6 (peer) | same | YES |
| ESLint flat config loaders | TypeScript 6 | same | YES |
| `@testing-library/jest-dom/vitest` | TypeScript 6 (peer via Vitest) | same | YES |

The matrix is the **only** place resolution may be defined. If a new consumer
appears in Phase 1 inventory, the implementer adds a row; if the row says "TypeScript
6", it stays on TS 6 until upstream signals otherwise.

## 4. Acceptance Order and Workload Sequence

The harness measures in this strict order. Reordering is rejected because each step
produces evidence the next step consumes.

1. `packages/types` (smallest, fastest, sets the `types: []` baseline)
2. `packages/db` (depends on `types`; first consumer with Drizzle peers)
3. `packages/domain` (depends on `db`, `auth`, `types`; the largest shared package)
4. `packages/auth` (depends on `db`; compiler-API-adjacent, but on TS 6 here)
5. `packages/config`, `packages/ui`, `packages/utils`, `packages/integrations/*` as
   they appear in the inventory
6. `apps/advantage-games` (smallest app; 274 TS files; reference for Phaser/Konva codebases)
7. `apps/science-advantage` (400 TS files; CI gate reference; recently refactored to Drizzle)
8. `apps/primary-advantage` (388 TS files; Prisma-remnant-aware)
9. `apps/reading-advantage` (957 TS files; largest surface; benchmark keystone)
10. `apps/codecamp-advantage`, `apps/sales-advantage`, `apps/marketing`,
    `apps/www-reading-advantage` (per inventory)
11. Full Turbo `check-types` graph (uncached), with `--force` once and a warm
    follow-up; medians reported

The "smallest shared package first" order is **not** a speed optimization; it is a
determinism guarantee. A green `packages/types` proves the alias layout is sound
before larger surfaces can mislead the diagnostic parity harness.

## 5. Per-Phase Test Approach

### Phase 1 — Contract & Schema Definition (artifact-only)

**Outputs are JSON schemas, inventories, and command maps. No live behavior.**

- `compiler-baseline.json` — exact resolved `typescript` versions across the
  workspace; Node + pnpm versions; CPU count; total RAM; `free -m`; Turbo
  concurrency setting; source SHA.
- `surface-inventory.json` — every `tsconfig*.json`, every `tsc` script, every
  peer dep on `typescript`, every catalog alias.
- `dual-compiler-contract.json` — the exact alias lines for the workspace catalog,
  the four command names (`check-types:native`, `check-types:compat`,
  `check-types:parity`, `check-types:rollback`), and the ownership matrix from §3.
- `diagnostic-parity-ledger.json` — empty `[]` initially; populated when intentional
  TS 7 differences are reviewed and accepted in Phase 3.
- `benchmark-record-schema.json` — JSON Schema defining the per-run record
  (elapsed_ms, peak_rss_kib, swap_delta_kib, oom_kill_count, process_count,
  diagnostic_count, exit_status, turbo_cache_state, tsconfig_path, compiler_version,
  --checkers, --force flag, host_idle_class).
- `rollout-record-schema.json` — JSON Schema for CI observation rows
  (run_id, lane, ts7_gate_exit, ts6_parity_exit, cache_state,
  order_dependent_diff_count, peak_rss_kib).

The mid-red role for Phase 1 owns these schemas; the strategy does **not** require
them to be executable (they are static JSON). The "Red command" for Phase 1 is the
orchestrator audit itself: `bash tests/orchestrator_catalog.sh &&
bash tests/orchestrator_marker_vocabulary.sh &&
bash tests/orchestrator_supervisor_invariants.sh && bash measure/doctor.sh`.
A clean audit + an empty `diagnostic-parity-ledger.json` is the Green state.

**Risk:** **medium**. Schema drift between Phase 1 and Phase 3 corrupts every later
benchmark if not caught. **Defense:** the Phase 1 closeout gate re-runs the audit
after the schemas are committed.

**Applicability:**
- **Review A (security review):** not applicable. No security boundary is touched
  by Phase 1 artifacts.
- **Review B (UX/API review):** not applicable. No UI surface, no public API surface.
- **Review C (adversarial testing):** not applicable. No executable contract to
  attack yet.
- **Phase acceptance:** applicable. The audit command must exit 0 and the five
  schema artifacts must validate against `ajv` (Vitest-evaluated; see §6).
- **Final acceptance / closeout:** applicable later when the same schemas bound
  Phase 3 evidence.

### Phase 2 — Test (Red contracts authored)

**The focused test suite is `measure/tests/test_typescript7_native_migration_phase2.py`
(unittest, parallel to the APK evidence gate pattern).** It runs in CI on Python 3.12
(no Node compile dependencies) and is the single source of truth for Phase 2
acceptance.

The phase builds five contract harnesses, each a real executable artifact (not
documentation):

1. **Package-resolution contract.** Asserts that `pnpm why typescript` resolves
   to **two distinct physical installations** after alias application: one for the
   `typescript` name (TS 6), one for the `typescript7` (or whatever alias is
   chosen in the catalog). Asserts that `which -a tsc` produces exactly one
   `tsc` binary on PATH and that binary is the TS 7 one. Asserts that
   `node -e "console.log(require.resolve('typescript'))"` resolves to
   `@typescript/typescript6`'s tree.
2. **tsconfig compatibility contract.** Loads each of the 24 `tsconfig*.json`
   files and asserts the absence of removed options (`baseUrl` outside marketing's
   transition plan; legacy `moduleResolution: "node"` not under bundler; deprecated
   `suppressExcessPropertyErrors`; etc.). For each tsconfig it asserts the presence
   of a narrow, explicit `types` array matching the globals consumed (Node /
   Vitest / Jest / Playwright / none).
3. **Diagnostic parity harness.** For each `(tsconfig, compiler-version)` pair it
   spawns the real `tsc` binary (TS 6 and TS 7), captures stdout/stderr through
   `subprocess.run(..., capture_output=True, timeout=600, env={"TURBO_CONCURRENCY":"1"})`,
   normalizes (strip absolute paths, strip timing, normalize CRLF, sort by file
   then line then column then code), and asserts that the TS 6 normalized set is
   equal to the TS 7 normalized set modulo the entries in
   `diagnostic-parity-ledger.json`. Fails if either set is empty. The harness
   *also* asserts a refutation: with one diagnostic line removed from the captured
   TS 6 stream (a sentinel injected into a fixture tsconfig) the harness reports
   a "missing TS 7 diagnostic" finding. This is the anti-A5 / anti-A6 guard.
4. **Benchmark harness.** Wraps `/usr/bin/time -v` around a real
   `tsc --noEmit` invocation against a chosen tsconfig. Parses `Maximum resident
   set size` and `Elapsed (wall clock) time` from stderr (labeled integer parse,
   not regex — anti-A3). Asserts the host was idle at start by sampling
   `vmstat 1 3` and requiring CPU idle ≥ 70 % averaged; otherwise the run is
   recorded as **invalid** (not failed). Records all six signals from §1 plus the
   Turbo cache state via `turbo run <task> --summarize --json` parsed via
   `json.loads`, **not** regex. Refutation: a benchmark with `exit 0` and
   `diagnostic_count == 0` for a tsconfig that the parity ledger knows emits ≥ 1
   diagnostic is rejected as a *false speedup* (anti-A5).
5. **Compiler-consumer smoke harness.** For each row in the §3 matrix, executes
   the minimal real command:
   - `typescript-eslint`: `pnpm exec eslint --print-config <fixture.js>` exits 0
     and prints a config that mentions the @typescript-eslint parser path.
   - `ts-node`: `pnpm exec ts-node -e 'const x: number = 1; console.log(x)'` exits 0.
   - `tsx`: same shape.
   - `tsup`: a `--help` invocation plus a one-file fixture build for one package
     only (no app-wide build).
   - `next build`: **skipped at the harness level**; instead the harness reads
     the resolved `typescript` version from the `.next/types/` directory after a
     single-route workspace run, **outside** the migration track's low-RAM
     budget (recorded as deferred, not as green).
   - `vitest`: one pre-existing unit file per app is invoked under TS 6
     resolution; the harness asserts the test loads (exits 0 or fails for the
     pre-recorded reason — not for a TypeScript resolution error).
   - `jest`: same shape, for `apps/advantage-games` (already on Jest 30).
   - `@playwright/test`: `--list` only, not a browser run.
   - `drizzle-kit`: `--help` only.
   - `commitlint`: a one-commit dry-run via `pnpm exec commitlint --from HEAD~1
     --to HEAD --verbose`.
   - ESLint flat config loader: one fixture file at the repo root, exits 0.

**Turbo cache invalidation contract (FR-5):** the harness runs
`pnpm turbo run check-types --force` once and captures the cache state JSON. It
then mutates the compiler identity (e.g., temporarily renames the TS 7 alias to
force re-resolution) and asserts that `pnpm turbo run check-types` re-executes
(at least one task's `cache.bypassed` is true). Refutation: a mutation that does
not bust the cache fails the harness.

**Anti-OOM / anti-swap refutation (Phase 2 already proves this):** the harness
runs `tsc --noEmit --checkers 2` once against `apps/reading-advantage` with
`prlimit --as=1500000000` (1.5 GB). If the kernel kills the process, the harness
records an `oom_kill_count > 0` and the run is **invalid** for benchmark purposes
— the harness does not retry, it escalates. If `VmSwap` rises > 50 % from cold
baseline, the same escalation applies. This proves the benchmark harness
correctly fails closed **before** the implementer trusts any Phase 3 number.

**Risk:** **critical**. This phase defines the entire migration's falsifiability.
A vacuous parity harness (A4 — vacuous pass on nothing done) or a digit-only
regex (A3) here is unrecoverable later. The labeled-integer JSON parse and the
deliberately-broken-diagnostic refutation are the guards.

**Applicability:**
- **Review A (security review):** applicable to the resolver contract. The
  refutation must include a sibling test that proves TS 6 cannot be silently
  swapped to TS 7 for tooling peers (the alias must be name-pinned).
- **Review B (UX/API review):** not applicable.
- **Review C (adversarial testing):** applicable. The §5 refutations (missing
  diagnostic, false speedup, alias swap) are the adversarial probes. They run
  in CI as part of the focused test command.
- **UX browser review:** **not applicable** for Phase 2. No UI surface is in scope.
  Browser review is only triggered if Phase 3 discovers a regression that requires
  in-browser reproof (none expected from a compiler swap).
- **Phase acceptance:** applicable. The Phase 2 closeout gate (§6) must exit 0
  including the three refutations.
- **Final acceptance / closeout:** the Phase 2 contract remains part of the final
  gate as a regression net; no element of Phase 2 may be deleted before closeout.

### Phase 3 — Implement (Green)

Phase 3 implements the alias layout, fixes `tsconfig` files, runs parity, runs
benchmarks, cuts over CI. The strategy here is *not* to add new tests; it is to
make the Phase 2 contracts green and to bound every aggregate command.

**Sub-phase 3a — alias install (no live test added).** The implementer edits the
workspace catalog (or, where the catalog lacks an alias slot, the `package.json`
of each affected package) and runs `pnpm install --frozen-lockfile`. The contract
test from §5.1 (Package-resolution contract) is the gate; passing it is the
Green signal for 3a. **No aggregate `pnpm turbo run check-types` is invoked in
3a.** A failure here reverts the lockfile and re-runs the contract test.

**Sub-phase 3b — tsconfig fixes.** The implementer updates each tsconfig with a
narrow `types` array and removes `apps/marketing/tsconfig.json`'s `baseUrl`. The
Phase 2 §5.2 contract is the gate. **No aggregate `pnpm turbo run check-types`
is invoked in 3b.** A failure here reverts the tsconfig and re-runs the contract.

**Sub-phase 3c — parity reconciliation.** Run the §5.3 parity harness across all
24 tsconfigs with TS 6 and TS 7. For every difference, either (i) fix it in the
owning workspace with no escape hatch (no `skipLibCheck` expansion, no
`ignoreBuildErrors`, no `@ts-ignore`/`@ts-nocheck` blanket), or (ii) record it in
`diagnostic-parity-ledger.json` with a review note. The harness exits 0 only when
the ledger is the *exact* diff between normalized outputs. **No aggregate
`pnpm turbo run check-types` is invoked in 3c.**

**Sub-phase 3d — `check-types` cutover.** Workspace-by-workspace, flip
`check-types` to invoke the TS 7 `tsc` binary. The harness re-runs after each flip
(workspace scoped). The order is §4's order. The first workspace to flip must be
`packages/types`; the last to flip is `apps/reading-advantage`. A flipped
workspace that introduces a new diagnostic must revert before the next workspace
is touched.

**Sub-phase 3e — declaration-emit cutover.** For each emitting package, capture
the TS 6 emitted bytes, flip the build to TS 7, capture again, diff. Either the
diff is byte-equal (Green) or it is recorded in
`declaration-emit-diff-ledger.json` with a per-file reviewed note. **One package
per commit**, never the whole monorepo in one commit.

**Sub-phase 3f — bounded test-runner rationalization.** This is the *only* place
test-runner changes are allowed. They are allowed **only** when a runner
genuinely cannot load under TS 7 and the alternative is to pin it to TS 6 via
the §3 matrix. The default is **no change**. Concretely:

- If `jest` in `apps/reading-advantage` errors with "Cannot find module
  'typescript'" after the alias install, the implementer pins the package's
  `typescript` resolution to `npm:@typescript/typescript6@6.0.2` via
  `pnpm.packageExtensions` or an explicit `dependencies.typescript` override,
  records it in the ownership matrix, and does **not** migrate to Vitest.
- A wholesale `jest → vitest` migration is **out of scope** and is rejected if
  attempted.
- Playwright is **preserved** (e.g2e tests stay on Playwright with the TS 6
  resolution for the runner).

**Sub-phase 3g — benchmark suite.** Runs the §5.4 harness against the §4 order,
each workspace with `--checkers 1` and `--checkers 2`, three cold samples + three
warm samples per setting. Medians are recorded. The acceptance threshold (per
spec §FR-6): ≥ 3× median speedup for `apps/reading-advantage` standalone, or ≥ 2×
for the uncached full Turbo `check-types` graph — **unless** a documented
bottleneck shows TypeScript is no longer the dominant cost. A faster run with
missing diagnostics (the §5.4 false-speedup guard) is **not** a 3× — it is a
test failure.

**Sub-phase 3h — CI rollout.** Add a temporary non-blocking CI lane that runs
TS 7 in parallel with the TS 6 gate. Three representative CI runs are observed.
After the third consecutive run is clean (no nondeterministic diagnostic
reordering, no cache corruption, no memory exhaustion), the TS 6 lane is
demoted to a tag and the TS 7 lane becomes required. The CI observation records
are written to `ci-observation/<run-id>.json` using `rollout-record-schema.json`.

**Sub-phase 3i — Turbo cache verification.** The §5.5 cache-invalidation
contract must pass on the post-cutover monorepo. A cache miss on a tsconfig-only
edit, or a cache hit on a compiler-identity edit, is a Phase 3 closeout block.

**Risk:** **critical**. This is the cutover. Every aggregate command from the
gates (`pnpm turbo run lint`, `pnpm turbo run test`,
`pnpm turbo run check-types`, `pnpm turbo run build`) is invoked **only** in
Phase 4. Phase 3 commits each sub-phase; Phase 3 closes only when every
sub-phase above is green in isolation.

**Applicability:**
- **Review A (security review):** applicable to the alias install and the
  ownership matrix. A misnamed alias is a supply-chain risk; the resolver
  contract refutation (§5.1) is the live proof. The deferred-acceptance
  criterion `pnpm audit` exits 0 against the post-install lockfile.
- **Review B (UX/API review):** not applicable directly. If Phase 3c surfaces a
  public-API contract regression (declared return type, JSON shape), that
  contract is reviewed by Review B before the workspace flip is permitted.
- **Review C (adversarial testing):** applicable. The §5.3 missing-diagnostic
  refutation is rerun at the start of every sub-phase. A refutation that passes
  unexpectedly is a stop-loss event.
- **UX browser review:** **not applicable** unless Phase 3 discovers a Next.js
  or Vite-bundled compiler regression that requires an actual browser reproof.
  In that case, a single workspace (`apps/marketing` — the smallest
  Next.js/Vinext surface) is run via the agent-browser skill once and the
  result recorded; full UX browser review remains out of scope.
- **Phase acceptance:** applicable per sub-phase.
- **Final acceptance / closeout:** applicable. The Phase 3 final sub-phase
  (`3i`) exit-0 state is the prerequisite for Phase 4 entry.

### Phase 4 — Generate Docs & Doctor (Acceptance and Closeout)

Phase 4 runs the **complete migration acceptance gates**. It does not introduce
new tests; it invokes existing ones and updates durable documentation.

The full aggregate gate command is:

```
TURBO_CONCURRENCY=1 pnpm turbo run lint
TURBO_CONCURRENCY=1 pnpm turbo run test
TURBO_CONCURRENCY=1 pnpm turbo run check-types
TURBO_CONCURRENCY=1 pnpm turbo run build
```

each as a **separate command**, recorded individually, with the §1 resource
measurements attached. Each command must exit 0 against the post-cutover
monorepo. Pre-existing failures are reconciled against the Phase 1 baseline
(`compiler-baseline.json`) and classified as either "pre-existing" (allowed)
or "migration-caused" (blocker). The classification is recorded in
`gate-reconciliation-<task>.json`; a migration-caused regression is a stop-loss.

**Aggregate gates run with Turbo concurrency 1** in this track. A proposal to
re-enable higher concurrency comes from a separate, future track after at least
three representative CI runs are stable.

`measure/generate.sh` and `measure/doctor.sh` are run per plan task. The
generated diffs are reviewed for unrelated churn (A10). `graph.db` is updated
for the changed manifests, scripts, and configurations. `measure/tech-stack.md`
is updated with TypeScript 7 as the compiler, TypeScript 6 as the temporary
compatibility API, the chosen alias names, the chosen local/CI `--checkers`
values, the benchmark medians, the fallback command, and the rollback path.

The `typescript6_major_migration` track stub is marked superseded in
`measure/tracks.md`. A new follow-up track stub for the TypeScript 7.1+
compatibility-package removal is appended to `measure/tracks.md`.

**Risk:** **high**. Aggregate-suite timebomb risk on a low-RAM host. The
strategy guards this with `TURBO_CONCURRENCY=1`, with a per-task resource
ceiling derived from Phase 3 medians + 50 %, and with explicit pre-existing
reconciliation against the Phase 1 baseline.

**Applicability:**
- **Review A (security review):** applicable. The freezeinstall validation,
  peer-dependency validation, and `pnpm audit` are the final security gate.
- **Review B (UX/API review):** not applicable for compiler migration, unless a
  Phase 3 deferred Next.js regression was reproved in the browser; in that case
  Review B re-checks the reproof record.
- **Review C (adversarial testing):** applicable. The §5.3, §5.4, §5.5
  refutations are rerun in CI as part of the final gate.
- **UX browser review:** **not applicable** unless a deferred reproof exists.
- **Phase acceptance:** applicable. The four aggregate commands and the four
  documentation updates must all exit 0 / be merged.
- **Final acceptance / closeout:** applicable. The orchestrator captures the
  pre-closeout SHA immediately before the closeout commit; the post-closeout
  SHA immediately after. Both are recorded in `closeout-shas.json`. A drift
  between them and the role-receipt hashes is an A15 finding.

## 6. Live-Proof Plan (Targeted Red → Green/Closeout Per Phase)

| Phase | Targeted Red command (must fail before code) | Green / closeout gate (must pass) | Surface | Risk |
|------:|:---|:---|:---|:---|
| 1 | `python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase1` (modules absent) | `bash tests/orchestrator_catalog.sh && bash tests/orchestrator_marker_vocabulary.sh && bash tests/orchestrator_supervisor_invariants.sh && bash measure/doctor.sh && PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase1` exits 0 | Artifact | medium |
| 2 | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase2` (5 contract harnesses absent) | Same command exits 0 + `PYTHONDONTWRITEBYTECODE=1 python3 -m py_compile measure/tests/test_typescript7_native_migration_phase2.py` + the three refutations (missing-diagnostic, false-speedup, alias-swap) **also** exit 0 on deliberately broken fixtures | Live | critical |
| 3a | `pnpm why -r typescript` shows only the TS 5.9 resolution | `pnpm why -r typescript` shows exactly two distinct trees: TS 6 (via `typescript`) and TS 7 (via the new alias); `node -e "console.log(require.resolve('typescript'))"` exits 0 with TS 6 path; `which -a tsc` lists one binary, TS 7; the `test_phase2` resolver refutation is re-run and exits 0 | Live (resolver only — no aggregate `tsc`) | medium |
| 3b | `python3 -c "import json,glob; assert all('baseUrl' not in json.load(open(p)) or p.endswith('marketing/tsconfig.json') for p in glob.glob('apps/**/tsconfig*.json', recursive=True)+glob.glob('packages/**/tsconfig*.json', recursive=True))"` exits 1 (today) | Same command exits 0; `python3 -c "import json,glob; assert all('types' in json.load(open(p)) for p in glob.glob('apps/**/tsconfig*.json', recursive=True)+glob.glob('packages/**/tsconfig*.json', recursive=True))"` exits 0 (only after narrow lists added) | Artifact | medium |
| 3c | parity harness reports a difference for one tsconfig (TypeScript 6 vs TypeScript 7) | `PYTHONDONTWRITEBYTECODE=1 python3 -m unittest -v measure.tests.test_typescript7_native_migration_phase2.ParityContract` exits 0; `diagnostic-parity-ledger.json` validates against its JSON Schema | Live | high |
| 3d | `pnpm --filter @reading-advantage/types exec tsc --noEmit -p tsconfig.json` exits non-zero (today) | Same command exits 0; repeat per workspace in §4 order | Live (native source) | critical |
| 3e | byte diff between TS 6 and TS 7 `.d.ts` output for one package is non-empty | Same diff is empty for `packages/types` and `packages/db`, or is fully accounted for in `declaration-emit-diff-ledger.json` with a per-file review note | Live (declaration emit) | high |
| 3f | n/a (no runner migration by default) | If a runner needs TS 6 pinning, the §3 ownership matrix row exists and the resolver contract still passes | Live | medium |
| 3g | benchmark harness records `diagnostic_count == 0` against `apps/reading-advantage` (refutation) | Medians recorded for every workspace in §4; false-speedup refutation exits non-zero on a deliberately empty-fixture run; chosen `--checkers` documented | Live (benchmark) | critical |
| 3h | CI lane missing | Three CI runs recorded in `ci-observation/`; the third is required-blocking | Live (rollout) | high |
| 3i | `pnpm turbo run check-types` cache hit after a compiler-identity edit (refutation) | Cache miss on compiler-identity edit; cache hit on a non-TS source edit | Live (cache) | high |
| 4 | n/a | `TURBO_CONCURRENCY=1 pnpm turbo run lint && TURBO_CONCURRENCY=1 pnpm turbo run test && TURBO_CONCURRENCY=1 pnpm turbo run check-types && TURBO_CONCURRENCY=1 pnpm turbo run build` all exit 0; `pnpm install --frozen-lockfile` exits 0; `pnpm audit --prod` exits 0 (advisory only — pre-existing advisories classified); `measure/doctor.sh` exits 0; `measure/generate.sh` produces no unrelated churn | Live (aggregate) | high |

The `phase_base_sha` capture point is **immediately after** the strategy commit
that lands this file. The orchestrator must run, in order:

1. `git add measure/tracks/typescript7_native_migration_20260710/test-strategy.md`
2. `git commit -m "<conventional>"` (with `(track_id: typescript7_native_migration_20260710)` per AGENTS.md)
3. `git rev-parse HEAD` → record as `phase_base_sha` for this track
4. Begin Phase 1 work only after `phase_base_sha` is recorded

The SHA must be the commit that contains this exact strategy text, **not** the
role-base SHA `1e535e8be68cf90b67517651f83e9e66f3fe5c24` and **not** any
uncommitted worktree SHA. A drift between the recorded `phase_base_sha` and the
actual HEAD of the strategy commit is an A15 finding.

## 7. Fixtures, Mocks, and Live-Behavior Proof Expectations

- **Fixtures.** Refutation fixtures live under
  `measure/tracks/typescript7_native_migration_20260710/fixtures/`:
  - `parity-broken-diagnostic/` — a deliberate `tsconfig.json` and `index.ts`
    that produce exactly one diagnostic under TS 6 and zero under TS 7 (used by
    the §5.3 missing-diagnostic refutation).
  - `benchmark-empty-fixture/` — an empty tsconfig whose parity-known diagnostic
    count is ≥ 1; used by the §5.4 false-speedup refutation.
  - `alias-swap-fixture/` — a temporary `package.json` whose `typescript`
    resolution is mutated mid-test; used by the §5.1 alias-swap refutation.
  - `tsconfig-matrix/` — the 24 tsconfig paths grouped by emit/no-emit and
    ambient-globals consumption; used by the §5.2 contract.
  - `runner-fixtures/` — one ESLint printable-config fixture, one ts-node
    `-e` expression, one tsup `--help` invocation shell.

  All fixtures are committed at the role-base SHA so the Phase 2 contract
  test references byte-pinned paths. They are **not** mocks; they invoke the
  real TS 6 / TS 7 binaries on real source.

- **Mocks.** Vitest mocks of `node:child_process` are **forbidden** in the §5.3,
  §5.4, §5.5 harnesses. The strategy invokes real subprocesses. The only mocks
  used are: (i) the `pgrep`-based process-count assertion, which tolerates
  transient process churn; (ii) the `@commitlint/load` peer-resolution check,
  which inspects the resolved package, not the loaded API.

- **Live-behavior proof expectations.** Phase 2 produces **real subprocess output
  to disk** for every (tsconfig, compiler) pair, under
  `evidence/<phase>/<workspace>/<compiler>/<run>.jsonl`. Phase 3's Green signals
  reference those files by SHA-256, not by regex of their contents. The harness
  computes SHA-256 with `hashlib.sha256(...)`, a labeled-integer parse (anti-A3).

- **Artifact/documentation tests vs live behavior tests.** The five schema
  artifacts in Phase 1 are documentation; the JSON-Schema validators are
  artifact tests, not live behavior. The five contract harnesses in Phase 2 are
  live behavior. The benchmark harness is live behavior. The CI observation
  records are live behavior (CI is the live system). The aggregate
  `pnpm turbo run …` calls in Phase 4 are live behavior. Reviewers must not
  mistake the JSON-Schema validation in Phase 1 for a runtime gate; reviewers
  must not mistake a passing structural JSON file in Phase 3 for a passing
  benchmark.

## 8. Architecture Guardrails

- **No production source changes in Phase 1 or Phase 2.** The schemas, the
  fixtures, and the contract test files are the only new artifacts before
  Phase 3a. TypeScript source edits begin in 3a and are limited to `tsconfig`
  files plus the workspace catalog / package manifest aliases.
- **No blanket suppressions.** No `skipLibCheck: true` expansion. No
  `ignoreBuildErrors: true`. No `@ts-ignore` / `@ts-nocheck` / `@ts-expect-error`
  blanket. Each suppression, if ever justified, is per-line with a code comment
  naming the diagnostic and the reviewed parity ledger entry.
- **No test-runner migration.** Jest stays Jest, Vitest stays Vitest,
  Playwright stays Playwright. The §3 matrix is the only place TS 6 pinning
  for tooling is allowed, and pinning is the action — not migration.
- **Compiler identity participates in Turbo cache keys.** The strategy
  requires an explicit `inputs` extension for `check-types` (compiler version
  hash, tsconfig path hash, `--checkers` value) so that a TS 7 → TS 6 → TS 7
  cycle busts the cache. The §5.5 cache contract enforces this; refutation
  ensures the property.
- **No project references.** Out of scope per spec.
- **No `ignoreBuildErrors`, no `skipLibCheck` expansion, no escape hatches.**
  All three are first-class anti-patterns; any test that proves them is a
  *negative* test (refutation) and lives only as a guard, never as an enabled
  config.

## 9. Changed-Contract Risks

| Contract | Risk if changed | Detection |
|---|---|---|
| Workspace catalog alias names (`typescript`, TS 7 alias) | Tools silently resolve to TS 7 → tooling peer breakage | `pnpm why -r typescript` snapshot in `compiler-baseline.json`; resolver refutation §5.1 |
| `diagnostic-parity-ledger.json` schema | Silent acceptance of TS 7-only diagnostics as "expected" | JSON Schema validation in Phase 1 gate + Phase 3c gate; ledger length and per-entry `reviewed_by` field |
| `benchmark-record-schema.json` fields | False speedups accepted (A5) | Labeled-integer parse + missing-diagnostic refutation |
| `rollout-record-schema.json` fields | CI nondeterminism accepted as normal | Phase 4 reconciliation against Phase 3 medians; field drift caught by JSON Schema |
| Ownership matrix (§3) rows | A new consumer silently picks TS 7 and breaks | Phase 2 §5.5 inventory sweep on every Phase 3 commit; `pnpm why -r typescript` re-run |
| `tsc --checkers` value | Under-tuned workers waste budget on low-RAM host | Phase 3g benchmark suite records both 1 and 2; chosen value documented in `measure/tech-stack.md` |
| Turbo `inputs` for `check-types` | Stale cache hides a compiler-identity regression | §5.5 refutation; CI cache-bust observable in `ci-observation/<run>.json` |
| `freezeinstall` policy | Untracked peer change | `pnpm install --frozen-lockfile` is the canonical Phase 4 gate |
| The 24-tsconfig inventory | New tsconfig added without classification | §5.2 contract rerun on every Phase 3 commit; an unknown tsconfig is a stop-loss |

A change to any contract requires a new Phase 1 / Phase 2 / Phase 3 commit,
**not** an in-flight edit. The orchestrator must reject drive-by updates to
this strategy, the schemas, or the ownership matrix during Phase 3.

## 10. Intentionally-Red Aggregate-Suite Handling

The aggregate gates (`pnpm turbo run lint | test | check-types | build`) are
**red by design** before this strategy's Phase 3 cuts them over. The strategy
prescribes the following discipline to prevent A4 (vacuous pass):

- During Phase 2 the test file
  `measure/tests/test_typescript7_native_migration_phase2.py` is intentionally
  red; every Phase 2 commit adds *one* contract assertion. A passing run with
  zero contract assertions is treated as A4 — fix or revert.
- During Phase 3a-3b no aggregate `pnpm turbo run check-types` is invoked.
  Aggregate gates are scoped to the workspace (`pnpm --filter <pkg> …`) until
  Phase 4.
- During Phase 3g the benchmark harness is intentionally red for tsconfigs
  that have not yet been flipped; the harness records the workspace as
  `not_flipped_yet`, not as `passing`. A workspace that the harness labels
  `not_flipped_yet` may not be claimed as a Green workspace.
- During Phase 4 the aggregate suite is invoked **once** and recorded. A
  pre-existing failure (one that already existed at role-base SHA
  `1e535e8be68cf90b67517651f83e9e66f3fe5c24`) is classified as pre-existing
  in `gate-reconciliation-<task>.json` and is allowed; a migration-caused
  failure is a stop-loss. The classification is reviewed by Review A.

No `describe.skip`, `it.skip`, `.todo`, `.skip`, or path-ignore glob is
introduced. The 49 pre-existing ESLint errors in `primary-advantage` and the
mixed Jest/Vitest status remain pre-existing and are tracked in
`measure/tech-debt.md`, not masked.

## 11. Anti-Pattern Coverage (falsifiability matrix)

Every Phase 2 contract test has a falsification condition. The matrix below
maps each anti-pattern from `measure/anti-patterns.md` to the defending test
and its refutation.

| ID | Defended by (phase, harness, refutation) | Falsification condition |
|---|---|---|
| A1 substring-as-structured-signal | n/a for this track (no supervisor edits); the supervisor is unchanged. The catalog audit `tests/orchestrator_catalog.sh` exits 0 in the Phase 1 closeout gate. | A free-text mutation of the supervisor regex must not bypass the catalog gate. |
| A2 consent-blind publish gate | n/a (no publish gate in this track). | The track does not introduce a publish gate. |
| A3 digit-only count | Phase 2 §5.4 benchmark harness parses `Maximum resident set size` and `Elapsed (wall clock) time` from `/usr/bin/time -v` output via labeled keys, not regex `rg '[0-9]+'`. Phase 4 reconciliation parses `diagnostic_count` as a JSON integer with explicit key. | A `/usr/bin/time -v` line containing only a date or a path must not pass as elapsed time; a JSON string `"1"` must not pass as `diagnostic_count`. |
| A4 vacuous-pass on nothing-done | Phase 2 contract assertions each count ≥ 1 element by construction. The Phase 1 audit must exit 0 with at least one schema artifact present. The Phase 3 green state requires ≥ 1 `[x]` task with evidence. | An empty `diagnostic-parity-ledger.json` may not pass the Phase 3c gate; a Phase 2 run with 0 assertions fails. |
| A5 false-claim text vs test reality | Phase 2 §5.3 missing-diagnostic refutation (parity harness fails when a TS 6 diagnostic is missing in TS 7 output). Phase 2 §5.4 false-speedup refutation (benchmark fails on `exit 0 + diagnostic_count==0` for a known-failing tsconfig). Phase 2 §5.5 alias-swap refutation (resolver fails when TS 6 is swapped for TS 7 in a tooling peer). | A parity run that reports "all checks pass" while omitting the refutation is rejected. A benchmark median that omits the false-speedup guard is rejected. |
| A6 registry-note overstatement | `measure/tracks.md` entry for this track remains `[ ]` until Phase 4 acceptance; `metadata.json.status` remains `"new"` until then. The Phase 4 closeout gate asserts `metadata.json.status == "complete"` is **absent** before closeout. | A premature `metadata.json.status == "complete"` is an A6 finding. |
| A7 over-broad filter | Phase 2 contract harness uses no exclusion filter on diagnostic codes; every diagnostic code is included, and the parity comparison is set-equality, not "exclude and compare". | An exclusion of a real diagnostic class (e.g., "skip TS6133 unused") is rejected. |
| A8 `[ ]` marker ambiguity | Plan tasks use only `[x]`, `[~]`, and `[b] deferred:<owner>`. The Phase 1 closeout gate runs `tests/orchestrator_marker_vocabulary.sh`. | A `[ ]` (space) marker in `plan.md` fails the gate. |
| A9 pre-existing test references archived track paths | n/a (this track is active, not archived). The strategy file lives at `measure/tracks/typescript7_native_migration_20260710/test-strategy.md`. | If the track is archived mid-strategy, the resolver helper from the catalog applies. |
| A10 generated-facts drift | Phase 4 runs `measure/generate.sh` and `measure/doctor.sh`; the generated diff is reviewed for unrelated churn. `graph.db` is updated for changed manifests/scripts/configurations. | A generated diff that includes an unrelated change (e.g., a marketing content update) is rejected. |
| A11 executed review track left fully blocked | n/a (not a review track). | n/a |
| A12 dangling catalog guard-references | Phase 1 audit runs `tests/orchestrator_catalog.sh`; every A-entry's `Guard:` line resolves to a real test file or `none`. | A new `Guard:` reference without a real test file is rejected. |
| A13 stale track dir after archive move | n/a (track is active). | n/a |
| A14 invalid ripgrep option | Phase 2 / Phase 4 detector scripts use `rg -n '<regex>'` only, never `rg -nE`. The Phase 4 audit runs `tests/orchestrator_detector_syntax.sh`. | A `rg -nE` invocation in any detector script fails the gate. |
| A15 stale role-receipt hashes | Phase 4 closeout captures pre/post SHAs and binds them to the strategy commit; any fix that modifies `test-strategy.md` after closeout must supersede the receipt. | A receipt whose hash does not match HEAD fails the gate. |

The aggregate suite is **red before Phase 3 cuts it over** and is reported as
"expected Red / not yet cut over", never as a test-failure remediation or
product-owner acceptance. Only the exact focused Green and closeout gates in
§6 may change that classification.

## 12. Risk Classification Summary

| Phase | Risk | Driver |
|---|---|---|
| 1 | medium | Schema drift between Phase 1 and Phase 3 corrupts later evidence |
| 2 | **critical** | Defines every later phase's falsifiability; a vacuous or digit-only contract here is unrecoverable |
| 3a | medium | Alias install failure is recoverable; resolver contract catches it |
| 3b | medium | tsconfig fixes are reversible; contract test catches regressions |
| 3c | high | Parity reconciliation must be honest; A5 refutation is the guard |
| 3d | **critical** | `check-types` cutover is the migration; one flipped workspace at a time |
| 3e | high | Declaration-emit differences may be invisible without byte-comparison |
| 3f | medium | Bounded test-runner pinning; default is no change |
| 3g | **critical** | Benchmark suite must fail closed on OOM / swap / false speedup |
| 3h | high | CI rollout nondeterminism; three representative runs required |
| 3i | high | Turbo cache invalidation is the only way to know the cutover stuck |
| 4 | high | Aggregate suite on a low-RAM host; pre-existing failure reconciliation is the discipline |

## 13. Applicability Summary

| Review / gate | Phase 1 | Phase 2 | Phase 3 | Phase 4 |
|---|:---:|:---:|:---:|:---:|
| Review A (security review) | n/a | yes (resolver) | yes (alias + ownership) | yes (freezeinstall + audit) |
| Review B (UX/API review) | n/a | n/a | conditional (deferred Next.js regression only) | conditional |
| Review C (adversarial testing) | n/a | yes (refutations) | yes (refutations rerun) | yes (final refutation sweep) |
| UX browser review | n/a | n/a | conditional (one small Next.js surface, only if a deferred reproof exists) | conditional |
| Phase acceptance | yes (artifact gate) | yes (5 contract gates) | yes (per sub-phase) | yes (aggregate gate) |
| Final acceptance / closeout | n/a | n/a | n/a | yes |
| Closeout | n/a | n/a | n/a | yes |

---

**phase_base_sha capture point.** The orchestrator must capture
`phase_base_sha` **immediately after** `git commit` of this strategy file lands
and `git rev-parse HEAD` returns the new SHA. That SHA — not
`1e535e8be68cf90b67517651f83e9e66f3fe5c24` and not any uncommitted worktree
SHA — is the immutable baseline against which Phase 1 evidence is gathered and
Phase 2 contracts are pinned.

**This strategy does not request, perform, or record any implementation work.**
Phase 1 begins only after the orchestrator confirms `phase_base_sha` is recorded
and the five Phase 1 schemas are absent (i.e., the Red state is honest).

---

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: typescript7_native_migration_20260710
phase: track setup (pre-Phase 1)
commits: none yet — strategy file is the only artifact for this commit
tests_run: none (strategy-only role; no tsc/tsc7 binaries are invoked by this role)
files_changed: measure/tracks/typescript7_native_migration_20260710/test-strategy.md (new, this commit)
plan_updates: none (plan.md is untouched; strategy adds the §3 ownership matrix, the §1 fail-closed triggers, the §6 per-phase Red/Green/closeout table, the §10 intentionally-red discipline, and the §11 anti-pattern coverage table as the strategy's frozen contract)
known_failures: pre-existing role-base SHA `1e535e8be68cf90b67517651f83e9e66f3fe5c24` has 254 modified files in the worktree (unrelated apps); strategy treats these as evidence-not-targets and instructs `git stash -u -- <unrelated paths>` before any benchmark. Pre-existing 49 ESLint errors in `primary-advantage` and the mixed Jest/Vitest status remain pre-existing and are not addressed by this track (spec §Out of Scope).
handoff: The implementer (Phase 1 contract role) must (1) wait for the orchestrator to record `phase_base_sha` from the strategy commit, **not** from the role-base SHA; (2) author the five JSON schemas under `measure/tracks/typescript7_native_migration_20260710/` and validate them with `ajv`; (3) export `TURBO_CONCURRENCY=1` in every benchmark and parity script; (4) compare TS 7 with `--checkers 1` and `--checkers 2` and document the chosen value in `measure/tech-stack.md` after Phase 3g; (5) reject any wholesale Jest → Vitest migration (out of scope); (6) preserve Playwright and the TypeScript 6 programmatic API for `typescript-eslint`, `ts-node`, `tsup`, `tsconfck`, and `commitlint` per §3; (7) preserve unrelated dirty work — never `git add` anything outside this strategy file on this commit; (8) run the Phase 1 closeout audit command from §6 verbatim before claiming Phase 1 complete.
END_MEASURE_AGENT_RESULT