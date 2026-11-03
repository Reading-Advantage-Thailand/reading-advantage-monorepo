/** The RPG Battle rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { wordsOf, targetsOf, monstersOf, optionsOf, damageOf, type RpgBattleInput } from './content.js';
export { TUNING, createRpgBattle, type RpgBattleSimulation } from './sim.js';
export { evidenceOf, resultsOf } from './evidence.js';
