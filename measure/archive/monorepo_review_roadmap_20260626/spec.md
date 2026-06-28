# Specification: Monorepo Review Roadmap

## Overview

Synthesize the outputs of all monorepo feature review tracks into a deduplicated, prioritized remediation and migration roadmap. This track is the closeout layer for the review program: it turns findings into actionable Measure tracks without losing evidence or overstating review coverage.

## Scope

Primary scope: accepted review artifacts from the child tracks listed below, plus roadmap-only synthesis artifacts under `measure/audit-reports/monorepo-review-roadmap_20260626/`. This track does not perform app feature review and does not implement remediation.

## Inputs

Accepted artifacts from:

- `shared_foundation_review_20260626`
- `reading_advantage_full_review_20260626`
- `primary_advantage_full_review_20260626`
- `advantage_games_review_20260626`
- `science_advantage_review_20260626`
- `codecamp_advantage_review_20260626`
- `marketing_app_review_20260626`
- `sales_advantage_review_20260626`
- `www_reading_advantage_review_20260626`
- `cross_app_workflows_review_20260626`

## Required Artifacts

Create `measure/audit-reports/monorepo-review-roadmap_20260626/` containing:

- `deduplicated-findings.md`
- `critical-high-remediation-plan.md`
- `migration-roadmap.md`
- `test-strategy-roadmap.md`
- `product-risk-register.md`
- `executive-summary.md`

## Prioritization Rules

Rank work by:

1. Critical security, auth, tenant, or data-loss risks.
2. Shared-foundation issues blocking multiple app reviews or migrations.
3. Oldest/highest-traffic legacy surfaces: Reading Advantage, then Primary Advantage.
4. Production reliability risks in CodeCamp, Sales, Marketing, Science.
5. Reusable game importability and public website claim accuracy.
6. Medium/Low cleanup and test hardening.

## Non-Goals

- Do not re-review source code unless needed to resolve conflicting findings.
- Do not implement remediation.
- Do not archive child tracks that lack accepted artifacts.

## Acceptance Criteria

- All accepted findings are deduplicated or explicitly preserved as unique.
- Every Critical/High finding has an owner, proposed remediation track, and dependency list.
- The roadmap distinguishes remediation, migration, test hardening, and product-content work.
- The final executive summary states coverage limits and residual risks.
