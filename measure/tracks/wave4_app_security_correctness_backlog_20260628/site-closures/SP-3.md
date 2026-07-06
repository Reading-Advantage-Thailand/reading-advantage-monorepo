# Site-Closure Checklist — Science SP-3 (TenantDB adoption lint/guard)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 1
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` SP-3 (resolves raw-`db` deviation class B1 across ST-1/ST-2)
> **Green SHA:** `94db362d` — `feat(science): p1 green tenant scoping (track_id: wave4_app_security_correctness_backlog_20260628)`
> **Shared:** Reading/Primary migrations need the same guard; this checklist covers the Science-side guard. A monorepo-wide guard is out of Wave 4 scope unless added opportunistically.
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Baseline raw-`@reading-advantage/db` imports in Science APP code (non-test)

Captured at baseline SHA `e4266b88`. Count = 11 files in production source
code (excluding tests):
- `apps/science-advantage/lib/auth/session.ts`
- `apps/science-advantage/lib/gamification/xp.ts`
- `apps/science-advantage/lib/gamification/streak.ts`
- `apps/science-advantage/lib/gamification/badges.ts`
- `apps/science-advantage/lib/utils/generateJoinCode.ts`
- `apps/science-advantage/lib/services/classes/get-class-detail.ts`
- `apps/science-advantage/lib/services/classes/get-student-classes.ts`
- `apps/science-advantage/lib/services/mastery/mastery-worker.ts`
- `apps/science-advantage/lib/services/mastery/standard-mastery.ts`
- `apps/science-advantage/lib/ai/recommendation-context.ts`
- `apps/science-advantage/app/api/admin/dsar/export/route.ts`

## Affected same-class sites

| # | Site | Required state | Status |
|---|---|---|---|
| 1 | `apps/science-advantage/lib/gamification/xp.ts`, `streak.ts`, `badges.ts` | Caller provides a TenantDB; no raw `db` import | 🟢 fixed (Green SHA `94db362d`) |
| 2 | `apps/science-advantage/lib/services/classes/get-class-detail.ts`, `get-student-classes.ts` | Caller provides a TenantDB; no raw `db` import | 🟢 fixed (Green SHA `94db362d`) |
| 3 | `apps/science-advantage/lib/services/mastery/mastery-worker.ts`, `standard-mastery.ts` | Caller provides a TenantDB; no raw `db` import | 🟢 fixed (Green SHA `94db362d`) |
| 4 | `apps/science-advantage/lib/utils/generateJoinCode.ts` | Caller provides a `db`; no default `db` import | 🟢 fixed (Green SHA `94db362d`) |
| 5 | `apps/science-advantage/lib/ai/recommendation-context.ts` | Caller provides a `db`; no raw `db` import | 🟢 fixed (Green SHA `94db362d`) |
| 6 | `apps/science-advantage/app/api/admin/dsar/export/route.ts` | Uses `tenantDb.unscoped("...")` with a documented reason; `exportSubjectData` applies its own tenant scoping on the `users` table | 🟢 fixed (Green SHA `94db362d`) |
| 7 | `apps/science-advantage/lib/auth/session.ts` | Operates on the `sessions` table which is registered as EXEMPT in `tenant-registry.ts`. Allowlisted with a documented reason. | 🟡 deferred (legitimate EXEMPT; documented in the SP-3 allowlist) |
| 8 | `apps/science-advantage/app/api/ai/recommendations/route.ts`, `app/api/student/classes/route.ts` | Transport-thin route handlers that obtain a raw `db` solely to construct a TenantDB via `createTenantDB(db, tenant)`. Allowlisted with a documented reason (raw client never used for queries directly). | 🟡 deferred (legitimate transport-only; documented in the SP-3 allowlist) |
| 9 | SP-3 guard test (new) — fails when any non-test `.ts` under `apps/science-advantage/{lib,app}` imports `db` directly from `@reading-advantage/db` (excluding the documented allowlist) | Created + wired into CI; second assertion verifies each allowlist entry points at an existing file | 🟢 fixed (Green SHA `94db362d`) |
| 10 | Future raw-`db` imports introduced after the guard | guard must fail CI | ⚪ NA (enforced by guard) |

## Closeout requirement

The SP-3 guard test exists, runs in CI, and exits 0. Defense A7: exclude test files + `lib/test/` by
path, not by bare English words. Defense A12: the named guard file must exist (no dangling ref).

## Evidence

- `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/__tests__/tenant-db-adoption.test.ts --reporter=verbose` → 2/2 pass.
- The allowlist in `tenant-db-adoption.test.ts` documents three entries with per-entry reasons (sessions EXEMPT table; transport-thin routes that only use raw `db` to construct a TenantDB). A second test asserts each entry points at an existing file.