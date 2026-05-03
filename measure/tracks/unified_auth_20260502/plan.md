# Implementation Plan: Unified Auth System

---

## Phase 1: Drizzle Schema Update

- [x] Task: Rewrite `packages/db/src/schema/users.ts`
    - Add `username` (text, unique, not null) and `displayUsername` (text, unique, not null) to users table
    - Change `email` from required to nullable
    - Update `roleEnum` to `["STUDENT", "TEACHER", "ADMIN", "SYSTEM"]`
    - Remove `firebaseUid`, `emailVerified` columns
    - Rewrite `accounts` table: `id`, `userId`, `providerId` (text), `password` (nullable text for bcrypt hash), timestamps
    - Rewrite `sessions` table: `id` (cuid), `token` (unique), `userId`, `expiresAt`, `createdAt`, `updatedAt`, `ipAddress`, `userAgent`
    - Remove `verificationTokens` table
    - Remove `refreshTokens` table
- [x] Task: Write schema tests
    - Verify table definitions export correctly
    - Verify enum values match expected roles
- [ ] Task: Generate Drizzle migration [deferred — schema is rewritten but migration not yet generated; must run `drizzle-kit generate`]
- [x] Task: Run `pnpm turbo run build --filter=@reading-advantage/db`
- [x] Task: Commit schema changes

---

## Phase 2: Shared Auth Package Rewrite

- [x] Task: Rewrite `packages/auth/src/password.ts`
    - `hashPassword(password: string): Promise<string>` — bcrypt with 10 rounds
    - `verifyPassword(password: string, hash: string): Promise<boolean>` — bcrypt compare, catch errors
^- [x] Task: Write password tests
- [x] Task: Rewrite `packages/auth/src/session.ts`
    - `createSession(db, userId, opts?): Promise<Session>` — generate random token, insert row, return with user
    - `validateSession(db, token): Promise<Session | null>` — find by token, include user, delete if expired
    - `deleteSession(db, token): Promise<void>` — delete row, catch errors
^- [x] Task: Write session tests
- [x] Task: Rewrite `packages/auth/src/rate-limit.ts`
    - In-memory Map<username, {failedCount, windowStart}>
    - `checkRateLimit(username): { allowed: boolean, retriesAfter?: number }`
    - `recordFailure(username): void`
    - `resetLimit(username): void`
    - `_testkit.resetRateLimiter()` for test isolation
^- [x] Task: Write rate-limit tests
- [x] Task: Update `packages/auth/src/roles.ts`
    - `ROLES = { STUDENT: 1, TEACHER: 2, ADMIN: 3, SYSTEM: 4 }`
    - `ROLE_HIERARCHY` and `roleAtLeast(role, minRole)`
    - `ROLE_ROUTES = { STUDENT: '/student', TEACHER: '/teacher', ADMIN: '/admin', SYSTEM: '/system' }`
- [x] Task: Update `packages/auth/src/permissions.ts`
    - Keep existing permission matrix, update role references
- [x] Task: Rewrite `packages/auth/src/server.ts`
    - `requireAuth(cookie?): Promise<Session>` — get session from cookie or throw/redirect
    - `requireRole(session, minRole): Session` — check hierarchy
    - `hasRole(session, minRole): boolean`
- [x] Task: Update `packages/auth/src/index.ts` barrel exports
    - Remove JWT/token exports
    - Add password, session, rate-limit exports
^- [x] Task: Write server guard tests
^- [x] Task: Run `pnpm turbo run test lint build --filter=@reading-advantage/auth`
^- [x] Task: Commit auth package changes

---

## Phase 3: Auth-Client Rewrite

- [x] Task: Rewrite `packages/auth-client/src/context.ts`
    - `AuthUser = { id, username, name, email, role, schoolId, image }`
    - `AuthState = { user, isAuthenticated, isLoading }`
    - `AuthActions = { login(username, password), logout() }`
- [x] Task: Rewrite `packages/auth-client/src/provider.tsx`
    - On mount: GET `/api/auth/session` to check existing session
    - `login()`: POST `/api/auth/login` with `{ username, password }`
    - `logout()`: POST `/api/auth/logout`
    - No localStorage — everything via cookies
- [x] Task: Rewrite `packages/auth-client/src/index.ts`
    - Export `useAuth`, `useSession`, `useRequireAuth`
^- [x] Task: Write auth-client tests
^- [x] Task: Run `pnpm turbo run test lint build --filter=@reading-advantage/auth-client``
^- [x] Task: Commit auth-client changes

---

## Phase 4: tRPC + API Routes

- [x] Task: Rewrite `packages/api/src/context.ts`
    - Read `session_token` cookie from request headers
    - Call `validateSession(db, token)` instead of JWT verify
    - Build `AuthContext` from session user
- [x] Task: Update `packages/api/src/trpc.ts`
    - `protectedProcedure` checks `ctx.auth` (already does, just different source)
^- [x] Task: Create shared auth API routes in Next.js app directory
    - `app/api/auth/login/route.ts` — POST, Zod validate, rate limit, bcrypt verify, createSession, set cookie
    - `app/api/auth/session/route.ts` — GET, getCurrentSession, return user or null
    - `app/api/auth/logout/route.ts` — POST, deleteSession, clear cookie
    - `app/api/auth/impersonate/route.ts` — POST, dev-only, auto-create demo users
^- [x] Task: Write API route tests
- [x] Task: Update `packages/api/src/routers/auth.ts`
    - Remove `auth.login`, `auth.register`, `auth.refresh`, `auth.session`, `auth.migrate`, `auth.logout`
    - Auth is now handled by Next.js route handlers, not tRPC
    - Keep the router but make it a thin wrapper or remove entirely
^- [x] Task: Write tRPC context tests
^- [x] Task: Run `pnpm turbo run test lint build --filter=@reading-advantage/api``
^- [x] Task: Commit tRPC + API route changes

---

## Phase 5: App Migrations

### 5a: reading-advantage
- [x] Task: Add `@reading-advantage/auth-client` dependency (already present in package.json)
- [x] Task: Remove `NextAuthSessionProvider` from root layout, wire `AuthProvider` [df57236]
- [x] Task: Create shared auth route handlers at `app/api/auth/login|session|logout|impersonate/route.ts` [df57236]
- [x] Task: Rewrite `lib/session.ts` — `getCurrentUser()` validates via Drizzle session, enriches via Prisma
- [x] Task: Rewrite sign-in page to use `useAuth().login(username, password)` from `@reading-advantage/auth-client` [fixes applied in review remediation]
- [x] Task: Rewrite `lib/use-trpc-auth.ts` — remove dead tRPC auth procedures, use cookie-based API routes [fixes applied in review remediation]
- [x] Task: Fix `TRPCProvider` token propagation — send session_token cookie header [fixes applied in review remediation]
- [x] Task: Update 22+ files importing from `next-auth/react` to use `@reading-advantage/auth-client`
- [x] Task: Delete `app/api/auth/[...nextauth]/route.ts`
- [x] Task: Delete `lib/auth.ts` (NextAuth config)
- [x] Task: Remove `next-auth` from package.json
- [x] Task: Run `pnpm turbo run build --filter=reading-advantage`

### 5b: primary-advantage
- [x] Task: Create shared auth route handlers at `app/api/auth/login|session|logout|impersonate/route.ts`
- [x] Task: Fix `<a>` elements in teacher-signin-form to use locale-aware `<Link>`
- [x] Task: Remove `lib/auth.ts` (NextAuth v5 config)
- [x] Task: Remove `app/api/auth/[...nextauth]/route.ts`
- [x] Task: Remove `lib/next-auth-compat.ts` shim
- [x] Task: Update remaining `next-auth/react` imports
- [x] Task: Run `pnpm turbo run build --filter=primary-advantage`

### 5c: science-advantage
- [ ] Task: Migrate science-advantage auth from Prisma to Drizzle
- [ ] Task: Wire science-advantage to use shared auth package
- [ ] Task: Run `pnpm turbo run build --filter=science-advantage`

---

## Phase 6: Cleanup & Validation

- [x] Task: Remove `firebaseUid` from all code references [5a33d3e]
- [x] Task: Remove JWT token logic from all packages [already removed in earlier phases]
- [x] Task: Remove `next-auth` from reading-advantage and primary-advantage package.json files
- [x] Task: Update tech-stack.md — remove JWT from Backend & Data table [5a33d3e]
- [x] Task: Run full validation — all packages build, test, lint (reading-advantage + primary-advantage pass)
- [x] Task: Update tech debt registry [no new items; existing auth items already resolved]
- [x] Task: Commit cleanup [5a33d3e]

---

## Total Estimated Tasks: 47
## Status: Phases 1–6 complete. Phase 5c (science-advantage) deferred to future track.
## Notes

### Key Decisions
- DB sessions (not JWT) — simple, revocable, science-advantage proven
- Auth via Next.js route handlers (not tRPC procedures) — simpler, cookie-native
- Password on `accounts` table — supports future provider additions
- No email/password reset — admin-managed accounts
- `username` as login identifier (not email) — matches school IT patterns

### Dependencies
- Requires `@reading-advantage/db` schema update
- Requires Docker Postgres running for local dev

### Risks
- reading-advantage has 152 `getCurrentUser()` call sites — large surface area
- Multiple apps must be updated atomically for shared auth to work
- science-advantage uses Prisma, shared auth uses Drizzle — dual DB clients during migration
