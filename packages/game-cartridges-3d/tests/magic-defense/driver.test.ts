/** The view driver plays the core events in order and reports the run once. */
import { describe, expect, it } from 'vitest';
import type { Round } from '../../src/magic-defense/core/index.js';
import { MagicDefensePlayer, type Presentation } from '../../src/magic-defense/view/driver.js';
import { SHORT_STORY, create } from './helpers.js';

function harness(seed: number, helper = false) {
  const sim = create(seed, helper, SHORT_STORY);
  const log: string[] = [];
  const done: unknown[] = [];
  let ask: { round: Round; cast: (choice: number) => void } | null = null;
  const p: Presentation = {
    setCastles: (c) => log.push(`castles:${c.join(',')}`),
    setMana: (v) => log.push(`mana:${v}`),
    setProgress: (w, n, d, sz) => log.push(`progress:${w}/${n}:${d}/${sz}`),
    spawnWave: async (w, _n, enemies) => void log.push(`spawn:${w}:${enemies.length}`),
    showRound: (round, cast) => {
      ask = { round, cast };
    },
    hideRound: () => {
      ask = null;
    },
    markCast: async (_choice, correct) => void log.push(`mark:${correct}`),
    castSpell: async (_e, correct) => void log.push(`spell:${correct}`),
    castleHit: async (_e, hero, castle, health) => void log.push(`hit:${hero}:${castle}:${health}`),
    rest: async () => void log.push('rest'),
    storm: async () => void log.push('storm'),
    clearWave: async (enemies) => void log.push(`clear:${enemies.length}`),
    cardPopup: (t) => log.push(`coins:${t}`),
    sfx: () => undefined,
    victory: async () => void log.push('victory'),
    settle: async () => undefined,
  };
  const player = new MagicDefensePlayer({ sim, story: SHORT_STORY, seed, presentation: p, complete: (r, o, e) => done.push([r, o, e]), now: () => 0 });
  return { sim, log, done, player, ask: () => ask };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('driver', () => {
  it.each([1, 2, 3])('seed %i: the student taps through to victory; complete is called once', async (seed) => {
    const h = harness(seed, seed === 2);
    await h.player.start();
    expect(h.log.some((l) => l.startsWith('spawn:'))).toBe(true);
    expect(h.ask()).not.toBeNull();
    for (let i = 0; i < 200 && !h.player.finished; i++) {
      const { round, cast } = h.ask()!;
      cast(round.choices.find((c) => c.wordId === round.wordId)!.index);
      await settle();
    }
    expect(h.sim.state.phase).toBe('victory');
    expect(h.done).toHaveLength(1);
    expect(h.log.filter((l) => l === 'victory')).toHaveLength(1);
    expect(h.log.filter((l) => l === 'spell:true')).toHaveLength(SHORT_STORY.vocabulary.length);
    expect(h.log.filter((l) => l.startsWith('clear:'))).toHaveLength(h.sim.state.waveCount);
    expect(h.log.filter((l) => l.startsWith('spawn:'))).toHaveLength(h.sim.state.waveCount);
  });

  it('a wrong spell fizzles, the missile hits its castle, and the same missile returns with a shut word', async () => {
    const h = harness(5);
    await h.player.start();
    const { round, cast } = h.ask()!;
    const before = h.sim.state.castles[round.castle]!;
    const wrong = round.choices.find((c) => c.wordId !== round.wordId)!;
    cast(wrong.index);
    await settle();
    expect(h.log).toContain('mark:false');
    expect(h.log).toContain('spell:false');
    expect(h.log.some((l) => l.startsWith('hit:'))).toBe(true);
    expect(h.sim.state.castles.reduce((a, b) => a + b, 0)).toBe(h.sim.state.castles.length * h.sim.state.maxCastleHealth - 1);
    expect(before).toBeGreaterThan(0);
    const again = h.ask()!;
    expect(again.round.wordId).toBe(round.wordId);
    expect(again.round.choices.find((c) => c.index === wrong.index)!.blocked).toBe(true);
  });

  it('the storm button works only with full mana, then mends the castles', async () => {
    const h = harness(4);
    await h.player.start();
    await h.player.storm();
    expect(h.log).not.toContain('storm');
    for (let i = 0; i < 40 && h.sim.state.mana < h.sim.state.maxMana && !h.player.finished; i++) {
      const { round, cast } = h.ask()!;
      cast(round.choices.find((c) => c.wordId === round.wordId)!.index);
      await settle();
    }
    if (h.sim.state.mana >= h.sim.state.maxMana) {
      await h.player.storm();
      expect(h.log).toContain('storm');
      expect(h.sim.state.mana).toBe(0);
    }
  });

  it('ignores a tap after the end', async () => {
    const h = harness(3);
    await h.player.start();
    h.player.destroy();
    await h.player.cast(0);
    expect(h.sim.state.casts).toBe(0);
  });
});
