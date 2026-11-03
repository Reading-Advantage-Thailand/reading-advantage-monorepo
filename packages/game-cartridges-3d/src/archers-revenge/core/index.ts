/** The Archer's Revenge rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { wordsOf, waveSizes, targetsOf, formationOf, roundOf, type ArchersRevengeInput } from './content.js';
export { TUNING, createArchersRevenge, type ArchersRevengeSimulation } from './sim.js';
export { evidenceOf, resultsOf } from './evidence.js';
