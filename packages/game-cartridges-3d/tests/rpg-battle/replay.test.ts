/** An RPG Battle run is a function of its seed: the same commands replay to the same snapshot. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createRpgBattle, type RpgBattleEvent } from '../../src/rpg-battle/core/index.js';
import { nextCommand } from '../../src/rpg-battle/qc/bot.js';
import { STORY, create, wrongOption } from './helpers.js';

describe('replay', () => {
  it('same seed -> same targets, powers, and hand', () => {
    const a = create(42).snapshot();
    expect(create(42).snapshot()).toEqual(a);
    const c = create(43).snapshot();
    expect(c.targets.map((t) => t.id)).not.toEqual(a.targets.map((t) => t.id));
  });

  it('same seed + same commands -> same events and snapshot; right, wrong, cancel, and rejected commands mixed', () => {
    const seed = 1234;
    const run = (): { events: RpgBattleEvent[]; snapshot: unknown } => {
      const sim = create(seed);
      const chaos = createRng(99);
      const events: RpgBattleEvent[] = [...sim.dispatch({ type: 'start' })];
      for (let i = 0; i < 80 && sim.state.phase === 'playing'; i++) {
        const roll = chaos.next();
        if (roll < 0.55) {
          const c = nextCommand(sim.state);
          if (c) events.push(...sim.dispatch(c));
        } else if (roll < 0.75 && sim.state.question) {
          events.push(...sim.dispatch({ type: 'answer', optionId: wrongOption(sim) }));
        } else if (roll < 0.85) {
          events.push(...sim.dispatch({ type: 'cancel' }));
        } else {
          events.push(...sim.dispatch({ type: 'play', cardId: 'missing' }));
        }
      }
      return { events, snapshot: sim.snapshot() };
    };
    const a = run();
    const b = run();
    expect(a.events).toEqual(b.events);
    expect(a.snapshot).toEqual(b.snapshot);
    expect(a.events.some((e) => e.type === 'rejected')).toBe(true);
    expect(a.events.some((e) => e.type === 'monsterStrike')).toBe(true);
  });

  it('the recorder replays the commands to the same snapshot', () => {
    const seed = 77;
    const rec = createRecorder(seed, create(seed));
    rec.dispatch({ type: 'start' });
    for (let i = 0; i < 30 && rec.state.phase === 'playing'; i++) {
      const c = nextCommand(rec.state);
      if (c) rec.dispatch(c);
      if (i % 5 === 4 && rec.state.question) rec.dispatch({ type: 'answer', optionId: wrongOption(rec as never) });
      rec.tick();
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    const replayed = rec.replay((s) => createRpgBattle(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
  });

  it('snapshot() is a deep copy and tick() returns nothing', () => {
    const sim = create(1);
    expect(sim.tick()).toEqual([]);
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.targets[0]!.solved = true;
    expect(sim.state.targets[0]!.solved).toBe(false);
  });
});
