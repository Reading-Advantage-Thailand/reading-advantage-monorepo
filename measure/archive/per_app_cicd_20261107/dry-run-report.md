# Phase 4 dry-run report (per_app_cicd_20261107)

report_head: abd7e30ae0511e459a676e180aada28378deefe9
origin_master: f3611d47c7ca5b02848691bab1cc109266511842

## Dry runs

Command: `CI=true pnpm exec vitest run --maxWorkers=1 scripts/ci/__tests__/dry-run.test.mjs` gave EXIT=0, Tests 12 passed (12). Each row is one `DRYRUN` line of that run: the fake range runs the `select` step of the three workflows with a logging fake `gcloud`. No secret, no gcloud call, no workflow run.

| Row | Mode | Fake range | cd-www | cd-apps | ci_apps | gcloud_calls | Exit |
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

Mode direct = traffic; gated = no_traffic; excluded = skipped. The word `traffic` names a class of apps in the table `scripts/ci/apps.json`. It is not the live traffic state of a service.

## First-push plan

first_push_plan: report_head=abd7e30ae0511e459a676e180aada28378deefe9 base=f3611d47c7ca5b02848691bab1cc109266511842 commits=434 affected=["accounting","accounts","codecamp-advantage","marketing","primary-advantage","reading-advantage","sales-advantage","storytime","workbooks","www-reading-advantage"] traffic=["www-reading-advantage"] no_traffic=["accounting","accounts","codecamp-advantage","marketing","primary-advantage","sales-advantage","storytime","workbooks"] skipped=["reading-advantage"] www_text_changes=0

The push moves traffic for one app: www-reading-advantage, through the direct workflow. Eight apps build a no-traffic revision: accounting, accounts, codecamp-advantage, marketing, primary-advantage, sales-advantage, storytime, and workbooks. The app reading-advantage is skipped. Daniel decides whether the push happens.

## www text changes

Command: `git diff --name-only f3611d47c7ca5b02848691bab1cc109266511842 abd7e30ae0511e459a676e180aada28378deefe9 -- apps/www-reading-advantage packages/ui packages/utils packages/config`. The result is `www_closure_files_changed=1`. The one file is a test file. Two commits changed it: 03307ccb2 and abd7e30ae. Both commits belong to another track. They change a test, not a page that a reader sees, so the class is `no-text` and the reason is `test only`. The text check of the pull request stays empty.

www_live_sha: f3611d47c7ca5b02848691bab1cc109266511842 (run 41796713212)
held_signin_copy_in_head: 0

| File | Class | Old text | New text | Live old | Live new |
|---|---|---|---|---|---|
| apps/www-reading-advantage/src/lib/__tests__/storytime-page-images.test.ts | no-text (test only) | none (test file, no page text) | none (test file, no page text) | n/a | n/a |

## Addendum 2026-11-09: logging.viewer for the www deploy key (PM decision)

The track is closed. This addendum records a PM decision of 2026-11-09, not a task of the track. Every build config uses `logging: CLOUD_LOGGING_ONLY`, and the www workflow streams the build log with `gcloud builds submit`. In project `www-reading-advantage`, the deploy key had no `roles/logging.viewer`, so the www job could end red while the build and the deploy succeed. The other two projects already gave the key this role. The PM chose the grant (option a) and rejected the `--async` change (option b). The Monorepo orchestrator ran both commands at 00:16 ICT.

1. Grant. Command: `gcloud projects add-iam-policy-binding www-reading-advantage --member="serviceAccount:www-reading-github@www-reading-advantage.iam.gserviceaccount.com" --role="roles/logging.viewer" --condition=None --format="none"`. Exit 0. Output: `Updated IAM policy for project [www-reading-advantage].`
2. Read-back. Command: `gcloud projects get-iam-policy www-reading-advantage --flatten="bindings[].members" --filter="bindings.members:www-reading-github@www-reading-advantage.iam.gserviceaccount.com" --format="value(bindings.role)"`. Exit 0. Output: `roles/cloudbuild.builds.editor`, `roles/logging.viewer`, `roles/serviceusage.serviceUsageConsumer`, `roles/storage.bucketViewer`.

The first push (task 4.5, deferred:pm) is the live proof that the www job streams its log.
