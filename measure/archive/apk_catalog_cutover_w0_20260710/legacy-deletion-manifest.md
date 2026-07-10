# W0 Legacy Deletion Manifest

This is an evidence manifest, not a deletion claim. W0 publishes the three APK identities while all live Advantage Games and Reading routes remain intact. The machine-readable source is [`legacy-deletion-manifest.json`](./legacy-deletion-manifest.json).

## Decision summary

| Game | APK replacement | Delete now | Deferred live surfaces | Retained surfaces |
|---|---|---|---|---|
| Dragon Flight | `dragonFlightCartridge` over internal `gate-runner` | Removed unreferenced `public/vocab/dragon-flight.json` | Advantage Games route/API/renderer/state/assets/E2E; Reading production route/API/renderer/state/controller/assets | Covers, README image, candidate audio, shared ranking UI |
| Dungeon Liberator | `dungeonLiberatorCartridge` over internal `sentence-order-collection` | Removed unreferenced `public/vocab/dungeon-liberator.json` | Advantage Games route/API/renderer/state/assets/E2E | Cover and durable asset/audit evidence |
| Magic Defense | `magicDefenseCartridge` over internal `typing-defense` | Removed unreferenced `public/vocab/magic-defense.json` | Advantage Games route/API/E2E; Reading production route/API/controller | Covers, active assets, and shared legacy game UI/config |

The three `delete` entries are caller-free static fixtures removed by W0. Every route, API, renderer, production asset, cover, and shared legacy component remains present under an explicit `retain` or successor-owned `defer` disposition.

## Caller findings

- Advantage Games still links all three legacy routes from `src/lib/gameCards.ts`.
- Each legacy page still fetches its game-specific API routes. Dragon Flight and Dungeon Liberator import dedicated React/canvas renderers; Magic Defense imports the shared `components/games/game` UI.
- The old Dragon Flight `RankingDialog` is shared by Castle Defense and Dragon Rider in both Advantage Games and Reading, so it is explicitly retained.
- Reading Dragon Flight and Magic Defense remain production surfaces. Their pages, API handlers, controllers, lesson-phase embeds, copied game logic, and active assets are deferred to `reading_apk_route_cutover_w2`.
- The top-level Advantage Games asset directories for Dragon Flight and Dungeon Liberator are no longer the runtime asset paths, but legacy Playwright screenshot helpers still use those directories as output targets. They are therefore deferred rather than declared deleted.
- Covers and the marketing image are active callers or reusable product assets and remain retained.

## Trust and host proof

Every replacement record points to the same stable host boundary:

- Vocabulary games keep `VocabularyInputArraySchema`.
- Dungeon Liberator keeps `SentenceInputArraySchema`.
- All three keep the exact five-field `GameResultsSchema`.
- `packages/game-contracts/src/completion.ts` excludes display XP and keeps authenticated identity, tenant, awarded XP, timing validation, and abuse controls server-owned.
- Advantage Games QC plus Reading and Primary host-smoke tests are named for every public ID.

## Validation

Run from the repository root:

```bash
node measure/tracks/apk_catalog_cutover_w0_20260710/verify-legacy-deletion-manifest.mjs
```

The verifier checks exact public IDs, replacement/host/completion evidence, unique paths, valid dispositions, retained/deferred on-disk paths, absent deleted paths, live caller paths, successor ownership for every deferred entry, and the rule that a `delete` entry has no recorded caller.

The inventory used `build-graph` first, then bounded filename and source-reference scans because the graph did not index the kebab-cased game names as exact symbols. Direct public URLs can have external bookmarks that static analysis cannot see, so W0 does not mark any route, API, production asset, or Reading path for deletion.
