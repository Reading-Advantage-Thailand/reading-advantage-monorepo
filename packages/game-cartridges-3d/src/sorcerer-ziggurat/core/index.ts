/** The Sorcerer's Ziggurat 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  DECOYS,
  RITUAL_WORDS,
  climbOf,
  cubeWord,
  cubesOf,
  isSentenceInput,
  normalWord,
  ritualSentencesOf,
  sentencesOf,
  type ClimbSentence,
  type ZigguratInput,
} from './content.js';
export { TUNING, correctCubeOf, createSorcererZiggurat, openingEvents, type ZigguratOptions, type ZigguratSimulation } from './sim.js';
export { SCORE, SORCERER_ZIGGURAT_GAME_ID, evidenceItemsOf, evidenceOf, resultsOf, scoreOf, type EvidenceStory } from './evidence.js';
