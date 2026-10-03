/** The Storm Castle Tower rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  TOWER_WORDS,
  bareWord,
  distractorsOf,
  isSentenceInput,
  sentencesOf,
  shiftOf,
  towerSentencesOf,
  wordKey,
  type ClimbSentence,
  type StormCastleTowerInput,
} from './content.js';
export {
  COLUMNS,
  START,
  TUNING,
  createStormCastleTower,
  hazardsThreaten,
  rightWindowsOf,
  summitRowFor,
  windowRowFor,
  type StormCastleTowerOptions,
  type StormCastleTowerSimulation,
} from './sim.js';
export { STORM_CASTLE_TOWER_GAME_ID, SCORE, evidenceItemsOf, evidenceOf, resultsOf, scoreOf, type EvidenceStory } from './evidence.js';
