# Specification: APK Action and Defense Evidence Cohort

## Scope

Apply the accepted pilot method to Castle Defense, Magic Defense, Wizard vs Zombie, Village Guardian, Archer's Revenge, Storm the Castle Tower, Paladin's Twin-Soul, and Gryphon Patrol.

The track inherits `measure/apk-evidence-cohort-protocol.md`. Passing structural tests does not establish factual correctness.

## Focus requirements

- Recover exact wave, spawn, targeting, typed-answer, defense-zone, escort, projectile, health/lives, combat-feedback, camera, and terminal behavior.
- Enumerate enemy/target strength and behavior variants rather than generic nouns.
- Audit every discovered scene/state, including start/instruction, active phases, pause, transitions, results, and game-specific modes.
- Measure current compact/wide composition and run real browser input for runnable games.
- Record concrete actors, objectives, terrain, hazards, projectiles, VFX, audio, UI, transition, and result asset usages.

## Acceptance criteria

- Eight complete per-game packages reconcile to the accepted denominator.
- Batches contain at most three games and have distinct collectors/reviewers.
- No generic defense/action template substitutes for game-specific evidence.
- Browser evidence exists for every runnable game.
- No cross-game capability or ontology decision is made.
- Zero unresolved Critical, High, or Medium findings.

## Out of scope

- Pilot games and other cohorts.
- Shared-system implementation or synthesis.
