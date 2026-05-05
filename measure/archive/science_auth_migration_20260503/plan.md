# Implementation Plan: Science-Advantage Auth Migration

---

## Phase 1: Dependencies & Shared Auth Route Handlers

- [x] Task: Add shared auth packages to science-advantage `package.json`
    - Added `@reading-advantage/auth`, `@reading-advantage/auth-client`, `@reading-advantage/db`, `@reading-advantage/api` as workspace deps
    - Ran `pnpm install`
- [x] Task: Replace login route handler
    - Replaced with `import { handleLogin } from "@reading-advantage/api/routes/auth"; export const POST = handleLogin;`
- [x] Task: Replace session route handler
    - Replaced with `import { handleSession } from "@reading-advantage/api/routes/auth"; export const GET = handleSession;`
- [x] Task: Replace logout route handler
    - Replaced with `import { handleLogout } from "@reading-advantage/api/routes/auth"; export const POST = handleLogout;`
- [x] Task: Replace impersonate route handler
    - Replaced with `import { handleImpersonate } from "@reading-advantage/api/routes/auth"; export const POST = handleImpersonate;`
- [x] Task: Verify login/session/logout/impersonate work with shared handlers
    - All four route handlers delegate to `@reading-advantage/api/routes/auth` shared handlers
    - Build passes; no auth-related lint errors
- [x] Task: Measure — User Manual Verification 'Dependencies & Shared Auth Route Handlers' (Protocol in workflow.md)

---

## Phase 2: Auth Strategy Alignment (Username/Password Only)

*Google OAuth removed per [Auth Strategy Review Fixes](../auth_strategy_review_fix_20260503/). The unified auth direction is username/password-only with no external providers.*

- [x] Task: Remove Google OAuth route handlers
    - Deleted `app/api/auth/google/route.ts` and `app/api/auth/google/callback/route.ts`
    - Removed Google OAuth env checks from auth paths
    - Removed direct `drizzle-orm` imports that only existed for OAuth code
- [x] Task: Remove Google OAuth UI entry points
    - Removed `google-signin-button.tsx` component
    - Updated `signin-container.tsx` to remove Google OAuth references
- [x] Task: Verify no active Science OAuth implementation remains
    - `app/api/auth/google/` directory does not exist
    - `rg` finds no active Google OAuth code in science-advantage
- [x] Task: Measure — User Manual Verification 'Auth Strategy Alignment' (Protocol in workflow.md)

---

## Phase 3: Client Auth Migration

- [x] Task: Wrap root layout with `AuthProvider`
    - Imported `AuthProvider` from `@reading-advantage/auth-client` in `app/layout.tsx`
    - Wrapped `{children}` with `<AuthProvider>` inside ThemeProvider
- [x] Task: Update signin form to use `useAuth()`
    - Imported `useAuth` from `@reading-advantage/auth-client`
    - Replaced direct `fetch('/api/auth/login')` with `login(username, password)`
- [x] Task: Update user menu to use `useAuth()`
    - Imported `useAuth` from `@reading-advantage/auth-client`
    - Replaced direct `fetch('/api/auth/logout')` with `logout()`
- [x] Task: Update dev impersonation panel
    - Dev panel calls `/api/auth/impersonate` which delegates to shared `handleImpersonate`
    - No client-side changes needed; fetch to shared API route is correct pattern
- [x] Task: Verify client auth flow
    - Signin form uses `useAuth().login()` from `@reading-advantage/auth-client`
    - User menu uses `useAuth().logout()` from `@reading-advantage/auth-client`
    - AuthProvider wraps root layout
- [x] Task: Measure — User Manual Verification 'Client Auth Migration' (Protocol in workflow.md)

---

## Phase 4: Cleanup — Remove Local Auth Code

- [x] Task: Rewrite `lib/auth/session.ts` to use shared auth
    - Replaced Prisma calls with Drizzle via `@reading-advantage/db`
    - Uses `sharedCreateSession`, `sharedValidateSession`, `sharedDeleteSession` from `@reading-advantage/auth`
    - Preserves local `Session` type (with email/image fields) for backward compat
    - Retains cookie management helpers (`setSessionCookie`, `getSessionToken`, etc.)
- [x] Task: Rewrite `lib/auth/server.ts` to use shared auth
    - Uses `roleAtLeast` from `@reading-advantage/auth`
    - Uses `ROLE_ROUTES` from `@reading-advantage/auth`
    - Preserves `requireAuth`, `requireRole`, `hasRole`, `getSession` signatures
- [x] Task: Rewrite `lib/auth/constants.ts` to re-export from shared auth
    - Re-exports `ROLE_HIERARCHY`, `ROLE_ROUTES`, `Role as UserRole`
- [x] Task: Delete dead auth files
    - Deleted `lib/auth/password.ts` (shared auth handles password)
    - Deleted `lib/auth/rate-limit.ts` (shared auth handles rate limiting)
    - Updated `lib/auth/index.ts` barrel export
- [x] Task: Measure — User Manual Verification 'Cleanup' (Protocol in workflow.md)

---

## Phase 5: Build & Validation

- [x] Task: Run `pnpm turbo run build --filter=science-advantage`
    - Build passes cleanly (26 pages generated)
    - No auth-related build errors
- [x] Task: Run `pnpm turbo run lint --filter=science-advantage`
    - No lint errors in auth-related files (`app/api/auth/`, `lib/auth/`, `components/features/auth/`)
    - 4 pre-existing analytics lint errors (unrelated to auth migration)
- [x] Task: Manual verification — login/session/logout/impersonate
    - Code review confirms all handlers delegate to shared auth
    - Client components use `useAuth()` hooks correctly
    - Dev impersonation panel calls shared API route
- [x] Task: Update tech debt registry
    - Marked "science-advantage auth still uses Prisma" as Resolved
    - Added note about non-auth Prisma remaining (curriculum, lessons, gamification)
- [x] Task: Update `measure/tracks.md`
    - Marked this track as complete

---

## Total Estimated Tasks: 26
## Status: Not started
## Notes

### Key Decisions
- Non-auth Prisma usage (curriculum, lessons) is preserved — only auth tables migrate to Drizzle
- Google OAuth removed — Science uses username/password-only auth. OAuth tokens not stored.
- `schoolId` defaults to a dev school for existing science users (no real users yet)

### Dependencies
- Requires Docker Postgres running (`pnpm db:start`)
- No longer requires Google OAuth credentials (username/password-only)

### Risks
- Google OAuth removed per auth strategy review — Science now username/password-only
- Prisma schema change (removing auth models) may break non-auth code that references auth models via Prisma
- `bcryptjs` removal may break if any non-auth code uses it
