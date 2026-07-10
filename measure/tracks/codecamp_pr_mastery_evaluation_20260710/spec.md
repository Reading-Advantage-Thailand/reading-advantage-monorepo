# Specification: Codecamp PR Review as Mastery Evidence

## Overview

Turn Codecamp's durable GitHub PR review loop into auditable, graph-linked
independent-practice evidence without allowing model drift, invalid output, or one
approval to manufacture permanent mastery. Route reviews explicitly through OpenRouter
`~x-ai/grok-latest`, keep tutor traffic on `xiaomi/mimo-v2.5`, and preserve the product
rule that LLM review is an educational mentor rather than a GitHub merge gate.

This track consumes engine/evidence contracts from
`mastery_engine_v32_import_20260710` and objective/rubric bindings from
`codecamp_knowledge_graph_apk_unit_20260710`. It extends the existing webhook, durable
review-job worker, PR comment, and retry/dead-letter paths rather than replacing them.

## Stories

### Story S1: Route review models explicitly
**As an** operator
**I want** task-level model configuration and complete model provenance
**So that** Grok deprecation or alias redirection cannot silently change unrelated AI features or grading behavior.

**Acceptance Criteria:**
- Given Codecamp PR review, When a job calls the AI adapter, Then `CODECAMP_PR_REVIEW_MODEL` defaults to `~x-ai/grok-latest` and no global provider default or tutor model determines the review model.
- Given OpenRouter alias routing, When a result returns, Then requested alias, provider, resolved model, request/response identifiers, prompt/schema/rubric/graph versions, usage, latency, and outcome are recorded where available.
- Given AI SDK evolution, When the internal implementation migrates from v5 `generateObject` to v6 `generateText` plus `Output.object`, Then the `AIClient.generateObject` consumer contract and behavioral tests remain stable.
- Given invalid configuration or preflight failure, When deployment gates run, Then production cutover is blocked while existing queued work remains recoverable.

**Estimate:** M
**Priority:** Must

### Story S2: Produce objective-level review evidence
**As a** student
**I want** PR feedback tied to the exact objectives, rubric dimensions, tests, files, and misconceptions in my assignment
**So that** revisions are actionable and the evaluation represents what I actually demonstrated.

**Acceptance Criteria:**
- Given a review job, When the prompt is assembled, Then it includes the trusted exercise specification, objective/variant bindings, rubric, acceptance checks, attempt history, previous review, repository metadata, bounded diff, and deterministic test evidence.
- Given a structured result, When Zod and semantic validation pass, Then overall disposition, per-objective scores, confidence, rubric dimensions, misconception tags, required revisions, and file/line/test evidence references are valid and bounded.
- Given an unknown objective, impossible score, fabricated file/line/test reference, or schema-invalid output, When validation runs, Then the review does not update status/mastery and the durable job retries or dead-letters with diagnostics.
- Given advisory semantics, When feedback posts to GitHub, Then it does not configure a required merge check or claim human authority; students retain ownership of their fork and revisions.

**Estimate:** L
**Priority:** Must

### Story S3: Feed PR evidence into Mastery
**As a** mastery engine
**I want** validated PR results converted into independent-practice evidence and SRS review events
**So that** authentic coding work informs readiness and retention without binary completion shortcuts.

**Acceptance Criteria:**
- Given a validated PR result, When evidence is recorded, Then submission, attempt, objective, variant, score, confidence, misconceptions, support history, rubric/model/graph versions, and evidence references are idempotently preserved.
- Given one approved PR, When mastery is recomputed, Then it contributes high-value independent evidence but cannot alone satisfy multi-variant or delayed-retention requirements.
- Given a revised PR synchronization event, When re-reviewed, Then attempts remain historically auditable and only the intended latest evidence affects current projections under defined policy.
- Given no standalone `exercise` lesson, When progress is projected, Then graph/activity bindings identify the correct activity; approval never searches for an arbitrary first exercise lesson.

**Estimate:** L
**Priority:** Must

### Story S4: Calibrate and release safely
**As a** curriculum owner
**I want** model changes evaluated against frozen, human-labeled PR cases before affecting students
**So that** approval, feedback, and mastery evidence remain stable and defensible.

**Acceptance Criteria:**
- Given historical/synthetic PR fixtures, When candidate or redirected models run, Then schema compliance, rubric agreement, false approvals/rejections, evidence grounding, injection resistance, latency, and cost are reported.
- Given a new resolved `grok-latest` model, When drift thresholds are exceeded, Then the system alerts, can shadow/fallback/disable mastery mutation, and requires explicit release approval.
- Given production rollout, When shadow comparison and canary gates pass, Then queued and new jobs transition without loss, duplicate comments, or duplicate evidence.
- Given teacher/admin review, When an evaluation is disputed, Then provenance and evidence are inspectable and a human override produces an audited correction rather than editing history invisibly.

**Estimate:** L
**Priority:** Must

## Non-Functional Requirements

- Diff, comments, tests, and repository content are untrusted prompt data and cannot alter system instructions or schemas.
- Token/file/diff limits, redaction, secret detection, and binary/generated-file exclusion are enforced before inference.
- Model failure never mutates review completion, progress, cards, or mastery.
- Existing webhook ACK latency, durable queue, retries, idempotency, and dead-letter behavior are preserved.
- Structured schemas favor provider-compatible required/nullable fields and receive a second semantic validation pass.

## Track-Level Acceptance Criteria

- Live credential-gated OpenRouter preflight proves `~x-ai/grok-latest` structured output.
- Frozen PR evaluation set has human labels and explicit release thresholds.
- Webhook/worker/review/progress/evidence flow passes success, revision, retry, dead-letter, redelivery, and model-drift tests.
- GitHub comments provide objective-linked revisions without becoming required merge checks.
- One approved PR does not satisfy permanent or multi-variant mastery.
- Lint, type-check, tests, coverage, build, live preflight, security, graph, generated docs, doctor, and product-owner review pass.

## Out of Scope

- Running untrusted student code in the webhook or application process.
- Replacing deterministic tests with LLM judgment.
- Automatically merging or blocking student PRs.
- Using the tutor model for PR assessment.
- Migrating non-Codecamp artifact evaluators in this track.
