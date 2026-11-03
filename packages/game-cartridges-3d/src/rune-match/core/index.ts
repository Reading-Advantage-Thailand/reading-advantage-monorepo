/** The Rune Match rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
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
  type RuneMatchSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
} from './evidence.js';
