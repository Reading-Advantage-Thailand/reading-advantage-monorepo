# Company Identity Boundary Contract

**Track:** `company_identity_sso_20260715`
**Phase:** S1 — Establish Company Identity Boundary
**Task:** 1 — Define the company identity ownership and tenancy contracts
**Baseline:** `58a02180`

## Decision

Company employee identity is a separate bounded context backed by a separate
logical PostgreSQL database named `company_identity`. It may share the existing
PostgreSQL 16 server and PgBouncer deployment, but it has its own connection
secrets, Drizzle schema, migration journal, database roles, backup, doctor, and
deployment gate.

The existing product databases remain authoritative for product data. They do
not become replicas of the identity database and they never own employee
credentials.

## Ownership Matrix

| Data or behavior | Authoritative owner | Explicit exclusions |
|---|---|---|
| Employee account identifier, normalized username, display name, status | Company identity database | Product `users` rows are not the company account |
| Password hash and credential-upgrade state | Company identity database | Never copied to Marketing or Sales; retained in Codecamp only until migration retirement |
| Accounts SSO sessions, application sessions registered with Accounts, authorization codes, client registrations | Company identity database | Product databases do not issue company credentials |
| Internal-company organization and membership | Company identity database | Not a school, customer, license holder, or billing account |
| Company roles | Company identity database | No implicit product permission |
| Application registration and app-scoped role assignments | Company identity database | No global numeric role hierarchy |
| Identity security audit events | Company identity database | No password, hash, raw token, code, or secret metadata |
| Marketing campaigns, settings, video projects, and other Marketing state | Marketing product database | No identity credential columns |
| Sales curriculum, attempts, progress, conversations, and cohort state | Sales product database | `schoolId` is not company identity authority |
| Codecamp curriculum, progress, submissions, GitHub mappings, reviews, and local user foreign keys | Codecamp product database | Product data is not migrated into company identity |
| Schools, classrooms, students, teachers, licenses, entitlements, billing, and education progress | Existing education databases | Entirely outside this track |

## Runtime Boundary

The required dependency direction is:

```text
Marketing / Sales / Codecamp
        |
        v
company SSO client adapter
        |
        v
Accounts protocol and thin UI
        |
        v
company-identity backend capabilities
        |
        v
identity repository interface
        |
        v
PostgreSQL identity adapter
        |
        v
company_identity database
```

Rules:

1. `apps/accounts` owns transport and UI only. It does not implement account,
   authorization, migration, or audit business rules in route handlers.
2. `packages/backend` owns company-identity capabilities and policies after the
   backend capability kernel publishes its accepted package scaffold and
   executor API.
3. `packages/db` owns the company-identity Drizzle schema, migrations, client
   factories, test helpers, and low-level adapter primitives.
4. Inside `packages/db`, identity client/schema imports are permitted only in
   the identity module graph, exact migration/doctor/bootstrap entrypoints,
   and named bounded tests. The architecture baseline enumerates actual files;
   it does not exempt `packages/db/**`. Outside those DB-owned files, only the
   exact approved backend PostgreSQL adapter may import the company-identity
   client or schema in production code.
5. Product applications use the company SSO/auth adapter. They may not import
   the identity schema, client, Drizzle, or identity connection environment
   variables.
6. The current `packages/db/src/client.ts` singleton remains the product
   `DATABASE_URL` client and is not widened to select databases dynamically.
7. There are no cross-database joins, foreign keys, or distributed
   transactions. Cross-boundary operations use stable identifiers,
   idempotency, and compensating/rollback procedures.

## Planned Package Layout

The precise public exports remain subject to the Backend Platform Gate 1
ownership map, but S1 reserves these ownership roots:

```text
packages/db/
  company-identity/
    drizzle.config.ts
    drizzle/
  src/company-identity/
    schema/
    client.ts
    privileged.ts
    migration.ts
    doctor.ts
    testing.ts

packages/backend/                       # created by capability-kernel Task 1
  src/modules/company-identity/
    contracts.ts
    capabilities/
    permissions.ts
    errors.ts
    ports/
    adapters/postgres/

apps/accounts/
  app/                                  # thin protocol/UI bindings
```

The identity database code stays inside `@reading-advantage/db` rather than
creating a second database package. This preserves the repository rule that
Drizzle schemas, migrations, and low-level table access belong to
`packages/db` while still providing a separate physical migration and runtime
boundary.

## Database and Connection Contract

| Concern | Environment variable | Local target | Purpose |
|---|---|---|---|
| Runtime queries | `COMPANY_AUTH_DATABASE_URL` | PgBouncer `:6432/company_identity` | Short request transactions |
| Migrations, ledger doctor, privileged audit maintenance | `COMPANY_AUTH_DIRECT_DATABASE_URL` | PostgreSQL `:5432/company_identity` | Session-mode operations |
| Integration-test administration | `COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL` | PostgreSQL `:5432/postgres` | Creates and drops isolated scratch databases |

Requirements:

- `docker/init-db.sh` will create `company_identity` and
  `company_identity_test` for fresh local volumes.
- Existing volumes receive a documented idempotent database-creation command;
  implementation must not require deleting user data volumes.
- The identity Drizzle config reads only the `COMPANY_AUTH_*` variables and
  writes only `packages/db/company-identity/drizzle/`.
- Integration suites require an explicit loopback-only admin URL, create a
  unique `company_identity_test_<pid>_<nonce>` database, close and terminate
  scratch connections, and drop the database from the admin connection in a
  `finally` block. Missing test configuration is a failed phase gate, not
  passing skip evidence.
- The identity database may use Drizzle's normal `drizzle` ledger schema
  because it is a separate logical database. It must never share the product
  migration journal or migration directory.
- Runtime and migration database roles are separate. Runtime may execute
  required DML but not DDL; the migration role owns DDL and repair operations.
- Identity audit rows are append-only for the runtime role. Any future
  retention operation uses the direct privileged boundary and an advisory
  lock.
- All migrations use the direct connection. Product or Accounts request paths
  use the pooled connection.
- Migration journal timestamps are strictly monotonic and covered by a
  dedicated integrity test.

## Company Organization Context

The first release contains exactly one bootstrapped internal organization, but
organization identity is not hardcoded:

- Organizations have stable opaque IDs and an explicit `internal_company` type.
- An employee account gains company access through an active membership.
- Company roles are separate assignments keyed by membership and role.
  `EMPLOYEE` is the baseline role and `COMPANY_ADMIN` is an additive
  identity-administration grant.
- Application roles are separate grants keyed by active membership,
  application, and role key. Authorization requires both active membership
  and active app grant; a grant cannot survive membership removal as
  independent authority.
- The application registry uses stable keys such as `marketing`, `sales`, and
  `codecamp`. Adding a future company application is data plus policy, not a
  new column on the account table.
- Future employee-facing B2B applications use the same application/role
  mechanism without account-table changes. Customer principals, customer
  organizations, licensing, and onboarding remain deferred.
- `COMPANY_ADMIN` may manage identities and grants but has no automatic
  Marketing, Sales, or Codecamp access.
- `SALES_ADMIN` is a Sales product role. It never implies
  `COMPANY_ADMIN` and cannot manage credentials or global sessions.

The trusted backend identity context is conceptually:

```text
accountId
sessionId
organizationId
companyRoles
applicationId
applicationRoles
accountStatus
```

The organization and application are resolved from authenticated server state
and registered client configuration, never from an unverified frontend
identifier.

## Relationship to School Tenancy

Company organization context is not added to `Tenant.schoolId` and is not
implemented by overloading `TenantDB`:

- `TenantDB` remains the education/school guard.
- Company identity tables live in another database and never enter the
  education tenant registry.
- Initial Accounts capabilities can use the backend kernel's explicit global
  mode for bootstrap operations; ordinary employee operations must resolve the
  organization from authenticated membership and enforce a named organization
  policy.
- Product apps keep local product principals. Later app-integration phases add
  a unique `companyAccountId` mapping and trusted organization identifier
  without replacing existing product primary keys.
- The first release does not add a generic `organization` tenancy mode to the
  capability kernel. A future multi-company product-data feature must propose
  that platform change with its own cross-organization tests. This track does
  not preclude it because organization IDs and memberships are already stable.

This is compatible with the canonical backend platform contract: identity
bootstrap is explicit global access, authenticated membership is resolved by
the auth port, authorization fails closed, and no frontend tenant ID becomes
authority.

## Local Product Principal Contract

Each participating product retains its current local user/principal ID so
existing foreign keys remain valid. Integration phases add a mapping with these
invariants:

- one local product principal maps to at most one company account;
- one company account maps to at most one local principal per application;
- the mapping stores opaque IDs only and has no cross-database foreign key;
- app-role authority remains in company identity;
- product ownership remains attached to the existing local principal;
- disabling or removing an app role does not delete product history;
- Codecamp migration is idempotent and preserves the original local user ID.

## Security Invariants

- Identity credentials, sessions, authorization codes, and audit state are
  unavailable through product database clients.
- Passwords use Argon2id; compatible migrated bcrypt hashes are verification
  only and rehash after a successful login.
- Raw session tokens and authorization codes are never persisted.
- Account status and global session revocation are authoritative in Accounts.
- Role evaluation is named and app-scoped; numeric comparison across app roles
  is prohibited.
- `companyRoles` is a validated set of named membership assignments, not a
  singular role column. `applicationRoles` is filtered to the registered
  application audience.
- The legacy `ROLE_HIERARCHY`, `roleAtLeast`, `requireRole`, and `hasRole`
  exports are not used for company authorization. At the current baseline,
  education `ADMIN` and `SALES_ADMIN` both have numeric level 3, which can
  cause cross-application privilege bleed when a minimum-role comparison is
  used.
- Account and role changes are transactional, idempotent where retryable, and
  immutably audited with allowlisted metadata.
- Exact architecture counterexamples must prove that apps cannot reach the
  identity database directly.

## Dependency Gates

| Work | Gate |
|---|---|
| S1 contract and identity schema/test design | May proceed now |
| Identity schema, migrations, local PostgreSQL harness, and isolated client factories | May proceed within `packages/db`, subject to existing package rules |
| Production identity PostgreSQL adapter under `packages/backend` | Requires accepted Backend Architecture Enforcement Gate 1 ownership map and baseline |
| Company-identity capability descriptors and executor integration | Requires accepted Backend Capability Kernel Task 1 scaffold and public contract |
| Accounts protocol routes and OIDC behavior | S2; requires the S1 adapter/capability boundary |
| Marketing, Sales, and Codecamp product-principal changes | S4–S6 only |

If either backend dependency is not accepted when S1 reaches its adapter task,
the implementation must stop at the repository port and database primitives.
It must not place business logic in `packages/db`, `packages/domain`,
`apps/accounts`, or a temporary parallel executor.

## Strategy Reconciliation

Three independent read-only strategy reviews were run from baseline
`58a02180fb632e5800cbfaf0020f61f01063674a`:

- Database review confirmed that the product client, Drizzle config, migration
  doctor, sentinels, and barrels are all hard-wired to the product schema and
  cannot be reused for the identity database.
- Auth/security review confirmed that password hashing, token hashing, bounded
  sessions, rate-limit behavior, and audit semantics are useful reference
  behavior, but their current repositories and contexts are coupled to product
  tables.
- Backend review confirmed that `packages/backend` is absent and its scaffold,
  executor, and architecture allowlist are hard dependencies for S1 Task 6.

The backend and auth reviewers recommended adding a generic `company` tenancy
mode to the kernel now. This contract intentionally does not do that in the
first release because the approved scope contains one internal company and
explicitly excludes multi-company administration and customer/B2B onboarding.
The internal organization is still first-class data, every ordinary identity
operation resolves it from authenticated membership, and cross-organization
fixtures are required before app integration. A future feature that stores
multi-company product data must add the generic kernel mode before exposing
that data. This preserves the expansion path without implementing an unused
platform abstraction in S1.

## Rejected Alternatives

1. **Add employee columns and roles to the existing product `users` table.**
   Rejected because it preserves the current collision between school,
   licensing, company, and product responsibilities.
2. **Let every app connect directly to the company identity database.**
   Rejected because it couples application code to credential/session storage
   and makes the security boundary unenforceable.
3. **Create a second general-purpose database package.**
   Rejected because repository policy assigns Drizzle ownership to
   `@reading-advantage/db`; a separate migration/client subpath is sufficient.
4. **Copy Codecamp product rows into identity.**
   Rejected because identity needs only a stable local-principal mapping.
5. **Automatically grant app-admin rights to `COMPANY_ADMIN`.**
   Rejected because identity administration and product-data access are
   independent trust boundaries.
6. **Extend the platform with generic multi-company tenancy now.**
   Rejected as premature. Stable organization IDs and grants preserve the
   expansion path without implementing customer/B2B behavior in this track.

## Task 1 Acceptance

- [x] Identity, product, and education ownership is explicit.
- [x] The separate logical database, secrets, roles, migrations, and test
      database are defined.
- [x] The Accounts → capability → repository → adapter direction is explicit.
- [x] Trusted organization context is separate from `schoolId` and
      `TenantDB`.
- [x] Company and app roles are independent, including
      `COMPANY_ADMIN` versus `SALES_ADMIN`.
- [x] Future application registration does not require an account-table
      redesign.
- [x] Backend architecture and capability-kernel dependencies are classified.
- [x] Schools, licenses, customers, billing, and product data remain excluded.
