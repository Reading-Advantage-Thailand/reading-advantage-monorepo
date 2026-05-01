# Implementation Plan: Shared Auth Package

---

## Phase 1: Design & Schema Tests

- [ ] Task: Design unified Prisma `users` schema
    - Fields: id, email, emailVerified, name, image, role (student/teacher/admin), firebaseUid (nullable), createdAt, updatedAt
    - Include `accounts`, `sessions`, and `verificationTokens` tables for NextAuth compatibility
    - Document migration path from Firebase Auth UID
- [ ] Task: Write Prisma schema unit tests
    - Validate schema generates clean SQL
    - Test seed data inserts without constraint errors
- [ ] Task: Scaffold `@reading-advantage/auth` package
    - `packages/auth/` with `package.json`, `tsconfig.json`, `src/index.ts`
    - Export auth config, hooks, and middleware helpers
- [ ] Task: Measure — User Manual Verification 'Design & Schema Tests' (Protocol in workflow.md)

## Phase 2: Shared Package Core

- [ ] Task: Implement NextAuth v5 stable config with Prisma adapter
    - Configure Google OAuth and Email/Password credentials provider
    - Use unified Prisma schema from Phase 1
- [ ] Task: Implement shared `useUser()` hook
    - Wrap `useSession` with consistent user shape (id, email, name, role, image)
    - Handle loading and unauthenticated states uniformly
- [ ] Task: Implement shared `useSession()` hook
    - Thin wrapper around NextAuth session with typed return
- [ ] Task: Implement `requireAuth()` and `requireRole()` middleware helpers
    - Server-side functions for API route protection
    - Edge-compatible middleware for App Router
- [ ] Task: Write unit tests for hooks and middleware
    - Mock NextAuth session in Vitest
    - Assert `requireRole` rejects for insufficient permissions
- [ ] Task: Measure — User Manual Verification 'Shared Package Core' (Protocol in workflow.md)

## Phase 3: Migrate reading-advantage

- [ ] Task: Add `@reading-advantage/auth` dependency to reading-advantage
    - Replace `lib/firebase.ts` client auth with shared package sign-in
    - Preserve Firebase UID mapping in Prisma `users.firebaseUid`
- [ ] Task: Replace server-side Firebase token verification
    - Remove `verifyIdToken` from Firebase Admin in API routes
    - Use shared `requireAuth()` helper instead
- [ ] Task: Update reading-advantage login and registration flows
    - Migrate email/password forms to credentials provider
    - Maintain backward compatibility for existing Firebase users
- [ ] Task: Write integration tests for reading-advantage auth flow
    - Test login API route returns JWT session
    - Test protected route rejects unauthenticated requests
- [ ] Task: Measure — User Manual Verification 'Migrate reading-advantage' (Protocol in workflow.md)

## Phase 4: Migrate primary-advantage

- [ ] Task: Replace local NextAuth v5 beta config with `@reading-advantage/auth`
    - Remove local `auth.ts`, `auth.config.ts`, `middleware.ts` copies
    - Re-export from shared package with app-specific callbacks if needed
- [ ] Task: Update primary-advantage Prisma schema
    - Merge or reference unified `users` table
    - Ensure no data loss during schema alignment
- [ ] Task: Update primary-advantage session consumption
    - Replace local `useSession` imports with `@reading-advantage/auth`
    - Verify role-based UI renders correctly
- [ ] Task: Write integration tests for primary-advantage auth flow
    - Test Google OAuth callback succeeds
    - Test teacher vs student route guards
- [ ] Task: Measure — User Manual Verification 'Migrate primary-advantage' (Protocol in workflow.md)

## Phase 5: Cleanup & Documentation

- [ ] Task: Remove Firebase Auth dependencies from reading-advantage `package.json`
    - Uninstall `firebase`, `firebase-admin`, `@firebase/auth`
    - Clean up dead Firebase auth code files
- [ ] Task: Remove NextAuth v5 beta from primary-advantage `package.json`
    - Uninstall local `next-auth` beta if no longer needed
    - Confirm shared package provides the correct version
- [ ] Task: Update tech debt registry
    - Mark Firebase Auth migration as resolved
    - Mark NextAuth v5 beta as resolved
- [ ] Task: Write auth package README
    - Setup instructions for new apps
    - Provider configuration guide
    - Role-based access patterns
- [ ] Task: Measure — User Manual Verification 'Cleanup & Documentation' (Protocol in workflow.md)

---

## Total Estimated Tasks: 20
## Completed Tasks: 0
## Notes

### Decisions
- Keep `firebaseUid` column as nullable for backward compatibility during user migration
- Use NextAuth v5 stable (not beta) in shared package; upgrade primary-advantage as part of migration
- Credentials provider (email/password) is required because reading-advantage currently uses Firebase email auth
- Google OAuth is the primary social provider; add others in future tracks
