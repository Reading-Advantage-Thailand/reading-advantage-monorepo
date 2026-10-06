/** The Haunted Library 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { ROOM_WORDS, isSentenceInput, roomSentencesOf, sentencesOf, visitOf, type LibraryInput, type LibrarySentence } from './content.js';
export {
  FLOOR_HEIGHT,
  HALF_WIDTH,
  TUNING,
  createHauntedLibrary,
  ghostCountFor,
  nextDoorOf,
  type HauntedLibraryOptions,
  type HauntedLibrarySimulation,
} from './sim.js';
export { HAUNTED_LIBRARY_GAME_ID, SCORE, evidenceItemsOf, evidenceOf, resultsOf, scoreOf, type EvidenceStory } from './evidence.js';
