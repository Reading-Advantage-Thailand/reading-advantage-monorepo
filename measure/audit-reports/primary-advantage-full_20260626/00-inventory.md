# Primary Advantage Full Review Inventory

Status: setup initialized 2026-06-27 for `primary_advantage_full_review_20260626`.

## Scope

- App scope: `apps/primary-advantage`
- Baseline SHA: `5d2ca770df0467d99c125b1e83626a991be8896a`
- Graph baseline checked with `build-graph stats ./graph.db`: package breakdown reports `primary-advantage: 394 files`, with repository graph totals `22185` nodes, `46017` edges, `2715` files.

## Inventory source of truth

The line-review source of truth is:

- `measure/tracks/primary_advantage_full_review_20260626/line-review/file-inventory.tsv`
- `measure/tracks/primary_advantage_full_review_20260626/line-review/batch-manifest.json`
- `measure/tracks/primary_advantage_full_review_20260626/line-review/line-review-coverage.tsv`

Exclusions follow the spec: `node_modules`, `.next`, `dist`, `.turbo`, `.vite`, `coverage`, build/cache directories, package-local graph/cache files, and generated build-info/cache artifacts.

## Totals

- Files inventoried: 446
- Lines inventoried: 118709
- Batches: 103
- Oversized single-file batches: 13

This artifact will be expanded after batch evidence is reviewed.

## Inventory sanity categories

- app_routes: 120
- api_routes: 64
- components: 169
- actions: 9
- server: 42
- lib: 11
- tests: 7
- configs_manifests: 12
- public_or_data_assets: 39

These are setup sanity counts only; line-by-line review evidence remains required for every file.
