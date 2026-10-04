/**
 * The battle stage of Monster Encounters: the Sunken Vault, the heroes, the monsters, and every
 * animation the battle needs, on the page's kit stage. It knows nothing about rules: the game
 * view tells it what happened (from the core's events) and awaits the returned promises to keep
 * the story in order.
 */
import * as THREE from 'three';
import { Actor, burst, InstancedSet, OrbitRig, projectile, ShotRig, smooth, Stage3D, type ClipRun, type Shot, type V3 } from '@reading-advantage/advantage-play-kit-3d/stage';
import { sunkenVaultPlaces } from './vault-places.js';
import type { BattleEnemy, EnemyKind, HeroId } from './types.js';

const HEROES: HeroId[] = ['knight', 'wizard', 'cleric'];
const ENEMY_KINDS: EnemyKind[] = ['skeleton', 'giant-bat', 'mimic', 'dragon-fire'];
/** Map pieces that lie flat: they receive shadows but do not cast them. */
const FLAT = new Set(['floor', 'floor-cracked', 'walkway']);
/** Vault pieces with no model yet (unbuilt kit parts): skipped, so the browser logs no 404. */
const NOT_BUILT = new Set(['wall-alcove']);
const LIGHT_ASSETS = ['torch-sconce', 'brazier', 'candle-cluster'];
const DRAGON_SCALE = 2.1;

import { FLOOR_Y, HALL, type StageDef } from './hall.js';

export type { StageDef } from './hall.js';

export const STAGES: StageDef[] = [HALL, HALL, HALL, HALL];

/** The vault map pieces the battle shows: every place but the characters and the unbuilt parts. */
export const vaultPlaces = () => sunkenVaultPlaces().filter((p) => p.asset !== 'adventurer' && p.asset !== 'skeleton' && !NOT_BUILT.has(p.asset));

/** Every model of the vault map. */
export const vaultModels = (): string[] => [...new Set(vaultPlaces().map((p) => p.asset))];

/** Where the vault's torches, braziers, and candles give light (the point lights go there). */
function lightSpots(set: InstancedSet): V3[] {
  const spots: V3[] = [];
  for (const asset of LIGHT_ASSETS) {
    for (const p of set.placementsOf(asset)) {
      const yaw = THREE.MathUtils.degToRad(p.yaw ?? 0);
      const out = asset === 'torch-sconce' ? 0.45 : 0;
      spots.push([p.at[0] + Math.sin(yaw) * out, asset === 'torch-sconce' ? 1.9 : 1.1, p.at[2] + Math.cos(yaw) * out]);
    }
  }
  return spots;
}

/** The torch spots nearest the fight of a stage, nearest first. */
function nearestSpots(spots: readonly V3[], def: StageDef): V3[] {
  const center = new THREE.Vector3(0, 0, 2.5).add(new THREE.Vector3(...def.party.knight)).multiplyScalar(0.5);
  return [...spots].sort((a, b) => center.distanceToSquared(new THREE.Vector3(...a)) - center.distanceToSquared(new THREE.Vector3(...b)));
}

/**
 * The static hall for the 2D bake (demo/bake.ts): the vault with the hall's cutaway, lit as the
 * battle, with no characters. The models must be loaded (`vaultModels()`).
 */
export function buildVaultBackdrop(kit: Stage3D): void {
  const scene = kit.scene;
  scene.background = new THREE.Color('#0c1118');
  scene.add(new THREE.HemisphereLight(0x9fb8e8, 0x2a3040, 1.25));
  kit.addSun(0xc8dcff, 1.1, [-3, 14, 6], [0, 0, 2]);
  const set = new InstancedSet(vaultPlaces(), (a) => kit.loader.get(kit.loader.modelPath(a)), FLAT);
  scene.add(set.group);
  set.cutaway(HALL.cutaway);
  for (const p of nearestSpots(lightSpots(set), HALL).slice(0, 4)) {
    const light = new THREE.PointLight(0xffa24a, 14, 10, 1.6);
    light.position.set(...p);
    scene.add(light);
  }
  const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x252a33, roughness: 1 }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0.02;
  scene.add(ground);
}

export class BattleStage {
  private readonly actors = new Map<string, Actor>();
  private readonly shots = new ShotRig(0.12);
  private readonly orbit = new OrbitRig([0, 0.8, 4.4], 3.6, 1.45);
  private readonly torchLights: THREE.PointLight[] = [];
  private readonly torchSpots: V3[] = [];
  private set: InstancedSet | null = null;
  private stageDef: StageDef = HALL;
  private portrait = true;

  /** `kit` is the page's stage, already cleared by the factory (its HUD updater is running). */
  constructor(readonly kit: Stage3D) {
    const scene = kit.scene;
    scene.fog = new THREE.Fog('#0c1118', 16, 34);
    scene.add(new THREE.HemisphereLight(0x9fb8e8, 0x2a3040, 1.25));
    this.kit.addSun(0xc8dcff, 1.1, [-3, 14, 6], [0, 0, 2]);
    for (let i = 0; i < 4; i++) {
      const light = new THREE.PointLight(0xffa24a, 14, 10, 1.6);
      this.torchLights.push(light);
      scene.add(light);
    }
    this.kit.onFrame((_dt, t) => this.torchLights.forEach((l, i) => (l.intensity = 14 * (0.85 + 0.1 * Math.sin(t * 11 + i * 1.7) + 0.05 * Math.sin(t * 23 + i)))));
    this.kit.setRig(this.shots);
  }

  // ---------------------------------------------------------------- loading

  /**
   * Loads the vault and the heroes (enough for the title); `progress` gets 0 to 1. The monsters
   * then load in the background while the student reads the story.
   */
  async load(progress: (p: number) => void): Promise<void> {
    const places = vaultPlaces();
    const names = [...vaultModels(), ...HEROES];
    await this.kit.loader.preload(names.map((n) => this.kit.loader.modelPath(n)), progress);
    this.set = new InstancedSet(places, (a) => this.kit.loader.get(this.kit.loader.modelPath(a)), FLAT);
    this.kit.scene.add(this.set.group);
    this.torchSpots.push(...lightSpots(this.set));
    // Dark stone beyond the map, so no view ever looks into a void.
    const ground = new THREE.Mesh(new THREE.CircleGeometry(40, 32), new THREE.MeshStandardMaterial({ color: 0x252a33, roughness: 1 }));
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = 0.02;
    ground.receiveShadow = true;
    this.kit.scene.add(ground);
    HEROES.forEach((id, i) => this.makeActor(id, id, { phase: i * 0.37 }));
    this.setStage(0, true);
    for (const kind of ENEMY_KINDS) void this.kit.loader.load(this.kit.loader.modelPath(kind)).catch(() => undefined);
  }

  private makeActor(id: string, asset: string, options: { idle?: string; scale?: number; phase?: number } = {}): Actor {
    const g = this.kit.loader.get(this.kit.loader.modelPath(asset));
    if (!g) throw new Error(`Model ${asset} is not loaded.`);
    const actor = this.kit.addActor(new Actor(asset, g, this.kit.timeline, options));
    this.actors.set(id, actor);
    return actor;
  }

  private wait(seconds: number): Promise<void> {
    return this.kit.timeline.wait(seconds);
  }

  private play(id: string, clip: string, at = 0.5, speed = 1): ClipRun {
    return this.actors.get(id)?.play(clip, at, speed) ?? { hit: Promise.resolve(), done: Promise.resolve() };
  }

  // ---------------------------------------------------------------- the stage

  setLayout(portrait: boolean): void {
    this.portrait = portrait;
    this.shots.go(this.shot(), 0, this.kit.pose);
  }

  /**
   * Frames shots for the part of the screen that the battle card leaves free: in portrait, the
   * top `portraitFree` of the screen (a game with a taller card gives its own share).
   */
  setFreeArea(battle: boolean, portraitFree = 0.55): void {
    this.kit.setFreeArea(!battle ? null : this.portrait ? [0, 0, 1, portraitFree] : [0, 0, 0.56, 1]);
  }

  private shot(): Shot {
    return this.portrait ? this.stageDef.portrait : this.stageDef.landscape;
  }

  /** Places the party and aims the camera at stage `index`. */
  setStage(index: number, instant = false): void {
    this.stageDef = STAGES[index] ?? HALL;
    this.set?.cutaway(this.stageDef.cutaway);
    for (const id of HEROES) {
      const at = this.stageDef.party[id];
      this.actors.get(id)?.placeAt(at[0], at[1], at[2], 180);
    }
    // The four torches nearest the fight light it.
    const near = nearestSpots(this.torchSpots, this.stageDef);
    this.torchLights.forEach((l, i) => {
      const p = near[i];
      if (p) l.position.set(p[0], p[1], p[2]);
      l.visible = !!p;
    });
    this.shots.go(this.shot(), instant ? 0 : 1.2, this.kit.pose);
  }

  /** The title: the party turns to face the viewer, and the camera swings gently in front of it. */
  setTitle(on: boolean): void {
    for (const id of HEROES) {
      const actor = this.actors.get(id);
      if (actor) actor.yaw = on ? 0 : 180;
    }
    if (on) this.kit.setRig(this.orbit);
    else {
      this.shots.go(this.shot(), 0.9, this.kit.pose);
      this.kit.setRig(this.shots);
    }
  }

  shake(power: number, seconds: number): void {
    this.kit.shake(power, seconds);
  }

  // ---------------------------------------------------------------- monsters

  /** Adds the encounter's monsters with their entrance: bones rise, bats fly in, the chest wakes, the dragon lands. */
  async spawn(enemies: BattleEnemy[]): Promise<void> {
    for (const [id, actor] of this.actors) {
      if (HEROES.includes(id as HeroId)) continue;
      this.kit.removeActor(actor);
      this.actors.delete(id);
    }
    await Promise.all([...new Set(enemies.map((e) => e.kind))].map((k) => this.kit.loader.load(this.kit.loader.modelPath(k))));
    const entrances: Promise<void>[] = [];
    enemies.forEach((e, i) => {
      const boss = e.kind === 'dragon-fire';
      const spot = boss ? this.stageDef.boss : (this.stageDef.enemies[i] ?? this.stageDef.enemies[0]!);
      const actor = this.makeActor(e.id, e.kind, { scale: boss ? DRAGON_SCALE : 1 });
      actor.placeAt(spot[0], spot[1] + (e.kind === 'giant-bat' ? 0.55 : 0), spot[2], 0);
      entrances.push(this.enter(actor, e.kind, i));
    });
    await Promise.all(entrances);
  }

  private async enter(actor: Actor, kind: EnemyKind, i: number): Promise<void> {
    const tl = this.kit.timeline;
    await this.wait(i * 0.35);
    if (kind === 'skeleton') {
      actor.hold('rise');
      await this.wait(0.25);
      await actor.play('rise').done;
    } else if (kind === 'mimic') {
      actor.hold('reveal');
      await this.wait(0.7);
      const r = actor.play('reveal', 0.4);
      await r.hit;
      this.shake(0.05, 0.4);
      await r.done;
    } else if (kind === 'giant-bat') {
      const from = actor.home.clone().add(new THREE.Vector3(i ? 2.5 : -2.5, 2.2, -1.5));
      actor.loop('fly');
      await tl.tween(1.1, (u) => actor.root.position.lerpVectors(from, actor.home, smooth(u)));
      await actor.play('screech', 1).done;
      actor.idle = 'fly';
      actor.loop('fly');
    } else if (kind === 'dragon-fire') {
      const from = actor.home.clone().add(new THREE.Vector3(-3, 6, -4));
      actor.loop('fly');
      await tl.tween(2.0, (u) => actor.root.position.lerpVectors(from, actor.home, smooth(u)));
      this.shake(0.08, 0.5);
      const r = actor.play('roar', 0.3);
      await r.hit;
      this.shake(0.1, 1.0);
      await r.done;
    }
  }

  // ---------------------------------------------------------------- battle moves

  /** A hero's attack on a monster; resolves `hit` at the moment of impact. */
  heroAttack(hero: HeroId, target: string, move: 'attack' | 'attack2'): ClipRun {
    const actor = this.actors.get(hero);
    const foe = this.actors.get(target);
    if (!actor || !foe) return { hit: Promise.resolve(), done: Promise.resolve() };
    const tl = this.kit.timeline;
    if (hero === 'knight') {
      // A short dash toward the target, the swing, and back.
      const toward = foe.root.position.clone().sub(actor.home).setY(0);
      const dist = Math.max(0, toward.length() - 1.1);
      const dest = actor.home.clone().add(toward.normalize().multiplyScalar(dist));
      const hit = (async () => {
        await tl.tween(0.28, (u) => actor.root.position.lerpVectors(actor.home, dest, smooth(u)));
        const swing = actor.play(move, 0.45);
        await swing.hit;
        void swing.done.then(() => tl.tween(0.32, (u) => actor.root.position.lerpVectors(dest, actor.home, smooth(u))));
      })();
      return { hit, done: hit.then(() => this.wait(0.7)) };
    }
    // Casters: the clip, then a bolt from the hero to the target.
    const cast = actor.play(move, hero === 'cleric' ? 0.5 : 0.45);
    const from = actor.root.position.clone().add(new THREE.Vector3(0, 0.8, 0));
    const to = foe.root.position.clone().add(new THREE.Vector3(0, foe.kind === 'dragon-fire' ? 1.6 : 0.6, 0));
    const hit = cast.hit.then(() => projectile(this.kit, from, to, hero === 'wizard' ? 0xff7a1a : 0xfff0a0));
    return { hit, done: Promise.all([hit, cast.done]).then(() => undefined) };
  }

  /** A monster takes a hit: its clip, a white flash, and a small knock-back. */
  async enemyHit(id: string): Promise<void> {
    const actor = this.actors.get(id);
    if (!actor) return;
    const tl = this.kit.timeline;
    void actor.flash(0xffffff);
    const back = actor.home.clone().add(new THREE.Vector3(0, 0, -0.18));
    void tl.tween(0.12, (u) => actor.root.position.lerpVectors(actor.home, back, u)).then(() => tl.tween(0.25, (u) => actor.root.position.lerpVectors(back, actor.home, smooth(u))));
    await actor.play('hit').done;
  }

  async enemyDefeated(id: string): Promise<void> {
    const actor = this.actors.get(id);
    if (!actor) return;
    await actor.play('death').done;
    const start = actor.root.position.clone();
    const size = actor.root.scale.x;
    await this.kit.timeline.tween(0.45, (u) => {
      actor.root.scale.setScalar(size * (1 - smooth(u)));
      actor.root.position.set(start.x, start.y - u * 0.2, start.z);
    });
    actor.root.visible = false;
  }

  /** A miss: the hero's move goes wide and the monster sidesteps. */
  heroMiss(hero: HeroId, target: string): Promise<void> {
    const foe = this.actors.get(target);
    const cast = this.play(hero, hero === 'cleric' ? 'attack2' : 'attack', 0.45);
    if (foe) {
      const tl = this.kit.timeline;
      const side = foe.home.clone().add(new THREE.Vector3(0.45, 0, 0));
      void cast.hit.then(() => tl.tween(0.15, (u) => foe.root.position.lerpVectors(foe.home, side, smooth(u))).then(() => tl.tween(0.35, (u) => foe.root.position.lerpVectors(side, foe.home, smooth(u)))));
    }
    return cast.done;
  }

  /** A monster strikes back: its attack clip and the active hero's hit reaction. */
  async enemyAttack(enemy: string, hero: HeroId): Promise<void> {
    const strike = this.play(enemy, 'attack', 0.55);
    await strike.hit;
    void this.actors.get(hero)?.flash(0xff4040);
    this.shake(0.035, 0.25);
    await this.play(hero, 'hit').done;
    await strike.done;
  }

  heal(hero: HeroId): void {
    const actor = this.actors.get(hero);
    if (actor) void burst(this.kit, actor.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), 0x9dffb0);
  }

  async victory(): Promise<void> {
    await Promise.all(HEROES.map((h, i) => this.wait(i * 0.12).then(() => this.play(h, 'victory').done)));
  }

  // ---------------------------------------------------------------- color presets

  /** Shows a hero in a color preset (null: the default look). */
  async setPreset(hero: HeroId, preset: string | null): Promise<void> {
    const actor = this.actors.get(hero);
    if (!actor) return;
    actor.setMap(preset ? await this.kit.loader.texture(this.kit.loader.presetPath(hero, preset)) : null);
  }

  // ---------------------------------------------------------------- screen positions (HUD labels)

  /** Where an actor's head is on screen, in CSS pixels. */
  screenOf(id: string, lift = 1.3): { x: number; y: number; visible: boolean } {
    const actor = this.actors.get(id);
    return actor ? this.kit.screenOf(actor, lift) : { x: 0, y: 0, visible: false };
  }
}
