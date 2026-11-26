# Customer, Licensing, and Minimal CRM Control Plane

## Overview

Operate the complete lead-to-customer-to-product-access lifecycle from one
small-company admin surface while preserving clean identity, product, and future
revenue boundaries. The CRM is deliberately bounded to the information needed
to follow up, run demos and school trials, create subscriptions, provision
products, and retain sales attribution.

The Company Admin UI may live in `apps/accounts`, but commercial records use a
separate company-operations PostgreSQL boundary and backend adapters. Employee
identity remains governed by the company-identity database.

Company Operations is an exact internal application/capability namespace with
`OPERATIONS_ADMIN` and `OPERATIONS_MEMBER` roles. `COMPANY_ADMIN` derives
`OPERATIONS_ADMIN` through `small_company_admin_privileges_20260722`;
`OPERATIONS_MEMBER` is explicitly assigned to a future salesperson. Sales
Advantage roles grant no Company Operations access.

## Stories

### Story S1: Manage customers and leads
**As a** company owner or future salesperson
**I want** leads, organizations, contacts, school sites, notes, and ownership in one place
**So that** inquiries can become customers without losing context

**Acceptance Criteria:**
- Given a validated inquiry, When it is accepted, Then a lead records contact data, product intent, source page, campaign/UTM, locale, consent, and creation provenance.
- Given likely duplicate submissions, When intake evaluates them, Then it preserves an auditable submission while avoiding accidental duplicate active leads under a deterministic policy.
- Given a qualified lead, When it converts, Then stable customer organization, contact, and optional school-site records are linked without deleting lead history.
- Given a customer group with multiple campuses, When sites are added, Then the commercial organization remains distinct from each product-local school.
- Given a lead or customer, When ownership changes, Then effective-dated sales assignments preserve prior owners and credited roles.
- Given public lead intake, When authorization is evaluated, Then callers may create a bounded lead but cannot enumerate, read, convert, assign, or provision records.
- Given an ordinary employee, Sales app role, Operations member, or Operations admin, When a capability is invoked, Then a named permission matrix allows only the reviewed operations for that role.

**Estimate:** L
**Priority:** Must

### Story S2: Track demos and trials
**As a** company operator
**I want** shared demos and prospect school trials represented distinctly
**So that** operational demo health does not contaminate customer conversion data

**Acceptance Criteria:**
- Given the recurring Reading daily demo, When regeneration runs, Then its program, current local identifiers, status, timestamps, and provisioning-run outcome are visible without creating a fake lead/customer.
- Given generated demo credentials, When a run is recorded, Then raw passwords or session secrets are not persisted in CRM records or audit metadata.
- Given a real school prospect, When a trial is created, Then it links customer, contact, owner, product, dates, seat limit, source lead, and product-local provisioning identifiers.
- Given a trial, When it expires, extends, fails, converts, or is abandoned, Then append-only history preserves the outcome and any resulting subscription link.

**Estimate:** M
**Priority:** Must

### Story S3: Manage subscriptions and provisioning
**As a** company operator
**I want** subscriptions to provision product-local access reliably
**So that** commercial decisions become enforceable licenses without a synchronous central runtime dependency

**Acceptance Criteria:**
- Given an approved trial or paid subscription, When provisioning runs, Then a provider-neutral product adapter creates or updates the exact local school/license records and stores the local mapping.
- Given retries or duplicate requests, When provisioning repeats, Then idempotency prevents duplicate schools/licenses and terminal results are replayable.
- Given a provisioning failure, When it is inspected, Then status, safe error, attempt history, and an authorized retry action are visible.
- Given an expired subscription, When product access is evaluated, Then no central operation silently reactivates it.
- Given a product request path, When central operations is unavailable, Then the product continues enforcing its last accepted local license state.

**Estimate:** L
**Priority:** Must

### Story S4: Preserve commercial attribution
**As a** future sales owner
**I want** stable conversion and sales-credit history
**So that** later revenue reporting and commissions can be calculated correctly

**Acceptance Criteria:**
- Given lead, customer, trial, and subscription records, When they change, Then stable IDs and immutable conversion links permit later commercial reconciliation.
- Given sales ownership, When it changes, Then assignments record employee account ID, credited role, effective interval, actor, and reason rather than replacing history.
- Given future monetary records, When their contract is documented, Then amounts use integer minor units plus ISO currency and remain separate from access licenses.
- Given future commissions, When the extension contract is reviewed, Then allocations snapshot employee, credited role, split/basis points, plan/version, amount, approval, and reversal linkage.
- Given the MVP, When accepted, Then no invoice, payment, revenue-recognition, commission-calculation, or payout behavior is falsely claimed.

**Estimate:** M
**Priority:** Should

## Non-Functional Requirements

- All external inputs use strict Zod contracts and capability executor policies.
- Define named Company Operations permissions for lead read/manage, customer
  manage, trial manage, subscription manage, provisioning retry, and commercial
  history read; do not authorize by ad hoc role-string checks.
- Public lead intake is rate-limited, spam-resistant, consent-aware, and
  non-enumerating.
- Only approved company-operations adapters access the operations database.
- Employee IDs are stable logical references to company identity; do not create
  cross-database foreign keys or copy credential/session data.
- Security-sensitive changes are transactional, idempotent where retryable, and
  create immutable secret-safe audit evidence.
- Real PostgreSQL tests prove constraints, tenancy/ownership, migration reruns,
  transaction rollback, and concurrent idempotency.
- Company Admin works on desktop and mobile with accessible keyboard operation.

## Track-Level Acceptance Criteria

- A lead can become a customer, school trial, and subscription without losing
  source or sales-ownership history.
- Shared demos are operational records; school trials are prospect records.
- Subscriptions provision through a provider-neutral adapter and retain local
  product mappings and run history.
- The owner can manage the MVP through Company Admin.
- Public callers cannot enumerate CRM data, Sales roles confer no CRM access,
  and ordinary employees require an explicit Operations role.
- Future revenue and commission boundaries are documented and structurally
  supported without implementing unused accounting features.

## Out of Scope

- Sales forecasting, territories, workflow automation, bulk marketing, or a
  Salesforce/HubSpot-compatible CRM.
- Quotes, invoices, payments, tax, accounting, revenue recognition, commission
  calculation, approval, payout, or clawback execution.
- Student/teacher identity, classroom operations, or product progress.
- Central runtime entitlement checks on every product request.
- Primary or Science product provisioning in this initial track.
