# Implementation Plan: Mastery Engine v3.2 Import and Shared Runtime

## Phase S1: Import the proven v2 core
_Story ref: spec.md#story-s1_
_Graph context: current graph has no engine-package nodes; existing `packages/domain/src/mastery/record-run.ts` is science-specific and is not an import target._

- [x] Task: Freeze source provenance and package contracts — `6aef37a7`
  - [ ] Record source commits, package manifests, exports, dependency boundaries, and baseline test commands
  - [ ] Define neutral `@reading-advantage/*` names and compatibility aliases without changing behavior
- [x] Task: Write import and boundary tests — `cda1b0bf`
  - [ ] Add workspace-discovery, export, dependency, and forbidden-import tests
  - [ ] Run the original v2 suites against the unmodified source baseline
- [x] Task: Import and mechanically adapt the four packages — `6aef37a7`
  - [ ] Copy source/tests through reviewable patches and update only scopes, imports, configs, and build outputs
  - [ ] Prove source equivalence or document every mechanical deviation
- [x] Task: Verify and document Phase S1 — `6aef37a7`
  - [ ] Run package lint, check-types, tests, builds, coverage, graph update/audit, and package-boundary gates
  - [ ] Task: Measure - User Manual Verification 'Phase S1: Import the proven v2 core' (Protocol in workflow.md)

  - Green evidence: focused import/boundary/build-export contract `10/10`
    passed after `c23dc536` and `60397049`; it builds all four packages, loads
    all 30 public runtime exports, verifies declaration targets, rejects
    forbidden imports, and requires every bare production import to be declared.
    All four package builds and type checks passed; lint passed with four
    inherited warnings in `srs-engine`. Normalized source comparison covered
    183 non-configuration files with zero unexplained differences and reviewed
    the remaining 16 workspace configuration files.
  - Retained-suite evidence: one Green run observed `srs-engine` at `233/233`;
    the correctness review reproduced the frozen source's documented 1 ms
    `Date.now()` boundary flake at `232/233`. Engine-behavior tests in the other
    packages passed. The remaining red assertions inspect ra-math
    repository-level specifications, Measure files, boundary scripts, CI
    workflows, or pre-ESM/config source shapes absent after the approved
    package/config import. These are inherited harness incompatibilities rather
    than algorithm differences; no v3 behavior was introduced.
  - Review evidence: correctness, provider/dependency boundaries, and API/DX
    audits all pass with no blocking or live-contract violations. UX browser
    review is not applicable because Phase S1 exposes packages rather than UI.

## Phase S2: Migrate correctness to v3.2
_Story ref: spec.md#story-s2_

- [~] Task: Define v3.2 contracts and acceptance fixtures
  - [ ] Encode normative readiness, retention, placement, calibration, evidence, utility, queue, and session examples before implementation
  - [ ] Add counterexamples for hard-gate compensation, mean retention, inflated evidence, synthetic prerequisites, and overdue ordering
- [~] Task: Write Red tests for v3, v3.1, and v3.2 deltas
  - [ ] Split tests by specification section and include deterministic clocks/config versions
  - [ ] Confirm each test fails for the expected v2 behavior
- [~] Task: Implement migrations in normative order
  - [ ] Apply state/readiness/retention, queue, placement, calibration/evidence, utility, diversity, and session-composition changes
  - [ ] Preserve public contracts where possible and version every unavoidable break
- [~] Task: Verify and document Phase S2
  - [ ] Run full suites, property/counterexample tests, coverage, graph update/audit, generated docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Migrate correctness to v3.2' (Protocol in workflow.md)

## Phase S3: Add portable persistence adapters
_Story ref: spec.md#story-s3_

- [~] Task: Freeze storage-port and database contracts
  - [ ] Define card, review-log, evidence, state, placement, calibration, config, provenance, and idempotency schemas
  - [ ] Classify all new Drizzle tables in the tenant registry before migration generation
- [~] Task: Write adapter and transaction tests
  - [ ] Run one contract suite against in-memory and PGlite/Drizzle adapters
  - [ ] Add tenant isolation, duplicate submission, retry, rollback, concurrent update, and replay tests
- [~] Task: Implement schema, migrations, and adapters
  - [ ] Generate/review Drizzle migrations and implement transport-independent domain orchestration
  - [ ] Keep all database/provider concerns outside core packages
- [~] Task: Verify and document Phase S3
  - [ ] Run migration doctor, adapter tests, affected package gates, graph update/audit, generated docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Add portable persistence adapters' (Protocol in workflow.md)

## Phase S4: Establish runtime governance
_Story ref: spec.md#story-s4_

- [~] Task: Define ownership and version policy
  - [ ] Record authoritative spec, implementation, graph, fixture, release, and consumer responsibilities
  - [ ] Define semantic-version and compatibility-matrix rules for engine/spec/graph versions
- [~] Task: Write consumer compatibility gates
  - [ ] Add fixture packages proving app-neutral consumption and release reproducibility
  - [ ] Add a synthetic Codecamp flow covering readiness, submission, SRS update, and projection
- [~] Task: Cut consumers over to canonical packages
  - [ ] Replace or retire duplicate ra-math package sources under a linked change plan
  - [ ] Document upgrade/migration procedures for future Advantage apps
- [~] Task: Close and verify the shared runtime
  - [ ] Run root affected gates, package publication/dry-run checks, graph/generate/doctor, and cross-repo compatibility evidence
  - [ ] Task: Measure - User Manual Verification 'Phase S4: Establish runtime governance' (Protocol in workflow.md)
