# Implementation Plan: Codecamp Targeted Intervention Tutor

## Phase S1: Freeze the intervention contract
_Story ref: spec.md#story-s1_
_Graph context: current `getChatContext` has one known consumer and supplies only module/lesson title and description; the route prompt is general rather than activity-aware._

- [~] Task: Define intervention and provenance schemas
  - [ ] Specify levels, messages, follow-up questions, misconceptions, resource refs, fallbacks, and version metadata
  - [ ] Use provider-compatible required/nullable fields and trusted ID resolution
- [~] Task: Write schema, semantic, and model-fixture tests
  - [ ] Cover malformed JSON, unknown resources, invented timestamps/paths, invalid levels, empty diagnostics, and oversized output
  - [ ] Freeze MiMo structured-output fixtures and safe fallback behavior
- [~] Task: Implement intervention generation behind the AI adapter
  - [ ] Add task-level `CODECAMP_TUTOR_MODEL` configuration defaulting to `xiaomi/mimo-v2.5`
  - [ ] Remove Codecamp's direct provider SDK path and persist complete provenance
- [~] Task: Verify and document Phase S1
  - [ ] Run AI adapter, contract, model preflight, lint, type-check, tests, coverage, build, graph update/audit, docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Freeze the intervention contract' (Protocol in workflow.md)

## Phase S2: Ground tutoring in activity state
_Story ref: spec.md#story-s2_

- [~] Task: Define authorized tutor-context contracts
  - [ ] Specify objective/activity/step, attempts, checks, checkpoint responses, scaffold history, resource registry, locale, and allowed repository excerpts
  - [ ] Define deterministic context compaction and token/cost budgets
- [~] Task: Write authz, privacy, and context tests
  - [ ] Cover cross-user/tenant access, unpublished lessons, unrelated files, secrets, hostile diffs/output, stale activity versions, and long histories
  - [ ] Verify exact technical strings survive bilingual context handling
- [~] Task: Implement context assembly in the owning domain module
  - [ ] Replace title/description-only context with validated, least-privilege activity context
  - [ ] Keep the route thin and share context/provenance behavior with tests and future apps
- [~] Task: Verify and document Phase S2
  - [ ] Run security/privacy/context/load gates, graph caller checks, affected suites, generated docs, and doctor
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
