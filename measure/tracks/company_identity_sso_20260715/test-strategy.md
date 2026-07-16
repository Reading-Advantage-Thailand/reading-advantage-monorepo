# Phase S1 Test Strategy: Company Identity Boundary

**Track:** `company_identity_sso_20260715`
**Story:** S1 — Establish Company Identity Boundary
**Applies to:** Tasks 2–7; Task 1's approved boundary is the test oracle
**Runtime under test:** local `postgres:16-alpine` on `127.0.0.1:5432`
**Strategy revision:** 2026-07-16 (revalidation; tasks 1–5 complete, task 6 still `[~]`)

## 0. Baseline validation and current phase state

The orchestrator-supplied baseline SHA `194dc6a8c5dfe54c2d0c68e916038d891dc3a795`
**is not a commit in this repository** — `git rev-parse --verify` and
`git cat-file -t` both reject it. The only commit whose object name shares the
`194dc6a8` prefix is `194dc6a8e8cb879e8ce5ca12ec49277d0ab0e355` ("chore(measure):
mark identity schema contract task complete", 2026-07-15). That commit is the
mid-phase Task 2 close-out chore and is **not** an immutable Red baseline; it
lies between the Task 2 contract (b9d81557) and the Task 3 Red tests (60ad9d28).

This strategy therefore rejects the supplied SHA as a non-truthful immutable
baseline and substitutes the following truthful Phase S1 anchor:

- **Phase S1 contract-tier Red baseline (truthful):** the tree immediately
  preceding the Task 3 Red contracts commit `60ad9d28`. The parent of the
  Red commit is the `chore(measure): start identity contract Red tests` chore
  `8ae4999549b72ae1d90552cc643590b9aac10eb2`, whose own parent is the Task 2
  schema contract commit `b9d81557`. The truthful Red baseline tree for the
  contract-tier cycle is therefore `b9d81557` (post-contract, pre-Red).
- **Phase S1 PostgreSQL-tier Red baseline (truthful):** the tree immediately
  preceding the Task 4 Red PostgreSQL commit `ba033761`. The parent is the
  `chore(measure): start identity PostgreSQL Red tests` chore
  `92054332f162678882ea318ba0fdc820ed502efb`, whose own parent is the Task 3
  Red contracts commit `60ad9d28`. The truthful Red baseline tree for the
  PostgreSQL-tier cycle is therefore `60ad9d28` (post-Red-contracts, pre-Red-
  PostgreSQL).
- **Phase S1 implementation baseline (truthful):** the tree immediately
  preceding the Task 5 implementation commit `43c16457`, which is
  `b54fb292` ("chore(measure): complete company identity Task 4"), itself the
  child of `ba033761`.
- **Current HEAD:** `304e2029f13fe655913bfaad4c4b95b1ab16828a`
  ("chore(repo): snapshot workspace state", 2026-07-16).
- **Current Phase S1 task state:** Tasks 1–5 `[x]` (boundary 7516c48b, schema
  contract b9d81557, Red contracts 60ad9d28, Red PostgreSQL ba033761,
  implementation 43c16457). Task 6 `[~]` (only a `chore(measure): start`
  commit `6f661515`, no implementation, no Red cycle yet authored). Task 7
  `[ ]`. Manual verification `[ ]`.

The strategy therefore (a) keeps the existing Task 3 / Task 4 Red command
recipes that already produced commit evidence, (b) holds the Task 6 Red
recipe in reserve pending the dependency gates recorded in §5, and (c)
records the `phase_base_sha` capture point for the orchestrator in §9.

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

### 1a. Anti-pattern coverage per phase (falsifiability)

Every test in this strategy must have a falsification condition (a named
assertion that fails on a named regression). The defensive surface for each
S1 task follows:

| Task | Defends against | Defense |
|------|-----------------|---------|
| T3 contracts (Red) | A4 (vacuous pass), A7 (over-broad filter) | Each named issue path is asserted; `safeParse(...).success === false` alone is rejected. Counterexample matrix in §2 is exhaustive (empty/whitespace, normalization, status, role key, redirect URI, audit metadata). |
| T3 architecture fixtures | A1 (substring-as-signal), A7 (broad filter), A14 (invalid ripgrep) | Fixtures are inputs to the accepted Gate 1 analyzer; the analyzer fixture API must report rule ID + fixture-relative path + resolved target. No broad path or "test" exclusion may hide a real architecture violation. The fixture tree is not globally exempt; the analyzer must analyze fixture contents through its explicit fixture API. |
| T4 PostgreSQL Red | A4 (vacuous), A5 (false claim), A6 (registry overstatement) | Each integration command records exit code, test count, assertion count, scratch database name, journal max, schema fingerprint, and cleanup result. A zero-test result or skipped integration file fails acceptance. |
| T5 implementation | A6 (registry overstatement), A10 (generated-facts drift) | The exact identity-table allowlist is queried from `pg_catalog`/`information_schema`. The separate product-isolation suite runs the real product and identity migrators into different scratch databases and proves both catalogs and ledgers are disjoint. Generated `measure/generated/` must diff clean after `measure/generate.sh`. |
| T6 adapter/capability | A4, A5, A6, A14 | Backend tests run through `--fail-if-no-match` so a missing package is a failure, not a vacuous filtered success. Capability contracts assert every named declared error. Audit metadata cases include nested objects, arrays, mixed casing, and compound keys. The recursive denylist is rejected; the contract accepts only the strict global storage allowlist. |
| T7 docs/doctor | A5, A6, A10 | `pnpm architecture:check`, `pnpm --filter @reading-advantage/db company-identity:doctor`, `bash measure/doctor.sh`, and the `git diff --exit-code -- measure/generated` commands all gate closeout. Any non-zero exit is a hard failure. |

Every test listed in §2–§6 must be falsifiable by reading the assertion, the
command, and the expected exit code. A test that "would have caught the
regression" without a named command is not accepted.

## 2. Test surfaces

Tests should be colocated under
`packages/db/src/company-identity/__tests__/` unless the owning dependency
publishes another canonical location. The planned surfaces are:

| Test file | Kind | Required proof |
|---|---|---|
| DB `contracts.test.ts` | Unit | Execute only DB-owned persistence, identifier, normalization, stored OIDC row, global audit allowlist, and stored idempotency/hash Zod contracts. Capability inputs, raw-password policy, event-specific audit projectors, and protocol behavior remain in their backend/auth owners. |
| DB `environment.test.ts` | Unit | Execute only the DB-owned runtime, direct, and test-admin parsers/client-factory seams. Prove URLs are distinct, required in the appropriate runtime, and cannot silently fall back to product `DATABASE_URL`. |
| Auth `environment-contracts.test.ts` | Unit | Under `packages/auth`, execute the auth-owned security, issuer/signing/TTL, cookie, confidential/public service-client parsers. Prove canonical production/loopback issuers, bounded session TTLs, host-only `Secure`/`HttpOnly`/`SameSite` cookies, client-secret separation, exact callback/audience configuration, strict inputs, frozen results, and secret-safe errors. |
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
URIs, missing expirations, invalid time ordering, and audit metadata containing
password/hash/token/code/secret fields. Cross-application role mismatch is not
a generic Zod rejection because application role keys are intentionally data:
the Task 3 schema-metadata test requires the composite
`(application_id, role_key)` foreign key, and the Task 4 PostgreSQL suite
executes the cross-application counterexample. Audit
metadata cases include nested objects, arrays, mixed casing, and compound keys
such as `passwordHash` and `authorizationCode`; the DB contract accepts only
the strict global storage allowlist rather than relying on a recursive
denylist, and Task 6 backend tests narrow it with operation-specific
projectors. Each row has a named expected issue path or stable error code;
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
CI=true pnpm --filter @reading-advantage/auth --fail-if-no-match exec vitest run \
  src/company-identity/__tests__/environment-contracts.test.ts
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

At this strategy's revision (HEAD `304e2029`), neither dependency has published
accepted gate evidence. The current task-level state is:

- `backend_architecture_enforcement_20260713`:
  - Phase 1 Tasks 1–4 `[x]` (contracts a3d07363, ownership 2acffc87+78a96657,
    inventory 815209d5, baselines 444306fc); frozen artifacts and hashes
    recorded in `phase-1-baseline-freeze.md`.
  - Phase 2 Tasks 5–8 `[x]` (database counterexamples 60fcb320, provider
    counterexamples bad9da7c, ratchet Red c46c7519, expected Red ef7eea7d);
    recorded in `phase-2-red-verification.md`.
  - Phase 3 Task 9 `[~]` (only `chore(measure): start architecture analyzer`
    dc4cb75c; the analyzer source exists at
    `packages/architecture-enforcement/src/analyzer.ts` but the ratchet
    source `ratchet.js` is absent and
    `git cat-file -t packages/architecture-enforcement/src/ratchet.ts`
    confirms it is not yet implemented). Tasks 10–12 `[ ]`. Phase 4
    `[ ]`. **Gate 1 is therefore NOT accepted at this strategy's baseline.**
- `backend_capability_kernel_20260713`:
  - Phase 1 Task 1 `[ ]` — `packages/backend/` does not exist
    (`ls packages/backend` fails). No scaffold, no manifest, no exports,
    no public descriptor/executor contracts. **Phase 1 Task 1 has not
    started.** All subsequent phases are blocked.

The §5 rules remain:

- Tasks 2–5 may implement the approved identity contracts, dedicated schema,
  migrations, scratch harness, clients, doctor, bootstrap primitive, and
  repository port/database primitives within `@reading-advantage/db`.
- Task 6's production PostgreSQL adapter cannot start until
  `backend_architecture_enforcement_20260713` Phase 3 (analyzer + ratchet) and
  Phase 4 (CI + doctor + accepted Gate 1 hash) are complete and
  `pnpm architecture:check` is Green with the identity positive/negative
  fixtures at `measure/tracks/company_identity_sso_20260715/fixtures/architecture/`.
- Task 6's capability descriptors/executor integration cannot start until
  `backend_capability_kernel_20260713` Phase 1 Task 1 (package scaffold) and
  Phase 1 Tasks 2–5 (descriptor/executor contracts) are explicitly accepted
  and published.
- Use `--fail-if-no-match` for every backend test, coverage, lint, typecheck,
  and build command so a missing package is a failure, not a vacuous filtered
  success.
- If a dependency is absent or unaccepted, record Task 6 as blocked with the
  missing gate and continue only independent Tasks 2–5. Do not skip Task 6
  tests and report the phase Green. **Phase S1 itself remains incomplete
  until both gates AND the Task 6 backend tests AND Task 7 docs/doctor all
  pass.**
- This strategy does **not** authorize a temporary analyzer, a parallel
  backend executor, or business logic in `packages/db`, `packages/domain`,
  or an app route. Existing implementation in `packages/db/src/company-identity/`
  is restricted to the contract, schema, migration, environment, client,
  bootstrap, doctor, and low-level persistence primitives already enumerated
  in Tasks 2–5; no new business logic is to be added at this strategy
  revision.
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

## 8. Review applicability and risk classification

| Subagent / review track | Applicable to Phase S1 | Reason |
|---|---|---|
| Security review (Review A) | **YES — required** | S1 establishes credential storage, session/code persistence, RBAC, audit, and the import/export boundary that protects them. Secret-persistence and audit-redaction tests are security evidence; a security review must run against the new `packages/db/src/company-identity/` and `packages/auth/src/company-identity/` surfaces and the import-boundary fixtures. |
| Architecture review (Review C) | **YES — required** | S1 is the first customer of `backend_architecture_enforcement_20260713` Gate 1 (the architecture fixtures under `measure/tracks/company_identity_sso_20260715/fixtures/architecture/` are owned by S1 but analyzed by the Gate 1 analyzer) and the first capability-kernel consumer. The architecture review must verify (a) the identity ownership map, (b) the rule IDs every S1 fixture expects, (c) the absence of new baselines introduced by S1, and (d) that no parallel analyzer or executor was created in this track. |
| UX/API review (Review B) | **NO** at this revision | Phase S1 ships no UI and no API surface. `apps/accounts/` is S2 work. The boundary contract and schema contract are documented but not user-facing. Review B becomes applicable starting at S2 (sign-in UI, callback handler, role-management surfaces) and again at S4–S7 (product integrations). |
| Adversarial testing | **YES — required** | Phase S1 must defend against the architecture-counterexample attacks (direct/aliased/barrel/dynamic identity imports, raw Postgres construction, schema re-exports), the credential-leak attacks (raw session token or authorization code persisted in any text/JSON column), the privilege-bleed attack (`COMPANY_ADMIN` reaching product data, `SALES_ADMIN` reaching identity authority, education `ADMIN` numeric-level bleed), and the audit-poisoning attack (UPDATE/DELETE on `audit_events` from the runtime role). The fixtures already enumerate these. |
| Browser / UX review | **NO** at this revision | No user surface exists at S1. The first browser-affecting surface is `apps/accounts/` sign-in (S2 Task 12) and the first cross-application browser surface is the first successful callback (S2 Task 13). |

### Risk classification per phase

| Phase | Risk | Why |
|---|---|---|
| T3 contract Red | **high** | Defines every public contract that downstream S2–S7 consume. Weakening here breaks audit/secret/role guarantees for the entire track. |
| T3 architecture Red | **critical** | The import boundary is the load-bearing defense for identity isolation. A7-style broad filters or A14-style ripgrep failures silently defeat the boundary. |
| T4 PostgreSQL Red | **critical** | Constraints, FKs, immutability, and privileges are enforced by the database itself; failing to exercise them against real PostgreSQL is A4 vacuous-pass. |
| T5 implementation | **high** | First contact between the contracts and the migrator. Schema drift, baseline debt increase, or a non-idempotent bootstrap are caught only by the catalog and bootstrap assertions. |
| T6 adapter/capability | **critical** | Joins two unaccepted dependencies (architecture enforcement Gate 1 and capability kernel Task 1 scaffold). The strategy refuses to start this until both gates are accepted; attempting it earlier would require a forbidden temporary analyzer/executor. |
| T7 docs/doctor | **medium** | Operational closeout; failure here does not change correctness but it does block Phase S1 closeout and S2 hand-off. |

## 9. `phase_base_sha` capture point

The orchestrator must capture the immutable `phase_base_sha` for Phase S1
**after this strategy commit lands** and **before any new Red commit is
authored for Task 6**. Concretely:

1. Commit this strategy update as `chore(measure): refresh Phase S1 test strategy`
   on the master branch (the role-owned change).
2. `git rev-parse HEAD` immediately after the commit succeeds. That SHA is the
   truthful Phase S1 base for the next Task 6 Red cycle.
3. **Do not embed a SHA in this strategy that predates the strategy commit.**
   The role must not speculate about a future base; the base is the HEAD after
   the strategy commit.

Until the strategy commit lands, the closest truthful substitute base is the
current HEAD `304e2029f13fe655913bfaad4c4b95b1ab16828a`, which already
includes the Task 6 `chore(measure): start` commit but does not include this
strategy revision.

## 10. Phase S1 closure declaration

Phase S1 is **not closed** at this strategy revision. The phase closes only
after all of the following are true at HEAD:

- The committed Red and Green evidence for Tasks 3, 4, and 5 (already on disk
  through `60ad9d28`, `ba033761`, and `43c16457`) remains valid against the
  current HEAD and has not been weakened, filtered, or skipped.
- Task 6's Red contracts are authored against the **post-strategy** HEAD, fail
  for the named absent adapter/policy/audit/transaction behavior, and produce
  per-commit evidence identical in shape to the Task 3 and Task 4 evidence.
- Task 6's Green commits use the accepted backend architecture enforcement
  Gate 1 analyzer and the accepted capability kernel Task 1 scaffold; no
  parallel analyzer, executor, or temporary `packages/backend/` stub exists at
  HEAD.
- Task 7 (docs/doctor) commits run `pnpm architecture:check`,
  `pnpm --filter @reading-advantage/db company-identity:doctor`,
  `bash measure/generate.sh` + `git diff --exit-code -- measure/generated`,
  and `bash measure/doctor.sh`, all exit zero, and update `graph.db` for every
  structural change.
- The strategy-revision receipt under
  `measure/tests/role-receipts/phase-s1-strategy.json` enumerates this
  strategy file, this strategy's parent HEAD, the committed strategy SHA, and
  the audited HEAD SHA — refreshed by every accepted strategy refresh.
- Manual verification per `workflow.md` Step 6 is recorded against this phase.

Until then, Task 6 remains `[~]` and Phase S1 remains **in-progress**; the
phase must not be marked `[x]` in `plan.md`, the S1 story in `metadata.json`
must not flip to `"complete"`, and `measure/tracks.md` must not be amended to
mark this track as archived.
