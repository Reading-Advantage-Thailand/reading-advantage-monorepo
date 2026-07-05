# Site-Closure Checklist — Science ST-2 (`lib/services/**` auth & tenancy)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 1
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` ST-2
> **Resolves:** HI-01 (F-SA-B24-036/037/044/045/051/056/057), HI-02 (F-SA-B02-003/020/023)
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/science-advantage/lib/services/classes/get-class-detail.ts` | raw `db`; no user context; no `assertCan` | accept `UserContext`+`tenant`; `createTenantDB` + `assertCan("class:read")` | 🔴 open |
| 2 | `apps/science-advantage/lib/services/classes/get-student-classes.ts` | raw `db`; no authz | same pattern | 🔴 open |
| 3 | `apps/science-advantage/lib/services/mastery/mastery-worker.ts` | raw `db`; no tenant scope | `createTenantDB` + `assertCan` | 🔴 open |
| 4 | `apps/science-advantage/lib/services/mastery/standard-mastery.ts` (mastery / `getClassDetailWithCurriculum` path) | raw `db`; no authz | `createTenantDB` + `assertCan` | 🔴 open |
| 5 | `apps/science-advantage/lib/services/index.ts` (barrel re-export surface) | exposes raw-db services | re-export the secured signatures only | 🔴 open |
| 6 | All callers of the four services under `app/api/**` (grep-verified at implementation) | pass no user context | thread `UserContext`+`tenant` from route auth | 🔴 open |

## Closeout requirement
Every row 🟢/⚪/🟡. Red test per service: foreign-tenant call returns empty/throws; removing
`createTenantDB` turns it red. See `test-strategy.md` Phase 1.
