# Implementation Plan: APK Arena & Target Action Wave W4

> **Track ID:** `apk_arena_target_action_wave_w4_20260711`
> **Predecessors:** `advantage_play_kit_20260710`, `apk_advantage_games_arcade_host_w2_20260710`, `apk_runner_traversal_wave_w3_20260711`

## Phase S1: Freeze arena-wave contracts

- [x] Task: Capture live and source baselines for all five games
  - [x] Query graph callers/dependencies before bounded source inspection
  - [x] Run each reachable game in the browser at desktop and 390x844
  - [x] Record mechanic, content mode, controls, defects, and reusable APK systems
- [x] Task: Add Red catalog and blueprint contract tests
- [x] Task: Author the arena-wave blueprint and exact cutover manifest skeleton
- [x] Task: Verify S1 docs/tests and mandatory phase review
- [x] Task: Measure - User Manual Verification 'Phase S1: Freeze arena-wave contracts'

## Phase S2: Extend reusable arena and target-action systems

- [x] Task: Add Red deterministic movement, target, projectile, wave, aerial, minimap, and territory tests
- [x] Task: Implement the minimum shared arena systems
- [x] Task: Add keyboard, pointer, and touch control contracts
- [x] Task: Verify lifecycle, performance, coverage, package gates, and mandatory phase review
- [x] Task: Measure - User Manual Verification 'Phase S2: Extend reusable arena and target-action systems'

## Phase S3: Build five dual-edition cartridges

- [x] Task: Build and test `archers-revenge`
- [x] Task: Build and test `paladins-twin-soul`
- [x] Task: Build and test `griffin-sky-joust`
- [x] Task: Build and test `gryphon-patrol`
- [x] Task: Build and test `realm-carver`
- [x] Task: Verify editions, input modes, results, coverage, and mandatory phase review
- [x] Task: Measure - User Manual Verification 'Phase S3: Build five dual-edition cartridges'

## Phase S4: Cut over and verify the arena wave

- [x] Task: Add five cartridges to package and authenticated-host registries
- [x] Task: Add Red host, persistence, catalog, accessibility, performance, and deletion guards
- [x] Task: Produce and review the exact legacy disposition manifest
- [~] Task: Run final lint, type, test, coverage, build, graph, browser, and Measure gates
- [x] Task: Measure - User Manual Verification 'Phase S4: Cut over and verify the arena wave'
