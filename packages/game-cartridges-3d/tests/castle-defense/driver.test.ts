/** The view driver plays the core events in order and reports the run once. */
import { describe, expect, it } from 'vitest';
import type { Post } from '../../src/castle-defense/core/index.js';
import { CastleDefensePlayer, type Presentation, type StepShown } from '../../src/castle-defense/view/driver.js';
import { SHORT_STORY, create } from './helpers.js';

function harness(seed: number, helper = false) {
  const sim = create(seed, helper, SHORT_STORY);
  const log: string[] = [];
  const done: unknown[] = [];
  let ask: { kind: 'step'; shown: StepShown; pick: (c: number) => void } | { kind: 'posts'; posts: readonly Post[]; build: (p: number) => void } | null = null;
  const p: Presentation = {
    setHearts: (h) => log.push(`hearts:${h}`),
    setProgress: (w, n, d, sz) => log.push(`progress:${w}/${n}:${d}/${sz}`),
    spawnWave: async (w, _n, a) => void log.push(`spawn:${w}:${a.length}`),
    showStep: (shown, pick) => {
      ask = { kind: 'step', shown, pick };
    },
    hideStep: () => {
      ask = null;
    },
    markPick: async (_c, correct) => void log.push(`mark:${correct}`),
    strike: async (_a, hero, hearts) => void log.push(`strike:${hero}:${hearts}`),
    rest: async () => void log.push('rest'),
    showPosts: (posts, build) => {
      ask = { kind: 'posts', posts, build };
    },
    hidePosts: () => {
      ask = null;
    },
    towerBuilt: async (post, _h, level) => void log.push(`tower:${post}:${level}`),
    volley: async (shots) => void log.push(`volley:${shots.length}:${shots.filter((s) => s.fell).length}`),
    clearWave: async (a) => void log.push(`clear:${a.length}`),
    cardPopup: (t) => log.push(`coins:${t}`),
    sfx: () => undefined,
    victory: async () => void log.push('victory'),
    settle: async () => undefined,
  };
  const player = new CastleDefensePlayer({ sim, story: SHORT_STORY, seed, presentation: p, complete: (r, o, e) => done.push([r, o, e]), now: () => 0 });
  return { sim, log, done, player, ask: () => ask };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('driver', () => {
  it.each([1, 2, 3])('seed %i: the student taps through to victory; complete is called once', async (seed) => {
    const h = harness(seed, seed === 2);
    await h.player.start();
    expect(h.log.some((l) => l.startsWith('spawn:'))).toBe(true);
    for (let i = 0; i < 400 && !h.player.finished; i++) {
      const a = h.ask()!;
      if (a.kind === 'step') a.pick(a.shown.step.choices.find((c) => c.right)!.index);
      else a.build(i % 3);
      await settle();
    }
    expect(h.sim.state.phase).toBe('victory');
    expect(h.done).toHaveLength(1);
    expect(h.log.filter((l) => l === 'victory')).toHaveLength(1);
    expect(h.log.filter((l) => l.startsWith('tower:'))).toHaveLength(h.sim.state.waveCount);
    expect(h.log.filter((l) => l.startsWith('clear:'))).toHaveLength(h.sim.state.waveCount);
    expect(h.log.filter((l) => l.startsWith('spawn:'))).toHaveLength(h.sim.state.waveCount);
  });

  it('every attacker falls in a volley, so the wave clear leaves none standing', async () => {
    const h = harness(4);
    await h.player.start();
    for (let i = 0; i < 100 && !h.log.some((l) => l.startsWith('clear:')); i++) {
      const a = h.ask()!;
      if (a.kind === 'step') a.pick(a.shown.step.choices.find((c) => c.right)!.index);
      else a.build(0);
      await settle();
    }
    expect(h.log.filter((l) => l.startsWith('volley:') && l.endsWith(':1'))).toHaveLength(2);
    expect(h.log).toContain('clear:0');
  });

  it('a wrong word is marked, an attacker strikes, and the same step returns with a shut word', async () => {
    const h = harness(5);
    await h.player.start();
    const first = h.ask()! as Extract<ReturnType<typeof h.ask>, { kind: 'step' }>;
    const wrong = first.shown.step.choices.find((c) => !c.right)!;
    first.pick(wrong.index);
    await settle();
    expect(h.log).toContain('mark:false');
    expect(h.log.some((l) => l.startsWith('strike:'))).toBe(true);
    expect(h.sim.state.hearts).toBe(h.sim.state.maxHearts - 1);
    const again = h.ask()! as Extract<ReturnType<typeof h.ask>, { kind: 'step' }>;
    expect(again.shown.step.index).toBe(first.shown.step.index);
    expect(again.shown.step.choices.find((c) => c.index === wrong.index)!.blocked).toBe(true);
  });

  it('ignores a tap after the end', async () => {
    const h = harness(3);
    await h.player.start();
    h.player.destroy();
    await h.player.pick(0);
    expect(h.sim.state.picks).toBe(0);
  });
});
