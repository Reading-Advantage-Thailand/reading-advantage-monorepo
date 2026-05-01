# Repository Guidelines

## Project Structure & Module Organization

Core application logic lives in `app/`, which follows the Next.js App Router layout with feature groups such as `(auth)` and `(dashboard)` plus API handlers under `app/api/`. Shared UI lives in `components/`, with `components/ui/` mirroring shadcn/ui primitives and `components/features/` collecting higher-level widgets. Cross-cutting utilities reside in `lib/` (auth, database client, helpers). Database schema, migrations, and seed scripts are maintained in `prisma/`, while static assets live in `public/` and extended documentation belongs in `docs/`.

## Build, Test, and Development Commands

Install dependencies with `npm install`. Use `npm run dev` for the local Next.js server. Database tasks rely on Prisma: `npx prisma generate` to refresh the client, `npx prisma db push` to sync schema, and `npx prisma db seed` for baseline content. For production artifacts run `npm run build`; staging and production deploys use `npm run deploy:staging` and `npm run deploy:production`.

## Coding Style & Naming Conventions

Write all components and modules in TypeScript with 2-space indentation. ESLint and Prettier configurations ship with the repo—run `npm run lint` before opening a PR. Prefer PascalCase for components (`LessonOverviewCard`) and camelCase for functions, variables, and Prisma fields. Keep files focused; collocate component-specific hooks or styles alongside the component.

## Testing Guidelines

Tests are organized by scope. Execute `npm run test` for unit coverage, `npm run test:integration` when touching API routes or Prisma logic, and `npm run test:e2e` before deploys. Name test files with the `.test.ts` or `.spec.ts` suffix adjacent to the code under test. Seed deterministic fixtures before integration runs, and update snapshots whenever intentional UI changes are introduced.

## Commit & Pull Request Guidelines

Follow Conventional Commits (`feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `test:`) to keep history machine-readable. Keep commits scoped to a single concern and include context about affected modules. Pull requests should link to Jira or GitHub issues, describe functional changes, list test commands executed, and attach screenshots or screen recordings for UI updates. Flag any schema or environment changes in the PR summary so reviewers can coordinate migrations.

## Environment & Security Tips

Duplicate `.env.example` into `.env.local` before development and populate credentials for PostgreSQL, NextAuth, Google OAuth, OpenAI, Google Cloud Storage, and Redis. Never commit `.env*` files or production secrets. Rotate keys whenever rotating cloud resources, and confirm that Prisma migrations run cleanly in staging before tagging a release.

### Local Auth Configuration Reminder

- Only Google OAuth is enabled.
- Localhost sign-in is restricted to the single Google account `bodangren@gmail.com`.
- There are no seeded email/password accounts; tests requiring other roles must mock the session layer.
- A dev-only impersonation toggle is available when `NEXT_PUBLIC_DEV_AUTH=true`. Use the panel on `/signin` to assume teacher or student roles; the override stores an HTTP-only cookie and is automatically cleared on sign out.
- Any new feature must remain production-secure (no dev overrides leaking to prod) while still supporting the dev impersonation flow so manual QA can run locally.

## GitHub-Centric Workflow (gh CLI)

- Location: Complete details at .claude/skills/git-workflow/SKILLS.md
- Default branch: `main` (trunk-based). Create one short-lived branch per issue. Do not create sprint branches.
- Sprints: Use GitHub Milestones (recommended) and/or Projects for tracking. Assign every issue to the current milestone.
- Labels: `type:feature`, `type:fix`, `type:chore`, `area:frontend`, `area:backend`, `area:prisma`, `area:auth`, `priority:P1|P2|P3`.
- Commit style: Conventional Commits. Prefer squash merge to keep history clean.

### Prerequisites

- Install GitHub CLI: `gh auth login` and ensure you have repo scope.
- Ensure branch protection on `main` requires PR, 1+ approval, and passing checks.

### Issue → Branch → PR

1. Create issue in current sprint and start a branch
   - `export SPRINT_MILESTONE="S0 – Skeleton + Auth"`
   - `TITLE="<short issue title>"`
   - `DESC="<what/why + acceptance criteria summary>"`
   - `NUM=$(gh issue create --title "$TITLE" --body "$DESC" --label "type:feature" --milestone "$SPRINT_MILESTONE" --assignee @me --json number --jq .number)`
   - `BR="feat/${NUM}-$(echo "$TITLE" | tr '[:upper:]' '[:lower:]' | sed -E 's/[^a-z0-9]+/-/g;s/^-|-$//g' | cut -c1-40)"`
   - `git switch -c "$BR"`

2. Work the todo
   - Commit with Conventional Commits (`feat:`, `fix:`, `chore:`). Keep changes scoped to the issue.
   - Run `npm run lint` and relevant tests before pushing.

3. Publish branch and open PR
   - `git push -u origin "$BR"`
   - `gh pr create --fill --label "type:feature" --milestone "$SPRINT_MILESTONE" --draft=false`
   - Request review (can target a “review agent” account): `gh pr edit --add-reviewer <github-user>`
   - Enable auto-merge (squash): `gh pr merge --auto --squash`

4. After merge
   - `git checkout main && git pull --ff-only`
   - `git branch -d "$BR" && gh branch delete "$BR" -y`

### Branch Naming

- Format: `<type>/<issue-number>-<kebab-title>` where `<type>` ∈ `feat|fix|chore|docs|refactor|test`.
- Examples: `feat/123-lesson-viewer`, `fix/207-auth-callback`, `chore/319-ci-cache`.

### Sprint Organization

- Milestones: One per sprint (e.g., `S0 – Skeleton + Auth`). Issues must have a milestone.
- Projects (optional): If using Projects, add issues after creation: `gh project item-add --owner <org-or-user> --number <project-number> --url $(gh issue view $NUM --json url --jq .url)`.
- No sprint branches: use the milestone to group issues; branches stay per-issue off `main`.

### Sprint Kickoff Automation

- Author stories with user stories + acceptance criteria in `docs/sprint/SX.md` using `##` headers per story.
- Seed issues (dry-run first): `scripts/seed-issues.sh docs/sprint/S0.md "S0 – Skeleton + Auth"`
- Apply for real: `ASSIGNEE=@me EXTRA_LABELS="priority:P1" scripts/seed-issues.sh docs/sprint/S0.md "S0 – Skeleton + Auth" --apply`
- Then work each issue using the Issue → Branch → PR flow above.

### Safety & Automation

- Required checks: CI must run lint, unit tests, and integration tests on PRs.
- CODEOWNERS: add reviewers by path to enforce relevant approvals.
- Templates: use Issue/PR templates to capture acceptance criteria and test notes.
- Auto-labeling (optional): set up a GitHub Action to apply `area:*` labels by path.

### TDD Protocol

- Red → Green → Refactor for every story.
- Start with tests:
  - Unit tests for pure functions, hooks, and utilities.
  - Integration tests for API routes and Prisma flows (`npm run test:integration`).
  - E2E for the main happy path of the slice (`npm run test:e2e`).
- Keep tests adjacent to code using `.test.ts`/`.spec.ts`. Seed deterministic fixtures for integration.
- Mocks: only at boundaries (OpenAI, Google, Auth) using in-repo stubs.
- PRs must include a Test Plan section and evidence (logs/screenshots) that tests pass.
- Coverage goal for core modules: ≥80% lines (do not block MVP if it risks delivery; raise post-MVP).

### Quick Aliases (optional)

- Create issue + branch in one command:
  - `gh alias set start '!f(){ NUM=$(gh issue create --title "$1" --body "${2:-No body}" --label "type:feature" --milestone "$SPRINT_MILESTONE" --assignee @me --json number --jq .number); BR=feat/$NUM-$(echo "$1"|tr A-Z a-z|sed -E "s/[^a-z0-9]+/-/g;s/^-|-$//g"|cut -c1-40); git switch -c "$BR"; echo "$BR"; }; f'`
- Open PR with auto-merge:
  - `gh alias set publish 'pr create --fill && pr merge --auto --squash'`

### Review Protocol

- Reviewer checks: scope, tests, security for auth/db changes, migrations reviewed.
- If changes requested: push fixes to the same branch; auto-merge continues after approval.
- If the PR is merged: always sync back to `main`; never continue work on a merged branch.

## AI Collaboration Guidelines

- Default to the spec-first workflow documented in `CLAUDE.md`.
- Reference capability specs in `docs/specs/` before starting implementation and document requirement updates directly in those specs.
- Use GitHub issues and pull requests as the primary coordination mechanism; avoid role-based agent commands from the legacy process.
- When delegating to AI tooling, include the relevant spec excerpt, acceptance criteria, and test expectations so work stays aligned with the git-centric flow.

