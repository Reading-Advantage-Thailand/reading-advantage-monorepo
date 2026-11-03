/** The Abyssal Well rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  DESCENT_WORDS,
  descentsOf,
  echoWordOf,
  normalWord,
  sentencesOf,
  type AbyssalWellInput,
} from './content.js';
export { TUNING, createAbyssalWell, enemyInLane, nextEnemyOf, type AbyssalWellSimulation } from './sim.js';
export { evidenceOf, resultsOf, scoreOf } from './evidence.js';
export { ARCHER_RADIUS, BOTTOM_RADIUS, RIM_RADIUS, angleDelta, archerPoint, laneAngle, lanePoint } from './geometry.js';
