# Company Identity Architecture Counterexamples

These fixtures are inputs for the accepted Backend Platform Gate 1 analyzer;
they are not compiled as application code and the fixture tree is not an
exemption. The analyzer fixture API must report the rule ID, fixture-relative
source path, import/call site, and resolved target for each positive case.

## Expected violations

| Fixture | Required detection |
|---|---|
| `positive/apps/marketing/direct-identity-client.ts` | `COMPANY_IDENTITY_DB_BOUNDARY`: direct dedicated client import from an app |
| `positive/apps/sales/sales-through-local-alias.ts` | `COMPANY_IDENTITY_DB_BOUNDARY`: workspace alias resolving through a local barrel to the dedicated schema |
| `positive/apps/codecamp/consume-reexport.ts` | `COMPANY_IDENTITY_DB_BOUNDARY`: consumption of a local identity-schema re-export |
| `positive/apps/codecamp/reexport-identity-schema.ts` | `COMPANY_IDENTITY_DB_BOUNDARY`: prohibited schema re-export |
| `positive/apps/marketing/static-dynamic-import.ts` | `COMPANY_IDENTITY_DB_BOUNDARY`: static dynamic import of the dedicated client |
| `positive/apps/sales/postgres-company-env.ts` | `COMPANY_IDENTITY_DB_BOUNDARY`: direct Postgres construction from `COMPANY_AUTH_DATABASE_URL` |
| `positive/apps/marketing/route-imports-postgres-adapter.ts` | `COMPANY_IDENTITY_DB_BOUNDARY`: transport imports the concrete approved adapter instead of the public auth port |
| `positive/packages/db/src/schema/index.ts` | `COMPANY_IDENTITY_PRODUCT_ISOLATION`: identity schema added to the product schema barrel |
| `positive/packages/db/drizzle.config.ts` | `COMPANY_IDENTITY_PRODUCT_ISOLATION`: product migration config points at identity schema or migration output |
| `positive/packages/domain/src/tenant-registry.ts` | `COMPANY_IDENTITY_PRODUCT_ISOLATION`: identity table added to education TenantDB |

## Expected allowed cases

| Fixture | Required allowance |
|---|---|
| `negative/packages/backend/src/modules/company-identity/adapters/postgres/index.ts` | Exact approved PostgreSQL adapter root imports the dedicated identity client/schema |
| `negative/apps/marketing/public-auth-port.ts` | Product app imports only the fixture-local public company-auth port |
| `negative/packages/db/src/company-identity/migration.ts` | DB-owned identity migration imports its own low-level identity primitives |

Every external fixture uses the one approved package subpath,
`@reading-advantage/db/company-identity`; DB-owned fixtures use real relative
module paths. The analyzer dependency is intentionally not recreated in this
track. Until
`backend_architecture_enforcement_20260713` is accepted, the fixture execution
command is blocked:

```bash
CI=true pnpm vitest run packages/architecture-enforcement/src/__tests__
pnpm architecture:check
```

After the gate opens, both commands are mandatory and every case above must be
asserted by rule ID, fixture path, and resolved target.
