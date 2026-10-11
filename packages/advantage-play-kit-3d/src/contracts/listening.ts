/** The answer audio contracts live in game-contracts; the kit re-exports them for the games and the mount. */
export { MAX_ANSWER_AUDIO_EVIDENCE_PAIRS, MAX_LISTENING_SESSION_ITEMS, getReadToSelectAudioCompletionCounts, readToSelectAudioEvidenceSchema, readToSelectAudioSessionConfigSchema } from '@reading-advantage/game-contracts';
export type { ReadToSelectAudioCompletionCounts, ReadToSelectAudioEvidence, ReadToSelectAudioSessionConfig } from '@reading-advantage/game-contracts';
