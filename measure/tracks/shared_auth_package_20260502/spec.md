# Specification: Shared Auth Package

## Context

The monorepo currently has three different authentication mechanisms:
- **reading-advantage**: Firebase Auth (legacy, migration bridge to Prisma)
- **primary-advantage**: NextAuth v5 beta with Prisma adapter
- **science-advantage**: Likely independent auth (to be confirmed during migration)

Tech debt registers Firebase Auth migration as **High** severity and notes 12 Firestore collections still active because user data is tied to Firebase UID. Unifying auth into a single shared package will unblock the Firestore → Prisma migration, simplify onboarding, and enforce consistent session management across all student-facing apps.

## Goals

1. Design a unified Prisma `users` schema that supports roles (student, teacher, admin) and provider-agnostic identities
2. Create `@reading-advantage/auth` package with NextAuth v5 stable (or better) and a Prisma adapter
3. Migrate reading-advantage off Firebase Auth (client sign-in + server token verification)
4. Migrate primary-advantage from local NextAuth v5 beta to the shared package
5. Provide shared middleware, hooks (`useUser`, `useSession`), and API route helpers

## Acceptance Criteria

- [ ] `@reading-advantage/auth` package exists in `packages/auth/`
- [ ] Unified Prisma `users` schema supports Firebase UID mapping for backward compatibility
- [ ] reading-advantage login flow works without Firebase Auth client library
- [ ] primary-advantage consumes `@reading-advantage/auth` and drops local NextAuth config
- [ ] Server-side token verification uses shared package (no `verifyIdToken` from Firebase Admin)
- [ ] Shared `useUser()` hook returns consistent user shape across all apps
- [ ] Middleware protects routes with role-based access control
- [ ] Tech debt updated: Firebase Auth and NextAuth v5 beta items marked resolved
- [ ] Migration guide documented for future apps

## Out of Scope

- Full Firestore data migration (this track only migrates auth; data migration is separate)
- OAuth providers beyond Google / Email (add later)
- Multi-tenancy / school-level auth (future enhancement)
- Real-time auth state sync (keep simple for now)

## References

- `measure/tech-debt.md` — Firebase Auth migration (High), NextAuth v5 beta
- `measure/product.md` — Cross-App Code Sharing goal
- `apps/reading-advantage/` — Firebase Auth integration points
- `apps/primary-advantage/` — NextAuth v5 beta setup
