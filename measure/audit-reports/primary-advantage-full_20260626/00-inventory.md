# Primary Advantage Full Review Inventory

Status: complete (line-review evidence synthesized 2026-06-27).

## Scope

- App scope: `apps/primary-advantage`
- Baseline SHA: `5d2ca770df0467d99c125b1e83626a991be8896a`
- Graph baseline: `build-graph stats ./graph.db` reports primary-advantage: 394 graph files in full repo context of 2,715 files.

## Inventory Source of Truth

| Artifact | Path |
|---|---|
| File inventory | `line-review/file-inventory.tsv` |
| Batch manifest | `line-review/batch-manifest.json` |
| Merged coverage | `line-review/line-review-coverage.tsv` |
| Evidence files | `line-review/evidence/*.md` (103 files) |
| Extracted findings | `line-review/lrf-extracted.json` |
| Finding catalog | `line-review/line-review-findings.md` |
| Summary | `line-review/line-review-summary.md` |

Exclusions follow the spec: `node_modules`, `.next`, `dist`, `.turbo`, `.vite`, `coverage`, build/cache directories, package-local graph/cache files, generated build-info/cache artifacts.

## Totals (from verified line-review coverage)

| Metric | Value |
|---|---|
| Files inventoried | 446 |
| Lines inventoried | 118,709 |
| Batches | 103 |
| Oversized single-file batches | 13 |
| Evidence files present | 103/103 |
| Coverage rows reviewed | 446/446 (100%) |
| Coverage rows pending/blocked | 0 |

## Inventory Category Counts

| Category | Count |
|---|---|
| app_routes (pages, layouts, loading, error) | 120 |
| api_routes | 64 |
| components | 169 |
| server_actions | 9 |
| server_models/controllers/utils | 42 |
| lib | 11 |
| tests | 7 |
| configs_manifests | 12 |
| public_or_data_assets | 39 |
| types/hooks/contexts/other | 19 |

## Verification Gates

- [x] File set: inventory (446) matches coverage (446)
- [x] Every row status=reviewed
- [x] Every evidence_file exists on disk (103/103)
- [x] Every reviewed_ranges=1-N matches inventory line_count
- [x] Every finding_count is numeric
- [x] Every batch in manifest has coverage rows
- [x] Zero conflicting patch merges
