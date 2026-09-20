# Accounts UX Refactor Plan

Date: 2026-09-19. Scope: `apps/accounts`. Method: read-only audit of every user-facing page, every
route handler, and every library file. The audit read all 20 source files and all 11 test files.

This plan follows the Ponytail Rules. Each fix reuses existing code, installed dependencies, or
the platform. No new dependencies.

## 0. Condition of the application

Accounts is the identity provider for the company. It issues the sessions that Accounting,
Marketing, Sales, and Codecamp trust. A defect here reaches every application.

The application is small: 2 pages, 13 route handlers, 2 client components, and 3 library files.
The authorization model is correct and the audit confirms it in section 2. The defects sit in
three places: the sign-in redirect, the administration console, and the package boundary.

One defect outranks every other item in this plan. Section 1.1 and section 3 hold it.

## 1. Summary of Findings

The audit found six systemic problems. The first one is a security defect on the sign-in page.

1. **The sign-in page redirects to any external host.** `app/page.tsx:15-17` accepts a `returnTo`
   value that starts with `/\`. `app/sign-in-panel.tsx:29` passes it to
   `window.location.assign`. The browser resolves `/\evil.example.com` to
   `https://evil.example.com/`. The victim has just typed the company password.
2. **The administration console loses role grants and creates duplicate employees.**
   `app/accounts-console.tsx:13-15` mints a new idempotency key on every call, so the key cannot
   stop a double click. Lines 234-243 send a whole role array built from stale state, so two fast
   toggles drop the first grant.
3. **Four browser call paths have no error handling.** `sign-in-panel.tsx:15`,
   `accounts-console.tsx:23`, `accounts-console.tsx:153`, and every `request.json()` call in the
   route handlers. Each one shows the user nothing, or shows a parser message.
4. **The console has no loading state and no pending state.** `accounts-console.tsx:42` starts the
   directory as an empty array and the header reports `0` employees while the fetch runs. No
   control is disabled during a write.
5. **The application reaches into a sibling package's build output.**
   `lib/server/company-identity-route-bindings.ts:3` imports through a relative path into
   `packages/backend/dist`, and the name it uses resolves to a different, stubbed file through the
   package `exports` map.
6. **Small text and low contrast throughout the console.** `app/globals.css` sets 8px to 10px text
   in nine rules. The `--signal` colour gives 4.27:1 against white on the primary button and
   3.19:1 for 9px text.

## 2. What the authorization surface does correctly

Record this evidence. These parts need no work, and section 3 does not weaken them.

- Every capability runs through one executor with one policy. `lib/server/identity.ts:140-151`
  allows a call only when the policy id is `company-identity.company-admin` and the principal
  holds `COMPANY_ADMIN`. Every other policy id is denied. The check fails closed.
- Every state-changing route calls `requireSameOrigin` on its first line:
  `app/api/admin/employees/route.ts:39`, `.../[accountId]/roles/route.ts:24`,
  `.../company-roles/route.ts:24`, `.../credential/route.ts:21`, `.../sessions/route.ts:21`,
  `.../status/route.ts:21`, `app/api/session/login/route.ts:18`, and
  `app/api/session/logout/route.ts:14`. `lib/server/http.ts:10-14` compares the `Origin` header
  against the configured issuer origin.
- The target account always comes from the URL and the caller always comes from the session.
  Each admin route writes `input: { ...body, targetAccountId: accountId }`, so a body field
  cannot override the target.
- The session cookie is `httpOnly`, and its `secure`, `sameSite`, and `path` values come from a
  validated configuration (`app/api/session/login/route.ts:31-37`).
- `app/api/oidc/logout/route.ts:25` calls `localLogout`, which revokes only the calling
  application's session. `app/api/session/logout/route.ts:20` calls `globalLogout`. The two
  scopes stay separate.
- `app/page.tsx:33-37` renders the console only when `currentEmployee()` returns an employee, and
  `accounts-console.tsx:41` renders the administration surface only for `COMPANY_ADMIN`. The
  server checks the same thing again in the executor, so a client-side change grants nothing.
- The application needs no `proxy.ts`. Every page and every route authorizes on the server.

## 3. Sign-in and Redirect Safety (fix first)

### 3.1 Open redirect on the sign-in page

Issues:

- `app/page.tsx:15-17` accepts `returnTo` when it starts with `/` and does not start with `//`.
  It does not reject a backslash.
- `app/sign-in-panel.tsx:29` calls `window.location.assign(returnTo)` after a successful sign-in.
- The WHATWG URL parser treats a backslash as a slash for a special scheme. The audit confirmed
  that `new URL("/\\evil.example.com", "https://accounts.reading-advantage.com").href` returns
  `https://evil.example.com/`.
- The attack needs one link: `https://accounts.reading-advantage.com/?returnTo=/%5Cevil.example.com`.
  The page renders the real sign-in form on the real origin. The employee types the company
  username and password. The browser then leaves for the attacker's host, which can show a
  convincing "session expired, sign in again" page.
- `app/api/oidc/authorize/route.ts:21-23` also sends anonymous callers to `/?returnTo=...`, so the
  parameter is a normal part of the flow and looks ordinary to the user.
- The check misses four more cases: a control character, malformed percent encoding, a length
  limit, and a `returnTo` that is not a path at all.
- `apps/accounting/app/lib/sign-in-href.ts:33-57` already holds a complete safe-path predicate in
  this repository. It rejects `//`, `\`, `?`, `#`, control characters, malformed percent encoding,
  and any value over 2,048 characters.

Plan:

1. Reject a backslash in `app/page.tsx`. Add `&& !search.returnTo.includes("\\")`. One line. Ship
   this first.
2. Move the predicate from `apps/accounting/app/lib/sign-in-href.ts` into a shared location and
   use it in both applications. Delete the inline check. About 10 lines in this application.
3. Add a test for `app/page.tsx` that asserts `/\evil.example.com` resolves to `/`. The
   application has no test for this page today.

Acceptance: `?returnTo=/%5Cevil.example.com` lands the employee on `/`, and a test fails when the
check is removed.

### 3.2 The sign-in form can stop responding

Issues:

- `app/sign-in-panel.tsx:15-23` calls `fetch` with no `try`. A network failure, a dropped
  connection, or a DNS failure rejects the promise.
- `setBusy(false)` at line 24 never runs. The button stays disabled and reads "VERIFYING" until
  the employee reloads the page. Line 26 never sets a message.
- The failure is the common one: an employee on a weak connection sees a dead sign-in form.

Plan:

1. Wrap the fetch in `try` and `finally`. Set `busy` to false in `finally` and set the message in
   `catch`. About 6 lines.

## 4. The Administration Console

`app/accounts-console.tsx` grants and removes company authority and application roles. It is the
highest-risk client component in the repository.

### 4.1 Lost updates and duplicate writes

Issues:

- `app/accounts-console.tsx:13-15`. `operationKey` returns `${prefix}-${crypto.randomUUID()}` and
  runs inside each handler, so every call carries a new key. An idempotency key exists to make a
  repeated request safe. A key generated at call time cannot do that. Two clicks on "CREATE
  IDENTITY" send two different keys and create two employees.
- `app/accounts-console.tsx:234-243`. The role checkbox computes
  `checked ? existing.filter(...) : [...existing, role]` from `selected.appRoles`, then sends the
  whole array with `PUT`. `selected` refreshes only after `refresh()` returns. An administrator
  who grants two roles quickly sends two arrays built from the same stale list. The second request
  overwrites the first, and one grant disappears with no message.
- No control is disabled during a write. There is no `isSubmitting` state anywhere in the file.
  The checkbox does not move until `refresh()` completes, so the administrator clicks again.
- `app/accounts-console.tsx:94-98`. Removing `COMPANY_ADMIN` asks for confirmation. Granting
  `COMPANY_ADMIN` does not. The grant is the change that raises privilege.
- `app/accounts-console.tsx:58`. `employees.find(...) ?? employees[0]` retargets the detail panel
  at the first employee in the directory when the selected id disappears. The suspend button, the
  revoke button, and the role checkboxes then act on a different person. The `confirm` dialogs
  name the person, so the risk is limited to the role checkboxes, which have no dialog.

Plan:

1. Hold one idempotency key per form in a `useRef`. Clear it after a success, in the same pattern
   as `apps/accounting/app/_components/new-submission-form.tsx:193-195` and `:221`. About 8 lines.
2. Add one `pendingId` state. Disable the control while its request runs. About 6 lines.
3. Send only the changed role and its new state, or refetch the employee before building the
   array. The first option needs a domain change; record it. The second option is 3 lines.
4. Confirm the grant of `COMPANY_ADMIN`, not only its removal. One line.
5. Return `undefined` when the selected id is absent. Show "Select an employee." Delete the
   `?? employees[0]` fallback. Two lines.

### 4.2 Error handling

Issues:

- `app/accounts-console.tsx:23`. `await response.json()` has no guard. A 500 that returns an HTML
  page makes `.json()` throw a `SyntaxError`, and line 24 never runs. The toast then shows the
  parser message, which means nothing to an administrator.
  `apps/accounting/app/_components/pending-submissions-list.tsx:39-45` already holds the correct
  `readJson` helper.
- `app/accounts-console.tsx:153-156`. `logout()` has no `try`. Line 166 passes it straight to
  `onClick`, so a rejection becomes an unhandled promise rejection and
  `window.location.assign("/")` never runs. The sign-out button appears dead.
- `app/accounts-console.tsx:135-137` and `:149`. `resetCredential` and `revokeSessions` do not
  call `refresh()`. `refresh()` at line 52 is the only place that clears `error`. The toast at
  line 264 renders `error || notice`, so an old error hides the new success message.
- `app/accounts-console.tsx:96,111,128,142` use `window.confirm` for four destructive identity
  actions. The dialog blocks the thread, carries no product styling, and a browser can suppress
  it after repeated use.

Plan:

1. Add a `readJson` helper with a `try` around `response.json()`. Reuse the Accounting version.
   About 7 lines.
2. Wrap `logout` in `try` and `catch`. Set the error message on failure. About 5 lines.
3. Clear `error` at the start of each handler, beside the existing `setNotice` call. Four lines.
4. Replace `window.confirm` with an inline confirmation row in the console. About 25 lines. Give
   this its own task.

### 4.3 Loading, empty, and error states

Issues:

- `app/accounts-console.tsx:42` starts `employees` as `[]`. Line 182 then reports `0` in the
  directory count while the fetch runs, and line 184 maps an empty array.
- `app/accounts-console.tsx:209` renders the detail panel only when `selected` exists. Before the
  first response the panel is blank with no message.
- A failed fetch, an empty company, and a loading fetch all render the same empty directory. The
  three states are not separable.
- `app/accounts-console.tsx:47-56` fetches the employee list in `useEffect`. `app/page.tsx:14`
  is already a server component that awaits `currentEmployee()`. It can load the list on the
  server and pass it as a prop.

Plan:

1. Add a `status` state with the values `loading`, `ready`, and `failed`. Render a distinct
   message for each. About 12 lines.
2. Load the first employee list on the server in `app/page.tsx` and pass it to the console.
   Keep `refresh()` for the updates after a write. This makes the initial render correct and
   removes the empty first paint. About 10 lines.

### 4.4 The hardcoded application catalogue

Issues:

- `app/accounts-console.tsx:7-11`. `APPLICATIONS` holds three application keys, three display
  labels, three production URLs, and the complete role vocabulary of each application.
- The server owns the role vocabulary. When the backend adds a role, the console cannot grant it.
  When the backend removes a role, the console still offers it and the request fails with a
  generic toast.
- The three URLs are production hosts. A staging deployment of Accounts links an administrator to
  the production applications.

Plan:

1. Serve the catalogue from the server. `app/page.tsx` can pass it as a prop from one module under
   `lib/server/`. About 15 lines.
2. Read the three hosts from environment variables with the production values as defaults. About
   6 lines.

## 5. Route Handler Consistency

Issues:

- Seven routes call `await request.json()` with no guard:
  `app/api/admin/employees/route.ts:40`, `.../roles/route.ts:27`, `.../company-roles/route.ts:27`,
  `.../credential/route.ts:24`, `.../sessions/route.ts:24`, `.../status/route.ts:24`, and
  `app/api/session/login/route.ts:19`. A malformed body throws a `SyntaxError`, which
  `lib/server/http.ts:93-96` maps to 500 `INTERNAL_ERROR`. The correct status is 400.
- The same routes then read `body.idempotencyKey`. When the body parses to `null`, the read throws
  a `TypeError`, which also becomes a 500.
- `app/api/oidc/token/route.ts:64-71` maps every failure that is not `CLIENT_INVALID`,
  `AUTHORIZATION_CODE_INVALID`, or `SESSION_INVALID` to 400 `invalid_request`. A database failure
  therefore reports a client error. The `catch` writes no log, so an operator sees nothing.
- `app/api/ready/route.ts:59` catches every error and returns 503 with no log. A readiness failure
  gives an operator no cause.
- `lib/server/telemetry.ts` holds a complete structured logger. Only the capability executor uses
  it (`lib/server/identity.ts:213-216`). The transport layer writes no logs at all.
- `app/api/oidc/logout/route.ts:15-31` is the only route with no `try`. A failure returns the
  framework default, not the JSON shape every other route returns.
- `app/api/oidc/logout/route.ts:12` hardcodes the access-token length as 43 characters in a
  regular expression. The transport layer should not know the token format. A change to the token
  length makes every logout return 401.
- The five admin routes are structurally identical. Each is about 45 lines and they differ only by
  the HTTP method, the capability id, and the route-binding name.

Plan:

1. Add one `readJsonBody(request)` helper that returns 400 on a parse failure and on a non-object
   body. Call it in the seven routes. About 12 lines, plus 7 one-line call sites.
2. Log the unexpected branch in the token route and in the ready route with the existing
   telemetry logger. About 6 lines.
3. Wrap the OIDC logout route in `try` and `catch`. Return `identityErrorResponse(error)`. Three
   lines.
4. Move the token-shape check out of the route. Accept any `Bearer <token>` header and let
   `localLogout` decide. Two lines.
5. Leave the five admin routes as five files. They are explicit, each one names its capability,
   and a shared factory would hide the capability id behind a parameter. The Ponytail Rules
   prefer deletion, and there is nothing to delete here.

## 6. Package Boundary

Issues:

- `lib/server/company-identity-route-bindings.ts:3` reads:
  `import { createCompanyIdentityRouteAdapter } from "../../../../packages/backend/dist/modules/company-identity/internal-route-adapter.js";`
- The import uses a relative path into another workspace package's build output. Every other
  import in this application uses the package name `@reading-advantage/backend`.
- `packages/backend/package.json` exports the name `./company-identity/internal-route-adapter`,
  and that name maps to `dist/modules/company-identity/public-route-adapter.js`. That file is a
  stub. `packages/backend/src/modules/company-identity/public-route-adapter.ts:21-28` returns one
  operation, `oidcLogout`, and its comment states that it "cannot establish trusted Accounts
  provenance". The application uses 38 operations.
- The same specifier text therefore resolves to two different files. Through the package name it
  gives the stub. Through the relative path it gives the real adapter. A reader cannot tell which
  one a line uses.
- `next.config.ts:11-15` lists `@reading-advantage/backend` under `transpilePackages`. A raw
  relative path is outside that mechanism. The build depends on `packages/backend/dist` existing
  at a fixed relative depth of four directories.

Plan:

1. Add an exports entry in `packages/backend/package.json` with a name that states the intent,
   for example `./company-identity/accounts-route-adapter`, and map it to the internal adapter.
   Two lines.
2. Import through the package name in
   `lib/server/company-identity-route-bindings.ts:3`. One line.
3. Decide what the stub is for. If no consumer uses it, delete `public-route-adapter.ts` and its
   exports entry. This needs a check across the repository, so give it its own task.

## 7. Visual Design and Accessibility

Issues:

- `app/globals.css:5` sets `--signal: #d9482f`. White text on that colour gives a contrast ratio
  of 4.27:1. WCAG AA requires 4.5:1 for normal text. The colour carries the primary sign-in button
  label (line 40, 11px bold) and the employee monogram (line 73).
- `app/globals.css:81`. `.authority-strip small` uses `--signal` on `--paper-deep`, a ratio of
  3.19:1, at 9px. `.status-pill.suspended` (line 79) uses the same colour at 8px.
- Nine rules set text from 8px to 10px: lines 63, 64, 68, 78, 79, 81, 82, 92, and 101. The role
  checkbox labels at line 92 render at 8px uppercase with 0.08em letter spacing. An administrator
  reads those labels to decide who receives `SALES_ADMIN`.
- `app/globals.css:60`. `.employee-item` has no `:focus-visible` rule. The employee list is the
  primary navigation of the console, and a keyboard user sees no focus indicator on it. The role
  checkboxes (line 93) and the links (line 100) do have one.
- `app/accounts-console.tsx:264-267`. The toast is correct: it carries `role`, `aria-live`, and a
  dismiss button with a label.
- `app/accounts-console.tsx:186`. The employee button carries an `aria-label` with the status, so
  the coloured dot is not the only carrier of that meaning. This is correct.

Plan:

1. Darken `--signal` until it reaches 4.5:1 against white and against `--paper-deep`. One line,
   and check the three places the colour appears on a light background.
2. Raise the nine small text rules to 12px. Nine lines.
3. Add a `:focus-visible` rule for `.employee-item`. Reuse the outline from line 93. One line.

## 8. Tests

Issues:

- `vitest.config.ts:14-20` sets an 80 percent coverage threshold, and the `include` list holds
  three files: `app/api/health/route.ts`, `app/api/ready/route.ts`, and `lib/server/telemetry.ts`.
  The gate therefore measures the two least risky routes and one logger. Every authorization
  surface sits outside it.
- There is no test for `app/page.tsx`. The open redirect in section 3.1 is untested.
- There is no test for `app/sign-in-panel.tsx`.
- There is no test for eleven of the thirteen route handlers. Only
  `app/api/admin/employees/route.test.ts`, `app/api/oidc/logout/route.test.ts`,
  `app/api/health/route.test.ts`, and `app/api/ready/route.test.ts` exist.
- `app/accounts-console.test.tsx` holds two cases. Neither covers the lost update in section 4.1
  or the error paths in section 4.2.

Plan:

1. Add `app/page.tsx` and `app/sign-in-panel.tsx` to the coverage `include` list with the fix in
   section 3.1. Two lines.
2. Add a redirect-safety test for `app/page.tsx`. About 20 lines.
3. Add one authorization test per admin route: one case with no session and one case with an
   employee who is not a company administrator. About 30 lines per route.
4. Add the five route files to the coverage `include` list once the tests exist.

## 9. Missing Boundaries

Issues:

- The application has no `app/error.tsx`, no `app/global-error.tsx`, no `app/loading.tsx`, and no
  `app/not-found.tsx`.
- `app/page.tsx:14` awaits `currentEmployee()`, which reaches the identity database. A database
  failure replaces the whole page with the Next.js default: a white page with one line of text, no
  retry, and no link back. The identity provider is the one application that must still explain
  itself when it fails.

Plan:

1. Add `app/error.tsx` with a retry button and a link to `/`. About 20 lines.
2. Add `app/not-found.tsx`. About 15 lines.

## 10. Prioritized Roadmap

Each phase maps to one Measure track. Write tests for backend changes per project policy.

### Phase 0: Broken UX (one to two line fixes each)

1. Reject a backslash in the `returnTo` check in `app/page.tsx`. Ship this first.
2. Wrap the sign-in fetch in `try` and `finally`.
3. Wrap `logout` in `try` and `catch`.
4. Clear `error` at the start of each console handler.
5. Confirm the grant of `COMPANY_ADMIN`, not only its removal.
6. Delete the `?? employees[0]` fallback.
7. Add a `:focus-visible` rule for `.employee-item`.
8. Wrap the OIDC logout route in `try` and `catch`.

### Phase 1: Write correctness in the console

1. Hold one idempotency key per form in a `useRef` and clear it after a success.
2. Add a `pendingId` state and disable the control while its request runs.
3. Refetch the employee before building the role array, so a second toggle cannot overwrite the
   first.
4. Add a `readJson` guard around `response.json()`.
5. Call `refresh()` after a credential reset and after a session revocation.

Acceptance: two fast role toggles keep both roles; a double click on "CREATE IDENTITY" creates one
employee; a 500 with an HTML body shows a readable message.

### Phase 2: Loading and state correctness

1. Add a `loading`, `ready`, and `failed` status to the console directory.
2. Load the first employee list on the server in `app/page.tsx` and pass it as a prop.
3. Add `app/error.tsx` and `app/not-found.tsx`.
4. Return 400 for a malformed JSON body in the seven routes.
5. Log the unexpected branch in the token route and in the ready route.

### Phase 3: Duplication removal

1. Move the safe-path predicate from `apps/accounting/app/lib/sign-in-href.ts` into a shared
   location and use it in both applications.
2. Move the `readJson` helper from
   `apps/accounting/app/_components/pending-submissions-list.tsx` into the same shared location.
3. Extract one `readJsonBody(request)` helper for the seven route handlers.
4. Keep the five admin routes as five files. Each one names its own capability.

### Phase 4: Structural alignment (needs dedicated tracks)

1. Add the exports entry in `packages/backend/package.json` and import the route adapter through
   the package name. Decide what the public stub is for.
2. Serve the application catalogue and the role vocabulary from the server.
3. Read the three application hosts from environment variables.
4. Replace `window.confirm` with an inline confirmation row.
5. Correct the contrast of `--signal` and raise the nine small text rules to 12px.
6. Add an authorization test per admin route and widen the coverage `include` list.

## 11. Out of Scope

- Framework upgrades. The version policy forbids them in feature work.
- New dependencies. Every fix uses an installed package or the platform.
- `packages/backend/src/modules/company-identity`. The audit read the route adapter and the
  capability executor to verify section 2 and section 6. Only the `package.json` exports entry in
  Phase 4 changes that package.
- The scripts under `apps/accounts/scripts`. The audit read `demo-accounts.ts` and confirmed that
  it reads every password from the environment and hardcodes none. The bootstrap and migration
  scripts belong to the deployment track.
- Sharing the sign-in design between Accounts and Accounting. Accounts hand-writes
  `app/globals.css` and Accounting uses `@reading-advantage/ui`. The two are far apart, and a
  merge is a product decision, not a defect. Record it in `measure/tech-debt.md`.
