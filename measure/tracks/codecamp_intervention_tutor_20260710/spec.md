# Specification: Codecamp Targeted Intervention Tutor

## Overview

Give students targeted, escalating help that points to trusted lesson, diagram,
repository, and video-segment resources while recording scaffold usage as Mastery
evidence context rather than invented correctness. Replace the current general
monorepo chatbot with an activity-aware intervention coach using OpenRouter
`xiaomi/mimo-v2.5` through `@reading-advantage/ai`.

The tutor consumes the graph/activity/resource contracts from
`mastery_engine_v32_import_20260710`,
`codecamp_knowledge_graph_apk_unit_20260710`, and
`shared_video_tutorial_runtime_20260710`. It must never infer authoritative resource
paths/timestamps or mark a response correct without a deterministic check or assessed
checkpoint.

## Stories

### Story S1: Freeze the intervention contract
**As a** platform maintainer
**I want** a strict structured-output contract for tutor messages, escalation levels, diagnostic questions, misconceptions, and resources
**So that** model output is safe, renderable, auditable, and compatible with Mastery evidence.

**Acceptance Criteria:**
- Given a tutor response, When Zod validation succeeds, Then message, intervention level, follow-up question, misconception tags, and an optional curated resource reference are present with provider-compatible required/nullable fields.
- Given a resource response, When it reaches the UI, Then its ID resolves against trusted activity data; unknown IDs, raw invented timestamps, and out-of-scope file paths are rejected.
- Given schema-invalid or semantically invalid output, When generation fails, Then no evidence/mastery mutation occurs and the learner receives a safe retry/fallback state.
- Given any interaction, When persisted, Then model alias/resolution, prompt/policy/schema/resource/graph/activity versions are recorded.

**Estimate:** L
**Priority:** Must

### Story S2: Ground tutoring in activity state
**As a** learner who is stuck
**I want** the tutor to understand the exact objective, tutorial step, attempt, and failure I am working on
**So that** I receive relevant help instead of generic architecture advice.

**Acceptance Criteria:**
- Given a help request, When context is assembled, Then only authorized objective/activity/step content, learner attempts, deterministic check results, checkpoint responses, scaffold history, and curated resources are included.
- Given local repository state, When it is shared, Then only allowlisted structured checks and explicitly selected diffs/files enter context; secrets and unrelated files remain local.
- Given prior turns, When context limits are reached, Then structured intervention state is retained while irrelevant prose is summarized or dropped deterministically.
- Given Thai or English input, When the tutor responds, Then it mirrors the learner language while preserving exact code, commands, filenames, and technical terms.

**Estimate:** L
**Priority:** Must

### Story S3: Escalate support safely
**As a** learner developing independence
**I want** support to begin diagnostically and reveal more only when needed
**So that** the tutor helps me think rather than replacing the activity.

**Acceptance Criteria:**
- Given a first request, When intervention begins, Then the tutor asks for prediction/explanation or supplies a conceptual cue before code revelation unless safety/accessibility requires otherwise.
- Given unresolved attempts, When support escalates, Then levels progress through diagnostic, conceptual hint, location hint, partial scaffold, and worked example with explicit policy exceptions.
- Given a relevant video segment, diagram, lesson section, or repository location, When recommended, Then the UI opens/seeks the trusted resource and records its use.
- Given independent You Do work, When the learner asks for a complete solution, Then policy favors diagnosis and bounded scaffolds and does not silently produce a submission-ready answer.

**Estimate:** L
**Priority:** Must

### Story S4: Connect intervention to Mastery
**As a** mastery engine and teacher
**I want** intervention history attached to subsequent verified evidence
**So that** proficiency reflects both correctness and the level of support used without penalizing help-seeking.

**Acceptance Criteria:**
- Given hints, reveals, replays, and intervention levels, When a later checkpoint/test/PR result is recorded, Then support metadata modifies confidence/rating under v3.2 rather than creating standalone correctness.
- Given no verified follow-up, When a conversation ends, Then the event remains engagement/support context and does not change mastery state.
- Given repeated misconception tags, When the planner selects remediation, Then teacher/student projections can explain the pattern and selected resource without exposing chain-of-thought.
- Given efficacy analysis, When interventions are compared, Then policy/resource/model versions allow time-to-resolution and transfer outcomes to be evaluated.

**Estimate:** L
**Priority:** Must

## Non-Functional Requirements

- All model calls go through `@reading-advantage/ai`; no app-level provider SDK imports.
- Prompt-injection defenses treat student code, test output, lesson content, and transcripts as untrusted data.
- No secrets, credentials, unrelated repository content, or hidden reasoning are stored.
- Structured response latency and fallback behavior remain usable on typical Thai school connections.
- WCAG 2.1 AA, keyboard/mobile support, bilingual behavior, and accessible resource navigation.

## Track-Level Acceptance Criteria

- Structured schema and semantic resource validation prevent hallucinated targets.
- A pilot activity demonstrates all escalation levels and deterministic follow-up verification.
- MiMo-V2.5 preflight and frozen intervention fixtures pass before production enablement.
- Help/replay events alter evidence confidence only when joined to verified outcomes.
- Security, prompt-injection, authz, tenant, rate-limit, cost, retry, lint, type-check, tests, coverage, build, browser, graph, docs, and doctor gates pass.

## Out of Scope

- General open-ended chat unrelated to an active learning objective.
- Autonomous editing or execution in a student's local repository.
- Allowing the model to choose authoritative graph nodes or resource timestamps.
- Treating tutor self-assessment as evidence of correctness.
- Replacing human teacher intervention or safeguarding workflows.
