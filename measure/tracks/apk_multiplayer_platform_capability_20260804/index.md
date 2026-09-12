# Track apk_multiplayer_platform_capability_20260804 Context

Status: in progress; S0–S3 complete and checkpointed (0724fd7, e1a7ee5,
d027b6f, 90da767). `multiplayer.v1` is frozen, the `multiplayer` capability id
is registered (seven → eight), and the Wizard vs Zombie simulation is
deterministic. S4 is open on the deployment spike (s4-deployment-spike-20260804.md).

- [Specification](./spec.md)
- [Implementation Plan](./plan.md)
- [Metadata](./metadata.json)
- [Superseded App-Local Track](../../../apps/advantage-games/measure/tracks/competitive_multiplayer_20260425/)
- [Measure Project Context](../../index.md)
- [Measure Workflow](../../workflow.md)
- [Measure Anti-Patterns](../../anti-patterns.md)

## Open questions carried into S0

- The Tutor Advantage race protocol is not in this repository and must be
  supplied before S1 freezes the contract.
- Whether the orphaned room-manager, game-session, and scoring-engine modules
  are lifted or discarded is an S0 output, not an assumption.
- The deployment host for a long-lived socket process has no precedent here;
  S4 opens with a spike.
