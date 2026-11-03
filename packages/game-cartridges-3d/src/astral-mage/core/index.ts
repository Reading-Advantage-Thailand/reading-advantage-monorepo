/** The Astral Mage 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  RITUAL_WORDS,
  castingOf,
  echoWordOf,
  normalWord,
  ritualSentencesOf,
  sentencesOf,
} from './content.js';
export {
  FLOOR,
  MAGE_START,
  TUNING,
  createAstralMage,
  liveCrystalsOf,
  nextCrystalOf,
  type AstralMageSimulation,
} from './sim.js';
export {
  SCORE,
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
