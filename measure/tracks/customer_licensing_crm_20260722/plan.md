# Implementation Plan: Customer, Licensing, and Minimal CRM Control Plane

## Dependencies and Preconditions

- Do not use the incompatible/stale repository graph as a prerequisite. The
  former full-repository graph evidence is historical/incomplete and the
  duplicate-materialization/audit path is deferred for resource safety.
- The only shared safety prerequisite is the not-yet-accepted bounded
  Accounts/backend gate from
  `small_company_admin_privileges_20260722`: exact `apps/accounts` route and
  method inventory plus coverage of authentication, authorization/permission
  ownership, Zod validation, single-company global scope, immutable audit, and
  destructive effects across Accounts and affected backend identity/role/
  capability surfaces. It must resolve all known High findings in that scope,
  including the strict non-empty Bearer-token Zod boundary at OIDC logout,
  immutable-audit evidence, route/dimension evidence binding, and hash-bound
  command receipts. Its four commands are exactly `CI=true pnpm --filter
  accounts test`, `CI=true pnpm --filter accounts check-types`, `CI=true pnpm
  --filter @reading-advantage/backend test`, and `CI=true pnpm --filter
  @reading-advantage/backend check-types`; no graph command is required.
- Contract/schema, migration design, and Red test work may proceed while the
  Backend Capability Kernel is pending. Backend capability implementation,
  registration, Company Admin route publication, and production migration are
  blocked until the kernel descriptor/executor API is accepted; do not create a
  second executor framework.
- Company Admin CRM UI acceptance depends on
  `small_company_admin_privileges_20260722` Phase S1 registering Company
  Operations and deriving `OPERATIONS_ADMIN` for `COMPANY_ADMIN`.
- Keep the company-identity database unchanged; establish one reviewed
  company-operations database/adapter root behind the same Company Admin UI.
- Declare Company Operations capabilities with explicit single-company `global` tenancy; never infer school tenancy or create a second company boundary.
- Durable provisioning retries and lead-notification delivery depend on `durable_job_worker_platform_20260713` Phase 4 acceptance; do not create a private queue or in-request retry loop.

## Phase S1: Manage customers and leads
_Story ref: spec.md#story-s1_

- [b] Task: Define strict lead, organization, contact, school-site, note, conversion, deduplication, effective-dated sales-assignment, Company Operations role, and named-permission contracts. (deferred:small_company_admin_privileges_20260722-phase0-acceptance)
- [b] Task: Design and review company-operations Drizzle schema, migration stream, ownership policy, indexes, lifecycle transitions, audit, and identity-reference boundary. (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)
- [b] Task: Write Red unit and isolated PostgreSQL tests for validation, duplicate intake, conversion, multi-site customers, ownership history, public-create-only access, role separation, authorization, idempotency, and rollback. (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)
- [b] Task: After kernel and owner-role mapping acceptance, implement backend capabilities, PostgreSQL adapter, and Company Admin Leads/Customers UI through thin routes. (deferred:backend_capability_kernel_20260713-final-acceptance-and-small_company_admin_privileges_20260722-s1-acceptance)
- [b] Task: Run DB/backend/Accounts gates, the bounded route/security review, generated docs, doctor, accessibility review, and acceptance; do not run a graph scan. (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)
- [b] Task: Measure - User Manual Verification 'Phase S1: Manage customers and leads' (Protocol in workflow.md) (deferred:small_company_admin_privileges_20260722-bounded-accounts-safety-gate)

## Phase S2: Track demos and trials
_Story ref: spec.md#story-s2_

- [b] Task: Define demo-program, provisioning-run, school-trial, status/history, conversion, and secret-redaction contracts. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Write Red tests distinguishing synthetic demos from customer trials and covering expiration, extension, conversion, failure, retry, and credential redaction. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Implement demo/trial capabilities and Company Admin surfaces without changing Reading's existing generation behavior. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Add a provider-neutral reporting port for current Reading demo health and exact local identifiers. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Run affected tests, bounded route/security review, generate/doctor gates, and browser acceptance; do not run a graph scan. (deferred:customer_licensing_crm_20260722-s1-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S2: Track demos and trials' (Protocol in workflow.md) (deferred:customer_licensing_crm_20260722-s1-acceptance)

## Phase S3: Manage subscriptions and provisioning
_Story ref: spec.md#story-s3_

- [b] Task: Define subscription history, product catalog key, local provisioning link/run, idempotency, retry, rollback, and adapter contracts. (deferred:customer_licensing_crm_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Write Red contract and PostgreSQL concurrency tests plus fake-product adapter fixtures; prove expired access cannot reactivate implicitly. (deferred:customer_licensing_crm_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Implement subscription/provisioning capabilities, operations adapter, and Company Admin status/retry UI. (deferred:customer_licensing_crm_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Publish the Reading adapter contract for the successor migration track while retaining product-local runtime enforcement. (deferred:customer_licensing_crm_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Run DB/backend/Accounts gates, bounded route/security review, generate/doctor, failure drills, and independent security review; do not run a graph scan. (deferred:customer_licensing_crm_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S3: Manage subscriptions and provisioning' (Protocol in workflow.md) (deferred:customer_licensing_crm_20260722-s2-and-durable_job_worker_platform_20260713-phase4-acceptance)

## Phase S4: Preserve commercial attribution
_Story ref: spec.md#story-s4_

- [b] Task: Define and review the stable commercial identity/conversion model and effective-dated sales-credit semantics. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Document future agreement, line-item, revenue-event, commission-plan, allocation, approval, adjustment, and reversal contracts without creating unused workflows. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Add tests proving current mutations cannot rewrite historical ownership/conversion evidence and monetary extension examples use minor units/currency. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Add Company Admin ownership/history projections needed now; do not add accounting or commission UI. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Run final program-contract review, full affected gates, generate/doctor, and archive only after product-owner acceptance; do not run a graph scan. (deferred:customer_licensing_crm_20260722-s3-acceptance)
- [b] Task: Measure - User Manual Verification 'Phase S4: Preserve commercial attribution' (Protocol in workflow.md) (deferred:customer_licensing_crm_20260722-s3-acceptance)
