# Phase 2 Green Evidence — 2026-08-16

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 2 binding freeze
Phase base: `8c30dc0e138567f4d461b6cb69c10c66a6bb2eaf`
Role base: `698f5c41406841aac37a4679ff173e689f2c7888`
Green base: `cac10174c`
Dossier commit: `82c50f82a`

## Output

Five strict candidate dossiers were added.
They contain fifteen required roles.
All fifteen decisions are `blocked`.
All five owner-acceptance records remain pending.
No asset adoption, ingestion, implementation, cutover, or owner acceptance is claimed.
No app-local copies or whole-pack delivery are declared.

## Verification

- Focused binding-freeze contract: exit 1; 7 tests collected, 6 passed, 1 failed.
- Manifest contract: exit 0; 13 tests passed.
- Python readiness suite: exit 0; 9 tests passed.
- Game-cartridges TypeScript: exit 0.
- Focused ESLint: exit 0.
- Prettier: exit 0; all five dossiers and Green-owned documents pass.
- Scoped `git diff --check`: exit 0.

## Blocking finding

The immutable Red test retains one unresolved pointer mismatch outside the final `SW-TRANS-002` correction.

- Spellweaver's Run now binds `/13` to `SW-MOVE-001` and `/37` to `SW-CART-001`.
- Spellweaver's Run now binds `/28` to `SW-INPUT-002`.
- Spellweaver's Run now binds `/19` to `SW-TRANS-002`.
- Shadow Gate Dungeon now binds `/claims/13` to `SGD-RESP-001` and `/claims/14` to `SGD-RESULT-001`.
- Griffin Rider's Escape now binds `/claims/10` to `GRF-CART-001` and `/claims/8` to `GRF-INPUT-001`.
- Spellweaver's Run still declares `/34` as `SW-ASSET-001`; the archive resolves `/34` to `SW-WORLD-004`.
- The recommended archive pointer for `SW-ASSET-001` is `/33`.

The dossier data cannot satisfy both the immutable `/34` Red expectation and the archive claim identity.
No source manifest, suitability source, Asset Contract source, production code, or Red test was changed.

## Boundary

Phase 2 remains `[~]`.
The five dossiers are candidate evidence only.
Review A must return the remaining `SW-ASSET-001` mismatch to Mid Red.

MEASURE_AGENT_RESULT
role: measure-jr-green
status: blocked
track: apk_legacy_traversal_cutover_20260727
phase: Phase 2 binding freeze
phase_base_sha: 8c30dc0e138567f4d461b6cb69c10c66a6bb2eaf
role_base_sha: 698f5c41406841aac37a4679ff173e689f2c7888
commits: 82c50f82a; evidence commit pending
counts: 5 dossiers; 15 roles; 15 blocked decisions; 0 adoption decisions; 6/7 focused tests passed
files_changed: five phase2-binding-dossiers JSON files; plan.md; this evidence file; orchestration/phase2-jr-green-role.log
limitations: immutable Red pointer drift remains for Spellweaver's Run `SW-ASSET-001`
handoff: Review A returns the remaining pointer mismatch to Mid Red. No Green completion or downstream authority is claimed.
END_MEASURE_AGENT_RESULT
