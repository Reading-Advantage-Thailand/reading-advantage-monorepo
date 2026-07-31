# Implementation Plan: Planned/New-Game Intake

- [x] Define the intake schema for owner-approved identity, learning objective, mechanic evidence, capability assessment, semantic asset roles, physical behavior descriptors, suitability/ingestion dependencies, assets, and host boundaries. (Commits `181405884`, `487f79579`, `65125747a`; independent re-review `phase3-independent-review-2026-07-31.md`.)
- [x] Write failing fixtures for blank, placeholder, generic, duplicate, and legacy-denominator title submissions. (Red checkpoint `e439f973e`; green contract/remediation `487f79579`, `65125747a`; focused Vitest 6/6.)
- [x] Define independent review and owner-acceptance requirements for a proposed new-game record. (Schema records non-authorizing owner evidence only; independent re-review accepted.)
- [x] Verify the schema does not add routes, cartridges, catalog entries, semantic mappings, or production art. (Independent re-review accepted the pure backend-contract boundary.)
- [ ] Publish the accepted intake-to-child-track handoff template with explicit non-authorization language.
- [ ] Validate the template against the foundation crosswalk to prevent legacy ledger contamination.
