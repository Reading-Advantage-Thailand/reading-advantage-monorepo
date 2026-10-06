/** The Dragon Flight 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  wordsOf,
  flightWordsOf,
  decoysFor,
  gatesFor,
  isVocabularyInput,
  type DragonFlightInput,
  type WordSource,
} from './content.js';
export {
  TUNING,
  createDragonFlight,
  gateCountFor,
  correctGateOf,
  type DragonFlightOptions,
  type DragonFlightSimulation,
} from './sim.js';
export {
  DRAGON_FLIGHT_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  scoreOf,
  resultsOf,
  type EvidenceStory,
} from './evidence.js';
