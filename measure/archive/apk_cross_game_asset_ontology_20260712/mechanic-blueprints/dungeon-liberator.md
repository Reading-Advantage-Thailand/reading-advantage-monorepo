# Dungeon Liberator Mechanic Blueprint

## Identity and fantasy

Rescue prisoners and escape a dungeon. Canonical ID: `game:dungeon-liberator`; confidence: **high**.

## Learning loop

The player must collect word-bearing prisoners in sentence order. Correct input advances one content step; incorrect or out-of-order input records feedback and an attempt without silently skipping required content.

## World and controls

directional dungeon navigation with camera, collision, and exit. The Phaser rebuild may choose native physics, cameras, pooling, and scene composition while preserving recognizable agency and target readability.

## Progression and terminal state

open the exit after the sentence is complete or lose to hazards/time. Score, accuracy, correct answers, and attempts map to the established `GameResults`; authoritative XP and persistence remain host-owned.

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
- `evidence:source:components`
- `evidence:source:logic`
- `evidence:history:catalog`
