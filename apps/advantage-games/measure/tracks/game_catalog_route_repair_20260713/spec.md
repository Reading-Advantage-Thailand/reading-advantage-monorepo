# Specification: Game Catalog Route Repair

## Problem

The standalone game catalog renders links that return 404, and games with retained implementations can be shown as unavailable.

## Functional Requirements

- FR-1: Every catalog card marked `playable` must link to a route implemented by this app.
- FR-2: Retained playable game routes must resolve under the standalone app's locale-aware route tree.
- FR-3: The catalog must not classify a retained, launchable game as coming soon solely because of a stale withdrawal list.

## Acceptance Criteria

- AC-1: The main menu test verifies every playable launch link targets an implemented route shape.
- AC-2: Labyrinth of the Goblin King remains playable and links to its sentence-game page.
- AC-3: Targeted unit tests and type checking pass.
