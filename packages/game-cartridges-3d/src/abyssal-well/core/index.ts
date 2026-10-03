/** The Abyssal Well rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  DESCENT_WORDS,
  descentSentencesOf,
  descentsOf,
  echoWordOf,
  isSentenceInput,
  normalWord,
  sentencesOf,
  type AbyssalWellInput,
  type WellSentence,
} from './content.js';
export { TUNING, createAbyssalWell, enemyInLane, nextEnemyOf, type AbyssalWellOptions, type AbyssalWellSimulation } from './sim.js';
export { ABYSSAL_WELL_GAME_ID, evidenceItemsOf, evidenceOf, resultsOf, scoreOf, type EvidenceStory } from './evidence.js';
export { ARCHER_RADIUS, BOTTOM_RADIUS, RIM_RADIUS, angleDelta, archerPoint, headingOfDirection, laneAngle, lanePoint } from './geometry.js';
