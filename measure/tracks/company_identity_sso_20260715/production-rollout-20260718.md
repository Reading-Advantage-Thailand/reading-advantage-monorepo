# Production Rollout Evidence — 2026-07-18

## Scope and closure boundary

This checkpoint deploys and verifies Accounts, Marketing, and Sales in GCP project
`reading-advantage`, region `asia-southeast1`, using the existing Cloud SQL
instance. It does **not** deploy or migrate Codecamp, retire Codecamp legacy auth,
complete the observation window, or close the parent company-identity track.

## Immutable release inventory

| App | Cloud Build | Image digest | Serving revision | Public domain | Traffic |
|---|---|---|---|---|---:|
| Accounts | `994aed87-693d-46f0-9919-39eeb7cf8c4e` | `sha256:fc81f0459f74fe8493814f7364c8519ae7750f1d616e6f9ad2df45cbf487095d` | `accounts-00005-2hg` | `https://accounts.reading-advantage.com` | 100% |
| Marketing | `2e1d5b73-4118-480f-aeea-fe8f50db14b2` | `sha256:72f4e1cc9529b8c656d3843a77354e9ddc3ac3b38fc6d4dd1540da0217cc42b7` | `marketing-00005-fzp` | `https://marketing.reading-advantage.com` | 100% |
| Sales | `b45acc2f-9694-4962-95b9-4477209799d2` | `sha256:9cab345f7f070e0d42488c3357ff492471758d0d17dcb85c86e6eac61b5738d0` | `sales-advantage-00003-v4d` | `https://sales.reading-advantage.com` | 100% |

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
- Sales final Cloud Build completed successfully after migration, database
  doctor, deterministic curriculum replay, independent curriculum verification,
  least-privilege runtime grant/probe, image, deployment, and invoker gates.
- Accounts' production token-exchange path was also exercised directly against
  Cloud SQL and returned a successful audience token after normalizing
  PostgreSQL `bigint` auth versions. The identity idempotency adapter then passed
  a two-connection production-schema/runtime-role test covering atomic owner
  acquisition, replay/reject, input conflict, retryable and terminal settlement,
  expiry reclamation, canonical stored-row parsing, and cleanup.
- Sales curriculum verification recorded 6 modules, 26 lessons, 8 rubrics,
  8 scenarios, and 13 quiz questions with deterministic graph digest
  `f8b1391302650874154066d5a21189a71d3cbaf78b528f579642fc9fc696f0e7`.

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

| App | Prior ready revision | Prior image digest |
|---|---|---|
| Accounts | `accounts-00004-b9g` | `sha256:e9e3e12a7bd74225c6d9e6d430d633a0f2f148f621ddd1a66ced0db975ed96b1` |
| Marketing | `marketing-00004-czf` | `sha256:10cbe3936e2f5cd0445592dfd65f8a997ddd7aba3f312c19114b477e1d53fa63` |
| Sales | `sales-advantage-00002-7ch` | `sha256:99acd2182e1f0a6d4e8d46dd9e27a6d152555adbfad6de5b35cd3891061a8384` |

These revisions remain Ready. A rollback must move Cloud Run traffic to the
recorded prior revision and then repeat the public-domain health and sign-in
checks. No rollback was required during this release.

## Open gates

- Codecamp migration and SSO cutover were not part of this release and remain
  open in Phase S6/S7.
- Marketing company-admin-without-app-role denial returned 403; the equivalent
  final Sales proof remains open until the reviewed Sales revision is deployed.
- The full Sales audio, AI roleplay, streaming chat, rate-limit, and manual
  curriculum-quality journeys remain open.
- The full Marketing campaign research, Thai script generation/edit/persist
  journey remains open.
- Observation-window approval and legacy-auth retirement remain open.
