# Test Strategy: Dependency Upgrade Hardening and Alignment

Maintenance/dependency track. Most "tests" are **artifact contract checks**
(matrix, lockfile, manifest alignment). Live behavior is proven only at the two
real code-change surfaces: calendar migration and FFmpeg utility replacement.
Everything else is a **command-construction proof + bounded smoke**, never a full
suite.

## 1. Testing Pyramid Per Phase

- **Phase 1 (Contract & Schema).** No runtime tests. Artifact contract proofs:
  schema validation of `upgrade-matrix.md` columns, presence of saved baseline JSON,
  registry confirmation of selected versions.
- **Phase 2 (Test).** Pyramid concentrated at the unit layer: focused calendar
  component tests (Jest + RTL, jsdom) and FFmpeg utility unit tests (Vitest, mocked
  child_process). One bounded local FFmpeg fixture smoke for the utility. **No
  full-suite runs at this phase** — they belong to per-batch gates.
- **Phase 3 (Implement).** Per-batch quality gates only. Unit + targeted integration
  for affected workspaces; one **bounded** build/test smoke per batch. App builds
  serve as the integration layer (no E2E added by this track).
- **Phase 4 (Docs & Doctor).** Aggregate gates: `pnpm turbo run lint|test|check-types|build`.
  These are the only legitimate full-suite runs and they are the closeout gate.

## 2. Shared Fixtures and Mocks

- **Baseline JSON snapshots** under `measure/tracks/.../baseline/`:
  `pnpm-outdated.json`, `pnpm-list.json`, `pnpm-dedupe-check.txt`, `pnpm-audit.json`
  (with explicit `incomplete: true` marker if registry stalls). Re-used as the diff
  oracle in Phase 4.
- **FFmpeg mocks.** A single `mockSpawn` helper in the new utility's `__tests__/`
  folder that captures argv, stdin, exit code, and stderr. Same helper used by both
  audio-generator refactors.
- **FFmpeg fixtures.** Two short MP3 fixtures (`silence-1s.mp3`, `silence-2s.mp3`)
  committed under the utility package's test fixtures. Re-used by ffprobe duration
  test and the bounded local concat smoke.
- **Calendar test wrapper.** A small render helper that mounts `Calendar` with a
  controlled `selected`/`onSelect` and a fake clock (`vi.useFakeTimers`/Jest
  equivalent). Re-used by single-date, range, disabled-date, and navigation tests.
- **Manifest probe.** A node script that reads every workspace `package.json` and
  reports `next`, `eslint-config-next`, `react`, `react-dom`, `vitest`,
  `@vitest/ui`, `@vitest/coverage-v8` versions. Used as a contract gate between
  Batches A/B and Phase 4.

## 3. Cross-Phase Edge Cases and Dependencies

- **Phase 2 calendar tests must be red against the existing `react-day-picker@8` /
  `date-fns@4` baseline** before Batch C runs. If green pre-migration, the test was
  not actually exercising the broken peer.
- **Phase 2 FFmpeg utility tests must be red before Batch E** because the utility
  does not yet exist.
- **Batch A invalidates Batch B/C/D fixtures** if Next/React patch lines shift jsdom
  or React behavior; rerun calendar tests after Batch A even though Batch C owns
  them.
- **Batch H (`pnpm dedupe`)** can silently reintroduce a vulnerable transitive Next
  resolution. Re-run the manifest probe + `pnpm why next` after dedupe.
- **`pnpm audit` may stall.** Treat absence of audit output as **unknown**, never as
  pass. Acceptance gate must record "audit incomplete" if it recurs.
- **Reading-advantage full Jest hangs on this hardware** (per spec). Calendar tests
  must be runnable via a focused Jest pattern (`-t` or path filter) so they never
  trigger the hang.

## 4. Architecture Guardrails

- New FFmpeg utility lives under `packages/utils` or `packages/integrations`, not in
  an app. Both audio generators import from it — no duplicated process logic.
- FFmpeg utility uses **argument arrays only**; `shell: true` and string
  interpolation are disallowed. Add a unit test that asserts the utility never
  passes `shell: true` to spawn.
- No provider SDK (e.g. AI SDK, Drizzle, Prisma) gains a new direct caller during
  this track. Calendar migration stays inside `apps/reading-advantage/components/ui`.
- Range/version policy edits are **out of scope** — owned by
  `housekeeping_batch_20260603` FR-6.

## 5. Per-Phase Test Approach Notes

- **Phase 1.** Contract-only. Artifact tests verify matrix file schema and that
  every "decision" cell has owner + batch + validation scope.
- **Phase 2.** Author calendar and FFmpeg utility tests; confirm RED locally; do
  **not** run aggregate suites.
- **Phase 3.** After each batch, run only the affected-workspace gates declared in
  `upgrade-matrix.md`. Batch C must run focused calendar Jest + reading-advantage
  `lint`+`check-types`+`build`. Batch E must run FFmpeg unit tests + a single
  fixture-driven local smoke that exits within 30s. Batches D/F/G run only
  `check-types`+`build` for affected workspaces.
- **Phase 4.** Run aggregate `pnpm turbo run lint|test|check-types|build` once. Diff
  outdated/audit JSON against baseline. Verify manifest probe shows alignment.

## 6. Build-Graph Findings That Shaped The Strategy

- `graph.db` is fresh (Jun 13, 2109 nodes, 284 files) but indexes only the **root
  TS project + `packages/*`**. App-level files (calendar.tsx, audio-generator.ts)
  are **not in the graph** → `callers` queries cannot trace consumers. Treat both
  surfaces as graph-blind; rely on grep + targeted unit tests.
- No graph nodes for `ffmpeg`, `ffprobe`, `fluent-ffmpeg`, `DayPicker`, `Calendar`
  → confirms the new shared FFmpeg utility has **no existing internal callers**;
  the only consumers are the two audio-generator files edited in Batch E.
- Top imported files (`trpc.ts`, `db-contract.ts`, `errors.ts`, `tenant.ts`) are
  unaffected → no contract churn outside the two surfaces.
- `packages/utils` exists (7 files) and is the correct host for the FFmpeg utility.
- Post-Batch E, run `build-graph update ./graph.db <new utility files>`.

## 7. Live-Proof Plan (Red Command → Green/Closeout Gate)

| Phase / Batch | Targeted Red Command | Green / Closeout Gate | Type |
|---|---|---|---|
| Phase 1 | `node measure/tracks/.../scripts/validate-matrix.mjs` (schema check, missing baseline files) | Same script exits 0; baseline JSONs present | Artifact contract |
| Phase 2 (calendar) | `pnpm --filter reading-advantage exec jest components/ui/calendar -t "selects a date"` against current peer-broken baseline | Same focused Jest command exits 0 **after Batch C** only | Live behavior |
| Phase 2 (ffmpeg) | `pnpm --filter <utils-pkg> test ffmpeg-process` (utility absent → failing import) | Same command exits 0 after Batch E; unit tests cover argv build, ffprobe duration parse, non-zero exit, missing binary, paths-with-spaces | Live behavior |
| Batch A | Manifest probe script reports drift; one app build fails on vulnerable Next | Probe reports aligned versions; all six `pnpm --filter <app> build` exit 0 | Command-construction + bounded smoke |
| Batch B | `pnpm --filter science-advantage test` peer-warns or fails | Every Vitest workspace test command exits 0; no peer warning | Live behavior |
| Batch C | Phase-2 calendar Jest fails | Phase-2 calendar Jest exits 0 + reading-advantage `check-types`+`build` exit 0 | Live behavior |
| Batch D | `pnpm --filter <app> check-types` fails on missing stub types removal | Each affected `check-types`+`build` exits 0 | Live behavior |
| Batch E | Phase-2 ffmpeg utility tests fail; local `node scripts/ffmpeg-smoke.mjs` against fixture MP3s fails | Utility tests exit 0; local smoke produces a valid concat MP3 within 30s; `fluent-ffmpeg` removed from both manifests | Live behavior + bounded smoke |
| Batch F | Affected-workspace gate fails on a candidate patch | Affected-workspace `lint`+`test`+`check-types`+`build` exit 0; rejected candidates moved to follow-up queue | Live behavior |
| Batch G | Same as F; Tailwind candidates additionally fail visual smoke | Same gate exits 0; documented Tailwind visual smoke captured | Live behavior + manual visual smoke |
| Batch H | `pnpm install --frozen-lockfile` fails or `pnpm dedupe --check` reports work | Both exit 0 (or residual duplicates documented); `pnpm why next` confirms no `16.0.0` resolution | Artifact contract + command-construction |
| Phase 4 | Pre-run: outdated/audit diff vs baseline shows unresolved entries | `pnpm turbo run lint|test|check-types|build` all exit 0; diff documented; pre-existing failures separated from regressions | Aggregate live gate |

**Fake-harness boundary.** Only the matrix-validation and manifest-probe scripts
are permitted as fake harnesses (artifact-only). Every batch row above includes a
**bounded non-fake** command (focused Jest/Vitest, single app build, fixture FFmpeg
smoke, or `pnpm install --frozen-lockfile`) so no production gate is satisfied by a
fake alone. Aggregate `pnpm turbo run …` is reserved for Phase 4 closeout.

## 8. Intentionally-Red Tests Discovered By Aggregate Suites

- **Phase 2 calendar tests** are intentionally red until Batch C lands. Owned by the
  still-`[~]` Phase 2 task. Excluded from aggregate runs by **not landing on `main`
  until Batch C closes** (Phase 2 and Batch C must be committed together, or the
  calendar test files must be added under `it.skip` with a `// TODO(track:
  dependency_upgrade_hardening_20260607)` marker that is removed in Batch C).
- **Phase 2 FFmpeg utility tests** are intentionally red until Batch E lands. Same
  rule: land with Batch E, or skip-mark with the same TODO until Batch E removes
  the marker.
- Pre-existing baseline failures (e.g. primary-advantage 49 ESLint errors, Jest/
  Vitest mix) are tracked in `measure/tech-debt.md` and recorded separately under
  Phase 2's baseline-truth task; they are **not** owned by this track and do not
  block its acceptance gates.
