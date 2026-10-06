/**
 * Read to Select Audio in a game view (F2, measure/tracks/legacy_games_removal_20261006/
 * f2-answer-audio.md). The banner shows the Thai meaning and each choice plays an English word. One
 * clip plays at a time: a touch on a choice plays its clip, and a touch after the clip played to the
 * end confirms the choice. The 🔊 control of a choice only plays it. The host owns the controller
 * (pause, mute, destroy, evidence), so a view calls only this driver.
 */
import type { AnswerChoiceAudioController } from '@reading-advantage/advantage-play-kit-3d/audio';
import type { APKDiagnosticInput } from '@reading-advantage/advantage-play-kit-3d/contracts';

/** How a choice looks: not heard, its clip plays, heard (a touch confirms it), failed, or confirmed wrong. */
export type ChoiceLook = 'idle' | 'playing' | 'heard' | 'failed' | 'used';

/** What a touch or a 🔊 press did. */
export type ChoiceAction =
  /** The choice is submitted; `correct` is true when it completes the question. */
  | { kind: 'confirm'; correct: boolean }
  /** Its clip started. */
  | { kind: 'play' }
  /** Another clip plays, or no question is open: nothing happened. */
  | { kind: 'busy' }
  /** The sound is off: the view asks the student to turn it on. */
  | { kind: 'muted' };

export interface AnswerAudioDriver {
  /** Opens a question: its input position and the clip positions of its choices. */
  question(position: number, choices: readonly number[]): void;
  /** The open question's input position (a view acts only on the round it shows). */
  position(): number | undefined;
  /** A touch on a choice: confirms it after its clip played to the end, or else plays it. */
  touch(choice: number): ChoiceAction;
  /** The 🔊 control of a choice: plays it, and never confirms it. */
  listen(choice: number): ChoiceAction;
  /** True while a clip loads or plays. */
  playing(): boolean;
  muted(): boolean;
  look(choice: number): ChoiceLook;
  /** Calls `listener` at once and on every controller change; returns the remover. */
  onChange(listener: () => void): () => void;
}

export function createAnswerAudioDriver(
  controller: AnswerChoiceAudioController,
  diagnostic: (event: APKDiagnosticInput) => void,
): AnswerAudioDriver {
  let current: number | undefined;

  const play = (choice: number): ChoiceAction => {
    if (current === undefined) return { kind: 'busy' };
    const snapshot = controller.getSnapshot();
    if (snapshot.muted) return { kind: 'muted' };
    if (snapshot.activeClipItemPosition !== undefined) return { kind: 'busy' };
    const question = current;
    controller.playChoice(question, choice).catch((error: unknown) => {
      diagnostic({
        level: 'warning',
        code: 'answer-audio/play-failed',
        message: 'An answer clip could not play.',
        details: { question, choice, cause: error instanceof Error ? error.message : String(error) },
      });
    });
    return { kind: 'play' };
  };

  return {
    question(position, choices) {
      current = position;
      controller.setQuestion(position, choices);
    },
    position: () => current,
    touch(choice) {
      if (current !== undefined && controller.canConfirmChoice(current, choice)) {
        return { kind: 'confirm', correct: controller.confirmChoice(current, choice).completedQuestion };
      }
      return play(choice);
    },
    listen: play,
    playing: () => controller.getSnapshot().activeClipItemPosition !== undefined,
    muted: () => controller.getSnapshot().muted,
    look(choice) {
      if (current === undefined) return 'idle';
      const pair = controller.getChoiceSnapshot(current, choice);
      if (pair.status === 'loading' || pair.status === 'ready' || pair.status === 'playing') return 'playing';
      if (pair.canConfirm) return 'heard';
      if (pair.status === 'failed') return 'failed';
      return pair.submitted ? 'used' : 'idle';
    },
    onChange(listener) {
      return controller.subscribe(() => listener());
    },
  };
}
