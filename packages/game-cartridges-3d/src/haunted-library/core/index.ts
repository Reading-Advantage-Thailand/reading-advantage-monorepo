/** The Haunted Library 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { sentencesOf } from './content.js';
export {
  FLOOR_HEIGHT,
  HALF_WIDTH,
  TUNING,
  createHauntedLibrary,
  ghostCountFor,
  nextDoorOf,
  type HauntedLibrarySimulation,
} from './sim.js';
export { evidenceOf, resultsOf, scoreOf } from './evidence.js';
