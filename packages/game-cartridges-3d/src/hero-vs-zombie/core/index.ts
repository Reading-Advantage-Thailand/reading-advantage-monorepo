/** The Hero vs. Zombie 3D rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export {
  decoysFor,
  nightWordsOf,
  orbsFor,
  wordsOf,
  type HeroVsZombieInput,
} from './content.js';
export {
  GRAVES,
  TUNING,
  YARD,
  correctOrbOf,
  createHeroVsZombie,
  isWalking,
  zombieCountFor,
  zombieSpeedFor,
  type HeroVsZombieSimulation,
} from './sim.js';
export {
  evidenceOf,
  resultsOf,
  scoreOf,
} from './evidence.js';
