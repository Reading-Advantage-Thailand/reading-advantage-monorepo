/** The Devourer Slime 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  ROUND_WORDS,
  guardKindsOf,
  isSentenceInput,
  roundSentencesOf,
  sentencesOf,
  shiftOf,
  type DevourerSlimeInput,
  type SentenceSource,
} from './content.js';
export {
  CLEARING,
  SLIME_START,
  SPAWN_POINTS,
  TUNING,
  bubbleSpacingFor,
  createDevourerSlime,
  guardCountFor,
  nextBubbleOf,
  radiusOf,
  type DevourerSlimeOptions,
  type DevourerSlimeSimulation,
} from './sim.js';
export {
  DEVOURER_SLIME_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
