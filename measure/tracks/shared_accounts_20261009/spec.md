# Track Specification: Shared Accounts Across Apps

**Track ID:** `shared_accounts_20261009`
**Type:** feature (platform identity)
**Created:** 2026-10-09
**Starts:** after the Primary cutover passes and the feature freeze ends. Until then, this track
changes no code, no schema, and no service.

## Overview

One person must have one account for all apps. A student or a teacher signs in once and can use
Primary, Reading, the subject programs, and later apps. A company staff member signs in once with
the company account and has a role in each app.

Today this is not true for students and teachers. Each app keeps its own users, credentials, and
sessions in its own database. The sign-in code (`packages/api/src/routes/auth/`,
`packages/domain/src/student-login/`, and `packages/auth`) reads and writes the database of the app
that runs it. A Reading account would be a different account from a Primary account. Science, Math,
and Zhongwen share accounts with Primary only because they are programs inside the Primary app and
database.

Company staff already have one account for CodeCamp, Sales, Accounts, and Accounting. Primary and
Reading do not use it yet.

Owner decision (2026-10-09): two shared account systems.

| Who | Account system | Sign-in | Role and school |
|---|---|---|---|
| Students and teachers | New learner identity database (this track) | One session cookie on `.reading-advantage.com` | Kept in each app |
| Company staff | `company_identity` (exists) | Company sign-in at `accounts.reading-advantage.com` (OIDC) | One role for each app through `company_product_principals` |

## Current State (checked 2026-10-09)

- All apps use subdomains of `reading-advantage.com`: `primary.`, `app.` (Reading), `accounts.`,
  `sales.`, `marketing.`, `accounting.`, and `www.`. The DNS zone is in Squarespace and can have
  other subdomains.
- `packages/db/src/schema/users.ts`:
  - `users` mixes data about the person (`username`, `display_username`, `name`, `email`, `image`,
    `email_verified`, legacy `password`) with app data (`role`, `school_id`, `license_id`,
    `expired_date`, `xp`, `level`, `cefr_level`, `grade_level`). `users.id` is text.
    `username` and `display_username` are unique.
  - `accounts` holds the credentials (Argon2id or legacy bcrypt hash, `temporary_password_issued_at`).
  - `sessions` holds `token_hash`, `expires_at`, `auth_strength`, `idle_timeout_seconds`, and
    `last_seen_at`.
  - 67 foreign keys in 20 schema files point to `users.id`.
- Code that reads or writes accounts and sessions in the app database:
  - `packages/api/src/routes/auth/login.ts`: reads `users` and `accounts` through the app `db`
    singleton, calls `configurePostgresRateLimiter(db)` at module load, checks the temporary password
    on the app row, and sets the cookie with its own `COOKIE_OPTIONS` (7 days, host-only).
  - `packages/api/src/routes/auth/logout.ts` (`handleLogout`): clears a host-only cookie.
  - `packages/auth/src/session.ts`: creates and validates sessions; `createSession` locks the `users`
    row `FOR UPDATE` in the same transaction (one device, the session cap).
  - `packages/auth/src/audit.ts`: `recordAuditEvent` writes `audit_events` through the app `db`
    singleton. It has 12 call sites for app actions, and `student-login/audit.ts` writes `auth:login`.
  - `packages/domain/src/student-login/roster.ts`: joins `sessions` with the class roster in the app
    database.
  - `apps/primary-advantage/lib/student-login/http.ts`: sets the session cookie in app code.
  - `apps/reading-advantage/middleware.ts` and `lib/session.ts`: hard-code `"session_token"`.
  - Reading has public self sign-up: `app/[locale]/(auth)/auth/signup` and `/api/auth/signup`.
- `packages/auth/src/student-session-policy.ts`: a student session ends after 30 minutes idle or at
  the end of the school day (17:00 Bangkok), and allows one device.
- `apps/primary-advantage/lib/auth-strength.ts`: `canUseFullAuthFeature` allows only `full` sessions
  for some features. Reading has no such check.
- Staff sign-in: `packages/auth/src/company-identity/client.ts` (`createCompanyOidcClient`) is used by
  `apps/codecamp-advantage/lib/company-oidc.ts` and `apps/sales-advantage/lib/company-oidc.ts`. The
  issuer is `apps/accounts`, with an application catalogue in
  `apps/accounts/lib/server/application-catalogue.ts`. `company_product_principals` (in each app
  database) maps one company account and one `application_key` to one local user and one `role_key`.
- `packages/auth/src/product-scope.ts` already separates a `company` principal from a
  `legacy-school` principal.
- Connection pools: `packages/db/src/connection-options.ts` sets `max: 3` for each process. The
  instance `cloud-sql` is `db-g1-small` with no database flags, so the default `max_connections`
  applies. It holds 12 databases for 7 or more Cloud Run apps.
- `packages/domain/src/__tests__/tenant-coverage.test.ts` fails when a table in the schema barrel has
  no classification in `tenant-registry.ts`.
- Primary has live users from the cutover on 2026-10-11. Reading has no users. `reading_v2` does not
  exist yet.

## Functional Requirements

**FR-1. Learner identity database.** A new database `learner_identity` on the Cloud SQL instance
`cloud-sql`, with its own Drizzle schema and its own migrations in `packages/db`. The identity
schema is not in the app schema barrel, so the tenant coverage test does not see it. Tables:
- `identity_users`: `id` (text, the same value as the app `users.id`), `username` (unique for all
  apps), `display_username`, `name`, and the nullable `email`, `image`, and `email_verified`.
  Students have no email; these fields stay empty for them.
- `identity_credentials`: the password hash (Argon2id; legacy bcrypt is checked and rehashed at
  sign-in) and `temporary_password_issued_at`.
- `identity_sessions`: the columns of today's `sessions`, plus `origin_app`.
- The login rate-limit store.
- `identity_audit_events`: sign-in, sign-out, password change, temporary password, and account
  deletion. These rows are never changed after they are written.

**FR-2. Local user rows stay in each app.** Each app keeps its `users` table as the local profile
with the same `id` as the identity user. The 67 foreign keys do not change. The app keeps `role`,
`school_id`, licence, and progress data. `username`, `display_username`, `name`, and `email` stay in
the app table as read copies.
- **Sync:** the adapter updates the read copies when it validates a session and the identity row
  changed after the last sync, so an app the person did not sign in to also gets the new values.
- **Conflict rule:** a read copy never takes a username that a staff local row uses (see FR-8).
- The app `password` column and the app `accounts` and `sessions` tables are not used after the move
  (FR-9) and are removed in a later migration.

**FR-3. One auth adapter, two modes.** A setting `AUTH_ACCOUNT_STORE=local|shared` selects the
store. The adapter in `packages/auth` owns every read and write of accounts, credentials, sessions,
the session cookie, the login rate limit, and the auth audit events. Phase 3 moves these call sites
behind the adapter:
- `packages/api/src/routes/auth/login.ts` and `logout.ts`
- `packages/auth/src/session.ts` (the row lock moves to `identity_users`)
- `packages/auth/src/audit.ts` (`recordAuditEvent` takes a database argument; auth events go to
  `identity_audit_events`, and app actions stay in the app `audit_events`)
- `packages/domain/src/student-login/roster.ts` (session data for the roster comes from the adapter)
- `apps/primary-advantage/lib/student-login/http.ts` (cookie)
- `apps/reading-advantage/middleware.ts` and `lib/session.ts` (cookie name)
After Phase 3, a change of mode is an environment change only.

**FR-4. Shared session cookie.** In `shared` mode the cookie is `ra_session`, with
`Domain=.reading-advantage.com`, `HttpOnly`, `Secure`, `SameSite=Lax`, `Path=/`. The token is stored
only as a hash. A sign-out deletes the session and clears the cookie with the same `Domain`, so the
person is signed out of all learner apps.

**FR-5. Student session rules stay.** The idle limit, the end of the school day, one device, and
`auth_strength` move into `identity_sessions` and apply in all apps. In `shared` mode a page needs a
`full` session by default. An app can allow a `code_only` session on a page only when it says so
explicitly.

**FR-6. Sign-in methods stay in the app that owns them.** The class code, the picture password, and
the QR card check data that only the app has (classes are app data). After the check, the app asks
the adapter to create the shared session for that identity user. Username and password sign-in
works in every learner app.

**FR-7. Access to an app.** A shared session does not give access to an app by itself. An app gives
access only when the person has a local `users` row in that app. A local row comes only from the
app's own flows: a class roster, a teacher invite, or a licence activation. These flows link an
existing identity account (found by username) or create a new one. With no local row, the app shows
a "no access to this app" page. Reading has no public self sign-up (OD-6): the sign-up page and
`/api/auth/signup` are removed.

**FR-8. Company staff in all apps.** Primary and Reading become OIDC clients of
`accounts.reading-advantage.com`, with the same pattern as CodeCamp and Sales:
- Owner step: register each OIDC client in `company_identity` (redirect URIs, client secret).
- Code change: add `primary` and `reading` to `apps/accounts/lib/server/application-catalogue.ts`.
  The subject programs use the `primary` key, because they run in the Primary app.
- `company_product_principals` maps each staff account to one local user and one `role_key` for each
  app. The roles are set in the accounts admin pages.
- Staff local rows use usernames that start with `staff-`. The identity database refuses a learner
  username with that start.
- After the mapping, the local staff passwords in Primary (for example the SYSTEM account) are
  removed.
- Staff accounts and learner accounts stay separate. A staff member who also teaches uses two
  accounts.

**FR-9. Move of the Primary users.**
- **Collision rule:** until the move is complete, the identity database refuses to create an account
  whose username exists in the Primary `users` table. Thus no person gets a second identity before
  the move, and the move can keep the Primary IDs.
- A script copies every Primary user (person fields), credential, and open session into
  `learner_identity`, with the same IDs. It runs again with the same result and writes a
  reconciliation report.
- Two rehearsals on a copy of production, then the move in a quiet hour.
- **Bridge:** nobody signs in again. The adapter accepts the old host-only `session_token` once,
  finds the copied session, issues a new token in `ra_session`, and deletes `session_token`.
- **Rollback window: 7 days.** During the window the adapter writes every credential write (password
  change, temporary password, picture password, rehash) and every new local row to both stores. A
  rollback sets `AUTH_ACCOUNT_STORE=local`. It ends every open `ra_session`, so users sign in again,
  but no credential is lost. AC-5 does not hold after a rollback.

**FR-10. Reading starts on shared accounts.** The Reading cutover deploys Reading in `shared` mode
from the first day. Reading needs no account move. Reading content goes into its own content
database `reading_v2` (owner step: create it); this spec confirms that choice.

**FR-11. Usernames.** `identity_users.username` is unique for all apps. The existing rules stay:
teachers use the email in lower case, students use two words and two digits (for example
`bluetiger47`), and student usernames never change.

**FR-12. Account lifecycle.**
- Removal from one app deletes or deactivates the local row in that app only. The identity account
  and its access to other apps stay.
- Account deletion (the person leaves all apps) deletes the identity account and its sessions, and
  each app deactivates its local row. It writes an identity audit event.
- A teacher password reset uses the existing temporary-password method through the adapter.

## Non-Functional Requirements

- **Connection budget (go/no-go gate in Phase 0):** count Cloud Run instances × apps × pools for the
  app databases and the identity database against `max_connections` of `cloud-sql`. Set the identity
  pool size. If the count does not fit, add a pooler or change the tier before Phase 3.
- **Cookie planting (OD-1 risk):** any host under `reading-advantage.com` can set a cookie for the
  parent domain. A script error on one subdomain could put an attacker's valid session in a child's
  browser. Controls: list every DNS record of the zone in Phase 0 and remove the unused ones; a
  Content Security Policy on every subdomain; a new token at the bridge (FR-9); the learner apps
  show the signed-in name on every page.
- The identity database has its own Postgres role. App roles can read and write only the identity
  tables they need. Tenant data never goes into the identity database.
- No password, token, or hash appears in a log.
- All identity schema changes use Drizzle migrations, with the same deploy gate as the app
  databases (`migrate` → `doctor --required-migration`).
- Tests: Vitest with a mocked database for the adapter in both modes, plus the move script on a copy
  of production data before each rehearsal.

## Acceptance Criteria

1. A student who signs in on Primary opens Reading with no second sign-in, when the student has a
   local Reading row. With no local row, Reading shows the "no access" page.
2. A sign-out in one learner app ends the session in all learner apps.
3. A student session ends after 30 minutes idle and at 17:00 Bangkok, and a second device ends the
   first session, in all learner apps. A `code_only` session opens only the pages that allow it.
4. A company staff member signs in once at `accounts.reading-advantage.com` and gets the role set for
   Primary in Primary and the role set for Reading in Reading.
5. After the Primary move, every Primary user signs in with the same username and password, and no
   open session is lost. The reconciliation report shows the same counts in both stores.
6. In rehearsal 1, a rollback inside the 7-day window loses no credential.
7. After Phase 3, a test shows that a change of `AUTH_ACCOUNT_STORE` needs no code change.
8. Before the move, the identity database refuses a username that exists in Primary.

## Out of Scope

- Tutor Advantage accounts (LINE and its own database). A later track can connect Tutor.
- CodeCamp learner accounts and Sales customer accounts.
- Social sign-in, magic links, and passwordless sign-in (AGENTS.md).
- A move of tenant data (schools, classes, licences) into the identity database.
- A support tool that looks up one person across all apps.

## Preconditions

- The Primary cutover passed, and the owner ended the feature freeze.
- The owner approved this spec.
- The owner creates the `learner_identity` database and its role (owner step: database creation
  and passwords).

## Owner Decisions

The owner decided OD-1 to OD-5 on 2026-10-09 and OD-6 on 2026-10-10.

| ID | Question | Decision |
|---|---|---|
| OD-1 | Cookie scope: `.reading-advantage.com` (all subdomains get the cookie, including www, marketing, and sales), or a new learning subdomain (stricter, but Primary and Reading change hosts and printed QR links need redirects)? | `.reading-advantage.com`, with the cookie-planting controls in the NFRs. |
| OD-2 | Identity database: a new database on the instance `cloud-sql`, or a separate Cloud SQL instance? | A new database on `cloud-sql`, with its own role. |
| OD-3 | Order: Reading on shared accounts first, Primary move second? | Yes, with the collision rule in FR-9. |
| OD-4 | Staff who also teach: two accounts, or one linked account? | Two accounts. Staff data and school data stay apart. |
| OD-5 | How does a teacher in Primary get access to Reading? | The Reading school admin or the licence flow adds the existing account by username (FR-7). **Condition:** check the licence model first (Phase 1). It must let a licence or a school add an existing identity account. See the Reading License Control-Plane Migration track in `measure/tracks.md`. |
| OD-6 | Does Reading keep its public self sign-up? | No. Reading removes its sign-up page and `/api/auth/signup`. Accounts come only from a class roster, a teacher invite, or a licence (FR-7). This also makes the collision rule (FR-9) simpler. |

## Review

A Fable subagent reviewed the first draft on 2026-10-09 (3 High, 7 Medium, 6 Low). This version
includes all of them: the real sign-in call sites and an environment-only mode switch (H1), the
collision rule and the Reading self sign-up question (H2), the 7-day double write of all credential
writes (H3), the roster query and the row lock (M1), the sync at validation (M2), the cookie-planting
controls (M3), `full` by default (M4), the connection gate (M5), the audit split (M6), the missing
plan tasks and the tenant test (M7), and L1 to L6.
