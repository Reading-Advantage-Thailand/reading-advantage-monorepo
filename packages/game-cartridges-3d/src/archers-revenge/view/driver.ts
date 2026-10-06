/**
 * The Archer's Revenge event player, shared by the 3D view and the 2D view. The core decides
 * every rule; this driver reads the events of each command in order and asks a `Presentation`
 * to show them (the enemies, the arrow, the card). The driver has no three.js and no Phaser: each
 * view gives it the `Presentation` of its renderer, and the tests give it a recorder. The
 * student's taps come back through `fire`; nothing is timed.
 */
import type { GameResults, StoryGameEvidence, StoryGameOutcome } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  HEROES,
  resultsOf,
  type ArchersRevengeEvent,
  type ArchersRevengeSimulation,
  type MonsterKind,
  type Round,
  type WaveEnemy,
} from '../core/index.js';

export interface EnemyShown {
  id: string;
  kind: MonsterKind;
  lane: number;
  defeated: boolean;
}

export type Sfx = 'pick' | 'correct' | 'wrong' | 'hit' | 'defeat' | 'victory';

/** What a renderer shows. Every method that animates returns a promise the driver awaits. */
export interface Presentation {
  setCourage(value: number, max: number): void;
  setProgress(wave: number, waveCount: number, done: number, size: number): void;
  /** The formation marches in; resolves when every enemy stands. */
  spawnWave(wave: number, waveCount: number, enemies: readonly EnemyShown[]): Promise<void>;
  /** The prompt and the lanes; `fire` is called with the lane the student taps. */
  showRound(round: Round, fire: (lane: number) => void): void;
  hideRound(): void;
  /** Colors the tapped lane (right or shielded) and resolves after a short beat. */
  markShot(lane: number, correct: boolean): Promise<void>;
  /** The arrow flies at an enemy: a right arrow lands, a wrong arrow bounces off the shield. */
  shoot(enemy: EnemyShown, correct: boolean): Promise<void>;
  enemyStrike(enemy: EnemyShown, hero: string): Promise<void>;
  rest(): Promise<void>;
  /** The whole formation falls. */
  clearWave(enemies: readonly EnemyShown[]): Promise<void>;
  /** A floating text over the card (coins). */
  cardPopup(text: string): void;
  sfx(name: Sfx): void;
  victory(): Promise<void>;
  /** Resolves when every running stage animation is over. */
  settle(): Promise<void>;
}

export interface PlayerOptions {
  sim: ArchersRevengeSimulation;
  story: { id: string; level: StoryGameEvidence['level'] };
  seed: number;
  presentation: Presentation;
  /** Reports the run once to the host. */
  complete: (results: GameResults, outcome: StoryGameOutcome, evidence: StoryGameEvidence) => void;
  now?: () => number;
}

export class ArchersRevengePlayer {
  private readonly sim: ArchersRevengeSimulation;
  private readonly p: Presentation;
  private readonly enemies = new Map<string, EnemyShown>();
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
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get finished(): boolean {
    return this.done;
  }

  /** Plays the opening events (the first formation and the first prompt). */
  async start(): Promise<void> {
    const state = this.sim.state;
    this.p.setCourage(state.courage, state.maxCourage);
    if (this.destroyed || this.busy) return;
    await this.play(this.sim.dispatch({ type: 'start' }));
  }

  /** The student shoots a lane. */
  async fire(lane: number): Promise<void> {
    if (this.busy || this.done || this.destroyed) return;
    await this.play(this.sim.dispatch({ type: 'fire', lane }));
  }

  /** Plays events from any command (the QC hook), then asks for the next input. */
  async play(events: readonly ArchersRevengeEvent[]): Promise<void> {
    if (this.destroyed) return;
    this.busy = true;
    try {
      for (const ev of events) {
        if (this.destroyed) break;
        await this.show(ev);
      }
      await this.p.settle();
    } finally {
      this.busy = false;
    }
    if (!this.done && !this.destroyed) this.showInput();
  }

  destroy(): void {
    this.destroyed = true;
  }

  /** Shows what the student acts on now: the prompt and its lanes. */
  showInput(): void {
    const state = this.sim.state;
    if (state.phase !== 'playing' || !state.round) return;
    this.p.setProgress(state.wave, state.waveCount, state.waveDone, state.waveSize);
    this.p.showRound(state.round, (lane) => void this.fire(lane));
  }

  private shown(e: WaveEnemy): EnemyShown {
    const s: EnemyShown = { id: e.id, kind: e.kind, lane: e.lane, defeated: false };
    this.enemies.set(e.id, s);
    return s;
  }

  // ---------------------------------------------------------------- one event

  private async show(ev: ArchersRevengeEvent): Promise<void> {
    const p = this.p;
    switch (ev.type) {
      case 'waveAppeared': {
        await p.settle();
        this.enemies.clear();
        const list = ev.enemies.map((e) => this.shown(e));
        await p.spawnWave(ev.wave, ev.waveCount, list);
        break;
      }
      case 'roundShown':
        // The round is shown by `showInput` once the events are played.
        break;
      case 'shot': {
        const enemy = this.enemies.get(ev.enemyId);
        p.sfx('pick');
        await p.markShot(ev.lane, ev.correct);
        p.hideRound();
        p.sfx(ev.correct ? 'correct' : 'wrong');
        if (enemy) await p.shoot(enemy, ev.correct);
        break;
      }
      case 'scored':
        p.cardPopup(`+${ev.coins}`);
        break;
      case 'enemyStrike': {
        const enemy = this.enemies.get(ev.enemyId);
        await p.settle();
        if (enemy) await p.enemyStrike(enemy, HEROES[this.strikes % HEROES.length]!);
        this.strikes += 1;
        p.setCourage(ev.courage, this.sim.state.maxCourage);
        break;
      }
      case 'rest':
        p.setCourage(ev.courage, this.sim.state.maxCourage);
        await p.rest();
        break;
      case 'waveCleared': {
        await p.settle();
        const list = ev.enemies.map((e) => this.enemies.get(e.id) ?? this.shown(e));
        p.sfx('defeat');
        await p.clearWave(list);
        for (const e of list) e.defeated = true;
        break;
      }
      case 'rejected':
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
}
