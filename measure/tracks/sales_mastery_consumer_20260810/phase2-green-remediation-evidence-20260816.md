# Sales Phase 2 Green remediation evidence

Track: `sales_mastery_consumer_20260810`
Phase: `Phase 2 — company tenant mapping and durable projection`
Role: `measure-jr-green`
phase_base_sha: `fd581f3dcd15e7b7b632875862aaecb596719621`
implementation_commit: `0559d48890191a068a15d2ae1cce6c4a1d4660ce`

## Remediation

- Renamed the Sales migration from `0052` to `0053`.
- Updated the journal, snapshot parent, sentinel, harness, and contract references.
- Added a composite mapping key for application, organization, organization key, and Mastery tenant.
- Bound each outbox row to that exact composite mapping key.
- Removed nested Drizzle split markers from legacy migrations `0013` and `0018`.
- Preserved unrelated worktree changes outside the Sales lease.

## Verification

- Safe DB suite: 4 files passed, 28 tests passed, and 8 live tests skipped without `PG_TEST_URL`.
- Live DB suite: PostgreSQL 16.14 passed 13/13 tests with disposable databases.
- Domain Sales and tenant coverage suite: 26/26 tests passed.
- Sales Knowledge suite: 19/19 tests passed.
- Runtime manifest suite: 18/18 tests passed.
- Codecamp runtime proof suite: 2/2 tests passed.
- DB and domain TypeScript checks passed.
- Package-local ESLint checks passed.
- Targeted Prettier and `git diff --check` passed.

## Known limitations

- The full domain suite timed out and reported unrelated live-database failures without `DATABASE_URL`.
- The full runtime release-artifact command timed out in unchanged release tests.
- The Sales runtime admission command timed out in its unchanged pack workflow.

These limitations do not affect the candidate-specific DB, domain, or migration gates.

MEASURE_AGENT_RESULT
role: jr-green
status: complete-with-known-unrelated-gates
track: sales_mastery_consumer_20260810
phase: Phase 2 — company tenant mapping and durable projection
phase_base_sha: fd581f3dcd15e7b7b632875862aaecb596719621
implementation_commit: 0559d48890191a068a15d2ae1cce6c4a1d4660ce
handoff: Review A/B may verify the committed migration, snapshot, binding, and candidate-specific gates.
END_MEASURE_AGENT_RESULT
