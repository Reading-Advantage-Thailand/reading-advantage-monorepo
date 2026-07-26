# Specification: APK Per-Candidate Asset Forensics

## Overview

Audit every independently discovered image, audio, font, data, and approved authoring-source candidate. Contact sheets may aid navigation but cannot substitute for candidate-level records.

This track depends on accepted truth gates, denominator, pilot, and all four corpus cohorts. Mechanical inspection may be prepared separately, but this track cannot start or complete against unaccepted scene-usage inputs.

## Required candidate record

- Canonical path and content hash.
- Identical-hash group, if any.
- Dimensions, encoding, format, alpha/color properties, or audio duration/channels/rate.
- Current callers and use.
- Provenance and license status with exact sidecar/source evidence.
- Per-file visible/audible content inspection.
- Text, checkerboard, placeholder, corruption, and baked-UI risks.
- State/direction/animation coverage.
- Compact/wide suitability linked to accepted concrete scene usage.
- Legacy current function plus semantic-role/state replacement or retirement
  evidence. A legacy path is evidence only: it is never a canonical standard-pack
  candidate key or direct production adoption path.
- `reuse`, `adapt`, `reference`, `reject`, `replace`, or `unknown` disposition with rationale.
- Collector and reviewer receipts.

## Functional requirements

- Candidate count must exactly match the accepted asset denominator.
- Identical files may share visual inspection only when the hash group and every path/current-use record remain explicit.
- Unknown provenance blocks reusable status.
- Invalid or unreadable files receive explicit records.
- Every candidate disposition and substantive inspection record receives full independent review.
- Automated reconciliation covers all rows; independent review covers every path-specific caller, provenance, inspection, and disposition decision.

## Acceptance criteria

- One record per denominator path.
- No filename or visual similarity is treated as provenance or contract proof.
- Every current caller/use is reconciled.
- Responsive and legacy-function replacement/retirement evidence link to accepted
  concrete scene usages; unproven mappings remain blocked.
- Full candidate totals, dispositions, unknowns, and duplicate groups reconcile mechanically.
- Zero unresolved Critical, High, or Medium findings.
- The root orchestrator, acting as project and product owner, accepts the exact
  per-candidate report and manifest only after automated contracts, applicable
  Kimi WebBridge browser evidence, independent LLM review, and direct visual
  inspection all pass.

## Out of scope

- Generating or editing production assets.
- Adding the ElvGames standard-pack corpus to this forensic denominator or
  repeating its per-file audit. T10 validates the standard-pack contract,
  catalog, receipts, release, and adopted mappings without reopening T8.
- Defining final physical contracts.
- Semantic ontology synthesis.
- Unfinished outputs from `../fantasy-asset-forge/` or
  `../pixel-art-generator/`; those projects are downstream external producers
  and may enter later tracks only through accepted digest-pinned manifests.
