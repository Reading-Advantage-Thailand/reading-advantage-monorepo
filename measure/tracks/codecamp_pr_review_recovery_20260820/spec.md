# Specification: Codecamp PR Review Recovery

## Overview

Codecamp pull-request reviews stop permanently on the first contract failure.
The learner sees an amber "pending" badge forever and receives no feedback. The
owner reports that a review sticks about every 3 to 4 submissions.

This track makes the failure visible, removes the two failure causes that normal
intern work triggers, and gives the queue a realistic retry budget.

## Evidence

| Defect | Location |
|---|---|
| A contract violation skips all retries and dead-letters at once | `packages/webhooks/src/review-worker.ts:1013` |
| A dead job leaves the learner row at `pending` | `packages/webhooks/src/review-worker.ts:1029` |
| The learner component accepts only the four editorial statuses | `apps/codecamp-advantage/components/review-history.tsx:15` |
| Generated path segments kill the review | `packages/domain/src/codecamp/review-exercise.ts:55` |
| The model must cover every bound objective exactly once | `packages/domain/src/codecamp/review-exercise.ts:325` |
| References must sit inside a changed hunk | `packages/domain/src/codecamp/review-exercise.ts:348` |
| Five attempts span about 30 seconds | `BASE_BACKOFF_MS` default 1000, `MAX_ATTEMPTS` default 5 |
| The scheduler has no attempt deadline | `apps/codecamp-advantage/scripts/configure-review-worker-scheduler.sh` |
| The review model is a floating alias | `packages/domain/src/codecamp/review-exercise.ts:52` |

## Reproduction

1. Open a pull request that adds any file under a `dist/`, `build/`, `.next/`,
   or `coverage/` directory.
2. Wait for the Cloud Scheduler tick.
3. Query `review_jobs`. The row is `dead` with
   `last_error = "PR diff contains generated artifacts and cannot be reviewed"`.
4. Open the lesson page. The review still shows "pending".

A second reproduction: any pull request where the model omits one bound
objective, adds an extra objective, or cites a line outside a changed hunk.

## Functional Requirements

**FR-1 — The learner sees the true state.**
The `codecamp.prReviews` procedure returns the derived queue state for each
review. `ReviewHistory` renders `processing`, `retrying`, and `failed` in
addition to the four editorial statuses. A failed review shows a plain-language
reason and a "request another review" action.
The contract reuses `prReviewOperationalStatusSchema` and
`prReviewReportSchema`, which already exist in
`packages/types/src/codecamp.ts:271`. No new enum value is added to
`codecamp_review_status`, because `ALTER TYPE ... ADD VALUE` cannot run inside
the Drizzle migration transaction.

**FR-2 — Generated artifacts are stripped, not fatal.**
`assertSafeReviewDiff` is replaced at its call site by a diff preparation step
that removes whole `diff --git` sections whose path contains a generated
segment (`.next`, `build`, `coverage`, `dist`, `node_modules`) or a generated
suffix (`.map`, `.min.js`, `.min.css`). The remaining source is reviewed. The
step reports the removed paths.

**FR-3 — Stripping everything is a clear terminal outcome.**
When no source remains after stripping, the job settles as a terminal
`skipped_generated` outcome. The learner sees "review skipped" with the removed
paths listed. This is not a silent dead-letter.

**FR-4 — The removed paths are named on the pull request.**
The advisory GitHub comment lists the ignored paths and states that build output
does not belong in a commit. This holds for both FR-2 and FR-3.

**FR-5 — Model formatting misses are retryable.**
Contract violations that describe model output shape become retryable with a
bounded repair loop. The repair prompt restates the violated rule and the
authorized objective identifiers. The loop runs at most twice inside one job
attempt. Only after the repair loop fails does the failure reach `settleJob`.

Retryable (model shape):
- "Review output must cover every graph-bound objective exactly once"
- "Review output references a file outside the reviewed diff"
- "Review output references lines outside the changed diff hunk"
- "Review output contains objective evidence for an unbound repository"
- "APK objective evidence must match the authored rubric score"

Permanent (input safety):
- "PR diff appears to contain a secret and cannot be reviewed"
- "PR diff contains binary content and cannot be reviewed"
- "PR diff is too large for safe review" (measured after stripping)
- "Review relationship requires a valid review ID"
- "Review relationship ... could not resolve an exercise repository and module"

**FR-6 — The retry budget spans minutes, not seconds.**
`REVIEW_WORKER_BACKOFF_BASE_MS` is set to `30000` in the Cloud Run deployment.
Five attempts then span about 8 minutes, which survives a short provider rate
limit or a transient 5xx.

**FR-7 — A tick has a time budget.**
`runWorkerTick` accepts a deadline and stops claiming new batches once it is
reached. The default is 120 seconds. The scheduler job sets
`--attempt-deadline=180s`.

**FR-8 — The review model is pinned.**
`CODECAMP_PR_REVIEW_MODEL` is set to an exact model version in
`cloudbuild.yaml`. The floating `~x-ai/grok-latest` default stays only as the
library fallback.

**FR-9 — Terminal outcomes are observable.**
Every terminal settle writes one structured log line with `event`,
`reviewJobId`, `reviewId`, `outcome`, and a truncated reason. The administrator
dead-letter list shows the same reason.

## Non-Functional Requirements

- No change to the `codecamp_review_status` enum and no database migration.
- No change to the claim, lease, or reclaim semantics of the queue.
- Existing durable-queue tests continue to pass unchanged.
- The repair loop adds at most two extra model calls per job attempt.

## Acceptance Criteria

- A pull request containing `dist/bundle.js` plus one edited source file
  receives an advisory review of the source file, and the comment names the
  ignored path.
- A pull request containing only generated files ends as `skipped_generated`,
  and the lesson page states that the review was skipped and why.
- A forced objective-coverage violation retries with a repair prompt and
  succeeds on the second call.
- A job that reaches `dead` renders on the lesson page as "failed" with a
  reason, never as "pending".
- `SELECT status, left(last_error, 80), count(*) FROM review_jobs GROUP BY 1, 2`
  run against production before and after the change shows the dead rows for
  generated artifacts and objective coverage fall to zero.
- Browser acceptance: submit a real pull request from an intern account, then
  observe the lesson page move through `processing` to `reviewed`.

## Out of Scope

- Making advisory model evidence into trusted mastery evidence. That is
  `codecamp_mastery_evidence_projection_20260820`.
- Replacing the durable queue with a simpler design. The queue is not the
  defect and the risk is not justified now.
- Any change to `packages/webhooks/src/index.ts`, the standalone Hono server.
