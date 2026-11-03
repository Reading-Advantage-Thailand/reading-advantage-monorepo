/** The Realm Carver 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  REALM_WORDS,
  campaignOf,
  realmSentencesOf,
  sentencesOf,
} from './content.js';
export {
  START,
  TUNING,
  beaconOfNext,
  createRealmCarver,
  dirOfSteer,
  monsterCountFor,
  monsterIntervalFor,
  stepMonster,
  wildCount,
  type RealmCarverSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
