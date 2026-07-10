# Mastery persistence consumer API

Use the narrow package subpaths so consumers declare the boundary they need:

- `@reading-advantage/domain/mastery/contracts` for Zod contracts, inferred types, the portable error taxonomy, and `MasteryPersistencePort`.
- `@reading-advantage/domain/mastery/service` for `commitMasteryEvidence()` and `approveMasteryCalibration()`.
- `@reading-advantage/domain/mastery/adapters/memory` for DB-free tests and deterministic local execution.
- `@reading-advantage/domain/mastery/adapters/drizzle` for the lazily loaded PostgreSQL adapter.
- `@reading-advantage/domain/mastery/legacy` only for the pre-v3.2 run handlers.

`commitMasteryEvidenceInputSchema` is the single public learner-evidence command.
Callers provide records, revisions, provenance, audit metadata, and an idempotency
key; they must not provide request or result digests. Adapters derive canonical
SHA-256 digests after validation and reject an idempotency key reused for changed
content.

Calibration approval is a separate high-level operation. Its command requires
positive training, holdout, review, and student volume; a candidate improvement;
passing volume/evaluation gates; matching approver and audit actors; model
weights; metrics; provenance; and an explicit approval decision.

Handle `MasteryPersistenceError` by its stable `code` and `retryable` fields.
Messages are provider-neutral and are not intended for provider-specific error
inspection.

## Runtime governance

Before changing a contract, schema, graph major, or migration requirement, update
`packages/mastery-runtime-compat/runtime-manifest.json` and its compatibility
tests. Behavioral changes require normative fixtures first; migrations remain
append-only and deploy before code. Consumers should run the compatibility gate
with exact versions before adopting this API. See
`packages/mastery-runtime-compat/README.md` for upgrade, release, and rollback
commands.
