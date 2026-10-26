# Resumed failure review

This report covers config, AI, types, auth, Practice Core, UI, and dependency execution.
No implementation files changed during this review.
The reviewer read the repository agreements, Measure skill, context, and workflow.
The graph inspection of `createAIClient` succeeded.

## Failure inventory and repairs

| Group | Evidence | Minimum repair and verification |
| --- | --- | --- |
| Config: one test | `wave2-observability-provider-guard.test.ts` counts 636 production console errors against 621. Its documented contract forbids increases. | Migrate offending production calls through existing observability adapters. Preserve the 621 limit. Rerun the config suite. |
| AI: five manifest assertions | `phase-11-sdk-version-contract.test.ts` reads literal `catalog:` values as semver. `pnpm-workspace.yaml` supplies the expected SDK majors. | Resolve catalog references before validating the existing major requirements. Keep assertions for every affected manifest. |
| AI: seven lock assertions | The same test expects obsolete slash-prefixed lock keys. The current lock uses version 9 YAML keys. | Parse the actual lock structure. Preserve checks against conflicting majors. Check actual resolutions before declaring each SDK compliant. |
| AI: four artifact assertions | `phase-12-closeout-artifacts.test.ts` reads `measure/tracks/ai_sdk_major_migration/artifacts`. All three artifacts exist under `measure/archive/ai_sdk_major_migration/artifacts`. | Resolve the archived track path. Preserve artifact content and outcome assertions. |
| AI: stream assertion | `phase-13-adversarial-streamText-await.test.ts` only recognizes `await streamText`. Codecamp line 140 contains `await tutorClient.streamText`. | Recognize awaited member calls. Add positive and negative scanner examples so unawaited calls still fail. |
| AI: Zod setup assertion | `phase-0-setup.test.ts` expects a literal Zod version. The catalog supplies `^3.25.76`. | Resolve the catalog before checking the required major. |
| AI: installation setup assertion | The setup test requires package-local `node_modules`. Workspace configuration explicitly selects `nodeLinker: hoisted`. | Check dependency resolution from the package context instead of installation directory shape. |
| AI: build setup assertion | The setup test runs `./node_modules/.bin/tsc`. The log reports that this executable does not exist. | Resolve the installed compiler from the package context. Keep the real build exit assertion. |
| Types: one test | `wave2-types-regression-guard.test.ts` spawns pnpm. Both original and resumed runs receive no JSON or diagnostic text. | Use the installed Vitest entry with `process.execPath`. Check subprocess status, signal, and error before parsing JSON. Preserve the 88-test minimum. |
| Auth: two debt assertions | `phase-7-closeout.test.ts` requires an old resolved row in the current working-memory registry. The archived plan records its original delivery. | Locate authoritative retained evidence before selecting a repair. Do not fabricate a resolved row solely to pass. |
| Auth: two Git-note assertions | The test targets the latest touching commit, `cfeec5b8`, instead of the historical closeout. The archived plan identifies `7fdaf60`. | Separate historical closeout verification from later documentation changes. Neither commit currently exposes the required note locally. Preserve this limitation until evidence is recovered. |
| Practice Core: three CI assertions | `gate-wiring.test.ts` requires a removed packages job and explicit generator command. CI currently runs root `pnpm test`. Root test runs only four Codecamp files. | Restore actual aggregate coverage or add the generator gate explicitly. A test that accepts the current root command would conceal missing coverage. |
| UI: type diagnostics | `src/__tests__/setup.ts` extends matchers at runtime. It does not import the Vitest matcher declarations. | Import `@testing-library/jest-dom/vitest` in setup. Rerun direct types and the UI suite. |
| Dependency installation | Prior verification reports an absent workspace dependency in the frozen lockfile and pnpm store access failure. Root pins pnpm 11.8.0. | Reconcile actual manifest and lock differences without framework upgrades. Verify a frozen install with the pinned executable. |

## Focused reproduction

The Auth closeout command reproduced four failures and nine passes.
Its log is `/tmp/resume-auth-closeout.log`.
The Types guard command reproduced one failure and one pass.
Its log is `/tmp/resume-types.log`.
Both commands used the installed root Vitest executable with one worker.
The original package logs remain under `/tmp/monorepo-review-*.log`.

The archived Auth plan records a Git note on `7fdaf60`.
`git notes show 7fdaf60` reports no local note.
This proves unavailable local evidence, not an application defect.

## Other known groups

The parent assigned these groups for separate investigation.
They remain unresolved in this report.

| Group | Earlier result |
| --- | --- |
| architecture-enforcement | 41 failed |
| knowledge-space-core | 37 failed |
| codecamp-knowledge | Four failed and one suite setup failure |
| mastery-runtime-compat | Seven failed and an unhandled error |
| Advantage Play Kit | Three failed |
| backend | Seven failed, including five PostgreSQL-dependent tests |
| db | 63 failed across contracts, builds, fixtures, and PostgreSQL configuration |
| domain | Suite timeout; compiled test discovery also requires investigation |
| webhooks | Suite timeout; lease test limits require investigation |
| Primary types | 131 diagnostics |
| Reading types | 82 diagnostics |

Worker health tests passed after the approved loopback retry.
No remaining worker failure was established by the supplied verification report.
