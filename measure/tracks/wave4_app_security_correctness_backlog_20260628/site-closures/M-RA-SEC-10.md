# Site-Closure Checklist — Reading M-RA-SEC-10 (Metrics/health endpoint hardening)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-10
> **Resolves:** F-RA-013 (unauthenticated metrics endpoints); batches ra-batch-13, ra-batch-14
> **Green SHA:** `1783d9af`
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts + baseline grep)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/app/api/v1/metrics/health/route.ts` | unauthenticated, exposes `materialized_views` + `cache` | `restrictAccessKey` or ADMIN auth; remove detailed DB health from public surface | 🟢 fixed (`1783d9af`) — endpoint now requires ADMIN/SYSTEM session OR a valid `Access-Key` header; response body reduced to `{ status, timestamp }`. Green test `__tests__/controllers/metrics-endpoint-hardening-red.test.ts` asserts no `materialized_views` / `cache` / `matviewHealth` and that `status === "healthy"` |
| 2 | `apps/reading-advantage/app/api/v1/metrics/cache/route.ts` | unauthenticated | `restrictAccessKey` or ADMIN auth | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — sibling metrics endpoint; the SEC-10 Red test only asserts `stream` + `health` + `health/database`; Phase 4 should extend the same gate pattern to `cache` |
| 3 | `apps/reading-advantage/app/api/v1/metrics/stream/route.ts` | unauthenticated | `restrictAccessKey` or ADMIN auth | 🟢 fixed (`1783d9af`) — endpoint now returns 401 when neither ADMIN/SYSTEM nor `Access-Key` is supplied. Green test `metrics-endpoint-hardening-red.test.ts` returns 401 for the unauthenticated case |
| 4 | `apps/reading-advantage/app/api/v1/health/database/route.ts` | exposes DB detail (`performance`, `slowQueries`, `indexUsage`, `tableStats`, `lockStats`, `recommendations`) | remove detail or gate behind ADMIN | 🟢 fixed (`1783d9af`) — response now exposes only `{ status, responseTime, healthScore, connections: { health } }`. Green test asserts none of the sensitive keys leak |
| 5 | Sibling metrics endpoints (`dashboard-summary`, `velocity`, `assignments`, `activity`, `system`, `srs*`, `alignment`, `genres`) | unauthenticated per baseline audit | gate sensitive ones; mark public-by-design ones ⚪ with a test | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — sibling sweep deferred; the Phase 3 representative covers `health` + `stream` + `health/database` |

## Closeout requirement

Rows 1, 3, 4 🟢 with Red tests that fail when auth/audit keys are removed.
Row 2, 5 🟡:deferred:Phase 4 — the sweep across the rest of the metrics
endpoints is larger than one phase; the representative slice + the auth
helper (`assertSystemAccess` + `requireRole`) are now in place. No
endpoint closes on "added auth" claim without a 401 Red test. See
`test-strategy.md` Phase 3.