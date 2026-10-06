/** The Village Guardian 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  VILLAGE_WORDS,
  isSentenceInput,
  villageSentencesOf,
  sentencesOf,
  watchOf,
  villagerKindsOf,
  type VillageGuardianInput,
  type WatchSentence,
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
  type VillageGuardianOptions,
  type VillageGuardianSimulation,
} from './sim.js';
export {
  VILLAGE_GUARDIAN_GAME_ID,
  SCORE,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
