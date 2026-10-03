/** The RPG Battle rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { isVocabularyInput, wordsOf, targetsOf, monstersOf, optionsOf, damageOf, type RpgBattleInput } from './content.js';
export { TUNING, createRpgBattle, type RpgBattleOptions, type RpgBattleSimulation } from './sim.js';
export { RPG_BATTLE_GAME_ID, evidenceItemsOf, evidenceOf, scoreOf, resultsOf, type EvidenceStory } from './evidence.js';
