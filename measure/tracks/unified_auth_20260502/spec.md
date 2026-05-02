# Specification: Unified Auth System

## Overview

Replace the current multi-system authentication (NextAuth + JWT + Firebase) with a single, simple username/password system shared across all apps. Modeled after science-advantage's existing auth pattern. This enables unified student records and cross-app school reporting.

## Functional Requirements

### Core Auth
- **Username/password login** — bcrypt hashing, 10 salt rounds
- **Database sessions** — random 64-hex token, 7-day expiry, httpOnly cookie (`session_token`)
- **Lazy session cleanup** — expired sessions deleted on validation
- **Rate limiting** — 5 failed attempts per 15-minute window per username
- **Logout** — delete session row, clear cookie

### Roles & Multi-Tenancy
- **Role hierarchy**: `STUDENT` (1) < `TEACHER` (2) < `ADMIN` (3) < `SYSTEM` (4)
- **school_id** on users table — shared across all apps for unified reporting
- **Numeric hierarchy comparison** — `userLevel >= requiredLevel` for access checks

### Demo Accounts
- **Dev impersonation** — auto-create demo users (`student_demo`, `teacher_demo`, `admin_demo`, `system_demo`) with known credentials
- **Available when** `NODE_ENV !== 'production'` or `DEV_AUTH_ENABLED=true`
- **Demo passwords** — `Password123!` for all demo accounts

### Server Guards
- `requireAuth()` — get session or redirect to `/signin`
- `requireRole(minRole)` — check hierarchy or redirect to role dashboard
- `hasRole(session, role)` — pure boolean check

### Client Hooks
- `useSession()` — `{user, isAuthenticated, isLoading}`
- `useAuth()` — adds `login(username, password)` and `logout()`
- `useRequireAuth()` — redirect to `/signin` if not authenticated

## Non-Functional Requirements

- All auth logic lives in `packages/auth` (shared library)
- Client hooks in `packages/auth-client` (React)
- Database schema in `packages/db` (Drizzle)
- No external auth providers (no Firebase, no Google OAuth, no NextAuth)
- No email verification, no password reset — admin handles account management
- Domain functions use `assertCan(permission, tenant)` for authorization

## Acceptance Criteria

1. User can log in with username + password on any app
2. Session persists across page refreshes via httpOnly cookie
3. Role-based access works: student can't access teacher routes
4. Demo accounts work in dev mode
5. Rate limiter blocks brute-force login attempts
6. All apps use the same `users` table with shared `school_id`
7. No NextAuth, Firebase, or JWT dependencies remain
8. All packages build and tests pass

## Out of Scope

- Password reset flow (admin manages accounts)
- Email verification
- OAuth / Google login
- Migration of legacy reading-advantage / primary-advantage user data
- Tiers 3-4 API routes (deferred from shared_backend_api track)
- Science-advantage schema changes (already has the target pattern)
