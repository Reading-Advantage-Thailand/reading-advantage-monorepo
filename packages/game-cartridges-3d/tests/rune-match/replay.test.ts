/** A Rune Match run is a function of its seed: the same commands replay to the same snapshot. */
import { describe, expect, it } from 'vitest';
import { createRecorder, createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import { createRuneMatch, type RuneMatchEvent } from '../../src/rune-match/core/index.js';
import { nextSwap } from '../../src/rune-match/qc/bot.js';
import { STORY, create, findWrongSwap } from './helpers.js';

describe('replay', () => {
  it('same seed -> same board, targets, and palette', () => {
    const a = create(42).snapshot();
    const b = create(42).snapshot();
    expect(a).toEqual(b);
    const c = create(43).snapshot();
    expect(c.board.map((r) => r.map((x) => x.wordId ?? x.kind))).not.toEqual(
      a.board.map((r) => r.map((x) => x.wordId ?? x.kind)),
    );
    expect(c.targets.map((t) => t.id)).not.toEqual(a.targets.map((t) => t.id));
  });

  it('same seed + same commands -> same snapshot; a mix of right and wrong swaps', () => {
    const seed = 1234;
    const rec = createRecorder(seed, create(seed));
    const chaos = createRng(99);
    const events: RuneMatchEvent[] = [];
    events.push(...rec.dispatch({ type: 'start' }));
    for (let i = 0; i < 60 && rec.state.phase === 'playing'; i++) {
      const roll = chaos.next();
      if (roll < 0.6) {
        const c = nextSwap(rec.state);
        if (c) events.push(...rec.dispatch(c));
      } else if (roll < 0.9) {
        const w = findWrongSwap(rec.state.board);
        if (w) events.push(...rec.dispatch({ type: 'swap', ...w }));
      } else {
        events.push(...rec.dispatch({ type: 'swap', a: { row: 0, col: 0 }, b: { row: 3, col: 3 } }));
      }
      rec.tick();
    }
    expect(rec.commands.length).toBeGreaterThan(10);
    expect(rec.state.targetIndex).toBeGreaterThan(3);
    expect(rec.commands.some((c) => c.command.type === 'swap' && c.command.b.row === 3)).toBe(true);
    const replayed = rec.replay((s) => createRuneMatch(STORY, { seed: s, helper: false }));
    expect(replayed).toEqual(rec.snapshot());
  });

  it('snapshot() is a deep copy and tick() returns nothing', () => {
    const sim = create(1);
    expect(sim.tick()).toEqual([]);
    const snap = sim.snapshot();
    expect(snap).toEqual(sim.state);
    expect(snap).not.toBe(sim.state);
    snap.board[0]![0] = { id: 'x', kind: 'heal' };
    expect(sim.state.board[0]![0]!.id).not.toBe('x');
  });
});
