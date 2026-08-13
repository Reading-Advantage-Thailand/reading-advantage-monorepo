# Phase 3 API and caller audit

## Scope

This audit used `graph.db` at `316bbe193`.
The graph contains 42 Backend package files.
The public root export re-exports `./kernel/index.js`.

## Kernel package consumers

The source importer scan found 17 `@reading-advantage/backend` import sites.
All are in `apps/accounts`.
The sources are server code, route code, scripts, or their tests.
No source importer used the `@reading-advantage/backend/kernel` subpath.

The root package export includes kernel exports with Company Identity exports.
This audit therefore records package consumers, rather than incorrectly
attributing all root-imported Company Identity symbols to the kernel.

## Durable idempotency ports

`createPostgresDurableIdempotencyPort` has only kernel integration-test callers.
The calls are in
`packages/backend/src/kernel/__tests__/postgres-idempotency.integration.test.ts`.

`createCompanyIdentityDurableIdempotencyPort` has one production consumer:
`apps/accounts/lib/server/identity.ts`.
Its other callers are the module test and Accounts integration test.
The graph caller command returned no rows for these generic factory names.
The source importer scan supplied this exact disposition.

## Accounts deep import

`apps/accounts/lib/server/company-identity-route-bindings.ts` is the only
source deep import into `packages/backend/src` found in this audit.
It imports `internal-route-adapter.js` and creates the Accounts-only adapter.
The deep import bypasses the package exports map.

The package export `./company-identity/internal-route-adapter` maps consumers
to `dist/modules/company-identity/public-route-adapter.{js,d.ts}`.
The public shim calls its callback with `undefined as never`.
`packages/backend/src/modules/company-identity/__tests__/route-bindings.security.test.ts`
covers the substitution and the untrusted-context behavior.

## Route adapter collision

Both internal and public modules export `createCompanyIdentityRouteAdapter`.
The internal factory has one production caller: the Accounts deep import.
The public factory has security-test callers only in the scanned sources.
The same name is safe only while the exports-map substitution remains exact.

## Commands

```bash
build-graph stats ./graph.db
build-graph callers ./graph.db createPostgresDurableIdempotencyPort
build-graph callers ./graph.db createCompanyIdentityDurableIdempotencyPort
build-graph callers ./graph.db createCompanyIdentityRouteAdapter
rg -n "from [\"']@reading-advantage/backend(?:/kernel)?[\"']|from [\"'][^\"']*backend/src/kernel" --glob '*.ts'
rg -n "create(Postgres|CompanyIdentity)DurableIdempotencyPort" --glob '*.ts'
rg -n "createCompanyIdentityRouteAdapter" --glob '*.ts'
```
