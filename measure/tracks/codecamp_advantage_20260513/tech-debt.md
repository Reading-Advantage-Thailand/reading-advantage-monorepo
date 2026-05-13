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
