# Spec: Authorization Centralization

## Overview
Eliminate scattered, duplicated authorization logic across 18+ API routes by introducing centralized auth wrappers and standardizing API responses. This reduces fragility and prevents authorization gaps when new routes are added.

## Functional Requirements

### FR-1: Create `withAuth` API route wrapper
- Create `lib/auth/api.ts` with a `withAuth()` higher-order function
- Signature: `withAuth(handler, options?)` where options include `{ role?: UserRole }`
- The wrapper handles: session retrieval, null-session 401 response, optional role check with 403 response
- Returns the validated `Session` to the handler via a parameter
- Must be compatible with Next.js App Router route handlers (GET, POST, etc.)

### FR-2: Create `withRole` convenience wrapper
- `withRole(role, handler)` - shorthand for `withAuth(handler, { role })`
- Covers the most common pattern: require a specific minimum role level

### FR-3: Refactor existing API routes to use wrappers
- Replace manual `getCurrentSession()` + null check + role check patterns in all API routes
- Routes to refactor:
  - `/api/classes` (GET, POST)
  - `/api/classes/join` (POST)
  - `/api/classes/[classId]` (GET)
  - `/api/classes/[classId]/curriculum` (GET)
  - `/api/classes/[classId]/lessons/[lessonId]/analytics` (GET)
  - `/api/classes/[classId]/analytics/overview` (GET)
  - `/api/student/classes` (GET)
  - `/api/students/[studentId]/lessons/[lessonId]/progress` (GET)
  - `/api/students/[studentId]/lessons/[lessonId]/analytics` (GET)
  - `/api/students/[studentId]/classes/[classId]/analytics` (GET)
  - `/api/students/[studentId]/mastery-profile` (GET)
  - `/api/teachers/classes/[classId]/intervention-alerts` (GET)
  - `/api/ai/update-mastery` (POST)
  - `/api/ai/recommendations` (POST)
  - `/api/lessons/[lessonSlug]` (GET)
  - `/api/lessons/[lessonSlug]/quiz` (GET, POST)

### FR-4: Validate session in proxy.ts
- `proxy.ts` currently checks `!!sessionToken` (cookie existence only)
- Add lightweight session validation: check that token exists in DB and is not expired
- On invalid/expired session: clear the cookie and redirect to `/login`
- Must be performant - consider caching valid session tokens briefly

### FR-5: Standardize API error response format
- All API routes must return errors in the format: `{ success: false, error: string, details?: unknown }`
- All success responses must include `{ success: true, ... }`
- Create a shared `apiResponse` helper in `lib/api-helpers.ts`

### FR-6: Consolidate role constants
- Single source of truth for `ROLE_HIERARCHY` and `ROLE_ROUTES`
- Remove duplicate definitions from `app/(auth)/signin/page.tsx`, `components/features/auth/user-menu.tsx`, and any other locations
- All consumers import from `lib/auth/constants.ts`

### FR-7: Add missing `account` model indexes
- Add `@@index([userId])` to the `account` model in Prisma schema
- Add `@@index([providerId])` to the `account` model

## Non-Functional Requirements
- Zero behavior change from the user's perspective
- All existing tests must pass (updated to use new wrappers)
- >80% test coverage on new `withAuth`/`withRole` code

## Acceptance Criteria
- [ ] No API route directly calls `getCurrentSession()` for auth checking (all go through `withAuth`/`withRole`)
- [ ] `proxy.ts` validates session token against DB, clears stale cookies
- [ ] All API error responses follow `{ success: false, error }` format
- [ ] `ROLE_HIERARCHY` and `ROLE_ROUTES` are defined in exactly one file
- [ ] `account` model has indexes on `userId` and `providerId`
- [ ] All existing tests pass

## Out of Scope
- CSRF token implementation
- New auth features (2FA, password reset)
- Redis-backed session validation cache (Track: data_safety_20260206)
- Schema changes beyond index additions
