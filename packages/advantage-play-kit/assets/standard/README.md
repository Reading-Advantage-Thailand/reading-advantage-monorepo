# APK Standard Asset Library

This is the curated, licensed ElvGames pixel-art library used by Advantage Play Kit.

## Filesystem contract

Every runtime asset uses this path shape:

```text
<view>/<cell-size>/<semantic-category...>/<asset-name>.<ext>
```

The extension-free relative path is its semantic key. `cell-size` is the intended
frame or tile cell size, never the outer dimensions of an atlas or sheet. Use
`native` only for audio, fonts, and non-grid world images.

Do not add executables, engine caches, project metadata, nested archives, or duplicate
engine exports. Add source information here before adding a curated asset batch.

## Attribution

Shipped games and applications using these assets display: `Pixel art assets by ElvGames`.
See `LICENSE-ELVGAMES.txt` for the included source license.
