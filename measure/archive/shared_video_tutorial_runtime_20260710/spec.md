# Specification: Shared Interactive Video and Tutorial Runtime

## Overview

Deliver reusable I Do and We Do activity infrastructure that turns video checkpoints,
diagrams, tutorial steps, checks, hints, and replays into one accessible and
scaffold-aware evidence stream. Implement an internal system for React applications
with framework-neutral core contracts and thin Next/Vinext adapters. H5P Interactive
Video, Edpuzzle, and PlayPosit inform interaction design, but no external LMS owns
student identity, progress, or evidence.

This track consumes `practice.v1` and evidence contracts from
`mastery_engine_v32_import_20260710`. It supersedes plain iframe-only behavior but may
reuse videos and diagrams from `codecamp_interactive_media_diagrams_20260709`.

## Stories

### Story S1: Freeze the activity contracts
**As a** curriculum author
**I want** strict, versioned contracts for media, checkpoints, resource segments, tutorial steps, and evidence events
**So that** every Advantage app can author activities without inventing incompatible formats.

**Acceptance Criteria:**
- Given an activity, When its Zod schema validates, Then source, objective, mode, version, resource IDs, checkpoints, feedback, remediation, accessibility, and evidence behavior are explicit.
- Given a video resource, When segments are authored, Then stable segment IDs resolve trusted start/end timestamps and labels; models never supply authoritative raw timestamps.
- Given a checkpoint or tutorial step, When it emits evidence, Then `activityId`, `stepId`, `objectiveId`, `variantKey`, attempt, hints, reveals, timing, and confidence map into `practice.v1` without app translation.
- Given future schema evolution, When older content loads, Then version migration or actionable rejection is deterministic.

**Estimate:** L
**Priority:** Must

### Story S2: Build interactive video for React
**As a** learner
**I want** tutorial video, diagrams, questions, and replay controls in one accessible lesson surface
**So that** I actively process demonstrations and can revisit exactly what I misunderstood.

**Acceptance Criteria:**
- Given YouTube or hosted media, When the React player runs, Then the same activity contract drives playback, cue points, watched ranges, questions, diagrams, transcript alternatives, and timestamped replay.
- Given YouTube policy, When a question appears, Then ordinary player access is never blocked by a required answer; hard-gated checkpoints are restricted to approved hosted media.
- Given a checkpoint response, When it is submitted, Then immediate feedback and optional replay/diagram/tutor remediation are available without marking watch time as mastery.
- Given keyboard, touch, reduced-motion, captions/transcript, and screen-reader use, When the activity is completed, Then all essential content and actions remain accessible.

**Estimate:** XL
**Priority:** Must

### Story S3: Persist activity evidence
**As a** teacher and mastery engine
**I want** durable, idempotent activity sessions and events
**So that** support usage and assessed responses can be reconstructed without trusting noisy client heartbeats.

**Acceptance Criteria:**
- Given playback, When events are recorded, Then normalized starts, pauses, seeks, watched ranges, checkpoint attempts, resource opens, and completions are batched/idempotent and scoped to the authenticated learner.
- Given evidence projection, When an activity completes, Then engagement events remain contextual while assessed checkpoint results become weighted evidence.
- Given retries, multiple tabs, reconnects, and resumed devices, When events merge, Then progress is monotonic where appropriate and duplicate evidence is not created.
- Given teacher reporting, When a session is inspected, Then the system can explain questions attempted, misconceptions, remediation used, and unresolved checkpoints without exposing unrelated learner data.

**Estimate:** L
**Priority:** Must

### Story S4: Create the tutorial repository protocol
**As a** coding student
**I want** a cloned repository with guided steps and deterministic checks connected to my activity
**So that** We Do practice happens in a real development workflow while support fades safely.

**Acceptance Criteria:**
- Given a tutorial repository, When its manifest validates, Then activity/graph versions, ordered steps, allowed files, commands, checks, hints, reveals, resource references, and completion criteria are explicit.
- Given `pnpm tutorial:check --step <id>`, When checks run locally, Then only allowlisted structured results are produced; secrets, arbitrary files, and untrusted command output are not uploaded.
- Given authenticated reporting, When a learner submits a check result, Then short-lived activity credentials, replay protection, idempotency, tenant ownership, and server validation prevent spoofed cross-user evidence.
- Given fading scaffolds, When steps advance, Then prompts and hints diminish while deterministic success criteria remain stable.

**Estimate:** XL
**Priority:** Must

### Story S5: Prove the Codecamp vertical slice
**As a** Codecamp learner
**I want** one coherent I Do and We Do sequence inside the existing lesson flow
**So that** the new runtime proves learning value before all curriculum is rewritten.

**Acceptance Criteria:**
- Given one approved objective sequence, When the learner completes the activity, Then video checkpoints, diagrams, tutorial steps, checks, hints, replay, and evidence are visible as one session.
- Given the current plain iframe content, When migrated, Then stable resource IDs replace ad-hoc fields without breaking unaffected lessons.
- Given Next and a Vinext test host, When the package is consumed, Then framework adapters remain thin and the React/core packages require neither framework.
- Given product-owner verification, When the slice closes, Then learner experience, teacher evidence, mobile/accessibility behavior, and persistence are approved before mass migration.

**Estimate:** L
**Priority:** Must

## Non-Functional Requirements

- Core package has no React, Next, Vinext, DB, auth, or provider imports.
- React package has no Next/Vinext routing, server, or database imports.
- Client events are bounded/batched; no per-second database heartbeat stream.
- More than 80% shared-package coverage plus real-player browser tests.
- YouTube integration follows current embedded-player policies and CSP requirements.
- Activity content is bilingual-aware and supports accessible non-video alternatives.

## Track-Level Acceptance Criteria

- Strict contracts, migrations, authoring fixtures, and counterexamples pass.
- React player works with YouTube and hosted adapters and passes accessibility/mobile checks.
- Tutorial checker cannot upload secrets or execute undeclared remote instructions.
- Activity evidence round-trips through Mastery without app-specific translation.
- Codecamp and one Vinext-compatible fixture consume the same core/React exports.
- Lint, type-check, tests, coverage, build, Playwright, graph, generated docs, and doctor pass.

## Out of Scope

- General H5P import/export compatibility.
- Hosting or transcoding a full video library.
- Automated video generation.
- The targeted tutor's model/prompt implementation.
- Rewriting all Codecamp lessons in the first delivery.
