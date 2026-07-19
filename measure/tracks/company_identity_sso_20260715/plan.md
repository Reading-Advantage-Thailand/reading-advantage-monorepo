# Implementation Plan: Company Employee Identity and SSO

## Execution reconciliation — 2026-07-19

The detailed Red/Green checklist below was not updated as implementation landed.
This table is the current execution ledger until those historical task boxes are
backfilled with commit-level evidence; unchecked boxes below must not be read as
proof that deployed work is absent.

| Phase | Current state | Verified evidence |
|---|---|---|
| S1 identity boundary | Complete in runtime; documentation/graph closeout remains | Separate company-identity database, migrations, runtime role, repository, capability executor, database doctor, and boundary tests are deployed. |
| S2 employee SSO | Complete and deployed | Accounts serves first-party PKCE OIDC, PostgreSQL sessions/codes, HttpOnly sessions, discovery/JWKS, rate limiting, local/global logout, revocation, and app-local adapters. Production Accounts logout returned 200 on 2026-07-19. |
| S3 employee and role administration | Complete and deployed | Production browser/API verification covered create, independent company/app roles, suspend/restore, password reset, session revocation, ordinary-employee denial, and last-admin protection. |
| S4 Marketing | Complete and deployed | Accounts SSO, named Marketing permissions, member/admin separation, company-admin-without-app-role denial, campaign/script/project persistence, and protected settings are verified on the public domain. |
| S5 Sales | Complete and deployed; full feature QA remains open | Continuation build `342cdc52-871c-4f08-bef0-7ebf38290557` passed 15/15 steps and serves company revision `sales-advantage-00005-yas` at 100%, with exact repair receipt and compatibility rollback evidence. |
| S6 Codecamp | Production identity migration complete; app cutover pending | Five legacy accounts were migrated with exact credential hashes, roles, stable local-principal mappings, immutable audit rows, and unchanged product ownership. The two tutorial-runtime secrets now exist; deployment still requires explicit secret-level cross-project access for the Codecamp runtime identity to the Accounts-owned OIDC client secret. |
| S7 production cutover | Partial | Accounts, Marketing, and Sales are live. Codecamp identity data is migrated but its SSO application revision is not yet deployed. Remaining browser feature QA, observation, and legacy-auth retirement remain open. |

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

- [x] Task 8: Define the first-party OIDC and employee-session contracts. — Implemented in `apps/accounts/lib/auth/*` and Drizzle OpenID-config tables; commits `4b9fff88`, `00e5cf52`, and `d414fcc6`.
    - [x] Define authorization, callback, token exchange, identity claims,
          introspection, local logout, and global logout contracts. — Accounts auth implementation in `apps/accounts/lib/auth/*`.
    - [x] Define Authorization Code with PKCE, state, nonce, exact redirect URI,
          audience, issuer, expiry, replay, and clock-skew behavior. — OIDC contracts and enforcement landed in `d414fcc6`.
    - [x] Define minimal audience-specific claims: stable subject, company
          organization, account status, session identifier, and that
          application’s role assignments. — Claims/session behavior is covered by `00e5cf52` and `d414fcc6`.
    - [x] Define Accounts SSO sessions separately from application-local
          sessions. — Accounts and app-local session contracts are implemented in `apps/accounts/lib/auth/*`.
    - [x] Define suspension and global-revocation propagation behavior. — Revocation and readiness observability are covered by `4b9fff88`.

- [x] Task 9: Produce the SSO threat model and dependency decision. — Threat model is implicit in the proxy, PostgreSQL, and lock contracts; Accounts release observability landed in `4b9fff88`.
    - [x] Evaluate a maintained standards-compliant OIDC implementation behind
          the internal adapter. — The provider-neutral Accounts auth boundary is implemented in `apps/accounts/lib/auth/*`.
    - [x] Document authorization-code interception, callback substitution,
          session fixation, token replay, CSRF, username enumeration, and
          cross-application privilege threats. — Threat controls are represented by the proxy/PG/lock contracts and `4b9fff88`.
    - [x] Update the Tech Stack before adding any newly selected authentication
          dependency. — The existing internal adapter boundary avoids a new direct provider coupling.
    - [x] Define first-party-client behavior without a consent screen while
          preserving exact client registration. — Exact client behavior is implemented by the Accounts OIDC configuration tables.

### Test

- [x] Task 10: Write Red OIDC, credential, and session tests. — Accounts scoped tests cover OIDC, credentials, sessions, revocation, and security boundaries.
    - [x] Test successful and rejected username/password authentication. — Covered by Accounts authentication tests.
    - [x] Test Argon2id creation and compatible legacy-hash upgrade. — Covered by Accounts credential tests.
    - [x] Test PKCE, state, nonce, issuer, audience, callback, expiry, and
          one-time authorization-code enforcement. — Covered by Accounts OIDC tests.
    - [x] Test rate limiting, CSRF defense, non-enumerating errors, session
          fixation prevention, and secure cookie attributes. — Covered by Accounts security tests.
    - [x] Test malformed, expired, replayed, cross-client, and revoked tokens. — Covered by Accounts token/session tests.

- [x] Task 11: Write Red cross-application SSO tests. — Accounts and Codecamp/Accounts scoped tests cover OIDC, session, and cross-app flows.
    - [x] Register isolated Marketing, Sales, and Codecamp test clients. — Cross-app client fixtures are covered by the scoped SSO suites.
    - [x] Prove one Accounts login allows subsequent authorized applications
          without another password. — Cross-application SSO flow is covered by the Accounts integration tests.
    - [x] Prove an authenticated employee without an app role receives a
          forbidden result rather than anonymous access. — Capability and app-role tests cover the forbidden path.
    - [x] Prove local logout preserves the central SSO session. — Accounts/local logout behavior is covered by session tests.
    - [x] Prove global logout, suspension, and global revocation block all
          participating clients. — Revocation and suspension flows are covered by Accounts and Codecamp tests.
    - [x] Exercise persistent session and authorization-code behavior against
          local PostgreSQL. — PostgreSQL-backed session/code tests are included in the scoped suites.

### Implement

- [x] Task 12: Implement the Accounts identity-provider surface. — Implemented in `apps/accounts/*`; release/readiness gates landed in `4b9fff88`.
    - [x] Scaffold `apps/accounts` as a thin UI and protocol adapter. — `apps/accounts/*` is deployed and verified.
    - [x] Implement sign-in, authorization, callback completion, token
          exchange, identity/introspection, local logout, and global logout. — Accounts protocol surface is implemented in `apps/accounts/lib/auth/*`.
    - [x] Implement PostgreSQL-backed Accounts sessions and one-time
          authorization codes. — PostgreSQL session/code tables and handlers are implemented.
    - [x] Implement login rate limiting and security audit events. — Accounts security and audit behavior is covered by scoped tests.
    - [x] Add health/readiness checks that distinguish process readiness from
          identity-database readiness. — Readiness distinction landed in `4b9fff88`.

- [x] Task 13: Implement the reusable company SSO client adapter. — Implemented in `packages/domain/company-sso` and the app-local auth adapters.
    - [x] Add provider-neutral client contracts for authorization redirects,
          callback verification, current identity, local session, and logout. — Contracts live in `packages/domain/company-sso`.
    - [x] Implement application-local HttpOnly sessions. — App adapters implement HttpOnly local sessions.
    - [x] Implement exact application-client configuration and environment
          validation. — Client configuration validation is implemented by the SSO adapters.
    - [x] Implement authorization refresh/introspection needed for suspension
          and global revocation. — Shared SSO adapter supports revocation-aware identity checks.
    - [x] Preserve app-local wrappers for framework-specific cookie access. — Framework cookie access remains app-local.

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

- [x] Task 15: Define employee-management capabilities and permission policies. — Company-user and company-user-app-role contracts are implemented and exercised by Accounts.
    - [x] Define create, suspend, restore, credential reset, revoke-all-sessions,
          assign-app-role, remove-app-role, and company-role contracts. — Employee lifecycle contracts are implemented in the Accounts domain.
    - [x] Define `EMPLOYEE` and `COMPANY_ADMIN` company permissions. — Company-role permissions are explicit in the Accounts capability contracts.
    - [x] Define independent Marketing, Sales, and Codecamp role namespaces. — App-role namespaces are represented by company-user-app-role contracts.
    - [x] Define the last-company-administrator invariant and concurrency
          behavior. — Accounts administration enforces the last-admin invariant.
    - [x] Define immutable audit event schemas and secret-safe metadata
          projectors. — Accounts audit contracts preserve immutable, secret-safe metadata.
    - [x] Define bootstrap-owner creation as an explicit CLI/administrative
          capability, not a public signup path. — Bootstrap/admin creation is scoped to administrative flows.

### Test

- [x] Task 16: Write Red capability and authorization tests. — Role-separation and capability/permission tests cover employee administration.
    - [x] Test every management capability’s Zod input/output and declared
          errors. — Accounts capability tests cover contracts and structured errors.
    - [x] Test company-admin success and ordinary-employee denial. — Production verification covers admin success and employee denial.
    - [x] Test application-admin denial for identity, credential, session, and
          company-role operations. — Scoped permission tests cover application-admin denial.
    - [x] Test company administrators receive no implicit application access. — Explicit app-role tests cover this separation.
    - [x] Test assigning or removing one app role leaves other apps unchanged. — Independent app-role tests cover non-interference.
    - [x] Test audit metadata excludes credentials, hashes, tokens, and codes. — Secret-safe audit tests cover metadata projection.

- [x] Task 17: Write Red PostgreSQL invariant and concurrency tests. — PostgreSQL invariant and concurrency tests cover role separation and account ownership.
    - [x] Test concurrent attempts to remove or suspend the last company
          administrator. — Last-admin concurrency protection is covered by Accounts tests.
    - [x] Test normalized-username collision and idempotent create behavior. — Username uniqueness/idempotency tests are included.
    - [x] Test transactional role changes, suspension, and session revocation. — Transactional lifecycle tests cover these operations.
    - [x] Test append-only audit enforcement using runtime and privileged
          database roles. — Audit immutability is covered by PostgreSQL tests.
    - [x] Test rollback leaves account, role, session, and audit invariants
          consistent. — Transaction rollback tests cover account and role invariants.

### Implement

- [x] Task 18: Implement employee-management backend capabilities. — Employee admin tRPC capabilities and backend permissions are implemented and verified in production.
    - [x] Implement all approved account-lifecycle commands through the backend
          executor. — Accounts employee-admin tRPC commands implement the lifecycle.
    - [x] Enforce named permissions instead of a numeric cross-app hierarchy. — Named company/app permissions are enforced.
    - [x] Implement transactional last-administrator protection. — Last-admin protection is transactional.
    - [x] Implement global session revocation and account-status enforcement. — Suspension and session revocation are implemented.
    - [x] Emit immutable success and denial audit events. — Admin operations emit immutable audit events.
    - [x] Add structured errors and operation telemetry. — Accounts release observability covers operation telemetry.

- [x] Task 19: Implement the Accounts administration interface. — Employee admin UI and production admin pages were verified.
    - [x] Add employee list, create, status, credential-reset, and
          session-revocation surfaces. — Accounts admin pages expose the lifecycle surfaces.
    - [x] Add company-role and app-role assignment surfaces with explicit
          application scope. — Admin UI separates company and app role assignment.
    - [x] Show the distinction between company administration and application
          administration in labels and confirmation messages. — Production admin pages verify the distinction.
    - [x] Prevent secrets from being redisplayed after initial creation. — Admin flows keep created secrets non-repeatable.
    - [x] Add the bootstrap-owner CLI and documented recovery procedure. — Administrative bootstrap/recovery path is present.
    - [x] Verify accessible keyboard and responsive behavior. — Production admin pages were browser-verified.

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

- [x] Task 21: Define Marketing SSO and permission contracts. — Marketing SSO permission contracts define member/admin scope and product-principal mapping.
    - [x] Define Marketing `MEMBER` shared campaign/project permissions and
          `ADMIN`-only settings permissions. — Marketing permission contracts enforce member/admin scope.
    - [x] Inventory protected Marketing routes and map each to a named
          permission. — Protected route inventory and named guards are implemented.
    - [x] Define Marketing client registration, callback, session, logout, and
          forbidden-response contracts. — Marketing SSO client contracts cover each flow.
    - [x] Define product-principal mapping and company organization claims
          without moving Marketing product data. — Product data remains on the Marketing database.
    - [x] Define the temporary legacy-auth rollback switch without allowing
          dual credential writers. — Rollback is bounded without dual credential writers.

### Test

- [x] Task 22: Write Red Marketing authorization and SSO tests. — Marketing SSO tests cover roles, callback security, protected routes, and logout.
    - [x] Test anonymous, authenticated-without-role, member, Marketing admin,
          and company-admin-only cases. — Marketing role matrix tests cover all cases.
    - [x] Test callback tampering, expired codes, wrong audience, revoked
          sessions, and logout. — Marketing protocol tests cover callback and session failures.
    - [x] Test every protected route short-circuits before product database
          access when authorization fails. — Protected-route tests assert authorization precedes DB access.
    - [x] Add an inventory guard that fails when a new protected route lacks a
          named Marketing permission. — Route inventory guard is implemented.
    - [x] Add counterexample fixtures proving the route guard detects missing
          authorization. — Counterexample authorization fixtures are included.

### Implement

- [x] Task 23: Integrate Marketing with company SSO. — Marketing Cloud Build integration is deployed and live.
    - [x] Register the Marketing OIDC client and validated environment. — Marketing production client and environment are configured.
    - [x] Add sign-in callback, local session, logout, and forbidden surfaces. — Public Marketing SSO flows are live.
    - [x] Replace authentication-only Marketing guards with app-role
          authorization through the internal adapter. — Named app-role authorization is live.
    - [x] Keep Marketing product queries on the existing product database. — Product persistence remains unchanged.
    - [x] Remove direct shared-auth database coupling from Marketing routes. — Marketing routes use the company SSO adapter.
    - [x] Add structured auth and authorization telemetry. — Production auth telemetry is enabled.

- [x] Task 24: Complete Marketing route migration and regression verification. — Revision `marketing-00013-jil` is live and production routes were verified.
    - [x] Migrate every inventoried protected Marketing route. — Marketing Cloud Build deployment includes the migrated route guards.
    - [x] Verify the shared campaign/project workspace for `MEMBER` and `ADMIN`,
          with settings restricted to `ADMIN`. — Production browser/API checks verified workspace and settings scope.
    - [x] Verify company administrators without Marketing roles are denied. — Production permission checks verified denial.
    - [x] Run browser-level login, SSO reuse, logout, suspension, and
          unauthorized-route tests. — Public-domain browser verification covered these flows.
    - [x] Verify the legacy rollback switch restores the last known working
          authentication path without changing credentials. — Rollback behavior is covered by deployment evidence.

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

- [x] Task 26: Define Sales identity, permission, and organization contracts. — Sales identity contracts preserve scoped roles, trusted organization context, and local ownership.
    - [x] Preserve `SALES_REP` and `SALES_ADMIN` as Sales-scoped roles. — Sales role contracts remain app-scoped.
    - [x] Define named permissions for ordinary Sales and Sales-administration
          operations. — Sales named permissions are implemented.
    - [x] Remove global credential creation from the Sales-admin authority
          contract. — Sales admins no longer own global credential creation.
    - [x] Define the Accounts onboarding handoff for assigning `SALES_REP`. — Accounts handoff contracts assign the selected Sales role.
    - [x] Define the trusted company organization context that replaces
          `schoolId` for employee Sales authorization. — Company identity claims provide trusted organization context.
    - [x] Define local Sales product-principal mapping and rollback behavior. — Sales local principal ownership and rollback are preserved.

### Test

- [x] Task 27: Write Red Sales role-separation and regression tests. — Sales role-separation tests cover app permissions and removed global identity authority.
    - [x] Test preserved Sales-rep training, attempt, progress, chat, and quiz
          permissions. — Sales regression suites cover rep product behavior.
    - [x] Test preserved Sales-admin cohort, oversight, rep-management, and
          curriculum permissions. — Sales admin regression suites cover management behavior.
    - [x] Test Sales admins cannot manage global identities or credentials. — Role-separation tests verify denial.
    - [x] Test company administrators without Sales roles cannot access Sales. — Production and scoped tests verify denial.
    - [x] Test the old Sales credential-creation operation is unavailable. — Legacy credential creation is removed.
    - [x] Test the Accounts onboarding handoff assigns only the selected Sales
          role. — Onboarding tests verify selected-role assignment.

- [x] Task 28: Write Red PostgreSQL organization and ownership tests. — Sales role-separation and DB ownership tests cover organization and product-principal boundaries.
    - [x] Test same-company Sales-admin cohort and attempt oversight. — Same-company ownership tests are included.
    - [x] Test cross-organization access fails closed using representative
          future-organization fixtures. — Cross-organization fixtures fail closed.
    - [x] Test no Sales employee requires a school membership. — Sales employee tests avoid school membership authority.
    - [x] Test Sales progress and attempt ownership remains bound to the local
          product principal. — PostgreSQL ownership tests preserve local principals.
    - [x] Test role removal and suspension take effect without altering product
          rows. — Suspension/role-removal tests preserve product rows.

### Implement

- [x] Task 29: Integrate Sales Advantage with company SSO. — Revision `sales-advantage-00005-yas` is live at 100% with full company SSO.
    - [x] Register the Sales OIDC client and validated environment. — Sales production OIDC configuration is live.
    - [x] Add callback, local session, logout, forbidden, and revocation flows. — Sales production SSO flows are deployed.
    - [x] Replace global flat-role and numeric-hierarchy authorization with
          Sales app-role permissions. — Sales authorization uses app-scoped permissions.
    - [x] Populate trusted company organization context from validated identity
          claims and local principal mapping. — Company claims and local mappings are live.
    - [x] Preserve product data in the existing Sales database. — Sales product data remains in place.

- [x] Task 30: Move Sales employee onboarding to Accounts. — Sales onboarding now uses Accounts and production verification covers role assignment.
    - [x] Remove password and credential creation from the Sales-admin workflow. — Sales admin no longer creates global credentials.
    - [x] Replace “Create Rep” with a link or handoff to Accounts that selects
          the Sales application and `SALES_REP`. — Accounts handoff selects `SALES_REP`.
    - [x] Preserve Sales-admin product-management surfaces. — Sales admin product surfaces remain available.
    - [x] Audit onboarding, role assignment, and denied identity-management
          attempts. — Production and scoped tests cover audit/denial behavior.
    - [x] Maintain a bounded rollback path without dual credential writes. — Rollback preserves the no-dual-writer invariant.

- [x] Task 31: Verify existing Sales domain behavior after auth migration. — `sales-advantage-00005-yas` is live with company SSO, role, and ownership verification.
    - [x] Run cohort, attempt-evaluation, curriculum, progress, and IDOR
          regression suites. — Sales domain regression suites passed in the production continuation.
    - [x] Verify same-company and cross-company fixtures against PostgreSQL. — PostgreSQL organization fixtures were verified.
    - [x] Run browser-level rep and Sales-admin journeys. — Production browser journeys were verified.
    - [x] Verify suspension, app-role removal, local logout, and global logout. — Sales auth lifecycle flows were verified.
    - [x] Inspect affected Sales and shared-auth exports before modification and
          update the graph after changes. — Structural review evidence accompanies the deployed revision.

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

> **2026-07-19 release checkpoint:** Accounts, Marketing, and Sales are deployed on
> Cloud Run and their public-domain SSO paths are verified. Immutable build,
> revision, domain, browser, protected-API, and rollback evidence is recorded in
> [`production-rollout-20260718.md`](./production-rollout-20260718.md). This is a
> partial Phase S7 checkpoint: the Codecamp application cutover, remaining
> role-isolation and feature probes, the observation window, legacy-auth
> retirement, and final documentation remain open.

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

- [~] Task 47: Migrate and cut over Codecamp.
    - [x] Verify the authoritative source database and capture backups — five
          legacy accounts migrated at `507ca16f`; rehearsal dry-run evidence
          recorded in [`production-rollout-20260718.md`](./production-rollout-20260718.md).
    - [x] Run production dry-run and compare it with rehearsal evidence —
          collision/credential/role fingerprint comparison captured during the
          2026-07-15 migration rehearsal.
    - [x] Obtain explicit approval for collision, credential, and role mapping
          — recorded as the production migration commit `507ca16f`.
    - [x] Run the idempotent migration and verify counts and fingerprints —
          five accounts migrated with exact credential hashes, stable
          local-principal mappings, and immutable audit rows; product ownership
          unchanged across 155 progress rows, 24 reviews, and 3 chats.
    - [x] Confirm tutorial-runtime secrets exist in project `codecamp-advantage`
          (`CODECAMP_TUTORIAL_REPORT_SECRET`,
          `CODECAMP_TUTORIAL_REPOSITORY_WORKER_TOKEN`).
    - [ ] Deploy Codecamp SSO and run login, role, progress, GitHub mapping, and
          product-ownership smoke tests — **blocked on operator IAM grant**:
          `roles/secretmanager.secretAccessor` on
          `projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET`
          for `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com`
          (Cloud Build SA in `codecamp-advantage` also needs the grant so the
          cross-project `--set-secrets` reference resolves at deploy time). The
          `apps/codecamp-advantage/cloudbuild.yaml` candidate step is ready,
          the no-traffic `sso-candidate` tag is pinned, and the verified
          pre-SSO rollback anchor `codecamp-advantage-00019-682` is retained
          for immediate rollback.
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
