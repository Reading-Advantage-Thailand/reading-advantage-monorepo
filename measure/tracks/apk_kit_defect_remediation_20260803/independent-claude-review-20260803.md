I read every non-test source file in `src/` (plus `runtime/types.ts`, all barrels, and the Zod schemas). Findings below, most severe first. I did not modify anything.

---

## HIGH

**1. `src/runtime/runtime.ts:144` — input controller and container styles leak when composition resolution fails at mount**

`createInputController(container)` (line 120) installs `window` `keydown`/`keyup` listeners and sets `container.style.touchAction = "none"`. The cleanup try/catch at lines 286–294 wraps only `createInstance()`. If `resolveComposition()` at line 144 throws — the documented fail-closed path (`UNSUPPORTED_VIEWPORT_SIZE` / `UNSUPPORTED_INPUT_MODE`), reachable on small viewports or high text/touch scale — `mountCartridge` propagates without ever calling `inputController.destroy()`. `APKGameHost` re-runs its mount effect on every dependency change, so failed mounts accumulate window listeners unboundedly.

*Fix:* move `composition = resolveComposition()` above `createInputController`, or wrap lines 120–144 so the catch runs `inputController.destroy(); restoreContainerStyles();` before rethrowing.

**2. `src/runtime/runtime.ts:254–258` — a transient unsupported viewport leaves the game paused forever**

The catch pauses the instance but leaves `composition` at its stale value and never updates `status`. When the viewport returns to its previous geometry, `resolveComposition()` succeeds with a composition equal to the stale one, so the change-detection guard at line 231 is false and `instance?.resume?.()` at line 240 never runs. The game is permanently paused while `getDiagnostics()` still reports `"running"`. (The only accidental recovery is a tab-visibility round trip via `onVisibilityChange`.)

*Fix:* in the catch set `status = "paused"` and a `compositionFailed = true` flag; in the success path, resume when recovering from that flag even if the composition is unchanged.

**3. `src/systems/input-actions.ts:122–133` — vertical drag actions can never fire, and vertical drags emit a horizontal action**

`dragThreshold` defaults to `0` (line 109), so `Math.abs(dx) >= dragThreshold` is true for *every* drag, including `dx === 0`. A pure downward drag `{deltaX: 0, deltaY: 120}` falls into the horizontal branch and returns `rightAction`. `upAction`/`downAction` are unreachable under the default config. Even with a nonzero threshold, horizontal wins whenever both axes clear it, regardless of which is dominant. The tests (`src/systems/__tests__/input-actions.test.ts:48–82`) only exercise `deltaY: 0`, so this is uncovered.

*Fix:*
```ts
const ax = Math.abs(dx), ay = Math.abs(dy);
if (ax >= ay && ax > 0 && ax >= dragThreshold) return [{ action: dx < 0 ? left : right, edge: "press" }];
if (ay > 0 && ay >= dragThreshold) { /* up/down */ }
```

---

## MEDIUM

**4. `src/systems/single-completion.ts:56–58` — unhandled promise rejection when delivery throws synchronously**

`delivery = Promise.reject(error)` stores a rejected promise that nothing is required to await (`drained()` is optional in the interface). This fires `unhandledRejection` in Node (process exit by default since Node 15) and `unhandledrejection` in browsers. It is also inconsistent with the async path one line above, which swallows errors via `.catch(() => undefined)`.

*Fix:* `const rejected = Promise.reject(error); rejected.catch(() => undefined); delivery = rejected;` (or capture the error and re-throw it from `drained()`).

**5. `src/assets/standard-asset-contract.ts:42, 49–51` — the "native cell size" guard is dead code**

`NATIVE_VIEWS` is built from the complete `STANDARD_ASSET_VIEWS` list, and `view` was already validated against that same list at line 76. `!NATIVE_VIEWS.has(view)` is therefore never true, and the error `${view} assets require an explicit cell size` is unreachable. Any view — `top-down`, `ui`, `effects` — may declare `native` and skip its cell size, exactly what the message intends to prevent.

*Fix:* `const NATIVE_VIEWS = new Set<StandardAssetView>(["audio", "font", "world"]);` (whatever the intended subset is).

**6. `src/runtime/runtime.ts:311–322` — one failed restart permanently disables restart**

`operation = operation.then(async () => {...})`. Once `operation` is rejected, every subsequent `restart()` chains `.then` onto a rejected promise: the callback never runs and each call rejects with the stale original error. There is no recovery path short of destroying and remounting.

*Fix:* `operation = operation.catch(() => undefined).then(async () => { ... }); return operation;`

**7. `src/runtime/input.ts:88–126` — pointer sticks down when the gesture ends off-surface**

`pointerup`/`pointercancel` are bound to `surface` only (lines 134–135) and `onPointerDown` never calls `setPointerCapture`. Dragging off the canvas and releasing produces no event, so `pointer.down` stays `true` and `pointer.id` stays set indefinitely; the id filter at line 105 then also drops moves from every other pointer. Cartridges reading `snapshot().pointer.down` see a permanently held pointer.

*Fix:* `surface.setPointerCapture(event.pointerId)` in `onPointerDown` and `releasePointerCapture` in `finishPointer` (or bind up/cancel on `window`).

**8. `src/editions/editions.ts:151–153` (and `required-pack.ts:290`) — key-order-sensitive structural equality rejects valid editions**

`same()` compares via `JSON.stringify`, which depends on object key insertion order. `assertCanonicalActor` (lines 197, 201) compares `file.animations` against `TOP_DOWN_CHARACTER_ANIMATIONS`; Zod's `z.record` preserves the input's key order, so an edition JSON listing the same animations in a different order is rejected with "violates the canonical 4x8 animation contract". Same hazard in `validateEditionPair` (`same(left.bindings, right.bindings)`, line 333) and `validateCompleteAssetPack`.

*Fix:* use a key-sorting canonical serializer — `stableJson` at `src/assets/asset-contract-v2.ts:263` already implements this — or an order-insensitive deep-equal.

**9. `src/react/apk-game-host.tsx:142` — unstable effect deps tear down and remount the Phaser game on every parent render**

The dependency array includes `input`, `factory`, `onComplete`, `onDiagnostic`, `onNavigate`, and `responsive`. These are near-always fresh identities per render (array literals, inline arrows, object literals), so any parent re-render destroys the game, resets status to `"loading"`, and discards in-progress state. Nothing in the props or docs tells callers they must memoize all six.

*Fix:* keep the volatile callbacks in refs read from inside the `host` adapter, and key the effect on stable identity (`cartridge.manifest.id`, `edition.id`, a memoized input) rather than raw prop references.

---

## LOW

**10. `src/react/apk-game-host.tsx:160–171` — `restart()` reports success with no mounted handle.** After a failed mount (`status === "error"`) the Restart button is still enabled (disabled only for `"loading"`, line 198). `await handleRef.current?.restart()` resolves to `undefined`, the catch never fires, and `setStatus("ready")` announces a running game that does not exist. *Fix:* bail out with an error when `handleRef.current` is undefined.

**11. `src/qc/qc-kit.ts:596–604` — performance monitor reports `passed: true` with zero samples.** `reduce(..., 0)` yields all-zero maxima, which clear every budget. A QC gate that never received a sample reports a pass. *Fix:* return `passed: false` (or throw) when `samples.length === 0`.

**12. `src/editions/editions.ts:163` — traversal check misses backslashes.** `file.path.split("/").includes("..")` catches `a/../b` but not `..\..\x.png`; browsers normalize `\` to `/` when resolving the URL built at line 374, escaping the pack root. Impact is limited to fetching a different same-origin static file. `parseStandardAssetPath` already rejects `\` (line 70); mirror that here.

**13. `src/scaffolding/scaffold.ts:259` and `:245/257` — generator can emit unparseable source.** `accessibleName=${JSON.stringify(manifest.title)}` puts backslash escapes inside a JSX attribute string literal, which JSX does not support, so a title containing `"` yields an invalid `presentation.tsx`. Separately, `pascalCase` on a schema-legal digit-leading id (`3d-game` passes `/^[a-z0-9]+(?:-[a-z0-9]+)*$/`) emits `3dGamePresentation` — not a valid identifier. *Fix:* use an expression container `accessibleName={"..."}`, and reject or prefix digit-leading ids.

**14. `src/systems/capability-manifest.ts:129, 287–296` and `src/assets/semantic-product-bindings.ts:194` — "frozen" manifests are only shallow-frozen.** `Object.freeze([...])` leaves each capability object and its `sourceGameIds`/`sourceUseIds` arrays mutable, and `OWNER_APPROVED_CANONICAL_BINDINGS.bindings` is a mutable array serving as a module-level default argument (`createAcceptedSemanticAssetResolver`, line 481). The tamper-evidence these guards exist to provide is bypassable. *Fix:* deep-freeze — `deepFreezeResolverValue` in `asset-contract-v2-provenance.ts:6` already exists.

**15. `src/responsive/responsive-composition.ts:666–680` — transition coordinator resumes unconditionally.** `finally { adapter.resume(); }` runs even when `recompose`/`restoreState` threw (resuming a half-recomposed simulation), and it tracks no prior paused state, so a resize un-pauses a game the user deliberately paused. The runtime's own path guards this with `if (!explicitlyPaused && completionCount === 0)` (runtime.ts:240); this public coordinator does not.

**16. `src/assets/semantic-product-bindings.ts:494–497` — `sha256` lacks the Web Crypto guard** its twin at `accepted-standard-pack-release.ts:79–82` has. In a non-secure context callers get `TypeError: Cannot read properties of undefined (reading 'digest')` instead of the actionable message.

**17. `src/editions/editions.ts:298` — `validateEdition` returns the original argument, not `parsed.data`.** Every check above runs against `validated` (the Zod output), but the raw input object is returned to the factory. Under the current all-`.strict()` schema the two are structurally equal, so this is *currently* benign — I'm flagging it as a latent hazard: any future `.default()`, `.transform()`, or non-strict object would silently ship an unvalidated object. The docstring suggests it's deliberate.

---

## Summary

| Severity | Count |
|---|---|
| Critical | 0 |
| High | 3 |
| Medium | 6 |
| Low | 8 |
| **Total** | **17** |

**Things I checked and found correct** (so you know they were covered, not skipped): compact/wide reserved-height arithmetic in `planCompact` vs. `compactFits` (exact match for both the 3-gap and 4-gap cases); the 75-file `REQUIRED_PHYSICAL_ASSETS` inventory count and every grid ↔ width/height product; `parseStandardAssetPath` segment/extension/key derivation; the `entry.path === key + "." + extension` invariant; the completion latch's at-most-once semantics; `createObjectPool` capacity accounting; countdown/stopwatch terminal latching; `assetContractV2PhysicalDescriptorSchema` cross-field refinements; and the decision↔candidate↔descriptor linkage in `standard-pack-suitability.ts:516`. Zod is 3.25.76, so `z.ZodIssueCode.custom` and `.strip()` usage is valid.

**Where I'm uncertain:** finding 9 depends on caller conventions I can't see from inside the package — if every consumer already memoizes all six props it's inert, but nothing enforces that. Finding 17 is latent rather than an active bug. The negative-height `controls` rect in `planWide` (lines 302–317) is arithmetically reachable only with a custom config whose `wide.minGameplayHeight` is under ~103px; it cannot occur with `DEFAULT_RESPONSIVE_LAYOUT_CONFIG`, so I did not list it.
