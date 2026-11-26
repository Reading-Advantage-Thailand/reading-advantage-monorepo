# Accounting Candidate Acceptance

status: pass

## Release

- Acceptance date: `2026-09-03`
- Release commit: `2ce752b32293708836cf3ce8c5f3a7eb75beb2cf`
- Cloud Build: `a7c6464c-ebc0-4d68-89ae-c630d3936c01`
- Final candidate revision: `accounting-00005-bup`
- Release image digest: `sha256:7a3a343de64aa2122f5807ce664de89d53e0f935fc0ae6a51af4ad3517162aee`
- Rollback anchor: `accounting-00001-dog`

The pipeline migration, doctor, runtime probe, deployment, token mint, and release verification steps passed.
The verifier confirmed the login page, the unauthenticated application session, and the safe return path.
Its request identifier was `accounting-release-f0450a17-c1ce-4e58-9773-b9acf525738d`.

## Candidate isolation

The final candidate served zero percent of service traffic during acceptance.
Revision `accounting-00001-dog` continued to serve 100 percent of IAM-gated traffic.
The candidate used the same release image as the passing pipeline revision.

The approved preview origins were:

- `https://candidate---accounting-hxamzdhgwa-as.a.run.app`
- `https://candidate---accounting-1090865515742.asia-southeast1.run.app`

The service stored these origins as the required semicolon-separated value.
Unauthenticated requests to both candidate forms and the service URL returned Cloud Run IAM HTTP 403.
The service had no `allUsers` binding before, during, or after acceptance.

## Temporary invoker access

The operator added this exact temporary binding before browser acceptance:

- Member: `user:bodangren@gmail.com`
- Role: `roles/run.invoker`
- Resource: Cloud Run service `accounting` in `asia-southeast1`

The operator removed the same binding immediately after all five cases passed.
The final policy retained only the Cloud Build and Accounting build-verifier service accounts as invokers.

## Demo identities

The approved `apps/accounts/scripts/demo-accounts.ts upsert` command refreshed the demo identities.
The Accounting acceptance identity received the audience role `ACCOUNTANT`.
The forbidden identity had zero application role assignments.
Credentials remained only in the ignored mode-0600 `apps/accounts/.env.local` file.

## Browser evidence

Each case used a fresh Playwright browser context and the live IAM-gated candidate.
The canonical domain mapping remained deferred until promotion.
The browser context replayed canonical requests against the candidate with the canonical forwarded host.
This preserved the registered callback origin without a DNS or domain-mapping change.

1. The unauthenticated deep link preserved `/reports?month=2026-09` in the login return path.
2. The malformed external return path returned HTTP 307 with `/` and produced no 5xx response.
3. The preview origin handed off to the canonical callback origin and completed Accounting sign-in.
4. The no-role identity reached `/login?error=forbidden`, and the visible message persisted after reload.
5. The Accounting identity submitted an expense with private evidence, and the pending list showed it.

Screenshots:

- `acceptance/01-unauthenticated-deep-link.png`
- `acceptance/02-malformed-return-to.png`
- `acceptance/03-preview-handoff-sign-in.png`
- `acceptance/04-forbidden-no-role.png`
- `acceptance/05-authenticated-expense-submission.png`

Sanitized redirect chains:

- `acceptance/accounting-candidate-redirect-chains-20260903.json`

The redirect evidence removes authorization codes, state values, nonces, and PKCE challenges.
It contains no password, session cookie, identity token, or client secret.
