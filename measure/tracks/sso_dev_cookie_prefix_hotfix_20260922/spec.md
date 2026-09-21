# Specification: SSO Dev Cookie Prefix Hotfix

Track ID: `sso_dev_cookie_prefix_hotfix_20260922`. Type: bug. Apps: `apps/accounting`, `apps/sales-advantage`, `apps/marketing`, `apps/codecamp-advantage`.

## Overview

Owner manual verification on 2026-09-22 (session S2, check S2.1) found that local
SSO sign-in cannot complete in a real browser for any company-SSO app. The OIDC
transaction and session cookies use the `__Host-` prefix. Over plain-HTTP local
development the routes correctly omit `Secure`, and browsers reject `__Host-`
cookies without `Secure`. The callback then finds no transaction cookie and
redirects to `?error=sso` without ever calling the token endpoint.

## Evidence

- `Set-Cookie: __Host-ra_accounting_oidc_tx=...; Path=/; HttpOnly; SameSite=lax` (no `Secure`) from `http://localhost:3010/api/auth/company/start`.
- Accounts dev log shows the authorize step issuing a code and zero `POST /api/oidc/token` requests; the accounting callback completes in ~5ms and redirects to `/login?error=sso`.
- Browser probe on the owner's browser: `__Host-` cookie without `Secure` is rejected; the same cookie with `Secure` is accepted on localhost; an unprefixed cookie is accepted.
- The repo's own tests document the rule: `apps/accounting/app/api/auth/company/start/route.test.ts` — "__Host- cookies are rejected by real browsers without Secure."

## Root Cause

`ACCOUNTING_TRANSACTION_COOKIE`, `ACCOUNTING_SESSION_COOKIE`, and the Sales,
Marketing, and Codecamp equivalents hardcode the `__Host-` prefix. The prefix is
only valid when `Secure` is set. Production always sets `Secure`; local
plain-HTTP development cannot.

## Functional Requirements

### FR-1: Environment-conditional cookie prefix

In each of the four apps, derive the OIDC transaction and session cookie names
so the `__Host-` prefix applies only in production (`NODE_ENV === "production"`).
Outside production the cookies use the same names without the prefix (for
example `ra_accounting_oidc_tx`). Every route that sets, reads, or expires these
cookies must resolve the name through one shared helper so set and read always
agree.

### FR-2: Preserve production behavior

In production the cookie names, `Secure`, `Path=/`, `HttpOnly`, and
`SameSite=Lax` attributes must remain byte-identical to current behavior.

### FR-3: Test updates

Existing cookie tests must keep passing. Test doubles that hardcode the cookie
names (for example `apps/accounting/app/lib/__tests__/company-oidc-idp-double.ts`)
must resolve names through the same helper or match the test environment's
names. Add one test per app asserting the dev-mode name has no `__Host-` prefix
and the production name keeps it.

## Non-Functional Requirements

- NFR-1: No new dependencies.
- NFR-2: Minimal edits. No refactors beyond the shared-name helper.
- NFR-3: Each affected app's existing test suite stays green.

## Acceptance Criteria

- AC-1: `curl -D - http://localhost:3010/api/auth/company/start` in dev sets `ra_accounting_oidc_tx` (no `__Host-` prefix).
- AC-2: A real-browser SSO sign-in on localhost completes for accounting (callback reaches the Accounts token endpoint and lands on `/`).
- AC-3: Production-shaped tests prove the `__Host-` prefix and `Secure` attribute remain in production mode.
- AC-4: `pnpm turbo run test --filter=accounting --filter=sales-advantage --filter=marketing --filter=codecamp-advantage` (or per-app equivalents where pnpm is unusable) passes.

## Out of Scope

- Production cookie behavior changes.
- The Codecamp/Accounts SSO redirect chains (owned by `codecamp_sso_redirect_repair_20260820` and `sales_marketing_sso_parity_20260829`).
- Reading and Primary apps (no company SSO).
