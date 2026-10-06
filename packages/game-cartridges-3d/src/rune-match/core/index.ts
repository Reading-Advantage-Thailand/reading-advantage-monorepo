/** The Rune Match rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  isVocabularyInput,
  wordsOf,
  targetsOf,
  monstersOf,
  paletteOf,
  type RuneMatchInput,
} from './content.js';
export {
  TUNING,
  createRuneMatch,
  keyOf,
  isNeighbor,
  findLines,
  findTargetMove,
  type Line,
  type RuneMatchOptions,
  type RuneMatchSimulation,
} from './sim.js';
export {
  RUNE_MATCH_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  scoreOf,
  resultsOf,
  type EvidenceStory,
} from './evidence.js';
