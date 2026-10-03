/** The Griffin Sky-Joust rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  SENTENCE_WORDS,
  isSentenceInput,
  joustOf,
  joustSentencesOf,
  normWord,
  sentencesOf,
  type JoustInput,
  type SourceSentence,
} from './content.js';
export {
  ARENA,
  TUNING,
  createGriffinSkyJoust,
  resumeGriffinSkyJoust,
  isTarget,
  riderSpeedFor,
  targetWordOf,
  type JoustOptions,
  type JoustSimulation,
} from './sim.js';
export {
  GRIFFIN_SKY_JOUST_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
