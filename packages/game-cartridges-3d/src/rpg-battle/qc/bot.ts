/**
 * A bot that plays RPG Battle from the state alone (the QC driver and the tests use it): it plays
 * the first card of the hand, then answers with the word of the card (the option id is the word
 * id). It returns null only when the run is over.
 */
import type { RpgBattleCommand, RpgBattleState } from '../core/index.js';

export function nextCommand(state: RpgBattleState): RpgBattleCommand | null {
  if (state.phase !== 'playing') return null;
  if (state.question) return { type: 'answer', optionId: state.question.cardId };
  const card = state.hand[0];
  return card ? { type: 'play', cardId: card.id } : null;
}
