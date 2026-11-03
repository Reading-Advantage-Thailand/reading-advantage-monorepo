/** The Castle Defense rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { shiftOf, bareWord, wordKey, attackersOf, choicesOf, WAVE_CONFIGS, HITS, type CastleDefenseInput } from './content.js';
export { TUNING, createCastleDefense, type CastleDefenseSimulation } from './sim.js';
export { evidenceOf, resultsOf } from './evidence.js';
