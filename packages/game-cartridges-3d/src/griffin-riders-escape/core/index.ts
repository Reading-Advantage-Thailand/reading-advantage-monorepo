/** The Griffin Riders Escape rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  LANES,
  laneX,
  nearestLane,
  normWord,
} from './content.js';
export {
  TUNING,
  createGriffinRidersEscape,
  rightLaneOf,
  type EscapeSimulation,
} from './sim.js';
export {
  evidenceOf,
  scoreOf,
} from './evidence.js';
