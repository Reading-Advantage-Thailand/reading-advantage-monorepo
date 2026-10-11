/**
 * Helpers of the answer audio (Read to Select Audio) game tests: a controller whose clips play at
 * once, a flush for its promises, and the Echo Staff rule of the monorepo.
 */
import { createAnswerChoiceAudioController, type AnswerChoiceAudioController } from '@reading-advantage/advantage-play-kit-3d/audio';
import { readToSelectAudioEvidenceSchema, type GameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';

export const ANSWER_AUDIO_SESSION = {
  modality: 'read-to-select-audio',
  promptLocale: 'th-TH',
  answerLocale: 'en-US',
  promptField: 'translation',
  answerField: 'term',
  scored: true,
} as const;

/** A controller for `itemCount` items whose clips play to the end at once. */
export function testController(itemCount: number): AnswerChoiceAudioController {
  return createAnswerChoiceAudioController({
    session: ANSWER_AUDIO_SESSION,
    clips: Array.from({ length: itemCount }, (_, itemPosition) => ({
      itemPosition,
      url: `speech:${itemPosition}`,
      mediaType: 'audio/speech' as const,
    })),
    preparationTimeoutMs: 1_000,
    preparation: { prepare: async (reference) => reference.itemPosition, release: () => undefined },
    playback: { play: async () => undefined },
    ducking: { duck: () => () => undefined },
  });
}

/** Lets the controller's clip promises settle. */
export const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/**
 * The Echo Staff rule (`getEligibleRpgRewards`, packages/domain/src/rpg/definitions.ts, lane-g
 * d6cca07f8) for a won run: every item is a question, the last attempt of each question completes
 * it, and the result counts equal the item count.
 */
export function earnsEchoStaff(evidence: unknown, result: Pick<GameResults, 'correctAnswers' | 'totalAttempts'>): boolean {
  const parsed = readToSelectAudioEvidenceSchema.safeParse(evidence);
  if (!parsed.success) return false;
  const completeQuestions = parsed.data.questions.every(
    ({ selectionAttempts }) => selectionAttempts.at(-1)?.completedQuestion === true,
  );
  return (
    parsed.data.questions.length === parsed.data.itemCount &&
    completeQuestions &&
    result.totalAttempts === parsed.data.itemCount &&
    result.correctAnswers === parsed.data.itemCount
  );
}
