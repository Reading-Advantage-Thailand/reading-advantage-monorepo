# Spec: Curriculum Data Foundation

## Overview

Create the data and tooling base for the planned curriculum. The product needs a
single authoritative curriculum model that can express Grade 3 scope-and-
sequence, Grade 4 rich lesson content, standards mapping, question banks, media
references, and canonical slugs without relying on scattered legacy docs.

## Functional Requirements

### FR-1: Canonical curriculum hierarchy

- Represent framework, grade, unit, lesson, assessment, and question
  relationships unambiguously.
- Define stable IDs and human-readable slugs for units and lessons.

### FR-2: Adopt a single structured lesson contract

- The structured JSON lesson schema must be the canonical rendering and import
  model.
- Lesson types must support at least explicit instruction, lab, fun review, and
  summative assessment.

### FR-3: Normalize Grade 3 and Grade 4 source assets

- Grade 3 scope-and-sequence must be translated into canonical seed/content
  artifacts.
- Grade 4 structured content must be upgraded to the same contract and naming
  conventions.

### FR-4: Govern standards and question mapping

- Every lesson and question must map to standards through validated contracts.
- Import validation must fail loudly on incomplete or contradictory mappings.

### FR-5: Govern media and localization readiness

- Media references need a clear storage path and metadata contract.
- Translation requirements must be explicit so bilingual completeness can be
  measured instead of guessed.

## Non-Functional Requirements

- Content import must be deterministic and scriptable.
- Validation errors must identify exact files and fields.
- Curriculum data must be understandable by both engineers and content authors.

## Acceptance Criteria

- [ ] Grade 3 and Grade 4 curriculum assets share one canonical schema strategy
- [ ] Lessons and units have stable slugs distinct from opaque IDs
- [ ] Structured lesson validation covers all supported lesson block types
- [ ] Standards/question mappings are enforced in import tooling
- [ ] Media and translation requirements are explicit in the content contract

## Out of Scope

- Building a full in-app authoring CMS
- Student-facing UI polish beyond what is needed to validate the data contract
