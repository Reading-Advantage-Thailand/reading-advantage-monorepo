/** A recorded Enchanted Library run replays to the same snapshot from its seed. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createEnchantedLibrary, type LibraryEvent } from '../../src/enchanted-library/core/index.js';
import { nextCommand } from '../../src/enchanted-library/qc/bot.js';
import { STORY, create, stepsOf } from './helpers.js';

describe('replay', () => {
  it('same seed + same commands at the same steps -> same snapshot and events', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: LibraryEvent[] = [];
    for (let step = 0; step < stepsOf(180_000) && rec.state.phase === 'playing'; step++) {
      const roll = chaos.next();
      if (roll < 0.1) {
        const c = nextCommand(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.14) {
        events.push(...rec.dispatch({ type: 'steer', x: chaos.next() * 2 - 1, z: chaos.next() * 2 - 1 }));
      } else if (roll < 0.17) {
        events.push(...rec.dispatch({ type: 'goto', x: (chaos.next() * 2 - 1) * 5, z: (chaos.next() * 2 - 1) * 3.5 }));
      } else if (roll < 0.19) {
        const book = rec.state.books[chaos.int(rec.state.books.length)];
        if (book) events.push(...rec.dispatch({ type: 'goto', bookId: book.id }));
      } else if (roll < 0.21) {
        events.push(...rec.dispatch({ type: 'shield' }));
      }
      events.push(...rec.tick());
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(events.some((e) => e.type === 'spiritSpawned')).toBe(true);
    expect(events.some((e) => e.type === 'bookCollected')).toBe(true);
    const replayed = rec.replay((s) => createEnchantedLibrary(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
    // The same seed gives the same first events; a different seed gives a different visit.
    const first = create(seed).tick().find((e) => e.type === 'roundStarted');
    expect(first).toEqual(create(seed).tick().find((e) => e.type === 'roundStarted'));
    const other = createEnchantedLibrary(STORY, { seed: seed + 1, helper: false }).snapshot();
    expect(other.rounds.map((r) => r.id)).not.toEqual(create(seed).state.rounds.map((r) => r.id));
  });

  it('snapshot() is a deep copy', () => {
    const sim = create(1);
    sim.tick();
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.books[0]!.x = 99;
    expect(sim.state.books[0]!.x).not.toBe(99);
  });
});
