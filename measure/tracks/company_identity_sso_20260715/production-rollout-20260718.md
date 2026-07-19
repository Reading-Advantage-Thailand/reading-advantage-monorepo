# Production Rollout Evidence — 2026-07-18

## Scope and closure boundary

This checkpoint deploys and verifies Accounts, Marketing, and Sales in GCP project
`reading-advantage`, region `asia-southeast1`, using the existing Cloud SQL
instance. It does **not** deploy or migrate Codecamp, retire Codecamp legacy auth,
complete the observation window, or close the parent company-identity track.

## 2026-07-19 execution addendum

This addendum records later work and supersedes the original release inventory
where the entries differ.

- Accounts: exact build `de19ada8-775e-45b0-99ce-d3896adf8a78` serves
  `accounts-00007-hxs` at 100%, digest
  `sha256:7e851f0c3663c7bfafd94bc434106f875ec3222ea928a000c698400601b1bc27`.
  Shell, health, readiness, discovery, and JWKS return 200. The current source
  passed 32 tests, with one opt-in PostgreSQL test skipped, plus typecheck, lint,
  and production build. A Kimi WebBridge logout completed with HTTP 200. One
  earlier zero-second logout request returned 503 without an application
  exception; the revision remained healthy.
- Marketing: final exact-source build
  `08fd00a1-de86-4f8f-b65d-632832279fa2` at
  `a7fc3fbb6476eb30f95c4f1bd5757d2d7708ba29` passed all 15 staged-release
  steps and serves `marketing-00013-jil` at 100%, digest
  `sha256:df12a3aa962cf861a2332ffab766588330456fc7b1a3e4e84e67e87a69e5b2d6`.
  The current source passed 301 tests. Custom-domain, database, Accounts
  readiness, mapping, rollback, and clean ERROR/5xx log evidence all passed.
  The production browser journey created and reloaded a six-scene project;
  ordinary-member settings administration remained forbidden.
- Codecamp identities: five legacy accounts were migrated into Accounts with
  exact credential hashes, roles, stable local-principal mappings, and immutable
  audit rows. Existing ownership remained unchanged across 155 progress rows,
  24 reviews, and 3 chats. `CODECAMP_TUTORIAL_REPORT_SECRET` and
  `CODECAMP_TUTORIAL_REPOSITORY_WORKER_TOKEN` now exist in project
  `codecamp-advantage`. The application cutover remains pending explicit
  secret-level `roles/secretmanager.secretAccessor` approval on
  `CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET` in project `reading-advantage`
  for `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com`.
- Sales: continuation build `342cdc52-871c-4f08-bef0-7ebf38290557` passed all
  15 steps and production serves `sales-advantage-00005-yas` at 100% in company
  mode. Exact archive, repair, rollback, domain, database, and log evidence is
  recorded in
  [`../sales_advantage_golive_20260701/production-continuation-20260719.md`](../sales_advantage_golive_20260701/production-continuation-20260719.md).

## 2026-07-19 overnight QA checkpoint

- Kimi WebBridge verified the migrated Codecamp `admin` credential against
  Accounts using the existing Secret Manager bootstrap value without printing
  it. The identity authenticated as `Codecamp Admin`, company role `EMPLOYEE`,
  with Codecamp application role `ADMIN` and no implicit Marketing or Sales
  access.
- The seeded company-owner credential also authenticated from Secret Manager
  without printing either username or password and reached the expected
  `COMPANY_ADMIN` Accounts console.
- Existing QA identity `completion-qa-mrql5cuh` retained only Marketing
  `MEMBER` and Sales `SALES_REP`. Its restore operation returned 200. A first
  login using an uncommitted reset correctly failed with 401. The confirmed
  credential reset returned 200, then the identity was suspended again; the
  final status update returned 200 and revoked active sessions.
- The dummy-account Sales and Marketing feature journeys were intentionally not
  started after the user requested the overnight stop. The browser tab group
  remains open and was not closed.

## Immutable release inventory

| App | Cloud Build | Image digest | Serving revision | Public domain | Traffic |
|---|---|---|---|---|---:|
| Accounts | `de19ada8-775e-45b0-99ce-d3896adf8a78` | `sha256:7e851f0c3663c7bfafd94bc434106f875ec3222ea928a000c698400601b1bc27` | `accounts-00007-hxs` | `https://accounts.reading-advantage.com` | 100% |
| Marketing | `08fd00a1-de86-4f8f-b65d-632832279fa2` | `sha256:df12a3aa962cf861a2332ffab766588330456fc7b1a3e4e84e67e87a69e5b2d6` | `marketing-00013-jil` | `https://marketing.reading-advantage.com` | 100% |
| Sales | `342cdc52-871c-4f08-bef0-7ebf38290557` | `sha256:ab7ca4d4429cad3d81a28fe9b9f85e03c78cb62f2e075142152982e0f7415ce3` | `sales-advantage-00005-yas` | `https://sales.reading-advantage.com` | 100% |

All three domain mappings reported `Ready=True`,
`CertificateProvisioned=True`, and `DomainRoutable=True`, with CNAME target
`ghs.googlehosted.com.`.

## Build and database gates

- Accounts final Cloud Build completed successfully after migration, database
  doctor, runtime privilege, capability-audit, identity-idempotency DML, and
  service deployment gates. The release was built from a clean tracked snapshot
  of reviewed commit `00e5cf52`.
- Marketing final Cloud Build completed successfully after migration, database
  doctor, least-privilege runtime grant/probe, image, deployment, and invoker
  gates.
- Sales original release build completed migration, doctor, deterministic
  curriculum reconciliation, independent verification, and runtime probes before
  stopping safely in evidence capture. One-use continuation build
  `342cdc52-871c-4f08-bef0-7ebf38290557` then revalidated that exact release,
  verified the compatibility revision, applied the receipt-bound role repair,
  and promoted the immutable image without replaying completed mutations.
- Accounts' production token-exchange path was also exercised directly against
  Cloud SQL and returned a successful audience token after normalizing
  PostgreSQL `bigint` auth versions. The identity idempotency adapter then passed
  a two-connection production-schema/runtime-role test covering atomic owner
  acquisition, replay/reject, input conflict, retryable and terminal settlement,
  expiry reclamation, canonical stored-row parsing, and cleanup.
- Sales curriculum verification recorded 6 modules, 27 lessons, 8 rubrics,
  8 scenarios, and 14 quiz questions with deterministic graph digest
  `ccba5498f453f1e2982307ca29d9d56c8bf17aeb26e1d586de232b44416b8717`.

## Public-domain and authorization evidence

- Accounts: `/api/health`, `/api/ready`, discovery, and the discovery-advertised
  `/api/oidc/jwks` returned 200. Owner browser login succeeded; `document.cookie`
  remained empty because the session cookie is HttpOnly. A unique production QA
  employee was created with 201; ordinary-employee administration was denied
  with 403; app roles and company roles were changed independently; company-admin
  access returned 200; suspend/restore and credential reset returned 200; explicit
  session revocation reported one revoked session and changed subsequent access
  from 403 to 401; Accounts logout returned 200 and left the session at 401. The
  QA employee was left suspended.
- Sales: Accounts SSO returned to the public Sales domain and rendered the
  authenticated six-module LMS dashboard. The protected session endpoint
  returned 200 with `authenticated: true`, an identity, and role `SALES_ADMIN`.
- Marketing: Accounts SSO returned to the public Marketing domain and rendered
  the authenticated home with Settings and Campaigns. The protected
  `/api/settings` endpoint returned 200.
- Cloud Logging returned no severity-ERROR entries for Accounts, Marketing, or
  Sales during the final 30-minute validation window.

## Local quality gates

- Accounts service: 15 tests passed, 1 opt-in PostgreSQL test skipped by default,
  typecheck, lint, and production build passed; the opt-in two-connection test
  passed separately against the production identity runtime role.
- Company-identity backend: 180 tests passed and 7 explicitly skipped; production
  and test typechecks, lint, and build passed.
- Marketing: 228/228 tests, typecheck, build, and lint passed with 18 pre-existing
  warnings and no errors.
- Sales: 56 active tests passed and 8 explicitly skipped; typecheck, build, and
  lint passed with 4 pre-existing warnings and no errors.
- Shared auth focused tests, typecheck, lint, and build passed; lint retained 7
  pre-existing warnings and no errors.

## Rollback anchors

### Current verified Sales rollback

- Revision: `sales-advantage-00004-jed`.
- Image digest:
  `sha256:ab7ca4d4429cad3d81a28fe9b9f85e03c78cb62f2e075142152982e0f7415ce3`.
- Mode and database contract: `legacy-school` with
  `SALES_LEGACY_DATABASE_URL`.
- State: Ready, tagged `legacy-rollback`, 0% traffic, independently verified
  before and after repair.
- Restore command:
  `gcloud run services update-traffic sales-advantage --region=asia-southeast1 --to-revisions=sales-advantage-00004-jed=100`.

Historical pre-split Sales revisions must not receive traffic after the
source-role repair. The Accounts and Marketing rollback identifiers in the
original 2026-07-18 section are historical release references, not a claim that
they are currently tagged rollback targets; reverify a candidate before any
future rollback action.

## Open gates

- Codecamp identity migration is complete and both tutorial-runtime secrets
  exist. The application SSO cutover remains open pending explicit secret-level
  cross-project access to the Accounts-owned OIDC client secret for
  `codecamp-cloud-run@codecamp-advantage.iam.gserviceaccount.com`.
- Codecamp candidate deployment, migrated-account product smoke tests, and
  dummy-account Codecamp feature tests remain open.
- The dummy-account Sales and Marketing feature journeys were not started before
  the overnight stop. Sales ordinary-rep, audio, AI roleplay, streaming chat,
  rate-limit, and final curriculum-quality journeys remain open.
- Final Sales company-admin-without-app-role denial should be repeated against
  the promoted revision.
- Observation-window approval, legacy-auth retirement, detailed checklist
  reconciliation, and parent-track closeout remain open.
