/** The Paladin's Twin Soul rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { isVocabularyInput, wordsOf, targetsOf, monstersOf, shadesOf, type TwinSoulInput } from './content.js';
export { TUNING, createTwinSoul, type TwinSoulOptions, type TwinSoulSimulation } from './sim.js';
export { TWIN_SOUL_GAME_ID, evidenceItemsOf, evidenceOf, scoreOf, resultsOf, type EvidenceStory } from './evidence.js';
