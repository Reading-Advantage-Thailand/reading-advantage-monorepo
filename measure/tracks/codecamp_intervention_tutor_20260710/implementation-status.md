# Implementation Status — 2026-07-15

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
