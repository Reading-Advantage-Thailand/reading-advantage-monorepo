/** The Spellweaver's Run rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  normWord,
  orbsFor,
  runOf,
  sentencesOf,
  wordPoolOf,
} from './content.js';
export {
  TUNING,
  correctLaneOf,
  createSpellweaversRun,
  type SpellweaversSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
