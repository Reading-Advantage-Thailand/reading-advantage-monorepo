# Specification: APK Standard-Pack Suitability and Canonical Ingestion

## Overview

Create a centralized, evidence-backed process for deciding whether an accepted
standard-pack asset is suitable for a required semantic role and behavior
contract. When no suitable canonical asset exists, ingest the approved legacy
asset into the canonical pack with provenance, licensing, credit, descriptor,
and additive release evidence.

The output is a reusable decision and release/binding record. It does not make a
cartridge consumable or perform title migration.

## Functional Requirements

- FR-1: Define a strict suitability dossier per semantic role/state and behavior
  contract. It records the requesting title, source evidence, candidate assets,
  visual/technical comparison, reviewer decision, and limitations.
- FR-2: Permit exactly three outcomes: reuse an accepted canonical asset, canonically
  ingest an approved legacy asset, or block the requesting role/title. Silent
  substitution is prohibited.
- FR-3: Evaluate candidate assets for semantic fit, visual readability, frame and
  direction compatibility, animation behavior, geometry, collision envelope,
  audience appropriateness, localization, accessibility, source receipt, and
  credit obligations.
- FR-4: For approved ingestion, require exact legacy source identity/checksum,
  provenance and license review, credit, taxonomy/key assignment, physical
  descriptor, validation, and an additive pinned canonical release.
- FR-5: Publish approved semantic bindings and selected-union inputs only after
  independent review and product-owner acceptance. Preserve prior release receipts
  and reject stale or unaccepted records.
- FR-6: Provide a searchable QC/review presentation that distinguishes semantic
  intent, selected physical asset, descriptor behavior, legacy source, decision,
  and attribution.

## Non-Functional Requirements

- Dossiers and decisions are Zod-validated, deterministic, hash-bound, and
  independently reviewable.
- Canonical ingestion must not introduce app-local copies, vendor-path APIs,
  unreviewed licensing, duplicate physical sources, or whole-pack delivery.
- All public APIs and decision schemas include JSDoc and focused automated tests.

## Acceptance Criteria

- A dossier can approve reuse, require canonical ingestion, or block a role, and
  tests reject every other disposition.
- An ingested legacy asset is discoverable by semantic key and descriptor through
  a new pinned release with complete source and credit records.
- A visually similar but behaviorally incompatible candidate is rejected.
- A cohort can consume an accepted dossier without re-evaluating the same asset,
  but cannot use it to expose a production cartridge.
- Independent review and owner acceptance bind the decisions and release hashes.

## Out of Scope

- Rewriting archived receipts, migrating title code, host proof, catalog exposure,
  legacy deletion, or production deployment.
