/** The Shadow Gate Dungeon rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  ROOM_WORDS,
  bareWord,
  distractorsOf,
  isSentenceInput,
  roomSentencesOf,
  sentencesOf,
  shiftOf,
  wordKey,
  type DelveSentence,
  type ShadowGateInput,
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
  type ShadowGateOptions,
  type ShadowGateSimulation,
} from './sim.js';
export {
  SHADOW_GATE_GAME_ID,
  SCORE,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
