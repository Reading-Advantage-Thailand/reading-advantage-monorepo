# Audit Method and Conflict Rules

## Method

1. Begin from every canonical catalog identity, then add discovered deleted, withdrawn, planned, or in-development identities as explicit discrepancy rows.
2. Inventory catalog, route, component, deterministic logic/config, tests, imported copies, assets, active Measure work, and relevant history separately.
3. Model a copied Reading/Primary implementation as evidence for the canonical game, never as another product identity.
4. Cite every mechanic, capability, responsive, and asset claim with a stable evidence ID containing path and revision.
5. Keep unknowns visible with `provisional` confidence and a discrepancy; do not infer behavior from title or cover art when stronger evidence is absent.
6. Validate schemas and cross-artifact references before publishing each phase.

## Source priority

Conflicts resolve in this order while retaining the losing claim as a discrepancy:

1. Current playable implementation and behavioral tests.
2. Current raw implementation, app route, and data/logic module.
3. Active Measure specification for genuinely in-development work.
4. Archived baseline, APK blueprint, browser/cutover evidence, and exact Git history.
5. Catalog title or description only when nothing stronger exists; confidence remains provisional.

## Stable identifiers

- Games: `game:<canonical-slug>`.
- Scenes: `scene:<canonical-slug>:<scene-name>`.
- Mechanics: `mechanic:<canonical-slug>:<name>`.
- Capabilities: `capability:<domain>:<name>`.
- Responsive profiles: `responsive:<canonical-slug>`.
- Assets: `asset:<family>:<semantic-role>`; add a meaningful variant suffix only when gameplay behavior differs.
- Evidence: `evidence:<source-class>:<short-name>`.
- Discrepancies: `discrepancy:<canonical-slug>:<short-name>`.

IDs are semantic and must not encode renderer names, theme treatments, physical filenames, or copied-host locations.

## Referential-integrity rules

- Every game owns at least one scene, mechanic blueprint, and compact/wide responsive profile.
- Every scene references exactly one canonical game and at least one evidence record.
- Every standardized capability names real consumer scenes, an owner, extension boundary, and minimum test evidence.
- Every asset usage names real consumer scenes and resolves to capability IDs when behavior depends on a shared capability.
- Every evidence reference resolves; every discrepancy cites at least two conflicting sources.
- A standard capability or ontology entry with no corpus consumer is rejected.
- An asset usage with no ontology resolution must remain an explicit `gap`, never disappear from coverage totals.

## Review boundary

Automated validators prove structural completeness, not truth. Mechanic intent, visual suitability, provenance/license, responsive composition quality, false reuse, and product disposition require cross-review and the phase-specific product-owner checkpoints in `plan.md`.
