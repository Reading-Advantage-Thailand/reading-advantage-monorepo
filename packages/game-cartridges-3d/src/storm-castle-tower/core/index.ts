/** The Storm Castle Tower rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  TOWER_WORDS,
  bareWord,
  distractorsOf,
  sentencesOf,
  shiftOf,
  towerSentencesOf,
  wordKey,
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
  type StormCastleTowerSimulation,
} from './sim.js';
export { SCORE, evidenceOf, resultsOf, scoreOf } from './evidence.js';
