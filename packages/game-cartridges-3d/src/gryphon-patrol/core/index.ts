/** The Gryphon Patrol rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  SENTENCE_WORDS,
  SKY,
  enemiesFor,
  enemyAt,
  isSentenceInput,
  normWord,
  patrolOf,
  patrolSentencesOf,
  sentencesOf,
  wordPoolOf,
  type PatrolInput,
  type SourceSentence,
} from './content.js';
export {
  TUNING,
  createGryphonPatrol,
  enemyCountFor,
  rightEnemyOf,
  type PatrolOptions,
  type PatrolSimulation,
} from './sim.js';
export {
  GRYPHON_PATROL_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
