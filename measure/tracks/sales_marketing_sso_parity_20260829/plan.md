# Implementation Plan: Sales and Marketing SSO Parity and Demo Accounts

> **Browser acceptance.** Run every acceptance case in the live application
> with the demo accounts. Capture a screenshot of the landing page and the
> redirect chain from the network panel for each case. Unit tests on
> `proxy.ts` alone do not close a phase; the defects are host-dependent and
> cookie-dependent.

> **Deploy safely.** Sales deploys a tagged no-traffic revision first; the
> `legacy-rollback` tag on `sales-advantage-00004` stays the rollback anchor.
> Marketing uses its candidate and ledger release pipeline. The candidate
> revisions carry the preview origins so the authenticated cases run before
> any traffic shift.

> **External build blocker.** `packages/codecamp-knowledge` currently breaks
> `turbo run build` from APK-track commit `ab3812707`. The APK lane owns that
> repair. Record its exit code honestly and never count it against this
> track.

## Phase 1: Contract & Schema Definition

_Blast radius: Sales - `proxy.ts`, `lib/public-url.ts`, `lib/locale-resolution.ts`,
`lib/sign-in-href.ts`, `lib/company-oidc.ts`, `lib/auth-mode.ts`, the start,
callback, logout, and session auth routes, `components/login-form.tsx`, the
landing page, both locale files, `cloudbuild.yaml`, and the package test
scripts. Marketing - the shared login-redirect helper and its call sites in
`app/campaigns/page.tsx`, `app/campaigns/[id]/page.tsx`,
`app/campaigns/[id]/video/page.tsx`, `app/settings/page.tsx`,
`app/login/page.tsx`, the login, start, callback, and logout routes,
`cloudbuild.yaml`, and the package test scripts. Shared - the demo seed
extends `apps/accounts/scripts/` and writes to the `company_identity`
database. `packages/auth/src/company-identity/client.ts` stays unchanged._

- [x] Task: Define the Sales public URL and origin-approval contract
    - [x] Create `apps/sales-advantage/lib/public-url.ts` exporting `getPublicUrl(request, pathname)`
    - [x] Add `getPublicOrigin(request): URL` for the auth routes, which need an origin rather than a path
    - [x] Document the precedence: `x-forwarded-proto` and `x-forwarded-host` first, then the request URL
    - [x] Port the Codecamp rule: a forwarded origin is used only when it is on the approved list; the helper rejects an unapproved origin the way the Codecamp helper does, and the calling route then builds its target from the configured public origin
    - [x] Define the approved list: the production origin plus the `SALES_PREVIEW_ORIGINS` values
    - [x] Add `getSalesCallbackOrigin()` reading the configured `COMPANY_AUTH_OIDC_REDIRECT_URI`
    - [x] Define the preview handoff, mirroring the Codecamp start route: a start request that arrives on an approved preview origin redirects to the same start route on the callback origin with `returnTo` preserved; the transaction, the callback, and the session cookie live on the callback origin
    - [x] Strip the port only when the forwarded host carries none, matching the current behavior
- [x] Task: Define the Sales locale resolution contract
    - [x] Add `resolveRequestLocale(request): { locale, fromCookie: boolean }` to `apps/sales-advantage/lib/locale-resolution.ts`
    - [x] A cookie value counts only when it is a member of `routing.locales`
    - [x] The contract states that the proxy writes `NEXT_LOCALE` only when `fromCookie` is false
- [x] Task: Define the Sales sign-in entry contract
    - [x] `buildSignInHref(pathname: string, search: string): string` in `apps/sales-advantage/lib/sign-in-href.ts`
    - [x] The output is always `/api/auth/company/start?returnTo=<encoded path>`
    - [x] The encoded path is relative, starts with a single `/`, and never carries a host
- [x] Task: Define the Sales auth-mode gate contract
    - [x] The company start route reads the mode through `lib/auth-mode.ts`, which accepts only `company` and `legacy-school`
    - [x] In `legacy-school` mode the start route redirects to the locale-prefixed landing page, where the legacy form renders, instead of starting the OIDC handoff
    - [x] In `company` mode the start route behaves as FR-5 defines
- [x] Task: Define the Marketing deep-link recovery contract
    - [x] One shared redirect helper appends the original path and query as `returnTo` on every redirect to `/login`
    - [x] The call sites are the campaigns list, a campaign detail, a campaign video, and the settings page
    - [x] The login page forwards the `returnTo` value it received to the start route
    - [x] The callback lands the user on the preserved destination after the exchange
- [x] Task: Define the Marketing return-path contract
    - [x] The start route catches the validation error thrown by the shared OIDC client
    - [x] An unsafe value restarts the authorization handoff with `returnTo=/` and logs one structured line
    - [x] The route never returns a 500 for any `returnTo` input
- [x] Task: Define the Sales error surface and role-denial contract
    - [x] Enumerate the landing page codes with producers: `sso` from the callback failure paths, `forbidden` from the callback role check
    - [x] Add one message key per code to both Sales locale files
    - [x] The callback checks the Sales app role after the exchange and redirects to the landing page with `?error=forbidden` when the role is absent
    - [x] The session route answers a no-role session with HTTP 403 and a JSON body of `{"session": null, "denied": true}`
- [x] Task: Define the Marketing error surface contract
    - [x] Enumerate the `/login` page codes with producers: `sso` from the callback failure paths
    - [x] Add one message key per code
- [x] Task: Define the demo account contract
    - [x] Credentials live only in a gitignored `.env`; the file template lists variable names without values
    - [x] The seed generates each password with a cryptographic random generator from at least 24 random bytes; it accepts no owner-supplied password
    - [x] Roles: one Sales rep, one Marketing user, one no-role identity; no administrator identity
    - [x] The Sales rep and Marketing user identities carry an expiry of at most 90 days on their role assignments, the only place the schema stores expiry
    - [x] The no-role identity has no role assignment; the acceptance run disables it with the disable command as its final step, and the runbook records that step
    - [x] The seed is an idempotent upsert keyed on username
    - [x] The seed prints usernames only, to stdout and to stderr
    - [x] The seed provides a disable command and a rotation command; rotation replaces the password and extends the expiry
- [b] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) deferred:owner

## Phase 2: Test

Red-phase commits contain ONLY the new test files and Measure document edits.

- [x] Task: Write Sales public URL Red tests
    - [x] `apps/sales-advantage/lib/__tests__/public-url.test.ts`
    - [x] Uses `x-forwarded-host` and `x-forwarded-proto` when both are present and the origin is approved
    - [x] Rejects a forwarded host that is not on the approved list; the route then builds its target from the configured public origin
    - [x] Accepts a `SALES_PREVIEW_ORIGINS` entry as an approved origin
    - [x] Never produces an `http` target when the forwarded protocol is `https`
- [x] Task: Write Sales locale resolution Red tests
    - [x] An `en` cookie on `/` resolves to `en`
    - [x] A missing or unknown cookie resolves to the default locale with `fromCookie: false`
- [x] Task: Write Sales proxy Red tests
    - [x] An unauthenticated `/th/module/1` request redirects to `/api/auth/company/start?returnTo=%2Fth%2Fmodule%2F1`
    - [x] No response carries a `redirectTo` query parameter
    - [x] An `en` cookie holder who opens `/` reaches `/en/` and the response sets no `NEXT_LOCALE`
    - [x] A cookieless visitor who opens `/` reaches `/th/` and the response sets `NEXT_LOCALE=th`
    - [x] The legacy cookie path still gates protected paths when `SALES_AUTH_MODE=legacy-school`
    - [x] The protected-path regex is unchanged from the current definition
- [x] Task: Write Sales auth route Red tests
    - [x] `app/api/auth/company/start/route.test.ts`: a malformed `returnTo` restarts the authorization handoff with `returnTo=/`, the response is a 307 to the authorize URL, and no 500 occurs
    - [x] A start request that arrives on an approved preview origin redirects to the same path on the callback origin with `returnTo` preserved
    - [x] In `legacy-school` mode the start route redirects to the locale-prefixed landing page
    - [x] The callback failure paths redirect with `?error=sso` and expire the transaction cookie
    - [x] The callback denies a user with no Sales role with `?error=forbidden`
    - [x] The session route answers a no-role session with HTTP 403 and the `{"session": null, "denied": true}` body
    - [x] The session cookie sets `secure: true` whenever the resolved target is `https`
    - [x] The logout route builds its redirect from the validated public origin
- [x] Task: Write Sales sign-in entry and error Red tests
    - [x] `components/login-form.test.tsx` asserts the link carries the current path and query
    - [x] The landing page renders a message for each enumerated error code
    - [x] `i18n-key-parity.test.ts` covers the new keys in both locales
- [x] Task: Write Marketing deep-link Red tests
    - [x] The shared redirect helper appends `returnTo` with the original path and query
    - [x] Every call site uses the helper: the campaigns list, a campaign detail, a campaign video, and the settings page
    - [x] The login page forwards the `returnTo` value to the start route
- [x] Task: Write Marketing start route and origin Red tests
    - [x] `app/api/auth/company/start/route.test.ts`: a malformed `returnTo` restarts the handoff with `returnTo=/`, status 307, and no 500
    - [x] A valid `returnTo` still reaches the OIDC client unchanged
    - [x] The callback failure paths, including the early return, expire the transaction cookie
    - [x] The callback and logout routes build their targets from the validated origin and accept the `MARKETING_PREVIEW_ORIGINS` values
    - [x] A Marketing start request that arrives on an approved preview origin redirects to the same path on the callback origin with `returnTo` preserved
- [x] Task: Write Marketing login error Red tests
    - [x] `app/login/page.test.tsx` renders a message for each enumerated error code
- [x] Task: Write demo seed Red tests
    - [x] A generated password derives from at least 24 random bytes of the cryptographic generator
    - [x] The seed rejects an owner-supplied password path
    - [x] A second run performs an upsert, not a duplicate insert
    - [x] The Sales rep and Marketing user identities carry the 90-day expiry on their role assignments
    - [x] The acceptance run disables the no-role identity as its final step
    - [x] Captured stdout and stderr contain usernames and no password material
    - [x] The seed creates no administrator identity
    - [x] The disable and rotation commands change only the intended rows; rotation replaces the password and extends the role expiry
- [x] Task: Confirm the Red phase
    - [x] Run each new suite and record the failing assertion counts here
    - [x] Commit the test files and this plan only
- [b] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md) deferred:owner

## Phase 3: Implement

- [ ] Task: Implement the Sales public URL helper with origin approval
    - [ ] Move `getPublicUrl` out of `proxy.ts` into `lib/public-url.ts` and import it back
    - [ ] Add `getPublicOrigin` and use it in the callback, start, and logout routes
    - [ ] Implement the approved-origin list from the production origin and `SALES_PREVIEW_ORIGINS`
- [ ] Task: Implement Sales locale resolution
    - [ ] Read `NEXT_LOCALE` before choosing the redirect prefix
    - [ ] Write the cookie only when no valid cookie is present
    - [ ] Keep `localePrefix: "always"`; this track does not change the routing mode
- [ ] Task: Remove the dead redirect parameter
    - [ ] Redirect an unauthenticated protected-path request straight to the sign-in start route with `returnTo`
    - [ ] Delete every `redirectTo` reference from `proxy.ts`
    - [ ] Update the assertions in `proxy.test.ts` that encoded the old behavior
- [ ] Task: Implement the Sales auth route changes
    - [ ] Catch the `returnTo` validation error in the start route, restart the handoff with `/`, and log one structured line
    - [ ] Gate the start route on the auth mode; in `legacy-school` mode redirect to the locale-prefixed landing page
    - [ ] Hand off a start that arrives on an approved preview origin to the same path on the callback origin, preserving `returnTo`, mirroring the Codecamp start route
    - [ ] Expire the transaction cookie on every callback failure path
    - [ ] Check the Sales app role after the exchange and redirect with `?error=forbidden` when it is absent
    - [ ] Answer a no-role session on the session route with HTTP 403 and the `{"session": null, "denied": true}` body
    - [ ] Derive the cookie `secure` flag from the resolved target protocol as well as `NODE_ENV`
- [ ] Task: Implement the Sales sign-in entry and error surface
    - [ ] Build the sign-in link from `usePathname` and `useSearchParams` in the login form
    - [ ] Render the error message for each enumerated code on the landing page
    - [ ] Add the English and Thai strings
- [ ] Task: Implement the Marketing deep-link recovery, start validation, and origins
    - [ ] Create the shared redirect helper and use it at every call site that redirects to `/login`
    - [ ] Forward `returnTo` from the login page to the start route
    - [ ] Catch the client validation error in the start route with the clean restart fallback
    - [ ] Expire the transaction cookie on every callback failure path, including the early return
    - [ ] Align the login, callback, and logout routes on the validated-origin rule with `MARKETING_PREVIEW_ORIGINS`
    - [ ] Hand off a start that arrives on an approved preview origin to the same path on the callback origin, preserving `returnTo`
- [ ] Task: Implement the Marketing login error surface
    - [ ] Render the error message for each enumerated code on the `/login` page
- [ ] Task: Implement the demo account seed
    - [ ] Extend `apps/accounts/scripts/` with the generator, disable, and rotation commands
    - [ ] Generate passwords from at least 24 random bytes and write them only to the gitignored `.env`
    - [ ] Set the 90-day expiry on the role assignments of the Sales rep and the Marketing user
    - [ ] Map each demo identity to its app role in `company_identity`
    - [ ] Extend the bootstrap contract tests to cover the seed
- [ ] Task: Add the pre-promotion gates to the deploy pipelines
    - [ ] Change `apps/sales-advantage/cloudbuild.yaml` so the candidate stage deploys with no traffic and stops; promotion is a separate step
    - [ ] Change `apps/marketing/cloudbuild.yaml` the same way
    - [ ] The promotion step runs only after the recorded acceptance note passes
- [ ] Task: Confirm the Green phase
    - [ ] Run the Sales and Marketing suites, `check-types`, and `lint`
    - [ ] Run the Sales suite with `SALES_AUTH_MODE=legacy-school`
    - [ ] Run the top-level build gate and record the exit code; the `codecamp-knowledge` break is external and owned by the APK lane
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Verify against the candidate revisions
    - [ ] Deploy the Sales candidate tag and the Marketing candidate with no traffic shift, wired with the preview origins
    - [ ] Run the unauthenticated cases and the start-route cases, including the callback-origin handoff and the completed sign-in with its session cookie, against the candidate URLs
    - [ ] Capture the redirect chain for each case and attach it to the verification note
    - [ ] Run the promotion step only after the candidate acceptance note passes
    - [ ] After promotion, run the authenticated matrix with the demo accounts on production with the rollback anchor ready
    - [ ] Disable the no-role identity with the disable command as the final step of the run
- [ ] Task: Create documentation
    - [ ] Create `apps/sales-advantage/docs/sales-sso-deploy-runbook-20260829.md` with the redirect-chain section, the rollback anchor revision, and the preview-origin steps
    - [ ] Record the demo account lifecycle commands in the same runbook
- [ ] Task: Run the generated-facts and architecture gates
    - [ ] Run `measure/generate.sh`
    - [ ] Run `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db` for the changed files
- [ ] Task: Retrospective
    - [ ] Add a lesson: SSO redirect helpers must be ported to every consumer at repair time, never left as per-app copies
    - [ ] Open a `tech-debt.md` row for a shared cross-app redirect helper package, owner daniebo
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

## Checkpoints

Record a commit SHA only after the commit is an ancestor of HEAD.

- Phase 1 contracts: acc483cdb
- Phase 2 Red: <pending-red-commit>
- Phase 3 Green:
- Phase 4 docs and doctor:

### Phase 2 Red execution record (2026-08-29)

All new test suites fail as required (Red property). Two contract modules
(`apps/sales-advantage/lib/locale-resolution.ts` and
`apps/sales-advantage/lib/sign-in-href.ts`) plus the Marketing shared helper
(`apps/marketing/app/lib/login-redirect.ts`) were delivered fully implemented,
so their unit tests already pass; the remaining behavior is unimplemented and
fails. The Accounts seed functions throw `not implemented`, so every seed test
fails.

**Sales suite** (`sales-advantage`)
- Command: `CI=true pnpm --filter sales-advantage exec vitest run lib/__tests__/public-url.test.ts lib/__tests__/locale-resolution.test.ts lib/__tests__/proxy.test.ts lib/__tests__/sign-in-href.test.ts lib/__tests__/i18n-key-parity.test.ts app/api/auth/company/start/route.red.test.ts app/api/auth/callback/route.red.test.ts app/api/auth/logout/route.red.test.ts app/api/auth/session/route.red.test.ts components/login-form.red.test.tsx "app/[locale]/page.red.test.tsx"`
- Failing assertions: 31 (across 9 files; `locale-resolution.test.ts` and `sign-in-href.test.ts` pass fully because their contracts are already implemented).
- Nature: `public-url.ts` helpers throw `not implemented`; proxy, auth routes, landing page, login form, and i18n-key-parity lack the new redirect/error/origin/role-denial behavior.

**Marketing suite** (`marketing`)
- Command: `CI=true pnpm --filter marketing exec vitest run app/__tests__/login-redirect.test.ts app/__tests__/deep-link-redirects.test.ts app/api/auth/company/start/route.red.test.ts app/api/auth/callback/route.red.test.ts "app/login/page.red.test.tsx"`
- Failing assertions: 13 (across 4 files; `login-redirect.test.ts` passes fully because the shared helper is already implemented).
- Nature: deep-link call sites, the `/login` error surface, and the callback/start origin + transaction-cookie behavior are not yet implemented.

**Accounts suite** (`accounts`)
- Command: `CI=true pnpm --filter accounts exec vitest run scripts/demo-accounts.test.ts`
- Failing assertions: 8 (all in `scripts/demo-accounts.test.ts`).
- Nature: every seed function (`generateDemoPassword`, `upsertDemoIdentity`, `disableDemoIdentity`, `rotateDemoIdentity`) throws `not implemented`.

**Missing files created during Red**
- `apps/marketing/app/login/page.red.test.tsx` (Marketing login error Red test; was absent from the prior agent's drop).
- `apps/accounts/scripts/demo-accounts.test.ts` (demo seed Red test; was absent from the prior agent's drop).
- The Accounts test initially used `vi.spyOn(randomBytes)`, which throws on a bare named import; fixed in-file to `vi.mock("node:crypto", ...)` so the suite fails on the stub, not on test infrastructure.
