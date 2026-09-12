# Specification: Workbooks Company SSO Onboarding and Deployability

## Overview

`apps/workbooks` exists but is unreachable as a product: it has no identity, no
route gate, and no deployment artifacts. Accounts does not recognize it as a
client, so there is no way to sign in even if it were deployed.

This track registers `workbooks` as the fourth Company SSO client, introduces a
single `WORKBOOK_ADMIN` role, gates the application behind an Accounts-issued
session, and produces the Cloud Run build and deploy artifacts. It is
deliberately narrow: it makes the existing workbooks scaffold reachable and
protected, and does not port any authoring functionality.

**Sprint goal:** Make `apps/workbooks` a deployable Company-SSO application that
only `WORKBOOK_ADMIN` employees can reach.

## Baseline and Evidence

Verified against the working tree on 2026-08-03:

- `apps/accounts/scripts/bootstrap-contract.ts` registers exactly three clients
  as a `z.tuple` of `z.literal` schemas: `marketing-web`, `sales-web`,
  `codecamp-web`. The tuple is fixed-arity, so an unregistered application fails
  closed at bootstrap validation.
- `measure/tracks/company_identity_sso_20260715/client-registry-20260719.md`
  documents the same three production clients. That track is ARCHIVE-PENDING and
  scoped to Marketing, Sales, and Codecamp; it will not absorb workbooks.
- `packages/auth/src/roles.ts` defines seven roles. None is workbook-related.
- `apps/workbooks/package.json` depends on `db`, `domain`, `storage` — **not**
  `@reading-advantage/auth`.
- `apps/workbooks` has neither `proxy.ts` nor `middleware.ts`, no
  `app/api/auth/**`, no `Dockerfile`, and no `cloudbuild.yaml`.
- `apps/workbooks/next.config.ts` already sets `output: "standalone"` and
  `outputFileTracingRoot`, so it is container-ready.

The closest existing coverage is two unstarted task lines in
`workbook_content_versioning_20260711` (S0 "Ratify internal
editor/publisher/auditor roles", S4 "Scaffold `apps/workbooks` as a separately
deployable Company-SSO application"). Neither covers Accounts-side registration,
and S4's "scaffold" premise is already stale — the app was scaffolded without
auth. This track takes the identity and deployability slice so it can ship ahead
of S0–S3.

## Product and Boundary Decisions

1. **One role, not three.** `WORKBOOK_ADMIN` is the only new role. The
   editor/publisher/auditor split stays with `workbook_content_versioning` S0,
   which owns ratifying it. Adding one role now avoids putting workbooks on the
   shared `ADMIN` role without pre-empting that decision.
1a. **The role is application-local, not a product role.** *(Corrected
   2026-08-03 during S2 implementation.)* `ROLES` in `packages/auth/src/roles.ts`
   is the **product learner** role model — it is bound to the `role` pgEnum on
   the `users` table (`packages/db/src/schema/users.ts:5`), so widening the
   `Role` union breaks Drizzle insert assignability and would require a Postgres
   enum migration. It is also the wrong model: no app-specific SSO role lives
   there. Marketing declares `MarketingRole` in its own
   `app/lib/marketing-permissions.ts` and resolves it from the Accounts-issued
   `identity.roles`. Workbooks follows that pattern. `packages/auth` is not
   modified by this track.
2. **Marketing is the exemplar, not Sales.** Marketing is the cleanest
   company-only integration (no legacy auth mode, no i18n middleware). Workbooks
   copies its shape: an `app/lib/company-oidc.ts` adapter, `start`/`callback`/
   `logout` routes, and host-only cookies.
3. **No legacy auth mode.** Workbooks has no pre-existing credential system, so
   it ships company-only. There is no `WORKBOOKS_AUTH_MODE` switch.
4. **Deny by default.** Every route except the SSO handshake endpoints and
   Next.js internals requires a session cookie. This is the inverse of Sales,
   which allow-lists protected prefixes.
5. **Cookie-presence gate only in `proxy.ts`.** Exact role authorization is
   enforced server-side in route handlers, matching the comment already in
   `apps/sales-advantage/proxy.ts`. The proxy is a routing hint, not the
   security boundary.

## Stories

### Story S1: Register workbooks as an Accounts OIDC client
**As a** platform operator
**I want** Accounts to recognize `workbooks-web` as a registered client
**So that** the workbooks app can complete an authorization code exchange

**Acceptance Criteria:**
- Given the production bootstrap environment, When `createProductionBootstrapInput` runs with `WORKBOOKS_COMPANY_AUTH_OIDC_CLIENT_SECRET` set, Then it returns four clients including `applicationKey: "workbooks"`, `clientId: "workbooks-web"`, and redirect `https://workbooks.reading-advantage.com/api/auth/callback`.
- Given that same environment with the workbooks secret missing or shorter than 32 characters, When bootstrap input is built, Then it throws without rendering any secret value.
- Given the client registry document, When an operator reads it, Then workbooks appears with the same columns as the other three clients.

**Estimate:** S
**Priority:** Must

### Story S2: Define the WORKBOOK_ADMIN application role
**As a** company administrator
**I want** a distinct workbooks role resolved from the Accounts identity
**So that** workbook access is grantable without granting any product role

**Acceptance Criteria:**
- Given `apps/workbooks/app/lib/workbook-permissions.ts`, When it is read, Then it exports a `WorkbookRole` type and a `resolveWorkbookRole(roles: readonly string[]): WorkbookRole | null`.
- Given an Accounts identity whose `roles` include `WORKBOOK_ADMIN`, When resolved, Then `"WORKBOOK_ADMIN"` is returned.
- Given an identity with only `ADMIN`, `SALES_ADMIN`, or an empty role list, When resolved, Then `null` is returned — no product role grants workbook access.
- Given `packages/auth/src/roles.ts`, When the track completes, Then it is **unchanged**.

**Estimate:** S
**Priority:** Must

### Story S3: Gate the workbooks app with Company SSO
**As an** employee with `WORKBOOK_ADMIN`
**I want** to sign in through Accounts and reach the workbooks workspace
**So that** the app is usable without exposing it publicly

**Acceptance Criteria:**
- Given an unauthenticated browser, When any non-handshake path is requested, Then the response redirects to `/api/auth/company/start` with `returnTo` preserved.
- Given a completed Accounts callback, When the exchange succeeds, Then a host-only `__Host-ra_workbooks_session` cookie is set and the browser lands on `returnTo`.
- Given a callback missing `code`, `state`, or the transaction cookie, When it is handled, Then the transaction cookie is cleared and the browser is redirected to an error path with no secret in the URL.
- Given a verified identity whose roles exclude `WORKBOOK_ADMIN`, When the session user is projected, Then the projection is `null`.

**Estimate:** M
**Priority:** Must

### Story S4: Make apps/workbooks deployable to Cloud Run
**As a** platform operator
**I want** build and deploy artifacts for workbooks
**So that** the app can be pushed to GCP with its SSO configuration bound

**Acceptance Criteria:**
- Given `apps/workbooks/Dockerfile`, When the standalone output is built, Then the image starts the server on the port Cloud Run provides.
- Given `apps/workbooks/cloudbuild.yaml`, When it is read, Then `COMPANY_AUTH_*` values arrive via `--set-env-vars` and the client secret via `--set-secrets`, never as a `--build-arg`.
- Given the deploy step, When it is read, Then the service is **not** deployed with `--allow-unauthenticated` unless SSO gating is already active.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- **NFR-1:** No secret value is ever passed as a Docker build argument or baked
  into an image layer. This deliberately departs from
  `apps/reading-advantage/cloudbuild.yaml`, which bakes secrets via `ARG`/`ENV`.
- **NFR-2:** Session and transaction cookies are `__Host-` prefixed, `httpOnly`,
  `sameSite: "lax"`, and `secure` in production.
- **NFR-3:** Redirect URIs are exact. No wildcard, alternate host, or implicit
  audience is registered, per the existing client registry rule.
- **NFR-4:** No new dependency is added to the root `package.json`, and
  `pnpm-lock.yaml` is not hand-edited.

## Track-Level Acceptance Criteria

- `pnpm --filter workbooks check-types`, `lint`, `test`, and `build` all pass.
- `packages/auth` and `packages/db` are unmodified; `npx tsc --noEmit` in
  `packages/auth` still reports zero errors.
- Accounts bootstrap contract tests pass with four registered clients.
- The client registry document lists four clients.
- An unauthenticated request to `/` redirects rather than rendering the page.

## Out of Scope

- Porting any authoring functionality from `advantage-workbooks/dashboard`.
- The editor/publisher/auditor role split (owned by `workbook_content_versioning` S0).
- Seeding the client row in the Accounts database at runtime — this track defines
  the contract; the existing Accounts bootstrap step performs the seeding.
- DNS and TLS provisioning for `workbooks.reading-advantage.com`.
- Any change to the three existing OIDC clients.
