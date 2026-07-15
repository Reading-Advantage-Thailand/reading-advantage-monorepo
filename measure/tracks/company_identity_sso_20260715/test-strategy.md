# Phase S1 Test Strategy: Company Identity Boundary

**Track:** `company_identity_sso_20260715`
**Story:** S1 — Establish Company Identity Boundary
**Applies to:** Tasks 2–7; Task 1's approved boundary is the test oracle
**Runtime under test:** local `postgres:16-alpine` on `127.0.0.1:5432`

## 1. Purpose and proof standard

Phase S1 is complete only when executable tests prove that company identity is
a separate PostgreSQL and code ownership boundary. A test that merely finds a
string in a source file, migration, config, or document is not proof of schema
behavior, database isolation, privileges, or an import boundary. Source-text
checks may supplement a behavioral test, but they cannot satisfy an S1
acceptance criterion by themselves.

The Red commit contains tests, fixtures, and Measure documentation only. Red is
valid only when the named assertion fails because the required contract,
migration, constraint, or analyzer behavior is absent. Missing test files,
TypeScript syntax errors, missing dependencies, an unreachable database, and a
skipped suite are setup failures, not acceptable Red evidence. Green requires
the same commands to exit zero without changing, weakening, filtering, or
skipping the Red assertions.

The following anti-patterns are explicit phase gates:

- A4: a suite with zero executed assertions is not Green. Each command records
  non-zero test and assertion counts.
- A5/A6: plan or registry claims must match the recorded command exit status;
  “all pass” is forbidden while any required command is Red or blocked.
- A7: no broad path, filename, generated-file, or “test” exclusion may hide a
  real architecture violation. Exceptions are exact resolved files.
- A10: structural changes require generated-fact regeneration and a clean
  generated diff before phase acceptance.
- A14: every detector command must be executable and its exit code preserved;
  no `|| true`, ignored parser error, or invalid ripgrep option is allowed.

## 2. Test surfaces

Tests should be colocated under
`packages/db/src/company-identity/__tests__/` unless the owning dependency
publishes another canonical location. The planned surfaces are:

| Test file | Kind | Required proof |
|---|---|---|
| `contracts.test.ts` | Unit | Execute the exported Zod contracts with table-driven valid and invalid values for accounts, normalized usernames, statuses, credentials, organizations, memberships, company roles, application keys, app-role grants, sessions, OIDC clients/codes, audit metadata, and idempotency keys. |
| `environment.test.ts` | Unit | Execute the exported environment parser and client-factory seam. Prove pooled, direct, and test-admin URLs are distinct, required in the appropriate runtime, and cannot silently fall back to product `DATABASE_URL`. Also prove canonical HTTPS issuer validation, host-only cookie naming, production `Secure`/`HttpOnly`/`SameSite` requirements, service-credential minimum strength, and secret-safe validation errors. |
| `schema-metadata.test.ts` | Unit | Inspect actual Drizzle table objects with Drizzle metadata APIs. Prove primary keys, foreign keys, unique constraints, status checks, expiry columns/checks, and indexes exist. Do not inspect schema source text. |
| `migration-journal.test.ts` | Unit | Parse the dedicated identity journal as data. Prove indices are contiguous, `when` values are strictly increasing, SQL files exist exactly once, and the journal/directory are disjoint from `packages/db/drizzle/`. |
| `migration-fresh.integration.test.ts` | PostgreSQL | Apply the identity migrator to an empty scratch database, query `pg_catalog`/`information_schema`, compare the exact identity-table allowlist, and prove no education, licensing, or product table exists. |
| `migration-upgrade.integration.test.ts` | PostgreSQL | Apply the checked-in prior identity migration prefix with the real Drizzle migrator, seed a sentinel account/organization, apply the current journal, and prove data, ledger order, new constraints, and a second migrate call are correct. A hand-written lookalike schema is not an upgrade fixture. |
| `constraints.integration.test.ts` | PostgreSQL | Execute inserts/updates that exercise normalized-username uniqueness, membership and role FKs, one grant per account/application/role, valid status values, expiry invariants, organization scoping, and idempotency uniqueness. Assert PostgreSQL SQLSTATE/constraint name, not only “throws”. |
| `privileges-audit.integration.test.ts` | PostgreSQL | Authenticate as the scratch runtime login role and prove required DML works, DDL is denied, and audit `UPDATE`/`DELETE` are denied while insert/select work. Authenticate as the direct migration login role and prove migration/doctor operations work. |
| `connection-topology.integration.test.ts` | PostgreSQL/PgBouncer | Connect with the runtime client and runtime credentials through `:6432`, and with the migration client and migration credentials through `:5432`. Assert `current_user`, `current_database()`, connection mode, allowed DML/DDL, and wrong-role/wrong-database rejection. |
| `bootstrap.integration.test.ts` | PostgreSQL | Invoke the real bootstrap primitive twice. Prove one stable internal organization and exactly one each of `marketing`, `sales`, and `codecamp`, with unchanged IDs and no duplicate grants or audit rows for an idempotent replay. |
| `local-bootstrap.integration.test.ts` | PostgreSQL | Invoke the fresh-volume/local existing-volume database bootstrap twice against the local cluster. Prove the stable `company_identity` database exists, existing product databases/data remain untouched, and no fixed shared test database is required. |
| `product-isolation.integration.test.ts` | PostgreSQL | Create separate product and identity scratch databases, run the real product and identity migrators against their intended targets, and compare both catalogs and migration ledgers. Prove neither migrator writes its tables or ledger entries into the other database. |
| `secret-persistence.integration.test.ts` | PostgreSQL | Persist sessions and authorization codes through the real primitives. Prove only fixed-length hashes are stored and uniquely indexed, raw submitted secrets are absent from every text/JSON column, expiry is enforced, and schema/catalog inspection exposes no raw-token or raw-code column. |
| `rollback.integration.test.ts` | PostgreSQL | Back up the prior-prefix database, apply the upgrade, restore the backup into another scratch database, and prove the prior ledger, sentinel data, and schema are restored. This is restore evidence, not a fabricated down migration. |
| Architecture-enforcement fixture suite | AST integration | Detect product-app access to the identity schema/client/environment through direct, aliased, barrel, re-exported, and static dynamic imports, plus direct Drizzle/Postgres construction. Allow only the exact approved PostgreSQL identity-adapter root and the public SSO/auth adapter. |
| `boundary-exports.test.ts` | Runtime module integration | Import the published product schema and product client entrypoints and prove identity tables/clients are not exported there; import the dedicated identity subpath and prove its intended exports are available. |
| Backend `contracts.test.ts` | Unit | Execute every company-identity repository and capability Zod input/output contract and declared structured-error shape. |
| Backend `authorization.test.ts` | Unit | Execute membership and app-audience policy: inactive membership denies, `COMPANY_ADMIN` grants no product role, `SALES_ADMIN` grants no identity authority, application claims contain only that audience's roles, and legacy numeric role helpers are unreachable. |
| Backend `executor.test.ts` | Unit | Execute the accepted kernel ordering for authentication, membership resolution, authorization, transaction, handler, audit, and structured errors. Prove denied requests never reach the handler and audit/transaction failures roll back. |
| Backend `postgres-adapter.integration.test.ts` | PostgreSQL | Execute the repository port through the approved PostgreSQL adapter, including idempotent writes, transaction rollback, membership-scoped grants, session/code hash persistence, audit failure, and stable error mapping. |

### Contract counterexample matrix

At minimum, contract tests reject empty/whitespace usernames, normalization
collisions, overlength values, unknown statuses, school/customer organization
types, unknown company roles, malformed application keys, wildcard redirect
URIs, cross-application role keys, missing expirations, invalid time ordering,
and audit metadata containing password/hash/token/code/secret fields. Audit
metadata cases include nested objects, arrays, mixed casing, and compound keys
such as `passwordHash` and `authorizationCode`; the contract accepts only an
operation-specific allowlist rather than relying on a recursive denylist. Each
row has a named expected issue path or stable error code;
`safeParse(...).success === false` without checking the intended issue is too
weak.

### Architecture counterexample fixtures

Positive fixtures must include:

1. Marketing importing the identity client directly.
2. Sales importing an identity schema through a local barrel alias.
3. Codecamp re-exporting an identity schema and consuming the re-export.
4. An app route using a static dynamic import of the identity client.
5. An app constructing `postgres()` or Drizzle from
   `COMPANY_AUTH_DATABASE_URL`.
6. A transport handler importing the approved PostgreSQL adapter itself.
7. Identity tables added to the product schema barrel, product migration
   config, or education `TenantDB` registry.

Negative fixtures must include the exact backend PostgreSQL identity-adapter
root importing the dedicated identity client/schema, a product app importing
only a fixture-only public company-auth port, and `packages/db` identity
migrations importing low-level identity primitives. The concrete OIDC/SSO
client adapter remains S2 work. Assertions identify rule ID, fixture path, and
resolved target. The fixture directory is not globally exempt: the analyzer
must analyze fixture contents through its explicit fixture API.

## 3. Scratch PostgreSQL harness

The shared helper `withCompanyIdentityScratchDatabase()` is the only scratch
database lifecycle used by S1 integration tests.

1. Require `COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL`; never fall back to
   `DATABASE_URL`, `DIRECT_DATABASE_URL`, or a product URL.
2. Parse the URL before connecting. Host must be `127.0.0.1`, `localhost`, or
   `::1`, port must be `5432`, and database must be `postgres`. Any other target
   fails before DDL.
3. Connect with `max: 1`, query `current_database()` and
   `current_setting('server_version_num')`, and require database `postgres` and
   PostgreSQL major version 16.
4. Create a quoted, identifier-validated database named
   `company_identity_test_<pid>_<nonce>` (maximum 63 bytes). Never interpolate
   an unvalidated environment value into SQL.
5. Derive scratch pooled/direct URLs by replacing only the URL pathname. The
   migration and doctor paths use the direct `:5432` URL; the runtime path uses
   PgBouncer `:6432` and is verified by the connection-topology suite.
6. Create uniquely suffixed `LOGIN` runtime and migration roles with generated
   per-run passwords. Connect as those roles rather than relying only on
   `SET ROLE`; assert `current_user` and database identity on both paths. The
   credentials live only in process memory and never enter logs or evidence.
7. Give each test a fresh database or restore point. No test depends on order
   or data left by another test, and concurrent workers cannot share a name.
8. In `finally`, close every scratch client first, reconnect through the admin
   database, terminate remaining sessions selected by exact database name,
   drop the scratch database, drop scratch roles, and close the admin client.
   Cleanup failure fails the suite and reports the retained database name.
9. Install process-signal cleanup for interrupted local runs. A subsequent
   preflight also lists stale `company_identity_test_%` databases and fails
   with a documented cleanup command; it does not silently reuse or delete
   unknown databases.

The persistent local bootstrap creates `company_identity` only. Integration
tests always create unique scratch databases from the `postgres` admin
database; there is no shared `company_identity_test` database whose state can
leak between suites.

The existing `ledger-doctor.test.ts` and `stale-ledger.test.ts` are useful
references for real Drizzle migrations, but their `describe.skip` behavior and
attempt to drop a database from a scratch connection must not be copied.
Missing configuration is a hard failure for the S1 PostgreSQL command.

## 4. Exact Red and Green commands

### Infrastructure preflight

```bash
pnpm db:start
docker compose exec -T postgres pg_isready -U postgres -d postgres
docker compose exec -T postgres psql -U postgres -d postgres -v ON_ERROR_STOP=1 -tAc "SHOW server_version_num;"
export COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:5432/postgres'
```

The version command must return a value from `160000` through `169999`. The
admin variable is intentionally explicit and loopback-only.

### Task 3 Red, then Green

After the Red tests and fixtures exist:

```bash
CI=true pnpm --filter @reading-advantage/db exec vitest run \
  src/company-identity/__tests__/contracts.test.ts \
  src/company-identity/__tests__/environment.test.ts \
  src/company-identity/__tests__/schema-metadata.test.ts \
  src/company-identity/__tests__/migration-journal.test.ts \
  src/company-identity/__tests__/boundary-exports.test.ts
```

Red must name absent/rejected contract or export behavior. Run the identical
command after implementation for Green.

The architecture fixture command becomes mandatory only after the dependency
gate in section 5 is accepted:

```bash
CI=true pnpm vitest run packages/architecture-enforcement/src/__tests__
pnpm architecture:check
```

### Task 4 Red, then Green

```bash
CI=true \
COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL="$COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL" \
pnpm --filter @reading-advantage/db exec vitest run \
  src/company-identity/__tests__/migration-fresh.integration.test.ts \
  src/company-identity/__tests__/migration-upgrade.integration.test.ts \
  src/company-identity/__tests__/constraints.integration.test.ts \
  src/company-identity/__tests__/privileges-audit.integration.test.ts \
  src/company-identity/__tests__/connection-topology.integration.test.ts \
  src/company-identity/__tests__/bootstrap.integration.test.ts \
  src/company-identity/__tests__/local-bootstrap.integration.test.ts \
  src/company-identity/__tests__/product-isolation.integration.test.ts \
  src/company-identity/__tests__/secret-persistence.integration.test.ts \
  src/company-identity/__tests__/rollback.integration.test.ts
```

Red must reach PostgreSQL and fail on a named missing table, constraint,
privilege, ledger, bootstrap, or restore invariant. Run the identical command
for Green. A zero-test result or skipped integration file fails acceptance.

### Task 6 Red, then Green

After both dependency gates in section 5 publish accepted evidence, add and
run the backend suites before implementing the adapter or capabilities:

```bash
CI=true pnpm --filter @reading-advantage/backend --fail-if-no-match exec vitest run \
  src/modules/company-identity/__tests__/contracts.test.ts \
  src/modules/company-identity/__tests__/authorization.test.ts \
  src/modules/company-identity/__tests__/executor.test.ts
CI=true \
COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL="$COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL" \
pnpm --filter @reading-advantage/backend --fail-if-no-match exec vitest run \
  src/modules/company-identity/__tests__/postgres-adapter.integration.test.ts
```

Red must execute the accepted kernel and fail at a named absent adapter,
policy, ordering, transaction, audit, idempotency, or structured-error
behavior. The same commands must be Green without weakened assertions.

### Phase S1 Green gate

Before this gate, `@vitest/coverage-v8` at the exact Vitest-compatible version
must be declared in both DB and backend test packages. Coverage is mandatory;
an absent provider fails setup rather than making coverage optional.

```bash
CI=true COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL="$COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL" \
  pnpm --filter @reading-advantage/db test
CI=true COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL="$COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL" \
  pnpm --filter @reading-advantage/db exec vitest run --coverage
pnpm --filter @reading-advantage/db check-types
pnpm --filter @reading-advantage/db lint
pnpm --filter @reading-advantage/db build
CI=true pnpm --filter @reading-advantage/auth test
pnpm --filter @reading-advantage/auth check-types
pnpm --filter @reading-advantage/auth lint
pnpm --filter @reading-advantage/auth build
pnpm architecture:check
CI=true COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL="$COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL" \
  pnpm --filter @reading-advantage/backend --fail-if-no-match test
CI=true COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL="$COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL" \
  pnpm --filter @reading-advantage/backend --fail-if-no-match exec vitest run --coverage
pnpm --filter @reading-advantage/backend --fail-if-no-match check-types
pnpm --filter @reading-advantage/backend --fail-if-no-match lint
pnpm --filter @reading-advantage/backend --fail-if-no-match build
COMPANY_AUTH_DIRECT_DATABASE_URL="$COMPANY_AUTH_DIRECT_DATABASE_URL" \
  pnpm --filter @reading-advantage/db company-identity:doctor
bash measure/generate.sh
git diff --exit-code -- measure/generated
test -z "$(git ls-files --others --exclude-standard -- measure/generated)"
bash measure/doctor.sh
```

Statements, branches, functions, and lines for new company-identity production
modules in both DB and backend must each be at least 80%. Integration-only glue
may be excluded only by an exact reviewed path; schema, environment, client,
migration, doctor, bootstrap, repository, adapter, authorization, executor,
and capability primitives cannot be excluded. Existing package-wide coverage
debt does not lower the new-code threshold.

Each package's Vitest coverage configuration must set an exact
company-identity production-file `include`, list every reviewed exclusion by
exact path, and configure statements, branches, functions, and lines thresholds
to 80. The coverage commands must exit nonzero when any threshold is missed.
Unimported production files remain in the denominator through the explicit
`include`; relying on files reached incidentally by tests is forbidden.

## 5. Hard dependency behavior

At this strategy's baseline, neither dependency has published accepted gate
evidence. This is not permission to create a temporary analyzer, a parallel
backend executor, or business logic in `packages/db`, `packages/domain`, or an
app route.

- Tasks 2–5 may implement the approved identity contracts, dedicated schema,
  migrations, scratch harness, clients, doctor, bootstrap primitive, and
  repository port/database primitives within `@reading-advantage/db`.
- Task 6's production PostgreSQL adapter cannot start until
  `backend_architecture_enforcement_20260713` publishes its accepted Gate 1
  baseline/hash and `pnpm architecture:check` is Green with the identity
  positive/negative fixtures.
- Task 6's capability descriptors/executor integration cannot start until
  `backend_capability_kernel_20260713` Task 1 scaffold is explicitly accepted
  and its stable public descriptor/executor contracts are published.
- Use `--fail-if-no-match` for every backend test, coverage, lint, typecheck,
  and build command so a missing package is a failure, not a vacuous filtered
  success.
- If a dependency is absent or unaccepted, record Task 6 as blocked with the
  missing gate and continue only independent Tasks 2–5. Do not skip Task 6
  tests and report the phase Green. Phase S1 itself remains incomplete until
  both gates and the Task 6 tests pass.
- Any required organization-tenancy change to the canonical kernel stops S1
  implementation for explicit architecture approval; tests must not encode a
  speculative generic company tenancy mode.

## 6. Migration and constraint assertions

Fresh migration tests query PostgreSQL for an exact, reviewed allowlist of
identity tables plus Drizzle's own ledger table. The forbidden set includes,
at minimum, schools, classrooms, students, teachers, licenses, entitlements,
billing, campaigns, sales attempts/progress, Codecamp curriculum/submissions,
and education progress. A separate product-isolation suite runs the real
product and identity migrators into different scratch databases, then proves
both catalogs and ledgers are disjoint. Source-directory comparison alone is
not sufficient.

Upgrade tests prove:

- the prior journal prefix is applied by the real migrator;
- existing stable account/organization IDs and data survive;
- every new journal timestamp is strictly above the prior ledger ceiling;
- the current migration applies exactly once;
- a second migrate invocation changes neither ledger nor schema fingerprint;
- the identity doctor returns clean on the resulting database and reports
  divergence after a controlled missing-ledger/sentinel mutation.

Constraint tests assert both allowed and denied rows. Required denial cases
include normalized username duplicates, unknown statuses/role keys, missing
organization membership, cross-organization grants, duplicate app-role grants,
orphan sessions/codes/audit actors where the contract requires an actor, and
invalid creation/expiry order. Runtime-role DDL and audit mutation must produce
`42501`; uniqueness and FK assertions must name their reviewed constraint and
expected SQLSTATE.

Secret-persistence tests submit known raw session tokens and authorization
codes through real persistence primitives, then inspect every text and JSON
column for those sentinel values. They also inspect `pg_catalog` to prove the
schema contains hash-only columns, no raw-token/raw-code columns, fixed-length
hash checks, uniqueness, and expiry checks. Merely asserting that application
code calls a hash function is insufficient.

Backend authorization tests execute named policies rather than inspecting
role constants. They prove inactive membership denies access,
`COMPANY_ADMIN` adds no product role, `SALES_ADMIN` adds no identity-management
authority, application claims contain only the registered audience's roles,
and the legacy numeric role hierarchy is never an authorization dependency.

Local bootstrap evidence runs the fresh/existing-volume primitive twice and
proves `company_identity` is present without altering product databases. Test
scratch databases remain per-run and are never created as shared persistent
bootstrap state.

## 7. Evidence and acceptance

For every Red/Green cycle, retain the exact command, exit code, executed
test/assertion counts, and the first intended Red failure or complete Green
summary in the task note. Database evidence also records PostgreSQL version,
scratch database name, journal maximum, schema fingerprint, and cleanup result;
never record connection credentials.

Phase acceptance requires all of the following:

1. Every S1 contract, migration, constraint, privilege, connection-topology,
   product-isolation, secret-persistence, bootstrap, rollback, and boundary
   assertion has executed and passed.
2. Scratch cleanup leaves zero databases matching the names created by that
   run and zero scratch roles.
3. The identity database contains only the reviewed identity allowlist and the
   product databases contain no identity migration/table.
4. Architecture fixtures catch every positive and allow every negative, with
   no wildcard exemption or parser/config error converted to Green.
5. Both hard dependency gates have accepted evidence; Task 6 backend contract,
   authorization, executor, and PostgreSQL-adapter suites all execute and pass.
6. New company-identity DB and backend code meets all four 80% coverage
   thresholds with a declared compatible coverage provider.
7. Runtime and migration clients authenticate through their intended pooled
   and direct paths as distinct least-privilege database roles.
8. Session/code persistence is hash-only and the recursive audit-metadata
   contract rejects all nested or compound secret fields.
9. DB/auth/backend tests, coverage, lint, typecheck, builds, architecture
   check, status-aware generation drift check, identity database doctor, and
   Measure doctor are Green.
10. Claims in `plan.md`, registry notes, and phase verification match the
   recorded command evidence exactly.
