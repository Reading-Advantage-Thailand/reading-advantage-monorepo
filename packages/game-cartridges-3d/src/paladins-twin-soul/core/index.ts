/** The Paladin's Twin Soul rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { wordsOf, targetsOf, monstersOf, shadesOf, type TwinSoulInput } from './content.js';
export { TUNING, createTwinSoul, type TwinSoulSimulation } from './sim.js';
export { evidenceOf, resultsOf } from './evidence.js';
