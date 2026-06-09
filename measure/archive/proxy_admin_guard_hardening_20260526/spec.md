# Specification: Proxy Admin/Role Guard Hardening

## Overview

Harden the Next.js middleware (`proxy.ts`) in monorepo apps so role-gated routes (`/admin`, `/system`, `/teacher`) are authoritatively guarded at the edge, not merely by cookie presence.

## Problem

Audited 2026-05-26.

**`apps/codecamp-advantage/proxy.ts`** (the entry that triggered this track):
- Lines 36–44 check only `request.cookies.get("session_token")?.value`. Any non-empty cookie value passes.
- No token validity check (could be stale, revoked, malformed, or from another app's session table).
- No role check — a STUDENT account's valid cookie reaches `/admin` and the admin shell must defend itself with `adminProcedure`.

**`apps/science-advantage/proxy.ts`** has the same shape: cookie presence only, applied to `/student`, `/teacher`, `/admin`, `/system`, `/dashboard`, `/signin`. No role differentiation despite each route being role-specific.

**`apps/www-reading-advantage/src/proxy.ts`** is i18n-only — not in scope.

## Why the existing tech-debt note said this is hard

> Requires Edge-compatible session verification + role check. Auth uses DB-backed opaque tokens (not JWTs) — proxy can't decode locally. Needs DB query in proxy or token redesign.

`@reading-advantage/auth` exports `requireRole(db, token, role)` (`packages/auth/src/server.ts`) but uses `postgres-js`, which depends on `fs`/`net`/`tls`/`perf_hooks` — incompatible with the Next.js Edge runtime. `proxy.ts` runs as middleware which defaults to Edge.

This is the constraint that has to be solved before role enforcement at the edge is even possible.

## Functional Requirements

### FR-1: Edge Runtime Override (Pragmatic Path)
- Both proxies opt into Node.js runtime via `export const runtime = "nodejs"` (Next.js 15+ supports `runtime = "nodejs"` for middleware as of `experimental.nodeMiddleware: true` — verify version compatibility first; fall back to a stand-alone session-verify HTTP endpoint if not viable).
- The proxy imports `requireRole` from `@reading-advantage/auth` and calls it for protected routes.

### FR-2: Role-Specific Routing
- `codecamp-advantage`: `/admin/**` requires `ADMIN`. `/intern/**` (if any) requires `INTERN`. Anything else stays cookie-presence-gated.
- `science-advantage`: `/admin/**` requires `ADMIN`. `/system/**` requires `ADMIN`. `/teacher/**` requires `TEACHER` or `ADMIN`. `/student/**` requires `STUDENT` (or any signed-in role with explicit allow-list). `/signin` redirect-when-authed logic preserved.
- Failed role checks: redirect to `/` (codecamp) or `/dashboard` (science) — never `/signin` for an already-authenticated wrong-role user, to avoid logout loops.

### FR-3: Session Verification
- The proxy calls a single source-of-truth function for "is this token valid and what's the user's role" — `requireRole` already does this. No duplicated session-table queries.
- Token verification is per-request; no in-memory caching in the proxy itself (DB roundtrip is the cost of removing the cookie-presence bypass). If perf is a problem post-rollout, an Edge KV cache becomes a follow-up track.

### FR-4: Failure Modes
- Invalid token → clear `session_token` cookie + redirect to signin with `redirectTo` preserved.
- Valid token, wrong role → redirect to safe home (`/` for codecamp, `/dashboard` for science), do not clear cookie.
- DB unreachable → fail closed (redirect to signin with `?error=session_check_failed`), log via existing `console.error` pattern (no new logging dep).

### FR-5: Test Coverage
- Unit tests for both proxies covering: no cookie, invalid token, wrong role, correct role, DB error. Mock the auth module.
- At least one integration test per app driving a real signed-in session through `/admin` and confirming a STUDENT account is redirected.

### FR-6: Dev Auth Override Compatibility
- `science-advantage` AGENTS.md documents `DEV_AUTH_ENABLED=true` impersonation. The proxy must honor the dev impersonation cookie when `DEV_AUTH_ENABLED=true` in env, and ignore it otherwise (production-safe).

## Acceptance Criteria

1. `apps/codecamp-advantage/proxy.ts` and `apps/science-advantage/proxy.ts` no longer treat cookie presence as authorization for `/admin`, `/system`, `/teacher`.
2. A STUDENT session cookie hitting `/admin/anything` is redirected before the admin shell renders.
3. Both proxies pass new unit-test suites covering the five failure-mode scenarios in FR-4.
4. Build passes for both apps on Next.js Turbopack with the new middleware runtime config.
5. The originating tech-debt entry (2026-05-15 `codecamp_review` proxy.ts) is marked `Resolved` and removed from the High-severity backlog; a new entry is added if any FR-3 perf concern materializes.
6. No regression in i18n redirect behavior (codecamp routes still locale-prefix correctly).

## Out of Scope

- Edge KV / per-instance caching of session verifications — follow-up track if perf demands.
- JWT migration of opaque tokens — separate architectural decision, not required by this fix.
- Reading-advantage proxy (no admin middleware today; routes guarded server-side only).
- Primary-advantage proxy (still on NextAuth; covered by primary-advantage migration track).

## Constraints & Risks

- **Runtime support risk**: `runtime = "nodejs"` for middleware varies by Next.js version. If unavailable, fallback is an internal API route `/api/auth/verify-role?role=ADMIN` that the proxy `fetch`es; this trades one DB roundtrip for two (proxy→route→DB) and adds a same-origin request. Phase 0 verifies this before committing to the design.
- **Per-request DB cost**: every protected-route request now incurs a `select session` query. Codecamp admin traffic is low; science-advantage student traffic is higher and may need follow-up caching.
- **Compatibility with `/signin` redirect-when-authed** (science only): must verify the session is valid before redirecting, otherwise a stale cookie can loop the user.
