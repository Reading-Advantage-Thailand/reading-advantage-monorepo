# Sales Phase 2 Review A remediation Red evidence

Track: `sales_mastery_consumer_20260810`
Phase: `Phase 2 — company tenant mapping and durable projection`
Role: `measure-mid-red`
Approved test commit: `63f1ec7e8563b96397c6d07ec994255482f4bf46`
Parent commit: `e6265b0bed56290f5776353193e554c177a823df`
Role log: `orchestration/phase2-review-a-mid-red-remediation-role.log`

## Scope

- This evidence follows the approved Sales Review A Red test commit.
- The commit contains exactly two test files.
- The lease changes this plan, this evidence file, and one Mid Red role log.
- No production, schema, migration, or dependency file changed.
- Phase 2 remains unaccepted.

## Six findings

1. `SMC-P2-RA-001`: Disposable PostgreSQL 16 must persist valid UUID projection
   records under the mapped Sales Mastery tenant.
2. `SMC-P2-RA-002`: Every projection boundary must verify Company Identity and
   reject expired, wrong-issuer, and raw claims before provider access.
3. `SMC-P2-RA-003`: The projection must reject legacy unreviewed activity
   coordinates before Mastery access.
4. `SMC-P2-RA-004`: The projection must use a scoped Mastery factory and reject
   caller principal, source tenant, actor, tenant, and organization overrides.
5. `SMC-P2-RA-005`: Database and Mastery provider failures must map to safe,
   retryable, provider-neutral errors without secret messages.
6. `SMC-P2-RA-006`: The projection must reject arbitrary, raw, audio, and secret
   payload fields outside the approved Sales activity contract.

## Final expected Red results

- The domain failure matrix ran 20 tests, with 18 expected failures and 2
  existing passes. The wrapper returned the expected Red exit status 1.
- RA-002 and RA-004 remain Red because production has no injected verifier or
  scoped factory seam.
- RA-003 expects `ACTIVITY_BINDING_FORBIDDEN`, but current production returns
  `VALIDATION_ERROR` before the new boundary exists.
- RA-005 expects `PERSISTENCE_UNAVAILABLE`, but current production returns
  `COMPANY_IDENTITY_FORBIDDEN` or `VALIDATION_ERROR` before provider access.
- The new live PG16 Red test has one expected validation failure because current
  production still requires caller `principalId`; its expected exit status is 1.
- The immutable domain Red suite passed 20/20.
- The existing PostgreSQL 16 migration and tenant suite passed 20/20.

## Quality and cleanup

- Domain and DB type checks passed.
- Domain and DB lint passed with existing unrelated warnings; targeted changed
  file lint passed without warnings.
- Focused Prettier checks passed for the two test files and this evidence file.
- The full plan Prettier check remains red from historical indentation outside
  this lease; this lease did not rewrite that plan content.
- The scoped `git diff --check` passed.
- The build graph update for the two test files passed.
- Disposable `sales_phase2_*` and `sales_chain_*` databases were absent after
  the live tests.
- The approved commit contains no production, schema, migration, dependency,
  Marketing, Coding, Finance, goal, or test-report changes.

## Green handoff

Route Green to the responsible Sales session for
`sales_mastery_consumer_20260810`. Green must add the verifier-owned clock,
trusted identity, scoped factory, strict payload, safe error, and PG16 behavior
needed to turn these Red contracts Green.

Phase 2 is not accepted. Green must rerun the Red matrix, immutable Red suite,
PG16 suites, quality gates, graph check, and cleanup check after implementation.

MEASURE_AGENT_RESULT
role: mid-red
status: complete-with-green-handoff
track: sales_mastery_consumer_20260810
phase: Phase 2 — company tenant mapping and durable projection
approved_test_commit: 63f1ec7e8563b96397c6d07ec994255482f4bf46
handoff: responsible Sales Green session
phase2_acceptance: not accepted
END_MEASURE_AGENT_RESULT
