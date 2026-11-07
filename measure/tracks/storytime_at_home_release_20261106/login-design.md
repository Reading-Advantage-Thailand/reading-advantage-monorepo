# Storytime login design (note for the approved points)

Author model: claude-code/claude-sonnet-5-5. Written 2026-11-07. Track `storytime_at_home_release_20261106`, Phase 2b.

## Owner words and approved points

Daniel, Google Tasks, 2026-11-07 06:07 ICT:

```
Have noticed the student books have QR codes linking to our content and state that no login is required. This is of course an absurd choice because then any school or any person can use our online content without paying at all. Parents are going to be supervising the young learners so we can simply have a long running login that they have to complete the first time then we can keep out random people who aren't in our program
```

Daniel, 2026-11-07 06:21 ICT, to the PM's plan: "Approved". The approved points do not change here: one account per family or per school class; one sign-in, then the device stays signed in (about one year, renewed on use); a QR scan without a sign-in opens the sign-in page and returns to the same page; a stranger sees a short "How to join" page and no content; pictures, songs, and videos are protected too; the company makes the accounts for release 1; teacher routes need a teacher login.

## 1. Facts read on 2026-11-07

- `apps/storytime` has no database and no secret. `cloudbuild.yaml` says so. `proxy.ts` only adds the Thai locale prefix.
- The page reads `STORYTIME_MEDIA_BASE`. The media sit under `gs://primary-app-storage/storytime-app/` with public read since 2026-11-07. The live revision is `storytime-app-00011-dut`.
- `apps/accounts` is the company login (OIDC provider over the `company_identity` database). It serves employees and the company apps (Marketing, Sales, Codecamp, Accounting). A family is not an employee. Accounts is the only runtime that may connect to `company_identity`. This design does not put families in it.
- `packages/auth` has Argon2id hashing, PostgreSQL-backed sessions, a rate limiter, and audit helpers. Its session, audit, and rate-limit store functions are wired to the shared company tables (`accounts`, `sessions`, `auditEvents`, `loginAttempts`) and to the singleton `db` client, and `createSession` has a fixed cap of 10 sessions. They do not fit Storytime (section 5a).
- `packages/storage` has the adapter with `getSignedUrl(key, expiresIn)` over the S3 driver. Google Cloud Storage accepts the S3 interop protocol with HMAC keys.
- The accounts app has a safe return-path check (`apps/accounts/lib/server/safe-return-path.ts`). It rejects control characters and bad percent encoding.

## 2. Design

**Sign-in flow.** A scan of a QR code opens `/th/st/<level>/<week>`. `proxy.ts` checks for the session cookie on `/<locale>/st/**` and `/<locale>/teacher/**`. A request with no cookie redirects to `/<locale>/sign-in?next=<path>`. The proxy only checks that a cookie exists. Every page and every media route also checks the session against the database (defense in depth). The sign-in page takes a username and a password and posts to a route handler. The handler first checks the origin (see CSRF below), then checks the rate limit, verifies the Argon2id hash, creates a session, sets the cookie, writes an audit event, and redirects to `next`.

**CSRF (orchestrator decision, 2026-11-07).** The session cookie stays `SameSite=Lax`. The sign-in POST and the sign-out POST also pass one origin check, `assertSameOrigin`, as their first statement: the `Origin` header must equal the app's own origin; without `Origin`, the `Referer` must start with the app's own origin; otherwise the handler answers 403 and changes no session and sets no cookie. The sign-in form is a route handler, so the check is plain code in the handler. If Green uses a Next Server Action instead, the action calls the same `assertSameOrigin` with the request headers as its first statement, and `serverActions.allowedOrigins` stays unset (Next also compares `Origin` with `Host` for an action; the explicit check does not depend on that).

**Return to the scanned page.** `next` is valid only when it is a same-origin path: it starts with one `/`, has no `//`, no backslash, no scheme, no control character, and no bad percent encoding after one decode; it is 200 characters or less; and it matches `^/(th|en)/(st|teacher)/`. Any other value goes to `/<locale>/st`. The handler reuses the logic of the accounts check, copied behind a test, not imported from another app.

**Session.** A random 256-bit token in a cookie: `HttpOnly`, `Secure`, `SameSite=Lax` (a QR scan is a top-level GET, so Lax sends the cookie), path `/`, `Max-Age` 365 days. The database row holds the token digest by the existing `packages/auth` method, the account, the expiry, and the last use. When a request uses a session with fewer than 335 days left, the server sets a new 365-day expiry and cookie (at most one write each day). The company ends sessions by disabling the account. A disabled account fails on the next request.

**"How to join" page.** `/<locale>/join` is public and short: what Storytime at Home is, that a school or the company gives the sign-in details, and a contact line. It shows no week content and no media link. The sign-in page links to it. The copy (English and Thai) comes from the PR session by 2026-11-10. Daniel checks the Thai on 2026-11-16. Until both are recorded, the page uses a marked draft: the copy file holds `status: "draft"` and the page shows a visible draft marker.

**Teacher login.** The same sign-in page. Each account has a role: `family`, `class`, or `teacher`. `/<locale>/teacher/**` and the teacher media need `teacher`. A `family` or `class` session on a teacher route gets a 403 page with a link to the teacher sign-in. A teacher session can open the family routes too. Teacher accounts are made by the same script.

## 3. Account source for release 1

| Option | For | Against |
|---|---|---|
| Admin list (one account per family or class, made by a script from the company list) | Each account has its own password. The company can disable one account. The audit log names the account. | The company must hold and give out the sign-in details. A CSV of families is personal data. |
| Class codes (one shared code per class) | Easy to give out. No list of families. | A shared code leaks: a photo of the class sheet, a message in a parent chat. The company cannot revoke one family. One leak opens the whole class. A code has no name in the audit log. |

**Choice: the admin list.** A script (`apps/storytime/scripts/make-accounts.ts`) reads a CSV (name, class, role) from a folder outside the repository. It makes a username and a generated password (10 characters, no look-alike letters, about 50 bits), inserts the Argon2id hash, and writes a print-ready sign-in card list to the same outside folder. The CSV and the card list never go in git. A school class gets one account with the role `class`. That account is a shared secret too, so it has a limit of 30 active sessions. A `family` account and a `teacher` account have 5. The risk of a shared class account is the same as a class code, but the company can disable and replace it.

**First batch (PM decision, 2026-11-07).** The accounts carry no personal names: `staff-01` to `staff-05` (role `family`), `tutor-01` to `tutor-03` (role `teacher`), and `demo-class-01` (role `class`). The CSV and the printed card list live in `~/Desktop/storytime-accounts/` (outside the repository, unshared). Real family and class accounts come later with `make-accounts.ts`. The 2026-11-20 release does not wait for names.

**Safety rules.** Argon2id, per-account and per-IP rate limiting in the database, an audit event for each sign-in, failure, disable, and password reset, no OAuth, no magic link, no email (AGENTS.md "Features Not Included by Default"). Password reset is a company action in release 1 (the script).

## 4. Media protection

Each media URL in a page becomes a short-lived signed URL, made on the server only after the session check. The URL comes from `storage.getSignedUrl(key, expiresIn)` of the storage adapter (S3 driver over the Google interop endpoint). Expiry: 6 hours, longer than a reading session; a page reload makes new URLs. The browser then fetches the object from Google Cloud Storage directly. Google handles HTTP `Range` requests, so mp4 seek and iOS Safari video work with no code in the app. A media proxy through Cloud Run is the fallback: it needs its own Range code and the response size limits of Cloud Run, and it costs app compute for every video byte. Choose it only if a signed URL fails the browser check.

**Move from public to private.** The Storytime media live in the dedicated private bucket `gs://storytime-app-media`; task 2b.6 signs URLs for it. The public prefix `gs://primary-app-storage/storytime-app/` keeps serving the live revision `00011-dut` until the traffic move. The order: (1) deploy the new revision with no traffic, the media base set to the new bucket, and signing on; (2) check the tagged URL signed in and signed out; (3) Daniel moves the traffic; (4) after the traffic move, remove the public read of the old prefix (`deferred:daniel`). The old prefix `storytime/` stays untouched (Daniel's deletion gate, after 2026-11-20).

## 5. Database and secrets (run by the orchestrator, PM decision 2026-11-07)

- **Database.** A new database `storytime` on the existing Cloud SQL instance, a runtime user with table-level rights, and the tables of section 5a. The orchestrator creates them (task 2b.8, target 2026-11-11). The shared accounts service is not used (section 1).
- **Signer service account.** One service account, `storytime-media-signer`, with `roles/storage.objectViewer` bound on the dedicated private bucket `gs://storytime-app-media` only (a bucket-level binding, not a project binding, and never a binding on `primary-app-storage`). PM decision, 2026-11-07: the bucket is in `asia-southeast1` with uniform bucket-level access and public access prevention enforced. Later weeks also go to this bucket. The storage adapter signs media URLs with its HMAC key.
- **Secrets.** The HMAC key and the database URL go straight into Secret Manager with `gcloud secrets versions add <name> --data-file=-` (the value comes from a pipe). No secret is ever printed or written to a file in the repository (the repository is public). Secret names: `storytime-database-url`, `storytime-storage-hmac-access-key`, and `storytime-storage-hmac-secret`.
- **Runtime.** The `storytime-app` service gets the three secrets as environment variables from Secret Manager: `STORYTIME_DATABASE_URL`, `STORYTIME_STORAGE_ACCESS_KEY`, and `STORYTIME_STORAGE_SECRET_KEY`. Its runtime service account gets `roles/secretmanager.secretAccessor` on these three secrets only, and Cloud SQL client on the instance. `cloudbuild.yaml` gains the secrets and the Cloud SQL instance, and its "no database and no secrets" rule changes.
- The Dockerfile COPY set grows (`packages/db`, `packages/auth`, `packages/storage`). The migrate step runs only in the manual traffic step (the same order as decision D1 of `per_app_cicd_20261107`); a push changes no production database.
- Daniel keeps the deploy and the traffic move (task 2b.10).

### 5a. Storytime tables (not the shared company tables)

Storytime families are not company accounts, the `storytime` database is separate, and the shared functions are hard-wired to the shared tables and the singleton client. So this phase does not reuse `accounts`, `sessions`, `auditEvents`, or `loginAttempts`, and it does not call `createSession`, `validateSession`, or the shared audit and rate-limit store functions.

- A new schema module in `packages/db`: `src/schema/storytime/` (subpath export `@reading-advantage/db/storytime/schema`), with its own drizzle config (`drizzle.storytime.config.ts`), its own migrations folder (`drizzle-storytime/`), and the script `storytime:migrate`, for the `storytime` database. It is not part of the shared schema barrel or the shared migrations.
- All SQL lives in `packages/backend/src/modules/storytime-access/` (subpath export `@reading-advantage/backend/storytime-access`, created with `createStorytimeStore(db)`), because `DATABASE_BOUNDARY` bars a database import in `apps/storytime`. This is the `apps/accounting` pattern. The adapter in `apps/storytime/lib/auth/` wraps the store.
- Tables: `storytime_accounts` (username, Argon2id hash, role `family|class|teacher`, disabled flag), `storytime_sessions` (token digest, account, expiry, last use; the cap is 30 active sessions for `class` and 5 for `family` and `teacher`), `storytime_login_attempts` (key, failed count, window start; it backs the rate limit), and `storytime_audit_events` (immutable: insert only).
- Tenant registry class: **EXEMPT** for all four tables (`storytimeAccounts`, `storytimeSessions`, `storytimeLoginAttempts`, `storytimeAuditEvents`), registered in `packages/domain/src/tenant-registry.ts`. The database is single-tenant, the rows have no `schoolId`, and no school scopes them.
- Reused pure helpers, each taking its inputs as arguments: `hashPassword` and `verifyPassword` (Argon2id; `packages/auth/src/password.ts`; the legacy bcrypt branch of `verifyPassword` never runs because every Storytime hash is Argon2id), and `consumeRateLimit(store, key, config)` with the type `RateLimitStore` (`packages/auth/src/rate-limit.ts`), called with a store that Storytime backs with `storytime_login_attempts`. `packages/auth` gets two `exports` lines, `./password` and `./rate-limit`, so the helpers load without the package root (the root throws in production without `DATABASE_URL`). A Red test asserts that importing them opens no database connection. If it does, Green writes a small Storytime helper with `@node-rs/argon2` and the same cost options, and the list above shrinks. Nothing else is reused.
- The auth-adapter shape of AGENTS.md (`login`, `logout`, `getCurrentUser`, `requireUser`, `requireRole`) lives in `apps/storytime/lib/auth/`. It wraps the store of `@reading-advantage/backend/storytime-access` and holds no SQL. Application code depends only on that adapter. A small signed-in page `app/[locale]/st/page.tsx` is the return fallback of a bad `next`.

## 6. Effect on the 2026-11-20 release

The login adds about 5 working days of build and review. The estimate: local commits of Phase 2b by 2026-11-14, if the orchestrator creates the database, the signer, and the secrets by 2026-11-11 (task 2b.8). The first batch of accounts has no personal names (section 3), so the release does not wait for a list. The "How to join" copy comes from the PR session by 2026-11-10, and Daniel checks the Thai on 2026-11-16. The deploy of 2026-11-20 holds when these dates hold. If one slips, the deploy moves by the same days: the latest estimate is 2026-11-24. The printed QR paths do not change. Without Phase 2b the release would publish content that anyone can open, so it should not go out without it.

## 7. The work as a phase

Phase 2b in `plan.md`: Red tests, the schema and migration, the auth routes and the proxy check, the account script, the signed media URLs, the pages, the reviews, then the orchestrator's tasks (database and secrets, the first batch of accounts) and the deploy gate (the deploy and the public-read removal). Spec rows: FR-4 and AC-4.1 to AC-4.9.

The www Storytime page copy ("By QR Code, With No Login" and its FAQ) changes after PR's text arrives. That is a separate change in the www app and is not in this phase.
