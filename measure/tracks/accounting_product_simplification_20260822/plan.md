# Implementation plan

Track: `accounting_product_simplification_20260822` (chore). Spec: `./spec.md`.
Estimated tasks: 13. Commit-SHA discipline: append the short SHA to each task
line after committing, per `measure/workflow.md`.

## Working-tree discipline (read first)

The tree carries unrelated WIP (advantage-games deletions, `AGENTS.md`,
`packages/domain/src/games/*`, sales-mastery test). Never run `git add -A` or
`git commit -a` in this track. Stage only the files each task names.

Commitlint: non-chore subjects must carry `(track_id: <name>_<YYYYMMDD>)`.
Task 1 belongs to the prior track and uses its track ID.

## Phase ordering rationale

Defect fixes (Phase 1) land while the finance-operations module still exists,
so the frozen history stays green. The database collapse (Phase 2) rewires the
app before the old stream is deleted. The dead-surface cut (Phase 4) comes
last because the accounting module imports
`../finance-operations/contracts.js` throughout; cutting earlier breaks
intermediate states. Tasks 2–3 write tests that Task 10 deletes; this is
deliberate. The fixes are verified while the code lives, and the deletion
commit stays purely mechanical.

**Orchestrator amendment (2026-08-22):** Tasks 2–3 fix defects in code Task
10 deletes in the same track. That is the tail-chasing pattern this track
exists to stop. The defects are real, but the code carrying them has zero
production callers and is scheduled for deletion; a defect fix that ships
and is deleted before wiring is wasted motion. **Skip Tasks 2–3.** Do not
write `batch-digest-framing.test.ts` or `allowed-audit-ordering.test.ts`.
Instead, in Task 12 (spec alignment), extend the frozen-foundation notice in
`company_finance_operations_20260810/spec.md` with: "Two known defects
(batch-digest framing in `controlled-imports.ts`; non-atomic 'allowed' audit
ordering) were present in the deleted code and are removed with it." Record
the same line in `supersession-note.md`. FR-1 and FR-2 are satisfied by
deletion, not by repair. Estimated tasks drop from 13 to 11.

---

## Phase 0: Land the S2 WIP

### Task 1: Commit the uncommitted S2 work, scoped to accounting files [checkpoint: 7bb752e]

Files to stage (exact list, nothing else):

- `apps/accounting/.env.example`
- `apps/accounting/app/api/submissions/route.ts`
- `apps/accounting/app/api/submissions/route.test.ts`
- `apps/accounting/app/lib/__tests__/private-evidence-storage.test.ts`
- `apps/accounting/app/lib/submissions.ts`
- `apps/accounting/app/page.tsx`
- `apps/accounting/app/page.test.tsx`
- `apps/accounting/tsconfig.json`
- `packages/backend/src/modules/accounting/__tests__/postgres-submission-repository.test.ts` (new, untracked)
- `packages/db/src/accounting/client.ts`
- `packages/db/src/accounting/commands/migrate.ts`
- `packages/db/src/accounting/environment.ts`
- `packages/db/src/accounting/index.ts`
- `packages/db/src/accounting/runtime.ts`
- `packages/db/src/accounting/privileged.ts` (new, untracked)
- `packages/db/src/accounting/__tests__/` (new, untracked: `client.test.ts`, `environment.test.ts`, `runtime-privileges.integration.test.ts`)

Verification:

```
CI=true pnpm --filter accounting test
CI=true pnpm --filter accounting check-types
CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/accounting/__tests__/submissions.test.ts src/modules/accounting/__tests__/postgres-submission-repository.test.ts
CI=true pnpm --filter @reading-advantage/db exec vitest run src/accounting/__tests__/client.test.ts src/accounting/__tests__/environment.test.ts
```

All four must pass. The integration test needs a live accounting database;
skip it locally if the database is down.

Commit: `feat(accounting): ship S2 submission form and runtime evidence wiring (track_id: accounting_app_foundation_20260820)`

---

## Phase 1: Live correctness defects (FR-1, FR-2)

### Task 2: Fix the batch digest framing (red → fix → green)

Red test first. Create
`packages/backend/src/modules/finance-operations/__tests__/batch-digest-framing.test.ts`:

- Build a two-record batch through `prepareControlledImportBatch`. Copy the
  minimal batch-building harness from the existing
  `__tests__/controlled-imports-phase2.red.test.ts` (search that file for
  `prepareControlledImportBatch`).
- Assert `plan.batchDigest` matches `/^[a-f0-9]{64}$/u`. This fails today:
  `ds.join("")` yields 128 characters for two records.
- Assert two batches with different record digest lists produce different
  `batchDigest` values.

Run red:

```
CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations/__tests__/batch-digest-framing.test.ts
```

Implement in `packages/backend/src/modules/finance-operations/controlled-imports.ts`:

- Add `import { createHash } from "node:crypto";` at the top.
- At approximately line 971, replace
  `batchDigest: ds.length === 1 ? (ds[0] as string) : ds.join(""),`
  with
  `batchDigest: createHash("sha256").update(ds.join(":"), "utf8").digest("hex"),`

Why this is allowed under the hashing policy: the durable-job
`payloadDigestSchema` (`port-contracts.ts:10`) already requires a 64-hex
digest. This fixes an existing protocol element. It adds no new hash field.
The `:` separator is safe because each element is fixed 64-hex.

Run green: the same vitest command, then the full module directory:

```
CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/finance-operations
```

If an existing test asserts the old `ds[0]` single-record passthrough,
update that assertion to the hashed value.

Commit: `fix(finance-operations): hash the framed batch digest to the existing 64-hex grammar (track_id: accounting_product_simplification_20260822)`

### Task 3: Make the "allowed" audit post-commit best-effort (red → fix → green)

Red test first. Create
`packages/backend/src/modules/finance-operations/__tests__/allowed-audit-ordering.test.ts`:

- Use recording doubles (an audit port and a repository that push event
  names into a shared `calls: string[]`). Assert the "allowed" audit arrives
  after `applyBatchAtomically` resolves in `acceptControlledImportBatch`, and
  after `execute` resolves in the `records.ts` path (`acceptFinanceRecord`).
- Assert that when the "allowed" append throws after a successful commit,
  the operation still returns its result.

Run red with the same vitest pattern as Task 2.

Implement:

1. `packages/backend/src/modules/finance-operations/records.ts` (~lines
   437-442): delete the pre-commit `appendAuditEvent({ ..., outcome: "allowed" })`
   block. After `result = await request.execute(...)` succeeds, add:

   ```ts
   // Post-commit best-effort: the record is already committed. The "allowed"
   // event is advisory; the atomically committed "succeeded" event is the
   // authoritative audit. A missing "allowed" event is detectable, never
   // corrupting.
   try {
     await appendAuditEvent({
       ...request.security,
       authorizationInput,
       objectId: request.objectId,
       outcome: "allowed",
     });
   } catch {
     // Intentionally swallowed; see the comment above.
   }
   ```

2. `packages/backend/src/modules/finance-operations/controlled-imports.ts`
   (~line 1107): delete the pre-commit
   `await request.auditPort.append(audit(request, "allowed"));`. Restructure
   the `try { return freeze(copy(... applyBatchAtomically ...)) } catch`
   block so the parsed result is captured first, the "allowed" append runs
   after success inside its own `try/catch` with the same comment, and the
   result returns last.

Run green on the new test, then the full module directory. Existing tests
that assert the old ordering (expect hits in `authorization-audit.test.ts`
and the `controlled-imports-*.red.test.ts` files) must be updated to the new
ordering.

Commit: `fix(finance-operations): append the allowed audit after the atomic commit (track_id: accounting_product_simplification_20260822)`

---

## Phase 2: Collapse the separate accounting database (FR-5, FR-6)

### Task 4: Move the submissions table into the main schema stream [checkpoint: f63c4a9c4]

Files:

- Create `packages/db/src/schema/accounting.ts`. Copy the full content of
  `packages/db/src/accounting/schema/index.ts` verbatim (imports unchanged).
  Update the file-level comment: the table now lives in the main database;
  the separate-stream rationale is removed.
- Edit `packages/db/src/schema/index.ts`: add `export * from "./accounting.js";`
  at the end.
- Edit `packages/domain/src/tenant-registry.ts`: add `accountingSubmissions`
  to the existing `from "@reading-advantage/db"` import block, and add
  `register(accountingSubmissions, "EXEMPT");` in the EXEMPT section with the
  comment `// single-company global; the accounting app is company-scoped by design`.

Steps:

```
pnpm db:start                                             # if Postgres is not running
pnpm --filter @reading-advantage/db generate              # emits packages/db/drizzle/0054_*.sql
```

Read the generated SQL. It must contain only `CREATE TABLE
accounting_submissions` plus its indexes and checks. If it contains anything
else, stop and investigate schema drift.

Verification:

```
pnpm --filter @reading-advantage/db migrate
pnpm --filter @reading-advantage/db doctor
CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/tenant-coverage.test.ts
CI=true pnpm --filter @reading-advantage/db check-types
```

The tenant-coverage test is the built-in gate: it fails until the EXEMPT
registration exists.

Commit: `chore(db): move accounting_submissions into the main schema stream (track_id: accounting_product_simplification_20260822)`

### Task 5: Rewire the app to the main database client [checkpoint: 7a71a9a51]

Data check first. Run:

```
psql "postgresql://accounting_migrator:accounting_migrator_local@localhost:5432/accounting" -t -c "select count(*) from accounting_submissions;"
```

Expect `0`. If the count is above zero, stop and preserve the rows before
continuing:

```
pg_dump "postgresql://accounting_migrator:accounting_migrator_local@localhost:5432/accounting" --data-only -t accounting_submissions -f accounting_submissions_backup.sql
psql "$DATABASE_URL pointing at the main database" -f accounting_submissions_backup.sql
```

Files:

- Edit `apps/accounting/app/lib/submissions.ts`:
  - Replace the `@reading-advantage/db/accounting/runtime` import with
    `import { client } from "@reading-advantage/db/client";`.
  - Replace the lazy `repositoryPromise` / `getSubmissionRepository` block
    with one module-scope constant:
    `const repository = createPostgresAccountingSubmissionRepository({ sql: client });`
  - Update the two call sites to use `repository` directly (drop the
    `await getSubmissionRepository()` lines).
  - Rewrite the file-header comment: the repository now uses the shared main
    database client; the separate accounting stream is gone.
- Edit `apps/accounting/.env.example`: delete the
  `ACCOUNTING_DATABASE_URL`, `ACCOUNTING_DATABASE_POOL_MAX`, and
  `ACCOUNTING_DIRECT_DATABASE_URL` lines. Add the monorepo-standard pair:

  ```
  # ── Main database ────────────────────────────────────────────────────
  DATABASE_URL="postgresql://postgres:postgres@localhost:6432/reading_advantage?schema=public"
  DIRECT_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/reading_advantage?schema=public"
  ```

- Set `DATABASE_URL` in `apps/accounting/.env` the same way for local runs.

Verification:

```
CI=true pnpm --filter accounting test
CI=true pnpm --filter accounting check-types
```

Commit: `chore(accounting): point the app at the main database client (track_id: accounting_product_simplification_20260822)`

### Task 6: Delete the separate accounting database stream [checkpoint: 3632ad766]

Deletions:

- `packages/db/src/accounting/` — the whole directory (`client.ts`,
  `environment.ts`, `index.ts`, `migration.ts`, `privileged.ts`,
  `runtime.ts`, `commands/migrate.ts`, `schema/index.ts`, and the three files
  under `__tests__/`).
- `packages/db/accounting/` — the whole directory (`drizzle.config.ts`,
  `drizzle/`, `index.ts`).

Edits:

- `packages/db/package.json`: remove the `./accounting` and
  `./accounting/runtime` entries from `exports`; remove the
  `accounting:generate` and `accounting:migrate` scripts.
- `docker/init-db.sh`: remove lines 8-11 (the `accounting_migrator` and
  `accounting_runtime` roles) and lines 19-21 (the `accounting` database and
  its grant). Update the final `echo` to drop the accounting mention.

Manual local cleanup (dev only, once): drop the local database and roles:

```
psql "postgresql://postgres:postgres@localhost:5432/postgres" -c "DROP DATABASE IF EXISTS accounting;" -c "DROP ROLE IF EXISTS accounting_runtime;" -c "DROP ROLE IF EXISTS accounting_migrator;"
```

Grep audit — must return nothing outside `dist/` and `node_modules/`:

```
grep -rn "db/accounting\|ACCOUNTING_DATABASE_URL\|ACCOUNTING_DIRECT_DATABASE_URL\|accounting_runtime\|accounting_migrator" apps packages docker --include="*.ts" --include="*.tsx" --include="*.sh" --include="*.json" --include="*.example" | grep -v node_modules | grep -v "/dist/"
```

Verification:

```
CI=true pnpm --filter @reading-advantage/db build
CI=true pnpm --filter @reading-advantage/db check-types
CI=true pnpm --filter accounting test
```

Commit: `chore(db): delete the separate accounting database stream (track_id: accounting_product_simplification_20260822)`

---

## Phase 3: Submission audit events and slim approval (FR-8)

### Task 7: Red tests for approval transitions and audit events [checkpoint: 5811a566e]

New file
`packages/backend/src/modules/accounting/__tests__/approvals.test.ts`,
using the same in-memory repository fake style as `submissions.test.ts`:

- OWNER approves a pending submission → status `approved`, exactly one audit
  event with action `approve` recorded with the submission.
- OWNER rejects with a reason → status `rejected`, one `reject` event
  carrying the reason.
- OWNER rejects without a reason → `invalid-input`.
- STAFF and ACCOUNTANT callers → `AccountingSubmissionError("forbidden")`.
- Approving an unknown or non-pending submission →
  `AccountingSubmissionError("not-found")`, no audit event.
- Submitting writes one `submit` audit event through the same repository
  transaction boundary (extend the existing fake in `submissions.test.ts`
  and assert the event there).

Extend
`packages/backend/src/modules/accounting/__tests__/postgres-submission-repository.test.ts`
with tagged-SQL-double assertions for the new `transition` method: one
transaction containing `update accounting_submissions ... where id = ... and
scope_company_id = ... and status = 'pending' returning ...` and one
`insert into accounting_submission_audit_events ...`.

New file `packages/db/src/__tests__/accounting-schema.test.ts`:

- Assert `accountingSubmissionAuditEvents` exists with an action check
  covering `submit | approve | reject`.
- Assert `classifyTable(accountingSubmissionAuditEvents)` and
  `classifyTable(accountingSubmissions)` return `"EXEMPT"`.
- Assert the `accountingSubmissions` status check admits `approved` and
  `rejected`.

Run red:

```
CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/accounting
CI=true pnpm --filter @reading-advantage/db exec vitest run src/__tests__/accounting-schema.test.ts
```

Commit: `test(accounting): red tests for approval transitions and audit events (track_id: accounting_product_simplification_20260822)`

### Task 8: Audit table, status widening, and migration [checkpoint: fd628bbed]

Files:

- Edit `packages/db/src/schema/accounting.ts`:
  - Change the status check to
    `sql\`${table.status} IN ('pending', 'approved', 'rejected')\`` (constraint
    name unchanged).
  - Add the audit table:

    ```ts
    /**
     * Append-only audit trail for the accounting submission lifecycle.
     * Enforced at the DB level via REVOKE UPDATE, DELETE (see the migration
     * generated for this change, following 0018_audit_events).
     */
    export const accountingSubmissionAuditEvents = pgTable(
      "accounting_submission_audit_events",
      {
        id: uuid("id").primaryKey().defaultRandom(),
        submissionId: uuid("submission_id").notNull(),
        action: text("action").notNull(),
        actorAccountId: uuid("actor_account_id").notNull(),
        actorRole: text("actor_role").notNull(),
        reason: text("reason"),
        createdAt: timestamp("created_at", { withTimezone: true })
          .defaultNow()
          .notNull(),
      },
      (table) => [
        check(
          "accounting_submission_audit_events_action_check",
          sql`${table.action} IN ('submit', 'approve', 'reject')`,
        ),
        check(
          "accounting_submission_audit_events_reason_check",
          sql`${table.reason} IS NULL OR ${table.reason} ~ '[^[:space:]]'`,
        ),
        index("accounting_submission_audit_events_submission_idx").on(
          table.submissionId,
          table.createdAt,
        ),
      ],
    );
    ```

- Edit `packages/domain/src/tenant-registry.ts`: register
  `accountingSubmissionAuditEvents` as `"EXEMPT"` next to
  `accountingSubmissions`.

Generate the migration:

```
pnpm --filter @reading-advantage/db generate
```

Read the generated SQL. If it does not contain the status-check replacement,
hand-append:

```sql
ALTER TABLE "accounting_submissions" DROP CONSTRAINT "accounting_submissions_status_check";
--> statement-breakpoint
ALTER TABLE "accounting_submissions" ADD CONSTRAINT "accounting_submissions_status_check" CHECK ("status" IN ('pending', 'approved', 'rejected'));
--> statement-breakpoint
```

Then append the append-only enforcement block, copied from
`packages/db/drizzle/0018_audit_events.sql` (the `DO $$ ... IF EXISTS ...
REVOKE UPDATE, DELETE ... END $$;` block), with the table name swapped to
`accounting_submission_audit_events`.

Verification:

```
pnpm --filter @reading-advantage/db migrate
pnpm --filter @reading-advantage/db doctor
CI=true pnpm --filter @reading-advantage/db exec vitest run src/__tests__/accounting-schema.test.ts
CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/tenant-coverage.test.ts
```

Commit: `chore(db): add the append-only accounting submission audit table (track_id: accounting_product_simplification_20260822)`

### Task 9: Implement approval domain functions, repository, and routes [checkpoint: dc1e5455f]

Files:

- Edit `packages/backend/src/modules/accounting/contracts.ts`:
  - `accountingSubmissionStatusSchema` becomes
    `z.enum(["pending", "approved", "rejected"])`. Delete the now-stale
    single-member comment.
  - Add `accountingSubmissionActionSchema = z.enum(["submit", "approve", "reject"])`
    and its inferred type.
  - Add `accountingSubmissionAuditEventSchema` (strict object: `id` uuid,
    `submissionId` uuid, `action`, `actorAccountId` uuid, `actorRole` min-1
    string, `reason` optional non-blank string, `createdAt` datetime with
    offset) and its inferred type.
  - Add a `rejectReasonSchema` (min 1, max 1024, non-blank, no control
    characters — reuse the `descriptionSchema` shape).
- Edit `packages/backend/src/modules/accounting/submissions.ts`:
  - Extend `AccountingSubmissionErrorReason` with `"not-found"`.
  - Extend `AccountingSubmissionRepository` with two methods, with JSDoc:

    ```ts
    findById(input: {
      readonly scope: Readonly<FinanceOperationScope>;
      readonly submissionId: string;
    }): Promise<AccountingSubmission | undefined>;

    transition(input: {
      readonly scope: Readonly<FinanceOperationScope>;
      readonly submissionId: string;
      readonly status: "approved" | "rejected";
      readonly auditEvent: AccountingSubmissionAuditEvent;
    }): Promise<AccountingSubmission | undefined>;
    ```

    `transition` returns `undefined` when the submission is unknown or not
    pending. It writes the status update and the audit row in one
    transaction.
  - Change `insert` to
    `insert(submission, idempotencyKey, auditEvent)` and write both rows in
    one transaction.
  - `submitAccountingSubmission`: build the `submit` audit event and pass it
    to `insert`.
  - Add `approveAccountingSubmission({ repository, actor, submissionId })`
    and `rejectAccountingSubmission({ repository, actor, submissionId, reason })`:
    OWNER only (`forbidden` otherwise), validate the id (and reason) with
    Zod (`invalid-input`), call `transition`, map `undefined` to
    `not-found`.
- Edit `packages/backend/src/modules/accounting/postgres-submission-repository.ts`:
  implement `findById` and `transition`, and move `insert` onto
  `sql.begin(...)` so the submission row and the audit row commit together.
- `packages/backend/src/modules/accounting/index.ts` uses wildcard exports;
  confirm the new symbols are exported. No edit expected.
- Edit `apps/accounting/app/lib/submissions.ts`: add
  `approveAccountingSubmission` / `rejectAccountingSubmission` adapters that
  mirror the two existing adapters and reuse `repository`.
- Create `apps/accounting/app/api/submissions/[id]/approve/route.ts` and
  `apps/accounting/app/api/submissions/[id]/reject/route.ts`. Follow the
  existing `app/api/submissions/route.ts` pattern exactly:
  `requireAccountingSession` → build `AccountingActor` from the session →
  call the adapter → translate `invalid-input` to 400, `forbidden` to 403,
  `not-found` to 404. The reject route parses a JSON body `{ reason }`.
- Create matching route tests
  `apps/accounting/app/api/submissions/[id]/approve/route.test.ts` and
  `.../reject/route.test.ts`, mocking at the same module boundaries as the
  existing route test.

The submission list UI (`app/page.tsx`) is deliberately untouched in this
track.

Verification:

```
CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules/accounting
CI=true pnpm --filter @reading-advantage/backend check-types
CI=true pnpm --filter accounting test
CI=true pnpm --filter accounting check-types
```

Commit: `feat(accounting): approve and reject submissions with transactional audit events (track_id: accounting_product_simplification_20260822)`

---

## Phase 4: Dead-surface cut (FR-3, FR-4, FR-7)

### Task 10: Cut the finance-operations module to its consumed surface [checkpoint: 349ea438b]

Delete these files under `packages/backend/src/modules/finance-operations/`:

- `audit.ts`
- `authorization.ts`
- `controlled-imports.ts`
- `historical-private-evidence-binding-adapter.ts`
- `money.ts`
- `port-contracts.ts`
- `ports.ts`
- `postgres/` (whole directory)
- `postgres-record-repository.ts`
- `records.ts`
- `thb-valuation.ts` (this is FR-7: the pre-decision valuation preparer is
  replaced by the `settledThbAmount` column S2 already ships)

Delete every test file under
`packages/backend/src/modules/finance-operations/__tests__/` (21 files,
including `batch-digest-framing.test.ts` and `allowed-audit-ordering.test.ts`
from Tasks 2-3, and `contracts.test.ts` — but see the trim below).

Rewrite `packages/backend/src/modules/finance-operations/contracts.ts` to the
trimmed surface. Keep verbatim, with their existing comments:

- the `minorUnitSchema`, `currencySchema`, `internalEvidenceReferencePattern`,
  and `nonBlankStringSchema` helpers (now unexported),
- `privateEvidenceReferenceSchema` (lines 11-23 today),
- `financeMoneyInputSchema` and `FinanceMoneyInput` (lines 25-31),
- `financeOperationScopeSchema` and `FinanceOperationScope` (lines 145-151).

Do not change any regex or shape. The accounting contract compiles against
these exact definitions.

Rewrite `packages/backend/src/modules/finance-operations/index.ts` to:

```ts
/** Frozen finance-operations surface consumed by the accounting module. */
export {
  financeMoneyInputSchema,
  financeOperationScopeSchema,
  privateEvidenceReferenceSchema,
  type FinanceMoneyInput,
  type FinanceOperationScope,
} from "./contracts.js";
```

Trim `packages/backend/src/modules/finance-operations/__tests__/contracts.test.ts`
instead of deleting it: delete the `import type { ... } from "../ports.js"`
block, delete the `it` block that exercises the five port interfaces (search
for `satisfies CompanyIdentityAuthorizationPort`), and keep only the tests
that exercise the three kept schemas. If the trim proves messy, delete the
file; the accounting module tests keep transitive coverage of the kept
schemas.

Edit `packages/backend/package.json`: remove the
`./finance-operations/postgres` export entry. Keep `./finance-operations`.

Grep audit — must return nothing:

```
grep -rn "finance-operations" apps packages services --include="*.ts" --include="*.tsx" | grep -v node_modules | grep -v "/dist/" | grep -v "modules/finance-operations" | grep -v "modules/accounting" | grep -v measure/
```

Verification:

```
CI=true pnpm --filter @reading-advantage/backend check-types
CI=true pnpm --filter @reading-advantage/backend exec vitest run src/modules
CI=true pnpm --filter accounting test
```

Commit: `chore(finance-operations): cut the module to its five consumed symbols (track_id: accounting_product_simplification_20260822)`

### Task 11: Delete the db-side finance-operations surface [checkpoint: ba8e9b4]

Deletions:

- `packages/db/src/finance-operations-record-store.ts`
- `packages/db/src/schema/finance-operations.ts`
- `packages/db/src/__tests__/finance-operations-adversarial-persistence.integration.test.ts`
- `packages/db/src/__tests__/finance-operations-adversarial-persistence.red.test.ts`
- `packages/db/src/__tests__/finance-operations-atomic-audit.red.test.ts`
- `packages/db/src/__tests__/finance-operations-persistence.red.test.ts`
- `packages/db/src/__tests__/finance-operations-record-store.integration.test.ts`

Edits:

- `packages/db/src/index.ts`: remove
  `export * from "./finance-operations-record-store.js";`.
- `packages/db/src/schema/index.ts`: remove
  `export * from "./finance-operations.js";`.
- `packages/domain/src/tenant-registry.ts`: remove `financeRecords` and
  `financeRecordSuccessAuditOutbox` from the import block and remove their
  two `register(..., "REFERENTIAL")` lines.

Data check, then generate the drop migration:

```
psql "$DATABASE_URL for the main database" -t -c "select count(*) from finance_records;"
# Expect 0. If above zero, stop and escalate to the owner before dropping.
pnpm --filter @reading-advantage/db generate
```

Read the generated SQL. It must contain only `DROP TABLE` for
`finance_records` and `finance_record_success_audit_outbox`.

Verification:

```
pnpm --filter @reading-advantage/db migrate
pnpm --filter @reading-advantage/db doctor
CI=true pnpm --filter @reading-advantage/db check-types
CI=true pnpm --filter @reading-advantage/domain exec vitest run src/__tests__/tenant-coverage.test.ts
```

Commit: `chore(db): drop the unused finance-operations persistence surface (track_id: accounting_product_simplification_20260822)`

---

## Phase 5: Documentation and closeout (FR-9, FR-10)

### Task 12: Align the specs with reality [checkpoint: 3a3fa62]

- Edit `measure/tracks/company_finance_operations_20260810/spec.md`: add a
  dated notice at the top:

  > **Frozen 2026-08-22 (accounting_product_simplification_20260822):** the
  > foundation is frozen at the five symbols the accounting module consumes
  > (`financeMoneyInputSchema`, `financeOperationScopeSchema`,
  > `privateEvidenceReferenceSchema`, `FinanceMoneyInput`,
  > `FinanceOperationScope`). The records, controlled-imports, THB-valuation,
  > ports, and persistence surface are deleted. The THB policy is the owner
  > decision of 2026-08-20, implemented as the `settledThbAmount` column.

- Edit `measure/tracks/accounting_app_foundation_20260820/spec.md`: add a
  dated addendum at the top:

  > **Amended 2026-08-22 (accounting_product_simplification_20260822):** S5
  > (ledger), S6 (VAT/tax invoices), and S7 (WHT) are cut as build items
  > pending the accountant tool decision (FlowAccount/PEAK). S8 reduces to a
  > CSV export of approved submissions. The separate accounting database is
  > collapsed into the main stream; the tenant-registry NFR is satisfied by
  > EXEMPT classification. Approval with audit ships in the simplification
  > track; the owner review UI remains future work.

- Create
  `measure/tracks/accounting_product_simplification_20260822/supersession-note.md`
  with the same two notices and a one-line pointer to the w3 verdict.

Commit: `docs(measure): freeze the finance foundation and cut the ledger scope (track_id: accounting_product_simplification_20260822)`

### Task 13: Full gates and track closeout [checkpoint: 09a03cb]

Run the gates for the affected packages:

```
pnpm turbo run test check-types lint --filter=@reading-advantage/backend --filter=@reading-advantage/db --filter=@reading-advantage/domain --filter=accounting
measure/doctor.sh
```

Known pre-existing baseline, not attributable to this track: `@reading-advantage/db`
and `@reading-advantage/backend` full test suites fail on company-identity
integration tests when `COMPANY_IDENTITY_TEST_ADMIN_DATABASE_URL` is unset.
Compare failures against that baseline; only new failures block.

Closeout:

- Update `measure/tracks/accounting_product_simplification_20260822/metadata.json`:
  `status: "complete"`, `actual_tasks: 13`, fresh `updated_at`.
- Register the track in `measure/tracks.md` next to the other finance
  entries:

  ```
  - [x] **Track: Accounting Product Simplification** *Link: [./tracks/accounting_product_simplification_20260822/](./tracks/accounting_product_simplification_20260822/)*
    Fix the two live finance-operations defects, cut the module to its
    consumed symbols, collapse the accounting database, and add audit-backed
    approval. Ledger/VAT/WHT cut pending the accountant tool decision.
  ```

- Update the codebase graph for the changed files:

  ```
  build-graph update ./graph.db \
    packages/backend/src/modules/finance-operations/index.ts \
    packages/backend/src/modules/finance-operations/contracts.ts \
    packages/backend/src/modules/accounting/contracts.ts \
    packages/backend/src/modules/accounting/submissions.ts \
    packages/backend/src/modules/accounting/postgres-submission-repository.ts \
    packages/db/src/schema/accounting.ts \
    packages/db/src/schema/index.ts \
    packages/db/src/index.ts \
    packages/domain/src/tenant-registry.ts \
    apps/accounting/app/lib/submissions.ts \
    apps/accounting/app/api/submissions/route.ts \
    apps/accounting/app/api/submissions/[id]/approve/route.ts \
    apps/accounting/app/api/submissions/[id]/reject/route.ts
  ```

Commit: `chore(measure): close out the accounting product simplification track (track_id: accounting_product_simplification_20260822)`
