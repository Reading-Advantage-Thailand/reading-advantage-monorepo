# Phase 2 Green Evidence — 2026-08-16

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 2 binding freeze
Phase base: `8c30dc0e138567f4d461b6cb69c10c66a6bb2eaf`
Role base: `698f5c41406841aac37a4679ff173e689f2c7888`
Green base: `f76f2f523`
Dossier commit: `1f869aa67`

## Output

Five strict candidate dossiers were added.
They contain fifteen required roles.
All fifteen decisions are `blocked`.
All five owner-acceptance records remain pending.
No asset adoption, ingestion, implementation, cutover, or owner acceptance is claimed.
No app-local copies or whole-pack delivery are declared.

## Verification

- Focused binding-freeze contract: exit 0; 7 tests collected, 7 passed.
- Manifest contract: exit 0; 13 tests passed.
- Python readiness suite: exit 0; 9 tests passed.
- Game-cartridges TypeScript: exit 0.
- Focused ESLint: exit 0.
- Prettier: exit 0; all five dossiers and Green-owned documents pass.
- Scoped `git diff --check`: exit 0.

## Consolidated pointer correction

The consolidated Red list identified six stale Spellweaver dossier pointers for three claims.

- Spellweaver's Run now binds `/13` to `SW-MOVE-001` and `/37` to `SW-CART-001`.
- Spellweaver's Run now binds `/28` to `SW-INPUT-002`.
- Spellweaver's Run now binds `/19` to `SW-TRANS-002`.
- Spellweaver's Run now binds `/33` to `SW-ASSET-001`.
- Spellweaver's Run now binds `/18` to `SW-COLL-001`.
- Spellweaver's Run now binds `/25` to `SW-TRANS-005`.
- Spellweaver's Run now binds `/35` to `SW-UI-001`.
- Spellweaver's Run now binds `/36` to `SW-TRANS-007`.
- Shadow Gate Dungeon now binds `/claims/13` to `SGD-RESP-001` and `/claims/14` to `SGD-RESULT-001`.
- Griffin Rider's Escape now binds `/claims/10` to `GRF-CART-001` and `/claims/8` to `GRF-INPUT-001`.

All 45 dossier references now match their accepted archive claim IDs.
No source manifest, suitability source, Asset Contract source, production code, or Red test was changed.

## Boundary

Phase 2 remains `[~]`.
The five dossiers are candidate evidence only.
Review A must verify the bounded dossier correction and pending owner acceptance.

MEASURE_AGENT_RESULT
role: measure-jr-green
status: blocked
track: apk_legacy_traversal_cutover_20260727
phase: Phase 2 binding freeze
phase_base_sha: 8c30dc0e138567f4d461b6cb69c10c66a6bb2eaf
role_base_sha: 698f5c41406841aac37a4679ff173e689f2c7888
commits: 1f869aa67; evidence commit pending
counts: 5 dossiers; 15 roles; 15 blocked decisions; 0 adoption decisions; 7/7 focused tests passed
files_changed: five phase2-binding-dossiers JSON files; plan.md; this evidence file; orchestration/phase2-jr-green-role.log
limitations: owner acceptance remains pending; no downstream authority is granted
handoff: Review A verifies the correction and owner-acceptance gate. No adoption, implementation, cutover, or cartridge Green is claimed.
END_MEASURE_AGENT_RESULT
