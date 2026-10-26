# Specification: Game Cartridges Build Hotfix

Track ID: `game_cartridges_build_hotfix_20260925`. Type: bug. Package: `packages/game-cartridges`.

## Overview

`tsc -p tsconfig.build.json` for `@reading-advantage/game-cartridges` failed with
25 errors on master, blocking the primary-advantage production deploy on
2026-09-25 (build 82f9e3c4). Controller object literals wrapped in
`Object.freeze(...)` lose contextual typing, so method params were implicitly
`any`; `finish` in labyrinth-goblin-king also accepted `"complete"`, which the
snapshot `phase` union excludes.

## Functional Requirements

- FR-1: The package build passes with zero errors and zero behavior changes.
- FR-2: Fixes are type-level only: parameter annotations and narrowing.

## Acceptance Criteria

- AC-1: `tsc -p tsconfig.build.json` exits 0.
- AC-2: The primary-advantage Cloud Build `build-image` step passes.
