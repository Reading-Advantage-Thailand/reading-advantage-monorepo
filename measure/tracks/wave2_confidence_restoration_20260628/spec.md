# Specification: Wave 2 — Restore Deployment/Test/Provider Confidence

## Overview

Restore the trustworthiness of monorepo gates. This wave addresses migration/seed governance, provider-adapter enforcement, observability boundaries, and false-green/vacuous test patterns that the review program found across apps and shared packages.

## Source Findings

- MR-H01 — Provider adapters are present but not consistently enforced.
- MR-H02 — Migration, schema, and seed governance can still break deploys.
- MR-H03 — Test signal is fragmented and sometimes false-green.
- Cross-App CA-005, CA-006, CA-007, CA-010, CA-011.

## Evidence References

- `measure/audit-reports/monorepo-review-roadmap_20260626/deduplicated-findings.md`
  - MR-H01 Provider adapters not consistently enforced.
  - MR-H02 Migration/schema/seed governance can break deploys.
  - MR-H03 Test signal fragmented/false-green.
- `measure/audit-reports/monorepo-review-roadmap_20260626/test-strategy-roadmap.md`
  - Tenant Isolation Harness, Shared Contract Test Package, Provider Architecture Guards, Migration Doctor Gates, Claims Verification Tests.
- `measure/audit-reports/cross-app-workflows_20260626/findings.md`
  - CA-005 AI adapter compliance bypassed.
  - CA-006 Storage adapter adoption minimal.
  - CA-007 Database migration governance inconsistent.
  - CA-010 Test strategy fragmented/false confidence.
  - CA-011 Observability ad-hoc/bypasses adapters.
- `measure/audit-reports/shared-foundation_20260626/executive-summary.md`
  - F-SF-006 missing migration sentinels, F-SF-014 Drizzle version mismatch, F-SF-015/F-SF-016 webhook package/logging issues, F-SF-017 types zero tests, F-SF-019 AI aggregate test failures, F-SF-021 legacy pass-with-no-tests/provider bypass.
- App evidence:
  - Science seed/build: `science-advantage-full_20260626/executive-summary.md` HI-05/HI-08.
  - CodeCamp prod-smoke/false-green: `codecamp-advantage_20260626/executive-summary.md` High theme 6.
  - Marketing tautological/stale tests: `marketing-app_20260626/executive-summary.md` Headline risks.
  - Games smoke-only tests: `advantage-games_20260626/executive-summary.md` import-contract/test readiness.

## Scope

1. Add migration sentinels, Drizzle version alignment checks, seed contract checks, and deploy doctor gates.
2. Enforce provider neutrality for AI, storage, and observability imports.
3. Fix or quarantine false-green tests: source-string assertions, `passWithNoTests`, live-production default smoke tests, tautological tests, stale RED docblocks.
4. Create reusable test harnesses for tenant isolation, contracts, provider architecture guards, migration doctor checks, and app claims.

## Non-Goals

- Do not fix every app feature bug; Wave 1 and Wave 3 own app/product remediation.
- Do not perform broad dependency major upgrades unless explicitly required for a gate.
- Do not change production deployment configuration without a reviewed rollback plan.

## Acceptance Criteria

- Migration doctor/sentinel tests catch missing migrations and seed contract violations.
- Provider guard fails direct SDK imports and AI barrel leaks in production paths.
- `@reading-advantage/types` has a real test script; legacy scripts no longer pass with zero tests unless quarantined from quality claims.
- Production smoke tests are opt-in and cannot run accidentally in CI without explicit live credentials/flags.
- Each reusable harness is documented with at least one consumer test.
