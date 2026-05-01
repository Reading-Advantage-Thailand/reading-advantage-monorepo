# Implementation Plan: Unified CI/CD Pipeline

---

## Phase 1: Test & Audit

- [ ] Task: Write CI workflow skeleton and validate with `act` or dry-run
    - Create `.github/workflows/ci.yml` with a no-op job that echoes app names
    - Verify YAML syntax and GitHub Actions schema
- [ ] Task: Audit current test commands per app
    - Document which apps use Jest vs Vitest
    - Document test file glob patterns and coverage thresholds
    - Record baseline pass/fail counts for each app
- [ ] Task: Audit lint commands per app
    - Document which apps use ESLint v8 vs v9
    - Record baseline error/warning counts
- [ ] Task: Verify Turborepo pipeline config
    - Ensure `turbo.json` has `lint`, `test`, and `build` tasks with correct `dependsOn`
    - Confirm task outputs are cached correctly
- [ ] Task: Measure — User Manual Verification 'Test & Audit' (Protocol in workflow.md)

## Phase 2: Turborepo & Caching

- [ ] Task: Configure Turborepo remote caching
    - Set up Vercel Remote Cache or document self-hosted alternative
    - Add `TURBO_TOKEN` and `TURBO_TEAM` to GitHub repository secrets
    - Verify cache hits in local `turbo run build` with `--remote-only`
- [ ] Task: Normalize `turbo.json` task graph
    - Ensure `test` depends on `^build` where needed (for libs consumed by apps)
    - Add `lint` → `test` → `build` pipeline with `affected` filtering
- [ ] Task: Write integration test for Turborepo caching
    - Script that runs `turbo run build` twice and asserts cache hit on second run
- [ ] Task: Measure — User Manual Verification 'Turborepo & Caching' (Protocol in workflow.md)

## Phase 3: CI Workflow Implementation

- [ ] Task: Implement `install` job with pnpm caching
    - Use `actions/setup-node` with `cache: 'pnpm'`
    - Pin pnpm version to match `packageManager` field in root `package.json`
- [ ] Task: Implement `lint` job
    - Run `pnpm turbo run lint --affected` (or `--filter=[origin/main...HEAD]`)
    - Upload lint results artifact
- [ ] Task: Implement `test` job
    - Run `pnpm turbo run test --affected`
    - Handle Jest and Vitest exit codes uniformly
    - Upload test results and coverage reports
- [ ] Task: Implement `build` job
    - Run `pnpm turbo run build --affected`
    - Fail fast if any app build fails
- [ ] Task: Add branch protection rules recommendation to developer docs
- [ ] Task: Measure — User Manual Verification 'CI Workflow Implementation' (Protocol in workflow.md)

## Phase 4: Vercel Deployment

- [ ] Task: Link per-app Vercel projects to monorepo root
    - Create or reconfigure Vercel projects for each app
    - Set root directory to monorepo root and use `ignore` scripts
- [ ] Task: Write `vercel.json` or `ignore` scripts per app
    - Use `git diff --quiet HEAD^ HEAD -- apps/<app>/` to skip unaffected apps
    - Document in `apps/<app>/README.md`
- [ ] Task: Add deploy preview checks to PR workflow
    - Ensure Vercel bot comments with preview URLs per app
- [ ] Task: Measure — User Manual Verification 'Vercel Deployment' (Protocol in workflow.md)

## Phase 5: Documentation & Polish

- [ ] Task: Add CI status badge to root README
- [ ] Task: Write `CONTRIBUTING.md` section on CI expectations
    - How to run the same commands locally
    - How to interpret `turbo` output and cache status
- [ ] Task: Add tech debt items for deferred work
    - Jest → Vitest migration (if not part of this track)
    - Firebase Functions deployment automation
    - Staging environment separation
- [ ] Task: Measure — User Manual Verification 'Documentation & Polish' (Protocol in workflow.md)

---

## Total Estimated Tasks: 18
## Completed Tasks: 0
## Notes

### Decisions
- Use Vercel Remote Cache for simplicity (already part of Vercel ecosystem)
- Keep Jest and Vitest side-by-side in CI; unification is a separate track
- Use `--affected` filtering to keep CI fast as monorepo grows
