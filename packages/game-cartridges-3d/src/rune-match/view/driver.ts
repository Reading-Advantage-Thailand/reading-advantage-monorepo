/**
 * The Rune Match event player, shared by the 3D view and the 2D view. The core decides every
 * rule; this driver reads the events of each swap in order and asks a `Presentation` to show
 * them (board animations, the battle stage, the HUD). The driver has no three.js and no Phaser:
 * each view gives it the `Presentation` of its renderer, and the tests give it a recorder.
 */
import type { StoryGameEvidence, StoryGameOutcome, GameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  HEROES,
  TUNING,
  monstersOf,
  resultsOf,
  type Cell,
  type HeroId,
  type Monster,
  type MonsterKind,
  type Rune,
  type RuneMatchEvent,
  type RuneMatchSimulation,
  type RuneMatchState,
} from '../core/index.js';

export interface BoardCell {
  id: string;
  text: string;
  color: number;
  glow?: boolean;
}

/** What the driver needs from a swap board (the HTML `Board` and the Phaser `Board2D` both fit). */
export interface BoardView {
  enabled: boolean;
  set(board: readonly (readonly BoardCell[])[]): void;
  restyle(board: readonly (readonly BoardCell[])[]): void;
  swap(a: Cell, b: Cell, back?: boolean): Promise<void>;
  burst(cells: readonly Cell[]): Promise<void>;
  fall(moves: readonly { from: Cell; to: Cell }[], added: readonly { cell: Cell; rune: BoardCell }[]): Promise<void>;
}

export interface MonsterShown {
  id: string;
  kind: MonsterKind;
  hp: number;
  maxHp: number;
  defeated: boolean;
}

export type Sfx = 'swap' | 'burst' | 'reject' | 'heal' | 'shield' | 'hit' | 'defeat' | 'victory';

/** What a renderer shows. Every method that animates returns a promise the driver awaits. */
export interface Presentation {
  board: BoardView;
  showTarget(term: string): void;
  setCourage(value: number, max: number): void;
  setShield(on: boolean): void;
  setPlace(index: number, count: number, kind: MonsterKind): void;
  /** A monster enters (replaces the old one). */
  spawn(monster: MonsterShown): Promise<void>;
  setMonsterHp(monster: MonsterShown): void;
  /** The hero strikes; resolves when the blow lands. The return to place may continue (see `settle`). */
  heroStrike(hero: HeroId, monster: MonsterShown, damage: number): Promise<void>;
  monsterHit(monster: MonsterShown): Promise<void>;
  monsterDefeated(monster: MonsterShown): Promise<void>;
  monsterStrike(monster: MonsterShown, hero: HeroId, blocked: boolean): Promise<void>;
  heal(hero: HeroId): void;
  rest(): Promise<void>;
  /** A floating text over the board (coins of a line). */
  boardPopup(text: string): void;
  sfx(name: Sfx): void;
  victory(): Promise<void>;
  /** Resolves when every running stage animation is over. */
  settle(): Promise<void>;
}

export interface PlayerOptions {
  sim: RuneMatchSimulation;
  story: { id: string; level: StoryGameEvidence['level'] };
  seed: number;
  presentation: Presentation;
  /** Reports the run once to the host. */
  complete: (results: GameResults, outcome: StoryGameOutcome, evidence: StoryGameEvidence) => void;
  now?: () => number;
}

/** Colors of the word runes, one per palette slot; the power runes have their own. */
export const WORD_COLORS = [0xe8833a, 0x8b5cf6, 0x2fa56a, 0xc9a227, 0x0f9fae, 0xd4577f] as const;
export const HEAL_COLOR = 0xe0455f;
export const SHIELD_COLOR = 0x3f6fdc;
const OLD_COLOR = 0x6b7280;

export class RuneMatchPlayer {
  private readonly sim: RuneMatchSimulation;
  private readonly p: Presentation;
  private readonly colors = new Map<string, number>();
  private readonly monsters: Monster[];
  private monster: MonsterShown | null = null;
  private monsterNumber = 0;
  private targetId = '';
  private strikes = 0;
  private busy = false;
  private done = false;
  private destroyed = false;
  private readonly startedAt: number;
  private readonly now: () => number;

  constructor(private readonly o: PlayerOptions) {
    this.sim = o.sim;
    this.p = o.presentation;
    this.now = o.now ?? (() => performance.now());
    this.startedAt = this.now();
    this.monsters = monstersOf(this.sim.state.targetCount, TUNING.wordsPerMonster);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get finished(): boolean {
    return this.done;
  }

  /** Shows the first board and plays the opening events (the first monster and word). */
  async start(): Promise<void> {
    const state = this.sim.state;
    this.p.setCourage(state.courage, state.maxCourage);
    this.p.setShield(state.shield);
    this.p.board.set(this.cells(state.board));
    await this.play(this.sim.dispatch({ type: 'start' }));
  }

  /** The student asks for a swap; ignored while a swap plays or after the end. */
  async swap(a: Cell, b: Cell): Promise<void> {
    if (this.busy || this.done || this.destroyed) return;
    await this.play(this.sim.dispatch({ type: 'swap', a, b }));
  }

  /** Plays events from any command (the QC hook). */
  async play(events: readonly RuneMatchEvent[]): Promise<void> {
    if (this.destroyed) return;
    this.busy = true;
    this.p.board.enabled = false;
    try {
      const queue = [...events];
      while (queue.length && !this.destroyed) {
        const ev = queue.shift()!;
        if (ev.type === 'swapped' && queue[0]?.type === 'swapped') {
          queue.shift();
          this.p.sfx('swap');
          await this.p.board.swap(ev.a, ev.b, true);
          continue;
        }
        await this.show(ev);
      }
      await this.p.settle();
    } finally {
      this.busy = false;
      this.p.board.enabled = !this.done;
    }
  }

  destroy(): void {
    this.destroyed = true;
  }

  // ---------------------------------------------------------------- one event

  private async show(ev: RuneMatchEvent): Promise<void> {
    const state = this.sim.state;
    const p = this.p;
    switch (ev.type) {
      case 'targetShown':
        this.targetId = ev.itemId;
        p.showTarget(ev.term);
        if (state.helper) p.board.restyle(this.cells(state.board));
        break;
      case 'swapped':
        p.sfx('swap');
        await p.board.swap(ev.a, ev.b);
        break;
      case 'swapRejected':
        p.sfx('reject');
        break;
      case 'linesBurst':
        p.sfx('burst');
        await p.board.burst(ev.cells);
        if (ev.coins > 0) p.boardPopup(`+${ev.coins}`);
        break;
      case 'runesFell':
        if (ev.moves.length === 0 && ev.runes.length > 0) {
          // A guaranteed move: the core wrote runes over the board. Show the settled board.
          p.board.set(this.cells(state.board));
        } else {
          await p.board.fall(ev.moves, ev.runes.map((r) => ({ cell: r.cell, rune: this.cellOf(r.rune) })));
        }
        break;
      case 'heroStrike': {
        const m = this.monster;
        if (!m) break;
        await p.settle();
        await p.heroStrike(ev.hero, m, ev.damage);
        m.hp = Math.max(0, m.hp - ev.damage);
        p.setMonsterHp(m);
        if (m.hp > 0) await p.monsterHit(m);
        break;
      }
      case 'monsterDefeated': {
        const m = this.monster;
        if (!m) break;
        m.defeated = true;
        m.hp = 0;
        p.setMonsterHp(m);
        p.sfx('defeat');
        await p.monsterDefeated(m);
        break;
      }
      case 'monsterAppeared': {
        await p.settle();
        const info = this.monsters[this.monsterNumber];
        this.monsterNumber += 1;
        this.monster = { id: `${ev.kind}-${this.monsterNumber}`, kind: ev.kind, hp: info?.hp ?? 1, maxHp: info?.maxHp ?? 1, defeated: false };
        p.setPlace(this.monsterNumber, Math.max(this.monsters.length, this.monsterNumber), ev.kind);
        await p.spawn(this.monster);
        break;
      }
      case 'monsterStrike': {
        const m = this.monster;
        await p.settle();
        if (m) await p.monsterStrike(m, HEROES[this.strikes % HEROES.length]!, ev.blocked);
        this.strikes += 1;
        p.setCourage(ev.courage, state.maxCourage);
        if (ev.blocked) p.setShield(false);
        break;
      }
      case 'rest':
        p.setCourage(ev.courage, state.maxCourage);
        await p.rest();
        break;
      case 'heal':
        p.sfx('heal');
        p.heal('cleric');
        p.setCourage(ev.courage, state.maxCourage);
        break;
      case 'shield':
        p.sfx('shield');
        p.setShield(true);
        break;
      case 'victory':
        await p.settle();
        p.sfx('victory');
        await p.victory();
        this.finish();
        break;
    }
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    const { evidence, results, outcome } = resultsOf(this.sim.state, this.o.story, this.o.seed, this.now() - this.startedAt);
    this.o.complete(results, outcome, evidence);
  }

  // ---------------------------------------------------------------- board to cells

  private colorOf(wordId: string): number {
    const known = this.colors.get(wordId);
    if (known !== undefined) return known;
    const state: RuneMatchState = this.sim.state;
    // Colors in use by words that are on the palette now stay taken; the first free one is new.
    const taken = new Set<number>();
    for (const id of state.palette) {
      const c = this.colors.get(id);
      if (c !== undefined && id !== wordId) taken.add(c);
    }
    const free = WORD_COLORS.find((c) => !taken.has(c));
    const color = free ?? OLD_COLOR;
    this.colors.set(wordId, color);
    return color;
  }

  /** The look of one rune. */
  cellOf(rune: Rune): BoardCell {
    if (rune.kind === 'heal') return { id: rune.id, text: '❤', color: HEAL_COLOR };
    if (rune.kind === 'shield') return { id: rune.id, text: '🛡', color: SHIELD_COLOR };
    const wordId = rune.wordId ?? rune.id;
    const glow = this.sim.state.helper && wordId === this.targetId;
    return { id: rune.id, text: rune.text ?? wordId, color: this.colorOf(wordId), ...(glow ? { glow: true } : {}) };
  }

  cells(board: readonly (readonly Rune[])[]): BoardCell[][] {
    // Give the palette its colors first, in slot order, so the colors are stable.
    for (const id of this.sim.state.palette) this.colorOf(id);
    return board.map((row) => row.map((rune) => this.cellOf(rune)));
  }
}
