# APK Standard Asset Library

This is the complete, licensed ElvGames pixel-art library used by Advantage Play Kit.
Every PNG in every top-level and nested purchased archive is imported here. The
curated aliases from batch 001 remain alongside the complete source-preserving tree.

## Filesystem contract

Every runtime asset uses this path shape:

```text
<view>/<cell-size>/<semantic-category...>/<asset-name>.<ext>
```

The extension-free relative path is its semantic key. `cell-size` is the intended
frame or tile cell size, never the outer dimensions of an atlas or sheet. Use
`native` when a source sheet or image has no trustworthy declared cell size.

Do not add executables, engine caches, project metadata, nested archives, or duplicate
engine exports. Add source information here before adding a curated asset batch.

## Attribution

Shipped games and applications using these assets display: `Pixel art assets by ElvGames`.
See `LICENSE-ELVGAMES.txt` for the common included source license and
`licenses/` plus `LICENSE-RECEIPT.tsv` for every source license text. `IMPORT-RECEIPT.tsv`
records the exact source archive chain and member path for all imported PNGs.
