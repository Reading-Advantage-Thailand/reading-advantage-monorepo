# Unit 13 Overview: Authentication

**Phase:** C (Backend & Data)
**Periods:** 4
**Portfolio Project:** Student Progress Tracker (auth layer)

## Learning Objectives

By the end of this unit, the intern can:

1. Implement cookie-based session authentication
2. Create login and logout flows
3. Implement role-based access control (RBAC) with roles and permissions
4. Use `assertCan()` to protect domain functions
5. Understand multi-tenant auth (users belong to schools)
6. Protect API routes and pages with auth middleware

## Technologies & Versions

| Technology | Version | Purpose |
|-----------|---------|---------|
| Cookie-based sessions | Custom | Auth mechanism (matches Reading Advantage) |
| bcrypt | Latest | Password hashing |
| Zod | 3.25.76 | Login form validation |

## Portfolio Connection

The intern adds authentication to their Student Progress Tracker:

- Login page with email/password
- Session cookie management
- Role-based access: STUDENT can view progress, TEACHER can view all students, ADMIN can create modules
- Protected routes (middleware redirects unauthenticated users)
- Auth context on the frontend (show/hide UI based on role)

This mirrors `packages/auth` in the Reading Advantage monorepo.

## Architecture Mirroring

Reading Advantage auth patterns replicated in this unit:

- Cookie-based DB sessions (same as `packages/auth`)
- `assertCan(user, permission, tenant)` before mutations (same as `packages/domain`)
- Role hierarchy: STUDENT < TEACHER < ADMIN (same hierarchy)
- `protectedProcedure` in tRPC (same as `packages/api`)
- Middleware auth check (same as `middleware.ts`)

## Key Concepts

- **Session**: A server-side record tied to a cookie — proves the user is logged in
- **RBAC**: Role-Based Access Control — permissions are assigned to roles, not individual users
- **assertCan**: The gatekeeper — called before every mutation to enforce permissions
- **Multi-tenant auth**: Users belong to a school; they can only access that school's data

## Prerequisites

- Units 01–12 complete (tRPC, domain functions, Drizzle)

## Assessment

- Exercise repo: Add authentication to a tRPC API with RBAC
- Quiz at the end of Period 4 (5 questions)
