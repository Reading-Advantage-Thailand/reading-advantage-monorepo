# Specification: Sales and Marketing SSO Parity and Demo Accounts

## Overview

Company single sign-on is live on Sales and Marketing. Both apps carry the
same redirect-chain defect family that the Codecamp repair track fixed: a
lost destination, a reset language, a 500 on a malformed return path, and
invisible sign-in errors. Marketing also loses every deep-link destination
because its login path never carries one. This track ports the proven
Codecamp repair to Sales and Marketing, adds the missing role-denial
message, and provisions demo-only sign-in accounts with generated
credentials so authenticated browser acceptance can run without employee
credentials.

## Evidence

| Defect | Location |
|---|---|
| The Sales proxy writes a dead `redirectTo` parameter that no route reads | `apps/sales-advantage/proxy.ts:52` |
| The Sales proxy overwrites `NEXT_LOCALE` on every unprefixed request | `apps/sales-advantage/proxy.ts:70-73` |
| The Sales default locale is Thai, so English users are reset | `apps/sales-advantage/i18n/routing.ts:5` |
| The Sales start route passes an unvalidated `returnTo` to the OIDC client | `apps/sales-advantage/app/api/auth/company/start/route.ts:10-11` |
| The Marketing start route passes an unvalidated `returnTo` to the OIDC client | `apps/marketing/app/api/auth/company/start/route.ts:10-11` |
| The shared client validates the return path; the parse throws on unsafe input | `packages/auth/src/company-identity/client.ts:87` (schema), `client.ts:293` (throwing parse) |
| The Sales callback sets a session without any app-role check, so a no-role user gets a silent empty session | `apps/sales-advantage/app/api/auth/callback/route.ts:21-38` |
| The Sales session route returns HTTP 200 with a null session instead of a denial state | `apps/sales-advantage/app/api/auth/session/route.ts:7-12` |
| The Sales callback and the Marketing callback send failures to an error page that renders nothing | `apps/sales-advantage/app/api/auth/callback/route.ts:19,50`; `apps/marketing/app/api/auth/callback/route.ts:19,40` |
| The Marketing callback returns early on a missing transaction without expiring the cookie | `apps/marketing/app/api/auth/callback/route.ts:18-20` |
| Marketing deep links redirect to `/login` without carrying the destination | `apps/marketing/app/campaigns/page.tsx:48-50`, `app/campaigns/[id]/page.tsx`, `app/campaigns/[id]/video/page.tsx`, `app/settings/page.tsx` |
| The Marketing login page builds the start link without any `returnTo` | `apps/marketing/app/login/page.tsx:38-40` |
| `getPublicUrl` is duplicated in the Sales proxy; the Codecamp copy already moved out with origin approval | `apps/sales-advantage/proxy.ts:11-25` |
| The auth mode accepts only `company` and `legacy-school`; the start route has no gate for the legacy mode | `apps/sales-advantage/lib/auth-mode.ts:2,13-16` |
| The Codecamp repair proved this defect family live; the Sales and Marketing rows are code-confirmed, not browser-confirmed | `measure/tracks/codecamp_sso_redirect_repair_20260820/ux-browser-audit-20260829.md` (findings F1-F4) |

The owner confirmed on 2026-08-29: open this parity track inside the
five-app launch program, and provision demo-only accounts with strong
generated credentials stored in a gitignored `.env`.

## Reproduction

Sales:

1. Set the interface language to English.
2. Sign out.
3. Open `https://sales.reading-advantage.com/en/module`.
4. Observe the redirect to `/?redirectTo=/en/module`, then to the Thai
   landing page. The destination and the language are lost.
5. Request `/api/auth/company/start?returnTo=https://evil.example.com`.
6. Observe HTTP 500.

Marketing:

1. Open a deep link that requires sign-in, such as a campaigns page.
2. Observe the redirect to `/login` with no destination parameter.
3. Sign in.
4. Observe the landing on the default page, not the requested page.
5. Request `/api/auth/company/start?returnTo=https://evil.example.com`.
6. Observe HTTP 500.
7. Complete a failed sign-in.
8. Observe `/login?error=sso` with no visible message.

## Functional Requirements

**FR-1 - The sign-in entries carry the destination.**
The Sales login form sends the full locale-prefixed path with its query
string as `returnTo`. Marketing pages that redirect to `/login` use one
shared redirect helper that appends the original path and query as
`returnTo`; the login page forwards that value to the start route.

**FR-2 - One redirect parameter, not two.**
`redirectTo` is removed from `apps/sales-advantage/proxy.ts`. The proxy
redirects an unauthenticated protected-path request straight to
`/api/auth/company/start?returnTo=<original path>`. The dead parameter and
its tests are deleted.

**FR-3 - The language choice survives.**
The Sales proxy reads the existing `NEXT_LOCALE` cookie and uses it to
choose the prefix for an unprefixed path. It writes the cookie only when no
valid cookie is present. Marketing has no proxy and no locale routing, so
this requirement does not apply to it.

**FR-4 - Redirects honor the forwarding hop and approved origins.**
The Sales `getPublicUrl` moves to `apps/sales-advantage/lib/public-url.ts`
and gains `getPublicOrigin` and `getSalesCallbackOrigin`. The port follows
the Codecamp rule: a forwarded origin is used only when it is on the
approved list; the helper rejects an unapproved forwarded origin the way
the Codecamp helper does, and the calling route then builds its target from
the configured public origin. The approved list contains the production
origin and the `SALES_PREVIEW_ORIGINS` values. A start request that arrives
on an approved preview origin hands off to the same start route on the
callback origin, preserving `returnTo`; the transaction, the callback, and
the session cookie live on the callback origin, exactly as the Codecamp
start route does. The candidate revisions therefore prove the proxy, the
redirect, and the error-surface behavior without a second registered
callback. The Sales proxy, callback, start, and logout routes use the
helper. The Marketing callback, logout, and login routes follow the same
rule through their existing helper and `MARKETING_PREVIEW_ORIGINS`, with
the same handoff on their start route.

**FR-5 - An unsafe return path restarts the flow cleanly.**
The Sales and Marketing start routes catch the validation error thrown by
the shared OIDC client, restart the authorization handoff with `returnTo=/`,
and log one structured line. Neither route returns a 500 for any `returnTo`
input.

**FR-6 - A failed sign-in says why.**
The Sales landing page renders a visible message for `sso` and `forbidden`.
The Marketing `/login` page renders a visible message for `sso`. No other
code is enumerated, because no other producer exists in either app.

**FR-7 - A user without the app role sees the denial.**
The Sales callback checks the Sales app role after the exchange. A user
with no Sales role is redirected to the landing page with
`?error=forbidden`. The session route reports the denial with HTTP 403 and
a JSON body of `{"session": null, "denied": true}` instead of the silent
HTTP 200 with a null session.

**FR-8 - Demo accounts are generated, strong, and leak-free.**
A seed script generates demo-only identities in the `company_identity`
database: one Sales rep, one Marketing user, and one no-role identity. The
script generates each password with a cryptographic random generator from
at least 24 random bytes, and writes it only to the gitignored `.env`. The
script accepts no owner-supplied password. The Sales rep and Marketing
user identities carry an expiry of at most 90 days on their role
assignments, the only place the schema stores expiry. The no-role identity
has no role assignment, so the acceptance run disables it with the disable
command as its final step; the runbook records that step. The script is an
idempotent upsert keyed on username. It prints usernames only, to stdout
and stderr. It provides a disable command and a rotation command; rotation
replaces the password and extends the role expiry. No password appears in
git, in logs, or in test output.

## Non-Functional Requirements

- No change to `packages/auth/src/company-identity/client.ts` beyond its use.
- No change to the cookie names, the `__Host-` prefix, or the session lifetime.
- Error paths delete or expire the transaction cookie, matching the Codecamp
  callback behavior, including the Marketing early-return path.
- The Sales legacy-school mode keeps working while
  `SALES_AUTH_MODE=legacy-school`, and the `legacy-rollback` revision stays a
  valid rollback anchor. In that mode the company start route redirects to
  the locale-prefixed landing page, where the legacy form renders, instead
  of starting the OIDC handoff.
- The administrator and role gates do not weaken. The Sales proxy keeps its
  routing-hint behavior; exact authorization stays in the backend.
- The Marketing candidate and ledger release pipeline gains only the
  preview-origin wiring and the pre-promotion acceptance gate; its ledger
  semantics do not change. The Sales cloudbuild gains the same gate.
- The demo-account seed runs only through `COMPANY_AUTH_DIRECT_DATABASE_URL`
  and the accounts bootstrap contract.

## Acceptance Criteria

- Opening `https://sales.reading-advantage.com/en/module` unauthenticated
  redirects to the sign-in start with `returnTo=%2Fen%2Fmodule`.
- A Sales user whose `NEXT_LOCALE` is `en` who opens `/` reaches `/en/`, not
  `/th/`.
- A malformed `returnTo` on either start route restarts the authorization
  flow with `returnTo=/`: the response is a 307 to the Accounts authorize
  URL, one warning is logged, and no 500 occurs.
- A failed sign-in on either app shows a visible message that names the
  error code.
- Opening any Marketing deep link unauthenticated redirects to `/login`
  with the destination, and sign-in lands the user back on that page. The
  redirect sites are the campaigns list, a campaign detail, a campaign
  video, and the settings page.
- A signed-in Sales user without a Sales role sees the `forbidden` message.
- A non-admin demo account cannot enter the Sales admin area; the gate
  stays intact.
- The candidate revisions accept the preview origins. The unauthenticated
  cases and the start-route cases run on the candidate URLs, a start on a
  candidate URL hands off to the production start with the destination
  preserved, and the handoff completes sign-in with a session cookie.
  Promotion to production traffic runs only after the candidate acceptance
  note passes.
- After promotion, the authenticated matrix runs on production with the
  rollback anchor ready.
- The acceptance run disables the no-role identity as its final step.
- A demo account completes the authenticated round-trip on Sales and lands
  on the requested page in the requested language. A demo account completes
  the authenticated round-trip on Marketing and lands on the requested page.
- The demo seed output contains usernames and no password material.
- Browser acceptance: every case runs against the deployed candidate
  revision or, for the authenticated matrix, against production after
  promotion. Capture screenshots and the redirect chain for each case.

## Out of Scope

- Codecamp. The `codecamp_sso_redirect_repair_20260820` track owns it.
- Accounting, www, and the accounting dedicated-database launch track.
- The Accounts issuer service.
- Removing either legacy authentication adapter.
- Adding a Marketing proxy or middleware. Marketing recovers deep links
  through `returnTo` on the login path, not through route gating.
- A shared cross-app helper package. This track ports the proven Codecamp
  pattern per app; a future shared package is recorded as tech debt with a
  named owner.
- The `packages/codecamp-knowledge` build break. The APK lane owns it.
