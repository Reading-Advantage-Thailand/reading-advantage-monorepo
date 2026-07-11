# Implementation Plan: APK Runner Traversal Wave W3

> **Track ID:** `apk_runner_traversal_wave_w3_20260711`
> **Predecessors:** `advantage_play_kit_20260710`, `apk_catalog_cutover_w0_20260710`, `apk_advantage_games_arcade_host_w2_20260710`

## Phase S1: Freeze the runner wave contracts

- [x] Task: Capture live and source baselines for all four legacy games
  - [x] Query graph callers/dependencies before inspecting bounded source
  - [x] Run each reachable game in the browser at desktop and 390x844
  - [x] Record mechanic, content mode, controls, defects, and reusable APK systems
- [ ] Task: Add Red catalog and blueprint contract tests
  - [ ] Freeze exact IDs, input modes, semantic slots, controls, and stable result mapping
  - [ ] Reject unknown IDs, copied host pages, and provider/route coupling
- [ ] Task: Author the runner-wave blueprint and cutover manifest skeleton
- [ ] Task: Verify S1 docs/tests and mandatory phase review
- [ ] Task: Measure - User Manual Verification 'Phase S1: Freeze the runner wave contracts'

## Phase S2: Extend reusable traversal systems

- [ ] Task: Add Red deterministic lane/gate/scroll/vertical traversal tests
- [ ] Task: Implement the minimum shared traversal systems
- [ ] Task: Add keyboard, pointer, and touch input contract tests and implementation
- [ ] Task: Verify lifecycle, coverage, package gates, and mandatory phase review
- [ ] Task: Measure - User Manual Verification 'Phase S2: Extend reusable traversal systems'

## Phase S3: Build four dual-edition cartridges

- [ ] Task: Build and test `dragon-rider`
- [ ] Task: Build and test `spellweavers-run`
- [ ] Task: Build and test `griffin-riders-escape`
- [ ] Task: Build and test `storm-castle-tower`
- [ ] Task: Verify both editions, content modes, results, coverage, and mandatory phase review
- [ ] Task: Measure - User Manual Verification 'Phase S3: Build four dual-edition cartridges'

## Phase S4: Cut over and verify the runner wave

- [ ] Task: Add the four cartridges to package and authenticated-host registries
- [ ] Task: Add Red host, persistence, catalog, accessibility, and deletion guards
- [ ] Task: Produce and review the exact legacy disposition manifest
- [ ] Task: Run final lint, type, test, coverage, build, graph, browser, and Measure gates
- [ ] Task: Measure - User Manual Verification 'Phase S4: Cut over and verify the runner wave'
