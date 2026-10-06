/**
 * Hero vs. Zombie in answer audio (Read to Select Audio, F2): every item is one round, a touch only
 * reports the orb, `take` resolves it, the first clip of a round shields the hero, and a full run
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
  correctOrbOf,
  createHeroVsZombie,
  resultsOf,
  type HeroVsZombieSimulation,
} from '../../src/hero-vs-zombie/core/index.js';
import { createAnswerAudioDriver } from '../../src/shared/answer-audio.js';
import { APK_INPUT_ID } from '../../src/shared/challenge.js';
import { earnsEchoStaff, flush, testController } from '../shared/answer-audio-helpers.js';
import { ofType, parkZombies, stepsOf, tickN, touch } from './helpers.js';

/** 12 items: more than the 10 words of a reading night. */
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

const create = (seed = 5, input: VocabularyInput = ITEMS): HeroVsZombieSimulation =>
  createHeroVsZombie(input, { seed, helper: false, answerAudio: true });

describe('Hero vs. Zombie answer audio rules', () => {
  it('makes every item one round, in a seeded order, and never brings a word back', () => {
    const sim = create();
    expect(sim.state.answerAudio).toBe(true);
    expect(sim.state.words).toHaveLength(ITEMS.length);
    expect(sim.state.words.map((w) => w.position).sort((a, b) => a - b)).toEqual(ITEMS.map((_, i) => i));
    expect(create(5).state.words.map((w) => w.id)).toEqual(sim.state.words.map((w) => w.id));
    expect(create(6).state.words.map((w) => w.id)).not.toEqual(sim.state.words.map((w) => w.id));
    const round = sim.state.round!;
    expect(round.translation).toBe(ITEMS[round.position]!.translation);
    expect(sim.state.orbs.find((o) => o.correct)!.position).toBe(round.position);
    const wrong = sim.state.orbs.find((o) => !o.correct)!;
    expect(sim.dispatch({ type: 'take', orbId: wrong.id }).map((e) => e.type)).toEqual(['orbWrong', 'orbsMoved']);
    expect(sim.state.total).toBe(ITEMS.length);
    expect(sim.state.queue).not.toContain(round.itemId);
  });

  it('offers no two choices with the same English word', () => {
    const input: VocabularyInput = [
      { term: 'bat', translation: 'ค้างคาว' },
      { term: 'bat', translation: 'ไม้ตี' },
      { term: 'cat', translation: 'แมว' },
      { term: 'dog', translation: 'หมา' },
      { term: 'owl', translation: 'นกฮูก' },
    ];
    const sim = create(2, input);
    for (let i = 0; i < input.length && sim.state.round; i++) {
      const terms = sim.state.orbs.map((o) => input[o.position]!.term);
      expect(new Set(terms).size).toBe(terms.length);
      sim.dispatch({ type: 'take', orbId: correctOrbOf(sim.state)!.id });
    }
  });

  it('reports a touch as orbTouched and takes the orb only on take', () => {
    const sim = create();
    tickN(sim, 1);
    const right = correctOrbOf(sim.state)!;
    const events = touch(sim, right.id);
    expect(ofType(events, 'orbTouched')).toEqual([{ type: 'orbTouched', id: right.id, roundId: 'r1', itemId: right.wordId }]);
    expect(ofType(events, 'orbTaken')).toHaveLength(0);
    expect(sim.state.round!.id).toBe('r1');
    const taken = sim.dispatch({ type: 'take', orbId: right.id });
    expect(taken.map((e) => e.type)).toEqual(['orbTaken', 'roundStarted']);
    expect(sim.dispatch({ type: 'take', orbId: right.id })).toEqual([]);
  });

  it('shields the hero at the first clip of a round only', () => {
    const sim = create();
    tickN(sim, stepsOf(TUNING.riseMs) + 1);
    expect(sim.dispatch({ type: 'listen' })).toEqual([{ type: 'heroShielded', ms: TUNING.listenShieldMs }]);
    expect(sim.dispatch({ type: 'listen' })).toEqual([]);
    // A zombie on the hero does not bump while the shield lasts.
    parkZombies(sim);
    const zombie = sim.state.zombies[0]!;
    zombie.x = sim.state.hero.x;
    zombie.z = sim.state.hero.z;
    expect(ofType(sim.tick(), 'heroBumped')).toHaveLength(0);
    tickN(sim, stepsOf(TUNING.listenShieldMs));
    expect(sim.state.hero.shieldMs).toBe(0);
    // The zombies walked to the hero meanwhile: park them, then put one on the hero again.
    parkZombies(sim);
    sim.state.hero.bumpedMs = 0;
    zombie.x = sim.state.hero.x;
    zombie.z = sim.state.hero.z;
    expect(ofType(sim.tick(), 'heroBumped')).toHaveLength(1);
    // The next round shields again.
    sim.dispatch({ type: 'take', orbId: correctOrbOf(sim.state)!.id });
    expect(sim.dispatch({ type: 'listen' })).toHaveLength(1);
  });

  it('ignores take and listen outside answer audio', () => {
    const sim = createHeroVsZombie(ITEMS, { seed: 5, helper: false });
    expect(sim.dispatch({ type: 'take', orbId: correctOrbOf(sim.state)!.id })).toEqual([]);
    expect(sim.dispatch({ type: 'listen' })).toEqual([]);
  });
});

describe('Hero vs. Zombie answer audio run', () => {
  /** Plays every round through the driver: listen, then confirm; `wrongFirst` rounds take a wrong orb first. */
  async function playRun(wrongFirst: (roundIndex: number) => boolean) {
    const controller = testController(ITEMS.length);
    const driver = createAnswerAudioDriver(controller, () => undefined);
    const sim = create();
    for (let guard = 0; sim.state.phase === 'night' && guard < 100; guard++) {
      const round = sim.state.round!;
      driver.question(round.position, sim.state.orbs.map((o) => o.position));
      const words = sim.state.words.find((w) => w.id === round.itemId)!;
      const orb = wrongFirst(sim.state.roundIndex) && words.attempts === 0 ? sim.state.orbs.find((o) => !o.correct)! : correctOrbOf(sim.state)!;
      expect(driver.touch(orb.position)).toEqual({ kind: 'play' });
      expect(driver.touch(orb.position)).toEqual({ kind: 'busy' });
      await flush();
      expect(driver.look(orb.position)).toBe('heard');
      expect(driver.touch(orb.position)).toEqual({ kind: 'confirm', correct: orb.correct });
      sim.dispatch({ type: 'take', orbId: orb.id });
    }
    while (sim.state.phase !== 'complete') sim.tick();
    const { results } = resultsOf(sim.state, { id: APK_INPUT_ID, level: 'A1' }, 5, 60_000);
    return { evidence: readToSelectAudioEvidenceSchema.parse(controller.getEvidence()), results };
  }

  it('gives evidence with one question per item whose counts equal the results', async () => {
    const { evidence, results } = await playRun((i) => i === 2 || i === 7);
    expect(evidence.questions).toHaveLength(ITEMS.length);
    expect(getReadToSelectAudioCompletionCounts(evidence)).toEqual({
      correctAnswers: results.correctAnswers,
      totalAttempts: results.totalAttempts,
    });
    expect(results).toMatchObject({ correctAnswers: ITEMS.length, totalAttempts: ITEMS.length + 2 });
    expect(earnsEchoStaff(evidence, results)).toBe(false);
  });

  it('meets the Echo Staff rule on a run with no wrong choice', async () => {
    const { evidence, results } = await playRun(() => false);
    expect(results).toMatchObject({ correctAnswers: ITEMS.length, totalAttempts: ITEMS.length, accuracy: 1 });
    expect(earnsEchoStaff(evidence, results)).toBe(true);
  });

  it('asks for sound while the controller is muted', () => {
    const controller = testController(ITEMS.length);
    const driver = createAnswerAudioDriver(controller, () => undefined);
    const sim = create();
    driver.question(sim.state.round!.position, sim.state.orbs.map((o) => o.position));
    controller.setMuted(true);
    expect(driver.touch(sim.state.orbs[0]!.position)).toEqual({ kind: 'muted' });
    expect(driver.listen(sim.state.orbs[0]!.position)).toEqual({ kind: 'muted' });
  });
});
