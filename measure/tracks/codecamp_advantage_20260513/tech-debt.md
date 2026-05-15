# codecamp-advantage Tech Debt

## Critical: Manual Verification Blocked — Invalid DATABASE_URL

**Status:** Resolved  
**Discovered:** 2026-05-14 during Phase 0 manual verification  
**Root Cause:** `.env.example` contained `?schema=public` in `DATABASE_URL`, which is not a valid PostgreSQL connection parameter.

**Fix:** Removed `?schema=public` from `DATABASE_URL`. `.env.example` now shows the correct format.

## High: Domain functions without tRPC router procedures

**Status:** Resolved  
**Discovered:** 2026-05-14 during plan-vs-code review  
**Resolution:** All 11 previously missing procedures were added to the codecamp router:
- Phase 3: `getExerciseRepos`, `linkExerciseRepo`, `getPrReviewsForUser`, `createPrReview`, `updatePrReview`, `getPrReviewByPrUrl`
- Phase 2/3: `getModulesByPhase`, `getModuleWithExercises`, `checkModulePrerequisite`
- Phase 6: `createInternAccount`, `listInterns`, `getInternProgress`

## Medium: createPrReview permission design needs product decision

**Status:** Resolved  
**Discovered:** 2026-05-14 during review  
**Resolution:** Changed permission from `codecamp:read` to `codecamp:submit`. Added repo existence validation and duplicate PR URL prevention. Webhook uses a user-scoped path with `codecamp:submit` via the intern's identity.

## Medium: No integration tests — mock-DB masks real DB constraint violations

**Status:** Open  
**Discovered:** 2026-05-14 during review  
**Root Cause:** All codecamp domain tests use `createMockDb` with call-count indexing that doesn't validate column names, constraint violations, or transaction semantics.

**Impact:** Real runtime failures invisible to test suite.

**Fix:** Add a small integration test suite against a real database for at least the critical paths: `createInternAccount`, `updateUserProgress` (upsert), `saveChatMessage` (transaction). Consider using Docker Postgres in CI.

## Low: listInterns fetches all PR reviews unfiltered

**Status:** Resolved  
**Discovered:** 2026-05-14 during review  
**Resolution:** `listInterns` now filters PR reviews using `inArray(codecampPrReviews.userId, internIds)` before loading into memory.

## Low: Dashboard doesn't group modules by phase

**Status:** Resolved  
**Discovered:** 2026-05-14 during review  
**Resolution:** Dashboard (`app/page.tsx`) renders modules grouped by phase (A/B/C/D) with portfolio project context, phase-colored borders, and lock-state computation.
