# Phase 3 — Cloud Build migration gate (FR-4)

Files: `apps/primary-advantage/cloudbuild.yaml`,
`packages/db/src/__tests__/primary-deploy-gate-contract.test.ts`,
`packages/db/scripts/refuse-legacy-db.ts`, `packages/db/src/legacy-db-guard.ts`.

## What the gate does

Steps run in this order before `deploy-cloudrun`:

1. `refuse-legacy-db`: one read-only SELECT on `information_schema.tables`. It exits 1 if
   `public._prisma_migrations` or `public.article` exists. A fresh empty database passes.
   This stops Drizzle migrations (some DROP/ALTER) from running on the legacy database
   that Tutor Advantage reads (spec §3 risk).
2. `migrate-db`: `pnpm --filter @reading-advantage/db migrate`.
3. `doctor-check`: `doctor --check --required-migration 0059_game_challenges`. It fails closed.

All three read the `DATABASE_URL` secret through `availableSecrets`.

## Tag rule

The required migration tag is hard-coded in the YAML, as in Sales and Codecamp. The next
track that adds a migration must change it to the new last tag in
`packages/db/drizzle/meta/_journal.json`. The contract test reads the journal and fails
until the YAML matches.

## Open question: Cloud SQL Auth Proxy

Sales and Codecamp start a Cloud SQL Auth Proxy because their secret URLs are unix-socket
URLs. The Primary steps have no proxy. This is correct only if the Primary `DATABASE_URL`
is a TCP URL that Cloud Build can reach. If it is a `?host=/cloudsql/...` URL, copy the
proxy prefix from `apps/sales-advantage/cloudbuild.yaml` steps `migrate-db` and
`doctor-check`. Confirm which database and URL form the secret holds (spec §3 question 1).

## Dead lines after Google sign-in removal (not changed)

`apps/primary-advantage/cloudbuild.yaml`:
- line ~65: `--set-secrets=AUTH_GOOGLE_ID=${_AUTH_GOOGLE_ID}:latest`
- line ~66: `--set-secrets=AUTH_GOOGLE_SECRET=${_AUTH_GOOGLE_SECRET}:latest`
- substitution `_AUTH_GOOGLE_ID: "AUTH_GOOGLE_ID"`
- substitution `_AUTH_GOOGLE_SECRET: "AUTH_GOOGLE_SECRET"`
