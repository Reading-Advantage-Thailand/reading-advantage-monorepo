/**
 * The 2D battle stage of the battle family (the 2D twin of stage3d.ts): the vault hall baked from
 * the 3D set, the party and the monsters as forge sprites, their entrances and moves, and the
 * monsters' HP pips. It knows nothing about rules: a game view tells it what happened (from its
 * core's events) and awaits the returned promises to keep the story in order.
 *
 * When the session has an avatar, the student stands at the party place of their role as their own
 * figure (owner rule: the avatar is the student's identity); the two other places keep their heroes.
 */
import type * as Phaser from 'phaser';
import { roleHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import { playerFigure, type PortraitFigure } from '@reading-advantage/advantage-play-kit-3d/avatar/portrait-of';
import type { RuntimeEdition } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { Actor2D, project, textureKeyOf, type Projection2D, type Rect } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { HALL } from './hall.js';
import type { BattleEnemy, EnemyKind, HeroId } from './types.js';

export const HEROES: HeroId[] = ['knight', 'wizard', 'cleric'];

/** The clips the 2D stage plays on the party and on each monster kind (files of `primary-chibi-2d`). */
export const HERO_CLIPS_2D = ['idle', 'run', 'attack', 'attack2', 'hit', 'victory'] as const;
export const ENEMY_CLIPS_2D: Readonly<Record<EnemyKind, readonly string[]>> = {
  skeleton: ['idle', 'rise', 'attack', 'hit', 'death'],
  'giant-bat': ['idle', 'fly', 'screech', 'attack', 'hit', 'death'],
  mimic: ['idle', 'reveal', 'attack', 'hit', 'death'],
  'dragon-fire': ['idle', 'fly', 'roar', 'attack', 'hit', 'death'],
};

/** Every 2D file of the stage: the baked hall, the party, the monsters of `kinds`. */
export function battleFiles2D(kinds: readonly EnemyKind[] = ['skeleton', 'giant-bat', 'mimic', 'dragon-fire']): string[] {
  return [
    'background.monster-encounters',
    ...HEROES.flatMap((h) => HERO_CLIPS_2D.map((c) => `${h}.${c}`)),
    ...kinds.flatMap((kind) => ENEMY_CLIPS_2D[kind].map((c) => `${kind}.${c}`)),
  ];
}

/** The student in the party: the place of their role and their figure (its pixels also make the face icon). */
export interface PartyPlayer2D {
  readonly place: HeroId;
  readonly figure: PortraitFigure;
}

/**
 * The student in the party for a 2D view: null when the session has no avatar. Call it when the
 * view is made, so the figure loads while the pack loads.
 */
export function partyPlayer2D(ctx: Game2DContext): PartyPlayer2D | null {
  const avatar = ctx.options?.avatar;
  const figure = playerFigure(ctx);
  return avatar && figure ? { place: roleHero(avatar.classId), figure } : null;
}

/** The dragon is smaller than in 3D (no perspective shrinks it here). */
const DRAGON_SCALE = 1.4;
/** A cool tint puts the day-lit forge sprites in the blue vault light. */
const VAULT_TINT = 0xdce4ff;
/** The fight's extent in meters: x, and the projected height v (the dragon's head to the party's feet). */
const FIGHT = { width: 5.6, vTop: 2.1, vBottom: -3.7 };

export class BattleStage2D {
  private readonly world: Phaser.GameObjects.Container;
  private readonly scale: number;
  private readonly actors = new Map<string, Actor2D>();
  private readonly kinds = new Map<string, EnemyKind>();
  private readonly spots = new Map<string, { x: number; z: number }>();
  private readonly hp = new Map<string, { e: BattleEnemy; g: Phaser.GameObjects.Graphics }>();

  constructor(
    private readonly scene: Phaser.Scene,
    private readonly edition: RuntimeEdition,
    private readonly projection: Projection2D,
    background: string,
    /** The screen rectangle the fight fills (the rest of the screen shows more of the hall). */
    area: Rect,
    /** The student, who takes the party place of their role (none: three heroes). */
    player: PartyPlayer2D | null = null,
  ) {
    const ppm = projection.ppm;
    const pxPerM = Math.min(area.width / FIGHT.width, area.height / (FIGHT.vTop - FIGHT.vBottom));
    this.scale = pxPerM / ppm;
    const vMid = (FIGHT.vTop + FIGHT.vBottom) / 2;
    this.world = scene.add.container(area.x + area.width / 2 + projection.uMin * ppm * this.scale, area.y + area.height / 2 - (projection.vMax - vMid) * ppm * this.scale).setScale(this.scale);
    this.world.add(scene.add.image(0, 0, textureKeyOf(edition, background)).setOrigin(0, 0).setDepth(-1e9));
    for (const id of HEROES) {
      const figure = player?.place === id ? player.figure : null;
      const a = new Actor2D(scene, edition, id, projection, { dirs: 8, clips: this.clips(id, HERO_CLIPS_2D), stiffness: 20, figure }, this.world);
      const [x, , z] = HALL.party[id];
      a.placeAt(x, z);
      a.face(0, -1);
      a.tint(VAULT_TINT);
      this.actors.set(id, a);
    }
  }

  private clips(model: string, list: readonly string[]): string[] {
    return list.filter((c) => this.edition.bindings[`${model}.${c}`]);
  }

  /** Screen pixels of a world point. */
  screenOf(x: number, y: number, z: number): { x: number; y: number } {
    const p = project(this.projection, x, y, z);
    return { x: this.world.x + p.x * this.scale, y: this.world.y + p.y * this.scale };
  }

  /** Screen pixels over an actor's head (`lift` meters over its ground point, scaled with it). */
  headOf(id: string, lift = 1.4): { x: number; y: number } {
    const a = this.actors.get(id);
    return a ? this.screenOf(a.x, a.lift + lift * (a.sprite.scaleY || 1), a.z) : { x: this.scene.scale.width / 2, y: this.scene.scale.height / 2 };
  }

  private homeOf(id: string): { x: number; z: number } {
    const hero = HALL.party[id as HeroId];
    if (hero) return { x: hero[0], z: hero[2] };
    return this.spots.get(id) ?? { x: 0, z: 0 };
  }

  // ---------------------------------------------------------------- helpers

  wait(seconds: number): Promise<void> {
    return new Promise((resolve) => this.scene.time.delayedCall(seconds * 1000, () => resolve()));
  }

  private tween(config: Phaser.Types.Tweens.TweenBuilderConfig): Promise<void> {
    return new Promise((resolve) => this.scene.tweens.add({ ...config, onComplete: () => resolve() }));
  }

  /** Moves an actor in a straight line over `ms` (a dash, a knock-back, a flight). */
  private glide(a: Actor2D, to: { x: number; z: number; lift?: number }, ms: number): Promise<void> {
    const from = { x: a.x, z: a.z, lift: a.lift };
    const u = { v: 0 };
    const smooth = (t: number): number => t * t * (3 - 2 * t);
    return this.tween({
      targets: u,
      v: 1,
      duration: ms,
      onUpdate: () => {
        const k = smooth(u.v);
        a.lift = from.lift + ((to.lift ?? from.lift) - from.lift) * k;
        a.placeAt(from.x + (to.x - from.x) * k, from.z + (to.z - from.z) * k);
      },
    });
  }

  /** Little bursts of light at a screen point. */
  burst(x: number, y: number, color: number, n = 14): void {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
      const d = 20 + Math.random() * 26;
      const dot = this.scene.add.circle(x, y, 3 + Math.random() * 3, color).setDepth(17_000);
      this.scene.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
    }
  }

  /** A glowing bolt from one screen point to another; resolves on impact. */
  private bolt(from: { x: number; y: number }, to: { x: number; y: number }, color: number): Promise<void> {
    const ball = this.scene.add.circle(from.x, from.y, 9, color).setStrokeStyle(4, 0xffffff, 0.6).setDepth(17_500);
    return this.tween({ targets: ball, x: to.x, y: to.y, duration: 340, ease: 'Quad.In' }).then(() => {
      ball.destroy();
      this.burst(to.x, to.y, color, 10);
    });
  }

  // ---------------------------------------------------------------- HP pips

  setEnemies(enemies: readonly BattleEnemy[]): void {
    for (const h of this.hp.values()) h.g.destroy();
    this.hp.clear();
    for (const e of enemies) this.hp.set(e.id, { e: { ...e }, g: this.scene.add.graphics().setDepth(16_000) });
    this.drawHp();
  }

  updateEnemy(id: string, value: number, defeated = false): void {
    const h = this.hp.get(id);
    if (!h) return;
    h.e.hp = value;
    h.e.defeated = defeated || value <= 0;
    this.drawHp();
  }

  private drawHp(): void {
    for (const { e, g } of this.hp.values()) {
      g.clear();
      if (e.defeated) continue;
      const w = e.maxHp * 13;
      g.fillStyle(0x121a2c, 0.8).fillRoundedRect(-w / 2 - 6, -9, w + 12, 18, 9);
      for (let i = 0; i < e.maxHp; i++) {
        const x = -w / 2 + 6.5 + i * 13;
        if (i < e.hp) g.fillStyle(0xef4444, 1).fillCircle(x, 0, 5);
        else g.lineStyle(2, 0xef4444, 0.8).strokeCircle(x, 0, 4);
      }
    }
  }

  // ---------------------------------------------------------------- the monsters (as stage3d.ts)

  /** Adds the encounter's monsters with their entrance: bones rise, bats fly in, the chest wakes, the dragon lands. */
  async spawn(enemies: readonly Pick<BattleEnemy, 'id' | 'kind'>[]): Promise<void> {
    for (const [id, a] of this.actors) {
      if (HEROES.includes(id as HeroId)) continue;
      a.destroy();
      this.actors.delete(id);
    }
    this.spots.clear();
    this.kinds.clear();
    await Promise.all(
      enemies.map(async (e, i) => {
        const boss = e.kind === 'dragon-fire';
        const spot = boss ? HALL.boss : (HALL.enemies[i] ?? HALL.enemies[0]!);
        const at = { x: spot[0], z: spot[2] };
        this.spots.set(e.id, at);
        this.kinds.set(e.id, e.kind);
        const bat = e.kind === 'giant-bat';
        const a = new Actor2D(this.scene, this.edition, e.kind, this.projection, { dirs: boss ? 8 : 4, clips: this.clips(e.kind, ENEMY_CLIPS_2D[e.kind]), idle: bat ? 'fly' : 'idle', stiffness: 20 }, this.world);
        if (boss) a.sprite.setScale(DRAGON_SCALE);
        a.tint(VAULT_TINT);
        a.lift = bat ? 0.55 : 0;
        a.placeAt(at.x, at.z);
        a.face(0, 1);
        a.sprite.setAlpha(0);
        this.actors.set(e.id, a);
        await this.wait(i * 0.35);
        a.sprite.setAlpha(1);
        if (e.kind === 'skeleton') await a.play('rise');
        else if (e.kind === 'mimic') {
          await a.play('reveal', 0.8);
          this.scene.cameras.main.shake(300, 0.006);
        } else if (bat) {
          a.lift = 2.7;
          a.placeAt(at.x + (i ? 2.5 : -2.5), at.z - 1.5);
          await this.glide(a, { ...at, lift: 0.55 }, 1100);
          await a.play('screech');
        } else if (boss) {
          a.lift = 6;
          a.placeAt(at.x - 3, at.z - 4);
          a.loop('fly');
          await this.glide(a, { ...at, lift: 0 }, 2000);
          a.loop('idle');
          this.scene.cameras.main.shake(400, 0.008);
          await a.play('roar');
        }
      }),
    );
  }

  // ---------------------------------------------------------------- battle moves

  /** A hero's attack on a monster; resolves `hit` at the moment of impact. */
  heroAttack(hero: HeroId, target: string, move: 'attack' | 'attack2'): { hit: Promise<void>; done: Promise<void> } {
    const a = this.actors.get(hero);
    const foe = this.actors.get(target);
    if (!a || !foe) return { hit: Promise.resolve(), done: Promise.resolve() };
    const home = this.homeOf(hero);
    if (hero === 'knight') {
      // A short dash toward the target, the swing, and back.
      const dx = foe.x - home.x;
      const dz = foe.z - home.z;
      const len = Math.hypot(dx, dz) || 1;
      const dist = Math.max(0, len - 1.1);
      const dest = { x: home.x + (dx / len) * dist, z: home.z + (dz / len) * dist };
      const hit = (async () => {
        a.face(dx, dz);
        a.loop('run');
        await this.glide(a, dest, 280);
        a.loop('idle');
        const swing = a.play(move);
        await this.wait(a.clipSeconds(move) * 0.45);
        void swing.then(async () => {
          a.loop('run');
          await this.glide(a, home, 320);
          a.loop('idle');
          a.face(0, -1);
        });
      })();
      return { hit, done: hit.then(() => this.wait(0.7)) };
    }
    // Casters: the clip, then a bolt from the hero to the target.
    a.face(foe.x - a.x, foe.z - a.z);
    const cast = a.play(move);
    const hit = this.wait(a.clipSeconds(move) * (hero === 'cleric' ? 0.5 : 0.45)).then(() =>
      this.bolt(this.headOf(hero, 0.8), this.headOf(target, this.kinds.get(target) === 'dragon-fire' ? 1.1 : 0.6), hero === 'wizard' ? 0xff7a1a : 0xfff0a0),
    );
    return { hit, done: Promise.all([hit, cast]).then(() => a.face(0, -1)) };
  }

  /** A monster takes a hit: a white flash, a small knock-back, and its clip. */
  async enemyHit(id: string): Promise<void> {
    const a = this.actors.get(id);
    if (!a) return;
    a.flash(0xffffff, 140);
    const home = this.homeOf(id);
    void this.glide(a, { x: home.x, z: home.z - 0.18 }, 120).then(() => this.glide(a, home, 250));
    await a.play('hit');
  }

  async enemyDefeated(id: string): Promise<void> {
    const a = this.actors.get(id);
    if (!a) return;
    await a.play('death', 1, true);
    await this.tween({ targets: a.sprite, scaleX: 0, scaleY: 0, alpha: 0, duration: 450 });
    a.sprite.setVisible(false);
  }

  /** A miss: the hero's move goes wide and the monster sidesteps. */
  async heroMiss(hero: HeroId, target: string): Promise<void> {
    const a = this.actors.get(hero);
    const foe = this.actors.get(target);
    if (!a) return;
    const clip = hero === 'cleric' ? 'attack2' : 'attack';
    const cast = a.play(clip);
    if (foe) {
      const home = this.homeOf(target);
      void this.wait(a.clipSeconds(clip) * 0.45).then(() => this.glide(foe, { x: home.x + 0.45, z: home.z }, 150).then(() => this.glide(foe, home, 350)));
    }
    await cast;
  }

  /** A monster strikes back: its attack clip and the hero's hit reaction. */
  async enemyAttack(enemy: string, hero: HeroId): Promise<void> {
    const foe = this.actors.get(enemy);
    const a = this.actors.get(hero);
    const strike = foe?.play('attack') ?? Promise.resolve();
    await this.wait((foe?.clipSeconds('attack') ?? 0) * 0.55);
    a?.flash(0xff4040, 160);
    this.scene.cameras.main.shake(250, 0.005);
    await (a?.play('hit') ?? Promise.resolve());
    await strike;
  }

  heal(hero: HeroId): void {
    const at = this.headOf(hero, 1.1);
    this.burst(at.x, at.y, 0x9dffb0, 16);
  }

  async victory(): Promise<void> {
    await Promise.all(HEROES.map((h, i) => this.wait(i * 0.12).then(() => this.actors.get(h)?.play('victory', 1, true))));
  }

  /** Once per frame: actors, HP pips, and the depth order. */
  update(dt: number): void {
    for (const a of this.actors.values()) a.update(dt);
    for (const [id, { g }] of this.hp) {
      const kind = this.kinds.get(id);
      const at = this.headOf(id, kind === 'giant-bat' ? 1.0 : kind === 'dragon-fire' ? 1.55 : 1.3);
      g.setPosition(at.x, at.y);
    }
    this.world.sort('depth');
  }
}
