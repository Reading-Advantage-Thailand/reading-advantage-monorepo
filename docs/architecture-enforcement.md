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

GitHub CI and `measure/doctor.sh` invoke the exact same
`pnpm architecture:check` command. They never invoke the baseline-update
command. A failing check must be remediated or explicitly reviewed through the
update workflow; it must not be bypassed with a shell fallback.
