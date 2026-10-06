/**
 * Storm Castle Tower in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack in front of a drawn tower. The climber
 * steps up the ledges to the window that holds the next word, steps aside from the falling oil
 * and rocks, and walks through the gate at the top when the sentence is built.
 */
import type * as Phaser from 'phaser';
import { shownHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import { playerFigure } from '@reading-advantage/advantage-play-kit-3d/avatar/portrait-of';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, banner, COLORS, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, text, textureKeyOf, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import {
  createStormCastleTower,
  evidenceOf,
  rightWindowsOf,
  scoreOf,
  type StormCastleTowerCommand,
  type StormCastleTowerEvent,
  type StormCastleTowerState,
} from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextCommand } from '../qc/bot.js';
import strings from '../strings.en.js';
import { columnX, drawTower, drawWindow, PPM, PROJECTION, rowY } from './tower.js';

const OIL_FILE = 'prop.cauldron';
const ROCK_FILE = 'prop.boulder';
const ARCH_FILE = 'prop.arch';
const GLASS = 0x7a5cff;
const GLASS_LIT = 0xffd84a;
const GLASS_SPENT = 0x4a4a58;

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('stormCastleTower')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = shownHero(HEROES_2D, options, 'knight');
  /** The student's own figure for the hero when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createStormCastleTower(story, { seed, helper: options.helper });
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
    const clips = (model: string, list: readonly string[]) => list.filter((c) => edition.bindings[`${model}.${c}`]);

    // ---------------------------------------------------------------- the tower
    scene.cameras.main.setBackgroundColor('#161d2e');
    const panel = new WordPanel2D(scene, 66);
    /** The drawn world: x meters to the right, y meters up; the container scrolls with the climber. */
    const sc = Math.min(1, W / (9.4 * PPM));
    const world = scene.add.container(W / 2, H * 0.7).setScale(sc);
    const wall = scene.add.graphics();
    world.add(wall);
    const warn = [0, 1, 2, 3].map((col) => {
      const g = scene.add.graphics().setAlpha(0);
      g.fillStyle(0xff5a3c, 0.22).fillRect(columnX(col) * PPM - 0.7 * PPM, -12 * PPM, 1.4 * PPM, 12 * PPM);
      world.add(g);
      return g;
    });
    const archFile = edition.pack.files[ARCH_FILE];
    const arch = scene.add.image(0, 0, textureKeyOf(edition, ARCH_FILE), 0).setScale(2.2).setVisible(!!archFile);
    if (archFile?.origin) arch.setOrigin(archFile.origin.x, archFile.origin.y);
    world.add(arch);
    const gateGlow = scene.add.graphics().setBlendMode('ADD').setAlpha(0);
    for (const [r, a] of [[70, 0.18], [48, 0.3], [30, 0.45]] as const) gateGlow.fillStyle(0x9dffb0, a).fillEllipse(0, 0, r * 2, r * 2.4);
    world.add(gateGlow);
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, figure, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, world);
    let heroY = rowY(sim.state.climber.row);
    hero.placeAt(columnX(sim.state.climber.col), 0);
    hero.lift = heroY;
    hero.face(0, 1);
    hero.sprite.setDepth(500);
    let camY = heroY;
    const flashRect = scene.add.rectangle(W / 2, H / 2, W, H, 0xcfe0ff, 0).setScrollFactor(0).setDepth(18_000);
    let flash = 0;
    let nextFlash = 5;

    /** The screen point of a world point (x, y meters). */
    const at = (x: number, y: number): { x: number; y: number } => ({ x: world.x + x * PPM * sc, y: world.y - y * PPM * sc });

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const gloss = text(scene, W / 2 + 40, H - 26, '', 18, COLORS.ink).setOrigin(0.5, 1).setPadding(12, 6, 12, 8).setBackgroundColor('#fffaf0').setScrollFactor(0).setDepth(19_200);
    gloss.setWordWrapWidth(Math.max(140, W - 190));
    const joystick = new Joystick2D(scene, {
      hint: t('move'),
      top: 66,
      keys: () => ctx.inputController.snapshot().keys,
      change: (x, z) => loop.dispatch({ type: 'steer', x, z }),
    });

    audio.defineMood('storm', { bpm: 100, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], busy: false, drum: true });
    audio.defineSfx('open', (s) => [659, 880, 1175].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
    audio.defineSfx('rumble', (s) => s.noise(0.35, 0.1, 500));
    audio.defineSfx('crash', (s) => {
      s.noise(0.3, 0.2, 1200);
      s.tone(150, 0.3, 'square', 0.08, 0, 0.6);
    });
    audio.defineSfx('clank', (s) => {
      s.noise(0.3, 0.2, 1500);
      s.tone(180, 0.35, 'square', 0.08, 0, 0.7);
    });

    function burst(x: number, y: number, color: number, n: number): void {
      const p = at(x, y);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 30;
        const dot = scene.add.circle(p.x, p.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: p.x + Math.cos(a) * d, y: p.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- windows and hazards
    type WindowView = { glass: Phaser.GameObjects.Graphics; tag: Phaser.GameObjects.Container | null; col: number; row: number };
    const windows = new Map<string, WindowView>();
    const litViews: WindowView[] = [];
    type HazardView = { sprite: Phaser.GameObjects.Image; type: 'oil' | 'rock'; x: number; y: number };
    const hazards = new Map<string, HazardView>();

    function disposeView(v: WindowView): void {
      v.glass.destroy();
      v.tag?.destroy();
      v.tag = null;
    }

    function clearWindows(): void {
      for (const v of windows.values()) disposeView(v);
      windows.clear();
      for (const v of litViews) disposeView(v);
      litViews.length = 0;
    }

    function clearHazards(): void {
      for (const h of hazards.values()) h.sprite.destroy();
      hazards.clear();
    }

    function placeWindows(list: Extract<StormCastleTowerEvent, { type: 'windowsPlaced' }>['windows']): void {
      for (const [id, v] of [...windows]) {
        disposeView(v);
        windows.delete(id);
      }
      for (const w of list) {
        const glass = scene.add.graphics().setPosition(columnX(w.col) * PPM, -rowY(w.row) * PPM);
        drawWindow(glass, GLASS);
        world.add(glass);
        const label = tag(scene, w.word, 18).setPosition(columnX(w.col) * PPM, -rowY(w.row) * PPM - 2.15 * PPM);
        world.add(label);
        windows.set(w.id, { glass, tag: label, col: w.col, row: w.row });
      }
      drawHud();
    }

    const hazardSprite = (type: 'oil' | 'rock'): Phaser.GameObjects.Image => {
      const file = type === 'oil' ? OIL_FILE : ROCK_FILE;
      const info = edition.pack.files[file];
      const img = scene.add.image(0, 0, textureKeyOf(edition, file), 0).setScale(1.5).setDepth(900);
      if (info?.origin) img.setOrigin(info.origin.x, info.origin.y);
      if (type === 'oil') img.setTint(0xffa040);
      world.add(img);
      return img;
    };

    let towerId = '';
    function startTower(ev: Extract<StormCastleTowerEvent, { type: 'towerStarted' }>): void {
      clearWindows();
      clearHazards();
      if (ev.towerId !== towerId) {
        drawTower(wall, ev.summitRow);
        towerId = ev.towerId;
        arch.setPosition(0, -rowY(ev.summitRow) * PPM + 4).setVisible(!!archFile);
        gateGlow.setPosition(0, -rowY(ev.summitRow) * PPM - 1.1 * PPM).setAlpha(0);
        scene.tweens.killTweensOf(gateGlow);
      }
      const k = sim.state.climber;
      heroY = rowY(k.row);
      camY = heroY;
      hero.placeAt(columnX(k.col), 0);
      hero.lift = heroY;
      hero.sprite.setVisible(true);
      hero.face(0, 1);
      drawHud();
    }

    function drawHud(): void {
      const s = sim.state;
      const tw = s.shift[s.tower];
      if (tw) panel.sentence(tw.words, s.next, s.helper);
      gloss.setText(tw?.translation ?? '').setVisible(!!tw?.translation);
      status.set(t('tower', { tower: Math.min(s.tower + 1, s.towers), towers: s.towers }), '❤'.repeat(s.courage) + '♡'.repeat(Math.max(0, s.maxCourage - s.courage)));
      const right = new Set(s.helper ? rightWindowsOf(s).map((w) => w.id) : []);
      for (const w of s.windows) {
        const v = windows.get(w.id);
        if (!v?.tag) continue;
        const next = right.has(w.id);
        recolorTag(v.tag, w.spent ? 0x4a4a58 : next ? COLORS.purple : COLORS.tagFill, next ? COLORS.gold : 0xffffff);
      }
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    let transition = false;
    let faded = false;
    const overHero = () => at(hero.x, heroY + 2.2);
    const overWindow = (id: string) => {
      const v = windows.get(id);
      return v ? at(columnX(v.col), rowY(v.row) + 1.4) : overHero();
    };

    const queue: StormCastleTowerEvent[] = [];
    let draining = false;
    async function drain(): Promise<void> {
      if (draining) return;
      draining = true;
      while (queue.length > 0) await handle(queue.shift()!);
      draining = false;
    }

    async function handle(ev: StormCastleTowerEvent): Promise<void> {
      switch (ev.type) {
        case 'towerStarted':
          startTower(ev);
          if (faded) {
            faded = false;
            scene.cameras.main.fadeIn(250, 0, 0, 0);
            await new Promise<void>((r) => scene.cameras.main.once('camerafadeincomplete', () => r()));
          }
          transition = false;
          loop.reset();
          break;
        case 'windowsPlaced':
          placeWindows(ev.windows);
          break;
        case 'windowOpened': {
          const v = windows.get(ev.id);
          if (v) {
            windows.delete(ev.id);
            drawWindow(v.glass, GLASS_LIT);
            v.tag?.destroy();
            v.tag = null;
            litViews.push(v);
            burst(columnX(v.col), rowY(v.row) + 0.8, 0xffe08a, 14);
            const p = at(columnX(v.col), rowY(v.row) + 1.4);
            popup(scene, p.x, p.y, t('opened'), 'good');
          }
          audio.play('open');
          audio.play('correct');
          break;
        }
        case 'windowShut': {
          const v = windows.get(ev.id);
          if (v) drawWindow(v.glass, GLASS_SPENT);
          const p = overWindow(ev.id);
          popup(scene, p.x, p.y, t('shut'), 'miss');
          audio.play('wrong');
          break;
        }
        case 'hazardFell': {
          const h = ev.hazard;
          const sprite = hazardSprite(h.type);
          hazards.set(h.id, { sprite, type: h.type, x: columnX(h.col), y: h.y });
          audio.play('rumble');
          break;
        }
        case 'climberHit': {
          const h = hazards.get(ev.hazardId);
          if (h) {
            burst(h.x, rowY(h.y) + 0.4, h.type === 'oil' ? 0xff9a3c : 0xbdb6c8, 16);
            h.sprite.destroy();
            hazards.delete(ev.hazardId);
          }
          void hero.play('hit');
          scene.cameras.main.shake(300, 0.006);
          const p = overHero();
          popup(scene, p.x, p.y, t('hit'), 'miss');
          audio.play('hit');
          audio.play('crash');
          break;
        }
        case 'courageChanged': {
          const p = overHero();
          popup(scene, p.x, p.y - 24, t('courageLost'), '');
          break;
        }
        case 'teamRested': {
          void banner(scene, t('rested'), '', 1.2);
          const k = sim.state.climber;
          heroY = rowY(k.row);
          hero.placeAt(columnX(k.col), 0);
          hero.lift = heroY;
          clearHazards();
          loop.reset();
          break;
        }
        case 'summitOpened':
          audio.play('clank');
          audio.play('correct');
          scene.tweens.add({ targets: gateGlow, alpha: 1, duration: 1000 });
          scene.tweens.add({ targets: gateGlow, scale: { from: 0.94, to: 1.06 }, duration: 600, yoyo: true, repeat: -1 });
          burst(0, rowY(sim.state.summitRow) + 1, 0x9dffb0, 18);
          void banner(scene, t('summit'), t('climbUp'), 1.6);
          break;
        case 'towerCleared':
          audio.play('victory');
          if (sim.state.phase === 'playing') {
            transition = true;
            void hero.play('victory');
            await new Promise<void>((r) => scene.time.delayedCall(1200, () => r()));
            faded = true;
            scene.cameras.main.fadeOut(250, 0, 0, 0);
            await new Promise<void>((r) => scene.cameras.main.once('camerafadeoutcomplete', () => r()));
          }
          break;
        case 'climbComplete':
          await finish();
          break;
      }
      drawHud();
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      loop.stop();
      joystick.destroy();
      audio.music('calm');
      audio.play('victory');
      void hero.play('victory', 1, true);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<StormCastleTowerState, StormCastleTowerCommand, StormCastleTowerEvent>(sim, { render: (events) => (queue.push(...events), void drain()) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      if (transition) {
        hero.update(dt);
        return;
      }
      manual.run(time);
      if (!finished) joystick.update();
      const k = 1 - Math.exp(-14 * dt);
      const wantY = rowY(s.climber.row);
      const dy = wantY - heroY;
      heroY += dy * k;
      // Climbing is shown as a run toward the wall (or toward the camera on the way down).
      hero.z = 0;
      hero.moveTo(columnX(s.climber.col), Math.abs(dy) > 0.08 ? (dy > 0 ? -2 : 2) : 0);
      hero.lift = heroY;
      hero.update(dt);
      hero.sprite.setAlpha(s.climber.protectMs > 0 && Math.floor(time / 80) % 2 === 0 ? 0.35 : 1);
      camY += (heroY - camY) * (1 - Math.exp(-5 * dt));
      world.y = H * 0.7 + camY * PPM * sc;
      for (const [id, v] of [...hazards]) {
        const h = s.hazards.find((x) => x.id === id);
        if (!h) {
          v.sprite.destroy();
          hazards.delete(id);
          continue;
        }
        v.y = h.y;
        v.sprite.setPosition(columnX(h.col) * PPM, -rowY(h.y) * PPM).setRotation(time / 1000 * (v.type === 'rock' ? 4 : 2));
      }
      warn.forEach((g, col) => {
        const falling = s.hazards.some((h) => h.col === col && h.y > s.climber.row - 0.5);
        g.setAlpha(falling ? 0.6 + 0.4 * Math.sin(time / 110) : 0).setY(-rowY(s.climber.row) * PPM);
      });
      for (const v of windows.values()) v.glass.setAlpha(0.85 + 0.15 * Math.sin(time / 300 + v.col));
      // A flash of lightning now and then.
      nextFlash -= dt;
      if (nextFlash <= 0) {
        flash = 1;
        nextFlash = 6 + Math.random() * 8;
      }
      flash = Math.max(0, flash - dt * 3);
      flashRect.setFillStyle(0xcfe0ff, flash * 0.22);
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: StormCastleTowerCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        // QC fast-forward: no fade between towers (it needs frames), so a cleared tower is not played.
        for (let n = 0; n < steps; n++) sim.tick().forEach((ev) => void (ev.type === 'towerCleared' ? undefined : handle(ev)));
      },
      auto: () => {
        const command = nextCommand(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
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
    audio.music('storm');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#161d2e',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'storm-castle-tower', preload, create, update },
  };
}
