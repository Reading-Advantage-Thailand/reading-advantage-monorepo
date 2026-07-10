# Implementation Plan: Codecamp PR Review as Mastery Evidence

## Phase S1: Route review models explicitly
_Story ref: spec.md#story-s1_
_Graph context: `reviewExercise` is reached through the API and durable worker; `getAIClient` currently selects a provider singleton while the OpenRouter adapter has a hidden global model default._

- [~] Task: Define task-level model and provenance contracts
  - [ ] Add validated review/tutor model settings, requested/resolved model fields, versions, usage, latency, and request identifiers
  - [ ] Define AI SDK v5/v6 behavioral compatibility at the internal adapter boundary
- [~] Task: Write configuration, adapter, and deployment Red tests
  - [ ] Cover missing/invalid models, provider mismatch, alias resolution, schema failure, v5/v6 adapter equivalence, and secret binding
  - [ ] Add a credential-gated `~x-ai/grok-latest` structured-output preflight
- [~] Task: Implement explicit review routing
  - [ ] Route PR evaluation through OpenRouter with `CODECAMP_PR_REVIEW_MODEL`; leave tutor routing independent
  - [ ] Persist provenance and remove reliance on provider-global defaults
- [~] Task: Verify and document Phase S1
  - [ ] Run AI/package/webhook/deploy-config gates, live preflight when credentialed, graph update/audit, docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Route review models explicitly' (Protocol in workflow.md)

## Phase S2: Produce objective-level review evidence
_Story ref: spec.md#story-s2_

- [~] Task: Freeze evaluation input/output and semantic contracts
  - [ ] Define exercise/rubric/objective/test/attempt inputs and per-objective structured result with required/nullable provider-safe fields
  - [ ] Define file/line/test reference verification, score bounds, objective allowlists, misconception taxonomy, and advisory comment rendering
- [~] Task: Write schema, semantic, and prompt-security Red tests
  - [ ] Cover malformed output, unknown objectives, fabricated references, impossible scores, oversized diffs, binaries, generated files, secrets, and injection
  - [ ] Add human-labeled pass/revise fixtures with expected objective evidence
- [~] Task: Implement trusted context assembly and evaluation
  - [ ] Fetch graph-bound exercise/rubric/previous-attempt/test context through domain ports
  - [ ] Validate model output twice and render grounded GitHub/student feedback
- [~] Task: Verify and document Phase S2
  - [ ] Run domain/AI/webhook/security/fixture suites, graph caller checks, affected builds, docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Produce objective-level review evidence' (Protocol in workflow.md)

## Phase S3: Feed PR evidence into Mastery
_Story ref: spec.md#story-s3_

- [~] Task: Define PR-to-practice evidence contracts
  - [ ] Specify submission/attempt identity, revision policy, objective/variant evidence, support joins, confidence, provenance, and activity progress projection
  - [ ] Remove dependence on first standalone exercise-lesson lookup
- [~] Task: Write transaction, revision, and Mastery Red tests
  - [ ] Cover opened/synchronize/redelivery, pass/revise/pass, stale job, duplicate comment/evidence, no exercise lesson, support history, and rollback
  - [ ] Prove one approval cannot satisfy multi-variant or delayed-retention mastery
- [~] Task: Implement evidence persistence and projections
  - [ ] Convert validated results into idempotent practice submissions and SRS/card review inputs
  - [ ] Project activity/progress status from bindings while retaining full attempt history
- [~] Task: Verify and document Phase S3
  - [ ] Run webhook/worker/DB/Mastery/tenant/concurrency suites, affected builds, graph/generate/doctor, and end-to-end fixture flow
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Feed PR evidence into Mastery' (Protocol in workflow.md)

## Phase S4: Calibrate and release safely
_Story ref: spec.md#story-s4_

- [~] Task: Define evaluation harness and release policy
  - [ ] Freeze human-labeled fixture governance, metrics, thresholds, shadow/canary/fallback modes, drift detection, dispute, and human override contracts
  - [ ] Define resolved-model change alerts for the moving alias
- [~] Task: Write harness, drift, rollout, and override tests
  - [ ] Cover false approval/rejection, schema/reference failures, injection, latency/cost, alias redirect, outage, fallback, canary rollback, and audited correction
  - [ ] Verify shadow results cannot mutate learner state
- [~] Task: Implement harness, observability, and guarded release
  - [ ] Build offline replay/reporting and production model-provenance/drift metrics
  - [ ] Deploy shadow then canary under explicit approval with retry-safe queue transition
- [~] Task: Close and verify the PR evaluation track
  - [ ] Run frozen/live evaluations, end-to-end GitHub flow, affected/root gates, graph/generate/doctor, and curriculum/product-owner review
  - [ ] Task: Measure - User Manual Verification 'Phase S4: Calibrate and release safely' (Protocol in workflow.md)
