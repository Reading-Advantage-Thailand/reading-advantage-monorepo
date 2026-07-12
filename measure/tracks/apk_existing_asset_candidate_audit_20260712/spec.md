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
- Compact/wide suitability.
- Chibi Quest and Riven Lands suitability.
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
- Theme and responsive suitability link to accepted concrete scene usages.
- Full candidate totals, dispositions, unknowns, and duplicate groups reconcile mechanically.
- Zero unresolved Critical, High, or Medium findings.
- Product owner accepts the per-candidate report and manifest.

## Out of scope

- Generating or editing production assets.
- Defining final physical contracts.
- Semantic ontology synthesis.
