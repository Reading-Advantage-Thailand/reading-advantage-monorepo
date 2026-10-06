/**
 * The Paladin's Twin Soul event player, shared by the 3D view and the 2D view. The core decides
 * every rule; this driver asks the student for a shade, sends the strike, and reads the events
 * in order, asking a `Presentation` to show them (the card, the battle stage, the HUD). The
 * driver has no three.js and no Phaser: each view gives it the `Presentation` of its renderer,
 * and the tests give it a recorder. Nothing here is timed.
 */
import type { GameResults, StoryGameEvidence, StoryGameOutcome } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  HEROES,
  TUNING,
  monstersOf,
  resultsOf,
  type HeroId,
  type Monster,
  type MonsterKind,
  type TwinSoulEvent,
  type TwinSoulSimulation,
} from '../core/index.js';

export interface MonsterShown {
  id: string;
  kind: MonsterKind;
  hp: number;
  maxHp: number;
  defeated: boolean;
}

export interface WaveShown {
  translation: string;
  /** The shades still standing, in formation order. */
  shades: { id: string; term: string }[];
  /** True after a wrong shade fell in this wave. */
  retry: boolean;
}

export type Sfx = 'reject' | 'freed' | 'hit' | 'defeat' | 'victory' | 'spawn';

/** What a renderer shows. Every method that animates returns a promise the driver awaits. */
export interface Presentation {
  /** Shows the card with the meaning and the shades; resolves with the id of the tapped shade. */
  ask(wave: WaveShown): Promise<string>;
  setCourage(value: number, max: number): void;
  setTwins(freed: number, total: number): void;
  setPlace(index: number, count: number, kind: MonsterKind): void;
  /** A monster enters (replaces the old one). */
  spawn(monster: MonsterShown): Promise<void>;
  setMonsterHp(monster: MonsterShown): void;
  /** The captor shade seizes the twin soul (a floating note over the paladin). */
  captured(): void;
  /** A wrong shade falls (marked on the card). */
  shadeFell(shade: string): Promise<void>;
  /** The captor falls and the soul is free (marked on the card). */
  soulFreed(shade: string, points: number, firstTry: boolean): Promise<void>;
  /** The other shades scatter and the card goes. */
  scatter(): Promise<void>;
  heroStrike(hero: HeroId, monster: MonsterShown, damage: number): Promise<void>;
  monsterHit(monster: MonsterShown): Promise<void>;
  monsterDefeated(monster: MonsterShown): Promise<void>;
  monsterStrike(monster: MonsterShown, hero: HeroId): Promise<void>;
  rest(): Promise<void>;
  sfx(name: Sfx): void;
  victory(): Promise<void>;
  /** Resolves when every running stage animation is over. */
  settle(): Promise<void>;
}

export interface PlayerOptions {
  sim: TwinSoulSimulation;
  story: { id: string; level: StoryGameEvidence['level'] };
  seed: number;
  presentation: Presentation;
  /** Reports the run once to the host. */
  complete: (results: GameResults, outcome: StoryGameOutcome, evidence: StoryGameEvidence) => void;
  now?: () => number;
}

export class TwinSoulPlayer {
  private readonly sim: TwinSoulSimulation;
  private readonly p: Presentation;
  private readonly monsters: Monster[];
  private monster: MonsterShown | null = null;
  private monsterNumber = 0;
  private strikes = 0;
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

  get finished(): boolean {
    return this.done;
  }

  /** Plays the opening events, then asks for a shade until the last soul is free. */
  async start(): Promise<void> {
    const state = this.sim.state;
    this.p.setCourage(state.courage, state.maxCourage);
    this.p.setTwins(state.twins, state.targetCount);
    await this.play(this.sim.dispatch({ type: 'start' }));
    while (!this.done && !this.destroyed && this.sim.state.phase === 'playing') {
      const wave = this.sim.state;
      const id = await this.p.ask({
        translation: wave.target?.translation ?? '',
        shades: wave.shades.filter((s) => !s.fallen).map((s) => ({ id: s.id, term: s.term })),
        retry: wave.shades.some((s) => s.fallen),
      });
      if (this.destroyed) break;
      await this.play(this.sim.dispatch({ type: 'strike', shade: id }));
    }
  }

  destroy(): void {
    this.destroyed = true;
  }

  /** Plays events from any command (the tests and the QC hook). */
  async play(events: readonly TwinSoulEvent[]): Promise<void> {
    for (const ev of events) {
      if (this.destroyed) return;
      await this.show(ev);
    }
    await this.p.settle();
  }

  private async show(ev: TwinSoulEvent): Promise<void> {
    const state = this.sim.state;
    const p = this.p;
    switch (ev.type) {
      case 'waveShown':
        break;
      case 'captured':
        p.captured();
        break;
      case 'shadeFell':
        p.sfx('reject');
        await p.shadeFell(ev.shade);
        break;
      case 'strikeRejected':
        p.sfx('reject');
        break;
      case 'soulFreed':
        p.sfx('freed');
        p.setTwins(ev.twins, state.targetCount);
        await p.soulFreed(ev.shade, ev.points, ev.firstTry);
        break;
      case 'shadesScattered':
        await p.scatter();
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
        p.sfx('spawn');
        await p.spawn(this.monster);
        break;
      }
      case 'monsterStrike': {
        const m = this.monster;
        await p.settle();
        if (m) await p.monsterStrike(m, HEROES[this.strikes % HEROES.length]!);
        this.strikes += 1;
        p.setCourage(ev.courage, state.maxCourage);
        break;
      }
      case 'rest':
        p.setCourage(ev.courage, state.maxCourage);
        await p.rest();
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
