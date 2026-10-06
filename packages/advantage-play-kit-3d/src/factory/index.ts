export { Apk3dError, createThreeGameFactory, type ThreeFactoryOptions } from './three-factory.js';
export { createPhaserGameFactory, type PhaserModuleLike, type PhaserModuleLoader } from './phaser-factory.js';
export { createInputController } from './input.js';
export {
  isPhaserCartridge,
  isThreeCartridge,
  savedRendererSetting,
  selectRenderer,
  validateCartridge,
  type RendererChoice,
  type RendererSetting,
} from './select.js';
/**
 * The shared "2D mode (older phones)" setting. renderer-setting.ts is a byte copy of the monorepo
 * module that owns it, `@reading-advantage/advantage-play-kit/responsive` (renderer.ts): keep them
 * equal. The monorepo 3D kit re-exports that module instead of shipping this copy.
 */
export {
  RENDERER_SETTINGS_KEY,
  chooseRenderer,
  detectRenderer,
  readFlatMode,
  saveFlatMode,
  type Renderer,
  type RendererInputs,
} from './renderer-setting.js';
export {
  createCartridgeMounter,
  type CartridgeMounterFactories,
  type MountOptions,
  type ThreeGameFactory,
} from './mount.js';
export { SESSION_OPTIONS_DEFAULT } from './types.js';
export type {
  Cartridge,
  Composition3D,
  Game2DContext,
  Game3DContext,
  Game3DInstance,
  GateVerdict,
  HostServices,
  MountedGame,
  MountedThreeGame,
  PhaserCartridge,
  PhaserFactoryContext,
  PhaserGameFactory,
  SessionOptions,
  StandaloneComposition,
  ThreeCartridge,
  ThreeFactoryContext,
} from './types.js';
