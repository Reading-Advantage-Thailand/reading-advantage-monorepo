# ElvGames asset copy (Phase 1)

Date: 2026-10-12. Source commit: `2c33cc036` (branch `primary/parity-b`).
Target folder: `/home/daniebo/Desktop/Asset Packs/monorepo-elvgames-20261011/`
The folder keeps the repository path of each file. It holds `MANIFEST.tsv` (path, size in bytes).
The original zips in `~/Desktop/Asset Packs/` did not change. The copy changed no repository file.

## Inventory (git ls-files, bytes from stat)

| Source | Files | Bytes |
| --- | --- | --- |
| `packages/advantage-play-kit/assets/standard/` | 72,613 | 222,532,559 |
| `packages/advantage-play-kit/assets/review/` | 183 | 112,712,954 |
| `packages/advantage-play-kit/assets/play-maps/` | 10 | 444,026 |
| `apps/primary-advantage/public/assets/apk/standard-pack-qc/` | 77 | 588,105 |
| `apps/reading-advantage/public/assets/apk/standard-pack-qc/` | 77 | 588,105 |
| `apps/advantage-games/public/assets/apk/standard-pack-qc/` | 77 | 588,105 |
| 15 single files (import script and test, 4 game-cartridges scripts, 7 `*standard-art*.ts`, preview builder and preview JSON) | 15 | 113,431 |
| Total | 73,052 | 337,567,285 |

The spec sizes (451 MB, 108 MB) are disk use in blocks. The table shows file bytes.
The inventory found no new ElvGames location. The other `git grep -i elvgames` hits are code and tests
that name ElvGames. They hold no asset. They stay in the repository and are not part of the copy.

## Check result

- `diff -rq` of each of the 6 source folders against the target: no output.
- `cmp` of each of the 15 single files: no output.
- `MANIFEST.tsv`: 73,052 lines plus the header. This equals the source file count.
- Manifest size sum 337,567,285 bytes equals `du -sb` of the folders (337,453,854, which counts the
  folder entries, not only files) plus the 15 files (113,431) when the folder entries are excluded:
  the manifest sum and the file bytes in the table agree.
- Target file count: 73,053 (73,052 copies plus `MANIFEST.tsv`). Target size: 573 MB on disk.
- Free disk space after the copy: 11 GB (limit 2 GB).
- No hash or checksum was made (spec R-4).
