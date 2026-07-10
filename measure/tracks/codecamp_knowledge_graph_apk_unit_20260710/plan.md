# Implementation Plan: Codecamp Knowledge Graph and APK Game-Creation Unit

> **Browser acceptance:** Every learner- or teacher-visible graph, lesson,
> tutorial, game, PR, and mastery-state change must be exercised in the live
> Codecamp app with the in-app browser. Capture DOM/interaction evidence and
> screenshots at the student action, resulting feedback, persisted progress,
> and teacher-visible state; automated tests alone do not close a phase.

## Phase S1: Author the coding knowledge graph
_Story ref: spec.md#story-s1_
_Graph context: the parent Code domain is currently planning-only; this repo has curriculum/module symbols but no Codecamp objective-graph runtime nodes._

- [x] Task: Freeze graph taxonomy and authoring contracts — `779c1006`
  - [x] Define domains, node granularity, ID policy, edge semantics, priorities, status, provenance, and standards projections — `779c1006`
  - [x] Record reviewer roles and graph/version migration rules — `779c1006`
- [x] Task: Write graph validation and counterexample tests — `4ee63a98`
  - [x] Cover schema, duplicate IDs, dangling edges, cycles, hard-gate misuse, disconnected objectives, and invalid domain transfers — `afb217de`
  - [x] Add representative coding subgraphs before full authoring — `4ee63a98`
- [x] Task: Author and review the Codecamp graph — `2c9e012f`
  - [x] Build foundation, frontend, backend, data, testing, AI, workflow, deployment, architecture, and game-development clusters — `2c9e012f`
  - [x] Review prerequisite direction/weights and capture unresolved edges as draft rather than guessing approval — `afb217de`
- [x] Task: Verify and document Phase S1 — `afb217de`
  - [x] Run graph validator, fixtures, statistics, diff report, and human review checklist — `afb217de`
  - [x] Task: Measure - User Manual Verification 'Phase S1: Author the coding knowledge graph' (Protocol in workflow.md) — `afb217de`

  - Green evidence: the reviewed release contains 54 nodes and 139 edges across
    all ten required clusters, with 42 engine-parity hard gates, five soft
    supports, two standards projections, and zero disconnected objectives.
    Full tests pass 39/39; coverage is 93.45/85.79/92.10/93.46 and every
    typecheck, lint, build, validation, report, packed-artifact, and source-sync
    gate passes.
  - Provenance evidence: the normative graph is parent commit
    `dba65dccd519e77d83954c14fc4e136ab572dfe3`; source and packaged bytes share
    SHA-256 `f703c50db99244356b2d432c5abbef126f7e104dc7b4ca5f943cf4326ff1862a`.
  - Review evidence: independent re-audit passed after `afb217de` closed approval,
    publication, prerequisite-gate, monotonic-version, stable-ID, and
    test-inclusive type-safety findings. Browser acceptance is truthfully N/A
    because S1 owns no route, component, style, or learner interaction.

## Phase S2: Bind the existing curriculum
_Story ref: spec.md#story-s2_

- [~] Task: Define curriculum-binding contracts
  - [ ] Add strict objective, variant, mode, evidence-weight, misconception, rubric, and resource-reference schemas
  - [ ] Define exposure-only versus assessed activity semantics
- [~] Task: Write binding coverage tests
  - [ ] Fail on missing objective IDs, invalid variants, retired graph versions, duplicate evidence, and assessment/exposure confusion
  - [ ] Produce coverage reports by module, objective, activity mode, and evidence source
- [~] Task: Map one vertical slice then the published curriculum
  - [ ] Validate one existing module end to end before bulk binding
  - [ ] Bind lessons, questions, exercises, repositories, and rubrics without changing mastery state yet
- [~] Task: Verify and document Phase S2
  - [ ] Run seed/build/coverage gates and manually review low-coverage or over-assessed objectives
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Bind the existing curriculum' (Protocol in workflow.md)

## Phase S3: Design the APK learning branch
_Story ref: spec.md#story-s3_

- [~] Task: Freeze APK objective and blueprint contracts
  - [ ] Reconcile graph nodes with APK manifests, runtime lifecycle, educational I/O, React host, editions, testing, accessibility, and performance
  - [ ] Define worked/guided/independent specifications and distinct practice variants
- [~] Task: Write graph and blueprint tests
  - [ ] Verify reuse of existing prerequisites and reject duplicate technology objectives
  - [ ] Validate every APK objective has assessable blueprints, misconceptions, and remediation resources
- [~] Task: Author the game-development subgraph and unit blueprint
  - [ ] Create prerequisite edges from existing Codecamp skills into the APK branch
  - [ ] Define reference, tutorial, and independent cartridge outcomes with fading scaffolds
- [~] Task: Verify and document Phase S3
  - [ ] Run graph/blueprint validation and obtain APK maintainer plus curriculum-owner review
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Design the APK learning branch' (Protocol in workflow.md)

## Phase S4: Publish the game-creation unit
_Story ref: spec.md#story-s4_

- [~] Task: Define unit content and cohort-migration contracts
  - [ ] Specify unit placement, versioning, progress migration, pacing, assessment, and prerequisite behavior
  - [ ] Freeze resource IDs and activity IDs consumed by video/tutorial/tutor/PR tracks
- [~] Task: Write curriculum and end-to-end Red tests
  - [ ] Cover I Do/We Do/You Do completeness, graph binding, repo manifest, PR rubric, and in-progress cohort safety
  - [ ] Add accessibility, bilingual, media, and deterministic-check fixtures
- [~] Task: Implement and seed the unit
  - [ ] Add overview/class plans, seed data, videos/diagrams, tutorial repo, independent repo, rubrics, and SRS follow-ups
  - [ ] Integrate only against completed shared-runtime contracts; do not add app-local substitutes
- [~] Task: Verify and document Phase S4
  - [ ] Run affected gates, browser/manual tutorial and PR flows, graph update/audit, generated docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S4: Publish the game-creation unit' (Protocol in workflow.md)
