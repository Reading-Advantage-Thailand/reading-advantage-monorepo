/** The Astral Mage 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  RITUAL_WORDS,
  castingOf,
  echoWordOf,
  isSentenceInput,
  normalWord,
  ritualSentencesOf,
  sentencesOf,
  type AstralMageInput,
  type CastingSentence,
} from './content.js';
export {
  FLOOR,
  MAGE_START,
  TUNING,
  castable,
  createAstralMage,
  driftOf,
  liveCrystalsOf,
  nextCrystalOf,
  type AstralMageOptions,
  type AstralMageSimulation,
} from './sim.js';
export {
  ASTRAL_MAGE_GAME_ID,
  SCORE,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
