/** The Enchanted Library 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { DECOYS, visitOf, decoysOf, wordsOf } from './content.js';
export {
  HALL,
  HERO_START,
  TOUCH,
  TUNING,
  createEnchantedLibrary,
  hintBookOf,
  targetBookOf,
  type EnchantedLibrarySimulation,
} from './sim.js';
export { SCORE, evidenceOf, resultsOf, scoreOf } from './evidence.js';
