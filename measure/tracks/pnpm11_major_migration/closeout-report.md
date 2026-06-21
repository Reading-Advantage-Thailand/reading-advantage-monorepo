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

The aggregate gate **executes under pnpm 11.8.0 but does not exit 0**.
`pnpm turbo run lint` completes successfully (19 tasks, 0 errors, only
warnings). The full `lint test check-types build` pipeline fails during
the `test` task because of pre-existing failures in the unrelated
`ai_sdk_major_migration` track's closeout-artifact tests; see
"Post-fix gate failure" below. This is not a pnpm 11 regression — the
failing tests expect artifacts in `measure/tracks/ai_sdk_major_migration/`
which do not exist in the repository.

**Initial blocker found by Reviewer A (allowBuilds placeholders)**

The original closeout report diagnosed the gate as "environment-blocked"
by optional native-binary fetch errors. Re-running the gate in the Reviewer
A session showed the actual initial failure was `[ERR_PNPM_IGNORED_BUILDS]`:
pnpm 11 refuses to install while `pnpm-workspace.yaml#allowBuilds` contains
literal `"set this to true or false"` placeholders. The placeholder form
written by pnpm 11 is not accepted by subsequent `pnpm install` invocations
(including the one Turbo's `runDepsStatusCheck` spawns).

Reviewer A resolved this by running `pnpm approve-builds --all`, which
replaced the placeholders with explicit boolean values and executed the
pending post-install scripts. After the fix:

- `pnpm install` no longer fails with `[ERR_PNPM_IGNORED_BUILDS]`.
- `pnpm turbo run lint` passes (19 successful, 0 errors).
- The workspace state file (`node_modules/.pnpm-workspace-state-v1.json`)
  is still not created under `nodeLinker: hoisted`, but the absence no
  longer blocks Turbo task execution once the builds are approved.

The `pnpm-workspace.yaml` change (explicit `true` values in `allowBuilds`)
is part of the pnpm 11 migration deliverable and must be committed.

**What was attempted (bounded retries)**

| Attempt | Command | Outcome |
|---|---|---|
| 1 | `pnpm turbo run lint` after fresh Reviewer A start | RED — `[ERR_PNPM_IGNORED_BUILDS]` caused by `allowBuilds` placeholders |
| 2 | `pnpm approve-builds --all` | GREEN — builds approved, post-install scripts ran |
| 3 | `pnpm turbo run lint` after approve-builds | GREEN — 19 successful, 0 errors |
| 4 | `pnpm turbo run lint test check-types build` after approve-builds | RED — fails on `@reading-advantage/ai#test` (unrelated `ai_sdk_major_migration` artifacts) |

**Post-fix gate failure**

After the `allowBuilds` fix, the full aggregate gate fails in
`@reading-advantage/ai#test` (`packages/ai/src/__tests__/phase-12-closeout-artifacts.test.ts`).
The failing assertions require:

- `measure/tracks/ai_sdk_major_migration/artifacts/` directory
- `measure/tracks/ai_sdk_major_migration/artifacts/gate-result.json`
- `measure/tracks/ai_sdk_major_migration/artifacts/outdated.json`
- `measure/tracks/ai_sdk_major_migration/artifacts/audit.json`

None of these exist; the `ai_sdk_major_migration` track directory is not
present in the repository. These failures are unrelated to the pnpm 11
migration and would fail under any pnpm version. They prevent the
aggregate gate from exiting 0, so spec AC#6 ("All apps build and test
correctly under pnpm 11") cannot be declared satisfied until the
`ai_sdk_major_migration` closeout artifacts are produced or its tests are
excluded from the default test run.

**Remediation recommendation**

The pnpm 11 migration-specific blockers are resolved. The remaining gate
failure is owned by the `ai_sdk_major_migration` track. Recommended next
steps:

1. Commit the `pnpm-workspace.yaml` `allowBuilds` fix.
2. Complete or defer the `ai_sdk_major_migration` closeout artifacts.
3. Re-run `pnpm turbo run lint test check-types build` under pnpm 11.8.0
   and verify exit 0.

Until step 2 lands, the aggregate gate is blocked by an external track,
not by pnpm 11 configuration.

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