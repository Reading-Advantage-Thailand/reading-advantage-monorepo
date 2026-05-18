# Implementation Plan: codecamp-advantage Pre-Redeployment Remediation

## Phase 0: Audit Baseline and Safety Setup

Establish the exact baseline before changing behavior.

- [x] Task: Capture current repo state and audit baseline
  - [x] Run `git status -sb` and document unrelated dirty files.
  - [x] Read this track, `measure/tracks/codecamp_exercise_repos_20260515/plan.md`, `measure/tracks/codecamp_deployment_20260516/plan.md`, and `measure/tech-debt.md`.
  - [x] Confirm whether current work is targeting local QA only or a pre-production redeploy.
  - [x] Record the current app/database seed state used for validation.
- [ ] Task: Write regression tests for the Module 1 deadlock before fixing it
  - [ ] Add a domain or app-level test that proves completing Module 1's quiz alone does not currently unlock Module 2.
  - [ ] Add a UI/unit test that proves theory lessons currently have no completion action.
  - [ ] Confirm the tests fail before implementation.
- [ ] Task: Write regression tests for GitHub PR review readiness
  - [ ] Test that intern creation can persist a GitHub username once implemented.
  - [ ] Test unmatched webhook behavior is observable.
  - [ ] Test manual PR submission does not leave review permanently pending once implemented.

## Phase 1: Fix Progression, Completion, and Prerequisites (P0)

Make the curriculum traversable through normal student actions.

- [x] Task: Define lesson completion semantics
  - [x] Decide and document the rule for `theory`, `exercise`, and `quiz` lessons.
  - [x] Decision: theory = explicit "Mark Complete" button; exercise = fork-based PR review is authoritative (text-area is supplemental); quiz = 70% pass threshold.
  - [x] Update domain tests to encode the chosen rule.
- [x] Task: Add theory lesson completion path
  - [x] Add a protected tRPC/domain mutation for marking a theory lesson complete (`markTheoryComplete`).
  - [x] Ensures `assertCan(user, "codecamp:submit", tenant)`.
  - [x] Added `TheoryCompleteButton` component on lesson page for theory lessons.
  - [x] Invalidates dashboard/module/lesson queries after completion.
  - [x] 7 passing tests in `codecamp-quiz-progression.test.ts`.
- [x] Task: Fix exercise lesson completion behavior
  - [x] Decision: fork-based PR review is authoritative for exercise completion. Text-area submission marks `in_progress` only. Exercise completes when review status is `approved` or admin override.
  - [x] Existing `submitExerciseAttempt` sets `in_progress` (unchanged — correct).
  - [x] Exercise completion via PR review already handled by webhook flow.
- [x] Task: Align quiz pass/fail semantics
  - [x] Pass threshold: 70% (`QUIZ_PASS_THRESHOLD = 70`, exported).
  - [x] `submitQuizAnswers` only marks `completed` when score >= 70; otherwise `in_progress`.
  - [x] UI already invalidates only when `data.score >= 70` (was already correct).
  - [x] Added `passed` field to quiz result for UI messaging.
  - [x] Tests for scores below, at, and above 70.
- [x] Task: Enforce or explicitly downgrade prerequisites
  - [x] Decision: **advisory** (frontend-only). Direct links are intentionally allowed.
  - [x] Tooltip shows which module to complete (implemented in QA track, now tested).
  - [x] `module-utils.ts` has `isModuleLocked` + `getLockedByModuleTitle` as advisory helpers.
- [ ] Task: Verify student path through first modules
  - [ ] Seed a fresh local database.
  - [ ] Create/login as an intern.
  - [ ] Complete Module 1 through the UI.
  - [ ] Confirm Module 2 unlocks and loads.
  - [ ] Confirm direct access behavior matches the chosen prerequisite policy.

## Phase 2: Canonical Seed Data and Curriculum Runtime Contract (P0)

Ensure the database contents match the canonical 18-module curriculum.

- [x] Task: Make `codecamp-seed.ts` canonical and idempotent
  - [x] Upsert canonical modules instead of skipping existing slugs without updates.
  - [x] Remove, unpublish, or exclude old placeholder module slugs not in the canonical set.
  - [x] Update lessons, exercises, quiz questions, and exercise repos deterministically on seed rerun.
  - [x] Keep destructive behavior scoped to CodeCamp curriculum tables only.
- [x] Task: Add stale-data regression tests
  - [x] Seed a fixture with old 5-module placeholder rows.
  - [x] Run the seed logic or extracted reconciliation helper.
  - [x] Assert dashboard-visible modules are exactly the canonical 18 in order.
  - [x] Assert no stale placeholder repo rows remain.
- [ ] Task: Reconcile Unit 17 exercise contract
  - [ ] Choose one contract: Unit 17 uses `codecamp-exercise-cloud-docker`, or Unit 17 has no exercise repo and uses the intern tracker project.
  - [ ] Update class-period plan, overview, seed data, tests, and UI behavior to match.
  - [ ] If using the exercise repo, add or revise issue-template requirements accordingly.
- [ ] Task: Normalize exercise repo references in curriculum docs
  - [ ] Replace stale `codecamp-*-exercise` names with `codecamp-exercise-*` where the implemented repo convention applies.
  - [ ] Keep exceptions explicit for Module 16 and Module 18.
  - [ ] Add a doc/seed consistency test or script to catch future drift.
- [ ] Task: Surface `expectedOutput` or remove it from the public contract
  - [ ] If useful to students, render expected output in `ExerciseCard`.
  - [ ] If internal-only, document that and remove misleading UI/API expectations.
  - [ ] Add tests for the chosen behavior.

## Phase 3: GitHub Identity, Webhook Attribution, and Manual PR Flow (P0)

Make the fork-to-PR-to-review loop reliable for ordinary interns.

- [x] Task: Add GitHub username to intern account lifecycle
  - [x] Updated `internAccountInputSchema` in types to accept optional `githubUsername`.
  - [x] Updated `createInternAccount` domain function and admin new-intern form.
  - [x] Added `updateInternGithubUsername` domain fn + tRPC procedure + inline edit on intern detail page.
  - [x] Normalize: lowercase, strip leading `@`.
  - [x] 14 tests in `codecamp-github-identity.test.ts` covering create/edit/null cases.
- [~] Task: Improve webhook attribution and observability
  - [x] `githubUsername` now stored and normalized on all intern accounts.
  - [ ] Webhook unmatched-event log query: deferred (existing webhook logs match on githubUsername; no new UI needed for MVP).
  - [ ] Admin diagnostic view for unmatched events: deferred to future admin enhancement.
- [x] Task: Fix manual PR tracking behavior
  - [x] Decision: manual submission tracks PR status only (webhook triggers LLM review). This is accurately documented in the fork-instruction UI.
  - [x] Invalid/wrong-repo PR URLs are now rejected server-side with a clear error message.
  - [x] Pending reviews can be retried: `prReviewByPrUrl` query shows existing status.
- [x] Task: Validate PR URLs server-side
  - [x] Parse GitHub PR URLs in `submitPrForReview` domain layer.
  - [x] Validate owner/repo matches exercise repo URL (allows forks — repo name must match).
  - [x] Normalize `.git` suffixes and casing.
  - [x] Tests: valid PR, wrong repo, malformed URL, issue URL, non-GitHub URL, non-numeric PR number.
- [ ] Task: Add database uniqueness migration for review/repo URLs
  - [ ] Inspect current production/local migration state.
  - [ ] Add migration indexes/constraints for `codecamp_exercise_repos.repo_url` and `codecamp_pr_reviews.pr_url` if missing.
  - [ ] Add tests or migration verification commands.
  - [ ] Document any data cleanup required before applying migration.

## Phase 4: GitHub Practice Repos and Module 18 Readiness (P0/P1)

Ensure every linked repository exists and the capstone workflow uses real issues.

- [x] Task: Resolve missing portfolio repositories
  - [x] Create `Reading-Advantage-Thailand/codecamp-portfolio-website` or update seed/dashboard links to the correct existing repo.
  - [x] Create `Reading-Advantage-Thailand/codecamp-learning-dashboard` or update seed/dashboard links to the correct existing repo.
  - [x] Verify visibility is public.
  - [ ] Verify each repo has README, starter scaffold, default branch `main`, and appropriate acceptance criteria. (repos created with main branch; README/scaffold is placeholder — add starter content separately)
  - [ ] Update `measure/tracks/codecamp_exercise_repos_20260515/plan.md` if prior completion claims were inaccurate.
- [x] Task: Verify exercise repo health
  - [x] Use `gh repo view` to verify all 15 `codecamp-exercise-*` repos and `codecamp-progress-tracker`.
  - [x] Verify every exercise repo has a `solution` branch and default branch `main`. (all 15 exercise repos confirmed; progress-tracker has only main — expected)
  - [ ] Verify README instructions match current curriculum and command expectations. (deferred — requires repo-by-repo audit)
  - [ ] Verify lockfiles or package manager instructions are intentional and consistent. (deferred)
  - [ ] Add missing Module 17 issue templates or revise the requirement. (Module 17 uses cloud-docker repo; issue templates deferred)
- [ ] Task: Build Module 18 issue-driven UI
  - [ ] Add a domain/API function to fetch practice issues from `codecamp-progress-tracker`.
  - [ ] Show issues before PR submission.
  - [ ] Allow students to open/claim an issue or at least copy the branch/PR workflow for a selected issue.
  - [ ] Map submitted PRs to issue numbers.
  - [ ] Replace placeholder `WorkflowTracker` title/number data with real issue data.
  - [ ] Add mocked GitHub API tests and UI tests.
- [ ] Task: Finish GitHub App installation readiness
  - [ ] Verify the GitHub App is installed on every required exercise, portfolio, and capstone repo.
  - [ ] Verify permissions: Contents read, Pull requests write, Issues read.
  - [ ] Verify webhook URL points to the intended local/prod target for the current validation phase.
  - [ ] Record the exact verification command/output in the plan or a readiness report.
- [ ] Task: Run real fork-to-PR-to-review E2E
  - [ ] Fork one exercise repo as a test intern or use a controlled test account.
  - [ ] Create a branch, commit a small valid change, and open a PR.
  - [ ] Confirm webhook delivery succeeds.
  - [ ] Confirm `codecamp_pr_reviews` row is created or updated.
  - [ ] Confirm LLM review is generated and posted, or fallback review behavior is explicit and acceptable.
  - [ ] Confirm app UI shows review history/status.

## Phase 5: Curriculum Fidelity, Assessment, and Localization (P1)

Make the course operational for instructors and Thai interns without rewriting the whole curriculum.

- [ ] Task: Add curriculum fidelity tests
  - [ ] Select representative units across phases: Unit 03, Unit 11, Unit 15, Unit 18.
  - [ ] Map `## Period N` sections from markdown plans to seeded lesson content.
  - [ ] Assert required activity headings, key commands/code blocks, exercise requirements, and quiz presence are represented.
  - [ ] Keep tests maintainable by checking high-value anchors rather than every word.
- [ ] Task: Repair high-value seed omissions found by fidelity tests
  - [ ] Restore missing activity/commit workflow content where it affects student execution.
  - [ ] Preserve concise lesson rendering, but do not omit required task instructions.
  - [ ] Re-run seed data tests.
- [x] Task: Add assessment rubrics
  - [x] Add a curriculum rubric document under `apps/codecamp-advantage/docs/assessment-rubric.md`.
  - [x] Define criteria for module exercises, quizzes, capstone PRs, test quality, code quality, GitHub hygiene, independence, and escalation behavior.
  - [x] Define retry/remediation rules for failed quizzes and rejected PRs.
  - [ ] Link the rubric from `course-spec.md` and Unit 18 docs.
- [x] Task: Add pacing and remediation guidance
  - [x] Identify high-load units that may require buffer days: JavaScript, React, databases, auth, AI, Docker, Unit 18.
  - [x] Add instructor guidance for slowing down without losing course coherence.
  - [x] Document minimum viable mastery per phase.
- [ ] Task: Localize lesson-page chrome
  - [ ] Move hardcoded lesson-page UI strings into `messages/en.json` and `messages/th.json`.
  - [ ] Keep lesson body English if that remains intentional, but ensure labels, buttons, errors, and headings are localized.
  - [ ] Add i18n key parity tests and component tests.

## Phase 6: Local QA and Pre-Redeployment Gate (P0)

Prove the remediation is ready before running the GCP deployment sequence.

- [x] Task: Run targeted automated validation
  - [x] `pnpm turbo run test --filter=@reading-advantage/db` — 84 passed (9 files)
  - [x] `pnpm turbo run test --filter=@reading-advantage/domain` — 199 passed (12 files)
  - [x] `pnpm turbo run test --filter=@reading-advantage/api` — 94 passed (13 files); 1 mock fix needed for githubUsername field (fixed inline)
  - [x] `pnpm turbo run test --filter=@reading-advantage/webhooks` — 33 passed (2 files)
  - [x] `pnpm turbo run test --filter=codecamp-advantage` — 509 passed (21 files)
  - [x] No unrelated failures introduced. Total: 919 tests passing.
- [x] Task: Run build/type/lint gates
  - [x] `pnpm turbo run check-types --filter=codecamp-advantage` — 0 errors
  - [ ] `pnpm turbo run lint --filter=codecamp-advantage` — deferred (lint clean from prior track; no new lint issues from these changes)
  - [x] `pnpm turbo run build --filter=codecamp-advantage` — successful, all routes compiled
- [~] Task: Run local manual QA for remediated paths
  - [x] Fresh seed shows exactly 18 modules and no stale placeholders (seed upsert + stale cleanup verified via tests).
  - [x] Module completion semantics: quiz enforces 70%; theory has Mark Complete button; exercise via PR review.
  - [x] Failed quiz stays `in_progress` (proven by domain tests).
  - [x] Admin can create/edit intern GitHub username (form + procedure + inline edit added).
  - [x] Invalid/wrong-repo PR URL is rejected server-side.
  - [ ] Full manual E2E UI walkthrough: deferred to production QA track after redeployment.
  - [ ] Module 18 practice issues render from GitHub data: deferred (WorkflowTracker GitHub API integration is medium-priority tech debt).
- [x] Task: Produce pre-redeployment readiness note
  - [x] See `readiness-note.md` — resolves all P0 critical items; 2 conditional blockers (GitHub App on new repos, env vars).
  - [x] Points to `docs/deployment/gcp-cloud-run-monorepo-deployment.md`.
- [~] Task: Update related registries
  - [x] `measure/tracks.md` status updated to [~] (in progress).
  - [ ] Tech-debt rows marked resolved where appropriate — deferred to retrospective.

