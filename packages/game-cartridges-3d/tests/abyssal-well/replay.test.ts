/** A recorded Abyssal Well run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createAbyssalWell, nextEnemyOf, type AbyssalWellCommand, type AbyssalWellEvent } from '../../src/abyssal-well/core/index.js';
import { STORY, create } from './helpers.js';

/** Plays random but legal commands (rotations, shots at any enemy, shots at the right one). */
function chaosRun(seed: number, chaosSeed: number): { events: AbyssalWellEvent[]; commands: AbyssalWellCommand[]; snapshot: unknown } {
  const rec = createRecorder(seed, createAbyssalWell(STORY, { seed, helper: false }));
  const chaos = createRng(chaosSeed);
  const events: AbyssalWellEvent[] = [...rec.dispatch({ type: 'start' })];
  for (let step = 0; step < 400 && rec.state.phase === 'playing'; step++) {
    const roll = chaos.next();
    if (roll < 0.4) events.push(...rec.dispatch({ type: 'fire', lane: nextEnemyOf(rec.state)!.lane }));
    else if (roll < 0.7) events.push(...rec.dispatch({ type: 'fire', lane: rec.state.enemies[chaos.int(rec.state.enemies.length)]!.lane }));
    else if (roll < 0.9) events.push(...rec.dispatch({ type: 'rotate', dir: chaos.next() < 0.5 ? -1 : 1 }));
    else events.push(...rec.dispatch({ type: 'fire' }));
    events.push(...rec.tick());
  }
  return { events, commands: rec.commands.map((c) => c.command), snapshot: rec.snapshot() };
}

describe('replay', () => {
  it('same seed + same commands -> same snapshot and events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, createAbyssalWell(STORY, { seed, helper: false }));
    const chaos = createRng(99);
    const events: AbyssalWellEvent[] = [...rec.dispatch({ type: 'start' })];
    for (let step = 0; step < 300 && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.5) events.push(...rec.dispatch({ type: 'fire', lane: nextEnemyOf(rec.state)!.lane }));
      else if (roll < 0.75) events.push(...rec.dispatch({ type: 'fire', lane: rec.state.enemies[chaos.int(rec.state.enemies.length)]!.lane }));
      else events.push(...rec.dispatch({ type: 'rotate', dir: chaos.next() < 0.5 ? -1 : 1 }));
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'struck')).toBe(true);
    expect(events.some((e) => e.type === 'repelled')).toBe(true);
    expect(events.some((e) => e.type === 'moved')).toBe(true);
    const replayed = rec.replay((s) => createAbyssalWell(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
  });

  it('the same seed and the same moves give the same events again; another seed gives another run', () => {
    const a = chaosRun(5, 11);
    const b = chaosRun(5, 11);
    expect(b.events).toEqual(a.events);
    expect(b.snapshot).toEqual(a.snapshot);
    const other = createAbyssalWell(STORY, { seed: 6, helper: false }).snapshot();
    const first = createAbyssalWell(STORY, { seed: 5, helper: false }).snapshot();
    expect(other.descents.map((d) => d.id)).not.toEqual(first.descents.map((d) => d.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.enemies[0]!.lane = 99;
    expect(sim.state.enemies[0]!.lane).not.toBe(99);
  });
});
