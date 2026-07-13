# The Sorcerer's Ziggurat Mechanic Blueprint

## Identity and fantasy

Complete a ritual atop an isometric ziggurat. Canonical ID: `game:sorcerer-ziggurat`; confidence: **medium**.

## Learning loop

The player must step across word cubes in sentence order. Correct input advances one content step; incorrect or out-of-order input records feedback and an attempt without silently skipping required content.

## World and controls

deterministic directional tile-step graph. The Phaser rebuild may choose native physics, cameras, pooling, and scene composition while preserving recognizable agency and target readability.

## Progression and terminal state

reach the ritual summit with the sequence complete; invalid steps cost attempts. Score, accuracy, correct answers, and attempts map to the established `GameResults`; authoritative XP and persistence remain host-owned.

## Phaser rebuild boundary

**Retain:** educational input mode and ordered/correct-answer semantics; distinctive player fantasy and terminal loop; GameResults-compatible scoring evidence.

**May redesign:** legacy React/Konva/R3F renderer assumptions; fixed portrait coordinates and CSS breakpoint scaling; client-owned persistence and XP authority.

## Deterministic Red-test evidence

- ready -> active only after explicit start.
- correct action advances exactly one deterministic content step.
- incorrect action records one attempt without skipping required content.
- terminal state emits completion exactly once.

Counterexamples:

- resize must not reset content progress or duplicate completion.
- duplicate labels must not share unstable identity.
- wrong or out-of-order interaction must not advance progression.

## Evidence

- `evidence:source:catalog`
- `evidence:measure:roadmap`
- `evidence:history:catalog`
