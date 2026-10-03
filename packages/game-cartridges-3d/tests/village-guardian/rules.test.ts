/** The Village Guardian rules of sections 2, 3, and 6 of docs/game-village-guardian-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { STEP_MS, createRng, distance } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  BARN_DOOR,
  GREEN,
  GUARDIAN_START,
  TUNING,
  VILLAGE_GUARDIAN_EVENT_TYPES,
  VILLAGER_KINDS,
  createVillageGuardian,
  evidenceOf,
  goblinCountFor,
  nextVillagerOf,
  resultsOf,
  scoreOf,
  sentencesOf,
  threatCountFor,
  threatSpeedFor,
  villageSentencesOf,
  watchOf,
  VILLAGE_WORDS,
} from '../../src/village-guardian/core/index.js';
import { manifest } from '../../src/village-guardian/manifest.js';
import { nextSteer } from '../../src/village-guardian/qc/bot.js';
import { LONG_STORY, STORY, callAll, create, ofType, parkThreats, stepsOf, tickN, touch, villagerAt } from './helpers.js';

/** Calls every village in turn and walks the guardian onto the open barn door. */
function saveVillage(sim: ReturnType<typeof create>) {
  callAll(sim);
  sim.state.guardian.x = BARN_DOOR.x;
  sim.state.guardian.z = BARN_DOOR.z + 0.5;
  return sim.tick();
}

describe('content', () => {
  it('builds a watch of up to 5 villages from sentences of 3 to 7 words, in a seeded order', () => {
    const watch = watchOf(STORY, createRng(3), TUNING.maxVillages);
    expect(watch).toHaveLength(5);
    expect(new Set(watch.map((v) => v.id)).size).toBe(5);
    watch.forEach((village, i) => {
      const sentence = STORY.sentences.find((s) => s.id === village.id)!;
      expect(village.words).toEqual(sentence.words);
      expect(village.text).toBe(sentence.text);
      expect(village.villageId).toBe(`village-${i + 1}`);
      expect(village.words.length).toBeGreaterThanOrEqual(VILLAGE_WORDS.min);
      expect(village.words.length).toBeLessThanOrEqual(VILLAGE_WORDS.max);
      expect(village).toMatchObject({ refusals: 0, started: false, cleared: false });
    });
    expect(watchOf(STORY, createRng(3), 5).map((v) => v.id)).toEqual(watch.map((v) => v.id));
    expect(watchOf(STORY, createRng(4), 5).map((v) => v.id)).not.toEqual(watch.map((v) => v.id));
  });

  it('leaves out long sentences and uses fewer villages when the story has fewer', () => {
    const fit = villageSentencesOf(LONG_STORY);
    expect(fit.length).toBeLessThan(LONG_STORY.sentences.length);
    expect(fit.every((s) => s.words.length <= 7)).toBe(true);
    expect(watchOf(LONG_STORY, createRng(1), TUNING.maxVillages)).toHaveLength(Math.min(5, fit.length));
  });

  it('accepts the APK SentenceInput', () => {
    const input = [
      { term: 'The cat sleeps.', translation: 'x' },
      { term: 'Hi', translation: '' },
      { term: 'The dog runs fast.', translation: '' },
    ];
    expect(sentencesOf(input).map((s) => s.id)).toEqual(['s-1', 's-3']);
    const sim = createVillageGuardian(input, { seed: 1, helper: false });
    expect(sim.state.villages).toBe(2);
    expect(createVillageGuardian([], { seed: 1, helper: false }).state.phase).toBe('complete');
  });

  it('the manifest is a story cartridge for A0 to A1 with the heroes, folk, and outdoor packs', () => {
    expect(manifest).toMatchObject({
      id: 'village-guardian',
      inputMode: 'story',
      simulation: 'realtime',
      levels: ['Pre-A1', 'A0', 'A0+', 'A1'],
      needs: { sentences: 3 },
      packs: ['heroes', 'folk', 'outdoor-props', 'flight-land'],
      briefingKey: 'villageGuardian.briefing',
    });
    expect(manifest.renderers).toEqual(['three', 'phaser']);
  });
});

describe('the village', () => {
  it('starts with the guardian at the start, a villager per word, and villageStarted on the first tick', () => {
    const sim = create(3);
    const village = sim.state.shift[0]!;
    expect(sim.state.guardian).toMatchObject({ x: GUARDIAN_START.x, z: GUARDIAN_START.z, bumpedMs: 0 });
    expect(sim.state.villagers.map((v) => v.word)).toEqual(village.words);
    for (const v of sim.state.villagers) {
      expect(VILLAGER_KINDS).toContain(v.kind);
      expect(v).toMatchObject({ following: false, refusedMs: 0, returning: false, homeX: v.x, homeZ: v.z });
      expect(v.x).toBeGreaterThanOrEqual(GREEN.minX);
      expect(v.x).toBeLessThanOrEqual(GREEN.maxX);
      expect(distance(v, GUARDIAN_START)).toBeGreaterThanOrEqual(TUNING.villagerKeepOutGuardian);
      for (const o of sim.state.villagers) if (o !== v) expect(distance(v, o)).toBeGreaterThanOrEqual(TUNING.villagerSpacing);
    }
    expect(sim.state).toMatchObject({ line: [], next: 0, barnOpen: false, village: 0, villages: 5, phase: 'playing' });
    const started = ofType(sim.tick(), 'villageStarted');
    expect(started).toHaveLength(1);
    expect(started[0]).toMatchObject({ villageId: 'village-1', sentenceId: village.id, words: village.words });
    expect(started[0]!.threats.map((t) => t.id)).toEqual(sim.state.threats.map((t) => t.id));
    expect(ofType(sim.tick(), 'villageStarted')).toHaveLength(0);
  });

  it('threats: one more per village, at most 3 (Helper mode fewer); one goblin from the third village; speed +10% per village', () => {
    expect([0, 1, 2, 3, 4].map((v) => threatCountFor(v, false))).toEqual([1, 2, 3, 3, 3]);
    expect([0, 1, 2, 3, 4].map((v) => threatCountFor(v, true))).toEqual([1, 1, 2, 2, 2]);
    expect([0, 1, 2, 3, 4].map((v) => goblinCountFor(v, false))).toEqual([0, 0, 1, 1, 1]);
    expect([0, 1, 2, 3, 4].map((v) => goblinCountFor(v, true))).toEqual([0, 0, 0, 1, 1]);
    expect(threatSpeedFor(0)).toBeCloseTo(1.3);
    expect(threatSpeedFor(1)).toBeCloseTo(1.43);
    expect(threatSpeedFor(4)).toBeCloseTo(1.69);
    const sim = create(1);
    expect(sim.state.threats).toHaveLength(1);
    expect(sim.state.threats[0]!.kind).toBe('bandit');
    for (const t of sim.state.threats) expect(distance(t, GUARDIAN_START)).toBeGreaterThanOrEqual(TUNING.threatKeepOutGuardian);
  });

  it('threats patrol and bounce off the fences, at a steady speed', { timeout: 60_000 }, () => {
    const sim = create(2);
    const speed = Math.hypot(sim.state.threats[0]!.vx, sim.state.threats[0]!.vz);
    let bounced = 0;
    let last = sim.state.threats.map((s) => [s.vx, s.vz]);
    for (let i = 0; i < stepsOf(60_000); i++) {
      sim.tick();
      sim.state.threats.forEach((s, j) => {
        expect(s.x).toBeGreaterThanOrEqual(GREEN.minX + TUNING.threatRadius - 1e-9);
        expect(s.x).toBeLessThanOrEqual(GREEN.maxX - TUNING.threatRadius + 1e-9);
        expect(s.z).toBeGreaterThanOrEqual(GREEN.minZ + TUNING.threatRadius - 1e-9);
        expect(s.z).toBeLessThanOrEqual(GREEN.maxZ - TUNING.threatRadius + 1e-9);
        expect(Math.hypot(s.vx, s.vz)).toBeCloseTo(speed);
        if (s.vx !== last[j]![0] || s.vz !== last[j]![1]) bounced += 1;
      });
      last = sim.state.threats.map((s) => [s.vx, s.vz]);
    }
    expect(bounced).toBeGreaterThan(3);
  });

  it('a goblin near the guardian turns toward it; a bandit does not; the speed stays', () => {
    const sim = create(3);
    parkThreats(sim);
    const g = sim.state.guardian;
    const [bandit] = sim.state.threats;
    bandit!.kind = 'goblin-warrior';
    bandit!.x = g.x + 2;
    bandit!.z = g.z;
    bandit!.vx = 0;
    bandit!.vz = -1.3; // moving across, not toward the guardian
    tickN(sim, 20);
    expect(bandit!.vx).toBeLessThan(0); // turned toward -x, where the guardian is
    expect(Math.hypot(bandit!.vx, bandit!.vz)).toBeCloseTo(1.3);
    bandit!.kind = 'bandit';
    bandit!.vx = 0;
    bandit!.vz = -1.3;
    tickN(sim, 10);
    expect(bandit!.vx).toBe(0);
  });
});

describe('walking', () => {
  it('a steer moves the guardian at 3.2 m/s, holds until the next steer, and is clamped to length 1 and the green', () => {
    const sim = create(1);
    parkThreats(sim);
    expect(sim.dispatch({ type: 'steer', x: 0, z: -1 })).toEqual([]);
    sim.tick();
    expect(sim.state.guardian.z).toBeCloseTo(GUARDIAN_START.z - (TUNING.guardianSpeed * STEP_MS) / 1000);
    expect(sim.state.guardian.facing).toBeCloseTo(180);
    sim.dispatch({ type: 'steer', x: 3, z: 4 });
    expect(Math.hypot(sim.state.steer.x, sim.state.steer.z)).toBeCloseTo(1);
    sim.dispatch({ type: 'steer', x: 1, z: 0 });
    tickN(sim, stepsOf(10_000));
    expect(sim.state.guardian.x).toBeCloseTo(GREEN.maxX - TUNING.guardianRadius);
    sim.dispatch({ type: 'steer', x: Number.NaN, z: 0 });
    expect(sim.state.steer).toEqual({ x: 0, z: 0 });
  });
});

describe('calling villagers', () => {
  it('the villager of the next word joins the line and follows at line spacing', () => {
    const sim = create(3);
    parkThreats(sim);
    const first = villagerAt(sim, 0);
    const events = touch(sim, first.id);
    expect(ofType(events, 'villagerJoined')).toEqual([{ type: 'villagerJoined', id: first.id, index: 0 }]);
    expect(sim.state.line).toEqual([first.id]);
    expect(sim.state.next).toBe(1);
    expect(sim.state.rescued).toBe(1);
    expect(sim.state.shift[0]!.started).toBe(true);
    expect(nextVillagerOf(sim.state)).toBe(villagerAt(sim, 1));
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, stepsOf(2000));
    expect(distance(first, sim.state.guardian)).toBeCloseTo(TUNING.lineSpacing, 1);
  });

  it('a villager out of order hides: counts an attempt, steps back for 1.5 s, then returns to its spot', () => {
    const sim = create(3);
    parkThreats(sim);
    const wrong = villagerAt(sim, 2);
    const home = { x: wrong.homeX, z: wrong.homeZ };
    const events = touch(sim, wrong.id);
    expect(ofType(events, 'villagerRefused')).toEqual([{ type: 'villagerRefused', id: wrong.id }]);
    expect(sim.state.shift[0]!.refusals).toBe(1);
    expect(sim.state.line).toEqual([]);
    expect(wrong.refusedMs).toBe(TUNING.refusedMs);
    expect(ofType(tickN(sim, stepsOf(TUNING.refusedMs) - 1), 'villagerRefused')).toHaveLength(0);
    sim.tick();
    expect(wrong.returning).toBe(true);
    tickN(sim, stepsOf(1000));
    expect(wrong.x).toBeCloseTo(home.x);
    expect(wrong.z).toBeCloseTo(home.z);
    sim.state.guardian.x = GUARDIAN_START.x;
    sim.state.guardian.z = GUARDIAN_START.z;
    sim.tick();
    touch(sim, wrong.id);
    expect(sim.state.shift[0]!.refusals).toBe(2);
  });

  it('the whole sentence opens the barn; the guardian at the door saves the village and the next one starts', () => {
    const sim = create(3);
    const village = sim.state.shift[0]!;
    const events = callAll(sim);
    expect(ofType(events, 'villagerJoined').map((e) => e.index)).toEqual(village.words.map((_, i) => i));
    expect(ofType(events, 'barnOpened')).toEqual([{ type: 'barnOpened', villageId: 'village-1' }]);
    expect(sim.state.barnOpen).toBe(true);
    expect(nextVillagerOf(sim.state)).toBeNull();
    expect(ofType(sim.tick(), 'villageSaved')).toHaveLength(0);
    sim.state.guardian.x = BARN_DOOR.x;
    sim.state.guardian.z = BARN_DOOR.z + 0.5;
    const saved = sim.tick();
    expect(ofType(saved, 'villageSaved')).toEqual([{ type: 'villageSaved', villageId: 'village-1', sentenceId: village.id }]);
    expect(village.cleared).toBe(true);
    expect(sim.state).toMatchObject({ village: 1, line: [], next: 0, barnOpen: false, villagesCleared: 1 });
    expect(ofType(saved, 'villageStarted')[0]).toMatchObject({ villageId: 'village-2' });
    expect(sim.state.guardian).toMatchObject({ x: GUARDIAN_START.x, z: GUARDIAN_START.z });
    expect(sim.state.threats).toHaveLength(2);
  });

  it('two villagers entered in one step: the second waits one step and is then called', () => {
    const sim = create(3);
    parkThreats(sim);
    const a = villagerAt(sim, 0);
    const b = villagerAt(sim, 1);
    b.x = a.x;
    b.z = a.z;
    sim.state.guardian.x = a.x;
    sim.state.guardian.z = a.z;
    expect(ofType(sim.tick(), 'villagerJoined')).toHaveLength(1);
    expect(ofType(sim.tick(), 'villagerJoined')).toHaveLength(1);
    expect(sim.state.line).toEqual([a.id, b.id]);
  });
});

describe('threats', () => {
  it('a threat on the guardian bumps it for 0.8 s, scares the whole line, and backs off; not a reading error', () => {
    const sim = create(3);
    parkThreats(sim);
    const a = villagerAt(sim, 0);
    const b = villagerAt(sim, 1);
    touch(sim, a.id);
    touch(sim, b.id);
    const refusals = sim.state.shift[0]!.refusals;
    const g = sim.state.guardian;
    const s = sim.state.threats[0]!;
    s.x = g.x + 0.5;
    s.z = g.z;
    s.vx = -1.3;
    s.vz = 0;
    const events = sim.tick();
    expect(ofType(events, 'guardianBumped')).toEqual([{ type: 'guardianBumped', threatId: s.id }]);
    expect(ofType(events, 'lineScared')).toEqual([{ type: 'lineScared', ids: [a.id, b.id], by: 'threat-guardian' }]);
    expect(g.bumpedMs).toBe(TUNING.bumpedMs);
    expect(s.restMs).toBeGreaterThan(0);
    expect(sim.state.line).toEqual([]);
    expect(sim.state.next).toBe(0);
    expect(a.returning).toBe(true);
    expect(sim.state.shift[0]!.refusals).toBe(refusals);
    expect(s.vx).toBeGreaterThan(0);
    tickN(sim, stepsOf(5000));
    expect(a.returning).toBe(false);
    expect(a.x).toBeCloseTo(a.homeX);
  });

  it('a threat on the line scares it from that villager on; the front of the line stays', () => {
    const sim = create(3);
    parkThreats(sim);
    const ids = [0, 1].map((i) => villagerAt(sim, i).id);
    for (const id of ids) touch(sim, id);
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, stepsOf(1500));
    const second = villagerAt(sim, 1);
    const s = sim.state.threats[0]!;
    s.x = second.x;
    s.z = second.z;
    const events = sim.tick();
    expect(ofType(events, 'lineScared')).toEqual([{ type: 'lineScared', ids: [ids[1]], by: 'threat-line' }]);
    expect(ofType(events, 'guardianBumped')).toHaveLength(0);
    expect(sim.state.line).toEqual([ids[0]]);
    expect(sim.state.next).toBe(1);
    expect(sim.state.shift[0]!.refusals).toBe(0);
  });

  it('a scare gives 1 s of grace: a call out of order right after it is ignored, not refused', () => {
    const sim = create(3);
    parkThreats(sim);
    const ids = [0, 1].map((i) => villagerAt(sim, i).id);
    for (const id of ids) touch(sim, id);
    sim.dispatch({ type: 'steer', x: 0, z: -1 });
    tickN(sim, stepsOf(1500));
    const s = sim.state.threats[0]!;
    s.x = villagerAt(sim, 0).x;
    s.z = villagerAt(sim, 0).z;
    expect(ofType(sim.tick(), 'lineScared')).toHaveLength(1);
    expect(sim.state.graceMs).toBe(TUNING.scareGraceMs);
    parkThreats(sim);
    sim.dispatch({ type: 'steer', x: 0, z: 0 });
    expect(ofType(touch(sim, villagerAt(sim, 2).id), 'villagerRefused')).toHaveLength(0);
    expect(sim.state.shift[0]!.refusals).toBe(0);
  });

  it('with the barn open the threats keep off: no bump and no scare', () => {
    const sim = create(3);
    callAll(sim);
    const s = sim.state.threats[0]!;
    s.x = sim.state.guardian.x;
    s.z = sim.state.guardian.z;
    const events = sim.tick();
    expect(ofType(events, 'guardianBumped')).toHaveLength(0);
    expect(ofType(events, 'lineScared')).toHaveLength(0);
    expect(sim.state.line).toHaveLength(sim.state.villagers.length);
  });
});

describe('the end and the evidence', () => {
  it('there is no game over: the watch ends only when every village is saved', () => {
    expect(VILLAGE_GUARDIAN_EVENT_TYPES).not.toContain('gameOver');
    const sim = create(5);
    tickN(sim, stepsOf(30_000));
    expect(sim.state.phase).toBe('playing');
  });

  it('a saved watch gives one sentence item per village, with attempts = refusals + 1', () => {
    const sim = create(4);
    parkThreats(sim);
    // Village 1 with one wrong call, then every village saved.
    touch(sim, villagerAt(sim, 2).id);
    sim.state.guardian.x = GUARDIAN_START.x;
    sim.state.guardian.z = GUARDIAN_START.z;
    tickN(sim, stepsOf(3000));
    const events = [...saveVillage(sim)];
    while (sim.state.phase === 'playing') events.push(...saveVillage(sim));
    expect(ofType(events, 'watchComplete')).toEqual([{ type: 'watchComplete', villages: 5 }]);
    const ev = evidenceOf(sim.state, STORY, 4, 12_000);
    expect(storyGameEvidenceSchema.safeParse(ev).success).toBe(true);
    expect(ev.gameId).toBe('village-guardian');
    expect(ev.items).toHaveLength(5);
    expect(ev.items.map((i) => i.itemId)).toEqual(sim.state.shift.map((v) => v.id));
    expect(ev.items[0]).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
    expect(ev.items.slice(1).every((i) => i.attempts === 1 && i.correctFirstTry && i.solved)).toBe(true);
    const total = sim.state.shift.reduce((n, v) => n + v.words.length, 0);
    expect(scoreOf(sim.state)).toBe(total * 10 + 5 * 50);
    const { results, outcome } = resultsOf(sim.state, STORY, 4, 12_000);
    expect(results).toEqual(toGameResults(ev, scoreOf(sim.state)));
    expect(outcome).toBe('victory');
  });

  it('an untouched village leaves no evidence item', () => {
    const sim = create(4);
    expect(evidenceOf(sim.state, STORY, 4, 0).items).toHaveLength(0);
    expect(nextSteer(sim.state)).not.toBeNull();
  });
});
