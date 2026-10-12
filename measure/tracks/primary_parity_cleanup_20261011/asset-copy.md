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
- Manifest size sum: 337,567,285 bytes. This equals the file bytes of the table. The sum of `du -sb`
  of the 6 folders (337,453,854) plus the 15 files (113,431) gives the same number.
- Target file count: 73,053 (73,052 copies plus `MANIFEST.tsv`). Target size: 573 MB on disk.
- Free disk space after the copy: 11 GB (limit 2 GB).
- No hash or checksum was made (spec R-4).

## Build output check (Phase 6, 2026-10-12)

Command: `pnpm turbo run build --filter=primary-advantage` (Turbopack, Next.js 16.2.9), run under the heavy lock.
Result: the build passed. `apps/primary-advantage/public/assets/apk/standard-pack-qc` is gone from Primary.

- `find .next/standalone/apps/primary-advantage -path '*standard-pack-qc*'` prints 0 files.
- The spec check over the full `.next/standalone` folder prints 156, not 0. All 156 files belong to other apps:
  77 in `apps/advantage-games/public`, 77 in `apps/reading-advantage/public`, and 2 in `apps/advantage-games`
  (`scripts/generate-standard-pack-qc-preview.mjs`, `src/lib/apk/standard-pack-qc-preview.json`).
- The spec fallback (`outputFileTracingExcludes`) does not work in this build. Two builds with the key (`"*"` and `"/**"`)
  left the 156 files in place. Next.js applies this key in `collect-build-traces.js` only to the webpack trace
  (`entryNameFilesMap`). A Turbopack build has no such map. The change was reverted; `next.config.ts` has no excludes key.
- Cause: the Turbopack trace of 61 routes lists the public folders of other apps (for example the lesson page lists 7,363 files).
  This is the full-trace problem of spec E-7. It needs a change outside this track.
- Option for the owner (not done): one `RUN rm -rf` line in `apps/primary-advantage/Dockerfile` after the standalone copy,
  for the `standard-pack-qc` folders and the two preview files of other apps. Not tested (no local image build on this machine).

`du -sh .next/standalone/apps/*` (largest first): www-reading-advantage 507M, advantage-games 435M, reading-advantage 188M,
primary-advantage 165M, science-advantage 27M, codecamp-advantage 23M, sales-advantage 1.2M, workbooks 704K,
accounts 556K, marketing 552K, accounting 496K, activity-vinext-fixture 24K. Total: 1.4G.
