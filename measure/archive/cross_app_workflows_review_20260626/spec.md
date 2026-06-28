# Specification: Cross-App Workflows Review

## Overview

Review system behavior that crosses individual app boundaries. This track synthesizes child app/package findings into architectural risks that cannot be understood by reviewing one app at a time.

## Scope

Cross-app concerns:

- Auth/session/user identity across apps.
- Tenant/school/license model.
- Shared database and migration policy.
- Shared AI adapter usage.
- Shared storage adapter usage.
- Shared UI and design system reuse.
- Games imported into product apps.
- Marketing/website claims against product reality.
- Deployment, env vars, secrets, CI, and observability.
- Test strategy and quality gates across packages.

## Required Artifacts

Create `measure/audit-reports/cross-app-workflows_20260626/` containing:

- `00-inventory.md`
- `architecture-map.md`
- `workflow-map.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not duplicate all app-specific findings.
- Do not create a new architecture without tying it to specific review evidence.
- Do not resolve product prioritization conflicts; feed them to the final roadmap track.

## Acceptance Criteria

- Cross-app risks are supported by findings from at least one child review or graph-backed inventory.
- Shared-root-cause findings deduplicate app-level symptoms.
- Proposed migration tracks identify affected apps and package owners.
