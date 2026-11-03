/** The Magic Defense rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { wordsOf, waveSizes, targetsOf, formationOf, standingCastles, roundOf, type MagicDefenseInput } from './content.js';
export { TUNING, createMagicDefense, type MagicDefenseSimulation } from './sim.js';
export { evidenceOf, resultsOf } from './evidence.js';
