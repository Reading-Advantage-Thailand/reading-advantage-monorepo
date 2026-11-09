# Specification: Accounting Drive intake

**Track ID:** `accounting_drive_intake_20261109`
**Type:** feature (classic FR list).
**Status:** new. Opened 2026-11-09.
**Author model:** nvidia/stepfun-ai/step-5-preview
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.
**Blocks:** the monthly close and the monthly accountant handoff of `apps/accounting`, and the structure report of 2026-11-11.
**PM request:** A-52. Daniel's answers of 2026-11-09.
**Start gate:** Build starts after 2026-11-20. An earlier start uses only a slot that Storytime does not need.

## 1. Purpose

The accounting app holds staff expenses and bills that a person types into a form.
The office assistant keeps the real documents in a Google Drive folder.
That folder holds the payment vouchers, the cloud invoices, the vendor invoices,
the payslips, a bank statement, the year-end working papers, and the school
sales invoices.

This track brings those documents into the app. Each file becomes a pending
submission with the file as private evidence. A scheduled poll finds new files.
Gemini on Vertex AI reads the PDFs that are not text. Text PDFs are read on this
machine. The OWNER and the ACCOUNTANT approve or reject as they do today. The
CSV export does not change.

The track also adds the CEO monthly close. The CEO signs the monthly report
once. The report locks after the sign-off, and an audit row records both the
sign-off and the lock.

## 2. Facts read on 2026-11-09

### 2.1 The accounting app and its data layer

| Fact | Location |
|---|---|
| The app adapter builds the repository against the dedicated Accounting database | `apps/accounting/app/lib/submissions.ts:36-41` (`createAccountingRuntimeClient({ databaseUrl: process.env.ACCOUNTING_DATABASE_URL ?? "" })`) |
| Evidence is stored once through a company-scoped port, never with a public ACL | `apps/accounting/app/lib/private-evidence-storage.ts:139-166` (`storage.put(key, body, { contentType, public: false })`) |
| The generated evidence reference is filename-free | `apps/accounting/app/lib/private-evidence-storage.ts:143` (`private-evidence://<companyId>/submissions/<uuid>/evidence`) |
| The submissions route compares evidence bytes with a local loop | `apps/accounting/app/api/submissions/route.ts:109-115` (`haveSameBytes`), used at `:298-309` |
| The route accepts an idempotency key header and validates it | `apps/accounting/app/api/submissions/route.ts:219-238` |
| Today the route accepts PDF and image evidence only | `apps/accounting/app/api/submissions/route.ts:194-201` (`isSupportedEvidenceType`) |
| The domain revalidates every stored row on read | `packages/backend/src/modules/accounting/postgres-submission-repository.ts:67-86` (`toAccountingSubmission`) |
| Idempotent replay is enforced by a partial unique index | `packages/db/src/accounting/schema/index.ts:102-106` (`accounting_submissions_idempotency_key_idx` on scope, submitter, key) |
| Money is digit text in exact minor units, never a float | `packages/db/src/accounting/schema/index.ts:34-36`; contract at `packages/backend/src/modules/accounting/contracts.ts:41` |
| The audit table is append-only by grants | `packages/db/src/accounting/schema/index.ts:110-114` (comment), and `apps/accounting/scripts/accounting-runtime-grants.sql` |

### 2.2 Roles, visibility, and approval

| Fact | Location |
|---|---|
| Three accounting roles exist: OWNER, ACCOUNTANT, STAFF | `apps/accounting/app/lib/company-oidc.ts:29-30` (`AccountingRole`) |
| The role is resolved strongest-first from the Accounts claims | `apps/accounting/app/lib/company-oidc.ts:102-112` (`resolveAccountingRole`) |
| The domain accepts the same three roles | `packages/backend/src/modules/accounting/submissions.ts:131-135` (`ACCOUNTING_ROLES`) |
| STAFF sees only its own submissions. OWNER and ACCOUNTANT see all | `packages/backend/src/modules/accounting/submissions.ts:324-340` (`listAccountingSubmissions`) |
| Approve and reject are OWNER only today | `packages/backend/src/modules/accounting/submissions.ts:344-348` (`requireOwnerRole`), called at `:361` and `:402` |
| The submission audit actions are submit, approve, reject | `packages/backend/src/modules/accounting/contracts.ts:78-82`; DB check at `packages/db/src/accounting/schema/index.ts:130-133` |
| The session guard introspects every request against Accounts | `apps/accounting/app/lib/auth.ts:61-117` (`requireAccountingSession`) |
| The actor carries the company scope from the session, never the request | `apps/accounting/app/lib/route-helpers.ts:47-51` (`actorFromUser`) |
| The CSV export allows OWNER and ACCOUNTANT and refuses STAFF | `apps/accounting/app/api/submissions/export/route.ts:31-40` |
| The CSV export writes approved submissions only, with these headers | `apps/accounting/app/api/submissions/export/route.ts:57-76` |
| The owner receives the accounting OWNER role at Accounts bootstrap | `apps/accounts/scripts/bootstrap-production.ts:78` (`{ applicationKey: "accounting", roleKey: "OWNER" }`) |
| The accounting OIDC client `accounting-web` is registered | `apps/accounts/scripts/bootstrap-contract.ts:24` |

### 2.3 What the app does not have yet

| Fact | How it was checked |
|---|---|
| The app has no `@reading-advantage/ai` dependency | `apps/accounting/package.json` dependencies (storage, db, backend, auth, auth-client, config, types, ui, utils only) |
| The app has no worker, no job runner, and no scheduler script | `apps/accounting/package.json` scripts (`dev`, `build`, `start`, `lint`, `test`, `test:watch`, `check-types`) |
| The app has no Google Drive client and no `googleapis` dependency | `apps/accounting/package.json`; no Drive import under `apps/accounting/` |
| No table for intake state or for a monthly close exists | `packages/db/src/accounting/schema/index.ts` holds two tables only (`accounting_submissions`, `accounting_submission_audit_events`) |
| No Primary Advantage school invoice (`PA-INV`) source exists in this repository | `git grep -ril "PA-INV"` gives no hit; `git grep -ril "school invoice"` hits three files under `measure/tracks/company_finance_operations_2026*` only |
| No payment receipt or invoice code exists in Primary Advantage | `grep -rli "invoice\|receipt"` over `apps/primary-advantage/**/*.ts(x)` gives no product hit; `packages/db/src/schema/primary.ts` holds no invoice table |
| Storytime Advantage has no payment or invoice route | `apps/storytime/app` holds auth, teacher, and reader routes only; `apps/storytime/lib` has no payment module |
| The durable job tables live in the main product database, not the accounting database | `packages/db/src/schema/jobs.ts:44` (`durableJobs`); `packages/domain/src/tenant-registry.ts:400` (REFERENTIAL) |

### 2.4 The AI adapter

| Fact | Location |
|---|---|
| The Vertex provider needs a project, a service account email, and a private key | `packages/ai/src/client.ts:63-80` (`createAIClient` case `vertex`) |
| The provider is selected by the environment variable `AI_PROVIDER` | `packages/ai/src/client.ts:110`, read at `:126-128` |
| `VertexProvider` reuses the Google provider methods | `packages/ai/src/providers/vertex.ts:24-40` |
| No production code may import an AI SDK directly | `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts`, recorded in `measure/tech-stack.md:96` |
| The OpenRouter provider is a separate route and is out of scope for finance documents | `packages/ai/src/providers/openrouter.js`; `measure/tech-stack.md:96` |

### 2.5 Tutor Advantage settlement (read only)

Source commit: `b210c98a45912825f46c4c177b0f93da38e721a5`
(recorded with `git -C /home/daniebo/Desktop/tutor-advantage log -1 --format=%H` on 2026-11-09).

| Fact | Location |
|---|---|
| Settlement runs carry a unique period month, a status, and an approval | `packages/database/prisma/schema.prisma:697-712` (`SettlementRun`) |
| Payout lines carry minor-unit money and a withholding tax column | `packages/database/prisma/schema.prisma:716-737` (`PayoutLine`) |
| Payout documents carry the gross, the withholding, and the net amounts | `packages/database/prisma/schema.prisma:738-762` (`PayoutDocument`) |
| The settlement list endpoint is paged and filtered by status and period | `services/finance-mlm-service/src/controllers/settlementController.ts:1496-1523` |
| The payout-line endpoint returns the lines and the run header | `services/finance-mlm-service/src/controllers/settlementController.ts:715` |
| The run export endpoint exists | `services/finance-mlm-service/src/controllers/settlementController.ts:604` |
| The read endpoints gate on ADMIN or FINANCE_CHECKER today | `services/finance-mlm-service/src/controllers/settlementController.ts:1503-1509` |
| The service is Express with a Prisma client | `services/finance-mlm-service/package.json` (`express`, `prisma`) |

### 2.6 The Google Drive folder 'Accounting' (PM facts of 2026-11-09)

The folder holds:

- the folders `2024` and `2025`, and the 2026 files at the top level.
- monthly payment voucher Google Sheets.
- Google Cloud and Workspace invoice PDFs (text PDFs).
- other vendor invoices.
- payslips, since 2026-09.
- one bank statement.
- the accountant's year-end working papers.
- school sales invoices.

The first load runs on this machine on 2026-11-10 at 15:22. It covers January to
October 2026. The PM sends a structure report by 2026-11-11. The report holds the
document types, the fields, and the sample shapes. The report holds no real
amount.

## 3. Roles and permissions

### 3.1 The mapping to the existing roles

| PM actor | Existing or new role | Visibility | Actions |
|---|---|---|---|
| Daniel (OWNER) | `OWNER` (exists) | all documents | submit, approve, reject, export, sign the close |
| the office assistant (ACCOUNTANT) | `ACCOUNTANT` (exists) | all documents, payslips and bank statements included | submit, approve, reject, export, sign the close |
| the CEO | `CEO` (**new**) | the report and the approved submissions | sign the monthly close, read the closed report |
| staff and contractors | `STAFF` (exists) and `CONTRACTOR` (**new**) | own items only | submit, read own items |

`CONTRACTOR` is a new accounting role. It behaves exactly as `STAFF` behaves
today: it submits and it sees only its own items. It may not export, and it may
not approve or reject.

`CEO` is a new accounting role. It signs the monthly close. It does not approve
or reject submissions. It reads the closed report and the approved submissions.

### 3.2 The new permissions

The permissions live in a new permissions module. Each permission names the
roles that hold it.

| Permission | Roles |
|---|---|
| `accounting:submission:submit` | OWNER, ACCOUNTANT, STAFF, CONTRACTOR |
| `accounting:submission:view-own` | STAFF, CONTRACTOR |
| `accounting:submission:view-all` | OWNER, ACCOUNTANT, CEO |
| `accounting:submission:approve` | OWNER, ACCOUNTANT |
| `accounting:submission:reject` | OWNER, ACCOUNTANT |
| `accounting:submission:export` | OWNER, ACCOUNTANT |
| `accounting:evidence:read` | OWNER, ACCOUNTANT, CEO |
| `accounting:monthly-close:sign` | CEO, OWNER |
| `accounting:monthly-close:read` | OWNER, ACCOUNTANT, CEO |

`accounting:submission:approve` and `accounting:submission:reject` widen from
OWNER only to OWNER and ACCOUNTANT. See open item Q1.

### 3.3 What changes in Accounts

`AccountingRole` gains `CEO` and `CONTRACTOR`
(`apps/accounting/app/lib/company-oidc.ts:29-30`). `resolveAccountingRole`
(`:102-112`) resolves the strongest role. The default order is OWNER, CEO,
ACCOUNTANT, CONTRACTOR, STAFF. The Accounts bootstrap seeds the new role keys.
That side is `deferred:pm`, because Apps Accounts belongs to the PM.

## 4. Sources

### 4.1 The Google Drive folder 'Accounting'

The Drive folder is the intake source. It holds the history (2024, 2025, and the
2026 files) and the monthly uploads. Section 9 states the SOP facts, the folder
layout, the naming rule, the size limit, and the failure rule.

The PM facts about the folder are in section 2.6.

### 4.2 The monthly invoice pull (`deferred:pm`)

The PM builds a job in `advantage-pr`. The job pulls the Google Cloud,
Workspace, and OpenAI invoices each month and writes them into the Drive folder.
This track only reads the folder. It does not build the pull, and it does not
call the vendor APIs. The task stays `deferred:pm`.

### 4.3 Tutor Advantage settlement (income)

The Accounting app reads the Tutor settlement data. The interface is read-only.
The Accounting app pulls; the Tutor service never pushes.

**Direction.** One direction only: `finance-mlm-service` → `accounting`. Every
endpoint is an HTTP GET. The Accounting app writes nothing to the Tutor service.

**Proposed endpoints.** All three exist today.

1. `GET /v1/settlements?periodMonth=YYYY-MM&status=APPROVED&page&pageSize`
   Fields: `settlementRunId`, `periodMonth`, `status`, `timezone`, `approvedBy`,
   `approvedAt`, `createdAt`. Evidence: `settlementController.ts:1496`, the
   query parse at `:1513-1523`.
2. `GET /v1/settlements/:snapshotId/lines`
   Fields: `payoutLineId`, `tutorUserId`, `grossVolumeMinor`, `payoutRate`,
   `payoutAmountMinor`, `withholdingTaxMinor`, `netPayoutMinor`,
   `badgeBonusMinor`, `eligibilityStatus`. Evidence:
   `settlementController.ts:715`; columns at `schema.prisma:716-737`.
3. `GET /v1/settlements/:snapshotId/export`
   The run export document, stored as private evidence. Evidence:
   `settlementController.ts:604`.

**Money.** Every amount is an integer in minor units. `PayoutLine` holds
`grossVolumeMinor`, `payoutAmountMinor`, `withholdingTaxMinor`,
`netPayoutMinor`, and `badgeBonusMinor` as `BigInt`
(`schema.prisma:716-737`). The Accounting side stores the same digit text as
`accounting_submissions.amountMinor` does. No currency column exists on the
payout line. Default currency is THB (open item Q9).

**Auth.** A service-to-service bearer token minted by Accounts. The token holds
the audience `finance-mlm` and the scope `settlements:read`. Today the endpoint
gates on the ADMIN or FINANCE_CHECKER role
(`settlementController.ts:1503-1509`). That gate must accept the service
identity. The change belongs to the Tutor developer, so the task is
`deferred:pm`. This repository never writes in
`/home/daniebo/Desktop/tutor-advantage`.

**Idempotency.** The natural key is `settlementRunId` for a run and
`payoutLineId` for a line. The Accounting side stores the source commit
(`b210c98a45912825f46c4c177b0f93da38e721a5`), the pull instant, and the source
commit of the response. A second pull of the same `periodMonth` upserts on the
same natural key and adds one intake audit row. No row is deleted.

**Rate and shape.** The list endpoint is paged with a page size of at most 100
(`settlementController.ts:1516`). The Accounting poll reads one `periodMonth`
per month and follows the pages until the page is short.

### 4.4 Primary Advantage and Storytime payment receipts (`deferred:pm`)

The PM names the school invoices `PA-INV`. No `PA-INV` source exists in this
repository (section 2.3). No payment receipt or invoice code exists in
`apps/primary-advantage` or in `apps/storytime` (section 2.3). The two intake
tasks stay `deferred:pm` until the PM names the source system, the format, and
the owner.

## 5. Intake flow

1. A scheduled poll lists the Drive intake folder. The poll is not in a request
   path.
2. The poll filters the files by the accepted types and the size limit.
3. Each new file becomes one pending submission. The Drive file id is the
   idempotency key.
4. The poll stores the bytes through `putPrivateEvidence`
   (`apps/accounting/app/lib/private-evidence-storage.ts:139-166`). The domain
   receives only the reference.
5. A text PDF is read on this machine. A PDF that is not text is read by Gemini
   on Vertex AI.
6. A Google Sheets payment voucher is exported as CSV and read as rows.
7. A repeat poll finds the same Drive file id. The byte comparison of the app
   (`apps/accounting/app/api/submissions/route.ts:298-309` and
   `packages/backend/src/modules/accounting/submissions.ts:169-191`) decides
   whether the bytes match. Equal bytes give a replay, and the app shows the
   item as a duplicate. A duplicate is not added again.
8. The OWNER or the ACCOUNTANT approves or rejects the item, as today.
9. The CSV export does not change.

### 5.1 The idempotency rule and the hashing policy

The intake adds no hash field, no checksum column, and no manifest
(AGENTS.md hashing policy). The Drive file id is the idempotency key. The
evidence comparison reuses the byte loop that the app already has. Git identity
and the Drive file id identify the source.

The idempotency key is at most 256 characters
(`packages/backend/src/modules/accounting/contracts.ts:46-50`). A Drive file id
fits. The unique index is scoped by company, submitter, and key
(`packages/db/src/accounting/schema/index.ts:102-106`), so the poll must run as
one stable account (open item Q3).

### 5.2 The data-out gate

Gemini on Vertex AI (project `reading-advantage`) reads only the PDFs that are
not text. Daniel approved this data-out gate on 2026-11-09. A text PDF is read
on this machine. No finance document goes to the Aliyun plan, to OpenRouter, or
to any other model route. A test that needs a model uses a fake.

### 5.3 The extracted marker

Every value that the model produces carries a marker. The marker is a field on
the intake record: `extraction: "model"`. A value that a person types carries
`extraction: "human"`. A value that the local text reader produces carries
`extraction: "local-text"`. The app shows the marker next to the value. A
reviewer sees which numbers came from the model.

## 6. Accepted types

| Document type | Formats | Read path |
|---|---|---|
| receipt | PDF, JPEG, PNG | text PDF local; image and non-text PDF to Vertex |
| tax invoice | PDF | text PDF local; non-text PDF to Vertex |
| bank statement | PDF | text PDF local; non-text PDF to Vertex |
| payroll sheet | PDF, JPEG, PNG | text PDF local; image and non-text PDF to Vertex |
| withholding tax certificate | PDF | text PDF local; non-text PDF to Vertex |
| Google Sheets payment voucher | Google Sheet | exported as CSV, then read as rows |
| Google Cloud and Workspace invoice | PDF | text PDF local |
| OpenAI invoice | PDF | text PDF local |

Human uploads keep the rule of today: PDF and image
(`apps/accounting/app/api/submissions/route.ts:194-201`). A Google Sheet is an
intake-only type. A human cannot upload a Sheet through the form.

**How a Sheet is read.** The adapter exports the spreadsheet with the Drive
`files.export` endpoint and `mimeType=text/csv`. The export returns the first
worksheet. The CSV rows go to the placeholder parser for the payment voucher.
Default: one voucher per file, so the first worksheet holds the data (open item
Q5).

## 7. The monthly close

1. The OWNER or the ACCOUNTANT starts a close for one period month (`YYYY-MM`).
2. The close collects the approved submissions of that period.
3. The close builds a report and stores it as private evidence.
4. The CEO signs the report. The sign-off writes the status `signed`, the
   signer, the role, and the instant.
5. The report locks. The lock writes the status `locked` and `locked_at`.
6. The sign-off and the lock each write one audit row.

The report is a private-evidence object. The storage port writes it once and
never updates it (`apps/accounting/app/lib/private-evidence-storage.ts:139-166`).
That gives the lock its immutability. The close row moves from `open` to
`signed` to `locked` and stops there. The CSV export stays as it is; it reads
approved submissions and does not read the close.

## 8. Document parsing (stub until the structure report)

This section is a stub. The structure report of 2026-11-11 fills it in. Each
document type gets one named placeholder and no field list until then.

| Document type | Placeholder parser | Placeholder contract |
|---|---|---|
| receipt | `parseReceipt` | `receiptDraftSchema` |
| tax invoice | `parseTaxInvoice` | `taxInvoiceDraftSchema` |
| bank statement | `parseBankStatement` | `bankStatementDraftSchema` |
| payroll sheet | `parsePayrollSheet` | `payrollSheetDraftSchema` |
| withholding tax certificate | `parseWithholdingCertificate` | `withholdingCertificateDraftSchema` |
| Google Sheets payment voucher | `parsePaymentVoucherSheet` | `paymentVoucherDraftSchema` |
| cloud or Workspace invoice | `parseCloudInvoice` | `cloudInvoiceDraftSchema` |
| OpenAI invoice | `parseOpenAiInvoice` | `openAiInvoiceDraftSchema` |

Every draft carries the extraction marker of section 5.3. Plan task 4.2 fills
this section after the report arrives.

## 9. SOP facts (for the office assistant)

- **Folder layout.** One Drive folder named `Accounting intake`. Inside it, one
  folder per month named `YYYY-MM`, for example `2026-11`. The poll reads only
  that folder tree.
- **Reconciliation with 'Accounting'.** The existing `Accounting` folder holds
  the history, the folders `2024` and `2025`, the 2026 files, and the accountant's
  year-end working papers. The poll does not read that folder for intake and
  never writes in it. The one-off first load of 2026-11-10 reads `Accounting`
  by a named folder id. From 2026-12, the monthly uploads go to
  `Accounting intake`.
- **File naming rule.** `YYYY-MM_<document-type>_<counterparty>.<ext>`. Use
  lowercase words and hyphens. Use no spaces. Use at most 120 characters. Put no
  amount in the name. Example: `2026-11_tax-invoice_google-cloud.pdf`.
- **Accepted types.** PDF, JPEG, PNG, and the Google Sheets payment voucher.
  The document types are receipt, tax invoice, bank statement, payroll sheet,
  and withholding tax certificate.
- **Size limit.** 20 MB per file. A larger file fails with a visible reason.
- **When a file fails.** Open the intake list in the app. Read the failure
  reason. Fix the file. Upload it again with the same name. The poll retries a
  file at most three times, then leaves the item for the OWNER. The app never
  deletes a file from Drive.
- **When a file is a duplicate.** The app shows the item as a duplicate. It does
  not add a second row. No action is needed.
- **Who sees what.** The OWNER and the ACCOUNTANT see every document. The CEO
  sees the signed report and the approved submissions. Staff and contractors see
  only their own items.

## 10. Functional requirements

- **FR-1.** A new backend module extends `packages/backend/src/modules/accounting`
  with the intake contracts, the intake domain functions, the monthly-close
  domain functions, and a permissions module. The export path
  `@reading-advantage/backend/accounting` does not change.
- **FR-2.** Every new Drizzle table is classified in
  `packages/domain/src/tenant-registry.ts`. Default classification is `EXEMPT`,
  as the two accounting tables are today
  (`packages/domain/src/tenant-registry.ts:263-265`).
- **FR-3.** A new table `accounting_intake_documents` holds one row per Drive
  file: the Drive file id, the folder id, the document type, the evidence
  reference, the extraction marker, the status, and the failure count.
- **FR-4.** A new table `accounting_monthly_closes` holds one row per period
  month: the period, the status, the signer, the role, the instants, and the
  report evidence reference.
- **FR-5.** `accountingSubmissionActionSchema`
  (`packages/backend/src/modules/accounting/contracts.ts:78-82`) gains
  `monthly-close-sign` and `monthly-close-lock`. The DB check
  (`packages/db/src/accounting/schema/index.ts:130-133`) widens in the same
  migration. See open item Q8.
- **FR-6.** `AccountingRole` gains `CEO` and `CONTRACTOR`
  (`apps/accounting/app/lib/company-oidc.ts:29-30`). `resolveAccountingRole`
  (`:102-112`) resolves the new roles.
- **FR-7.** The domain accepts the new roles
  (`packages/backend/src/modules/accounting/submissions.ts:131-135`).
- **FR-8.** The permissions module decides submit, view-own, view-all, approve,
  reject, export, evidence read, and close sign (section 3.2). No handler holds
  its own role test.
- **FR-9.** `approveAccountingSubmission` and `rejectAccountingSubmission`
  accept OWNER and ACCOUNTANT. The route, the status transition, and the audit
  actions do not change.
- **FR-10.** The intake poll runs on a schedule. It is not in a request path.
  Default: a Cloud Run job in `apps/accounting` with a durable lease row in the
  accounting database (open item Q12).
- **FR-11.** The Drive access sits behind a provider-neutral port in the
  backend module. The Google adapter lives in `apps/accounting/app/lib/`. The
  adapter uses `googleapis` with a service account and no key file.
- **FR-12.** `googleapis` joins `apps/accounting/package.json` from the
  workspace catalog (`pnpm-workspace.yaml:69`, `googleapis: ^148.0.0`).
- **FR-13.** `@reading-advantage/ai` joins `apps/accounting/package.json`. The
  extraction port sits in the backend module. The app adapter calls
  `createAIClient({ provider: "vertex", ... })` (`packages/ai/src/client.ts:63-80`).
- **FR-14.** A text PDF is read locally. A PDF that is not text goes to Vertex.
  A test that needs a model uses a fake; no test calls a real model.
- **FR-15.** Every extracted value carries the marker of section 5.3.
- **FR-16.** The intake passes the Drive file id as the idempotency key. The
  byte comparison reuses `compareEvidence`
  (`packages/backend/src/modules/accounting/submissions.ts:169-191`). A duplicate
  is shown, not added again.
- **FR-17.** The intake adds no hash field, no checksum column, and no manifest.
- **FR-18.** The monthly close writes the report to private evidence, then the
  sign-off, then the lock, then two audit rows.
- **FR-19.** The CSV export route and its headers do not change
  (`apps/accounting/app/api/submissions/export/route.ts:31-76`).
- **FR-20.** The Tutor read interface is proposed in section 4.3. No task writes
  in `/home/daniebo/Desktop/tutor-advantage`. Any change there is
  `deferred:pm`.
- **FR-21.** No real finance document and no real amount enters git, a test, a
  log, or a non-Vertex model route.
- **FR-22.** Every new and changed function carries a JSDoc comment (AGENTS.md).

## 11. Non-functional requirements

- Business logic lives in the backend module. Route handlers stay thin
  (AGENTS.md).
- Zod contracts validate every external boundary: the Drive listing, the Drive
  export, the Vertex response, the Tutor response, and the intake form.
- Provider SDKs stay behind adapters: Drive, storage, AI.
- Structured logging records the intake. A log line holds no amount, no payee,
  and no document text.
- Audit rows are append-only. The runtime role keeps SELECT and INSERT only
  (`apps/accounting/scripts/accounting-runtime-grants.sql`).
- Migrations are generated with Drizzle and reviewed before CI runs them.
- Tests use fakes only. No real finance document appears in a test.
- No framework upgrade rides with this track (version policy).

## 12. Acceptance criteria

Each criterion has an automated test that can falsify it.

1. Given a Drive listing that holds a new file and a stored file, when the poll
   runs, then it creates one submission for the new file and zero for the stored
   file.
2. Given the same Drive file id twice with equal bytes, when the poll runs,
   then the second run gives a replay and the list shows one item marked as a
   duplicate.
3. Given the same Drive file id with different bytes, when the poll runs, then
   the domain raises `conflict` and no second row is written.
4. Given a file above the size limit or with a refused type, when the poll runs,
   then it writes no submission and it records one failure row with a safe
   reason.
5. Given a text PDF, when the poll runs, then the local reader reads it and the
   Vertex port is never called.
6. Given a PDF with no extractable text, when the poll runs, then the Vertex
   port reads it and the record carries `extraction: "model"`.
7. Given a Google Sheets voucher, when the poll runs, then the adapter exports
   `text/csv` and the parser reads the rows.
8. Given a CONTRACTOR actor, when it lists submissions, then it sees only its
   own items, and the export route returns 403.
9. Given a CEO actor, when it lists submissions, then it sees the approved
   submissions and it may sign the close, and the approve route returns 403.
10. Given a close in status `open`, when the CEO signs, then the status becomes
    `signed`, one audit row with action `monthly-close-sign` is written, and the
    report evidence reference is set.
11. Given a close in status `signed`, when the lock runs, then the status
    becomes `locked`, `locked_at` is set, and one audit row with action
    `monthly-close-lock` is written.
12. Given a close in status `locked`, when any transition is attempted, then no
    row changes and no audit row is written.
13. Given the accounting tables, when a test reads the tenant registry, then
    every new table is classified and `tenant-coverage.test.ts` passes.
14. Given the CSV export route, when a test reads its text and its headers, then
    they match the current file (`status`, `evidence_reference`, and the ten
    headers of `apps/accounting/app/api/submissions/export/route.ts:65-76`).
15. Given the source of the app, when a guard scans it, then it holds no direct
    `@ai-sdk/*` import and no non-Vertex model route for finance documents
    (OpenRouter and the Aliyun plan).
16. Given a test that needs a model, when the suite runs without credentials,
    then the fake provider answers and no network call is made.
17. Given every new function, when the doctor runs, then it holds a JSDoc
    comment and the tenant registry classifies every new table.
18. Given the source of the new module, when a guard scans it, then it holds no
    hash field, no checksum column, and no manifest.

## 13. Out of scope

- The monthly invoice pull job. The PM builds it in `advantage-pr`
  (`deferred:pm`).
- Any change in `/home/daniebo/Desktop/tutor-advantage` (`deferred:pm`).
- The Drive service-account IAM grant (`deferred:pm`).
- The deploy and the traffic move (`deferred:daniel`).
- The Primary Advantage `PA-INV` source and the Storytime receipts, until the PM
  names the source (`deferred:pm`).
- The double-entry ledger, the chart of accounts, VAT, withholding tax, and the
  tax invoices. `accounting_app_foundation_20260820` owns them.
- A new Cloud SQL instance. The accounting database stays on the shared instance
  (`accounting_dedicated_db_launch_20260830`, decision D-1).
- Any change to the Accounts issuer, to the company identity database, or to the
  `accounting-web` OIDC client, beyond two new role keys.
- The parsing rules of section 8. They wait for the structure report of
  2026-11-11.

## 14. Open items

Each item names the default. The author continues on the default. The build
stops for no item in this list.

- **Q1. Does ACCOUNTANT approve and reject?**
  Default: yes. The brief names the OWNER and the ACCOUNTANT for approve and
  reject. Today the gate is OWNER only
  (`packages/backend/src/modules/accounting/submissions.ts:344-348`). The gate
  widens to OWNER and ACCOUNTANT. The route, the transition, and the audit
  actions do not change.
- **Q2. What are the new role keys?**
  Default: `CEO` and `CONTRACTOR` in the accounting audience. The resolution
  order is OWNER, CEO, ACCOUNTANT, CONTRACTOR, STAFF
  (`apps/accounting/app/lib/company-oidc.ts:102-112`). The Accounts seed is
  `deferred:pm`.
- **Q3. Which account runs the poll?**
  Default: the office assistant's ACCOUNTANT account. The environment variable
  `ACCOUNTING_INTAKE_ACTOR_ID` names it. Reason: the idempotency key is scoped
  by submitter (`packages/db/src/accounting/schema/index.ts:102-106`), and the
  brief says the app takes the office assistant's uploads.
- **Q4. Which folder does the poll read from 2026-12?**
  Default: a new folder `Accounting intake` with one folder per month `YYYY-MM`.
  The existing `Accounting` folder stays the history. The one-off first load
  reads `Accounting` by a named folder id.
- **Q5. How is a Google Sheet read?**
  Default: Drive `files.export` with `mimeType=text/csv`, first worksheet, one
  voucher per file.
- **Q6. What is the size limit?**
  Default: 20 MB per file.
- **Q7. What is the file naming rule?**
  Default: `YYYY-MM_<document-type>_<counterparty>.<ext>`, lowercase, hyphens,
  no spaces, at most 120 characters, no amount in the name.
- **Q8. Does the close reuse the audit table?**
  Default: yes. `accounting_submission_audit_events` gains the two actions. The
  check constraint widens in one migration. A new table is the fallback.
- **Q9. What currency carries a Tutor payout line?**
  Default: THB. `payout_lines` has no currency column
  (`packages/database/prisma/schema.prisma:716-737`) and the run timezone
  defaults to `Asia/Bangkok` (`:700`).
- **Q10. Where is the `PA-INV` source?**
  Default: no source in this repository (section 2.3). The task stays
  `deferred:pm` and the PM names the system, the format, and the owner. The
  same holds for the Storytime receipts.
- **Q11. What does the monthly report contain?**
  Default: the period month, the approved submissions of that period, the close
  row, the report evidence reference, and the intake audit rows. No amount
  appears in a log line.
- **Q12. Where does the poll run?**
  Default: a Cloud Run job in `apps/accounting`, with a durable lease row in the
  accounting database. Not in a request path. The main `durable_jobs` table is
  not reused, because it lives in the main product database
  (`packages/db/src/schema/jobs.ts:44`).
- **Q13. Which Vertex model reads the PDFs?**
  Default: a Gemini model on Vertex AI in project `reading-advantage`. The model
  id comes from the environment variable `ACCOUNTING_EXTRACTION_MODEL`. The
  default is blank, and the Green names one model id after the first load.
- **Q14. Does the CEO see payslips and bank statements?**
  Default: no. The CEO reads the report and the approved submissions. The
  payslips and the bank statements stay with the OWNER and the ACCOUNTANT
  (section 3.1).

## 15. Deferred tasks

| Task | Owner | Reason |
|---|---|---|
| The monthly invoice pull job in `advantage-pr` | `deferred:pm` | The PM builds it; this track only reads the folder |
| The Tutor read endpoints and the service-identity gate | `deferred:pm` | The Tutor developer owns that repository |
| The Drive service-account IAM grant | `deferred:pm` | Cloud IAM is a PM and platform item, not Daniel's gate |
| The `PA-INV` and Storytime receipt sources | `deferred:pm` | The source is not in this repository |
| The Accounts role seed for `CEO` and `CONTRACTOR` | `deferred:pm` | Accounts belongs to the PM |
| The deploy and the traffic move | `deferred:daniel` | Daniel's word |
