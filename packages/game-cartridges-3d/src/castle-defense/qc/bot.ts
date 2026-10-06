/**
 * A bot that plays Castle Defense from the state alone (the QC driver and the tests use it): it
 * chooses the next word of the sentence, then places the tower on the first post that is not
 * built (the post with the lowest level when all are built). It returns null only when the run is over.
 */
import type { CastleDefenseCommand, CastleDefenseState } from '../core/index.js';

export function nextCommand(state: CastleDefenseState): CastleDefenseCommand | null {
  if (state.phase !== 'playing') return null;
  if (!state.started) return { type: 'start' };
  if (state.stage === 'place') {
    const post = [...state.posts].sort((a, b) => a.level - b.level || a.post - b.post)[0];
    return post ? { type: 'build', post: post.post } : null;
  }
  const choice = state.step?.choices.find((c) => c.right && !c.blocked);
  return choice ? { type: 'pick', choice: choice.index } : null;
}
