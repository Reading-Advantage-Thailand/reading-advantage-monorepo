# Implementation Plan

## Phase 1: Canonical Curriculum Contract

- [x] Task: Define failing tests for curriculum identifiers and structured content contracts
  - [x] Add tests for unit and lesson slugs, lesson types, and required mappings
  - [x] Confirm current seed/content assets expose the expected gaps
- [x] Task: Finalize the canonical curriculum schema
  - [x] Define stable ID and slug rules across units, lessons, and questions
  - [x] Extend the structured content contract to cover all planned lesson types
- [x] Task: Align Prisma and validation boundaries
  - [x] Update database and validation layers to match the canonical curriculum contract
  - [x] Ensure import-time validation can reject malformed content precisely
- [x] Task: Measure - Manual Verification 'Canonical Curriculum Contract'
  - [x] Verify schema examples for explicit instruction, lab, review, and summative lessons

## Phase 2: Source-of-Truth Content Migration

## Phase 2: Source-of-Truth Content Migration

- [x] Task: Define failing tests for Grade 3 and Grade 4 content migration
  - [x] Codify expected unit counts, lesson-type coverage, and standards mapping
  - [x] Confirm archived scope/sequence assumptions against migrated assets
- [x] Task: Normalize Grade 3 scope-and-sequence into canonical assets
  - [x] Convert the active Grade 3 planning model into validated curriculum data
  - [x] Ensure question banks and lesson types line up with the planned rhythm
- [~] Task: Normalize Grade 4 rich content into the same contract
  - [ ] Upgrade lesson files, questions, and mappings to canonical naming and validation rules
  - [ ] Reconcile media references and translation requirements
- [ ] Task: Measure - Manual Verification 'Source-of-Truth Content Migration'
  - [ ] Seed and inspect representative Grade 3 and Grade 4 curriculum records locally

## Phase 3: Import and Release Tooling

- [ ] Task: Implement curriculum validation and release scripts
  - [ ] Add deterministic validation, import, and reporting tools for content operations
  - [ ] Document how content changes move from source files into the app
- [ ] Task: Measure - Manual Verification 'Import and Release Tooling'
  - [ ] Verify a content edit can be validated, seeded, and reviewed end to end
