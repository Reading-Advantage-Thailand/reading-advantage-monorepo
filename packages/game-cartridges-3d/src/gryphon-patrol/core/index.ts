/** The Gryphon Patrol rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  SKY,
  enemiesFor,
  enemyAt,
  normWord,
  patrolOf,
  sentencesOf,
  wordPoolOf,
} from './content.js';
export {
  TUNING,
  createGryphonPatrol,
  rightEnemyOf,
  type PatrolSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
