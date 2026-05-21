# GCP Cloud Run Deployment Runbook for Monorepo Apps

This is the exact deployment pattern used to put `apps/codecamp-advantage` live on GCP from this monorepo.

It assumes:

- The app is a Next.js app in this pnpm/Turbo monorepo.
- The target runtime is Cloud Run.
- Images are built by Cloud Build and stored in Artifact Registry.
- Runtime secrets live in Secret Manager in the app project.
- PostgreSQL is Cloud SQL. The Codecamp deployment used a shared Cloud SQL instance in another GCP project.
- DNS is managed in Squarespace.

For another app, change the variables first and keep the sequence.

## 0. Set Variables

```bash
APP_ID=codecamp-advantage
SERVICE=codecamp-advantage
APP_PROJECT=codecamp-advantage
REGION=asia-southeast1
AR_REPO=codecamp
DOMAIN=codecamp.reading-advantage.com

SQL_PROJECT=reading-advantage
SQL_INSTANCE=cloud-sql
SQL_CONNECTION="${SQL_PROJECT}:${REGION}:${SQL_INSTANCE}"
DB_NAME=codecamp_advantage
DB_USER=reading-advantage-production

RUNTIME_SA="${SERVICE}-cloud-run@${APP_PROJECT}.iam.gserviceaccount.com"
IMAGE="asia-southeast1-docker.pkg.dev/${APP_PROJECT}/${AR_REPO}/${SERVICE}"
```

## 1. Verify Local Tooling and Repo Build

```bash
gcloud auth list
gcloud config get-value project
gcloud config set project "$APP_PROJECT"

pnpm install
pnpm turbo run check-types --filter="$SERVICE"
pnpm turbo run build --filter="$SERVICE"
```

For `codecamp-advantage`, we also ran focused tests:

```bash
pnpm turbo run test --filter=codecamp-advantage
pnpm --filter @reading-advantage/db test -- src/__tests__/connection-options.test.ts
```

## 2. Enable Required APIs

```bash
gcloud services enable \
  run.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  sqladmin.googleapis.com \
  sql-component.googleapis.com \
  iam.googleapis.com \
  compute.googleapis.com \
  --project="$APP_PROJECT"
```

`sql-component.googleapis.com` is needed for Cloud Run Jobs using Cloud SQL attachments.

## 3. Create Artifact Registry

```bash
gcloud artifacts repositories create "$AR_REPO" \
  --repository-format=docker \
  --location="$REGION" \
  --project="$APP_PROJECT"
```

If the repository already exists, continue.

## 4. Create the Runtime Service Account

```bash
gcloud iam service-accounts create "${SERVICE}-cloud-run" \
  --display-name="${SERVICE} Cloud Run runtime" \
  --project="$APP_PROJECT"
```

Grant the runtime service account access to Secret Manager in the app project:

```bash
gcloud projects add-iam-policy-binding "$APP_PROJECT" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor"
```

Grant the runtime service account Cloud SQL Client on the project that owns Cloud SQL:

```bash
gcloud projects add-iam-policy-binding "$SQL_PROJECT" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/cloudsql.client"
```

## 5. Fix Cloud Build Identity Permissions

Cloud Build may run as the Compute Engine default service account, not the legacy Cloud Build account. Check both:

```bash
gcloud projects describe "$APP_PROJECT" --format='value(projectNumber)'
```

For `codecamp-advantage`, project number was `148839308272`; the build identity was:

```text
148839308272-compute@developer.gserviceaccount.com
```

Grant deploy rights to the actual Cloud Build identity:

```bash
PROJECT_NUMBER="$(gcloud projects describe "$APP_PROJECT" --format='value(projectNumber)')"
BUILD_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"

gcloud projects add-iam-policy-binding "$APP_PROJECT" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/run.admin"

gcloud iam service-accounts add-iam-policy-binding "$RUNTIME_SA" \
  --project="$APP_PROJECT" \
  --member="serviceAccount:${BUILD_SA}" \
  --role="roles/iam.serviceAccountUser"
```

## 6. Create App Database on Shared Cloud SQL

Do not mutate another production app database just to make a new app work. Codecamp originally pointed at `reading_advantage`, which connected but failed because the schema did not match. The fix was to create a dedicated database in the shared instance.

```bash
gcloud sql databases create "$DB_NAME" \
  --instance="$SQL_INSTANCE" \
  --project="$SQL_PROJECT"
```

## 7. Create or Update Secrets

Create secrets once:

```bash
for secret in \
  DATABASE_URL \
  AUTH_SECRET \
  GITHUB_APP_ID \
  GITHUB_INSTALLATION_ID \
  GITHUB_PRIVATE_KEY \
  GITHUB_WEBHOOK_SECRET \
  OPENROUTER_API_KEY \
  OPENAI_API_KEY \
  GOOGLE_AI_API_KEY
do
  gcloud secrets describe "$secret" --project="$APP_PROJECT" >/dev/null 2>&1 ||
    gcloud secrets create "$secret" --project="$APP_PROJECT" --replication-policy=automatic
done
```

Use Cloud SQL Unix socket URLs for Cloud Run:

```text
postgresql://USER:PASSWORD@localhost/DB_NAME?host=/cloudsql/PROJECT:REGION:INSTANCE
```

For Codecamp the resulting shape was:

```text
postgresql://reading-advantage-production:***@localhost/codecamp_advantage?host=/cloudsql/reading-advantage:asia-southeast1:cloud-sql
```

Add secret versions without printing values:

```bash
set +x
printf '%s' "$DATABASE_URL_VALUE" |
  gcloud secrets versions add DATABASE_URL --project="$APP_PROJECT" --data-file=-

printf '%s' "$AUTH_SECRET_VALUE" |
  gcloud secrets versions add AUTH_SECRET --project="$APP_PROJECT" --data-file=-
```

Important: the app’s PostgreSQL client must understand the socket URL. In this repo, `packages/db/src/connection-options.ts` strips the `host` query parameter and passes it to `postgres.js` as:

```ts
{ path: "/cloudsql/PROJECT:REGION:INSTANCE/.s.PGSQL.5432" }
```

Without that, failures looked like:

- `ECONNREFUSED 127.0.0.1:5432`
- then `FATAL unrecognized configuration parameter "host"`

## 8. Add Deployment Artifacts

For Codecamp these files were added:

- `apps/codecamp-advantage/Dockerfile`
- `apps/codecamp-advantage/cloudbuild.yaml`
- `.dockerignore`
- `.gcloudignore`

The service Dockerfile builds the app as a standalone Next.js server:

```dockerfile
RUN pnpm turbo run build --filter=codecamp-advantage
CMD ["node", "apps/codecamp-advantage/server.js"]
```

The Cloud Build file must:

1. Build the image.
2. Push the image.
3. Deploy to Cloud Run.
4. Attach the Cloud SQL instance.
5. Mount secrets.
6. Add public invoker IAM.

For Codecamp, deploy was:

```yaml
--add-cloudsql-instances=reading-advantage:asia-southeast1:cloud-sql
--set-env-vars=NODE_ENV=production,NEXT_PUBLIC_API_URL=https://codecamp.reading-advantage.com
--set-secrets=DATABASE_URL=DATABASE_URL:latest,AUTH_SECRET=AUTH_SECRET:latest,...
```

## 9. Submit the Cloud Build Deployment

```bash
gcloud builds submit \
  --project="$APP_PROJECT" \
  --config="apps/${SERVICE}/cloudbuild.yaml" \
  .
```

For the 2026-05-18 Codecamp redeploy, the full monorepo upload was too large
and stalled before Cloud Build registered. Use a reduced build context instead:

```bash
rm -rf /tmp/codecamp-build-context
mkdir -p /tmp/codecamp-build-context/apps
rsync -a --exclude node_modules --exclude .next --exclude .turbo --exclude dist --exclude coverage \
  package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json .pnpmfile.cjs \
  /tmp/codecamp-build-context/
rsync -a --exclude node_modules --exclude .next --exclude .turbo --exclude dist --exclude coverage \
  apps/codecamp-advantage /tmp/codecamp-build-context/apps/
rsync -a --exclude node_modules --exclude .next --exclude .turbo --exclude dist --exclude coverage \
  packages /tmp/codecamp-build-context/

gcloud builds submit \
  --project="$APP_PROJECT" \
  --config="apps/${SERVICE}/cloudbuild.yaml" \
  /tmp/codecamp-build-context
```

Confirm service state:

```bash
gcloud run services describe "$SERVICE" \
  --project="$APP_PROJECT" \
  --region="$REGION" \
  --format='yaml(status.url,status.latestReadyRevisionName,metadata.annotations)'
```

## 10. Run Migrations and Seed with a Cloud Run Job

Build a temporary migration image from the dependency stage of the app Dockerfile:

```bash
MIGRATE_IMAGE="asia-southeast1-docker.pkg.dev/${APP_PROJECT}/${AR_REPO}/${SERVICE}-migrate:$(date +%Y%m%d%H%M%S)"

gcloud builds submit --project="$APP_PROJECT" --config=<(printf '%s\n' \
  "steps:" \
  "- name: gcr.io/cloud-builders/docker" \
  "  args:" \
  "  - build" \
  "  - -f" \
  "  - apps/${SERVICE}/Dockerfile" \
  "  - --target" \
  "  - deps" \
  "  - -t" \
  "  - ${MIGRATE_IMAGE}" \
  "  - ." \
  "images:" \
  "- ${MIGRATE_IMAGE}") .
```

Create the migration job:

```bash
gcloud run jobs create "${SERVICE}-db-migrate" \
  --project="$APP_PROJECT" \
  --region="$REGION" \
  --image="$MIGRATE_IMAGE" \
  --service-account="$RUNTIME_SA" \
  --set-cloudsql-instances="$SQL_CONNECTION" \
  --set-secrets=DATABASE_URL=DATABASE_URL:latest \
  --set-env-vars=NODE_ENV=production \
  --command=sh \
  --args='-lc,pnpm --dir packages/db migrate && pnpm --dir packages/db seed:codecamp'
```

Run it and wait:

```bash
gcloud run jobs execute "${SERVICE}-db-migrate" \
  --project="$APP_PROJECT" \
  --region="$REGION" \
  --wait
```

For the 2026-05-18 Codecamp redeploy, the existing job name was
`codecamp-db-migrate`, not `${SERVICE}-db-migrate`. The normal
`drizzle-kit migrate` command failed inside Cloud Run without exposing the
underlying SQL error in Cloud Logging. Production data had no duplicate repo or
PR URLs, and the production `role` enum was missing `INTERN`, so the pending
changes were applied with an idempotent direct SQL script and then the canonical
seed was run:

```bash
gcloud run jobs update codecamp-db-migrate \
  --project="$APP_PROJECT" \
  --region="$REGION" \
  --image="$MIGRATE_IMAGE" \
  --service-account=codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com \
  --set-cloudsql-instances="$SQL_CONNECTION" \
  --set-secrets=CODECAMP_DATABASE_URL=CODECAMP_DATABASE_URL:latest \
  --set-env-vars=NODE_ENV=production \
  --command=sh \
  --args='-lc,export DATABASE_URL="$CODECAMP_DATABASE_URL" && <apply idempotent SQL for 0010/0011/0012> && pnpm --dir packages/db seed:codecamp'
```

The successful production verification logged the expected enum/table/index
state and then reseeded the canonical curriculum:

```text
"enumlabel": "INTERN"
"webhook_table": "codecamp_webhook_events"
"repo_unique_index": "codecamp_exercise_repos_repo_url_unique"
"pr_unique_index": "codecamp_pr_reviews_pr_url_unique"
18 existing module(s) had metadata updated.
```

Verify logs:

```bash
gcloud logging read \
  "resource.type=\"cloud_run_job\" AND resource.labels.job_name=\"${SERVICE}-db-migrate\"" \
  --project="$APP_PROJECT" \
  --limit=120 \
  --format='value(timestamp,severity,textPayload,jsonPayload.message)'
```

Codecamp success logs included:

```text
[✓] migrations applied successfully!
Seeded 18 modules with 85 lessons, exercises, and quizzes.
```

## 11. Create Bootstrap Admin if Self-Registration Is Disabled

For Codecamp, self-registration is disabled and admins create intern accounts. We created a generated bootstrap password in Secret Manager:

```bash
gcloud secrets create CODECAMP_BOOTSTRAP_ADMIN_PASSWORD \
  --project="$APP_PROJECT" \
  --replication-policy=automatic

PASS="$(openssl rand -base64 24 | tr -d '\n')"
printf '%s' "$PASS" |
  gcloud secrets versions add CODECAMP_BOOTSTRAP_ADMIN_PASSWORD \
  --project="$APP_PROJECT" \
  --data-file=-
```

Then a one-off Cloud Run Job inserted or updated the `admin` user and credential account. Keep the password in Secret Manager and do not print it.

Retrieve it later with:

```bash
gcloud secrets versions access latest \
  --secret=CODECAMP_BOOTSTRAP_ADMIN_PASSWORD \
  --project="$APP_PROJECT"
```

## 12. Map the Custom Domain

Create the Cloud Run domain mapping:

```bash
gcloud beta run domain-mappings create \
  --service="$SERVICE" \
  --domain="$DOMAIN" \
  --region="$REGION" \
  --project="$APP_PROJECT"
```

Read the required DNS record:

```bash
gcloud beta run domain-mappings describe \
  --domain="$DOMAIN" \
  --region="$REGION" \
  --project="$APP_PROJECT" \
  --format='yaml(status.resourceRecords,status.conditions)'
```

For Codecamp this required:

```text
codecamp CNAME ghs.googlehosted.com.
```

In Squarespace:

1. Open `https://account.squarespace.com/domains/managed/reading-advantage.com`.
2. Go to DNS settings.
3. Add custom record:
   - Type: `CNAME`
   - Name: `codecamp`
   - Data: `ghs.googlehosted.com`
4. Save.

Verify:

```bash
dig +short "$DOMAIN" CNAME
curl -I "https://${DOMAIN}/th"
```

The domain can still show a wildcard CNAME chain, for example:

```text
codecamp.reading-advantage.com -> www.reading-advantage.com -> ghs.googlehosted.com
```

That is acceptable if Cloud Run reports `Ready` and `CertificateProvisioned`, and `curl` returns the app over HTTPS.

## 13. Smoke Test Production

Use the run.app URL first:

```bash
SERVICE_URL="$(gcloud run services describe "$SERVICE" \
  --project="$APP_PROJECT" \
  --region="$REGION" \
  --format='value(status.url)')"

curl -I "$SERVICE_URL/th"

curl -i -X POST "$SERVICE_URL/webhooks/github/pr" \
  -H 'content-type: application/json' \
  --data '{}'
```

Expected unsigned webhook response:

```text
401 {"error":"Missing signature"}
```

Verify login returns authentication errors, not database errors:

```bash
curl -i -X POST "$SERVICE_URL/api/auth/login" \
  -H 'content-type: application/json' \
  --data '{"username":"__missing__","password":"not-real"}'
```

Expected:

```text
401 {"message":"Invalid username or password"}
```

Verify bootstrap admin without printing the password:

```bash
set +x
PASS="$(gcloud secrets versions access latest \
  --secret=CODECAMP_BOOTSTRAP_ADMIN_PASSWORD \
  --project="$APP_PROJECT")"

COOKIE_JAR="$(mktemp)"
curl -sS -o /tmp/login.json -w '%{http_code}' -c "$COOKIE_JAR" \
  -X POST "https://${DOMAIN}/api/auth/login" \
  -H 'content-type: application/json' \
  --data "{\"username\":\"admin\",\"password\":\"$PASS\"}"

curl -sS -o /tmp/dashboard.json -w '%{http_code}' -b "$COOKIE_JAR" \
  "https://${DOMAIN}/api/trpc/codecamp.dashboard?batch=1&input=%7B%220%22%3A%7B%22json%22%3Anull%2C%22meta%22%3A%7B%22values%22%3A%5B%22undefined%22%5D%2C%22v%22%3A1%7D%7D%7D"

rm -f "$COOKIE_JAR"
```

For Codecamp, both login and dashboard returned `200`.

Check error logs after final deploy:

```bash
gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\" AND severity>=ERROR" \
  --project="$APP_PROJECT" \
  --limit=20 \
  --format='value(timestamp,severity,textPayload,jsonPayload.message)'
```

## 14. Browser Verification

Use Kimi WebBridge or a real browser:

1. Open `https://codecamp.reading-advantage.com/th`.
2. Log out if already authenticated.
3. Confirm the page shows real username/password fields.
4. Log in as `admin`.
5. Confirm the dashboard shows:
   - `Codecamp Admin`
   - `ADMIN`
   - `85` total lessons
6. Open `/th/admin` and confirm the admin dashboard loads.

## 15. GitHub App Webhook Verification

For Codecamp, GitHub App setup was:

- App: `RA Codecamp Reviewer`
- Webhook URL: `https://codecamp.reading-advantage.com/webhooks/github/pr`
- Event: `pull_request`
- Permissions:
  - Contents: read
  - Issues: read
  - Pull requests: write

After app installation and secret setup, verify with a real GitHub test delivery or test PR:

```bash
gcloud logging read \
  "resource.type=\"cloud_run_revision\" AND resource.labels.service_name=\"${SERVICE}\"" \
  --project="$APP_PROJECT" \
  --limit=80
```

Then confirm a `codecamp_pr_reviews` row is created or updated.

## Common Failure Modes

- **Cloud Run returns 401 for protected tRPC before login:** UI is calling protected endpoints before auth state is known. Gate queries with `enabled: isAuthenticated`.
- **Login returns 500 with `ECONNREFUSED 127.0.0.1:5432`:** Cloud SQL socket is not being used by the DB client.
- **Login returns 500 with `unrecognized configuration parameter "host"`:** `postgres.js` received `host` as a PostgreSQL startup parameter. Strip it from the URL and pass socket path via client options.
- **Login returns 500 with missing column errors:** Connected to the wrong database/schema. Create a dedicated app database and run migrations.
- **Cloud Run Jobs reject Cloud SQL flag:** Jobs use `--set-cloudsql-instances`, not service deploy’s `--add-cloudsql-instances`.
- **Cloud Build deploy permission failure:** Grant `roles/run.admin` and `roles/iam.serviceAccountUser` to the actual build service account.
- **Custom domain appears to resolve through wildcard:** Check Cloud Run mapping status and HTTPS curl. A wildcard-to-`www` CNAME chain can still route to Cloud Run if both end at `ghs.googlehosted.com`.
