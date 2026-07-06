# Site-Closure Checklist — Science ST-2 (`lib/services/**` auth & tenancy)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 1
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` ST-2
> **Resolves:** HI-01 (F-SA-B24-036/037/044/045/051/056/057), HI-02 (F-SA-B02-003/020/023)
> **Green SHA:** `94db362d` — `feat(science): p1 green tenant scoping (track_id: wave4_app_security_correctness_backlog_20260628)`
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (Green) | Status |
|---|---|---|---|
| 1 | `apps/science-advantage/lib/services/classes/get-class-detail.ts` | Accepts `{ db, user, tenant, input }`; `assertCan(user, 'class:read', tenant)`; resource-level `schoolId` match on the queried class; uses passed `db` only | 🟢 fixed |
| 2 | `apps/science-advantage/lib/services/classes/get-student-classes.ts` | Accepts `{ db, user, tenant, input }`; `assertCan(user, 'student:read:own' \| 'student:read', tenant)`; rejects STUDENT querying other users; resource-level `schoolId` match on the target student | 🟢 fixed |
| 3 | `apps/science-advantage/lib/services/mastery/mastery-worker.ts` | Accepts `{ db, user, tenant, input }`; `assertCan(user, 'mastery:write:own' \| 'student:read', tenant)`; rejects STUDENT processing non-self mastery; resource-level `schoolId` match on the mastery run; uses passed `db` only | 🟢 fixed |
| 4 | `apps/science-advantage/lib/services/mastery/standard-mastery.ts` (`recordStandardMastery`) | Caller-provided `db` (TenantDB) only — no default `db` import | 🟢 fixed |
| 5 | `apps/science-advantage/lib/services/index.ts` (barrel re-export surface) | Re-exports the secured signatures only | 🟢 fixed |
| 6 | All callers of the four services under `app/api/**` (grep-verified at implementation) | Teacher pages (`app/(teacher)/teacher/classes/[classId]/{page,roster/page,analytics/page}.tsx`), `/api/student/classes`, and `/api/lessons/[lessonSlug]/quiz/route.ts` (via `submitAttempt` deps) thread the authenticated user/tenant and a TenantDB | 🟢 fixed |

## Closeout requirement

Every row 🟢/⚪/🟡. Red test per service: foreign-tenant call returns empty/throws; removing
`createTenantDB` turns it red. See `test-strategy.md` Phase 1.

## Evidence

- `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/services/services-tenant-isolation.test.ts --reporter=verbose` → 6/6 pass.
- Falsifiability: removing `assertCan` or the resource-level `schoolId` check in any of the four service files causes the foreign-tenant Red tests to fail (the AuthError assertion would not fire).
- Integration tests (`lib/services/classes/*.integration.test.ts`, `lib/services/mastery/mastery-worker.integration.test.ts`) updated to use the new `{ db, user, tenant, input }` signature.