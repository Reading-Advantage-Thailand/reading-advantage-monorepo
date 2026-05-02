# Specification: Shared Backend Auth Migration

## Context

Authentication is currently fragmented:
- **reading-advantage**: Firebase Auth (Google OAuth + email/password) with `verifyIdToken` bridge to Prisma
- **primary-advantage**: NextAuth v5 beta with Prisma adapter
- **science-advantage**: NextAuth v5 with Google OAuth, dev impersonation toggle

With the tRPC backend, auth becomes middleware rather than REST endpoints. The `packages/auth/` package (created in the scaffold track) provides role/permission logic. This track migrates the actual authentication flows — session management, OAuth, login — into the tRPC context layer.

## Goals

1. Implement tRPC auth procedures: `auth.login`, `auth.register`, `auth.googleCallback`, `auth.session`, `auth.logout`
2. Implement JWT-based session management (access + refresh tokens)
3. Wire Google OAuth flow through tRPC (not REST endpoints)
4. Migrate reading-advantage from Firebase Auth to tRPC auth
5. Migrate primary-advantage from NextAuth to tRPC auth
6. Migrate science-advantage, preserving dev impersonation
7. Create `packages/auth-client/` with React hooks for frontend apps

## Acceptance Criteria

- [ ] `auth.login` procedure accepts email + password, returns JWT pair
- [ ] `auth.register` procedure creates user + credentials, returns JWT pair
- [ ] `auth.googleCallback` procedure handles Google OAuth flow, returns JWT pair
- [ ] `auth.session` procedure validates JWT, returns user + tenant context
- [ ] `auth.refresh` procedure exchanges refresh token for new access token
- [ ] `auth.logout` procedure invalidates refresh token
- [ ] tRPC `isAuthed` middleware validates JWT on every protected procedure
- [ ] `packages/auth-client/` exports `useAuth()` and `useSession()` React hooks
- [ ] reading-advantage login uses tRPC auth (Firebase Auth removed from auth flow)
- [ ] primary-advantage login uses tRPC auth (NextAuth removed)
- [ ] science-advantage login uses tRPC auth (dev impersonation preserved)
- [ ] Existing users can log in without password reset (firebaseUid migration)
- [ ] All apps build with `pnpm turbo run build` after auth migration

## Out of Scope

- Removing Firebase entirely (Firestore data migration is separate)
- MFA / 2FA
- OAuth providers beyond Google
- Session management UI (profile, password change)
- Rate limiting on auth procedures

## References

- `apps/reading-advantage/lib/firebase.ts` — Firebase Auth client
- `apps/primary-advantage/auth.ts` — NextAuth v5 config
- `apps/science-advantage/lib/auth.ts` — NextAuth config with dev impersonation
- `packages/auth/` — roles, permissions, tenant (created in scaffold track)
- Track dependency: `shared_backend_scaffold_20260502`
