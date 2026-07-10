# Implementation Plan: Codecamp Knowledge Graph and APK Game-Creation Unit

## Phase S1: Author the coding knowledge graph
_Story ref: spec.md#story-s1_
_Graph context: the parent Code domain is currently planning-only; this repo has curriculum/module symbols but no Codecamp objective-graph runtime nodes._

- [~] Task: Freeze graph taxonomy and authoring contracts
  - [ ] Define domains, node granularity, ID policy, edge semantics, priorities, status, provenance, and standards projections
  - [ ] Record reviewer roles and graph/version migration rules
- [~] Task: Write graph validation and counterexample tests
  - [ ] Cover schema, duplicate IDs, dangling edges, cycles, hard-gate misuse, disconnected objectives, and invalid domain transfers
  - [ ] Add representative coding subgraphs before full authoring
- [~] Task: Author and review the Codecamp graph
  - [ ] Build foundation, frontend, backend, data, testing, AI, workflow, deployment, architecture, and game-development clusters
  - [ ] Review prerequisite direction/weights and capture unresolved edges as draft rather than guessing approval
- [~] Task: Verify and document Phase S1
  - [ ] Run graph validator, fixtures, statistics, diff report, and human review checklist
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Author the coding knowledge graph' (Protocol in workflow.md)

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
