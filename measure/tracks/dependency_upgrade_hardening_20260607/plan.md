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

- [x] Task: Capture the pre-change repository and dependency baseline.
  - [x] Record `git status -sb` and identify unrelated in-flight changes.
  - [x] Save `pnpm outdated -r --format json`, `pnpm list -r --depth 0 --json`,
    `pnpm dedupe --check`, and `pnpm audit --json` results under this track.
  - [x] Record registry timeouts and incomplete security-audit evidence explicitly.
- [x] Task: Create `upgrade-matrix.md`.
  - [x] Record package, current, wanted, latest, dependents, risk class, decision,
    implementation batch, and validation scope.
  - [x] Re-check the Next security advisory and select a patched Next 16 release.
  - [x] Mark Drizzle, AI SDK, Zod, TypeScript, Jest, Zustand, pnpm, and Prisma
    decisions explicitly.
- [x] Task: Define version-alignment contracts.
  - [x] Select one Next/`eslint-config-next` patch line.
  - [x] Select one React/React DOM patch line.
  - [x] Select one Vitest/UI/coverage patch line.
  - [x] Document temporary app-specific exceptions with an owner and removal
    condition.
- [x] Task: Coordinate overlap with existing tracks.
  - [x] Preserve `housekeeping_batch_20260603` FR-6 as owner of dependency range
    policy.
  - [x] Coordinate Zod major work with `zod_boundary_hardening_20260603`.
  - [x] Confirm primary-advantage Prisma removal direction; prohibit Prisma 7.
- [x] Task: Measure - User Manual Verification 'Phase 1: Contract & Schema Definition' (Protocol in workflow.md)

## Phase 2: Test

> Red-phase evidence for Phase 2 tasks 1–4 is captured by four bounded Red
> commands recorded in [Phase 2 Red gate](#phase-2-red-gate) at the bottom of
> this file. Tasks 1 and 4 produce artifact deliverables; their live-behavior
> proof is owned by Phase 3 per-batch quality gates (Tasks 2/3 Green = Batches
> C/E) and the Phase 4 aggregate `pnpm turbo run …` closeout, per
> `test-strategy.md` §1, §7, and §8.

- [~] Task: Capture baseline quality-gate truth before dependency changes.
  - [~] Run affected package/app lint, test, check-types, and build commands.
  - [~] Record pre-existing failures separately from the track's acceptance gates.
  - Red proof: `scripts/__tests__/baseline-truth.test.mjs` asserts the
    `baseline-truth.md` artifact exists with required sections (Source Commit,
    Affected Workspaces, Per-Workspace Gate Results, Pre-Existing Failures
    Carved Out). The artifact does not yet exist on disk → Red.
  - Live-gate owner: Phase 3 per-batch quality gates record actual command
    output; Phase 4 aggregate `pnpm turbo run lint|test|check-types|build`
    closeout reconciles regressions against this baseline.
- [~] Task: Add focused calendar compatibility coverage before the
  `react-day-picker` migration.
  - [~] Cover date selection, date-range selection, disabled dates, and rendered
    navigation for reading-advantage calendar components.
  - [~] Confirm tests fail or peer checks remain red against the incompatible
    `react-day-picker@8` / `date-fns@4` baseline.
  - Red proof: `apps/reading-advantage/components/ui/__tests__/calendar.test.tsx`
    exercises live `<Calendar>` render + interaction using RTL with the
    existing `react-day-picker@8` / `date-fns@4` peer-broken install. Bounded
    via `jest components/ui/calendar` path filter (never the full
    reading-advantage suite, which is known to hang).
  - Live-gate owner: Batch C migrates the calendar to the compatible
    `react-day-picker@9` contract; the same focused Jest command must exit 0
    after Batch C.
- [~] Task: Add focused FFmpeg utility contract tests before replacement.
  - [~] Cover duration parsing from `ffprobe` JSON.
  - [~] Cover concat-list or argument generation without shell interpolation.
  - [~] Cover non-zero process exits, missing binaries, cleanup, and paths with
    spaces.
  - [~] Confirm the new tests are red before implementation.
  - Red proof: `packages/utils/src/__tests__/ffmpeg-process.test.ts` imports
    the not-yet-created `../ffmpeg-process` module → import-time Red. Uses a
    `mockSpawn` helper (per `test-strategy.md` §2) that captures argv, stdin,
    exit code, and stderr without touching real child processes. Asserts the
    utility never passes `shell: true` (architecture guardrail per
    `test-strategy.md` §4). Test fixtures `silence-1s.mp3` and `silence-2s.mp3`
    committed under `packages/utils/src/__tests__/fixtures/`.
  - Live-gate owner: Batch E implements the utility, refactors both audio
    generators, and runs the bounded local fixture-driven smoke (<30s).
- [~] Task: Define batch-specific quality gates in `upgrade-matrix.md`.
  - [~] Framework batch: all six app builds plus relevant tests/check-types.
  - [~] Vitest batch: every Vitest workspace test command.
  - [~] Deprecated-type batch: all affected type-check commands.
  - [~] Tooling/patch batch: root install, lint, test, check-types, and build.
  - Red proof: `scripts/__tests__/batch-gates.test.mjs` asserts
    `upgrade-matrix.md` contains a `## Batch Quality Gates` section that
    enumerates exactly the eight implementation batches (A–H) with the
    concrete `pnpm` command list each batch must run. The section is absent at
    HEAD → Red. The existing per-row `validation scope` column does not satisfy
    this contract because operators cannot execute a column value as a script.
  - Live-gate owner: Phase 3 batch execution runs each documented gate; the
    artifact itself is the contract Phase 3 follows.
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

## Phase 2 Red Gate

Phase 2 splits into two artifact-contract Red commands (Tasks 1 and 4) and two
live-behavior Red commands (Tasks 2 and 3). Each command is bounded to a
single test file and never invokes a full workspace or repo-wide suite.

### Task 4 — Batch Quality Gates in upgrade-matrix.md

- **Targeted Red command:**
  `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/batch-gates.test.mjs`
- **Result at HEAD (2026-06-13):** `8 fail / 0 pass / 8 total`. The
  `## Batch Quality Gates` section is absent from `upgrade-matrix.md`; every
  assertion either fails to locate the section heading or fails to locate its
  required `### Batch A` … `### Batch H` subsections.
- **Why this is a real Red, not a stale-record Red:** the contract is that
  operators have an executable per-batch gate list. The matrix currently has a
  per-row `validation scope` column, but operators cannot copy-paste a column
  value as a runnable command. The Green commit must add a new section, not
  reword existing rows.
- **Boundedness:** single-file `node --test` invocation; reads
  `upgrade-matrix.md` from disk; never spawns pnpm, vitest, jest, or turbo.
- **Fake-harness boundary:** artifact contract per `test-strategy.md` §7. The
  live-behavior pair is Phase 3 batch execution — each batch literally runs
  the documented commands against real workspaces.

### Task 1 — Baseline quality-gate truth artifact

- **Targeted Red command:**
  `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/baseline-truth.test.mjs`
- **Result at HEAD (2026-06-13):** `5 fail / 0 pass / 5 total`. The artifact
  `baseline-truth.md` does not exist at the documented path; the first
  assertion ENOENTs and every subsequent assertion fails on the missing file.
- **Why this is a real Red, not a stale-record Red:** Phase 3/4 reconciliation
  requires a recorded SHA + per-workspace gate state to attribute regressions
  correctly. Without `baseline-truth.md`, Phase 4's "separate baseline
  failures from upgrade-caused regressions" acceptance criterion (spec.md
  Acceptance Criteria #10) cannot be satisfied.
- **Boundedness:** single-file `node --test` invocation; reads
  `baseline-truth.md` from disk if present; never spawns pnpm or any
  workspace command.
- **Fake-harness boundary:** artifact contract per `test-strategy.md` §7. The
  live-behavior pair is the Phase 3 per-batch gates plus the Phase 4
  aggregate `pnpm turbo run lint|test|check-types|build` closeout, which
  actually executes the commands the artifact records.

### Task 3 — Shared FFmpeg process utility contract

- **Targeted Red command:**
  `pnpm --filter @reading-advantage/utils exec vitest run ffmpeg-process`
- **Result at HEAD (2026-06-13):** suite-level Red. Vitest reports
  `1 failed (1)` test file and `Cannot find module '/src/ffmpeg-process'` at
  `src/__tests__/ffmpeg-process.test.ts` line 133. The Red is at module-load
  time because the utility does not yet exist on disk.
- **Why this is a real Red, not a stale-record Red:** the test file declares
  the utility's API surface (`probeDurationSeconds`, `concatMp3Files`),
  argv-only spawn contract, ENOENT handling, non-zero-exit handling,
  paths-with-spaces handling, and concat-list cleanup. Batch E (Green) must
  ship a `src/ffmpeg-process.ts` that satisfies every assertion; until then
  no Vitest test inside this file can even collect.
- **Boundedness:** positional filter `ffmpeg-process` matches one path; vitest
  loads only this file. The mock `spawn` helper intercepts every
  `node:child_process` call so no real ffmpeg/ffprobe runs during this Red.
  Fixture MP3s (`silence-1s.mp3`, `silence-2s.mp3`) live under
  `packages/utils/src/__tests__/fixtures/` per `test-strategy.md` §2 and are
  re-used by Batch E's local concat smoke (<30s).
- **Fake-harness boundary:** live behavior per `test-strategy.md` §7. The
  unit tests assert argv contracts via the mock; Batch E pairs them with the
  bounded fixture-driven local smoke that exercises the real binaries once.

### Task 2 — Reading-advantage Calendar compatibility coverage

- **Targeted Red command:**
  `pnpm --filter reading-advantage exec jest --testPathPattern "components/ui/__tests__/calendar" --no-coverage`
- **Result at HEAD (2026-06-13):** `4 fail / 5 pass / 9 total` (test runtime
  ~37s — well within Jest's per-file budget and avoids the known
  full-suite hang). The four failing tests are the high-value behavioral
  contracts: single-mode date selection, disabled-day click suppression,
  disabled-day a11y exposure, and range-mode two-click selection.
- **Why this is a real Red, not a stale-record Red:** the failures surface
  because `react-day-picker@8` does not expose day cells via the
  `getByRole("gridcell", { name: /<day>/ })` accessibility query the
  post-migration v9 contract requires. `react-day-picker@9` produces ARIA
  consistent with the asserted contract. Batch C (Green) must migrate
  `apps/reading-advantage/components/ui/calendar.tsx` to the v9 API and prop
  shape; these tests must exit 0 after the migration.
- **Boundedness:** Jest `--testPathPattern` restricts collection to the one
  new test file. The reading-advantage full Jest suite is known to hang on
  this hardware (per spec.md Constraints and Risks); using `--testPathPattern`
  guarantees only this file runs.
- **Fake-harness boundary:** live behavior. RTL renders the actual
  `Calendar` component, dispatches real user events via `@testing-library/user-event`,
  and asserts against the rendered DOM. No mocks are inserted between the
  test and the component.

### Phase 2 Red Gate Aggregate

- **Total Red signal:** 17 failing tests + 1 failing test file (suite-level
  import failure) across 4 bounded commands.
- **Files Green must add or modify:** `upgrade-matrix.md` (new section),
  `baseline-truth.md` (new file), `packages/utils/src/ffmpeg-process.ts`
  (new file) + audio-generator refactors,
  `apps/reading-advantage/components/ui/calendar.tsx` (v9 migration).
- **No bypassed fake-harness rules:** every artifact contract above is paired
  with a live-behavior gate in a later phase (Phase 3 per-batch execution and
  Phase 4 aggregate closeout). No test in this Red can accidentally trigger
  the reading-advantage full Jest hang or a full pnpm turbo run.

## Phase 2 Green Gate

- **Green commit:** (Phase 3 Batch C / Batch E owners — see
  `test-strategy.md` §7 and the `## Batch Quality Gates` section that Task 4
  requires `upgrade-matrix.md` to expose. The Red proof above is owned by
  Phase 3 Batch C (calendar → react-day-picker@9 contract) and Batch E
  (shared FFmpeg utility + audio-generator refactor); Phase 4 owns the
  baseline-truth.md and Batch Quality Gates closeout.)
- **Targeted Green commands:**
  - Task 1 baseline-truth: `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/baseline-truth.test.mjs`
    — exits 0 only after `baseline-truth.md` is created with the required
    sections. Live-gate: Phase 4 aggregate `pnpm turbo run lint|test|check-types|build`
    reconciles against the recorded baseline SHA.
  - Task 2 calendar: `pnpm --filter reading-advantage exec jest --testPathPattern "components/ui/__tests__/calendar" --no-coverage`
    — exits 0 only after Batch C migrates `calendar.tsx` to the v9 contract.
    Bounded via `--testPathPattern`; never triggers the reading-advantage
    full Jest hang.
  - Task 3 ffmpeg-process: `pnpm --filter @reading-advantage/utils exec vitest run ffmpeg-process`
    — exits 0 only after `packages/utils/src/ffmpeg-process.ts` ships with
    `probeDurationSeconds` + `concatMp3Files` satisfying every argv contract.
    Live-gate pair: Batch E's bounded local fixture-driven smoke runs
    inside 30s.
  - Task 4 batch-gates: `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/batch-gates.test.mjs`
    — exits 0 only after `upgrade-matrix.md` exposes the new
    `## Batch Quality Gates` section with `### Batch A`..`### Batch H`
    subsections. Live-gate owner: Phase 3 batch execution runs each
    documented gate against the real workspaces.
- **Result:** the four bounded commands above must each exit 0 in their
  respective Phase 3 batches before Phase 4 closeout can run.

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
