# Spec: Platform Alignment & Access Model

## Overview

Bring the platform layer back into alignment with the repo contract so the rest
of the curriculum roadmap can build on stable foundations. This track covers
authentication, environment/config consistency, shared auth guards, distributed
cache/rate-limit infrastructure, and the first real browser-level smoke tests.

## Functional Requirements

### FR-1: Restore the declared auth contract

- Production authentication must be Google OAuth only.
- Local QA must support dev-only impersonation guarded by
  `DEV_AUTH_ENABLED=true`.
- User-facing credential login and demo password surfaces must be removed or
  isolated from production code paths.

### FR-2: Centralize session and role enforcement

- Route handlers and server-rendered dashboards must share auth/role helpers.
- Role routing for STUDENT, TEACHER, ADMIN, and SYSTEM must be defined in one
  place.
- Session validation must support secure redirects and stale-session cleanup.

### FR-3: Standardize environment and service contracts

- Environment parsing must reflect the auth, AI, storage, and cache contracts
  actually required by the product.
- Configuration should expose explicit adapters for Redis-backed caching/rate
  limiting and for storage-backed media where applicable.

### FR-4: Add shared runtime infrastructure

- Cross-instance rate limiting and cache-sensitive services must be able to use
  Redis-backed implementations.
- Fallback behavior must remain safe when Redis is unavailable.

### FR-5: Establish real critical-flow smoke coverage

- Replace the placeholder E2E command with a real browser-level smoke harness.
- Cover sign-in, role routing, and at least one student and teacher entry path.

## Non-Functional Requirements

- Security regressions are unacceptable.
- The implementation must preserve local QA ability.
- Platform abstractions must be simple enough for later curriculum tracks to
  reuse without bespoke wrappers.

## Acceptance Criteria

- [x] `/signin` follows the Google OAuth plus dev impersonation contract
- [x] Credential/demo login is no longer the default product auth path
- [x] Shared auth helpers are used across protected routes
- [x] Redis-backed adapters exist for the services that require shared state
- [x] `npm run test:e2e` executes a real smoke suite
- [x] Root docs and env guidance match the implemented platform behavior

## Out of Scope

- New student-facing curriculum features
- Parent/admin product expansion
- Rewriting every AI feature in this track
