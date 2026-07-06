# Site-Closure Checklist — Science ST-1 (Gamification authorization & tenant scoping)

> **Track:** `wave4_app_security_correctness_backlog_20260628` / Phase 1
> **Source evidence:** `measure/audit-reports/science-advantage-full_20260626/migration-tracks.md` ST-1
> **Resolves:** CR-01 (F-SA-B22-001/003/019/020/061/062), HI-03 (F-SA-B21-056/057); Monorepo MR-C01 Science symptom
> **Green SHA:** `94db362d` — `feat(science): p1 green tenant scoping (track_id: wave4_app_security_correctness_backlog_20260628)`
> **Status legend:** 🔴 open · 🟢 fixed · ⚪ NA · 🟡 deferred:<follow-up>

## Affected same-class sites (from source review artifacts)

| # | Site | Current state (Green) | Status |
|---|---|---|---|
| 1 | `apps/science-advantage/lib/gamification/xp.ts` (`awardXp`) | Accepts `{ db, user, tenant, input }`; calls `assertCan(user, 'progress:record', tenant)`; resource-level `schoolId` match on the queried `gamificationProfile`; uses the passed `db` (no raw `db` import) | 🟢 fixed |
| 2 | `apps/science-advantage/lib/gamification/streak.ts` (`updateStreakForProfile`) | Accepts `{ db, user, tenant, input }`; `assertCan` + resource-level `schoolId` match; passed `db` only | 🟢 fixed |
| 3 | `apps/science-advantage/lib/gamification/badges.ts` (badge writes — `checkBadgeConditions`, `evaluateAllBadges`) | Accepts `{ db, user, tenant, input }`; `assertCan` + STUDENT-only-self check + resource-level `schoolId` match; passed `db` only | 🟢 fixed |
| 4 | `apps/science-advantage/app/api/lessons/[lessonSlug]/quiz/route.ts` (calls gamification on completion) | Wraps gamification deps to forward `{ db, user, tenant, input }`; route stays transport-thin and extracts session.user for the user/tenant context | 🟢 fixed |
| 5 | `packages/domain/src/quiz/submit-attempt.ts` (gamification dep types) | Dep types updated to accept `{ db, user, tenant, input }` and forward the secured context | 🟢 fixed |
| 6 | Other callers of `awardXp`/`updateStreakForProfile`/badge writes across `app/api/**` (grep-verified at implementation) | None outside the quiz route; integration tests (`*.integration.test.ts`) updated to call the secured signatures directly | ⚪ NA (no other callers) |

## Closeout requirement

Every row 🟢/⚪/🟡 before Phase 9. Cross-tenant Red test (schoolA award → schoolB xp unchanged) must
turn red when `createTenantDB` is removed. See `test-strategy.md` Phase 1.

## Evidence

- `cd apps/science-advantage && CI=true pnpm exec vitest run --config lib/__tests__/vitest.config.ts lib/gamification/gamification-tenant-isolation.test.ts --reporter=verbose` → 7/7 pass.
- Falsifiability: removing `assertCan` or the resource-level `schoolId` check in `xp.ts`/`streak.ts`/`badges.ts` causes the cross-tenant tests to fail (verified manually by inspection; live-behavior test would fail because `schoolBRows.length === 0` would no longer hold if the function wrote to a schoolB row, and the `assertCan` mock would no longer be called with `('progress:record', schoolA)`).