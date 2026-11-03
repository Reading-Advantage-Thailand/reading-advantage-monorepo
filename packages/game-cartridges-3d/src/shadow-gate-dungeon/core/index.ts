/** The Shadow Gate Dungeon rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  ROOM_WORDS,
  bareWord,
  distractorsOf,
  roomSentencesOf,
  sentencesOf,
  shiftOf,
  wordKey,
} from './content.js';
export {
  GATE,
  HERO_START,
  ROOM,
  TUNING,
  createShadowGate,
  rightCrystalsOf,
  shadowCountFor,
  shadowSpeedFor,
  type ShadowGateSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
