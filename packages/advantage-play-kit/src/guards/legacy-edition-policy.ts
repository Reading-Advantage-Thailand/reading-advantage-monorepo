/**
 * Legacy edition policy that retires the 75-file dual-pack ABI behind the
 * canonical standard-pack resolver.
 *
 * The `editions` module is the surviving legacy dual-pack ABI: it carries
 * edition/theme asset bindings, the `AssetPackManifest` / `SemanticAssetBinding`
 * physical-pack contract, and the 75-file required-pack inventory. T11 does not
 * preserve it as a production compatibility surface for new cartridges. New
 * shared-kit modules (systems, scaffolding, guards, compatibility, testing
 * extensions) must remain edition-free and route through the accepted
 * `createAcceptedStandardAssetResolver` instead.
 *
 * The editions module remains importable only by the existing runtime host
 * adapter and its tests while the runtime contract migrates to the canonical
 * resolver; this is recorded as tech debt, not a production surface.
 */

/** Frozen diagnostic documenting why the editions module is deprecated. */
export interface LegacyEditionPolicyDiagnostic {
  /** The deprecated module path. */
  readonly modulePath: string;
  /** Why the module is deprecated. */
  readonly reason: string;
  /** The required replacement surface. */
  readonly requiredReplacement: string;
}

/** Exact path of the deprecated editions module barrel. */
export const EDITIONS_MODULE_PATH = "./editions/index.js" as const;

/** Frozen diagnostic documenting the editions deprecation. */
export const LEGACY_EDITION_POLICY_DIAGNOSTIC: LegacyEditionPolicyDiagnostic = Object.freeze({
  modulePath: EDITIONS_MODULE_PATH,
  reason:
    "The editions module carries the retired 75-file dual-pack ABI and edition/theme asset "
    + "bindings; preserving it as a production compatibility surface is prohibited by T11.",
  requiredReplacement:
    "New cartridges must resolve semantic roles through createAcceptedStandardAssetResolver "
    + "(the canonical standard-pack resolver) and pin the accepted 2026.08.04 release.",
});

/** Frozen policy describing where the editions module may and may not be used. */
export interface LegacyEditionPolicy {
  /** The deprecated module path. */
  readonly modulePath: string;
  /** Policy status. */
  readonly status: "deprecated-legacy-compatibility-surface";
  /** Whether new cartridges may use the editions module in production. */
  readonly productionSurfaceForNewCartridges: false;
  /** New shared-kit modules that must remain edition-free. */
  readonly editionFreeModules: readonly string[];
  /** Existing modules that may still import editions while migrating. */
  readonly migrationAllowlist: readonly string[];
}

/** Frozen policy object for the editions module. */
export const EDITIONS_POLICY: LegacyEditionPolicy = Object.freeze({
  modulePath: EDITIONS_MODULE_PATH,
  status: "deprecated-legacy-compatibility-surface",
  productionSurfaceForNewCartridges: false,
  editionFreeModules: Object.freeze([
    "./systems/index.js",
    "./systems/capability-manifest.js",
    "./systems/nonempty-content.js",
    "./systems/language-target-progression.js",
    "./systems/single-completion.js",
    "./systems/result-accounting.js",
    "./systems/input-actions.js",
    "./systems/bounded-frame-loop.js",
    "./systems/time-threshold.js",
    "./systems/gameplay-primitives.js",
    "./responsive",
    "./presentation",
    "./qc",
    "./assets/semantic-product-bindings.js",
    "./guards/index.js",
    "./guards/accepted-inputs.js",
    "./guards/blocked-scopes.js",
    "./guards/legacy-edition-policy.js",
    "./scaffolding/index.js",
    "./scaffolding/cartridge-manifest.js",
    "./scaffolding/scaffold.js",
    "./scaffolding/exemplar.js",
    "./compatibility/index.js",
    "./compatibility/developer-kit-api.js",
    "./diagnostics/index.js",
    "./diagnostics/structured-error.js",
  ]),
  migrationAllowlist: Object.freeze([
    "./runtime/runtime.js",
    "./runtime/types.js",
    "./runtime/index.js",
    "./react/apk-game-host.tsx",
    "./testing/fixtures.js",
    "./editions/editions.ts",
    "./editions/required-pack.ts",
    "./editions/index.ts",
    "./index.ts",
  ]),
});

/**
 * Reports whether a module path is the deprecated editions barrel.
 * @param modulePath The module path to test.
 * @returns True when the path is the editions barrel or a submodule of it.
 */
export function isEditionsModulePath(modulePath: string): boolean {
  return modulePath === EDITIONS_MODULE_PATH || modulePath.startsWith("./editions/");
}
