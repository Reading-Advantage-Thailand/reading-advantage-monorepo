import type { SrsCardState } from './contract.js';

/**
 * Pick of SrsCardState fields relevant for transition validation.
 */
type SrsStatePick = Pick<
  SrsCardState,
  'stability' | 'difficulty' | 'state' | 'reps' | 'lapses'
>;

/**
 * Valid state transitions produced by the ts-fsrs scheduler.
 *
 * With enableShortTermPreview=false (the default), new cards transition
 * directly to review. With enableShortTermPreview=true, new cards go to
 * learning first. The scheduler never produces relearning in practice,
 * but we keep it in the type for completeness.
 */
const VALID_STATE_TRANSITIONS: Record<
  SrsCardState['state'],
  SrsCardState['state'][]
> = {
  new: ['learning', 'review'],
  learning: ['learning', 'review'],
  review: ['learning', 'review', 'relearning'],
  relearning: ['learning', 'review', 'relearning'],
};

/**
 * Validate that an SRS card state transition is mathematically sound.
 *
 * Rules enforced (invariant properties of the FSRS scheduler):
 * - reps must increase by exactly 1 on every transition
 * - lapses cannot decrease
 * - state transitions must follow the FSRS state machine
 *
 * We intentionally do NOT validate stability decreases, because ts-fsrs
 * legitimately decreases stability on Again ratings (including when a
 * learning card receives Again and stays in learning state).
 *
 * @throws Error if the transition violates any rule.
 */
export function validateSrsTransition(
  stateBefore: SrsStatePick,
  stateAfter: SrsStatePick,
): void {
  // Rule 1: reps must increase by exactly 1
  if (stateAfter.reps !== stateBefore.reps + 1) {
    throw new Error(
      `reps must increase by exactly 1 (before: ${stateBefore.reps}, after: ${stateAfter.reps})`
    );
  }

  // Rule 2: lapses cannot decrease
  if (stateAfter.lapses < stateBefore.lapses) {
    throw new Error(
      `lapses cannot decrease (before: ${stateBefore.lapses}, after: ${stateAfter.lapses})`
    );
  }

  // Rule 3: state transition must be valid
  const allowedNextStates = VALID_STATE_TRANSITIONS[stateBefore.state];
  if (!allowedNextStates.includes(stateAfter.state)) {
    throw new Error(
      `invalid state transition: ${stateBefore.state} → ${stateAfter.state}`
    );
  }
}
