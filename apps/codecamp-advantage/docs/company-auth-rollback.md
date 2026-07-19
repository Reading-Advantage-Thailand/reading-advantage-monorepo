# Codecamp company-auth rollout and rollback

## Ownership and invariants

The Cloud Run service, Artifact Registry image, and
`codecamp.reading-advantage.com` domain mapping remain in GCP project
`codecamp-advantage`. The Cloud SQL instance remains the approved shared
instance in project `reading-advantage`. Do not move or recreate the domain
mapping in another project: the domain mapping remains in `codecamp-advantage`
and continues routing to the `codecamp-advantage` service while revision
traffic changes.

`CODECAMP_AUTH_MODE` accepts exactly `company` or `legacy` and defaults to
`company`. Company mode rejects product-local login and password reset before
the shared handlers run. Legacy mode rejects the Accounts start/callback path.
This mutual exclusion preserves one credential writer at a time.

The candidate uses the central OIDC client secret by its cross-project resource
name:
`projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET`.
The Codecamp runtime identity needs accessor permission on that secret only.

## Build and no-traffic candidate

Submit from the monorepo root. The build project is authoritative because
`cloudbuild.yaml` derives its service account and image repository from
`$PROJECT_ID`:

```bash
gcloud builds submit .   --project=codecamp-advantage   --region=asia-southeast1   --config=apps/codecamp-advantage/cloudbuild.yaml
```

The deploy step creates a no-traffic `sso-candidate` revision with
`CODECAMP_AUTH_MODE=company`. Before promotion, verify `/api/auth/mode` returns
`{"mode":"company"}`, local login/reset return 409, Accounts callback and
mapped Codecamp access work, and generic `students`, `classes`, `users`, and
`auth` tRPC namespaces return not-found.

## Immediate rollback to the known revision

The immutable pre-SSO rollback anchor is
`codecamp-advantage-00019-682`, image digest
`sha256:995d86e1aadbad8fe93ce93fbe0e7ac3afbc5ec804b63e147011982738d1dffb`.
It remains in project `codecamp-advantage` and already contains the last known
working local-login UI and session behavior.

```bash
gcloud run services update-traffic codecamp-advantage   --project=codecamp-advantage   --region=asia-southeast1   --to-revisions=codecamp-advantage-00019-682=100
```

Verify the service reports 100% on that exact revision and test one existing
admin plus one existing intern through login, session, tRPC, logout, and
preserved progress. Because the mapping targets the service rather than an
individual revision, no DNS or domain-mapping mutation is part of rollback.

## Current-image legacy compatibility revision

If the operator needs a current-image rollback after an additive migration,
create a distinct no-traffic revision from the exact candidate digest and set
`CODECAMP_AUTH_MODE=legacy`. Preserve the current runtime secrets and database
binding; do not bind the central OIDC secret to this legacy revision.

```bash
CANDIDATE_IMAGE='asia-southeast1-docker.pkg.dev/codecamp-advantage/codecamp/codecamp-advantage@sha256:<candidate-digest>'
gcloud run deploy codecamp-advantage   --project=codecamp-advantage   --region=asia-southeast1   --image="${CANDIDATE_IMAGE}"   --service-account=codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com   --update-env-vars=CODECAMP_AUTH_MODE=legacy   --remove-secrets=COMPANY_AUTH_OIDC_CLIENT_SECRET   --tag=legacy-rollback   --no-traffic
```

Test the tagged URL before any traffic change. Promote that exact revision only
if local login, password reset authorization, admin/intern role checks, session,
logout, tRPC allowlist, and product ownership all pass. Record the revision and
image digest in rollout evidence. Returning to company mode requires promoting
the already-verified company candidate revision; never mutate a serving
revision in place.
