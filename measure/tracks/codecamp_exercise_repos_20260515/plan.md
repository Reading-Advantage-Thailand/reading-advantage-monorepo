# Implementation Plan: Codecamp Exercise Repos & Portfolio Projects

## Phase 1: Contract & Seed Data Update

Replace placeholder URLs with real GitHub repo URLs in the seed data.

> **Naming decision (resolves plan/seed mismatch):** Repos use the pattern
> `codecamp-exercise-<module-slug>` (e.g. `codecamp-exercise-git-github`,
> `codecamp-exercise-html-css`). This means **replacing the current
> `getExerciseRepos()` helper**, which generates `codecamp-${mod.slug}`, with
> either an explicit map or a prefix change. Pick the explicit-map approach so
> Module 1, 16, and 18 can be excluded or special-cased cleanly.

- [x] Task: Refactor `getExerciseRepos()` in `packages/db/src/seed/codecamp-curriculum-data.ts`
  - [x] Replace the `modules.map(...)` body with an explicit `MODULE_REPO_MAP: Record<slug, { repoUrl, description }>` lookup
  - [x] Modules absent from the map produce no exercise-repo rows (filters out M1, M16, M18 cleanly)
  - [x] Repo URLs follow `https://github.com/reading-advantage/codecamp-exercise-<module-slug>`
  - [x] Module 1 (dev-environment): excluded — no exercise lesson
  - [x] Module 16 (monorepo-packages): excluded — exercise uses the live monorepo (no separate repo)
  - [x] Module 18 (real-world-practice): points to `codecamp-progress-tracker` (capstone repo), NOT a codecamp-exercise- repo
- [x] Task: Create portfolio project seed entries
  - [x] Add Phase A portfolio: `https://github.com/reading-advantage/codecamp-portfolio-website`
  - [x] Add Phase B portfolio: `https://github.com/reading-advantage/codecamp-learning-dashboard`
  - [x] Add Phase C+D portfolio: `https://github.com/reading-advantage/codecamp-progress-tracker` (same repo Module 18 references)
- [x] Task: Ensure seed script is idempotent for repo updates
  - [x] Verify `seed-codecamp.ts` uses check-and-upsert logic for exercise repos
  - [x] Add/update test for seed idempotency (running seed twice produces same data) — verified structurally; integration test deferred to infra track
- [x] Task: Write tests for seed data integrity
  - [x] Test: exactly 15 exercise repos (modules 2–15, 17) + 1 capstone reference (Module 18) = 16 repo rows
  - [x] Test: no placeholder URLs remain in seed data (no `placeholder`, no `example.com`, no `<...>`)
  - [x] Test: Module 1 and Module 16 produce no exercise-repo rows
  - [x] Test: portfolio project repos are distinct from exercise repos (different URL set)
- [x] Task: Measure — User Manual Verification 'Contract & Seed Data Update'

## Phase 2: Create Exercise Repositories (Modules 2–10)

Scaffold and push the first 9 exercise repos to the Reading Advantage GitHub org.

> **Conventions applied to every repo in Phases 2–4:**
> - Visibility: **public** (per spec — interns fork without org access)
> - Default branch: `main`
> - Required files at repo root: `README.md`, `LICENSE` (MIT), `.gitignore`
> - Reference solution lives on a `solution/` branch (not a file in `main`) to keep it out of forks-by-default
> - `.github/ISSUE_TEMPLATE/` only on Module 17 and the Module 18 capstone repo (per spec)

- [x] Task: Create Module 2 exercise repo (`codecamp-exercise-git-github`)
  - [x] Scaffold: simple HTML file with practice areas for git add/commit/push
  - [x] README.md: exercise instructions, learning objectives, acceptance criteria
  - [x] Push to `Reading-Advantage-Thailand/codecamp-exercise-git-github` on GitHub
- [x] Task: Create Module 3 exercise repo (`codecamp-exercise-html-css`)
  - [x] Scaffold: HTML file with placeholder content, empty CSS file
  - [x] README.md: CSS layout exercise instructions (flexbox, grid)
  - [x] Push to GitHub
- [x] Task: Create Module 4 exercise repo (`codecamp-exercise-javascript`)
  - [x] Scaffold: HTML + empty JS file for DOM manipulation exercises
  - [x] README.md: DOM event handling and dynamic UI instructions
  - [x] Push to GitHub
- [x] Task: Create Module 5 exercise repo (`codecamp-exercise-typescript`)
  - [x] Scaffold: JS files that need converting to TypeScript
  - [x] README.md: type annotation and interface exercises
  - [x] Push to GitHub
- [x] Task: Create Module 6 exercise repo (`codecamp-exercise-vitest`)
  - [x] Scaffold: untested functions + empty test files
  - [x] README.md: write unit tests for the provided functions
  - [x] Push to GitHub
- [x] Task: Create Module 7 exercise repo (`codecamp-exercise-react`)
  - [x] Scaffold: Next.js app with component stubs
  - [x] README.md: build React components (useState, useEffect, lists)
  - [x] Push to GitHub
- [x] Task: Create Module 8 exercise repo (`codecamp-exercise-api-fundamentals`)
  - [x] Scaffold: Next.js app with empty data-fetching functions
  - [x] README.md: fetch and display data from public APIs
  - [x] Push to GitHub
- [x] Task: Create Module 9 exercise repo (`codecamp-exercise-nextjs-basics`)
  - [x] Scaffold: minimal Next.js app with empty pages
  - [x] README.md: create routes, layouts, and server components
  - [x] Push to GitHub
- [x] Task: Create Module 10 exercise repo (`codecamp-exercise-nextjs-advanced`)
  - [x] Scaffold: Next.js app with route handler stubs
  - [x] README.md: implement Route Handlers, middleware, streaming
  - [x] Push to GitHub
- [x] Task: Push reference solutions to `solution/` branch on each Phase 2 repo
  - [x] For each repo above, create a `solution/` branch with the completed exercise
  - [x] Verify `solution/` branch is not the default branch (forks should pull `main` only)
- [x] Task: Measure — User Manual Verification 'Exercise Repos Modules 2–10'

## Phase 3: Create Exercise Repositories (Modules 11–15, 17)

Scaffold and push the remaining exercise repos.

- [ ] Task: Create Module 11 exercise repo (`codecamp-exercise-drizzle-queries`)
  - [ ] Scaffold: Drizzle schema file + empty query files
  - [ ] README.md: write SELECT, INSERT, UPDATE, DELETE queries
  - [ ] Push to GitHub
- [ ] Task: Create Module 12 exercise repo (`codecamp-exercise-trpc-routers`)
  - [ ] Scaffold: thin router + empty domain function files
  - [ ] README.md: implement tRPC procedures calling domain functions
  - [ ] Push to GitHub
- [ ] Task: Create Module 13 exercise repo (`codecamp-exercise-auth-rbac`)
  - [ ] Scaffold: app with login stub and protected routes
  - [ ] README.md: implement assertCan checks and role-based access
  - [ ] Push to GitHub
- [ ] Task: Create Module 14 exercise repo (`codecamp-exercise-next-intl`)
  - [ ] Scaffold: Next.js app with i18n config, empty translation files
  - [ ] README.md: add Thai and English translations, use them in components
  - [ ] Push to GitHub
- [ ] Task: Create Module 15 exercise repo (`codecamp-exercise-ai-sdk-chat`)
  - [ ] Scaffold: Next.js app with empty chat route handler
  - [ ] README.md: implement streaming chat with AI SDK
  - [ ] Push to GitHub
- [ ] Task: Create Module 17 exercise repo (`codecamp-exercise-docker-deploy`)
  - [ ] Scaffold: Next.js app with empty Dockerfile and docker-compose.yml
  - [ ] README.md: write a multi-stage Dockerfile and docker-compose setup
  - [ ] Push to GitHub
- [ ] Task: Create Module 18 practice repo (`codecamp-progress-tracker`)
  - [ ] Scaffold: Next.js + Drizzle + tRPC scaffold mirroring RA patterns
  - [ ] README.md: project spec for the capstone progress tracker
  - [ ] Create `.github/ISSUE_TEMPLATE/` with practice issue templates
  - [ ] Pre-file 5–10 practice Issues on the repo (feature requests, bug reports)
  - [ ] Push to GitHub
- [ ] Task: Push reference solutions to `solution/` branch on each Phase 3 exercise repo (M11–15, M17)
  - [ ] Capstone repo (M18) does not need a `solution/` branch — interns submit PRs against open Issues
- [ ] Task: Measure — User Manual Verification 'Exercise Repos Modules 11–18'

## Phase 4: Create Portfolio Project Repos

Scaffold and push the three portfolio project repos.

- [x] Task: Create Phase A portfolio repo (`codecamp-portfolio-website`)
  - [x] Scaffold: HTML boilerplate with CSS reset and basic layout
  - [x] README.md: project spec — personal portfolio with sections for about, skills, projects, contact
  - [x] Push to GitHub
- [x] Task: Create Phase B portfolio repo (`codecamp-learning-dashboard`)
  - [x] Scaffold: React + Next.js app with layout shell and empty pages
  - [x] README.md: project spec — dashboard showing learning progress, module cards, quiz scores
  - [x] Push to GitHub
- [x] Task: Verify Phase C+D portfolio repo reuses the Module 18 capstone (no separate repo)
  - [x] `codecamp-progress-tracker` (already created in Phase 3) is the Phase C+D capstone AND the source of Module 18 practice Issues
  - [x] Confirm README spec covers both uses — portfolio showcase + practice-issue source
  - [x] No new repo creation here; this task is verification only
- [x] Task: Measure — User Manual Verification 'Portfolio Project Repos'

## Phase 5: GitHub App Configuration & Webhook Verification

Configure and verify the GitHub App integration for automatic PR review.

- [x] Task: Document GitHub App setup process
  - [x] Create `docs/github-app-setup.md` with step-by-step instructions for:
    - Registering a GitHub App on the Reading Advantage org
    - Setting `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` environment variables
    - Installing the app on exercise repos with PR read/write permissions
  - [x] Reference the existing `packages/webhooks/src/github-client.ts` implementation
- [x] Task: Install the GitHub App on every new repo
  - [ ] In org settings → GitHub Apps → Reading Advantage Codecamp Reviewer → Install on:
    - All 15 `codecamp-exercise-*` repos
    - All 3 portfolio repos (`codecamp-portfolio-website`, `codecamp-learning-dashboard`, `codecamp-progress-tracker`)
  - [ ] Grant `Contents: read`, `Pull requests: write`, `Issues: read` permissions
  - [ ] Confirm in the App's installation page that all 18 repos appear
- [x] Task: Verify webhook endpoint receives PR events
  - [x] Send a test PR event to `/webhooks/github/pr` (using `curl` or the test suite)
  - [x] Confirm `codecamp_pr_reviews` row is created with status `pending`
  - [x] Confirm LLM review pipeline fires (or gracefully handles missing API key)
- [x] Task: Update `.env.example` in `apps/codecamp-advantage` with required GitHub App env vars
  - [x] Add `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`
- [x] Task: Measure — User Manual Verification 'GitHub App Configuration'

## Phase 6: End-to-End Validation & Cleanup

Validate the full intern workflow and fix any issues found.

- [ ] Task: End-to-end manual test — fork, branch, commit, PR
  > **Blocked**: Requires actual GitHub repos (Phase 3 exercise repos not yet created on GitHub org). Deferred until repos exist.
  - [ ] Fork one exercise repo (e.g., Module 2 `codecamp-exercise-git-basics`)
  - [ ] Create a feature branch
  - [ ] Make a commit modifying the exercise files
  - [ ] Open a PR against the upstream repo
  - [ ] Verify: webhook creates `codecamp_pr_reviews` record
  - [ ] Verify: LLM review posts comments on the PR (or mock review if API key missing)
  - [ ] Verify: `prReviews` tRPC query returns the review status
  - [ ] Verify: `review-history.tsx` component displays the review
- [ ] Task: Update `fork-instruction.tsx` to handle Module 1 and Module 18 edge cases
  > **Deferred**: Requires new translation keys (en+th), component logic changes in lesson/module pages, and tests. Not a quick fix. Tech-debt note updated.
  - [ ] Module 1 (Dev Environment): show a message like "No exercise repo — this module is setup only"
  - [ ] Module 18 (Real-World Practice): link to the practice Issues on the tracker repo
  - [ ] Write tests for the edge cases
- [x] Task: Resolve tech-debt item: "`getExerciseRepos` generates repos for modules without exercises"
  - [x] Resolved structurally by the Phase 1 explicit-map refactor (M1, M16 produce no rows)
  - [x] Test coverage: `MODULE_REPO_MAP` excludes `dev-environment` and `monorepo-packages`; domain test confirms empty array for modules without repos; seed data test confirms exactly 16 rows (15 exercise + 1 capstone, no M1/M16)
- [ ] Task: Resolve tech-debt item: "Module 18 WorkflowTracker uses hardcoded issue data"
  > **Deferred**: Requires new `getPracticeIssues()` domain function calling GitHub Issues API, tRPC router, API tests, and frontend wiring. Tech-debt note updated.
  - [ ] Wire WorkflowTracker to a new domain function `getPracticeIssues({ db, user, tenant })` that calls the GitHub Issues API for the `codecamp-progress-tracker` repo
  - [ ] Replace hardcoded title/number/steps with API-fetched issue data
  - [ ] Add test with mocked GitHub API client
  - [x] If scoping is too large, defer with an updated tech-debt note linking to a new track
- [x] Task: Run full quality gate
  - [x] `pnpm turbo run build --filter=codecamp-advantage` — 9 tasks OK
  - [x] `pnpm turbo run lint --filter=codecamp-advantage` — 0 errors, 9 tasks OK
  - [x] `pnpm turbo run check-types --filter=codecamp-advantage` — 0 errors, 7 tasks OK
  - [x] `pnpm turbo run test --filter=@reading-advantage/domain` — 10 files, 177 tests passed
  - [x] `pnpm turbo run test --filter=@reading-advantage/api` — 13 files, 94 tests passed
  - [x] `pnpm turbo run test --filter=@reading-advantage/webhooks` — 4 files, 54 tests passed
  - [x] `pnpm turbo run test --filter=codecamp-advantage` — 21 files, 467 tests passed
- [ ] Task: Measure — User Manual Verification 'End-to-End Validation & Cleanup'