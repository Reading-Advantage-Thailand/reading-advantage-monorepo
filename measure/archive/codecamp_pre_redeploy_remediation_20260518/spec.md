# Specification: codecamp-advantage Pre-Redeployment Remediation

## Overview

Resolve the curriculum, runtime progression, GitHub practice workflow, and readiness issues found in the CodeCamp Advantage audit before redeploying the current local updates to GCP.

This track is a blocker for redeployment. The goal is not to redesign the entire bootcamp. The goal is to make the current course and app safe enough for interns to use without getting stuck, following broken links, or submitting GitHub work that never receives review.

## Context

`codecamp-advantage` is intended to train interns from fundamentals through full-stack contribution using:

- An 18-module, 85-lesson curriculum.
- Sequential progress tracking and module prerequisites.
- Fork-based exercise repositories.
- GitHub App webhook review with LLM feedback.
- A final GitHub Issues practice workflow on `codecamp-progress-tracker`.

The audit found that the curriculum has a strong instructional spine, but several implementation and workflow gaps can break the actual student path:

- Module locking can deadlock after Module 1 because theory lessons have no completion action while prerequisites require previous modules to be 100% complete.
- The GitHub PR review path depends on webhook attribution through `users.githubUsername`, but intern creation does not collect GitHub usernames.
- Manual "Track PR" submission can create a pending review without triggering the LLM review pipeline.
- Two seeded portfolio project repos do not exist on GitHub.
- The GitHub App installation and fork-to-PR review E2E validation are still incomplete.
- Curriculum and seed/runtime contracts drift in Unit 17 and in older exercise repo names.
- Assessments are mostly completion/quizzes, not competency rubrics.
- Seed/runtime tests do not enforce fidelity to the class-period plans.

## Goals

- Ensure interns can progress through modules without deadlocks.
- Make prerequisite behavior coherent and enforceable.
- Ensure GitHub PR review works for normal intern accounts.
- Ensure seeded and dashboard-linked GitHub repositories actually exist.
- Make manual PR tracking either trigger review or clearly act as a status lookup.
- Finish GitHub App readiness checks and E2E validation before redeploying.
- Add tests that prevent core curriculum/data regressions.
- Add enough assessment and instructor guidance to make the curriculum operational.
- Produce clear redeployment readiness evidence.

## Non-Goals

- Rewriting the entire 85-lesson curriculum.
- Replacing the GitHub App or LLM provider.
- Building automated code sandboxing or executing arbitrary student code.
- Implementing CI/CD auto-deploy for CodeCamp. That remains separate tech debt.
- Redesigning the UI beyond what is needed to fix the audited workflows.
- Running production QA. That remains the follow-up `codecamp_qa_prod_20260517` track after redeployment.

## Scope

### In Scope

- Runtime module/lesson progression and completion semantics.
- Prerequisite checks at UI and domain/API boundaries.
- Quiz pass/fail completion semantics.
- Canonical curriculum seeding and stale placeholder cleanup.
- GitHub username capture/edit/backfill flows.
- Webhook attribution and unmatched webhook visibility.
- Manual PR tracking behavior and PR URL validation.
- Portfolio repo existence or seed/dashboard link correction.
- Module 18 GitHub Issues practice surface.
- Unit 17 exercise repo contract reconciliation.
- Curriculum fidelity tests for seed data vs class-period plans.
- Lesson page localization of UI chrome.
- Assessment rubric and remediation documentation.
- Local QA and pre-redeployment validation commands.

### Out of Scope

- Full production QA on `https://codecamp.reading-advantage.com`.
- Automatic Cloud Build/GitHub Actions deployment triggers.
- Major course duration expansion beyond documenting buffer/remediation guidance.
- Multi-organization GitHub App support unless required for the current org.

## Acceptance Criteria

- [ ] A student can complete Module 1 and start Module 2 through normal UI actions.
- [ ] Theory, exercise, and quiz lessons have explicit and tested completion semantics.
- [ ] Module/lesson reads either enforce prerequisites server-side or the product explicitly treats locking as advisory, with tests matching the decision.
- [ ] Quiz completion semantics are consistent between domain and UI. If 70% is the pass threshold, scores below 70 do not mark the lesson complete.
- [ ] Seed data is canonical and idempotent: stale placeholder modules are removed, unpublished, or otherwise excluded from the dashboard.
- [ ] Intern accounts can store and update GitHub usernames.
- [ ] GitHub webhook attribution works for a normal intern PR and unmatched webhook events are visible to admins or logs.
- [ ] Manual PR submission cannot create an unrecoverable pending review. It either triggers review or clearly reports webhook-only status.
- [ ] PR URLs are validated server-side against the selected exercise repository.
- [ ] `codecamp-portfolio-website` and `codecamp-learning-dashboard` either exist on GitHub or are removed/replaced from seed/dashboard links.
- [ ] GitHub App installation is verified for every exercise and portfolio/capstone repo needed by the app.
- [ ] At least one real fork-to-PR-to-review E2E workflow passes locally or against the intended pre-production target.
- [ ] Module 18 shows real practice issues before PR submission and maps PRs to issues.
- [ ] Unit 17 curriculum, seed data, and UI agree on whether it uses an exercise repo or the intern's tracker project.
- [ ] Curriculum seed tests catch material omissions from class-period plans for representative units.
- [ ] Lesson-page chrome under `[locale]` is localized in English and Thai message files.
- [ ] Assessment rubrics exist for module exercises, capstone PRs, testing, code quality, GitHub hygiene, and independence/escalation behavior.
- [ ] `pnpm turbo run test --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks --filter=codecamp-advantage` passes or any unrelated baseline failures are documented.
- [ ] `pnpm turbo run check-types --filter=codecamp-advantage` passes.
- [ ] `pnpm turbo run build --filter=codecamp-advantage` passes.
- [ ] Redeployment is explicitly cleared or blocked in the final readiness note.

## Dependencies

- Existing deployment runbook: `docs/deployment/gcp-cloud-run-monorepo-deployment.md`.
- Existing deployment track: `measure/tracks/codecamp_deployment_20260516/`.
- Existing exercise repo track: `measure/tracks/codecamp_exercise_repos_20260515/`.
- Existing production QA track: `measure/tracks/codecamp_qa_prod_20260517/`.
- GitHub org access for `Reading-Advantage-Thailand`.
- GitHub App admin access or a user who can verify installation.

## Risk Notes

- GitHub App installation may require human/org owner action. If blocked, document the exact missing repo permissions and keep redeployment blocked.
- Current worktree contains unrelated local changes. Implementation must avoid reverting unrelated edits.
- Some audited issues may overlap existing tech debt. This track should resolve or supersede the relevant rows rather than duplicating stale debt indefinitely.

