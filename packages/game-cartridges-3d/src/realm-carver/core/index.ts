/** The Realm Carver 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  REALM_WORDS,
  campaignOf,
  isSentenceInput,
  monsterKindsOf,
  realmSentencesOf,
  sentencesOf,
  type CampaignSentence,
  type RealmCarverInput,
} from './content.js';
export {
  START,
  TUNING,
  beaconOfNext,
  cellsOf,
  createRealmCarver,
  dirOfSteer,
  monsterCountFor,
  monsterIntervalFor,
  stepMonster,
  wildCount,
  type RealmCarverOptions,
  type RealmCarverSimulation,
} from './sim.js';
export {
  REALM_CARVER_GAME_ID,
  SCORE,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
