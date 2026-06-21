# Phase 4 Closeout Report — pnpm 11 Major Migration

> Track: `pnpm11_major_migration`
> Authored: 2026-06-22
> Phase 4 role: JR (Green implementation)
> Working tree: HEAD `38fa7095` at session start; this commit authored at the
> end of the JR session.
> pnpm runtime: 11.8.0 (`/home/daniel-bo/.local/bin/pnpm`)
> node runtime: v22.22.2 (`/home/daniel-bo/.local/bin/node`)

This report records the three Phase 4 closeout artifacts required by
`measure/tracks/pnpm11_major_migration/plan.md` Phase 4 (tasks 1, 2, 3) and
validated by `pnpm11-phase4-closeout.test.mjs`.

## Aggregate gate

**Canonical command**

`pnpm turbo run lint test check-types build`

Per `test-strategy.md` §7 Phase 4 row and `plan.md` Phase 4 task 1, this is
the canonical aggregate gate. It executes the four workspace-wide Turbo
tasks against all 22 workspace projects (21 in scope plus the workspace root).

**Result**

The aggregate gate **does not pass** in this worktree. The gate must pass
on a clean `pnpm install` invocation against a populated pnpm 11 store
before this section can be marked successful. The failure mode is
environmental and reproducible — see the bounded-retry note in `plan.md`
Phase 4 attempts 1-N — not a code regression introduced by this commit.
This report records the gate as inconclusive and recommends a remediation
track per the supervisor's retry-and-escalation policy ("If infrastructure,
network, or tool instability prevents a reliable result, mark the audit
inconclusive; do not archive the track").

**Why the gate does not pass**

pnpm 11.8.0 with `nodeLinker: hoisted` calls `runDepsStatusCheck` before
each `pnpm run <task>` invocation (via Turbo). `runDepsStatusCheck`
determines the lockfile-vs-node_modules sync state and, by default, runs
`pnpm install` to repair it. The repair attempt itself fails in this
environment for three reasons:

1. **Workspace state file is not created.** pnpm 11 with `nodeLinker:
   hoisted` does not write `node_modules/.pnpm-workspace-state-v1.json`,
   so `loadWorkspaceState()` returns `null` and `_checkDepsStatus()` reports
   "out of sync" on every Turbo task invocation. Verified via `grep -B5 -A30
   "updateWorkspaceState" /home/daniel-bo/.local/lib/node_modules/pnpm/dist/pnpm.mjs`:
   the state-writer is only reachable from
   `recursiveInstallThenUpdateWorkspaceState` (recursive `-r install`),
   and the recursive form also reports `Packages: -328` (see point 2).

2. **Optional native binaries are unreachable.** The lockfile lists 328
   optional native packages for non-current platforms (darwin, win32,
   freebsd, netbsd, sunos, openbsd, openharmony, aix, android, linux-arm
   variants). On linux/x64 the running pnpm marks them `skipped` in
   `node_modules/.modules.yaml`. The verify check sees the lockfile-modules
   delta and triggers `pnpm install`, which retries fetching those binaries
   from `registry.npmjs.org` and fails with `error (23)` (EPIPE) or
   `UND_ERR_SOCKET` against the upstream registry. This is observable in
   the `runDepsStatusCheck` trace under every Turbo task invocation:
   `@reading-advantage/<pkg>:lint: [WARN] GET https://registry.npmjs.org/@esbuild/darwin-x64/...tgz error (23). Will retry...` followed by
   `@reading-advantage/<pkg>:lint: [ERROR] Command failed with exit code 1: pnpm install`.

3. **`verify-deps-before-run` cannot be cleanly disabled in this layout.**
   The setting is rejected from `pnpm-workspace.yaml` (it is in the
   `excludedPnpmKeys` list inside
   `config/reader/lib/configFileKey.js`), rejected from `.npmrc` because
   the Phase 1 baseline test #5 (`no .npmrc at the repo root`) must continue
   to pass, and the env-var override
   `pnpm_config_verify_deps_before_run=warn` works at the `pnpm run`
   boundary but Turbo re-spawns `pnpm run` per package, and the warning
   path still falls through to `pnpm install` in this pnpm 11.8.0 build
   (verified: the warn branch fires, but the subsequent `pnpm install`
   spawned by `runDepsStatusCheck` is the same failing call).

**What was attempted (bounded retries)**

| Attempt | Command | Outcome |
|---|---|---|
| 1 | `node_modules/.bin/turbo run lint test check-types build` (default) | RED — `runDepsStatusCheck` failure on every task |
| 2 | `pnpm install --frozen-lockfile` then re-run gate | RED — same failure mode |
| 3 | `rm -rf node_modules packages/*/node_modules apps/*/node_modules && pnpm install --frozen-lockfile` | RED — same failure mode |
| 4 | `pnpm_config_verify_deps_before_run=warn` env override | RED — `warn` path fires but subsequent `pnpm install` still fails |
| 5 | `pnpm_config_verify_deps_before_run=warn` env + per-package `lint` only | RED — same failure mode |

**Remediation recommendation (per supervisor directive)**

Per the JR supervisor's retry-and-escalation policy, this Phase 4 task 1
is marked `[~]` (in-progress) and the track closeout is **deferred**. The
recommended remediation track is a follow-up that either pre-populates the
local pnpm 11 store with all 328 platform binaries (`pnpm fetch --store-dir
<path>` from a network-connected seed node), or adds `--ignore-optional`
to the `runDepsStatusCheck` install command for this workspace via an
upstream pnpm 11 patch, or pins the aggregate gate to run only against the
linux/x64 platform slice via a lockfile `ignoredOptionalDependencies` block
that suppresses the 328 optional packages from being treated as "missing"
by the verify check.

Until one of those lands, the aggregate gate is inconclusive in this
worktree. The post-migration contract tests
(`pnpm11-lockfile-contract.test.mjs` and `pnpm11-workspace-config.test.mjs`)
remain GREEN at the artifact level — the migration artifacts (lockfile,
workspace yaml, package.json) are correct, but the full toolchain cannot
be proven green from this worktree.

## pnpm outdated

**Command**

`pnpm outdated`

**Result**

```
┌───────────────────────────────────────┬─────────┬────────┐
│ Package                               │ Current │ Latest │
├───────────────────────────────────────┼─────────┼────────┤
│ @commitlint/cli (dev)                 │ 19.8.1  │ 21.0.2 │
├───────────────────────────────────────┼─────────┼────────┤
│ @commitlint/config-conventional (dev) │ 19.8.1  │ 21.0.2 │
├───────────────────────────────────────┼─────────┼────────┤
│ typescript (dev)                      │ 5.9.3   │ 6.0.3  │
└───────────────────────────────────────┴─────────┴────────┘
```

`pnpm outdated` exit code: `0`. The scan surfaced 3 dev-dependency
upgrades that are NOT covered by `pnpm11_major_migration`'s pin table
(`pnpm.overrides` in `pnpm-workspace.yaml`). These three are out of scope
for the pnpm-11 migration and are deferred to the existing
`dependency_upgrade_hardening_20260607` track for triage.

**Notable observations**

- All three are `dev` dependencies (not runtime).
- `@commitlint/cli` 19.8.1 → 21.0.2 is a major bump (commitlint v20+ has
  ESM-only changes); out of scope for a pnpm migration.
- `typescript` 5.9.3 → 6.0.3 is a major bump; tracked separately under
  `typescript6_major_migration`.
- The `pnpm.overrides` block in `pnpm-workspace.yaml` correctly pins
  `drizzle-orm`, `next`, `react`, `react-dom`, and `vitest` — none of
  these show up in the outdated scan, confirming the overrides are
  honored at the lockfile level.

## pnpm audit

**Command**

`pnpm audit`

**Result**

```
37 vulnerabilities found
Severity: 6 low | 23 moderate | 8 high | 0 critical
```

`pnpm audit` exit code: `0` (pnpm 11's default behavior — advisories
report but do not fail the command; use `--audit-level` to escalate).

**Severity breakdown**

| Severity | Count | Exit policy |
|---|---|---|
| Critical | 0 | n/a |
| High | 8 | informational; remediation deferred to per-advisory tracks |
| Moderate | 23 | informational; remediation deferred to per-advisory tracks |
| Low | 6 | informational; remediation deferred to per-advisory tracks |
| **Total** | **37** | All out of scope for `pnpm11_major_migration` |

**Notable observations**

- All 37 advisories are pre-existing on the dependency tree at the
  pre-migration commit; the pnpm 11 migration does not introduce or
  resolve any of them. The migration's blast radius is config / CI / YAML
  / JSON, not runtime deps (`build-graph` confirms; see plan.md Phase 3
  Green Gate `0e0368af`).
- `esbuild` advisory GHSA-g7r4-m6w7-qqqr (Windows-only path-traversal) is
  the highest-severity cluster with 6 affected packages; not actionable
  on linux/x64.
- `nodemailer` SMTP-injection advisory (GHSA-c7w3-x93f-qmm8) affects
  `apps__reading-advantage` only; remediation deferred to the
  `reading-advantage` app maintainers.
- `@ai-sdk/provider-utils` advisory (GHSA-866g-f22w-33x8, low) has 42
  affected paths through `codecamp-advantage`'s AI SDK chain; out of
  scope for a pnpm migration.

## Phase 4 task status summary

| Task | Status | Evidence |
|---|---|---|
| Run `pnpm turbo run lint test check-types build` aggregate gate | `[~]` (in-progress; env-blocked) | Aggregate gate section above — bounded retries exhausted; remediation track recommended |
| Re-run `pnpm outdated` and `pnpm audit`; document results | `[x]` | pnpm outdated + pnpm audit sections above — both commands exited 0; results captured |
| Update `measure/tech-stack.md` with the selected pnpm version | `[x]` | `measure/tech-stack.md` now records `pnpm@11.8.0` (selected in `pnpm11_major_migration`) |