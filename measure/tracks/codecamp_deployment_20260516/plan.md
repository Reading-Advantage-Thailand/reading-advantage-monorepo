# Implementation Plan: codecamp-advantage Deployment

## Phase 1: Deployment Artifacts

Create the production container and Cloud Build deployment configuration.

- [x] Task: Add Cloud Run deployment artifacts
  - [x] Configure Next.js standalone output for `apps/codecamp-advantage`
  - [x] Add a production Dockerfile scoped to the monorepo
  - [x] Add `.dockerignore` to keep build contexts small and secret-free
  - [x] Add `apps/codecamp-advantage/cloudbuild.yaml`
  - [x] Keep app-facing environment variables provider-neutral
- [x] Task: Expose GitHub webhook route from the deployed app
  - [x] Add `POST /webhooks/github/pr` in the Next app
  - [x] Reuse the existing `@reading-advantage/webhooks` handler
  - [x] Avoid starting the standalone Hono server inside Next
- [x] Task: Verify deployment artifacts
  - [x] Run focused tests for webhooks and codecamp app
  - [x] Run type checks for affected packages
  - [x] Build `codecamp-advantage`

## Phase 2: GCP Deployment

Deploy the container to Cloud Run and verify runtime configuration.

- [x] Task: Verify GCP project prerequisites
  - [x] Billing enabled for `codecamp-advantage`
  - [x] Required APIs enabled
  - [x] Artifact Registry repository exists
  - [x] Runtime service account exists
  - [x] Runtime service account has Cloud SQL Client on `reading-advantage`
  - [x] Runtime service account has Secret Manager access in `codecamp-advantage`
- [x] Task: Deploy to Cloud Run
  - [x] Submit Cloud Build
  - [x] Confirm service URL
  - [x] Confirm Cloud SQL annotation
  - [x] Confirm secrets are mounted as environment variables
- [x] Task: Provision Codecamp database on shared Cloud SQL
  - [x] Create dedicated `codecamp_advantage` database in `reading-advantage:asia-southeast1:cloud-sql`
  - [x] Run Drizzle migrations via one-off Cloud Run Job
  - [x] Seed Codecamp curriculum via one-off Cloud Run Job
  - [x] Point live `DATABASE_URL` secret at `codecamp_advantage`
  - [x] Create bootstrap `admin` account with password stored in Secret Manager
- [x] Task: Smoke test production service
  - [x] Confirm app root loads
  - [x] Confirm health or app route returns 2xx
  - [x] Confirm webhook route rejects unsigned requests
  - [x] Confirm invalid login returns 401 instead of database error
  - [x] Confirm bootstrap admin login returns 200
  - [x] Confirm authenticated `codecamp.dashboard` tRPC returns 200
- [x] Task: Document reusable GCP deployment process
  - [x] Write exact Cloud Run / Cloud SQL / Cloud Build deployment runbook
  - [x] Add repo-local deployment skill for future monorepo GCP deployments

## Phase 3: DNS and Webhook Verification

Map the public domain and validate the full external workflow.

- [x] Task: Create Cloud Run domain mapping
  - [x] Verify `reading-advantage.com` domain ownership for the project
  - [x] Map `codecamp.reading-advantage.com`
  - [x] Record Cloud Run DNS records
- [x] Task: Update Squarespace DNS
  - [x] Open `https://account.squarespace.com/domains/managed/reading-advantage.com`
  - [x] Add or replace `codecamp` DNS record(s)
  - [x] Verify DNS propagation / routability
- [ ] Task: Verify GitHub webhook delivery
  - [ ] Send GitHub webhook test delivery or open a test PR
  - [ ] Confirm `codecamp_pr_reviews` row creation
  - [ ] Confirm reviewer posts or records review result
