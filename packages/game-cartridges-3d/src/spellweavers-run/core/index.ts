/** The Spellweaver's Run rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  SENTENCE_WORDS,
  isSentenceInput,
  normWord,
  orbsFor,
  runOf,
  runSentencesOf,
  sentencesOf,
  wordPoolOf,
  type SourceSentence,
  type SpellweaversInput,
} from './content.js';
export {
  TUNING,
  correctLaneOf,
  createSpellweaversRun,
  laneCountFor,
  type SpellweaversOptions,
  type SpellweaversSimulation,
} from './sim.js';
export {
  SPELLWEAVERS_RUN_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
