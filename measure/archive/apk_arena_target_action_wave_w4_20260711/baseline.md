# APK Arena & Target Action Wave W4 Baseline

## Evidence state

S1 source/graph inventory began on 2026-07-11 after W3 archive. Kimi WebBridge was invoked for the live desktop baseline, but the connected-browser command timed out while the daemon remained healthy; therefore no new visual acceptance or deletion approval is claimed from that attempt. The prior app audit identifies Realm Carver as unable to start because of its route/content mismatch and Gryphon Patrol as having mobile canvas dead bands. Fresh replacement acceptance remains mandatory after implementation.

The code graph was queried before bounded source inspection. `ArchersRevengeGame` currently has ambiguous duplicate graph nodes, so caller conclusions must be reconciled with exact text imports before cutover. The other legacy surfaces were inventoried by exact route/component/state/API paths rather than inferred from catalog labels.

## Source baseline

| Public ID | Input | Current renderer/loop | Current controls and terminal evidence | Initial APK systems |
|---|---|---|---|---|
| `archers-revenge` | Vocabulary | 337-line React-Konva component with a hand-owned `requestAnimationFrame` loop, projectile state, enemies/shields, and wall health | Stage pointer/touch position fires an arrow; difficulty buttons precede play; victory or wall-breached defeat | Aim/target resolver, projectile/enemy pools, shield collision filters, wave director, camera feedback |
| `paladins-twin-soul` | Vocabulary | 356-line React-Konva arena with manual RAF, paired hero state, gargoyle waves, and projectile/survival logic | UI claims Arrows/A-D movement; terminal victory/defeat renders shared end screen | Arena movement, paired-entity state, projectile pools, wave director, vocabulary targeting |
| `griffin-sky-joust` | Sentence | 435-line React-Konva aerial physics/action loop with ordered word targets and manual RAF | Space/ArrowUp/W or touch flaps; ArrowLeft/A and ArrowRight/D drift; victory/defeat | Aerial physics, ordered targets, enemy/projectile pools, collision/health feedback |
| `gryphon-patrol` | Sentence | 366-line React-Konva patrol arena with manual RAF, enemies, camera-scale presentation, difficulty, and ranking tab | Start screen claims WASD/Arrows movement and Space shooting; victory is implemented; live verification must confirm those declarations match handlers | Bounded aerial arena, target indicators, projectile pools, minimap, spawn director |
| `realm-carver` | Sentence | 350-line React-Konva territory/map loop with manual RAF; the route currently converts only the first sentence into word pairs whose translations equal their terms | UI claims D-pad/Arrows movement; terminal map-complete victory or defeat | Territory grid, ordered beacons, camera/minimap, collision regions, capture progress |

## Exact legacy candidate families

Each ID currently owns all or most of these candidate surfaces under `apps/advantage-games/src`:

- locale student page under `app/[locale]/(student)/student/games/<mode>/<id>/page.tsx`;
- per-game content and completion APIs under `app/api/v1/games/<id>/` (plus Gryphon Patrol ranking);
- React-Konva component and colocated tests under `components/games/<mode>/<id>/`;
- camel-case state/config modules and tests under `lib/games/`.

No candidate is deletion-approved. S1 must still capture live behavior, freeze deterministic fixtures/blueprints, enumerate exact callers, and identify any shared assets or tests outside these directories.

## Source risks to verify live

- Component sizes total 1,844 lines across five separately owned render loops.
- All five use app-private per-game content/completion routes instead of the accepted generic host.
- Archer, Griffin, and the other components depend on Konva/manual RAF lifecycle behavior that must not be copied into APK.
- Gryphon Patrol's visible keyboard instructions need handler-level and browser confirmation.
- Realm Carver currently discards sentence translations while splitting the first sentence; W4 must preserve the strict sentence pair-array contract rather than this route transformation.
- Fresh mobile height/aspect, touch aiming/movement, canvas count, overflow, start/terminal loops, and current console errors remain unverified until the Kimi replacement pass; the initial 2026-07-11 Kimi command timed out at the extension boundary.
