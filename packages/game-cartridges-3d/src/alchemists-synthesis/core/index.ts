/** The Alchemist's Synthesis 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  decoysFor,
  formulasOf,
  isVocabularyInput,
  jarsFor,
  wordsOf,
  type AlchemistsSynthesisInput,
  type JarOption,
  type WordSource,
} from './content.js';
export {
  TUNING,
  choosable,
  correctJarOf,
  createAlchemistsSynthesis,
  type AlchemistsSynthesisOptions,
  type AlchemistsSynthesisSimulation,
} from './sim.js';
export {
  ALCHEMISTS_SYNTHESIS_GAME_ID,
  SCORE,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
