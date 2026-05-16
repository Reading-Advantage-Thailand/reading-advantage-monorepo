---
name: gcp-cloud-run-monorepo-deploy
description: Deploy a Reading Advantage monorepo app to GCP Cloud Run using Cloud Build, Artifact Registry, Secret Manager, Cloud SQL, Cloud Run Jobs for Drizzle migrations/seeding, Squarespace DNS, and production smoke tests. Use when asked to deploy or redeploy a monorepo app to GCP, especially apps like codecamp-advantage that share Cloud SQL across projects.
---

# GCP Cloud Run Monorepo Deploy

Use this skill to repeat the successful `codecamp-advantage` deployment pattern for another app in this monorepo.

The full command runbook is in:

`docs/deployment/gcp-cloud-run-monorepo-deployment.md`

## Core Rule

Keep app-specific configuration isolated:

- Each app gets its own Cloud Run service.
- Each app gets its own app database, even if it uses the shared Cloud SQL instance.
- Secrets live in the app project.
- Runtime service account gets only the roles it needs.
- Provider-specific GCP details stay in deployment artifacts and docs; app code should remain portable where practical.

## Required Sequence

1. Read `AGENTS.md`, `measure/index.md`, `measure/workflow.md`, and the active deployment track.
2. Set app/project variables from the runbook.
3. Verify local typecheck/build before deploying.
4. Enable GCP APIs in the app project.
5. Create Artifact Registry repo.
6. Create runtime service account.
7. Grant runtime service account:
   - `roles/secretmanager.secretAccessor` on app project
   - `roles/cloudsql.client` on the Cloud SQL project
8. Grant Cloud Build’s actual service account:
   - `roles/run.admin` on app project
   - `roles/iam.serviceAccountUser` on the runtime service account
9. Create a dedicated app database in Cloud SQL.
10. Create/update Secret Manager secrets, including `DATABASE_URL`.
11. Confirm the app DB client supports Cloud SQL Unix socket URLs.
12. Add or update Dockerfile, Cloud Build config, `.dockerignore`, and `.gcloudignore`.
13. Submit Cloud Build to deploy Cloud Run.
14. Build a migration image and run a Cloud Run Job for Drizzle migrations/seeding.
15. Create bootstrap admin through a one-off job if self-registration is disabled.
16. Create Cloud Run domain mapping.
17. Update Squarespace DNS.
18. Smoke test:
    - app route returns 2xx
    - bad login returns 401, not 500
    - bootstrap login returns 200
    - protected dashboard/API returns 200 after login
    - unsigned webhook returns 401
    - no new Cloud Run error logs
19. Verify the browser flow with Kimi WebBridge or a real browser.
20. Update the deployment track with evidence and remaining open tasks.

## Important Commands

Start with the runbook’s variable block, then use these exact command families:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com secretmanager.googleapis.com sqladmin.googleapis.com sql-component.googleapis.com iam.googleapis.com compute.googleapis.com --project="$APP_PROJECT"
gcloud artifacts repositories create "$AR_REPO" --repository-format=docker --location="$REGION" --project="$APP_PROJECT"
gcloud iam service-accounts create "${SERVICE}-cloud-run" --project="$APP_PROJECT"
gcloud sql databases create "$DB_NAME" --instance="$SQL_INSTANCE" --project="$SQL_PROJECT"
gcloud builds submit --project="$APP_PROJECT" --config="apps/${SERVICE}/cloudbuild.yaml" .
gcloud run jobs execute "${SERVICE}-db-migrate" --project="$APP_PROJECT" --region="$REGION" --wait
gcloud beta run domain-mappings create --service="$SERVICE" --domain="$DOMAIN" --region="$REGION" --project="$APP_PROJECT"
```

Use the runbook for the full IAM, secrets, migration image, bootstrap admin, DNS, and smoke-test commands.

## GCP Cloud SQL Socket Gotcha

Cloud Run should connect to Cloud SQL with:

```text
postgresql://USER:PASSWORD@localhost/DB?host=/cloudsql/PROJECT:REGION:INSTANCE
```

For `postgres.js`, do not pass `host` through as a URL query parameter. Convert it to:

```ts
{ path: "/cloudsql/PROJECT:REGION:INSTANCE/.s.PGSQL.5432" }
```

If this is wrong, login/API failures usually show:

- `ECONNREFUSED 127.0.0.1:5432`
- `FATAL unrecognized configuration parameter "host"`

## Validation Standard

Do not call the deployment complete until these pass:

```bash
pnpm turbo run check-types --filter="$SERVICE"
pnpm turbo run build --filter="$SERVICE"
curl -I "https://${DOMAIN}/th"
curl -i -X POST "https://${DOMAIN}/webhooks/github/pr" -H 'content-type: application/json' --data '{}'
```

For auth apps, also verify login and an authenticated API call using a cookie jar, without printing passwords or cookies.
