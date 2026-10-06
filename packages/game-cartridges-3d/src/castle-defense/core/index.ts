/** The Castle Defense rules core: pure rules on a seeded state (imports only contracts and sim). */
export * from './types.js';
export { isSentenceInput, sentencesOf, waveSentencesOf, shiftOf, bareWord, wordKey, attackersOf, distractorsOf, choicesOf, WAVE_CONFIGS, HITS, SENTENCE_WORDS, type CastleDefenseInput, type SourceSentence } from './content.js';
export { TUNING, createCastleDefense, type CastleDefenseOptions, type CastleDefenseSimulation } from './sim.js';
export { CASTLE_DEFENSE_GAME_ID, evidenceItemsOf, evidenceOf, scoreOf, resultsOf, type EvidenceStory } from './evidence.js';
