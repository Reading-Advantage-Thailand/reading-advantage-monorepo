# Phase 3 Adversarial Testing Evidence

Track: `apk_legacy_traversal_cutover_20260727`
Phase: Phase 3 Red mechanics, responsive, and learning contracts
Pre-adversarial head: `27c7f4f23`
Test commit: `e1d2a9e62`

## Result

**PASS.** The strengthened Red contracts resisted the requested adversarial attacks.

The independent adversarial suite passed three tests. It covers all five titles, four evidence sections, no-op configurations, fake manifest declarations, and renderer coupling.

The fifteen Red tests collected fifteen files and failed fifteen tests at the empty public catalog boundary. Each failure names its title and accepted evidence claim.

## Attack coverage

- Pointer checks resolve mechanics, input, responsive, and learning claims for every title.
- Scene checks reject missing, empty-list, and empty-object configurations without inspecting Phaser internals.
- Mechanics checks require exact capabilities, non-empty keyboard maps, positive timing, and unmapped-input rejection.
- Responsive checks verify the target composition, state restoration, recomposition, and transition diagnostics.
- Learning checks reject out-of-order progress and require non-empty unique targets, result accounting, and one completion.
- A source guard rejects Phaser imports and private renderer-factory coupling in all fifteen Red files.

## Verification

- TypeScript passed.
- ESLint passed.
- Prettier passed.
- Scoped `git diff --check` passed.

An unrelated commit advanced HEAD from the supplied pre-adversarial SHA before the test commit. No APK path changed in that commit.

Review C is recorded as PASS with no blocking findings. Its audited head did not contain a final Review A result artifact.

Owner acceptance remains pending. Green remains owner-gated. This evidence grants no cartridge implementation, adoption, ingestion, cutover, or shipping authority.

MEASURE_AGENT_RESULT
role: measure-adversarial-testing
status: complete
track: apk_legacy_traversal_cutover_20260727
phase: Phase 3 Red mechanics, responsive, and learning contracts
commits: e1d2a9e62
tests_run: 15 Red tests expected exit 1; adversarial suite exit 0; type, lint, Prettier, and diff checks exit 0
files_changed: 17 Phase 3 test/helper files; evidence and audit receipt
plan_updates: none; owner acceptance and Green remain separate gates
known_failures: 15 expected Red failures at the empty public catalog boundary
handoff: Green remains owner-gated; route any implementation defect to Mid Red
END_MEASURE_AGENT_RESULT
