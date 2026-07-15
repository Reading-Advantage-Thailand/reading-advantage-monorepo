# Implementation Plan: CodeCamp Measure-Driven AI Development Curriculum Unit

## Phase 1: Track Setup

- [x] Create Measure track metadata, spec, and plan.

## Phase 2: Curriculum Unit

- [x] Add Unit 16 Measure-driven AI development overview and class-period plan.
- [x] Shift existing Unit 16, Unit 17, and Unit 18 curriculum docs to Units 17, 18, and 19.
- [x] Update course specification sequence, phase period totals, and prerequisites.

## Phase 3: Supporting Docs

- [x] Update assessment rubric with Measure workflow discipline.
- [x] Update pacing guide with the new unit and shifted production units.
- [x] Update capstone language to use Measure track/spec/plan workflow.

## Phase 4: Verification

- [x] Search for stale Unit 16/17/18 references in CodeCamp docs.
- [x] Review changed docs for numbering consistency and current-intern non-disruption.

## Phase 5: Deployment

- [x] Fix shared build blockers found by pre-deploy gates: domain permission/type errors, CodeCamp AI SDK import/type drift, app declaration config, utils client-bundle Node leak, Docker pnpm config, DB seed build cycle.
- [x] Verify local gates: `pnpm turbo run check-types --filter=codecamp-advantage` passed; `pnpm turbo run build --filter=codecamp-advantage` passed after clean-build fixes.
- [x] Redeploy `codecamp-advantage` to Google Cloud Run after DB safety verification.

### Deployment Attempt Log

- Cloud Build submit initially failed before build because `DIRECT_DATABASE_URL` secret did not exist in `reading-advantage`; `cloudbuild.yaml` was updated to existing `CODECAMP_*` secrets.
- Cloud Build default service account lacked `secretmanager.versions.access` for `CODECAMP_DATABASE_URL`; access was granted to `1090865515742@cloudbuild.gserviceaccount.com`.
- Docker build initially failed on pnpm frozen install because `.pnpmfile.cjs` was not copied into the image context and Docker pinned pnpm 8.15.8 while root `packageManager` is pnpm 11.8.0; Dockerfile now uses pnpm 11.8.0 and copies `.pnpmfile.cjs`.
- Docker image build later succeeded, but push failed because Artifact Registry repository `codecamp` did not exist in `reading-advantage`; repository `codecamp` was created in `asia-southeast1`.
- Clean-environment package build issues were resolved after narrowing DB build seed exclusion to `src/seed/codecamp-users-seed.ts` only.
- Production backup `1784075631261` (`pre-codecamp-mastery-20260715`) completed successfully before migration.
- Cloud Build `b53c7f3d-dc32-487b-8e96-16e7a81cee54` built, migrated through `0036_codecamp_mastery_evidence`, passed the migration doctor, and deployed the feature release.
- Seed build `38c57fdd-fafd-48b9-a3ba-fcbcb6a480fe` updated the existing modules and inserted the Measure unit and its three lessons.
- Browser acceptance found a TenantDB contract failure on global/referential curriculum reads. Commit `efdfe98d` added audited `unscoped()` reads plus a regression test.
- Hotfix build `e86f4cca-0d09-4e95-ba35-b43a3a4b8c9a` succeeded and deployed revision `codecamp-advantage-00019-682` with 100% traffic.
- Authenticated Chrome acceptance verified dashboard data (`106` lessons), the `Measure-Driven AI Development` module, all three lessons, and diagram rendering. New-cohort-only Unit 20 access remained assignment-gated as designed.
- Release evidence and the boundaries of still-active mastery/media tracks are recorded in `deployment-evidence-20260715.md`.
