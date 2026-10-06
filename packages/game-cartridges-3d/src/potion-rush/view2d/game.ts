/**
 * Potion Rush in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts). The art
 * is the forge sprites of the `primary-chibi-2d` pack over the shop baked from the 3D set, at the
 * one 2D camera (docs/apk3d-cartridge.md section 15). Words ride the conveyor under tags the
 * student drags (or taps, or clicks and then clicks a cauldron) into cauldrons; customers walk in
 * with their order on a card in their cauldron's color; a ready potion shows a Serve button.
 *
 * The scene is a plain Phaser scene config (no `Phaser` import at run time), so the 3D path never
 * loads Phaser; the factory creates the scene from it, as the APK cartridges do.
 */
import type * as Phaser from 'phaser';
import { shownHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import { playerFigure } from '@reading-advantage/advantage-play-kit-3d/avatar/portrait-of';
import { preloadAssetBindings, toGameResults, type RuntimeEdition, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, banner, button, COLORS, depthOf, fitGameSize, popup, project, recolorTag, registerSheetAnimations, StatusBar2D, tag, text, textureKeyOf } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createPotionRush, evidenceOf, scoreOf, targetFor, type Mood, type PotionRushCommand, type PotionRushEvent, type PotionRushState } from '../core/index.js';
import { CUSTOMER_CLIPS_2D, FILES_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextDrop } from '../qc/bot.js';
import strings from '../strings.en.js';
import { beltX, BREW, INGREDIENT_SCALE, LAYOUT } from '../view/layout.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

const MOOD_ICON: Record<Mood, string> = { happy: '😊', waiting: '😐', grumpy: '😤' };
/** Clips a customer plays when grumpy, and to thank (the first one the model has). */
const GRUMPY = ['taunt', 'roar'];
const THANKS = ['victory', 'salute', 'wave'];
/** Props read bigger in 2D than in 3D: the 2D camera is farther away. */
const PROP_BOOST = 1.6;
/** The brew surface of the cauldron model (assets/cauldron.ts: rim at 0.513 m, radius 0.24 m). */
const BREW_Y = 0.52;
const BREW_R = 0.21;
const hex = (c: number): string => `#${c.toString(16).padStart(6, '0')}`;

/** Where the world and the cards go on this screen size. */
interface Layout2D {
  width: number;
  height: number;
  portrait: boolean;
  /** Screen pixels per background pixel. */
  scale: number;
  /** The screen position of the background's top-left corner. */
  x: number;
  y: number;
  cardTop: number;
  cardWidth: number;
  gap: number;
  /** Half the belt length on screen (meters): the visible part of the conveyor in portrait. */
  beltHalf: number;
}

export function layoutFor(width: number, height: number): Layout2D {
  const portrait = height > width;
  const ppm = PROJECTION.ppm;
  // Portrait crops the shop to the three stations (about ±2 m, big characters for a phone; the
  // order cards cover the top of the back wall); landscape shows the whole baked room.
  const scale = portrait ? Math.min(width / (3.7 * ppm), (height - 130) / PROJECTION.height) : Math.min(height / PROJECTION.height, width / PROJECTION.width);
  const gap = 6;
  return {
    width,
    height,
    portrait,
    scale,
    x: width / 2 + PROJECTION.uMin * ppm * scale,
    y: height - PROJECTION.height * scale,
    cardTop: 68,
    cardWidth: (width - 16 - 2 * gap) / 3,
    gap,
    beltHalf: Math.min(LAYOUT.belt.from, width / 2 / (ppm * scale) - 0.25),
  };
}

interface Item {
  id: string;
  word: string;
  sprite: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Container;
  flying: boolean;
  dragging: boolean;
}

interface Customer {
  actor: Actor2D;
  slot: number;
  leaving: boolean;
  walk: Phaser.Tweens.Tween | null;
}

interface Card {
  box: Phaser.GameObjects.Container;
  words: Phaser.GameObjects.Text[];
  mood: Phaser.GameObjects.Text;
  bar: Phaser.GameObjects.Graphics;
  orderId: string;
  width: number;
  height: number;
}

interface Station {
  brew: Phaser.GameObjects.Graphics;
  count: Phaser.GameObjects.Text;
  serve: Phaser.GameObjects.Container;
  hit: Phaser.GameObjects.Zone;
}

/** The test hook of the 2D view (`window.__apk3dView2d`): the QC driver reads and drives it. */
export interface PotionRush2DTest {
  state(): PotionRushState;
  dispatch(command: PotionRushCommand): void;
  tick(steps: number): void;
  auto(): boolean;
  /** Game-pixel points of the word tags, the cauldrons, and the Serve buttons (for real pointer drags). */
  points(): { items: { id: string; word: string; x: number; y: number }[]; cauldrons: { x: number; y: number }[]; serve: ({ x: number; y: number } | null)[] };
  size(): { width: number; height: number };
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const i18n = ctx.i18n ?? createI18n([strings]).scope('potionRush');
  const t = i18n.scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const hero = shownHero(HEROES_2D, options, 'wizard');
  /** The student's own figure for the hero when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition: RuntimeEdition = ctx.edition;
  const seed = ctx.seed ?? (Date.now() >>> 1);
  const sim = createPotionRush(story, { seed, helper: options.helper });
  const kinds = new Set(sim.state.orders.map((o) => o.kind));
  /** Only the files this shift needs: the chosen hero and the customers who come today. */
  const needed = FILES_2D.filter((id) => {
    const [model] = id.split('.');
    if ((HEROES_2D as readonly string[]).includes(model!)) return model === hero;
    if (model! in CUSTOMER_CLIPS_2D) return kinds.has(model as never);
    return true;
  }).filter((id) => edition.bindings[id]);
  const [width, height] = fitGameSize();

  const audio = ctx.audio ?? new AudioBus();
  const unlock = ctx.audio ? null : installAudioUnlock(audio);

  function preload(this: Phaser.Scene): void {
    preloadAssetBindings(this.load, edition, needed, ctx.resolveUrl);
  }

  function create(this: Phaser.Scene): void {
    const scene = this;
    const L = layoutFor(scene.scale.width, scene.scale.height);
    const ppm = PROJECTION.ppm;
    const startedAt = performance.now();
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);

    /** Background pixels of a world point (inside the world container). */
    const worldPx = (x: number, y: number, z: number) => project(PROJECTION, x, y, z);
    /** The x of a belt position (0 to 1) on the visible part of the conveyor. */
    const beltAt = (p: number): number => beltX(p) * (L.beltHalf / LAYOUT.belt.from);
    /** Screen pixels of a world point. */
    const screenOf = (x: number, y: number, z: number) => {
      const p = worldPx(x, y, z);
      return { x: L.x + p.x * L.scale, y: L.y + p.y * L.scale };
    };

    // ---------------------------------------------------------------- the shop
    scene.cameras.main.setBackgroundColor('#1c1426');
    // Above the baked room: its back wall fades up into the night, behind the order cards.
    const top = scene.add.graphics().setDepth(-1);
    top.fillGradientStyle(0x1c1426, 0x1c1426, 0x4a2c1c, 0x4a2c1c, 1).fillRect(L.x, 0, PROJECTION.width * L.scale, L.y + 1);
    const world = scene.add.container(L.x, L.y).setScale(L.scale).setDepth(0);
    world.add(scene.add.image(0, 0, textureKeyOf(edition, BACKGROUND_FILE)).setOrigin(0, 0).setDepth(-1e9));
    const clips = (model: string, list: readonly string[]) => list.filter((c) => edition.bindings[`${model}.${c}`]);
    const alchemist = new Actor2D(scene, edition, hero, PROJECTION, { dirs: 8, figure, clips: clips(hero, HERO_CLIPS_2D) }, world);
    alchemist.placeAt(LAYOUT.alchemist[0], LAYOUT.alchemist[2]);
    alchemist.face(0.94, 0.34);

    // ---------------------------------------------------------------- sound (as the 3D view)
    audio.defineMood('shop', { bpm: 96, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], busy: false, drum: false });
    audio.defineMood('rush', { bpm: 124, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [62, 65, 69]], busy: true, drum: true });
    let combo = 0;
    audio.defineSfx('plop', (s) => {
      s.tone(420 * Math.pow(1.06, Math.min(combo, 12)), 0.14, 'sine', 0.3, 0, 1.6);
      s.noise(0.08, 0.08, 1400);
    });
    audio.defineSfx('fizz', (s) => {
      s.noise(0.5, 0.2, 3000);
      s.tone(220, 0.3, 'triangle', 0.12, 0, 0.6);
    });
    audio.defineSfx('ding', (s) => [1319, 1760].forEach((f, i) => s.tone(f, 0.5, 'sine', 0.16, i * 0.09)));
    audio.defineSfx('coins', (s) => [1568, 2093, 2637].forEach((f, i) => s.tone(f, 0.12, 'square', 0.05, i * 0.05)));
    audio.defineSfx('bell', (s) => [1047, 1319].forEach((f, i) => s.tone(f, 0.6, 'triangle', 0.1, i * 0.12)));

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const drawStatus = (s: PotionRushState): void => status.set(t('served', { served: s.served, total: s.total }), `🪙 ${s.coins}`);
    const rushSign = text(scene, L.width / 2, L.height - 16, t('rush'), 24, '#ffd84a').setOrigin(0.5, 1).setStroke('#3a1f5c', 6).setDepth(19_500).setVisible(false);
    scene.tweens.add({ targets: rushSign, scale: { from: 0.94, to: 1.06 }, duration: 420, yoyo: true, repeat: -1 });

    /** Little bursts of color (a splash, a puff of smoke). */
    function burst(x: number, y: number, color: number, n: number): void {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 18 + Math.random() * 22;
        const dot = scene.add.circle(x, y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 10, alpha: 0, scale: 0.3, duration: 450 + Math.random() * 150, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- cauldrons
    let held: string | null = null;
    let dragged = false;
    const items = new Map<string, Item>();
    const stations: Station[] = LAYOUT.cauldrons.map(([cx, , cz], i) => {
      const brew = scene.add.graphics().setDepth(depthOf(cz, BREW_Y));
      const top = worldPx(cx, BREW_Y, cz);
      brew.setPosition(top.x, top.y);
      world.add(brew);
      const base = screenOf(cx, 0, cz);
      const count = text(scene, base.x + 0.34 * ppm * L.scale, base.y - 6, '', 14, '#ffffff')
        .setOrigin(0, 1)
        .setBackgroundColor(hex(BREW[i]!))
        .setPadding(6, 2, 6, 2)
        .setDepth(16_000)
        .setVisible(false);
      const serve = button(scene, base.x, base.y + 30, t('serve'), () => {
        if (!dragged && sim.state.cauldrons[i]?.ready) loop.dispatch({ type: 'serve', cauldron: i });
      }).setDepth(16_500).setVisible(false);
      scene.tweens.add({ targets: serve, scale: { from: 0.95, to: 1.08 }, duration: 380, yoyo: true, repeat: -1 });
      const middle = screenOf(cx, 0.35, cz);
      const hit = scene.add.zone(middle.x, middle.y, 0.8 * ppm * L.scale, 0.9 * ppm * L.scale).setInteractive({ useHandCursor: true });
      hit.on('pointerup', () => {
        if (dragged) return;
        if (held) {
          const itemId = held;
          release();
          loop.dispatch({ type: 'drop', itemId, cauldron: i });
        } else if (sim.state.cauldrons[i]?.ready) loop.dispatch({ type: 'serve', cauldron: i });
      });
      return { brew, count, serve, hit };
    });
    /** Brew color and glow: teal while idle, the order's color as words go in, pulsing when ready. */
    let glowing = false;
    function drawBrew(i: number, time: number): void {
      const s = sim.state;
      const cd = s.cauldrons[i]!;
      const order = cd.orderId ? s.orders.find((o) => o.id === cd.orderId) : null;
      const g = stations[i]!.brew;
      const rx = BREW_R * ppm;
      const ry = rx * Math.sin((PROJECTION.elevation * Math.PI) / 180);
      g.clear();
      if (glowing) g.lineStyle(3, 0xffffff, 0.55 + 0.35 * Math.sin(time / 120)).strokeEllipse(0, 0, rx * 2 + 14, ry * 2 + 12);
      g.lineStyle(3, BREW[i]!, 0.95).strokeEllipse(0, 0, rx * 2 + 6, ry * 2 + 5);
      if (!order) return;
      const progress = cd.words.length / order.words.length;
      const pulse = cd.ready ? 0.25 * Math.sin(time / 150) : 0;
      g.fillStyle(BREW[i]!, Math.min(1, 0.45 + 0.5 * progress + pulse)).fillEllipse(0, 0, rx * 2, ry * 2);
      if (cd.ready) g.fillStyle(0xffffff, 0.25 + pulse).fillEllipse(-rx * 0.25, -ry * 0.2, rx * 0.8, ry * 0.6);
    }
    const setGlow = (on: boolean): void => {
      glowing = on;
    };

    // ---------------------------------------------------------------- the conveyor
    const release = (): void => {
      if (held) {
        const it = items.get(held);
        if (it) recolorTag(it.tag, COLORS.tagFill, 0xffffff);
      }
      held = null;
      setGlow(false);
    };
    const itemOf = (obj: Phaser.GameObjects.GameObject): Item | undefined => items.get(obj.getData('item') as string);
    const tagOffset = 0.3 * ppm * L.scale + 18;

    function spawnItem(itemId: string, word: string, kind: string): void {
      const file = edition.pack.files[`prop.${kind}`];
      const sprite = scene.add.image(0, 0, textureKeyOf(edition, `prop.${kind}`), 0).setScale((INGREDIENT_SCALE[kind] ?? 1) * PROP_BOOST);
      if (file?.origin) sprite.setOrigin(file.origin.x, file.origin.y);
      sprite.setData('item', itemId).setInteractive({ draggable: true, useHandCursor: true });
      world.add(sprite);
      const label = tag(scene, word, 19).setDepth(15_000);
      label.setData('item', itemId).setInteractive({ draggable: true, useHandCursor: true });
      const start = screenOf(beltAt(1), LAYOUT.belt.y, LAYOUT.belt.z);
      label.setPosition(start.x, start.y - tagOffset);
      sprite.setAlpha(0);
      label.setAlpha(0);
      scene.tweens.add({ targets: [sprite, label], alpha: 1, duration: 250 });
      items.set(itemId, { id: itemId, word, sprite, tag: label, flying: false, dragging: false });
    }

    function removeItem(itemId: string): void {
      const it = items.get(itemId);
      if (!it) return;
      if (held === itemId) release();
      it.sprite.destroy();
      it.tag.destroy();
      items.delete(itemId);
    }

    function tapItem(it: Item): void {
      if (it.flying) return;
      // One cauldron needs this word: it flies there. Otherwise the word waits in the hand until
      // the student taps a cauldron (tap-then-tap, the way to play without dragging).
      const target = targetFor(sim.state, it.id);
      if (target !== null) {
        release();
        loop.dispatch({ type: 'drop', itemId: it.id, cauldron: target });
        return;
      }
      const same = held === it.id;
      release();
      if (same) return;
      held = it.id;
      recolorTag(it.tag, COLORS.purple, COLORS.gold);
      setGlow(true);
      audio.play('tap');
    }

    function dropAt(itemId: string, x: number, y: number): void {
      const i = stations.findIndex(({ hit }) => Math.abs(x - hit.x) < hit.width / 2 + 24 && Math.abs(y - hit.y) < hit.height / 2 + 24);
      if (i >= 0) loop.dispatch({ type: 'drop', itemId, cauldron: i });
    }

    scene.input.dragDistanceThreshold = 8;
    scene.input.on('pointerdown', () => (dragged = false));
    scene.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const it = itemOf(obj);
      if (!it || it.flying) return;
      release();
      dragged = true;
      it.dragging = true;
      it.tag.setDepth(15_500);
      setGlow(true);
      audio.play('tap');
    });
    scene.input.on('drag', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const it = itemOf(obj);
      // The tag rides above the finger, so the student sees the word while dragging.
      if (it?.dragging) it.tag.setPosition(p.x, p.y - 34);
    });
    scene.input.on('dragend', (p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      const it = itemOf(obj);
      if (!it?.dragging) return;
      it.dragging = false;
      it.tag.setDepth(15_000);
      setGlow(false);
      dropAt(it.id, p.x, p.y);
    });
    scene.input.on('gameobjectup', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.GameObject) => {
      if (dragged) return;
      const it = itemOf(obj);
      if (it) tapItem(it);
    });

    /** The item flies in an arc into cauldron `i`, then disappears with a splash. */
    function flyIntoCauldron(itemId: string, i: number): void {
      const it = items.get(itemId);
      if (!it) return;
      it.flying = true;
      it.sprite.disableInteractive();
      it.tag.disableInteractive();
      scene.tweens.add({ targets: it.tag, alpha: 0, duration: 150 });
      const [cx, , cz] = LAYOUT.cauldrons[i]!;
      const from = { x: it.sprite.x, y: it.sprite.y };
      const to = worldPx(cx, BREW_Y + 0.1, cz);
      const lift = 0.7 * ppm;
      const u = { v: 0 };
      scene.tweens.add({
        targets: u,
        v: 1,
        duration: 350,
        onUpdate: () => {
          const k = u.v * u.v * (3 - 2 * u.v);
          it.sprite.setPosition(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - Math.sin(u.v * Math.PI) * lift);
          it.sprite.setRotation(u.v * 4);
          it.sprite.setDepth(depthOf(cz, 2));
        },
        onComplete: () => {
          removeItem(itemId);
          const at = screenOf(cx, BREW_Y, cz);
          burst(at.x, at.y, BREW[i]!, 10);
        },
      });
    }

    /** A wrong word: the item hops toward the cauldron, puffs smoke, and lands back on the belt. */
    function bounce(itemId: string, i: number): void {
      const it = items.get(itemId);
      if (!it) return;
      it.flying = true;
      recolorTag(it.tag, COLORS.red, 0xffffff);
      const [cx, , cz] = LAYOUT.cauldrons[i]!;
      const start = { x: it.sprite.x, y: it.sprite.y };
      const top = worldPx((beltAt(0.5) + cx) / 2, 1.2, (LAYOUT.belt.z + cz) / 2);
      const u = { v: 0 };
      scene.tweens.add({
        targets: u,
        v: 1,
        duration: 450,
        onUpdate: () => {
          const pos = sim.state.belt.find((b) => b.id === itemId)?.position ?? 0.5;
          const back = worldPx(beltAt(pos), LAYOUT.belt.y, LAYOUT.belt.z);
          const a = u.v < 0.5 ? smooth(u.v * 2) : 1 - smooth((u.v - 0.5) * 2);
          const from = u.v < 0.5 ? start : back;
          it.sprite.setPosition(from.x + (top.x - from.x) * a, from.y + (top.y - from.y) * a);
        },
        onComplete: () => {
          it.flying = false;
          if (held !== itemId) recolorTag(it.tag, COLORS.tagFill, 0xffffff);
        },
      });
      const at = screenOf(cx, 0.8, cz);
      burst(at.x, at.y, 0x9ca3af, 12);
    }

    // ---------------------------------------------------------------- customers and their cards
    const customers = new Map<string, Customer>();
    const cards = new Map<number, Card>();

    function walk(c: Customer, x: number, z: number, speed = 1.6): Promise<void> {
      c.walk?.stop();
      const fx = c.actor.x;
      const fz = c.actor.z;
      const dist = Math.hypot(x - fx, z - fz);
      const u = { v: 0 };
      return new Promise((resolve) => {
        c.walk = scene.tweens.add({
          targets: u,
          v: 1,
          duration: Math.max(200, (dist / speed) * 1000),
          onUpdate: () => c.actor.moveTo(fx + (x - fx) * u.v, fz + (z - fz) * u.v),
          onComplete: () => {
            c.walk = null;
            resolve();
          },
          onStop: () => resolve(),
        });
      });
    }

    function showCard(slot: number): void {
      hideCard(slot);
      const s = sim.state.slots[slot];
      const order = s ? sim.state.orders.find((o) => o.id === s.orderId) : null;
      if (!s || !order) return;
      const w = L.cardWidth;
      const box = scene.add.container(8 + slot * (w + L.gap), L.cardTop).setDepth(18_000);
      const bg = scene.add.graphics();
      const mood = text(scene, 8, 7, MOOD_ICON[s.mood], 17).setOrigin(0, 0);
      box.add([bg, mood]);
      // The words flow and wrap; the first line starts after the mood face.
      const size = L.portrait ? 18 : 17;
      const lineH = size + 9;
      let x = 34;
      let y = 8;
      const words = order.words.map((word) => {
        const label = text(scene, 0, 0, word, size, COLORS.ink).setOrigin(0, 0).setPadding(2, 1, 2, 1);
        if (x + label.width > w - 8 && x > 12) {
          x = 8;
          y += lineH;
        }
        label.setPosition(x, y);
        x += label.width + 4;
        box.add(label);
        return label;
      });
      const h = y + lineH + 14;
      bg.fillStyle(0x000000, 0.3).fillRoundedRect(0, 4, w, h, 12);
      bg.fillStyle(COLORS.paper, 0.97).fillRoundedRect(0, 0, w, h, 12);
      bg.lineStyle(4, BREW[slot]!, 1).strokeRoundedRect(0, 0, w, h, 12);
      const bar = scene.add.graphics();
      box.add(bar);
      const card: Card = { box, words, mood, bar, orderId: order.id, width: w, height: h };
      cards.set(slot, card);
      refreshCard(slot);
      box.setAlpha(0).setY(L.cardTop - 12);
      scene.tweens.add({ targets: box, alpha: 1, y: L.cardTop, duration: 260, ease: 'Back.Out' });
    }

    function hideCard(slot: number): void {
      const card = cards.get(slot);
      if (!card) return;
      cards.delete(slot);
      scene.tweens.add({ targets: card.box, alpha: 0, y: L.cardTop - 12, duration: 200, onComplete: () => card.box.destroy() });
    }

    function refreshCard(slot: number): void {
      const card = cards.get(slot);
      const s = sim.state.slots[slot];
      if (!card || !s) return;
      const cd = sim.state.cauldrons[slot];
      const done = cd?.orderId === card.orderId ? cd.words.length : 0;
      card.mood.setText(MOOD_ICON[s.mood]);
      card.words.forEach((label, k) => {
        label.setColor(k < done ? '#2fa84f' : COLORS.ink);
        label.setBackgroundColor(k === done && sim.state.helper ? '#ffe98a' : '');
      });
    }

    async function arrive(slot: number, customerId: string, kind: string): Promise<void> {
      let c = customers.get(customerId);
      if (!c) {
        const model = edition.bindings[`${kind}.idle`] ? kind : 'villager';
        const actor = new Actor2D(scene, edition, model, PROJECTION, { dirs: 4, clips: clips(model, CUSTOMER_CLIPS_2D[model] ?? ['idle', 'walk']) }, world);
        actor.placeAt(LAYOUT.door[0], LAYOUT.door[2]);
        c = { actor, slot, leaving: false, walk: null };
        customers.set(customerId, c);
      }
      c.slot = slot;
      c.leaving = false;
      audio.play('bell');
      showCard(slot);
      const [x, , z] = LAYOUT.slots[slot]!;
      await walk(c, x, z);
      if (c.leaving) return;
      c.actor.face(0, 1);
      if (c.actor.has('talk')) void c.actor.play('talk');
    }

    function leave(customerId: string, x: number, z: number, remove: boolean): void {
      const c = customers.get(customerId);
      if (!c) return;
      c.leaving = true;
      void walk(c, x, z).then(() => {
        if (!remove || !c.leaving) return;
        c.actor.destroy();
        customers.delete(customerId);
      });
    }

    const headOf = (c: Customer, lift = 1.25) => screenOf(c.actor.x, lift, c.actor.z);

    // ---------------------------------------------------------------- events
    let finished = false;

    function handle(ev: PotionRushEvent): void {
      switch (ev.type) {
        case 'itemSpawned':
          spawnItem(ev.itemId, ev.word, ev.kind);
          break;
        case 'itemLeft':
          removeItem(ev.itemId);
          break;
        case 'customerArrived':
        case 'customerReturned':
          void arrive(ev.slot, ev.customerId, ev.kind);
          break;
        case 'customerSatDown': {
          hideCard(ev.slot);
          const c = customers.get(ev.customerId);
          if (c) {
            const at = headOf(c);
            popup(scene, at.x, at.y, t('waitHere'), 'miss');
            const [x, , z] = LAYOUT.seats[ev.slot % LAYOUT.seats.length]!;
            leave(ev.customerId, x, z, false);
          }
          break;
        }
        case 'moodChanged': {
          refreshCard(ev.slot);
          const c = [...customers.values()].find((x) => x.slot === ev.slot && !x.leaving);
          const clip = ev.mood === 'grumpy' ? GRUMPY.find((k) => c?.actor.has(k)) : ev.mood === 'happy' && c?.actor.has('talk') ? 'talk' : undefined;
          if (c && clip) void c.actor.play(clip);
          break;
        }
        case 'wordAccepted': {
          combo = ev.combo;
          flyIntoCauldron(ev.itemId, ev.cauldron);
          audio.play('plop');
          const [cx, , cz] = LAYOUT.cauldrons[ev.cauldron]!;
          alchemist.face(cx - LAYOUT.alchemist[0], cz - LAYOUT.alchemist[2]);
          void alchemist.play('attack2', 1.6);
          refreshCard(ev.cauldron);
          if (ev.combo >= 3) {
            const at = screenOf(cx, 1.1, cz);
            popup(scene, at.x, at.y, `×${ev.combo}`, 'good');
          }
          break;
        }
        case 'wordRejected':
          combo = 0;
          bounce(ev.itemId, ev.cauldron);
          audio.play('fizz');
          break;
        case 'potionReady':
          stations[ev.cauldron]!.serve.setVisible(true);
          audio.play('ding');
          break;
        case 'potionServed': {
          stations[ev.cauldron]!.serve.setVisible(false);
          hideCard(ev.cauldron);
          const c = customers.get(ev.customerId);
          if (c) {
            const at = headOf(c, 1.4);
            popup(scene, at.x, at.y, t('coinsGained', { coins: ev.coins }), 'good');
            if (ev.tip) scene.time.delayedCall(250, () => popup(scene, at.x, at.y - 28, t('tip', { tip: ev.tip }), 'good'));
            audio.play('coins');
            c.leaving = true;
            const thanks = THANKS.find((k) => c.actor.has(k));
            void (thanks ? c.actor.play(thanks) : Promise.resolve()).then(() => leave(ev.customerId, LAYOUT.door[0], LAYOUT.door[2], true));
          }
          audio.play('correct');
          break;
        }
        case 'rushStarted':
          rushSign.setVisible(true);
          audio.music('rush');
          break;
        case 'rushEnded':
          rushSign.setVisible(false);
          audio.music('shop');
          break;
        case 'shiftComplete':
          void finish();
          break;
      }
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      loop.stop();
      audio.music('calm');
      audio.play('victory');
      void alchemist.play('victory');
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<PotionRushState, PotionRushCommand, PotionRushEvent>(
      sim,
      {
        render: (events) => {
          events.forEach(handle);
          if (events.length) drawStatus(sim.state);
        },
      },
      manual.clock,
    );
    let last = 0;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      // Belt items follow the core's positions (with a small bob); flying items animate themselves.
      for (const b of s.belt) {
        const it = items.get(b.id);
        if (!it || it.flying) continue;
        const x = beltAt(b.position);
        const bob = Math.abs(Math.sin(time / 260 + b.position * 20)) * 0.03;
        const p = worldPx(x, LAYOUT.belt.y + 0.02 + bob, LAYOUT.belt.z);
        it.sprite.setPosition(p.x, p.y).setDepth(depthOf(LAYOUT.belt.z, LAYOUT.belt.y));
        if (!it.dragging) {
          // The tag stays whole on screen at the ends of the belt.
          const at = screenOf(x, LAYOUT.belt.y, LAYOUT.belt.z);
          const half = it.tag.width / 2 + 4;
          it.tag.setPosition(Math.min(L.width - half, Math.max(half, at.x)), at.y - tagOffset);
        }
      }
      alchemist.update(dt);
      for (const c of customers.values()) c.actor.update(dt);
      world.sort('depth');
      // Patience bars, cauldron counts, and brews.
      for (const [slot, card] of cards) {
        const sl = s.slots[slot];
        const f = sl ? Math.max(0, sl.patienceMs / sl.maxPatienceMs) : 0;
        const color = f > 0.5 ? COLORS.green : f > 0.25 ? COLORS.gold : COLORS.red;
        card.bar.clear();
        card.bar.fillStyle(0xe6ddcc, 1).fillRoundedRect(10, card.height - 13, card.width - 20, 6, 3);
        card.bar.fillStyle(color, 1).fillRoundedRect(10, card.height - 13, Math.max(6, (card.width - 20) * f), 6, 3);
      }
      s.cauldrons.forEach((cd, i) => {
        const order = cd.orderId ? s.orders.find((o) => o.id === cd.orderId) : null;
        const label = order ? `${cd.words.length}/${order.words.length}` : '';
        const count = stations[i]!.count;
        if (count.text !== label) count.setText(label).setVisible(!!label);
        drawBrew(i, time);
      });
    };

    scene.events.on('resume', () => loop.reset());
    const hook: PotionRush2DTest = {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command),
      tick: (steps) => {
        for (let k = 0; k < steps; k++) sim.tick().forEach(handle);
        drawStatus(sim.state);
      },
      auto: () => {
        const command = nextDrop(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
      points: () => ({
        items: [...items.values()].filter((it) => !it.flying).map((it) => ({ id: it.id, word: it.word, x: it.tag.x, y: it.tag.y })),
        cauldrons: stations.map(({ hit }) => ({ x: hit.x, y: hit.y })),
        serve: stations.map(({ serve }) => (serve.visible ? { x: serve.x, y: serve.y } : null)),
      }),
      size: () => ({ width: L.width, height: L.height }),
    };
    const qc = window as unknown as { __apk3dView2d?: PotionRush2DTest };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      finished = true;
      loop.stop();
      frame = null;
      if (qc.__apk3dView2d === hook) delete qc.__apk3dView2d;
      unlock?.();
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    drawStatus(sim.state);
    audio.music('shop');
    loop.start();
  }

  let frame: ((time: number) => void) | null = null;
  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#1c1426',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'potion-rush', preload, create, update },
  };
}

const smooth = (u: number): number => u * u * (3 - 2 * u);
