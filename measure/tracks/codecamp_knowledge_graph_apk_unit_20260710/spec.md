# Specification: Codecamp Knowledge Graph and APK Game-Creation Unit

## Overview

Give Codecamp a validated, practice-ready coding knowledge graph and prove it with an
Advantage Play Kit game-creation unit whose worked, guided, and independent activities
emit graph-linked evidence. The graph is authored under the normative Code domain in
`~/Desktop/mastery-advantage/code/`, versioned, reviewed, and ingested through a shared
domain adapter. Curriculum modules remain instructional containers; granular objectives
and prerequisite edges drive readiness, evidence, remediation, and SRS.

This track depends on `mastery_engine_v32_import_20260710` for schemas and runtime. The
game unit depends on the stable contracts of `advantage_play_kit_20260710`; it must not
teach copied app-private game code.

## Stories

### Story S1: Author the coding knowledge graph
**As a** Codecamp learner
**I want** coding skills decomposed into explicit prerequisite objectives
**So that** the platform can identify what I am ready to learn and where I need remediation.

**Acceptance Criteria:**
- Given the Mastery graph schema, When `code-knowledge-space.json` is validated, Then every node/edge/priority/domain/status field is valid, IDs are stable, prerequisite cycles are rejected, and graph/version provenance is present.
- Given coding concepts and technologies, When nodes are authored, Then language-agnostic concepts, technology-specific applications, professional workflow, testing, architecture, and game-development skills are distinguishable without duplicating equivalent objectives.
- Given hard and soft prerequisites, When weights are reviewed, Then hard gates represent genuine inability to proceed and softer support relationships cannot accidentally gate progression.
- Given Codecamp's audience, When external frameworks are referenced, Then CSTA/Thai ICT or other standards are mappings/projections rather than forced replacements for product-specific objectives.

**Estimate:** XL
**Priority:** Must

### Story S2: Bind the existing curriculum
**As a** curriculum maintainer
**I want** current lessons, questions, exercises, repositories, and rubrics mapped to objectives and variants
**So that** existing student work can become structured evidence rather than simple completion.

**Acceptance Criteria:**
- Given the 19 current modules, When bindings are validated, Then every published assessed activity references existing objective IDs, appropriate practice modes, variants, evidence weights, and misconception tags.
- Given theory/video/diagram content, When it is mapped, Then exposure resources are distinguishable from assessed evidence.
- Given quizzes and repository work, When variants are assigned, Then repeated formats do not falsely count as independent triangulation.
- Given an unmapped or retired objective, When seed/build gates run, Then publication fails with actionable diagnostics rather than silently dropping evidence.

**Estimate:** L
**Priority:** Must

### Story S3: Design the APK learning branch
**As a** student learning game development
**I want** a prerequisite-aware path from web fundamentals to APK cartridge development
**So that** I can build a real educational game without being dropped into an unsupported capstone.

**Acceptance Criteria:**
- Given existing JavaScript, TypeScript, React, testing, and Git objectives, When the game branch is computed, Then it reuses those prerequisites and adds granular game-loop, state, Phaser lifecycle, input, physics, APK contract, React host, testing, accessibility, asset, and performance objectives.
- Given an APK objective, When its blueprint is reviewed, Then it includes worked-example, guided-practice, independent-practice, grading, variant, hint, reveal, and misconception specifications.
- Given the established APK ABI, When students build cartridges, Then learning activities preserve cartridge manifests, educational inputs/results, host responsibility, and client-only Phaser isolation.
- Given multiple practice variants, When mastery is assessed, Then code reading/debugging, guided extension, and independent construction provide distinct evidence rather than requiring repeated full games.

**Estimate:** L
**Priority:** Must

### Story S4: Publish the game-creation unit
**As a** Codecamp student
**I want** tutorial-first I Do, We Do, and You Do game-development activities
**So that** I can move from observation through supported construction to independent transfer.

**Acceptance Criteria:**
- Given I Do, When the unit begins, Then an instructor-built cartridge is explained through video segments, diagrams, annotated diffs, prediction questions, and a complete reference artifact.
- Given We Do, When the student clones the tutorial repository, Then step manifests, deterministic checks, fading hints, curated remediation, and targeted tutoring guide a distinct cartridge implementation.
- Given You Do, When the student receives the independent brief, Then they build a materially different educational cartridge, run required checks, and submit a PR evaluated against graph-linked objectives.
- Given scaffolded and independent attempts, When evidence reaches Mastery, Then practice mode, hints, reveals, checks, variants, and confidence remain visible and correctly weighted.
- Given current learners and unit numbering, When the new unit is introduced, Then migration/version rules prevent in-progress cohorts from losing or misattributing progress.

**Estimate:** XL
**Priority:** Must

## Non-Functional Requirements

- Graph and binding schemas use strict Zod validation with human-readable diagnostics.
- Graph content is deterministic, reviewable JSON/data; runtime inference cannot mutate it.
- Curriculum text remains bilingual-aware and accessible; code and technical vocabulary stay precise.
- Student activities use shared APK/activity packages and no copied app-private source.
- Graph changes require version bumps and migration impact reports.

## Track-Level Acceptance Criteria

- The complete graph passes schema, acyclicity, referential-integrity, weight, and coverage gates.
- At least one current Codecamp objective sequence runs end to end before mass mapping.
- The APK branch passes human curriculum review and product-owner manual verification.
- Every assessed unit activity has objective/variant/rubric bindings; exposure-only resources cannot mutate mastery.
- Graph ingestion, seed, lint, type-check, tests, build, coverage, graph update/audit, generated docs, and doctor pass.

## Out of Scope

- Implementing the shared engine or video/tutorial runtime.
- Completing the entire APK cartridge rebuild catalog.
- Replacing professional human curriculum review with graph generation.
- Migrating other Advantage domain graphs.
- Declaring an objective mastered from one approved PR.
