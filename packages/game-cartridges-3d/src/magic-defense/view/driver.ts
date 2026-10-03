/**
 * The Magic Defense event player, shared by the 3D view and the 2D view. The core decides
 * every rule; this driver reads the events of each command in order and asks a `Presentation`
 * to show them (the enemies, the spell, the card). The driver has no three.js and no Phaser: each
 * view gives it the `Presentation` of its renderer, and the tests give it a recorder. The
 * student's taps come back through `cast` and `storm`; nothing is timed.
 */
import type { GameResults, StoryGameEvidence, StoryGameOutcome } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  wardOf,
  resultsOf,
  type MagicDefenseEvent,
  type MagicDefenseSimulation,
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

export type Sfx = 'pick' | 'correct' | 'wrong' | 'hit' | 'defeat' | 'victory' | 'storm';

/** What a renderer shows. Every method that animates returns a promise the driver awaits. */
export interface Presentation {
  setCastles(castles: readonly number[], max: number): void;
  setMana(value: number, max: number): void;
  setProgress(wave: number, waveCount: number, done: number, size: number): void;
  /** The formation marches in; resolves when every enemy stands. */
  spawnWave(wave: number, waveCount: number, enemies: readonly EnemyShown[]): Promise<void>;
  /** The missile (its meaning, over the enemy that cast it) and the spell words; `cast` is called with the choice the student taps. */
  showRound(round: Round, cast: (choice: number) => void): void;
  hideRound(): void;
  /** Colors the chosen spell word (right or failed) and resolves after a short beat. */
  markCast(choice: number, correct: boolean): Promise<void>;
  /** The counter spell flies at the casting enemy: a right spell lands, a wrong spell fizzles. */
  castSpell(enemy: EnemyShown, correct: boolean): Promise<void>;
  /** The missile of a failed spell hits the castle guarded by `hero`. */
  castleHit(enemy: EnemyShown, hero: string, castle: number, health: number): Promise<void>;
  rest(): Promise<void>;
  /** The storm mends the castles. */
  storm(): Promise<void>;
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
  sim: MagicDefenseSimulation;
  story: { id: string; level: StoryGameEvidence['level'] };
  seed: number;
  presentation: Presentation;
  /** Reports the run once to the host. */
  complete: (results: GameResults, outcome: StoryGameOutcome, evidence: StoryGameEvidence) => void;
  now?: () => number;
}

export class MagicDefensePlayer {
  private readonly sim: MagicDefenseSimulation;
  private readonly p: Presentation;
  private readonly enemies = new Map<string, EnemyShown>();
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
    this.p.setCastles(state.castles, state.maxCastleHealth);
    this.p.setMana(state.mana, state.maxMana);
    if (this.destroyed || this.busy) return;
    await this.play(this.sim.dispatch({ type: 'start' }));
  }

  /** The student chooses a spell word. */
  async cast(choice: number): Promise<void> {
    if (this.busy || this.done || this.destroyed) return;
    await this.play(this.sim.dispatch({ type: 'cast', choice }));
  }

  /** The student calls a full storm. */
  async storm(): Promise<void> {
    if (this.busy || this.done || this.destroyed) return;
    await this.play(this.sim.dispatch({ type: 'storm' }));
  }

  /** Plays events from any command (the QC hook), then asks for the next input. */
  async play(events: readonly MagicDefenseEvent[]): Promise<void> {
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

  /** Shows what the student acts on now: the missile and its spell words. */
  showInput(): void {
    const state = this.sim.state;
    if (state.phase !== 'playing' || !state.round) return;
    this.p.setProgress(state.wave, state.waveCount, state.waveDone, state.waveSize);
    this.p.showRound(state.round, (choice) => void this.cast(choice));
  }

  private shown(e: WaveEnemy): EnemyShown {
    const s: EnemyShown = { id: e.id, kind: e.kind, lane: e.lane, defeated: false };
    this.enemies.set(e.id, s);
    return s;
  }

  // ---------------------------------------------------------------- one event

  private async show(ev: MagicDefenseEvent): Promise<void> {
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
      case 'cast': {
        const enemy = this.enemies.get(ev.enemyId);
        p.sfx('pick');
        await p.markCast(ev.choice, ev.correct);
        p.hideRound();
        p.sfx(ev.correct ? 'correct' : 'wrong');
        if (enemy) await p.castSpell(enemy, ev.correct);
        break;
      }
      case 'scored':
        p.cardPopup(`+${ev.coins}`);
        p.setMana(ev.mana, this.sim.state.maxMana);
        break;
      case 'castleHit': {
        const enemy = this.enemies.get(ev.enemyId);
        await p.settle();
        if (enemy) await p.castleHit(enemy, wardOf(ev.castle), ev.castle, ev.health);
        const castles = [...this.sim.state.castles];
        castles[ev.castle] = ev.health;
        p.setCastles(castles, this.sim.state.maxCastleHealth);
        break;
      }
      case 'rest':
        p.setCastles(ev.castles, this.sim.state.maxCastleHealth);
        await p.rest();
        break;
      case 'stormCast':
        p.sfx('storm');
        p.setMana(this.sim.state.mana, this.sim.state.maxMana);
        await p.storm();
        p.setCastles(ev.castles, this.sim.state.maxCastleHealth);
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
