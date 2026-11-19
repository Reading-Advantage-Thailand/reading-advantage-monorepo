# Closeout report — www products page photos

> Track: `www_products_photos_20261115` (light lane, bug)
> Closed: 2026-11-16
> Pre-closeout HEAD: `23c29d89acc30ca5515c4cf1b57d74bcc9104287` (tip of `origin/master`)
> Final acceptance: `measure/runs/www_products_photos_20261115/final-acceptance-23c29d89a.json`, verdict pass
> Phase 1 acceptance: `measure/runs/www_products_photos_20261115/phase-acceptance-p1-23c29d89a.json`, verdict pass
> Role owner: Monorepo orchestrator. PM assignment A-62.

## What shipped

The www products page and the marketing heroes show their photos at 390, 980, 1024, and
1280 px. The root cause was `hidden xl:block` on the hero `floatingImage`. The text box
"See How We Report Results" covered `blended-learning.png`. The Tutor section had no picture.

The track leaves four gates in place:

- AC-1 Playwright e2e `apps/www-reading-advantage/e2e/photos.spec.ts`, 56 cases over six pages,
  two locales, and four widths. Green logs read 56 passed.
- AC-2 unit test on `HeroSection`, which fails at `8193625ca^`.
- AC-3a the photo e2e steps in `ci.yml`, job `affected`, matrix id `www-reading-advantage`.
- AC-3b the same e2e in `cd-www-reading-advantage.yml` before "Submit Cloud Build".

## Approval

- Daniel passed the look of the live page: exact word "Ok", Tasks, 2026-11-16 07:38 ICT,
  relayed by the PM.
- PM page-check: PASS 2026-11-16 06:15, `~/Desktop/handoff/page-check/20261116-0615/`.

## Deviations kept in the record

- **AC-4 layout deviation.** AC-4 says the "See How We Report Results" text goes beside the
  picture from the `lg` breakpoint. The report-results card stays stacked at every width, because
  the grid cell is one third wide at `lg`. No text covers the photo, and the AC-1 cover and text
  rules pass at all four widths. The deviation stays accepted and unfixed.
- **AC-3a is dormant.** The three www photo-e2e steps in `ci.yml` have never run. The earlier unit
  test step fails on `src/lib/blog-blocks.test.ts:210` with a 5000 ms timeout on every www push
  (runs 43721191676 and 43739337764). The wiring is correct and mirrors the CD twin that ran green
  in run 43721191756 before the deploy. The steps start to run when the timeout is fixed.
- **Green r4 log lost.** The r4 log died with the deleted worktree `www-w23-pin`. Final acceptance
  re-verified the claim by a W-23 regex replay: 12 `uses` lines, 0 unpinned.

## The 10 nonblocking findings and their routing

| ID | Finding | Routing |
|----|---------|---------|
| F1 | Plan task 1.4 read "PM page check pending" | Closed at closeout: the plan names the PASS and its folder |
| F2 | `measure/tracks.md` understated the state as "Phase 1 Red is next" | Closed at closeout: the row moves to the archived form |
| F3 | The 10 percent text-overlap rule has no recorded failing-first proof | Accepted residue; a later adversarial round can build a pre-fix page and prove it |
| F4 | The Green r4 log died with its worktree | Recorded here; the W-23 replay re-verified 38/38 |
| F5 | `apps/www-reading-advantage/test-results/.last-run.json` stays tracked by mistake | A later chore outside this track untracks it |
| F6 | Both Review A rounds ran on a route that `measure/orchestration-models.md` bars for this staffing | Orchestrator staffing record |
| F7 | AC-3a cannot execute while `blog-blocks.test.ts:210` times out | Track `ci_green_master_20261115` fixes the timeout |
| F8 | The AC-4 stacked-card layout deviation | Noted in this report |
| F9 | Daniel passed the look with "Ok" | The manual gate, not a role finding |
| F10 | `bash measure/doctor.sh` exits 1 on the architecture manifest | Track `ci_green_master_20261115`; the doctor stays not green until the manifest is repaired |

## Gates at closeout

- `bash measure/doctor.sh`: see the closeout log for the exit code. The marker, catalog, and
  review-truthfulness steps pass. The architecture step fails on the V2 reconciliation manifest
  hash, which is external and owned by `ci_green_master_20261115`.
- `node scripts/ci/affected-apps.mjs --base 23c29d89a --head HEAD`: see the closeout log.
- `bash tests/orchestrator_marker_vocabulary.sh`: PASS, only `[ ]`, `[~]`, `[x]`, `[b]` markers.
- Plan census: 4 tasks, all `[x]`, each with a commit SHA. No `[~]`, no `[ ]`, no `[b]`.
