# Implementation Plan: Shared Interactive Video and Tutorial Runtime

> **Browser acceptance:** Exercise every user-facing runtime feature in the
> live host app with the in-app browser. Evidence must cover video playback and
> seeking, timestamp checkpoints, answer/remediation loops, diagram behavior,
> tutorial-step verification, persistence after reload, keyboard/mobile flows,
> and the resulting learner/teacher state; screenshots are required at key
> state transitions.

## Phase S1: Freeze the activity contracts [checkpoint: 08de1c28]
_Story ref: spec.md#story-s1_
_Graph context: current `LessonContent` exposes only app-local `youtubeId`/`imagePath`; no shared interactive-video symbols or persistence path exist._

- [x] Task: Define package boundaries and versioned schemas — `7db9bbe2`
  - [x] Create core contracts for activities, sources, segments, checkpoints, questions, remediation, tutorial steps, and events
  - [x] Define subpath exports for core, React, server ports, authoring, and testing
- [x] Task: Write schema and migration tests — `f16aeef9`
  - [x] Add valid fixtures plus unknown-version, duplicate-ID, dangling-resource, invalid-time, and evidence-mapping counterexamples
  - [x] Prove resource IDs, not model-generated timestamps/paths, are authoritative
- [x] Task: Implement the core state machine and authoring validator — `0a017ed3`
  - [x] Normalize playback/checkpoint/tutorial transitions without framework dependencies
  - [x] Map assessed results and support metadata into shared practice envelopes
- [x] Task: Verify and document Phase S1 — `08de1c28`
  - [x] Run package boundary, lint, type-check, tests, coverage, build, graph update/audit, generated docs, and doctor
  - [x] Task: Measure - User Manual Verification 'Phase S1: Freeze the activity contracts' (Protocol in workflow.md) — browser N/A; distribution verified

## Phase S2: Build interactive video for React
_Story ref: spec.md#story-s2_

- [x] Task: Freeze player and accessibility contracts — `55725748`
  - [x] Define provider adapter, controller, UI state, checkpoint, transcript, diagram, and replay APIs
  - [x] Record YouTube versus hosted-media gating rules as executable policy tests
- [x] Task: Write component and browser Red tests — `a51e7fd1`, `6cec0819`
  - [x] Cover player states, time/range sampling, cue points, seeking, replay, questions, feedback, errors, and reconnects
  - [x] Cover keyboard/touch, focus, captions/transcript, reduced motion, screen reader, responsive layout, CSP, and Thai route propagation
- [x] Task: Implement React player and source adapters — `f4f78ce8`, `55725748`, `ed108506`
  - [x] Build YouTube IFrame API and hosted HTML5 adapters behind one controller
  - [x] Render checkpoint, diagram, transcript, resource, and non-blocking remediation surfaces
- [x] Task: Verify and document Phase S2 — `27cfc85f`, `8acb481f`
  - [x] Run unit/browser/accessibility/mobile/performance gates and manually verify provider policy behavior
  - [x] Task: Measure - User Manual Verification 'Phase S2: Build interactive video for React' (Protocol in workflow.md) — Kimi English/Thai walkthrough and six Playwright scenarios passed

  - Green evidence: Activity React type-check/lint and 17/17 tests pass. The
    sequential Playwright gate passes 6/6 across desktop and mobile Chrome,
    including keyboard playback, reload persistence, reduced motion, responsive
    controls, and Thai route integration.
  - Review evidence: independent review found and verified remediation for hosted
    hard-gate bypass, real provider events/errors, resume validation, bilingual
    host propagation, and hosted caption updates. See `plan-review.md`.
  - Browser evidence: Kimi WebBridge exercised the live YouTube iframe,
    checkpoint, wrong/correct feedback, replay, transcript, diagram, persisted
    state, and Thai localization. Screenshots are in `browser-evidence/`.

## Phase S3: Persist activity evidence
_Story ref: spec.md#story-s3_

- [~] Task: Define event, session, API, and database contracts
  - [ ] Specify batching, watched-range compression, idempotency, device resume, ownership, retention, and audit metadata
  - [ ] Classify new tables and define transport-independent domain operations
- [~] Task: Write persistence and projection tests
  - [ ] Cover duplicates, reordering, reconnects, multiple tabs, malicious timestamps, cross-tenant access, and transaction rollback
  - [ ] Verify engagement is contextual and only assessed events become correctness evidence
- [~] Task: Implement migrations, domain functions, and adapters
  - [ ] Add thin tRPC/HTTP adapters and server-authoritative validation
  - [ ] Project normalized sessions into practice evidence and teacher-readable summaries
- [~] Task: Verify and document Phase S3
  - [ ] Run migration/tenant/security/load tests, affected gates, graph update/audit, generated docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Persist activity evidence' (Protocol in workflow.md)

## Phase S4: Create the tutorial repository protocol
_Story ref: spec.md#story-s4_

- [~] Task: Define manifest, checker, and credential contracts
  - [ ] Specify step/check/hint/reveal/resource/result schemas and allowlisted command/file behavior
  - [ ] Define short-lived activity tokens, submission signing/replay protection, and server verification
- [~] Task: Write adversarial checker and reporting tests
  - [ ] Cover secret files, path traversal, undeclared commands, output injection, forged results, stale tokens, duplicates, and offline recovery
  - [ ] Prove deterministic checks produce identical evidence for identical repository states
- [~] Task: Implement tutorial CLI/test kit and reporting bridge
  - [ ] Build repository scaffolding helpers, local check runner, structured output, and safe upload client
  - [ ] Build server verification and map step results/hints/reveals into activity evidence
- [~] Task: Verify and document Phase S4
  - [ ] Run security, cross-platform, offline, fixture-repo, package, graph, generated-doc, and doctor gates
  - [ ] Task: Measure - User Manual Verification 'Phase S4: Create the tutorial repository protocol' (Protocol in workflow.md)

## Phase S5: Prove the Codecamp vertical slice
_Story ref: spec.md#story-s5_

- [~] Task: Select and freeze the pilot activity
  - [ ] Choose one graph-approved objective sequence with existing video/diagram inputs and a bounded tutorial repository
  - [ ] Define expected student, teacher, evidence, and framework-host outcomes
- [~] Task: Write integration and E2E Red tests
  - [ ] Cover content load, checkpoint/replay, clone/check/report, resume, progress projection, and legacy-lesson fallback
  - [ ] Add Next and Vinext-compatible consumption fixtures
- [~] Task: Integrate the pilot without app-local forks
  - [ ] Replace plain embed behavior only for the versioned pilot activity
  - [ ] Wire sessions/evidence and preserve unaffected lesson rendering/progress
- [~] Task: Verify and close the vertical slice
  - [ ] Run affected/root gates and conduct student-like, teacher, mobile, accessibility, offline/reconnect, and product-owner walkthroughs
  - [ ] Task: Measure - User Manual Verification 'Phase S5: Prove the Codecamp vertical slice' (Protocol in workflow.md)
