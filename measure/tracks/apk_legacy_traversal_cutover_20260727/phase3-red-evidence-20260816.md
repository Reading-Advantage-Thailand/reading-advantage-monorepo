# Phase 3 Red Evidence — Mechanics, Responsive, and Learning Contracts

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 3 Red contracts
Phase base: `5baf6cc92`
Role base: `fd581f3dcd15e7b7b632875862aaecb596719621`

## Lease

This Red batch owns fifteen new test files under `packages/game-cartridges/src`, one fixture file, this plan, this evidence file, and the role log.

The batch does not edit production cartridges, catalog code, dossiers, archives, registry files, or metadata.

## Contract coverage

Each title has one mechanics test, one responsive test, and one learning test.

The mechanics contracts preserve each distinct loop and normalize deterministic keyboard input through shared APK APIs.

The responsive contracts resolve compact and wide profiles, inspect geometry, and preserve state through resize recomposition.

The learning contracts reject wrong order, advance correct targets, account results, and emit completion once.

Accepted evidence bindings are:

- Dragon Rider: `DR-TEST-001A`, `DR-TEST-001B`, and `DR-SCENE-002A`.
- Spellweaver's Run: `SW-TRANS-002`, `SW-INPUT-002`, and `SW-RESP-002`.
- Shadow Gate Dungeon: `SGD-MOVE-001`, `SGD-INPUT-001`, `SGD-RESP-001`, and `SGD-PROG-001`.
- Labyrinth of the Goblin King: `LGK-MOVE-001`, `LGK-RESP-001`, and `LGK-ORB-001`.
- Griffin Rider's Escape: `GRF-WAVE-001`, `GRF-INPUT-001`, `GRF-RESP-001`, and `GRF-TRANS-001`.

## Red result

The targeted batch collected fifteen test files and fifteen tests.

All fifteen tests failed at the explicit public catalog boundary.

Each failure names its accepted claim and the missing title cartridge behavior.

No failure came from a missing import, syntax transformation, fixture load, or TypeScript compilation.

Shared APK assertions ran before each missing-cartridge assertion.

The current catalog remains intentionally empty, so these failures are expected Red results.

## Verification

- Targeted Vitest batch: exit 1; 15 files collected, 15 tests failed as expected.
- Game-cartridges TypeScript: exit 0.
- Focused ESLint: exit 0.
- Prettier check: exit 0 for all fixture and test files.
- Scoped `git diff --check`: exit 0.

## Boundary

Phase 2 dossiers remain candidate evidence with blocked decisions.

Owner acceptance for asset adoption remains pending.

This Red batch grants no asset adoption, ingestion, implementation, cutover, or Green authority.

Green remains owner-gated and must use current public APK APIs after the required acceptance receipt.

MEASURE_AGENT_RESULT
role: measure-mid-red
status: complete-with-green-handoff-blocked
track: apk_legacy_traversal_cutover_20260727
phase: Phase 3 Red mechanics, responsive, and learning contracts
phase_base_sha: 5baf6cc92
role_base_sha: fd581f3dcd15e7b7b632875862aaecb596719621
counts: 5 titles; 15 test files; 15 tests; 15 expected cartridge-boundary failures
failures: missing per-title public catalog and cartridge behavior only; every failure names an accepted claim
files_changed: 15 per-title Red test files; phase3-red-fixtures.json; plan.md; phase3-red-evidence-20260816.md; orchestration/phase3-mid-red-role.log
authority: Red contracts only; no owner acceptance, adoption, ingestion, implementation, cutover, or Green authorization
handoff: owner must accept Phase 2 asset-adoption evidence before Green receives production implementation authority
END_MEASURE_AGENT_RESULT
