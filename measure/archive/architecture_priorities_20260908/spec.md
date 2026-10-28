# Architectural priorities

## Purpose

Reduce repeated work and unnecessary coupling while preserving application behavior.
The owner authorized these priorities after the monorepo repair review.

## Requirements

- Separate expensive verification from routine tests where the current suite repeats builds.
- Keep every existing verification gate reachable and required in CI.
- Run one shared TypeScript check before the CI gate tests and preserve every diagnostic assertion.
- Preserve the existing standalone typecheck behavior.
- Refresh only existing candidate reconciliation fields required by the documented V2 contract.
- Preserve approved baselines, reviewer records, and the default architecture policy.
- Keep generated test fixtures outside the active Measure tracks and remove them after each run.
- Replace broad Domain imports with existing capability exports where practical.
- Consolidate repeated authentication decisions in existing owning modules.
- Consolidate a shared domain operation only when the review proves useful duplication.
- Preserve authorization, tenant checks, authentication defaults, and application responses.

## Acceptance

- Tests prove the verification partition retains the previous test coverage.
- Required build checks execute real builds without redundant invocations.
- Narrow imports load their required capabilities without unrelated Sales initialization.
- Authentication tests cover defaults, explicit modes, and denied requests.
- Affected tests, lint, types, and builds pass.
- Astra low reviews approve the Sol medium implementation.

## Exclusions

Framework upgrades, provider migrations, privileged adapter exposure, and broad controller rewrites remain outside this track.
Existing unrelated changes remain preserved.
