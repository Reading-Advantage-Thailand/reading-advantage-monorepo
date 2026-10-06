/** The Dragon Rider 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { wordsOf, rideWordsOf, decoysFor, gatesFor, isVocabularyInput, type DragonRiderInput, type WordSource } from './content.js';
export { TUNING, bossPowerOf, createDragonRider, correctGateOf, type DragonRiderOptions, type DragonRiderSimulation } from './sim.js';
export { DRAGON_RIDER_GAME_ID, evidenceItemsOf, evidenceOf, scoreOf, resultsOf, type EvidenceStory } from './evidence.js';
