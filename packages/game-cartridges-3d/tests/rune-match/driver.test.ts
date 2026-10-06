/** The view driver plays the core events: a fake board mirrors the animations and must match the state. */
import { describe, expect, it } from 'vitest';
import type { Cell } from '../../src/rune-match/core/index.js';
import { isNeighbor, findLines } from '../../src/rune-match/core/index.js';
import { RuneMatchPlayer, type BoardCell, type BoardView, type Presentation } from '../../src/rune-match/view/driver.js';
import { nextSwap } from '../../src/rune-match/qc/bot.js';
import { SHORT_STORY, create } from './helpers.js';

class FakeBoard implements BoardView {
  enabled = true;
  tiles = new Map<string, Cell>();
  set(board: readonly (readonly BoardCell[])[]): void {
    this.tiles.clear();
    board.forEach((row, r) => row.forEach((c, col) => this.tiles.set(c.id, { row: r, col })));
  }
  restyle(): void {}
  private at(c: Cell): string {
    for (const [id, p] of this.tiles) if (p.row === c.row && p.col === c.col) return id;
    throw new Error(`no tile at ${c.row},${c.col}`);
  }
  async swap(a: Cell, b: Cell, back = false): Promise<void> {
    expect(isNeighbor(a, b)).toBe(true);
    if (back) return; // there and back: same layout
    const ia = this.at(a);
    const ib = this.at(b);
    this.tiles.set(ia, { ...b });
    this.tiles.set(ib, { ...a });
  }
  async burst(cells: readonly Cell[]): Promise<void> {
    for (const c of cells) this.tiles.delete(this.at(c));
  }
  async fall(moves: readonly { from: Cell; to: Cell }[], added: readonly { cell: Cell; rune: BoardCell }[]): Promise<void> {
    const moving = moves.map((m) => [this.at(m.from), m.to] as const);
    for (const [id, to] of moving) this.tiles.set(id, { ...to });
    for (const a of added) this.tiles.set(a.rune.id, { ...a.cell });
  }
}

function harness(seed: number, helper = false) {
  const sim = create(seed, helper, SHORT_STORY);
  const board = new FakeBoard();
  const log: string[] = [];
  const done: unknown[] = [];
  const p: Presentation = {
    board,
    showTarget: (t) => log.push(`target:${t}`),
    setCourage: (v) => log.push(`courage:${v}`),
    setShield: (on) => log.push(`shield:${on}`),
    setPlace: (i, n, k) => log.push(`place:${i}/${n}:${k}`),
    spawn: async (m) => void log.push(`spawn:${m.kind}`),
    setMonsterHp: (m) => log.push(`hp:${m.hp}`),
    heroStrike: async (h) => void log.push(`strike:${h}`),
    monsterHit: async () => void log.push('hit'),
    monsterDefeated: async (m) => void log.push(`defeated:${m.kind}`),
    monsterStrike: async (_m, h, blocked) => void log.push(`mstrike:${h}:${blocked}`),
    heal: () => log.push('heal'),
    rest: async () => void log.push('rest'),
    boardPopup: (t) => log.push(`coins:${t}`),
    sfx: () => undefined,
    victory: async () => void log.push('victory'),
    settle: async () => undefined,
  };
  const player = new RuneMatchPlayer({ sim, story: SHORT_STORY, seed, presentation: p, complete: (r, o, e) => done.push([r, o, e]), now: () => 0 });
  return { sim, board, log, done, player };
}

const layout = (board: FakeBoard, ids: string[][]): boolean =>
  ids.every((row, r) => row.every((id, c) => board.tiles.get(id)?.row === r && board.tiles.get(id)?.col === c)) && board.tiles.size === ids.length * ids[0]!.length;

describe('driver', () => {
  it.each([1, 2, 3])('seed %i: the bot plays to victory, the fake board always equals the state, complete is called once', async (seed) => {
    const { sim, board, log, done, player } = harness(seed, seed === 2);
    await player.start();
    expect(log.some((l) => l.startsWith('spawn:'))).toBe(true);
    expect(log.some((l) => l.startsWith('target:'))).toBe(true);
    for (let i = 0; i < 400 && !player.finished; i++) {
      const cmd = nextSwap(sim.state);
      if (!cmd || cmd.type !== 'swap') break;
      await player.swap(cmd.a, cmd.b);
      expect(layout(board, sim.state.board.map((row) => row.map((r) => r.id)))).toBe(true);
    }
    expect(sim.state.phase).toBe('victory');
    expect(player.finished).toBe(true);
    expect(done).toHaveLength(1);
    expect(log.filter((l) => l === 'victory')).toHaveLength(1);
    expect(log.filter((l) => l.startsWith('strike:')).length).toBe(SHORT_STORY.vocabulary.length);
    expect(log.filter((l) => l.startsWith('defeated:')).length).toBe(sim.state.monsterIndex + 1 > 0 ? log.filter((l) => l.startsWith('spawn:')).length : 0);
  });

  it('a wrong swap goes there and back, the monster strikes, and courage drops', async () => {
    const { sim, board, log, player } = harness(5);
    await player.start();
    const b = sim.state.board;
    let wrong: [Cell, Cell] | null = null;
    outer: for (let r = 0; r < b.length; r++)
      for (let c = 0; c + 1 < b[0]!.length; c++) {
        const copy = b.map((row) => [...row]);
        [copy[r]![c], copy[r]![c + 1]] = [copy[r]![c + 1]!, copy[r]![c]!];
        if (findLines(copy).length === 0) {
          wrong = [{ row: r, col: c }, { row: r, col: c + 1 }];
          break outer;
        }
      }
    expect(wrong).not.toBeNull();
    const before = sim.state.courage;
    log.length = 0;
    await player.swap(wrong![0], wrong![1]);
    expect(sim.state.courage).toBe(before - 1);
    expect(log).toContain(`courage:${before - 1}`);
    expect(log.some((l) => l.startsWith('mstrike:'))).toBe(true);
    expect(layout(board, sim.state.board.map((row) => row.map((r) => r.id)))).toBe(true);
    expect(board.enabled).toBe(true);
  });

  it('ignores a swap while another plays and after the end', async () => {
    const { sim, player, done } = harness(3);
    await player.start();
    const cmd = nextSwap(sim.state)!;
    if (cmd.type !== 'swap') throw new Error('swap expected');
    const first = player.swap(cmd.a, cmd.b);
    await player.swap(cmd.a, cmd.b); // busy: ignored
    await first;
    expect(sim.state.swaps).toBe(1);
    expect(done).toHaveLength(0);
  });
});
