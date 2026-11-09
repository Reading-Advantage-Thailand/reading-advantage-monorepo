# Specification: Accounting Drive intake

**Track ID:** `accounting_drive_intake_20261109`
**Type:** feature (classic FR list).
**Status:** new. Opened 2026-11-09. Amended 2026-11-09 after spec review round 1.
**Author model:** nvidia/stepfun-ai/step-5-preview
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.
**Blocks:** the monthly close and the monthly accountant handoff of `apps/accounting`, and the structure report of 2026-11-11.
**PM request:** A-52. Daniel's answers of 2026-11-09.
**Start gate:** The build code starts after 2026-11-20. An earlier start uses only a slot that Storytime does not need. The PM first load of 2026-11-10 and the PM structure report of 2026-11-11 are PM tasks. They are not build work, and they do not wait for the gate.

## 1. Purpose

The accounting app holds staff expenses and bills that a person types into a form.
The office assistant keeps the real documents in a Google Drive folder.
That folder holds the payment vouchers, the cloud invoices, the vendor invoices,
the payslips, a bank statement, the year-end working papers, and the school
sales invoices.

This track brings those documents into the app. Each file becomes one pending
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
| The submission audit table requires a submission id | `packages/db/src/accounting/schema/index.ts:116-127` (`submissionId` NOT NULL); contract at `packages/backend/src/modules/accounting/contracts.ts:92-106` |

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
| The CSV export allows OWNER and ACCOUNTANT and refuses STAFF | `apps/accounting/app/api/submissions/export/route.ts:31-40` (the check is `actor.role !== "OWNER" && actor.role !== "ACCOUNTANT"` at `:35`) |
| The CSV export writes approved submissions only, with these headers | `apps/accounting/app/api/submissions/export/route.ts:57-76` |
| The owner receives the accounting OWNER role at Accounts bootstrap | `apps/accounts/scripts/bootstrap-production.ts:78` (`{ applicationKey: "accounting", roleKey: "OWNER" }`) |
| The accounting OIDC client `accounting-web` is registered | `apps/accounts/scripts/bootstrap-contract.ts:24` |

### 2.3 What the app does not have yet

| Fact | How it was checked |
|---|---|
| The app has no `@reading-advantage/ai` dependency | `apps/accounting/package.json` dependencies (storage, db, backend, auth, auth-client, config, types, ui, utils only) |
| The app has no worker, no job runner, and no scheduler script | `apps/accounting/package.json` scripts (`dev`, `build`, `start`, `lint`, `test`, `test:watch`, `check-types`) |
| The app has no Google Drive client and no `googleapis` dependency | `apps/accounting/package.json`; no Drive import under `apps/accounting/` |
| No table for intake state, a close, or a lease exists | `packages/db/src/accounting/schema/index.ts` holds two tables only (`accounting_submissions`, `accounting_submission_audit_events`) |
| No Primary Advantage school invoice (`PA-INV`) source exists in this repository | `git grep -ril "PA-INV"` gives no hit; `git grep -ril "school invoice"` hits three files under `measure/tracks/company_finance_operations_2026*` only |
| No payment receipt or invoice code exists in Primary Advantage | `grep -rli "invoice\|receipt"` over `apps/primary-advantage/**/*.ts(x)` gives no product hit; `packages/db/src/schema/primary.ts` holds no invoice table |
| Storytime Advantage has no payment or invoice route | `apps/storytime/app` holds auth, teacher, and reader routes only; `apps/storytime/lib` has no payment module |
| The durable job tables live in the main product database, not the accounting database | `packages/db/src/schema/jobs.ts:44` (`durableJobs`); `packages/domain/src/tenant-registry.ts:400` (REFERENTIAL) |

### 2.4 The AI adapter

| Fact | Location |
|---|---|
| The Vertex provider needs a project, a service account email, and a private key today | `packages/ai/src/client.ts:63-80` (`createAIClient` case `vertex`; the check at `:67-71`) |
| The provider builds explicit credentials from the key pair today | `packages/ai/src/providers/vertex.ts:32-36` (`googleAuthOptions.credentials`) |
| The provider is selected by the environment variable `AI_PROVIDER` | `packages/ai/src/client.ts:110`, read at `:126-128` |
| `VertexProvider` reuses the Google provider methods | `packages/ai/src/providers/vertex.ts:24-40` |
| No production code may import an AI SDK directly | `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts:89` (`G1_REGEX`), recorded in `measure/tech-stack.md:96` |
| That guard matches direct imports only. It holds no OpenRouter and no Aliyun check | `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts:89` |
| The doctor runs the orchestrator checks and `architecture:check`. It holds no JSDoc check | `measure/doctor.sh:1-8` |

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

**The first load scope (PM decision, 2026-11-09).** The first load covers
January to October 2026 only. The folders `2024` and `2025` are not loaded.
November 2026 has no first-load row. The PM runs the load on this machine on
2026-11-10 at 15:22 and sends a structure report by 2026-11-11. The report
holds the document types, the fields, and the sample shapes. The report holds
no real amount.

## 3. Roles and permissions

### 3.1 The mapping to the existing roles

| PM actor | Existing or new role | Visibility | Actions |
|---|---|---|---|
| Daniel (OWNER) | `OWNER` (exists) | all documents | submit, approve, reject, export, open a close, read a close |
| the office assistant (ACCOUNTANT) | `ACCOUNTANT` (exists) | all documents, payslips and bank statements included | submit, approve, reject, export, open a close, read a close |
| the CEO | `CEO` (**new**) | every APPROVED item with its evidence, payslips and bank statements included, plus the locked report; no pending item | read a close, sign the monthly close |
| staff and contractors | `STAFF` (exists) and `CONTRACTOR` (**new**) | own items only | submit, read own items |

`CONTRACTOR` is a new accounting role. It behaves exactly as `STAFF` behaves
today: it submits and it sees only its own items. It may not export, and it may
not approve or reject.

`CEO` is a new accounting role. It signs the monthly close. It does not approve
or reject submissions. It sees no pending item. It reads every approved item
with its evidence, payslips and bank statements included, read only (PM-2). It
reads the locked report.

**The signer set (PM decision, 2026-11-09).** Only the CEO signs the monthly
close. The OWNER reads the locked report. The OWNER does not sign.

### 3.2 The new permissions

The permissions live in a new permissions module. Each permission names the
roles that hold it.

| Permission | Roles |
|---|---|
| `accounting:submission:submit` | OWNER, ACCOUNTANT, STAFF, CONTRACTOR |
| `accounting:submission:view-own` | STAFF, CONTRACTOR |
| `accounting:submission:view-all` | OWNER, ACCOUNTANT |
| `accounting:submission:view-approved` | OWNER, ACCOUNTANT, CEO |
| `accounting:submission:approve` | OWNER, ACCOUNTANT |
| `accounting:submission:reject` | OWNER, ACCOUNTANT |
| `accounting:submission:export` | OWNER, ACCOUNTANT |
| `accounting:evidence:read` | OWNER, ACCOUNTANT |
| `accounting:evidence:read-approved` | OWNER, ACCOUNTANT, CEO |
| `accounting:monthly-close:open` | OWNER, ACCOUNTANT |
| `accounting:monthly-close:sign` | CEO |
| `accounting:monthly-close:read` | OWNER, ACCOUNTANT, CEO |

The CEO holds `accounting:submission:view-approved`,
`accounting:evidence:read-approved`, and `accounting:monthly-close:read`. The
CEO does not hold `accounting:submission:view-all` and does not hold
`accounting:evidence:read`. The CEO reads approved items only, with their
evidence, payslips and bank statements included (PM-2).

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
layout, the naming rule, the size limit, and the failure rule. The PM facts about
the folder are in section 2.6.

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
(`b210c98a45912825f46c4c177b0f93da38e721a5`), the pull instant, and the response
of the read. A second pull of the same `periodMonth` upserts on the same natural
key and adds one intake audit row. No row is deleted.

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
4. The poll stores the bytes through the app evidence port. The domain receives
   only the reference.
5. A text PDF and a Google Sheets voucher are read on this machine. A PDF that
   is not text, a JPEG, and a PNG are read by Gemini on Vertex AI.
6. A repeat poll finds the same Drive file id. The byte comparison of the app
   decides whether the bytes match. Equal bytes give a replay, and the app shows
   the item as a duplicate. A duplicate is not added again.
7. The OWNER or the ACCOUNTANT approves or rejects the item, as today.
8. The CSV export does not change.

### 5.1 The idempotency rule and the hashing policy

The intake adds no hash field, no checksum column, and no manifest
(AGENTS.md hashing policy). The Drive file id is the idempotency key. The
evidence comparison reuses the domain helper that the app already calls. Git
identity and the Drive file id identify the source.

The idempotency key is at most 256 characters
(`packages/backend/src/modules/accounting/contracts.ts:46-50`). A Drive file id
fits. The unique index is scoped by company, submitter, and key
(`packages/db/src/accounting/schema/index.ts:102-106`), so the poll must run as
one stable account (open item Q3).

The reused helper is `hasSameSubmissionContent`
(`packages/backend/src/modules/accounting/submissions.ts:169-191`). The app
passes a `compareEvidence` callback into the domain, exactly as the submissions
route does at `apps/accounting/app/api/submissions/route.ts:298-309`. The intake
adds no new comparison helper.

### 5.2 The data-out gate

Gemini on Vertex AI (project `reading-advantage`) reads the documents that need
a model. Daniel approved this data-out gate on 2026-11-09. The gate covers a
scan and a photo: a PDF that is not text, a JPEG, and a PNG. A text PDF is read
on this machine. A Google Sheets voucher is exported as CSV and read on this
machine. No finance document goes to the Aliyun plan, to OpenRouter, or to any
other model route. A test that needs a model uses a fake.

**The Vertex credential form (PM decision, 2026-11-09).** The AI adapter uses
Application Default Credentials. `createAIClient`
(`packages/ai/src/client.ts:63-80`) and `VertexProvider`
(`packages/ai/src/providers/vertex.ts:32-36`) accept no `clientEmail` and no
`privateKey` and then use the Cloud Run runtime service account. No key pair is
stored in Secret Manager, in the image, or in git. The IAM grant of Vertex AI
user on the runtime service account is `deferred:pm`.

### 5.3 The extracted marker

Every value that the model produces carries a marker. The marker is a field on
the intake record: `extraction`. A value from the model carries `model`. A value
read from a text PDF or a Google Sheets voucher carries `local-text`. A value a
person types carries `human`. The app shows the marker next to the value. A
reviewer sees which numbers came from the model.

An image receipt goes to Vertex like a PDF that is not text does. A value the
model cannot read on an image stays empty. The reviewer types it, and the value
carries `human`.

### 5.4 The evidence port boundary

The backend domain function never imports an app module. The interface
`AccountingEvidenceStore` lives in
`packages/backend/src/modules/accounting/intake-contracts.ts`. It holds two
members, `put` and `read`, with the same shapes as the app port
(`apps/accounting/app/lib/private-evidence-storage.ts:139-166` and `:187-193`).
The app file `apps/accounting/app/lib/accounting-evidence-store.ts` implements
the interface over `putPrivateEvidence` and `readPrivateEvidence`. The poll
runner passes the implementation into the domain function. A second
implementation is a fake for tests.

### 5.5 The duplicate display

A duplicate is shown in the intake list, and no second submission row is
written. The intake document row carries the mark.

The first poll of one Drive file id writes one row in
`accounting_intake_documents` with `status = pending`, `submission_id` set, and
`sighting_count = 1`. A later poll of the same file id compares the bytes with
the stored evidence. Equal bytes add no submission row: the domain replays the
original row. The intake row keeps its status and `sighting_count` increases by
one. The intake list shows the row with the label `duplicate` and a link to
`submission_id`.

A second Drive file whose bytes equal the evidence of an earlier submission is
a content duplicate. The poll writes a new intake row with `status = duplicate`
and `duplicate_of_submission_id` set to the earlier submission. The poll writes
no submission row for the second file.

### 5.6 A file that fails

A file that fails keeps its row with `status = failed`, `failure_reason`, and
`failure_count`. The row stays failed. A re-upload creates a new Drive file id,
so the new file becomes a new intake row and a new submission. The app never
deletes a file from Drive. The OWNER and the ACCOUNTANT see the failed row and
the new row.

## 6. Accepted types

| Document type | Formats | Read path |
|---|---|---|
| receipt | PDF, JPEG, PNG | text PDF local; non-text PDF, JPEG, and PNG to Vertex |
| tax invoice | PDF | text PDF local; non-text PDF to Vertex |
| bank statement | PDF | text PDF local; non-text PDF to Vertex |
| payroll sheet | PDF, JPEG, PNG | text PDF local; non-text PDF, JPEG, and PNG to Vertex |
| withholding tax certificate | PDF | text PDF local; non-text PDF to Vertex |
| Google Sheets payment voucher | Google Sheet | exported as CSV, read local |
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

1. The OWNER or the ACCOUNTANT opens a close for one period month (`YYYY-MM`).
2. The close collects the approved submissions of that period.
3. The close builds a report and stores it as private evidence.
4. The CEO signs the report. The sign-off writes the status `signed`, the
   signer, the role, and the instant. The OWNER does not sign.
5. The report locks. The lock writes the status `locked` and `locked_at`.
6. The open, the sign-off, and the lock each write one audit row in a dedicated
   close audit table.

The report is a private-evidence object. The storage port writes it once and
never updates it (`apps/accounting/app/lib/private-evidence-storage.ts:139-166`).
That gives the lock its immutability. The close row moves from `open` to
`signed` to `locked` and stops there. The CSV export stays as it is; it reads
approved submissions and does not read the close.

**The close audit table.** A close is not a submission, and
`accounting_submission_audit_events` requires a `submission_id`
(`packages/db/src/accounting/schema/index.ts:116-127`;
`packages/backend/src/modules/accounting/contracts.ts:92-106`). The close
therefore gets its own append-only table,
`accounting_monthly_close_audit_events`, with a `close_id` column and no
submission id. The runtime role holds SELECT and INSERT on that table only, as
it does on the submission audit table.

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
| Google Cloud and Workspace invoice | `parseCloudInvoice` | `cloudInvoiceDraftSchema` |
| OpenAI invoice | `parseOpenAiInvoice` | `openAiInvoiceDraftSchema` |

Every draft carries the extraction marker of section 5.3. Plan task 6.2 fills
this section after the report arrives.

## 9. SOP facts (for the office assistant)

- **The intake folder.** There is no separate `Accounting intake` folder.
  Daniel's existing Drive folder `Accounting` is the intake folder. The 2026
  files sit at the top level of that folder. The folders `2024` and `2025` sit
  there too. From 2027 there is one subfolder per year, as `2024` and `2025` are
  now.
- **What the poll reads.** The poll reads the top level of `Accounting`. From
  2027 it also reads the subfolder named for the current year. The poll never
  reads the `2024` and `2025` folders, and it never reads a subfolder of an
  earlier year. The poll never writes in the folder.
- **November 2026.** The November 2026 files go to the top level of
  `Accounting`. The first December poll takes them. No separate November intake
  path is needed.
- **The folder id.** The folder is written by name only. The Drive id comes from
  the config value `ACCOUNTING_DRIVE_FOLDER_ID`, which is deploy config. The id
  is not written into git.
- **File naming rule.** `YYYY-MM_<document-type>_<counterparty>.<ext>`. Use
  lowercase words and hyphens. Use no spaces. Use at most 120 characters. Put no
  amount in the name. Example: `2026-11_tax-invoice_google-cloud.pdf`.
- **Accepted types.** PDF, JPEG, PNG, and the Google Sheets payment voucher. The
  eight document types are receipt, tax invoice, bank statement, payroll sheet,
  withholding tax certificate, payment voucher (Google Sheet), cloud invoice
  (Google Cloud and Google Workspace), and OpenAI invoice.
- **Size limit.** 20 MB per file. A larger file fails with a visible reason.
- **When a file fails.** The failed row stays failed with its reason. A re-upload
  creates a new Drive file id, so the new file becomes a new item. The app never
  deletes a file from Drive.
- **When a file is a duplicate.** The app shows the item as a duplicate. It does
  not add a second submission row. No action is needed.
- **Who sees what.** The OWNER and the ACCOUNTANT see every document, payslips
  and bank statements included. The CEO sees every approved item with its
  evidence, payslips and bank statements included, read only, plus the locked
  report. The CEO sees no pending item. Staff and contractors see only their own
  items.

## 10. Functional requirements

- **FR-1.** One new backend module extends
  `packages/backend/src/modules/accounting`. The contracts live in one file:
  `packages/backend/src/modules/accounting/intake-contracts.ts`. The intake
  domain functions live in `intake.ts`, the close domain functions live in
  `monthly-close.ts`, and the permissions live in `permissions.ts`. The export
  path `@reading-advantage/backend/accounting` does not change.
- **FR-2.** Four new tables are classified in
  `packages/domain/src/tenant-registry.ts`. Default classification is `EXEMPT`,
  as the two accounting tables are today
  (`packages/domain/src/tenant-registry.ts:263-265`).
- **FR-3.** A new table `accounting_intake_documents` holds one row per Drive
  file. Columns: `id` uuid primary key default random; `drive_file_id` text not
  null; `drive_folder_id` text not null; `source_month` text not null
  (`YYYY-MM`); `document_type` text not null; `status` text not null default
  `pending` (`pending`, `parsed`, `failed`, `duplicate`); `submission_id` uuid
  null; `duplicate_of_submission_id` uuid null; `evidence_reference` text null;
  `extraction` text null (`human`, `local-text`, `model`); `failure_reason` text
  null; `failure_count` integer not null default 0; `sighting_count` integer not
  null default 1; `first_seen_at` timestamptz not null default now;
  `last_seen_at` timestamptz not null default now; `scope_company_id` uuid not
  null. A unique index on (`scope_company_id`, `drive_file_id`) stops a second
  row for one file. An index on (`scope_company_id`, `status`) serves the
  intake list.
- **FR-4.** A new table `accounting_monthly_closes` holds one row per period
  month. Columns: `id` uuid primary key default random; `period_month` text not
  null (`YYYY-MM`); `status` text not null default `open` (`open`, `signed`,
  `locked`); `report_evidence_reference` text null; `opened_by_account_id` uuid
  not null; `opened_at` timestamptz not null default now;
  `signed_by_account_id` uuid null; `signed_by_role` text null; `signed_at`
  timestamptz null; `locked_at` timestamptz null; `scope_company_id` uuid not
  null. A unique index on (`scope_company_id`, `period_month`) stops a second
  close for one month.
- **FR-5.** A new append-only table `accounting_monthly_close_audit_events`
  holds the close trail. Columns: `id` uuid primary key default random;
  `close_id` uuid not null; `action` text not null (`monthly-close-open`,
  `monthly-close-sign`, `monthly-close-lock`); `actor_account_id` uuid not null;
  `actor_role` text not null; `reason` text null; `created_at` timestamptz not
  null default now. An index on (`close_id`, `created_at`) serves the trail. The
  table has no submission id, because a close is not a submission (section 7).
- **FR-6.** A new table `accounting_intake_leases` holds one lease row per
  queue. Columns: `id` uuid primary key default random; `queue_name` text not
  null; `lease_token` text not null; `worker_id` text not null;
  `lease_expires_at` timestamptz not null; `claimed_at` timestamptz not null
  default now; `scope_company_id` uuid not null. A unique index on
  (`scope_company_id`, `queue_name`) gives one row per queue. A check requires
  `lease_expires_at` after `claimed_at`. This table carries no job payload; the
  durable job tables of the main product database are not reused
  (`packages/db/src/schema/jobs.ts:44`).
- **FR-7.** `AccountingRole` gains `CEO` and `CONTRACTOR`
  (`apps/accounting/app/lib/company-oidc.ts:29-30`). `resolveAccountingRole`
  (`:102-112`) resolves the new roles in the order OWNER, CEO, ACCOUNTANT,
  CONTRACTOR, STAFF. The domain accepts the new roles
  (`packages/backend/src/modules/accounting/submissions.ts:131-135`).
- **FR-8.** The permissions module decides submit, view-own, view-all,
  view-approved, approve, reject, export, evidence read, close open, close sign,
  and close read (section 3.2). No handler holds its own role test, with one
  named exception: `apps/accounting/app/api/submissions/export/route.ts` keeps
  its existing role test at line 35 unchanged, because FR-19 and plan task 2.4
  freeze that route.
- **FR-9.** `approveAccountingSubmission` and `rejectAccountingSubmission`
  accept OWNER and ACCOUNTANT. The route, the status transition, and the audit
  actions do not change.
- **FR-10.** The intake poll runs on a schedule. It is not in a request path.
  The runner is a Cloud Run job in `apps/accounting`. It claims the lease row of
  FR-6 with a compare-and-swap, so two runs never read the same file.
- **FR-11.** The Drive access sits behind a provider-neutral port in the backend
  module. The Google adapter lives in
  `apps/accounting/app/lib/drive-document-source.ts`. The adapter uses
  `googleapis` with a service account on Cloud Run and no key file.
- **FR-12.** The adapter reads the folder id from the config value
  `ACCOUNTING_DRIVE_FOLDER_ID`. The folder is written by name only. No Drive id
  is written into git, a test, or a log line.
- **FR-13.** `googleapis` joins `apps/accounting/package.json` from the
  workspace catalog (`pnpm-workspace.yaml:69`, `googleapis: ^148.0.0`).
- **FR-14.** `@reading-advantage/ai` joins `apps/accounting/package.json`. The
  extraction port sits in the backend module. The app adapter calls
  `createAIClient({ provider: "vertex", ... })` (`packages/ai/src/client.ts:63-80`).
  The vertex branch accepts no `clientEmail` and no `privateKey` and uses
  Application Default Credentials (section 5.2).
- **FR-15.** A PDF that is not text, a JPEG, and a PNG go to Vertex. A text PDF
  and a Google Sheets voucher are read on this machine. A test that needs a
  model uses a fake; no test calls a real model.
- **FR-16.** Every extracted value carries the marker of section 5.3.
- **FR-17.** The intake passes the Drive file id as the idempotency key. The
  byte comparison reuses `hasSameSubmissionContent`
  (`packages/backend/src/modules/accounting/submissions.ts:169-191`) through the
  `compareEvidence` callback, exactly as the submissions route does
  (`apps/accounting/app/api/submissions/route.ts:298-309`). A duplicate is shown
  by the intake row of section 5.5, and no second submission row is written.
- **FR-18.** The intake adds no hash field, no checksum column, and no manifest.
- **FR-19.** The close writes the report to private evidence, then the open
  audit row, then the sign-off, then the lock, then the sign and lock audit rows
  in `accounting_monthly_close_audit_events`.
- **FR-20.** The CSV export route and its headers do not change
  (`apps/accounting/app/api/submissions/export/route.ts:31-76`).
- **FR-21.** The Tutor read interface is proposed in section 4.3. No task writes
  in `/home/daniebo/Desktop/tutor-advantage`. Any change there is
  `deferred:pm`.
- **FR-22.** No real finance document and no real amount enters git, a test, a
  log, or a non-Vertex model route.
- **FR-23.** Every new and changed function carries a JSDoc comment (AGENTS.md).

## 11. Non-functional requirements

- Business logic lives in the backend module. Route handlers stay thin
  (AGENTS.md).
- Zod contracts validate every external boundary: the Drive listing, the Drive
  export, the Vertex response, the Tutor response, and the intake form.
- Provider SDKs stay behind adapters: Drive, storage, AI.
- Structured logging records the intake. A log line holds no amount, no payee,
  no document text, and no Drive id.
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
2. Given the same Drive file id twice with equal bytes, when the poll runs, then
   the second run adds no submission row, the intake row keeps its status, and
   `sighting_count` increases by one.
3. Given a second Drive file whose bytes equal an earlier submission, when the
   poll runs, then it writes an intake row with `status = duplicate`,
   `duplicate_of_submission_id` set, and no submission row.
4. Given the same Drive file id with different bytes, when the poll runs, then
   the domain raises `conflict`, and no second submission row is written.
5. Given a file above the size limit or with a refused type, when the poll runs,
   then it writes no submission and it records one intake row with
   `status = failed`, a `failure_reason`, and `failure_count` of one.
6. Given a failed row and a re-upload of the same document, when the poll runs,
   then the failed row stays failed and the new file becomes a new intake row
   and a new submission.
7. Given a text PDF, when the poll runs, then the local reader reads it and the
   Vertex port is never called.
8. Given a Google Sheets voucher, when the poll runs, then the adapter exports
   `text/csv`, the parser reads the rows, and the Vertex port is never called.
9. Given a PDF with no extractable text, when the poll runs, then the Vertex
   port reads it and the intake row carries `extraction = model`.
10. Given a JPEG or a PNG receipt, when the poll runs, then the Vertex port
    reads it and the intake row carries `extraction = model`.
11. Given a value the model cannot read on an image, when a reviewer types it,
    then the value carries `extraction = human`.
12. Given a CONTRACTOR actor, when it lists submissions, then it sees only its
    own items, and the export route returns 403.
13. Given a CEO actor, when it lists submissions, then it sees only the approved
    submissions with their evidence, payslips and bank statements included, and
    it sees no pending item. The approve route returns 403. The reject route
    returns 403.
14. Given a CEO actor, when it reads one approved submission, then the evidence
    read is allowed. When it reads one pending submission, then the evidence
    read is denied.
15. Given a close in status `open`, when the CEO signs, then the status becomes
    `signed`, one audit row with action `monthly-close-sign` is written in
    `accounting_monthly_close_audit_events`, and the report evidence reference is
    set.
16. Given a close in status `open`, when an OWNER or an ACCOUNTANT signs, then
    the domain raises `forbidden` and no audit row is written.
17. Given a close in status `signed`, when the lock runs, then the status becomes
    `locked`, `locked_at` is set, and one audit row with action
    `monthly-close-lock` is written.
18. Given a close in status `locked`, when any transition is attempted, then no
    row changes and no audit row is written.
19. Given the four accounting tables, when a test reads the tenant registry,
    then every new table is classified and `tenant-coverage.test.ts` passes.
20. Given the CSV export route, when a test reads its text and its headers, then
    they match the current file (`status`, `evidence_reference`, and the ten
    headers of `apps/accounting/app/api/submissions/export/route.ts:65-76`).
21. Given the source of the app and the new module, when a guard scans it, then
    it holds no direct `@ai-sdk/*` import (the existing guard
    `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts:89`) and no
    OpenRouter, Aliyun, or `qwen` route (the new guard of plan task 7.4).
22. Given a test that needs a model, when the suite runs without credentials,
    then the fake provider answers and no network call is made.
23. Given the vertex branch of `createAIClient` and `VertexProvider`, when a
    test calls them with a project and a location and no key pair, then they
    build a client and no `googleAuthOptions.credentials` object is passed
    (`packages/ai/src/providers/vertex.ts:32-36`).
24. Given the new module and the new migration, when a guard scans them, then
    every exported symbol holds a JSDoc comment and they hold no hash field, no
    checksum column, and no manifest (plan task 7.4).
25. Given the Drive adapter source, when a test reads it, then the folder id
    comes from `process.env.ACCOUNTING_DRIVE_FOLDER_ID` and no Drive id literal
    appears in the source, a test, or a log line.

## 13. Out of scope

- The monthly invoice pull job. The PM builds it in `advantage-pr`
  (`deferred:pm`).
- Any change in `/home/daniebo/Desktop/tutor-advantage` (`deferred:pm`).
- The Drive folder share and the Vertex AI user grant (`deferred:pm`).
- The deploy and the traffic move (`deferred:daniel`).
- The Primary Advantage `PA-INV` source and the Storytime receipts, until the PM
  names the source (`deferred:pm`).
- A load of the `2024` and `2025` folders. PM decision of 2026-11-09: no such
  load now.
- The double-entry ledger, the chart of accounts, VAT, withholding tax, and the
  tax invoices. `accounting_app_foundation_20260820` owns them.
- A new Cloud SQL instance. The accounting database stays on the shared instance
  (`accounting_dedicated_db_launch_20260830`, decision D-1).
- Any change to the Accounts issuer, to the company identity database, or to the
  `accounting-web` OIDC client, beyond two new role keys.
- The parsing rules of section 8. They wait for the structure report of
  2026-11-11.

## 14. PM decisions of 2026-11-09 and open items

### 14.1 PM decisions of 2026-11-09

Each decision is recorded with the default taken by the author and the owner
who confirms it.

- **PM-1 (sign-off).** Only the CEO signs the monthly close. The OWNER reads the
  locked report. Daniel 11-09: "Hang is CEO, so she needs to sign off on the
  monthly reports". Default, pending Daniel. Sections 3.1, 3.2, 7, FR-19, plan
  tasks 2.1 and 2.2.
- **PM-2 (CEO view, changed).** The CEO sees every APPROVED item with its
  evidence, payslips and bank statements included, read only, plus the locked
  report. The CEO sees no pending item. Default, pending Daniel. Sections 3.1,
  3.2, 9, criteria 13 and 14, plan tasks 1.4 and 2.4.
- **PM-3 (Vertex credentials).** Application Default Credentials with the Cloud
  Run runtime service account. No key pair. The Vertex AI user grant is
  `deferred:pm`. Default, pending PM. Section 5.2, FR-14, criterion 23, plan
  tasks 4.1 to 4.4 and 8.1.
- **PM-4 (images, changed).** JPEG and PNG receipts go to Vertex too. Daniel's
  approval named "a scan or a photo"; a photo receipt is the same data class as
  a scanned PDF. Text PDFs and the Google Sheets vouchers stay without AI. A
  value the model cannot read on an image is typed by the reviewer and carries
  `human`. Default, pending Daniel. Sections 5.2, 5.3, 6, 9, criteria 9 to 11,
  plan tasks 3.1, 6.1, and 6.2.
- **PM-5 (first load).** The first load covers January to October 2026 only. The
  PM runs it on this machine. No `2024` and no `2025` load now. Default, pending
  PM. Sections 2.6 and 13, plan task 5.1.
- **PM-6 (intake folder, changed).** There is no `Accounting intake` folder.
  Daniel's existing Drive folder `Accounting` is the intake folder. The 2026
  files sit at its top level. From 2027 there is one subfolder per year, as
  `2024` and `2025` are now. November 2026 files go to the top level, and the
  first December poll takes them. The folder is written by name only, and the
  Drive id comes from the config value `ACCOUNTING_DRIVE_FOLDER_ID`. Default,
  pending Daniel. Sections 4.1 and 9, FR-10 to FR-12, criterion 25, plan tasks
  3.1, 3.2, 3.4, and 8.2.

### 14.2 Open items

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
- **Q4. Does the close reuse the submission audit table?**
  Default: no. A close is not a submission, and that table requires a
  submission id (`packages/db/src/accounting/schema/index.ts:116-127`). The
  close gets its own append-only table (FR-5).
- **Q5. How is a Google Sheet read?**
  Default: Drive `files.export` with `mimeType=text/csv`, first worksheet, one
  voucher per file.
- **Q6. What is the size limit?**
  Default: 20 MB per file.
- **Q7. What is the file naming rule?**
  Default: `YYYY-MM_<document-type>_<counterparty>.<ext>`, lowercase, hyphens,
  no spaces, at most 120 characters, no amount in the name.
- **Q8. Which Vertex model reads the documents?**
  Default: a Gemini model on Vertex AI in project `reading-advantage`. The model
  id comes from the environment variable `ACCOUNTING_EXTRACTION_MODEL`. The
  default is blank, and the Green names one model id after the first load.
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
  row, the report evidence reference, and the close audit rows. No amount
  appears in a log line.
- **Q12. Where does the poll run?**
  Default: a Cloud Run job in `apps/accounting` with the lease row of FR-6. Not
  in a request path. The main `durable_jobs` table is not reused, because it
  lives in the main product database (`packages/db/src/schema/jobs.ts:44`).
- **Q13. What does the OWNER sign?**
  Default: nothing. PM-1 gives the sign to the CEO only. The OWNER opens a
  close, reads a close, and reads the locked report.
- **Q14. Does a failed row retry?**
  Default: no. A re-upload creates a new Drive file id, so the new file becomes
  a new item (section 5.6). The failed row stays failed.

## 15. Deferred tasks

| Task | Owner | Reason |
|---|---|---|
| The Vertex AI user grant on the Cloud Run runtime service account | `deferred:pm` | Cloud IAM is a PM and platform item, not Daniel's gate |
| The Drive folder share to the runtime service account | `deferred:pm` | Drive access is a folder share or shared-drive membership, not a Cloud IAM role |
| The monthly invoice pull job in `advantage-pr` | `deferred:pm` | The PM builds it; this track only reads the folder |
| The Tutor read endpoints and the service-identity gate | `deferred:pm` | The Tutor developer owns that repository |
| The `PA-INV` and Storytime receipt sources | `deferred:pm` | The source is not in this repository |
| The Accounts role seed for `CEO` and `CONTRACTOR` | `deferred:pm` | Accounts belongs to the PM |
| The first load and the structure report | `deferred:pm` | The PM runs them on this machine |
| The deploy and the traffic move | `deferred:daniel` | Daniel's word |
