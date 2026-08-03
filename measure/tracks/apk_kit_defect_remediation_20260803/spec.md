# Spec: APK Kit Defect Remediation

Independent `claude -p` review of `packages/advantage-play-kit` (full non-test src
coverage, read-only) found 17 defects. Evidence:
[independent-claude-review-20260803.md](./independent-claude-review-20260803.md).
Findings 1 and 3 were spot-confirmed against source by the orchestrator.

Every fix ships TDD: failing test demonstrating the defect, then the minimal fix,
then package gates green. No public contract changes without an explicit note.

## Defects

### High

- **D1** `src/runtime/runtime.ts:120/144` — input controller (window
  keydown/keyup listeners, `touchAction` style) leaks when `resolveComposition()`
  throws at mount (fail-closed unsupported viewport). Failed mounts accumulate
  listeners unboundedly. Fix: resolve composition before creating the input
  controller, or destroy controller + restore styles on the throw path.
- **D2** `src/runtime/runtime.ts:254-258` — transient unsupported viewport leaves
  the instance paused forever: catch pauses without recording state, stale
  composition defeats the change-detection guard, `resume()` never runs while
  diagnostics report `running`. Fix: record failed state; resume on recovery
  even when composition is unchanged.
- **D3** `src/systems/input-actions.ts:122` — with default `threshold: 0`,
  `Math.abs(dx) >= 0` is always true: vertical drag actions are unreachable and a
  pure vertical drag emits the horizontal right action. Fix: dominant-axis
  comparison with `> 0` guards, per the review's suggested shape.

### Medium

- **D4** `src/systems/single-completion.ts:56-58` — sync delivery throw stores a
  rejected promise nothing must await → `unhandledrejection`; inconsistent with
  the async path's `.catch(() => undefined)`. Attach a swallowing catch, or
  re-throw from `drained()`.
- **D5** `src/assets/standard-asset-contract.ts:42,49-51` — native-cell-size
  guard is dead code: `NATIVE_VIEWS` is built from the full view list already
  validated, so any view may declare `native` without a cell size. Fix: restrict
  `NATIVE_VIEWS` to the intended subset.
- **D6** `src/runtime/runtime.ts:311-322` — one failed restart permanently
  disables restart: chained `.then` on a rejected `operation` never recovers.
  Fix: `.catch(() => undefined)` before chaining.
- **D7** `src/runtime/input.ts:88-126` — pointer sticks down when gesture ends
  off-surface (up/cancel bound to surface only, no pointer capture); stuck
  `pointer.id` then drops all other pointers. Fix: `setPointerCapture` on down,
  release on finish (or bind up/cancel on window).
- **D8** `src/editions/editions.ts:151-153` (+ `:333`, `required-pack.ts:290`) —
  `JSON.stringify` structural equality is key-order sensitive; valid edition
  JSON with different key order is rejected. Fix: use the existing `stableJson`
  (`src/assets/asset-contract-v2.ts:263`) or order-insensitive deep-equal.
- **D9** `src/react/apk-game-host.tsx:142` — unstable effect deps (`input`,
  `factory`, callbacks, `responsive`) remount the Phaser game on every parent
  render, discarding in-progress state. Fix: callbacks via refs; key effect on
  stable identity.

### Low

- **D10** `src/react/apk-game-host.tsx:160-171` — `restart()` after failed mount
  reports `ready` for a game that does not exist. Bail when handle is undefined.
- **D11** `src/qc/qc-kit.ts:596-604` — performance monitor reports `passed: true`
  with zero samples. Fail (or throw) on empty samples.
- **D12** `src/editions/editions.ts:163` — traversal check misses backslash
  `..`; mirror `parseStandardAssetPath`'s `\` rejection.
- **D13** `src/scaffolding/scaffold.ts:245/257/259` — generator can emit
  unparseable JSX (quote-escaped title in attribute literal) and invalid
  identifiers (digit-leading id → `3dGamePresentation`). Fix: expression
  container; reject/prefix digit-leading ids.
- **D14** `src/systems/capability-manifest.ts:129,287-296` +
  `src/assets/semantic-product-bindings.ts:194` — "frozen" manifests only
  shallow-frozen; mutable arrays serve as module-level defaults. Fix: deep-freeze
  (existing `deepFreezeResolverValue`).
- **D15** `src/responsive/responsive-composition.ts:666-680` — transition
  coordinator resumes unconditionally in `finally` (even after throw) and
  un-pauses a deliberately paused game. Guard like `runtime.ts:240`.
- **D16** `src/assets/semantic-product-bindings.ts:494-497` — `sha256` lacks the
  Web Crypto guard its twin has (`accepted-standard-pack-release.ts:79-82`);
  cryptic TypeError in non-secure contexts.
- **D17** `src/editions/editions.ts:298` — `validateEdition` returns the raw
  argument, not Zod `parsed.data` (latent: breaks if schema gains
  `.default()/.transform()`/non-strict). Return `validated`.

## Acceptance criteria

- One failing-then-passing test per defect (D1–D17).
- `pnpm --filter @reading-advantage/advantage-play-kit test` green; lint and
  `tsc --noEmit` green for the package.
- No change to accepted public contracts without a recorded deviation note.
- Final independent re-review of the fixes (fresh agent, read-only) with zero
  unresolved Critical/High before track completion.
