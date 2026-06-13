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

- [x] Task: Capture baseline quality-gate truth before dependency changes.
  - [x] Run affected package/app lint, test, check-types, and build commands.
  - [x] Record pre-existing failures separately from the track's acceptance gates.
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
- [x] Task: Define batch-specific quality gates in `upgrade-matrix.md`.
  - [x] Framework batch: all six app builds plus affected tests/check-types.
  - [x] Vitest batch: every Vitest workspace test command.
  - [x] Deprecated-type batch: all affected type-check commands.
  - [x] Tooling/patch batch: root install, lint, test, check-types, and build.
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
- **Result at HEAD (2026-06-13, re-verified 2026-06-13):** `1 fail / 8 pass / 9
  total` (test runtime ~16–21s — well within Jest's per-file budget and
  avoids the known full-suite hang). The single failing test is the
  high-value range-mode behavioral contract: "fires onSelect with a
  DateRange after two day clicks". The other eight tests pass against the
  v8 baseline: single-mode date selection, aria-selected marking,
  disabled-day click suppression, disabled-day a11y exposure, prev/next
  navigation buttons, next-month advancement, prev-month rewind, and
  react-day-picker import under the date-fns peer.
- **Correction from prior recorded count (4 fail / 5 pass):** the v8
  `react-day-picker` does in fact expose day cells with accessible names
  for single-mode, disabled-click, and disabled-a11y behaviors; those
  three tests pass against v8 and only the range-mode test fails because
  v8's gridcell name includes the weekday prefix in a way that matches
  multiple cells (e.g. `/5/` matches "Wednesday 5", "Thursday 5", etc.)
  while v9 exposes the day number alone. The Red proof is still real
  (1 of 9 = a genuine behavior gap that Batch C must close), but the
  breadth of the Red signal is narrower than the original draft claimed.
- **Why this is a real Red, not a stale-record Red:** the failing test
  surfaces because `react-day-picker@8` wraps day cells in a gridcell
  whose accessible name conflates the weekday label with the day number
  when `mode="range"`, so the asserted
  `getByRole("gridcell", { name: /<day>/ }).querySelector("button")`
  pattern hits multiple cells. `react-day-picker@9` exposes the day
  number as the gridcell's accessible name. Batch C (Green) must migrate
  `apps/reading-advantage/components/ui/calendar.tsx` to the v9 API and
  prop shape; this test (and the eight currently-passing ones) must exit
  0 after the migration.
- **Boundedness:** Jest `--testPathPattern` restricts collection to the one
  new test file. The reading-advantage full Jest suite is known to hang on
  this hardware (per spec.md Constraints and Risks); using `--testPathPattern`
  guarantees only this file runs.
- **Fake-harness boundary:** live behavior. RTL renders the actual
  `Calendar` component, dispatches real user events via `@testing-library/user-event`,
  and asserts against the rendered DOM. No mocks are inserted between the
  test and the component.

### Phase 2 Red Gate Aggregate

- **Total Red signal:** 14 failing tests + 1 failing test file (suite-level
  import failure) + 1 failing live-behavior test across 4 bounded commands
  (5 baseline-truth + 8 batch-gates + 1 calendar range-mode + 1
  ffmpeg-process suite-level = 14 failing tests + 1 failing test file).
  Previously recorded as 17 failing tests; corrected after re-verification
  of Task 2 against the actual v8 gridcell ARIA contract.
- **Files Green must add or modify:** `upgrade-matrix.md` (new section),
  `baseline-truth.md` (new file), `packages/utils/src/ffmpeg-process.ts`
  (new file) + audio-generator refactors,
  `apps/reading-advantage/components/ui/calendar.tsx` (v9 migration).
- **No bypassed fake-harness rules:** every artifact contract above is paired
  with a live-behavior gate in a later phase (Phase 3 per-batch execution and
  Phase 4 aggregate closeout). No test in this Red can accidentally trigger
  the reading-advantage full Jest hang or a full pnpm turbo run.

### Phase 2 Red Gate — MID Re-Verification (2026-06-13)

- **Re-verification commit:** `579ccdec` (parent of the MID commit that
  follows).
- **Working tree state at MID start:** clean (no unrelated user work).
- **Test files owned by this Red phase (paths under
  `apps/reading-advantage/components/ui/__tests__/`,
  `packages/utils/src/__tests__/`, and
  `measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/`):**
  all four test files exist on disk, were committed in `4ec52a0d`, and were
  not modified by the previous attempt — they remain the canonical
  Red-phase contract.
- **Re-run of all four bounded Red commands at HEAD `579ccdec`:**
  - Task 1 baseline-truth: `node --test …/baseline-truth.test.mjs` → **5
    fail / 0 pass / 5 total** (real Red; `baseline-truth.md` ENOENT).
  - Task 2 calendar: `pnpm --filter reading-advantage exec jest
    --testPathPattern "components/ui/__tests__/calendar" --no-coverage` → **1
    fail / 8 pass / 9 total** in ~11.6s (real Red; range-mode test fails
    because v8 gridcell `aria-label` conflates weekday with day number,
    triggering `getMultipleElementsFoundError` on `getByRole("gridcell",
    { name: /5/ })`).
  - Task 3 ffmpeg-process: `pnpm --filter @reading-advantage/utils exec
    vitest run ffmpeg-process` → **1 failed test file, 0 tests collected**
    (real Red; `Cannot find module '../ffmpeg-process'` at import time).
  - Task 4 batch-gates: `node --test …/batch-gates.test.mjs` → **8 fail / 0
    pass / 8 total** (real Red; `## Batch Quality Gates` section absent from
    `upgrade-matrix.md`).
- **Tightening needed:** none. Every Red is caused by a missing
  implementation artifact (file, module, section, or v9 migration) and not
  by a stale durable record. No contract change was required.
- **No source-code changes:** MID role touched only Measure docs per
  workflow.md boundary; no test file was modified in this re-verification
  because the existing assertions remain the correct Red contract.
- **Handoff:** Green owners are Phase 3 Batch C (calendar) and Phase 3
  Batch E (ffmpeg-process); the two artifact deliverables (baseline-truth
  artifact and Batch Quality Gates matrix section) are reconciled at Phase 4
  closeout per `test-strategy.md` §7 and the Green Gate section below.

### Phase 2 Red Gate — MID Second Re-Verification (2026-06-13)

- **Re-verification commit:** `8f7870e1` (HEAD at the start of this re-verification).
- **Working tree state at MID start:** clean (no unrelated user work; `git status --porcelain` produced no output; `git ls-files --others --exclude-standard` produced no output).
- **HEAD line for this re-verification:** `8f7870e1 measure(plan): record Phase 2 Red Gate MID re-verification at HEAD 579ccdec` — the prior MID re-verification. No commits or working-tree changes occurred between `579ccdec` and the start of this second re-verification, so the Red contract is unchanged.
- **Graph freshness:** `graph.db` mtime is 2026-06-13 07:42 (today), 2,109 nodes / 3,030 edges / 284 files; `build-graph stats` reports zero hits for `ffmpeg`, `ffprobe`, `fluent-ffmpeg`, `DayPicker`, or `Calendar` — confirms the FFmpeg utility and calendar surfaces are still graph-blind per `test-strategy.md` §6 and that no source has been added behind the Red test files.
- **Re-run of all four bounded Red commands at HEAD `8f7870e1` (this verification):**
  - Task 1 baseline-truth: `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/baseline-truth.test.mjs` → **5 fail / 0 pass / 5 total** (real Red; `baseline-truth.md` ENOENT at
    `measure/tracks/dependency_upgrade_hardening_20260607/baseline-truth.md`).
  - Task 2 calendar: `pnpm --filter reading-advantage exec jest --testPathPattern "components/ui/__tests__/calendar" --no-coverage` → **1 fail / 8 pass / 9 total** in 13.265s (real Red; same range-mode failure as the prior re-verification — v8's gridcell `aria-label` is `"Sunday, May 31st, 2026"`, which collides on `/5/` and triggers `getMultipleElementsFoundError` from RTL on line 129).
  - Task 3 ffmpeg-process: `pnpm --filter @reading-advantage/utils exec vitest run ffmpeg-process` → **1 failed (1) test file, 0 tests collected** in 1.21s (real Red; `Error: Cannot find module '/src/ffmpeg-process'` at
    `packages/utils/src/__tests__/ffmpeg-process.test.ts:133:1`, exactly the Red-by-design module-load failure).
  - Task 4 batch-gates: `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/batch-gates.test.mjs` → **8 fail / 0 pass / 8 total** (real Red; zero `^## Batch Quality Gates` matches in
    `upgrade-matrix.md` — confirmed via `grep -c "^## Batch Quality Gates" upgrade-matrix.md` returning `0`).
- **Aggregate Red signal confirmed:** 14 failing tests + 1 failing test file across 4 bounded commands (5 baseline-truth + 8 batch-gates + 1 calendar range-mode + 1 ffmpeg-process suite-level = 14 failing tests + 1 failing test file). Identical to the `579ccdec` re-verification; no further tightening of the contract was required because no implementation artifact (file, module, section, or v9 migration) has been added since.
- **Tightening needed:** none. Every Red is caused by a missing implementation artifact (file, module, section, or v9 migration) and not by a stale durable record. No contract change was required.
- **No source-code changes:** MID role touched only Measure docs per `workflow.md` boundary; no test file was modified in this re-verification because the existing assertions remain the correct Red contract.
- **Handoff:** Green owners remain Phase 3 Batch C (calendar) and Phase 3 Batch E (ffmpeg-process); the two artifact deliverables (baseline-truth artifact and Batch Quality Gates matrix section) are reconciled at Phase 4 closeout per `test-strategy.md` §7 and the Green Gate section below. The Red contract is now triple-locked: (1) tests committed in `4ec52a0d`, (2) re-verified at `579ccdec` and recorded in `8f7870e1`, (3) re-re-verified at `8f7870e1` and recorded in this section.

## Phase 2 Green Gate

- **Artifact Green commit:** (this commit — Task 1 and Task 4 artifacts)
- **Targeted Green commands:**
  - Task 1 baseline-truth: `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/baseline-truth.test.mjs`
    — **5 pass / 0 fail** (artifact created with Source Commit, Affected
    Workspaces, Per-Workspace Gate Results, and Pre-Existing Failures Carved
    Out sections). Live-gate: Phase 4 aggregate `pnpm turbo run lint|test|check-types|build`
    reconciles against the recorded baseline SHA.
  - Task 2 calendar: `pnpm --filter reading-advantage exec jest --testPathPattern "components/ui/__tests__/calendar" --no-coverage`
    — **1 fail / 8 pass** (still Red; owned by Phase 3 Batch C, which migrates
    `calendar.tsx` to the v9 contract). Bounded via `--testPathPattern`; never
    triggers the reading-advantage full Jest hang.
  - Task 3 ffmpeg-process: `pnpm --filter @reading-advantage/utils exec vitest run ffmpeg-process`
    — **1 failed test file** (still Red; owned by Phase 3 Batch E, which
    creates `packages/utils/src/ffmpeg-process.ts`). Live-gate pair: Batch E's
    bounded local fixture-driven smoke runs inside 30s.
  - Task 4 batch-gates: `node --test measure/tracks/dependency_upgrade_hardening_20260607/scripts/__tests__/batch-gates.test.mjs`
    — **8 pass / 0 fail** (Batch Quality Gates section added to
    `upgrade-matrix.md` with ### Batch A…### Batch H subsections). Live-gate
    owner: Phase 3 batch execution runs each documented gate against the real
    workspaces.
- **Result:** Task 1 and Task 4 artifact gates are green (13 pass / 0 fail).
  Task 2 (calendar) and Task 3 (ffmpeg-process) remain intentionally red,
  owned by Phase 3 Batch C and Batch E respectively.

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
