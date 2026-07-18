# Phase 1 Baseline Freeze

## Accepted artifacts

- Database baseline:
  `packages/architecture-enforcement/src/config/baselines/database.v1.json`
- Provider baseline:
  `packages/architecture-enforcement/src/config/baselines/provider.v1.json`
- Ownership policy and exact exceptions:
  `packages/architecture-enforcement/src/config/ownership-map.v1.json`
- Fail-closed validation command: `pnpm architecture:baseline:validate`

The frozen review contains 491 production findings: 464 database findings and
27 provider findings. The policy contains 102 unique exact rule/path
exceptions: the two previously reviewed storage contract tests plus 100 exact
test/fixture dispositions from the Phase 1 direct review. No implementation
directory or wildcard path is exempted.

All 422 `@reading-advantage/db` baseline imports resolve to exact repository
source files (`packages/db/src/index.ts`, `packages/db/src/schema/index.ts`, or
`packages/db/src/client.ts`). External SDK imports remain explicit
`external:<module>` targets. Semantic identities depend on resolved violations,
not source paths or alias spellings; instance identities add exact source
location.

## Accepted hashes

- Database ruleset:
  `6945a684543588722a283872b14b69aa8efbfb1c91c322a1a156916dfef93ea7`
- Provider ruleset:
  `9c540cfa4e07aa51ac190ac58b9e3df7a3042f07990d1f888789108b0c73ccd3`
- Staged-tree inventory JSON, repeated twice:
  `72d4f3118071fa608efcf4f88229bf9e551c9f8cb404d4683a0b2fba149531fa`

The ruleset hashes were reproduced unchanged under `LC_ALL=C` and
`LC_ALL=th_TH.UTF-8`. Canonical sorting uses fixed JavaScript code-unit order;
it does not consult machine locale.

## Verification

- `pnpm architecture:baseline:validate --format json`: passed against 3,629
  staged tracked source files, 464 database entries, and 27 provider entries.
- Focused package suite: 51/51 tests passed.
- Coverage: 97.16% lines, 86.82% branches, 97.70% functions, and 96.03%
  statements.
- Package lint, type-check, and build: passed.
- Exact-exception audit: 102 unique IDs, 102 unique rule/path targets, zero
  wildcard paths, and zero overlap with production baseline entries.
- CLI failure, parser failure, missing baseline, pending exception, ruleset
  drift, snapshot drift, and swapped-domain behavior are fail-closed tests.

Exact Next.js dynamic-route paths such as `[classId]` remain valid literal
paths. They are never interpreted as glob expressions; a regression test keeps
wildcard syntax and path traversal forbidden while allowing these tracked test
files.

## Independent review

The Task 4 reviewer reported a final **PASS** with no Critical or High findings.
The review identified and verified closure of:

1. swapped/duplicated domain baseline acceptance;
2. workspace aliases mislabeled as external targets;
3. semantic identities tied to alias spelling;
4. locale-dependent canonical sorting; and
5. missing direct coverage for the validation orchestrator and CLI failure.

Browser review was not applicable because Phase 1 changes only enforcement
contracts, inventory, policy, baselines, tests, and commands. The codebase graph
check remains unavailable because the earlier graph update fell back to a
resource-saturating full scan; no graph claim is used as acceptance evidence.
