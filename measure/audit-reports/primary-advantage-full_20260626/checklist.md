# Primary Advantage Full Review Checklist

Status: initialized during Phase 0 setup.

## Setup gates

- [x] Audit report directory created.
- [x] Line-review directory created.
- [x] Exact app inventory generated from `apps/primary-advantage`.
- [x] Batch manifest generated with <=1200-line / <=10-file target caps, except oversized single files.
- [x] Coverage TSV initialized with one pending row per file.
- [x] Reviewer protocol written.

## Review gates

- [ ] Every batch evidence file completed.
- [ ] Every coverage row is `reviewed` with `reviewed_ranges=1-N` matching inventory line count.
- [ ] Every finding includes `file:line` evidence and one fork-divergence category.
- [ ] Inventory and coverage file sets mechanically match.
- [ ] Final synthesis preserves LR finding IDs and does not rely on broad summary evidence alone.
