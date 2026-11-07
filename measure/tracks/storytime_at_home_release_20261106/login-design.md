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
- `packages/auth` has Argon2id hashing, PostgreSQL-backed sessions, a Postgres rate-limit store, and audit helpers. They use the tables of `@reading-advantage/db`.
- `packages/storage` has the adapter with `getSignedUrl(key, expiresIn)` over the S3 driver. Google Cloud Storage accepts the S3 interop protocol with HMAC keys.
- The accounts app has a safe return-path check (`apps/accounts/lib/server/safe-return-path.ts`). It rejects control characters and bad percent encoding.

## 2. Design

**Sign-in flow.** A scan of a QR code opens `/th/st/<level>/<week>`. `proxy.ts` checks for the session cookie on `/<locale>/st/**` and `/<locale>/teacher/**`. A request with no cookie redirects to `/<locale>/sign-in?next=<path>`. The proxy only checks that a cookie exists. Every page and every media route also checks the session against the database (defense in depth). The sign-in page takes a username and a password and posts to a route handler. The handler checks the rate limit, verifies the Argon2id hash, creates a session, sets the cookie, writes an audit event, and redirects to `next`.

**Return to the scanned page.** `next` is valid only when it is a same-origin path: it starts with one `/`, has no `//`, no backslash, no scheme, no control character, and no bad percent encoding after one decode; it is 200 characters or less; and it matches `^/(th|en)/(st|teacher)/`. Any other value goes to `/<locale>/st`. The handler reuses the logic of the accounts check, copied behind a test, not imported from another app.

**Session.** A random 256-bit token in a cookie: `HttpOnly`, `Secure`, `SameSite=Lax` (a QR scan is a top-level GET, so Lax sends the cookie), path `/`, `Max-Age` 365 days. The database row holds the token digest by the existing `packages/auth` method, the account, the expiry, and the last use. When a request uses a session with fewer than 335 days left, the server sets a new 365-day expiry and cookie (at most one write each day). The company ends sessions by disabling the account. A disabled account fails on the next request.

**"How to join" page.** `/<locale>/join` is public and short: what Storytime at Home is, that a school or the company gives the sign-in details, and a contact line. It shows no week content and no media link. The sign-in page links to it. The Thai text is a draft for Daniel's copy check.

**Teacher login.** The same sign-in page. Each account has a role: `family` or `teacher`. `/<locale>/teacher/**` and the teacher media need `teacher`. A family session on a teacher route gets a 403 page with a link to the teacher sign-in. Teacher accounts are made by the same script.

## 3. Account source for release 1

| Option | For | Against |
|---|---|---|
| Admin list (one account per family or class, made by a script from the company list) | Each account has its own password. The company can disable one account. The audit log names the account. | The company must hold and give out the sign-in details. A CSV of families is personal data. |
| Class codes (one shared code per class) | Easy to give out. No list of families. | A shared code leaks: a photo of the class sheet, a message in a parent chat. The company cannot revoke one family. One leak opens the whole class. A code has no name in the audit log. |

**Choice: the admin list.** A script (`apps/storytime/scripts/make-accounts.ts`) reads a CSV (name, class, role) from a folder outside the repository. It makes a username and a generated password (10 characters, no look-alike letters, about 50 bits), inserts the Argon2id hash, and writes a print-ready sign-in card list to the same outside folder. The CSV and the card list never go in git. A school class may get one account (role `family`) when the school wants it. That account is a shared secret too, so it has a limit of 30 active sessions; a family account has 5. The risk of a shared class account is the same as a class code, but the company can disable and replace it.

**Safety rules.** Argon2id, per-account and per-IP rate limiting in the database, an audit event for each sign-in, failure, disable, and password reset, no OAuth, no magic link, no email (AGENTS.md "Features Not Included by Default"). Password reset is a company action in release 1 (the script).

## 4. Media protection

Each media URL in a page becomes a short-lived signed URL, made on the server only after the session check. The URL comes from `storage.getSignedUrl(key, expiresIn)` of the storage adapter (S3 driver over the Google interop endpoint). Expiry: 6 hours, longer than a reading session; a page reload makes new URLs. The browser then fetches the object from Google Cloud Storage directly. Google handles HTTP `Range` requests, so mp4 seek and iOS Safari video work with no code in the app. A media proxy through Cloud Run is the fallback: it needs its own Range code and the response size limits of Cloud Run, and it costs app compute for every video byte. Choose it only if a signed URL fails the browser check.

**Move from public to private.** The order matters, because revision `00011-dut` serves public URLs: (1) deploy the new revision with no traffic, with `STORYTIME_MEDIA_BASE` unset and signing on; (2) check the tagged URL signed in and signed out; (3) Daniel moves the traffic; (4) after the traffic move, remove the public read of `storytime-app/` (`deferred:daniel`). The old void prefix `storytime/` stays untouched (Daniel's deletion gate, after 2026-11-20).

## 5. Database and secrets (human gates)

- **Database.** A new database `storytime` on the existing Cloud SQL instance, a runtime user with table-level rights, and tables for accounts, sessions, rate limits, and audit events. The tables go in `packages/db` with a Drizzle migration. Single-tenant, so no `schoolId` scoping applies (record it in the tenant registry as EXEMPT). The shared accounts service is not used (section 1).
- **New secrets:** `STORYTIME_DATABASE_URL` and the storage HMAC pair (`STORYTIME_STORAGE_ACCESS_KEY`, `STORYTIME_STORAGE_SECRET_KEY`). New roles: Cloud SQL client for the `storytime-app` service account. A runtime service account for `storytime-app` if none exists.
- The Dockerfile COPY set grows (`packages/db`, `packages/auth`, `packages/storage`). `cloudbuild.yaml` gains the secrets and the Cloud SQL instance, and its "no database and no secrets" rule changes. The migrate step runs before the traffic move (the same order as decision D1 of `per_app_cicd_20261107`).

## 6. Effect on the 2026-11-20 release

The login adds about 5 working days of build and review. The estimate: local commits of Phase 2b by 2026-11-14, if Daniel creates the database and the secrets by 2026-11-11 and the PM gives the account list by 2026-11-14. The deploy of 2026-11-20 holds when both gates close by those dates. If a gate closes late, the deploy moves by the same days: the latest estimate is 2026-11-24. The printed QR paths do not change. Without Phase 2b the release would publish content that anyone can open, so it should not go out without it.

## 7. The work as a phase

Phase 2b in `plan.md`: Red tests, the schema and migration, the auth routes and the proxy check, the account script, the signed media URLs, the pages, the reviews, then the gates (new database and secrets, the account list, the deploy and the public-read removal). Spec rows: FR-4 and AC-4.1 to AC-4.9.

The www Storytime page copy ("By QR Code, With No Login" and its FAQ) changes after PR's text arrives. That is a separate change in the www app and is not in this phase.
