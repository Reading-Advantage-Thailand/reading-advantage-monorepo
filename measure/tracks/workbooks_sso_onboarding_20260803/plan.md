# Implementation Plan: Workbooks Company SSO Onboarding and Deployability

Exemplar for every application-side file is `apps/marketing` — the cleanest
company-only integration. Mirror its shape rather than inventing one.

## Phase S1: Register workbooks as an Accounts OIDC client [checkpoint: a4331df]
_Story ref: spec.md#story-s1_

- [x] Task: Extend the Accounts bootstrap contract a4331df
    - [x] Add a fourth `clientSchema("workbooks", "workbooks-web", "https://workbooks.reading-advantage.com/api/auth/callback")` entry to the `clients` tuple in `apps/accounts/scripts/bootstrap-contract.ts`
    - [x] Add the matching literal object to `createProductionBootstrapInput`, reading `environment.WORKBOOKS_COMPANY_AUTH_OIDC_CLIENT_SECRET`
- [x] Task: Extend the bootstrap contract tests a4331df
    - [x] Add the workbooks client to the valid-input fixture in `apps/accounts/scripts/bootstrap-contract.test.ts`
    - [x] Assert a missing/short workbooks secret rejects, and that no secret value appears in the thrown message
- [x] Task: Document the registration a4331df
    - [x] Add the workbooks row to `measure/tracks/company_identity_sso_20260715/client-registry-20260719.md`
    - [x] Add its derivation reference pointing at `apps/workbooks/cloudbuild.yaml`
- [ ] Task: Measure - User Manual Verification 'Phase S1: Register workbooks as an Accounts OIDC client' (Protocol in workflow.md)

## Phase S2: Define the WORKBOOK_ADMIN application role [checkpoint: 9f78363]
_Story ref: spec.md#story-s2_

> **Corrected 2026-08-03.** The first attempt added `WORKBOOK_ADMIN` to `ROLES`
> in `packages/auth/src/roles.ts`. `npx tsc --noEmit` in `packages/auth` rejected
> it: the `Role` union is bound to the `role` pgEnum in
> `packages/db/src/schema/users.ts:5`, so widening it breaks Drizzle insert
> assignability and would need a Postgres enum migration. That is also the wrong
> home — `ROLES` is the product learner model, and no app-specific SSO role lives
> there. Reverted; the role is now application-local, mirroring Marketing.

- [x] Task: Define the workbooks role contract 9f78363
    - [x] Create `apps/workbooks/app/lib/workbook-permissions.ts` exporting `WorkbookRole` and `resolveWorkbookRole(roles: readonly string[]): WorkbookRole | null`, mirroring `apps/marketing/app/lib/marketing-permissions.ts`
- [x] Task: Test the workbooks role contract 9f78363
    - [x] Assert `resolveWorkbookRole(["WORKBOOK_ADMIN"])` returns `"WORKBOOK_ADMIN"`
    - [x] Assert `ADMIN`, `SALES_ADMIN`, and `[]` all resolve to `null`
    - [x] Assert `packages/auth/src/roles.ts` is untouched by this track
- [ ] Task: Measure - User Manual Verification 'Phase S2: Define the WORKBOOK_ADMIN application role' (Protocol in workflow.md)

## Phase S3: Gate the workbooks app with Company SSO
_Story ref: spec.md#story-s3_

- [ ] Task: Add the auth dependency
    - [ ] Add `"@reading-advantage/auth": "workspace:*"` to `apps/workbooks/package.json` dependencies
    - [ ] Add `@reading-advantage/auth` to `transpilePackages` in `apps/workbooks/next.config.ts`
- [ ] Task: Create the OIDC adapter
    - [ ] Create `apps/workbooks/app/lib/company-oidc.ts` mirroring `apps/marketing/app/lib/company-oidc.ts`, exporting `WORKBOOKS_SESSION_COOKIE = "__Host-ra_workbooks_session"`, `WORKBOOKS_TRANSACTION_COOKIE = "__Host-ra_workbooks_oidc_tx"`, `getWorkbooksPublicOrigin()`, `getWorkbooksOidcClient()`, `readWorkbooksCookie()`, `workbooksSessionUser()`
- [ ] Task: Write Red tests for the handshake
    - [ ] Test `resolveWorkbookRole` returns null without `WORKBOOK_ADMIN`
    - [ ] Test `workbooksSessionUser` returns null for a non-workbook identity
    - [ ] Test the callback route redirects to the error path when `code`, `state`, or the transaction cookie is absent
- [ ] Task: Implement the SSO routes
    - [ ] Create `apps/workbooks/app/api/auth/company/start/route.ts`
    - [ ] Create `apps/workbooks/app/api/auth/callback/route.ts`
    - [ ] Create `apps/workbooks/app/api/auth/logout/route.ts`
- [ ] Task: Authorize the server actions and the editions route
    - [ ] Derive `tenantId` and the actor from the verified session inside `publishDraftAction` and `createDraftAction`; remove them as caller-supplied arguments
    - [ ] Reject with a structured failure when the session is absent or `resolveWorkbookRole` returns null
    - [ ] Require a session in `GET /api/editions` and derive `tenantId` from it rather than the query string
- [ ] Task: Add the deny-by-default route gate
    - [ ] Create `apps/workbooks/proxy.ts` exporting `proxy(request)` and a `config.matcher`, redirecting any non-handshake path without a session cookie to `/api/auth/company/start?returnTo=…`
- [ ] Task: Measure - User Manual Verification 'Phase S3: Gate the workbooks app with Company SSO' (Protocol in workflow.md)

## Phase S4: Make apps/workbooks deployable to Cloud Run
_Story ref: spec.md#story-s4_

- [ ] Task: Create the container build
    - [ ] Create `apps/workbooks/Dockerfile` for the existing `output: "standalone"` build, honoring Cloud Run's `PORT`
    - [ ] Create `apps/workbooks/.dockerignore`
- [ ] Task: Create the deploy pipeline
    - [ ] Create `apps/workbooks/cloudbuild.yaml` with build, push, and `gcloud run deploy` steps
    - [ ] Pass `COMPANY_AUTH_ISSUER_URL`, `COMPANY_AUTH_OIDC_CLIENT_ID=workbooks-web`, `COMPANY_AUTH_OIDC_REDIRECT_URI`, `COMPANY_AUTH_EXPECTED_AUDIENCE=workbooks`, `COMPANY_AUTH_CLOCK_SKEW_SECONDS=30` via `--set-env-vars`
    - [ ] Pass `COMPANY_AUTH_OIDC_CLIENT_SECRET=WORKBOOKS_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest` and `DATABASE_URL` via `--set-secrets`
    - [ ] Pass no secret as `--build-arg`
- [ ] Task: Verify the quality gate
    - [ ] `pnpm --filter workbooks check-types`, `lint`, `test`, `build`
    - [ ] Confirm `packages/auth` and `packages/db` are unmodified by this track
- [ ] Task: Measure - User Manual Verification 'Phase S4: Make apps/workbooks deployable to Cloud Run' (Protocol in workflow.md)
