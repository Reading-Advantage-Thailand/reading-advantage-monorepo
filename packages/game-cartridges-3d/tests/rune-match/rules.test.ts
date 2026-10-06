/** The Rune Match rules of sections 2, 3, and 6 of docs/game-rune-match-3d.md. */
import { describe, expect, it } from 'vitest';
import { storyGameEvidenceSchema } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { createRng } from '@reading-advantage/advantage-play-kit-3d/sim';
import {
  HEROES,
  MONSTER_KINDS,
  RUNE_MATCH_EVENT_TYPES,
  TUNING,
  createRuneMatch,
  evidenceOf,
  findLines,
  findTargetMove,
  keyOf,
  monstersOf,
  paletteOf,
  resultsOf,
  targetsOf,
  wordsOf,
} from '../../src/rune-match/core/index.js';
import { nextSwap } from '../../src/rune-match/qc/bot.js';
import { SHORT_STORY, STORY, arrange, create, ofType, otherKey, playToEnd, put, types, wrongSwap } from './helpers.js';

const SEEDS = Array.from({ length: 40 }, (_, i) => i + 1);

describe('content', () => {
  it('targets every story word once, in a seeded order', () => {
    const targets = targetsOf(STORY, createRng(3));
    expect(targets).toHaveLength(STORY.vocabulary.length);
    expect(new Set(targets.map((t) => t.id)).size).toBe(STORY.vocabulary.length);
    for (const t of targets) {
      const w = STORY.vocabulary.find((v) => v.id === t.id)!;
      expect(t.term).toBe(w.term);
      expect(t.translation).toBe(w.translation);
      expect(t).toMatchObject({ attempts: 0, correctFirstTry: false, solved: false });
    }
    expect(targetsOf(STORY, createRng(3)).map((t) => t.id)).toEqual(targets.map((t) => t.id));
    expect(targetsOf(STORY, createRng(4)).map((t) => t.id)).not.toEqual(targets.map((t) => t.id));
  });

  it('accepts the APK VocabularyInput too', () => {
    expect(wordsOf([{ term: 'cat', translation: 'แมว' }, { term: '', translation: 'x' }, { term: 'dog', translation: 'หมา' }])).toEqual([
      { id: 'w-1', term: 'cat', translation: 'แมว' },
      { id: 'w-3', term: 'dog', translation: 'หมา' },
    ]);
    const sim = createRuneMatch([{ term: 'cat', translation: 'แมว' }, { term: 'dog', translation: 'หมา' }], { seed: 1, helper: false });
    expect(sim.state.targetCount).toBe(2);
    expect(sim.state.palette).toHaveLength(2);
    playToEnd(sim);
    expect(sim.state.phase).toBe('victory');
  });

  it('a run with no words is over before it starts', () => {
    const sim = createRuneMatch([], { seed: 1, helper: false });
    expect(sim.state.phase).toBe('victory');
    expect(sim.state.board).toEqual([]);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });

  it('monsters: 4 words each, the dragon takes the rest, HP counts the words', () => {
    expect(monstersOf(13, 4)).toEqual([
      { kind: 'skeleton', hp: 4, maxHp: 4 },
      { kind: 'mimic', hp: 4, maxHp: 4 },
      { kind: 'dragon-fire', hp: 5, maxHp: 5 },
    ]);
    expect(monstersOf(5, 4).map((m) => [m.kind, m.hp])).toEqual([
      ['skeleton', 4],
      ['mimic', 1],
    ]);
    expect(monstersOf(3, 4).map((m) => [m.kind, m.hp])).toEqual([['skeleton', 3]]);
    expect(monstersOf(20, 4).map((m) => [m.kind, m.hp])).toEqual([
      ['skeleton', 4],
      ['mimic', 4],
      ['dragon-fire', 12],
    ]);
    expect(monstersOf(0, 4)).toEqual([]);
  });

  it('the palette is the target plus the decoys; helper mode has fewer decoys and a 6 x 6 board', () => {
    const targets = targetsOf(STORY, createRng(1));
    const palette = paletteOf(targets, targets[0]!.id, 5, createRng(2));
    expect(palette).toHaveLength(6);
    expect(palette[0]).toBe(targets[0]!.id);
    expect(new Set(palette).size).toBe(6);
    const normal = create(1);
    expect([normal.state.rows, normal.state.cols]).toEqual([8, 6]);
    expect(normal.state.palette).toHaveLength(TUNING.decoys + 1);
    const helper = create(1, true);
    expect([helper.state.rows, helper.state.cols]).toEqual([6, 6]);
    expect(helper.state.palette).toHaveLength(TUNING.helperDecoys + 1);
    expect(helper.state.board).toHaveLength(6);
    expect(helper.state.board.every((r) => r.length === 6)).toBe(true);
    const short = create(1, false, SHORT_STORY);
    expect(short.state.palette).toHaveLength(SHORT_STORY.vocabulary.length);
  });
});

describe('the board', () => {
  it.each(SEEDS)('seed %i starts with no line and a target move, in both modes', (seed) => {
    for (const helper of [false, true]) {
      const sim = create(seed, helper);
      const { board, target } = sim.state;
      expect(findLines(board)).toEqual([]);
      expect(findTargetMove(board, target!.itemId)).not.toBeNull();
      expect(board.flat().every((r) => r.id.startsWith('r') && (r.kind !== 'word' || (r.wordId && r.text)))).toBe(true);
      expect(new Set(board.flat().map((r) => r.id)).size).toBe(sim.state.rows * sim.state.cols);
      // Every word rune shows the term or the translation of its word.
      for (const rune of board.flat()) {
        if (rune.kind !== 'word') continue;
        const word = sim.state.targets.find((t) => t.id === rune.wordId)!;
        expect([word.term, word.translation]).toContain(rune.text);
      }
    }
  });

  it('mixes both languages: prompts use either language and the runes of one word use both', () => {
    const reverseSeen = new Set<boolean>();
    const shown = new Set<string>();
    for (const seed of SEEDS) {
      const sim = create(seed, false);
      for (const t of sim.state.targets) reverseSeen.add(t.reverse);
      const first = sim.state.targets[0]!;
      expect(sim.state.target!.term).toBe(first.reverse ? first.translation : first.term);
      for (const rune of sim.state.board.flat()) {
        if (rune.kind !== 'word') continue;
        const word = sim.state.targets.find((t) => t.id === rune.wordId)!;
        shown.add(rune.text === word.term ? 'term' : 'translation');
      }
    }
    expect(reverseSeen).toEqual(new Set([true, false]));
    expect(shown).toEqual(new Set(['term', 'translation']));
  });

  it.each(SEEDS)('seed %i: after every settled board there is a move that makes the target line', (seed) => {
    const sim = create(seed, seed % 2 === 0);
    const chaos = createRng(seed * 7);
    for (let i = 0; i < 80 && sim.state.phase === 'playing'; i++) {
      const c = chaos.next() < 0.5 ? nextSwap(sim.state) : { type: 'swap' as const, ...(wrongOrAny(sim)) };
      sim.dispatch(c!);
      if (sim.state.phase !== 'playing') break;
      expect(findLines(sim.state.board)).toEqual([]);
      expect(findTargetMove(sim.state.board, sim.state.target!.itemId)).not.toBeNull();
      expect(sim.state.board.flat()).toHaveLength(sim.state.rows * sim.state.cols);
      expect(new Set(sim.state.board.flat().map((r) => r.id)).size).toBe(sim.state.rows * sim.state.cols);
    }
  });

  const wrongOrAny = (sim: ReturnType<typeof create>) => {
    for (let row = 0; row < sim.state.rows; row++)
      for (let col = 0; col + 1 < sim.state.cols; col++) {
        const a = { row, col };
        const b = { row, col: col + 1 };
        if (keyOf(sim.state.board[row]![col]!) !== keyOf(sim.state.board[row]![col + 1]!)) return { a, b };
      }
    return { a: { row: 0, col: 0 }, b: { row: 0, col: 1 } };
  };

  it('places the target move when the board has none', () => {
    const sim = create(5);
    const target = sim.state.target!.itemId;
    // A board of a checker with no target rune at all: no target move.
    arrange(sim, [], target);
    expect(findTargetMove(sim.state.board, target)).toBeNull();
    const events = wrongSwap(sim);
    const placed = ofType(events, 'runesFell');
    expect(placed).toHaveLength(1);
    expect(placed[0]!.moves).toEqual([]);
    expect(placed[0]!.runes).toHaveLength(3);
    expect(placed[0]!.runes.every((r) => r.rune.wordId === target)).toBe(true);
    expect(findLines(sim.state.board)).toEqual([]);
    expect(findTargetMove(sim.state.board, target)).not.toBeNull();
    for (const { cell, rune } of placed[0]!.runes) expect(sim.state.board[cell.row]![cell.col]).toBe(rune);
  });

  it('findLines reports horizontal and vertical runs of 3 or more, once each', () => {
    const sim = create(2);
    const key = otherKey(sim, []);
    arrange(sim, [], key);
    put(sim, { row: 1, col: 1 }, key);
    put(sim, { row: 1, col: 2 }, key);
    put(sim, { row: 1, col: 3 }, key);
    put(sim, { row: 1, col: 4 }, key);
    put(sim, { row: 2, col: 1 }, key);
    put(sim, { row: 3, col: 1 }, key);
    const lines = findLines(sim.state.board);
    expect(lines).toHaveLength(2);
    expect(lines[0]).toEqual({ kind: key, cells: [1, 2, 3, 4].map((col) => ({ row: 1, col })) });
    expect(lines[1]).toEqual({ kind: key, cells: [1, 2, 3].map((row) => ({ row, col: 1 })) });
  });
});

describe('swaps', () => {
  it('rejects a swap of cells that are not neighbors, or off the board: nothing changes', () => {
    const sim = create(3);
    const before = sim.snapshot();
    const a = { row: 0, col: 0 };
    for (const b of [
      { row: 0, col: 2 },
      { row: 1, col: 1 },
      { row: 0, col: 0 },
      { row: -1, col: 0 },
      { row: 0, col: 99 },
    ]) {
      expect(sim.dispatch({ type: 'swap', a, b })).toEqual([{ type: 'swapRejected', a, b }]);
    }
    expect(sim.snapshot()).toEqual(before);
    expect(sim.state.swaps).toBe(0);
  });

  it('a swap that makes no line is swapped back and the monster strikes: courage -1', () => {
    const sim = create(3);
    const before = sim.snapshot();
    const events = wrongSwap(sim);
    expect(types(events).slice(0, 3)).toEqual(['swapped', 'swapped', 'monsterStrike']);
    const [there, back] = ofType(events, 'swapped');
    expect(back).toEqual({ type: 'swapped', a: there!.b, b: there!.a });
    expect(ofType(events, 'monsterStrike')[0]).toEqual({ type: 'monsterStrike', blocked: false, courage: TUNING.maxCourage - 1 });
    expect(sim.state.courage).toBe(TUNING.maxCourage - 1);
    expect(sim.state.board).toEqual(before.board);
    expect(sim.state.targetIndex).toBe(0);
    expect(sim.state.swaps).toBe(1);
    expect(sim.state.targets[0]!.attempts).toBe(0);
    expect(ofType(events, 'linesBurst')).toHaveLength(0);
  });

  it('at 0 courage the team rests back to 3: never a game over', () => {
    const sim = create(3);
    const all = [];
    for (let i = 0; i < TUNING.maxCourage; i++) all.push(...wrongSwap(sim));
    const strikes = ofType(all, 'monsterStrike');
    expect(strikes.map((s) => s.courage)).toEqual([4, 3, 2, 1, 0]);
    expect(ofType(all, 'rest')).toEqual([{ type: 'rest', courage: TUNING.restCourage }]);
    expect(sim.state.courage).toBe(TUNING.restCourage);
    expect(sim.state.phase).toBe('playing');
    expect(types(all.slice(-2))).toEqual(['monsterStrike', 'rest']);
    for (let i = 0; i < 3; i++) wrongSwap(sim);
    expect(sim.state.courage).toBe(TUNING.restCourage);
    expect(sim.state.phase).toBe('playing');
  });

  it('a shield line blocks the next monster strike, once', () => {
    const sim = create(4);
    arrange(sim, [{ row: 4, col: 0 }, { row: 4, col: 1 }, { row: 3, col: 2 }], 'shield');
    const events = sim.dispatch({ type: 'swap', a: { row: 3, col: 2 }, b: { row: 4, col: 2 } });
    expect(types(events).slice(0, 3)).toEqual(['swapped', 'linesBurst', 'shield']);
    const burst = ofType(events, 'linesBurst')[0]!;
    expect(burst).toMatchObject({ cascade: 0, kinds: ['shield'], target: false, coins: 30 });
    expect(burst.cells).toEqual([{ row: 4, col: 0 }, { row: 4, col: 1 }, { row: 4, col: 2 }]);
    expect(sim.state.shield).toBe(true);
    expect(ofType(events, 'heroStrike')).toHaveLength(0);
    expect(sim.state.targets[0]!.attempts).toBe(1);
    expect(sim.state.targets[0]!.correctFirstTry).toBe(false);
    const courage = sim.state.courage;
    const blocked = wrongSwap(sim);
    expect(ofType(blocked, 'monsterStrike')).toEqual([{ type: 'monsterStrike', blocked: true, courage }]);
    expect(sim.state.shield).toBe(false);
    expect(sim.state.courage).toBe(courage);
    wrongSwap(sim);
    expect(sim.state.courage).toBe(courage - 1);
  });

  it('a heal line gives one courage back, up to the maximum', () => {
    const sim = create(4);
    wrongSwap(sim);
    wrongSwap(sim);
    expect(sim.state.courage).toBe(TUNING.maxCourage - 2);
    arrange(sim, [{ row: 0, col: 3 }, { row: 1, col: 3 }, { row: 2, col: 4 }], 'heal');
    const events = sim.dispatch({ type: 'swap', a: { row: 2, col: 4 }, b: { row: 2, col: 3 } });
    expect(ofType(events, 'heal')).toEqual([{ type: 'heal', courage: TUNING.maxCourage - 1 }]);
    expect(sim.state.courage).toBe(TUNING.maxCourage - 1);
    arrange(sim, [{ row: 0, col: 3 }, { row: 1, col: 3 }, { row: 2, col: 4 }], 'heal');
    sim.dispatch({ type: 'swap', a: { row: 2, col: 4 }, b: { row: 2, col: 3 } });
    expect(sim.state.courage).toBe(TUNING.maxCourage);
    arrange(sim, [{ row: 0, col: 3 }, { row: 1, col: 3 }, { row: 2, col: 4 }], 'heal');
    const full = sim.dispatch({ type: 'swap', a: { row: 2, col: 4 }, b: { row: 2, col: 3 } });
    expect(ofType(full, 'heal')).toHaveLength(0);
    expect(sim.state.courage).toBe(TUNING.maxCourage);
  });

  it("the target's line: a hero strikes for 1, the next word shows, the runes fall from above", () => {
    const sim = create(6);
    sim.dispatch({ type: 'start' });
    const target = sim.state.target!;
    arrange(sim, [{ row: 7, col: 1 }, { row: 7, col: 2 }, { row: 6, col: 3 }], target.itemId);
    const events = sim.dispatch({ type: 'swap', a: { row: 7, col: 3 }, b: { row: 6, col: 3 } });
    expect(types(events).slice(0, 4)).toEqual(['swapped', 'linesBurst', 'heroStrike', 'targetShown']);
    expect(ofType(events, 'linesBurst')[0]).toMatchObject({ cascade: 0, kinds: [target.itemId], target: true, coins: 30 });
    expect(ofType(events, 'heroStrike')[0]).toEqual({ type: 'heroStrike', hero: 'knight', damage: 1 });
    expect(sim.state.monster).toMatchObject({ kind: 'skeleton', hp: 3, maxHp: 4 });
    expect(sim.state.targetIndex).toBe(1);
    expect(sim.state.target!.itemId).toBe(sim.state.targets[1]!.id);
    expect(ofType(events, 'targetShown')[0]).toEqual({ type: 'targetShown', ...sim.state.target });
    expect(sim.state.targets[0]).toMatchObject({ attempts: 1, correctFirstTry: true, solved: true });
    expect(sim.state.coins).toBe(30);
    expect(sim.state.palette).toContain(sim.state.target!.itemId);
    // The fall: the three cells of the bottom row were refilled from above; the moves go down one row.
    const fell = ofType(events, 'runesFell')[0]!;
    expect(fell.moves.length).toBeGreaterThan(0);
    expect(fell.moves.every((m) => m.to.row === m.from.row + 1 && m.to.col === m.from.col)).toBe(true);
    expect(fell.runes.map((r) => r.cell)).toEqual([{ row: 0, col: 1 }, { row: 0, col: 2 }, { row: 0, col: 3 }]);
    for (const { cell, rune } of fell.runes) expect(sim.state.board[cell.row]![cell.col]).toBe(rune);
    expect(findLines(sim.state.board)).toEqual([]);
    expect(findTargetMove(sim.state.board, sim.state.target!.itemId)).not.toBeNull();
  });

  it('a line of another word only clears: coins, no strike, a wrong first try', () => {
    const sim = create(6);
    const other = sim.state.targets[3]!.id;
    arrange(sim, [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 1, col: 2 }], other);
    const events = sim.dispatch({ type: 'swap', a: { row: 1, col: 2 }, b: { row: 2, col: 2 } });
    expect(ofType(events, 'linesBurst')[0]).toMatchObject({ kinds: [other], target: false });
    expect(ofType(events, 'heroStrike')).toHaveLength(0);
    expect(ofType(events, 'monsterStrike')).toHaveLength(0);
    expect(sim.state.targetIndex).toBe(0);
    expect(sim.state.targets[0]).toMatchObject({ attempts: 1, correctFirstTry: false, solved: false });
    expect(sim.state.targets[3]).toMatchObject({ attempts: 0, solved: false });
    expect(sim.state.coins).toBe(30);
    // The target's line on the second try: solved, but not on the first try.
    const target = sim.state.target!.itemId;
    arrange(sim, [{ row: 5, col: 0 }, { row: 5, col: 1 }, { row: 4, col: 2 }], target);
    sim.dispatch({ type: 'swap', a: { row: 4, col: 2 }, b: { row: 5, col: 2 } });
    expect(sim.state.targets[0]).toMatchObject({ attempts: 2, correctFirstTry: false, solved: true });
  });

  it('cascades: a second line after the fall bursts with cascade 1 and doubled coins', () => {
    const sim = create(8);
    const target = sim.state.target!.itemId;
    // A vertical target line in column 2 (rows 5 to 7) after the swap; column 2 drops by three.
    const fillers = arrange(sim, [{ row: 7, col: 2 }, { row: 6, col: 2 }, { row: 5, col: 1 }], target);
    const other = otherKey(sim, [target, ...fillers]);
    // The `other` rune at (4, 2) lands at (7, 2) between two `other` runes: a second line.
    put(sim, { row: 4, col: 2 }, other);
    put(sim, { row: 7, col: 1 }, other);
    put(sim, { row: 7, col: 3 }, other);
    expect(findLines(sim.state.board)).toEqual([]);
    const events = sim.dispatch({ type: 'swap', a: { row: 5, col: 1 }, b: { row: 5, col: 2 } });
    const bursts = ofType(events, 'linesBurst');
    expect(bursts.length).toBeGreaterThanOrEqual(2);
    expect(bursts[0]).toMatchObject({ cascade: 0, target: true, coins: 30 });
    expect(bursts[0]!.cells).toEqual([{ row: 5, col: 2 }, { row: 6, col: 2 }, { row: 7, col: 2 }]);
    expect(bursts[1]).toMatchObject({ cascade: 1, kinds: [other], coins: 60 });
    expect(bursts[1]!.cells).toEqual([{ row: 7, col: 1 }, { row: 7, col: 2 }, { row: 7, col: 3 }]);
    // One fall per burst; a placed target move may add one more `runesFell` with no moves.
    const falls = ofType(events, 'runesFell');
    expect(falls.filter((f) => f.moves.length > 0).length).toBeGreaterThanOrEqual(bursts.length);
    expect(sim.state.coins).toBe(bursts.reduce((s, b) => s + b.coins, 0));
    expect(findLines(sim.state.board)).toEqual([]);
  });

  it.each([11, 12, 13, 14, 15, 16])('seed %i: cascades happen in a bot run and every burst is a real line', (seed) => {
    const sim = create(seed);
    const events = playToEnd(sim);
    const bursts = ofType(events, 'linesBurst');
    expect(bursts.every((b) => b.cells.length >= 3 && b.kinds.length >= 1 && b.coins > 0)).toBe(true);
    expect(bursts.some((b) => b.cascade >= 1)).toBe(true);
    expect(ofType(events, 'linesBurst').filter((b) => b.target)).toHaveLength(ofType(events, 'heroStrike').length);
  });
});

describe('monsters and victory', () => {
  it('the monster changes every 4 target words: skeleton, mimic, then the fire dragon; heroes take turns', () => {
    const sim = create(9);
    expect(sim.state.monster).toEqual({ kind: 'skeleton', hp: 4, maxHp: 4 });
    const events = playToEnd(sim);
    expect(types(events).slice(0, 2)).toEqual(['monsterAppeared', 'targetShown']);
    expect(ofType(events, 'monsterAppeared').map((e) => e.kind)).toEqual([...MONSTER_KINDS]);
    expect(ofType(events, 'monsterDefeated').map((e) => e.kind)).toEqual([...MONSTER_KINDS]);
    const strikes = ofType(events, 'heroStrike');
    expect(strikes).toHaveLength(STORY.vocabulary.length);
    expect(strikes.map((s) => s.hero)).toEqual(strikes.map((_, i) => HEROES[i % 3]));
    // The mimic appears after the fourth strike, right after the skeleton falls.
    const at = events.findIndex((e) => e.type === 'monsterDefeated');
    expect(types(events.slice(at - 1, at + 2))).toEqual(['heroStrike', 'monsterDefeated', 'monsterAppeared']);
    expect(ofType(events.slice(0, at), 'heroStrike')).toHaveLength(4);
    expect(ofType(events, 'targetShown')).toHaveLength(STORY.vocabulary.length);
    expect(sim.state.monsterIndex).toBe(3);
    expect(sim.state.monster).toBeNull();
    expect(events.at(-1)).toEqual({ type: 'victory' });
    expect(sim.state.phase).toBe('victory');
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });

  it('a short story: skeleton then a mimic with 1 HP, and no dragon', () => {
    const sim = create(2, true, SHORT_STORY);
    const events = playToEnd(sim);
    expect(ofType(events, 'monsterAppeared').map((e) => [e.kind])).toEqual([['skeleton'], ['mimic']]);
    expect(sim.state.phase).toBe('victory');
  });

  it('start replays the monster and the target once', () => {
    const sim = create(1);
    expect(sim.dispatch({ type: 'start' })).toEqual([
      { type: 'monsterAppeared', kind: 'skeleton' },
      { type: 'targetShown', ...sim.state.target },
    ]);
    expect(sim.dispatch({ type: 'start' })).toEqual([]);
  });

  it('only known event types are emitted, and speed never matters (tick is empty)', () => {
    const sim = create(10);
    const events = playToEnd(sim);
    for (let i = 0; i < 100; i++) expect(sim.tick()).toEqual([]);
    expect(new Set(types(events)).size).toBeGreaterThan(6);
    expect(types(events).every((t) => RUNE_MATCH_EVENT_TYPES.includes(t))).toBe(true);
  });
});

describe('evidence and results', () => {
  it('one word item per attempted target; attempts, first try, and solved as the rules say', () => {
    const sim = create(6);
    const [w0, w1] = sim.state.targets;
    // Word 0: a wrong line first, then the target's line.
    const other = sim.state.targets[4]!.id;
    arrange(sim, [{ row: 2, col: 0 }, { row: 2, col: 1 }, { row: 1, col: 2 }], other);
    sim.dispatch({ type: 'swap', a: { row: 1, col: 2 }, b: { row: 2, col: 2 } });
    wrongSwap(sim); // a swap with no line is not an attempt
    arrange(sim, [{ row: 5, col: 0 }, { row: 5, col: 1 }, { row: 4, col: 2 }], w0!.id);
    sim.dispatch({ type: 'swap', a: { row: 4, col: 2 }, b: { row: 5, col: 2 } });
    // Word 1: the target's line on the first try.
    arrange(sim, [{ row: 5, col: 0 }, { row: 5, col: 1 }, { row: 4, col: 2 }], w1!.id);
    sim.dispatch({ type: 'swap', a: { row: 4, col: 2 }, b: { row: 5, col: 2 } });
    const evidence = evidenceOf(sim.state, STORY, 6, 12_345.6);
    expect(storyGameEvidenceSchema.parse(evidence)).toEqual(evidence);
    expect(evidence).toMatchObject({ gameId: 'rune-match', inputId: STORY.id, level: STORY.level, seed: 6, durationMs: 12346 });
    expect(evidence.items).toEqual([
      { itemId: w0!.id, itemKind: 'word', label: w0!.term, attempts: 2, correctFirstTry: false, solved: true },
      { itemId: w1!.id, itemKind: 'word', label: w1!.term, attempts: 1, correctFirstTry: true, solved: true },
    ]);
    expect(evidence.practice).toEqual([w0!.term]);
    const { results, outcome } = resultsOf(sim.state, STORY, 6, 12_345);
    expect(outcome).toBe('complete');
    expect(results).toMatchObject({ correctAnswers: 2, totalAttempts: 3, score: sim.state.coins });
    expect(results.accuracy).toBeCloseTo(2 / 3);
    expect(results.xp).toBe(Math.floor(2 * (2 / 3)));
  });

  it('a target that the student never made a line for is not an item', () => {
    const sim = create(6);
    wrongSwap(sim);
    expect(evidenceOf(sim.state, STORY, 6, 0).items).toEqual([]);
    expect(resultsOf(sim.state, STORY, 6, 0).results).toEqual({ accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 });
  });
});
