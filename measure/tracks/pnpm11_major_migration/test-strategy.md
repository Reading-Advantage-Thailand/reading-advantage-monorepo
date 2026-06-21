# Test Strategy: pnpm 11 Major Migration

Track: `pnpm11_major_migration` · Role: Tech Lead · Grounded at HEAD `1eead8f6` (2026-06-21).

## §0 Baseline (verified at HEAD — not from plan.md)

- `package.json#packageManager` = `pnpm@8.15.8`; `pnpm-lock.yaml` `lockfileVersion` = `'6.0'`.
- `pnpm-workspace.yaml` = 3 globs only (`apps/*`, `packages/*`, `packages/integrations/*`); no pnpm-11 config block.
- `package.json` still carries `pnpm.overrides` / `pnpm.peerDependencyRules` / `pnpm.resolvePeersFromWorkspaceRoot` (deprecated even at 8.15.8 — `pnpm --version` warns).
- `.github/workflows/ci.yml` uses `pnpm/action-setup@v4` with NO `version:` key (SSOT = `packageManager`).
- No root `vitest.config.*`; `turbo.json` `test` task = `dependsOn: ["^build"]`, per-package vitest only.
- **Spec AC#1 at HEAD still reads "10.x → 11.x" — mis-stated.** True jump is **8.x → 11.x** (the correction commit `19fe833c` is orphaned, never reached HEAD). This strategy treats 8.x → 11.x as authoritative and flags AC#1 for correction.

## §1 CRITICAL — plan.md Red-gate claims are NOT realizable at HEAD

`plan.md` documents three test files + an earlier `test-strategy.md` with pass/fail counts and SHAs (`a8612896`, `cee679f0`, `253d2497`, `bd918923`, …). **Verified 2026-06-21: none are ancestors of HEAD** (`git merge-base --is-ancestor` = NO for all; `git branch --contains` = empty; no delete-commit exists — they were never merged). The files exist nowhere reachable. **The Red phase is NOT satisfied at HEAD.** All Red contracts must be (re)authored fresh against §0 before any Green work. Orphaned commits may be mined for wording, but their recorded results are not reproducible and must not be cited as evidence. `review-2026-06-21.md`'s claim that "test files live under `measure/tracks/.../__tests__/`" is false at HEAD.

## §2 Testing pyramid (per phase)

The migration surface is config/CI/yaml/json, not TS source (see §6). No unit/integration/e2e layers apply. "Tests" = artifact pins + one live gate.
- **Phase 1 (audit/baseline):** artifact contract only. `node:test` reading JSON/YAML text. Pins §0. GREEN at HEAD by design (baseline pin, not a false Red).
- **Phase 2 (lockfile contract):** artifact contract. Asserts `packageManager` matches `/^pnpm@11\./`, `lockfileVersion >= '9.0'` and `!== '6.0'`. RED at HEAD (real Red).
- **Phase 3 (workspace config contract):** artifact contract. Asserts `pnpm-workspace.yaml` gains `overrides`/`peerDependencyRules`/`allowBuilds`/`nodeLinker: hoisted`/`resolvePeersFromWorkspaceRoot` + 5 override pins, and `package.json` drops its `pnpm` field. RED at HEAD (real Red).
- **Phase 4 (validate/close):** live-behavior only. No artifact contract; the aggregate gate IS the proof.

## §3 Shared fixtures / mocks

- **No mocks.** Artifact tests read four files verbatim: `package.json`, `pnpm-lock.yaml` (first ~5 lines), `pnpm-workspace.yaml`, `.github/workflows/ci.yml`. Share a tiny loader (`readJson`, `readLockfileHead`, `readYamlText`) in `__tests__/`; no workspace import.
- **No DB, no pnpm, no turbo, no vitest, no jest** in artifact tests. `node --test <file>` only.
- `resolveTestDatabaseUrl` (graph hit for "pnpm") = auth integration global-setup — unrelated, do not couple. `readLockfileOverride` (graph hit for "lockfile") = drizzle test — unrelated.

## §4 Cross-phase edge cases & dependencies

- **Phase 1 ↔ 2/3 tension:** Phase 1 pins pre-migration baseline, GREEN at HEAD; post-migration it goes RED as a stale-baseline diagnostic. Intentional. Phase 4 must update or archive it (see §8).
- **Phase 2 ↔ 3 overlap:** both assert the `packageManager` pin. Intentional duplication → localized regression diagnostic; keep lock-stepped.
- **SSOT invariant:** CI `pnpm/action-setup@v4` must never gain a `version:` key (pinned by Phase 1). Phase 4 must not regress it.
- **Order:** Phase 3 Green (source edits) lands BEFORE Phase 2/3 contracts flip green; Phase 1 drifts RED at the same commit → Phase 4 owns reconciliation.

## §5 Architecture guardrails

- Pin `packageManager` in ONE place (`package.json`); never duplicate `version:` in CI YAML.
- Move `pnpm.*` keys out of `package.json` into top-level `pnpm-workspace.yaml` (pnpm 11 promotion).
- `nodeLinker: hoisted` required for Next.js / Firebase compat.
- Do NOT add a root `vitest.config.*` to "fix" discovery — track tests are deliberately outside turbo (root vitest gap is recorded in `measure/tech-debt.md`; leave open).
- Contract tests are `.mjs` + `node:test`, never `.ts`/vitest — keeps them off the graph and off turbo.

## §6 Build-graph findings (shaped this strategy)

`build-graph stats ./graph.db` (fresh, mtime 2026-06-21 22:52): **2553 nodes / 3510 edges / 401 files**, TS-only.
- `search pnpm` → only `resolveTestDatabaseUrl` (auth integration setup, unrelated).
- `search lockfile` → only `readLockfileOverride` (drizzle test, unrelated).
- `search workspace` → **no results**.

Conclusion: migration blast radius is **config/CI/yaml/json, not TS source**. No exported TS signatures change. **No `build-graph update` required post-impl.** The graph gives negative confirmation that Phase 4's `check-types`/`build` risk is lockfile/linker-driven, not API-driven.

## §7 Live-proof plan (artifact vs live — NOT interchangeable)

| Phase | Targeted Red command (artifact, bounded) | Green / closeout gate (live-behavior) |
|---|---|---|
| 1 | `node --test measure/tracks/pnpm11_major_migration/__tests__/pnpm-lock-baseline.test.mjs` → GREEN at HEAD (baseline pin) | (none — audit; baseline pin IS the proof) |
| 2 | `node --test measure/tracks/pnpm11_major_migration/__tests__/pnpm11-lockfile-contract.test.mjs` → RED at HEAD (0/3) | Implementer: `pnpm install --frozen-lockfile` under pnpm 11 flips it GREEN |
| 3 | `node --test measure/tracks/pnpm11_major_migration/__tests__/pnpm11-workspace-config.test.mjs` → RED at HEAD (1/9) | Implementer: `pnpm dedupe --check` under pnpm 11 + contract flips GREEN |
| 4 | (none — no artifact contract) | **Live, not committed as a test:** `pnpm turbo run lint test check-types build` under pnpm 11, exit 0; document `pnpm outdated` / `pnpm audit` |

**Artifact vs live:** rows 1–3 read text and assert state (documentation contract). Row 4 executes the real toolchain (live behavior). Artifact tests cannot prove `pnpm install` succeeds; the live gate cannot be committed as a test (mutates `node_modules` + `pnpm-lock.yaml`, needs pnpm 11/corepack on PATH — only 8.15.8 is on PATH here).

**Fake-harness rule:** fakes may wrap runner plumbing ONLY. Any production gate a fake covers MUST also have a bounded non-fake proof. Phase 4's aggregate `pnpm turbo run …` is inherently full-suite and CANNOT be bounded — therefore no fake harness may stand in for it; the Implementer runs the real command. A command-construction check (assert constructed argv equals the canonical `lint test check-types build` tuple, run via `node --test` against a string) is permitted as a bounded complement but does NOT replace the live run and must not fall through into the full suite.

## §8 Intentionally-red files & aggregate-suite exclusion

Once the Red phase is (re)authored at HEAD, these are RED and would be hit by a broad `node --test measure/tracks/pnpm11_major_migration/__tests__/*.mjs` glob:
- `pnpm11-lockfile-contract.test.mjs` — RED until Phase 3 ships. **Owned by** Phase 3 task "Regenerate lockfile" `[~]`.
- `pnpm11-workspace-config.test.mjs` — RED until Phase 3 ships. **Owned by** Phase 3 task "Update pnpm-workspace.yaml" `[~]`.
- `pnpm-lock-baseline.test.mjs` — GREEN at HEAD, goes RED post-migration (stale baseline). **Owned by** Phase 4 (update to new baseline or archive at closeout).

**Exclusion from `pnpm turbo run test`:** by location + runner. Files live under `measure/tracks/.../__tests__/` (verified: `ls vitest.config.*` at root = none; per-package configs scope to `packages/*` / `apps/*`, none include `measure/`). They are `.mjs` + `node:test`, not `.ts`/vitest. Turbo's `test` task never invokes `node --test` against `measure/`, so they **cannot fall through into a full suite unexpectedly**. The only aggregate that reaches them is an explicit `node --test measure/...` glob, which operators must keep scoped to `packages/**` / `apps/**` for TS suites.
