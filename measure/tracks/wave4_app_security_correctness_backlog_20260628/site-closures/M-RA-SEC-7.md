# Site-Closure Checklist — Reading M-RA-SEC-7 (Zod input validation across routes)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 3
> **Source evidence:** `measure/audit-reports/reading-advantage-full_20260626/migration-tracks.md` M-RA-SEC-7
> **Resolves:** F-RA-008 (inconsistent validation), F-RA-011 (raw process.env); batches 09,10,11,14,44,45,46
> **Green SHA:** `1783d9af`
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

> The audit reports "209 route files" and "6+ raw `process.env` reads." Full per-route enumeration
> happens at implementation via grep; the representative + highest-risk sites are listed here.

| # | Site class | Representative sites (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | Route handlers missing Zod input validation | `server/controllers/system-dashboard-controller.ts`, `server/controllers/license-controller.ts` (reviewed batches 44–47) | `parseQuery`/`parseBody`/`parsePath` Zod helpers at every external boundary | 🟢 fixed (`1783d9af`) — both `getSystemDashboard` and `createLicenseKey` now route through the new helpers in `apps/reading-advantage/lib/validations/index.ts`. Green test `__tests__/controllers/zod-validation-red.test.ts` covers both. |
| 2 | Raw `process.env.X` reads outside a validated env module | 32 raw reads across `server/`, `lib/`, `app/` (grep `process.env` at implementation) | `apps/reading-advantage/lib/env.ts` with Zod schema covering all env vars | 🟢 fixed (`1783d9af`) — `lib/env.ts` exports a lazy `env` Proxy; all 32 raw reads replaced. Guard test `__tests__/controllers/env-reads-guard-red.test.ts` reports `Raw process.env hits outside validated env module: 0`. |
| 3 | Shared validation helpers | none | create `parseQuery`/`parseBody`/`parsePath` | 🟢 fixed (`1783d9af`) — `apps/reading-advantage/lib/validations/index.ts` |
| 4 | Remaining 209 route files (long tail) | all `app/api/v1/**/*.ts` route handlers | validate input; track coverage in this checklist | 🟡 deferred:wave4_app_security_correctness_backlog_20260628/Phase 4 — representative sites reviewed in this phase; full 209-file sweep deferred. The `parseQuery`/`parseBody`/`parsePath` helpers are now available for the Phase 4 sweep; each unreviewed route should be flagged with a per-route guard test before claiming closeout. |

## Closeout requirement

Row 1 🟢, Row 2 🟢, Row 3 🟢 with a guard test that exits 0 (`env-reads-guard-red.test.ts`
shows 0 raw reads outside `lib/env.ts`); Row 4 explicitly 🟡:deferred:Phase 4 — full
209-route sweep is larger than one wave and the helper infrastructure is now in
place. Defense A7: the guard test excludes `lib/env.ts` and test files by path,
not by English words. Defense A12: the guard file exists and runs in CI.