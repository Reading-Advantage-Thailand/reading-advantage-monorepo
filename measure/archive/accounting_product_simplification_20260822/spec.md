# Accounting Product Simplification

## Objective

Stop the finance/accounting tail-chasing identified by the w3 verdict
(2026-08-22). Fix the two live correctness defects in finance-operations, cut
the module to the five symbols the accounting app consumes, collapse the
separate accounting database into the main stream, add append-only audit
events with a slim approve/reject, and freeze the foundation.

This is a chore track. It ships no new user-facing product surface beyond two
thin approval API routes. It deletes far more than it adds.

## Boundary

### In scope

- The two live defects in `packages/backend/src/modules/finance-operations`
  (batch digest framing, non-atomic "allowed" audit).
- Deletion of the dead finance-operations surface (backend module and
  `packages/db` persistence side).
- Collapse of the separate accounting database stream into the main
  `packages/db` schema, with tenant-registry classification.
- Append-only audit events for the submission lifecycle, plus minimal
  OWNER-only approve/reject domain functions and thin API routes so no new
  code is dead on arrival.
- Spec addenda that align the two prior tracks with reality.

### Out of scope

- New hashes, checksums, manifests, or review-ceremony artifacts.
- New port interfaces, new databases, new apps.
- Approval UI screens (a later product track owns the owner review screen).
- S5 ledger, S6 VAT/tax invoices, S7 WHT as build items. Verdict: buy
  (FlowAccount/PEAK), pending the accountant tool decision.
- S8 beyond the reduced CSV-export shape recorded in the addendum.
- `packages/storage` finance-named tests. They test live storage code.
- The `company-identity` THB attestor shape. It is a separate module.
- Unrelated working-tree changes (advantage-games, AGENTS.md, domain games).

## Functional requirements

- **FR-1 (scope A).** Resolved by deletion: the batch-digest framing defect
  and its carrier code are removed by FR-3 in the same track. Recorded in the
  frozen-foundation notice (FR-9).
- **FR-2 (scope A).** Resolved by deletion: the non-atomic "allowed" audit
  ordering defect and its carrier code are removed by FR-3 in the same track.
  Recorded in the frozen-foundation notice (FR-9).
- **FR-3 (scope B).** Cut the finance-operations backend module to the
  consumed surface: `financeMoneyInputSchema`, `financeOperationScopeSchema`,
  `privateEvidenceReferenceSchema`, `FinanceMoneyInput`,
  `FinanceOperationScope`. Delete every other module file, the `postgres/`
  directory, the `./finance-operations/postgres` package export, and every
  test file that covers deleted code. Trim `contracts.test.ts` to the kept
  schemas.
- **FR-4 (scope B).** Delete the db-side finance-operations surface:
  `packages/db/src/finance-operations-record-store.ts`,
  `packages/db/src/schema/finance-operations.ts`, their barrel exports, their
  tenant-registry registrations, and their five test files. Drop the
  `finance_records` and `finance_record_success_audit_outbox` tables with one
  generated migration.
- **FR-5 (scope C).** Move `accountingSubmissions` into the main schema as
  `packages/db/src/schema/accounting.ts`, unchanged in shape. Register it in
  the tenant registry as EXEMPT (single-company global; no `schoolId` by
  design). Generate one main-stream migration.
- **FR-6 (scope C).** Rewire `apps/accounting` to the main database client
  (`DATABASE_URL`). Delete `packages/db/src/accounting/`,
  `packages/db/accounting/`, the `./accounting` and `./accounting/runtime`
  package exports, the `accounting:generate`/`accounting:migrate` scripts, and
  the accounting roles/database in `docker/init-db.sh`. Verify the old
  database holds zero rows before deletion; preserve data if any exists.
- **FR-7 (scope D).** Resolve the THB contract drift by deletion:
  `thb-valuation.ts` and its three test files go away with FR-3. The
  owner-decided policy (2026-08-20) lives in the `settledThbAmount` column
  that S2 already ships. Rate derivation (`settledThbAmount ÷ source amount`,
  2dp half-up) is one expression at the point a consumer needs it. Chosen
  because deletion is the smaller change: aligning 428 caller-less lines
  would maintain a design the owner rejected.
- **FR-8 (scope E).** Add an append-only `accounting_submission_audit_events`
  table (EXEMPT in the tenant registry, DB-level `REVOKE UPDATE, DELETE`
  following migration 0018). Add `approveAccountingSubmission` and
  `rejectAccountingSubmission` (OWNER only, pending-only transition, reject
  requires a reason). Widen the status contract and CHECK constraint to
  `pending | approved | rejected`. Write one audit event per submit,
  approve, and reject, in the same transaction as the state change. Expose
  thin `POST /api/submissions/[id]/approve` and `.../reject` routes.
- **FR-9 (scope F).** Add a dated frozen/cut notice to
  `measure/tracks/company_finance_operations_20260810/spec.md` and
  `measure/tracks/accounting_app_foundation_20260820/spec.md`: the foundation
  is frozen at the consumed symbols; S5–S7 are cut pending the accountant
  tool decision; S8 reduces to a CSV export of approved submissions. Record
  the same as `supersession-note.md` in this track.
- **FR-10.** Gates: `pnpm turbo run test check-types lint` for the affected
  packages (`@reading-advantage/backend`, `@reading-advantage/db`,
  `@reading-advantage/domain`, `accounting`) shows no new failures against
  the pre-existing baseline. Update `metadata.json`, register this track in
  `measure/tracks.md`, and run `build-graph update` for the changed files.

## Acceptance criteria

1. FR-1/FR-2 (orchestrator amendment): the batch-digest framing and
   non-atomic "allowed"-audit defects are resolved by deletion - their
   carrier code is removed by FR-3, recorded in the frozen-foundation
   notice. No repair tests exist because the code is gone.
2. Superseded by amendment 1: the "allowed"-audit carrier code is deleted;
   the audit ordering requirement no longer applies.
3. `grep` finds no import of any deleted finance-operations symbol anywhere
   in `apps/`, `packages/`, or `services/`. The accounting module still
   compiles against the five kept symbols, unchanged in behavior.
4. `packages/db` builds without the accounting stream. The tenant-coverage
   test passes with `accountingSubmissions` and
   `accountingSubmissionAuditEvents` classified EXEMPT.
5. `apps/accounting` passes its full test suite against `DATABASE_URL` with
   no `ACCOUNTING_*` database variables left.
6. An OWNER can approve and reject through the API routes; a STAFF actor is
   refused; every transition writes exactly one audit row; the audit table
   rejects UPDATE and DELETE for the app role per the 0018 pattern.
7. Both prior specs carry the frozen/cut notice, and this track folder holds
   `supersession-note.md`.
8. The working tree after the final commit contains no accounting-attributable
   gate failures, and `graph.db` reflects the changed files.
