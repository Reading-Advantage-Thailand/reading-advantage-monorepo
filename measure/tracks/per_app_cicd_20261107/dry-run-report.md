# Phase 4 dry-run report (per_app_cicd_20261107)

report_head: abd7e30ae0511e459a676e180aada28378deefe9
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

## First-push plan

first_push_plan: report_head=abd7e30ae0511e459a676e180aada28378deefe9 base=f3611d47c7ca5b02848691bab1cc109266511842 commits=434 affected=["accounting","accounts","codecamp-advantage","marketing","primary-advantage","reading-advantage","sales-advantage","storytime","workbooks","www-reading-advantage"] traffic=["www-reading-advantage"] no_traffic=["accounting","accounts","codecamp-advantage","marketing","primary-advantage","sales-advantage","storytime","workbooks"] skipped=["reading-advantage"] www_text_changes=0

The push deploys one app to traffic: www-reading-advantage, through the direct workflow. Eight apps build with no traffic move: accounting, accounts, codecamp-advantage, marketing, primary-advantage, sales-advantage, storytime, and workbooks. The app reading-advantage is skipped. Daniel decides whether the push happens.

## www text changes

Command: `git diff --name-only f3611d47c7ca5b02848691bab1cc109266511842 abd7e30ae0511e459a676e180aada28378deefe9 -- apps/www-reading-advantage packages/ui packages/utils packages/config`. The result is `www_closure_files_changed=1`. The one file is a test file. Two commits changed it: 03307ccb2 and abd7e30ae. Both commits belong to another track. They change a test, not a page that a reader sees. The text check of the pull request stays empty.

www_live_sha: f3611d47c7ca5b02848691bab1cc109266511842 (run 41796713212)
held_signin_copy_in_head: 0

| File | Class | Old text | New text | Live old | Live new |
|---|---|---|---|---|---|
| apps/www-reading-advantage/src/lib/__tests__/storytime-page-images.test.ts | test only | none (test file, no page text) | none (test file, no page text) | n/a | n/a |
