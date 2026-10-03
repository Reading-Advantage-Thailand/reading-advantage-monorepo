/**
 * Gryphon Patrol in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts).
 * The camera looks across the sky from the side: the gryphon (the fire dragon sprite, tinted)
 * flies with its rider, the bats circle with their words on banners the student taps, the shot
 * and the word orb cross the sky, and the forest and village sit on the ground below.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { animationKeyOf, banner, COLORS, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, textureKeyOf } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { SKY, TUNING, createGryphonPatrol, evidenceOf, scoreOf, type PatrolCommand, type PatrolEvent, type PatrolState } from '../core/index.js';
import { FILES_2D, HEROES_2D } from '../manifest.js';
import { nextChoice } from '../qc/bot.js';
import strings from '../strings.en.js';
import { GRYPHON_TINT, SIZES, groundLayout } from '../view/sky-plan.js';
import { PromptPanel2D } from './prompt.js';

/** Frame widths of the sheets in pixels, to size a sprite in meters. */
const FRAME = { gryphon: 156, bat: 112, rider: 120 } as const;

interface Bat2D {
  id: string;
  roundId: string;
  sprite: Phaser.GameObjects.Sprite;
  tag: Phaser.GameObjects.Container;
  leaving: boolean;
  dir: 'e' | 'w';
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as StoryInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('gryphonPatrol')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createGryphonPatrol(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the side camera
    /** Pixels per meter across, and up (a tall screen spreads the sky out vertically), and the ground line. */
    const kx = W / (SKY.width + 3);
    const groundY = H * 0.9;
    const ky = Math.max(8, (H * 0.56) / SKY.height);
    const screen = (x: number, y: number) => ({ x: W / 2 + (x - SKY.width / 2) * kx, y: groundY - y * ky });
    const toSky = (px: number, py: number) => ({ x: (px - W / 2) / kx + SKY.width / 2, y: (groundY - py) / ky });
    const scaleOf = (fileId: string, meters: number, frameWidth: number): number => (has(fileId) ? (meters * kx) / frameWidth : 1);

    // ---------------------------------------------------------------- the land
    scene.cameras.main.setBackgroundColor('#8fcdf2');
    scene.add.rectangle(W / 2, groundY + (H - groundY) / 2, W, H - groundY + 2, 0x74ad4c).setDepth(-1000);
    scene.add.rectangle(W / 2, groundY - 18, W, 36, 0x8ec063, 0.7).setDepth(-1001);
    // Soft clouds.
    const clouds = Array.from({ length: 5 }, (_, i) => scene.add.ellipse(0, 0, 150 + (i % 3) * 40, 44 + (i % 2) * 10, 0xffffff, 0.8).setDepth(-2000).setPosition((i * W) / 4, H * (0.12 + (i % 3) * 0.07)));
    // Props along the ground (the 3D layout, near props in front).
    for (const p of groundLayout()) {
      const id = `prop.${p.name}`;
      if (!has(id)) continue;
      const file = edition.pack.files[id]!;
      const px = W / 2 + p.x * (1 + p.depth * 0.5) * kx * 0.55;
      const sprite = scene.add.image(px, groundY - p.depth * 26, textureKeyOf(edition, id), 0).setScale(kx * 0.075 * p.scale * (/tree|cottage/.test(p.name) ? 1.5 : 1));
      if (file.origin) sprite.setOrigin(file.origin.x, file.origin.y);
      sprite.setDepth(-500 - p.depth * 100);
      if (p.turn > 3.1) sprite.setFlipX(true);
    }

    // ---------------------------------------------------------------- the gryphon and its rider
    const gryphonFile = edition.pack.files['dragon-fire.fly'];
    const gryphon = scene.add.sprite(0, 0, gryphonFile ? textureKeyOf(edition, gryphonFile.id) : '__MISSING').setScale(scaleOf('dragon-fire.fly', SIZES.gryphon * 1.3, FRAME.gryphon)).setTint(GRYPHON_TINT);
    if (gryphonFile?.origin) gryphon.setOrigin(gryphonFile.origin.x, gryphonFile.origin.y);
    const riderFile = edition.pack.files[`${heroId}.idle`];
    const rider = scene.add.sprite(0, 0, riderFile ? textureKeyOf(edition, riderFile.id) : '__MISSING').setScale(scaleOf(`${heroId}.idle`, SIZES.rider, FRAME.rider));
    if (riderFile?.origin) rider.setOrigin(riderFile.origin.x, riderFile.origin.y);
    const dirOf = (facing: number): 'e' | 'w' => (facing > 0 ? 'e' : 'w');
    let gryphonClip = '';
    let busyUntil = 0;
    const gryphonLoop = (dir: 'e' | 'w'): void => {
      const key = `fly.${dir}`;
      if (gryphonClip === key || !has('dragon-fire.fly')) return;
      gryphonClip = key;
      gryphon.play(animationKeyOf(edition, 'dragon-fire.fly', key));
    };
    const gryphonPlay = (file: string, name: string, dir: 'e' | 'w'): void => {
      if (!has(`dragon-fire.${file}`)) return;
      gryphonClip = '';
      busyUntil = performance.now() + 900;
      gryphon.play(animationKeyOf(edition, `dragon-fire.${file}`, `${name}.${dir}`));
    };
    let riderClip = '';
    const riderPlay = (name: 'idle' | 'victory' | 'hit', dir: 'e' | 'w'): void => {
      const key = `${name}.${dir}`;
      if (riderClip === key || !has(`${heroId}.${name}`)) return;
      riderClip = key;
      rider.play(animationKeyOf(edition, `${heroId}.${name}`, key));
    };

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const panel = new PromptPanel2D(scene, 66);

    audio.defineMood('patrol', { bpm: 112, chords: [[62, 66, 69], [67, 71, 74], [64, 67, 71], [69, 73, 76]], busy: true, drum: false });
    audio.defineSfx('shoot', (sx) => sx.noise(0.18, 0.12, 1400));
    audio.defineSfx('collect', (sx) => [784, 988, 1319].forEach((f, i) => sx.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
    audio.defineSfx('cast', (sx) => [523, 659, 784, 1047].forEach((f, i) => sx.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
    audio.defineSfx('fizzle', (sx) => sx.noise(0.3, 0.12, 500));

    function drawHud(): void {
      const st = sim.state;
      const sentence = st.sentences[Math.min(st.sentence, st.sentences.length - 1)];
      status.set(t('sentence', { index: Math.min(st.sentence + 1, st.sentences.length), total: st.sentences.length }), '●'.repeat(st.courage) + '○'.repeat(Math.max(0, TUNING.courage - st.courage)));
      if (sentence) panel.set(t('next'), sentence.translation ?? t('build'), sentence.words, st.word, st.helper);
    }

    // ---------------------------------------------------------------- bats
    const bats = new Map<string, Bat2D>();
    const shot = scene.add.circle(0, 0, 8, 0xffa23a, 0.95).setStrokeStyle(4, 0xffffff, 0.7).setVisible(false).setDepth(5000);
    const orb = scene.add.circle(0, 0, 14, 0xffd84a, 0.95).setStrokeStyle(4, 0xffffff, 0.8).setVisible(false).setDepth(5000);

    function shoot(enemy: string): void {
      const st = sim.state;
      if (st.round && st.round.stage === 'aim' && st.restMs <= 0) loop.dispatch({ type: 'shoot', enemy });
    }
    function raiseBats(roundId: string, enemies: readonly { id: string; text: string }[]): void {
      const round = sim.state.round;
      const file = edition.pack.files['giant-bat.fly'];
      enemies.forEach((info) => {
        const core = round?.id === roundId ? round.enemies.find((e) => e.id === info.id) : undefined;
        const sprite = scene.add.sprite(0, 0, file ? textureKeyOf(edition, file.id) : '__MISSING').setScale(scaleOf('giant-bat.fly', SIZES.bat * 1.2, FRAME.bat));
        if (file?.origin) sprite.setOrigin(file.origin.x, file.origin.y);
        if (has('giant-bat.fly')) sprite.play(animationKeyOf(edition, 'giant-bat.fly', 'fly.w'));
        const label = tag(scene, info.text, 20).setDepth(16_000);
        label.setInteractive({ useHandCursor: true }).on('pointerup', () => shoot(info.id));
        const at = screen(core?.x ?? 0, core?.y ?? 5);
        sprite.setPosition(at.x, at.y);
        bats.set(`${roundId}:${info.id}`, { id: info.id, roundId, sprite, tag: label, leaving: false, dir: 'w' });
      });
    }
    function dropBat(key: string): void {
      const bat = bats.get(key);
      if (!bat) return;
      bat.sprite.destroy();
      bat.tag.destroy();
      bats.delete(key);
    }
    function flee(key: string): void {
      const bat = bats.get(key);
      if (!bat || bat.leaving) return;
      bat.leaving = true;
      bat.tag.disableInteractive();
      const side = bat.sprite.x < W / 2 ? -1 : 1;
      scene.tweens.add({ targets: [bat.sprite, bat.tag], x: `+=${side * W * 0.5}`, y: '-=140', alpha: 0, duration: 800, onComplete: () => dropBat(key) });
    }

    // Taps on the empty sky send the gryphon there; keys 1-4 shoot, arrows or WASD fly.
    scene.input.on('pointerup', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length || finished) return;
      const at = toSky(p.x, p.y);
      loop.dispatch({ type: 'moveTo', x: at.x, y: at.y });
    });
    const held = new Set<string>();
    function readKeys(): void {
      const pressed = ctx.inputController.snapshot().pressed ?? [];
      const st = sim.state;
      for (const key of pressed) {
        if (held.has(key)) continue;
        const digit = /^(?:Digit|Numpad)([1-4])$/.exec(key);
        if (digit && st.round && Number(digit[1]) <= st.round.enemies.length) {
          const enemy = st.round.enemies[Number(digit[1]) - 1]!;
          if (enemy.alive) shoot(enemy.id);
        }
        const dx = key === 'ArrowLeft' || key === 'KeyA' ? -1.5 : key === 'ArrowRight' || key === 'KeyD' ? 1.5 : 0;
        const dy = key === 'ArrowUp' || key === 'KeyW' ? 1.2 : key === 'ArrowDown' || key === 'KeyS' ? -1.2 : 0;
        if (dx || dy) loop.dispatch({ type: 'moveTo', x: st.gryphon.toX + dx, y: st.gryphon.toY + dy });
      }
      held.clear();
      for (const key of pressed) held.add(key);
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const gryphonTop = () => ({ x: gryphon.x, y: gryphon.y - SIZES.gryphon * kx * 0.6 });

    function burst(x: number, y: number, color: number, n: number): void {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3 * i;
        const d = 24 + (i % 4) * 9;
        const dot = scene.add.circle(x, y, 3 + (i % 3), color).setDepth(18_000);
        scene.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 600, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    function handle(ev: PatrolEvent): void {
      switch (ev.type) {
        case 'roundStarted':
          for (const key of [...bats.keys()]) dropBat(key);
          raiseBats(ev.roundId, ev.enemies);
          break;
        case 'shotFired':
          audio.play('shoot');
          gryphonPlay('hit', 'hit', dirOf(sim.state.gryphon.facing));
          shot.setVisible(true);
          break;
        case 'enemyHit': {
          shot.setVisible(false);
          const pick = bats.get(`${ev.roundId}:${ev.enemy}`);
          for (const [key, bat] of bats) {
            if (bat.roundId !== ev.roundId) continue;
            if (bat.id === ev.enemy) recolorTag(bat.tag, ev.correct ? COLORS.green : COLORS.red, 0xffffff);
            else {
              bat.tag.setAlpha(0.45);
              flee(key);
            }
            bat.tag.disableInteractive();
          }
          if (pick) {
            pick.leaving = true;
            burst(pick.sprite.x, pick.sprite.y, ev.correct ? 0xffe27a : 0x9aa0b4, 16);
            if (has('giant-bat.death')) pick.sprite.play(animationKeyOf(edition, 'giant-bat.death', `death.${pick.dir}`));
            scene.tweens.add({ targets: [pick.sprite, pick.tag], alpha: 0, delay: 500, duration: 300, onComplete: () => dropBat(`${ev.roundId}:${ev.enemy}`) });
          }
          audio.play(ev.correct ? 'correct' : 'fizzle');
          if (ev.correct) {
            const at = gryphonTop();
            popup(scene, at.x, at.y, t('right'), 'good', 19_000);
          }
          break;
        }
        case 'orbDropped':
          orb.setVisible(true);
          break;
        case 'wordCollected': {
          burst(orb.x, orb.y, 0xffe27a, 14);
          orb.setVisible(false);
          audio.play('collect');
          const at = gryphonTop();
          popup(scene, at.x, at.y, t('collected'), 'good', 19_000);
          break;
        }
        case 'courageLost': {
          audio.play('fizzle');
          gryphonPlay('hit', 'hit', dirOf(sim.state.gryphon.facing));
          scene.cameras.main.shake(250, 0.005);
          const at = gryphonTop();
          popup(scene, at.x, at.y, t('again'), 'miss', 19_000);
          break;
        }
        case 'rested': {
          const at = gryphonTop();
          popup(scene, at.x, at.y, t('rested'), 'good', 19_000);
          break;
        }
        case 'sentenceCast':
          audio.play('cast');
          riderPlay('victory', dirOf(sim.state.gryphon.facing));
          burst(gryphon.x, gryphon.y - 40, 0xc9a7ff, 24);
          void banner(scene, t('cast.title'), t('cast.text'), 1.2);
          break;
        case 'patrolComplete':
          void finish();
          break;
        default:
          break;
      }
      drawHud();
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      loop.stop();
      audio.music('calm');
      audio.play('victory');
      gryphonPlay('roar', 'roar', dirOf(sim.state.gryphon.facing));
      riderPlay('victory', dirOf(sim.state.gryphon.facing));
      burst(gryphon.x, gryphon.y - 50, 0xffe27a, 30);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<PatrolState, PatrolCommand, PatrolEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    let gx = sim.state.gryphon.x;
    let gy = sim.state.gryphon.y;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const st = sim.state;
      if (!finished) readKeys();
      const ease = 1 - Math.exp(-dt * 14);
      gx += (st.gryphon.x - gx) * ease;
      gy += (st.gryphon.y - gy) * ease;
      const dir = dirOf(st.gryphon.facing);
      const at = screen(gx, gy + Math.sin(time / 340) * 0.12);
      gryphon.setPosition(at.x, at.y).setDepth(3000);
      rider.setPosition(at.x, at.y - SIZES.gryphon * kx * 0.28).setDepth(3001);
      if (performance.now() >= busyUntil) gryphonLoop(dir);
      if (!finished) riderPlay('idle', dir);
      // The bats follow the core's loops; the banner floats over each.
      const round = st.round;
      for (const bat of bats.values()) {
        if (bat.leaving) continue;
        const core = round && round.id === bat.roundId ? round.enemies.find((e) => e.id === bat.id) : undefined;
        if (!core) continue;
        const p = screen(core.x, core.y);
        const nextDir: 'e' | 'w' = p.x > bat.sprite.x + 0.2 ? 'e' : p.x < bat.sprite.x - 0.2 ? 'w' : bat.dir;
        if (nextDir !== bat.dir && has('giant-bat.fly')) {
          bat.dir = nextDir;
          bat.sprite.play(animationKeyOf(edition, 'giant-bat.fly', `fly.${nextDir}`));
        }
        bat.sprite.setPosition(p.x, p.y).setDepth(2000);
        const panelBottom = panel.bottom + 26;
        bat.tag.setPosition(p.x, Math.max(panelBottom, p.y - SIZES.bat * kx * 0.75));
      }
      if (st.shot) {
        const p = screen(st.shot.x, st.shot.y);
        shot.setPosition(p.x, p.y);
      }
      if (st.orb) {
        const p = screen(st.orb.x, st.orb.y + Math.sin(time / 260) * 0.12);
        orb.setPosition(p.x, p.y);
      }
      clouds.forEach((c, i) => c.setX(((c.x + dt * (10 + i * 4) + 120) % (W + 240)) - 120));
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: PatrolCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let n = 0; n < steps; n++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextChoice(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
      /** Game-pixel points of the current bats' banners (for real taps). */
      points: () => ({ gates: [...bats.values()].filter((b) => !b.leaving).map((b) => ({ x: b.tag.x, y: b.tag.y })) }),
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
    audio.music('patrol');
    gryphonLoop('e');
    riderPlay('idle', 'e');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#8fcdf2',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'gryphon-patrol', preload, create, update },
  };
}
