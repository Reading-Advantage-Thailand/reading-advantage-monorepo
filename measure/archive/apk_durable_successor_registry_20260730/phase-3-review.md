# Phase 3 Review: Command, Receipt, and Git Boundary

**Status:** accepted on 2026-07-30.

## Evidence

The following commands passed in the isolated local PostgreSQL environment.

```bash
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres CI=true pnpm --filter @reading-advantage/db exec vitest run src/__tests__/standard-pack-successor-commitments-schema.test.ts src/__tests__/standard-pack-successor-admission-receipts-schema.test.ts src/__tests__/standard-pack-successor-admission-persistence-store.test.ts src/__tests__/standard-pack-successor-admission-persistence-store.integration.test.ts src/__tests__/snapshot-drift.test.ts src/__tests__/journal-integrity.test.ts --reporter=verbose
PG_TEST_URL=postgres://postgres:postgres@localhost:5432/postgres CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/standard-pack-ingestion/__tests__/successor-admission-command.red.test.ts src/modules/standard-pack-ingestion/__tests__/successor-admission-persistence-adapter.test.ts src/modules/standard-pack-ingestion/__tests__/successor-admission-composition.integration.test.ts src/modules/standard-pack-ingestion/__tests__/postgres-successor-registry.test.ts src/modules/standard-pack-ingestion/__tests__/postgres-successor-registry.integration.test.ts --reporter=verbose
pnpm --filter @reading-advantage/db run lint
pnpm --filter @reading-advantage/db run check-types
pnpm --filter @reading-advantage/db run build
pnpm --filter @reading-advantage/backend run lint
pnpm --filter @reading-advantage/backend run check-types
pnpm --filter @reading-advantage/backend run build
```

The database suite passed 31 focused tests, including the full 0044-0046 scratch-PostgreSQL chain. The backend suite passed 32 focused tests. The composition case applies 0044-0046, stores one commitment and one receipt, verifies Git once, and returns an exact replay without a second external mirror. The independent re-audit found no remaining Phase 3 completion blocker.

## Review corrections

1. Generated migration 0046 binds every receipt to the exact commitment/candidate pair and enforces strict JSON key, type, digest, and identity correlations. The backend adapter independently validates replay metadata against the registry record.
2. The durable receipt is the canonical audit record. External audit and observability mirrors are best-effort only after a first admission; exact replay emits no duplicate reserved event. Untyped dependency errors are mapped to the public retryable command error.
3. The Git-candidate port only verifies a pre-existing immutable revision. It has no write, tag, publish, or release-acceptance operation.

## Bounded decision

Phase 3 establishes evidence infrastructure only. It does not approve a real source asset, provenance, licensing, suitability dossier, title adoption, ingestion, Git release publication, migration, cutover, deployment, or catalog exposure.
