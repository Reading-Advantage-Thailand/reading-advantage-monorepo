# Implementation Status — 2026-07-19

The implementation state recorded on 2026-07-15 remains confirmed below. This
update records closure status only; it does not promote contract-only fixtures
or partial browser evidence into efficacy evidence.

## Implemented slice

- Added a strict, activity-bound tutor contract and policy in
  `packages/domain/src/codecamp/tutor.ts`; model output can select only a
  server-authored resource ID and cannot create correctness evidence.
- Added a provenance-capable internal AI adapter, a validated dedicated
  `CODECAMP_TUTOR_MODEL` setting (default `xiaomi/mimo-v2.5`), and the authenticated
  `POST /api/tutor/intervention` endpoint. The endpoint derives the activity,
  objective, step, attempts, and resources from the owned durable session.
- Added the guided APK tutor surface. It records support use before showing a
  response, records trusted resource actions, and joins a later verified
  tutorial submission to the intervention without accepting a client-supplied
  assessed-event ID.
- Added immutable intervention, resource-use, and verified-evidence join
  tables in migration `0036_codecamp_mastery_evidence.sql`.
- Added a tenant-scoped admin read model and bilingual intern-detail panel for
  intervention counts, trusted resource use, verified follow-ups, and explicit
  misconception tags. Learner messages and model reasoning are not returned.

## Evidence run locally

- Tutor domain contracts and persistence boundaries: 45 focused tests passing;
  tutor coach component: 1 passing test. Focused tutor-module coverage is
  86.16% statements and 88.48% lines, including idempotent intervention
  persistence, owned-resource enforcement, and verified-event-only joins.
- A frozen `contract-only` fixture set covers each permitted escalation level
  and validates that every model-selected resource is only an opaque ID
  resolved from the trusted registry. It is not represented as a MiMo live
  preflight or human efficacy result.
- `@reading-advantage/domain` and `codecamp-advantage` type checks: passed.
- Local route smoke: APK surface responded `200`; unauthenticated tutor request
  responded `401` without leaking context.

## Remaining closure work

- Credential-gated MiMo preflight passed against `xiaomi/mimo-v2.5` with the
  production-bound OpenRouter secret. The response validated against
  `interventionResponseSchema`, selected the bounded `diagnostic` level, and
  returned provider response provenance.
- The endpoint, migration, admin read model, and guided APK tutor shipped in
  Cloud Run revision `codecamp-advantage-00019-682` with 100% traffic.
- Authenticated Chrome acceptance verified the safe teacher/admin projection.
  The current admin account is not assigned to new-cohort Unit 20, so an
  assigned-learner browser/mobile walkthrough of the guided coach and verified
  follow-up join remains required before this feature track can close.
- The teacher-facing aggregate is implemented. Longitudinal intervention-efficacy
  reporting is not yet implemented, and must not infer causality from the
  support/evidence joins.
- Frozen live-model fixtures and human efficacy review remain open. Contract-only
  fixtures must not be represented as efficacy evidence.

## Post-2026-07-15 status

### Phase S3/S4 implementation tasks now complete

- Phase S3 policy/resource contracts, policy and coach tests, and guided coach
  orchestration are shipped; the plan marks these implementation tasks `[x]`.
- Phase S4 intervention-evidence joins, support-only non-mastery semantics,
  Mastery/reporting tests, and student/teacher projections are shipped; the plan
  marks these implementation tasks `[x]`.

### Verification still open

- Assigned-learner browser/mobile/accessibility walkthrough and complete
  activity/tutor/Mastery flow remain required; the available admin is not in the
  new-cohort Unit 20.
- Frozen live-model fixtures, human efficacy review, graph/generate/doctor gates,
  and product-owner review remain open. Longitudinal efficacy reporting is also
  not implemented and must not be inferred from support joins.

### SSO cutover dependency

Manual learner verification and pending graph/update closure work that use the
Codecamp company identity remain dependent on the explicit
`roles/secretmanager.secretAccessor` grant for
`CODECAMP_COMPANY_AUTH_OIDC_CLIENT_SECRET` to the Codecamp Cloud Run service
account, as recorded in `company_identity_sso_20260715/production-rollout-20260718.md:37-40`.
