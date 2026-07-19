# Marketing Cloud Run release

This runbook releases `apps/marketing` to the existing `marketing` Cloud Run
service in project `reading-advantage`, region `asia-southeast1`. The build uses
the shared Cloud SQL instance and the already-provisioned Marketing secrets.

The pipeline creates and verifies a build-unique candidate before production
traffic changes. It records the exact previous revision and immutable image so
the operator can return traffic to that release without rebuilding it.

## Preconditions

Run from the repository root on the exact clean commit intended for release:

```bash
git status --short
git rev-parse HEAD
pnpm --filter marketing test
pnpm --filter marketing build
```

`git status --short` must be empty. Do not submit a build from an uncommitted
workspace because `_RELEASE_COMMIT_SHA` is release evidence, not a description
of local changes.

The Accounts service must report its exact readiness identity at
`https://accounts.reading-advantage.com/api/ready`. Marketing readiness requires
that response plus the Marketing database probe.

## Submit the release

```bash
gcloud builds submit \
  --project=reading-advantage \
  --config=apps/marketing/cloudbuild.yaml \
  --substitutions=_RELEASE_COMMIT_SHA="$(git rev-parse HEAD)" \
  .
```

The build runs these release gates in order:

1. Validate the exact 40-character source commit.
2. Build and push the image.
3. Run migrations, migration-ledger doctor, runtime grants, and the runtime DB
   contract.
4. Capture the revision currently serving 100% and its immutable image digest.
5. Deploy `candidate-$BUILD_ID` with `--no-traffic` and establish public access.
6. Bind the tag to the newest revision and exact release image digest.
7. Verify candidate database health and Accounts-backed readiness.
8. Promote that exact candidate revision to 100%.
9. Verify the domain mapping, custom-domain health/readiness, and smoke checks.
10. Emit structured release evidence containing the source commit, previous and
    candidate revisions/images, and the exact rollback command.

Candidate verification is intentionally performed on the tagged HTTPS origin.
Production traffic is not changed if candidate health, Marketing database
readiness, Accounts identity, or image binding fails.

## Required success evidence

Keep the Cloud Build ID and the final `marketing_release_promoted` JSON record.
The record must show:

- `releaseCommitSha` equal to the submitted clean commit;
- different `previousRevision` and `candidateRevision` values;
- digest-qualified `previousImage` and `candidateImage` values;
- the candidate revision serving 100%; and
- an executable `rollbackCommand` naming the previous revision.

Also confirm the final steps succeeded: `verify-domain-mapping`,
`verify-custom-domain`, and `record-release-evidence`. A successful image push
or candidate deploy alone is not a completed release.

## Return traffic to the previous revision

Use the exact `rollbackCommand` from the build evidence. Its form is:

```bash
gcloud run services update-traffic marketing \
  --project=reading-advantage \
  --region=asia-southeast1 \
  --platform=managed \
  --to-revisions=PREVIOUS_REVISION=100
```

After returning traffic, rerun the public checks:

```bash
MARKETING_RELEASE_BASE_URL=https://marketing.reading-advantage.com \
  pnpm --filter marketing exec tsx scripts/verify-marketing-release.ts

bash apps/marketing/scripts/marketing-smoke.sh \
  https://marketing.reading-advantage.com
```

Record the rollback operation and verification output alongside the original
build evidence. Do not delete either revision until the custom domain is healthy
on the intended serving revision and the rollback window has closed.
