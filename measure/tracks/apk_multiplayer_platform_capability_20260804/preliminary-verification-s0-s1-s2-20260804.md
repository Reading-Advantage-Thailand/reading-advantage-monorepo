# Preliminary Verification: S0, S1, S2 (2026-08-04)

Executed by the orchestrator at the product owner's direction ("you make
preliminary verifications first; I don't have any real way of testing"). Every
automatable step of the workflow.md verification protocol was run by the
verifier, not self-reported by the implementing agents. What remains for the
owner is judgment, not execution: confirm the recorded outcomes match
expectations.

## S0 — Audit and protocol harvest (receipts: `s0-audit-20260804.md`, `s0-protocol-harvest-20260804.md`)

Receipt claims spot-checked against the world:

| Claim | Check | Result |
| --- | --- | --- |
| M-1/M-4: process-global room state | `rg -c getGlobalRoomManager ws-server.ts` | 2 hits — confirmed present |
| Live lesson service exists at 974 lines | `wc -l lessonHandler.ts` | exactly 974 — harvest claim is exact |
| Lesson service has seeded determinism + kick | `rg -c "seededShuffle\|kick_student"` | 7 hits — confirmed |
| Local protocol is a one-hunk fork of the sibling's | `diff` the two `types/multiplayer.ts` | 2 changed lines (one hunk: our added `roomCode`) — confirmed |
| M-2: scoring engine holds server-side material | `rg score scoring-engine.ts` | score fields and anti-cheat clamp present |

Suite state was recorded in the audit receipt (13/14 suites, 202/203 tests; the
one failure a wall-clock benchmark against the dead `ScoringEngine`). Not
re-run here; the receipt's reasoning for why green does not clear the High
findings stands independent of re-execution.

**Verdict: preliminary pass.** The findings the track is built on are true of
the code today.

## S1 — `multiplayer.v1` contract freeze (commit e09545309)

| Gate | Command | Result |
| --- | --- | --- |
| Full package suite | `pnpm --filter @reading-advantage/game-contracts test` | 8 files, **178/178 passed** (123 pre-existing + 55 new) |
| Lint | `pnpm --filter @reading-advantage/game-contracts lint` | clean |
| Baseline isolation of the one `check-types` error | `tsc --noEmit` + `git diff HEAD` on `dragon-rider-host-proof-binding.ts` | error reproduces on a file untouched at HEAD — pre-existing baseline, not S1's |
| Pinned decisions present in the artifact | inspected `multiplayer.ts` | envelope `v: z.literal(1)`; `join_room` carries only `{ roomCode, displayName }`; `submission` has no score field; `unsupported_version` carries `supportedVersions`; 12 kinds including reserved `input_frame`/`world_snapshot` |

The six enforcement-side flags from the implementation report (entitlement
gate, capacity counting, kick persistence, per-player round termination,
broadcast cadence, tenant binding) are S4/S6 service logic by design and are
recorded in `plan.md` so they are not mistaken for contract gaps.

**Verdict: preliminary pass.** The contract is frozen, malformed input cannot
pass through, and every harvested race semantic is either expressed in shape
or explicitly assigned to S4/S6.

## S2 — Wizard vs Zombie determinism (commit 4142f79b2)

| Gate | Command | Result |
| --- | --- | --- |
| All wizardZombie suites | `pnpm jest wizardZombie` | 7 suites, **44/44 passed** |
| Property | `wizardZombieDeterminism.test.ts` | byte-identical state at every tick over 400 ticks (20 s) for two independent same-seed runs; witnesses non-vacuous (20 concurrent zombies, 34–39 orb attempts, 7–8 correct); different seeds diverge |
| Guard | `wizardZombieDeterminismGuard.test.ts` + `rg "Math.random\|Date.now" wizardZombie.ts` | guard green; **zero** occurrences in the module |
| Lint on all touched files | `eslint` on the 4 changed/new files | clean |
| Replay value (the phase's point) | the property test is the executable evidence: `{seed, inputSequence}` fully reproduces a session | demonstrated |

Caller-visible change verified at integration: the playable mount passes
`seed: Date.now()` (variety preserved, outside the tick path); the remotion
renderer stays deterministic by default, which is what a renderer should be.

**Verdict: preliminary pass.** The simulation is deterministic end-to-end and
the property is guarded against regression of the global-draw class. Residual,
recorded in plan: draw-order/count drift is pinned only by the 400-tick
property test, not by the guard.

## What remains for the product owner

Per workflow.md steps 5–6, the manual verification plan for each phase is
"review the gates above and confirm they meet expectations" — there is no
user-facing surface to click for S0–S2 (the first clickable surface arrives
with S5's lobby/podium binding on the `/qc` page). On the owner's
confirmation, checkpoint commits with git-notes verification reports and
checkpoint SHAs will be created per protocol steps 7–10, and the three
"User Manual Verification" tasks in `plan.md` will be marked.
