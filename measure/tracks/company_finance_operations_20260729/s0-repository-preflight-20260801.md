# Finance S0 Repository-Only Preflight

**Track:** `company_finance_operations_20260729`
**Recorded:** 2026-08-01
**Status:** `NON_ADVANCING_REPOSITORY_FACTS_ONLY`

This is a privacy-safe, read-only preflight. It records repository facts and
explicit unknowns to support a later S0 intake. It is not discovery completion,
a decision register, a source-owner agreement, an S0 acceptance receipt, or
authority to start Finance implementation. No live financial document, payroll
detail, tax identifier, bank detail, customer PII, credential, or Tutor data is
contained here.

## Track and external-input state

- The Finance registry entry remains `[ ]`; `metadata.json` remains `new`.
- `s0-external-readiness.md` records each required external input as **Not
  supplied**: the redacted discovery dossier, finance decision register, Tutor
  conflict disposition, source-boundary register, and owner/accountant S0
  acceptance.
- Therefore no S0 checklist item, plan marker, production behavior, role,
  migration, import, tax rule, category, numbering rule, close rule, or pack
  layout is advanced by this record.

## Verified repository facts

| Area | Read-only observation | Consequence for Finance |
| --- | --- | --- |
| Finance application | `apps/accounting` is absent in this checkout. | Do not scaffold it before S0 inputs and the named technical gates are accepted. |
| Capability Kernel | `backend_capability_kernel_20260713` is still `in_progress` in its metadata/registry. | No Finance runtime capability registration is authorized. |
| Company Identity | `company_identity_sso_20260715` is `archive-pending`; an inspected search of Accounts, backend, DB, and that track found no `finance-operations` or `FINANCE_*` registration. | Do not infer or register Finance roles; the accepted owner-role map remains required. |
| Durable jobs | `durable_job_worker_platform_20260713` is `in_progress`; its Phase 4 tasks remain blocked. | No Finance import, scheduled billing, document-processing, or pack job may be implemented. |
| Private storage | `storage_hardening_20260611` remains `new` with unresolved contract/adoption work. | Do not store or expose Finance evidence until private read/stream, checksum, write, and read-only signed-URL semantics are accepted. |
| CRM billing source | `customer_licensing_crm_20260722` remains blocked at the shared graph gate. | No `CustomerBillingCatalogPort` or school-billing work may be treated as available. |
| Tutor source | The repository system map assigns Tutor a separately accepted `TutorFinancialExportPort`; no accepted producer is present in this checkout. | Finance must not read Tutor data directly or substitute human CSV inference. |
| Repository graph | `repo-graph` is available, but the live graph reports unrelated stale files in the shared dirty worktree. | This preflight does not use it as a Finance implementation baseline and does not rescan it. |

## Confirmed boundary constraints

The existing [Business Operations System Map](../../business-operations-system-map.md)
continues to govern this preflight: Finance is a global operational subledger
and evidence workspace, the Thai accountant remains authoritative for statutory
books and filings, CRM owns customer/commercial facts, Tutor owns its payment
and settlement workflow, and cross-database reads, shared credentials, and
provider-SDK shortcuts are forbidden.

## Deliberately unresolved

The following cannot be determined from this repository and remain fail-closed
until supplied by their authorized owners:

- categories, VAT/WHT posture, effective dates, rounding, document numbering,
  evidence requirements, and accountant examples;
- period materiality, locking/correction policy, retention, pack layout,
  delivery/acknowledgement, and approver decisions;
- the fixed-three-percent WHT versus runbook-threshold conflict and the
  external-payout versus automatic-transfer conflict;
- source auth, revision, idempotency, correction, retention, failure, and safe
  error agreements for CRM, Tutor, storage, payment evidence, and pack delivery;
- owner and Thai-accountant S0 acceptance.

## Next legitimate action

Resume S0 only when the five inputs in
[`s0-external-readiness.md`](./s0-external-readiness.md) are supplied with the
required authority. At that point, Terra may define and run bounded Red tests,
Luna may implement only the accepted foundation, and Sol may evaluate the
phase/track acceptance boundary.
