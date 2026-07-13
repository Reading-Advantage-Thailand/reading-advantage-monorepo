# Denominator Method

Schema version: `apk-denominator-method.v1`

## Frozen input

All factual records were read with `git ls-tree` and `git show` from
`23bb5ad578c01fb29f9e8bb76a7d934d24a4b286`. The generator does not read a discovered source blob from the
working tree. Historical records use only parents reached by `git log` from that
revision. Every JSON locator carries the committed blob SHA-256 and an inclusive
line-range SHA-256.

## Mechanical passes

1. Enumerate the frozen tree under the Phase-0 roots. Game-page identities are emitted
   in deterministic batches of no more than three; a failed committed-locator resolution
   raises an exception before later batch output is written.
2. Select source files by the documented game-path predicate; record file, game-page
   identity, route, byte-identical copy, and literal relative-import records.
3. Extract declared component symbols ending in `Game`, `Screen`, or `Scene`, literal
   `useState` declarations whose variable names include a state vocabulary token, and
   source-local guarded setter pairs. This is syntax traversal, not runtime execution.
4. Enumerate media, audio, and data suffixes below the three public roots plus
   game-associated data files; hash every committed byte sequence and report basic
   encoded format metadata.
5. Walk reachable deletion commits and retain only a parent locator when the deleted
   path resolves in that parent.

## Quarantine and limits

The `measure/tracks/apk_cross_game_asset_ontology_20260712` prefix is rejected before any source blob is read. The
negative fixture records that prefix rejection only and contains no failed-track
factual input. The output is a mechanical inventory: it makes no conclusion about
runtime intent, layout behavior, source suitability, semantic classification, or
product outcome.
