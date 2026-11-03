/** The Dragon Flight 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  wordsOf,
  flightWordsOf,
  decoysFor,
  gatesFor,
  type DragonFlightInput,
} from './content.js';
export {
  TUNING,
  createDragonFlight,
  correctGateOf,
  type DragonFlightSimulation,
} from './sim.js';
export {
  evidenceOf,
  scoreOf,
  resultsOf,
} from './evidence.js';
