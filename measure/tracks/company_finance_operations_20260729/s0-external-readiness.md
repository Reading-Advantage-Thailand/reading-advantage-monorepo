# Finance S0 External Readiness Intake

**Track:** `company_finance_operations_20260729`
**Status:** `BLOCKED_EXTERNAL_INPUTS` — planning intake only; track metadata remains `new`.
**Recorded:** 2026-08-01

This checklist turns the existing S0 dependencies into a privacy-safe intake.
It is not an owner/accountant acceptance receipt, an implementation approval,
or evidence of a tax, role, document, close, or pack decision. Do not commit
live financial documents, credentials, bank details, payroll detail, customer
PII, tax identifiers, or unredacted reports here.

## Required external inputs before S0 Red work

| Input | Required authority | Unlocks | Required evidence and handling | Current state |
| --- | --- | --- | --- | --- |
| Redacted discovery dossier | Finance owner + delegated discovery owners | S0 discovery completion | Inventory representative reports, evidence folders, school invoices, contractor payments, reimbursements, payroll summaries, and handoff steps. Record source, format, volume, currency, period, deadline, retention, sensitivity, owner, and correction process. Commit only redacted metadata and immutable references/hashes. | Not supplied |
| Finance decision register | Company owner + Thai accountant | S0 decision-ratification and bounded contract Red tests | Categories; VAT/WHT posture and effective-date/version rules; document/number/evidence policy; redacted/synthetic examples; period/materiality/lock/correction; retention; pack/delivery/acknowledgement; approvers. Every unresolved item has a named owner and fail-closed default. | Not supplied |
| Tutor conflict disposition | Company owner + Tutor owner + Thai accountant where tax treatment is implicated | Tutor boundary modelling; later S3 producer scope | Attributed decision and remediation owner/track for fixed 3% WHT versus the 1,000 THB runbook threshold and external-payout versus automatic-Omise-transfer conflict. Finance imports applied facts only; it must not recalculate or bless historical treatment. | Not supplied |
| Source-boundary register | Owners of CRM, Tutor, storage, payment evidence, and accountant-pack delivery | S0 port contracts | For each source: ownership, schema/version, auth, idempotency, revision/correction, checksum, retention, failure mode, and safe errors. Explicitly prohibit source DB reads and provider SDK imports. | Not supplied |
| S0 acceptance | Company owner + Thai accountant | Any production financial behavior | Attributed, dated acceptance of examples, import controls, close rules, and pack layout with immutable evidence references/hashes. | Not supplied |

## Technical prerequisites for S0 Green foundation

These are evidence dependencies, not substitutes for the external decisions:

| Prerequisite | Owning track / evidence | Gate | Status (2026-08-03) |
| --- | --- | --- | --- |
| Backend Capability Kernel | `backend_capability_kernel_20260713` final acceptance | Required before Finance runtime registration. | `in_progress`; not accepted |
| Company Identity owner-role map | `company_identity_sso_20260715` and accepted owner-role mapping | Required before production `COMPANY_ADMIN -> FINANCE_ADMIN` use. | `archive-pending`; mapping not accepted |
| Private storage semantics | Accepted private read/stream, write, checksum, and read-only signed URL evidence | Required before document migration or finance evidence storage. | `new`; semantics not accepted |
| Durable jobs | `durable_job_worker_platform_20260713` Phase 4 | Required before production import, schedule, or pack jobs. | `in_progress`; Phase 4 not reached |
| CRM source contract | `customer_licensing_crm_20260722` accepted customer/site/subscription contract | Required before S2 billing. | `new`; contract not accepted |
| Tutor producer | Separately accepted Tutor track implementing `TutorFinancialExportPort` | Required before S3 ingestion; Finance never reads Tutor's database. | No track exists; port unimplemented |

Status column recorded 2026-08-03 from each owning track's `metadata.json`.
No prerequisite has reached final acceptance, so every S0 Green gate above
remains closed. This is a dated observation of track state only; it is not an
acceptance, an approval, or a substitute for the external owner/accountant
inputs required in the preceding table.

## Allowed and forbidden work while inputs are absent

Allowed: finish new-track registration, maintain redacted templates, model
unknown/pending states in planning contracts, and prepare structural Red tests
only after the S0 entry checklist is satisfied.

Forbidden: hard-code tax or WHT values; select categories, rates, numbering, or
pack semantics; register production Finance roles; create the app, migrations,
or data imports; introduce provider/source DB shortcuts; claim discovery,
manual acceptance, close, or launch completion.

## Future acceptance fields (intentionally blank)

| Field | Value |
| --- | --- |
| Decision ID | |
| Authority name and role | |
| Effective date/version | |
| Accepted redacted/synthetic examples | |
| Immutable evidence reference/hash | |
| Unresolved fail-closed items | |
| Owner/accountant S0 acceptance reference | |
