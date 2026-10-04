export { Apk3dError, createThreeGameFactory, type ThreeFactoryOptions } from './three-factory.js';
export { createPhaserGameFactory, type PhaserModuleLike, type PhaserModuleLoader } from './phaser-factory.js';
export { createInputController } from './input.js';
export {
  isPhaserCartridge,
  isThreeCartridge,
  selectRenderer,
  validateCartridge,
  type RendererChoice,
  type RendererSetting,
} from './select.js';
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
