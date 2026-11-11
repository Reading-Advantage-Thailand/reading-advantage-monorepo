# Architecture Enforcement

The repository architecture checker prevents new direct database and provider
SDK debt while allowing only the exact ownership roots and reviewed baseline
entries declared by the versioned policy.

## Commands

```bash
pnpm architecture:check
pnpm architecture:check --format json
pnpm architecture:baseline:validate
pnpm architecture:baseline:update
```

`architecture:check` is read-only and non-interactive. It exits with:

- `0` when current findings exactly match the reviewed baselines;
- `1` when there is new debt, removed debt that requires baseline reduction,
  or a path/location change requiring review; and
- `2` when policy, baseline, parsing, resolution, configuration, or I/O cannot
  be validated safely.

Human diagnostics identify the rule, evidence kind, repository-relative path,
line, column, resolved target, and required status. JSON output contains the
same bounded, secret-safe facts. Neither format includes source bodies,
credentials, or absolute machine paths.

## CI mode and the local pin

CI skips only the analyzer input snapshot pin comparison. The local full check
keeps the pin:

```bash
pnpm architecture:check --skip-input-snapshot-pin
pnpm architecture:check
```

## Refresh the v2 manifest pins

After a change to an analyzed file, refresh the five pinned analyzer values:

```bash
pnpm architecture:pin:refresh
pnpm architecture:pin:refresh --acknowledge
pnpm architecture:pin:refresh --acknowledge --budget-s 1500
```

The first command prints the old value and the new value of each field. It
writes nothing and exits non-zero while a value differs. The acknowledged
command writes the canonical manifest, then validates it. A failed validation
restores the previous bytes. CI never runs the refresh command.

A refresh that needs more time than one run has continues as a series of runs.
`--budget-s <n>` sets the time budget of one run in whole seconds. The default
is 1500, so that a run fits the 1800 s job cap with a margin. Each run prints a
`step=` line for each step and a `modules_done=` line after each module batch.

The run keeps finished module findings in
`.cache/architecture-pin-refresh/checkpoint.json` under the repository root.
`.gitignore` ignores `.cache`, so the store is outside git. The store is valid
for one Git commit. A commit or a change under
`packages/architecture-enforcement` discards the store, and the next run starts
from scratch. The store holds no hash and no checksum.

Exit code 0 means the manifest is current or written. Exit code 1 means a
preview has pending changes. Exit code 2 means a failure. Exit code 3 means a
partial run: the store holds new modules, and the same command must run again.
A run that stores no new module exits with code 2.

## Remediation

Fix a database finding by moving queries and database-client construction into
the owning backend module or approved PostgreSQL adapter. Fix a provider
finding by calling the internal AI, storage, or integration interface and
keeping vendor SDK construction inside its exact provider adapter.

Do not add wildcard exceptions, directory exemptions, generated-file
exclusions, or hand-edited baseline entries. Exact test exceptions are limited
to reviewed test and fixture files and cannot exempt production siblings.

When remediation removes a reviewed violation, the normal check reports
`baseline-reduction-required`. Review the removal, preview the replacement,
then acknowledge the reduction:

```bash
pnpm architecture:baseline:update
pnpm architecture:baseline:update --acknowledge
```

The first command never writes and exits non-zero while a change is pending.
An acknowledged update writes only after successful analysis and strict
baseline validation.

Accepting deliberate new debt is exceptional and requires an accountable owner
and a meaningful reviewed rationale:

```bash
pnpm architecture:baseline:update --acknowledge \
  --owner backend-platform \
  --rationale "Temporary reviewed boundary debt with a dated removal plan."
```

Existing and renamed findings retain their prior owner and rationale. New
findings without valid review metadata fail without changing either baseline.
Commit baseline changes only with the approving Measure track and review
evidence.

## CI and Doctor

GitHub CI runs `pnpm architecture:check --skip-input-snapshot-pin`.
`measure/doctor.sh` runs the local full check `pnpm architecture:check`. CI
never runs the baseline-update or pin-refresh command. A failing check must be
remediated or explicitly reviewed through the update workflow; it must not be
bypassed with a shell fallback.
