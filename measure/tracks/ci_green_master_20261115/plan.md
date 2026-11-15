# Plan: CI green on master

Track: `ci_green_master_20261115` (light lane).

## Phase 1: Failure causes and the two fixes

- [ ] 1.1 Read the failing logs of run 43667794723 and list every distinct failure cause.
- [ ] 1.2 Add `public/experience/assets/` to the eslint ignores of
  `apps/www-reading-advantage/eslint.config.mjs` (PC-1, FR-1) and verify the app lint exits 0.
- [ ] 1.3 Classify the architecture drift (PC-2, FR-3): run the pin refresh, inspect the diff,
  and decide stale pin vs real boundary break.
- [ ] 1.4 Refresh the v2 manifest pins with the repo's own script; record which file changed
  and why (FR-2).
- [ ] 1.5 Run local gates (app lint, architecture check), push to master, watch CI, and close
  the track when CI is green.
