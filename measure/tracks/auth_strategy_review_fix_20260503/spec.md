# Specification: Auth Strategy Review Fixes

## Overview

Fix defects found in the review of the last 15 hours of work. The highest-risk issue
is a strategy mismatch: Science auth work preserved and rewrote Google OAuth even
though the Unified Auth direction is explicitly username/password-only with no
external providers, no Firebase, no NextAuth, and no email reset.

This track turns the review findings into executable remediation and validation.

## Source Findings

### 1. Science auth still preserves Google OAuth (High)

The target auth architecture is simple username/password sessions through
`@reading-advantage/auth` and shared route handlers. Science should not retain
`app/api/auth/google/route.ts`, `app/api/auth/google/callback/route.ts`, Google
OAuth environment gating, or UI entry points that suggest Google sign-in is
supported.

The current Science track instead asks for a Drizzle rewrite of Google OAuth and
end-to-end OAuth verification. That plan is directionally wrong and must be
corrected so future implementation work does not preserve OAuth.

### 2. Science auth migration does not build (High)

`pnpm turbo run build --filter=science-advantage` fails because Science code imports
`drizzle-orm` directly without declaring it in `apps/science-advantage/package.json`.
The better fix is to remove the direct Science OAuth Drizzle code and keep Science
using shared auth route handlers. If any remaining Science app code truly needs
direct Drizzle helpers, the dependency must be declared explicitly.

### 3. Science lint gate fails (Medium)

`pnpm turbo run lint --filter=science-advantage` fails. At least one failure is in
auth-touched code: the production sign-in fallback uses a raw `<a href="/">` instead
of `next/link`. Auth migration files also introduced unused imports. Existing
analytics lint failures may be pre-existing, but this track must leave the Science
lint gate passing or explicitly isolate unrelated baseline debt in a separate pending
track with evidence.

### 4. Unified auth migration SQL does not match schema nullability (High)

`packages/db/src/schema/users.ts` requires `username` and `displayUsername` to be
non-null. Migration `0003_slow_firebrand.sql` adds those columns as nullable and
only adds unique constraints. The db test suite passes because it does not check
schema/migration parity or username nullability.

The migration must either backfill existing users and set `NOT NULL`, or document
and implement a safe widen-migrate-narrow path with tests that prevent accidental
nullable auth identifiers in production.

### 5. Firestore no-op stub can silently drop behavior (Medium)

`apps/reading-advantage/configs/firestore-config.ts` returns empty reads and fake
ids for remaining callers. This is acceptable only as a consciously quarantined
temporary shim when every caller is either unreachable or tracked. Silent no-op
behavior in reachable API/controller paths is not acceptable.

Remaining callers must be converted, deleted, or made to fail explicitly with a
clear 501-style error so production does not silently discard data.

## Functional Requirements

- Science auth must align with username/password-only architecture:
  - Remove Google OAuth route handlers or replace them with explicit unsupported
    responses.
  - Remove Google OAuth sign-in UI entry points.
  - Remove OAuth verification tasks from `science_auth_migration_20260503/plan.md`.
  - Keep Science login/session/logout/impersonate wired through shared auth where
    appropriate.
- Science build and lint must pass, or any unrelated baseline failures must be
  moved to a clearly pending stabilization track with exact command evidence.
- Auth migration SQL must enforce the schema contract for required username fields
  or include a safe two-step migration plan that prevents final nullable state.
- Migration tests must assert the username/display username nullability contract,
  not only the presence of provider constraints.
- Firestore stub callers must not silently no-op in reachable production paths.
- Track registries and tech-debt entries must distinguish fixed items from
  deferred baseline debt.

## Acceptance Criteria

- `pnpm turbo run build --filter=science-advantage` passes.
- `pnpm turbo run lint --filter=science-advantage` passes, or unrelated baseline
  failures are isolated in a pending track and auth-touched lint failures are fixed.
- `pnpm turbo run test --filter=@reading-advantage/db` passes with tests covering
  migration username/display username nullability.
- `pnpm turbo run test --filter=@reading-advantage/api` passes.
- `rg -n "GOOGLE_OAUTH|/api/auth/google|google/callback|Sign in with Google" apps/science-advantage`
  finds no active Science auth implementation, except documentation explicitly
  marked as archived or removed-strategy notes.
- `rg -n "configs/firestore-config|firestore-stub|collection\\(" apps/reading-advantage`
  shows no reachable no-op Firestore use without an explicit tracked remediation
  or unsupported response.
- `measure/tracks/science_auth_migration_20260503/plan.md` no longer instructs
  agents to preserve Google OAuth.

## Out of Scope

- Adding password reset or email-based auth.
- Reintroducing Google OAuth, Firebase Auth, or NextAuth.
- Migrating all non-auth Science Prisma code.
- Full reading-advantage controller Prisma-to-Drizzle rewrite, except where needed
  to remove or fail remaining Firestore no-op callers.
