# Implementation Plan: Codecamp Exercise Repos & Portfolio Projects

## Phase 1: Contract & Seed Data Update

Replace placeholder URLs with real GitHub repo URLs in the seed data.

- [ ] Task: Update exercise repo seed URLs in `packages/db/src/seed/codecamp-curriculum-data.ts`
  - [ ] Replace all `repoUrl` placeholder values with real `https://github.com/reading-advantage/codecamp-exercise-MODULE-SLUG` URLs
  - [ ] Ensure Module 1 (dev-environment) has no exercise repos (it has no exercise lesson)
  - [ ] Ensure Module 16 (monorepo) references the live monorepo URL or has no exercise repos
  - [ ] Ensure Module 18 (real-world-practice) references the Phase C+D portfolio tracker repo
- [ ] Task: Create portfolio project seed entries
  - [ ] Add Phase A portfolio: `https://github.com/reading-advantage/codecamp-portfolio-website`
  - [ ] Add Phase B portfolio: `https://github.com/reading-advantage/codecamp-learning-dashboard`
  - [ ] Add Phase C+D portfolio: `https://github.com/reading-advantage/codecamp-progress-tracker`
- [ ] Task: Ensure seed script is idempotent for repo updates
  - [ ] Verify `seed-codecamp.ts` uses `ON CONFLICT DO UPDATE` or check-and-upsert logic for exercise repos
  - [ ] Add/update test for seed idempotency (running seed twice produces same data)
- [ ] Task: Write tests for seed data integrity
  - [ ] Test: all 16 exercise repos have valid `https://github.com/` URLs
  - [ ] Test: no placeholder URLs remain in seed data
  - [ ] Test: portfolio project repos are distinct from exercise repos
- [ ] Task: Measure — User Manual Verification 'Contract & Seed Data Update'

## Phase 2: Create Exercise Repositories (Modules 2–10)

Scaffold and push the first 9 exercise repos to the Reading Advantage GitHub org.

- [ ] Task: Create Module 2 exercise repo (`codecamp-exercise-git-basics`)
  - [ ] Scaffold: simple HTML file with practice areas for git add/commit/push
  - [ ] README.md: exercise instructions, learning objectives, acceptance criteria
  - [ ] Push to `reading-advantage/codecamp-exercise-git-basics` on GitHub
- [ ] Task: Create Module 3 exercise repo (`codecamp-exercise-css-layouts`)
  - [ ] Scaffold: HTML file with placeholder content, empty CSS file
  - [ ] README.md: CSS layout exercise instructions (flexbox, grid)
  - [ ] Push to GitHub
- [ ] Task: Create Module 4 exercise repo (`codecamp-exercise-javascript-dom`)
  - [ ] Scaffold: HTML + empty JS file for DOM manipulation exercises
  - [ ] README.md: DOM event handling and dynamic UI instructions
  - [ ] Push to GitHub
- [ ] Task: Create Module 5 exercise repo (`codecamp-exercise-typescript-convert`)
  - [ ] Scaffold: JS files that need converting to TypeScript
  - [ ] README.md: type annotation and interface exercises
  - [ ] Push to GitHub
- [ ] Task: Create Module 6 exercise repo (`codecamp-exercise-vitest-testing`)
  - [ ] Scaffold: untested functions + empty test files
  - [ ] README.md: write unit tests for the provided functions
  - [ ] Push to GitHub
- [ ] Task: Create Module 7 exercise repo (`codecamp-exercise-react-components`)
  - [ ] Scaffold: Next.js app with component stubs
  - [ ] README.md: build React components (useState, useEffect, lists)
  - [ ] Push to GitHub
- [ ] Task: Create Module 8 exercise repo (`codecamp-exercise-api-consumption`)
  - [ ] Scaffold: Next.js app with empty data-fetching functions
  - [ ] README.md: fetch and display data from public APIs
  - [ ] Push to GitHub
- [ ] Task: Create Module 9 exercise repo (`codecamp-exercise-nextjs-basics`)
  - [ ] Scaffold: minimal Next.js app with empty pages
  - [ ] README.md: create routes, layouts, and server components
  - [ ] Push to GitHub
- [ ] Task: Create Module 10 exercise repo (`codecamp-exercise-nextjs-advanced`)
  - [ ] Scaffold: Next.js app with route handler stubs
  - [ ] README.md: implement Route Handlers, middleware, streaming
  - [ ] Push to GitHub
- [ ] Task: Measure — User Manual Verification 'Exercise Repos Modules 2–10'

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
- [ ] Task: Measure — User Manual Verification 'Exercise Repos Modules 11–18'

## Phase 4: Create Portfolio Project Repos

Scaffold and push the three portfolio project repos.

- [ ] Task: Create Phase A portfolio repo (`codecamp-portfolio-website`)
  - [ ] Scaffold: HTML boilerplate with CSS reset and basic layout
  - [ ] README.md: project spec — personal portfolio with sections for about, skills, projects, contact
  - [ ] Push to GitHub
- [ ] Task: Create Phase B portfolio repo (`codecamp-learning-dashboard`)
  - [ ] Scaffold: React + Next.js app with layout shell and empty pages
  - [ ] README.md: project spec — dashboard showing learning progress, module cards, quiz scores
  - [ ] Push to GitHub
- [ ] Task: Create Phase C+D portfolio repo (`codecamp-progress-tracker`)
  - [ ] Note: This is the same repo as the Module 18 practice repo, used as both the capstone project and the source of practice Issues. Ensure it covers both uses.
  - [ ] Verify the repo has: Next.js scaffold, Drizzle config, tRPC router stubs, README spec, and pre-filed Issues
- [ ] Task: Measure — User Manual Verification 'Portfolio Project Repos'

## Phase 5: GitHub App Configuration & Webhook Verification

Configure and verify the GitHub App integration for automatic PR review.

- [ ] Task: Document GitHub App setup process
  - [ ] Create `docs/github-app-setup.md` with step-by-step instructions for:
    - Registering a GitHub App on the Reading Advantage org
    - Setting `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET` environment variables
    - Installing the app on exercise repos with PR read/write permissions
  - [ ] Reference the existing `packages/webhooks/src/github-client.ts` implementation
- [ ] Task: Verify webhook endpoint receives PR events
  - [ ] Send a test PR event to `/webhooks/github/pr` (using `curl` or the test suite)
  - [ ] Confirm `codecamp_pr_reviews` row is created with status `pending`
  - [ ] Confirm LLM review pipeline fires (or gracefully handles missing API key)
- [ ] Task: Update `.env.example` in `apps/codecamp-advantage` with required GitHub App env vars
  - [ ] Add `GITHUB_APP_ID`, `GITHUB_PRIVATE_KEY`, `GITHUB_WEBHOOK_SECRET`, `OPENROUTER_API_KEY`
- [ ] Task: Measure — User Manual Verification 'GitHub App Configuration'

## Phase 6: End-to-End Validation & Cleanup

Validate the full intern workflow and fix any issues found.

- [ ] Task: End-to-end manual test — fork, branch, commit, PR
  - [ ] Fork one exercise repo (e.g., Module 2 `codecamp-exercise-git-basics`)
  - [ ] Create a feature branch
  - [ ] Make a commit modifying the exercise files
  - [ ] Open a PR against the upstream repo
  - [ ] Verify: webhook creates `codecamp_pr_reviews` record
  - [ ] Verify: LLM review posts comments on the PR (or mock review if API key missing)
  - [ ] Verify: `prReviews` tRPC query returns the review status
  - [ ] Verify: `review-history.tsx` component displays the review
- [ ] Task: Update `fork-instruction.tsx` to handle Module 1 and Module 18 edge cases
  - [ ] Module 1 (Dev Environment): show a message like "No exercise repo — this module is setup only"
  - [ ] Module 18 (Real-World Practice): link to the practice Issues on the tracker repo
  - [ ] Write tests for the edge cases
- [ ] Task: Resolve tech-debt item: "`getExerciseRepos` generates repos for modules without exercises"
  - [ ] Either filter out modules with no exercise repos in the domain query
  - [ ] Or remove the placeholder seed entries for M1 and M18
  - [ ] Write tests to confirm empty repo list for modules without exercises
- [ ] Task: Run full quality gate
  - [ ] `pnpm turbo run build --filter=codecamp-advantage`
  - [ ] `pnpm turbo run lint --filter=codecamp-advantage`
  - [ ] `pnpm turbo run check-types --filter=codecamp-advantage`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/domain`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/api`
  - [ ] `pnpm turbo run test --filter=@reading-advantage/webhooks`
  - [ ] `pnpm turbo run test --filter=codecamp-advantage`
- [ ] Task: Measure — User Manual Verification 'End-to-End Validation & Cleanup'