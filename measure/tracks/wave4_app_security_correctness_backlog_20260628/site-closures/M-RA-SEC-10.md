# Site-Closure Checklist — Reading M-RA-SEC-10 (Metrics/health endpoint hardening)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-10
> **Resolves:** F-RA-013 (unauthenticated metrics endpoints); batches ra-batch-13, ra-batch-14
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts + baseline grep)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/app/api/v1/metrics/health/route.ts` | unauthenticated | `restrictAccessKey` or ADMIN auth; remove detailed DB health from public surface | 🔴 open |
| 2 | `apps/reading-advantage/app/api/v1/metrics/cache/route.ts` | unauthenticated | `restrictAccessKey` or ADMIN auth | 🔴 open |
| 3 | `apps/reading-advantage/app/api/v1/metrics/stream/route.ts` | unauthenticated | `restrictAccessKey` or ADMIN auth | 🔴 open |
| 4 | `apps/reading-advantage/app/api/v1/health/database/route.ts` | exposes DB detail | remove detail or gate behind ADMIN | 🔴 open |
| 5 | `apps/reading-advantage/app/api/v1/metrics/{dashboard-summary,velocity,assignments,activity,system,srs,srs/actions,srs/refresh,alignment,genres,route}.ts` (siblings) | tbd per authz audit | gate sensitive ones; mark public-by-design ones ⚪ with a test | 🔴 open |

## Closeout requirement
Rows 1–4 🟢 with Red tests (401 without key/ADMIN role). Row 5: each endpoint either gated 🟢 or
marked ⚪ public-by-design with a test asserting it returns only non-sensitive aggregates. No
endpoint closes on "added auth" claim without a 401 Red test. See `test-strategy.md` Phase 3.
