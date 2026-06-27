# Cross-App Workflows Review — Inventory

> **Track:** `cross_app_workflows_review_20260626`
> **Date:** 2026-06-27
> **Type:** Review-only synthesis. No remediation performed.

## Input Sources

| # | Child Review | Report Path | Exec Summary | Findings Count | Critical | High | Medium | Low |
|---|-------------|-------------|-------------|----------------|----------|------|--------|-----|
| 1 | Shared Foundation | `measure/audit-reports/shared-foundation_20260626/` | PASS (review) / FAIL (product) | 26 | 4 | 7 | 10 | 5 |
| 2 | Reading Advantage | `measure/audit-reports/reading-advantage-full_20260626/` | PENDING acceptance | 8 Critical + 5 High + 8 Med + 1 Low + 10 PB | 8 | 5 | 8 | 1 |
| 3 | Primary Advantage | `measure/audit-reports/primary-advantage-full_20260626/` | Complete (review) | 893 | 66 | 177 | 302 | 348 |
| 4 | Science Advantage | `measure/audit-reports/science-advantage-full_20260626/` | Synthesis complete, acceptance PENDING | 922 raw (deduped) | 6 CR + 2 CR code | 11 HI | ~15 ME | ~12 LO |
| 5 | CodeCamp Advantage | `measure/audit-reports/codecamp-advantage_20260626/` | Acceptance PENDING | ~80 consolidated | 2 | 12 | 25 | 10+ |
| 6 | Sales Advantage | `measure/audit-reports/sales-advantage_20260626/` | Acceptance PENDING | 138 | 0 listed, 10 High | 10 | 9+ | 10+ |
| 7 | Marketing App | `measure/audit-reports/marketing-app_20260626/` | Acceptance PENDING | 44 | 3 | 6 | 18 | 17 |
| 8 | Advantage Games | `measure/audit-reports/advantage-games_20260626/` | Acceptance PENDING | 1,749 | ~10 | ~150 | ~600 | ~990 |
| 9 | Company Website | `measure/audit-reports/www-reading-advantage_20260626/` | Line review complete, gates PENDING | 44 | 7 | 12 | 15 | 10 |

**Aggregate:** 9 input reviews covering ~3,089 findings (~100 Critical, ~400 High) across all monorepo apps and shared packages.

## Scope

This synthesis covers cross-app concerns as defined in `spec.md`:

1. Auth/session/user identity across apps
2. Tenant/school/license model
3. Shared database and migration policy
4. Shared AI adapter usage
5. Shared storage adapter usage
6. Shared UI and design system reuse
7. Games imported into product apps
8. Marketing/website claims against product reality
9. Deployment, env vars, secrets, CI, and observability
10. Test strategy and quality gates across packages

## Evidence Standard

Every cross-app finding below cites at least one child review artifact path and, where possible, a concrete finding ID or count. Findings are deduplicated across child reviews into shared root causes.

## Artifacts Produced

This directory contains: `00-inventory.md` · `architecture-map.md` · `workflow-map.md` · `checklist.md` · `findings.md` · `migration-tracks.md` · `test-gaps.md` · `executive-summary.md`.
