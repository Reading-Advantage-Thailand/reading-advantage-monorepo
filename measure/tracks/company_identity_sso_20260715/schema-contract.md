# Company Identity Schema Contract

**Track:** company_identity_sso_20260715
**Phase:** S1 — Establish Company Identity Boundary
**Task:** 2 — Define Zod and Drizzle contracts for the identity database
**Depends on:** identity-boundary.md

## 1. Purpose and scope

This document is the contract oracle for the Red tests in Tasks 3 and 4 and
the database implementation in Task 5. It defines a new company-identity
schema and runtime-validation surface without changing the existing product
schema, product migration journal, education TenantDB registry, or legacy auth
exports.

The schema contains only:

- employee accounts and password credentials;
- the internal-company organization and employee memberships;
- additive company roles;
- registered employee applications, their role definitions, and app-scoped
  assignments;
- Accounts SSO sessions and registered application-local sessions;
- OIDC clients, exact redirect URIs, and one-time authorization codes;
- immutable identity audit events;
- secret-safe login attempts, durable rate-limit buckets, and idempotency
  records.

It must not contain school, classroom, student, teacher, license, entitlement,
billing, customer, campaign, curriculum, attempt, progress, submission, review,
or other product-domain tables. It must not import or re-export the product
schema barrel.

## 2. Ownership and implementation roots

The planned implementation is isolated under:

- packages/db/src/company-identity/schema/ for Drizzle tables and relations;
- packages/db/src/company-identity/contracts/ for persistence-row,
  identifier, normalized-key, and database-configuration Zod schemas only;
- packages/db/src/company-identity/env.ts for runtime, direct, and local-test
  database parsers only;
- packages/db/src/company-identity/normalization.ts for versioned username
  normalization;
- packages/db/company-identity/drizzle/ for the independent migration stream.
- packages/backend/src/modules/company-identity/contracts/ for account and
  role-management capability inputs/outputs, idempotency behavior, audit
  projectors, and structured errors after the accepted kernel scaffold exists;
- packages/auth/src/company-identity/ for password-boundary, OIDC, issuer,
  cookie, and product-service client contracts behind the internal auth
  adapter.

Contracts whose owners are blocked by the backend-kernel or auth-adapter gates
are specified in this document but are not temporarily implemented in
packages/db, packages/domain, apps/accounts, or route handlers. Packages may
import only their owner's public contract surface; `packages/db` never becomes
the capability or OIDC domain layer.

Table names use snake_case; Drizzle fields use camelCase. All timestamps are
PostgreSQL timestamp with time zone and are surfaced as Date values. All
opaque identity identifiers are UUIDs. Business keys use text or bounded
varchar columns with explicit check constraints. Database-generated UUIDs use
gen_random_uuid(). The migration stream must not require citext or a
locale-sensitive collation.

Every external input is parsed by its owning strict Zod object before
repository use. Unknown keys are rejected. Drizzle describes storage; Zod
describes runtime boundaries in the owning DB, backend, or auth module.
Cross-row authorization rules remain backend capability policies, but the
database must provide the foreign keys and uniqueness needed for those
policies to fail closed.

## 3. Deterministic username contract

### 3.1 Version 1 algorithm

The exported constant COMPANY_USERNAME_NORMALIZATION_VERSION is 1. The
exported function normalizeCompanyUsernameV1 performs these steps in order:

1. Require a JavaScript string and reject NUL or ASCII control characters.
2. Apply String.prototype.normalize("NFKC").
3. Apply String.prototype.trim().
4. Apply locale-independent String.prototype.toLowerCase(); never use
   toLocaleLowerCase().
5. Require the result to match
   ^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$.
6. Return the result unchanged.

The result is therefore 1–64 ASCII characters, begins and ends with a letter
or digit, and may contain period, underscore, or hyphen internally. The
case-preserving account username stores the NFKC-and-trimmed value that
produced the normalized form; it is not used for equality.

The normalized_username column is globally unique without including the
normalization version. A future normalization version must preflight all
collisions and rewrite normalized_username plus normalization_version in one
reviewed migration. Storing the version is provenance, not a way to allow two
accounts with equivalent login names.

All create, login, lookup, migration, and idempotency paths call the same
version dispatcher. Codecamp migration reports collisions and fails closed; it
does not merge accounts by username, display name, or email.

### 3.2 Planned Zod exports

| Export | Owner | Contract |
|---|---|---|
| companyAccountIdSchema | DB | UUID string |
| companyUsernameInputSchema | DB normalization boundary | string accepted only if the Version 1 algorithm succeeds |
| normalizedCompanyUsernameSchema | DB | 1–64 lowercase ASCII string matching the Version 1 regex |
| companyUsernameNormalizationVersionSchema | DB | literal 1 |
| companyDisplayNameSchema | Backend capability | trimmed string, 1–200 characters, no NUL/control characters |
| companyAccountStatusSchema | DB and backend projection | enum ACTIVE, SUSPENDED |
| companyAccountSchema | Backend capability | strict public account projection; never includes a credential hash |
| createCompanyAccountInputSchema | Backend capability | strict username, displayName, initialPassword, idempotencyKey input |
| newCompanyPasswordSchema | Auth adapter | 12–1024 UTF-8 bytes, no NUL; never transformed or trimmed |
| passwordHashAlgorithmSchema | Auth adapter and DB stored row | enum ARGON2ID, BCRYPT |
| organizationStableKeySchema | DB | lowercase key matching ^[a-z0-9](?:[a-z0-9-]{0,62}[a-z0-9])?$ |
| applicationStableKeySchema | DB | lowercase key matching the same stable-key grammar |
| companyRoleKeySchema | DB and backend policy | enum EMPLOYEE, COMPANY_ADMIN |
| applicationRoleKeySchema | DB and backend policy | uppercase key matching ^[A-Z][A-Z0-9_]{0,63}$ |
| sha256HexSchema | DB | exactly 64 lowercase hexadecimal characters |
| auditOperationKeySchema | Backend capability and DB stored row | lowercase colon-separated key, maximum 128 characters |
| idempotencyKeyInputSchema | Backend capability | opaque 16–200 character caller value; only its HMAC is persisted |

Password byte length is measured with TextEncoder, not JavaScript code-unit
length. Raw passwords, session tokens, authorization codes, client secrets,
and idempotency keys are accepted only by input-boundary schemas and never
appear in stored-row or output schemas.

## 4. PostgreSQL enums

All enum values are uppercase stable wire values. Renaming a value is a data
migration, not a TypeScript-only refactor.

| PostgreSQL enum | Values |
|---|---|
| company_account_status | ACTIVE, SUSPENDED |
| company_password_algorithm | ARGON2ID, BCRYPT |
| company_organization_type | INTERNAL_COMPANY |
| company_organization_status | ACTIVE, SUSPENDED |
| company_membership_status | ACTIVE, SUSPENDED, ENDED |
| company_role_key | EMPLOYEE, COMPANY_ADMIN |
| company_application_status | ACTIVE, DISABLED |
| company_application_role_status | ACTIVE, RETIRED |
| company_session_revoke_reason | LOCAL_LOGOUT, GLOBAL_LOGOUT, ADMIN_REVOKE, ACCOUNT_SUSPENDED, CREDENTIAL_RESET, EXPIRED, SECURITY_EVENT |
| company_oidc_client_type | PUBLIC, CONFIDENTIAL |
| company_oidc_client_status | ACTIVE, DISABLED |
| company_oidc_token_auth_method | NONE, CLIENT_SECRET_BASIC |
| company_oidc_pkce_method | S256 |
| company_audit_actor_type | ACCOUNT, SERVICE, SYSTEM |
| company_audit_outcome | SUCCEEDED, DENIED, FAILED |
| company_login_outcome | SUCCEEDED, INVALID_CREDENTIALS, RATE_LIMITED, ACCOUNT_SUSPENDED, CLIENT_REJECTED |
| company_rate_limit_kind | USERNAME, IP |
| company_idempotency_state | IN_PROGRESS, SUCCEEDED, FAILED |

Application roles are deliberately data, not a PostgreSQL enum. This permits a
future employee-facing application to register role definitions without an
account-table or enum migration. Company roles remain a small fixed enum
because they grant authority over the identity system itself.

## 5. Drizzle table contracts

Every bounded database string has a named PostgreSQL check; Zod validation is
not its only defense. The implementation uses these shared rules:

- every `char(64)` SHA-256 or HMAC column has a table-specific
  `<table>_<column>_hex_check` requiring `^[0-9a-f]{64}$`;
- organization/application stable keys have table-specific
  `<table>_stable_key_format_check` constraints requiring the Section 3
  lowercase grammar;
- application role keys have table-specific `role_key_format_check`
  constraints requiring `^[A-Z][A-Z0-9_]{0,63}$`;
- usernames, display labels, descriptions, operation/scope keys, client IDs,
  service keys, reason codes, user-agent values, redirect URIs, nonces, and
  PKCE challenges have table-specific non-empty and maximum-length checks;
- Argon2id/bcrypt fields use named algorithm-prefix checks rather than the
  lowercase-hex rule.

The schema-metadata and PostgreSQL constraint suites enumerate every
applicable column and exact constraint name. Adding another bounded or hash
column without classifying it under one of these rules fails the coverage
table in those tests.

### 5.1 company_accounts

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Stable company subject identifier |
| username | varchar(64) | not null | NFKC-and-trimmed, case-preserving login spelling |
| normalized_username | varchar(64) | not null | Versioned comparison key |
| normalization_version | smallint | not null, default 1 | Algorithm provenance |
| display_name | varchar(200) | not null | Employee-facing name |
| status | company_account_status | not null, default ACTIVE | Global account access state |
| auth_version | bigint | not null, default 1 | Monotonic global session-revocation generation |
| status_changed_at | timestamptz | not null, default now() | Last status transition |
| created_at | timestamptz | not null, default now() | Creation time |
| updated_at | timestamptz | not null, default now() | Last mutation time |

Constraints and indexes:

- company_accounts_normalized_username_unique uniquely indexes
  normalized_username.
- company_accounts_normalization_version_check requires
  normalization_version = 1 until a reviewed version migration exists.
- company_accounts_normalized_username_format_check enforces the Version 1
  regex.
- company_accounts_username_length_check and
  company_accounts_display_name_length_check reject empty or oversized values.
- company_accounts_auth_version_check requires auth_version >= 1.
- company_accounts_status_idx indexes status and id for administration scans.

Accounts are soft-disabled through status. Normal service capabilities do not
hard-delete them. A status change or credential reset increments auth_version
inside the same transaction, causing older SSO and application-session
snapshots to fail authorization.

### 5.2 company_password_credentials

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| account_id | uuid | primary key, FK company_accounts.id ON DELETE RESTRICT | One first-party password credential per account |
| password_hash | text | not null | Self-describing Argon2id or compatible migrated bcrypt hash |
| algorithm | company_password_algorithm | not null | Explicit verification dispatcher |
| credential_version | bigint | not null, default 1 | Monotonic reset/rehash generation |
| legacy_imported_at | timestamptz | nullable | Provenance for a migrated bcrypt hash |
| last_verified_at | timestamptz | nullable | Last successful verification |
| created_at | timestamptz | not null, default now() | Initial credential creation |
| updated_at | timestamptz | not null, default now() | Reset or rehash time |

Constraints:

- company_password_credentials_version_check requires
  credential_version >= 1.
- company_password_credentials_hash_prefix_check requires ARGON2ID rows to
  begin with $argon2id$ and BCRYPT rows to begin with $2a$, $2b$, or $2y$.
- BCRYPT is migration-only. New credential creation always writes ARGON2ID.
- Successful bcrypt verification replaces the hash and algorithm with
  ARGON2ID, increments credential_version, and increments the owning account's
  auth_version in one transaction.

No stored-row schema, audit projector, log field, error detail, or return
schema exposes password_hash.

### 5.3 company_organizations

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key | Stable organization identifier supplied by bootstrap |
| stable_key | varchar(64) | not null | Durable operator-visible key |
| display_name | varchar(200) | not null | Company name |
| organization_type | company_organization_type | not null, default INTERNAL_COMPANY | Explicitly not a school/customer |
| status | company_organization_status | not null, default ACTIVE | Organization access state |
| created_at | timestamptz | not null, default now() | Creation time |
| updated_at | timestamptz | not null, default now() | Last mutation time |

company_organizations_stable_key_unique uniquely indexes stable_key.
company_organizations_stable_key_format_check enforces the stable-key grammar,
and company_organizations_display_name_length_check requires 1–200 characters.
The first release policy permits only the bootstrapped INTERNAL_COMPANY
organization, but the table uses stable IDs and memberships so future company
behavior does not require account-table changes. This is not customer/B2B
onboarding.

### 5.4 company_organization_memberships

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Stable membership identifier |
| organization_id | uuid | not null, FK company_organizations.id ON DELETE RESTRICT | Owning internal company |
| account_id | uuid | not null, FK company_accounts.id ON DELETE RESTRICT | Employee account |
| status | company_membership_status | not null, default ACTIVE | Membership authority state |
| joined_at | timestamptz | not null, default now() | Initial membership time |
| status_changed_at | timestamptz | not null, default now() | Last transition |
| ended_at | timestamptz | nullable | Terminal membership time |
| created_at | timestamptz | not null, default now() | Row creation time |
| updated_at | timestamptz | not null, default now() | Last mutation time |

Constraints and indexes:

- company_memberships_organization_account_unique uniquely indexes
  organization_id and account_id.
- company_memberships_organization_id_id_unique provides the composite parent
  key used by role and session foreign keys.
- company_memberships_ended_state_check requires ended_at only for ENDED and
  requires it for ENDED.
- company_memberships_account_status_idx indexes account_id, status.
- company_memberships_organization_status_idx indexes organization_id, status.

Only ACTIVE membership grants authority. SUSPENDED and ENDED memberships may
retain historical role rows, but those rows are non-authoritative because
every authorization query joins and filters membership status. Memberships
are not school tenancy and never contain schoolId.

### 5.5 company_role_assignments

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| organization_id | uuid | not null | Composite membership scope |
| membership_id | uuid | not null | Employee membership |
| role_key | company_role_key | not null | Additive company authority |
| assigned_by_account_id | uuid | nullable, FK company_accounts.id ON DELETE RESTRICT | Null only for bootstrap/system |
| assigned_at | timestamptz | not null, default now() | Assignment time |

The primary key is membership_id plus role_key. A composite foreign key
(organization_id, membership_id) references the membership composite key with
ON DELETE RESTRICT. EMPLOYEE and COMPANY_ADMIN are independent rows; there is
no singular role column and no numeric hierarchy. The backend last-active-
COMPANY_ADMIN invariant uses a serialized transaction/advisory lock in S3; it
cannot be represented safely as a row check.

### 5.6 company_applications

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key | Stable ID supplied by bootstrap/registration |
| stable_key | varchar(64) | not null | marketing, sales, codecamp, or future employee app |
| display_name | varchar(200) | not null | Operator-facing name |
| status | company_application_status | not null, default ACTIVE | Global registration state |
| created_at | timestamptz | not null, default now() | Registration time |
| updated_at | timestamptz | not null, default now() | Last mutation time |

company_applications_stable_key_unique uniquely indexes stable_key.
company_applications_stable_key_format_check enforces the stable-key grammar,
and company_applications_display_name_length_check requires 1–200 characters.
Disabling an application fails closed for all its OIDC clients and assignments
without deleting historical grants or audit evidence.

### 5.7 company_application_role_definitions

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| application_id | uuid | not null, FK company_applications.id ON DELETE RESTRICT | Owning role namespace |
| role_key | varchar(64) | not null | Named app-local role |
| display_name | varchar(200) | not null | Administration label |
| description | text | not null | Effective-access summary |
| status | company_application_role_status | not null, default ACTIVE | Assignability state |
| created_at | timestamptz | not null, default now() | Definition time |
| updated_at | timestamptz | not null, default now() | Last definition change |

The primary key is application_id plus role_key. A check enforces the
applicationRoleKeySchema grammar through
company_application_role_definitions_role_key_format_check. The named
display-name and description length checks require 1–200 and 1–2000
characters respectively. Retired definitions remain referentially valid but
cannot be newly assigned.

Initial role data is:

- marketing: MEMBER and ADMIN;
- sales: SALES_REP and SALES_ADMIN;
- codecamp: definitions emitted only from the reviewed S6 role-mapping
  manifest, preserving existing effective access rather than guessing an
  education hierarchy during S1.

### 5.8 company_application_role_assignments

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Stable grant ID |
| organization_id | uuid | not null | Composite membership scope |
| membership_id | uuid | not null | Active membership required for authority |
| application_id | uuid | not null | Application namespace |
| role_key | varchar(64) | not null | Role definition |
| assigned_by_account_id | uuid | nullable, FK company_accounts.id ON DELETE RESTRICT | Null only for bootstrap/migration system |
| assigned_at | timestamptz | not null, default now() | Grant time |
| expires_at | timestamptz | nullable | Optional exclusive authority deadline |

Constraints and indexes:

- A composite FK (organization_id, membership_id) references
  company_organization_memberships with ON DELETE RESTRICT.
- A composite FK (application_id, role_key) references
  company_application_role_definitions with ON DELETE RESTRICT.
- company_app_role_assignments_role_key_format_check enforces the exact role
  key grammar on the duplicated FK component.
- company_app_role_assignments_membership_app_role_unique uniquely indexes
  membership_id, application_id, and role_key.
- company_app_role_assignments_expiry_check requires expires_at > assigned_at
  when present.
- company_app_role_assignments_app_membership_idx indexes application_id and
  membership_id.
- company_app_role_assignments_expiry_idx indexes expires_at for cleanup and
  diagnostics.

A grant authorizes only when the account, organization, membership,
application, and role definition are ACTIVE and expires_at is null or greater
than the authorization transaction's current time. COMPANY_ADMIN never
substitutes for an application assignment. SALES_ADMIN is data under the sales
application and never grants company identity authority.

### 5.9 company_sso_sessions

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Non-secret SSO session identifier |
| token_hash | char(64) | not null | SHA-256 of a 32-byte random bearer token |
| organization_id | uuid | not null | Trusted membership scope |
| membership_id | uuid | not null | Employee membership |
| account_auth_version | bigint | not null | Snapshot of company_accounts.auth_version |
| created_at | timestamptz | not null, default now() | Authentication time |
| last_seen_at | timestamptz | not null, default now() | Bounded activity update |
| idle_expires_at | timestamptz | not null | Exclusive idle deadline |
| absolute_expires_at | timestamptz | not null | Exclusive maximum deadline |
| revoked_at | timestamptz | nullable | Revocation time |
| revoke_reason | company_session_revoke_reason | nullable | Required when revoked |
| ip_hash | char(64) | nullable | Keyed hash, never raw IP |
| user_agent | varchar(512) | nullable | Bounded diagnostics |

Constraints and indexes:

- company_sso_sessions_token_hash_unique uniquely indexes token_hash.
- company_sso_sessions_token_hash_hex_check and
  company_sso_sessions_ip_hash_hex_check enforce lowercase 64-character hex
  when their columns are present.
- A composite FK (organization_id, membership_id) references active-capable
  membership data with ON DELETE RESTRICT.
- company_sso_sessions_expiry_order_check requires created_at <
  idle_expires_at and idle_expires_at <= absolute_expires_at.
- company_sso_sessions_revocation_check requires revoked_at and revoke_reason
  to be both null or both non-null.
- company_sso_sessions_membership_identity_unique adds the composite unique
  key id, organization_id, membership_id for child-session integrity.
- Indexes cover membership_id plus revoked_at, absolute_expires_at, and
  idle_expires_at.

Validation requires an ACTIVE account/organization/membership, matching
account_auth_version, no revocation, and now earlier than both expiry columns.
Expired rows may be deleted by bounded cleanup. Raw tokens are returned once
to cookie wiring and never persisted.

### 5.10 company_application_sessions

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | App-local session identifier |
| token_hash | char(64) | not null | Hash of app-local bearer token |
| sso_session_id | uuid | not null | Parent Accounts SSO session |
| organization_id | uuid | not null | Parent membership scope |
| membership_id | uuid | not null | Employee membership |
| application_id | uuid | not null, FK company_applications.id ON DELETE RESTRICT | Audience/application |
| account_auth_version | bigint | not null | Revocation-generation snapshot |
| created_at | timestamptz | not null, default now() | Issue time |
| last_checked_at | timestamptz | not null, default now() | Last Accounts authorization check |
| expires_at | timestamptz | not null | Exclusive app-session deadline |
| revoked_at | timestamptz | nullable | Local/global revocation time |
| revoke_reason | company_session_revoke_reason | nullable | Reason when revoked |

Constraints and indexes:

- company_application_sessions_token_hash_unique uniquely indexes token_hash.
- company_application_sessions_token_hash_hex_check enforces lowercase
  64-character hex.
- A composite FK (sso_session_id, organization_id, membership_id) references
  the parent SSO composite key with ON DELETE CASCADE.
- company_application_sessions_scope_unique uniquely indexes id,
  application_id, and membership_id for registered-session introspection.
- company_application_sessions_expiry_check requires expires_at > created_at.
- The same paired revocation check used by SSO sessions applies.
- Indexes cover application_id plus membership_id plus revoked_at,
  sso_session_id, and expires_at.

The auth-owned `COMPANY_AUTH_APP_SESSION_TTL_SECONDS` is an integer from 300 to
86400. Issuance reads the parent SSO row in the same transaction and sets
`expires_at` to the earlier of `created_at + configured TTL` and the parent's
`absolute_expires_at`; it refuses an already expired or revoked parent.

Every protected validation/introspection joins the live account,
organization, membership, registered application, parent SSO session,
application role definition, and unexpired application-role assignment. It
requires all relevant statuses ACTIVE, matching account auth version, a live
parent, and at least one live role for the registered application audience.
Removing the last app role therefore denies the next check without waiting for
the local row to expire. Local logout revokes only this row. Global logout,
suspension, credential reset, or admin revocation revokes the parent and child
sessions in one transaction or causes them to fail immediately through the
live joins and auth_version.

### 5.11 company_oidc_clients

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Internal client registration ID |
| application_id | uuid | not null, FK company_applications.id ON DELETE RESTRICT | Exact app audience |
| client_id | varchar(128) | not null | Public OIDC identifier |
| client_type | company_oidc_client_type | not null | PUBLIC or CONFIDENTIAL |
| token_auth_method | company_oidc_token_auth_method | not null | NONE or CLIENT_SECRET_BASIC |
| client_secret_hash | text | nullable | Argon2id hash; plaintext exists only in client secret storage |
| secret_version | bigint | not null, default 1 | Rotation generation |
| pkce_required | boolean | not null, default true | Must remain true for all clients |
| status | company_oidc_client_status | not null, default ACTIVE | Registration state |
| created_at | timestamptz | not null, default now() | Registration time |
| updated_at | timestamptz | not null, default now() | Rotation/configuration time |

Constraints:

- company_oidc_clients_client_id_unique uniquely indexes client_id.
- company_oidc_clients_application_client_unique uniquely indexes
  application_id and client_id.
- company_oidc_clients_client_id_length_check requires 1–128 characters.
- company_oidc_clients_auth_method_check requires PUBLIC clients to use NONE
  with a null secret and CONFIDENTIAL clients to use CLIENT_SECRET_BASIC with
  an Argon2id secret hash.
- company_oidc_clients_pkce_required_check requires pkce_required = true.
- company_oidc_clients_secret_version_check requires secret_version >= 1.

No wildcard client registration exists. Client secret rotation updates the
hash/version and emits an audit event; raw secrets are shown once and are
never audited.

### 5.12 company_oidc_redirect_uris

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Exact callback record |
| oidc_client_id | uuid | not null, FK company_oidc_clients.id ON DELETE CASCADE | Registered client |
| redirect_uri | varchar(2048) | not null | Exact absolute callback URI |
| created_at | timestamptz | not null, default now() | Registration time |

company_oidc_redirect_uris_client_uri_unique uniquely indexes oidc_client_id
and redirect_uri. company_oidc_redirect_uris_id_client_unique uniquely indexes
id and oidc_client_id so authorization codes can use a concrete composite FK.
company_oidc_redirect_uris_length_check requires 1–2048 characters. Runtime
equality is byte-for-byte after parsing the request as a valid absolute URL;
the server does not lowercase, decode, trim, remove a trailing slash, or follow
redirects before comparison.

The Zod redirect URI schema rejects credentials, fragments, wildcards, and
non-HTTP(S) schemes. Production registrations require HTTPS. Development/test
may use HTTP only for loopback hostnames 127.0.0.1, ::1, or localhost with an
explicit port.

### 5.13 company_oidc_authorization_codes

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Internal code record |
| code_hash | char(64) | not null | SHA-256 of a 32-byte random code |
| oidc_client_id | uuid | not null, FK company_oidc_clients.id ON DELETE RESTRICT | Redeeming client |
| redirect_uri_id | uuid | not null, FK company_oidc_redirect_uris.id ON DELETE RESTRICT | Exact callback used at authorization |
| sso_session_id | uuid | not null, FK company_sso_sessions.id ON DELETE CASCADE | Authenticated session |
| code_challenge | varchar(128) | not null | Base64url SHA-256 PKCE challenge |
| code_challenge_method | company_oidc_pkce_method | not null, default S256 | Plain PKCE is impossible |
| nonce | varchar(255) | not null | Exact OIDC nonce returned only in the signed identity response |
| scope | text[] | not null, default {openid} | Reviewed scopes |
| issued_at | timestamptz | not null, default now() | Issue time |
| expires_at | timestamptz | not null | Exclusive deadline, at most five minutes |
| consumed_at | timestamptz | nullable | Successful one-time exchange |
| revoked_at | timestamptz | nullable | Administrative/session revocation |

Constraints and indexes:

- company_oidc_authorization_codes_code_hash_unique uniquely indexes code_hash.
- company_oidc_authorization_codes_code_hash_hex_check requires lowercase
  64-character hex.
- company_oidc_codes_expiry_check requires issued_at < expires_at and
  expires_at <= issued_at + interval '5 minutes'.
- company_oidc_codes_terminal_state_check prevents both consumed_at and
  revoked_at being set.
- company_oidc_codes_consumed_time_check requires consumed_at >= issued_at and
  consumed_at < expires_at when present.
- company_oidc_codes_pkce_challenge_format_check requires exactly 43 unpadded
  base64url characters matching `^[A-Za-z0-9_-]{43}$`.
- company_oidc_codes_nonce_length_check requires 1–255 characters.
- company_oidc_codes_client_expiry_idx indexes oidc_client_id and expires_at.
- company_oidc_codes_session_idx indexes sso_session_id.
- A composite foreign key (redirect_uri_id, oidc_client_id) references
  company_oidc_redirect_uris (id, oidc_client_id) with ON DELETE RESTRICT;
  repository code cannot substitute a callback registered to another client.

Redemption performs one atomic update from unconsumed/unrevoked/unexpired to
consumed_at = transaction_timestamp() while matching code hash, client,
redirect URI, and S256 verifier. Zero updated rows is the same safe invalid-code
result for unknown, expired, replayed, revoked, or cross-client input. Raw
authorization codes are never stored.

### 5.14 company_identity_audit_events

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Immutable event ID |
| occurred_at | timestamptz | not null, default now() | Database event time |
| correlation_id | uuid | not null | Request/job/migration correlation |
| actor_type | company_audit_actor_type | not null | ACCOUNT, SERVICE, or SYSTEM |
| actor_account_id | uuid | nullable, FK company_accounts.id ON DELETE RESTRICT | Required only for ACCOUNT |
| actor_service_key | varchar(128) | nullable | Registered non-secret service key |
| organization_id | uuid | nullable, FK company_organizations.id ON DELETE RESTRICT | Company scope when applicable |
| application_id | uuid | nullable, FK company_applications.id ON DELETE RESTRICT | App scope when applicable |
| target_account_id | uuid | nullable, FK company_accounts.id ON DELETE RESTRICT | Identity target |
| operation | varchar(128) | not null | Stable named operation |
| outcome | company_audit_outcome | not null | SUCCEEDED, DENIED, or FAILED |
| reason_code | varchar(128) | nullable | Safe structured result |
| ip_hash | char(64) | nullable | Keyed hash, never raw IP |
| user_agent_family | varchar(128) | nullable | Reduced safe diagnostic |
| metadata | jsonb | not null, default {} | Strict allowlisted safe fields |

Actor checks require exactly actor_account_id for ACCOUNT, exactly
actor_service_key for SERVICE, and neither for SYSTEM. The operation key uses
auditOperationKeySchema. Metadata must be a JSON object whose keys are a subset
of this global database allowlist:

- source;
- previousStatus;
- newStatus;
- roleKey;
- clientId;
- credentialAlgorithm;
- sessionCount;
- normalizationVersion;
- migrationRunId;
- sourcePrincipalId;
- sourceFingerprint;
- idempotencyReplay;
- expiresAt;
- reasonCategory.

The matching auditMetadataSchema is z.object(...).strict(); values are bounded
strings, booleans, safe integers, UUIDs, or ISO timestamps. It does not accept
arbitrary nested objects. Event-specific Zod projectors select a smaller subset
from this global list. Passwords, hashes, raw/encoded tokens, authorization
codes, PKCE verifiers/challenges, nonces, client secrets, cookie values,
connection strings, idempotency keys, emails, and raw IP addresses have no
allowlisted field and are rejected rather than redacted.

The migration adds a JSON-object/allowed-key check and an immutable trigger
that rejects UPDATE, DELETE, and TRUNCATE. It also revokes those privileges
from the runtime role. Any future retention path must be a separately reviewed
privileged procedure; ordinary direct connections do not bypass immutability.
company_identity_audit_events_ip_hash_hex_check enforces lowercase
64-character hex when ip_hash is present; named operation, service-key,
reason-code, and user-agent-family checks enforce the Section 5 bounds.
Indexes cover occurred_at, actor_account_id plus occurred_at, operation plus
occurred_at, target_account_id plus occurred_at, and correlation_id.

### 5.15 company_login_attempts

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Immutable attempt ID |
| occurred_at | timestamptz | not null, default now() | Attempt time |
| correlation_id | uuid | not null | Request correlation |
| normalized_username_hash | char(64) | not null | Keyed hash of normalized username |
| ip_hash | char(64) | not null | Keyed hash of canonicalized source IP |
| oidc_client_id | uuid | nullable, FK company_oidc_clients.id ON DELETE RESTRICT | Originating client when known |
| outcome | company_login_outcome | not null | Non-enumerating result category |
| account_id | uuid | nullable, FK company_accounts.id ON DELETE RESTRICT | Populated only after safe resolution |
| latency_ms | integer | not null | Bounded operation latency |

company_login_attempts_latency_check requires latency_ms >= 0.
company_login_attempts_username_hash_hex_check and
company_login_attempts_ip_hash_hex_check enforce lowercase 64-character hex.
Indexes cover occurred_at, normalized_username_hash plus occurred_at, ip_hash
plus occurred_at, and outcome plus occurred_at. The runtime role may insert
but not update rows. External responses do not reveal whether account_id was
resolved.

### 5.16 company_login_rate_limit_buckets

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Bucket ID |
| kind | company_rate_limit_kind | not null | Independent USERNAME or IP bucket |
| identifier_hash | char(64) | not null | Keyed hash only |
| failed_count | integer | not null, default 0 | Failures in current window |
| window_started_at | timestamptz | not null, default now() | Window origin |
| last_attempt_at | timestamptz | not null, default now() | Latest update |
| blocked_until | timestamptz | nullable | Exclusive denial deadline |
| challenge_required_at | timestamptz | nullable | Optional escalation time |
| updated_at | timestamptz | not null, default now() | Mutation time |

company_rate_limit_buckets_kind_identifier_unique uniquely indexes kind and
identifier_hash. company_rate_limit_buckets_identifier_hash_hex_check enforces
lowercase 64-character hex. Checks require failed_count >= 0,
last_attempt_at >= window_started_at, blocked_until > window_started_at when
present, and challenge_required_at >= window_started_at when present. Failure
increments are a single INSERT ... ON CONFLICT DO UPDATE statement. Username
and IP buckets are always checked independently; a shared IP does not mutate
another username bucket. Expired buckets may be deleted by bounded cleanup.

### 5.17 company_identity_idempotency_records

| Column | PostgreSQL type | Null/default | Meaning |
|---|---|---|---|
| id | uuid | primary key, default gen_random_uuid() | Record ID |
| operation | varchar(128) | not null | Capability or migration operation |
| scope_key | varchar(200) | not null | Trusted global, organization, or account scope |
| idempotency_key_hash | char(64) | not null | HMAC-SHA-256 of caller key |
| request_hash | char(64) | not null | Domain-separated HMAC of versioned canonical validated input |
| state | company_idempotency_state | not null, default IN_PROGRESS | Ownership/terminal state |
| owner_token_hash | char(64) | nullable | Current bounded lease owner |
| safe_result | jsonb | nullable | Operation-specific secret-free replay result |
| safe_error_code | varchar(128) | nullable | Declared deterministic failure |
| created_at | timestamptz | not null, default now() | Acquisition time |
| lease_expires_at | timestamptz | nullable | IN_PROGRESS recovery deadline |
| completed_at | timestamptz | nullable | Terminal time |
| expires_at | timestamptz | not null | Retention deadline |

Constraints and indexes:

- company_identity_idempotency_operation_scope_key_unique uniquely indexes
  operation, scope_key, and idempotency_key_hash.
- company_identity_idempotency_key_hash_hex_check,
  company_identity_idempotency_request_hash_hex_check, and
  company_identity_idempotency_owner_hash_hex_check enforce lowercase
  64-character hex when present.
- scope_key matches global or the trusted formats organization:<uuid> and
  account:<uuid>; it is constructed after auth, never copied from frontend
  authority.
- IN_PROGRESS requires owner_token_hash and lease_expires_at and forbids
  completed_at, safe_result, and safe_error_code.
- SUCCEEDED requires completed_at and safe_result, and clears lease ownership.
- FAILED requires completed_at and safe_error_code, and clears lease ownership.
- completed_at, when present, is not earlier than created_at; expires_at is
  later than created_at.
- Reuse with a different request_hash is a deterministic conflict and never
  replays another request's result.
- safe_result is parsed by the operation's strict output schema before storage
  and must not contain initial passwords, raw tokens/codes, client secrets, or
  connection material.

An expiry index supports cleanup. Raw idempotency keys and owner tokens are
never persisted.

The backend-owned idempotency component uses one required 32-byte-or-longer
`COMPANY_AUTH_IDEMPOTENCY_HASH_KEY` and HKDF-SHA-256 with salt
`company-identity-idempotency-v1` to derive distinct subkeys whose `info`
labels are `caller-key`, `secret-field`, `request`, and `lease-owner`.

For an operation, it computes hashes exactly as follows:

1. Parse the strict operation input and exclude the raw idempotency key plus
   non-semantic correlation, retry, and observation fields.
2. Replace each declared secret field, including `initialPassword`, with
   `HMAC-SHA-256(secret-field-subkey, UTF8(raw secret))` before any
   serialization. An unclassified secret-capable field is a contract error.
3. Canonicalize the projected value with the Version 1 serializer: object keys
   sorted by Unicode code point; arrays retain order; strings retain their
   validated value; dates are UTC ISO-8601 strings; integers use canonical
   base-10 form; only null, boolean, string, integer, array, and object values
   are allowed. Undefined, floats, NaN, infinity, binary values, and custom
   object prototypes are rejected.
4. Compute `idempotency_key_hash` as HMAC-SHA-256 of
   `identity-idempotency-key:v1\0<operation>\0<scope>\0<raw caller key>` with
   the caller-key subkey.
5. Compute `request_hash` as HMAC-SHA-256 of
   `identity-idempotency-request:v1\0<operation>\0<scope>\0<canonical JSON>`
   with the request subkey. Compute owner-token hashes with the lease-owner
   subkey and its corresponding `identity-idempotency-owner:v1` prefix.

All HMACs are stored as lowercase hex. The raw secret, raw canonical input,
raw caller key, derived subkeys, and raw owner token are never persisted,
logged, audited, included in errors, or returned. Red tests use fixed vectors
to prove determinism, domain separation, input-order independence, semantic
change detection, and password/idempotency-key non-recoverability from stored
rows.

## 6. Relationship and deletion rules

The reviewed relationship graph is:

company_accounts → company_organization_memberships → company/company-app
role assignments → sessions/codes, with applications → role definitions,
OIDC clients, redirects, and application sessions.

Deletion policy is deliberately conservative:

- Accounts, organizations, applications, memberships, role definitions, and
  audit-referenced rows use ON DELETE RESTRICT and are disabled or ended.
- OIDC redirect URIs may cascade only when a never-audited test client is
  physically removed; production client administration disables records.
- Authorization codes and application sessions may cascade from their parent
  SSO session during bounded expiry cleanup, after required audit evidence is
  written.
- Audit events and login-attempt evidence never cascade.
- There are no cross-database foreign keys to Marketing, Sales, Codecamp, or
  education principals.

Expiration is always exclusive: a row is authoritative only while now is
strictly earlier than expires_at. The database uses transaction_timestamp()
inside one transaction so a capability does not change its answer midway
through evaluation. Cleanup is an optimization; expired rows fail closed even
before deletion.

## 7. Bootstrap contract

Bootstrap uses UUIDv5 with the standard URL namespace
6ba7b811-9dad-11d1-80b4-00c04fd430c8 and these exact names:

- https://reading-advantage.com/company-identity/organization/internal-company
- https://reading-advantage.com/company-identity/application/marketing
- https://reading-advantage.com/company-identity/application/sales
- https://reading-advantage.com/company-identity/application/codecamp

The authoritative stable keys are internal-company, marketing, sales, and
codecamp. Bootstrap supplies the deterministic IDs rather than relying on UUID
defaults. It upserts only when both ID and stable key identify the same row;
an ID/key mismatch is a hard error, not an overwrite.

Bootstrap also upserts Marketing MEMBER/ADMIN and Sales
SALES_REP/SALES_ADMIN role definitions. It does not invent Codecamp role
mappings before the reviewed S6 mapping manifest. Repeated bootstrap runs
produce no duplicates, do not reset statuses or descriptions changed by an
administrator, and write at most one idempotency/audit record per bootstrap
version.

The initial owner is created by the later explicit bootstrap-owner capability,
not by this static data bootstrap and never by public signup. EMPLOYEE,
COMPANY_ADMIN, and any application administrator roles are assigned as
independent rows.

## 8. Environment contracts

Each schema is exported separately so a runtime process receives only the
configuration it needs. No schema falls back to DATABASE_URL,
DIRECT_DATABASE_URL, or another product variable. Empty strings are invalid,
and parsing returns a deeply immutable value. Secrets never use NEXT_PUBLIC_
names and are omitted from formatted validation errors.

### 8.1 companyIdentityRuntimeEnvSchema

Owner: packages/db company-identity connection module.

| Variable | Contract |
|---|---|
| COMPANY_AUTH_DATABASE_URL | Required postgresql URL whose database pathname is exactly /company_identity; intended for pooled runtime use |
| COMPANY_AUTH_DATABASE_POOL_MAX | Optional coerced positive integer 1–20, default 3 |
| NODE_ENV | development, test, or production; default development |

The runtime client uses prepare: false for transaction-mode PgBouncer and does
not expose migration, CREATE DATABASE, DDL, audit mutation, or role-management
privileges.

### 8.2 companyIdentityDirectEnvSchema

Owner: packages/db company-identity migration/doctor module.

| Variable | Contract |
|---|---|
| COMPANY_AUTH_DIRECT_DATABASE_URL | Required postgresql URL whose database pathname is exactly /company_identity |

This parser has no fallback to COMPANY_AUTH_DATABASE_URL. Migration, ledger
doctor, bootstrap, and privileged maintenance entrypoints import this schema;
Accounts request paths do not.

### 8.3 companyIdentityTestEnvSchema

Owner: packages/db company-identity test harness.

| Variable | Contract |
|---|---|
| COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL | Required postgresql URL with loopback hostname and database pathname exactly /postgres |

The parser accepts only localhost, 127.0.0.1, or ::1 and rejects Unix sockets,
remote hosts, query-selected databases, and the product database names. The
harness creates a unique database named
company_identity_test_<pid>_<lowercase-hex-nonce>, validates that prefix before
CREATE/DROP, terminates connections, drops it in finally, and treats missing
configuration as a failed gate rather than a skipped success.

### 8.4 companyIdentitySecurityEnvSchema

Owner: packages/auth company-identity adapter.

| Variable | Contract |
|---|---|
| COMPANY_AUTH_IDENTIFIER_HASH_KEY | Required base64url secret decoding to at least 32 bytes; keyed-hashes normalized usernames and canonicalized IPs |

This value is never available through a DB package export or browser bundle.
The auth adapter accepts the parsed secret only at composition time and emits
secret-free validation errors.

### 8.5 companyIdentityIdempotencyEnvSchema

Owner: packages/backend company-identity module after the accepted scaffold.

| Variable | Contract |
|---|---|
| COMPANY_AUTH_IDEMPOTENCY_HASH_KEY | Required base64url secret decoding to at least 32 bytes; source for the Section 5.17 HKDF subkeys |

This secret is distinct from the identifier hash key and every OIDC client or
signing secret. It is unavailable to packages/db and browser code.

### 8.6 companyIdentityIssuerEnvSchema

Owner: packages/auth company-identity issuer adapter.

| Variable | Contract |
|---|---|
| COMPANY_AUTH_ISSUER_URL | Required absolute issuer URL, no credentials/query/fragment/trailing slash |
| COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY | Required PEM-encoded asymmetric private key |
| COMPANY_AUTH_OIDC_SIGNING_KEY_ID | Required stable 1–128 character non-secret key identifier |
| COMPANY_AUTH_AUTHORIZATION_CODE_TTL_SECONDS | Coerced integer 60–300, default 300 |
| COMPANY_AUTH_SSO_IDLE_TTL_SECONDS | Coerced integer 300–86400 |
| COMPANY_AUTH_SSO_ABSOLUTE_TTL_SECONDS | Coerced integer greater than idle TTL and at most 2592000 |
| COMPANY_AUTH_APP_SESSION_TTL_SECONDS | Coerced integer 300–86400 and not greater than the SSO absolute TTL |
| COMPANY_AUTH_CLOCK_SKEW_SECONDS | Coerced integer 0–120, default 30 |

Production issuer URLs require HTTPS. Development/test may use HTTP only on a
loopback hostname with an explicit port. The public key/JWKS is derived from
the private key; the private key is never stored in PostgreSQL. Key rotation
adds a new key ID and overlap window before retiring the previous public key.

### 8.7 companyIdentityCookieEnvSchema

Owner: packages/auth company-identity cookie adapter.

| Variable | Contract |
|---|---|
| COMPANY_AUTH_COOKIE_NAME | Defaults to __Host-ra_company_sso in production; bounded token name |
| COMPANY_AUTH_COOKIE_SECURE | Boolean; required true in production |
| COMPANY_AUTH_COOKIE_SAME_SITE | Literal lax for the OIDC redirect flow |
| COMPANY_AUTH_COOKIE_DOMAIN | Must be absent for a __Host- cookie |
| COMPANY_AUTH_COOKIE_PATH | Literal / |

Production validation requires the __Host- prefix, Secure=true, Path=/, and no
Domain. Development/test may use ra_company_sso with Secure=false only when
the issuer is loopback HTTP. Cookies are always HttpOnly in code and that
setting is not configurable.

### 8.8 companyIdentityServiceAuthEnvSchema

Owner: packages/auth company SSO client adapter.

This schema is used by each participating product service, not by browser
code:

| Variable | Contract |
|---|---|
| COMPANY_AUTH_ISSUER_URL | Same exact issuer validation as above |
| COMPANY_AUTH_OIDC_CLIENT_ID | Required 1–128 character registered client ID |
| COMPANY_AUTH_OIDC_CLIENT_SECRET | Required secret of at least 32 bytes for CONFIDENTIAL clients; never allowed in public bundles |
| COMPANY_AUTH_OIDC_REDIRECT_URI | Required exact absolute URI matching one registered row |
| COMPANY_AUTH_EXPECTED_AUDIENCE | Required application stable key matching the client registration |

PUBLIC clients omit the secret through a separate
companyIdentityPublicClientEnvSchema rather than making a confidential secret
optional. Initial server-rendered Marketing, Sales, and Codecamp clients use
the confidential schema plus PKCE. Product applications receive no database
URL or issuer signing key.

Every exported parser factory accepts an explicit Record<string, string |
undefined> argument for tests and returns the inferred readonly config. Only a
thin process-composition module calls it with process.env.

## 9. Planned export and JSDoc inventory

Every exported Drizzle enum, table, relation, Zod schema, inferred type,
constant, and factory receives a one-sentence JSDoc description. Every
exported function also documents every parameter, its return value, and all
intentional error conditions without repeating TypeScript types.

At minimum, packages/db exports only:

- COMPANY_USERNAME_NORMALIZATION_VERSION;
- normalizeCompanyUsernameV1 and normalizeCompanyUsername;
- the DB-owned Zod schemas named in Section 3 plus their z.infer types;
- all PostgreSQL enums in Section 4;
- all seventeen Drizzle tables in Section 5 and their relations;
- createCompanyIdentityRuntimeConfig;
- createCompanyIdentityDirectConfig;
- createCompanyIdentityTestConfig.

After their dependency gates open, packages/auth exports only the auth-owned
password/OIDC schemas and createCompanyIdentitySecurityConfig,
createCompanyIdentityIssuerConfig, createCompanyIdentityCookieConfig,
createCompanyIdentityServiceAuthConfig, and
createCompanyIdentityPublicClientConfig. Packages/backend exports the
capability schemas, audit projectors, idempotency vectors, and
createCompanyIdentityIdempotencyConfig. Neither owner re-exports the dedicated
DB client or Drizzle schema through its public application-facing surface.

Factory JSDoc includes @param for the raw environment mapping, @returns for the
validated immutable configuration, and @throws for invalid or unsafe
configuration. Normalization JSDoc includes @param, @returns, and @throws for
unsupported characters or length. Stored-row types are inferred from Drizzle;
external contracts are inferred from Zod rather than duplicated as handwritten
interfaces.

## 10. Acceptance oracle for Tasks 3–5

Red and PostgreSQL tests must prove:

1. Version 1 normalization is deterministic across create/login/migration,
   rejects locale-dependent or invalid forms, and produces database-enforced
   collision failures.
2. Accounts have one password credential, stable organization membership, and
   additive company roles.
3. App grants are namespace-specific, membership-anchored, unique, expiring,
   and non-authoritative after any relevant status becomes inactive.
4. COMPANY_ADMIN and SALES_ADMIN are unrelated assignments and no numeric role
   comparison exists in company authorization.
5. Raw credentials, session tokens, codes, client secrets, IPs, and
   idempotency keys never appear in stored rows, audit metadata, errors, or
   logs.
6. Sessions and codes enforce ordering, expiry, revocation, auth-version, exact
   client/redirect matching, S256, and one-time consumption.
7. Audit events are insert-only and their JSON keys are allowlisted at both
   Zod and PostgreSQL boundaries.
8. Runtime, direct, test, security, idempotency, issuer, cookie, and
   service-client environment parsers fail closed, remain in their owning
   packages, and do not fall back to product variables.
9. Deterministic bootstrap is idempotent and preserves stable IDs/keys.
10. The independent migration creates only the identity allowlist and never
    modifies product journals, product schemas, or the education TenantDB
    registry.

## 11. Explicit exclusions and expansion seam

This contract defines employee identity for one internal company. It does not
define school membership, education roles, licenses, customer organizations,
seat allocation, billing, public signup, customer onboarding, multi-company
administration, or product data.

A future employee-facing company or B2B application can add one
company_applications row, role-definition rows, an exact OIDC client, and
membership-anchored assignments. It does not add a role column to
company_accounts. Supporting customer principals or customer-organization
tenancy is a separate future architecture track and must not reinterpret
INTERNAL_COMPANY memberships as schools or licensed customers.
