/**
 * Abyssal Well in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts): the forge
 * sprite of the chosen hero stands on the rim of a drawn well, and a creature sprite with a word
 * tag climbs each lane. The events of a command play in order; nothing is timed.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { Actor2D, Arena2D, banner, COLORS, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, text, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import {
  angleDelta,
  archerPoint,
  createAbyssalWell,
  laneAngle,
  lanePoint,
  nextEnemyOf,
  resultsOf,
  type AbyssalWellCommand,
  type AbyssalWellEvent,
  type AbyssalWellInput,
  type EnemyShown,
} from '../core/index.js';
import { CREATURE_CLIPS_2D, FILES_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextCommand } from '../qc/bot.js';
import strings from '../strings.en.js';
import { GROUND_FILE, makeGround, PROJECTION } from './ground.js';

const BODY_Y = 0.85;
const TAG_FILL = 0x1d2a44;
const TAG_BORDER = 0x8fb2e8;

interface EnemyView {
  data: EnemyShown;
  actor: Actor2D;
  tag: Phaser.GameObjects.Container;
  depth: number;
  appear: number;
  gone: boolean;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  if (Array.isArray(ctx.input)) throw new Error('Abyssal Well needs a story input.');
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('abyssalWell')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'wizard';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createAbyssalWell(story as AbyssalWellInput, { seed, helper: options.helper });
  const needed = FILES_2D.filter((id) => {
    const model = id.split('.')[0]!;
    return !(HEROES_2D as readonly string[]).includes(model) || model === heroId;
  }).filter((id) => edition.bindings[id]);
  const [width, height] = fitGameSize();
  const audio = ctx.audio ?? new AudioBus();
  const unlock = ctx.audio ? null : installAudioUnlock(audio);
  let frame: ((time: number, dt: number) => void) | null = null;

  function preload(this: Phaser.Scene): void {
    preloadAssetBindings(this.load, edition, needed, ctx.resolveUrl);
  }

  function create(this: Phaser.Scene): void {
    const scene = this;
    const { width: W, height: H } = scene.scale;
    const startedAt = performance.now();
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);
    const clips = (model: string, list: readonly string[]) => list.filter((c) => edition.bindings[`${model}.${c}`]);
    const wait = (seconds: number): Promise<void> => new Promise((resolve) => scene.time.delayedCall(seconds * 1000, () => resolve()));

    // ---------------------------------------------------------------- the well
    scene.cameras.main.setBackgroundColor('#090d1c');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    const zoom = Math.max(0.5, Math.min(W / 780, (H - 150) / 520));
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: zoom, top: 66 });
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, clips: clips(heroId, HERO_CLIPS_2D), stiffness: 30 }, arena.world);
    let angle = laneAngle(sim.state.lane);
    let angleTarget = angle;
    {
      const p = archerPoint(angle);
      hero.placeAt(p.x, p.z);
      hero.face(-Math.sin(angle), -Math.cos(angle));
    }
    arena.follow(0, 0.3, 0, true);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const translation = text(scene, W / 2, 0, '', 15).setOrigin(0.5, 0).setScrollFactor(0).setDepth(19_001).setStroke('#05060d', 4);
    let hearts = '';
    let descentLabel = '';
    const drawStatus = (): void => status.set(descentLabel, hearts);
    const setCourage = (value: number): void => {
      hearts = '❤'.repeat(value) + '♡'.repeat(Math.max(0, sim.state.maxCourage - value));
      drawStatus();
    };
    setCourage(sim.state.courage);

    audio.defineMood('well', { bpm: 84, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], busy: false, drum: false });
    audio.defineSfx('arrow', (s) => s.noise(0.18, 0.1, 1900));

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2;
        const d = 22 + (k % 4) * 8;
        const dot = scene.add.circle(at.x, at.y, 3 + (k % 3), color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + (k % 3) * 80, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- the creatures
    const enemies = new Map<string, EnemyView>();
    let words: string[] = [];

    function addEnemy(data: EnemyShown): void {
      const actor = new Actor2D(scene, edition, data.creature, PROJECTION, { dirs: 4, clips: clips(data.creature, CREATURE_CLIPS_2D[data.creature] ?? []), stiffness: 30 }, arena.world);
      const p = lanePoint(data.lane, data.depth);
      actor.placeAt(p.x, p.z);
      actor.face(Math.sin(laneAngle(data.lane)), Math.cos(laneAngle(data.lane)));
      const label = tag(scene, data.word, 20, TAG_FILL, TAG_BORDER).setDepth(15_100);
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => command({ type: 'fire', lane: data.lane }));
      enemies.set(data.id, { data: { ...data }, actor, tag: label, depth: data.depth, appear: 0, gone: false });
    }

    function removeEnemy(id: string): void {
      const v = enemies.get(id);
      if (!v) return;
      v.actor.destroy();
      v.tag.destroy();
      enemies.delete(id);
    }

    function clearEnemies(): void {
      for (const id of [...enemies.keys()]) removeEnemy(id);
    }

    function drawHud(): void {
      const s = sim.state;
      if (s.descents[s.descent]) panel.sentence(words, s.next, s.helper);
      translation.setY(panel.bottom + 2);
      arena.top = panel.bottom + (translation.text ? 22 : 0);
      descentLabel = t('descent', { descent: Math.min(s.descent + 1, s.descentCount), descents: s.descentCount });
      drawStatus();
      const nextEnemy = nextEnemyOf(s);
      for (const v of enemies.values()) {
        const hot = v.data.lane === s.lane || (s.helper && nextEnemy?.id === v.data.id);
        recolorTag(v.tag, hot ? 0x2f4a86 : TAG_FILL, hot ? COLORS.gold : TAG_BORDER);
      }
    }

    const over = (id: string) => {
      const v = enemies.get(id);
      const p = v ? lanePoint(v.data.lane, v.depth) : { x: 0, z: 0 };
      return arena.at(p.x, 2.0, p.z);
    };
    const heroOver = () => {
      const p = archerPoint(angle);
      return arena.at(p.x, 2.2, p.z);
    };

    // ---------------------------------------------------------------- events, one command at a time
    let busy = false;
    let finished = false;

    async function arrow(fromAt: { x: number; z: number }, toAt: { x: number; z: number }, color: number): Promise<void> {
      const a = arena.at(fromAt.x, 1.0, fromAt.z);
      const b = arena.at(toAt.x, BODY_Y, toAt.z);
      const dot = scene.add.circle(a.x, a.y, 7 * arena.scale, color).setDepth(16_500);
      await new Promise<void>((resolve) => scene.tweens.add({ targets: dot, x: b.x, y: b.y, duration: 380, ease: 'Sine.In', onComplete: () => resolve() }));
      dot.destroy();
    }

    async function show(ev: AbyssalWellEvent): Promise<void> {
      switch (ev.type) {
        case 'descentStarted':
          clearEnemies();
          words = ev.words;
          translation.setText(ev.translation ?? '');
          for (const e of ev.enemies) addEnemy(e);
          drawHud();
          await wait(0.7);
          break;
        case 'moved':
          angleTarget = angle + angleDelta(angle, laneAngle(ev.lane));
          drawHud();
          await wait(0.3);
          break;
        case 'fired': {
          const v = enemies.get(ev.enemyId);
          hero.face(Math.sin(laneAngle(ev.lane)) * -1, Math.cos(laneAngle(ev.lane)) * -1);
          void hero.play(hero.has('attack') ? 'attack' : 'idle');
          audio.play('arrow');
          if (v) await arrow(archerPoint(angle), lanePoint(v.data.lane, v.depth), ev.correct ? 0x7dffb0 : 0xff8a6a);
          break;
        }
        case 'struck': {
          const v = enemies.get(ev.enemyId);
          if (v) {
            v.gone = true;
            v.tag.setVisible(false);
            const p = lanePoint(v.data.lane, v.depth);
            burst(p.x, BODY_Y, p.z, 0x7dffb0, 16);
            const at = over(ev.enemyId);
            popup(scene, at.x, at.y, t('struck'), 'good');
            v.actor.flash(0x7dffb0);
            void v.actor.play(v.actor.has('death') ? 'death' : 'idle', 1, true);
          }
          audio.play('correct');
          await wait(0.45);
          removeEnemy(ev.enemyId);
          drawHud();
          break;
        }
        case 'repelled': {
          const v = enemies.get(ev.enemyId);
          if (v) {
            v.actor.flash(0xff4a3a);
            void v.actor.play(v.actor.has('hit') ? 'hit' : 'idle');
            recolorTag(v.tag, 0x4a2a2a, COLORS.red);
            const at = over(ev.enemyId);
            popup(scene, at.x, at.y, t('bounced'), 'miss');
          }
          scene.cameras.main.shake(180, 0.003);
          audio.play('wrong');
          await wait(0.5);
          break;
        }
        case 'courageLost': {
          setCourage(ev.courage);
          const at = heroOver();
          popup(scene, at.x, at.y, t('courageLost'), 'miss', 17_800);
          hero.flash(0xff4a3a);
          break;
        }
        case 'rest':
          setCourage(ev.courage);
          await banner(scene, t('rest.title'), t('rest.text'), 2.2);
          break;
        case 'climbed':
          for (const m of ev.moves) {
            const v = enemies.get(m.id);
            if (!v) continue;
            v.data.depth = m.depth;
            if (v.actor.has('walk') && m.depth > v.depth) v.actor.loop('walk');
          }
          await wait(0.5);
          for (const m of ev.moves) enemies.get(m.id)?.actor.loop('idle');
          drawHud();
          break;
        case 'spawned':
          addEnemy(ev.enemy);
          drawHud();
          await wait(0.25);
          break;
        case 'descentCleared':
          audio.play('victory');
          void hero.play(hero.has('attack2') ? 'attack2' : 'idle');
          await wait(0.6);
          break;
        case 'wellComplete':
          await finish();
          break;
        case 'rejected':
          break;
      }
    }

    async function play(events: readonly AbyssalWellEvent[]): Promise<void> {
      busy = true;
      try {
        for (const ev of events) {
          if (finished && ev.type !== 'wellComplete') break;
          await show(ev);
        }
      } finally {
        busy = false;
      }
      drawHud();
    }

    function command(c: AbyssalWellCommand): void {
      if (busy || finished) return;
      void play(sim.dispatch(c));
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      audio.music('calm');
      audio.play('victory');
      void hero.play('victory', 1, true);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const { results, outcome, evidence } = resultsOf(sim.state, story, seed, performance.now() - startedAt);
      ctx.complete(results, outcome, evidence);
    }

    // ---------------------------------------------------------------- frames: the keyboard and the drawing
    let held = new Set<string>();
    frame = (time: number, dt: number) => {
      const keys = new Set(ctx.inputController.snapshot().keys);
      const press = (...codes: string[]) => codes.some((c) => keys.has(c) && !held.has(c));
      if (!finished) {
        if (press('ArrowLeft', 'KeyA')) command({ type: 'rotate', dir: -1 });
        else if (press('ArrowRight', 'KeyD')) command({ type: 'rotate', dir: 1 });
        else if (press('Space', 'Enter')) command({ type: 'fire' });
      }
      held = keys;
      angle += (angleTarget - angle) * Math.min(1, dt * 9);
      const hp = archerPoint(angle);
      hero.moveTo(hp.x, hp.z);
      hero.face(-Math.sin(angle), -Math.cos(angle));
      hero.update(dt);
      for (const v of enemies.values()) {
        v.appear = v.gone ? Math.max(0, v.appear - dt * 4) : Math.min(1, v.appear + dt * 3);
        v.depth += (v.data.depth - v.depth) * Math.min(1, dt * 8);
        const p = lanePoint(v.data.lane, v.depth);
        v.actor.moveTo(p.x, p.z);
        v.actor.update(dt);
        v.actor.sprite.setScale(Math.max(0.01, v.appear));
        v.tag.setDepth(15_100 + p.z);
        if (!v.gone) arena.pin(v.tag, p.x, BODY_Y + Math.sin(time / 500 + v.data.lane) * 0.04, p.z, 48 * arena.scale);
      }
      arena.follow(0, 0.3, dt);
      arena.sort();
    };

    scene.events.on('resume', () => undefined);
    const hook = {
      state: () => sim.state,
      dispatch: (c: unknown) => void play(sim.dispatch(c as AbyssalWellCommand)),
      tick: () => undefined,
      auto: () => {
        const c = busy ? null : nextCommand(sim.state);
        if (c) command(c);
        return !!c;
      },
      busy: () => busy,
      size: () => ({ width: W, height: H }),
    };
    const qc = window as unknown as { __apk3dView2d?: typeof hook };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      finished = true;
      frame = null;
      if (qc.__apk3dView2d === hook) delete qc.__apk3dView2d;
      unlock?.();
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    drawHud();
    audio.music('well');
    command({ type: 'start' });
  }

  let last = 0;
  function update(this: Phaser.Scene, time: number): void {
    const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
    last = time;
    frame?.(time, dt);
  }

  return {
    width,
    height,
    backgroundColor: '#090d1c',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'abyssal-well', preload, create, update },
  };
}
