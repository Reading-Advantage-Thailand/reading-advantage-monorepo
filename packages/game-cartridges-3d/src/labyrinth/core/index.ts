/** The Labyrinth of the Goblin King rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  SENTENCE_WORDS,
  isSentenceInput,
  orbWordsOf,
  sentencesOf,
  shiftOf,
  shiftSentencesOf,
  type LabyrinthInput,
  type StorySentence,
} from './content.js';
export {
  MAZES,
  MAZE_COLS,
  MAZE_ROWS,
  canMove,
  cellIndex,
  cellsOf,
  cloneMaze,
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
  type LabyrinthOptions,
  type LabyrinthSimulation,
} from './sim.js';
export {
  COINS,
  LABYRINTH_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
