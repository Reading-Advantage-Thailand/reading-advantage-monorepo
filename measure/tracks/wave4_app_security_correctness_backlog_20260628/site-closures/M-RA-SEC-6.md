# Site-Closure Checklist — Reading M-RA-SEC-6 (Admin/SYSTEM license scope hardening)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-6
> **Resolves:** F-RA-007 (license scoping bypass); batches ra-batch-46, ra-batch-47
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/reading-advantage/server/controllers/system-controller.ts` | SYSTEM role accesses arbitrary `licenseId` via query param override without audit | audit-log every SYSTEM `licenseId` override; require `restrictAccessKey` for SYSTEM-level cross-license reads | 🔴 open |
| 2 | `apps/reading-advantage/server/controllers/system-dashboard-controller.ts` | SYSTEM dashboard queries unscoped cross-license | scope to own license OR access-key-gated override | 🔴 open |
| 3 | `apps/reading-advantage/server/controllers/admin-controller.ts` | admin/SYSTEM license operations | enforce license scope; audit events | 🔴 open |
| 4 | `apps/reading-advantage/server/controllers/license-controller.ts` | license management surface | scope + audit | 🔴 open |
| 5 | `apps/reading-advantage/server/middleware/system-key.ts` | SYSTEM key path | rate-limit SYSTEM dashboard queries | 🔴 open |
| 6 | `apps/reading-advantage/app/api/v1/admin/{segments,overview,teacher-effectiveness,alerts}/route.ts` | admin endpoints reachable with license override | enforce scope + audit | 🔴 open |
| 7 | `apps/reading-advantage/app/api/v1/system/{school-classrooms,refresh-views,refresh-views/manual}/route.ts` | system endpoints | scope + audit + rate-limit | 🔴 open |

## Closeout requirement
Every row 🟢/⚪/🟡. Red test: SYSTEM user requests foreign `licenseId` → 403 or audit row created.
Must fail (returns data, no audit) if scope check removed. Defense A2: audit event carries
`licenseId` + `userId` + timestamp. See `test-strategy.md` Phase 3.
