# Specification: Codecamp SSO Redirect Repair

## Overview

Company single sign-on is the target authentication design for Codecamp, and it
is live. The redirect chain around it is wrong. A user loses the page they asked
for, loses their language choice, and on a host mismatch loops back to the login
screen with no message.

This track repairs the redirect chain. It does not change the OIDC exchange, the
Accounts contract, or the session cookie design.

## Evidence

| Defect | Location |
|---|---|
| The login link sends no `returnTo` | `apps/codecamp-advantage/components/auth-entry.tsx:141` |
| `returnTo` therefore defaults to `/` | `apps/codecamp-advantage/app/api/auth/company/start/route.ts:22` |
| `redirectTo` is written by the proxy | `apps/codecamp-advantage/proxy.ts:67`, `proxy.ts:82` |
| `redirectTo` is read by nothing except its own tests | repository-wide search |
| The proxy overwrites the language cookie on every unprefixed request | `apps/codecamp-advantage/proxy.ts:118` |
| The default locale is Thai, so English users are reset | `apps/codecamp-advantage/i18n/routing.ts:5` |
| The callback builds redirects from the request origin | `apps/codecamp-advantage/app/api/auth/callback/route.ts:34` |
| The proxy already has a forwarding-aware helper that the auth routes ignore | `apps/codecamp-advantage/proxy.ts:19` |
| An unsafe `returnTo` throws a Zod error instead of failing cleanly | `packages/auth/src/company-identity/client.ts:87` |

## Reproduction

1. Set the interface language to English.
2. Sign out.
3. Open `https://codecamp.reading-advantage.com/en/admin`.
4. Observe the redirect to `/?redirectTo=/en/admin`, then to `/th/`.
5. Sign in.
6. Observe the landing page: the Thai dashboard, not the administrator page.

The host defect appears when the service is reached through a tagged revision
URL. The deployment creates one with `--tag=sso-candidate --no-traffic` in
`apps/codecamp-advantage/cloudbuild.yaml`. A redirect built from that origin
sets a `__Host-` prefixed cookie that the browser refuses, and the user returns
to the login screen.

## Functional Requirements

**FR-1 — The login link carries the destination.**
`AuthEntry` sends the current path as `returnTo`. The value is the full
locale-prefixed path with its query string.

**FR-2 — One redirect parameter, not two.**
`redirectTo` is removed from `proxy.ts`. The proxy redirects an unauthenticated
administrator request straight to
`/api/auth/company/start?returnTo=<original path>`. The dead parameter and its
tests are deleted.

**FR-3 — The language choice survives.**
The proxy reads the existing `NEXT_LOCALE` cookie and uses it to choose the
prefix for an unprefixed path. It writes the cookie only when no valid cookie is
present. A user who chose English stays in English through login.

**FR-4 — Redirects honor the forwarding hop.**
`getPublicUrl` moves to `apps/codecamp-advantage/lib/public-url.ts` and is used
by `proxy.ts`, the callback route, the start route, and the logout route. Every
redirect target is built from `x-forwarded-proto` and `x-forwarded-host` when
present.

**FR-5 — An unsafe return path fails cleanly.**
The start route catches the validation error, falls back to `/`, and logs one
structured line. It never returns a 500.

**FR-6 — A failed sign-in says why.**
The `?error=sso` and `?error=forbidden` cases render a visible message on the
landing page. Today the query parameter is set and nothing reads it.

## Non-Functional Requirements

- No change to `packages/auth/src/company-identity/client.ts` beyond its use.
- No change to the cookie names, the `__Host-` prefix, or the session lifetime.
- The legacy authentication mode keeps working while `CODECAMP_AUTH_MODE=legacy`.
- `apps/codecamp-advantage/lib/__tests__/proxy.test.ts` and `proxy-role.test.ts`
  are updated, not deleted; the administrator role gate must not weaken.

## Acceptance Criteria

- Signing in from `/en/admin` returns the user to `/en/admin` in English.
- Signing in from `/th/lesson/<id>` returns the user to that lesson in Thai.
- A user whose `NEXT_LOCALE` is `en` who opens `/` reaches `/en/`, not `/th/`.
- Opening the service through the `sso-candidate` tagged revision completes the
  sign-in and sets the session cookie.
- A malformed `returnTo` sends the user to `/` with a logged warning and no 500.
- A user whose Accounts identity has no Codecamp role sees an explicit message.
- The administrator gate still redirects a non-administrator away from `/admin`.
- Browser acceptance: run all six cases in the live application and capture
  screenshots plus the redirect chain from the network panel.

## Out of Scope

- Removing the legacy authentication adapter. That needs an owner decision and a
  date, and it is recorded as a follow-up in `tech-debt.md`.
- Changing the default locale away from Thai.
- Any change to the Accounts service.
