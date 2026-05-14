# codecamp-advantage Tech Debt

## Critical: Manual Verification Blocked — Invalid DATABASE_URL

**Status:** Open  
**Discovered:** 2026-05-14 during Phase 0 manual verification  
**Root Cause:** `.env.example` contains `?schema=public` in `DATABASE_URL`, which is not a valid PostgreSQL connection parameter. `postgres-js` passes it as a GUC (Grand Unified Configuration) parameter, causing `PostgresError: unrecognized configuration parameter "schema"` (SQLSTATE 42704).

**Impact:**
- All DB queries fail with 500
- Login endpoint fails (DrizzleQueryError wrapping PostgresError)
- tRPC endpoints silently swallow the error (auth becomes null → 401)
- Manual verification cannot proceed

**Fix:**
Remove `?schema=public` from `DATABASE_URL`:
```
# Before (broken)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codecamp_advantage?schema=public"

# After (fixed)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/codecamp_advantage"
```

Also update `.env.example` so future developers don't copy the bad value.

**Secondary Issues Discovered During Debugging:**
1. `packages/api` `exports` field points to `dist/` — source changes require `pnpm --filter @reading-advantage/api build` before Next.js sees them. Turbopack does NOT auto-rebuild workspace dependencies.
2. `apps/codecamp-advantage/middleware.ts` used `createMiddleware` from next-intl without `[locale]` routes, causing `/` → `/en` redirect/404. Replaced with no-op middleware pending Phase 14 i18n work.
3. `apps/codecamp-advantage/components/providers.tsx` missing `<AuthProvider>` — auth state not managed client-side. UI doesn't reflect login status.
4. `packages/auth-client/src/__tests__/hooks.test.tsx` uses React 18 `createElement` API (third arg for children) which fails type-check in React 19.
5. `codecamp-advantage` app missing auth API routes (`/api/auth/login`, `/api/auth/session`, `/api/auth/logout`) — added during debugging but should be verified as part of the scaffold.

## High: Domain functions without tRPC router procedures

**Status:** Open  
**Discovered:** 2026-05-14 during plan-vs-code review  
**Root Cause:** Domain functions were implemented in Phase 2/6 scope but their corresponding tRPC router procedures were deferred. Currently 11 domain functions have no API endpoint.

**Missing procedures:**
- Phase 3: `getExerciseRepos`, `linkExerciseRepo`, `getPrReviewsForUser`, `createPrReview`, `updatePrReview`, `getPrReviewByPrUrl`
- Phase 2/3: `getModulesByPhase`, `getModuleWithExercises`, `checkModulePrerequisite`
- Phase 6: `createInternAccount`, `listInterns`, `getInternProgress`

**Impact:** Frontend cannot access these features. Phase 4/6 UI work blocked.

**Fix:** Add router procedures in their respective phases (3, 6). Phase 2 plan marker for "Write tRPC router tests for new procedures" should only cover procedures that exist.

## Medium: createPrReview permission design needs product decision

**Status:** Open  
**Discovered:** 2026-05-14 during review  
**Root Cause:** `createPrReview` uses `codecamp:read` (any authenticated user). The spec says PR reviews are triggered by webhook, but the current domain function allows any user to create one. Need to decide: should users submit their own PR URLs, or should only the webhook create reviews?

**Impact:** If users can create reviews, they could create reviews for repos they haven't actually forked. If only webhooks create reviews, the domain function needs a system-level auth path.

**Fix:** Decide before Phase 3 webhook implementation. If webhook-only, add a `codecamp:webhook` permission or system-level auth bypass.

## Medium: No integration tests — mock-DB masks real DB constraint violations

**Status:** Open  
**Discovered:** 2026-05-14 during review (createInternAccount bug proof)  
**Root Cause:** All 43 codecamp domain tests use `createMockDb` with call-count indexing that doesn't validate column names, constraint violations, or transaction semantics. The `createInternAccount` bug (non-existent `passwordHash` column, missing `id` PK) passed all mock tests.

**Impact:** Real runtime failures invisible to test suite.

**Fix:** Add a small integration test suite against a real database for at least the critical paths: `createInternAccount`, `updateUserProgress` (upsert), `saveChatMessage` (transaction). Consider using Docker Postgres in CI.

## Low: listInterns fetches all PR reviews unfiltered

**Status:** Open  
**Discovered:** 2026-05-14 during review  
**Root Cause:** `const allReviews = await db.select().from(codecampPrReviews)` loads every PR review into memory before filtering per-intern in JS.

**Impact:** Fine at current scale. Becomes O(n) memory as reviews grow.

**Fix:** When intern count or review volume grows, filter reviews by intern user IDs using `inArray(codecampPrReviews.userId, internIds)`.

## Low: Dashboard doesn't group modules by phase

**Status:** Open  
**Discovered:** 2026-05-14 during review  
**Root Cause:** `app/page.tsx` renders modules as a flat grid. The `phase` field is now available from the API but the UI doesn't use it yet.

**Impact:** 18 modules displayed as flat list is overwhelming. Phase grouping is a core UX requirement from the spec.

**Fix:** Phase 4 UI work — update dashboard to render phase sections (Foundations, Frameworks, Backend & Data, Production).
