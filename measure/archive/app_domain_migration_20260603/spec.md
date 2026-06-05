# Specification: App → Domain Layer Migration

## Overview

Replace direct `@reading-advantage/db` imports in `apps/science-advantage/app/**/{route,page}.tsx` with calls into `@reading-advantage/domain` (and the existing `apps/science-advantage/lib/services/*` modules, which are the closest thing to a domain layer today). This is the **load-bearing track** of the science-advantage audit — every other section's compliance is downstream of it.

## Problem

Audited 2026-06-03. Finding F-305 (reclassified Critical, umbrella; subsumes F-306, F-405, F-701, F-702):

- **22 of 27 `app/api/**/route.ts` files** import `db` directly from `@reading-advantage/db` (F-307). The 5 clean ones: 4 auth stubs (delegate to `packages/api`) + `app/api/student/classes/route.ts` (delegates to `lib/services/classes/get-student-classes.ts`).
- **2 of 22 `app/**/page.tsx` files** import `db` and run multi-step query orchestration (F-306): `app/(teacher)/teacher/page.tsx:1` (1 select), `app/(teacher)/teacher/classes/page.tsx:3` (2 selects with `count()`, `inArray`, `groupBy`).
- **0 files in `apps/science-advantage/app/`** import from `@reading-advantage/domain`. The domain layer (14 modules, 82 `assertCan` calls, 4,000+ lines) is dead code from this app's perspective.
- **23 hand-rolled `role === '...'` checks** across 17 app files (13 routes + 4 pages) bypass `assertCan`/`roleAtLeast` (F-405).
- **5 spot-checked `route.ts` files are fat** (159–624 lines, multiple inline DB calls) (F-701).
- **26 of 27 routes hand-roll role/ownership checks** instead of calling `requireRole` (F-702).
- **9 `lib/services/*` files** are the natural domain candidates: `lib/services/classes/{get-class-detail,get-student-classes}.ts`, `lib/services/mastery/{mastery-worker,standard-mastery}.ts`, `lib/ai/recommendation-context.ts`, `lib/gamification/{badges,streak}.ts`, `lib/auth/session.ts`, `lib/utils/generateJoinCode.ts`. They are not yet part of `packages/domain` and cannot be reused by other apps.

The root cause is the same: the app bypassed the domain layer on both sides — no `db` import, no `domain` import. The fix is one: get the app to call into domain functions (or services that we'll lift into `packages/domain`).

## Why

Without this track:
- Every new route handler in `apps/science-advantage/` re-invents the wheel (auth, tenancy, validation, error handling).
- The 4 Critical tracks in the audit (Argon2id, Audit Log, TenantDB, plus this one) cannot land cleanly: their changes belong in domain functions, not in 27 hand-rolled route handlers.
- The `packages/domain` package is provably dead code; the team that owns it cannot be confident the next feature is being built on the right foundation.
- Multi-tenancy is structurally unenforceable: Track 2 (TenantDB) cannot protect the app if routes import `db` directly.

## Functional Requirements

### FR-1: Domain Function Re-export from `lib/services/*`

- The 9 `lib/services/*` files in `apps/science-advantage/` are re-exported from a new `lib/services/index.ts` barrel.
- These files keep their current implementation for the duration of this track; Track 8 (Domain Module Decomposition) is the work that lifts them into `packages/domain/src/`.
- Pages and routes that currently import `lib/services/classes/get-class-detail` directly keep that import (no churn). New code uses the barrel.

### FR-2: Pilot Migration — `app/api/student/classes/route.ts` (Already Done)

- `app/api/student/classes/route.ts:42` already delegates to `lib/services/classes/get-student-classes`. No change required.
- Add an integration test asserting the delegation contract (mock `getStudentClasses`, hit the route, confirm the mock is called).
- Use this test as the **template** for the other 22 route migrations.

### FR-3: Migrate 5 High-Traffic Routes

- `app/api/ai/update-mastery/route.ts` (624 lines) → extract the 200-line transaction, the 60-line `loadAttemptContext` helper, the mastery-grade math, the in-memory rate limiter, and the PG error-code branching into `packages/domain/src/mastery/record-run.ts`. Route becomes a 1-line domain call.
- `app/api/lessons/[lessonSlug]/quiz/route.ts` (519 lines) → extract the quiz-grading loop (`gradeAnswer` + `calculateXpForQuiz` + `awardXp` + `updateStreakForProfile` + `checkBadgeConditions` + `processMasteryRun`) into `packages/domain/src/quiz/submit-attempt.ts`. Route becomes a 1-line domain call.
- `app/api/ai/recommendations/route.ts` (400 lines) → extract `loadAttemptWithRelations` (145 lines) and the recommendation-fetch logic into `packages/domain/src/ai/get-recommendation.ts`. Route becomes a 1-line domain call.
- `app/api/classes/[classId]/assignments/route.ts` (364 lines) → extract GET/POST/DELETE handlers into `packages/domain/src/classes/{list,create,delete}-assignment.ts`. Route becomes 3 lines.
- `app/api/teachers/classes/[classId]/intervention-alerts/route.ts` (287 lines) → extract the cache logic and SQL fragment into `packages/domain/src/interventions/list-alerts.ts`. Route becomes a 1-line domain call.

### FR-4: Migrate Remaining 17 Routes

- Batch the remaining 17 in groups of 5 (3 batches after Phase 3): `app/api/classes/*` (6 files), `app/api/students/*` (8 files), `app/api/lessons/*` (2 files), `app/api/teachers/*` (1 file).
- Pattern: extract the DB calls + business logic into `packages/domain/src/<module>/<verb>.ts`; reduce the route to `return handler(input)` or equivalent.
- Per-batch validation: lint, type-check, integration tests.

### FR-5: Migrate 2 Pages

- `app/(teacher)/teacher/page.tsx` (1 select + UI dispatch) → call `getTeacherClasses(teacherId)` from `packages/domain/src/teachers/`.
- `app/(teacher)/teacher/classes/page.tsx` (2 selects + JS Map merge) → call `getTeacherClassesWithCounts(teacherId)`.
- **Note:** `teachers/` does not exist as a `packages/domain/src/` module today. Phase 1 of this track creates it.

### FR-6: Replace 23 Hand-Rolled `role === '...'` Checks

- For each of the 23 hand-rolled role checks, map to a permission key in `packages/auth/src/permissions.ts` (or add a new key if none exists).
- Add a `requirePermission(key)` HOF in `packages/auth/src/server.ts` if missing (the existing `requireRole(role)` is too narrow for permission keys like `gamification:read:all`).
- Replace each `if (session.user.role === 'X')` with `assertCan(user, "<key>", tenant)` in the new domain function (where the role check now lives).
- Per replacement: add a unit test asserting the permission key is enforced and the role check is gone.

### FR-7: Replace 26 Hand-Rolled Authz Patterns in Routes

- The 23 `role ===` checks plus 3 ownership patterns (`teacherId === userId`, `studentId === userId`, `isAdmin`) collapse into the new domain function's `assertCan` call.
- A `requirePermission(key, ctx)` HOF wraps each route handler: `export async function POST(req) { return requirePermission('class:create', { schoolId, user })(async () => { ... }) }`.
- Test: integration test that calls each of the 27 routes with a STUDENT cookie + ADMIN cookie + no cookie, confirming the expected access pattern.

### FR-8: Test Re-pointing

- All 22 `app/api/**/route.integration.test.ts` files that currently mock `db.select`/`db.insert` are re-pointed to mock the new domain function.
- The existing test assertions (response shape, status codes) are preserved.
- New tests for the 2 page migrations (server-render assertions).

### FR-9: New `packages/domain/src/teachers/` Module

- The 2 page migrations in FR-5 need a `teachers/` module that does not exist.
- Create `packages/domain/src/teachers/{schema,contracts,queries,mutations,permissions,errors,index}.ts` with at minimum: `getTeacherClasses(teacherId)`, `getTeacherClassesWithCounts(teacherId)`.
- Per AGENTS.md §3.5: 6 files (schema, contracts, queries, mutations, permissions, errors) + barrel `index.ts`. Track 8 (Domain Module Decomposition) will retro-fit the same shape to the other 13 modules.

## Non-Functional Requirements

- **Zero `import { db } from '@reading-advantage/db'` in `apps/science-advantage/app/**/{route,page}.tsx`.** Grep gate: `rg -l "from ['\"]@reading-advantage/db['\"]" apps/science-advantage/app/ -g '!**/*.test.*' -g '!**/*.integration.test.*'` returns 0 hits.
- **Zero `role === '...'` checks in `apps/science-advantage/app/`.** Grep gate: `rg -nE "role === ['\"][A-Z]+['\"]|role !== ['\"][A-Z]+['\"]" apps/science-advantage/app/ -g '!**/*.test.*'` returns 0 hits.
- **All 27 `route.ts` files < 50 lines** (per AGENTS.md §7.1 — thin route handlers).
- **All 22 `page.tsx` files delegate data fetching to `packages/domain` or `lib/services`.**
- All existing 88 test files still pass (re-pointed to the new domain functions).
- Lint + type-check + build green for `apps/science-advantage` and the affected `packages/domain` modules.

## Acceptance Criteria

1. `rg -l "from ['\"]@reading-advantage/db['\"]" apps/science-advantage/app/ -g '!**/*.test.*'` returns **0 hits**
2. `rg -nE "role === ['\"][A-Z]+['\"]|role !== ['\"][A-Z]+['\"]" apps/science-advantage/app/ -g '!**/*.test.*'` returns **0 hits**
3. `wc -l app/api/**/*.route.ts` reports < 50 lines per file for all 27 routes
4. All 22 `app/**/page.tsx` files delegate to `packages/domain` or `lib/services` (no direct `db` import)
5. `packages/domain/src/teachers/` module created with at minimum `getTeacherClasses` + `getTeacherClassesWithCounts`
6. `pnpm turbo run lint --filter=science-advantage` exits 0
7. `pnpm turbo run test --filter=science-advantage` exits 0
8. `pnpm turbo run check-types --filter=science-advantage` exits 0 (depends on Track 11)
9. `pnpm turbo run build --filter=science-advantage` exits 0
10. `pnpm turbo run test --filter=@reading-advantage/domain` exits 0 with the new `teachers/` tests
11. `lib/services/index.ts` barrel created
12. 23 hand-rolled `role ===` checks mapped to `assertCan` calls (audit table in `plan.md` Phase 6)
13. `measure/tech-debt.md` row `audit_20260603_domain_bypass` marked `Resolved`

## Out of Scope

- Decomposing the 14 existing `packages/domain/src/<module>/` modules into per-concern files (`schema.ts`, `queries.ts`, etc.) — separate track (Track 8).
- Replacing inline `assertCan` calls with `command({ input, output, auth, authorize, handler })` wrappers — separate track.
- Multi-tenancy migration (add `schoolId` to science tables, use `createTenantDB` everywhere) — separate track (Track 2).
- AI/storage/email adapter packages — separate tracks (5, 6).
- Argon2id migration of `packages/auth` — separate track (Track 3).
- Audit log infrastructure — separate track (Track 4).

## Constraints & Risks

- **Risk: 14 routes + 2 pages + 14 scripts is a large surface.** Mitigation: pilot on 5 high-traffic routes first (FR-3), prove the pattern, then batch the remaining 17 in groups of 5. ~3 weeks for the 22 routes, ~3 days for the 2 pages, ~1 day for the script refactor.
- **Risk: existing `route.integration.test.ts` tests are tightly coupled to `db` mock shapes.** Mitigation: re-point to mock the new domain function (FR-8); the response shape is preserved.
- **Risk: Track 8 (Domain Module Decomposition) is the same `packages/domain/src/` directory and may conflict.** Mitigation: Track 8 runs in parallel; this track adds the `teachers/` module and the new `lib/services/{classes,mastery,interventions,assignments}/` lifts, but does not split the existing 14 modules. Coordinate via shared `packages/domain/src/index.ts` barrel updates.
- **Risk: `requirePermission(key)` HOF is new surface; existing `requireRole` is used in 1 route + many pages.** Mitigation: keep `requireRole` as a thin wrapper around `requirePermission(roleAtLeast)`; the new HOF handles permission keys like `gamification:read:all`.
- **Risk: AGENTS.md §3.5 mandates `command()` wrapper for new code.** Mitigation: this track uses the existing `assertCan` pattern (AGENTS.md allows both) for parity with the rest of `packages/domain`. Track 8 introduces `command()` for the split modules.

## References

- `measure/audit-reports/science-advantage_20260603/findings.md` §Section 3 (F-301 to F-307) and §Section 2 (F-203, F-208)
- `measure/audit-reports/science-advantage_20260603/migration-tracks.md` §Track 1
- `packages/domain/src/db-contract.ts:167` (`createTenantDB`)
- `packages/auth/src/permissions.ts` (central `PERMISSIONS` map)
- `lib/auth/server.ts` (the existing `requireAuth`/`requireRole` HOFs that this track unifies under `requirePermission`)
