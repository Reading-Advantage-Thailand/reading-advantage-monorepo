# Implementation Plan: Codecamp SSO Redirect Repair

> **Browser acceptance:** Run all six acceptance cases in the live application
> with the in-app browser. Capture a screenshot of the landing page and the full
> redirect chain from the network panel for each case. Unit tests on `proxy.ts`
> alone do not close a phase; the defects are host-dependent and cookie-dependent.

> **Deploy safely.** The deployment already builds a tagged no-traffic revision.
> Verify every case against the tagged revision URL before shifting traffic.
> `codecamp-advantage-00019-682` remains the pre-SSO rollback anchor recorded in
> `apps/codecamp-advantage/docs/codecamp-sso-cutover-runbook-20260719.md`.

## Phase 1: Contract & Schema Definition
_Blast radius: `getPublicUrl` has two definitions — `apps/codecamp-advantage/proxy.ts` and `apps/sales-advantage/proxy.ts`. Only the Codecamp copy moves. Do not touch the Sales copy in this track._

- [x] Task: Define the public URL contract
    - [x] Create `apps/codecamp-advantage/lib/public-url.ts` exporting `getPublicUrl(request, pathname)`
    - [x] Add `getPublicOrigin(request): URL` for the auth routes, which need an origin rather than a path
    - [x] Document the precedence: `x-forwarded-proto` and `x-forwarded-host` first, then the request URL
    - [x] Strip the port only when the forwarded host carries none, matching the current behavior
- [x] Task: Define the locale resolution contract
    - [x] Add `resolveRequestLocale(request): { locale, fromCookie: boolean }` to `apps/codecamp-advantage/lib/locale-resolution.ts`
    - [x] A cookie value counts only when it is a member of `routing.locales`
    - [x] The contract states that the proxy writes `NEXT_LOCALE` only when `fromCookie` is false
- [x] Task: Define the sign-in entry contract
    - [x] `buildSignInHref(pathname: string, search: string): string` in `apps/codecamp-advantage/lib/sign-in-href.ts`
    - [x] The output is always `/api/auth/company/start?returnTo=<encoded path>`
    - [x] The encoded path is relative, starts with a single `/`, and never carries a host
- [x] Task: Define the sign-in error surface contract
    - [x] Enumerate the error codes the landing page renders: `sso`, `forbidden`, `session_check_failed`, `legacy_auth_active`
    - [x] Add one message key per code to both locale files
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

## Phase 2: Test

Red-phase commits contain ONLY the new test files and Measure document edits.

- [x] Task: Write public URL Red tests
    - [x] `apps/codecamp-advantage/lib/__tests__/public-url.test.ts`
    - [x] Uses `x-forwarded-host` and `x-forwarded-proto` when both are present
    - [x] Falls back to the request URL when neither is present
    - [x] Drops the port when the forwarded host has none
    - [x] Keeps the port when the forwarded host carries one
    - [x] Never produces an `http` target when the forwarded protocol is `https`
- [x] Task: Write locale resolution Red tests
    - [x] `apps/codecamp-advantage/lib/__tests__/locale-resolution.test.ts`
    - [x] An `en` cookie on `/` resolves to `en`
    - [x] A `th` cookie on `/` resolves to `th`
    - [x] A missing cookie resolves to the default locale with `fromCookie: false`
    - [x] An unknown cookie value resolves to the default locale with `fromCookie: false`
- [x] Task: Write proxy Red tests
    - [x] Update `apps/codecamp-advantage/lib/__tests__/proxy.test.ts`
    - [x] An unauthenticated `/en/admin` request redirects to `/api/auth/company/start?returnTo=%2Fen%2Fadmin`
    - [x] No response carries a `redirectTo` query parameter
    - [x] An `en` cookie holder who opens `/` reaches `/en/` and the response sets no `NEXT_LOCALE`
    - [x] A cookieless visitor who opens `/` reaches `/th/` and the response sets `NEXT_LOCALE=th`
    - [x] Preserve every existing administrator role case in `proxy-role.test.ts`
- [x] Task: Write auth route Red tests
    - [x] Update `apps/codecamp-advantage/app/api/auth/callback/route.test.ts`
    - [x] The success redirect uses the forwarded host, not the request origin
    - [x] The `?error=sso` redirect uses the forwarded host
    - [x] The session cookie sets `secure: true` whenever the resolved target is `https`
    - [x] Update `app/api/auth/company/start/route.test.ts`: a malformed `returnTo` restarts with `/`, status 307, and no 500
- [x] Task: Write sign-in entry Red tests
    - [x] `apps/codecamp-advantage/lib/__tests__/sign-in-href.test.ts` covers path encoding, query preservation, and host rejection
    - [x] `apps/codecamp-advantage/components/auth-entry.test.tsx` asserts the link carries the current path
    - [x] Assert the landing page renders a message for each of the four error codes
    - [x] Confirm `i18n-key-parity.test.ts` covers the new keys in both locales
- [x] Task: Confirm the Red phase
    - [x] Run each new suite and record the failing assertion counts here
    - [x] Commit the test files and this plan only
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

## Phase 3: Implement

- [ ] Task: Implement the public URL helper
    - [ ] Move `getPublicUrl` out of `proxy.ts` into `lib/public-url.ts` and import it back
    - [ ] Leave `apps/sales-advantage/proxy.ts` untouched
- [ ] Task: Implement locale resolution
    - [ ] Read `NEXT_LOCALE` before choosing the redirect prefix
    - [ ] Write the cookie only when no valid cookie is present
    - [ ] Keep `localePrefix: "always"`; this track does not change the routing mode
- [ ] Task: Remove the dead redirect parameter
    - [ ] Redirect an unauthenticated administrator request straight to the sign-in start route with `returnTo`
    - [ ] Delete every `redirectTo` reference from `proxy.ts`
    - [ ] Update the assertions in `proxy.test.ts` that encoded the old behavior
- [ ] Task: Implement the auth route changes
    - [ ] Use the public origin in the callback, start, and logout routes
    - [ ] Catch the `returnTo` validation error in the start route, fall back to `/`, and log one structured line
    - [ ] Derive the cookie `secure` flag from the resolved target protocol as well as `NODE_ENV`
- [ ] Task: Implement the sign-in entry and error surface
    - [ ] Use `usePathname` and `useSearchParams` in `AuthEntry` to build the sign-in link
    - [ ] Render the error message for each of the four codes on the landing page
    - [ ] Add the English and Thai strings
- [ ] Task: Confirm the Green phase
    - [ ] Run the Codecamp suite, `check-types`, and `lint`
    - [ ] Run the top-level build, because it is the supervisor gate
    - [ ] Confirm the legacy mode path by running the suite with `CODECAMP_AUTH_MODE=legacy`
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 4: Generate Docs & Doctor

- [ ] Task: Verify against the tagged revision
    - [ ] Deploy to the `sso-candidate` tag with no traffic
    - [ ] Run all six acceptance cases against the tagged revision URL
    - [ ] Capture the redirect chain for each case and attach it to the verification note
    - [ ] Shift traffic only after every case passes
- [ ] Task: Update documentation
    - [ ] Add a redirect-chain section to `apps/codecamp-advantage/docs/codecamp-sso-cutover-runbook-20260719.md`
    - [ ] Record the current rollback anchor revision in the same document
- [ ] Task: Run the generated-facts and architecture gates
    - [ ] Run `measure/generate.sh`
    - [ ] Run `measure/doctor.sh`
    - [ ] Run `build-graph update ./graph.db` for the changed files
- [ ] Task: Retrospective
    - [ ] Add a lesson: a forwarding-aware URL helper must be shared by the proxy and every auth route, never duplicated in one and omitted in the other
    - [ ] Open a `tech-debt.md` row for retiring the legacy authentication adapter, with an owner and a date
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

## Checkpoints

Record a commit SHA only after the commit is an ancestor of HEAD.

- Phase 1 contracts: 5fb43e1bc
- Phase 2 Red: 2d93e79c0
- Phase 3 Green:
- Phase 4 docs and doctor:

### Phase 2 Red execution record (2026-08-20)

- `CI=true pnpm --filter codecamp-advantage exec vitest run lib/__tests__/public-url.test.ts`: 4 failed assertions.
- `CI=true pnpm --filter codecamp-advantage exec vitest run lib/__tests__/locale-resolution.test.ts`: 4 failed assertions.
- `CI=true pnpm --filter codecamp-advantage exec vitest run lib/__tests__/sign-in-href.test.ts`: 3 failed assertions.
- `CI=true pnpm --filter codecamp-advantage exec vitest run lib/__tests__/proxy.test.ts lib/__tests__/proxy-role.test.ts`: 11 failed assertions.
- `CI=true pnpm --filter codecamp-advantage exec vitest run app/api/auth/callback/route.test.ts app/api/auth/company/start/route.test.ts app/api/auth/logout/route.test.ts`: 6 failed assertions.
- `CI=true pnpm --filter codecamp-advantage exec vitest run components/auth-entry.test.tsx 'app/[locale]/page.test.tsx'`: 6 failed assertions.
- Phase 1 initial contract commit: `1710a2b8f`; readonly-field remediation: `5fb43e1bc`.
- `CI=true pnpm --filter codecamp-advantage exec vitest run lib/__tests__/i18n-key-parity.test.ts`: 469 passed.
- `pnpm turbo run check-types --filter=codecamp-advantage`: passed.
- `pnpm turbo run build --filter=codecamp-advantage`: passed.
- `pnpm turbo run lint --filter=codecamp-advantage`: failed on the existing `components/tutor-coach.tsx:150` hook violation. This track did not modify that file.
- The tests cover seven acceptance cases. The specification calls browser acceptance six cases.
- Red test commit: `2d93e79c0`.
