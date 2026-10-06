/** The view driver plays the core events in order and reports the run once. */
import { describe, expect, it } from 'vitest';
import type { Round } from '../../src/archers-revenge/core/index.js';
import { ArchersRevengePlayer, type Presentation } from '../../src/archers-revenge/view/driver.js';
import { SHORT_STORY, create } from './helpers.js';

function harness(seed: number, helper = false) {
  const sim = create(seed, helper, SHORT_STORY);
  const log: string[] = [];
  const done: unknown[] = [];
  let ask: { round: Round; fire: (lane: number) => void } | null = null;
  const p: Presentation = {
    setCourage: (v) => log.push(`courage:${v}`),
    setProgress: (w, n, d, s) => log.push(`progress:${w}/${n}:${d}/${s}`),
    spawnWave: async (w, _n, enemies) => void log.push(`spawn:${w}:${enemies.length}`),
    showRound: (round, fire) => {
      ask = { round, fire };
    },
    hideRound: () => {
      ask = null;
    },
    markShot: async (_lane, correct) => void log.push(`mark:${correct}`),
    shoot: async (_e, correct) => void log.push(`shoot:${correct}`),
    enemyStrike: async (_e, h) => void log.push(`estrike:${h}`),
    rest: async () => void log.push('rest'),
    clearWave: async (enemies) => void log.push(`clear:${enemies.length}`),
    cardPopup: (t) => log.push(`coins:${t}`),
    sfx: () => undefined,
    victory: async () => void log.push('victory'),
    settle: async () => undefined,
  };
  const player = new ArchersRevengePlayer({ sim, story: SHORT_STORY, seed, presentation: p, complete: (r, o, e) => done.push([r, o, e]), now: () => 0 });
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
      const { round, fire } = h.ask()!;
      fire(round.lanes.find((l) => l.wordId === round.wordId)!.lane);
      await settle();
    }
    expect(h.sim.state.phase).toBe('victory');
    expect(h.done).toHaveLength(1);
    expect(h.log.filter((l) => l === 'victory')).toHaveLength(1);
    expect(h.log.filter((l) => l === 'shoot:true')).toHaveLength(SHORT_STORY.vocabulary.length);
    expect(h.log.filter((l) => l.startsWith('clear:'))).toHaveLength(h.sim.state.waveCount);
    expect(h.log.filter((l) => l.startsWith('spawn:'))).toHaveLength(h.sim.state.waveCount);
  });

  it('a wrong arrow is shot, the enemy strikes, courage drops, and the same prompt returns with a shut lane', async () => {
    const h = harness(5);
    await h.player.start();
    const before = h.sim.state.courage;
    const { round, fire } = h.ask()!;
    const wrong = round.lanes.find((l) => l.wordId !== round.wordId)!;
    fire(wrong.lane);
    await settle();
    expect(h.log).toContain('mark:false');
    expect(h.log).toContain('shoot:false');
    expect(h.log.some((l) => l.startsWith('estrike:'))).toBe(true);
    expect(h.log).toContain(`courage:${before - 1}`);
    const again = h.ask()!;
    expect(again.round.wordId).toBe(round.wordId);
    expect(again.round.lanes.find((l) => l.lane === wrong.lane)!.blocked).toBe(true);
  });

  it('ignores a tap after the end', async () => {
    const h = harness(3);
    await h.player.start();
    h.player.destroy();
    await h.player.fire(0);
    expect(h.sim.state.shots).toBe(0);
  });
});
