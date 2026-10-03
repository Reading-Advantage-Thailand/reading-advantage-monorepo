/** The Enchanted Library 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { DECOYS, isVocabularyInput, normalTerm, visitOf, decoysOf, wordsOf, type LibraryInput, type LibraryWord } from './content.js';
export {
  HALL,
  HERO_START,
  SPIRIT_DOORS,
  TOUCH,
  TUNING,
  createEnchantedLibrary,
  targetBookOf,
  type EnchantedLibraryOptions,
  type EnchantedLibrarySimulation,
} from './sim.js';
export { ENCHANTED_LIBRARY_GAME_ID, SCORE, evidenceItemsOf, evidenceOf, resultsOf, scoreOf, type EvidenceStory } from './evidence.js';
