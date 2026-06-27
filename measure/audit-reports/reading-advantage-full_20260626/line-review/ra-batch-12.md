# Line Review: ra-batch-12

> **Track:** `reading_advantage_full_review_20260626`  
> **Reviewer:** Measure Review A — Correctness and Architecture  
> **Date:** 2026-06-27  
> **Baseline SHA:** `d348666be047b929d02c747120c32d2ea0fc53fc`  
> **Batch:** ra-batch-12 (20 files: 7 Reading Advantage game API route families)

---

## Coverage

| Game family | Files | Lines reviewed |
|-------------|-------|----------------|
| Dragon Rider | 3 | 51 |
| Enchanted Library | 3 | 51 |
| Magic Defense | 3 | 68 |
| Potion Rush | 3 | 51 |
| RPG Battle | 3 | 63 |
| Rune Match | 3 | 66 |
| Wizard vs Zombie | 2 | 44 |
| **Total** | **20** | **394** |

Only the route files listed in `/tmp/opencode/ra-batch-12` were reviewed line-by-line. The underlying controllers (`dragon-rider-controller.ts`, `enchanted-library-controller.ts`, `magic-defense-controller.ts`, `potion-rush-controller.ts`, `rpg-battle-controller.ts`, `rune-match-controller.ts`, `wizard-zombie-controller.ts`) and `auth-controller.ts`/`server/middleware.ts` were read to trace behavior and ownership, but they are not part of the line count.

---

## Executive Summary

All 20 routes are thin `next-connect` wrappers that apply `logRequest` + `protect` and then delegate to a static controller method. None of the route files perform input validation, rate limiting, audit logging, or transaction orchestration. The real business logic (DB writes, XP calculation, ranking aggregation) lives in the controllers, which import `@reading-advantage/db` directly and bypass the shared `@reading-advantage/domain` layer.

Two distinct route-level patterns are mixed across the seven game families:

- **Dragon Rider, Enchanted Library, Potion Rush** return `router.run(request, {})` directly with a `Promise<Response>` cast and no `NextResponse` guard.
- **Magic Defense, RPG Battle, Rune Match, Wizard vs Zombie** check `result instanceof NextResponse` and throw if the router returns something else.

This inconsistency, plus unused imports and `as any` handler casts, indicates the route files were authored in multiple passes without a shared contract. More importantly, the completion endpoints are idempotent-unsafe and trust client-reported scores, so a replay or parallel submission duplicates XP, activity logs, and leaderboard entries.

No route or controller tests exist for any of these endpoints.

---

## Findings

### F-RA-B12-001: No route-level input validation on any of the 20 endpoints

**Severity:** High  
**Category:** Validation / API Contract

Every route forwards the raw `NextRequest` to a controller method without Zod schemas, `parseBody`/`parseQuery` helpers, or enum/range checks.

Evidence (representative; the same pattern appears in all 20 files):

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts:13-14`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rune-match/ranking/route.ts:12-14`

The controller methods then destructure fields such as `correctAnswers`, `accuracy`, `score`, `difficulty`, and `enemyId` from `req.json()` with only `undefined` checks (see `magic-defense-controller.ts:30-43`, `rpg-battle-controller.ts:35-50`).

**Impact:** Invalid payloads reach the DB; `difficulty` strings are inserted without whitelist checks; `gameRankings.difficulty` can contain arbitrary client values (`"NORMAL"`, `"hard"`, enemy IDs).

**Linked track:** M-RA-SEC-7 (Zod Input Validation Across All Routes)

---

### F-RA-B12-002: Direct DB/domain bypass through controller delegation

**Severity:** High  
**Category:** Architecture / AGENTS.md Compliance

The route files themselves do not import `@reading-advantage/db`, but they are the only public seam for controllers that do. Every controller referenced by these routes imports `db` and schema tables directly and contains inline queries, XP math, and ranking aggregation.

Evidence (route imports → controller imports):

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:5` → `dragon-rider-controller.ts:1-8`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/ranking/route.ts:5` → `enchanted-library-controller.ts:1-8`
- `apps/reading-advantage/app/api/v1/games/potion-rush/sentences/route.ts:5` → `potion-rush-controller.ts:1-8`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/ranking/route.ts:5` → `wizard-zombie-controller.ts:1-8`

None of the routes dispatch through `@reading-advantage/domain`, `assertCan`, or `TenantDB`.

**Impact:** Business logic remains trapped in app-layer controllers; tenant scoping, audit logging, and idempotency cannot be enforced consistently across the 7 game families.

**Linked track:** M-RA-SEC-8 (Domain Layer Migration)

---

### F-RA-B12-003: Auth middleware only verifies login, not role or tenant

**Severity:** High  
**Category:** Auth / Tenancy

All 20 routes use `protect` from `auth-controller.ts:13-29`:

```typescript
const user = await getCurrentUser();
if (!user) { ... }
req.session = { user };
return next();
```

`protect` does not enforce roles, school scope, or license scope. None of the 20 routes call `restrictTo` or use `@reading-advantage/auth` `assertCan`.

Evidence:

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:10`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/vocabulary/route.ts:10`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/ranking/route.ts:10`

**Impact:** Any logged-in user (including a compromised account or a user from another tenant) can submit game completions, read rankings, and retrieve another user's vocabulary/sentence pool. The 403 returned by `protect` for missing sessions is also inconsistent with the 401 returned by controllers when `req.session?.user?.id` is absent.

**Linked track:** M-RA-SEC-1 (Tenant/School Scoping Enforcement)

---

### F-RA-B12-004: Cross-tenant ranking leak if caller lacks `licenseId` and `schoolId`

**Severity:** Critical  
**Category:** Tenancy

The ranking endpoints delegate to controllers that build ranking conditions from the caller's `licenseId` or `schoolId` and fall back to an unscoped query when both are missing.

Evidence in route files (the GET ranking seam):

- `apps/reading-advantage/app/api/v1/games/dragon-rider/ranking/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/ranking/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/magic-defense/ranking/route.ts:13-15`
- `apps/reading-advantage/app/api/v1/games/potion-rush/ranking/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/ranking/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rune-match/ranking/route.ts:12-14`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/ranking/route.ts:12-14`

Controller-side evidence (`dragon-rider-controller.ts:167-184`):

```typescript
if (currentUser.licenseId) {
  rankingConditions.push(eq(users.licenseId, currentUser.licenseId));
} else if (currentUser.schoolId) {
  rankingConditions.push(eq(users.schoolId, currentUser.schoolId));
}
```

If `currentUser.licenseId` and `currentUser.schoolId` are both null/undefined, only `eq(gameRankings.gameType, ...)` remains and the endpoint returns global rankings across all users.

**Impact:** Unscoped or mis-scoped user records can read global leaderboards that may include users from other schools/licenses.

**Linked track:** M-RA-SEC-1

---

### F-RA-B12-005: XP, level, and ranking integrity rely on client-reported values

**Severity:** Critical  
**Category:** Correctness / Game Integrity

All `complete` routes accept `correctAnswers`, `totalAttempts`, `accuracy`, `score`, `xp`, and `difficulty` from the client and forward them to controllers that compute rewards without server-side recount or signature.

Evidence in route files (POST completion seams):

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts:13-14`
- `apps/reading-advantage/app/api/v1/games/potion-rush/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rune-match/complete/route.ts:12-14`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/complete/route.ts:12-14`

Controller-side evidence (`enchanted-library-controller.ts:22-58`):

```typescript
const { score, correctAnswers, totalAttempts, accuracy, difficulty = "normal", gameTime } = body;
const multiplier = difficultyMultipliers[difficulty] || 1.5;
const xpEarned = Math.floor(correctAnswers * accuracy * multiplier);
```

`accuracy` is accepted as a raw number and multiplied directly into XP.

**Impact:** A client can inflate accuracy or correct-answer counts to harvest XP and climb leaderboards.

**Linked track:** M-RA-PB-1 (XP/Level Progression Idempotency), M-RA-SEC-8

---

### F-RA-B12-006: Replay / double-submit risk on all completion endpoints

**Severity:** Critical  
**Category:** Correctness / Replay Resistance

None of the `complete` routes use an idempotency key, unique client nonce, or upsert-on-unique-constraint to prevent duplicate submissions.

Evidence in route files:

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts:13-14`
- `apps/reading-advantage/app/api/v1/games/potion-rush/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/complete/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rune-match/complete/route.ts:12-14`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/complete/route.ts:12-14`

Controller-side evidence (`dragon-rider-controller.ts:51-52`):

```typescript
const uniqueTargetId = `dragon-rider-${userId}-${Date.now()}`;
```

The `user_activity` table has a unique constraint on `(userId, activityType, targetId)`, but because `targetId` always contains a timestamp, the constraint never blocks replays. XP logs and ranking upserts therefore run repeatedly.

**Impact:** Replaying a game-complete request duplicates XP, activity, and leaderboard entries.

**Linked track:** M-RA-PB-1

---

### F-RA-B12-007: Inconsistent `NextResponse` guard pattern across route families

**Severity:** Medium  
**Category:** Robustness / API Contract

Nine routes return `router.run(request, {})` directly with a cast to `Promise<Response>` and never verify that the value is a `NextResponse`:

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/dragon-rider/ranking/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/dragon-rider/vocabulary/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/complete/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/ranking/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/vocabulary/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/potion-rush/complete/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/potion-rush/ranking/route.ts:15-16`
- `apps/reading-advantage/app/api/v1/games/potion-rush/sentences/route.ts:15-16`

Eleven routes check `instanceof NextResponse` and throw a hard error otherwise:

- `apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts:16-21`
- `apps/reading-advantage/app/api/v1/games/magic-defense/ranking/route.ts:17-22`
- `apps/reading-advantage/app/api/v1/games/magic-defense/vocabulary/route.ts:17-22`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/complete/route.ts:15-20`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/ranking/route.ts:15-20`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/vocabulary/route.ts:15-20`
- `apps/reading-advantage/app/api/v1/games/rune-match/complete/route.ts:16-21`
- `apps/reading-advantage/app/api/v1/games/rune-match/ranking/route.ts:16-21`
- `apps/reading-advantage/app/api/v1/games/rune-match/vocabulary/route.ts:16-21`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/complete/route.ts:16-21`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/ranking/route.ts:16-21`

**Impact:** Inconsistent error handling across otherwise identical route shapes; unguarded routes may return a non-`Response` value to Next.js.

**Linked track:** C-2 (API Contract Standardization)

---

### F-RA-B12-008: Type safety eroded by `as any` casts and un-typed request context

**Severity:** Medium  
**Category:** Architecture / Type Safety

Every route registers its controller handler with `as any`, and the exported route function is typed as `NextRequest` instead of `ExtendedNextRequest`, so the `session` injected by `protect` is invisible to TypeScript.

Evidence (`as any` on handler registration):

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:13`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/vocabulary/route.ts:13`
- `apps/reading-advantage/app/api/v1/games/magic-defense/ranking/route.ts:15`
- `apps/reading-advantage/app/api/v1/games/potion-rush/sentences/route.ts:13`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/complete/route.ts:13`
- `apps/reading-advantage/app/api/v1/games/rune-match/vocabulary/route.ts:14`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/ranking/route.ts:14`

Evidence (request typed as `NextRequest`):

- `apps/reading-advantage/app/api/v1/games/dragon-rider/complete/route.ts:15`
- `apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts:16`
- `apps/reading-advantage/app/api/v1/games/rpg-battle/complete/route.ts:15`

**Impact:** Refactoring the controller signature will not be caught at compile time; runtime type mismatches can leak into the DB.

**Linked track:** C-2, M-RA-SEC-8

---

### F-RA-B12-009: Dead imports in route files

**Severity:** Low  
**Category:** Code Quality

Six files import `NextResponse` but never use it (they return `router.run` directly):

- `apps/reading-advantage/app/api/v1/games/enchanted-library/complete/route.ts:4`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/ranking/route.ts:4`
- `apps/reading-advantage/app/api/v1/games/enchanted-library/vocabulary/route.ts:4`
- `apps/reading-advantage/app/api/v1/games/potion-rush/complete/route.ts:4`
- `apps/reading-advantage/app/api/v1/games/potion-rush/ranking/route.ts:4`
- `apps/reading-advantage/app/api/v1/games/potion-rush/sentences/route.ts:4`

Three files import `ExtendedNextRequest` but never use it:

- `apps/reading-advantage/app/api/v1/games/magic-defense/complete/route.ts:5`
- `apps/reading-advantage/app/api/v1/games/magic-defense/ranking/route.ts:5`
- `apps/reading-advantage/app/api/v1/games/magic-defense/vocabulary/route.ts:5`

**Impact:** Lint noise and misleading signal about what the route files actually consume.

**Linked track:** C-9 (Auth Route Consolidation / cleanup)

---

### F-RA-B12-010: Game type enum drift across the seven controllers

**Severity:** Medium  
**Category:** API Contract / Correctness

Three controllers use the shared `ActivityType`/`GameType` enums:

- `dragon-rider-controller.ts:60,111` — `ActivityType.DRAGON_RIDER`, `GameType.DRAGON_RIDER`
- `enchanted-library-controller.ts:69,119` — `ActivityType.ENCHANTED_LIBRARY`, `GameType.ENCHANTED_LIBRARY`
- `potion-rush-controller.ts:69,119` — `ActivityType.POTION_RUSH`, `GameType.POTION_RUSH`

Four controllers use raw string literals:

- `magic-defense-controller.ts:57,105` — `"MAGIC_DEFENSE"`
- `rpg-battle-controller.ts:61,117` — `"RPG_BATTLE"`
- `rune-match-controller.ts:72,122` — `"RUNE_MATCH"`
- `wizard-zombie-controller.ts:64,110` — `"WIZARD_ZOMBIE"` in activity, `"WIZARD_VS_ZOMBIE"` in ranking

The route files are the public seam for this drift; they import controllers but do not enforce a common enum contract.

**Impact:** Future enum changes will silently break activity/ranking joins for Magic Defense, RPG Battle, Rune Match, and Wizard vs Zombie, while the enum-based families will be caught by the compiler.

**Linked track:** C-2 (API Contract Standardization)

---

### F-RA-B12-011: Magic Defense ranking default difficulty is uppercase but buckets are lowercase

**Severity:** Medium  
**Category:** Correctness / Game Integrity

`magic-defense-controller.ts:27` defaults `difficulty` to `"NORMAL"`:

```typescript
difficulty = "NORMAL", // Default to NORMAL if not provided
```

`magic-defense-controller.ts:195-200` groups rankings into lowercase buckets:

```typescript
const sortedRankings: Record<string, RankingEntry[]> = {
  easy: [],
  normal: [],
  hard: [],
  extreme: [],
};
```

A game completed without an explicit `difficulty` writes `"NORMAL"` into `gameRankings.difficulty`, so the ranking row will not match any lowercase bucket and the caller sees an empty ranking for that difficulty.

**Impact:** Default-difficulty Magic Defense completions are effectively invisible in rankings.

**Linked track:** C-2, M-RA-PB-1

---

### F-RA-B12-012: Inconsistent ranking response shape across game families

**Severity:** Medium  
**Category:** API Contract / UX

The ranking endpoints do not return a uniform shape:

- Dragon Rider, Enchanted Library, Magic Defense, Potion Rush return `rankings` grouped by lowercase difficulty (`{ easy: [...], normal: [...], ... }`).
- Rune Match returns a flat `rankings` array with `difficulty` on each row (`rune-match-controller.ts:290-296`).
- RPG Battle and Wizard vs Zombie also return flat arrays with per-row `difficulty` (`rpg-battle-controller.ts:199-224`, `wizard-zombie-controller.ts:271-277`).

The route files expose these differing shapes without an adapter:

- `apps/reading-advantage/app/api/v1/games/dragon-rider/ranking/route.ts:12-13`
- `apps/reading-advantage/app/api/v1/games/rune-match/ranking/route.ts:12-14`
- `apps/reading-advantage/app/api/v1/games/wizard-vs-zombie/ranking/route.ts:12-14`

**Impact:** Frontend consumers must special-case each game family's ranking shape.

**Linked track:** C-2

---

### F-RA-B12-013: No route or controller tests for any of the 20 endpoints

**Severity:** High  
**Category:** Test Gap

No test file imports or exercises these route handlers or their controllers.

Evidence:

- Searches for `dragon-rider-controller`, `enchanted-library-controller`, `magic-defense-controller`, `potion-rush-controller`, `rpg-battle-controller`, `rune-match-controller`, and `wizard-zombie-controller` in `*.test.*` files returned no hits.
- `apps/reading-advantage/lib/games/` tests cover client-side game logic only and do not touch the API surface.
- No `__tests__` route-handler tests exist for the game APIs reviewed in this batch.

**Impact:** Auth bypasses, replay exploits, XP manipulation, tenant leaks, and enum drift cannot be detected automatically.

**Linked track:** M-RA-PB-8 (Product-Level Learning Loop Test Suite), C-7 (Controller Test Coverage), C-6 (API Contract Test Suite)

---

## Anti-Pattern Scan (A3 / A4 / A5)

| Anti-Pattern | Detection | Result |
|--------------|-----------|--------|
| A3 — Digit-only as labeled count | No regex assertions on digit counts in the 20 files | Not present |
| A4 — Vacuous-pass on nothing-done | No "markers consistent" or deliverable-presence checks in these files | Not present |
| A5 — False-claim text vs test reality | No "all checks pass" / "PASS=N, FAIL=0" claims in these files | Not present |

The absence of tests for these endpoints means the conditions for A4/A5 are not exercised here, but the files themselves do not contain the anti-patterns.

---

## Test Gaps Summary

| Area | Coverage |
|------|----------|
| Route handler tests for the 20 files | 0 |
| Controller tests for the 7 game families | 0 |
| Auth/ownership boundary tests | 0 |
| XP idempotency / replay tests | 0 |
| Tenant isolation tests | 0 |
| Game-type enum contract tests | 0 |
| Client-side game logic tests | `lib/games/*.test.*` (do not cover API) |

---

## Recommendations / Linked Migration Tracks

1. **Immediate (Critical):** Add idempotency keys / unique constraints and server-side reward verification before the completion endpoints can be abused. Track: M-RA-PB-1.
2. **Immediate (Critical):** Enforce tenant/school scoping on all ranking and completion queries; replace the unscoped `licenseId`/`schoolId` fallback with `TenantDB`/`assertCan`. Track: M-RA-SEC-1.
3. **High:** Introduce Zod schemas for every body/query/param in these routes and whitelist `difficulty` values. Tracks: M-RA-SEC-7, C-3.
4. **High:** Move game completion and ranking logic into `packages/domain` with transactions, audit logging, and structured errors. Track: M-RA-SEC-8.
5. **High:** Add controller/route tests covering auth bypass, replay, cross-tenant access, XP math, and ranking shapes. Tracks: M-RA-PB-8, C-7, C-6.
6. **Medium:** Standardize error response shapes and adopt one `NextResponse` guard pattern across all game routes. Track: C-2.
7. **Medium:** Align Magic Defense, RPG Battle, Rune Match, and Wizard vs Zombie to use the shared `ActivityType`/`GameType` enums; fix the Magic Defense `"NORMAL"` default. Track: C-2.
8. **Low:** Remove dead imports and decide whether routes should import `ExtendedNextRequest`. Track: C-9.

---

## Disclosures / Out-of-Scope

- Only the 20 route files listed in `/tmp/opencode/ra-batch-12` were reviewed line-by-line. The underlying controllers, schema, and `lib/games` client code were read for context but not line-audited.
- No code changes were made.
- Lint, type-check, test, and build gates were not re-run for this batch; the findings are static-review observations.
- Runtime behavior (actual XP duplication, tenant leakage, enum mismatches) was not verified against a running instance or database.

## Status

Review of the 20 listed files is complete. No remediation was performed. Acceptance of findings and prioritization remain with the track owner.
