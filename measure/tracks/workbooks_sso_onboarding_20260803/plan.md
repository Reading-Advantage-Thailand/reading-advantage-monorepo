# Implementation Plan: Workbooks Company SSO Onboarding and Deployability

Exemplar for every application-side file is `apps/marketing` — the cleanest
company-only integration. Mirror its shape rather than inventing one.

## Phase S1: Register workbooks as an Accounts OIDC client
_Story ref: spec.md#story-s1_

- [ ] Task: Extend the Accounts bootstrap contract
    - [ ] Add a fourth `clientSchema("workbooks", "workbooks-web", "https://workbooks.reading-advantage.com/api/auth/callback")` entry to the `clients` tuple in `apps/accounts/scripts/bootstrap-contract.ts`
    - [ ] Add the matching literal object to `createProductionBootstrapInput`, reading `environment.WORKBOOKS_COMPANY_AUTH_OIDC_CLIENT_SECRET`
- [ ] Task: Extend the bootstrap contract tests
    - [ ] Add the workbooks client to the valid-input fixture in `apps/accounts/scripts/bootstrap-contract.test.ts`
    - [ ] Assert a missing/short workbooks secret rejects, and that no secret value appears in the thrown message
- [ ] Task: Document the registration
    - [ ] Add the workbooks row to `measure/tracks/company_identity_sso_20260715/client-registry-20260719.md`
    - [ ] Add its derivation reference pointing at `apps/workbooks/cloudbuild.yaml`
- [ ] Task: Measure - User Manual Verification 'Phase S1: Register workbooks as an Accounts OIDC client' (Protocol in workflow.md)

## Phase S2: Introduce the WORKBOOK_ADMIN role
_Story ref: spec.md#story-s2_

- [ ] Task: Define the role contract
    - [ ] Add `WORKBOOK_ADMIN: "WORKBOOK_ADMIN"` to `ROLES` in `packages/auth/src/roles.ts`
    - [ ] Add `WORKBOOK_ADMIN: 3` to `ROLE_HIERARCHY` (peer of `ADMIN`/`SALES_ADMIN`)
    - [ ] Add `WORKBOOK_ADMIN: "/"` to `ROLE_ROUTES`
- [ ] Task: Test the role contract
    - [ ] Assert `WORKBOOK_ADMIN` is present in all three maps
    - [ ] Assert `roleAtLeast("WORKBOOK_ADMIN", "TEACHER")` is true and `roleAtLeast("WORKBOOK_ADMIN", "SYSTEM")` is false
- [ ] Task: Measure - User Manual Verification 'Phase S2: Introduce the WORKBOOK_ADMIN role' (Protocol in workflow.md)

## Phase S3: Gate the workbooks app with Company SSO
_Story ref: spec.md#story-s3_

- [ ] Task: Add the auth dependency
    - [ ] Add `"@reading-advantage/auth": "workspace:*"` to `apps/workbooks/package.json` dependencies
    - [ ] Add `@reading-advantage/auth` to `transpilePackages` in `apps/workbooks/next.config.ts`
- [ ] Task: Define the workbooks permission projection
    - [ ] Create `apps/workbooks/app/lib/workbook-permissions.ts` exporting `WorkbookRole = "WORKBOOK_ADMIN"` and `resolveWorkbookRole(roles: readonly string[]): WorkbookRole | null`, mirroring `apps/marketing/app/lib/marketing-permissions.ts`
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
    - [ ] `pnpm --filter @reading-advantage/auth test`
- [ ] Task: Measure - User Manual Verification 'Phase S4: Make apps/workbooks deployable to Cloud Run' (Protocol in workflow.md)
