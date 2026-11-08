# Phase 4 dry-run report (per_app_cicd_20261107)

report_head: 7d81c7e6fd6f067431b931812baafc36cbe16f2d
origin_master: f3611d47c7ca5b02848691bab1cc109266511842

## Dry runs

Command: `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/dry-run.test.mjs` gave EXIT=0, Tests 12 passed (12). Each row is one `DRYRUN` line of that run: the fake range runs the `select` step of the three workflows with a logging fake `gcloud`. No secret, no deploy, no workflow run.

| Row | Mode | Fake range | cd-www | cd-apps | ci | gcloud_calls | Exit |
|---|---|---|---|---|---|---|---|
| www-reading-advantage | direct | apps/www-reading-advantage/dry-run.txt | www=yes | [] | ["www-reading-advantage"] | gcloud_calls=0 | EXIT=0 |
| primary-advantage | gated | apps/primary-advantage/dry-run.txt | www=no | ["primary-advantage"] | ["primary-advantage"] | gcloud_calls=0 | EXIT=0 |
| storytime | gated | apps/storytime/dry-run.txt | www=no | ["storytime"] | ["storytime"] | gcloud_calls=0 | EXIT=0 |
| accounting | gated | apps/accounting/dry-run.txt | www=no | ["accounting"] | ["accounting"] | gcloud_calls=0 | EXIT=0 |
| codecamp-advantage | gated | apps/codecamp-advantage/dry-run.txt | www=no | ["codecamp-advantage"] | ["codecamp-advantage"] | gcloud_calls=0 | EXIT=0 |
| marketing | gated | apps/marketing/dry-run.txt | www=no | ["marketing"] | ["marketing"] | gcloud_calls=0 | EXIT=0 |
| sales-advantage | gated | apps/sales-advantage/dry-run.txt | www=no | ["sales-advantage"] | ["sales-advantage"] | gcloud_calls=0 | EXIT=0 |
| accounts | gated | apps/accounts/dry-run.txt | www=no | ["accounts"] | ["accounts"] | gcloud_calls=0 | EXIT=0 |
| workbooks | gated | apps/workbooks/dry-run.txt | www=no | ["workbooks"] | ["workbooks"] | gcloud_calls=0 | EXIT=0 |
| reading-advantage | excluded | apps/reading-advantage/dry-run.txt | www=no | [] | ["reading-advantage"] | gcloud_calls=0 | EXIT=0 |
| ci | ci | docs/a.md,measure/b.md | www=no | [] | [] | gcloud_calls=0 | EXIT=0 |
