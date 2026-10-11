/**
 * The shared answer audio driver (src/games/shared/answer-audio.ts): a listener that plays or
 * confirms from `onChange` (the gate games do) runs outside the controller's calls, and a completed
 * question plays no clip again.
 */
import { describe, expect, it } from 'vitest';
import type { APKDiagnosticInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { readToSelectAudioEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createAnswerAudioDriver } from '../../src/shared/answer-audio.js';
import { flush, testController } from './answer-audio-helpers.js';

describe('answer audio driver', () => {
  it('gives one attempt when a listener plays and confirms the held choice (as at a gate)', async () => {
    const controller = testController(3);
    const diagnostics: APKDiagnosticInput[] = [];
    const driver = createAnswerAudioDriver(controller, (d) => diagnostics.push(d));
    driver.question(1, [0, 1]);
    let held = false;
    let confirmed = 0;
    // The gate games' tryGate: play the held choice, or confirm it once heard.
    const atGate = (): void => {
      if (!held || driver.look(1) === 'playing') return;
      const action = driver.touch(1);
      if (action.kind === 'confirm') {
        held = false;
        confirmed += 1;
      }
    };
    const stop = driver.onChange(atGate);
    held = true;
    atGate();
    for (let i = 0; i < 4; i++) await flush();
    stop();
    const evidence = readToSelectAudioEvidenceSchema.parse(controller.getEvidence());
    expect(evidence.questions).toEqual([
      {
        questionPosition: 1,
        promptItemPosition: 1,
        selectionAttempts: [{ attemptIndex: 0, clipItemPosition: 1, playbackResult: 'completed', submitted: true, completedQuestion: true }],
      },
    ]);
    expect(confirmed).toBe(1);
    expect(diagnostics).toEqual([]);
  });

  it('calls the listener at once, then once for a burst of changes, and never after removal', async () => {
    const controller = testController(2);
    const driver = createAnswerAudioDriver(controller, () => undefined);
    let calls = 0;
    const stop = driver.onChange(() => (calls += 1));
    expect(calls).toBe(1);
    driver.question(0, [0, 1]);
    driver.question(0, [0, 1]);
    expect(calls).toBe(1);
    await flush();
    expect(calls).toBe(2);
    stop();
    driver.question(1, [0, 1]);
    await flush();
    expect(calls).toBe(2);
  });

  it('plays no clip of a completed question', async () => {
    const controller = testController(2);
    const diagnostics: APKDiagnosticInput[] = [];
    const driver = createAnswerAudioDriver(controller, (d) => diagnostics.push(d));
    driver.question(0, [0, 1]);
    expect(driver.touch(0)).toEqual({ kind: 'play' });
    await flush();
    expect(driver.touch(0)).toEqual({ kind: 'confirm', correct: true });
    expect(driver.listen(1)).toEqual({ kind: 'busy' });
    expect(driver.touch(0)).toEqual({ kind: 'busy' });
    await flush();
    expect(diagnostics).toEqual([]);
  });
});
