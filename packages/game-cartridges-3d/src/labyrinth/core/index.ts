/** The Labyrinth of the Goblin King rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  SENTENCE_WORDS,
  orbWordsOf,
  sentencesOf,
  shiftOf,
  shiftSentencesOf,
} from './content.js';
export {
  MAZES,
  MAZE_COLS,
  MAZE_ROWS,
  canMove,
  cellIndex,
  cellsOf,
  distancesFrom,
  exitsOf,
  inBounds,
  isCrossing,
  loopsOf,
  manhattan,
  mazeById,
  neighborOf,
  oppositeOf,
  parseMaze,
  positionOf,
  sameCell,
  wallEdgesOf,
  wallsAt,
} from './mazes.js';
export {
  TUNING,
  createLabyrinth,
  goblinCountFor,
  goblinSpeedFor,
  isLastSentence,
  rightOrbOf,
  type LabyrinthSimulation,
} from './sim.js';
export {
  COINS,
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
