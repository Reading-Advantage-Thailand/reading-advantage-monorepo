/** The view driver asks for a shade, plays the core events in order, and reports the run once. */
import { describe, expect, it } from 'vitest';
import { TwinSoulPlayer, type Presentation, type WaveShown } from '../../src/paladins-twin-soul/view/driver.js';
import type { TwinSoulState } from '../../src/paladins-twin-soul/core/index.js';
import { nextStrike } from '../../src/paladins-twin-soul/qc/bot.js';
import { SHORT_STORY, create, wrongShade } from './helpers.js';

function harness(seed: number, wrongFirst = false) {
  const sim = create(seed, false, SHORT_STORY);
  const log: string[] = [];
  const asked: WaveShown[] = [];
  const done: unknown[] = [];
  let first = true;
  const p: Presentation = {
    async ask(wave) {
      asked.push(wave);
      const state: TwinSoulState = sim.state;
      expect(wave.shades.every((s) => state.shades.some((x) => x.id === s.id && !x.fallen))).toBe(true);
      const wrong = wrongFirst && first ? wrongShade(sim) : null;
      first = false;
      const c = nextStrike(state);
      return wrong ?? (c?.type === 'strike' ? c.shade : '');
    },
    setCourage: (v) => log.push(`courage:${v}`),
    setTwins: (f, n) => log.push(`twins:${f}/${n}`),
    setPlace: (i, n, k) => log.push(`place:${i}/${n}:${k}`),
    spawn: async (m) => void log.push(`spawn:${m.kind}`),
    setMonsterHp: (m) => log.push(`hp:${m.hp}`),
    captured: () => log.push('captured'),
    shadeFell: async () => void log.push('fell'),
    soulFreed: async (_s, points, firstTry) => void log.push(`freed:${points}:${firstTry}`),
    scatter: async () => void log.push('scatter'),
    heroStrike: async (h) => void log.push(`strike:${h}`),
    monsterHit: async () => void log.push('hit'),
    monsterDefeated: async (m) => void log.push(`defeated:${m.kind}`),
    monsterStrike: async (_m, h) => void log.push(`mstrike:${h}`),
    rest: async () => void log.push('rest'),
    sfx: () => undefined,
    victory: async () => void log.push('victory'),
    settle: async () => undefined,
  };
  const player = new TwinSoulPlayer({
    sim,
    story: { id: SHORT_STORY.id, level: SHORT_STORY.level },
    seed,
    presentation: p,
    complete: (r, o, e) => done.push([r, o, e]),
    now: () => 0,
  });
  return { sim, log, asked, done, player };
}

describe('driver', () => {
  it('plays a whole run, asks once per wave, and completes once', async () => {
    const { sim, log, asked, done, player } = harness(3);
    await player.start();
    expect(player.finished).toBe(true);
    expect(sim.state.phase).toBe('victory');
    expect(asked).toHaveLength(sim.state.targetCount);
    expect(log.filter((l) => l === 'captured')).toHaveLength(sim.state.targetCount);
    expect(log.filter((l) => l.startsWith('freed:'))).toHaveLength(sim.state.targetCount);
    expect(log.at(-1)).toBe('victory');
    expect(done).toHaveLength(1);
    const [results, outcome, evidence] = done[0] as [{ score: number }, string, { items: unknown[] }];
    expect(outcome).toBe('victory');
    expect(evidence.items).toHaveLength(sim.state.targetCount);
    expect(results.score).toBe(sim.state.score);
  });

  it('a wrong shade falls, courage drops, and the next ask has one shade less', async () => {
    const { log, asked, player } = harness(4, true);
    await player.start();
    expect(log).toContain('fell');
    expect(log).toContain('mstrike:knight');
    expect(log).toContain('courage:4');
    expect(asked[1]!.retry).toBe(true);
    expect(asked[1]!.shades.length).toBe(asked[0]!.shades.length - 1);
    expect(log.some((l) => l === 'freed:100:false')).toBe(true);
  });

  it('stops asking after destroy', async () => {
    const { asked, player } = harness(5);
    player.destroy();
    await player.start();
    expect(asked).toHaveLength(0);
  });
});
