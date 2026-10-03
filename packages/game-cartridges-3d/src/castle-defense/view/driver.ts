/**
 * The Castle Defense event player, shared by the 3D view and the 2D view. The core decides
 * every rule; this driver reads the events of each command in order and asks a `Presentation`
 * to show them (the attackers, the card, the towers). The driver has no three.js and no Phaser:
 * each view gives it the `Presentation` of its renderer, and the tests give it a recorder. The
 * student's taps come back through `pick` and `build`; nothing is timed.
 */
import type { GameResults, StoryGameEvidence, StoryGameOutcome } from '@reading-advantage/advantage-play-kit-3d/contracts';
import {
  resultsOf,
  type Attacker,
  type CastleDefenseEvent,
  type CastleDefenseSimulation,
  type HeroId,
  type Post,
  type Step,
} from '../core/index.js';

export interface AttackerShown {
  id: string;
  kind: Attacker['kind'];
  lane: number;
  hits: number;
  maxHits: number;
  defeated: boolean;
}

export interface ShotShown {
  post: number;
  hero: HeroId;
  attacker: AttackerShown;
  hits: number;
  fell: boolean;
}

export type Sfx = 'pick' | 'correct' | 'wrong' | 'hit' | 'defeat' | 'victory' | 'tower';

/** What the student works on now: the meaning, the words built, and the words to choose from. */
export interface StepShown {
  translation: string | undefined;
  step: Step;
  built: readonly string[];
  /** The number of words of the sentence. */
  total: number;
}

/** What a renderer shows. Every method that animates returns a promise the driver awaits. */
export interface Presentation {
  setHearts(hearts: number, max: number): void;
  setProgress(wave: number, waveCount: number, done: number, size: number): void;
  /** The attackers march in; resolves when every attacker stands. */
  spawnWave(wave: number, waveCount: number, attackers: readonly AttackerShown[]): Promise<void>;
  /** The card with the sentence so far and the words; `pick` is called with the choice the student taps. */
  showStep(shown: StepShown, pick: (choice: number) => void): void;
  hideStep(): void;
  /** Colors the chosen word (right or failed) and resolves after a short beat. */
  markPick(choice: number, correct: boolean): Promise<void>;
  /** An attacker strikes the castle at the post of `hero`. */
  strike(attacker: AttackerShown, hero: HeroId, hearts: number): Promise<void>;
  rest(): Promise<void>;
  /** The posts to choose from (the card); `build` is called with the post the student taps. */
  showPosts(posts: readonly Post[], build: (post: number) => void): void;
  hidePosts(): void;
  /** The tower rises on the post kept by `hero`. */
  towerBuilt(post: number, hero: HeroId, level: number): Promise<void>;
  /** One round of fire: the shots fly together; an attacker that falls is defeated. */
  volley(shots: readonly ShotShown[]): Promise<void>;
  /** The attackers that still stand fall. */
  clearWave(attackers: readonly AttackerShown[]): Promise<void>;
  /** A floating text over the card (coins). */
  cardPopup(text: string): void;
  sfx(name: Sfx): void;
  victory(): Promise<void>;
  /** Resolves when every running stage animation is over. */
  settle(): Promise<void>;
}

export interface PlayerOptions {
  sim: CastleDefenseSimulation;
  story: { id: string; level: StoryGameEvidence['level'] };
  seed: number;
  presentation: Presentation;
  /** Reports the run once to the host. */
  complete: (results: GameResults, outcome: StoryGameOutcome, evidence: StoryGameEvidence) => void;
  now?: () => number;
}

export class CastleDefensePlayer {
  private readonly sim: CastleDefenseSimulation;
  private readonly p: Presentation;
  private readonly attackers = new Map<string, AttackerShown>();
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

  /** Plays the opening events (the first wave and the first step). */
  async start(): Promise<void> {
    const state = this.sim.state;
    this.p.setHearts(state.hearts, state.maxHearts);
    if (this.destroyed || this.busy) return;
    await this.play(this.sim.dispatch({ type: 'start' }));
  }

  /** The student chooses a word. */
  async pick(choice: number): Promise<void> {
    if (this.busy || this.done || this.destroyed) return;
    await this.play(this.sim.dispatch({ type: 'pick', choice }));
  }

  /** The student places the tower on a post. */
  async build(post: number): Promise<void> {
    if (this.busy || this.done || this.destroyed) return;
    await this.play(this.sim.dispatch({ type: 'build', post }));
  }

  /** Plays events from any command (the QC hook), then asks for the next input. */
  async play(events: readonly CastleDefenseEvent[]): Promise<void> {
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

  /** Shows what the student acts on now: the step with its words, or the posts for the tower. */
  showInput(): void {
    const state = this.sim.state;
    if (state.phase !== 'playing' || !state.started) return;
    const sentence = state.shift[state.wave - 1]!;
    this.p.setProgress(state.wave, state.waveCount, state.built.length, sentence.words.length);
    if (state.stage === 'place') {
      this.p.showPosts(state.posts.map((x) => ({ ...x })), (post) => void this.build(post));
    } else if (state.step) {
      this.p.showStep({ translation: sentence.translation, step: state.step, built: [...state.built], total: sentence.words.length }, (choice) => void this.pick(choice));
    }
  }

  private shown(a: Attacker): AttackerShown {
    const s: AttackerShown = { id: a.id, kind: a.kind, lane: a.lane, hits: a.hits, maxHits: a.maxHits, defeated: false };
    this.attackers.set(a.id, s);
    return s;
  }

  // ---------------------------------------------------------------- one event

  private async show(ev: CastleDefenseEvent): Promise<void> {
    const p = this.p;
    switch (ev.type) {
      case 'waveAppeared': {
        await p.settle();
        this.attackers.clear();
        const list = ev.attackers.map((a) => this.shown(a));
        await p.spawnWave(ev.wave, ev.waveCount, list);
        break;
      }
      case 'stepShown':
        // The step is shown by `showInput` once the events are played.
        break;
      case 'picked':
        p.sfx('pick');
        await p.markPick(ev.choice, ev.correct);
        p.hideStep();
        p.sfx(ev.correct ? 'correct' : 'wrong');
        break;
      case 'scored':
        p.cardPopup(`+${ev.coins}`);
        break;
      case 'attackerStrike': {
        const attacker = this.attackers.get(ev.enemyId);
        await p.settle();
        if (attacker) await p.strike(attacker, ev.hero, ev.hearts);
        p.setHearts(ev.hearts, this.sim.state.maxHearts);
        break;
      }
      case 'rest':
        p.setHearts(ev.hearts, this.sim.state.maxHearts);
        await p.rest();
        break;
      case 'sentenceBuilt':
        break;
      case 'towerBuilt':
        p.hidePosts();
        p.sfx('tower');
        await p.towerBuilt(ev.post, ev.hero, ev.level);
        p.cardPopup(`+${ev.coins}`);
        break;
      case 'volley': {
        const shots: ShotShown[] = [];
        for (const s of ev.shots) {
          const attacker = this.attackers.get(s.enemyId);
          if (!attacker) continue;
          attacker.hits = s.hitsLeft;
          shots.push({ post: s.post, hero: s.hero, attacker, hits: s.hits, fell: s.fell });
        }
        p.sfx('hit');
        await p.volley(shots);
        for (const s of shots) if (s.fell) s.attacker.defeated = true;
        break;
      }
      case 'waveCleared': {
        await p.settle();
        const list = ev.attackers.map((a) => this.attackers.get(a.id) ?? this.shown(a)).filter((a) => !a.defeated);
        p.sfx('defeat');
        await p.clearWave(list);
        for (const a of list) a.defeated = true;
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
