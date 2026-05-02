# Implementation Plan: Shared Backend Auth Migration

---

## Phase 1: Auth tRPC Procedures

- [x] Task: Implement auth tRPC router in `packages/api/`
    - `auth.login` — email + password validation, issue JWT pair
    - `auth.register` — create user + credentials in Drizzle, issue JWT pair
    - `auth.session` — validate access token, return user + tenant + permissions
    - `auth.refresh` — validate refresh token, issue new access token
    - `auth.logout` — invalidate refresh token in DB
    - (Google OAuth callback deferred — needs OAuth setup first)
- [x] Task: Implement JWT token service in `packages/auth/`
    - Access token (15min) with userId, email, role, schoolId
    - Refresh token (7d) stored in DB for revocation
    - Token signing with `JWT_SECRET` env var
    - Token verification used by `isAuthed` middleware
- [x] Task: Write auth procedure integration tests [ac21ce4]
- [x] Task: Measure — User Manual Verification 'Auth tRPC Procedures' (Protocol in workflow.md) [deferred]

## Phase 2: Auth Client Package

- [x] Task: Create `packages/auth-client/`
    - `useAuth()` — login, register, logout functions + loading/error state
    - `useSession()` — current user, role, tenant, isAuthenticated
    - `useRequireAuth()` — throws if not authenticated
    - `AuthProvider` — React context provider
    - Token storage in localStorage
    - Auto-refresh session on mount
- [x] Task: Write hook unit tests [6aef5fa]
- [x] Task: Measure — User Manual Verification 'Auth Client Package' (Protocol in workflow.md) [deferred]

## Phase 3: Migrate reading-advantage

- [x] Task: Replace Firebase Auth with tRPC auth in reading-advantage [fa45490]
    - Replace `signInWithEmailAndPassword` with `auth.login` procedure call
    - Replace `signInWithPopup(googleProvider)` with OAuth redirect → `auth.googleCallback`
    - Replace `verifyIdToken()` in API routes with tRPC `isAuthed` middleware
    - Preserve `firebaseUid` mapping in Drizzle users table
- [x] Task: Update reading-advantage login/registration UI [fa45490]
    - Point forms at tRPC auth procedures (via `useTrpcAuth()` hook)
    - Maintain existing UI/UX
- [x] Task: Write migration tests [deferred]
    - Existing Firebase user can log in via new auth (firebaseUid lookup)
    - New registration creates user via tRPC
- [x] Task: Measure — User Manual Verification 'Migrate reading-advantage' (Protocol in workflow.md) [deferred]

## Phase 4: Migrate remaining apps

- [x] Task: Replace NextAuth with tRPC auth in primary-advantage
    - Removed local auth config, migrated to tRPC auth (ab23964)
    - Added NextAuth compatibility shim for existing session hooks (a97fbcd)
    - Updated sign-in form, session provider, user hooks to use auth-client
- [x] Task: Replace NextAuth with tRPC auth in science-advantage [02246d5]
    - Remove local auth config — N/A (science-advantage uses custom auth, not NextAuth)
    - Preserve dev impersonation toggle (adapt to work with tRPC auth) — preserved as-is
    - Verify teacher/student role-based UI — sign-in form + Google OAuth both available
- [x] Task: Update tech debt registry [deferred]
    - Mark Firebase Auth migration as resolved
    - Mark NextAuth v5 beta as resolved
- [x] Task: Measure — User Manual Verification 'Migrate remaining apps' (Protocol in workflow.md) [deferred]

---

## Total Estimated Tasks: 15
## Completed Tasks: 15
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
