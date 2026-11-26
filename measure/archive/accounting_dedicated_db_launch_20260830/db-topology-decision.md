# Database Topology Decision — Accounting Dedicated Database

Track: `accounting_dedicated_db_launch_20260830`
Decision reference: Spec **D-1**

## Decision

Accounting runs on a **new dedicated database named `accounting` on the existing
shared Cloud SQL instance** `reading-advantage:asia-southeast1:cloud-sql`.

## Evidence

- The security-sensitive company identity database already runs as a separate
  database on the shared instance, with its own drizzle journal, migration
  commands, runtime client, least-privilege roles, and secrets:
  `packages/db/company-identity/`, `packages/db/src/company-identity/`.
- Marketing and Sales run separate databases on the same instance the same way
  (`apps/marketing/scripts/marketing-runtime-grants.sql`,
  `apps/sales-advantage/cloudbuild.yaml`).
- The deploy skill mandates one database per app on the shared instance
  (`.agents/skills/gcp-cloud-run-monorepo-deploy/SKILL.md`, Core Rule, step 9).
- A second always-on Cloud SQL instance adds a fixed monthly cost and buys no
  isolation that a separate database with separate roles does not provide.

## Rejected alternative

A new always-on Cloud SQL instance. It adds a fixed monthly cost and no
additional isolation versus a separate database with separate roles. The owner
may reject this decision; if rejected, the same tasks switch the target to a
new instance named in this note, and no app-level task changes.

## Layout

The Accounting database follows the company-identity package layout:

- `packages/db/accounting/drizzle.config.ts` — drizzle config for the accounting journal.
- `packages/db/src/accounting/schema/index.ts` — the two Accounting tables.
- `packages/db/src/accounting/runtime.ts` — runtime-only postgres.js client factory.
- `packages/db/src/accounting/environment.ts` — `ACCOUNTING_DIRECT_DATABASE_URL` (migrations) and `ACCOUNTING_DATABASE_URL` (runtime).
- `packages/db/src/accounting/migration.ts` / `doctor.ts` — journal apply and ledger inspection.
- `packages/db/src/accounting/commands/` — `accounting:migrate` and `accounting:doctor` CLIs.
- `apps/accounting/scripts/accounting-runtime-grants.sql` — append-only least-privilege grants.
- `apps/accounting/scripts/accounting-runtime-role-provision.sql` — one-off role creation.
- `apps/accounting/scripts/accounting-runtime-probe.sql` — runtime probe (audit insert allowed, audit UPDATE/DELETE denied, DDL denied).

## Identity boundary

Identity stays in Accounts (D-2). The dedicated database holds only Accounting
product data. SSO continues through the pre-registered `accounting-web` OIDC
client. The `scope_company_id` column stays a plain UUID without a foreign key.
