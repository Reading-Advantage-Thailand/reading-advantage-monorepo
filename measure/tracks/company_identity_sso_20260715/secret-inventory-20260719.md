# Production Secret Inventory — 2026-07-19

Secret names below are references, not values. They are derived from the
application `cloudbuild.yaml` `--set-secrets` and `availableSecrets` entries.
The minimum runtime role is `roles/secretmanager.secretAccessor`; build-time
`availableSecrets` references require the same role for the Cloud Build service
account in the owning project.

## Identity and application bindings

| Secret reference / env var | Owner project | Consumer project | Consumer identity | Minimum role |
|---|---|---|---|---|
| `COMPANY_AUTH_DATABASE_URL` | `reading-advantage` | `reading-advantage` | `accounts-cloud-run@reading-advantage.iam.gserviceaccount.com` | `roles/secretmanager.secretAccessor` |
| `COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY` | `reading-advantage` | `reading-advantage` | Accounts runtime SA above | same |
| `COMPANY_AUTH_IDENTIFIER_HASH_KEY` | `reading-advantage` | `reading-advantage` | Accounts runtime SA above | same |
| `MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET` | `reading-advantage` | `reading-advantage` | `marketing-cloud-run@reading-advantage.iam.gserviceaccount.com` | same |
| `SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET` | `reading-advantage` | `reading-advantage` | `sales-cloud-run@reading-advantage.iam.gserviceaccount.com` | same |
| `CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET` | `reading-advantage` | `codecamp-advantage` | `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com` | same |

The Codecamp secret is referenced by its full resource name:
`projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest`.
Its cross-project grant is **outstanding operator action**. Apply both exact
bindings in the Accounts project:

```text
role: roles/secretmanager.secretAccessor
member: serviceAccount:codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com
member: serviceAccount:148839308272@cloudbuild.gserviceaccount.com
```

The second member is the Codecamp project Cloud Build default service account;
it is required for the cross-project `--set-secrets` reference to resolve at
deploy time. The first is required by the Cloud Run runtime. The operator
procedure is also recorded in the Codecamp cutover runbook, Phase 0.

## Per-app `--set-secrets` mappings

- **Accounts** (`apps/accounts/cloudbuild.yaml`): runtime
  `COMPANY_AUTH_DATABASE_URL→COMPANY_AUTH_DATABASE_URL`,
  `COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY→COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY`,
  `COMPANY_AUTH_IDENTIFIER_HASH_KEY→COMPANY_AUTH_IDENTIFIER_HASH_KEY`.
  Build-only direct DB, bootstrap owner, and the three client secrets are read
  from `reading-advantage` by the Accounts Cloud Build identity.
- **Marketing**: `DATABASE_URL→MARKETING_DATABASE_URL`,
  `ENCRYPTION_KEY→MARKETING_ENCRYPTION_KEY`, provider keys, and
  `COMPANY_AUTH_OIDC_CLIENT_SECRET→MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET`.
- **Sales**: `DATABASE_URL→SALES_DATABASE_URL`,
  `COMPANY_AUTH_OIDC_CLIENT_SECRET→SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET`,
  plus the AI, audio, chat, and storage references listed in its
  `--set-secrets` argument. Its legacy rollback maps `DATABASE_URL` to
  `SALES_LEGACY_DATABASE_URL` and omits company OIDC.
- **Codecamp**: `DATABASE_URL→CODECAMP_DATABASE_URL`, legacy product/GitHub/AI
  secrets, `TUTORIAL_REPORT_SECRET→CODECAMP_TUTORIAL_REPORT_SECRET`,
  `TUTORIAL_REPOSITORY_WORKER_TOKEN→CODECAMP_TUTORIAL_REPOSITORY_WORKER_TOKEN`,
  and the cross-project OIDC mapping above.

Identity-boundary commitment: Accounts owns company credentials, OIDC signing,
and client secrets; product runtimes consume only their registered client
secret and product secrets. No product runtime receives the Accounts database
or signing key, and Codecamp remains the only pending cross-project grant.
