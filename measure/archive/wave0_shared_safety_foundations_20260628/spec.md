# Specification: Wave 0 — Shared Safety Foundations

## Overview

Make the monorepo's shared safety guarantees true before downstream app remediation proceeds. This track fixes the foundation risks identified in `measure/audit-reports/monorepo-review-roadmap_20260626/`: tenant isolation, auth/session/role parity, contract-first API boundaries, and transport-thin backend/domain separation.

## Source Findings

- MR-C01 — Tenant isolation cannot be trusted monorepo-wide.
- MR-C02 — Auth/session/role adoption is fractured.
- MR-C04 — API contracts and shared schemas are not a reliable source of truth.
- MR-C05 — Business logic still runs in transport/request/UI paths.
- Cross-App CA-001, CA-002, CA-003, CA-004, CA-009.
- Shared Foundation M-SF-1 through M-SF-5.

## Evidence References

Primary evidence lives in these review artifacts:

- `measure/audit-reports/monorepo-review-roadmap_20260626/deduplicated-findings.md`
  - MR-C01, MR-C02, MR-C04, MR-C05.
- `measure/audit-reports/monorepo-review-roadmap_20260626/critical-high-remediation-plan.md`
  - Wave 0 lines: Tenant Registry + TenantDB Fail-Closed; Shared Auth/Role/Rate-Limit Hardening; Shared Contracts and Types Test Package.
- `measure/audit-reports/cross-app-workflows_20260626/findings.md`
  - CA-001 Auth/session adoption fractured.
  - CA-002 Tenant isolation untrustworthy.
  - CA-003 API contracts inconsistent/untested.
  - CA-004 Business logic leaks into transport.
  - CA-009 Rate limiting is in-memory.
- `measure/audit-reports/cross-app-workflows_20260626/migration-tracks.md`
  - CAX-1 through CAX-4 and CAX-8.
- `measure/audit-reports/shared-foundation_20260626/executive-summary.md`
  - Key risks table: tenant registry drift, API/type contract drift, API business logic leakage, null-tenant TenantDB, auth rate-limit/CSRF monitor items.
- `measure/audit-reports/shared-foundation_20260626/migration-tracks.md`
  - M-SF-1 Tenant registry/schema/Drizzle alignment.
  - M-SF-2 Fail-closed TenantDB and referential-scope test hardening.
  - M-SF-3 Move remaining business logic out of API transport.
  - M-SF-4 Centralize permissions and typed error/contract mapping.
  - M-SF-5 Auth monitor hardening batch.

## Scope

1. Classify all currently unclassified exported Drizzle tables in `packages/domain/src/tenant-registry.ts`.
2. Make `TenantDB` fail closed for null-tenant FLAT operations and make REFERENTIAL misuse tests non-vacuous.
3. Align shared role schemas and add `SALES_REP` / `SALES_ADMIN` / active app roles across auth/types/API.
4. Complete Postgres-backed auth rate limiter design or explicitly subsume `rate_limiter_v2_20260603` into this track.
5. Add tested shared response-envelope, error, and role contracts to `@reading-advantage/types`.
6. Move remaining shared-package business logic out of API/router transport where identified by Shared Foundation review.

## Non-Goals

- Do not migrate all Reading/Primary route handlers in this wave; Wave 1 owns app-specific migration.
- Do not import Advantage Games into product apps.
- Do not change public website claims.
- Do not add OAuth/social login/passwordless auth.

## Acceptance Criteria

- `tenant-coverage.test.ts` passes and fails meaningfully when a table is unclassified or a REFERENTIAL table is queried without explicit `unscoped("reason")`.
- Null tenant cannot perform FLAT table select/insert/update/delete through `TenantDB`.
- Shared role schemas include every active app role and have tests in `@reading-advantage/types`.
- Auth rate limiting is not process-local in production paths.
- Shared contracts have behavioral tests and are consumed by at least one API/router boundary.
- `packages/api` no longer contains the reviewed shared-foundation business-logic leakage sites.
- Required gates pass or documented pre-existing failures are explicitly linked to follow-up remediation.

## Required Verification Commands

```bash
CI=true pnpm turbo run test --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api
CI=true pnpm turbo run check-types --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=@reading-advantage/types --filter=@reading-advantage/auth --filter=@reading-advantage/api
CI=true pnpm turbo run lint --filter=@reading-advantage/domain --filter=@reading-advantage/auth --filter=@reading-advantage/api
```
