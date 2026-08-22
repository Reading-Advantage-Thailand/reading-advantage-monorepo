/** Public runtime lifecycle. */
export { mountCartridge } from "./runtime.js";

/** Public Phaser renderer boundary. */
export { createPhaserGameFactory } from "./phaser-factory.js";

/** Shared actor sprite layer that binds standard-pack art to gameplay actors. */
export { createActorSpriteLayer } from "./actor-sprites.js";
export type {
  ActorSpriteLayer,
  ActorSpriteLike,
  ActorSpritePlacement,
  ActorSpriteSceneLike,
} from "./actor-sprites.js";

/** Public normalized input factory. */
export { createInputController } from "./input.js";

/** Public runtime errors. */
export { APKRuntimeError, toAPKRuntimeError } from "./errors.js";

/** Load-path cartridge manifest contract enforced by mountCartridge. */
export {
  runtimeCartridgeManifestSchema,
  validateRuntimeCartridgeManifest,
} from "./cartridge-manifest.js";

/** Public runtime constants. */
export { APK_RUNTIME_API_VERSION } from "./types.js";

/** Public runtime types. */
export type {
  APKDiagnosticInput,
  APKDiagnosticEvent,
  APKGameHandle,
  APKGameInstance,
  APKHostAdapter,
  APKRuntimeDiagnostics,
  APKRuntimeStatus,
  APKSessionMode,
  AssetAnimation,
  AssetCollisionBox,
  AssetOrigin,
  AssetPackManifest,
  AssetProvenance,
  AssetView,
  AudienceTuning,
  CartridgeGameConfigContext,
  GameFactory,
  GameFactoryContext,
  FrameGrid,
  GameTerminalOutcome,
  GameInput,
  MountCartridgeOptions,
  RuntimeCartridge,
  RuntimeCartridgeManifest,
  ResponsiveRuntimeOptions,
  NineSliceInsets,
  PhysicalAssetFile,
  PhysicalAssetKind,
  RuntimeEdition,
  SemanticAssetBinding,
  SemanticAssetUsage,
} from "./types.js";

/** Public input types. */
export type {
  APKInputController,
  APKInputSnapshot,
  APKPointerState,
} from "./input.js";

/** Public Phaser factory types. */
export type { PhaserModuleLoader } from "./phaser-factory.js";
