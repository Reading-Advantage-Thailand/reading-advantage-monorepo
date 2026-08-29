# Sales and Marketing SSO Deployment Runbook

This runbook covers candidate verification, promotion, rollback, and demo accounts.
It applies to Sales Advantage and Marketing.

## Redirect chain

Sales uses this chain for an unauthenticated protected path:

```text
protected path -> /api/auth/company/start?returnTo=... -> Accounts authorize -> callback -> destination
```

The Sales proxy sends the original locale-prefixed path and query as `returnTo`.
The start route validates the relative path before it calls the Accounts OIDC client.
Accounts authorizes the user and returns `code` and `state` to the callback route.
The callback exchanges those values and redirects to the validated destination.

Marketing uses this chain for deep links:

```text
deep link -> /login?returnTo=... -> /api/auth/company/start?returnTo=... -> Accounts authorize -> callback -> destination
```

The campaigns list, campaign detail, campaign video, and settings page use one
shared helper to preserve the path and query in the `/login` redirect.

### Preview-origin handoff

The candidate host is an approved browser origin for its application.
The production callback origin comes from `COMPANY_AUTH_OIDC_REDIRECT_URI`.

When a candidate receives the start request, the route compares both origins.
If they differ, the candidate redirects to the same start path on production.
It preserves the `returnTo` value.
The production start route then redirects to Accounts authorize.
Accounts returns to the production callback route.
The callback sets the session cookie on production and redirects to `returnTo`.

The candidate does not need a second registered OIDC callback.
Preview origins must be exact HTTPS origins without credentials, paths, queries,
or fragments.

## Sales locale survival

Sales supports `en` and `th` through `routing.locales`.

- A valid `NEXT_LOCALE` cookie chooses the prefix for an unprefixed path.
- A valid cookie is not overwritten by the proxy.
- A missing or unknown cookie uses the default locale, `th`.
- The proxy sets `NEXT_LOCALE=th` only when no valid cookie exists.
- The proxy preserves the request query while it adds the locale prefix.
- The sign-in entry carries the full locale-prefixed path in `returnTo`.
- The preview handoff carries that path to production.

`NEXT_LOCALE` is host-only because the proxy does not set a `Domain` attribute.
Do not rely on that cookie moving from a preview host to production.
The locale-prefixed `returnTo` path carries the language through the handoff.

For example, a valid `en` cookie maps `/` to `/en/` without resetting the cookie.
A cookieless visitor maps `/` to `/th/` and receives the default cookie.

## Error codes and rendering

Use lowercase query values.

| Application | Code | Producer | Rendered result |
|---|---|---|---|
| Sales | `sso` | Missing callback values or exchange failure | `/?error=sso`; the Sales landing page renders `login.errorSso` in an alert. |
| Sales | `forbidden` | The exchanged identity has no Sales role | `/?error=forbidden`; the Sales landing page renders `login.errorForbidden` in an alert. |
| Marketing | `sso` | Missing callback values or exchange failure | `/login?error=sso`; the Marketing login page renders `login.errorSso` in an alert. |

Sales expires the transaction cookie on every callback failure.
Sales also expires the session cookie after role denial.
Marketing expires the transaction cookie on every callback failure, including the
missing-transaction early return.

An unsafe `returnTo` value restarts the authorization request with `returnTo=/`.
The start route logs one structured warning and does not return HTTP 500.

## Candidate preview origins and promotion gates

The Sales Cloud Build candidate stage sets this environment value:

```text
SALES_PREVIEW_ORIGINS=https://candidate---sales-advantage-${PROJECT_NUMBER}.asia-southeast1.run.app
```

It deploys the `candidate` tag with `--no-traffic`.
The candidate stage ends after its candidate verification step.
It does not promote production traffic.

The Marketing candidate stage derives a build-specific tag and origin:

```bash
candidate_tag="c${BUILD_ID%%-*}"
candidate_origin="https://${candidate_tag}---marketing-${PROJECT_NUMBER}.asia-southeast1.run.app"
MARKETING_PREVIEW_ORIGINS="${candidate_origin}"
```

It deploys the candidate tag with `--no-traffic`.
The candidate stage ends after its candidate verification step.

Create an acceptance note after candidate verification.
The note must contain this exact line:

```text
status: pass
```

The Sales promotion script checks the note before it calls Cloud Run:

```bash
CANDIDATE_REVISION="sales-advantage-REVISION" \
ACCEPTANCE_NOTE="path/to/sales-acceptance.md" \
bash apps/sales-advantage/scripts/promote-sales-candidate.sh
```

The Marketing promotion script uses the same exact note gate:

```bash
CANDIDATE_REVISION="marketing-REVISION" \
PREVIOUS_REVISION="marketing-PREVIOUS" \
PREVIOUS_IMAGE="marketing-previous-image" \
CANDIDATE_IMAGE="marketing-candidate-image" \
BUILD_ID="BUILD-ID" \
RELEASE_COMMIT_SHA="RELEASE-COMMIT-SHA" \
ACCEPTANCE_NOTE="path/to/marketing-acceptance.md" \
bash apps/marketing/scripts/promote-marketing-candidate.sh
```

Both scripts require a non-empty note and an anchored `status: pass` line.
Do not run either script before the candidate acceptance note passes.

## Rollback anchor

The plan records `sales-advantage-00004` as the rollback anchor.
The existing continuation pipeline records the concrete revision as
`sales-advantage-00004-jed` and checks its `legacy-rollback` tag.

`apps/sales-advantage/cloudbuild.yaml` creates a no-traffic revision with the
`legacy-school` mode, the legacy database, and the `legacy-rollback` tag.
It captures and verifies that tag before the company candidate proceeds.

This closeout did not query Cloud Run.
Confirm that the tag still points to the intended revision before traffic moves.
If the tag changed, record the current revision and update the rollback command.

The recorded rollback command is:

```bash
gcloud run services update-traffic sales-advantage \
  --region=asia-southeast1 \
  --platform=managed \
  --to-revisions=sales-advantage-00004-jed=100
```

Do not mutate a serving revision in place.

## Demo account lifecycle

The lifecycle script requires these environment variables:

```text
COMPANY_AUTH_DIRECT_DATABASE_URL
DEMO_SALES_REP_USERNAME
DEMO_SALES_REP_PASSWORD
DEMO_MARKETING_USER_USERNAME
DEMO_MARKETING_USER_PASSWORD
DEMO_NO_ROLE_USERNAME
DEMO_NO_ROLE_PASSWORD
```

Provide `COMPANY_AUTH_DIRECT_DATABASE_URL` and the three username variables.
Do not provide owner-supplied passwords to the seed command.
The seed generates each password from 24 cryptographic random bytes.
It writes the generated values to `apps/accounts/.env.local` with mode `0600`.

Run the idempotent seed with:

```bash
pnpm --filter accounts run demo-accounts -- upsert
```

The seed creates these identities:

- Sales rep: `DEMO_SALES_REP_USERNAME`, with the `sales` / `SALES_REP` role.
- Marketing user: `DEMO_MARKETING_USER_USERNAME`, with the `marketing` / `MEMBER` role.
- No-role identity: `DEMO_NO_ROLE_USERNAME`, with no application role.

The Sales and Marketing role assignments expire within 90 days.
The command is keyed on normalized username and can run again safely.
The command prints usernames only to stdout and stderr.

Rotate a demo password and extend its role expiry with:

```bash
pnpm --filter accounts run demo-accounts -- rotate "$DEMO_SALES_REP_USERNAME"
pnpm --filter accounts run demo-accounts -- rotate "$DEMO_MARKETING_USER_USERNAME"
```

Disable one identity with:

```bash
pnpm --filter accounts run demo-accounts -- disable "$DEMO_NO_ROLE_USERNAME"
```

Run the disable command as the final step after acceptance.
The command suspends the identity and its organization memberships.
