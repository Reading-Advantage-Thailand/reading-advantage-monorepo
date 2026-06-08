# Test Strategy: codecamp-advantage Cold-Start Performance

Scope: drive prod cold-start `GET /en/` below 5s (AC#1), keep Phase 1 cold-start
sub-check green (AC#2), no warm-latency regression (AC#3). This is an **infra +
perf** track, not a feature. Source of truth gates live in the existing prod-smoke
suite — do not duplicate them, instrument and tighten them.

## 1. Testing pyramid per phase

| Phase | Unit (Vitest, local) | Integration / Contract | Live black-box smoke (prod) |
|-------|----------------------|------------------------|-----------------------------|
| 1 Profile | 1–2 helpers: cold-start sampler (N=5 with sleep-between, p50/p95 reporter) — pure functions over arrays of `{status, elapsedMs}`. | None. | **N=5 cold-start sampler** vs prod after forced scale-to-zero; emits artifact `cold-start-baseline.json`. Read-only — must not assert pass/fail; gate stays Phase 1. |
| 2 Optimize | Dockerfile/contract tests: parse `Dockerfile` + `cloudbuild.yaml` and assert (a) multi-stage `runner` stage exists, (b) image not built from `deps`, (c) `--min-instances=N` arg present in deploy step if that lever is chosen, (d) `next.config.ts` keeps `output: "standalone"`. **Artifact-contract only** — does not prove runtime behaviour. | Smoke a built image locally: `docker build` then `docker run` and curl `/en/` once; assert 200 + boot log emitted. Bounded by a hard 60s timeout. | Re-sample N=5 after deploy; compare to baseline artifact. |
| 3 Verify | None new. | None. | Existing `phase-1-infrastructure.test.ts` "cold start time is within budget" must pass without `PHASE1_SKIP`; existing `phase-6-performance-and-latency.test.ts` warm probe must not regress vs baseline ≥10%. |

## 2. Shared fixtures / mocks

- `lib/__tests__/_helpers/cold-start-sampler.ts` (new, Phase 1) — pure async fn
  `sampleColdStart({url, n, gapMs}) → {samples, p50, p95, max}`. Uses `fetch`,
  no test framework deps. Re-used by Phase 1, 2, 3 smoke probes.
- `lib/__tests__/_helpers/cloudbuild-parser.ts` (new, Phase 2) — parses YAML to
  a typed shape; **unit tested** with fixtures (no real cloudbuild.yaml as input
  in unit tests, only fixture strings).
- Reuse existing `fetchWithTimeout` pattern from `phase-1-infrastructure.test.ts:31`.
  Do not add a new HTTP client.
- No DB / no auth mocks needed — entire track is HTTP + filesystem.

## 3. Cross-phase edge cases & dependencies

- **Scale-to-zero precondition.** Cold-start measurement requires the instance
  to actually be cold. Phase 1 sampler must wait ≥15 min after last traffic or
  call `gcloud run services update --max-instances=0` then restore. Document the
  chosen method in the sampler; do not encode the wait in CI.
- **Cold-vs-warm budget invariant.** Phase 6 already asserts
  `DASHBOARD_WARM_MS < DASHBOARD_COLD_MS` (`phase-6-performance-and-latency.test.ts:1111`).
  Any budget tightening in Phase 3 must preserve this.
- **`min-instances` ≠ cold-start fix.** If Phase 2 picks `min-instances=1`,
  Phase 3 must still measure a genuine cold-start (force scale-to-zero) to prove
  the underlying boot improved; otherwise the lever masks the regression risk on
  scale-out beyond 1 instance. Document explicitly in plan.md Phase 3.
- **Out-of-scope guardrail.** Warm-dashboard and render-blocking work belongs to
  sibling tracks; reject any test here that asserts warm latency below the
  *existing* baseline. Only assert no-regression.

## 4. Architecture guardrails

- No changes outside `apps/codecamp-advantage/{Dockerfile,cloudbuild.yaml,next.config.ts,lib/__tests__/**}`
  and the helper files named in §2. AGENTS.md "Provider Neutrality": Cloud Run-
  specific `--min-instances` stays in `cloudbuild.yaml`, not in app code.
- No new runtime deps in `apps/codecamp-advantage/package.json`. Sampler + parser
  are pure TS using stdlib `fetch` and a tiny YAML reader (prefer hand parse;
  fall back to existing dep only — do **not** add `yaml` if not already present).
- Black-box probes only against prod URL. Never import server code into the
  smoke suite — preserve the `phase-*-` contract boundary.
- No business logic in tests. Helpers go in `_helpers/`, never in `lib/`.

## 5. Per-phase test approach

- **Phase 1 (Profile).** Goal: produce a measured baseline. Add the sampler
  helper + sampler unit tests. Run the sampler once against prod, commit the
  artifact under `measure/tracks/codecamp_infra_cold_start_20260608/baseline/`.
  Do **not** add a new always-on test that fails until prod is fixed; the
  existing Phase 1 cold-start test already serves as the Red gate.
- **Phase 2 (Optimize).** TDD the artifact contract: Red on the
  `cloudbuild-parser` assertion for whichever lever is chosen, then implement
  the Dockerfile/cloudbuild change to turn it Green. Add the local `docker run`
  smoke as an opt-in script (`scripts/smoke-local-image.sh`) gated behind
  `CODECAMP_LOCAL_IMAGE_SMOKE=1`; do not wire into CI.
- **Phase 3 (Verify).** No new tests. Run the full `prod-smoke` suite
  unskipped against prod; capture a second sampler artifact; assert the
  existing Phase 1 cold-start test passes and Phase 6 warm budget is unchanged.

## 6. Build-graph findings that shaped this strategy

- `build-graph stats ./graph.db` (fresh 2026-06-08 11:38): the 6th-largest file
  in the graph is
  `./apps/codecamp-advantage/lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts`
  (27 entities). The prod-smoke surface is structurally significant — extending
  it carelessly will dominate any later refactor. Strategy: **extract helpers,
  don't grow the phase-6 file**.
- `build-graph search ./graph.db "cold|smoke|startup|instrumentation"` → no
  hits. The cold-start concept is **only** expressed inside the two phase test
  files (grep confirmed: phase-1 lines 27, 125, 130, 138; phase-6 lines 52–55,
  80, 309–320). No domain/api/auth code paths participate → guardrail §4
  holds; this track stays out of `packages/**`.
- `cloudbuild.yaml` (read): no `--min-instances` arg today. Confirms the
  Phase 2 lever space is currently unset, so the artifact-contract test is a
  meaningful new gate, not a redundant one.

## 7. Live-proof plan (Red command → Green/closeout gate)

Distinguishes **artifact/contract** proofs (parse files, prove plumbing) from
**live behaviour** proofs (run against prod). Fake harnesses (e.g. fixture
strings fed to the parser) are runner plumbing only; every production gate
they support has a bounded live counterpart below.

| Phase | Red command (must fail before work) | Green / closeout gate (must pass after) |
|-------|-------------------------------------|----------------------------------------|
| 1 Profile | `pnpm --filter codecamp-advantage vitest run lib/__tests__/_helpers/cold-start-sampler.test.ts` (file does not exist yet → fail) **and** live: `PHASE1_PROD_URL=https://codecamp.reading-advantage.com pnpm --filter codecamp-advantage vitest run lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts -t "cold start time"` → Red on >5s. | Unit test green; live test still Red (expected — that's why Phase 2 exists); baseline artifact committed. |
| 2 Optimize | `pnpm --filter codecamp-advantage vitest run lib/__tests__/_helpers/cloudbuild-parser.test.ts -t "asserts chosen lever"` (assertion absent → fail) **and** bounded live smoke: `CODECAMP_LOCAL_IMAGE_SMOKE=1 bash apps/codecamp-advantage/scripts/smoke-local-image.sh` with a hard `timeout 90` wrapper. The script exits non-zero if the container does not serve `/en/` 200 within 90s — it cannot fall through into the full vitest suite. | Contract test green after editing `cloudbuild.yaml`/`Dockerfile`; local-image smoke exits 0. **Deploy** via existing pipeline; do not gate Phase 2 on prod. |
| 3 Verify | `PHASE1_PROD_URL=https://codecamp.reading-advantage.com pnpm --filter codecamp-advantage vitest run lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts -t "cold start time"` → still Red implies optimization failed. | Same command Green **and** `pnpm --filter codecamp-advantage vitest run lib/__tests__/prod-smoke/phase-6-performance-and-latency.test.ts -t "warm dashboard"` Green vs baseline (no regression). Second sampler artifact committed; AC#1, AC#2, AC#3 all satisfied. |

### Intentionally-Red files discoverable by aggregate suites

- `lib/__tests__/prod-smoke/phase-1-infrastructure.test.ts` is **already** Red on prod
  for the cold-start sub-check today (this track's reason to exist). It is owned by
  the still-`[ ]` Phase 3 task. Exclusion mechanism: the suite is gated by
  `PHASE1_SKIP=1` in CI environments without prod access, so a default
  `pnpm turbo run test` does not run it. **Do not add `it.skip` to the cold-start
  case** — that would mask AC#2.
- No other intentionally-red files are introduced by this track.

MEASURE_AGENT_RESULT
role: strategy
status: complete
track: codecamp_infra_cold_start_20260608
phase: track setup
commits: none
tests_run: none (strategy doc only)
files_changed: measure/tracks/codecamp_infra_cold_start_20260608/test-strategy.md (new)
plan_updates: none (plan.md unchanged; strategy references existing Phase 1/2/3 tasks)
known_failures: phase-1 cold-start probe is Red on prod by design until Phase 3 closeout; owned by Phase 3 task "Re-run Phase 1/6 cold-start probes" and gated by PHASE1_SKIP in CI
handoff: Implementer should (1) build _helpers/cold-start-sampler.ts and its unit test first (Phase 1 Red), (2) commit baseline artifact under tracks/.../baseline/, (3) choose ONE Phase 2 lever (recommend min-instances=1 as fastest; pair with image-size for durability) and TDD via cloudbuild-parser contract test, (4) run scripts/smoke-local-image.sh with `timeout 90` wrapper before deploy, (5) Phase 3 must force scale-to-zero before re-sampling so min-instances does not mask a real boot regression
END_MEASURE_AGENT_RESULT
