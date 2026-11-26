# Phase 1 persistence acceptance — 2026-08-11

## Accepted scope

The minimum Finance Operations persistence implementation is accepted behind
the policy-neutral foundation contracts. It provides:

- exact text minor-unit amounts, currency, digests, and private-evidence
  references at both contract and PostgreSQL boundaries;
- company-first, nullable-school tenant scope with fail-closed referential-table
  classification;
- immutable accepted records, corrections through scoped supersession, and
  replay/conflict classification;
- one mandatory atomic persistence seam that commits a record and its succeeded
  audit outbox event in the same transaction;
- operation binding between ordinary imports, corrections, and their audit
  evidence;
- append-only protections for both records and audit outbox events, including
  UPDATE, DELETE, and TRUNCATE; and
- a composite migration sentinel that verifies all three integrity triggers,
  including enabled state, trigger shape, reviewed function-body digest,
  search path, language, and security mode.

No unaudited public persistence method remains. The implementation does not
interpret Thai tax or accounting policy and does not choose between historical
invoice variants.

## Verification evidence

All temporary and compile artifacts used repository-local ignored `.cache`
paths. No Finance artifacts were written to system `/tmp`.

- Disposable PostgreSQL adversarial integration suite: 2 files, 7 tests passed.
- Backend Finance suite: 9 files, 49 tests passed.
- Database Finance non-live suite: 3 files, 15 tests passed; 7 live-gated tests
  skipped in the non-live execution.
- Tenant classification coverage: 12 tests passed.
- Backend, database, and domain TypeScript checks: passed.
- Focused backend, database, and domain ESLint checks: passed.
- Independent persistence re-review: accepted with no Critical, High, Medium,
  or Low findings.

The one explicit 15-second test timeout covers cold dynamic imports through
three database barrels; the assertions are unchanged, and the same test
otherwise varied around Vitest's five-second default.

## Deferred follow-ups

The succeeded-audit outbox is durable but does not yet have its external
projector. That projector belongs to the later adapter/durable-job task and must
preserve idempotency and tenant scope.

Controlled historical imports, payroll summaries, Tutor exports, school
billing snapshots, invoice variants, and the `apps/accounting` product remain
Phase 2 work. They must preserve source facts and provenance without inventing
Thai policy.
