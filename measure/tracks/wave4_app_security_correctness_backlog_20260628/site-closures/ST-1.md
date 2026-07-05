# Site-Closure Checklist — Science ST-1 (Gamification authorization & tenant scoping)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 1
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` ST-1
> **Resolves:** CR-01 (F-SA-B22-001/003/019/020/061/062), HI-03 (F-SA-B21-056/057); Monorepo MR-C01 Science symptom
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (baseline) | Required fix | Status |
|---|---|---|---|---|
| 1 | `apps/science-advantage/lib/gamification/xp.ts` (`awardXp`) | uses raw `db`; no `assertCan`; no tenant scoping | route through `createTenantDB(db, tenant)` + `assertCan(user, "xp:award", tenant)` | 🔴 open |
| 2 | `apps/science-advantage/lib/gamification/streak.ts` (`updateStreakForProfile`) | uses raw `db`; no user-context check | `createTenantDB` + `assertCan` | 🔴 open |
| 3 | `apps/science-advantage/lib/gamification/badges.ts` (badge writes) | raw `db`; no authz | `createTenantDB` + `assertCan` | 🔴 open |
| 4 | `apps/science-advantage/app/api/lessons/[lessonSlug]/quiz/route.ts` (calls gamification on completion) | calls awardXp/updateStreak without authenticated context propagation | pass authenticated `UserContext` + `tenant` into gamification calls | 🔴 open |
| 5 | Any other caller of `awardXp`/`updateStreakForProfile`/badge writes across `app/api/**` (grep-verified at implementation) | tbd per grep | same fix | 🔴 open |

## Closeout requirement
Every row 🟢/⚪/🟡 before Phase 9. Cross-tenant Red test (schoolA award → schoolB xp unchanged) must
turn red when `createTenantDB` is removed. See `test-strategy.md` Phase 1.
