# Tutorial repository capture worker

The Codecamp We Do flow verifies a learner-owned Git repository snapshot. The
browser never supplies a clone URL or a local path. Codecamp derives the HTTPS
fork URL from the authenticated learner's registered GitHub username and sends
it to the internal capture endpoint with a service token.

## Runtime topology

The default deployment runs the capture endpoint in the Codecamp container:

```text
authenticated learner -> tRPC prepareTutorial -> internal capture endpoint
                                             -> temporary clone and allowlisted reads
                                             -> opaque repositoryStateId
```

Set these environment variables on the Codecamp service:

- `TUTORIAL_REPORT_SECRET`: at least 32 bytes, used for short-lived report credentials.
- `TUTORIAL_REPOSITORY_WORKER_URL`: the private URL ending in
  `/api/internal/tutorial-repository-capture`.
- `TUTORIAL_REPOSITORY_WORKER_TOKEN`: a service-only bearer token shared by the
  caller and capture endpoint.

The worker URL may point to the same Cloud Run service or a separately scaled
private service using the same application image. Do not expose the worker
token to the browser. Store both secrets in the deployment secret manager.

## Repository contract

Learners register a GitHub username in Codecamp and fork
`reading-advantage-monorepo`. The worker clones
`https://github.com/<registered-user>/reading-advantage-monorepo.git`, reads only
the authored APK guided-fixture allowlist, runs the deterministic structural
checks, and removes the temporary checkout.

Before preparing a snapshot, the learner must complete, commit, and push the
fixture. The verifier requires a clean remote checkout, so local-only edits,
staged changes, arbitrary commands, paths outside the allowlist, and a client-
chosen repository URL cannot become trusted evidence.

## Failure and recovery

Each preparation returns a fresh snapshot identity and short-lived credential.
The browser persists a secret-free report request before upload. A lost network
connection leaves the report queued in local storage; an expired credential is
reissued through the authenticated API and the queued request is retried. The
server reruns authored checks and applies nonce and submission idempotency
before projecting any result into activity evidence.

Operational failures are explicit: missing environment variables fail startup
validation, invalid service authentication returns an authorization error, and
clone/check failures do not issue a repository snapshot identity.
