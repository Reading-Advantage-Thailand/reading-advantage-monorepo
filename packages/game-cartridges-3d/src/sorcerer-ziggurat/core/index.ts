/** The Sorcerer's Ziggurat 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  DECOYS,
  climbOf,
  cubeWord,
  cubesOf,
  normalWord,
} from './content.js';
export { TUNING, correctCubeOf, createSorcererZiggurat, openingEvents, type ZigguratSimulation } from './sim.js';
export { SCORE, evidenceOf, resultsOf, scoreOf } from './evidence.js';
