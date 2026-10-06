/** A Paladin's Twin Soul run is a function of its seed: the same commands replay to the same snapshot. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng, type Simulation } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createTwinSoul, type TwinSoulCommand, type TwinSoulEvent, type TwinSoulState } from '../../src/paladins-twin-soul/core/index.js';
import { nextStrike } from '../../src/paladins-twin-soul/qc/bot.js';
import { STORY, create, wrongShade } from './helpers.js';

/** A mixed run: right strikes, wrong strikes, and strikes on a missing shade, from one chaos seed. */
function chaosRun(sim: Simulation<TwinSoulState, TwinSoulCommand, TwinSoulEvent>, chaosSeed: number): TwinSoulEvent[] {
  const chaos = createRng(chaosSeed);
  const events: TwinSoulEvent[] = [...sim.dispatch({ type: 'start' })];
  for (let i = 0; i < 80 && sim.state.phase === 'playing'; i++) {
    const roll = chaos.next();
    if (roll < 0.6) {
      const c = nextStrike(sim.state);
      if (c) events.push(...sim.dispatch(c));
    } else if (roll < 0.9) {
      const w = wrongShade(sim);
      if (w) events.push(...sim.dispatch({ type: 'strike', shade: w }));
    } else {
      events.push(...sim.dispatch({ type: 'strike', shade: 'missing' }));
    }
    sim.tick();
  }
  return events;
}

describe('replay', () => {
  it('same seed -> same targets and formation; another seed differs', () => {
    expect(create(42).snapshot()).toEqual(create(42).snapshot());
    const a = create(42).snapshot();
    const c = create(43).snapshot();
    expect(c.targets.map((t) => t.id)).not.toEqual(a.targets.map((t) => t.id));
  });

  it('same seed + same commands -> the same events', () => {
    expect(chaosRun(create(7), 5)).toEqual(chaosRun(create(7), 5));
  });

  it('a recorded run replays to the same snapshot', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    chaosRun(rec, 7);
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(rec.state.targetIndex).toBeGreaterThan(3);
    expect(rec.commands.some((c) => c.command.type === 'strike' && c.command.shade === 'missing')).toBe(true);
    const replayed = rec.replay((s) => createTwinSoul(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
  });

  it('snapshot() is a deep copy and tick() returns nothing', () => {
    const sim = create(1);
    expect(sim.tick()).toEqual([]);
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    snap.shades[0]!.fallen = true;
    expect(sim.state.shades[0]!.fallen).toBe(false);
  });
});
