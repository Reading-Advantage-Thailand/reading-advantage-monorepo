# Plan: Primary Knowledge State (T3)

Track `primary_knowledge_state_20261007`. Spec: [spec.md](./spec.md). Build after the freeze, on
lane-h, with no deploy before the migration window that the owner picks.

Order: S1 → S2 → S3 → S4 → S5 → S6 → S7.

## Phase S1: Graph slice
_Story ref: spec.md#story-s1-graph-slice_
_Blast radius: `packages/domain/src/primary-mastery/objective-key.ts` (`GRAPH_RELEASE`) and its users in the same module._

- [ ] Task: Contract & Schema Definition
    - [ ] `graphSliceSchema` (nodes, edges, domains, release) and a slice configuration (domains, GSE range, word lists) in `primary-mastery/knowledge-state-contracts.ts`
- [ ] Task: Test
    - [ ] The slice holds the expected node counts per domain for the pinned release; an unknown domain in the configuration loads; the cache returns the same object
- [ ] Task: Implement
    - [ ] A build script that derives the slice data package from the pinned graph files (ids, kinds, GSE, skill, edges; no source text beyond what the graph already holds); a loader with an in-process cache
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`
- [ ] Task: Measure - User Manual Verification 'Phase S1: Graph slice' (Protocol in workflow.md)

## Phase S2: Student knowledge state
_Story ref: spec.md#story-s2-student-knowledge-state_

- [ ] Task: Contract & Schema Definition
    - [ ] Input and output schemas of `getStudentKnowledgeState` (state per objective, confidence, fringe, versions)
- [ ] Task: Test
    - [ ] Mock DB per `__tests__/mock-db.ts`: cards, evidence, and vocabulary flashcards map to the expected state; a cross-tenant request is refused; two runs give the same result and no write
- [ ] Task: Implement
    - [ ] Load `mastery_cards`, `mastery_evidence`, and the student's VOCABULARY `flashcard_cards` (FSRS fields) through TenantDB; call `buildKstState` with the slice
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`
- [ ] Task: Measure - User Manual Verification 'Phase S2: Student knowledge state' (Protocol in workflow.md)

## Phase S3: Cold start
_Story ref: spec.md#story-s3-cold-start_

- [ ] Task: Contract & Schema Definition
    - [ ] The level-to-GSE-range table as data (Primary levels 1-9)
- [ ] Task: Test
    - [ ] A student at level N with no evidence; a student with no level
- [ ] Task: Implement
    - [ ] Seed the state before `buildKstState` when no evidence exists
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc
- [ ] Task: Measure - User Manual Verification 'Phase S3: Cold start' (Protocol in workflow.md)

## Phase S4: Shadow log
_Story ref: spec.md#story-s4-shadow-log_
_Blast radius: `packages/domain/src/primary-mastery/evidence-jobs.ts` (the follow-up enqueue) and `packages/domain/src/tenant-registry.ts`._

- [ ] Task: Contract & Schema Definition
    - [ ] Table `primary_mastery_shadow_log` (FLAT) in `packages/db/src/schema/primary-mastery.ts`; additive migration; tenant classification; the log row schema
    - [ ] Job name `primary.mastery.shadow` on the `primary-mastery` queue
- [ ] Task: Test
    - [ ] One row per trigger; replay writes nothing new; the request path never computes state; screens unchanged (a snapshot test of the student home data)
- [ ] Task: Implement
    - [ ] Enqueue the follow-up after a committed evidence job; compute the state and `planRecommendedNext`; write the row
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; `build-graph update`; run `measure/doctor.sh`
- [ ] Task: Measure - User Manual Verification 'Phase S4: Shadow log' (Protocol in workflow.md)

## Phase S5: Level test readiness signal
_Story ref: spec.md#story-s5-level-test-readiness-signal_

- [ ] Task: Contract & Schema Definition
    - [ ] Readiness output per band and the threshold as data
- [ ] Task: Test
    - [ ] Ready, not ready, and "no evidence" cases per band
- [ ] Task: Implement
    - [ ] `computeLevelReadiness(state, slice)`; add the result to the shadow log row
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc
- [ ] Task: Measure - User Manual Verification 'Phase S5: Level test readiness signal' (Protocol in workflow.md)

## Phase S6: Projections for the later views
_Story ref: spec.md#story-s6-projections-for-the-later-views_

- [ ] Task: Contract & Schema Definition
    - [ ] Wrapper signatures for the student and class projections over the existing `projectStudentVisualization` and `projectTeacherVisualization`
- [ ] Task: Test
    - [ ] Bucket counts for a fixture student; heatmap counts for a fixture class; no student of another class
- [ ] Task: Implement
    - [ ] The two wrappers in the domain module (no UI)
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc
- [ ] Task: Measure - User Manual Verification 'Phase S6: Projections for the later views' (Protocol in workflow.md)

## Phase S7: Internal admin view
_Story ref: spec.md#story-s7-internal-admin-view_

- [ ] Task: Contract & Schema Definition
    - [ ] The admin read contract (state, fringe, last 20 log rows, readiness) and a SYSTEM-only permission check
- [ ] Task: Test
    - [ ] SYSTEM sees the page; every other role is refused; a secure item shows its objective and no text
- [ ] Task: Implement
    - [ ] A thin page under the Primary system area that calls the domain read
- [ ] Task: Generate Docs & Doctor
    - [ ] JSDoc; the verification run on the ETL clone (track criterion 2); captures for the owner
- [ ] Task: Measure - User Manual Verification 'Phase S7: Internal admin view' (Protocol in workflow.md)
