# Phase 0 Evidence Snapshot

Captured 2026-07-12 in `/home/daniel-bo/Desktop/reading-advantage-monorepo`.

## Revisions

- Repository baseline: `ab80f58c55285c164c1b3cdbc3b9ed5b2a03c0ee`.
- Catalog path: `apps/advantage-games/src/lib/gameCards.ts` at the working tree above that baseline.
- Latest catalog history evidence: `05bb6d29` withdraws invalid cartridge implementations; earlier APK catalog changes include `a30e8777`, `275f1444`, `0e1e699d`, and `c378c3cc`.
- `graph.db` captured at `2026-07-12 09:01:54 +0700`; `build-graph stats` reports 25,387 nodes, 49,462 edges, and 3,019 files. It passed the Measure freshness gate when Phase 0 began.

## Canonical roots

- Product corpus and raw implementations: `apps/advantage-games/src/lib/gameCards.ts`, `src/components/games/`, `src/lib/games/`, localized game pages, API routes, tests, and `public/games/`.
- Imported Reading copies: `apps/reading-advantage/components/games/`, `lib/games/`, localized game pages, and game API routes. These are deployment/copy evidence, not additional game identities.
- Primary evidence: `apps/primary-advantage/components/lesson/games/`. These lesson activities are host/product evidence and are not silently promoted into the APK catalog.
- APK evidence: `packages/advantage-play-kit/`, `packages/game-cartridges/`, `packages/game-contracts/`, and archived APK W0-W4 artifacts.

## Working-tree boundary

The repository was already heavily dirty. Pre-existing edits include the track specification, plan, metadata, index, registry, Advantage Games guidance, Reading files, Primary config, Codecamp work, shared packages, and unrelated generated artifacts. This execution owns only new files under this track plus narrow status markers. It does not revert, reformat, stage, or claim concurrent changes.

## Known corpus drift to preserve

- Current `gameCards.ts` contains 27 catalog identities and withdraws 14 invalid APK-backed cards from playable routing.
- Earlier working trees and audits also contained Abyssal Well and Babel Architect. They remain discrepancy/historical requirement evidence until Phase 1 resolves their product disposition.
- Reading contains copied implementations for a subset of the catalog. Copy count must not inflate game count.
- Cancelled Babel Architect Phaser/R3F work is mechanic and failure evidence only; its fixed portrait assumptions are superseded by the responsive composition specification.

## Exclusions

- No production game, route, cartridge, shared package, asset, or host integration is changed in this requirements track.
- Build output, dependency caches, coverage HTML, Playwright reports, and `.opencode` directories are excluded from source inventories.
- Concurrent uncommitted work is not considered accepted evidence unless a later artifact cites and labels its exact working-tree state.
