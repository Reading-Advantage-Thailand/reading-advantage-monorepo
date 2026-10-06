/** The Archer's Revenge rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { isVocabularyInput, wordsOf, waveSizes, targetsOf, distinctTerms, formationOf, roundOf, type ArchersRevengeInput } from './content.js';
export { TUNING, createArchersRevenge, type ArchersRevengeOptions, type ArchersRevengeSimulation } from './sim.js';
export { ARCHERS_REVENGE_GAME_ID, evidenceItemsOf, evidenceOf, scoreOf, resultsOf, type EvidenceStory } from './evidence.js';
