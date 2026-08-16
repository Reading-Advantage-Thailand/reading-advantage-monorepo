# Sales Phase 2 Review A Red remediation evidence

Track: `sales_mastery_consumer_20260810`
Phase: `Phase 2 — company tenant mapping and durable projection`
Role: `measure-mid-red`
phase_base_sha: `fd581f3dcd15e7b7b632875862aaecb596719621`
role_base_sha: `c7d0880e9bfdbe52ca8c06a914d44c4854fbc7ad`

## Scope

- Production source remained unchanged.
- The DB Red test now resolves `packages/domain/src/tenant-registry.ts` correctly.
- The live harness accepts only an explicit `PG_TEST_URL`.
- Each live test uses a disposable PostgreSQL 16 database and drops it in cleanup.
- The requested `phase2-review-a-174bb45d9.json` was absent from the checkout and Git history.

## Red contracts

The DB suite now covers these live behaviors:

- Full migration-chain execution.
- Mapping uniqueness and cross-organization tenant binding.
- Organization-scoped outbox reads.
- Conflicting replay preservation.
- Concurrent mapping and outbox first writes.
- Retry receipt deduplication.
- Append-only update, delete, and truncate triggers.

## Results

- Safe Red: exit 1; domain Red passed 14/14, and DB artifact tests passed 3/5.
- Safe Red failures: migration-number collision and Sales snapshot-chain mismatch.
- Live Red: exit 1; six live behavior tests passed, and two Green-owned behaviors failed.
- Live failure: the full chain stops at malformed legacy migration `0013`.
- Live failure: the outbox accepts a cross-organization mastery tenant target.
- Domain 58 regression: exit 0; 58 tests passed.
- DB governance: exit 0; 26 migration and tenant-coverage tests passed.
- Focused DB and domain TypeScript checks passed.
- Focused ESLint, Prettier, and `git diff --check` passed.
- The Sales plan Prettier check remains red from historical indentation outside this lease.

## Green handoff

Green must renumber the colliding `0052` migration, repair the `0053` snapshot
parent, and repair the legacy migration chain before dependent release work.
Green must bind each outbox organization to the same mastery tenant in PostgreSQL.
Green must rerun the safe and live Red suites after these changes.

MEASURE_AGENT_RESULT
role: mid-red
status: complete-with-green-handoff-blocked
track: sales_mastery_consumer_20260810
phase: Phase 2 — company tenant mapping and durable projection
phase_base_sha: fd581f3dcd15e7b7b632875862aaecb596719621
role_base_sha: c7d0880e9bfdbe52ca8c06a914d44c4854fbc7ad
handoff: Green owns migration renumbering, snapshot-chain repair, legacy-chain repair, and cross-organization tenant binding
END_MEASURE_AGENT_RESULT
