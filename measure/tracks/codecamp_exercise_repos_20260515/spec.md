# Specification: Codecamp Exercise Repos & Portfolio Projects

## Overview

The codecamp-advantage bootcamp platform has a fully implemented fork-based exercise workflow (fork → code → PR → LLM review), but it currently points to placeholder GitHub repository URLs. This track creates the real exercise repositories on the Reading Advantage GitHub organization, creates the three portfolio project repos (one per phase), updates the seed data with real URLs, and validates the end-to-end exercise workflow from an intern's perspective.

## Functional Requirements

1. **Exercise Repositories (16 repos)** — Create one exercise repo per module that has an exercise lesson (Modules 2–17, excluding Module 1 which has no exercise and Module 16 which uses the live monorepo). Each repo must contain:
   - A scaffolded starter project matching the module's topic
   - A `README.md` with the exercise instructions, learning objectives, and acceptance criteria
   - A `SOLUTION.md` (hidden from interns via `.gitignore` guidance) or a `solution/` branch with reference solutions
   - `.github/ISSUE_TEMPLATE/` for filing practice issues (Modules 17–18)

2. **Portfolio Project Repositories (3 repos)** — Create one portfolio repo per phase:
   - **Phase A — Personal Portfolio Website**: HTML/CSS starter with README spec
   - **Phase B — Learning Dashboard**: React + Next.js scaffold with README spec
   - **Phase C+D — Student Progress Tracker**: Next.js + Drizzle scaffold mirroring RA patterns with README spec

3. **Seed Data Update** — Replace all placeholder `repoUrl` values in `packages/db/src/seed/codecamp-curriculum-data.ts` with the real GitHub URLs. Ensure the seed script is idempotent (existing module rows are updated, not duplicated).

4. **End-to-End Validation** — Manually verify the full exercise workflow:
   - Intern forks a repo, creates a branch, makes a commit, opens a PR
   - The webhook (or manual trigger) creates a PR review record in the database
   - The LLM review pipeline runs and posts comments
   - The intern sees their review status on the module page

5. **GitHub App Configuration** — Ensure the GitHub App credentials are configured for the new repos (webhook secret, private key, app ID). Document the setup steps in a `docs/github-app-setup.md` file.

## Non-Functional Requirements

- All repos must be public so interns can fork them without organization access
- Each repo must have a consistent structure: `README.md`, starter code in the root, `.github/` directory where appropriate
- Seed data must be idempotent — running `pnpm --filter @reading-advantage/db run seed` multiple times must not create duplicate rows
- The `codecamp_exercise_repos` table must be seeded alongside modules so that `getExerciseRepos` returns real URLs instead of placeholders

## Acceptance Criteria

- [ ] 16 exercise repos exist on the Reading Advantage GitHub org with correct starter code
- [ ] 3 portfolio project repos exist with correct scaffolds
- [ ] Seed data contains real `https://github.com/reading-advantage/...` URLs
- [ ] `pnpm --filter @reading-advantage/db run seed` updates existing rows without duplicates
- [ ] Fork→PR→review cycle verified end-to-end for at least one exercise repo
- [ ] GitHub App webhook fires correctly and creates a `codecamp_pr_reviews` record
- [ ] Dashboard and module pages display real repo links (no placeholder URLs)
- [ ] Module 1 and Module 18 do not show exercise repos (or show a contextual message)
- [ ] All existing tests pass (`pnpm turbo run test --filter=@reading-advantage/domain --filter=@reading-advantage/api --filter=@reading-advantage/webhooks --filter=codecamp-advantage`)

## Out of Scope

- Creating the GitHub App registration itself (requires org admin access, done manually)
- Module 16 exercise (uses the live monorepo, no separate repo needed)
- Designing new UI components (all exercise UI exists — fork-instruction, review-history, workflow-tracker)
- Changing the LLM review model or prompt (covered by existing codecamp review remediation track)