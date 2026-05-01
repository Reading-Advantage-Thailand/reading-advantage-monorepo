# Project Workflow

## Principles

1. **Plan is source of truth**: do the work in `plan.md`, not from memory.
2. **Curriculum first**: product and code decisions should improve curriculum
   delivery before adding new adjacent surfaces.
3. **Stay inside the stack**: do not solve problems by introducing technologies
   outside `tech-stack.md`.
4. **TDD where code changes**: red -> green -> refactor remains the default.
5. **Honest status**: do not mark placeholders as shipped capability.
6. **Non-interactive execution**: use non-interactive commands and `CI=true`
   where watch-mode tools could hang.

## Standard Task Workflow

1. Read `product.md`, `tech-stack.md`, `lessons-learned.md`, `tech-debt.md`,
   the track `spec.md`, and the track `plan.md`.
2. Change the next task from `[ ]` to `[~]`.
3. Write or update failing tests first unless the task is documentation-only.
4. Implement the smallest change that satisfies the task.
5. Refactor only with tests green.
6. Run the narrowest validating commands that actually cover the change.
7. Update docs/specs if the behavior, contract, or operator workflow changed.
8. Mark the task `[x]` with the commit SHA when committing is part of the run.

## Required Validation by Change Type

### Application Code

- `npm run lint`
- `npm run test`
- `npm run test:integration` when touching route handlers, Prisma, or auth
- `npm run build` for release-shaping or cross-cutting changes

### Schema or Seed Changes

- `npx prisma generate`
- relevant Prisma sync command for the environment
- targeted seed or validation run when content/contracts changed

### Content and Curriculum Changes

- schema validation for structured content
- targeted tests for content parsers, lesson rendering, or question handling
- manual spot checks of at least one lesson per changed lesson type

## Phase Completion Protocol

When a phase finishes:

1. Run the automated commands that cover the full phase.
2. Record a manual verification checklist for the user-facing behavior.
3. Confirm any tech stack drift discovered during implementation and either fix
   it or log it in `tech-debt.md`.
4. Create a checkpoint commit when the user asks for commit-driven execution.

## Commands

### Setup

```bash
npm install
npx prisma generate
npx prisma db push
npm run seed
```

### Daily Development

```bash
npm run dev
CI=true npm run lint
CI=true npm run test
CI=true npm run test:integration
npm run build
```

### Useful Content Commands

```bash
npm run seed -- --framework=THAI --grade=3
npm run seed -- --framework=THAI --grade=4
npm run optimize:images
```

## Quality Gates

- [ ] Acceptance criteria in `spec.md` are satisfied
- [ ] Tests cover the changed behavior
- [ ] Lint and type-driven tooling pass
- [ ] Security posture did not regress
- [ ] Mobile/tablet classroom usage still works where applicable
- [ ] Docs and operational notes were updated when behavior changed
- [ ] Placeholder work is not presented as complete

## Commit Guidelines

- Use Conventional Commits
- Keep commits scoped to a single task or tightly related slice
- Prefer `feat`, `fix`, `refactor`, `test`, `docs`, and `chore`
- When Measure tracking is active, use `measure(...)` for housekeeping

## Definition of Done

A task is complete when:

1. All code implemented to specification
2. Unit tests written and passing
3. Code coverage meets project requirements
4. Documentation complete (if applicable)
5. Code passes all configured linting and static analysis checks
6. Works beautifully on mobile (if applicable)
7. Implementation notes added to `plan.md`
8. Changes committed with proper message
9. Git note with task summary attached to the commit

## Emergency Procedures

### Critical Bug in Production
1. Create hotfix branch from main
2. Write failing test for bug
3. Implement minimal fix
4. Test thoroughly including mobile
5. Deploy immediately
6. Document in plan.md

### Data Loss
1. Stop all write operations
2. Restore from latest backup
3. Verify data integrity
4. Document incident
5. Update backup procedures

### Security Breach
1. Rotate all secrets immediately
2. Review access logs
3. Patch vulnerability
4. Notify affected users (if any)
5. Document and update security procedures

## Deployment Workflow

### Pre-Deployment Checklist
- [ ] All tests passing
- [ ] Coverage >80%
- [ ] No linting errors
- [ ] Mobile testing complete
- [ ] Environment variables configured
- [ ] Database migrations ready
- [ ] Backup created

### Deployment Steps
1. Merge feature branch to main
2. Tag release with version
3. Push to deployment service
4. Run database migrations
5. Verify deployment
6. Test critical paths
7. Monitor for errors

### Post-Deployment
1. Monitor analytics
2. Check error logs
3. Gather user feedback
4. Plan next iteration

## Continuous Improvement

- Review workflow weekly
- Update based on pain points
- Document lessons learned
- Optimize for user happiness
- Keep things simple and maintainable
