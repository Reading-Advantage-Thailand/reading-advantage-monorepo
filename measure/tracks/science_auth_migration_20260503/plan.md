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
- [ ] Task: Verify login/session/logout/impersonate work with shared handlers
    - Start dev server, test username/password login
    - Test session check
    - Test logout clears cookie
    - Test impersonation panel
- [ ] Task: Measure — User Manual Verification 'Dependencies & Shared Auth Route Handlers' (Protocol in workflow.md)

---

## Phase 2: Google OAuth Rewrite (Prisma → Drizzle)

- [x] Task: Rewrite `app/api/auth/google/route.ts` to use Drizzle
    - Google route unchanged (no DB usage, just builds OAuth URL)
- [x] Task: Rewrite `app/api/auth/google/callback/route.ts` to use Drizzle
    - Replaced all Prisma queries with Drizzle equivalents
    - Uses `db` from `@reading-advantage/db`, `users`/`accounts`/`schools` from schema
    - Uses `createSession(db, userId)` from `@reading-advantage/auth`
    - Uses `SESSION_COOKIE_NAME` and `ROLE_ROUTES` from shared auth
    - Creates dev school for Google OAuth users
- [ ] Task: Write regression tests for Google OAuth callback
    - Test: new Google user creates user + account + session via Drizzle
    - Test: existing Google user updates tokens and creates new session
    - Test: session cookie is set with correct attributes
- [ ] Task: Verify Google OAuth flow end-to-end
    - Sign in with Google, verify redirect to dashboard
    - Verify session persists across page refresh
- [ ] Task: Measure — User Manual Verification 'Google OAuth Rewrite' (Protocol in workflow.md)

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
- [ ] Task: Update dev impersonation panel
    - In `components/features/auth/dev-impersonation-panel.tsx`, update to call shared impersonate handler
- [ ] Task: Verify client auth flow
    - Login via form, verify auth state updates
    - Logout via menu, verify redirect
    - Impersonation via dev panel
- [ ] Task: Measure — User Manual Verification 'Client Auth Migration' (Protocol in workflow.md)

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
- [ ] Task: Measure — User Manual Verification 'Cleanup' (Protocol in workflow.md)

---

## Phase 5: Build & Validation

- [ ] Task: Run `pnpm turbo run build --filter=science-advantage`
    - Fix any build errors from removed imports or missing types
    - Note: `prisma generate` must run before build (pre-existing infrastructure issue)
- [ ] Task: Run `pnpm turbo run lint --filter=science-advantage`
    - Fix any lint errors introduced by migration
- [ ] Task: Manual verification — login/session/logout/impersonate/Google OAuth
    - Start dev server, test username/password login
    - Test session check
    - Test logout clears cookie
    - Test impersonation panel
    - Test Google OAuth sign-in flow end-to-end
- [ ] Task: Update tech debt registry
    - Mark "science-advantage auth still uses Prisma" as Resolved
    - Note manual verification and non-auth Prisma as open items
- [ ] Task: Update `measure/tracks.md`
    - Mark this track as complete after manual verification

---

## Total Estimated Tasks: 26
## Status: Not started
## Notes

### Key Decisions
- Non-auth Prisma usage (curriculum, lessons) is preserved — only auth tables migrate to Drizzle
- Google OAuth tokens (accessToken, refreshToken, idToken) are stored in the shared `accounts` table's `password` field is NOT used for OAuth; OAuth tokens go in a separate mechanism or are dropped if not needed for API calls
- `schoolId` defaults to a dev school for existing science users (no real users yet)

### Dependencies
- Requires Docker Postgres running (`pnpm db:start`)
- Requires Google OAuth credentials in `.env.local`

### Risks
- Google OAuth callback rewrite is the highest-risk change — must preserve token exchange and user creation flow
- Prisma schema change (removing auth models) may break non-auth code that references auth models via Prisma
- `bcryptjs` removal may break if any non-auth code uses it
