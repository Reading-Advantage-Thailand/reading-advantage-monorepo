# Codecamp SSO Cutover Runbook - 2026-07-19

> One-off remediation deliverable, outside the Measure workflow. Owned by the
> orchestrator. Drives the company SSO application cutover for
> `apps/codecamp-advantage` against the verified legacy rollback anchor.

## Summary

- **Cloud Run service / project:** `codecamp-advantage` in `codecamp-advantage`
- **Cloud SQL:** shared `reading-advantage:asia-southeast1:cloud-sql`
- **Domain mapping:** `codecamp.reading-advantage.com` (stays in `codecamp-advantage`)
- **Runtime SA:** `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com`
- **Cloud Build default SA:** `<CODECAMP_PROJECT_NUMBER>@cloudbuild.gserviceaccount.com`
- **Cross-project OIDC secret (the blocker):**
  `projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET`
  lives in `reading-advantage`; both the runtime SA and the Cloud Build SA in
  `codecamp-advantage` need `roles/secretmanager.secretAccessor` on it.
- **Pre-SSO rollback anchor:** `codecamp-advantage-00019-682`,
  image digest `sha256:995d86e1aadbad8fe93ce93fbe0e7ac3afbc5ec804b63e147011982738d1dffb`.
- **Required migration:** `0043_codecamp_company_principal_sync` and function
  `public.sync_codecamp_company_principal(uuid,text,uuid,text,text)`.

## Phase 0 - Operator IAM grant (the only outstanding blocker)

The cutover pipeline already references the cross-project secret via
`--set-secrets=COMPANY_AUTH_OIDC_CLIENT_SECRET=projects/1090865515742/secrets/CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET:latest`,
so both identities below need explicit accessor approval.

```bash
# 0.1 Resolve project numbers (do not assume them)
CODECAMP_PN=$(gcloud projects describe codecamp-advantage --format='value(projectNumber)')
READING_PN=$(gcloud projects describe reading-advantage --format='value(projectNumber)')

# 0.2 Grant the runtime identity
gcloud secrets add-iam-policy-binding CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
  --project=reading-advantage \
  --member="serviceAccount:codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor

# 0.3 Grant the Cloud Build identity (so cross-project --set-secrets resolves)
gcloud secrets add-iam-policy-binding CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
  --project=reading-advantage \
  --member="serviceAccount:${CODECAMP_PN}@cloudbuild.gserviceaccount.com" \
  --role=roles/secretmanager.secretAccessor

# 0.4 Verify the bindings landed
gcloud secrets get-iam-policy CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET \
  --project=reading-advantage \
  --format='value(bindings.members)' \
  | grep -E "codecamp-cloud-run@|cloudbuild.gserviceaccount.com"
```

Expected output includes both member strings. Stop the runbook here if either
binding is missing; do not proceed to build.

## Phase 1 - Pre-flight verification

```bash
# 1.1 Confirm Cloud SQL readiness via the same source-of-truth the build uses
gcloud sql instances describe cloud-sql --project=reading-advantage \
  --format='value(state,settings.ipConfiguration.ipv4Enabled)'

# 1.2 Confirm the legacy anchor is still Ready and reachable
gcloud run services describe codecamp-advantage --project=codecamp-advantage \
  --region=asia-southeast1 \
  --format='value(status.traffic,status.url)' \
  | grep "codecamp-advantage-00019-682=1.00"

# 1.3 Confirm both tutorial-runtime secrets exist
gcloud secrets describe CODECAMP_TUTORIAL_REPORT_SECRET --project=codecamp-advantage \
  --format='value(name)' \
  && gcloud secrets describe CODECAMP_TUTORIAL_REPOSITORY_WORKER_TOKEN \
       --project=codecamp-advantage --format='value(name)'

# 1.4 Confirm five migrated principal rows are present (sanity, not a gate)
psql "$CODECAMP_DATABASE_URL" -Atc \
  "select count(*) from codecamp_company_principal where archived_at is null" \
  | grep -E '^5$'
```

Stop the runbook if any check fails. Capture the command output as evidence.

## Phase 2 - Build and no-traffic candidate

Submit from the monorepo root. The build project is authoritative because
`apps/codecamp-advantage/cloudbuild.yaml` derives its service account and image
repository from `$PROJECT_ID`:

```bash
gcloud builds submit . \
  --project=codecamp-advantage \
  --region=asia-southeast1 \
  --config=apps/codecamp-advantage/cloudbuild.yaml
```

The five cloudbuild steps (build-image, push-image, migrate-db,
doctor-check, deploy-cloudrun, allow-public-invoker) must all return SUCCESS.
The deploy step creates a no-traffic revision tagged `sso-candidate` with
`CODECAMP_AUTH_MODE=company` and the cross-project OIDC secret bound via
`--set-secrets`. Capture the build ID, revision name, and image digest.

## Phase 3 - Candidate verification at 0% traffic

```bash
# 3.1 Resolve the candidate revision and its image digest
REVISION=$(gcloud run services describe codecamp-advantage \
  --project=codecamp-advantage --region=asia-southeast1 \
  --format='value(status.traffic)' | python3 -c \
  "import json,sys; t=json.load(sys.stdin); \
   print([k for k,v in t.items() if v==0.0][0])")
DIGEST=$(gcloud run revisions describe "$REVISION" \
  --project=codecamp-advantage --region=asia-southeast1 \
  --format='value(imageDigest)')

# 3.2 Exercise the candidate via the tagged URL
TAG_URL="https://sso-candidate---codecamp-advantage-$(gcloud config get-value project | tr -d '\\n').as.a.run.app"
curl -sf "$TAG_URL/api/auth/mode" | python3 -m json.tool  # expect {"mode":"company"}
curl -sf -o /dev/null -w '%{http_code}\n' -X POST "$TAG_URL/api/auth/login"  # expect 401/403/409
curl -sf -o /dev/null -w '%{http_code}\n' -X POST "$TAG_URL/api/auth/password-reset"  # expect 409

# 3.3 Probe the Companies OIDC discovery via the Accounts origin (sanity)
curl -sf https://accounts.reading-advantage.com/.well-known/openid-configuration \
  | python3 -c "import json,sys; d=json.load(sys.stdin); \
   print(d['issuer'], d['authorization_endpoint'], d['jwks_uri'])"
```

Reject the build and roll forward to Phase 6 if `/api/auth/mode` does not
return `company`, if `/api/auth/login` returns 200 (the company-mode guard
must reject product-local login before the shared handlers run), or if the
Accounts discovery probe fails.

## Phase 4 - Compatibility legacy rollback (required by the fail-closed gate)

Before any traffic shift, create a tagged no-traffic `legacy-rollback`
revision from the exact candidate image with `CODECAMP_AUTH_MODE=legacy` and
the OIDC secret removed. The Codecamp company-auth playbook forbids serving a
pre-revision pre-SSO image after the source-role repair, so this revision
is the only verified rollback anchor once traffic moves.

```bash
CANDIDATE_IMAGE="asia-southeast1-docker.pkg.dev/codecamp-advantage/codecamp/codecamp-advantage@${DIGEST}"
gcloud run deploy codecamp-advantage \
  --project=codecamp-advantage \
  --region=asia-southeast1 \
  --image="${CANDIDATE_IMAGE}" \
  --service-account=codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com \
  --update-env-vars=CODECAMP_AUTH_MODE=legacy \
  --remove-secrets=COMPANY_AUTH_OIDC_CLIENT_SECRET \
  --tag=legacy-rollback \
  --no-traffic
```

Verify the tagged URL returns `{"mode":"legacy"}` and the existing five
migrated admins/interns still log in through the legacy path. Capture the
revision name and digest; record it in the post-cutover evidence.

## Phase 5 - Traffic shift to the company candidate

```bash
COMPANY_REV=$(gcloud run services describe codecamp-advantage \
  --project=codecamp-advantage --region=asia-southeast1 \
  --format='value(status.traffic)' | python3 -c \
  "import json,sys; t=json.load(sys.stdin); \
   print([k for k,v in t.items() if v==0.0 and k!='LATEST'][0])")

# Move traffic through trap-protected stages; halt on any failure
gcloud run services update-traffic codecamp-advantage \
  --project=codecamp-advantage --region=asia-southeast1 \
  --to-revisions="${COMPANY_REV}=25"
# verify
gcloud run services describe codecamp-advantage --project=codecamp-advantage \
  --region=asia-southeast1 --format='value(status.traffic)'

gcloud run services update-traffic codecamp-advantage \
  --project=codecamp-advantage --region=asia-southeast1 \
  --to-revisions="${COMPANY_REV}=100"
```

## Phase 6 - Post-cutover verification

```bash
# 6.1 Public domain health and readiness
curl -sf https://codecamp.reading-advantage.com/api/health | python3 -m json.tool
curl -sf https://codecamp.reading-advantage.com/api/ready | python3 -m json.tool

# 6.2 Domain mapping conditions
gcloud beta run domain-mappings describe codecamp.reading-advantage.com \
  --project=codecamp-advantage --region=asia-southeast1 \
  --format='value(status.conditions[].type,status.conditions[].status)' \
  | grep -E 'Ready|CertificateProvisioned|DomainRoutable'

# 6.3 Browser journey (use the in-app browser with at least one migrated
#     admin and one migrated intern): sign-in via Accounts, role-isolated
#     product access, intern detail panel, GitHub mapping, progress
#     ownership. Capture screenshots for the post-cutover evidence file.

# 6.4 Log scan - no ERROR or 5xx entries for the promoted revision
gcloud logging read \
  "resource.type=cloud_run_revision AND resource.labels.service_name=codecamp-advantage AND resource.labels.revision_name=${COMPANY_REV} AND severity>=ERROR" \
  --project=codecamp-advantage --since=2h --format='value(timestamp,severity)'
# expected: empty output

# 6.5 Independent database inspection
psql "$CODECAMP_DATABASE_URL" -Atc \
  "select count(*) from codecamp_company_principal where archived_at is null" \
  | grep -E '^5$'
psql "$READING_IDENTITY_DATABASE_URL" -Atc \
  "select count(*) from company_user where company_app_role='CODECAMP'::company_app_role"
```

Record the post-cutover evidence at
`measure/tracks/company_identity_sso_20260715/codecamp-cutover-postflight-20260719.md`.

## Phase 7 - Rollback (if any gate fails after Phase 3)

```bash
gcloud run services update-traffic codecamp-advantage \
  --project=codecamp-advantage --region=asia-southeast1 \
  --to-revisions=codecamp-advantage-00019-682=100
```

The verified pre-SSO anchor is sufficient when the cutover fails before the
source-role repair. After the repair, the only verified rollback is the new
`legacy-rollback` revision created in Phase 4. Do not attempt in-place
mutation of a serving revision.

## Open follow-ups

- Independent role-isolation probes against the promoted revision.
- Final Sales company-admin-without-app-role denial repeat against `00005-yas`.
- Observation window acceptance and explicit legacy-auth retirement (Task 48).
- Parent-track closeout for `company_identity_sso_20260715` (Task 49).
