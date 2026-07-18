# Accounts production runbook

Accounts is the only runtime permitted to connect directly to `company_identity`.
Marketing, Sales, and Codecamp use OIDC and application-local sessions.

## Secret inventory

Runtime service account `accounts-cloud-run@reading-advantage.iam.gserviceaccount.com`
receives accessor only on:

- `COMPANY_AUTH_DATABASE_URL` — non-owner `company_identity_runtime` URL.
- `COMPANY_AUTH_OIDC_SIGNING_PRIVATE_KEY` — RSA private key PEM.
- `COMPANY_AUTH_IDENTIFIER_HASH_KEY` — canonical base64url key, at least 32 bytes.

Cloud Build receives accessor on the direct/runtime database URLs and the exact
bootstrap inputs listed below. Product runtime service accounts receive neither
database bootstrap authority nor owner credentials.

Each Accounts build reads these bootstrap secrets only in its pre-deploy step;
they are never attached to the Accounts Cloud Run service:

- `COMPANY_AUTH_BOOTSTRAP_OWNER_USERNAME`
- `COMPANY_AUTH_BOOTSTRAP_OWNER_DISPLAY_NAME`
- `COMPANY_AUTH_BOOTSTRAP_OWNER_PASSWORD`
- `MARKETING_COMPANY_AUTH_OIDC_CLIENT_SECRET`
- `SALES_COMPANY_AUTH_OIDC_CLIENT_SECRET`
- `CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET`, owned centrally at
  `projects/reading-advantage/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET`.

The same central Codecamp secret is bound by its runtime manifest even though
Codecamp is not part of today's deployment.

## Bootstrap

`apps/accounts/cloudbuild.yaml` performs the exact production order:

1. Apply company-identity migrations.
2. Apply deterministic static bootstrap for exactly one organization, three
   applications, and eight role definitions.
3. Run the company-identity doctor.
4. Idempotently create/verify the owner, its three application-admin grants,
   and the exact Marketing, Sales, and Codecamp confidential clients.
5. Prove the least-privilege runtime database contract, then deploy.

The bootstrap step must print
`owner=1 owner_app_admin_roles=3 clients=3 audit=immutable`. Client IDs and
HTTPS callbacks are compiled into the reviewed bootstrap contract; arbitrary
JSON cannot add or redirect a client. A changed owner password or client secret
fails closed and requires an explicit audited reset or rotation operation.

## Deploy and verify

```bash
gcloud builds submit --project reading-advantage \
  --config apps/accounts/cloudbuild.yaml .
SERVICE_URL="$(gcloud run services describe accounts --region asia-southeast1 --format='value(status.url)')"
bash apps/accounts/scripts/accounts-smoke.sh "$SERVICE_URL"
```

Create `accounts.reading-advantage.com` domain mapping only after the service URL
passes. Keep previous application authentication paths until Marketing and
Sales callback, role-isolation, suspension, and global-revocation smokes pass.

## Recovery

If the last company administrator cannot sign in, use the direct migration role
from a controlled operator environment. Verify database identity with the
company-identity doctor, take a database backup, then use the bootstrap command
with the same normalized owner username. Credential changes use the Accounts
reset capability; bootstrap intentionally refuses silent credential rotation.
