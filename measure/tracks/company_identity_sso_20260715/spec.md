# Company Employee Identity and SSO

## Overview

Deliver one employee account and app-scoped role system for Marketing, Sales
Advantage, and Codecamp Advantage, backed by a separate company identity
database and shared SSO, while migrating existing Codecamp accounts without
losing access, identity mappings, or product progress.

This track intentionally excludes schools, education roles, licensing,
entitlements, and customer accounts.

The initial deployment serves one internal company but establishes boundaries
that can later support additional company and B2B applications without another
identity redesign.

### Architectural Decisions

- Create `apps/accounts` as the first-party identity provider and employee
  account-management application.
- Use a separate logical PostgreSQL database, database credential, secret, and
  Drizzle migration stream for company identity.
- The identity database may run on the existing PostgreSQL infrastructure; it
  does not require a separate PostgreSQL server.
- Keep Marketing, Sales, and Codecamp product data in their existing databases.
- Only the Accounts identity backend may access the company identity database
  directly. Product applications authenticate through the internal auth
  adapter and SSO protocol.
- Use first-party username/password authentication with OpenID Connect
  Authorization Code and PKCE for cross-application SSO.
- Maintain separate company roles and application roles:
  - Company roles: `EMPLOYEE`, `COMPANY_ADMIN`
  - Marketing roles: `MEMBER`, `ADMIN`
  - Sales roles: `SALES_REP`, `SALES_ADMIN`
  - Codecamp roles preserve existing effective access under the Codecamp
    application namespace.
- `COMPANY_ADMIN` manages identity and role assignments but receives no
  automatic access to application data.
- Application administrators manage product functionality but cannot manage
  global identities, credentials, or company administrators.
- The bootstrap owner may hold company and application administrator roles as
  independent assignments.
- Represent the internal company with a stable organization identifier and
  membership boundary, while deferring multi-company behavior and interfaces.

## Stories

### Story S1: Establish Company Identity Boundary
**As a** platform operator
**I want** employee identity stored behind a dedicated company identity boundary
**So that** employee accounts can evolve independently from education, licensing,
and product data

**Acceptance Criteria:**
- Given an empty PostgreSQL database, When the company identity migrations run,
  Then they create only identity, credential, session, organization,
  application-role, OIDC-client, and audit structures.
- Given the existing application databases, When the identity service is
  deployed, Then their product, school, licensing, and progress tables are not
  copied into or managed by the identity database.
- Given an application process, When it needs authentication, Then it uses the
  internal auth adapter and cannot import the company identity database client
  or schema directly.
- Given the initial internal company, When accounts and role assignments are
  created, Then they are associated with a stable company organization
  identifier without enabling customer or school tenancy.
- Given the local PostgreSQL 16 Docker environment started through
  `pnpm db:start`, When fresh-install and upgrade migrations run, Then their
  schema, constraints, migration ledger, and rerun behavior are verified
  against real PostgreSQL.

**Estimate:** L
**Priority:** Must

### Story S2: Provide Employee SSO
**As a** company employee
**I want** one username and password across company applications
**So that** I can move between Marketing, Sales Advantage, and Codecamp
Advantage without maintaining separate credentials

**Acceptance Criteria:**
- Given an unauthenticated employee opening a protected application, When
  authentication is required, Then the application redirects to Accounts using
  OpenID Connect Authorization Code with PKCE, validated state, nonce, and an
  exact callback allowlist.
- Given valid employee credentials, When the employee signs in through
  Accounts, Then the originating application receives a validated identity and
  establishes its own secure HttpOnly application session.
- Given an active Accounts SSO session, When the employee opens another
  authorized company application, Then authentication completes without
  re-entering the password.
- Given an employee without a role for an application, When SSO authentication
  succeeds, Then the application denies product access without treating the
  employee as unauthenticated.
- Given a suspended account or an administrator-requested global session
  revocation, When any application performs its next protected authorization
  check, Then access is denied across all participating applications.
- Given logout from one application, When the employee chooses local logout or
  global logout, Then local logout ends only that application session and
  global logout revokes the Accounts SSO session and participating application
  sessions.

**Estimate:** XL
**Priority:** Must

### Story S3: Manage Employees and App Roles
**As a** company administrator
**I want** one place to manage employee identities and application assignments
**So that** access remains auditable and consistent across company applications

**Acceptance Criteria:**
- Given a company administrator, When they create an employee, Then Accounts
  records a unique normalized username, display name, initial credential,
  employee status, and immutable audit event.
- Given an existing employee, When a company administrator suspends, restores,
  resets credentials, or revokes sessions, Then the change is enforced across
  all participating applications and audited without recording secrets.
- Given an employee, When a company administrator assigns or removes an
  application role, Then the assignment affects only that application.
- Given a company administrator without a Sales, Marketing, or Codecamp role,
  When they open that product, Then they receive no implicit product access.
- Given a Sales, Marketing, or Codecamp administrator without
  `COMPANY_ADMIN`, When they attempt to manage identities, credentials, global
  sessions, or company administrators, Then access is denied.
- Given the last active company administrator, When an action would suspend the
  account or remove its company-administrator role, Then the system prevents
  the company from being left without an administrator.
- Given every security-sensitive management operation, When it succeeds or is
  denied, Then an immutable, secret-safe audit event identifies the actor,
  target, operation, application scope, and outcome.

**Estimate:** L
**Priority:** Must

### Story S4: Connect Marketing
**As a** Marketing employee
**I want** Marketing to use my company identity and Marketing-specific role
**So that** access is centrally managed without exposing other applications

**Acceptance Criteria:**
- Given a Marketing role assignment, When the employee signs in through
  Accounts, Then Marketing establishes an application session and grants only
  the permissions associated with that Marketing role.
- Given an authenticated employee without a Marketing role, When they open a
  protected Marketing route, Then access is denied.
- Given Marketing member and administrator roles, When authorization is
  evaluated, Then administrative Marketing operations remain inaccessible to
  ordinary Marketing members.
- Given a company administrator without a Marketing role, When they open
  Marketing, Then company-administrator status alone grants no Marketing
  access.
- Given the SSO integration, When Marketing is deployed, Then its product data
  and deployment remain independent from the identity database and other
  applications.

**Estimate:** M
**Priority:** Must

### Story S5: Connect Sales Advantage
**As a** Sales employee or Sales manager
**I want** Sales Advantage to use my company identity while preserving
Sales-specific permissions
**So that** Sales access is consolidated without confusing identity
administration with Sales management

**Acceptance Criteria:**
- Given a `SALES_REP` assignment, When the employee signs in, Then they retain
  ordinary Sales training, attempt, progress, chat, and quiz permissions.
- Given a `SALES_ADMIN` assignment, When the employee signs in, Then they retain
  Sales cohort, rep-management, oversight, and curriculum-approval permissions.
- Given a `SALES_ADMIN` without `COMPANY_ADMIN`, When they attempt to create or
  modify credentials, suspend identities, revoke global sessions, or assign
  company roles, Then access is denied.
- Given a company administrator onboarding a Sales employee, When the employee
  is created through Accounts, Then the administrator can assign `SALES_REP`
  without using a separate Sales credential-creation flow.
- Given the existing Sales “Create Rep” experience, When Sales is integrated,
  Then credential creation moves to Accounts and Sales links to or consumes
  that centralized workflow rather than creating another identity.
- Given existing Sales authorization that uses a school identifier as an
  organizational boundary, When the company integration is complete, Then
  employee Sales access uses the company organization context and does not
  require a school membership.
- Given a company administrator without a Sales role, When they open Sales,
  Then they receive no implicit Sales data access.

**Estimate:** M
**Priority:** Must

### Story S6: Migrate Codecamp Accounts
**As a** current Codecamp employee
**I want** my existing account to become my company account
**So that** I retain access, permissions, progress, and product history after
SSO cutover

**Acceptance Criteria:**
- Given a configured Codecamp source database, When migration preflight runs,
  Then it verifies the database identity, expected schema ledger, required
  tables, source account count, and source fingerprint before reading or
  writing migration data.
- Given a source secret or database name that does not identify the expected
  Codecamp database, When preflight runs, Then migration stops without writing
  destination records.
- Given existing Codecamp accounts, When dry-run migration executes, Then it
  reports deterministic account mappings, normalized-username collisions,
  credential compatibility, application-role mappings, ambiguous roles, and
  records requiring intervention.
- Given a collision or ambiguous identity, When migration runs, Then it fails
  closed for that record and does not automatically merge accounts using
  usernames, display names, or email addresses.
- Given compatible existing password hashes, When accounts are migrated, Then
  employees can continue signing in without a forced password reset; supported
  legacy hashes are upgraded after successful authentication.
- Given an existing Codecamp user identifier, When its company identity is
  created, Then Codecamp retains a stable local product-principal mapping to
  the company account so existing product foreign keys remain valid.
- Given existing Codecamp progress, curriculum state, submissions, GitHub
  mappings, review history, and other product data, When migration and cutover
  complete, Then those records remain in the Codecamp database and retain
  their original ownership.
- Given existing Codecamp roles, When migration runs, Then each role is mapped
  to an explicit Codecamp application role with equivalent effective access,
  and ambiguous administrator or system roles require an approved mapping.
- Given a previously completed or partially completed migration, When the
  migration is rerun, Then it is idempotent, produces the same mappings, and
  does not duplicate accounts or role assignments.
- Given the local PostgreSQL 16 Docker environment, When migration tests run,
  Then they exercise representative source data, collisions, incompatible
  credentials, partial failure, rerun, rollback, and product-data preservation
  against real PostgreSQL.

**Estimate:** XL
**Priority:** Must

### Story S7: Cut Over and Verify Production
**As a** platform operator
**I want** staged, observable, and reversible application cutovers
**So that** consolidated authentication can launch without locking out
employees or damaging product data

**Acceptance Criteria:**
- Given pending identity migrations, When deployment begins, Then the migration
  ledger and database doctor verify that required migrations are applied before
  application traffic reaches code that depends on them.
- Given the three applications, When production rollout begins, Then Marketing
  cuts over first, Sales Advantage second, and Codecamp Advantage last unless
  recorded evidence justifies a different order.
- Given each application cutover, When it is deployed, Then automated smoke
  tests verify login, callback validation, authorized access, unauthorized
  denial, role isolation, logout, suspension, and session revocation.
- Given the Codecamp cutover, When migrated users sign in, Then sampled and
  aggregate checks confirm identity mappings, roles, product ownership, and
  progress preservation.
- Given backups of the identity and affected product databases, When rollback
  rehearsal runs against local PostgreSQL, Then the documented restoration and
  legacy-auth rollback procedure returns the system to a verified working
  state.
- Given a failed migration, elevated authentication errors, mapping mismatch,
  or failed smoke test, When a rollout gate evaluates the evidence, Then
  cutover stops and executes the documented rollback rather than continuing.
- Given successful production verification and an agreed observation window,
  When the operator explicitly approves retirement, Then legacy application
  credential paths are disabled; they are not removed before that approval.
- Given all deployments, When security and migration events occur, Then
  structured logs and metrics expose correlation identifiers, application,
  account where safe, operation, outcome, latency, and rollback-relevant
  evidence without exposing credentials or tokens.

**Estimate:** L
**Priority:** Must

## Non-Functional Requirements

### Security

- New passwords must use Argon2id.
- Compatible legacy password hashes may be accepted only for migration and
  rehashed after successful authentication.
- Session identifiers, authorization codes, and refresh-equivalent secrets must
  be stored hashed where persistence is required.
- Authentication cookies must be HttpOnly, Secure in production, SameSite
  restricted, narrowly scoped, and rotated after authentication.
- Login and credential-management endpoints require rate limiting, CSRF
  protection where applicable, and non-enumerating failure messages.
- OIDC clients must use exact redirect URI allowlists. Wildcard callbacks and
  the implicit flow are prohibited.
- Authorization must use named permissions and app-scoped role assignments, not
  a shared numeric role hierarchy.
- Audit records must never contain passwords, password hashes, raw session
  tokens, authorization codes, or secrets.

### Isolation and Portability

- Company identity uses a separate logical database and migration stream.
- Product applications remain independently deployable.
- Identity, SSO, and authorization behavior must be exposed through internal
  contracts and adapters rather than provider-specific application code.
- The runtime must remain deployable as a normal Node.js OCI container using
  PostgreSQL and portable secret/configuration boundaries.
- The design may support registering future company applications without
  adding new global role columns or redesigning the account table.

### Testing and Data Integrity

- All new backend functions, contracts, permissions, and adapters require unit
  tests with at least 80% coverage for new code.
- Schema, migration, rollback, role isolation, and Codecamp data-migration
  tests must run against the existing local PostgreSQL 16 Docker service.
- Mock database tests may supplement but cannot replace real-PostgreSQL
  verification for constraints or migration behavior.
- Migration fixtures must include duplicate usernames, normalization
  collisions, incompatible hashes, ambiguous roles, interrupted runs, reruns,
  and preserved product foreign keys.
- Fresh-database, upgrade-from-current, and restore-from-backup paths must be
  repeatable and documented.

### Operations and Observability

- Identity and product database secrets must identify their database
  explicitly; cutover tooling must not infer the source database from a
  generic connection string.
- Migrations must run through direct database connections and complete before
  dependent application rollout.
- Every deployment must expose health and readiness checks that distinguish
  application availability from identity-database readiness.
- Authentication, authorization, role changes, migrations, and cutover gates
  require structured, correlation-aware logging.
- Legacy authentication must remain recoverable until production evidence and
  explicit operator approval permit retirement.

## Track-Level Acceptance Criteria

- One migrated or newly created employee can authenticate once and enter every
  assigned company application without re-entering credentials.
- Removing one application role blocks only that application.
- Suspending the company account blocks all participating applications.
- `COMPANY_ADMIN` grants account-management authority but no implicit product
  access.
- `SALES_ADMIN` retains Sales-management authority but no company
  identity-management authority.
- Existing Codecamp accounts retain effective roles, login continuity where
  credentials are compatible, stable product ownership, and progress.
- Fresh install, upgrade, collision, interrupted migration, idempotent rerun,
  backup restore, and rollback pass against local PostgreSQL 16.
- Deployment gates refuse application rollout when the identity or product
  database migration ledger is not compatible with the application revision.
- Company identity contains no school, student, teacher, classroom, license,
  entitlement, billing, or product-progress records.
- Marketing, Sales, and Codecamp remain independently deployable and retain
  their existing product databases.

## Out of Scope

- Primary Advantage, Reading Advantage, Science Advantage, Advantage Games, or
  other education-application authentication.
- Student, teacher, school administrator, classroom, or in-school roles.
- Licensing, subscriptions, entitlements, billing, or seat allocation.
- Customer accounts, school accounts, B2B organization onboarding, or
  multi-company administration interfaces.
- Migrating Codecamp product data into the identity database.
- Social login, external hosted identity providers, SAML, SCIM, magic links,
  passwordless login, passkeys, MFA, or public self-signup.
- Email-based self-service account recovery or invitation delivery.
- A repository-wide Testcontainers migration or remediation of unrelated mock
  database tests.
- Rewriting unrelated application business logic or migrating all existing
  routes to the backend capability framework.
- Automatic CI/CD triggers unrelated to the migration-safety gates required
  for these application cutovers.
