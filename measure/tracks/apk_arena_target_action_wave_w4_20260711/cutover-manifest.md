# APK Arena & Target Action Wave W4 Cutover Manifest

## Policy

The only production destination is `/[locale]/student/arcade/[cartridgeId]`. The shared package catalog, literal loader, authenticated host, and server-owned `/api/v1/apk/complete` transport must replace every per-game page and API before deletion. No legacy candidate is deletion-approved from source similarity alone.

## Candidate matrix

| Public ID | Legacy page/component/state/API family | Replacement | Disposition gate |
|---|---|---|---|
| `archers-revenge` | vocabulary page, `ArchersRevengeGame`, `archersRevenge*`, per-game vocabulary/complete APIs | shared protected-target arena | deleted after caller and desktop/mobile browser proof |
| `paladins-twin-soul` | vocabulary page, `PaladinsTwinSoulGame`, `paladinsTwinSoul*`, per-game vocabulary/complete APIs | shared paired-hero arena | deleted after caller and desktop/mobile browser proof |
| `griffin-sky-joust` | sentence page, `GriffinSkyJoustGame`, `griffinSkyJoust*`, per-game sentences/complete APIs | shared aerial ordered-target arena | deleted after caller and desktop/mobile browser proof |
| `gryphon-patrol` | sentence page, `GryphonPatrolGame`, `gryphonPatrol*`, per-game sentences/complete/ranking APIs | shared patrol/minimap arena | deleted after caller and desktop/mobile browser proof |
| `realm-carver` | sentence page, `RealmCarverGame`, `realmCarver*`, per-game sentences/complete APIs | shared ordered territory arena | deleted after caller and desktop/mobile browser proof |

## Required deletion evidence

- Literal catalog loader and generic host route resolve the exact ID under both editions.
- Desktop keyboard and `390x844` touch/pointer runs complete with one canvas, readable targets, no overflow, and one five-field result.
- Server-owned completion remains idempotent; no per-game transport is called.
- `build-graph callers` plus bounded `rg` show no consumer outside each candidate family.
- Recursive deletion guards fail if retired pages, components, state/config modules, tests, or APIs reappear.
- Mandatory review has no Critical or High finding.

## Retained shared surfaces

The APK runtime, generic arcade route, session hook, completion route, editions, QC lab, shared start/end UI, cover assets, and unrelated legacy games are not candidates.
