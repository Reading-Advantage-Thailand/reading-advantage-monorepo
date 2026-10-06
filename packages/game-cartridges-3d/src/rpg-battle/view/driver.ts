/**
 * The RPG Battle event player, shared by the 3D view and the 2D view. The core decides every
 * rule; this driver reads the events of each command in order and asks a `Presentation` to show
 * them (the card, the battle stage, the HUD). The driver has no three.js and no Phaser: each view
 * gives it the `Presentation` of its renderer, and the tests give it a recorder. The student's
 * taps come back through `pick`, `answer`, and `back`; nothing is timed.
 */
import type { GameResults, StoryGameEvidence, StoryGameOutcome } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  HEROES,
  damageOf,
  monstersOf,
  resultsOf,
  TUNING,
  type ActionKind,
  type Card,
  type HeroId,
  type Monster,
  type MonsterKind,
  type Power,
  type Question,
  type RpgBattleCommand,
  type RpgBattleEvent,
  type RpgBattleSimulation,
} from '../core/index.js';

export interface MonsterShown {
  id: string;
  kind: MonsterKind;
  hp: number;
  maxHp: number;
  defeated: boolean;
}

export type Sfx = 'pick' | 'correct' | 'wrong' | 'heal' | 'hit' | 'defeat' | 'victory';

/** What a renderer shows. Every method that animates returns a promise the driver awaits. */
export interface Presentation {
  setCourage(value: number, max: number): void;
  setPlace(index: number, count: number, kind: MonsterKind): void;
  /** The hand of word cards; `pick` is called with the card id the student taps. */
  showHand(cards: readonly Card[], pick: (cardId: string) => void): void;
  /** The question of the played card; `back` returns the card. */
  showQuestion(question: Question, card: Card, answer: (optionId: string) => void, back: () => void): void;
  hideCard(): void;
  /** Marks the answer; a wrong answer shows the right one and resolves when the student continues. */
  feedback(question: Question, optionId: string, correct: boolean, correctText: string): Promise<void>;
  spawn(monster: MonsterShown): Promise<void>;
  setMonsterHp(monster: MonsterShown): void;
  /** The hero strikes; resolves when the blow lands. The return to place may continue (see `settle`). */
  heroStrike(hero: HeroId, monster: MonsterShown, damage: number, action: ActionKind, power: Power): Promise<void>;
  monsterHit(monster: MonsterShown): Promise<void>;
  monsterDefeated(monster: MonsterShown): Promise<void>;
  monsterStrike(monster: MonsterShown, hero: HeroId): Promise<void>;
  heal(hero: HeroId, amount: number): void;
  rest(): Promise<void>;
  /** A floating text over the card (coins, combo). */
  cardPopup(text: string): void;
  sfx(name: Sfx): void;
  victory(): Promise<void>;
  /** Resolves when every running stage animation is over. */
  settle(): Promise<void>;
}

export interface PlayerOptions {
  sim: RpgBattleSimulation;
  story: { id: string; level: StoryGameEvidence['level'] };
  seed: number;
  presentation: Presentation;
  /** Reports the run once to the host. */
  complete: (results: GameResults, outcome: StoryGameOutcome, evidence: StoryGameEvidence) => void;
  now?: () => number;
}

export class RpgBattlePlayer {
  private readonly sim: RpgBattleSimulation;
  private readonly p: Presentation;
  private readonly monsters: Monster[];
  private monster: MonsterShown | null = null;
  private monsterNumber = 0;
  /** Damage of a strike beyond the monster that fell: it carries to the next monster. */
  private carry = 0;
  private strikes = 0;
  private courage = 0;
  private lastQuestion: Question | null = null;
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
    const words = this.sim.state.targets;
    this.monsters = monstersOf(words.map((w) => damageOf(w, TUNING.basicDamage, TUNING.powerDamage)), TUNING.wordsPerMonster);
  }

  get isBusy(): boolean {
    return this.busy;
  }

  get finished(): boolean {
    return this.done;
  }

  /** Plays the opening events (the first monster and the hand). */
  async start(): Promise<void> {
    const state = this.sim.state;
    this.setCourage(state.courage);
    await this.command({ type: 'start' });
  }

  /** The student plays a card. */
  pick(cardId: string): Promise<void> {
    return this.command({ type: 'play', cardId });
  }

  /** The student answers the question. */
  answer(optionId: string): Promise<void> {
    return this.command({ type: 'answer', optionId });
  }

  /** The student puts the card back. */
  back(): Promise<void> {
    return this.command({ type: 'cancel' });
  }

  private async command(command: RpgBattleCommand): Promise<void> {
    if (this.busy || this.done || this.destroyed) return;
    await this.play(this.sim.dispatch(command));
  }

  /** Plays events from any command (the QC hook), then asks for the next input. */
  async play(events: readonly RpgBattleEvent[]): Promise<void> {
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

  private setCourage(value: number): void {
    this.courage = value;
    this.p.setCourage(value, this.sim.state.maxCourage);
  }

  destroy(): void {
    this.destroyed = true;
  }

  /** Shows what the student acts on now: the question of a played card, else the hand. */
  showInput(): void {
    const state = this.sim.state;
    if (state.phase !== 'playing') return;
    const q = state.question;
    if (q) {
      const card = state.hand.find((c) => c.id === q.cardId);
      if (card) this.p.showQuestion(q, card, (id) => void this.answer(id), () => void this.back());
      return;
    }
    this.p.showHand(state.hand, (id) => void this.pick(id));
  }

  // ---------------------------------------------------------------- one event

  private async show(ev: RpgBattleEvent): Promise<void> {
    const state = this.sim.state;
    const p = this.p;
    switch (ev.type) {
      case 'handShown':
        // The hand is shown by `showInput` once the events are played.
        break;
      case 'cardPlayed':
        this.lastQuestion = ev.question;
        p.sfx('pick');
        break;
      case 'cardReturned':
        p.sfx('pick');
        p.hideCard();
        break;
      case 'answered':
        if (this.lastQuestion) await p.feedback(this.lastQuestion, ev.optionId, ev.correct, ev.correctText);
        p.sfx(ev.correct ? 'correct' : 'wrong');
        p.hideCard();
        break;
      case 'heroStrike': {
        const m = this.monster;
        if (!m) break;
        await p.settle();
        await p.heroStrike(ev.hero, m, ev.damage, ev.action, ev.power);
        const taken = Math.min(m.hp, ev.damage);
        this.carry = ev.damage - taken;
        m.hp -= taken;
        p.setMonsterHp(m);
        p.cardPopup(`+${ev.coins}`);
        if (m.hp > 0) await p.monsterHit(m);
        break;
      }
      case 'heal':
        p.sfx('heal');
        p.heal('cleric', ev.courage - this.courage);
        this.setCourage(ev.courage);
        break;
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
        if (this.carry > 0) {
          this.monster.hp = Math.max(0, this.monster.hp - this.carry);
          this.carry = 0;
          p.setMonsterHp(this.monster);
        }
        break;
      }
      case 'monsterStrike': {
        const m = this.monster;
        await p.settle();
        if (m) await p.monsterStrike(m, HEROES[this.strikes % HEROES.length]!);
        this.strikes += 1;
        this.setCourage(ev.courage);
        break;
      }
      case 'rest':
        this.setCourage(ev.courage);
        await p.rest();
        break;
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
