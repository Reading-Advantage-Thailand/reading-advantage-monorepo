/** The view driver plays the core events in order and reports the run once. */
import { describe, expect, it } from 'vitest';
import { RpgBattlePlayer, type Presentation } from '../../src/rpg-battle/view/driver.js';
import type { Card, Question } from '../../src/rpg-battle/core/index.js';
import { SHORT_STORY, create } from './helpers.js';

function harness(seed: number, helper = false) {
  const sim = create(seed, helper, SHORT_STORY);
  const log: string[] = [];
  const done: unknown[] = [];
  let hand: { cards: readonly Card[]; pick: (id: string) => void } | null = null;
  let ask: { q: Question; answer: (id: string) => void; back: () => void } | null = null;
  const hp = new Map<string, number>();
  const p: Presentation = {
    setCourage: (v) => log.push(`courage:${v}`),
    setPlace: (i, n, k) => log.push(`place:${i}/${n}:${k}`),
    showHand: (cards, pick) => {
      hand = { cards, pick };
      ask = null;
    },
    showQuestion: (q, _c, answer, back) => {
      ask = { q, answer, back };
      hand = null;
    },
    hideCard: () => {
      hand = null;
      ask = null;
    },
    feedback: async (_q, _id, correct) => void log.push(`feedback:${correct}`),
    spawn: async (m) => void log.push(`spawn:${m.kind}:${m.hp}`),
    setMonsterHp: (m) => void hp.set(m.id, m.hp),
    heroStrike: async (h, _m, d) => void log.push(`strike:${h}:${d}`),
    monsterHit: async () => void log.push('hit'),
    monsterDefeated: async (m) => void log.push(`defeated:${m.kind}`),
    monsterStrike: async (_m, h) => void log.push(`mstrike:${h}`),
    heal: (_h, n) => log.push(`heal:${n}`),
    rest: async () => void log.push('rest'),
    cardPopup: (t) => log.push(`coins:${t}`),
    sfx: () => undefined,
    victory: async () => void log.push('victory'),
    settle: async () => undefined,
  };
  const player = new RpgBattlePlayer({ sim, story: SHORT_STORY, seed, presentation: p, complete: (r, o, e) => done.push([r, o, e]), now: () => 0 });
  return { sim, log, done, player, hp, hand: () => hand, ask: () => ask };
}

const settle = () => new Promise((r) => setTimeout(r, 0));

describe('driver', () => {
  it.each([1, 2, 3])('seed %i: the student taps through to victory; complete is called once', async (seed) => {
    const h = harness(seed, seed === 2);
    await h.player.start();
    expect(h.log.some((l) => l.startsWith('spawn:'))).toBe(true);
    expect(h.hand()!.cards.length).toBeGreaterThan(0);
    for (let i = 0; i < 200 && !h.player.finished; i++) {
      const hand = h.hand();
      if (hand) {
        hand.pick(hand.cards[0]!.id);
        await settle();
        continue;
      }
      const ask = h.ask()!;
      ask.answer(ask.q.cardId);
      await settle();
    }
    expect(h.sim.state.phase).toBe('victory');
    expect(h.done).toHaveLength(1);
    expect(h.log.filter((l) => l === 'victory')).toHaveLength(1);
    expect(h.log.filter((l) => l.startsWith('strike:'))).toHaveLength(SHORT_STORY.vocabulary.length);
    expect(h.log.filter((l) => l.startsWith('defeated:')).length).toBe(h.log.filter((l) => l.startsWith('spawn:')).length);
    expect([...h.hp.values()].every((v) => v >= 0)).toBe(true);
  });

  it('a wrong answer shows feedback, the monster strikes, courage drops, and the hand returns', async () => {
    const h = harness(5);
    await h.player.start();
    const before = h.sim.state.courage;
    h.hand()!.pick(h.hand()!.cards[0]!.id);
    await settle();
    const ask = h.ask()!;
    ask.answer(ask.q.options.find((o) => o.id !== ask.q.cardId)!.id);
    await settle();
    expect(h.log).toContain('feedback:false');
    expect(h.log.some((l) => l.startsWith('mstrike:'))).toBe(true);
    expect(h.log).toContain(`courage:${before - 1}`);
    expect(h.hand()).not.toBeNull();
    expect(h.hand()!.cards[0]!.retry).toBe(true);
  });

  it('back puts the card back and shows the hand', async () => {
    const h = harness(5);
    await h.player.start();
    h.hand()!.pick(h.hand()!.cards[1]!.id);
    await settle();
    expect(h.ask()).not.toBeNull();
    h.ask()!.back();
    await settle();
    expect(h.hand()).not.toBeNull();
    expect(h.sim.state.question).toBeNull();
    expect(h.sim.state.targets.every((t) => t.attempts === 0)).toBe(true);
  });

  it('ignores a tap after the end', async () => {
    const h = harness(3);
    await h.player.start();
    h.player.destroy();
    await h.player.pick(h.sim.state.hand[0]!.id);
    expect(h.sim.state.question).toBeNull();
  });
});
