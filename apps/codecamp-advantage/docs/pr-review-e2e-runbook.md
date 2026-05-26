# Codecamp PR Review — End-to-End Runbook

**Script:** [`scripts/codecamp-pr-e2e.sh`](../../scripts/codecamp-pr-e2e.sh)
**Target:** Production — `https://codecamp.reading-advantage.com`
**Owner:** Codecamp track
**Last verified:** _pending first run_

This runbook walks through verifying the full intern PR-review pipeline against the deployed codecamp app:

```
fork upstream → push branch → open PR → GitHub App webhook →
codecamp_pr_reviews row → reviewExercise() → OpenRouter LLM →
postPrComment() back to the PR
```

---

## When to run

- After any change to `packages/webhooks/src/github.ts`, `packages/domain/src/codecamp/index.ts` (review path), or the GitHub App configuration.
- Before declaring a production deploy verified.
- When debugging a "no AI comment on my PR" intern report.

---

## Preconditions

| # | Requirement | How to check |
|---|-------------|--------------|
| 1 | `gh` authenticated | `gh auth status` shows `Logged in to github.com` |
| 2 | `gh` user's login matches a `users.githubUsername` row in the production codecamp DB | See [DB probe](#db-probe-optional) — webhook returns "No matching codecamp user" otherwise |
| 3 | `git` configured with a credential helper that can push to your fork | `git push --dry-run` against any of your own repos succeeds |
| 4 | GitHub App `ra-codecamp-reviewer` installed on the upstream exercise repo with `contents:read`, `issues:read`, `metadata:read`, `pull_requests:write` | `gh api /orgs/Reading-Advantage-Thailand/installations --jq '.installations[] \| select(.app_slug=="ra-codecamp-reviewer")'` shows `updated_at` recent enough to include the repo |
| 5 | `OPENROUTER_API_KEY` env var set on the Cloud Run service | Cloud Run service env vars |
| 6 | Webhook URL `https://codecamp.reading-advantage.com/webhooks/github/pr` reachable | `curl -I https://codecamp.reading-advantage.com/webhooks/github/pr` returns 401 (missing signature — proves endpoint is up) |

If precondition 2 fails, register a codecamp user with your GitHub username in the dashboard before running.

---

## Run

```bash
# Default: prod, upstream = codecamp-exercise-git-github
./scripts/codecamp-pr-e2e.sh

# Different exercise repo
UPSTREAM=Reading-Advantage-Thailand/codecamp-exercise-react-fundamentals \
  ./scripts/codecamp-pr-e2e.sh

# Also probe the DB for the row (requires DATABASE_URL in env)
DATABASE_URL='postgresql://...' ./scripts/codecamp-pr-e2e.sh --check-db

# Tunable knobs
POLL_TIMEOUT_SECS=600 POLL_INTERVAL_SECS=10 ./scripts/codecamp-pr-e2e.sh
```

**Expected output (pass):**

```
[E2E] preflight: gh + git
[E2E] running as gh user: bodangren
[E2E] upstream default branch: main
[E2E] ensuring fork: bodangren/codecamp-exercise-git-github
[E2E] cloning fork into /tmp/codecamp-e2e-XXXXXX
[E2E] pushing branch e2e/ai-review/20260525-094312
[E2E] opening PR against Reading-Advantage-Thailand/codecamp-exercise-git-github:main
[E2E] PR opened: https://github.com/Reading-Advantage-Thailand/codecamp-exercise-git-github/pull/42
[E2E] polling for AI review comment (timeout: 300s, every 15s)
......
[PASS] AI review comment posted:
    ## 🤖 CodeCamp AI Review
    **Status:** ⚠️ Needs Changes
    **Summary:** ...
[E2E] result written: ./e2e-results/20260525T094612Z-bodangren.json
[PASS] E2E PASS — PR left open at https://github.com/...
```

Exit codes:

| Code | Meaning |
|------|---------|
| 0 | Pass — AI comment posted within timeout |
| 1 | Setup failure (auth, fork, clone, push, PR creation) |
| 2 | Timeout — PR opened but no AI comment within `POLL_TIMEOUT_SECS` |
| 3 | AI comment posted but indicates LLM error path, or DB probe found no row |

---

## What the script does NOT verify

- **Webhook signature validation.** Implicitly proven (PR comment requires webhook acceptance), but no negative test.
- **Re-trigger behavior.** Only covers the "opened" path; `synchronize` path is identical code and not exercised separately.
- **`completeApprovedPrReviewLesson` side-effect.** Fires only when the LLM marks the PR `passed: true`. Our intentional whitespace edit will almost always return `needs_changes`, so the lesson-completion branch is not covered. To verify it manually:
  1. Open a PR with a high-quality change against an exercise repo.
  2. After the AI comment arrives, check `codecamp_pr_reviews.review_status = 'approved'`.
  3. Check `codecamp_user_lesson_progress` has a `completed` row for the matching lesson.

---

## DB probe (optional)

To pull a `DATABASE_URL` for `--check-db`:

```bash
# Using gcloud's Cloud SQL Proxy (recommended — no IP allowlist)
gcloud sql connect codecamp-prod --user=postgres --database=codecamp
# Then in psql:
\d codecamp_pr_reviews
select pr_url, review_status, reviewed_at, llm_review_summary
  from codecamp_pr_reviews
 order by created_at desc limit 5;
```

Or set `DATABASE_URL` from Secret Manager and pass `--check-db`.

---

## Cleanup

The script leaves the PR open intentionally so a human can confirm the AI comment renders correctly in the GitHub UI.

To clean up afterwards:

```bash
PR_URL='https://github.com/Reading-Advantage-Thailand/codecamp-exercise-git-github/pull/42'
gh pr close "$PR_URL" --delete-branch --comment "E2E test complete — closing."

# To also delete the fork (the script never deletes it automatically):
gh repo delete "$(gh api /user --jq .login)/codecamp-exercise-git-github" --yes
```

`./e2e-results/*.json` records every run; safe to commit or wipe.

---

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Exit 1 at `gh pr create` | Branch already exists upstream or fork is stale | `gh pr list --repo <upstream>` to find dupes; delete the branch on fork |
| Exit 2 (timeout) and webhook URL responds 200 to a hand-crafted `curl` | Webhook fired but ignored — most likely the `gh` user's login is not in `users.githubUsername` | DB probe; register the user; rerun |
| Exit 2 and GitHub App "Recent Deliveries" tab shows no deliveries for the PR | App not installed on the target repo, or installation lost write access | Visit `https://github.com/organizations/Reading-Advantage-Thailand/settings/installations/132752129` and confirm the repo is selected |
| Exit 3 with "Review failed — please check manually." | OpenRouter outage, key revoked, or `getInstallationTokenForRepo()` failure | Cloud Run logs for `[GitHub Webhook] LLM review failed:` stack trace |
| `[E2E] fork did not appear within 40s` | GitHub fork-creation lag | Re-run; or `gh repo fork <upstream> --clone=false` manually then re-run |

---

## Audit trail

Every run writes `./e2e-results/<UTC-timestamp>-<gh-user>.json`:

```json
{
  "outcome": "pass",
  "detail": "AI review comment posted and verified",
  "pr_url": "https://github.com/Reading-Advantage-Thailand/codecamp-exercise-git-github/pull/42",
  "gh_user": "bodangren",
  "upstream": "Reading-Advantage-Thailand/codecamp-exercise-git-github",
  "branch": "e2e/ai-review/20260525-094312",
  "ts": "2026-05-25T09:46:12Z"
}
```

Use these blobs to populate the track's "Manual verification" evidence section in `plan.md`.
