# Implementation Plan: Shared Backend Auth Migration

---

## Phase 1: Auth tRPC Procedures

- [ ] Task: Implement auth tRPC router in `packages/api/`
    - `auth.login` — email + password validation, issue JWT pair
    - `auth.register` — create user + credentials in Drizzle, issue JWT pair
    - `auth.googleCallback` — exchange Google OAuth code for profile, upsert user, issue JWT
    - `auth.session` — validate access token, return user + tenant + permissions
    - `auth.refresh` — validate refresh token, issue new access token
    - `auth.logout` — invalidate refresh token in DB
- [ ] Task: Implement JWT token service in `packages/auth/`
    - Access token (15min) with userId, email, role, schoolId
    - Refresh token (7d) stored in DB for revocation
    - Token signing with `JWT_SECRET` env var
    - Token verification used by `isAuthed` middleware
- [ ] Task: Write auth procedure integration tests
    - Login with valid creds → 200 + tokens
    - Login with invalid creds → UNAUTHORIZED
    - Session with expired token → UNAUTHORIZED
    - Refresh with valid token → new access token
    - Logout invalidates token
- [ ] Task: Measure — User Manual Verification 'Auth tRPC Procedures' (Protocol in workflow.md)

## Phase 2: Auth Client Package

- [ ] Task: Create `packages/auth-client/`
    - `useAuth()` — login, register, logout functions + loading/error state
    - `useSession()` — current user, role, tenant, isAuthenticated
    - Token storage strategy (httpOnly cookie or localStorage)
    - Automatic token refresh on 401
    - Redirect to login on session expiry
- [ ] Task: Implement Google OAuth flow in client
    - Redirect to Google consent screen
    - Handle callback, call `auth.googleCallback` procedure
    - Store tokens, redirect to app
- [ ] Task: Write hook unit tests
    - Mock tRPC calls for login/logout/session
    - Assert state transitions
- [ ] Task: Measure — User Manual Verification 'Auth Client Package' (Protocol in workflow.md)

## Phase 3: Migrate reading-advantage

- [ ] Task: Replace Firebase Auth with tRPC auth in reading-advantage
    - Replace `signInWithEmailAndPassword` with `auth.login` procedure call
    - Replace `signInWithPopup(googleProvider)` with OAuth redirect → `auth.googleCallback`
    - Replace `verifyIdToken()` in API routes with tRPC `isAuthed` middleware
    - Preserve `firebaseUid` mapping in Drizzle users table
- [ ] Task: Update reading-advantage login/registration UI
    - Point forms at tRPC auth procedures (via `useAuth()` hook)
    - Maintain existing UI/UX
- [ ] Task: Write migration tests
    - Existing Firebase user can log in via new auth (firebaseUid lookup)
    - New registration creates user via tRPC
- [ ] Task: Measure — User Manual Verification 'Migrate reading-advantage' (Protocol in workflow.md)

## Phase 4: Migrate remaining apps

- [ ] Task: Replace NextAuth with tRPC auth in primary-advantage
    - Remove local `auth.ts`, `auth.config.ts`, `middleware.ts`
    - Use `@reading-advantage/auth-client` hooks
    - Verify Google OAuth callback works
- [ ] Task: Replace NextAuth with tRPC auth in science-advantage
    - Remove local auth config
    - Preserve dev impersonation toggle (adapt to work with tRPC auth)
    - Verify teacher/student role-based UI
- [ ] Task: Update tech debt registry
    - Mark Firebase Auth migration as resolved
    - Mark NextAuth v5 beta as resolved
- [ ] Task: Measure — User Manual Verification 'Migrate remaining apps' (Protocol in workflow.md)

---

## Total Estimated Tasks: 14
## Completed Tasks: 0
## Notes

### Decisions
- Auth is tRPC procedures, not Hono REST endpoints
- JWT with refresh tokens (access 15min, refresh 7d)
- `packages/auth/` provides middleware consumed by tRPC; `packages/auth-client/` provides React hooks consumed by frontends
- Google OAuth only for now
- Firebase Auth removed from auth flow but Firestore remains until data migration

### Dependencies
- Requires `shared_backend_scaffold_20260502` (tRPC setup, auth package, Drizzle schema)
- `packages/db/` must have users table before auth can work
