/** The Magic Defense rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { isVocabularyInput, wordsOf, waveSizes, targetsOf, distinctTerms, formationOf, standingCastles, roundOf, type MagicDefenseInput } from './content.js';
export { TUNING, createMagicDefense, type MagicDefenseOptions, type MagicDefenseSimulation } from './sim.js';
export { MAGIC_DEFENSE_GAME_ID, evidenceItemsOf, evidenceOf, scoreOf, resultsOf, type EvidenceStory } from './evidence.js';
