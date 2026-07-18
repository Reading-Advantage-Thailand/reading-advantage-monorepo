# Implementation Plan: Company Employee Identity and SSO

## Dependencies and Sequencing

- Execute phases in story order: identity boundary, SSO, account management,
  Marketing, Sales, Codecamp migration, and production cutover.
- Coordinate with `backend_architecture_enforcement_20260713` so the new
  identity database adapter is an explicitly approved database-access root.
- Coordinate with `backend_capability_kernel_20260713`. Use its accepted
  capability/executor contracts when available; do not create a parallel
  backend framework.
- If company organization context requires an amendment to the canonical
  backend tenancy model, update and approve the architecture specification
  before implementing that contract.
- Keep education authentication, schools, licensing, entitlements, and
  customer organizations outside this track.
- Use `DATABASE_URL`-style pooled connections for request traffic and a
  dedicated direct identity connection for migrations and session-scoped
  administration.
- Before changing an existing exported symbol, run `build-graph inspect`.
  After schema, signature, import/export, route, or JSX changes, run
  `build-graph update` for the affected files.
- Every Red test commit must contain tests and Measure documentation only.
- Every database phase must use the existing PostgreSQL 16 Docker environment
  started with `pnpm db:start`; mock-only evidence is insufficient.

## Phase S1: Establish Company Identity Boundary
_Story ref: spec.md#story-s1_

### Contract & Schema Definition

- [x] Task 1: Define the company identity ownership and tenancy contracts. [commit: 7516c48b]
    - [x] Record the identity/product database ownership boundary.
    - [x] Define the single-company organization and membership contract.
    - [x] Define how trusted company organization context reaches product apps
          without using `schoolId` as authority.
    - [x] Reconcile the organization context with the backend capability kernel
          and update the canonical architecture specification if required.
    - [x] Document why schools, licenses, customers, and product data remain
          excluded.

- [x] Task 2: Define Zod and Drizzle contracts for the identity database. [commit: b9d81557]
    - [x] Define account, normalized username, status, and credential contracts.
    - [x] Define organizations, memberships, applications, app-role
          assignments, sessions, OIDC clients/codes, and immutable audit events.
    - [x] Define foreign keys, uniqueness constraints, status enums, expiration
          behavior, and idempotency keys.
    - [x] Define `COMPANY_AUTH_DATABASE_URL`,
          `COMPANY_AUTH_DIRECT_DATABASE_URL`, issuer, cookie, and service
          authentication environment contracts.
    - [x] Add required JSDoc to every exported schema, type, adapter, and
          capability contract.

### Test

- [x] Task 3: Write Red contract and architecture-boundary tests. [commit: 60ad9d28]
    - [x] Prove identity schemas reject malformed usernames, statuses, roles,
          application identifiers, redirect URIs, and audit metadata.
    - [x] Prove product applications cannot import the identity database client
          or schema directly.
    - [x] Add positive and counterexample fixtures to the AST boundary guard.
    - [x] Prove company identity tables are not added to the education
          `TenantDB` registry or product migration stream.

- [x] Task 4: Write Red PostgreSQL migration and constraint tests. [commit: ba033761]
    - [x] Create isolated `company_identity_test_<pid>_<nonce>` databases using the local
          PostgreSQL 16 container.
    - [x] Test fresh migration, upgrade migration, rollback rehearsal, and
          migration-ledger monotonicity.
    - [x] Test normalized-username uniqueness, foreign keys, unique role
          assignments, expiration, and immutable-audit constraints.
    - [x] Prove the identity migration creates no education, licensing, or
          product tables.
    - [x] Prove rerunning application/organization bootstrap data is
          idempotent.

### Implement

- [x] Task 5: Implement the separate identity database infrastructure. [commit: 43c16457]
    - [x] Add the company-identity schema and dedicated Drizzle migration stream
          under the database package.
    - [x] Add pooled and direct client factories without widening the existing
          global database singleton.
    - [x] Add database migration, ledger validation, and doctor commands.
    - [x] Add idempotent bootstrap records for the internal company and the
          three initial applications.
    - [x] Apply least-privilege database credentials for runtime and migration
          connections.

- [~] Task 6: Establish the backend identity module and adapter boundary.
    - [ ] Add transport-independent identity repository interfaces and
          capability contracts.
    - [ ] Add the PostgreSQL identity adapter in the approved ownership root.
    - [ ] Connect authentication, authorization, audit, transaction, and
          structured-error policies through the backend executor.
    - [ ] Register exact architecture-enforcement allowlists without wildcard
          exemptions.
    - [ ] Run the counterexample fixtures and ratchet tests.

### Generate Docs & Doctor

- [ ] Task 7: Generate identity architecture facts and run phase gates.
    - [ ] Document the database topology, migration commands, environment
          variables, ownership rules, and local PostgreSQL test workflow.
    - [ ] Run `measure/generate.sh` and review generated changes.
    - [ ] Run the Measure doctor and database ledger doctor.
    - [ ] Run targeted tests, coverage, lint, typecheck, and builds for the
          database, backend, and auth packages.
    - [ ] Update `graph.db` for all structural changes.

- [ ] Task: Measure - User Manual Verification 'Phase S1: Establish Company Identity Boundary' (Protocol in workflow.md)

## Phase S2: Provide Employee SSO
_Story ref: spec.md#story-s2_
_Blast radius: `validateSession` has 31 source references but 0 graph-resolved caller edges, including shared auth server/session routes and tests; shared `requireRole` has 13 scoped source references and three same-named graph symbols, including Codecamp and Sales proxies._

### Contract & Schema Definition

- [ ] Task 8: Define the first-party OIDC and employee-session contracts.
    - [ ] Define authorization, callback, token exchange, identity claims,
          introspection, local logout, and global logout contracts.
    - [ ] Define Authorization Code with PKCE, state, nonce, exact redirect URI,
          audience, issuer, expiry, replay, and clock-skew behavior.
    - [ ] Define minimal audience-specific claims: stable subject, company
          organization, account status, session identifier, and that
          application’s role assignments.
    - [ ] Define Accounts SSO sessions separately from application-local
          sessions.
    - [ ] Define suspension and global-revocation propagation behavior.

- [ ] Task 9: Produce the SSO threat model and dependency decision.
    - [ ] Evaluate a maintained standards-compliant OIDC implementation behind
          the internal adapter.
    - [ ] Document authorization-code interception, callback substitution,
          session fixation, token replay, CSRF, username enumeration, and
          cross-application privilege threats.
    - [ ] Update the Tech Stack before adding any newly selected authentication
          dependency.
    - [ ] Define first-party-client behavior without a consent screen while
          preserving exact client registration.

### Test

- [ ] Task 10: Write Red OIDC, credential, and session tests.
    - [ ] Test successful and rejected username/password authentication.
    - [ ] Test Argon2id creation and compatible legacy-hash upgrade.
    - [ ] Test PKCE, state, nonce, issuer, audience, callback, expiry, and
          one-time authorization-code enforcement.
    - [ ] Test rate limiting, CSRF defense, non-enumerating errors, session
          fixation prevention, and secure cookie attributes.
    - [ ] Test malformed, expired, replayed, cross-client, and revoked tokens.

- [ ] Task 11: Write Red cross-application SSO tests.
    - [ ] Register isolated Marketing, Sales, and Codecamp test clients.
    - [ ] Prove one Accounts login allows subsequent authorized applications
          without another password.
    - [ ] Prove an authenticated employee without an app role receives a
          forbidden result rather than anonymous access.
    - [ ] Prove local logout preserves the central SSO session.
    - [ ] Prove global logout, suspension, and global revocation block all
          participating clients.
    - [ ] Exercise persistent session and authorization-code behavior against
          local PostgreSQL.

### Implement

- [ ] Task 12: Implement the Accounts identity-provider surface.
    - [ ] Scaffold `apps/accounts` as a thin UI and protocol adapter.
    - [ ] Implement sign-in, authorization, callback completion, token
          exchange, identity/introspection, local logout, and global logout.
    - [ ] Implement PostgreSQL-backed Accounts sessions and one-time
          authorization codes.
    - [ ] Implement login rate limiting and security audit events.
    - [ ] Add health/readiness checks that distinguish process readiness from
          identity-database readiness.

- [ ] Task 13: Implement the reusable company SSO client adapter.
    - [ ] Add provider-neutral client contracts for authorization redirects,
          callback verification, current identity, local session, and logout.
    - [ ] Implement application-local HttpOnly sessions.
    - [ ] Implement exact application-client configuration and environment
          validation.
    - [ ] Implement authorization refresh/introspection needed for suspension
          and global revocation.
    - [ ] Preserve app-local wrappers for framework-specific cookie access.

### Generate Docs & Doctor

- [ ] Task 14: Document and verify the SSO protocol.
    - [ ] Document client registration, redirect URIs, session lifecycles,
          logout semantics, key/secret rotation, and incident revocation.
    - [ ] Generate capability and route documentation.
    - [ ] Run Measure doctor, auth security tests, PostgreSQL integration tests,
          coverage, lint, typecheck, and builds.
    - [ ] Inspect the shared session and role symbols before modification and
          update `graph.db` afterward.

- [ ] Task: Measure - User Manual Verification 'Phase S2: Provide Employee SSO' (Protocol in workflow.md)

## Phase S3: Manage Employees and App Roles
_Story ref: spec.md#story-s3_
_Blast radius: `roleAtLeast` has 5 source references but 0 graph-resolved caller edges, including shared auth and Science auth; shared `requireRole` has 13 scoped source references across auth routes, Sales, and Codecamp._

### Contract & Schema Definition

- [ ] Task 15: Define employee-management capabilities and permission policies.
    - [ ] Define create, suspend, restore, credential reset, revoke-all-sessions,
          assign-app-role, remove-app-role, and company-role contracts.
    - [ ] Define `EMPLOYEE` and `COMPANY_ADMIN` company permissions.
    - [ ] Define independent Marketing, Sales, and Codecamp role namespaces.
    - [ ] Define the last-company-administrator invariant and concurrency
          behavior.
    - [ ] Define immutable audit event schemas and secret-safe metadata
          projectors.
    - [ ] Define bootstrap-owner creation as an explicit CLI/administrative
          capability, not a public signup path.

### Test

- [ ] Task 16: Write Red capability and authorization tests.
    - [ ] Test every management capability’s Zod input/output and declared
          errors.
    - [ ] Test company-admin success and ordinary-employee denial.
    - [ ] Test application-admin denial for identity, credential, session, and
          company-role operations.
    - [ ] Test company administrators receive no implicit application access.
    - [ ] Test assigning or removing one app role leaves other apps unchanged.
    - [ ] Test audit metadata excludes credentials, hashes, tokens, and codes.

- [ ] Task 17: Write Red PostgreSQL invariant and concurrency tests.
    - [ ] Test concurrent attempts to remove or suspend the last company
          administrator.
    - [ ] Test normalized-username collision and idempotent create behavior.
    - [ ] Test transactional role changes, suspension, and session revocation.
    - [ ] Test append-only audit enforcement using runtime and privileged
          database roles.
    - [ ] Test rollback leaves account, role, session, and audit invariants
          consistent.

### Implement

- [ ] Task 18: Implement employee-management backend capabilities.
    - [ ] Implement all approved account-lifecycle commands through the backend
          executor.
    - [ ] Enforce named permissions instead of a numeric cross-app hierarchy.
    - [ ] Implement transactional last-administrator protection.
    - [ ] Implement global session revocation and account-status enforcement.
    - [ ] Emit immutable success and denial audit events.
    - [ ] Add structured errors and operation telemetry.

- [ ] Task 19: Implement the Accounts administration interface.
    - [ ] Add employee list, create, status, credential-reset, and
          session-revocation surfaces.
    - [ ] Add company-role and app-role assignment surfaces with explicit
          application scope.
    - [ ] Show the distinction between company administration and application
          administration in labels and confirmation messages.
    - [ ] Prevent secrets from being redisplayed after initial creation.
    - [ ] Add the bootstrap-owner CLI and documented recovery procedure.
    - [ ] Verify accessible keyboard and responsive behavior.

### Generate Docs & Doctor

- [ ] Task 20: Document and verify employee administration.
    - [ ] Publish the company-versus-application role matrix.
    - [ ] Document bootstrap, recovery, suspension, termination, and
          session-revocation procedures.
    - [ ] Generate capability and audit-event documentation.
    - [ ] Run Measure doctor, local PostgreSQL tests, coverage, lint, typecheck,
          Accounts build, and backend package builds.
    - [ ] Update `graph.db` for new capabilities, schemas, routes, and UI.

- [ ] Task: Measure - User Manual Verification 'Phase S3: Manage Employees and App Roles' (Protocol in workflow.md)

## Phase S4: Connect Marketing
_Story ref: spec.md#story-s4_
_Blast radius: `requireMarketingSession` has 9 source references but 0 graph-resolved caller edges, including campaign, settings, and video API routes._

### Contract & Schema Definition

- [ ] Task 21: Define Marketing SSO and permission contracts.
    - [ ] Define Marketing `MEMBER` shared campaign/project permissions and
          `ADMIN`-only settings permissions.
    - [ ] Inventory protected Marketing routes and map each to a named
          permission.
    - [ ] Define Marketing client registration, callback, session, logout, and
          forbidden-response contracts.
    - [ ] Define product-principal mapping and company organization claims
          without moving Marketing product data.
    - [ ] Define the temporary legacy-auth rollback switch without allowing
          dual credential writers.

### Test

- [ ] Task 22: Write Red Marketing authorization and SSO tests.
    - [ ] Test anonymous, authenticated-without-role, member, Marketing admin,
          and company-admin-only cases.
    - [ ] Test callback tampering, expired codes, wrong audience, revoked
          sessions, and logout.
    - [ ] Test every protected route short-circuits before product database
          access when authorization fails.
    - [ ] Add an inventory guard that fails when a new protected route lacks a
          named Marketing permission.
    - [ ] Add counterexample fixtures proving the route guard detects missing
          authorization.

### Implement

- [ ] Task 23: Integrate Marketing with company SSO.
    - [ ] Register the Marketing OIDC client and validated environment.
    - [ ] Add sign-in callback, local session, logout, and forbidden surfaces.
    - [ ] Replace authentication-only Marketing guards with app-role
          authorization through the internal adapter.
    - [ ] Keep Marketing product queries on the existing product database.
    - [ ] Remove direct shared-auth database coupling from Marketing routes.
    - [ ] Add structured auth and authorization telemetry.

- [ ] Task 24: Complete Marketing route migration and regression verification.
    - [ ] Migrate every inventoried protected Marketing route.
    - [ ] Verify the shared campaign/project workspace for `MEMBER` and `ADMIN`,
          with settings restricted to `ADMIN`.
    - [ ] Verify company administrators without Marketing roles are denied.
    - [ ] Run browser-level login, SSO reuse, logout, suspension, and
          unauthorized-route tests.
    - [ ] Verify the legacy rollback switch restores the last known working
          authentication path without changing credentials.

### Generate Docs & Doctor

- [ ] Task 25: Document and verify the Marketing integration.
    - [ ] Document client configuration, permissions, role assignment, smoke
          tests, rollback, and deployment environment.
    - [ ] Generate route and capability facts.
    - [ ] Run Measure doctor, Marketing tests, coverage, lint, typecheck, and
          build.
    - [ ] Run the architecture boundary guards and update `graph.db`.

- [ ] Task: Measure - User Manual Verification 'Phase S4: Connect Marketing' (Protocol in workflow.md)

## Phase S5: Connect Sales Advantage
_Story ref: spec.md#story-s5_
_Blast radius: `createRepAccount` has 4 source references, `getCohortOverview` has 5, and `saveAttemptEvaluation` has 4, while each has 0 graph-resolved caller edges because package-alias calls are unresolved; direct consumers include the Sales router and Sales authorization tests._

### Contract & Schema Definition

- [ ] Task 26: Define Sales identity, permission, and organization contracts.
    - [ ] Preserve `SALES_REP` and `SALES_ADMIN` as Sales-scoped roles.
    - [ ] Define named permissions for ordinary Sales and Sales-administration
          operations.
    - [ ] Remove global credential creation from the Sales-admin authority
          contract.
    - [ ] Define the Accounts onboarding handoff for assigning `SALES_REP`.
    - [ ] Define the trusted company organization context that replaces
          `schoolId` for employee Sales authorization.
    - [ ] Define local Sales product-principal mapping and rollback behavior.

### Test

- [ ] Task 27: Write Red Sales role-separation and regression tests.
    - [ ] Test preserved Sales-rep training, attempt, progress, chat, and quiz
          permissions.
    - [ ] Test preserved Sales-admin cohort, oversight, rep-management, and
          curriculum permissions.
    - [ ] Test Sales admins cannot manage global identities or credentials.
    - [ ] Test company administrators without Sales roles cannot access Sales.
    - [ ] Test the old Sales credential-creation operation is unavailable.
    - [ ] Test the Accounts onboarding handoff assigns only the selected Sales
          role.

- [ ] Task 28: Write Red PostgreSQL organization and ownership tests.
    - [ ] Test same-company Sales-admin cohort and attempt oversight.
    - [ ] Test cross-organization access fails closed using representative
          future-organization fixtures.
    - [ ] Test no Sales employee requires a school membership.
    - [ ] Test Sales progress and attempt ownership remains bound to the local
          product principal.
    - [ ] Test role removal and suspension take effect without altering product
          rows.

### Implement

- [ ] Task 29: Integrate Sales Advantage with company SSO.
    - [ ] Register the Sales OIDC client and validated environment.
    - [ ] Add callback, local session, logout, forbidden, and revocation flows.
    - [ ] Replace global flat-role and numeric-hierarchy authorization with
          Sales app-role permissions.
    - [ ] Populate trusted company organization context from validated identity
          claims and local principal mapping.
    - [ ] Preserve product data in the existing Sales database.

- [ ] Task 30: Move Sales employee onboarding to Accounts.
    - [ ] Remove password and credential creation from the Sales-admin workflow.
    - [ ] Replace “Create Rep” with a link or handoff to Accounts that selects
          the Sales application and `SALES_REP`.
    - [ ] Preserve Sales-admin product-management surfaces.
    - [ ] Audit onboarding, role assignment, and denied identity-management
          attempts.
    - [ ] Maintain a bounded rollback path without dual credential writes.

- [ ] Task 31: Verify existing Sales domain behavior after auth migration.
    - [ ] Run cohort, attempt-evaluation, curriculum, progress, and IDOR
          regression suites.
    - [ ] Verify same-company and cross-company fixtures against PostgreSQL.
    - [ ] Run browser-level rep and Sales-admin journeys.
    - [ ] Verify suspension, app-role removal, local logout, and global logout.
    - [ ] Inspect affected Sales and shared-auth exports before modification and
          update the graph after changes.

### Generate Docs & Doctor

- [ ] Task 32: Document and verify the Sales integration.
    - [ ] Document the role matrix, Accounts onboarding handoff, organization
          scoping, client configuration, deployment, and rollback.
    - [ ] Generate capability and route facts.
    - [ ] Run Measure doctor, Sales/API/domain tests, PostgreSQL integration
          tests, coverage, lint, typecheck, and builds.
    - [ ] Run architecture and authorization boundary guards.

- [ ] Task: Measure - User Manual Verification 'Phase S5: Connect Sales Advantage' (Protocol in workflow.md)

## Phase S6: Migrate Codecamp Accounts
_Story ref: spec.md#story-s6_
_Blast radius: `validateSession` has 31 source references and shared `requireRole` has 13 scoped source references; key consumers include the Codecamp proxy, shared auth server, session routes, and their tests, although graph caller edges are unresolved._

### Contract & Schema Definition

- [ ] Task 33: Define the versioned Codecamp migration contract.
    - [ ] Define authoritative source and destination database identity
          contracts.
    - [ ] Define source-account inventory, normalized-username collision,
          credential-compatibility, status, and role-mapping schemas.
    - [ ] Define explicit mappings for existing Codecamp roles and a
          manual-decision state for ambiguous administrator/system roles.
    - [ ] Define stable company-account-to-local-product-principal mappings.
    - [ ] Define dry-run, apply, resume, idempotency, evidence, and rollback
          manifests.
    - [ ] Define invariants for progress, curriculum, submissions, GitHub,
          review, and other product ownership.

- [ ] Task 34: Define the Codecamp source-database preflight.
    - [ ] Verify expected database name and an operator-provided immutable
          deployment/environment identifier.
    - [ ] Verify migration ledger, required tables/columns, account count, and
          deterministic source fingerprint.
    - [ ] Refuse connection strings or secrets that resolve to an unexpected
          database.
    - [ ] Resolve or explicitly document the currently misleading Codecamp
          database secret before production migration.
    - [ ] Require read-only source access for dry runs.

### Test

- [ ] Task 35: Write Red migration-unit and mapping tests.
    - [ ] Test deterministic mappings for compatible accounts.
    - [ ] Test case, whitespace, Unicode, and normalization collisions.
    - [ ] Test incompatible hashes, duplicate identifiers, missing fields,
          suspended accounts, and ambiguous roles.
    - [ ] Test no automatic merge by username, display name, or email.
    - [ ] Test manifest checksums, interrupted state, resume, idempotent rerun,
          and deterministic failure reporting.
    - [ ] Test audit output contains no credential material.

- [ ] Task 36: Write Red PostgreSQL migration and preservation tests.
    - [ ] Create isolated source Codecamp and destination company-identity test
          databases in the local PostgreSQL 16 container.
    - [ ] Load representative users and linked product records.
    - [ ] Run dry-run, apply, partial failure, resume, rerun, and rollback.
    - [ ] Verify every migrated account has one company identity and one stable
          local Codecamp mapping.
    - [ ] Verify product foreign keys, progress, curriculum, submissions,
          GitHub mappings, and review history are unchanged.
    - [ ] Compare pre/post counts and deterministic fingerprints.

### Implement

- [ ] Task 37: Implement the migration preflight and dry-run tooling.
    - [ ] Use validated environment contracts and direct database connections.
    - [ ] Emit a human-readable summary and machine-readable signed/checksummed
          manifest.
    - [ ] List all collisions, incompatible credentials, and ambiguous roles
          before writes are allowed.
    - [ ] Require explicit operator approval of the mapping manifest.
    - [ ] Make apply reject a source whose fingerprint changed after dry-run.

- [ ] Task 38: Implement idempotent Codecamp identity migration.
    - [ ] Create or map company identities without copying product data.
    - [ ] Preserve supported credential hashes and mark them for upgrade after
          successful authentication.
    - [ ] Persist stable company-account identifiers on local Codecamp
          principals while retaining existing local user IDs.
    - [ ] Create Codecamp app-role assignments from the approved mapping.
    - [ ] Record migration ledger entries and immutable audit evidence.
    - [ ] Support safe resume and rollback without deleting source accounts.

- [ ] Task 39: Integrate Codecamp with SSO and migrated principals.
    - [ ] Register the Codecamp OIDC client and validated environment.
    - [ ] Add callback, local session, logout, forbidden, and revocation flows.
    - [ ] Replace flat global-role checks with Codecamp app-scoped permissions.
    - [ ] Preserve existing Codecamp admin, intern, webhook, progress, and
          product behavior.
    - [ ] Add a bounded legacy-auth rollback switch without dual credential
          writers.

- [ ] Task 40: Rehearse migration and produce acceptance evidence.
    - [ ] Run the full migration against disposable clones in local PostgreSQL.
    - [ ] Validate aggregate counts, fingerprints, roles, and product ownership.
    - [ ] Verify representative existing accounts can authenticate.
    - [ ] Verify compatible legacy hashes upgrade only after successful login.
    - [ ] Rehearse restore and rollback from captured backups.
    - [ ] Record unresolved exceptions; do not advance while any account lacks
          an approved disposition.

### Generate Docs & Doctor

- [ ] Task 41: Document and verify Codecamp migration readiness.
    - [ ] Publish operator runbooks for preflight, dry-run, approval, apply,
          resume, rollback, backup, and restore.
    - [ ] Document each role mapping and approved exception.
    - [ ] Generate schema, capability, route, and migration documentation.
    - [ ] Run Measure doctor, database doctor, Codecamp/auth/backend tests,
          PostgreSQL migration suites, coverage, lint, typecheck, and builds.
    - [ ] Update `graph.db` for all changed schemas, auth exports, routes, and
          product-principal mappings.

- [ ] Task: Measure - User Manual Verification 'Phase S6: Migrate Codecamp Accounts' (Protocol in workflow.md)

## Phase S7: Cut Over and Verify Production
_Story ref: spec.md#story-s7_

> **2026-07-18 release checkpoint:** Accounts, Marketing, and Sales are deployed on
> Cloud Run and their public-domain SSO paths are verified. Immutable build,
> revision, domain, browser, protected-API, and rollback evidence is recorded in
> [`production-rollout-20260718.md`](./production-rollout-20260718.md). This is a
> partial Phase S7 checkpoint: Codecamp migration/cutover, negative role-isolation
> probes, the observation window, legacy-auth retirement, and final documentation
> remain open.

### Contract & Schema Definition

- [ ] Task 42: Define the production rollout, evidence, and rollback contract.
    - [ ] Define entry and exit gates for Accounts, Marketing, Sales, and
          Codecamp.
    - [ ] Define required backup identifiers, migration-ledger results,
          database-doctor results, smoke results, and operator approvals.
    - [ ] Define authentication-error, authorization-error, mapping-mismatch,
          and latency rollback thresholds.
    - [ ] Define Marketing-first, Sales-second, Codecamp-last sequencing.
    - [ ] Define the legacy-auth observation window and explicit retirement
          approval.
    - [ ] Define a no-dual-credential-writer invariant throughout rollout.

### Test

- [ ] Task 43: Write Red deployment-gate and rollback tests.
    - [ ] Prove application rollout stops when required migrations are absent,
          skipped, non-monotonic, or incompatible.
    - [ ] Prove source-database preflight failure blocks Codecamp migration.
    - [ ] Prove failed login, callback, role, revocation, or product-ownership
          smoke checks stop rollout.
    - [ ] Prove rollback restores the prior application revision and auth mode.
    - [ ] Prove production smoke tests require explicit opt-in and cannot
          default silently to a live URL.

### Implement

- [ ] Task 44: Build deployment and migration gates for all participating apps.
    - [ ] Add Accounts identity migration and database-doctor gates.
    - [ ] Add or update Marketing, Sales, and Codecamp deployment gates.
    - [ ] Ensure migrations use direct connections and finish before dependent
          application rollout.
    - [ ] Bind each service to the correct explicit database secret.
    - [ ] Emit machine-readable rollout evidence and structured logs.

- [ ] Task 45: Deploy Accounts and register production clients.
    - [ ] Create the production identity database, least-privilege credentials,
          and versioned secrets.
    - [ ] Apply and verify identity migrations before deploying Accounts.
    - [ ] Bootstrap the initial company administrator through the approved
          administrative path.
    - [ ] Register exact Marketing, Sales, and Codecamp production callbacks.
    - [ ] Verify health, readiness, sign-in, audit, revocation, and backup.

- [ ] Task 46: Cut over Marketing and Sales in stages.
    - [ ] Back up affected databases and capture rollback revisions.
    - [ ] Deploy and verify Marketing with selected employee roles.
    - [ ] Observe agreed metrics before advancing.
    - [ ] Deploy and verify Sales with rep and Sales-admin accounts.
    - [ ] Verify company administrators without app roles remain denied.
    - [ ] Stop and roll back immediately if any entry/exit gate fails.

- [ ] Task 47: Migrate and cut over Codecamp.
    - [ ] Verify the authoritative source database and capture backups.
    - [ ] Run production dry-run and compare it with rehearsal evidence.
    - [ ] Obtain explicit approval for collision, credential, and role mapping.
    - [ ] Run the idempotent migration and verify counts and fingerprints.
    - [ ] Deploy Codecamp SSO and run login, role, progress, GitHub mapping, and
          product-ownership smoke tests.
    - [ ] Observe authentication and product metrics through the agreed window.

- [ ] Task 48: Retire legacy authentication after explicit approval.
    - [ ] Confirm no unresolved migrated-account exceptions remain.
    - [ ] Confirm rollback evidence and observation-window results are accepted.
    - [ ] Obtain explicit operator approval before disabling legacy credential
          paths.
    - [ ] Disable legacy auth entry points and secrets without deleting backup
          evidence.
    - [ ] Run final cross-application SSO, role-isolation, suspension, logout,
          and product-data verification.

### Generate Docs & Doctor

- [ ] Task 49: Complete production documentation and final quality gates.
    - [ ] Publish final topology, client registry, secret inventory, migration
          evidence, rollback revisions, and operational runbooks.
    - [ ] Generate architecture, capability, route, and schema facts.
    - [ ] Run Measure doctor and all database doctors.
    - [ ] Run affected package/app tests, PostgreSQL integration tests,
          coverage, lint, typecheck, and builds.
    - [ ] Run the full architecture-enforcement and migration-ledger gates.
    - [ ] Update `graph.db` and run its integrity audit.
    - [ ] Complete independent security, migration, and change-quality review.

- [ ] Task: Measure - User Manual Verification 'Phase S7: Cut Over and Verify Production' (Protocol in workflow.md)
