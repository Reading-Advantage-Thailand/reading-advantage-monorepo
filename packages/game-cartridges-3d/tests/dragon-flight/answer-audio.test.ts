/**
 * Dragon Flight in answer audio (Read to Select Audio, F2): every item is one round with two gates,
 * `choose` only steers to a gate, the dragon waits at it, `commit` resolves it, and a full run
 * through the shared driver gives evidence whose counts equal the results.
 */
import { describe, expect, it } from 'vitest';
import {
  getReadToSelectAudioCompletionCounts,
  readToSelectAudioEvidenceSchema,
  type VocabularyInput,
} from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  TUNING,
  correctGateOf,
  createDragonFlight,
  resultsOf,
  type DragonFlightSimulation,
} from '../../src/dragon-flight/core/index.js';
import { createAnswerAudioDriver } from '../../src/shared/answer-audio.js';
import { APK_INPUT_ID } from '../../src/shared/challenge.js';
import { flush, testController } from '../shared/answer-audio-helpers.js';
import { ofType, runUntil, untilRound } from './helpers.js';

/** 12 items: more than the 10 words of a reading flight. */
const ITEMS: VocabularyInput = [
  { term: 'river', translation: 'แม่น้ำ' },
  { term: 'forest', translation: 'ป่า' },
  { term: 'bridge', translation: 'สะพาน' },
  { term: 'lantern', translation: 'ตะเกียง' },
  { term: 'brave', translation: 'กล้าหาญ' },
  { term: 'castle', translation: 'ปราสาท' },
  { term: 'dragon', translation: 'มังกร' },
  { term: 'shield', translation: 'โล่' },
  { term: 'potion', translation: 'ยา' },
  { term: 'tower', translation: 'หอคอย' },
  { term: 'garden', translation: 'สวน' },
  { term: 'moon', translation: 'ดวงจันทร์' },
];

const create = (seed = 5, input: VocabularyInput = ITEMS): DragonFlightSimulation =>
  createDragonFlight(input, { seed, helper: false, answerAudio: true });

/** Ticks until the dragon waits at the gates. */
const untilWaiting = (sim: DragonFlightSimulation) => runUntil(sim, () => sim.state.waiting).events;

describe('Dragon Flight answer audio rules', () => {
  it('makes every item one round with two gates, in a seeded order', () => {
    const sim = create();
    untilRound(sim);
    expect(sim.state.answerAudio).toBe(true);
    expect(sim.state.gates).toBe(TUNING.gatesAudio);
    expect(sim.state.words).toHaveLength(ITEMS.length);
    expect(sim.state.words.map((w) => w.position).sort((a, b) => a - b)).toEqual(ITEMS.map((_, i) => i));
    const round = sim.state.round!;
    expect(round.options).toHaveLength(2);
    expect(round.translation).toBe(ITEMS[round.position]!.translation);
    expect(round.options[correctGateOf(sim.state)!]!.position).toBe(round.position);
    expect(create(6).state.words.map((w) => w.id)).not.toEqual(sim.state.words.map((w) => w.id));
  });

  it('steers on choose, waits at the held gate, and resolves it only on commit', () => {
    const sim = create();
    untilRound(sim);
    const round = sim.state.round!;
    const right = correctGateOf(sim.state)!;
    expect(sim.dispatch({ type: 'choose', gate: 1 - right })).toEqual([{ type: 'gateHeld', roundId: round.id, gate: 1 - right }]);
    // The student changes course before the gates.
    expect(sim.dispatch({ type: 'choose', gate: right })).toEqual([{ type: 'gateHeld', roundId: round.id, gate: right }]);
    expect(sim.dispatch({ type: 'commit' })).toEqual([]);
    const events = untilWaiting(sim);
    expect(ofType(events, 'gateReached')).toEqual([{ type: 'gateReached', roundId: round.id, gate: right }]);
    expect(ofType(events, 'waiting')).toHaveLength(0);
    expect(round.chosen).toBeNull();
    const resolved = sim.dispatch({ type: 'commit' });
    expect(resolved.map((e) => e.type)).toEqual(['gateChosen', 'flockGrew']);
    expect(round.chosen).toBe(right);
    expect(sim.dispatch({ type: 'commit' })).toEqual([]);
  });

  it('reaches the gate at once when the student chooses while the dragon waits', () => {
    const sim = create();
    untilRound(sim);
    const events = untilWaiting(sim);
    expect(ofType(events, 'waiting')).toHaveLength(1);
    const round = sim.state.round!;
    expect(sim.dispatch({ type: 'choose', gate: 0 })).toEqual([
      { type: 'gateHeld', roundId: round.id, gate: 0 },
      { type: 'gateReached', roundId: round.id, gate: 0 },
    ]);
  });

  it('brings a missed word back once, as in reading', () => {
    const sim = create();
    untilRound(sim);
    sim.dispatch({ type: 'choose', gate: 1 - correctGateOf(sim.state)! });
    untilWaiting(sim);
    expect(ofType(sim.dispatch({ type: 'commit' }), 'wordReturns')).toHaveLength(1);
    expect(sim.state.total).toBe(ITEMS.length + 1);
  });
});

describe('Dragon Flight answer audio run', () => {
  it('gives evidence with one question per item whose counts equal the results', async () => {
    const controller = testController(ITEMS.length);
    const driver = createAnswerAudioDriver(controller, () => undefined);
    const sim = create();
    for (let guard = 0; sim.state.phase === 'flying' && guard < 100; guard++) {
      untilRound(sim);
      if (sim.state.phase !== 'flying') break;
      const round = sim.state.round!;
      driver.question(round.position, round.options.map((o) => o.position));
      const wrong = (sim.state.roundIndex === 1 || sim.state.roundIndex === 4) && sim.state.words.find((w) => w.id === round.itemId)!.attempts === 0;
      const gate = wrong ? 1 - correctGateOf(sim.state)! : correctGateOf(sim.state)!;
      sim.dispatch({ type: 'choose', gate });
      untilWaiting(sim);
      const clip = round.options[gate]!.position;
      expect(driver.touch(clip)).toEqual({ kind: 'play' });
      await flush();
      expect(driver.touch(clip)).toEqual({ kind: 'confirm', correct: !wrong });
      sim.dispatch({ type: 'commit' });
    }
    runUntil(sim, () => sim.state.phase === 'complete', 60_000);
    expect(sim.state.phase).toBe('complete');
    const { results } = resultsOf(sim.state, { id: APK_INPUT_ID, level: 'A1' }, 5, 60_000);
    const evidence = readToSelectAudioEvidenceSchema.parse(controller.getEvidence());
    expect(evidence.questions).toHaveLength(ITEMS.length);
    expect(results).toMatchObject({ correctAnswers: ITEMS.length, totalAttempts: ITEMS.length + 2 });
    expect(getReadToSelectAudioCompletionCounts(evidence)).toEqual({
      correctAnswers: results.correctAnswers,
      totalAttempts: results.totalAttempts,
    });
  });
});
