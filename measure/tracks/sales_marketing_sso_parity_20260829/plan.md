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

- [ ] Task: Define the Sales public URL and origin-approval contract
    - [ ] Create `apps/sales-advantage/lib/public-url.ts` exporting `getPublicUrl(request, pathname)`
    - [ ] Add `getPublicOrigin(request): URL` for the auth routes, which need an origin rather than a path
    - [ ] Document the precedence: `x-forwarded-proto` and `x-forwarded-host` first, then the request URL
    - [ ] Port the Codecamp rule: a forwarded origin is used only when it is on the approved list; the helper rejects an unapproved origin the way the Codecamp helper does, and the calling route then builds its target from the configured public origin
    - [ ] Define the approved list: the production origin plus the `SALES_PREVIEW_ORIGINS` values
    - [ ] Add `getSalesCallbackOrigin()` reading the configured `COMPANY_AUTH_OIDC_REDIRECT_URI`
    - [ ] Define the preview handoff, mirroring the Codecamp start route: a start request that arrives on an approved preview origin redirects to the same start route on the callback origin with `returnTo` preserved; the transaction, the callback, and the session cookie live on the callback origin
    - [ ] Strip the port only when the forwarded host carries none, matching the current behavior
- [ ] Task: Define the Sales locale resolution contract
    - [ ] Add `resolveRequestLocale(request): { locale, fromCookie: boolean }` to `apps/sales-advantage/lib/locale-resolution.ts`
    - [ ] A cookie value counts only when it is a member of `routing.locales`
    - [ ] The contract states that the proxy writes `NEXT_LOCALE` only when `fromCookie` is false
- [ ] Task: Define the Sales sign-in entry contract
    - [ ] `buildSignInHref(pathname: string, search: string): string` in `apps/sales-advantage/lib/sign-in-href.ts`
    - [ ] The output is always `/api/auth/company/start?returnTo=<encoded path>`
    - [ ] The encoded path is relative, starts with a single `/`, and never carries a host
- [ ] Task: Define the Sales auth-mode gate contract
    - [ ] The company start route reads the mode through `lib/auth-mode.ts`, which accepts only `company` and `legacy-school`
    - [ ] In `legacy-school` mode the start route redirects to the locale-prefixed landing page, where the legacy form renders, instead of starting the OIDC handoff
    - [ ] In `company` mode the start route behaves as FR-5 defines
- [ ] Task: Define the Marketing deep-link recovery contract
    - [ ] One shared redirect helper appends the original path and query as `returnTo` on every redirect to `/login`
    - [ ] The call sites are the campaigns list, a campaign detail, a campaign video, and the settings page
    - [ ] The login page forwards the `returnTo` value it received to the start route
    - [ ] The callback lands the user on the preserved destination after the exchange
- [ ] Task: Define the Marketing return-path contract
    - [ ] The start route catches the validation error thrown by the shared OIDC client
    - [ ] An unsafe value restarts the authorization handoff with `returnTo=/` and logs one structured line
    - [ ] The route never returns a 500 for any `returnTo` input
- [ ] Task: Define the Sales error surface and role-denial contract
    - [ ] Enumerate the landing page codes with producers: `sso` from the callback failure paths, `forbidden` from the callback role check
    - [ ] Add one message key per code to both Sales locale files
    - [ ] The callback checks the Sales app role after the exchange and redirects to the landing page with `?error=forbidden` when the role is absent
    - [ ] The session route answers a no-role session with HTTP 403 and a JSON body of `{"session": null, "denied": true}`
- [ ] Task: Define the Marketing error surface contract
    - [ ] Enumerate the `/login` page codes with producers: `sso` from the callback failure paths
    - [ ] Add one message key per code
- [ ] Task: Define the demo account contract
    - [ ] Credentials live only in a gitignored `.env`; the file template lists variable names without values
    - [ ] The seed generates each password with a cryptographic random generator from at least 24 random bytes; it accepts no owner-supplied password
    - [ ] Roles: one Sales rep, one Marketing user, one no-role identity; no administrator identity
    - [ ] The Sales rep and Marketing user identities carry an expiry of at most 90 days on their role assignments, the only place the schema stores expiry
    - [ ] The no-role identity has no role assignment; the acceptance run disables it with the disable command as its final step, and the runbook records that step
    - [ ] The seed is an idempotent upsert keyed on username
    - [ ] The seed prints usernames only, to stdout and to stderr
    - [ ] The seed provides a disable command and a rotation command; rotation replaces the password and extends the expiry
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

## Phase 2: Test

Red-phase commits contain ONLY the new test files and Measure document edits.

- [ ] Task: Write Sales public URL Red tests
    - [ ] `apps/sales-advantage/lib/__tests__/public-url.test.ts`
    - [ ] Uses `x-forwarded-host` and `x-forwarded-proto` when both are present and the origin is approved
    - [ ] Rejects a forwarded host that is not on the approved list; the route then builds its target from the configured public origin
    - [ ] Accepts a `SALES_PREVIEW_ORIGINS` entry as an approved origin
    - [ ] Never produces an `http` target when the forwarded protocol is `https`
- [ ] Task: Write Sales locale resolution Red tests
    - [ ] An `en` cookie on `/` resolves to `en`
    - [ ] A missing or unknown cookie resolves to the default locale with `fromCookie: false`
- [ ] Task: Write Sales proxy Red tests
    - [ ] An unauthenticated `/th/module/1` request redirects to `/api/auth/company/start?returnTo=%2Fth%2Fmodule%2F1`
    - [ ] No response carries a `redirectTo` query parameter
    - [ ] An `en` cookie holder who opens `/` reaches `/en/` and the response sets no `NEXT_LOCALE`
    - [ ] A cookieless visitor who opens `/` reaches `/th/` and the response sets `NEXT_LOCALE=th`
    - [ ] The legacy cookie path still gates protected paths when `SALES_AUTH_MODE=legacy-school`
    - [ ] The protected-path regex is unchanged from the current definition
- [ ] Task: Write Sales auth route Red tests
    - [ ] `app/api/auth/company/start/route.test.ts`: a malformed `returnTo` restarts the authorization handoff with `returnTo=/`, the response is a 307 to the authorize URL, and no 500 occurs
    - [ ] A start request that arrives on an approved preview origin redirects to the same path on the callback origin with `returnTo` preserved
    - [ ] In `legacy-school` mode the start route redirects to the locale-prefixed landing page
    - [ ] The callback failure paths redirect with `?error=sso` and expire the transaction cookie
    - [ ] The callback denies a user with no Sales role with `?error=forbidden`
    - [ ] The session route answers a no-role session with HTTP 403 and the `{"session": null, "denied": true}` body
    - [ ] The session cookie sets `secure: true` whenever the resolved target is `https`
    - [ ] The logout route builds its redirect from the validated public origin
- [ ] Task: Write Sales sign-in entry and error Red tests
    - [ ] `components/login-form.test.tsx` asserts the link carries the current path and query
    - [ ] The landing page renders a message for each enumerated error code
    - [ ] `i18n-key-parity.test.ts` covers the new keys in both locales
- [ ] Task: Write Marketing deep-link Red tests
    - [ ] The shared redirect helper appends `returnTo` with the original path and query
    - [ ] Every call site uses the helper: the campaigns list, a campaign detail, a campaign video, and the settings page
    - [ ] The login page forwards the `returnTo` value to the start route
- [ ] Task: Write Marketing start route and origin Red tests
    - [ ] `app/api/auth/company/start/route.test.ts`: a malformed `returnTo` restarts the handoff with `returnTo=/`, status 307, and no 500
    - [ ] A valid `returnTo` still reaches the OIDC client unchanged
    - [ ] The callback failure paths, including the early return, expire the transaction cookie
    - [ ] The callback and logout routes build their targets from the validated origin and accept the `MARKETING_PREVIEW_ORIGINS` values
    - [ ] A Marketing start request that arrives on an approved preview origin redirects to the same path on the callback origin with `returnTo` preserved
- [ ] Task: Write Marketing login error Red tests
    - [ ] `app/login/page.test.tsx` renders a message for each enumerated error code
- [ ] Task: Write demo seed Red tests
    - [ ] A generated password derives from at least 24 random bytes of the cryptographic generator
    - [ ] The seed rejects an owner-supplied password path
    - [ ] A second run performs an upsert, not a duplicate insert
    - [ ] The Sales rep and Marketing user identities carry the 90-day expiry on their role assignments
    - [ ] The acceptance run disables the no-role identity as its final step
    - [ ] Captured stdout and stderr contain usernames and no password material
    - [ ] The seed creates no administrator identity
    - [ ] The disable and rotation commands change only the intended rows; rotation replaces the password and extends the role expiry
- [ ] Task: Confirm the Red phase
    - [ ] Run each new suite and record the failing assertion counts here
    - [ ] Commit the test files and this plan only
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

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

- Phase 1 contracts:
- Phase 2 Red:
- Phase 3 Green:
- Phase 4 docs and doctor:
