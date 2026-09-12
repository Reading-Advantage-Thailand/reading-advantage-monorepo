# Release Acceptance Receipt: standard-pack 2026.08.04 (audio cohort)

- Track: `apk_audio_cohort_release_acceptance_20260804`
- Owner decision (spec.md): option B — new additive version, frozen `2026.07.23` untouched.

## Accepted identity

- version: `2026.08.04`
- catalogDigest: `535866f258dc9238b48839f9ba7c264417ef104ec586b0c2dfe056a5975fdc33`
- sourceReceiptDigest: `c06bad4bf118bffac14b4469fc54b0ba1c84dda8c8b43a143aaf6caf0f0caf2c`
- catalogArtifactSha256: `572b871389304ae64612f0355193e649763e25663c1ab5b98f4ca221c1cfef3e`
- assetCount: 43,316 (43,074 images + 242 audio), acceptedAt `2026-08-04T00:00:00Z`

## Digest deviation from spec (accepted)

The spec's provisional digests (`cd238d33…` / `41a8b139…`) were computed while
the catalog's internal `version` field still read `2026.07.23`; since `version`
feeds the payload digest and the acceptance layer enforces
`catalog.version === accepted.version`, the catalog was regenerated (assets
verified byte-identical via git numstat 1/1). The digests above are the
accepted ones. The competition template's `ASSET-LICENSES.json` citation of
`cd238d33` was reconciled to `535866f2` in the template repo.

## Verification evidence

- Parity: `Standard-pack parity verified: 43316 assets (43074 images, 242 audio, 0 fonts)`
- `node scripts/check-accepted-inputs.mjs`: all accepted-input bindings verified.
- Scoped vitest (assets/systems/scaffolding/guards/compatibility + host-proof-edition
  + standard-asset-gallery): 38 files, 256 tests passed. Package-wide tsc/vitest
  intentionally not a gate: `editions.ts`, `required-pack.ts`, `apk-game-host.tsx`,
  `runtime/*` are another in-flight track's uncommitted files.

## Commits

- `b4d7e2065` feat: audio cohort import (241 OGG + receipts + catalog + track scaffold)
- `e4082607c` test: release 2026.08.04 pins
- `d6becf5f1` feat: accept release 2026.08.04
- `b646a667a` feat: suitability evidence pins
