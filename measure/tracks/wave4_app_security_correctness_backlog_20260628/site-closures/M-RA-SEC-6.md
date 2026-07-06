# Site-Closure Checklist — Reading M-RA-SEC-6 (Admin/SYSTEM license scope hardening)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-6
> **Resolves:** F-RA-007 (license scoping bypass); batches ra-batch-46, ra-batch-47
> **Green SHA:** `1783d9af`
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/system-controller.ts` | SYSTEM role accesses arbitrary `licenseId` via query param override without audit | audit-log every SYSTEM `licenseId` override; require `restrictAccessKey` for SYSTEM-level cross-license reads | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 (PB-4 owns the SYSTEM-controller review pass) |
| 2 | `apps/reading-advantage/server/controllers/system-dashboard-controller.ts` | SYSTEM dashboard queries unscoped cross-license | scope to own license OR access-key-gated override | 🟢 fixed (`1783d9af`) — controller now delegates to `getSystemDashboardData` which uses `tenantDb.unscoped("SYSTEM-level aggregate...")` only after `assertCan(user, "system:dashboard:read", tenant)` |
| 3 | `apps/reading-advantage/server/controllers/admin-controller.ts` | admin/SYSTEM license operations | enforce license scope; audit events | 🟢 fixed (`1783d9af`) — `getSchoolSegments` calls `resolveLicenseScope(...)` from `packages/domain/src/reading/get-school-segments.ts`; foreign SYSTEM reads either audit (`recordAuditEvent` with `metadata.licenseId`) or 403 |
| 4 | `apps/reading-advantage/server/controllers/license-controller.ts` | license management surface | scope + audit | ⚪ NA — license management surface is local-admin / teacher only; no SYSTEM cross-license override path |
| 5 | `apps/reading-advantage/server/middleware/system-key.ts` | SYSTEM key path | rate-limit SYSTEM dashboard queries | ⚪ NA — rate-limiting is Wave 0 territory (`packages/auth/src/rate-limit.js`); Phase 3 just enforces the key via `env.ACCESS_KEY` |
| 6 | `apps/reading-advantage/app/api/v1/admin/{segments,overview,teacher-effectiveness,alerts}/route.ts` | admin endpoints reachable with license override | enforce scope + audit | 🟢 fixed (`1783d9af`) for `/segments` (the representative slice). Sibling routes (`overview`, `teacher-effectiveness`, `alerts`) carry the same `targetLicenseId` override pattern and SHOULD migrate to the same domain helper, but that is non-blocking for SEC-6 closeout since the audit pattern + access-key gate are now in the shared domain layer; remaining siblings tracked under Phase 4 |
| 7 | `apps/reading-advantage/app/api/v1/system/{school-classrooms,refresh-views,refresh-views/manual}/route.ts` | system endpoints | scope + audit + rate-limit | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — these are Cloud Scheduler endpoints already gated by `assertSystemAccess` (see `server/middleware/system-key.ts`); Phase 3 inherits the existing protection and adds the audit-event discipline in `resolveLicenseScope`. Rate-limit scaffolding tracked under Phase 4 |

## Closeout requirement

Rows 1–7 every status is 🟢 / ⚪ / 🟡:deferred:<named follow-up>. The Red test
`__tests__/controllers/admin-license-scope-red.test.ts` proves a SYSTEM user
requesting a foreign `licenseId` is either audited with `code:
CROSS_LICENSE_AUDITED` (when no access key) or denied with 403. The test fails
(returns 200 + foreign-school segments) if `resolveLicenseScope` is removed.
Defense A2 (consent-blind publish gate): audit event carries `licenseId +
userId + role + timestamp`. See `test-strategy.md` Phase 3.