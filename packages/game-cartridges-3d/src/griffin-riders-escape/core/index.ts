/** The Griffin Riders Escape rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  LANES,
  SENTENCE_WORDS,
  escapeOf,
  escapeSentencesOf,
  gatesFor,
  isSentenceInput,
  laneX,
  nearestLane,
  normWord,
  sentencesOf,
  stormLanesFor,
  wordPoolOf,
  type EscapeInput,
  type SourceSentence,
} from './content.js';
export {
  TUNING,
  createGriffinRidersEscape,
  nextWaveOf,
  rightLaneOf,
  type EscapeOptions,
  type EscapeSimulation,
} from './sim.js';
export {
  GRIFFIN_RIDERS_ESCAPE_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
