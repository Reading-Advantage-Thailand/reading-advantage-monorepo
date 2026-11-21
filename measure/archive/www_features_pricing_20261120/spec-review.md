# Spec review, round 2: www_features_pricing_20261120

Reviewer: measure-spec-review subagent. Date: 2026-11-20. Read only. I re-read `spec.md` and `plan.md` and checked each fix against the code at master `4da73415d`, the image outputs and the heavy-run and affected-apps scripts.
Result: 19 of 20 earlier findings are fixed. H2 is fixed in part (see N1). One new High finding (N1) and three Low findings. No Critical finding.

## Earlier findings

| Id | Status | Check |
|---|---|---|
| H1 | Fixed | The image table in spec section 7 gives box, output size and `alt` for each file. I read the scratch outputs. The sizes are 366x282, 375x812, 1200x576 and 520x880, all under 62 KB. I viewed the Storytime and Reading crops: no banner, no half face, no staff header, no sidebar. |
| H2 | Partly fixed | Task 0.2 records the merge-base id and 2.6(e) passes `--base`. `--head HEAD` fails. See N1. |
| H3 | Fixed | Task 2.1 uses Pillow (`make-images.py` exists and its outputs match). No `sharp` need. |
| H4 | Fixed | Spec 4.3 and task 2.5 keep the guarantee and zero-risk cases (lines 354 to 380). The file stays. A small range overlap remains (N3). |
| H5 | Fixed | D11 chooses a custom hero. The eyebrow is a `<span>`, the `h1` has `text-slate-900` and the first `<p>` has `text-slate-700`. This meets the `phase-4-browser-regressions-remaining` check. The hero hook is in section 7. |
| M1 | Fixed | D3 and tasks 2.2 and 2.5 move the deletion of the two locale files and the three root keys to 2.5. Task 2.2 says the tree is red until then. |
| M2 | Fixed | Task 1.1 (a) reads leaf values, never a Green key. Item (b) limits the period check to the FP1 th objects and the `roadmap.description` pair. |
| M3 | Fixed | AC-8 now names the header labels and the zh `roadmap.description` as literals in the test (task 1.1 f). The labels match `header.ts` lines 4, 6, 21, 23, 38, 40. The products pages and the Storytime keys use the file diff of task 2.7. This guard is weaker, and the spec says so. |
| M4 | Fixed | D8 gives the `app-logo-<id>` hook and `siteLogos.<id>.square` (the export exists in `site-assets.ts`). D13 gives the alt rule and Q7 asks the PM about Thai alt text. |
| M5 | Fixed | D2 drops the old `hero.*` keys and fixes only `metadata.*`. `pages.about` keeps its keys. |
| M6 | Fixed | The vitest form in the plan rules (line 15) uses no env prefix and gives the reason. |
| M7 | Fixed | Task 0.3 uses `--filter "www-reading-advantage..."`. |
| M8 | Fixed | Spec 4.3 and task 2.5 state the `about` exception and the per-locale loop. |
| M9 | Fixed | Task 1.4 (d) is report-only. |
| L1 | Fixed | Spec 4.3 says "line 452 to the end of the file" and "lines 139 and 140". Section 4.2 gives the key and value lines. |
| L2 | Fixed | D4 cites `src/locales/pages/products/storytime-advantage.ts`. |
| L3 | Fixed | Section 4.2 names `storytime-page-expected.ts` line 277 as a harmless banned-term list. |
| L4 | Fixed | Spec 4.3 and task 2.5 say the `photos.spec.ts` pricing entry goes. |
| L5 | Fixed | Task 2.5 says to remove the table fragments and keep the rest of the `it` (lines 86 to 189). |
| L6 | Fixed | FR-17 no longer names `lang`. |

## New findings

### High

- **N1 [High] Task 2.6 (e): `--head HEAD` is rejected.** `scripts/ci/affected-apps.mjs` (`parseArgs`) requires a 40-character lowercase hex id for `--head` as well as `--base`. The word `HEAD` exits 2. Fix: `--head $(git rev-parse HEAD)`, run from the worktree root. Write the full id in the task record.

### Low

- **N2 [Low] Task 2.2 expected result.** Case (e) of task 1.1 (no removed string in any `src/locales` file) also fails until task 2.5. The old `pricing-table.ts` and `comparison-table.ts` still hold "Raz-Kids" and "1,000 baht". Task 2.2 says only that the removed-namespace case fails. Add case (e). Also, task 2.1 says to run "the part for the four files" of the assets test. Name the way to run it (`-t` with the test name), because the page-source case fails before tasks 2.3 and 2.4.
- **N3 [Low] Range overlap in spec 4.3 and task 2.5.** "Lines 233 to 357" overlaps "lines 354 to 380". The guarantee `it` starts at line 354 and the drift `it` ends at line 352. Write "233 to 352" for the removed cases.
- **N4 [Low] Task 4.3.** It says "Q1 to Q6" of the spec. The spec now has Q7. Write "Q1 to Q7".

## Zero-decision check (round 2)

- Red tasks 1.1 to 1.4 can run with no design decision. The fixture shape and the hooks are fixed. Task 1.3 has the sizes and the header offsets (I confirmed the `VP8 ` chunk width at byte 26 and height at byte 28 on the real outputs).
- Green tasks 2.1 to 2.5 can run with no design decision except N2 (the `-t` form). Task 2.6 stops at N1.
- Open choices that remain are allowed by the spec: section key names, the optional picture entry, and the markup of sections other than the hero.

RESULT: PASS
