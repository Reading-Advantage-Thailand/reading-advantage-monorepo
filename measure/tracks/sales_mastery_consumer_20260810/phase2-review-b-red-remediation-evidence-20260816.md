# Sales Phase 2 Review B Red remediation evidence

Track: `sales_mastery_consumer_20260810`
Phase: `Phase 2 — company tenant mapping and durable projection`
Role: `measure-mid-red`
phase_base_sha: `fd581f3dcd15e7b7b632875862aaecb596719621`
role_base_sha: `c572d0b8713dd09fb3e86761c54467b46ccba142`

## Scope

- Production source remained unchanged.
- Migration source, schema source, tenant registry source, and the live harness remained unchanged.
- The lease covered Sales Phase 2 tests, the plan, and Red evidence files.
- Existing unrelated worktree changes remained unstaged.

## Red contracts

The domain Red file now rejects these Review B gaps:

- Roleless Company Identity claims.
- Non-canonical organization keys.
- Cross-organization source-attempt and idempotency replay with a new learner principal.
- Activity and rubric values that are absent from the approved Sales bindings.
- Roleplay evidence without the accepted consent and retention gate.
- A mapping that remains after its outbox insert fails.

The domain file also rejects caller-built tenant, organization, and application bindings.
The roleplay gate applies only when the evidence identifies roleplay evaluation.

The live PostgreSQL file now rejects these Review B gaps:

- Cross-organization reuse of source-attempt and idempotency identities.
- Outbox organization-key mismatch with its mapping.
- Non-Sales application binding at the mapping boundary.
- Receipt lookalikes with mismatched tenant, organization, learner, or idempotency fields.

## Results

- Sales Red: 20 tests ran; 14 existing contracts passed and 6 new Review B contracts failed.
- Safe DB suite: 5 tests passed and 15 live tests skipped without `PG_TEST_URL`.
- Live PostgreSQL 16.14 suite: 15 tests passed and 5 new Review B contracts failed.
- Sales authorization and tenant regressions: 87 tests passed.
- Tenant coverage: 12 tests passed.
- Migration and schema controls: 261 tests passed from the package directory.
- Domain and DB type checks passed.
- Domain and DB focused ESLint checks passed.
- Focused Prettier checks and `git diff --check` passed.

The 11 Red failures name only the Review B trust, replay, receipt, and atomicity gaps.
No assertion or syntax failure remained.

The full historical plan Prettier check remains red from unrelated indentation.
The edited plan path has no `git diff --check` whitespace error.

## Green handoff

Green must bind the projection to trusted Company Identity authorization.
The binding must require `applicationKey=sales`, `aud=sales`, active status, a Sales role, and the canonical organization tuple.

Green must reject cross-organization reuse of source-attempt and idempotency identities.
Green must validate the approved activity binding before Mastery access.
Green must apply consent and retention checks only to roleplay evidence.
Green must bind every receipt identity column to its outbox row.
Green must make mapping and outbox creation one atomic projection boundary.

MEASURE_AGENT_RESULT

role: mid-red
status: complete-with-green-handoff-blocked
track: sales_mastery_consumer_20260810
phase: Phase 2 — company tenant mapping and durable projection
phase_base_sha: fd581f3dcd15e7b7b632875862aaecb596719621
role_base_sha: c572d0b8713dd09fb3e86761c54467b46ccba142
red_files: `packages/domain/src/__tests__/sales-mastery-projection.red.test.ts`, `packages/db/src/__tests__/sales-mastery-tenant.integration.test.ts`
production_source_modified: false
green_handoff: trusted Company Identity and application binding, cross-organization replay denial, approved activity validation, roleplay gate, receipt integrity, and atomic mapping plus outbox projection
END_MEASURE_AGENT_RESULT
