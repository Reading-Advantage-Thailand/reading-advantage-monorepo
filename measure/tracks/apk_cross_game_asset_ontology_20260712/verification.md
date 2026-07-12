# APK Cross-Game Ontology Verification

## Automated evidence

- 23/23 focused tests pass.
- Audit schema coverage: 88.57% statements, 87.5% lines, 100% functions.
- Corpus and blueprints: 29 games/scenes, one machine and human blueprint each.
- Capabilities and responsive profiles cover every scene/game with evidence.
- 335 justified asset usages resolve exactly once into 17 supported semantic families.

`build-graph audit ./graph.db` returned no report or usable exit code. The graph passed the Phase 0 freshness gate (25,387 nodes, 49,462 edges, 3,019 files). This track changes requirements/tests rather than production exports, so no signature update is required; the failed audit invocation is recorded, not represented as a pass.

## Independent adversarial review

| Severity | Finding                                                    | Resolution                                                                                            |
| -------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| High     | Optional asset roles were initially assigned to every game | Added Red coverage and per-role consumer allowlists; corrected 493 blanket rows to 335 justified rows |
| Medium   | Usage regeneration overwrote the human inspection report   | Removed audit writes from the generator and restored inspection evidence                              |
| Medium   | Legacy similarity could be mistaken for production reuse   | All candidates remain reject/replace/unknown without provenance and contract proof                    |
| Medium   | Provisional games could define shared APIs                 | Shared capabilities require multiple concrete consumers; provisional mechanics remain bespoke         |

No unresolved Critical, High, or Medium findings remain.

## Contradiction review

- Exported withdrawal state is current routing truth; Reading copies are evidence, not identities.
- Legacy renderer/fixed portrait assumptions are superseded.
- Theme treatments do not alter semantic meaning or geometry.
- Host ownership of identity, tenancy, persistence, idempotency, and authoritative XP is preserved.
- No production route, runtime, cartridge, or physical asset was implemented.
