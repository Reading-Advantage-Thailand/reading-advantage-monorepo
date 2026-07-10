# Implementation Plan: Shared Interactive Video and Tutorial Runtime

## Phase S1: Freeze the activity contracts
_Story ref: spec.md#story-s1_
_Graph context: current `LessonContent` exposes only app-local `youtubeId`/`imagePath`; no shared interactive-video symbols or persistence path exist._

- [~] Task: Define package boundaries and versioned schemas
  - [ ] Create core contracts for activities, sources, segments, checkpoints, questions, remediation, tutorial steps, and events
  - [ ] Define subpath exports for core, React, server ports, authoring, and testing
- [~] Task: Write schema and migration tests
  - [ ] Add valid fixtures plus unknown-version, duplicate-ID, dangling-resource, invalid-time, and evidence-mapping counterexamples
  - [ ] Prove resource IDs, not model-generated timestamps/paths, are authoritative
- [~] Task: Implement the core state machine and authoring validator
  - [ ] Normalize playback/checkpoint/tutorial transitions without framework dependencies
  - [ ] Map assessed results and support metadata into shared practice envelopes
- [~] Task: Verify and document Phase S1
  - [ ] Run package boundary, lint, type-check, tests, coverage, build, graph update/audit, generated docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Freeze the activity contracts' (Protocol in workflow.md)

## Phase S2: Build interactive video for React
_Story ref: spec.md#story-s2_

- [~] Task: Freeze player and accessibility contracts
  - [ ] Define provider adapter, controller, UI state, checkpoint, transcript, diagram, and replay APIs
  - [ ] Record YouTube versus hosted-media gating rules as executable policy tests
- [~] Task: Write component and browser Red tests
  - [ ] Cover player states, time/range sampling, cue points, seeking, replay, questions, feedback, errors, and reconnects
  - [ ] Cover keyboard/touch, focus, captions/transcript, reduced motion, screen reader, responsive layout, and CSP
- [~] Task: Implement React player and source adapters
  - [ ] Build YouTube IFrame API and hosted HTML5 adapters behind one controller
  - [ ] Render checkpoint, diagram, transcript, resource, and non-blocking remediation surfaces
- [~] Task: Verify and document Phase S2
  - [ ] Run unit/browser/accessibility/mobile/performance gates and manually verify provider policy behavior
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Build interactive video for React' (Protocol in workflow.md)

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
