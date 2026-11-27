# Implementation Plan: Workbooks Company SSO Onboarding and Deployability

Status: shelved, not done (PM 2026-11-27)

> Checkpoint note, 2026-11-27: the four recorded checkpoint SHAs (a4331df,
> 9f78363, 772a618, 2df5248) do not resolve with `git cat-file -e`. The four
> User Manual Verification lines stay open until a real checkpoint exists.

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

## Phase S3: Gate the workbooks app with Company SSO [checkpoint: 772a618]
_Story ref: spec.md#story-s3_

- [x] Task: Add the auth dependency 772a618
    - [x] Add `"@reading-advantage/auth": "workspace:*"` to `apps/workbooks/package.json` dependencies
    - [x] Add `@reading-advantage/auth` to `transpilePackages` in `apps/workbooks/next.config.ts`
- [x] Task: Create the OIDC adapter 772a618
    - [x] Create `apps/workbooks/app/lib/company-oidc.ts` mirroring `apps/marketing/app/lib/company-oidc.ts`, exporting `WORKBOOKS_SESSION_COOKIE = "__Host-ra_workbooks_session"`, `WORKBOOKS_TRANSACTION_COOKIE = "__Host-ra_workbooks_oidc_tx"`, `getWorkbooksPublicOrigin()`, `getWorkbooksOidcClient()`, `readWorkbooksCookie()`, `workbooksSessionUser()`
- [x] Task: Write Red tests for the handshake 772a618
    - [x] Test `resolveWorkbookRole` returns null without `WORKBOOK_ADMIN`
    - [x] Test `workbooksSessionUser` returns null for a non-workbook identity
    - [x] Test the callback route redirects to the error path when `code`, `state`, or the transaction cookie is absent
- [x] Task: Implement the SSO routes 772a618
    - [x] Create `apps/workbooks/app/api/auth/company/start/route.ts`
    - [x] Create `apps/workbooks/app/api/auth/callback/route.ts`
    - [x] Create `apps/workbooks/app/api/auth/logout/route.ts`
- [x] Task: Authorize the server actions and the editions route 772a618
    - [x] Derive `tenantId` and the actor from the verified session inside `publishDraftAction` and `createDraftAction`; remove them as caller-supplied arguments
    - [x] Reject with a structured failure when the session is absent or `resolveWorkbookRole` returns null
    - [x] Require a session in `GET /api/editions` and derive `tenantId` from it rather than the query string
- [x] Task: Add the deny-by-default route gate 772a618
    - [x] Create `apps/workbooks/proxy.ts` exporting `proxy(request)` and a `config.matcher`, redirecting any non-handshake path without a session cookie to `/api/auth/company/start?returnTo=…` (9/9 proxy tests; mutation-tested)
- [ ] Task: Measure - User Manual Verification 'Phase S3: Gate the workbooks app with Company SSO' (Protocol in workflow.md)

## Phase S4: Make apps/workbooks deployable as a container [checkpoint: 2df5248]
_Story ref: spec.md#story-s4_

- [x] Task: Create the container build 2df5248
    - [x] Create `apps/workbooks/Dockerfile` for the existing `output: "standalone"` build, honoring Cloud Run's `PORT`
    - [x] Create `apps/workbooks/.dockerignore`
- [x] Task: Create the deploy pipeline 2df5248
    - [x] Create `apps/workbooks/cloudbuild.yaml` with build, push, and `gcloud run deploy` steps
    - [x] Pass `COMPANY_AUTH_ISSUER_URL`, `COMPANY_AUTH_OIDC_CLIENT_ID=workbooks-web`, `COMPANY_AUTH_OIDC_REDIRECT_URI`, `COMPANY_AUTH_EXPECTED_AUDIENCE=workbooks`, `COMPANY_AUTH_CLOCK_SKEW_SECONDS=30` via `--set-env-vars`
    - [x] Pass `COMPANY_AUTH_OIDC_CLIENT_SECRET=WORKBOOKS_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest` and `DATABASE_URL` (as `WORKBOOKS_DATABASE_URL:latest`, sibling convention) via `--set-secrets`
    - [x] Pass no secret as `--build-arg`
- [x] Task: Verify the quality gate 2df5248
    - [x] `pnpm --filter workbooks check-types`, `lint`, `test`, `build` — all pass (9/9 tests)
    - [x] Confirm `packages/auth` and `packages/db` are unmodified by this track
    - [x] Functional runner boot: `/` returns 307 → `/api/auth/company/start?returnTo=%2F` (deny-by-default verified)
- [ ] Task: Measure - User Manual Verification 'Phase S4: Make apps/workbooks deployable to Cloud Run' (Protocol in workflow.md)

## Phase S5: Provider-neutral deploy (Daniel, 2026-11-27)
_Story ref: spec.md#story-s5_

> Red/Green grouping: S5.1 is Red. S5.2 to S5.7 are Green. S5.8 is the phase
> verification. The image is the product; providers are adapters.
> Cloudflare trials and adapters use the free tier. Any paid plan or a new account cost goes to Daniel as a spend Task with the price before the spend.

- [ ] Task: S5.1 Red — keep apps/workbooks free of provider SDKs and provider variables
  - What: add a grep-style test over `apps/workbooks` source, `package.json` dependencies, and `Dockerfile`. Reject `@google-cloud`, `firebase`, `aws-sdk`, `@aws-sdk`, `cloudflare`, `wrangler`, `K_SERVICE`, `GOOGLE_`, `AWS_`, and `CF_`. Allow those names only under `apps/workbooks/deploy/<provider>/`. Add a fixture that proves the test fails on a hit.
  - Done when: every fixture hit fails and the current tree passes. No deploy runs.
- [ ] Task: S5.2 Green — keep the Dockerfile generic
  - What: keep the Node standalone output, read `PORT` from the environment, and write no provider name in a comment.
  - Done when: the Dockerfile names no provider and the image starts on the given `PORT`.
- [ ] Task: S5.3 Green — move each provider adapter under `apps/workbooks/deploy/<provider>/`
  - What: move today's `apps/workbooks/cloudbuild.yaml` to `apps/workbooks/deploy/gcp/`. Add `deploy/aws/` and `deploy/cloudflare/`. Each adapter only builds, pushes, and runs the same image with the same environment variables.
  - Done when: no provider file remains at the app root and each adapter names the same image and variables.
- [ ] Task: S5.4 Green — write the aws adapter
  - What: build, push, and run the same image. Add no account setup.
  - Done when: the adapter holds build, push, and run steps and no account creation step.
- [ ] Task: S5.5 Green — write the cloudflare adapter
  - What: align with the Phase 4 adapter plan of `typescript7_native_migration_20260710`. Reference that plan; do not duplicate it.
  - Done when: the adapter points at that plan and uses the same image and variables.
- [ ] Task: S5.6 Green — write one short deploy note
  - What: create `apps/workbooks/deploy/README.md` listing the environment variables and the three adapters.
  - Done when: the note names every adapter variable and all three providers.
- [ ] Task: S5.7 Green — run the light gates
  - What: run lint, type check, the S5.1 test, and a local Docker build of the image through `/home/daniebo/Desktop/advantage-pr/scripts/jobs/heavy-run.sh`. Run no real deploy and no account setup. The team deploys.
  - Done when: all four gates exit 0 and the results are recorded here.
- [ ] Task: Measure - User Manual Verification 'Phase S5: Provider-neutral deploy' (Protocol in workflow.md)
  - What: decide this line on the recorded results of S5.1 to S5.7. Write `Evidence: accepted on the recorded phase results`. Do not use `deferred:product-owner` or `deferred:pm`.
  - Done when: S5.1 to S5.7 are `[x]` and the evidence line is recorded.
