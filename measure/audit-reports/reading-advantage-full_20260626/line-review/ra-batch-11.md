# Line Review: ra-batch-11

> **Track:** `reading_advantage_full_review_20260626`
> **Reviewer:** Measure Review A — Correctness and Architecture
> **Date:** 2026-06-27
> **Baseline SHA:** `6921fda0ee45012232bdd71c444d4e9523a10ab6`
> **Batch:** ra-batch-11 (20 files: flashcard API routes and game API routes)

---

## Coverage

| Category | Files | Lines Reviewed |
|----------|-------|----------------|
| Flashcard results / ordering / progress | 10 | 371 |
| Flashcard deck info / stats / vocab / sentences | 4 | 101 |
| Castle Defense game API | 3 | 51 |
| Dragon Flight game API | 3 | 67 |
| Castle Defense / Dragon Flight ranking | 2 | 40 |
| **Total** | **20** | **640** |

Only the route files listed in `/tmp/opencode/ra-batch-11` were reviewed line-by-line. The underlying controllers (`flashcard-controller.ts`, `castle-defense-controller.ts`, `dragon-flight-controller.ts`, `auth-controller.ts`) and related schema files were read to trace behavior and ownership, but they are not part of the line count.

---

## Executive Summary

All 20 routes share the same architectural pattern: a thin `next-connect` wrapper that applies `logRequest` + `protect`, then delegates to a controller. None of the routes perform input validation, rate limiting, audit logging, or transaction orchestration. Two routes still import `db` directly and implement queries inline, bypassing the shared domain layer entirely.

The flashcard and game completion paths are **idempotent-unsafe**: they trust client-reported scores, award XP, insert activity logs, and update rankings in separate, non-atomic statements with a timestamp-based `targetId`. A replay or parallel submission duplicates rewards and corrupts FSRS scheduling/leaderboards.

Cross-tenant isolation is weak. The `id`/`deckId` params rely on `assertSelfOrAllowedStaff`, which grants global `ADMIN`/`TEACHER` access without school/license scoping. Game-ranking queries fall back to an unscoped result if the caller has neither `licenseId` nor `schoolId`.

There are **zero route/controller tests** for these endpoints. Existing tests cover only client-side game logic.

---

## Findings

### F-RA-B11-001: No route-level input validation on any of the 20 endpoints

**Severity:** High  
**Category:** Validation / API Contract

Every route parses `req.json()` or `req.nextUrl.searchParams` directly and forwards the raw object to controllers. No Zod schemas, no `parseBody`/`parseQuery` helpers, and no enum/range checks are present.

Examples:

- `apps/reading-advantage/app/api/v1/flashcard/cloze-test/results/route.ts:13-14` — `POST` body forwarded to `saveClozeTestResults`.
- `apps/reading-advantage/app/api/v1/flashcard/progress/update/route.ts:20` — destructures `cardId`, `rating`, `type` from raw JSON.
- `apps/reading-advantage/app/api/v1/games/castle-defense/complete/route.ts:15-16` — `correctAnswers`, `totalAttempts`, `accuracy`, etc. are accepted from client.
- `apps/reading-advantage/app/api/v1/games/dragon-flight/complete/route.ts:16-17` — same pattern.

**Impact:** Invalid payloads reach the DB; FSRS `rating` is silently defaulted to `Good`; `difficulty` strings are inserted into `gameRankings` without whitelist checks; malformed `gameSession` strings are used in `targetId`.

**Linked track:** M-RA-SEC-7 (Zod Input Validation), C-3 (Input Validation Hardening)

---

### F-RA-B11-002: Direct DB/domain bypass in `deck-id` and `progress/update` routes

**Severity:** High  
**Category:** Architecture / AGENTS.md Compliance

Two of the 20 routes import `@reading-advantage/db` directly and implement business logic inline instead of routing through `@reading-advantage/domain`.

Evidence:

- `apps/reading-advantage/app/api/v1/flashcard/deck-id/route.ts:3-4`
  ```typescript
  import { db, eq } from "@reading-advantage/db";
  import { userSentenceRecords } from "@reading-advantage/db/schema";
  ```
- `apps/reading-advantage/app/api/v1/flashcard/progress/update/route.ts:3-7`
  ```typescript
  import { db, eq } from "@reading-advantage/db";
  import {
    userWordRecords,
    userSentenceRecords,
  } from "@reading-advantage/db/schema";
  import { fsrs, generatorParameters, Rating, State } from "ts-fsrs";
  ```

Both routes reproduce FSRS/progress concerns that belong in the domain layer. They also bypass `TenantDB`/`assertCan` patterns required by AGENTS.md.

**Impact:** Business logic remains trapped in route handlers; tenant scoping, audit logging, and idempotency cannot be enforced consistently.

**Linked track:** M-RA-SEC-8 (Domain Layer Migration)

---

### F-RA-B11-003: Auth middleware only verifies login, not role or tenant

**Severity:** High  
**Category:** Auth / Tenancy

All routes use `protect` from `auth-controller.ts:13-29`, which only checks `getCurrentUser()`. It does not enforce roles, school scope, or license scope. None of the 20 routes use `restrictTo` or `@reading-advantage/auth` `assertCan`.

Evidence:

- `apps/reading-advantage/server/controllers/auth-controller.ts:18-28`
  ```typescript
  const user = await getCurrentUser();
  if (!user) { ... }
  req.session = { user };
  return next();
  ```

**Impact:** Any logged-in user (including a compromised student account or a user from another tenant) can hit game-complete, flashcard-progress, and ranking endpoints. Staff escalation paths are unscoped (see F-RA-B11-004).

**Linked track:** M-RA-SEC-1 (Tenant/School Scoping), C-4 (Authentication Audit)

---

### F-RA-B11-004: Cross-tenant data access via `id`/`deckId` params and ranking fallback

**Severity:** Critical  
**Category:** Tenancy

Routes that take an `id` or `deckId` param rely on `assertSelfOrAllowedStaff`:

- `apps/reading-advantage/server/controllers/auth-controller.ts:112-128`
  ```typescript
  if (sessionUser.id === routeUserId) return true;
  const allowedRoles: string[] = ["ADMIN", "TEACHER"];
  if (allowedRoles.includes(sessionUser.role)) { return true; }
  ```

This grants any `ADMIN` or `TEACHER` access to any user's flashcard stats/progress/deck, across schools/licenses, because it does not verify that the target user belongs to the caller's tenant.

Game ranking queries have a similar leak:

- `apps/reading-advantage/server/controllers/castle-defense-controller.ts:179-185`
- `apps/reading-advantage/server/controllers/dragon-flight-controller.ts:171-177`

```typescript
if (currentUser.licenseId) {
  rankingConditions.push(eq(users.licenseId, currentUser.licenseId));
} else if (currentUser.schoolId) {
  rankingConditions.push(eq(users.schoolId, currentUser.schoolId));
}
```

If a user record has neither `licenseId` nor `schoolId`, only `eq(gameRankings.gameType, ...)` remains and the endpoint returns global rankings for all users.

**Impact:** Teacher/admin users from one school can read or update another school's student flashcard records; unscoped users can view global leaderboards.

**Linked track:** M-RA-SEC-1 (Tenant/School Scoping Enforcement)

---

### F-RA-B11-005: XP, level, and ranking integrity rely on client-reported values

**Severity:** Critical  
**Category:** Correctness / Game Integrity

All game completion endpoints accept `correctAnswers`, `totalAttempts`, `accuracy`, `score`, and `timeTaken` from the client and compute rewards from them. There is no server-side recount, signature, or game-state token.

Evidence:

- `apps/reading-advantage/server/controllers/castle-defense-controller.ts:22-49`
  ```typescript
  const { score, correctAnswers, totalAttempts, accuracy, difficulty = "normal", gameTime } = body;
  const xpEarned = Math.floor(correctAnswers * accuracy);
  ```
- `apps/reading-advantage/server/controllers/dragon-flight-controller.ts:21-48` — identical formula.
- `apps/reading-advantage/server/controllers/flashcard-controller.ts:1313-1350` (sentence ordering) and `1521-1550` (word ordering) use `correctAnswers` directly.
- `apps/reading-advantage/server/controllers/flashcard-controller.ts:925-937` (cloze test) uses `totalScore` directly.

**Impact:** A client can inflate accuracy or correct-answer counts to harvest XP and climb leaderboards.

**Linked track:** M-RA-PB-1 (XP/Level Progression Idempotency), M-RA-SEC-8

---

### F-RA-B11-006: Replay / double-submit risk on all completion and progress endpoints

**Severity:** Critical  
**Category:** Correctness / Replay Resistance

None of the completion endpoints use an idempotency key, unique client nonce, or upsert-on-unique-constraint to prevent duplicate submissions.

Evidence:

- `apps/reading-advantage/server/controllers/castle-defense-controller.ts:51-52`
  ```typescript
  const uniqueTargetId = `castle-defense-${userId}-${Date.now()}`;
  ```
- `apps/reading-advantage/server/controllers/dragon-flight-controller.ts:50-51`
  ```typescript
  const uniqueTargetId = `dragon-flight-${userId}-${Date.now()}`;
  ```
- `apps/reading-advantage/server/controllers/flashcard-controller.ts:984-985` (cloze), `1448-1449` (sentence ordering), `1657-1658` (word ordering) all build target IDs from `userId-${Date.now()}` or an optional `gameSession`.

`user_activity` has a unique constraint on `(userId, activityType, targetId)`, but because `targetId` always contains a timestamp, the constraint never blocks replays. XP logs and ranking upserts therefore run repeatedly.

**Impact:** Replaying a game-complete request duplicates XP, activity, and leaderboard entries. Replaying flashcard progress calls advances `reps` and mutates `due` dates.

**Linked track:** M-RA-PB-1 (XP/Level Progression Idempotency)

---

### F-RA-B11-007: FSRS progress update lacks rating validation and concurrency protection

**Severity:** High  
**Category:** Correctness / SRS Integrity

`progress/update/route.ts` and `updateFlashcardProgress` in `flashcard-controller.ts` accept any numeric `rating` and fall back to `Rating.Good` for unexpected values.

Evidence:

- `apps/reading-advantage/app/api/v1/flashcard/progress/update/route.ts:80-96`
- `apps/reading-advantage/server/controllers/flashcard-controller.ts:210-227`

```typescript
switch (rating) {
  case 1: ... case 4: ...
  default: selectedSchedule = schedulingInfo[Rating.Good];
}
```

There is no check that `rating` is 1-4, no validation of `type`, no transaction around the read→FSRS compute→update sequence, and no `updatedAt` timestamp is set in `progress/update/route.ts`.

**Impact:** Concurrent progress calls can overwrite each other, and invalid ratings silently become `Good`, distorting spaced-repetition schedules.

**Linked track:** M-RA-PB-1, M-RA-SEC-7

---

### F-RA-B11-008: Inconsistent and misleading HTTP error response shapes

**Severity:** Medium  
**Category:** API Contract

Routes return a mixture of:

1. `NextResponse.json(payload, { status: N })` (proper HTTP status)
2. `NextResponse.json({ message, status: N })` (HTTP 200 with status inside body)
3. `throw new Error(...)` (uncaught 500)

Examples of (2):

- `apps/reading-advantage/app/api/v1/flashcard/progress/update/route.ts:13-18`
  ```typescript
  return NextResponse.json({ message: "Unauthorized", status: 403 });
  ```
- `apps/reading-advantage/app/api/v1/flashcard/deck-id/route.ts:11-17` is correct (HTTP 401).

Examples of (3):

- `apps/reading-advantage/app/api/v1/flashcard/cloze-test/results/route.ts:15-20`
  ```typescript
  if (result instanceof NextResponse) { return result; }
  throw new Error("Expected a NextResponse from router.run");
  ```

This pattern appears in most of the `next-connect` route wrappers.

**Impact:** API consumers cannot rely on HTTP status codes; errors may be swallowed or surfaced as 500s.

**Linked track:** C-2 (API Contract Standardization)

---

### F-RA-B11-009: Type safety eroded by `as any` casts and `req: any`

**Severity:** Medium  
**Category:** Architecture / Type Safety

Routes register handlers with `as any` and the client progress route types the request as `any`.

Evidence:

- `apps/reading-advantage/app/api/v1/flashcard/cloze-test/results/route.ts:11`
  ```typescript
  router.post(saveClozeTestResults) as any;
  ```
- `apps/reading-advantage/app/api/v1/flashcard/progress/client/route.ts:15`
  ```typescript
  async function updateFlashcardProgressClient(req: any, ctx: RequestContext) { ... }
  ```
- `apps/reading-advantage/app/api/v1/games/castle-defense/complete/route.ts:13`
  ```typescript
  router.post(completeGameHandler as any);
  ```

The route-level `NextRequest` is not typed as `ExtendedNextRequest`, so the session injected by `protect` is invisible to TypeScript.

**Impact:** Refactoring the controller signature will not be caught at compile time; runtime type mismatches can leak into the DB.

**Linked track:** C-2, M-RA-SEC-8

---

### F-RA-B11-010: Activity / game-type enum drift in Dragon Flight

**Severity:** Medium  
**Category:** API Contract / Correctness

Castle Defense uses the shared enums:

- `apps/reading-advantage/server/controllers/castle-defense-controller.ts:60,111`
  ```typescript
  activityType: ActivityType.CASTLE_DEFENSE,
  gameType: GameType.CASTLE_DEFENSE,
  ```

Dragon Flight uses string literals:

- `apps/reading-advantage/server/controllers/dragon-flight-controller.ts:59,109`
  ```typescript
  activityType: "DRAGON_FLIGHT",
  gameType: "DRAGON_FLIGHT",
  ```

The Dragon Flight ranking route imports `ActivityType` but never uses it:

- `apps/reading-advantage/app/api/v1/games/dragon-flight/ranking/route.ts:7`

**Impact:** Future enum changes (e.g., renaming) will silently break Dragon Flight activity/ranking joins, while Castle Defense will be caught by the compiler.

**Linked track:** C-2 (API Contract Standardization)

---

### F-RA-B11-011: `updatedAt` not refreshed by FSRS update paths

**Severity:** Medium  
**Category:** Correctness / Data Integrity

`progress/update/route.ts` and `updateFlashcardProgress` update FSRS fields but do not set `updatedAt`.

Evidence:

- `apps/reading-advantage/app/api/v1/flashcard/progress/update/route.ts:99-108`
- `apps/reading-advantage/server/controllers/flashcard-controller.ts:229-238`

`saveClozeTestResults` does set `updatedAt: now` (`flashcard-controller.ts:973`), but the generic progress endpoint does not. `saveSentenceOrderingResults` and `saveWordOrderingResults` also omit `updatedAt`.

**Impact:** Last-modified timestamps are unreliable for progress sync, debugging, and analytics.

**Linked track:** M-RA-PB-1

---

### F-RA-B12-012: No route or controller tests for any of the 20 endpoints

**Severity:** High  
**Category:** Test Gap

No test file imports or exercises these route handlers or their controllers.

Evidence:

- `apps/reading-advantage/lib/games/castleDefense.test.ts` and `apps/reading-advantage/lib/games/dragonFlight.test.ts` cover client-side state machines only.
- Searches for `flashcard-controller`, `castle-defense-controller`, and `dragon-flight-controller` in `*.test.*` files returned no hits.
- No `__tests__` route-handler tests exist for flashcard or game APIs.

**Impact:** Auth bypasses, replay exploits, XP manipulation, and FSRS regressions cannot be detected automatically.

**Linked track:** M-RA-PB-8 (Product-Level Learning Loop Test Suite), C-7 (Controller Test Coverage), C-6 (API Contract Test Suite)

---

### F-RA-B11-013: `deck-id` route returns soft "not found" as HTTP 200

**Severity:** Low  
**Category:** API Contract / UX

`apps/reading-advantage/app/api/v1/flashcard/deck-id/route.ts:27-32`:

```typescript
if (rows.length === 0) {
  return NextResponse.json({
    success: false,
    error: "No sentence flashcard deck found",
  });
}
```

No HTTP status is supplied, so the response is HTTP 200 with `success: false`. The route also ignores the actual deck concept and returns `deckId: user.id`, hard-coding the deck-to-user mapping.

**Impact:** Callers must parse body fields instead of status codes; the deck abstraction is misrepresented.

**Linked track:** C-2

---

### F-RA-B11-014: Castle Defense routes return `router.run` result without NextResponse guard

**Severity:** Low  
**Category:** Robustness

`apps/reading-advantage/app/api/v1/games/castle-defense/complete/route.ts:15-16`, `ranking/route.ts:15-16`, and `sentences/route.ts:15-16`:

```typescript
export async function POST(request: NextRequest) {
  return router.run(request, {}) as Promise<Response>;
}
```

They do not verify that `router.run` returned a `NextResponse` before returning. The Dragon Flight routes do perform this check. If a middleware or handler returns `undefined` or a non-Response value, the Castle Defense routes may return an invalid response.

**Impact:** Minor inconsistency; could mask handler errors.

**Linked track:** C-2

---

### F-RA-B11-015: Dead imports in game routes

**Severity:** Low  
**Category:** Code Quality

- `apps/reading-advantage/app/api/v1/games/dragon-flight/complete/route.ts:5` imports `ExtendedNextRequest` but does not use it.
- `apps/reading-advantage/app/api/v1/games/dragon-flight/ranking/route.ts:5-7` imports `ExtendedNextRequest` and `ActivityType` but does not use either.
- `apps/reading-advantage/app/api/v1/games/dragon-flight/vocabulary/route.ts:5` imports `ExtendedNextRequest` but does not use it.
- `apps/reading-advantage/app/api/v1/games/castle-defense/complete/route.ts:4`, `ranking/route.ts:4`, and `sentences/route.ts:4` import `NextResponse` but do not use it.

**Impact:** Noise; minor lint burden.

**Linked track:** C-9 (Auth Route Consolidation / cleanup)

---

## Anti-Pattern Scan (A3 / A4 / A5)

| Anti-Pattern | Detection | Result |
|--------------|-----------|--------|
| A3 — Digit-only as labeled count | No regex assertions on digit counts in the 20 files | Not present |
| A4 — Vacuous-pass on nothing-done | No "markers consistent" or deliverable-presence checks in these files | Not present |
| A5 — False-claim text vs test reality | No "all checks pass" / "PASS=N, FAIL=0" claims in these files | Not present |

The absence of tests for these endpoints means the conditions for A4/A5 are not exercised here, but the files themselves do not contain the anti-pattern.

---

## Test Gaps Summary

| Area | Coverage |
|------|----------|
| Route handler tests for the 20 files | 0 |
| Controller tests for flashcard / Castle Defense / Dragon Flight | 0 |
| Auth/ownership boundary tests | 0 |
| XP idempotency / replay tests | 0 |
| Tenant isolation tests | 0 |
| FSRS scheduling correctness tests | 0 |
| Client-side game logic tests | `castleDefense.test.ts`, `dragonFlight.test.ts` (do not cover API) |

---

## Recommendations / Linked Migration Tracks

1. **Immediate (Critical):** Add idempotency keys / unique constraints and server-side reward verification before the endpoints can be abused. Track: M-RA-PB-1.
2. **Immediate (Critical):** Enforce tenant/school scoping on all `id`/`deckId` reads and writes; replace `assertSelfOrAllowedStaff` with `assertCan` + `TenantDB`/`unscoped`. Track: M-RA-SEC-1.
3. **High:** Introduce Zod schemas for every body/query/param in these routes and reject invalid FSRS ratings/difficulties. Tracks: M-RA-SEC-7, C-3.
4. **High:** Move flashcard/progress and game completion logic into `packages/domain` with transactions, audit logging, and structured errors. Track: M-RA-SEC-8.
5. **High:** Add controller/route tests covering auth bypass, replay, cross-tenant access, XP math, and FSRS state transitions. Tracks: M-RA-PB-8, C-7, C-6.
6. **Medium:** Standardize error response shapes (HTTP status codes only, no body `status` field). Track: C-2.
7. **Low:** Remove dead imports and align Dragon Flight to use `ActivityType`/`GameType` enums. Track: C-9 / C-2.

---

## Status

Review of the 20 listed files is complete. No remediation was performed. Acceptance of findings and prioritization remain with the track owner.
