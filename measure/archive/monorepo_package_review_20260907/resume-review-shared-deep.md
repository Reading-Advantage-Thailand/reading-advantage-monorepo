# Shared package continuation review

The review confirms runtime, test portability, and logging guard defects. Source files remain unchanged.

## Confirmed repair groups

### Knowledge Space Core

The original log records 37 failures and one setup failure. All groups have an identified cause.

| Group | Cause | Required repair |
| --- | --- | --- |
| Specification markers and section assertions | Tests require the upstream v2 specification at the monorepo root. | Separate upstream integration checks from local runtime checks. |
| Documentation reconciliation | Tests require upstream Measure documents and index formatting. | Preserve the upstream check with explicit source configuration. |
| Projection audit | Tests assert upstream IM3 deployment evidence. | Keep these assertions with their upstream owner. |
| Doctor, generate, and boundary scripts | Tests require absent upstream scripts. | Use the current architecture checks for local boundaries. |
| Export completeness | The test resolves `./types.js` as `types.js.ts`. | Resolve ESM specifiers to their TypeScript source. |
| Transfer import signatures | Two regex assertions reject valid `.js` imports. | Accept the package's required ESM import spelling. |

The import plan already records these inherited incompatibilities at `measure/archive/mastery_engine_v32_import_20260710/plan.md:30`.
The current program names Mastery Advantage v3.2 as the normative specification.
The ra-math v2 specification does not replace that authority.
Create no fabricated specification, deployment evidence, or provenance.
Retain behavioral coverage when separating upstream checks.

**P1: The public SRS bridge overstates objective retention.**
`packages/knowledge-space-core/src/srs-bridge.ts` selects the most recently reviewed card.
Normative specification section 2.1.1 requires minimum retention across variants with review history.
A public export reproduction used two cards for one objective, each with stability 10.
One card was reviewed 50 days ago; the other was reviewed now.
The bridge returned retention 1 and proficiency true, masking the decayed variant.
The existing bridge test explicitly preserves the incorrect most-recent behavior.
`SrsCardState` lacks `reps`, so the repair must define review history without breaking existing callers silently.
Graph lookup found no callers for `buildKstState`; the package exports both affected APIs.
Add adversarial tests for multiple reviewed variants, unreviewed variants, and no review history.

### Codecamp Knowledge

A permitted retry ran the inventory and CLI suites. Eleven tests passed; three failed.
`bindings-verify-source` passed after Git subprocess permission.
Two inventory assertions conflict with `verifyCurriculumSource` after commit `a81fcd108`.
The verifier treats live-source differences as telemetry while validating the authoritative artifact, base, and inventory.
Keep those artifact checks. Assert live-source differences truthfully instead of changing existing hashes.
The third failure hardcodes `/home/daniel-bo/Desktop/mastery-advantage`.
Use a temporary source fixture for the explicit root seam.
Test environment and sibling resolution separately.
The production CLI already supports `MASTERY_ADVANTAGE_ROOT` and an explicit `sourceRoot`.
The release setup failure still requires a permitted retry.
Log: `/tmp/resume-shared-codecamp-permitted.log`.

### Mastery Runtime Compatibility

The original seven failures involve npm packing and dependent release timing.
A permitted retry passed the representative fixture-binding test in 179 seconds.
That result does not establish a code defect in npm output handling.
Six remaining failures have a permitted retry running in one worker.
These cover copied-fixture mutation, lease overlap, stale leases, two Sales admissions, and archive substitution.
Logs: `/tmp/resume-shared-mastery-permitted.log` and `/tmp/resume-shared-mastery-remaining-permitted.log`.

### Advantage Play Kit

A permitted retry passed scaffold compilation and accepted-input checker tests: three passing tests.
The standard catalog receipt assertion still fails.
`IMPORT-RECEIPT.tsv` contains 2,526 existing added lines.
The generated catalog therefore references different receipt bytes.
Preserve those existing changes and determine their intended asset release before regeneration.
The existing generator validates receipt coverage before writing the catalog.
Do not broaden hash coverage or replace receipt bytes to satisfy this test.
Log: `/tmp/resume-shared-apk-permitted.log`.

### Config logging guard

The guard explicitly forbids additional `console.error` call sites. Its baseline remains 621.
An AST scan used the same paths and exclusions.
It found 634 calls versus 636 regex matches.
Two false matches occur in comments:

- `apps/reading-advantage/lib/cache/metrics.ts:75`
- `apps/science-advantage/lib/schemas/lesson-content.schema.ts:304`

Correct comment detection without weakening actual-call detection.
The remaining 13 excess calls still violate the guard.
Structured JSON calls preserve diagnostics, so their presence does not prove missing observability.
Science has the only general logger found. Primary's logger writes audio-processing files and is unsuitable.
A small shared error sink can remove existing serialization duplication across Codecamp, Sales, and Accounting authentication routes.
All three apps already depend on `@reading-advantage/utils`.
Six Codecamp, five Sales, and four Accounting authentication call sites provide a bounded migration.
Preserve error severity, event, request identifiers, error names, and existing redaction.
Test serialization and redaction. Document the sink as the adapter boundary.
Do not migrate unrelated routes or change property syntax to evade detection.

## Additional reachable runtime finding

**P1: Codecamp chat bypasses the configured authentication mode.**
The header links to `/chat`; its page uses `useChatStream` and `/api/chat`.
`apps/codecamp-advantage/app/api/chat/route.ts:86` always uses legacy token authentication.
The shared helper reads `session_token`; company authentication uses `__Host-ra_codecamp_session`.
Company mode is the default.
Company users receive 401, while legacy credentials can remain accepted in company mode.
Reuse the mode selection already present in `app/api/tutor/intervention/route.ts`.
Preserve the streaming protocol and tenant context.
Test company access, legacy rejection in company mode, and explicit legacy access.

## Additional source inspection

The review inspected bridge retention, transfer eligibility, transfer confirmation, progress trends, and level projection.
It also inspected Codecamp CLI resolution, curriculum verification, transition validation, release packing, and APK catalog generation.
The review inspected the logging guard and the reachable chat authentication path.
The runtime bridge defect requires repair beyond the previously selected package paths.
Pending release checks prevent package-wide completion claims.

## Exact verification commands

Commands run from each named package directory.

Codecamp Knowledge:

```sh
node ../../node_modules/vitest/vitest.mjs run src/__tests__/curriculum-inventory.test.ts src/__tests__/source-sync-and-cli.test.ts --maxWorkers=1
```

Advantage Play Kit:

```sh
node ../../node_modules/vitest/vitest.mjs run src/assets/standard-pack-release.integration.test.ts src/guards/__tests__/accepted-inputs-checker-paths.test.ts src/scaffolding/__tests__/scaffold-runtime.integration.test.ts --maxWorkers=1
```

Mastery Runtime Compatibility, completed:

```sh
node ../../node_modules/vitest/vitest.mjs run src/__tests__/release-artifact.test.ts -t 'binds every clean-consumer fixture byte' --maxWorkers=1
```

Mastery Runtime Compatibility, active session `58740`:

```sh
node ../../node_modules/vitest/vitest.mjs run src/__tests__/release-artifact.test.ts src/__tests__/sales-runtime-admission.red.test.ts src/__tests__/phase0-adversarial.test.ts -t 'rejects replacement of copied fixtures|forces lease overlap|reclaims a stale truncated|creates an absent repository-local|uses distinct successful children|rejects a valid archive' --maxWorkers=1
```

The root agent will collect the active result.
Then run Codecamp's `src/__tests__/release-artifact.test.ts` with the same direct runner and permitted subprocess access.
Rerun all Knowledge Space Core failure groups after their portability repairs.
Rerun the config guard after scanner and logging repairs.
Rerun the APK receipt test after resolving the existing asset changes.

The SRS package already implements `aggregateObjectiveRetention` in `src/srs/srs-proficiency.ts:151`.
Use its behavior as the parity contract for bridge tests.
Preserve the core package's existing dependency boundary during repair.
