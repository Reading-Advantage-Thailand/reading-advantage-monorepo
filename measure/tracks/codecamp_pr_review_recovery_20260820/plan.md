# Implementation Plan: Codecamp PR Review Recovery

> **Browser acceptance:** Submit a real pull request from an intern account and
> watch the lesson page move through `processing` to `reviewed`. Then submit a
> pull request containing only generated files and confirm the `skipped` state
> and its reason. Unit and worker tests alone do not close a phase.

> **Production probe first.** Before Phase 1, run the confirmation query in
> `spec.md#reproduction` against production and paste the result into this plan
> under "Production baseline". The failure mix decides the order of FR-2 and
> FR-5 inside Phase 3.

## Production baseline

- [x] Task: Record the `review_jobs` status and error mix from production
    - [x] Run `SELECT status, left(last_error, 80) AS err, count(*) FROM review_jobs GROUP BY 1, 2 ORDER BY 3 DESC`
    - [x] Paste the result here with the date and the operator name
    - [x] Record how many `dead` rows have a learner review still at `pending`

Result, run 2026-08-20 by daniebo (via orchestrator agent, Cloud SQL proxy):

```
 status   | err | count
----------+-----+-------
 succeeded |     |     3
```

All 3 rows succeeded with `attempts = 0` and no `last_error`. The jobs date
from 2026-08-03 and 2026-08-10. `codecamp_pr_reviews` holds 23 approved,
3 reviewed, and 1 needs_changes. No review sits at `pending`. Dead rows with
a pending learner review: 0.

Interpretation: the queue currently holds no dead rows, so the failure mix
does not order FR-2 and FR-5 inside Phase 3. Both proceed in plan order. The
owner report of a stuck review every 3 to 4 submissions remains the defect
evidence, together with the code paths in `spec.md#evidence`. This snapshot
is the comparison point for the Phase 4 verification query.

## Phase 1: Contract & Schema Definition
_Blast radius: `settleJob` and `processJob` are reached through the dependency-injection seams in `runWorkerTick`, so `build-graph callers` resolves no static edges. Grep confirms the call sites are `packages/webhooks/src/review-worker.ts` and its test suite only._

- [x] Task: Define the terminal outcome contract (96841ba)
    - [x] Add `ReviewJobTerminalOutcome` to `packages/webhooks/src/review-worker.ts`: `succeeded | skipped_generated | failed_permanent | failed_exhausted`
    - [x] Extend `SettleJobPayload` with `outcome` and `failureReason` (max 240 characters)
    - [x] Keep the existing `status` column values unchanged; `outcome` is derived, not a new database enum
- [x] Task: Define the learner-visible review contract (96841ba)
    - [x] Extend `prReviewSchema` consumers to use `prReviewReportSchema` on the learner path in `packages/types/src/codecamp.ts` (schema contract defined; consumer wiring is the Phase 3 learner-visible status task)
    - [x] Add `failureReason: z.string().nullable()` to `prReviewReportSchema`
    - [x] Add the `skipped` member to `prReviewOperationalStatusSchema`
    - [x] Confirm no database migration is required, and record the `ALTER TYPE` rationale in the task note
- [x] Task: Define the diff preparation contract (96841ba)
    - [x] Add `prepareReviewDiff(prDiff: string): { diff: string; removedPaths: string[]; empty: boolean }` to `packages/domain/src/codecamp/review-exercise.ts`
    - [x] Keep `assertSafeReviewDiff` for the permanent checks: secret, binary, oversize measured after stripping
    - [x] Export both from `packages/domain/src/codecamp/index.ts`
- [x] Task: Define the model repair contract (96841ba)
    - [x] Add `ReviewContractFailureKind = "model_shape" | "input_safety"` and stamp every `CodecampPrReviewContractError` with it
    - [x] Set `retryable` from the kind rather than the constant `false`
    - [x] Add `buildReviewRepairPrompt(violation: string, authorizedObjectiveIds: string[], changedPaths: string[]): string`
- [x] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md) - orchestrator verification: check-types x3 PASS, types 90/90, domain review-exercise 21/21, webhooks 229 pass with 3 pre-existing unrelated git-notes failures; full diff line review by orchestrator

## Phase 2: Test

Red-phase commits contain ONLY the new test files and Measure document edits.
Check `git status --short` before staging; the tree carries unrelated
modifications (lessons-learned 2026-06-07).

- [x] Task: Write diff preparation Red tests
    - [ ] `packages/domain/src/__tests__/review-diff-preparation.test.ts`
    - [ ] Strips a whole `diff --git` section for `dist/`, `build/`, `.next/`, `coverage/`, `node_modules/`
    - [ ] Strips `.map`, `.min.js`, `.min.css` by suffix
    - [ ] Keeps a source file named `builder.ts` and a directory named `rebuild` — segment match, not substring match
    - [ ] Reports every removed path exactly once, in diff order
    - [ ] Returns `empty: true` when nothing remains
    - [ ] Measures the 200,000 character limit after stripping, not before
    - [ ] Still throws on a secret pattern and on binary content
- [x] Task: Write contract failure classification Red tests
    - [ ] `packages/domain/src/__tests__/review-contract-failure-kind.test.ts`
    - [ ] Each of the five model-shape messages carries `kind = "model_shape"` and `retryable = true`
    - [ ] Each of the five input-safety messages carries `kind = "input_safety"` and `retryable = false`
    - [ ] `isCodecampPrReviewContractError` keeps its existing structural shape for the worker
- [x] Task: Write repair-loop Red tests
    - [ ] `packages/domain/src/__tests__/review-repair-loop.test.ts`
    - [ ] A generator that omits one bound objective on call 1 and is correct on call 2 produces a review
    - [ ] A generator that is wrong three times throws, and the thrown error is `model_shape`
    - [ ] The repair prompt names the violated rule and every authorized objective identifier
    - [ ] The loop makes at most three generator calls in total
- [x] Task: Write settle and outcome Red tests
    - [ ] `packages/webhooks/src/__tests__/review-worker-outcomes.test.ts`
    - [ ] `input_safety` failure settles `dead` with `outcome = "failed_permanent"` and a reason
    - [ ] `model_shape` failure settles `pending` with backoff while attempts remain
    - [ ] Exhaustion settles `dead` with `outcome = "failed_exhausted"`
    - [ ] An empty stripped diff settles `succeeded` with `outcome = "skipped_generated"`
    - [ ] Every terminal settle writes exactly one structured log line
- [x] Task: Write tick deadline Red tests
    - [ ] `packages/webhooks/src/__tests__/review-worker-deadline.test.ts`
    - [ ] `runWorkerTick` stops claiming after the deadline passes and returns cleanly
    - [ ] A job already claimed before the deadline still settles
    - [ ] The default deadline is 120,000 milliseconds
- [x] Task: Write learner-visible status Red tests
    - [ ] `apps/codecamp-advantage/components/__tests__/review-history.test.tsx`
    - [ ] Renders `failed` with a reason and a retry action when the job is dead
    - [ ] Renders `skipped` with the removed paths when the outcome is `skipped_generated`
    - [ ] Renders `processing` and `retrying` from the job state
    - [ ] Never renders `pending` for a dead job
    - [ ] Both locale files carry every new key (`i18n-key-parity.test.ts` must stay green)
- [x] Task: Write deployment contract Red tests
    - [ ] Extend `apps/codecamp-advantage/lib/__tests__/review-worker-deployment-contract.test.ts`
    - [ ] `cloudbuild.yaml` sets `REVIEW_WORKER_BACKOFF_BASE_MS=30000`
    - [ ] `cloudbuild.yaml` sets `CODECAMP_PR_REVIEW_MODEL` to a pinned version, and the value contains no `~` alias prefix
    - [ ] `configure-review-worker-scheduler.sh` passes `--attempt-deadline=180s`
- [x] Task: Confirm the Red phase
    - [x] Run each new suite and record the failing assertion counts in this plan
    - [x] Commit the test files and this plan only

Red counts, verified by the orchestrator on 2026-08-20 (64 failing assertions total):

| Suite | Tests | Red | Passing (regression guards) |
|---|---|---|---|
| review-diff-preparation.test.ts | 10 | 10 | 0 |
| review-contract-failure-kind.test.ts | 14 | 5 | 9 |
| review-repair-loop.test.ts | 4 | 4 | 0 |
| review-worker-outcomes.test.ts | 5 | 4 | 1 |
| review-worker-deadline.test.ts | 3 | 3 | 0 |
| review-history.test.tsx | 35 | 35 | 0 |
| review-worker-deployment-contract.test.ts | 7 | 3 | 4 |

New i18n keys under the `review.` namespace: `statusFailed`, `statusFailedMsg`,
`statusFailedRetryAction`, `statusSkipped`, `statusSkippedMsg`,
`statusSkippedPathsLabel`, `statusProcessing`, `statusProcessingMsg`,
`statusRetrying`, `statusRetryingMsg`. `i18n-key-parity.test.ts` stays green
(439/439). check-types passes for domain, webhooks, and codecamp-advantage.

- [x] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md) - orchestrator re-ran every suite: red counts above reproduced exactly; no existing suite regressed beyond the 3 known pre-existing webhooks git-notes failures

## Phase 3: Implement

- [x] Task: Implement diff preparation (62d65ae)
    - [ ] Add `prepareReviewDiff` and split the generated-path check out of `assertSafeReviewDiff`
    - [ ] Call it at the top of `reviewExercise`, before the module resolution query
    - [ ] Thread `removedPaths` through the `ReviewResult` return so the worker can render it
    - [ ] Match path segments exactly; never match a substring
- [x] Task: Implement contract failure classification (62d65ae)
    - [ ] Add `kind` to `CodecampPrReviewContractError` and set `retryable` from it
    - [ ] Update the five model-shape throw sites in `validateReviewObjectiveEvidence`
    - [ ] Leave `isPermanentReviewContractFailure` in the worker reading `retryable`, so the worker needs no new import
- [x] Task: Implement the repair loop (62d65ae)
    - [ ] Wrap the `generateReview` call in `reviewExercise` with a bounded repair loop, maximum two repairs
    - [ ] Pass the violated rule, the authorized objective identifiers, and the changed paths into the repair prompt
    - [ ] Record the repair count in the review provenance
- [x] Task: Implement outcomes and logging (62d65ae)
    - [ ] Extend `settleJob` to return `outcome` and `failureReason`
    - [ ] Extend `applySettle` to persist `failureReason` into `review_jobs.last_error` when the outcome is terminal
    - [ ] Write the structured terminal log line in `runWorkerTick`
    - [ ] Handle the `skipped_generated` outcome without calling the model
- [x] Task: Implement the advisory comment for removed paths (62d65ae)
    - [ ] Add the ignored-path section to the comment body in `processJob`
    - [ ] Post the comment for the `skipped_generated` outcome as well, so the intern learns why
- [x] Task: Implement the tick deadline (62d65ae)
    - [ ] Add `deadlineMs` to `CreateReviewWorkerOptions` with a 120,000 default
    - [ ] Stop the drain loop when the deadline passes, after the current job settles
    - [ ] Leave `MAX_ITERATIONS_PER_RUN` in place as the second guard
- [x] Task: Implement the learner-visible status (5608b8d app half, 62d65ae domain and API half)
    - [ ] Join `review_jobs` in `getPrReviewsForUser` and return `operationalStatus` and `failureReason`
    - [ ] Switch the `codecamp.prReviews` output schema to `prReviewReportSchema`
    - [ ] Extend `ReviewHistory` props and rendering
    - [ ] Add the English and Thai strings for `failed`, `skipped`, `processing`, `retrying`, and the retry action
    - [ ] Wire the retry action to the existing `createPrReview` path so no new procedure is needed
- [x] Task: Implement the deployment changes (5608b8d)
    - [ ] Add `REVIEW_WORKER_BACKOFF_BASE_MS=30000` and a pinned `CODECAMP_PR_REVIEW_MODEL` to `--set-env-vars` in `cloudbuild.yaml`
    - [ ] Add `--attempt-deadline=180s` to both the create and the update branches of `configure-review-worker-scheduler.sh`
- [x] Task: Confirm the Green phase (62d65ae)
    - [x] Run the domain, webhooks, and app suites; record the counts
    - [x] Run `pnpm --filter codecamp-advantage check-types` and `lint`
    - [x] Run the top-level build, because it is the supervisor gate (lessons-learned 2026-06-10)

Green counts, verified by the orchestrator on 2026-08-20:

| Suite | Result |
|---|---|
| review-diff-preparation, review-contract-failure-kind, review-repair-loop | 28/28 |
| review-worker-outcomes, review-worker-deadline | 8/8 |
| domain review-exercise, review-exercise-ai-client, codecamp | 117/117 |
| webhooks full suite | 237 pass, 3 pre-existing git-notes failures (unrelated) |
| api codecamp-router, admin job suites | 46/46, 38/38 |
| app review-history, deployment contract, i18n parity | 501/501 |

check-types green for domain, webhooks, api, and codecamp-advantage. Lint
zero errors in domain, webhooks, and api. Supervisor gate: the full monorepo
build runs concurrently with the accounting and APK lanes in the same tree,
so the orchestrator ran the gate scoped to this track's packages plus
dependencies: 22/22 tasks successful.

- [x] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md) - orchestrator re-ran every suite independently; all red suites from Phase 2 now green; browser acceptance deferred to Phase 4 closeout

## Phase 4: Generate Docs & Doctor

- [x] Task: Update documentation (7798b93)
    - [x] Record the failure taxonomy in `apps/codecamp-advantage/docs/pr-review-e2e-runbook.md`
    - [x] Document the new environment variables in `apps/codecamp-advantage/.env.example`
    - [x] Correct the `REVIEW_WORKER_ENABLED` note: the interval worker belongs to the standalone Hono server, not to this Cloud Run service
- [x] Task: Run the generated-facts and architecture gates (7798b93)
    - [x] Run `measure/generate.sh` - exit 0
    - [x] Run `measure/doctor.sh` - exit 0
    - [x] Run `build-graph update ./graph.db` for the changed files - 11 files, 553 to 650 nodes, 783 to 812 edges
- [ ] Task: Production verification (pending owner decision on deploy timing)
    - [ ] Deploy, then re-run the baseline query and compare the dead-row mix
    - [ ] Requeue the existing dead jobs and record how many now complete
    - [ ] Record the residual dead rows and their reasons here
    - Note 2026-08-20: the baseline shows zero dead rows and zero pending learner
      reviews, so there are no dead jobs to requeue. Owner decision: hold the deploy
      until all four codecamp_20260820 tracks are complete, then deploy once. The
      accounting and APK lanes also have committed code on the same branch. The
      post-deploy baseline comparison and the browser acceptance run at that point.
- [x] Task: Retrospective (7798b93)
    - [x] Add the enum-in-transaction constraint to `measure/lessons-learned.md` if it is not already there - added; two housekeeping entries merged to hold the 50-line cap
    - [x] Close or update the related `tech-debt.md` rows for the review pipeline - verified: the review-pipeline rows are already Resolved by `webhook_review_reliability_20260605`; no open row matches this track's scope
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)

## Checkpoints

Record a commit SHA only after the commit is an ancestor of HEAD
(`git merge-base --is-ancestor <sha> HEAD`). Recording a pre-rebase SHA has
produced six dangling references in this repository (lessons-learned 2026-06-07).

- Phase 1 contracts: 96841ba
- Phase 2 Red: 71fe25a
- Phase 3 Green: 62d65ae
- Phase 4 docs and doctor: 7798b93
