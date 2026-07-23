# Specification: APK Traversal and Exploration Evidence Cohort

## Scope

Apply the accepted pilot method to Dragon Rider, Dungeon Liberator, Spellweaver's Run, Shadow Gate Dungeon, Labyrinth of the Goblin King, Griffin Rider's Escape, and The Sorcerer's Ziggurat.

The track inherits `measure/apk-evidence-cohort-protocol.md`.

## Focus requirements

- Recover exact world topology, movement, collision, camera, stage/floor/room, gate/lane, obstacle, hazard, stealth, maze, rescue, and transition behavior.
- Distinguish layout profile from touch/pointer/keyboard/hybrid input mode.
- Measure gameplay viewport, bounds, follow/dead zones, required simultaneous visibility, overlays, and current responsive failures.
- Record concrete terrain, boundary, obstacle, target, prisoner/NPC, gate, hazard, indicator, transition, UI, and result usages.
- Keep missing or historical Ziggurat behavior explicitly provisional.

## Acceptance criteria

- Seven complete per-game packages cover every assigned denominator item.
- Exact world/state/transition evidence replaces generic traversal descriptions.
- Browser evidence exists for every runnable game and verifies movement plus profile transitions.
- Historical/missing claims never derive from catalog analogy.
- No cross-game standardization decision is made.
- Zero unresolved Critical, High, or Medium findings.

## Out of scope

- Pilot and other cohorts.
- Ontology synthesis or implementation.
