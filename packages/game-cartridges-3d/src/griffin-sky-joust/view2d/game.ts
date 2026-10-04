/**
 * Griffin Sky-Joust in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts).
 * The arena is the core's own flat stage (960 by 540), drawn side-on: the griffin is the fire
 * dragon sheet with the student's hero on its back, each rider is a giant bat with its word on a
 * tag, hills and props line the bottom. A tap flaps (the left or right third also slides), and
 * the keys are Space, the arrows, and W A D.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { animationKeyOf, banner, fitGameSize, popup, registerSheetAnimations, StatusBar2D, tag, textureKeyOf } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { ARENA, TUNING, createGriffinSkyJoust, evidenceOf, isTarget, scoreOf, type JoustCommand, type JoustEvent, type JoustState } from '../core/index.js';
import { FILES_2D, HEROES_2D } from '../manifest.js';
import { nextCommand } from '../qc/bot.js';
import strings from '../strings.en.js';
import { PromptPanel2D } from './prompt.js';

/** On-screen sizes in arena pixels (before the fit scale): the sprites read larger than the hit circles. */
const GRIFFIN_PX = 112;
const RIDER_PX = 96;
const HERO_PX = 52;
/** The hero's seat on the griffin's back, in arena pixels from the griffin's center. */
const SEAT = { x: 0, y: -26 };
const GROUND_PROPS = ['pine-tree', 'oak-tree', 'rock-cluster', 'bush', 'pine-tree', 'oak-tree', 'bush', 'rock-cluster', 'pine-tree', 'oak-tree'] as const;

interface Rider2D {
  sprite: Phaser.GameObjects.Sprite;
  tag: Phaser.GameObjects.Container;
  x: number;
  y: number;
  dir: 'e' | 'w';
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('griffinSkyJoust')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createGriffinSkyJoust(story, { seed, helper: options.helper });
  const needed = FILES_2D.filter((id) => {
    const model = id.split('.')[0]!;
    return !(HEROES_2D as readonly string[]).includes(model) || model === heroId;
  }).filter((id) => edition.bindings[id]);
  const [width, height] = fitGameSize();
  const audio = ctx.audio ?? new AudioBus();
  const unlock = ctx.audio ? null : installAudioUnlock(audio);
  let frame: ((time: number) => void) | null = null;

  function preload(this: Phaser.Scene): void {
    preloadAssetBindings(this.load, edition, needed, ctx.resolveUrl);
  }

  function create(this: Phaser.Scene): void {
    const scene = this;
    const { width: W, height: H } = scene.scale;
    const startedAt = performance.now();
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);
    const has = (id: string): boolean => !!edition.bindings[id];

    // ---------------------------------------------------------------- the arena on screen
    const top = 168;
    const s = Math.max(0.2, Math.min(W / ARENA.width, (H - top - 8) / ARENA.height));
    const ox = (W - ARENA.width * s) / 2;
    const oy = H - ARENA.height * s - 8;
    const sx = (x: number): number => ox + x * s;
    const sy = (y: number): number => oy + y * s;

    scene.cameras.main.setBackgroundColor('#8fd0f5');
    // Clouds drift behind everything.
    const clouds = Array.from({ length: 6 }, (_, i) => {
      const y = oy + (40 + ((i * 83) % 260)) * s;
      const c = scene.add.ellipse(sx((i * 190) % ARENA.width), y, (150 + (i % 3) * 50) * s, 46 * s, 0xffffff, 0.85).setDepth(-100);
      return { c, speed: 8 + (i % 3) * 5 };
    });
    // The hills and the props along the bottom.
    scene.add.rectangle(W / 2, H, W, (ARENA.height - 500) * s + 30 + (H - (oy + ARENA.height * s)), 0x7fb24e).setOrigin(0.5, 1).setDepth(-50);
    GROUND_PROPS.forEach((name, i) => {
      const id = `prop.${name}`;
      const file = edition.pack.files[id];
      if (!file || !has(id)) return;
      const sprite = scene.add.image(sx(40 + i * 96), sy(ARENA.height - 6), textureKeyOf(edition, id), 0).setScale(0.45 * s * (0.9 + (i % 3) * 0.15)).setDepth(-40);
      if (file.origin) sprite.setOrigin(file.origin.x, file.origin.y);
    });

    // ---------------------------------------------------------------- the griffin and its rider
    const spriteOf = (fileId: string, px: number): Phaser.GameObjects.Sprite => {
      const file = edition.pack.files[fileId];
      const sprite = scene.add.sprite(0, 0, file ? textureKeyOf(edition, file.id) : '__MISSING');
      sprite.setScale((px * s) / Math.max(1, sprite.width));
      if (file?.origin) sprite.setOrigin(file.origin.x, file.origin.y);
      return sprite;
    };
    const play = (sprite: Phaser.GameObjects.Sprite, fileId: string, clip: string, dir: string): void => {
      if (!has(fileId)) return;
      const key = animationKeyOf(edition, fileId, `${clip}.${dir}`);
      if (sprite.anims.currentAnim?.key !== key) sprite.play(key);
    };
    const griffin = spriteOf('dragon-fire.fly', GRIFFIN_PX).setDepth(500);
    const hero = spriteOf(`${heroId}.idle`, HERO_PX).setDepth(501);
    let facing: 'e' | 'w' = 'e';
    let heroBusyUntil = 0;
    let griffinBusyUntil = 0;

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const panel = new PromptPanel2D(scene, 66);

    audio.defineMood('joust', { bpm: 124, chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]], busy: true, drum: false });
    audio.defineSfx('flap', (sx2) => sx2.noise(0.18, 0.1, 900));
    audio.defineSfx('strike', (sx2) => [660, 880, 1320].forEach((f, i) => sx2.tone(f, 0.2, 'triangle', 0.14, i * 0.05)));
    audio.defineSfx('cast', (sx2) => [523, 659, 784, 1047].forEach((f, i) => sx2.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
    audio.defineSfx('bump', (sx2) => sx2.noise(0.25, 0.14, 400));

    function drawHud(): void {
      const st = sim.state;
      const sentence = st.sentences[Math.min(st.sentence, st.sentences.length - 1)];
      status.set(t('sentence', { index: Math.min(st.sentence + 1, st.sentences.length), total: st.sentences.length }), '●'.repeat(st.courage) + '○'.repeat(Math.max(0, TUNING.courage - st.courage)));
      if (sentence) panel.set(t('next'), sentence.translation ?? t('build'), sentence.words, sentence.cleared ? sentence.words.length : st.word, st.helper);
    }

    // ---------------------------------------------------------------- riders
    const riders = new Map<string, Rider2D>();
    const struck = new Set<string>();
    function addRider(r: JoustState['riders'][number]): void {
      const sprite = spriteOf('giant-bat.fly', RIDER_PX).setDepth(400);
      const label = tag(scene, r.text, 18).setDepth(16_000);
      const dir = r.vx > 0 ? 'e' : 'w';
      play(sprite, 'giant-bat.fly', 'fly', dir);
      riders.set(r.id, { sprite, tag: label, x: r.x, y: r.y, dir });
    }
    function removeRider(id: string): void {
      const view = riders.get(id);
      if (!view) return;
      riders.delete(id);
      view.tag.destroy();
      if (struck.delete(id) && has('giant-bat.death')) {
        view.sprite.play(animationKeyOf(edition, 'giant-bat.death', `death.${view.dir}`));
        scene.tweens.add({ targets: view.sprite, alpha: 0, duration: 700, onComplete: () => view.sprite.destroy() });
        return;
      }
      view.sprite.destroy();
    }
    function syncRiders(): void {
      const live = new Set(sim.state.riders.map((r) => r.id));
      for (const r of sim.state.riders) if (!riders.has(r.id)) addRider(r);
      for (const id of [...riders.keys()]) if (!live.has(id)) removeRider(id);
    }

    // ---------------------------------------------------------------- input
    function send(command: JoustCommand): void {
      const st = sim.state;
      if (st.phase === 'playing' && st.restMs <= 0) loop.dispatch(command);
    }
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      const u = p.x / Math.max(1, W);
      send({ type: 'flap', dir: u < 0.33 ? -1 : u > 0.67 ? 1 : 0 });
    });
    let wasFlap = false;
    let lastDriftMs = 0;
    function readKeys(time: number): void {
      const pressed = new Set(ctx.inputController.snapshot().pressed ?? []);
      const dir = ((pressed.has('ArrowRight') || pressed.has('KeyD') ? 1 : 0) - (pressed.has('ArrowLeft') || pressed.has('KeyA') ? 1 : 0)) as -1 | 0 | 1;
      const flap = pressed.has('Space') || pressed.has('ArrowUp') || pressed.has('KeyW');
      if (flap && !wasFlap) send({ type: 'flap', dir });
      else if (dir !== 0 && time - lastDriftMs >= 66) {
        lastDriftMs = time;
        send({ type: 'drift', dir });
      }
      wasFlap = flap;
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const griffinTop = () => ({ x: griffin.x, y: griffin.y - 70 * s });
    function burst(x: number, y: number, color: number, n: number): void {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 24 + Math.random() * 34;
        const dot = scene.add.circle(x, y, 3 + Math.random() * 3, color).setDepth(18_000);
        scene.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 600, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    function handle(ev: JoustEvent): void {
      switch (ev.type) {
        case 'sentenceStarted':
          syncRiders();
          break;
        case 'flapped':
          if (ev.dir !== 0) facing = ev.dir > 0 ? 'e' : 'w';
          audio.play('flap');
          break;
        case 'wordStruck': {
          struck.add(ev.riderId);
          burst(sx(ev.x), sy(ev.y), 0xffe27a, 14);
          audio.play('strike');
          if (has(`${heroId}.victory`)) {
            hero.play(animationKeyOf(edition, `${heroId}.victory`, 'victory.s'));
            heroBusyUntil = performance.now() + 900;
          }
          const at = griffinTop();
          popup(scene, at.x, at.y, t('struck'), 'good', 19_000);
          break;
        }
        case 'bumped': {
          audio.play('bump');
          scene.cameras.main.shake(250, 0.005);
          if (has('dragon-fire.hit')) {
            griffin.play(animationKeyOf(edition, 'dragon-fire.hit', `hit.${facing}`));
            griffinBusyUntil = performance.now() + 700;
          }
          if (has(`${heroId}.hit`)) {
            hero.play(animationKeyOf(edition, `${heroId}.hit`, 'hit.s'));
            heroBusyUntil = performance.now() + 700;
          }
          const at = griffinTop();
          popup(scene, at.x, at.y, ev.courage === 0 ? t('resting') : ev.strike ? t('wrong') : t('bump'), 'miss', 19_000);
          break;
        }
        case 'rested': {
          const at = griffinTop();
          popup(scene, at.x, at.y, t('rested'), 'good', 19_000);
          break;
        }
        case 'sentenceDone':
          audio.play('cast');
          burst(griffin.x, griffin.y - 30 * s, 0xc9a7ff, 24);
          void banner(scene, t('done.title'), t('done.text'), 1.1);
          break;
        case 'joustComplete':
          void finish();
          break;
      }
      syncRiders();
      drawHud();
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      loop.stop();
      audio.music('calm');
      audio.play('victory');
      burst(griffin.x, griffin.y - 30 * s, 0xffe27a, 30);
      await banner(scene, t('finish.title'), t('finish.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<JoustState, JoustCommand, JoustEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    const shown = { x: sim.state.griffin.x, y: sim.state.griffin.y };
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const st = sim.state;
      if (!finished) readKeys(time);
      const k = 1 - Math.exp(-dt * 24);
      if (Math.abs(st.griffin.x - shown.x) > 300 || st.restMs > 0) shown.x = st.griffin.x;
      else shown.x += (st.griffin.x - shown.x) * k;
      shown.y += (st.griffin.y - shown.y) * k;
      if (Math.abs(st.griffin.vx) > 20) facing = st.griffin.vx > 0 ? 'e' : 'w';
      const bob = Math.sin(time / 260) * 2;
      griffin.setPosition(sx(shown.x), sy(shown.y + bob));
      hero.setPosition(sx(shown.x + SEAT.x), sy(shown.y + SEAT.y + bob));
      const now = performance.now();
      if (now >= griffinBusyUntil) play(griffin, 'dragon-fire.fly', 'fly', facing);
      if (now >= heroBusyUntil && has(`${heroId}.idle`)) play(hero, `${heroId}.idle`, 'idle', 's');
      const visible = st.restMs > 0 ? Math.floor(time / 200) % 2 === 0 : st.griffin.safeMs > 0 ? Math.floor(time / 120) % 2 === 0 : true;
      griffin.setVisible(visible);
      hero.setVisible(visible);
      for (const r of st.riders) {
        const view = riders.get(r.id);
        if (!view) continue;
        view.x += (r.x - view.x) * k;
        view.y = r.y;
        const dir = r.vx > 0 ? 'e' : 'w';
        if (dir !== view.dir) {
          view.dir = dir;
          play(view.sprite, 'giant-bat.fly', 'fly', dir);
        }
        view.sprite.setPosition(sx(view.x), sy(view.y));
        view.tag.setPosition(sx(view.x), sy(view.y) - (RIDER_PX * 0.5 + 6) * s - 14);
        view.tag.setScale(st.helper && isTarget(st, r) ? 1.15 : 1);
      }
      for (const { c, speed } of clouds) {
        c.x += speed * dt * s;
        if (c.x > W + 100) c.x = -100;
      }
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: JoustCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let n = 0; n < steps; n++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextCommand(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
      /** Game-pixel points of the riders (for real taps and screenshots). */
      points: () => ({ gates: [...riders.values()].map((v) => ({ x: v.sprite.x, y: v.sprite.y })) }),
      size: () => ({ width: W, height: H }),
    };
    const qc = window as unknown as { __apk3dView2d?: typeof hook };
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

    drawHud();
    audio.music('joust');
    play(griffin, 'dragon-fire.fly', 'fly', facing);
    play(hero, `${heroId}.idle`, 'idle', 's');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#8fd0f5',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'griffin-sky-joust', preload, create, update },
  };
}
