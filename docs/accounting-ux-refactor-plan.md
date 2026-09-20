# Accounting UX Refactor Plan

Date: 2026-09-19. Scope: `apps/accounting`. Method: read-only audit of every user-facing page,
every route handler, and every library file. The audit read all 24 source files and all 18 test
files.

This plan follows the Ponytail Rules. Each fix reuses existing code, installed dependencies, or
the platform. No new dependencies.

## 0. Condition of the application

The application is small and the architecture is correct. It has 3 pages, 7 route handlers, 2
client components, and 6 library files. The route handlers are thin. Validation, visibility, and
persistence live in `@reading-advantage/backend/accounting`. The session guard introspects the
opaque token against Accounts on every request, so a revoked session fails at once.

Money uses integer minor units in `BigInt` arithmetic. The audit found no floating-point
arithmetic on currency in the application or in the domain it calls. The audit found no total
that the browser computes and sends to the server. Section 2.5 records the parts that are correct.

The defects that remain are in four places: the currency model, the export date range, the money
the review list displays, and the local sign-in configuration. Section 2 and section 4 hold the
severe items.

## 1. Summary of Findings

The audit found six systemic problems.

1. **The derived rate assumes every currency has two decimal places.** `app/lib/derived-rate.ts`
   divides minor units by minor units. `packages/backend/src/modules/finance-operations/contracts.ts:6`
   accepts any three uppercase letters as a currency. For JPY the exported rate is 100 times the
   true rate. For KWD it is one tenth of the true rate.
2. **A legal amount crashes the review page and the CSV export.** `minorUnitSchema` accepts `"0"`
   and negative amounts. `derivedRate` throws on both. `app/_components/pending-submissions-list.tsx:215`
   calls it during render, and `app/api/submissions/export/route.ts:106` calls it inside the
   response loop. The application has no `error.tsx`.
3. **The export date range uses the UTC date, not the local date.** The route slices the first 10
   characters of `submittedAt`, which the repository always writes in UTC. A Bangkok submission
   made before 07:00 falls into the previous day, and a month-end export crosses the accounting
   period.
4. **The review list shows minor units beside a currency code.** `app/_components/pending-submissions-list.tsx:238`
   renders `12345 THB` for a record of 123.45 baht. The submission form says "minor units"; the
   review list does not.
5. **Local sign-in returns 500.** `app/lib/public-url.ts:33` rejects the HTTP loopback callback
   URL that `apps/accounting/.env.example:11` supplies and that the shared auth package permits.
   `app/api/auth/company/start/route.ts:41` does not guard the throw.
6. **Five route files and one page repeat the same six helpers.** `actorFromUser` exists in five
   files. The approve route and the reject route share about 90 identical lines.

## 2. Money Handling

This section is the reason to start here. Every defect below is confirmed by reading the code.

### 2.1 The derived rate assumes a two-decimal currency

Issues:

- `app/lib/derived-rate.ts:19-25` computes `settledThbMinor ÷ sourceAmountMinor`. The result is
  satang per source minor unit. The value equals the true baht-per-unit rate only when the source
  currency also has two decimal places.
- `packages/backend/src/modules/finance-operations/contracts.ts:6` defines
  `currencySchema = z.string().regex(/^[A-Z]{3}$/u)`. The schema accepts `JPY`, `KWD`, and also
  `XXX`. There is no ISO 4217 allowlist and no minor-unit exponent anywhere in the application.
- `app/api/submissions/export/route.ts:92` names the CSV column `derived_rate` with no unit. An
  accountant reads the column as a currency rate.
- Example: 10,000 JPY settled at 230,000 satang gives `derived_rate` 23.00. The true rate is 0.23
  baht per yen.

Plan:

1. Read the currency exponent from the platform. `Intl.NumberFormat("en", { style: "currency",
   currency }).resolvedOptions().maximumFractionDigits` returns 2 for THB, 0 for JPY, and 3 for
   KWD. This adds no dependency.
2. Scale the source amount by the exponent difference inside `derivedRate` before the division.
   About 6 lines.
3. Add the currency to the `derivedRate` signature. Two call sites change:
   `app/api/submissions/export/route.ts:106` and
   `app/_components/pending-submissions-list.tsx:215`.
4. Restrict `currencySchema` to the currencies the business settles. This is a domain change.
   Record it as a separate track.

### 2.2 A legal amount crashes the page and the export

Issues:

- `app/lib/derived-rate.ts:13-18` throws unless both inputs match `/^[1-9][0-9]*$/u`.
- `packages/backend/src/modules/finance-operations/contracts.ts:5` defines
  `minorUnitSchema = z.string().regex(/^(?:0|[1-9][0-9]*|-[1-9][0-9]*)$/u)`. The domain accepts
  `"0"` and negative amounts. A credit note is a negative amount.
- `app/_components/pending-submissions-list.tsx:213-219` calls `derivedRate` during render. One
  stored record with a zero or negative amount throws, and the whole workspace page fails for
  every user in that company.
- `app/api/submissions/export/route.ts:103-106` makes the same call with no `try`. One such
  record returns 500 for the entire CSV export.
- `pattern="[1-9][0-9]*"` at `app/_components/new-submission-form.tsx:362` is a browser hint
  only. `POST /api/submissions` accepts the value directly.
- The application has no `app/error.tsx`, no `app/global-error.tsx`, and no `app/loading.tsx`.
  A throw shows the Next.js default page.

Plan:

1. Return an empty string from `derivedRate` for a non-positive source amount. Keep the throw
   out of the render path. Two lines.
2. Add `app/error.tsx` with a retry button. About 20 lines.
3. Show a negative amount as a credit in the review list. Do not hide the record.

### 2.3 The export date range uses the UTC date

Issues:

- `app/api/submissions/export/route.ts:78` and `:107` use `submission.submittedAt.slice(0, 10)`.
- `packages/backend/src/modules/accounting/postgres-submission-repository.ts:57-58` always
  returns `.toISOString()`. Every production value ends with `Z` and carries the UTC date.
- The route comment at line 5 states "inclusive local-date range". A Bangkok submission at
  06:00 local time carries the previous UTC date. A month-end export therefore reports the
  record in the wrong accounting period.
- `app/api/submissions/export/route.test.ts:232` passes because the fixture at line 100 uses
  `"2026-08-15T02:00:00+07:00"`. The repository never produces an offset of that form, so the
  test confirms a property that production data cannot show.

Plan:

1. Convert `submittedAt` to the business time zone before the comparison. Use
   `Intl.DateTimeFormat("en-CA", { timeZone, ... }).format(new Date(submittedAt))`, which returns
   `YYYY-MM-DD`. This adds no dependency. About 4 lines.
2. Read the time zone from one environment variable with a `Asia/Bangkok` default.
3. Replace the offset fixture with a UTC fixture near the day boundary. Change the test to a
   production-shaped case.

### 2.4 The review list shows minor units

Issues:

- `app/_components/pending-submissions-list.tsx:238` renders
  `{submission.money.amountMinor} {submission.money.currency}`. The output reads `12345 THB` for
  123.45 baht.
- Line 244 renders `{submission.settledThbAmount} THB` in the same form.
- `app/_components/new-submission-form.tsx:356` labels the input "Amount in minor units" and line
  378 explains the unit. The review list drops both. The owner approves the number the list shows.
- The CSV column name `amount_minor` at `app/api/submissions/export/route.ts:90` is correct.

Plan:

1. Format the amount with `Intl.NumberFormat(locale, { style: "currency", currency })` and the
   exponent from section 2.1. One helper of about 5 lines, used at both lines.
2. Keep the minor-unit input in the form. Add a live major-unit preview under the field.

### 2.5 What the money code does correctly

Record these. They need no work.

- `app/lib/derived-rate.ts:19-25` uses `BigInt` only. There is no `Number`, no `parseFloat`, and
  no `toFixed` on currency anywhere in the application.
- The rounding at line 22 is exact half-up. `(settled * 100n + source / 2n) / source` rounds a
  tie upward when `source` is even, and a tie cannot occur when `source` is odd.
- The browser sends no computed total. `app/_components/new-submission-form.tsx:186` sends the
  raw form fields, and the domain schema validates each one.
- `app/api/submissions/route.ts:307-318` keeps every scalar raw and lets the domain reject it.
  The comment at line 305 states this rule.
- `app/api/submissions/export/route.ts:98-99` prefixes a cell that starts with `=`, `+`, `@`, or
  `-` with a quote. This blocks spreadsheet formula injection.

## 3. Authorization and Session

The authorization model is correct. Record the evidence, then close the two gaps.

What is correct:

- `app/lib/auth.ts:61-117` introspects the opaque token on every route call. A revoked session
  fails at once. The guard returns 401 for a missing or inactive token and 403 for a missing
  Accounting role.
- Every route handler calls the guard on its first line: `app/api/submissions/route.ts:242` and
  `:424`, `app/api/submissions/[id]/approve/route.ts:109`,
  `app/api/submissions/[id]/reject/route.ts:110`, `app/api/submissions/export/route.ts:51`.
- The company scope always comes from the session. `app/api/submissions/route.ts:42-48` builds the
  actor from `user.organizationId`. No route reads a company from the request.
- `packages/backend/src/modules/accounting/submissions.ts:344-348` restricts approve and reject to
  `OWNER`. `app/api/submissions/export/route.ts:54` restricts export to `OWNER` and `ACCOUNTANT`.
  `submissions.ts:333-338` restricts a `STAFF` listing to the caller's own records.
- `app/lib/private-evidence-storage.ts:73-101` rejects any evidence reference outside the caller's
  company, and rejects `.` and `..` segments.
- `app/lib/company-oidc.ts:103-117` returns a secret-free projection. The token never reaches the
  client.

Issues:

- `app/api/auth/logout/route.ts:39` verifies the `Origin` header and returns 403 on a mismatch.
  The three state-changing finance routes do not:
  `app/api/submissions/route.ts:241`, `app/api/submissions/[id]/approve/route.ts:105`, and
  `app/api/submissions/[id]/reject/route.ts:106`. The `sameSite: "lax"` cookie blocks the
  cross-site case today, so the risk is low. The rule is still applied inconsistently.
- `app/api/submissions/[id]/reject/route.ts:135` writes `reason: reason as string`. The cast
  sends `undefined` to a parameter typed `string`. The domain rejects it and the route returns
  400, so the behaviour is right and the type is wrong.

Plan:

1. Extract the `Origin` check from `app/api/auth/logout/route.ts` into one helper. Call it in the
   three finance routes. About 10 lines, and 3 one-line call sites.
2. Change the `reject` request type to accept `string | undefined`. Delete the cast. Two lines.

## 4. Sign-in and Local Configuration

### 4.1 Local sign-in returns 500

Issues:

- `packages/auth/src/company-identity/environment.ts:145-160` permits an HTTP loopback redirect
  URI with an explicit port outside production. `apps/accounting/.env.example:11` uses
  `http://localhost:3010/api/auth/callback`, exactly the permitted form.
- `app/lib/public-url.ts:28-45` rejects any URL whose protocol is not `https:` and returns
  `undefined`.
- `app/lib/public-url.ts:116-124` then throws `PUBLIC_ORIGIN_INVALID`, because the environment
  variable is set and the parsed origin is undefined.
- `app/api/auth/company/start/route.ts:41` calls `getAccountingCallbackOrigin()` outside the
  `try` block at lines 36-40. The route returns 500. A developer who follows `.env.example`
  cannot sign in.
- `app/lib/public-url.ts:87-94` already allows an HTTP loopback origin outside production. The two
  functions in the same file disagree.

Plan:

1. Accept an HTTP loopback URL in `configuredOrigin` when `NODE_ENV` is not production. Reuse the
   `LOCAL_HOSTNAMES` set at line 2. About 4 lines.
2. Move line 41 of the start route inside the `try` block, or give it its own fallback. One line.

### 4.2 Dead code and a duplicated rule

Issues:

- `app/lib/sign-in-href.ts` has 70 lines and zero production importers. Only
  `app/lib/__tests__/sign-in-href.test.ts` imports it.
- `app/login/page.tsx:16-18` builds the same sign-in href inline. The inline version does not
  check for a control character, a backslash, a fragment, malformed percent encoding, or the
  length limit. `app/api/auth/company/start/route.ts:24` validates `returnTo` again through
  `parseCompanyOidcReturnTo`, so there is no open redirect today.
- `proxy.ts:38` repeats the literal `https://accounting.reading-advantage.com`, which
  `app/lib/public-url.ts:1` already holds as `DEFAULT_ACCOUNTING_ORIGIN`.

Plan:

1. Use `buildSignInHref` in `app/login/page.tsx`. Delete the inline construction. Two lines.
   `app/lib/sign-in-href.ts` survives.
2. Export `DEFAULT_ACCOUNTING_ORIGIN` from `app/lib/public-url.ts`. Import it in `proxy.ts`.
   Two lines.

### 4.3 Login page rendering

Issues:

- `app/login/page.tsx:45` wraps the page in `<Suspense fallback={null}>`. The whole page renders
  nothing until the search parameters resolve. The user sees a blank page.
- `app/login/page.tsx:7-10` holds the two error keys that `app/api/auth/callback/route.ts:55` and
  `:76` emit. The two lists agree today.

Plan:

1. Replace the `null` fallback with the static heading and the sign-in button. Only the error
   message depends on the search parameters. About 10 lines.

## 5. Loading, State, and Missing Views

Issues:

- The application has no `error.tsx`, no `loading.tsx`, and no `not-found.tsx`.
  `app/page.tsx:31` calls `listAccountingSubmissions` with no guard. A database failure replaces
  the whole page with the Next.js default.
- `app/_components/pending-submissions-list.tsx:75-79` keeps only pending records.
  `app/page.tsx:31` loads every record the actor may see and sends all of them to the browser in
  the server payload. An owner receives approved and rejected records, with payee, amount, and
  evidence reference, and the interface never shows them.
- There is no history view. An owner can approve a record and can never see it again in the
  application. Only the CSV export shows approved records.
- `app/_components/pending-submissions-list.tsx:184-189` links to `/api/submissions/export` with
  no query. The route supports `from` and `to` at lines 61-69, so the user cannot reach the
  feature the route already has.
- `app/_components/pending-submissions-list.tsx:110-123` removes the approved record from local
  state and never calls `router.refresh()`. The server list stays stale until the next navigation.
- `app/_components/new-submission-form.tsx:234-240` tells the user to reload the page after a 409
  conflict. The component can clear `idempotencyKeyRef` instead.

Plan:

1. Add `app/error.tsx`. About 20 lines.
2. Filter to pending records on the server. Pass only those to the component. `app/page.tsx`
   changes by 1 line and `pendingOnly` moves with it.
3. Add a status filter and an approved-record list. This is a new view. Give it its own track.
4. Add a `from` and `to` date pair beside the export link. The route already accepts them. About
   15 lines.
5. Call `router.refresh()` after an approval and after a rejection. Two lines.
6. Set `idempotencyKeyRef.current = null` in the 409 branch. Change the message. Two lines.

## 6. Duplication and Dead Code

Issues:

- `actorFromUser` exists in five files with an identical body: `app/page.tsx:18-22`,
  `app/api/submissions/route.ts:42-48`, `app/api/submissions/[id]/approve/route.ts:23-29`,
  `app/api/submissions/[id]/reject/route.ts:24-30`, and
  `app/api/submissions/export/route.ts:24-30`.
- `jsonResponse` exists in four files with an identical body:
  `app/api/submissions/route.ts:56-61`, `app/api/submissions/[id]/approve/route.ts:37-42`,
  `app/api/submissions/[id]/reject/route.ts:38-43`, and
  `app/api/submissions/export/route.ts:38-43`.
- `isInvalidInputError`, `isForbiddenError`, `isNotFoundError`, and `getSubmissionId` exist twice,
  in the approve route at lines 49-97 and in the reject route at lines 50-98. The two files share
  about 90 identical lines out of 135 and 153.
- The `AccountingSessionUser` type alias is declared in five files.
- Tests sit in three layouts: `app/lib/*.test.ts`, `app/lib/__tests__/*.test.ts`, and
  `app/api/**/route.test.ts` with a second `route.red.test.ts` beside it.

Plan:

1. Move `actorFromUser`, `jsonResponse`, the three error predicates, `getSubmissionId`, and the
   `AccountingSessionUser` type into `app/lib/route-helpers.ts`. Delete the copies. This removes
   about 140 lines.
2. Keep both the approve route and the reject route. They differ by the domain call and by the
   request body. Do not merge them behind a mode flag.
3. Move `app/lib/derived-rate.test.ts` and `app/lib/auth.test.ts` and
   `app/lib/submissions.test.ts` into `app/lib/__tests__/`. One layout survives.

## 7. Security Headers

Issues:

- `next.config.ts:31-50` sets `X-Frame-Options`, `X-Content-Type-Options`, and `Referrer-Policy`.
  It sets no `Content-Security-Policy` and no `Permissions-Policy`.
- `apps/accounts/next.config.ts:22-26` already holds both headers for a sibling application in
  this repository.

Plan:

1. Copy the `Content-Security-Policy` and `Permissions-Policy` entries from
   `apps/accounts/next.config.ts`. Test the page render, because the application uses
   `@reading-advantage/ui`. About 3 lines.

## 8. Prioritized Roadmap

Each phase maps to one Measure track. Write tests for backend changes per project policy.

### Phase 0: Broken UX (one to two line fixes each)

1. Move `getAccountingCallbackOrigin()` inside the `try` block in the company start route.
2. Accept an HTTP loopback origin in `configuredOrigin` outside production.
3. Return an empty string from `derivedRate` for a non-positive source amount.
4. Call `router.refresh()` after an approval and after a rejection.
5. Clear `idempotencyKeyRef` in the 409 branch of the submission form.
6. Use `buildSignInHref` in the login page.
7. Export `DEFAULT_ACCOUNTING_ORIGIN` and import it in `proxy.ts`.
8. Delete the `as string` cast in the reject route.
9. Replace the `null` Suspense fallback on the login page.

### Phase 1: Money correctness

1. Add the currency exponent to `derivedRate` through `Intl.NumberFormat`.
2. Pass the currency at both `derivedRate` call sites.
3. Format the review list amounts as currency, not as minor units.
4. Convert `submittedAt` to the business time zone in the export filter.
5. Replace the offset test fixture with a UTC fixture at the day boundary.
6. Add a major-unit preview under the submission form amount field.

Acceptance: a JPY record exports the true baht-per-yen rate; a record submitted at 06:00 Bangkok
time appears in that day's export; the review list shows 123.45 THB for 12345 satang.

### Phase 2: Loading and state correctness

1. Add `app/error.tsx`.
2. Filter to pending records on the server, not in the browser.
3. Add `from` and `to` controls beside the export link.

### Phase 3: Duplication removal

1. Extract `app/lib/route-helpers.ts` and delete the five copies of `actorFromUser`, the four
   copies of `jsonResponse`, and the duplicated error predicates.
2. Move the three loose library tests into `app/lib/__tests__/`.

### Phase 4: Structural alignment (needs dedicated tracks)

1. Add the `Origin` check to the three state-changing finance routes.
2. Add the `Content-Security-Policy` and `Permissions-Policy` headers.
3. Add an approved and rejected history view with a status filter.
4. Restrict `currencySchema` to the settled currency list. This changes the shared domain package
   and every finance application that uses it.

## 9. Out of Scope

- Framework upgrades. The version policy forbids them in feature work.
- New dependencies. Every fix uses an installed package or the platform.
- `packages/backend/src/modules/accounting`. The audit read it to verify the money claims in
  section 2. Only the currency allowlist in Phase 4 changes it.
- The deployment scripts under `apps/accounting/scripts` and the release gates in
  `app/lib/__tests__/*.red.test.ts`. They belong to the deployment track.
- The evidence storage adapter. `app/lib/private-evidence-storage.ts` is correct, and the audit
  records no defect in it.
