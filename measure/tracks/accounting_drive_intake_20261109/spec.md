# Specification: Accounting Drive intake

**Track ID:** `accounting_drive_intake_20261109`
**Type:** feature (classic FR list).
**Status:** new. Opened 2026-11-09. Amended 2026-11-09 after spec review round 1. Amended 2026-11-11 after the PM structure report (PM hand-off A-52, plan task 5.3): section 8 is filled, and the PM decisions of 2026-11-11 are in section 14.4.
**Author model:** nvidia/stepfun-ai/step-5-preview
**Amendment model (2026-11-11):** claude-code/claude-sonnet-5-5#high (Anthropic)
**Structure report:** 2026-11-11, outside git, with 11 fake fixtures (section 8).
**Plan:** [plan.md](./plan.md)
**Depends on:** nothing.
**Blocks:** the monthly close and the monthly accountant handoff of `apps/accounting`, and the structure report of 2026-11-11.
**PM request:** A-52. Daniel's answers of 2026-11-09. PM decisions of 2026-11-11 (section 14.4).
**Start gate:** The build code starts after 2026-11-20. An earlier start uses only a slot that Storytime does not need. The PM first load of 2026-11-10 and the PM structure report of 2026-11-11 are PM tasks. They are not build work, and they do not wait for the gate.

## 1. Purpose

The accounting app holds staff expenses and bills that a person types into a form.
The office assistant keeps the real documents in a Google Drive folder.
That folder holds the payment vouchers, the cloud invoices, the vendor invoices,
the payslips, a bank statement, the year-end working papers, and the school
sales invoices.

This track brings those documents into the app. Each file becomes one pending
submission with the file as private evidence. A scheduled poll finds new files.
Gemini on Vertex AI reads the PDFs that are not text, the JPEGs, and the PNGs.
Text PDFs and the .xlsx voucher workbooks are read on this machine. The OWNER and the ACCOUNTANT approve or reject submissions, a wider set than
today, because the office assistant does the review. The CSV export does not
change.

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
| `esbuild` is not a direct dependency of `apps/accounting` today | `apps/accounting/package.json` (no `esbuild` key) |
| `esbuild@0.28.1` is already resolved by the lockfile and carries a binary | `pnpm-lock.yaml:10067` (`resolution`, `hasBin: true`) |
| `esbuild` is approved for build scripts in the workspace catalog | `pnpm-workspace.yaml` under `allowBuilds` |
| The accounting Dockerfile copies only the standalone output and starts `server.js` | `apps/accounting/Dockerfile:39-40` and `:46` (`CMD ["node", "apps/accounting/server.js"]`) |
| The web service deploy reads seven values from `--set-secrets`: `ACCOUNTING_DATABASE_URL`, `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`, `STORAGE_SECRET_KEY`, and `STORAGE_PUBLIC_BASE_URL`, each in the `NAME=SECRET_NAME:latest` form | `apps/accounting/cloudbuild.yaml:40` |
| Every app image copies a Next standalone output; no app image holds a bundled single-file Node entry today, so the runner stage is new | `apps/*/Dockerfile` (all `COPY --from=builder .../.next/standalone`) |

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
- monthly payment voucher files. The PM facts of 2026-11-09 said Google Sheets.
  The structure report of 2026-11-11 corrects this: they are Excel `.xlsx`
  workbooks.
- Google Cloud and Workspace invoice PDFs (text PDFs).
- other vendor invoices.
- payslips, since 2026-09. The report shows that they are PDF prints of voucher
  worksheets.
- one bank statement. It is a password-protected PDF.
- the accountant's year-end working papers.
- school sales invoices.

**The first load scope (PM decision PM-5, 2026-11-09).** The first load covers
January to October 2026 only. The folders `2024` and `2025` are not loaded. The
PM runs its own script on this machine on 2026-11-10 at 15:22 and sends a
structure report by 2026-11-11 (PM-7). The report holds the document types, the
fields, and the sample shapes. The report holds no real amount. The PM script
writes no row in the accounting database (D-7 superseded).

**Facts of the structure report (PM, 2026-11-11).** The PM did the first load
and sent the report with 11 fake fixtures (plan tasks 5.1 and 5.2).

- The first load found 41 files: 38 at the top level of `Accounting`, and 3 in
  the customer folder `Boonyathat`. The top level also holds the sub-folders
  `2024`, `2025`, and `Boonyathat`. The 2026 files are in no month folder.
- The file name does not always give the document month. The month is in the
  document (section 9a).
- The files make 10 document types. No file is a receipt photo (JPEG or PNG).

| Type of the report | Files |
|---|---|
| payment voucher, `.xlsx` workbook | 10 (one for each month, January to October) |
| payment voucher, PDF (payslip print) | 4 (September 2, October 2) |
| Google Cloud and Workspace tax invoice, PDF | 8 |
| Google Cloud and Workspace payment receipt, PDF | 11 |
| Google Cloud statement, PDF | 2 |
| PND.3 withholding filing sheet, PDF | 1 |
| bank statement, PDF with a password | 1 |
| foreign vendor invoice, `.xlsx` workbook | 1 |
| school invoice, Google Sheet | 1 (in `Boonyathat`) |
| school invoice, PDF | 2 (in `Boonyathat`) |

Section 8 holds the fields of each type. Counts are by file, as the report
gives them.

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
| `accounting:monthly-close:lock` | CEO |
| `accounting:monthly-close:read` | OWNER, ACCOUNTANT (any close), CEO (a locked close only) |

The CEO holds `accounting:submission:view-approved`,
`accounting:evidence:read-approved`, `accounting:monthly-close:sign`,
`accounting:monthly-close:lock`, and `accounting:monthly-close:read` for a
locked close. The CEO does not hold `accounting:submission:view-all` and does
not hold `accounting:evidence:read`. The CEO reads approved items only, with
their evidence, payslips and bank statements included (PM-2).

The sign and the lock are two permissions and one call. The CEO sign locks the
close in the same call, and each step carries the CEO actor (section 7). A
CONTRACTOR sees only its own items, like STAFF: the list filter at
`packages/backend/src/modules/accounting/submissions.ts:333` covers STAFF and
CONTRACTOR (F27).

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

The customer folder `Boonyathat` is a second intake source (PM-14). It is a
sub-folder of `Accounting`. Its files are school invoices, which are revenue. The
app reads it and never writes into it. The app never writes anything into Drive.

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
2. The poll filters the files. A file passes only when its name matches
   `YYYY-MM_<document-type>_<counterparty>.<ext>` or the voucher name of section
   5.7, its type is one of the accepted types of section 6, and its size is
   inside the limit (section 5.7). A file in a customer folder passes without the
   naming rule (section 9).
3. Each new file becomes one pending submission. The Drive file id is the
   idempotency key. A voucher workbook gives one submission for each voucher
   worksheet (section 8, note 2).
4. The poll stores the bytes through the app evidence port. The domain receives
   only the reference.
5. A text PDF and an `.xlsx` workbook are read on this machine. The adapter
   exports a native Google Sheet as `.xlsx` first (section 6). A PDF that is not
   text, a JPEG, and a PNG are read by Gemini on Vertex AI.
6. A repeat poll finds the same Drive file id. The byte comparison of the app
   decides whether the bytes match. Equal bytes give a replay, and the app shows
   the item as a duplicate. A duplicate is not added again.
7. A second file whose bytes equal an earlier submission is a content duplicate
   (section 5.5). It writes an intake row and no submission row.
8. The OWNER or the ACCOUNTANT approves or rejects the item, as today.
9. The CSV export does not change.

**The first load (PM-7).** The first load of 2026-11-10 is a PM script on this
machine. It writes the structure report only, it uses no code of this track, it
writes no row in the accounting database, and its output stays outside git. The
app poll takes the files that follow the naming rule from November 2026 on. The
January to October 2026 rows come through the history import of section 9a.

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

**The PM decision of 2026-11-11 (PM-11).** The PM wrote "dedupe by content hash".
This section defines no hash. It defines the Drive file id and the byte compare of
`sameEvidenceBytes` (section 5.5). That byte compare is the content check, and
it catches a copy of one document under a new Drive file name or id (for example
a byte-identical Google invoice that carries a new date in its file name). The
decision adds no hash field, no checksum column, and no manifest. The month of a
document comes from the document, not from the file name (section 9a).

### 5.2 The data-out gate

Gemini on Vertex AI (project `reading-advantage`) reads the documents that need
a model. Daniel approved this data-out gate on 2026-11-09. The gate covers a
scan and a photo: a PDF that is not text, a JPEG, and a PNG. A text PDF is read
on this machine. An `.xlsx` workbook is read on this machine too. No finance document goes to the Aliyun plan, to OpenRouter, or to any
other model route. A test that needs a model uses a fake.

The `.xlsx` voucher workbooks, the `.xlsx` foreign vendor invoice, and the school
invoice sheet are read on this machine and never go to Vertex. A bank statement
is decrypted in memory on this machine (PM-13). The decrypted bytes go to Vertex
only when the decrypted PDF has no text layer, and the gate covers that case.

**The Vertex credential form (PM decision PM-3, 2026-11-09).** The AI adapter
uses Application Default Credentials. `createAIClient`
(`packages/ai/src/client.ts:63-80`) and `VertexProvider`
(`packages/ai/src/providers/vertex.ts:7-18` and `:32-36`) accept no `clientEmail`
and no `privateKey` and then use the Cloud Run runtime service account. No key
pair is stored in Secret Manager, in the image, or in git. The IAM grant of
Vertex AI user on the runtime service account is `deferred:pm`.

### 5.3 The extracted marker

Every value that the model produces carries a marker. The marker is a field on
the intake record: `extraction`. A value from the model carries `model`. A value
read from a text PDF or an `.xlsx` workbook carries `local-text`. A value a
person types carries `human`. The app shows the marker next to the value. A
reviewer sees which numbers came from the model.

An image receipt goes to Vertex like a PDF that is not text does. A value the
model cannot read on an image stays empty. The reviewer types it, and the value
carries `human`.

### 5.4 The evidence port boundary

The backend domain function never imports an app module. The interface
`AccountingEvidenceStore` lives in
`packages/backend/src/modules/accounting/intake-contracts.ts`. It holds three
members: `put` and `read` with the same shapes as the app port
(`apps/accounting/app/lib/private-evidence-storage.ts:139-166` and `:187-193`),
and `sameEvidenceBytes` which compares two evidence references byte by byte
inside the company scope. The app file
`apps/accounting/app/lib/accounting-evidence-store.ts` implements the interface
over `putPrivateEvidence`, `readPrivateEvidence`, and the byte loop. The byte
loop `haveSameBytes` moves from
`apps/accounting/app/api/submissions/route.ts:109-115` into the adapter, and the
route imports it from there, so one definition serves both callers. The poll
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

**The content duplicate lookup.** A second Drive file whose bytes equal the
evidence of an earlier submission is a content duplicate. The intake domain
function finds it by comparing the candidate bytes with the evidence of the
company's earlier submissions, newest first. The lookup stops at the first
match, or at the cap.

- **The two passes.** Pass 1 reads the newest `ACCOUNTING_DUPLICATE_SCAN_CAP`
  rows of the company that hold evidence, default 500. Pass 2 reads every row,
  history rows included, whose stored evidence byte size equals the candidate
  byte length. A size column is stored; a hash column is not (AGENTS.md hashing
  policy). Both passes run `sameEvidenceBytes` and stop at the first match.
- **Past the cap.** Pass 1 stops at the cap. Pass 2 has no cap, because the size
  test is one indexed integer compare and only the rows of the same size are
  read. Every history row therefore stays a duplicate candidate, and a history
  row older than the newest 500 is still found (PM-7 condition, D-28).
- **Who writes the size.** The intake `insert` sets `evidence_byte_size` to the
  byte length of the downloaded Drive file buffer, before the bytes go to
  storage. The value comes from `buffer.byteLength`, so no second read and no
  hash is needed. `accounting_intake_documents` is a new table, so no backfill
  of that column is needed: every row carries its own size from the first write.
- **The coverage limit (stated).** Pass 2 reads the intake rows, which are the
  poll rows and the history rows. That is the scope of the PM-7 condition. A
  submission that a person makes by hand in the app has **no** intake row and no
  `evidence_byte_size`, so pass 2 does not cover it. Such a submission is a
  duplicate candidate through pass 1 only, that is the newest 500 rows. This is
  a stated limit, not a defect; it is listed in section 15 (D-33).
- **The cost.** Pass 1 reads at most 500 objects. Pass 2 reads only the rows
  whose byte size equals the candidate size, which is normally a handful. A read
  is one storage `get` of one private object. The poll runs once a day on a
  schedule outside the request path, so the cost lands on the job and not on a
  request. A person may lower the cap in the config; a lower cap widens the set
  of content duplicates that become new submissions, but it never removes a
  history row, because pass 2 has no cap.
- **The comparison.** The lookup calls `sameEvidenceBytes` alone (section 5.4).
  It reads no parsed scalar field. The domain helper
  `hasSameSubmissionContent`
  (`packages/backend/src/modules/accounting/submissions.ts:169-191`) returns
  false when `kind`, `payee`, `category`, `description`, `money`, or
  `settledThbAmount` differ, before it calls any evidence callback
  (`:174-186`), so it would miss a file whose bytes match and whose parsed
  values differ. That helper therefore serves the same-file idempotent replay
  only, inside `submitAccountingSubmissionWithOutcome`, where the app already
  passes the `compareEvidence` callback
  (`apps/accounting/app/api/submissions/route.ts:298-309`). It stays private and
  the intake does not export it (F48, D-11 revised).
- **The write.** A content duplicate writes one intake row with
  `status = duplicate` and `duplicate_of_submission_id` set to the earlier
  submission. The poll writes no submission row for the second file.
- **The history rows (PM condition, 2026-11-09).** Pass 2 covers the history
  rows of Phase 8 together with the poll rows, and it has no cap. A copy of a
  history file that the office assistant uploads into a monthly folder therefore
  gets `status = duplicate` and a link to the history row's submission, and the
  poll adds no new submission. This holds for every history row, including a row
  older than the newest 500, and it needs no new hash field (PM-7, D-28).

### 5.6 A file that fails

A file that fails keeps its row with `status = failed`, `failure_reason`, and
`failure_count`. The row stays failed. A re-upload creates a new Drive file id,
so the new file becomes a new intake row and a new submission. The app never
deletes a file from Drive. The OWNER and the ACCOUNTANT see the failed row and
the new row.

### 5.7 The file-name filter and the `parsed` status

**The file-name filter.** The top level of `Accounting` holds more than the
intake types: the accountant's year-end working papers and other files. A file
in a customer folder is not filtered by name (section 9). A file whose name does not match
`YYYY-MM_<document-type>_<counterparty>.<ext>` is skipped. The poll writes no
intake row for it and no submission row. The poll logs one safe count line per
run: the number of skipped files. The count line holds no file name, no payee,
no amount, and no Drive id. A file outside a customer folder passes the filter
only when the name matches the rule and the type is one of the accepted types of
section 6.

**The voucher file name (PM-16, 2026-11-12).** The PM note of 2026-11-12 says:
"PM → Monorepo (note for A-52 Phase 3, no reply needed): the voucher file name for the Drive intake is `ใบสำคัญจ่าย YYYY-MM.xlsx`, the name of the 10 history files (structure report row payment_voucher_xlsx). PR writes it into the SOP. Accept that name pattern in the poll tests; classification stays by MIME and worksheet layout."

A file name that matches `ใบสำคัญจ่าย YYYY-MM.xlsx` is accepted. The name has
one space after the Thai word, a four-digit year, a two-digit month from 01 to
12, and the extension `.xlsx`. The month of that name is `YYYY-MM`. The name sets
no document type. The type comes from the MIME type and the worksheet layout.
Every other name keeps the rule above.

**The `parsed` status.** A row moves from `pending` to `parsed` when the read
succeeds and the draft passes its schema. The read is a local text read, a local
CSV read, or a model read. The rule covers all three paths:

| Read path | Status after a successful read |
|---|---|
| a text PDF, read local | `parsed` |
| an `.xlsx` workbook (or a native Google Sheet exported as `.xlsx`), read local | `parsed` |
| a non-text PDF, a JPEG, or a PNG, read by the model | `parsed` |
| any read that fails | `failed`, with `failure_reason` and `failure_count` |
| a read that needs a person's check (PM-9; open item Q20) | `failed`, with a `failure_reason` that starts with `review:` |
| any read that yields a content duplicate | `duplicate`, with `duplicate_of_submission_id` |

A `parsed` row keeps its `submission_id` and its `extraction` marker. A row
never moves from `parsed` back to `pending`. The table applies to a new file. A
same-file replay is different: it keeps its own status and gets the `duplicate`
label in the intake list, because section 5.5 marks it by `sighting_count` and
not by status (F53).

### 5.8 The intake document repository port

The intake rows need their own persistence port. The interface
`AccountingIntakeDocumentRepository` lives in
`packages/backend/src/modules/accounting/intake.ts`, in the same pattern as
`AccountingSubmissionRepository`, which lives in
`packages/backend/src/modules/accounting/submissions.ts`. One domain area, one
file. It holds these members:
`insert` (**one intake row only**; the submit audit row is written by
`submitAccountingSubmissionWithOutcome`, which already writes it, so one submit
request gives one audit row, F61); `findByDriveFileId` (one row by the Drive file
id inside the company scope);
`listRecentWithEvidence` (the newest rows that hold evidence, bounded by a
limit, for pass 1 of the content-duplicate lookup); `listByScope` (every row for
the intake list); `findByEvidenceByteSize` (the rows whose stored evidence byte
size equals a given size, for pass 2 of the content-duplicate lookup); `markDuplicate` (set `status = duplicate`,
`duplicate_of_submission_id`, and the reason); `markParsed` (set
`status = parsed`); `markFailed` (set `status = failed`, `failure_reason`, and
increase `failure_count`); and `bumpSighting` (increase `sighting_count` and set
`last_seen_at`). The Postgres implementation is
`apps/accounting/app/lib/accounting-intake-document-repository.ts`. `intakeDriveDocument`
and the intake list both receive the port, and a fake implementation serves the
tests (F47).

## 6. Accepted types

The structure report of 2026-11-11 (section 8) replaced the first list of eight
types. Section 8 holds the parser, the contract, and the fields of each row.

| Document type | Formats | Read path |
|---|---|---|
| payment voucher | `.xlsx` workbook (3 or 4 voucher worksheets and a guide worksheet); text PDF (payslip print) | workbook and text PDF local; non-text PDF to Vertex |
| Google Cloud and Workspace tax invoice | PDF | text PDF local; non-text PDF to Vertex |
| Google Cloud and Workspace payment receipt | PDF | text PDF local; non-text PDF to Vertex |
| Google Cloud statement | PDF | text PDF local; non-text PDF to Vertex |
| PND.3 withholding filing sheet | PDF | text PDF local; non-text PDF to Vertex |
| bank statement | PDF with a password | decrypted in memory (PM-13); text PDF local; non-text PDF to Vertex |
| foreign vendor invoice | `.xlsx` workbook | local |
| school invoice (revenue, PM-14) | Google Sheet; text PDF | sheet exported as `.xlsx` and read local; text PDF local; non-text PDF to Vertex |
| receipt (no real sample) | PDF, JPEG, PNG | text PDF local; non-text PDF, JPEG, and PNG to Vertex |
| OpenAI invoice (no real sample) | PDF | text PDF local; non-text PDF to Vertex |
| withholding tax certificate (no real sample) | PDF | text PDF local; non-text PDF to Vertex |

The old types "tax invoice" and "payroll sheet" have no row. Section 8, note 1,
gives the reason.

Human uploads keep the rule of today: PDF and image
(`apps/accounting/app/api/submissions/route.ts:194-201`). A workbook and a Google
Sheet are intake-only types. A human cannot upload them through the form.

**How a workbook is read (PM-8).** The voucher files are Excel `.xlsx` files, not
native Google Sheets. The Drive `files.export` endpoint with `text/csv` does not
work on a binary `.xlsx`, and it returns the first worksheet only. The adapter
therefore downloads the file bytes with the Drive `files.get` endpoint and
`alt=media`. The workbook reader reads every voucher worksheet and skips the guide
worksheet. It reads stored cell values only. It calculates no formula (PM-9).

**How a native Google Sheet is read.** Only the school invoice file is a native
Google Sheet, and it has 4 tabs. The adapter exports it with `files.export` and
the `.xlsx` MIME type, and the same workbook reader then reads it. No CSV export
is used, because the CSV export returns one tab only. This is the default of open
item Q21.

## 7. The monthly close

1. The OWNER or the ACCOUNTANT opens a close for one period month (`YYYY-MM`).
2. The open collects the approved submissions whose document month equals the
   close period (PM-17, section 14.6).
3. The open builds the report from those submissions and stores it as private
   evidence. The report evidence reference is set at open (F32, F54).
4. The CEO signs the report. The sign writes `signed_at`, `signed_by_account_id`,
   and `signed_by_role`, and it writes one audit row with action
   `monthly-close-sign`. The status moves to `signed` and then to `locked` inside
   the same call, so the stored status ends at `locked`. The OWNER and the
   ACCOUNTANT do not sign.
5. The CEO sign locks the close in the same call. The lock writes the status
   `locked` and `locked_at`, and it writes one audit row with action
   `monthly-close-lock`. The lock uses the CEO actor, so the audit row carries a
   non-null `actor_account_id`. One call gives three audit rows, one for the
   open, one for the sign, and one for the lock.
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
it does on the submission audit table (F26).

**Who reads a close.** The CEO reads a locked close only
(`accounting:monthly-close:read` with a status check). The OWNER and the
ACCOUNTANT read any close. A CEO listing returns locked closes only, so the CEO
never reads an open or a signed close. The permission function takes the close
status, not the actor alone: `canReadMonthlyClose(actor, close)`.

**The close notes (PM-10, PM-15).** The open also builds a list of notes for the
office assistant, and the list is part of the stored report. The list names four
kinds of item for the period month:

- a gap in the voucher number series (a number that is absent from the series);
- a month with no tax invoice (the rule is open item Q25);
- a school invoice that exists in two versions;
- a school invoice whose total in digits differs from its total in words.

The close lists each item and changes no value. It has no auto-fix. A person
decides what to do about each item.

## 8. Document parsing

The PM structure report of 2026-11-11 (PM hand-off A-52, plan task 5.3) fills this
section. The report and its 11 fake fixtures are outside git, in
`~/Desktop/handoff/accounting-structure-report-2026-11-11/`. This section copies
only what the report holds. It holds no real amount, no real name of a person, no
tax id, no account number, and no e-mail address.

The table has one row for each document type of the report, and one row for each
of the three types with no real sample (PM-12). The parser and contract names of
the first spec stay where a type maps to one. A new type gets a new name in the
same style. Every draft carries the extraction marker of section 5.3. Plan tasks
6.1 and 6.2 use this table.

| Document type (report name) | Parser | Contract | Source format | Read path (PM-4, D-13) | Fields (from the report) |
|---|---|---|---|---|---|
| payment voucher, workbook (`payment_voucher_xlsx`) | `parsePaymentVoucherSheet` | `paymentVoucherDraftSchema` | `.xlsx` workbook, 3 or 4 voucher worksheets and 1 guide worksheet | local; never Vertex | company name, form title, voucherNo, date, payee, paymentRef, netAmount, lines (docDate, docNo, description, amount), note, subtotal, deductionLabel, deductionRate, deductionAmount, netTotal (cells in note 3) |
| payment voucher, payslip print (`payment_voucher_pdf`) | `parsePaymentVoucherPdf` | `paymentVoucherDraftSchema` | text PDF, 1 page for each payee | local; Vertex if no text layer | the same fields as the workbook. The PDF has no formula, so it shows the final numbers |
| Google Cloud and Workspace tax invoice (`cloud_tax_invoice`) | `parseCloudInvoice` | `cloudInvoiceDraftSchema` | text PDF, 2 pages (summary, line detail) | local; Vertex if no text layer (D-13) | invoiceNumber, gstRegNo, billTo, service, invoiceDate, billingId, periodStart, periodEnd, currency, subtotal, gstRate, gst, total. Workspace adds domain and a line (subscription, interval, quantity, amount). Cloud adds accountId and a line (description, amount) |
| Google Cloud and Workspace payment receipt (`cloud_payment_receipt`) | `parseCloudPaymentReceipt` | `cloudPaymentReceiptDraftSchema` | text PDF, 1 page (browser print, short text layer) | local; Vertex if no text layer | documentTitle, paymentDate, amount, paymentNumber, paymentId (Cloud only), paidBy, paidTo, service, taxIdentificationNo, billingId, paymentMethod |
| Google Cloud statement (`cloud_statement`) | `parseCloudStatement` | `cloudStatementDraftSchema` | text PDF, 2 pages | local; Vertex if no text layer | documentTitle, to, service, cloudAccountId, paymentsAccountId, paymentsProfileId, statementIssueDate, periodStart, periodEnd, startingBalance, totalNewActivity, totalPaymentsReceived, endingBalance, and the table PAYMENTS RECEIVED (date, description, amount) |
| PND.3 withholding filing sheet (`wht_filing_pnd3`) | `parseWhtFilingPnd3` | `whtFilingPnd3DraftSchema` | text PDF, 1 page (JasperReports) | local; Vertex if no text layer | header: referenceNumber, withholderTaxId, withholderBranch, sheetNo, sheetsTotal. Row (up to 6 for each sheet): seq, payeeTaxId, payeeName, payeeAddress, paymentDate, incomeType, taxRatePercent, amountPaid, taxWithheld, condition. Totals: total amount paid, total tax withheld |
| bank statement (`bank_statement_encrypted`) | `parseBankStatement` | `bankStatementDraftSchema` | PDF with a password | decrypted in memory (PM-13), then local; Vertex if no text layer | none known. The report could not open the file. The fixture expects the result `needs_password` and no field |
| foreign vendor invoice (`foreign_vendor_invoice_xlsx`) | `parseForeignVendorInvoice` | `foreignVendorInvoiceDraftSchema` | `.xlsx` workbook, 1 worksheet, merged text blocks | local; never Vertex | invoiceDate (inside a text), vendor block, billTo block, description, quantity (text), unitPrice (text with `RMB` prefix), amount (text with `RMB` prefix), currency (RMB). The sheet has no invoice number (G17) |
| school invoice, sheet (`school_invoice_sheet`) | `parseSchoolInvoiceSheet` | `schoolInvoiceDraftSchema` | Google Sheet, 4 tabs (`Receipt Term 1`, `ใบแจ้งหนี้`, `Term 1`, `Term 2`) | exported as `.xlsx`, then local; never Vertex (Q21) | documentTitle, invoiceNo or receiptNo, date, quotationRef, due, issuer block (company names, tax id, branch, contact), customerName, customerAddress, customerTaxId, students, lines (seq, description, unitPrice, quantity, total), subtotal, discounts (label, amount; one or two), netTotal (digits), netTotalInWords (Thai and English), payment block (bank, branch, accountName, accountNo), delivery block, vatNote, terms |
| school invoice, PDF (`school_invoice_pdf`) | `parseSchoolInvoicePdf` | `schoolInvoiceDraftSchema` | text PDF, 1 page | local; Vertex if no text layer | the same fields as the sheet |
| receipt (no real sample) | `parseReceipt` | `receiptDraftSchema` | PDF, JPEG, PNG | local text PDF; Vertex for a non-text PDF, a JPEG, and a PNG | no field list in the report (open item Q24) |
| OpenAI invoice (no real sample) | `parseOpenAiInvoice` | `openAiInvoiceDraftSchema` | text PDF | local; Vertex if no text layer (D-13) | no field list in the report (open item Q24) |
| withholding tax certificate (no real sample) | `parseWithholdingCertificate` | `withholdingCertificateDraftSchema` | text PDF | local; Vertex if no text layer | no field list in the report (open item Q24) |

The last three rows are synthetic: their fixtures are fake and each is marked "no
real sample" (PM-12). The workbook reader and the text-PDF reader serve all rows.

**Notes.**

1. **The two retired placeholders.** The first spec held a placeholder for a
   payroll sheet (`parsePayrollSheet`, `payrollSheetDraftSchema`) and one for a
   tax invoice (`parseTaxInvoice`, `taxInvoiceDraftSchema`). The payroll sheet has
   no real sample. The `payslip-*` PDFs are prints of the voucher worksheets (G9),
   so the two payment voucher parsers serve them. The only tax invoices in the
   report are the Google ones, so `parseCloudInvoice` serves them. A Thai tax
   invoice has no real sample (G11). Open item Q15 holds the default.
2. **One workbook, many vouchers (PM-8).** A voucher workbook has 3 or 4 voucher
   worksheets and 1 guide worksheet. The guide worksheet holds the Thai SOP text
   and a total table. It holds no voucher. A worksheet is a voucher worksheet when
   cell A2 holds the form title `ใบสำคัญจ่าย/PAYMENT  VOUCHER`. The reader skips
   every other worksheet. The reader never uses a worksheet name as a key,
   because the names are short nicknames of the payees. The intake writes one
   intake row and one submission for each voucher worksheet. The key
   `<Drive file id>#<position of the worksheet>` is the idempotency key and the
   `drive_file_id` value of the row. Each submission keeps the whole workbook as
   its evidence. The content-duplicate lookup runs once for the file, before the
   split, so the vouchers of one workbook are never duplicates of each other (open
   items Q19 and Q20).
3. **The voucher cell map.** All voucher worksheets use the same fixed cells:
   company name A1; form title A2; voucherNo I3; date I4 (text, `d/m/yyyy`,
   Buddhist Era, not a date serial); payee B5; paymentRef I6 (a PromptPay
   reference in the cheque number cell, form `PP: ` and 10 digits); netAmount E7;
   line docDate A10; line docNo B10; line description D10 to D25; line amount I10
   to I25; note A26 and B26; subtotal I26; deductionLabel G27 (withholding tax or
   social security); deductionRate H27 (0.03 or 0.05); deductionAmount I27;
   netTotal I28. The payment-method boxes are a drawing, so the reader cannot read
   which box is marked. The 4 signature labels hold no value. One variant has
   several hourly-task lines and no salary line. A payee can have one allowance
   line. The voucher number has two accepted forms (PM-10): `PV69/M-NNN`, where M
   is the month number (January to August), and `PV69MM-NNN`, where MM is the
   month in two digits (October). A gap in the number series is allowed (number
   002 never appears), and the monthly close lists it (section 7).
4. **The review list (PM-9).** The review list is the set of intake rows with
   status `failed` and a `failure_reason` that starts with `review:`. A file goes
   on the review list, and it writes no submission, in these cases: a required
   cell of a workbook has no stored formula result (the Openpyxl workbook of
   September is an example); the date or the number of a voucher shows another
   month than the file-name month (the August workbook with the July number and
   date is an example); a date cannot be read; the bank statement needs a password
   that the app does not hold; a PDF that Google Sheets made has a broken Thai
   text layer (G15). The reader calculates no formula, and it does not read a PDF
   copy instead. A silent row is never written.
5. **Dates and amounts.** One reader serves each date form. The forms are: the
   voucher date (`d/m/yyyy`, text, Buddhist Era); the PND.3 date (`dd/mm/yyyy`,
   Buddhist Era); the Google and cloud date (`Mon d, yyyy`, English); the
   statement payment row (`Mon d`, no year, so the year comes from the statement
   period); the school date (Thai short month and Buddhist Era year); and the
   foreign vendor date (`yyyy.mm.dd` inside a text). A Buddhist Era year converts
   to a Gregorian year by subtracting 543 (open item Q14). The amount forms are:
   a number cell with the format `#,##0.00`; text such as `THB 1,000.00`; baht and
   satang in two text cells (PND.3); text with the prefix `฿`, where a discount has
   a minus sign before it; and text with the prefix `RMB`. Money stays digit text
   in exact minor units (section 2.1), and each draft holds a currency field.
6. **The type keys.** The `document_type` column holds a key. The eight keys of
   `packages/backend/src/modules/accounting/intake-contracts.ts` stay. The keys
   `payroll-sheet` and `tax-invoice` stay in the contract and in the database
   check, and they have no parser. The workbook and the PDF of a payment voucher
   both use `payment-voucher-sheet`. Five new keys are needed:
   `cloud-payment-receipt`, `cloud-statement`, `wht-filing-pnd3`,
   `foreign-vendor-invoice`, and `school-invoice`. A migration adds them (open
   item Q23).
7. **The three types with no real sample (PM-12).** The report has no OpenAI
   invoice (G10), no receipt from a Thai vendor, and no per-payee withholding
   certificate (G11). The monthly PND.3 sheet is a different type, and it has its
   own row. The fixtures of the three types are synthetic and marked "no real
   sample".
8. **The bank statement (PM-13).** The password goes into Secret Manager. Daniel
   enters it once at setup (`deferred:daniel`). The app decrypts the PDF in memory
   only. It never stores a decrypted copy, and the stored evidence is the
   encrypted original. This spec names the secret by its purpose only (the bank
   statement password) and holds no value. Without the secret the result is
   `needs_password`, and the file goes on the review list. The field list is
   unknown until a fake fixture of the decrypted layout exists (open item Q26).
9. **The fixtures.** The 11 fake fixtures of the report are the source of the test
   fixtures in plan tasks 6.1 and 6.2. No real file is copied. The files come from
   five producers (LibreOffice, Chrome, Google Sheets, openpyxl, and
   JasperReports), and the layout can change from one producer to the next (G19).
   The tests hold one fixture for each producer that the report names (open item
   Q18).
10. **The evidence and the log.** The evidence is the original file as received,
    and no parser changes it. A log line holds no raw file name, because the bank
    statement file name holds personal data (G13).

## 9. SOP facts (for the office assistant)

- **The intake folder.** There is no separate `Accounting intake` folder.
  Daniel's existing Drive folder `Accounting` is the intake folder. The 2026
  files sit at the top level of that folder. The folders `2024` and `2025` sit
  there too. From 2027 there is one subfolder per year, as `2024` and `2025` are
  now. The 2026 files are in no month folder (structure report of 2026-11-11).
- **What the poll reads.** The poll reads the top level of `Accounting`. From
  2027 it also reads the subfolder named for the current year. The poll never
  reads the `2024` and `2025` folders, and it never reads a subfolder of an
  earlier year. The poll never writes in Drive (PM-14).
- **The customer folder (PM-14).** A sub-folder of `Accounting` whose name is not a
  year is a customer folder. Today it is `Boonyathat`, the folder of the one
  active school. The poll reads it, and its files are school invoices (revenue).
  A file in it needs no naming rule, and its month comes from the document. The
  app reads it and never writes into it (open item Q22).
- **November 2026.** The November 2026 files go to the top level of
  `Accounting`. The first December poll takes them. No separate November intake
  path is needed.
- **The folder id.** The folder is written by name only. The Drive id comes from
  the config value `ACCOUNTING_DRIVE_FOLDER_ID`, which is deploy config. The id
  is not written into git.
- **File naming rule.** `YYYY-MM_<document-type>_<counterparty>.<ext>`. Use
  lowercase words and hyphens. Use no spaces. Use at most 120 characters. Put no
  amount in the name. Example: `2026-11_tax-invoice_google-cloud.pdf`.
- **A voucher file name.** `ใบสำคัญจ่าย YYYY-MM.xlsx`. The name has one space
  after the Thai word, a four-digit year, a two-digit month from 01 to 12, and the
  extension `.xlsx`. The month of that name is `YYYY-MM`. The name sets no
  document type. The type comes from the MIME type and the worksheet layout
  (PM-16, 2026-11-12).
- **Accepted types.** PDF, JPEG, PNG, the `.xlsx` workbook, and the school invoice
  Google Sheet. The document types are those of section 6: payment voucher
  (workbook or payslip PDF), Google Cloud and Workspace tax invoice, payment
  receipt, and statement, PND.3 withholding filing sheet, bank statement, foreign
  vendor invoice, school invoice, receipt, OpenAI invoice, and withholding tax
  certificate.
- **A voucher file.** One `.xlsx` voucher file holds 3 or 4 vouchers, one on each
  worksheet, and a guide worksheet. The app reads every voucher worksheet and
  skips the guide worksheet.
- **The review list.** Some files need a person. The intake list marks them with
  the reason `review:`. They are: a workbook with no stored formula result, a
  voucher whose date or number shows another month than the file name, a bank
  statement that the app cannot open, and a PDF that Google Sheets made. The app
  does not guess and writes no submission for them.
- **The bank statement password.** Daniel enters the password once, at setup, into
  Secret Manager (`deferred:daniel`). The app opens the PDF in memory and stores
  no decrypted copy. You do not handle the password.
- **The monthly close notes.** The monthly close lists these items for you, and it
  changes no value: a gap in the voucher numbers, a month with no tax invoice, a
  school invoice that exists in two versions, and a school invoice whose total in
  digits differs from its total in words.
- **Size limit.** 20 MB per file. A larger file fails with a visible reason.
- **When a file fails.** The failed row stays failed with its reason. A re-upload
  creates a new Drive file id, so the new file becomes a new item. The app never
  deletes a file from Drive.
- **When a file is a duplicate.** The app shows the item as a duplicate. It does
  not add a second submission row. No action is needed.
- **Where you see every intake file.** The intake list on the main page holds
  every row of `accounting_intake_documents`: a `pending` row, a `parsed` row, a
  `failed` row with its reason, a same-file replay marked `duplicate`, and a
  content duplicate with a link to the earlier submission. A failed row and a
  content-duplicate row have no submission of their own, so they appear in the
  intake list and not in the submission lists. The OWNER and the ACCOUNTANT see
  every intake row.
- **A file with a name that matches neither name rule.** The poll skips it. The
  app shows no row for it, and the run logs one count line with no file name.
  Fix the name and upload the file again.
- **The 2026 history.** The files from January to October 2026 come into the app
  through the history import. Those files predate the naming rule, so the import
  reads the month from the document and the type from the parser (PM-11). The file
  name is not the month source.
  A dry-run report runs first. The history rows carry the history marker in the
  intake list, and they start no monthly close, because the external accountant
  closed those months.
- **Who sees what.** The OWNER and the ACCOUNTANT see every document, payslips
  and bank statements included. The CEO sees every approved item with its
  evidence, payslips and bank statements included, read only, plus the locked
  report. The CEO sees no pending item. Staff and contractors see only their own
  items.

## 9a. The history import for January to October 2026 (PM-7)

Daniel asked for the history in the app (Tasks, 11-08: "ingest the historical
information we have in Google drive"). This section defines the history import.
The PM's first load of 2026-11-10 is a different thing: it is a PM script that
writes the structure report only. It uses no code of this track, it writes no row
in the accounting database, and its output stays outside git.

**One code path.** The history import uses the same Drive read, the same parsers,
and the same audit rows as the poll. It is one mode of `intakeDriveDocument`, not
a second function. The mode is an input value: `history` for the history import
and `poll` for the monthly poll. A test asserts that one function serves both
modes and that no second intake function exists.

**The naming rule.** The history files predate the naming rule, so the history
mode does not apply the filter of section 5.7. A history file gets its month and
its type this way:

| Field | Source | Fallback |
|---|---|---|
| the month | the document: the parser reads it (section 8), for example the voucher date, the invoice date, or the statement issue date | the Drive folder name, when it is `YYYY-MM`; then the file's Drive `modifiedTime` |
| the document type | the parser that matches the file | none; the file is unmatched |

**The month rule of 2026-11-11 (PM-11).** The structure report shows no month
folder, and a file name does not always give the month. For example,
`google-2026-10-01.pdf` is the September invoice again, and `google-2026-06-01.pdf`
is the May invoice. The month therefore comes from the document. The fallback is
used only when the parser finds no month in the document. This rule replaces the
folder-first rule of PM-7 (c) and D-23. For a payment voucher the month in the
file name is a check: a date or a number with another month goes on the review
list (PM-9).

A file whose type no parser matches is listed in the dry-run report and is not
imported. A file whose month cannot be read is listed in the dry-run report and
is not imported.

**Idempotency.** A history row is idempotent by the Drive file id, exactly as a
poll row is. A second import run of the same file adds no row. A content
duplicate of a history row is found by the same byte-only lookup of section 5.5,
which covers the history rows (PM condition). No new hash field, no checksum
column, and no manifest is added. The PM wrote "file hash"; the Drive file id
plus the byte compare gives the same guarantee, and the AGENTS.md hashing policy
forbids a new hash field. This is an open note in section 14.3. The PM decision of
2026-11-11 (PM-11) says "content hash" and holds the same reading (section 5.1).

**The history marker.** A history row carries `is_history = true` and a
`history_source` of `document`, `drive-folder`, or `drive-modified-date`. The value
tells where the month came from (open item Q23). A poll row carries
`is_history = false` and a null `history_source`. The intake list shows the
marker, so a reviewer sees which rows came from the history.

**No past close.** The history import starts no CEO sign-off and no monthly close
for a past month, because the external accountant closed those months. An attempt
to open a close for a month before the first live month is refused.

**The dry-run report.** The history import runs a dry-run first. The report holds
the counts by month and by type, and the list of unmatched files. The report
holds no amount, no file content, no payee, and no Drive id. The dry-run writes
no row in the accounting database. The production write runs only after the
deploy, on Daniel's word (`deferred:daniel`).

**The parser fixtures.** The parser fixtures for the history files come from the
PM structure report of 2026-11-11 (section 8). They are fakes only; no real
document and no real amount enters git, a test, or a log. The fixtures of the
three types with no real sample are synthetic and marked "no real sample" (PM-12).

**The `2024` and `2025` folders.** Those folders come in a later phase, after the
2026 import passes. That is the PM's order of work, not a scope cut. The start is
`deferred:pm`.

## 10. Functional requirements

- **FR-1.** One new backend module extends
  `packages/backend/src/modules/accounting`. The contracts live in one file:
  `packages/backend/src/modules/accounting/intake-contracts.ts`. The intake
  domain functions and the `AccountingIntakeDocumentRepository` port live in
  `intake.ts`, the close domain functions live in `monthly-close.ts`, the
  permissions live in `permissions.ts`, the parsers live in
  `document-parsing.ts`, and the architecture guards live in
  `intake-architecture-guards.ts`. The export path
  `@reading-advantage/backend/accounting` does not change.
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
  null default 1; `evidence_byte_size` integer null (the stored byte length, not a
  hash); `is_history` boolean not null default false; `history_source`
  text null (`document`, `drive-folder`, `drive-modified-date`; PM-11, open item Q23); `first_seen_at` timestamptz
  not null default now; `last_seen_at` timestamptz not null default now;
  `scope_company_id` uuid not null. A unique index on
  (`scope_company_id`, `drive_file_id`) stops a second row for one file. An index
  on (`scope_company_id`, `status`) serves the intake list. An index on
  (`scope_company_id`, `evidence_byte_size`) serves pass 2 of the
  content-duplicate lookup (D-28). A check requires
  `history_source` to be null when `is_history` is false, and the reverse.
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
  The runner is a Cloud Run job in `apps/accounting` named
  `accounting-intake-poll`. The job runs the command `node dist/intake-runner.mjs`
  on the schedule `0 6 * * *` (06:00 Asia/Bangkok daily) under the runtime
  service account `accounting-cloud-run`. The job claims the lease row of
  FR-6 with a compare-and-swap, so two runs never read the same file. The job
  step itself is deploy config, and the first deploy is `deferred:daniel`.
- **FR-10a.** Cloud Scheduler starts the job through the Cloud Run Admin API
  run endpoint
  `https://run.googleapis.com/v2/projects/<project>/locations/asia-southeast1/jobs/accounting-intake-poll:run`
  with `--http-method=POST` and an OAuth token of the scheduler service account
  `accounting-scheduler`. That account holds `roles/run.invoker` on the job and
  `roles/iam.serviceAccountTokenCreator` on `accounting-cloud-run`. A Cloud Run
  job has no HTTP run URL, so the scheduler names no `run.app` address.
- **FR-10b.** The job takes **every** Secret Manager reference through
  `--set-secrets`, with the exact form of `apps/accounting/cloudbuild.yaml:40`:
  `ACCOUNTING_DATABASE_URL=ACCOUNTING_DATABASE_URL:latest`,
  `STORAGE_ENDPOINT=ACCOUNTING_STORAGE_ENDPOINT:latest`,
  `STORAGE_REGION=ACCOUNTING_STORAGE_REGION:latest`,
  `STORAGE_BUCKET=ACCOUNTING_STORAGE_BUCKET:latest`,
  `STORAGE_ACCESS_KEY=ACCOUNTING_STORAGE_ACCESS_KEY:latest`,
  `STORAGE_SECRET_KEY=ACCOUNTING_STORAGE_SECRET_KEY:latest`, and
  `STORAGE_PUBLIC_BASE_URL=ACCOUNTING_STORAGE_PUBLIC_BASE_URL:latest`. The
  `NAME=SECRET_NAME:latest` form is the `--set-secrets` syntax; it is not valid in
  `--set-env-vars`. Only plain values go through `--set-env-vars`:
  `ACCOUNTING_DRIVE_FOLDER_ID`, `ACCOUNTING_INTAKE_ACTOR_ID`,
  `ACCOUNTING_DUPLICATE_SCAN_CAP`, and `ACCOUNTING_EXTRACTION_MODEL`. The bank
  statement password (PM-13) is one more Secret Manager reference. Daniel creates
  and fills that secret once at setup (`deferred:daniel`). The job step adds it to
  `--set-secrets` in the same form after that setup. This spec names it by its
  purpose only and holds no value (open item Q26).
- **FR-11.** The Drive access sits behind a provider-neutral port in the backend
  module. The Google adapter lives in
  `apps/accounting/app/lib/drive-document-source.ts`. The adapter uses
  `googleapis` with a service account on Cloud Run and no key file. The port has
  read calls only: list, download (`files.get` with `alt=media`), and export
  (`files.export`). It has no create, update, delete, or copy call (PM-14).
- **FR-12.** The adapter reads the folder id from the config value
  `ACCOUNTING_DRIVE_FOLDER_ID`. The folder is written by name only. No Drive id
  is written into git, a test, or a log line. A customer folder is a sub-folder of
  that folder whose name is not a year (section 9, open item Q22). No second
  config value names it.
- **FR-12a.** `apps/accounting/scripts/accounting-runtime-grants.sql` grants
  each new table the least privilege it needs:
  `accounting_intake_documents` SELECT, INSERT, UPDATE; `accounting_monthly_closes`
  SELECT, INSERT, UPDATE; `accounting_monthly_close_audit_events` SELECT, INSERT
  (append-only, no UPDATE and no DELETE); `accounting_intake_leases` SELECT,
  INSERT, UPDATE, DELETE (a lease row is claimed, renewed, reclaimed, and
  released). The grants file comment at `:139-140` keeps its rule: a new table
  needs an explicit reviewed grant before the runtime probe passes.
- **FR-13.** `googleapis` joins `apps/accounting/package.json` from the
  workspace catalog (`pnpm-workspace.yaml:69`, `googleapis: ^148.0.0`).
- **FR-14.** `@reading-advantage/ai` joins `apps/accounting/package.json`. The
  extraction port sits in the backend module. The app adapter calls
  `createAIClient({ provider: "vertex", ... })` (`packages/ai/src/client.ts:63-80`).
  The vertex branch accepts no `clientEmail` and no `privateKey` and uses
  Application Default Credentials (section 5.2). `VertexProviderConfig`
  (`packages/ai/src/providers/vertex.ts:7-18`) makes `clientEmail` and
  `privateKey` optional, so the ADC path type-checks (F33).
- **FR-15.** A PDF that is not text, a JPEG, and a PNG go to Vertex. A text PDF
  and an `.xlsx` workbook are read on this machine. A test that needs a
  model uses a fake; no test calls a real model.
- **FR-16.** Every extracted value carries the marker of section 5.3.
- **FR-17.** The intake passes the Drive file id as the idempotency key. The
  same-file replay goes through `submitAccountingSubmissionWithOutcome`, which
  calls the private `hasSameSubmissionContent`
  (`packages/backend/src/modules/accounting/submissions.ts:169-191`) with the
  `compareEvidence` callback the app already passes
  (`apps/accounting/app/api/submissions/route.ts:298-309`); that helper stays
  private and serves the replay only. The content duplicate of section 5.5 is a
  byte-only compare through `sameEvidenceBytes`, and the lookup covers the
  history rows of section 9a through pass 2 (D-28). One submit request writes one
  submit audit row, and `submitAccountingSubmissionWithOutcome` is the one writer
  (F61). A duplicate is shown by the intake row, and no second submission row is
  written.
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
  The scope of the JSDoc guard covers the new backend module and the four app
  adapter files: `apps/accounting/app/lib/document-extraction.ts`,
  `apps/accounting/app/lib/accounting-evidence-store.ts`,
  `apps/accounting/app/lib/drive-document-source.ts`, and
  `apps/accounting/app/lib/intake-runner.ts` (F39).
- **FR-24.** The `apps/accounting/Dockerfile` builds `app/lib/intake-runner.ts`
  into one **self-contained** bundled Node file `dist/intake-runner.mjs`. The
  bundle is a **full bundle**: the esbuild command holds `--bundle`, holds
  `--platform=node` and `--format=esm`, holds `--target=node22`, and holds **no
  `--packages=external`**, so every import is inside the file. The command adds a
  `createRequire` banner, so a bundled CommonJS module can still call `require`.
  `esbuild` joins `apps/accounting/package.json` as a devDependency pinned to
  `0.28.1`, the version `pnpm-lock.yaml` already resolves at `pnpm-lock.yaml:10067`
  with `hasBin: true`; it is not a direct dependency today.

  **The stage layout.** The Dockerfile gains **one** new build stage,
  `runner-bundle`, and **no** new final stage. The existing web stage
  `FROM node:22-alpine AS runner` stays the **last** stage of the file, so the
  image default stays `CMD ["node", "apps/accounting/server.js"]` and the
  `accounting` Cloud Run service, which sets no `--command`, keeps serving the
  Next server. The web stage already creates the `nextjs` user and group at
  `apps/accounting/Dockerfile:36-37`, so the `--chown` works without a second
  user creation. The web stage gains **one** added line that copies the bundled
  file. The exact change:

  ```dockerfile
  # ONE new build stage, before the web stage.
  # pnpm --filter accounting exec runs with cwd /app/apps/accounting, so the
  # outfile is ABSOLUTE: a relative path would land in /app/apps/accounting/dist.
  FROM deps AS runner-bundle
  RUN pnpm --filter accounting exec esbuild app/lib/intake-runner.ts \
      --bundle --platform=node --format=esm --target=node22 \
      --banner:js='import{createRequire as __cr}from"node:module";const require=__cr(import.meta.url);' \
      --outfile=/app/dist/intake-runner.mjs

  # The existing web stage (unchanged except the one added COPY line).
  # Its WORKDIR is /app (apps/accounting/Dockerfile:34), so the destination
  # ./dist/intake-runner.mjs is /app/dist/intake-runner.mjs in the stage, and the
  # job arg dist/intake-runner.mjs resolves from /app.
  FROM node:22-alpine AS runner
  ...
  WORKDIR /app
  RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs
  COPY --from=builder --chown=nextjs:nodejs /app/apps/accounting/.next/standalone ./
  COPY --from=builder --chown=nextjs:nodejs /app/apps/accounting/.next/static ./apps/accounting/.next/static
  COPY --from=runner-bundle --chown=nextjs:nodejs /app/dist/intake-runner.mjs ./dist/intake-runner.mjs
  USER nextjs
  EXPOSE 8080
  CMD ["node", "apps/accounting/server.js"]
  ```

  **The path rule.** The bundle command's `--outfile` and the web stage's `COPY`
  source are the same absolute path, `/app/dist/intake-runner.mjs`. A relative
  `--outfile` writes into `/app/apps/accounting/dist` and the build fails, because
  the `COPY` looks in `/app/dist` (D-35).

  The stage names stay unique: `base`, `deps`, `builder`, `runner-bundle`, and
  `runner`. No stage other than `runner` is final, and no second stage is named
  `runner`. The Cloud Run job uses the **same** image and sets
  `--command=node --args=dist/intake-runner.mjs`, so the job runs the bundled
  file and the web service runs the Next server (D-32). The runner entry supports
  a dry start: `node dist/intake-runner.mjs --help` prints the usage and exits 0
  without a Drive call, a database call, or a network call.

- **FR-25.** Cloud Scheduler starts the job through the Cloud Run Admin API run
  endpoint with an OAuth token of the scheduler service account
  `accounting-scheduler`. Every Secret Manager reference goes through
  `--set-secrets`, exactly as the web service does at
  `apps/accounting/cloudbuild.yaml:40`. Only the plain values go through
  `--set-env-vars`.
- **FR-26.** The first live month is the named constant `FIRST_LIVE_MONTH` in
  `packages/backend/src/modules/accounting/monthly-close.ts`, with the value
  `2026-11`. It is a code constant, not an environment variable. A close open for
  a month before `FIRST_LIVE_MONTH` is refused, so the history import opens no
  close for a past month. A unit test asserts the value and the refusal (F62).
- **FR-27.** The document parsing follows section 8 and the PM decisions of
  2026-11-11 (PM-8 to PM-15). The workbook reader reads every voucher worksheet,
  skips the guide worksheet, reads stored values only, and calculates no formula.
  A required cell with no stored result, and a voucher date or number whose month
  differs from the file-name month, put the file on the review list and write no
  submission (PM-9). The reader accepts both voucher number forms and allows gaps
  in the series (PM-10). The month of a document comes from the document (PM-11).
  The three types with no real sample have synthetic fixtures marked "no real
  sample" (PM-12). An encrypted bank statement is decrypted in memory, and no
  decrypted copy is stored (PM-13). A file in a customer folder is read only, and
  the Drive port has no write call (PM-14). The monthly close lists the items of
  PM-10 and PM-15 and changes no value.

## 11. Non-functional requirements

- Business logic lives in the backend module. Route handlers stay thin
  (AGENTS.md).
- Zod contracts validate every external boundary: the Drive listing, the Drive
  export, the Vertex response, the Tutor response, and the intake form.
- Provider SDKs stay behind adapters: Drive, storage, AI.
- Structured logging records the intake. A log line holds no amount, no payee,
  no document text, no Drive id, and no raw file name (a file name can hold
  personal data, G13).
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
3. Given a second Drive file whose bytes equal an earlier submission and whose
   parsed values differ, when the poll runs, then it writes an intake row with
   `status = duplicate`, `duplicate_of_submission_id` set, and no submission row.
   The lookup is a byte-only compare through `sameEvidenceBytes`. Pass 1 reads the
   newest 500 rows that hold evidence; pass 2 reads every row, history rows
   included, whose `evidence_byte_size` equals the candidate size, and it has no
   cap (D-28).
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
8. Given a voucher `.xlsx` workbook, when the poll runs, then the adapter
   downloads the bytes with `alt=media`, the workbook reader reads the voucher
   worksheets, and the Vertex port is never called.
9. Given a PDF with no extractable text, when the poll runs, then the Vertex
   port reads it and the intake row carries `extraction = model`.
10. Given a JPEG or a PNG receipt, when the poll runs, then the Vertex port
    reads it and the intake row carries `extraction = model`.
11. Given a value the model cannot read on an image, when a reviewer types it,
    then the value carries `extraction = human`.
12. Given a CONTRACTOR actor, when it lists submissions, then it sees only its
    own items, and the export route returns 403. The filter at
    `packages/backend/src/modules/accounting/submissions.ts:333` covers STAFF and
    CONTRACTOR.
13. Given a CEO actor, when it lists submissions, then it sees only the approved
    submissions with their evidence, payslips and bank statements included, and
    it sees no pending item. The approve route returns 403. The reject route
    returns 403.
14. Given a CEO actor, when it reads one approved submission, then the evidence
    read is allowed. When it reads one pending submission, then the evidence
    read is denied.
15. Given a close in status `open`, when its report is stored, then
    `report_evidence_reference` is set at open and the status stays `open`.
16. Given a close in status `open`, when the CEO signs, then the same call
    writes the status `locked`, `signed_at`, `signed_by_account_id`,
    `locked_at`, one audit row with action `monthly-close-sign`, and one audit
    row with action `monthly-close-lock`, both in
    `accounting_monthly_close_audit_events` with the CEO actor.
17. Given a close in status `open`, when an OWNER, an ACCOUNTANT, a STAFF, or a
    CONTRACTOR signs, then the domain raises `forbidden` and no audit row is
    written.
18. Given a close in status `locked`, when the CEO signs again, then no row
    changes and no audit row is written.
19. Given a CEO actor and a close in status `open` or `signed`, when it lists or
    reads the close, then the close is absent or refused. Given a close in status
    `locked`, then the CEO reads it. An OWNER and an ACCOUNTANT read any
    close.
20. Given the four accounting tables, when a test reads the tenant registry,
    then every new table is classified and `tenant-coverage.test.ts` passes.
21. Given a file whose name matches neither
    `YYYY-MM_<document-type>_<counterparty>.<ext>` nor `ใบสำคัญจ่าย YYYY-MM.xlsx`,
    when the poll runs, then it writes no intake row and no submission row, and it
    logs one count line with no file name, no amount, and no Drive id.
22. Given a row in status `pending` that a read completes, when the draft passes
    its schema, then the row moves to `parsed` and keeps its `submission_id` and
    its `extraction` marker. A row never moves from `parsed` to `pending`.
23. Given the CSV export route, when a test reads its text and its headers, then
    they match the current file (`status`, `evidence_reference`, and the ten
    headers of `apps/accounting/app/api/submissions/export/route.ts:65-76`).
24. Given the source of the app and the new module, when a guard scans it, then
    it holds no direct `@ai-sdk/*` import (the existing guard
    `packages/ai/src/__tests__/phase-arch-no-direct-sdk.test.ts:89`) and no
    OpenRouter, Aliyun, or `qwen` route (the new guard of plan task 7.4).
25. Given a test that needs a model, when the suite runs without credentials,
    then the fake provider answers and no network call is made.
26. Given the vertex branch of `createAIClient` and `VertexProvider`, when a
    test calls them with a project and a location and no key pair, then they
    build a client and no `googleAuthOptions.credentials` object is passed
    (`packages/ai/src/providers/vertex.ts:7-18` and `:32-36`).
27. Given the new module, the four app adapter files, and the new migration,
    when a guard scans them, then every exported symbol holds a JSDoc comment
    and they hold no hash field, no checksum column, and no manifest (plan task
    7.4).
28. Given the Drive adapter source, when a test reads it, then the folder id
    comes from `process.env.ACCOUNTING_DRIVE_FOLDER_ID` and no Drive id literal
    appears in the source, a test, or a log line.
29. Given the grants script, when a test reads it, then
    `accounting_intake_documents` holds SELECT, INSERT, UPDATE;
    `accounting_monthly_closes` holds SELECT, INSERT, UPDATE;
    `accounting_monthly_close_audit_events` holds SELECT and INSERT and no
    UPDATE or DELETE; and `accounting_intake_leases` holds SELECT, INSERT,
    UPDATE, DELETE (FR-12a).
30. Given a content-duplicate lookup that finds no match inside the cap of 500 in
    pass 1, and a history row outside that newest 500 whose evidence bytes equal
    the candidate, when the poll runs, then the item is marked a duplicate through
    pass 2 and it is not added as a new submission (D-28).
31. Given the intake list component, when a test renders it with a failed row
    and a content-duplicate row, then both rows appear with their reason and
    their link, and neither has a submission row.
32. Given a fake history row outside the newest 500 and a new Drive file id whose
    bytes equal that row's evidence, when the poll runs, then it writes an intake
    row with `status = duplicate`, `duplicate_of_submission_id` set to the history
    row's submission, and no new submission (the PM condition of PM-7, D-28).
33. Given the history mode and the poll mode of `intakeDriveDocument`, when a
    test reads the module, then one function serves both modes and no second
    intake function exists.
34. Given a history file with no parser match, when the dry run runs, then the
    file is listed in the report and is not imported, and the report holds no
    amount, no file content, no payee, and no Drive id.
35. Given a month before the first live month, when a close open is attempted,
    then the domain refuses it, and the history import writes no close row and no
    sign-off row.
37. Given one submit request that succeeds, when a test counts the audit rows for
    that submission, then it counts exactly one row with action `submit`, because
    `submitAccountingSubmissionWithOutcome` is the one writer and the intake
    `insert` writes the intake row only (F61, D-29).
38. Given the constant `FIRST_LIVE_MONTH` in
    `packages/backend/src/modules/accounting/monthly-close.ts`, when a test reads
    it, then it equals `2026-11`, it is a code constant and not an environment
    variable, and a close open for `2026-10` is refused (F62, D-30).
36. Given the `Dockerfile` and the job step, when a test reads them, then the
    Dockerfile bundles `app/lib/intake-runner.ts` into `dist/intake-runner.mjs`
    with `esbuild` in a full bundle whose command holds `--bundle`, `--platform=node`,
    `--format=esm`, `--target=node22`, a `createRequire` banner, and **no
    `--packages=external`**; **the `--outfile` path of the bundle command equals
    the web stage's `COPY` source path**, both the absolute path
    `/app/dist/intake-runner.mjs`, because `pnpm --filter accounting exec` runs
    with cwd `/app/apps/accounting` and a relative `--outfile` lands in
    `/app/apps/accounting/dist` (D-35); the web stage's `WORKDIR` is `/app`, so the
    job arg `dist/intake-runner.mjs` resolves; the **last `FROM` of the Dockerfile
    is the existing
    web stage** `FROM node:22-alpine AS runner` and its `CMD` is
    `["node", "apps/accounting/server.js"]`, so the image default serves the Next
    server; the stage names are unique and no second stage is named `runner`; the
    web stage holds exactly one added line
    `COPY --from=runner-bundle --chown=nextjs:nodejs /app/dist/intake-runner.mjs ./dist/intake-runner.mjs`
    and the web stage copies no `node_modules` for the bundle, so the one file
    must be self-contained; the job step carries `--command=node` and
    `--args=dist/intake-runner.mjs` on the same image; the job step puts every
    Secret Manager reference, the `STORAGE_*` ones included, in `--set-secrets` in
    the `NAME=SECRET_NAME:latest` form of `apps/accounting/cloudbuild.yaml:40`,
    and only the plain values in `--set-env-vars`; and the scheduler step targets
    the Cloud Run Admin API `:run` endpoint with an OAuth service account and no
    `run.app` URL (F55, F56, F67, F68, D-27, D-32).
39. Given a voucher workbook with 3 voucher worksheets and 1 guide worksheet, when
    the poll runs, then the reader reads the 3 voucher worksheets, skips the guide
    worksheet, writes 3 intake rows and 3 submissions, and the Vertex port is never
    called. The 3 submissions are not duplicates of each other (PM-8).
40. Given a voucher workbook with a required cell that has no stored formula
    result, or with a voucher date or number whose month differs from the
    file-name month, when the poll runs, then the file is on the review list with
    a reason that starts with `review:`, and no submission row is written (PM-9).
41. Given the voucher numbers `PV69/8-001` and `PV69MM-003` and a series with no
    number 002, when the reader runs, then it accepts both forms and rejects no
    number for a gap. Given that series, when the close opens, then the close
    notes list the gap (PM-10).
42. Given a document whose file-name date differs from its document month, when
    the intake runs, then `source_month` is the document month. Given two files
    with equal bytes, then the second is a content duplicate through
    `sameEvidenceBytes`, and the code adds no hash field (PM-11).
43. Given an encrypted bank statement and the secret, when the intake runs, then
    the decrypted bytes exist in memory only, and the stored evidence bytes equal
    the original bytes. Given no secret, then the result is `needs_password` and
    the file is on the review list (PM-13).
44. Given the Drive port and the adapter, when a test reads them, then they hold no
    create, update, delete, or copy call. Given a file in a customer folder, when
    the poll runs, then it reads the file as a school invoice and writes nothing
    into Drive (PM-14).
45. Given a month with a missing tax invoice, a school invoice in two versions, or
    a school invoice whose total in digits differs from its total in words, when
    the close opens, then the close notes list each item and no value changes
    (PM-15).
46. Given any intake run, when a test reads the log lines, then they hold no raw
    file name (G13).
47. Given a file named `ใบสำคัญจ่าย 2026-11.xlsx` with the `.xlsx` MIME type, when
    the poll runs, then the file passes the name rule and writes one intake row
    with the month 2026-11, and the type of that row comes from the MIME type and
    the worksheet layout and not from the name. Given a file named
    `ใบสำคัญจ่าย 2026-13.xlsx`, when the poll runs, then the file is skipped and
    it writes no intake row and one count log line, because 13 is not a month
    (PM-16).

## 13. Out of scope

- The monthly invoice pull job. The PM builds it in `advantage-pr`
  (`deferred:pm`).
- Any change in `/home/daniebo/Desktop/tutor-advantage` (`deferred:pm`).
- The Drive folder share and the Vertex AI user grant (`deferred:pm`).
- The deploy and the traffic move (`deferred:daniel`).
- The Primary Advantage `PA-INV` source and the Storytime receipts, until the PM
  names the source (`deferred:pm`).
- A load of the `2024` and `2025` folders in this phase. PM order of work
  (PM-7): those folders come in a later phase, after the 2026 import passes, with
  a `deferred:pm` start.
- The double-entry ledger, the chart of accounts, VAT, withholding tax, and the
  tax invoices. `accounting_app_foundation_20260820` owns them.
- A new Cloud SQL instance. The accounting database stays on the shared instance
  (`accounting_dedicated_db_launch_20260830`, decision D-1).
- Any change to the Accounts issuer, to the company identity database, or to the
  `accounting-web` OIDC client, beyond two new role keys.
- A parser for a Thai tax invoice and a parser for a payroll sheet. The report
  shows no real sample of either (open item Q15).
- The creation of the bank statement password secret. Daniel does it once at setup
  (`deferred:daniel`, PM-13).

## 14. PM decisions of 2026-11-09, 2026-11-11, and 2026-11-12, and open items

### 14.1 PM decisions of 2026-11-09 (DECIDED)

The PM answered on 2026-11-09. Each decision is binding. A reader must not
reopen a decision in this section; a change needs a new PM answer.

- **PM-1 (sign-off). DECIDED (PM, 2026-11-09).** Only the CEO signs the monthly
  close. The OWNER reads the locked report. Daniel 11-09: "[the CEO] is CEO, so
  she needs to sign off on the monthly reports". Sections 3.1, 3.2, 7, FR-19, plan
  tasks 2.1 and 2.2. PM decision 14:1x of 2026-11-09 keeps the quote word for
  word and writes `[the CEO]` in the place of the person's name.
- **PM-2 (CEO view, changed). DECIDED (PM, 2026-11-09).** The CEO sees every
  APPROVED item with its evidence, payslips and bank statements included, read
  only, plus the locked report. The CEO sees no pending item. Sections 3.1, 3.2,
  7, 9, criteria 13, 14, and 19, plan tasks 1.4, 2.2, and 2.4.
- **PM-3 (Vertex credentials). DECIDED (PM, 2026-11-09).** Application Default
  Credentials with the Cloud Run runtime service account. No key pair. The
  Vertex AI user grant is `deferred:pm`. Section 5.2, FR-12a, FR-14, criterion
  26, plan tasks 4.1 to 4.4 and 8.1.
- **PM-4 (images, changed). DECIDED (PM, 2026-11-09).** JPEG and PNG receipts go
  to Vertex too. Daniel's approval named "a scan or a photo"; a photo receipt is
  the same data class as a scanned PDF. Text PDFs and the Google Sheets vouchers
  stay without AI. A value the model cannot read on an image is typed by the
  reviewer and carries `human`. Sections 5.2, 5.3, 6, 9, criteria 9 to 11, 22,
  plan tasks 3.1, 6.1, and 6.2.
- **PM-5 (first load). DECIDED (PM, 2026-11-09).** The first load covers January
  to October 2026 only. The PM runs it on this machine. No `2024` and no `2025`
  load now. Sections 2.6, 5 (the first load), and 13, plan tasks 5.1 and 5.2.
- **PM-6 (intake folder, changed). DECIDED (PM, 2026-11-09).** There is no
  `Accounting intake` folder. Daniel's existing Drive folder `Accounting` is the
  intake folder. The 2026 files sit at its top level. From 2027 there is one
  subfolder per year, as `2024` and `2025` are now. November 2026 files go to
  the top level, and the first December poll takes them. The folder is written
  by name only, and the Drive id comes from the config value
  `ACCOUNTING_DRIVE_FOLDER_ID`. Sections 4.1, 5.7, 9, FR-10 to FR-12, criterion
  28, plan tasks 3.1, 3.2, 3.4, and 8.2.
- **PM-7 (the history import). DECIDED (PM, 2026-11-09).** Daniel asked for the
  history in the app (Tasks, 11-08: "ingest the historical information we have in
  Google drive"). Three parts. (a) The PM first load of 2026-11-10 is a PM script
  on this machine: it writes the structure report only, writes no row in the
  accounting database, uses no code of this track, and its output stays outside
  git. (b) The app poll takes the files that follow the naming rule from November
  2026 on. (c) A history import phase brings January to October 2026 into the
  app: the same Drive read, the same parsers, and the same audit rows as the
  poll, with no second code path (one mode of `intakeDriveDocument`); no
  naming-rule filter for the history files, because those files predate the rule;
  the month from the Drive folder or the file's modified date and the type from
  the parser, with an unmatched file listed in the dry-run report and not
  imported; idempotent by the Drive file id plus the same byte compare as the
  poll; no new hash field; a dry-run report first, with counts by month and by
  type and the unmatched files, and no amount and no file content in the report
  or a log; a history marker on each row; no CEO sign-off and no monthly close
  for a past month, because the external accountant closed them; the production
  write only after the deploy, on Daniel's word; the parser fixtures from the PM
  structure report of 2026-11-11, fakes only. The `2024` and `2025` folders come
  in a later phase, after the 2026 import passes; that is the PM's order of work,
  not a scope cut, and the start is `deferred:pm`. Sections 5.5, 9, 9a, FR-17,
  FR-24, criteria 32 to 35, plan Phase 8 and Phase 10.
- **PM-7 condition (idempotency by file id plus byte compare). ACCEPTED by the PM
  (2026-11-09).** No new hash field. Condition: the byte compare must also catch
  the same document under a new Drive file id, so a copy of a history file that
  the office assistant uploads into a monthly folder is marked a content
  duplicate of the history row, not added. The content-duplicate lookup of
  section 5.5 therefore covers the history rows, and a fake history row and a
  fake new Drive file with the same bytes and a different id gives
  `status = duplicate` with a link to the history row and no new submission.
  Sections 5.5, 9a, FR-17, criterion 32, plan tasks 3.1 and 8.1.
- **PM-7 note (the hash word).** The PM wrote "file hash". The orchestrator told
  the PM that the Drive file id plus the byte compare of `sameEvidenceBytes`
  gives the same guarantee with no new hash field, and the AGENTS.md hashing
  policy forbids one. Recorded here as an open note, not a change of scope
  (section 14.3).

### 14.2 Orchestrator decisions of 2026-11-09 (DECIDED)

The orchestrator recorded these decisions after spec review round 2. Each
decision is binding. A reader must not reopen a decision in this section.

- **D-1 (content duplicate). DECIDED (orchestrator, 2026-11-09), REVISED by D-11
  (2026-11-09).** A content duplicate is found by comparing the candidate bytes
  with the evidence of the company's earlier submissions, newest first, with a
  cap of 500 (`ACCOUNTING_DUPLICATE_SCAN_CAP`). Past the cap the item is not
  marked a duplicate and it becomes a pending submission. The comparison is a
  byte-only compare through `sameEvidenceBytes` (section 5.4); the revision D-11
  below names the reason. The lookup covers the history rows (PM-7 condition). No
  hash key is added, because the hashing policy forbids it (AGENTS.md). Sections
  5.4, 5.5, 9a, FR-17, criteria 3, 30, and 32, plan tasks 3.1, 3.2, and 8.1.
- **D-2 (the intake list surface). DECIDED (orchestrator, 2026-11-09).** The app
  holds an intake list component. It shows every row of
  `accounting_intake_documents`, a failed row and a content-duplicate row
  included, because those rows have no submission of their own. Sections 9,
  criterion 31, plan tasks 7.1 and 7.2.
- **D-3 (the runtime grants). DECIDED (orchestrator, 2026-11-09).**
  `accounting_intake_documents` holds SELECT, INSERT, UPDATE;
  `accounting_monthly_closes` holds SELECT, INSERT, UPDATE;
  `accounting_monthly_close_audit_events` holds SELECT and INSERT;
  `accounting_intake_leases` holds SELECT, INSERT, UPDATE, DELETE. Sections 7,
  FR-12a, criterion 29, plan tasks 1.5 and 1.6.
- **D-4 (the CONTRACTOR filter). DECIDED (orchestrator, 2026-11-09).** A
  CONTRACTOR sees only its own items. The list filter at
  `packages/backend/src/modules/accounting/submissions.ts:333` covers STAFF and
  CONTRACTOR. Section 3.2, criterion 12, plan tasks 2.1 and 2.2.
- **D-5 (the lock). DECIDED (orchestrator, 2026-11-09).** The CEO sign locks the
  close in the same call, with the CEO actor. One call writes two audit rows:
  one with action `monthly-close-sign` and one with action
  `monthly-close-lock`. The permission table holds
  `accounting:monthly-close:lock`. Sections 3.2 and 7, criteria 16 and 18, plan
  tasks 2.1 and 2.2.
- **D-6 (the CEO close read). DECIDED (orchestrator, 2026-11-09).** The CEO
  reads a locked close only. The OWNER and the ACCOUNTANT read any close. The
  permission function takes the close status. Sections 3.2 and 7, criterion 19,
  plan tasks 1.3, 1.4, and 2.2.
- **D-7 (the first load). SUPERSEDED by PM-7 (PM, 2026-11-09).** The round-2
  decision ran the first load through `intakeDriveDocument` and wrote the intake
  rows. PM-7 supersedes it: the first load is the PM's own script and writes no
  row in the accounting database. See the current D-7 below. Spec sections 2.6, 5,
  and 9a; plan tasks 5.1 and 8.1.
- **D-8 (the file-name filter). DECIDED (orchestrator, 2026-11-09).** The poll
  skips a file whose name does not match
  `YYYY-MM_<document-type>_<counterparty>.<ext>`, writes no intake row, and logs
  one safe count. Section 5.7, criterion 21, plan tasks 3.1 and 3.2.
- **D-9 (the report moment). DECIDED (orchestrator, 2026-11-09).** The report
  evidence reference is set at open. Section 7, FR-19, criterion 15, plan tasks
  2.1 and 2.2.
- **D-10 (the Vertex config). DECIDED (orchestrator, 2026-11-09).** `clientEmail`
  and `privateKey` become optional in `VertexProviderConfig`
  (`packages/ai/src/providers/vertex.ts:7-18`). Section 5.2, FR-14, criterion
  26, plan tasks 4.1 and 4.2.
- **D-11 (the compare helper). DECIDED (orchestrator, 2026-11-09) and then
  REVISED (2026-11-09, round 3).** The round-2 decision exported
  `hasSameSubmissionContent` and called it from the content-duplicate lookup.
  Round 3 showed that the helper returns false on a scalar mismatch before it
  calls any evidence callback (`:174-186`), so it would miss a file whose bytes
  match and whose parsed values differ. The helper therefore stays private and
  serves the same-key replay only, inside `submitAccountingSubmissionWithOutcome`,
  and the content duplicate is a byte-only compare through `sameEvidenceBytes`
  (section 5.5). This is the one D-11 entry; a second copy is removed (F63).
  Section 5.5, FR-17, criterion 3, plan tasks 3.1 and 3.2.
- **D-12 (the Cloud Run job). DECIDED (orchestrator, 2026-11-09), REVISED by
  D-18 to D-21 (2026-11-09, round 3).** The job is named
  `accounting-intake-poll`. Round 3 replaced the command, the trigger, and the
  secret handling: the job runs `node dist/intake-runner.mjs` from a bundled
  runner (D-18, D-19), Cloud Scheduler triggers it through the Admin API
  `:run` endpoint (D-20), and the secrets go through `--set-secrets` (D-21). The
  schedule is `0 6 * * *` under the service account `accounting-cloud-run`. The
  job step is deploy config, and the first deploy is `deferred:daniel`. FR-10,
  FR-10a, FR-10b, FR-24, FR-25, criteria 36, plan tasks 3.3, 3.4, and 9.7.
- **D-13 (the two invoice types). DECIDED (orchestrator, 2026-11-09).** A
  non-text Google Cloud, Workspace, or OpenAI invoice goes to Vertex like any
  non-text PDF. Sections 5.2 and 6, criterion 9, plan tasks 3.1 and 6.2.
- **D-14 (the `parsed` status). DECIDED (orchestrator, 2026-11-09).** A row moves
  from `pending` to `parsed` after a successful local or model read whose draft
  passes its schema. Section 5.7, criterion 22, plan tasks 3.1 and 6.2.
- **D-15 (the parser file). DECIDED (orchestrator, 2026-11-09).** The parsers
  live in `packages/backend/src/modules/accounting/document-parsing.ts`. Section
  8, FR-1, plan tasks 6.1 and 6.2.
- **D-16 (the JSDoc guard scope). DECIDED (orchestrator, 2026-11-09).** The JSDoc
  guard covers the new backend module and the four app adapter files. FR-23,
  criterion 27, plan tasks 7.3 and 7.4.
- **D-7 (the first load). SUPERSEDED by PM-7 (PM, 2026-11-09).** The first load
  of 2026-11-10 is the PM's own script. It writes the structure report only, it
  uses no code of this track, and it writes no row in the accounting database.
  The January to October 2026 rows come through the Phase 8 history import, not
  through the first load. Spec sections 2.6, 5, and 9a; plan tasks 5.1 and 8.1.
- **D-18 (the job image and entry point). DECIDED (orchestrator, 2026-11-09).**
  The Cloud Run job uses the accounting image with a bundled runner. The
  Dockerfile builds `app/lib/intake-runner.ts` into one Node file
  `dist/intake-runner.mjs` with a bundler from the lockfile, copies that file
  into the runner stage, and the job command is `node dist/intake-runner.mjs`.
  Spec FR-24, criterion 36, plan tasks 3.3 and 3.4.
- **D-19 (the bundler). DECIDED (orchestrator, 2026-11-09).** The bundler is
  `esbuild`, pinned to `0.28.1`, the version `pnpm-lock.yaml` already resolves.
  `esbuild` is not a direct dependency of `apps/accounting` today, so the task
  adds it as a devDependency and records the addition. `esbuild` is already
  approved for build scripts in `pnpm-workspace.yaml` under `allowBuilds`. Spec
  FR-24, plan task 3.4.
- **D-20 (the scheduler trigger). DECIDED (orchestrator, 2026-11-09).** Cloud
  Scheduler triggers the job through the Cloud Run Admin API run endpoint
  `https://run.googleapis.com/v2/projects/<project>/locations/<region>/jobs/accounting-intake-poll:run`
  with an OAuth token of the named scheduler service account
  `accounting-scheduler`. That account holds two grants: `roles/run.invoker` on
  the job `accounting-intake-poll`, and `roles/iam.serviceAccountTokenCreator`
  on `accounting-cloud-run`, so the scheduler can mint an OAuth token for the
  job's runtime service account. A Cloud Run job has no HTTP run URL, so the
  scheduler names no `run.app` address. **These two grants belong to the PM**, and
  each is a `deferred:pm` step in the runbook or the account console. **The rule is
  narrow:** no **new** grant step for these two scheduler grants goes in
  `apps/accounting/cloudbuild.yaml`, in a build step, or in a Green task. The rule
  is not a ban on every grant command in that file:
  `apps/accounting/cloudbuild.yaml:48-57` already holds the `allow-build-invoker`
  `gcloud run services add-iam-policy-binding` step for the Cloud Build service
  account, and that existing step stays unchanged (F76). Spec FR-10a, criterion
  36, plan task 9.3 (deferred:pm).
- **D-21 (the job secrets). DECIDED (orchestrator, 2026-11-09), corrected
  2026-11-09 after round 5 (F70).** **Every** Secret Manager reference goes
  through `--set-secrets`, in the exact `NAME=SECRET_NAME:latest` form of
  `apps/accounting/cloudbuild.yaml:40`: `ACCOUNTING_DATABASE_URL`,
  `STORAGE_ENDPOINT`, `STORAGE_REGION`, `STORAGE_BUCKET`, `STORAGE_ACCESS_KEY`,
  `STORAGE_SECRET_KEY`, and `STORAGE_PUBLIC_BASE_URL` — seven values. Only the
  four plain values go through `--set-env-vars`: `ACCOUNTING_DRIVE_FOLDER_ID`,
  `ACCOUNTING_INTAKE_ACTOR_ID`, `ACCOUNTING_DUPLICATE_SCAN_CAP`, and
  `ACCOUNTING_EXTRACTION_MODEL`. The round-4 text of this decision named three
  secrets and put the other four in `--set-env-vars`; that text was wrong and is
  replaced here. Spec FR-10b, FR-25, criterion 36, plan task 3.4.
- **D-22 (the intake document repository). DECIDED (orchestrator, 2026-11-09).**
  The port `AccountingIntakeDocumentRepository` lives in
  `packages/backend/src/modules/accounting/intake.ts`, in the **same pattern** as
  `AccountingSubmissionRepository`, which lives in
  `packages/backend/src/modules/accounting/submissions.ts`. The two interfaces
  sit in two files, one file per domain area, exactly as the module already does
  it. The Postgres implementation lives in `apps/accounting`.
  `intakeDriveDocument` and the intake list both use it. Spec sections 5.8 and 10,
  FR-1, plan tasks 1.1, 1.2, and 3.2.
- **D-23 (the history month and type). DECIDED (orchestrator, 2026-11-09).** A
  history file takes its month from the Drive folder name when it is `YYYY-MM`,
  otherwise from the file's `modifiedTime`, and its type from the parser. An
  unmatched file is listed in the dry-run report and not imported. Spec section
  9a, criteria 33 to 35, plan tasks 8.1 and 8.2. **SUPERSEDED IN PART by PM-11
  (PM, 2026-11-11):** the month comes from the document first. The folder name
  and `modifiedTime` are the fallback only.
- **D-24 (the history marker). DECIDED (orchestrator, 2026-11-09).** The marker is
  a column: `is_history` boolean, plus `history_source` text with the values
  `drive-folder` and `drive-modified-date`. Spec sections 9a and 10, FR-3, plan
  tasks 1.5, 1.6, and 8.2. **EXTENDED by PM-11 (PM, 2026-11-11):** a third value,
  `document`, tells that the month came from the document (open item Q23).
- **D-25 (the history close block). DECIDED (orchestrator, 2026-11-09).** The
  history import starts no CEO sign-off and no monthly close for a past month. A
  close open for a month before the first live month is refused. Spec section 9a,
  criterion 35, plan task 8.1.
- **D-26 (the PM labels). DECIDED (orchestrator, 2026-11-09).** PM-1 to PM-7 are
  DECIDED, not defaults. Sections 14.1 and 14.2, plan rules header.
- **D-27 (the runner bundle is self-contained). DECIDED (orchestrator,
  2026-11-09).** The Cloud Run job image holds one self-contained Node file. The
  method is a **full bundle** with esbuild, not a pruned `node_modules` copy. The
  esbuild command holds `--bundle`, `--platform=node`, `--format=esm`,
  `--target=node22`, and **no `--packages=external`**, and it adds a
  `createRequire` banner for a bundled CommonJS module. The final stage copies
  only `dist/intake-runner.mjs` and starts `node dist/intake-runner.mjs`. The
  reason for the full bundle: the final stage holds no `node_modules` and no
  workspace source, so an externalized import would fail with a missing module.
  The runner supports a dry start: `node dist/intake-runner.mjs --help` prints the
  usage and exits 0 without a Drive call, a database call, or a network call.
  Spec FR-24, criterion 36, plan tasks 3.3 and 3.4.
- **D-28 (the duplicate lookup covers every history row). DECIDED (orchestrator,
  2026-11-09).** The content-duplicate lookup runs two passes. Pass 1 reads the
  newest `ACCOUNTING_DUPLICATE_SCAN_CAP` rows that hold evidence, default 500.
  Pass 2 reads every row, history rows included, whose stored evidence byte size
  equals the candidate byte length, and it has no cap. The PM-7 condition
  therefore holds for every history row, including a row older than the newest
  500. The stored column is a byte size (`evidence_byte_size`), not a hash; the
  AGENTS.md hashing policy forbids a hash field. Spec sections 5.5 and 10, FR-3
  and FR-17, criteria 3 and 32, plan tasks 1.5, 1.6, 3.1, 3.2, and 8.1.
- **D-29 (one writer of the submit audit row). DECIDED (orchestrator,
  2026-11-09).** `submitAccountingSubmissionWithOutcome` is the one writer of the
  submit audit row; it already writes it. The intake repository `insert` writes
  the intake row only. One submit request gives one audit row. Spec sections 5.8
  and 10, FR-17, criterion 37, plan tasks 3.1 and 3.2.
- **D-30 (the first live month). DECIDED (orchestrator, 2026-11-09).** The first
  live month is `2026-11`, the month the app poll starts to take files (PM-7).
  It is the named constant `FIRST_LIVE_MONTH` in
  `packages/backend/src/modules/accounting/monthly-close.ts`, not an environment
  variable. A close open for a month before `FIRST_LIVE_MONTH` is refused. Spec
  section 9a, FR-26, criterion 35, plan tasks 2.1, 2.2, and 8.1.
- **D-31 (the quote rule). DECIDED (PM decision 14:1x, 2026-11-09).** A quote of
  Daniel's words stays word for word, and a person's name in the quote is written
  as a role in square brackets, for example `[the CEO]` or `[the office
  assistant]`. The repository is public and the git history keeps every name. The
  owner name Daniel stays, because the owner gates use it. Every quote in the
  three track files follows this rule. Spec section 14.1 (PM-1), the plan rules
  header, and spec-review.md.
- **D-32 (the stage layout). DECIDED (orchestrator, 2026-11-09).** The Dockerfile
  gains **one** new build stage, `runner-bundle`, and **no** new final stage. The
  existing web stage `FROM node:22-alpine AS runner`
  (`apps/accounting/Dockerfile:27`) stays the **last** stage, so the image
  default stays `CMD ["node", "apps/accounting/server.js"]` and the `accounting`
  Cloud Run service, which sets no `--command`, keeps serving the Next server.
  The web stage already creates the `nextjs` user and group at `:36-37`, so the
  added `--chown` works. The web stage gains **one** line:
  `COPY --from=runner-bundle --chown=nextjs:nodejs /app/dist/intake-runner.mjs ./dist/intake-runner.mjs`.
  Stage names stay unique (`base`, `deps`, `builder`, `runner-bundle`, `runner`),
  and no second stage is named `runner`. The Cloud Run job uses the **same**
  image and sets `--command=node --args=dist/intake-runner.mjs`. Spec FR-24,
  criterion 36, plan tasks 3.3 and 3.4.
- **D-33 (the byte size write and its coverage limit). DECIDED (orchestrator,
  2026-11-09).** The intake `insert` sets `evidence_byte_size` to the byte length
  of the downloaded Drive file buffer. The table is new, so no backfill of that
  column is needed. Pass 2 covers the intake rows, which are the poll rows and
  the history rows; that is the scope of the PM-7 condition. A submission that a
  person types by hand in the app has no intake row and is covered by pass 1
  only (the newest 500). This is a stated limit, and section 15 lists it. Spec
  sections 5.5 and 15, FR-3, plan tasks 3.1 and 3.2.
- **D-34 (the two Red rows for the PM-7 condition). DECIDED (orchestrator,
  2026-11-09).** The PM-7 condition keeps **two** Red rows on purpose: task 3.1
  proves the condition on the poll path, where the new file arrives through the
  monthly folder and the history row is an older row, and task 8.1 proves it on
  the history path, where both rows are history rows and no poll row exists. One
  row cannot cover both paths, because the two modes differ in their input and in
  their filter. Spec criterion 32, plan tasks 3.1 and 8.1.
- **D-35 (the bundle output path). DECIDED (orchestrator, 2026-11-09).** The bundle
  command's `--outfile` is the **absolute** path `/app/dist/intake-runner.mjs`, and
  the web stage's `COPY` source stays `/app/dist/intake-runner.mjs`, so the two
  paths are equal. The reason: `pnpm --filter accounting exec` runs with cwd
  `/app/apps/accounting`, so a relative `--outfile` writes
  `/app/apps/accounting/dist/intake-runner.mjs` and the image build fails. The web
  stage's `WORKDIR` is `/app` (`apps/accounting/Dockerfile:34`), so the destination
  `./dist/intake-runner.mjs` is `/app/dist/intake-runner.mjs` in that stage and the
  Cloud Run job arg `dist/intake-runner.mjs` resolves. Spec FR-24, criterion 36,
  plan tasks 3.3 and 3.4.

### 14.3 Open items

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
  SUPERSEDED by PM-8 and PM-9 (2026-11-11). The vouchers are `.xlsx` workbooks.
  The adapter downloads the bytes with `alt=media`. The reader reads every voucher
  worksheet and skips the guide worksheet. The first default (a CSV export of the
  first worksheet, one voucher for each file) is void. A native Google Sheet (the
  school invoice) follows Q21.
- **Q6. What is the size limit?**
  Default: 20 MB per file.
- **Q7. What is the file naming rule?**
  Default: `YYYY-MM_<document-type>_<counterparty>.<ext>`, lowercase, hyphens,
  no spaces, at most 120 characters, no amount in the name. A voucher file uses
  the second name `ใบสำคัญจ่าย YYYY-MM.xlsx` (PM-16, 2026-11-12).
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
  row, the report evidence reference, the close audit rows, and the close notes
  of PM-10 and PM-15 (section 7). No amount appears in a log line.
- **Q12. Where does the poll run?**
  Default: a Cloud Run job in `apps/accounting` with the lease row of FR-6. Not
  in a request path. The main `durable_jobs` table is not reused, because it
  lives in the main product database (`packages/db/src/schema/jobs.ts:44`).
- **Q13. Does the history need a file hash?**
  Default: no hash. The PM wrote "file hash" for the history import. The
  orchestrator told the PM that the Drive file id plus the byte compare of
  `sameEvidenceBytes` gives the same guarantee with no new hash field, and the
  AGENTS.md hashing policy forbids a new hash field, a checksum column, or a
  manifest. This track therefore adds none (PM-7). If the PM still wants a hash,
  the change needs a new PM answer and a stop under the hashing policy. The PM
  decision of 2026-11-11 (PM-11) says "content hash" and gets the same reading.
- **Q14. How does the parser read the date forms? (G6)**
  Default: one reader for each form of section 8, note 5. A Buddhist Era year
  converts to a Gregorian year by subtracting 543. A date that no reader can read
  puts the file on the review list. When the document holds no month at all (the
  foreign vendor invoice has no date field), the history mode uses the fallback
  of section 9a.
- **Q15. What happens to the two old placeholders? (G9, G11)**
  Default: the `payslip-*` PDFs map to the payment voucher type, and the old
  payroll sheet placeholder (`parsePayrollSheet`) is retired. The old tax invoice
  placeholder (`parseTaxInvoice`) is retired too, because `parseCloudInvoice`
  serves the only tax invoices of the report. A Thai tax invoice, which has no
  real sample, gets a parser when a real sample arrives.
- **Q16. Who owns the Workspace cost? (G14)**
  Default: no special rule. The Workspace documents name a private person as
  bill-to, and the Cloud documents name the company. The parser stores `billTo` as
  printed. The reviewer sees it on the item. The close adds no note for it.
- **Q17. How is the foreign vendor invoice read? (G17)**
  Default: the draft holds a currency field (RMB) and no required invoice number.
  The date comes from the free text. A date that the reader cannot find puts the
  file on the review list. The report holds one sample only.
- **Q18. How many fixtures does a type need? (G19)**
  Default: one fake fixture for each type, and one for each producer that the
  report names for that type (LibreOffice, Chrome, Google Sheets, openpyxl, and
  JasperReports). No fixture copies a real file.
- **Q19. What is one row for a voucher workbook?**
  Default: one intake row and one submission for each voucher worksheet. The key
  `<Drive file id>#<position of the worksheet>` is the idempotency key and the
  `drive_file_id` value. Each submission keeps the whole workbook as evidence.
  The content-duplicate lookup runs once for the file, before the split. This
  default changes the rule "each file becomes one pending submission" for a
  workbook only.
- **Q20. How does the reader find the guide worksheet, and what is the review
  list?**
  Default: a worksheet is a voucher worksheet when cell A2 holds the form title
  of the voucher. The reader never uses a worksheet name. The review list is the
  intake rows with status `failed` and a `failure_reason` that starts with
  `review:`. No new status and no new column.
- **Q21. How is the school invoice Google Sheet read? (G15)**
  Default: the adapter exports it as `.xlsx` with `files.export`, and the workbook
  reader reads all 4 tabs. A school invoice PDF that Google Sheets made has a
  broken Thai text layer, so it goes on the review list with the reason
  `review:text-layer`. A LibreOffice-made PDF has a clean layer and is read
  local.
- **Q22. Which sub-folders are customer folders? (G18)**
  Default: a sub-folder of `Accounting` whose name is not a year is a customer
  folder, and its files are school invoices without the naming rule. No second
  config value is added. If the PM wants only `Boonyathat`, a config value or a
  fixed list is needed.
- **Q23. How do the type keys and `history_source` change?**
  Default: the `document_type` keys are additive (section 8, note 6), and
  `history_source` gains `document`. Both change the contract
  (`intake-contracts.ts`) and the database check, which plan tasks 1.2 and 1.6
  already built. A new migration is needed. The plan holds no task for it yet.
- **Q24. Which fields do the three synthetic types hold?**
  Default: receipt: vendor, date, amount, currency, and payment method. OpenAI
  invoice: invoiceNumber, invoiceDate, periodStart, periodEnd, currency,
  subtotal, tax, and total. Withholding certificate: withholderTaxId, payeeName,
  payeeTaxId, paymentDate, incomeType, amountPaid, and taxWithheld. The fixtures
  are marked "no real sample", and a real sample replaces them when it arrives.
- **Q25. What is a month with a missing tax invoice? (G8)**
  Default: a month in which a Google Workspace or Google Cloud payment receipt or
  statement exists, and no tax invoice of the same product exists. The close
  lists the month and the product. A month with no file at all for a product is
  not listed, because the app cannot know what is due.
- **Q26. How does the app hold the bank statement password? (G12)**
  Default: one Secret Manager reference in the job step (PM-13). Until Daniel
  fills the secret, a bank statement gives `needs_password` and goes on the review
  list. A fake fixture of the decrypted layout does not exist yet, so the draft
  schema holds the extraction marker and a minimal field set until the first
  decrypted layout is known.

### 14.4 PM decisions of 2026-11-11 (DECIDED)

The PM answered after the structure report of 2026-11-11 (PM hand-off A-52). Each
decision is binding. A reader must not reopen a decision in this section; a change
needs a new PM answer. A quote is exact.

- **PM-8 (G1 and G2). DECIDED (PM, 2026-11-11).** "monthly vouchers are .xlsx (not
  Google Sheets), 3-4 vouchers a file, one per worksheet plus a guide worksheet:
  read every voucher worksheet, skip the guide." Sections 2.6, 6, 8 (notes 2 and
  3), 9, FR-27, criteria 8 and 39, plan tasks 6.1 and 6.2.
- **PM-9 (G3 and G4). DECIDED (PM, 2026-11-11).** "a workbook with no stored formula
  results or a stale number/date goes to the review list, never a silent row."
  Sections 5.7, 8 (note 4), 9, FR-27, criterion 40.
- **PM-10 (G5). DECIDED (PM, 2026-11-11).** "accept both number formats (PV69/M-NNN
  and PV69MM-NNN); gaps in the number series are allowed and listed in the monthly
  close." Sections 7, 8 (note 3), FR-27, criterion 41.
- **PM-11 (G7). DECIDED (PM, 2026-11-11).** "dedupe by content hash; the document
  month comes from the document, not the file name." The decision uses the content
  check that section 5.1 already defines, which is the byte compare of
  `sameEvidenceBytes`. It adds no new hash. Sections 5.1, 5.5, 9, 9a, FR-3,
  criterion 42.
- **PM-12 (G9 to G11). DECIDED (PM, 2026-11-11).** "fixtures for the types with no
  real sample (OpenAI invoice, receipt, withholding certificate) are synthetic and
  marked "no real sample"." Sections 6, 8 (note 7), 9a, FR-27.
- **PM-13 (G12 and G13). DECIDED (PM, 2026-11-11).** "the bank statement password
  goes into Secret Manager; Daniel enters it once at setup (his hands, at deploy
  time); the app decrypts in memory only and never stores a decrypted copy."
  Daniel's setup step is a human gate (`deferred:daniel`). The spec names the
  secret by its purpose only and holds no value. Sections 5.2, 8 (note 8), 9, 11,
  15, FR-10b, FR-27, criteria 43 and 46.
- **PM-14 (G18). DECIDED (PM, 2026-11-11).** "The customer folder (Boonyathat) is an
  intake source of type school invoice (revenue), read-only; the app never writes
  into Drive." Sections 4.1, 6, 9, FR-11, FR-12, FR-27, criterion 44.
- **PM-15 (G8, G15, G16). DECIDED (PM, 2026-11-11).** "missing tax invoices; two
  invoice versions; digits vs words total: the monthly close lists them for the
  office assistant; no auto-fix." Sections 7, 8, 9, FR-27, criterion 45.

**Effect on earlier rules.** The new decisions change these earlier rules, and
each change is stated at its place in the spec:

- PM-8 voids the first default of Q5 (a CSV export of the first worksheet) and the
  rule "one voucher for each file".
- PM-11 replaces the folder-first month rule of PM-7 (c) and D-23, and it extends
  D-24 with the value `document`.
- PM-13 adds an eighth Secret Manager reference to the seven of D-21.
- PM-14 adds the customer folder to the single intake folder of PM-6.
- The rule "each file becomes one pending submission" (sections 1 and 5) now holds
  for each voucher worksheet of a workbook (Q19).
- The follow-up outside this amendment: plan tasks 1.x (built), 3.x, 8.x, and the
  close tasks of Phase 2, and `test-strategy.md`, do not yet name the new type
  keys, the `document` source, the eighth secret, the customer folder, the review
  list, or the close notes. The PM check and the spec review decide that work.

### 14.5 PM decision of 2026-11-12 (DECIDED)

The PM sent one note for the Drive intake. The note is binding. A quote is exact.

- **PM-16 (the voucher file name). DECIDED (PM, 2026-11-12).** "PM → Monorepo (note for A-52 Phase 3, no reply needed): the voucher file name for the Drive intake is `ใบสำคัญจ่าย YYYY-MM.xlsx`, the name of the 10 history files (structure report row payment_voucher_xlsx). PR writes it into the SOP. Accept that name pattern in the poll tests; classification stays by MIME and worksheet layout."

**Effect on earlier rules.**

- PM-16 adds a second accepted file name. The rule of section 5.7 and criterion 21 keeps its text for every other name.
- The month of a voucher name is `YYYY-MM`. The name sets no document type. The type comes from the MIME type and the worksheet layout (sections 6 and 8).
- The 10 history files carry that name. The history mode does not apply the filter of section 5.7, so the rule changes no history row (section 9a).
- The SOP of section 9 holds the name, and the poll tests of plan task 3.1 hold the cases.

### 14.6 PM decisions of 2026-11-12 (the close rules) (DECIDED)

The PM answered the three open decisions of the Phase 2 acceptance of 2026-11-12.
The decisions are PA202 with F205 and N5, F221 with F255 and N1, and PA203 with
F277. Each decision is binding. A quote is exact.

- **PM-17 (the close period rule). DECIDED (PM, 2026-11-12).** "3. A-52 PA202: the close uses the DOCUMENT month (the period the document covers), and every date-to-month step uses Asia/Bangkok, in the close and the export. Add the task before Phase 8."

  **The rules.**

  - The close collects the approved submissions whose document month equals the
    close period.
  - The field that holds the document month is
    `accounting_intake_documents.source_month`
    (`packages/db/src/accounting/schema/index.ts:163`, the Drizzle field
    `sourceMonth`). PM-11 and criterion 42 set that field to the document month.
    The table `accounting_submissions` holds no document month column, so the
    close reads the document month through the intake row. The join runs on
    `accounting_intake_documents.submission_id` and on
    `accounting_intake_documents.scope_company_id`. The track adds no column,
    and no schema change is needed.
  - A submission typed by hand has no intake row and no document month. It
    enters no close. That is the limit of D-33.
  - Every date-to-month step of the export uses the zone `Asia/Bangkok`. The step
    sits in `businessDate`
    (`apps/accounting/app/api/submissions/export/route.ts:16-24`). The step reads
    the fixed zone, and the environment value `ACCOUNTING_TIME_ZONE` no longer
    selects it. The CSV text, the ten headers, and the role test of the route
    stay unchanged (criterion 23, FR-20).
  - The close holds no date-to-month step after this rule. The stored document
    month is the month. The date-to-month step of the intake keeps the rule of
    PM-11 and open item Q14, and this decision names the close and the export.
  - A date of `2026-10-31T23:30:00Z` is the month `2026-11` in `Asia/Bangkok`
    and the month `2026-10` in UTC. The worked example holds in the close and in
    the export.
  - The task runs before Phase 8 and before the first live close.

- **PM-18 (the sign and the lock in one transaction). DECIDED (PM, 2026-11-12).**
  "4. A-52 F221/F255/N1: do not accept the gap. Add a task that puts the status
  write and the audit write in one transaction, before the first live close
  (before the Phase 9 deploy)."

  **The rules.**

  - The sign writes the status change and the sign audit row in one database
    transaction. The lock writes the status change and the lock audit row in one
    database transaction. A failure leaves no status change without its audit
    row.
  - The port change: the port `AccountingMonthlyCloseRepository`
    (`packages/backend/src/modules/accounting/monthly-close.ts:46-114`) gains one
    member `saveWithAuditEvent(close, expectedStatus, event)`. The member writes
    the status change and the audit row in one transaction. It returns the
    stored close, or `undefined` when the compare-and-swap matched no row. The
    member `save` leaves the port, so no caller writes a status change without
    its audit row.
  - The member `recordAuditEvent` stays in the port for the open. The open
    inserts the close row and then writes the open audit row, and no status
    change happens there. A failure between the two calls leaves an open close
    with no open audit row. That gap is a stated limit.
  - The task runs before the deploy of task 9.7 and before the first live close.

- **PM-19 (the close notes and the close controls). DECIDED (PM, 2026-11-12).**
  "5. A-52 PA203/F277: your default (close-note tasks before 7.5, one UI task
  before final acceptance)."

  **The rules.**

  - The close notes of criteria 41 and 45 are one task pair before the phase
    check 7.5. The notes name the four kinds of item of section 7. The notes
    change no value.
  - The close controls are one task before the final acceptance. The task holds the
    open control, the sign control, the CEO list of locked closes, and the report
    read. The ACCOUNTANT approve and reject control of the note under task 7.2
    joins that task.
  - The control shows the 409 message text of the close routes. The control sends
    one request, and it does not retry on a double click.
  - The browser review of Phase 7 covers the close controls.

**Effect on earlier rules.**

- PM-17 replaces the period rule of section 7 item 2 with the document month
  rule, and it fixes the zone of the export step of FR-20. The CSV text and the
  ten headers stay unchanged.
- PM-18 changes the close repository port of section 7. The member `save` leaves
  the port, and the member `saveWithAuditEvent` enters it.
- PM-19 gives the close notes of criteria 41 and 45 a task pair, and it gives the
  close controls of F277 and the ACCOUNTANT control of F206 one task. The rules
  of section 7 and of criteria 41 and 45 do not change.
- The plan tasks are 7.4a and 7.4b for PM-17, 7.4c and 7.4d for PM-18, and
  7.4e to 7.4h for PM-19.

## 15. Deferred tasks

| Task | Owner | Reason |
|---|---|---|
| The Vertex AI user grant on the Cloud Run runtime service account | `deferred:pm` | Cloud IAM is a PM and platform item, not Daniel's gate |
| The Drive folder share to the runtime service account | `deferred:pm` | Drive access is a folder share or shared-drive membership, not a Cloud IAM role |
| The monthly invoice pull job in `advantage-pr` | `deferred:pm` | The PM builds it; this track only reads the folder |
| The Tutor read endpoints and the service-identity gate | `deferred:pm` | The Tutor developer owns that repository |
| The `PA-INV` and Storytime receipt sources | `deferred:pm` | The source is not in this repository |
| The Accounts role seed for `CEO` and `CONTRACTOR` | `deferred:pm` | Accounts belongs to the PM |
| The first deploy of the Cloud Run job `accounting-intake-poll` and its scheduler | `deferred:daniel` | The job step is deploy config; the job is named in FR-10 and FR-10a |
| The first load and the structure report | `deferred:pm` | The PM runs its own script on this machine. Done on 2026-11-11 (plan tasks 5.1 and 5.2) |
| The bank statement password in Secret Manager | `deferred:daniel` | Daniel enters it once at setup, at deploy time (PM-13); the spec holds no value |
| The production history write for January to October 2026 | `deferred:daniel` | The dry-run report goes to Daniel first; the write runs on his word |
| Known limit: a submission typed by hand in the app has no intake row, so pass 2 of the content-duplicate lookup does not cover it; pass 1 (the newest 500) covers it | stated limit (D-33) | A backfill of the hand-made submissions is out of scope; the intake table is new and starts full |
| The deploy and the traffic move | `deferred:daniel` | Daniel's word |
