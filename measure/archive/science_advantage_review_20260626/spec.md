# Specification: Science Advantage Review

## Overview

Review `apps/science-advantage`, a newer app developed mostly inside the monorepo. Because Science Advantage has already gone through a compliance pilot and multiple remediation tracks, this review should verify that the new shared architecture patterns held and identify any remaining product-feature or architecture-baseline gaps.

## Scope

Primary scope: `apps/science-advantage` plus science-specific domain modules already moved into shared packages.

Known baseline:

- 417 TypeScript graph files.
- 1,865 graph nodes.
- 738 functions.
- Prior audit and remediation artifacts under `measure/audit-reports/science-advantage_20260603/` and archived remediation tracks.

Feature families to inventory:

- Student science learning flows.
- Teacher dashboards, classes, assignments, interventions, analytics.
- Curriculum/lesson/quiz/mastery flows.
- AI recommendations and generated support.
- TenantDB, school isolation, permissions, validation, observability.
- Tests, build, deployment, and remaining pilot-audit follow-ups.

## Required Artifacts

Create `measure/audit-reports/science-advantage-full_20260626/` containing:

- `00-inventory.md`
- `workflow-map.md`
- `baseline-patterns.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not repeat the 2026-06-03 AGENTS.md pilot mechanically without using its results.
- Do not assume completed remediation tracks are correct without spot verification.
- Do not turn architecture-baseline notes into rules for other apps without evidence.

## Acceptance Criteria

- Prior remediation claims are sampled and verified against current code.
- The review identifies reusable golden-path patterns for other app migrations.
- Remaining science-specific findings and shared-platform findings are separated.
