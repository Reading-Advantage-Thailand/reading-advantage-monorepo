# Small-Company Operations Program

## Objective

Give a small Reading Advantage team one practical internal operating surface for
employee access, leads, customers, demos, trials, subscriptions, and product
provisioning without building enterprise IAM, a general CRM, or an accounting
platform.

The program keeps authentication and business data in separate backend
boundaries while presenting them through one Company Admin application.

```text
www Contact Us / commercial CTA
                |
                v
       public lead capability
                |
                v
Company Admin: lead -> customer -> trial -> subscription
                                      |
                                      v
                           product provisioning adapter
                                      |
                                      v
                  Reading local school/license enforcement
```

## Ratified Decisions

1. `COMPANY_ADMIN` is the small-company owner/operator role. It automatically
   receives administrator access to internal applications; the owner does not
   maintain duplicate per-app assignments.
2. Ordinary employees retain explicit application roles where product duties
   differ, such as `SALES_REP` and `SALES_ADMIN`.
3. Do not add `SUPER_ADMIN`, delegated IAM, role builders, SCIM, or enterprise
   approval workflows.
4. Evolve `apps/accounts` into the Company Admin UI with Team, Leads,
   Customers, Demos/Trials, and Licenses sections. Identity data remains in the
   company-identity database; commercial data uses a separate company-operations
   backend/database boundary behind the same UI.
5. Register Company Operations as an exact internal application/capability
   namespace. Its initial roles are `OPERATIONS_ADMIN` and
   `OPERATIONS_MEMBER`; `COMPANY_ADMIN` derives `OPERATIONS_ADMIN`. Marketing,
   Sales, and Codecamp roles never grant CRM/customer/license access implicitly.
6. The first-party CRM is intentionally minimal: leads, customer organizations,
   contacts, school sites, notes, sales ownership, demos/trials, subscriptions,
   and provisioning status.
7. `www-reading-advantage` Contact Us and commercial CTAs submit validated
   business-contact information to the CRM lead capability with source, product,
   locale, campaign, consent, and anti-spam evidence.
8. A shared daily Reading demo is operational infrastructure, not a customer.
   A school trial is prospect access tied to a customer/contact and may convert
   to a paid subscription.
9. Product access and money remain separate. Stable sales ownership and
   conversion history are captured now; agreements, revenue events, commission
   calculations, invoicing, and payments are deferred until needed.
10. Reading Advantage is the first licensing migration because its licenses are
   expired and schools are not currently relying on live access.
11. During the Reading pilot, central operations provisions the existing local
    Reading school/license model. Reading keeps local runtime enforcement until
    a later proven migration justifies a central runtime dependency.
12. Existing expired Reading licenses remain expired and are imported only as
    historical commercial/access context. Nothing is automatically reactivated.
13. Monorepo deployment authority for Reading and a working deployment path for
    www are required before production cutover.

14. Company Operations capabilities use an explicit single-company `global` tenancy policy. They never inherit school tenancy and do not introduce a second company or organization boundary.
15. Retryable provisioning and lead-notification delivery use the shared durable job worker after its Phase 4 acceptance. No product-local queue or request-path retry loop may be introduced.

## Data Boundaries

### Company Identity

- Employees, credentials, sessions, OIDC clients, company roles, app roles, and
  security audit events.
- Existing `company_identity_sso_20260715` architecture remains the authority.
- No customer, school, license, subscription, revenue, or product-progress rows.

### Company Operations

- Leads and provenance.
- Customer organizations and contacts.
- School sites as provisionable customer locations, distinct from a commercial
  customer organization.
- Effective-dated sales assignments using stable employee account IDs.
- Demo programs, school trials, subscriptions, provisioning links/runs, notes,
  and commercial audit events.
- Stable identifiers and history required for later revenue and commission
  attribution.

### Product Applications

- Students, teachers, classrooms, curriculum, progress, and product-local
  school/license enforcement.
- Product adapters translate central provisioning into local records.

## Revenue and Commission Readiness

The MVP must not overload a license with one mutable price or salesperson.
It preserves:

- stable lead, customer, contact, trial, subscription, and employee IDs;
- source/campaign attribution;
- effective-dated sales assignments with roles such as owner, introducer,
  closer, and account manager;
- append-only subscription history and trial-to-subscription conversion links;
- currency-ready integer minor-unit contracts for future monetary records; and
- audit evidence identifying actors and changes.

Future `commercial_agreements`, `agreement_line_items`, `revenue_events`,
`commission_plans`, and `commission_allocations` are documented extension
points, not MVP tables or user interfaces. Commission allocation will snapshot
the employee, credited role, split, plan/version, amount, approval, and any
reversal instead of deriving history from the customer's current owner.

## Program Tracks and Order

The Small-Company Admin track owns Phase 0, which rebuilds and accepts the program-wide repository graph baseline. All product phases in Tracks 1 and 2 remain blocked until that baseline is accepted. This ownership is a sequencing mechanism, not a product dependency between privileges and CRM.

1. [`small_company_admin_privileges_20260722`](./tracks/small_company_admin_privileges_20260722/)
   simplifies internal owner/operator access and completes production role
   verification.
2. [`customer_licensing_crm_20260722`](./tracks/customer_licensing_crm_20260722/)
   establishes the company-operations contracts, minimal CRM, demos/trials,
   subscriptions, provisioning ports, and future revenue attribution seams.
3. [`www_crm_lead_intake_20260722`](./tracks/www_crm_lead_intake_20260722/)
   connects Contact Us and approved commercial CTAs to the lead capability. It
   depends on the accepted lead contract from Track 2.
4. [`reading_license_control_plane_migration_20260722`](./tracks/reading_license_control_plane_migration_20260722/)
   imports expired Reading history, centralizes new/renewed provisioning, and
   proves demos, school trials, and paid subscriptions. It depends on the
   accepted customer/subscription/provisioning contracts from Track 2.

Track 1 may run in parallel with Track 2. Tracks 3 and 4 may run in parallel
after their Track 2 contracts are accepted. Before source changes, the current
incompatible/stale `graph.db` must be rebuilt successfully with the canonical
`repo-graph` binary; failed or timed-out scans are not implementation evidence.

## Explicit Non-Goals

- Fortune-500 separation-of-duties or delegated administration.
- A Salesforce/HubSpot replacement, forecasting, territories, or workflow
  automation.
- Billing, tax, accounting, payment processing, invoices, or revenue
  recognition in the MVP.
- Commission calculation or payout in the MVP.
- Migrating student/teacher identities into employee SSO.
- A synchronous central entitlement dependency for every product request.
- Automatic reactivation of expired licenses.
- Big-bang replacement of Reading and Primary licensing.
