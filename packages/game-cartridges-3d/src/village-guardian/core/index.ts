/** The Village Guardian 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  VILLAGE_WORDS,
  villageSentencesOf,
  sentencesOf,
  watchOf,
} from './content.js';
export {
  BARN_DOOR,
  GREEN,
  GUARDIAN_START,
  TUNING,
  createVillageGuardian,
  goblinCountFor,
  nextVillagerOf,
  threatCountFor,
  threatSpeedFor,
  type VillageGuardianSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
