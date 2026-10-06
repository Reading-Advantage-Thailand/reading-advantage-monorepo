/**
 * Astral Mage in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts), with the
 * forge sprite of the chosen hero over a spell circle drawn at start. The crystals are drawn
 * shapes; each word sits on a tag that stays on screen and takes a tap.
 */
import type * as Phaser from 'phaser';
import { shownHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import { playerFigure } from '@reading-advantage/advantage-play-kit-3d/avatar/portrait-of';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, COLORS, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createAstralMage, evidenceOf, MAGE_START, scoreOf, type AstralMageCommand, type AstralMageEvent, type AstralMageState } from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextCast } from '../qc/bot.js';
import strings from '../strings.en.js';
import { GROUND_FILE, makeGround, PROJECTION } from './ground.js';

/** The glow colors by state (the same as the 3D view). */
const GLOW = { idle: 0x9b7bff, aimed: 0xffd84a, dim: 0x66667a, hit: 0x7dffb0 } as const;
const CRYSTAL_Y = 0.95;

interface CrystalView {
  gfx: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Container;
  appear: number;
  gone: boolean;
  state: string;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('astralMage')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = shownHero(HEROES_2D, options, 'wizard');
  /** The student's own figure for the hero when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createAstralMage(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the spell circle
    scene.cameras.main.setBackgroundColor('#0b1030');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: Math.max(0.5, Math.min(H > W ? 1.3 : 1.1, W / 780)), top: 66 });
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, figure, clips: clips(heroId, HERO_CLIPS_2D), stiffness: 18 }, arena.world);
    hero.placeAt(MAGE_START.x, MAGE_START.z);
    hero.face(0, -1);
    arena.follow(0, -0.4, 0, true);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());

    audio.defineMood('astral', { bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], busy: false, drum: false });
    audio.defineSfx('bolt', (s) => s.tone(520, 0.3, 'sine', 0.12, 0, 2.2));
    audio.defineSfx('shatter', (s) => [988, 1319, 1760].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.12, i * 0.05)));
    audio.defineSfx('fizzle', (s) => s.tone(220, 0.3, 'sawtooth', 0.05, 0, 0.6));

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 30;
        const dot = scene.add.circle(at.x, at.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- crystals and the bolt
    const crystals = new Map<string, CrystalView>();
    const boltGfx = scene.add.graphics().setDepth(16_500);
    boltGfx.setVisible(false);

    function clearCrystals(): void {
      for (const c of crystals.values()) {
        c.gfx.destroy();
        c.tag.destroy();
      }
      crystals.clear();
    }

    function startRitual(ev: Extract<AstralMageEvent, { type: 'ritualStarted' }>): void {
      clearCrystals();
      for (const spawn of ev.crystals) {
        const gfx = scene.add.graphics().setDepth(15_000);
        const label = tag(scene, spawn.word, 20, 0x2a1b5c, 0xc9b8ff).setDepth(15_100);
        label.setInteractive({ useHandCursor: true });
        label.on('pointerdown', () => loop.dispatch({ type: 'cast', crystalId: spawn.id }));
        crystals.set(spawn.id, { gfx, tag: label, appear: 0, gone: false, state: '' });
      }
      drawHud();
    }

    /** One crystal: a glow disc and a diamond, scaled by how far it has appeared. */
    function drawCrystal(v: CrystalView, x: number, y: number, size: number, color: number, glow: number): void {
      const g = v.gfx;
      g.clear();
      if (size <= 0.02) return;
      const r = 26 * size;
      g.fillStyle(color, glow).fillCircle(x, y, r * 1.7);
      g.fillStyle(color, 0.95).fillTriangle(x, y - r * 1.3, x - r * 0.85, y, x + r * 0.85, y);
      g.fillStyle(0xffffff, 0.35).fillTriangle(x, y - r * 1.3, x - r * 0.85, y, x, y);
      g.fillStyle(color, 0.7).fillTriangle(x, y + r * 1.3, x - r * 0.85, y, x + r * 0.85, y);
    }

    function drawHud(): void {
      const s = sim.state;
      const ritual = s.casting[s.ritual];
      if (ritual) panel.sentence(ritual.words, s.next, s.helper);
      arena.top = panel.bottom;
      const next = s.crystals.find((c) => c.kind === 'word' && c.index === s.next && !c.struck);
      for (const c of s.crystals) {
        const v = crystals.get(c.id);
        if (!v) continue;
        const state = c.struck ? 'done' : c.dimMs > 0 ? 'dim' : s.helper && next?.id === c.id ? 'next' : c.id === s.aimId ? 'aimed' : 'idle';
        if (state === v.state) continue;
        v.state = state;
        recolorTag(v.tag, state === 'dim' ? 0x4a4a58 : state === 'aimed' || state === 'next' ? 0x4a2f8f : 0x2a1b5c, state === 'aimed' || state === 'next' ? COLORS.gold : 0xc9b8ff);
        v.tag.setAlpha(state === 'dim' ? 0.5 : 1);
      }
      status.set(t('ritual', { ritual: Math.min(s.ritual + 1, s.rituals), rituals: s.rituals }), '');
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const over = (id: string) => {
      const c = sim.state.crystals.find((k) => k.id === id);
      return c ? arena.at(c.x, 1.9, c.z) : arena.at(MAGE_START.x, 1.5, MAGE_START.z);
    };

    function handle(ev: AstralMageEvent): void {
      switch (ev.type) {
        case 'ritualStarted':
          startRitual(ev);
          break;
        case 'aimed':
          break;
        case 'boltCast': {
          const c = sim.state.crystals.find((k) => k.id === ev.targetId);
          if (c) hero.face(c.x - MAGE_START.x, c.z - MAGE_START.z);
          void hero.play(hero.has('attack') ? 'attack' : 'idle');
          audio.play('bolt');
          break;
        }
        case 'crystalStruck': {
          const v = crystals.get(ev.id);
          const c = sim.state.crystals.find((k) => k.id === ev.id);
          if (v) {
            v.gone = true;
            v.tag.setVisible(false);
          }
          if (c) burst(c.x, CRYSTAL_Y, c.z, GLOW.hit, 16);
          const at = over(ev.id);
          popup(scene, at.x, at.y, t('struck'), 'good');
          audio.play('shatter');
          audio.play('correct');
          break;
        }
        case 'crystalFizzled': {
          const at = over(ev.id);
          popup(scene, at.x, at.y, t('dim'), 'miss');
          scene.cameras.main.shake(180, 0.003);
          audio.play('fizzle');
          audio.play('wrong');
          break;
        }
        case 'ritualCleared':
          audio.play('victory');
          void hero.play(hero.has('attack2') ? 'attack2' : 'idle');
          break;
        case 'castingComplete':
          void finish();
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
      void hero.play('victory', 1, true);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<AstralMageState, AstralMageCommand, AstralMageEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    let held = new Set<string>();
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      manual.run(time);
      // Keyboard: the arrows aim and Space or Enter casts (one command per key press).
      const keys = new Set(ctx.inputController.snapshot().keys);
      const press = (...codes: string[]) => codes.some((c) => keys.has(c) && !held.has(c));
      if (!finished) {
        if (press('ArrowLeft', 'KeyA')) loop.dispatch({ type: 'aim', dir: -1 });
        else if (press('ArrowRight', 'KeyD')) loop.dispatch({ type: 'aim', dir: 1 });
        if (press('Space', 'Enter')) loop.dispatch({ type: 'cast' });
      }
      held = keys;
      const s = sim.state;
      hero.update(dt);
      const next = s.crystals.find((c) => c.kind === 'word' && c.index === s.next && !c.struck);
      for (const c of s.crystals) {
        const v = crystals.get(c.id);
        if (!v) continue;
        v.appear = v.gone ? Math.max(0, v.appear - dt * 4) : Math.min(1, v.appear + dt * 3);
        const bob = Math.sin(time / 600 + c.ax * 1.3 + c.az) * 0.08;
        const at = arena.at(c.x, CRYSTAL_Y + bob, c.z);
        const dim = c.dimMs > 0;
        const aimed = c.id === s.aimId;
        const color = dim ? GLOW.dim : aimed || (s.helper && next?.id === c.id) ? GLOW.aimed : GLOW.idle;
        drawCrystal(v, at.x, at.y, v.appear * arena.scale, color, dim ? 0.06 : aimed ? 0.32 : 0.2);
        v.gfx.setDepth(15_000 + c.z);
        if (!v.gone) arena.pin(v.tag, c.x, CRYSTAL_Y + bob, c.z, 44 * arena.scale);
      }
      boltGfx.clear();
      if (s.bolt) {
        const p = arena.at(s.bolt.x, 1.0, s.bolt.z);
        boltGfx.setVisible(true);
        boltGfx.fillStyle(0xfff1a8, 0.35).fillCircle(p.x, p.y, 15 * arena.scale);
        boltGfx.fillStyle(0xfff1a8, 0.95).fillCircle(p.x, p.y, 7 * arena.scale);
      } else boltGfx.setVisible(false);
      arena.follow(0, -0.4, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: AstralMageCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let k = 0; k < steps; k++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextCast(sim.state);
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
    audio.music('astral');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#0b1030',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'astral-mage', preload, create, update },
  };
}
