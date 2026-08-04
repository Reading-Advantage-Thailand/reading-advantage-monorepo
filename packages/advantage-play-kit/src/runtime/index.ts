/** Public runtime lifecycle. */
export { mountCartridge } from "./runtime.js";

/** Public Phaser renderer boundary. */
export { createPhaserGameFactory } from "./phaser-factory.js";

/** Public normalized input factory. */
export { createInputController } from "./input.js";

/** Public runtime errors. */
export { APKRuntimeError, toAPKRuntimeError } from "./errors.js";

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
  GameInput,
  MountCartridgeOptions,
  MultiplayerRuntimeOptions,
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
