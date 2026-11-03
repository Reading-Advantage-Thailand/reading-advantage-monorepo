/** The Devourer Slime 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  ROUND_WORDS,
  roundSentencesOf,
  sentencesOf,
  shiftOf,
} from './content.js';
export {
  CLEARING,
  SLIME_START,
  SPAWN_POINTS,
  TUNING,
  createDevourerSlime,
  guardCountFor,
  nextBubbleOf,
  radiusOf,
  type DevourerSlimeSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
