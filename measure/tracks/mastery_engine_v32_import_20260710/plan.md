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

- [x] Task: Define v3.2 contracts and acceptance fixtures — `45e27bcf`
  - [ ] Encode normative readiness, retention, placement, calibration, evidence, utility, queue, and session examples before implementation
  - [ ] Add counterexamples for hard-gate compensation, mean retention, inflated evidence, synthetic prerequisites, and overdue ordering
- [x] Task: Write Red tests for v3, v3.1, and v3.2 deltas — `f9af2f18`
  - [ ] Split tests by specification section and include deterministic clocks/config versions
  - [ ] Confirm each test fails for the expected v2 behavior
- [x] Task: Implement migrations in normative order — `5835f886`
  - [ ] Apply state/readiness/retention, queue, placement, calibration/evidence, utility, diversity, and session-composition changes
  - [ ] Preserve public contracts where possible and version every unavoidable break
- [x] Task: Verify and document Phase S2 — `5835f886`
  - [ ] Run full suites, property/counterexample tests, coverage, graph update/audit, generated docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S2: Migrate correctness to v3.2' (Protocol in workflow.md)

  - Green evidence: the aggregate normative contract is green (`16` files,
    `54/54` assertions) after a Red baseline of `16` failing files,
    `41` expected failures, and `2` compatibility controls. Slice-level
    check-types and builds passed for all four packages; lint passed with no
    new errors and only the four inherited `srs-engine` warnings.
  - Implemented corrections cover gated readiness, symmetric progress trend,
    elapsed-time/minimum retention, placement seeding and two-probe walking,
    Wilson/guess-floor evidence, staged rating, conditioned/stratified edge
    calibration, retention-ordered backlog queues, priority retention,
    deterministic replay evaluation, normalized/diverse utility-led planning,
    review-load gating, and deterministic session composition.
  - Review remediation: `3272e98c` made the contracts package-public, added
    strict numeric/replay boundaries, connected placement, timing, evidence,
    planner, queue, and release-governance paths, and reconciled superseded v2
    suites. `e8d317b7` then closed the remaining frontier-stall, sample-cap,
    reveal/severity ingestion, actual FSRS-parameter artifact, default bounded
    composition, sparse ready-threshold, and export-snapshot gaps.
    `097545f1` finally preserved capped remediation-only queues when no ordinary
    review cards are due.
  - Final focused evidence before re-audit: original normative suite `54/54`,
    public/boundary remediation suite `53/53`, SRS `303/303`, planner
    `421/421`, placement `133/133`, and import/export contract `13/13`.

## Phase S3: Add portable persistence adapters
_Story ref: spec.md#story-s3_

- [x] Task: Freeze storage-port and database contracts — `17fa0cab`
  - [ ] Define card, review-log, evidence, state, placement, calibration, config, provenance, and idempotency schemas
  - [ ] Classify all new Drizzle tables in the tenant registry before migration generation
- [x] Task: Write adapter and transaction tests — `257c39fd`
  - [ ] Run one contract suite against in-memory and PGlite/Drizzle adapters
  - [ ] Add tenant isolation, duplicate submission, retry, rollback, concurrent update, and replay tests
- [x] Task: Implement schema, migrations, and adapters — `08e942a2`
  - [ ] Generate/review Drizzle migrations and implement transport-independent domain orchestration
  - [ ] Keep all database/provider concerns outside core packages
- [x] Task: Verify and document Phase S3 — `08e942a2`
  - [ ] Run migration doctor, adapter tests, affected package gates, graph update/audit, generated docs, and doctor
  - [ ] Task: Measure - User Manual Verification 'Phase S3: Add portable persistence adapters' (Protocol in workflow.md)

  - Green evidence: the shared persistence contract passes against both the
    in-memory and PGlite/Drizzle adapters, with transaction orchestration and
    schema coverage included (`4` files, `58/58` assertions). Tenant-registry
    coverage passes (`28/28`), and schema, Drizzle, migration-journal, and
    sentinel integrity pass together (`41/41`).
  - The implementation adds seven school-scoped FLAT tables, Zod-validated
    provider-neutral persistence ports, matching in-memory and Drizzle
    adapters, and commit orchestration covering idempotency, atomic rollback,
    concurrent updates, provenance, audit metadata, and the no-evidence rule.
  - A live migration-ledger doctor could not connect because neither
    `DIRECT_DATABASE_URL` nor `DATABASE_URL` is configured in this workspace;
    the offline migration journal and sentinel contracts pass. Browser review
    is not applicable to this package-only phase; user-facing browser
    acceptance remains mandatory for Tracks 2–5.

- [x] Task: Remediate failed Phase S3 independent reviews — `b951d696`, `4505666f`, `a7312a12`, `2ffd496a`, `61937c56`
  - [ ] Unify the public orchestration and adapter contracts and prove the real
    Drizzle path with PGlite transaction, rollback, CAS, retry, and replay tests
  - [ ] Bind persistence to an authenticated school and enforce student owner
    identity plus immutable card/state natural keys at the database boundary
  - [ ] Canonicalize request/result digests, align identifier contracts, and
    preserve provider-neutral infrastructure/retry error semantics
  - [ ] Carry calibration release evidence and restore the frozen placement and
    calibration uniqueness contracts across schema, migration, and tests
  - [ ] Add reproducible 0026/0027 Drizzle snapshots, DB-free public imports,
    exact cross-adapter parity, complete graph coverage, and >80% branch coverage

  - Remediation Green evidence: the canonical domain/public slice passes `26/26`,
    the hardened schema/migration slice passes `44/44`, the original plus
    adversarial Drizzle slice passes `29/29`, and the post-TenantDB aggregate
    passes `10` files and `118/118` assertions.
  - Coverage now exceeds the track threshold on every executable metric:
    statements `90.6%`, branches `80.76%`, functions `100%`, and lines `92.18%`
    across the canonical service, in-memory adapter, and Drizzle adapter.
  - The implementation now uses one public schema/type/service/port, DB-free
    package subpaths, a school-and-actor-bound lazily created TenantDB, composite
    user/card/review ownership constraints, internally canonicalized digests,
    complete calibration governance evidence, reconstructed 0026/0027 snapshots,
    and a non-destructive 0028 tenant-hardening migration.
- [x] Task: Re-run Phase S3 reviews and acceptance — `bc582c80`, `d6b8be6f`, `4565377b`, `636cc09c`
  - [ ] Re-run correctness, security/boundary, and API/DX audit roles until all pass
  - [ ] Run phase acceptance and adversarial gates; record browser review as not
    applicable only because this phase exposes no user-facing route or component

  - Final acceptance: all three independent re-audits pass with no blocker;
    phase acceptance and adversarial mechanical gates pass. The UX audit proves
    browser review is not applicable from `38` track-owned paths with zero app,
    route, page, component, style, or React/Next changes.

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
