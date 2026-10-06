/**
 * Class challenges (the `challenge` field of a manifest). A challenge run gets the challenge content
 * as the APK `VocabularyInput` in place of the student's `PracticeInput`, so the evidence cannot take
 * its input id and level from the input.
 */
import type { CefrLevel } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** The input id in the evidence of a run on an APK input (a class challenge's content). */
export const APK_INPUT_ID = 'vocabulary';

/**
 * The input that the evidence names: a practice or story input names itself; an APK input (an
 * array, without an id or a level) gets `APK_INPUT_ID` and the game's first level.
 */
export function evidenceStoryOf(
  input: { readonly id: string; readonly level: CefrLevel } | readonly unknown[],
  levels: readonly CefrLevel[],
): { id: string; level: CefrLevel } {
  if (Array.isArray(input)) {
    const level = levels[0];
    if (!level) throw new Error('evidenceStoryOf: the game lists no level');
    return { id: APK_INPUT_ID, level };
  }
  const { id, level } = input as { readonly id: string; readonly level: CefrLevel };
  return { id, level };
}
