/** The Alchemist's Synthesis 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  decoysFor,
  formulasOf,
  jarsFor,
  wordsOf,
} from './content.js';
export {
  TUNING,
  correctJarOf,
  createAlchemistsSynthesis,
  type AlchemistsSynthesisSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
