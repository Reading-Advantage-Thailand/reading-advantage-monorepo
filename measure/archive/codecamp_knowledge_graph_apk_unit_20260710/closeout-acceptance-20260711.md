# Closeout Acceptance — 2026-07-11

## Decision

Implementation acceptance passes for the Codecamp knowledge graph, curriculum
bindings, and APK game-creation unit. Production deployment is not part of this
closeout: a fresh Kimi WebBridge request to
`https://codecamp.reading-advantage.com/en/apk-unit/1` returned the application's
`Page not found` surface. The existing Codecamp deployment safety gate remains in
force and must be handled by its owning deployment work.

## Kimi WebBridge Manual Acceptance

Kimi WebBridge daemon `v1.11.1` controlled the user's connected browser extension.
The extension was `1.11.0`; navigation, snapshots, clicks, and page evaluation worked,
while the screenshot helper timed out. Existing Kimi screenshots remain under
`evidence/`; fresh closeout evidence is the recorded semantic interaction sequence
below.

Target: `http://localhost:3000`, authenticated as the existing local Admin user.
The dev server used the repository's `.env.local` plus ephemeral, process-only
tutorial worker values. Migration `0035_activity_tutorial_capture_leases.sql` was
applied only to the local Codecamp database for the acceptance run.

1. **I Do — `/en/apk-unit/1`: PASS**
   - Heading, video iframe, transcript alternative, diagram, reference cartridge,
     and annotated boundary guidance were present in the accessibility tree.
   - The transcript/diagram alternative opened the checkpoint.
   - Selecting `Persist the validated result` returned the correct server feedback.
   - After navigation reload, `Server-restored assessment: passed` remained present
     with the same durable activity session.
2. **We Do — `/en/apk-unit/2`: PASS after fixes**
   - The manifest, behavioral-result, and clean-Git checks were rendered.
   - Using the next hint and reloading changed the server-restored count from zero to
     `hints 1; reveals 0`.
   - The signed repository-snapshot flow initially exposed two live SQL bugs in
     `tutorial-capture-lease.ts`: an out-of-range `Number.MAX_SAFE_INTEGER` sentinel
     and locale-formatted raw `Date` parameters inside `sql` CASE expressions.
   - After using the PostgreSQL integer maximum and ISO `timestamptz` parameters, the
     worker captured the allowlisted fixture, the server re-ran the three checks, and
     the UI displayed `Evidence stored`.
3. **You Do — `/th/apk-unit/3`: PASS**
   - The Thai title `สร้างเกมเรียงประโยค`, localized objective rubric, Manifest ABI,
     browser-smoke requirement, and repository/PR action were present.
4. **Bounds — `/en/apk-unit/99`: PASS**
   - The route rendered `Lesson not found`.

## Automated Evidence

- `@reading-advantage/activity-tutorial`: 16/16 tests; check-types, lint, build pass.
- `@reading-advantage/codecamp-knowledge`: 89/89 tests; check-types, lint, build,
  graph validation, binding validation, and both source-verification gates pass.
- Codecamp capture boundary: 9/9 focused tests; app check-types passes; lint has zero
  errors and five unrelated legacy warnings; production build passes and includes
  `/[locale]/apk-unit/[stage]` plus `/api/internal/tutorial-repository-capture`.
- `@reading-advantage/domain`: 92/92 Codecamp tests and 4/4 PGlite activity
  integration tests pass; check-types and build pass.
- `@reading-advantage/api`: 53/53 affected tests; check-types and build pass.
- `@reading-advantage/webhooks`: 16/16 affected review-pipeline tests;
  check-types and build pass.
- DB migration: isolated PGlite test passes; DB build passes.

The package-wide DB `check-types` gate remains red because the unrelated untracked
`packages/db/src/seed/codecamp-users-seed.ts` imports Auth source outside DB's
configured `rootDir`. This concurrent-worktree baseline is not caused by this track's
migration or schema changes and was not modified during closeout.

## Independent Review and Remaining Closeout Gate

The final independent change-quality review reports zero Critical, High, Medium,
or Low findings and a passing Graph Caller Check. APK AI review is advisory only;
authoritative approval now requires evaluator-attested deterministic CI/browser
evidence bound to the reviewed repository. The approval projection and status write
share one transaction, and advisory writes use compare-and-set protection so a
delayed worker cannot overwrite trusted approval.

The track cannot truthfully move to complete until the three required release
reviews in `apk-blueprint-data.ts` are named and approved: APK maintainer,
curriculum owner, and product owner. Those records remain deliberately fail-closed
at `pending`.
