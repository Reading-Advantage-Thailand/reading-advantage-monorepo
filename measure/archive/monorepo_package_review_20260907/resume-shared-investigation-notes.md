# Shared package investigation notes

These observations require Astra review before repair assignments.

- Knowledge Space Core tests read missing `kst-srs.v2/SPECIFICATION.md` and `measure/knowledge-space.md` paths.
- Git history for those two paths returned no entries in this repository.
- A specification exists at `/home/daniebo/Desktop/ra-math-advantage/kst-srs.v2/SPECIFICATION.md`.
- Another specification exists at `/home/daniebo/Desktop/mastery-advantage/SPECIFICATION.md`.
- Check the governing package contract before copying documents or changing references.
- Codecamp Knowledge tests hardcode `/home/daniel-bo/Desktop/mastery-advantage` in `source-sync-and-cli.test.ts`.
- The current sibling checkout uses `/home/daniebo/Desktop/mastery-advantage`.
- Verify portable source resolution and the required source version before changing the test.
- Architecture tests are rerunning with permitted subprocess access.
- Their log is `/tmp/resume-tests-architecture-permitted.log`.
- Earlier failures included Git subprocess denials and IPC restrictions.
- Reading full Jest results are in `/tmp/resume-tests-apps-reading-advantage.log`.
- The run reported 39 failing tests and 31 failing suites.
- Failures include game timing assertions, package transformation, assignment contracts, and historical verification records.

## Remaining app evidence

- Reading's six Jest migration record suites use the former `measure/tracks` location. The original records exist under `measure/archive/jest30_major_migration`.
- Reading's game component suites cannot parse `next-intl/navigation` through the current Jest configuration.
- Reading's controller and scheduling suites cannot resolve the Codecamp Knowledge package through the shared Domain import.
- These fixture failures require separate checks from the assignment lifecycle and activity validation failures.
- WWW's current full run exposes pricing/legal tests and asynchronous page test failures. The run remains active.
- Wave 5's plan records an unresolved product decision for pricing and legal copy. Its July 22 decision explicitly preserves that requirement.
- Confirm the applicable approved copy before changing those surfaces. Preserve the failing tests until the requirement is resolved.

- Marketing's permitted full run reproduces topic and project fixture failures.
- The PGlite fixture omits `created_by` columns now used by production routes and the shared schema.
- Its topic test uses `marketing-admin`, but the current `created_by` column requires a UUID.
- Repair these fixtures against the current ownership contract. Preserve denial cases for other owners.

- Primary completion callers still used `useSession`, which returns state without actions. They must use `useAuth` for the new refresh action.
- The Primary agent is repairing these callers and rebuilding the auth package before the consuming app check.
- Primary progress behavior tests now cover standalone and repeated assignments for one article under the database uniqueness constraint.
- The first completion update now records completion instead of starting an already completed assignment.

## Science instrumentation review

- Science declares `sdk-node` and its HTTP exporter at 0.57, but declares resources and trace-base at 2.8.
- The installed Node SDK uses the 1.30 interfaces. The app passes incompatible 2.x processors and exporters into that SDK.
- The root instrumentation comment already records this version conflict, but its processor construction still crosses those versions.
- `lib/instrumentation.node.ts` also constructs `Resource`, which no longer exists as a value in the declared resources version.
- The root comment says the duplicate library implementation exists only for historical tests.
- Reuse the live adapter where the contract permits it. Align compatible installed SDK components without a framework upgrade.
- `next.config.ts` uses an unsupported Sentry `disable` option. Use the installed configuration contract for source-map upload control.
- The complete 31-diagnostic inventory is `/tmp/resume-science-type-errors.txt`.
