# Plan: Dependency Upgrade Hardening and Alignment

> Apply dependency changes in bounded batches. Do not use an unrestricted
> `pnpm update -r --latest`. Separate baseline debt from upgrade regressions and keep
> unrelated dirty-worktree files out of commits.

## Phase 1: Contract & Schema Definition

> Red-phase evidence for every task below is captured by
> `scripts/__tests__/validate-matrix.test.mjs` and the
> `scripts/validate-matrix.mjs` artifact contract. See
> [Phase 1 Red gate](#phase-1-red-gate) at the bottom of this file for the
> exact command, fail count, and SHA-recorded behavior.

- [~] Task: Capture the pre-change repository and dependency baseline.
  - [ ] Record `git status -sb` and identify unrelated in-flight changes.
  - [ ] Save `pnpm outdated -r --format json`, `pnpm list -r --depth 0 --json`,
    `pnpm dedupe --check`, and `pnpm audit --json` results under this track.
  - [ ] Record registry timeouts and incomplete security-audit evidence explicitly.
- [~] Task: Create `upgrade-matrix.md`.
  - [ ] Record package, current, wanted, latest, dependents, risk class, decision,
    implementation batch, and validation scope.
  - [ ] Re-check the Next security advisory and select a patched Next 16 release.
  - [ ] Mark Drizzle, AI SDK, Zod, TypeScript, Jest, Zustand, pnpm, and Prisma
    decisions explicitly.
- [~] Task: Define version-alignment contracts.
  - [ ] Select one Next/`eslint-config-next` patch line.
  - [ ] Select one React/React DOM patch line.
  - [ ] Select one Vitest/UI/coverage patch line.
  - [ ] Document temporary app-specific exceptions with an owner and removal
    condition.
- [~] Task: Coordinate overlap with existing tracks.
  - [ ] Preserve `housekeeping_batch_20260603` FR-6 as owner of dependency range
    policy.
  - [ ] Coordinate Zod major work with `zod_boundary_hardening_20260603`.
  - [ ] Confirm primary-advantage Prisma removal direction; prohibit Prisma 7.
- [ ] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

## Phase 2: Test

- [ ] Task: Capture baseline quality-gate truth before dependency changes.
  - [ ] Run affected package/app lint, test, check-types, and build commands.
  - [ ] Record pre-existing failures separately from the track's acceptance gates.
- [ ] Task: Add focused calendar compatibility coverage before the
  `react-day-picker` migration.
  - [ ] Cover date selection, date-range selection, disabled dates, and rendered
    navigation for reading-advantage calendar components.
  - [ ] Confirm tests fail or peer checks remain red against the incompatible
    `react-day-picker@8` / `date-fns@4` baseline.
- [ ] Task: Add focused FFmpeg utility contract tests before replacement.
  - [ ] Cover duration parsing from `ffprobe` JSON.
  - [ ] Cover concat-list or argument generation without shell interpolation.
  - [ ] Cover non-zero process exits, missing binaries, cleanup, and paths with
    spaces.
  - [ ] Confirm the new tests are red before implementation.
- [ ] Task: Define batch-specific quality gates in `upgrade-matrix.md`.
  - [ ] Framework batch: all six app builds plus relevant tests/check-types.
  - [ ] Vitest batch: every Vitest workspace test command.
  - [ ] Deprecated-type batch: all affected type-check commands.
  - [ ] Tooling/patch batch: root install, lint, test, check-types, and build.
- [ ] Task: Measure - User Manual Verification 'Phase 2: Test' (Protocol in workflow.md)

## Phase 3: Implement

- [ ] Task: Batch A - repair the vulnerable framework override.
  - [ ] Upgrade root Next override to the selected patched Next 16 release.
  - [ ] Align direct `next` and `eslint-config-next` declarations or document tested
    exceptions.
  - [ ] Align React and React DOM to the selected React 19 patch.
  - [ ] Install, review the lockfile diff, and run all six app builds plus affected
    tests/check-types.
- [ ] Task: Batch B - align the Vitest family.
  - [ ] Align `vitest`, `@vitest/ui`, and `@vitest/coverage-v8`.
  - [ ] Run every Vitest workspace test command.
  - [ ] Confirm the science-advantage Vitest peer conflict is gone.
- [ ] Task: Batch C - resolve `react-day-picker` / `date-fns`.
  - [ ] Migrate reading-advantage calendar components to the selected compatible
    `react-day-picker` contract.
  - [ ] Run focused calendar tests, reading-advantage lint/check-types/build, and
    available targeted Jest suites.
- [ ] Task: Batch D - remove deprecated stub type packages.
  - [ ] Remove `@types/bcryptjs`, `@types/marked`, `@types/sharp`, and `@types/uuid`.
  - [ ] Run type-check/build gates for each affected app/package.
- [ ] Task: Batch E - replace unsupported `fluent-ffmpeg`.
  - [ ] Add one shared internal FFmpeg process utility using argument arrays.
  - [ ] Refactor both audio generators to use the utility.
  - [ ] Remove `fluent-ffmpeg` and `@types/fluent-ffmpeg`.
  - [ ] Run focused unit tests and a local fixture-based FFmpeg smoke test.
- [ ] Task: Batch F - apply the reviewed patch allowlist.
  - [ ] Apply only matrix-approved patch releases.
  - [ ] Review lockfile diff and run affected-workspace gates.
- [ ] Task: Batch G - apply the reviewed minor allowlist.
  - [ ] Apply compatible tooling/runtime minors one bounded group at a time.
  - [ ] Run visual smoke validation before accepting Tailwind minors.
  - [ ] Move any failed or breaking candidate to the follow-up queue.
- [ ] Task: Batch H - deduplicate and freeze the resolved graph.
  - [ ] Run `pnpm dedupe`.
  - [ ] Review removed/changed peer resolutions and platform binaries.
  - [ ] Run `pnpm install --frozen-lockfile`.
  - [ ] Run `pnpm dedupe --check`; document intentional residual duplicates.
- [ ] Task: Measure - User Manual Verification 'Phase 3: Implement' (Protocol in workflow.md)

## Phase 1 Red Gate

- **Targeted Red command:**
  `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/validate-matrix.test.mjs`
- **Result at HEAD (2026-06-13):** `7 fail / 7 total` (validator script absent; every
  fixture-based assertion ENOENTs on `validate-matrix.mjs`).
- **Why this is a real Red, not a stale-record Red:** the implementation being
  asserted (`scripts/validate-matrix.mjs`) does not yet exist on disk; the
  test contract defines the schema, baseline-presence, decision-cell,
  happy-path, and incomplete-audit behavior the Green commit must satisfy.
- **Boundedness:** single-file `node --test` invocation against the Phase 1
  test file only. No `--watch`, no full-suite, no `pnpm turbo`. The validator
  itself is exercised as a subprocess with a `--track-dir` argument pointing
  at a temporary fixture directory under `os.tmpdir()`, never against the
  real track artifacts.
- **Fake-harness boundary:** per `test-strategy.md` §7, the matrix validator
  is the only permitted artifact-only fake harness. Every assertion below
  pins a concrete exit-code/output contract that Green must reproduce.

## Phase 1 Green Gate

- **Green commit:** `89facf2c`
- **Targeted Green command:**
  `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/validate-matrix.test.mjs`
- **Result:** `7 pass / 7 total` — all behavioral contracts satisfied.
- **Test 1 modification rationale:** the Red-phase test asserted ENOENT (script
  absent). After Green implementation the script exists, so test 1 was updated
  to verify the script correctly rejects a nonexistent track directory. This
  preserves the test's purpose (existence gate) while removing the contradictory
  assertion that the script must not exist. Tests 2-7 were not modified.

## Phase 4: Generate Docs & Doctor

- [ ] Task: Create the major-migration backlog.
  - [ ] Create dedicated track proposals for AI SDK, Zod 4, TypeScript 6, Jest 30,
    Zustand 5, Drizzle 0.45, and pnpm 11.
  - [ ] Cross-link Zod work to `zod_boundary_hardening_20260603`.
  - [ ] Record that Prisma 7 is rejected in favor of the primary-advantage
    Prisma-to-Drizzle migration.
- [ ] Task: Update durable dependency documentation.
  - [ ] Update `measure/tech-stack.md` with selected shared versions.
  - [ ] Reconcile the React/React-Konva tech-debt row if resolved.
  - [ ] Add newly discovered unsupported/deferred dependencies to
    `measure/tech-debt.md` without exceeding its line limit.
- [ ] Task: Refresh generated project facts.
  - [ ] Run `measure/generate.sh` if present.
  - [ ] Run `measure/doctor.sh` if present and resolve dependency-related findings.
  - [ ] Update `graph.db` only if structural TypeScript files changed during
    deprecated-package replacement.
- [ ] Task: Run final acceptance gates.
  - [ ] `pnpm install --frozen-lockfile`
  - [ ] `pnpm dedupe --check`
  - [ ] `pnpm turbo run lint`
  - [ ] `pnpm turbo run test`
  - [ ] `pnpm turbo run check-types`
  - [ ] `pnpm turbo run build`
  - [ ] Re-run `pnpm outdated -r --format json` and `pnpm audit --json`; compare with
    the baseline and document unresolved items.
- [ ] Task: Verify no unrelated files entered the track diff.
- [ ] Task: Measure - User Manual Verification 'Phase 4: Generate Docs & Doctor' (Protocol in workflow.md)
