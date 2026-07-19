# Implementation Plan: Codecamp Targeted Intervention Tutor

> **Browser acceptance:** Use the in-app browser for each intervention level
> and resource type. Verify the learner action, grounded follow-up questions,
> hint escalation, exact video timestamp/repository pointer, resume behavior,
> mastery evidence, mobile/keyboard accessibility, and teacher-visible outcome;
> retain screenshots and interaction evidence for phase acceptance.

## Phase S1: Freeze the intervention contract
_Story ref: spec.md#story-s1_
_Graph context: current `getChatContext` has one known consumer and supplies only module/lesson title and description; the route prompt is general rather than activity-aware._

- [x] Task: Define intervention and provenance schemas
  - [x] Specify levels, messages, follow-up questions, misconceptions, resource refs, fallbacks, and version metadata — implemented in `packages/domain/src/codecamp/tutor.ts` (`tutorInterventionLevelSchema`, `curatedTutorResourceSchema`, `tutorProvenanceSchema`, `interventionResponseSchema`); version pinned at `CODECAMP_TUTOR_RESPONSE_SCHEMA_VERSION`.
  - [x] Use provider-compatible required/nullable fields and trusted ID resolution — schema uses Zod strict objects with non-empty bounded strings; resource actions resolved only by server registry.
- [x] Task: Write schema, semantic, and model-fixture tests
  - [x] Cover malformed JSON, unknown resources, invented timestamps/paths, invalid levels, empty diagnostics, and oversized output — `tutor-intervention.test.ts` and `tutor-coach.test.tsx` cover all listed edge cases.
  - [x] Freeze MiMo structured-output fixtures and safe fallback behavior — `contract-only` fixture set covers each escalation level and validates opaque resource ID selection; `createSafeTutorFallback` exported.
- [x] Task: Implement intervention generation behind the AI adapter
  - [x] Add task-level `CODECAMP_TUTOR_MODEL` configuration defaulting to `xiaomi/mimo-v2.5` — `resolveCodecampTutorModel` validates identifier and defaults to `DEFAULT_CODECAMP_TUTOR_MODEL`.
  - [x] Remove Codecamp's direct provider SDK path and persist complete provenance — route `apps/codecamp-advantage/app/api/chat/route.ts` uses internal AI adapter; `generateTutorIntervention` persists provenance with provider response metadata.
- [~] Task: Verify and document Phase S1
  - [x] Run AI adapter, contract, model preflight, lint, type-check, tests, coverage, build — 45 focused tests pass; 86.16% statement and 88.48% line coverage; type-check passed per `implementation-status.md` (2026-07-15). Credential-gated MiMo preflight passed in legacy revision `codecamp-advantage-00019-682`.
  - [ ] graph update/audit, docs, doctor — pending after SSO cutover.
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Freeze the intervention contract' (Protocol in workflow.md)

## Phase S2: Ground tutoring in activity state
_Story ref: spec.md#story-s2_

- [x] Task: Define authorized tutor-context contracts
  - [x] Specify objective/activity/step, attempts, checks, checkpoint responses, scaffold history, resource registry, locale, and allowed repository excerpts — `tutorContextSchema` and `buildCodecampTutorContextInputSchema` cover all listed fields.
  - [x] Define deterministic context compaction and token/cost budgets — `assembleTutorContext` enforces bounded context shape; deterministic output for given input.
- [x] Task: Write authz, privacy, and context tests
  - [x] Cover cross-user/tenant access, unpublished lessons, unrelated files, secrets, hostile diffs/output, stale activity versions, and long histories — authz/privacy tests covered in `tutor-intervention.test.ts`; unauthenticated route returns 401 without leaking context.
  - [x] Verify exact technical strings survive bilingual context handling — context assembly preserves exact repository paths and technical strings.
- [x] Task: Implement context assembly in the owning domain module
  - [x] Replace title/description-only context with validated, least-privilege activity context — `createTutorContextFromAuthorizedActivity` derives context from owned durable session, not from client input.
  - [x] Keep the route thin and share context/provenance behavior with tests and future apps — `apps/codecamp-advantage/lib/tutor-intervention.ts` is a thin wrapper; domain logic lives in `packages/domain/src/codecamp/tutor.ts`.
- [~] Task: Verify and document Phase S2
  - [x] Run security/privacy/context/load gates — authz contract tests, privacy coverage, and local route smoke (200/401) passed in `implementation-status.md`.
  - [ ] graph caller checks, affected suites, generated docs, doctor — pending after SSO cutover.
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Ground tutoring in activity state' (Protocol in workflow.md)

## Phase S3: Escalate support safely
_Story ref: spec.md#story-s3_

- [~] Task: Define intervention policy and resource-action contracts
  - [ ] Encode default escalation, exceptions, independent-work boundaries, replay/seek, diagram/section, and repository-location actions
  - [ ] Define student-visible explanation and retry behavior for every rejected action
- [~] Task: Write policy and UI Red tests
  - [ ] Cover premature solution reveal, repeated failure, student request for full answer, accessibility exception, wrong resource, seek/replay, and model refusal
  - [ ] Add prompt-injection and submission-ready-answer adversarial fixtures
- [~] Task: Implement coach UI and policy orchestration
  - [ ] Render diagnostic questions, structured hints, resource cards, exact video ranges, and check-again actions
  - [ ] Record intervention/resource-use events without fabricating correctness
- [~] Task: Verify and document Phase S3
  - [ ] Run browser/mobile/accessibility/policy/adversarial tests and conduct learner-like manual walkthroughs
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Escalate support safely' (Protocol in workflow.md)

## Phase S4: Connect intervention to Mastery
_Story ref: spec.md#story-s4_

- [~] Task: Define intervention-evidence join contracts
  - [ ] Specify attempt/session correlation, hint/reveal/replay counts, intervention level, misconception lifecycle, confidence/rating effects, and audit projection
  - [ ] Encode the rule that support-only events cannot change correctness/mastery
- [~] Task: Write Mastery and reporting tests
  - [ ] Cover no-follow-up, verified success after help, continued failure, multiple resources, stale sessions, duplicate events, and teacher explanation
  - [ ] Verify v3.2 rating caps and evidence provenance
- [~] Task: Implement evidence joins and projections
  - [ ] Attach intervention history to checkpoint/check/PR evidence and planner remediation
  - [ ] Add student/teacher summaries and efficacy events without storing hidden reasoning
- [~] Task: Verify and close the tutor track
  - [ ] Run end-to-end activity/tutor/Mastery flows, model fixtures, affected/root gates, graph/generate/doctor, and product-owner review
  - [ ] Task: Measure - User Manual Verification 'Phase S4: Connect intervention to Mastery' (Protocol in workflow.md)
