# Specification: Mastery Engine v3.2 Import and Shared Runtime

## Overview

Deliver a provider-neutral, app-neutral, v3.2-correct KST+SRS runtime that Codecamp
can use as the first production vertical slice and every Advantage app can consume
later. Import the implemented v2 packages from `~/Desktop/ra-math-advantage`, retain
their provenance and behavioral tests, then apply the learner-correctness migrations
defined by `~/Desktop/mastery-advantage/SPECIFICATION.md` and `MIGRATION-v3.md`.

The runtime implementation becomes canonical in this monorepo. The
`mastery-advantage` repository remains normative for specifications and domain graphs;
`ra-math-advantage` must consume the extracted shared packages rather than retain a
drifting copy.

## Stories

### Story S1: Import the proven v2 core
**As a** platform developer
**I want** the four existing framework-neutral engine packages imported with their tests and provenance intact
**So that** the shared runtime starts from demonstrated behavior rather than a rewrite.

**Acceptance Criteria:**
- Given the source packages, When they enter the workspace, Then `knowledge-space-core`, `knowledge-space-practice`, `srs-engine`, and `practice-core` retain app-neutral boundaries and their original tests pass before behavior changes.
- Given monorepo naming, When package scopes change, Then only import/export paths and build configuration change in the import commit; algorithm behavior is unchanged.
- Given package boundary guards, When tests scan imports, Then engine packages contain no React, Next, Vinext, Drizzle, Convex, app-private, provider-SDK, or transport dependencies.
- Given source provenance, When an auditor inspects the import, Then source commit, spec version, license/ownership, and any mechanical deviations are recorded.

**Estimate:** L
**Priority:** Must

### Story S2: Migrate correctness to v3.2
**As a** learner
**I want** readiness, retention, placement, evidence, and session planning to follow the current normative contract
**So that** the engine does not make known-wrong learning decisions inherited from v2.

**Acceptance Criteria:**
- Given v3 hard prerequisites, When readiness is computed, Then gated weighted readiness prevents compensation past an unmet hard gate.
- Given practice-variant cards, When retention is projected, Then objective retention uses elapsed time and the minimum across reviewed variants as specified.
- Given placement, calibration, hint/reveal/timing evidence, and review queues, When normative examples from v3, v3.1, and v3.2 run, Then every expected state and ranking is reproduced deterministically.
- Given prerequisite-sparse domains, When a domain utility provider is registered, Then utility-led ranking works without synthetic prerequisite edges and records versioned provenance.
- Given session composition, When due load exceeds the configured budget, Then backlog behavior, diversity caps, interleaving, and review-load projections match v3.2.

**Estimate:** XL
**Priority:** Must

### Story S3: Add portable persistence adapters
**As an** application backend
**I want** typed storage ports plus Drizzle implementations for cards, reviews, evidence, state, placement, and calibration
**So that** apps can use one engine without coupling algorithms to PostgreSQL or transport code.

**Acceptance Criteria:**
- Given engine storage ports, When in-memory and Drizzle adapters execute the same contract suite, Then their observable results match.
- Given a student submission, When evidence and SRS state are committed, Then idempotency, transaction boundaries, tenant ownership, and audit metadata prevent duplicate or cross-school mutation.
- Given referential tables, When TenantDB requires manual scoping, Then owner-FK joins and greppable `unscoped(reason)` use are explicit and tested.
- Given a provider or model failure upstream, When no validated evidence exists, Then no mastery/card mutation occurs.

**Estimate:** L
**Priority:** Must

### Story S4: Establish runtime governance
**As a** maintainer of multiple Advantage products
**I want** one versioned release and compatibility policy for the shared engine
**So that** math, Codecamp, Reading, Science, Chinese, and future apps cannot drift onto incompatible forks.

**Acceptance Criteria:**
- Given package releases, When a consumer upgrades, Then contract, schema, graph, and migration compatibility are explicit and semantically versioned.
- Given `ra-math-advantage`, When extraction completes, Then it consumes the canonical packages or a reproducible workspace release rather than its original package copies.
- Given future v3.x changes, When the normative specification changes, Then acceptance fixtures land before implementation and every consumer can run compatibility tests.
- Given generated architecture and package documentation, When Measure doctor and graph audit run, Then package boundaries and consumers are discoverable and current.

**Estimate:** M
**Priority:** Must

## Non-Functional Requirements

- TypeScript strict mode, Zod contracts, JSDoc on all exports, and more than 80% coverage.
- Deterministic clocks/randomness in algorithm tests; no wall-clock or network dependence.
- Algorithms remain pure where practical and operate on injected ports/configuration.
- PostgreSQL/Drizzle code lives in adapter packages or backend modules, never core algorithms.
- Migration fixtures must include adversarial counterexamples, not only happy paths.

## Track-Level Acceptance Criteria

- Original v2 test suite passes immediately after import.
- All normative v3/v3.1/v3.2 examples pass before Codecamp production wiring begins.
- In-memory and Drizzle adapter contract suites pass.
- Package boundary, type-check, lint, test, build, coverage, graph, generated-doc, and doctor gates pass.
- A minimal synthetic Codecamp domain can compute readiness, accept evidence, schedule a review, and project the next activity without importing app code.

## Out of Scope

- Authoring any domain graph or curriculum.
- Migrating legacy app progress into engine state.
- Building student or teacher UI.
- Running model inference inside engine packages.
- Deploying Codecamp integration before downstream tracks complete.
