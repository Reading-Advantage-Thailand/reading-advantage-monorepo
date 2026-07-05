# Site-Closure Checklist — Science SP-3 (TenantDB adoption lint/guard)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 1
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` SP-3 (resolves raw-`db` deviation class B1 across ST-1/ST-2)
> **Shared:** Reading/Primary migrations need the same guard; this checklist covers the Science-side guard. A monorepo-wide guard is out of Wave 4 scope unless added opportunistically.
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Baseline raw-`@reading-advantage/db` imports in Science APP code (non-test)

Captured at baseline SHA. Count = 1 file in app code (excluding tests):
- `apps/science-advantage/app/api/admin/dsar/export/route.ts`

(Science `lib/gamification` and `lib/services/**` use raw `db` internally but import via app-local
`db` client, not the `@reading-advantage/db` package symbol directly — ST-1/ST-2 own those. SP-3
guards the package-import deviation class.)

## Affected same-class sites

| # | Site | Required state | Status |
|---|---|---|---|
| 1 | `apps/science-advantage/app/api/admin/dsar/export/route.ts` (raw `@reading-advantage/db` import) | route through `createTenantDB` OR justify `unscoped("...")` with a reason string | 🔴 open |
| 2 | SP-3 guard test (new) — fails when any non-test `.ts` under `apps/science-advantage/{lib,app}` imports `db` directly from `@reading-advantage/db` | create + wire into CI | 🔴 open |
| 3 | Future raw-`db` imports introduced after the guard | guard must fail CI | ⚪ NA (enforced by guard) |

## Closeout requirement
The SP-3 guard test exists, runs in CI, and exits 0. Defense A7: exclude test files + `lib/test/` by
path, not by bare English words. Defense A12: the named guard file must exist (no dangling ref).
