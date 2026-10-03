/** The Hero vs. Zombie 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  decoysFor,
  isVocabularyInput,
  nightWordsOf,
  orbsFor,
  wordsOf,
  type HeroVsZombieInput,
  type OrbOption,
  type WordSource,
} from './content.js';
export {
  GRAVES,
  HERO_START,
  TUNING,
  YARD,
  correctOrbOf,
  createHeroVsZombie,
  isWalking,
  orbCountFor,
  zombieCountFor,
  zombieSpeedFor,
  type Grave,
  type HeroVsZombieOptions,
  type HeroVsZombieSimulation,
} from './sim.js';
export {
  HERO_VS_ZOMBIE_GAME_ID,
  evidenceItemsOf,
  evidenceOf,
  resultsOf,
  scoreOf,
  type EvidenceStory,
} from './evidence.js';
