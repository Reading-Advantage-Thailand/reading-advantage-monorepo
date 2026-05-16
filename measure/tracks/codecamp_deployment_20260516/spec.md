# Specification: codecamp-advantage Deployment

## Overview

Deploy `apps/codecamp-advantage` as a production Cloud Run service in the `codecamp-advantage` Google Cloud project. The service must use the existing shared PostgreSQL Cloud SQL instance in the `reading-advantage` project while keeping application configuration provider-neutral so the app can move off Google later with minimal code changes.

## Context

Existing Reading Advantage apps run as containers on Cloud Run. `codecamp-advantage` currently has a working app and GitHub App reviewer integration, but it lacks production container, Cloud Build, Cloud Run, DNS, and webhook routing configuration.

The shared database instance is:

- Project: `reading-advantage`
- Instance: `cloud-sql`
- Connection name: `reading-advantage:asia-southeast1:cloud-sql`
- Engine: PostgreSQL 17

The deployment project is:

- Project: `codecamp-advantage`
- Region: `asia-southeast1`
- Service account: `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com`
- Artifact Registry repository: `asia-southeast1-docker.pkg.dev/codecamp-advantage/codecamp`

## Scope

### In Scope

- Add a production Dockerfile for `apps/codecamp-advantage`.
- Configure Next.js standalone output for container deployment.
- Add a Cloud Build config that builds, pushes, and deploys to Cloud Run.
- Wire Cloud Run to the shared Cloud SQL instance with `--add-cloudsql-instances`.
- Keep app code dependent on generic environment variables such as `DATABASE_URL`, `AUTH_SECRET`, and GitHub App vars.
- Store and reference secrets through Secret Manager, not plain Cloud Run environment values.
- Expose the GitHub App webhook at `POST /webhooks/github/pr` from the deployed app domain.
- Verify build/type/test coverage for changed packages.
- Create the Cloud Run service and map `codecamp.reading-advantage.com`.
- Update Squarespace DNS after Cloud Run returns the required DNS records.

### Out of Scope

- Migrating away from Cloud SQL.
- Replacing the app runtime with another cloud provider.
- Reworking the GitHub App review algorithm.
- Creating missing portfolio repositories unrelated to the production deploy.

## Provider-Neutral Configuration

Application code should consume generic config:

- `DATABASE_URL`
- `AUTH_SECRET`
- `NEXT_PUBLIC_API_URL`
- `GITHUB_APP_ID`
- `GITHUB_PRIVATE_KEY`
- `GITHUB_WEBHOOK_SECRET`
- `GITHUB_INSTALLATION_ID`
- `OPENROUTER_API_KEY`
- `OPENAI_API_KEY`
- `GOOGLE_AI_API_KEY`

Google-specific details, including Cloud SQL socket paths and Secret Manager resource names, belong in deployment config and secrets only.

## Acceptance Criteria

- [ ] `codecamp-advantage` builds in a production Docker container.
- [ ] Cloud Build deploys `codecamp-advantage` to Cloud Run in `asia-southeast1`.
- [ ] Cloud Run uses `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com`.
- [ ] Cloud Run is connected to `reading-advantage:asia-southeast1:cloud-sql`.
- [ ] Runtime secrets are sourced from Secret Manager.
- [ ] `https://codecamp.reading-advantage.com` serves the app over HTTPS.
- [ ] `POST /webhooks/github/pr` reaches the GitHub webhook handler.
- [ ] GitHub App has a matching webhook secret and private key in Secret Manager.
- [ ] Squarespace DNS contains the Cloud Run mapping records.
- [ ] Relevant tests, type checks, and build checks pass or documented baseline failures are separated from deployment changes.
