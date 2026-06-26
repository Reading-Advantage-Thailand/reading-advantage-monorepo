# Specification: Shared Foundation Review

## Overview

Review the shared package foundation that all app reviews depend on. This track must run before deep app reviews because app-level findings often resolve to shared auth, tenancy, validation, database, AI, storage, or transport-layer problems.

## Scope

Primary package scope:

- `packages/db`
- `packages/auth`
- `packages/auth-client`
- `packages/domain`
- `packages/api`
- `packages/ai`
- `packages/storage`
- `packages/webhooks`
- `packages/types`
- `packages/ui`
- `packages/utils`
- `packages/config`
- `packages/integrations/github`
- `packages/reading-advantage-scripts` as legacy script surface

## Review Questions

- Are database schemas, migrations, seeds, and schema exports consistent with the current Drizzle/Postgres model?
- Are all tenant-scoped tables classified and enforced through `TenantDB` or documented referential scoping?
- Are auth/session/password/rate-limit/audit utilities aligned with current architecture decisions?
- Do domain modules own business logic instead of app route handlers?
- Are tRPC and route adapters thin transport layers?
- Do AI, storage, and GitHub integrations use internal adapters instead of provider SDKs in application code?
- Are Zod contracts present at external boundaries?
- Are package-level tests meaningful rather than vacuous wiring tests?
- Are public package exports documented and stable enough for app migration work?

## Required Artifacts

Create `measure/audit-reports/shared-foundation_20260626/` containing:

- `00-inventory.md`
- `checklist.md`
- `findings.md`
- `migration-tracks.md`
- `test-gaps.md`
- `executive-summary.md`

## Non-Goals

- Do not remediate findings except blockers that prevent completing the review.
- Do not perform app feature review in this track.
- Do not treat package test count as proof of behavioral coverage.

## Acceptance Criteria

- Every in-scope package has an inventory entry.
- Shared auth, tenancy, validation, AI, storage, database, API, and webhook boundaries are explicitly scored.
- Findings are deduplicated into shared root causes where possible.
- Migration-track proposals identify which app review tracks are blocked by shared-package issues.
