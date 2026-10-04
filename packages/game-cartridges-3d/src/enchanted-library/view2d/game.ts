/**
 * Enchanted Library in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack over a hall drawn at start. The books
 * are drawn shapes; each word sits on a tag that stays on screen and takes a tap. The Thai
 * prompt is in a panel under the status bar.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, button, COLORS, depthOf, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { HERO_START, createEnchantedLibrary, evidenceOf, scoreOf, targetBookOf, type LibraryCommand, type LibraryEvent, type LibraryState } from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D, SPIRIT_CLIPS_2D } from '../manifest.js';
import { nextCommand } from '../qc/bot.js';
import strings from '../strings.en.js';
import { GROUND_FILE, makeGround, PROJECTION } from './ground.js';

/** The cover colors of the books (the same as the 3D view). */
const COVERS = [0x8b5cf6, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xef4444, 0x14b8a6] as const;
const BOOK_TOP = 1.0;

interface BookView {
  gfx: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Container;
  x: number;
  z: number;
  slot: number;
  appear: number;
  gone: boolean;
  state: string;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('enchantedLibrary')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'wizard';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createEnchantedLibrary(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the hall
    scene.cameras.main.setBackgroundColor('#171226');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: Math.max(0.5, Math.min(H > W ? 1.2 : 1.05, W / 780)), top: 66, bottom: 80 });
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, arena.world);
    hero.placeAt(HERO_START.x, HERO_START.z);
    hero.face(0, -1);
    arena.follow(sim.state.hero.x * 0.5, sim.state.hero.z * 0.4, 0, true);
    const shield = scene.add.circle(0, 0, 40, 0x7dd3ff, 0.3).setStrokeStyle(3, 0xbfe9ff, 0.9).setVisible(false).setDepth(16_900);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const joystick = new Joystick2D(scene, {
      hint: t('move'),
      top: panel.bottom + 60,
      keys: () => ctx.inputController.snapshot().keys,
      change: (x, z) => loop.dispatch({ type: 'steer', x, z }),
    });
    let shieldBtn: Phaser.GameObjects.Container | null = null;
    let shieldKey = '';
    scene.input.keyboard?.on('keydown-SPACE', () => loop.dispatch({ type: 'shield' }));
    scene.input.keyboard?.on('keydown-ENTER', () => loop.dispatch({ type: 'shield' }));

    audio.defineMood('enchanted', { bpm: 88, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], busy: false, drum: false });
    audio.defineSfx('page', (s) => {
      s.noise(0.2, 0.12, 2400);
      s.tone(660, 0.2, 'triangle', 0.1, 0.05, 1.6);
    });
    audio.defineSfx('ward', (s) => s.tone(760, 0.35, 'sine', 0.14, 0, 1.8));
    audio.defineSfx('wail', (s) => s.tone(520, 0.4, 'triangle', 0.08, 0, 0.5));

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 30;
        const dot = scene.add.circle(at.x, at.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- books and spirits
    const books = new Map<string, BookView>();
    const spirits = new Map<string, Actor2D>();

    function clearBooks(): void {
      for (const b of books.values()) {
        b.gfx.destroy();
        b.tag.destroy();
      }
      books.clear();
    }

    /** One book on its pedestal, in background pixels: wood, a colored cover, and cream pages. */
    function drawBook(b: BookView, bob: number, glow: boolean): void {
      const g = b.gfx;
      g.clear();
      if (b.appear <= 0.02) return;
      const s = b.appear;
      const P = (dx: number, y: number) => arena.px(b.x + dx * s, (y + bob) * s, b.z);
      const rect = (x0: number, y0: number, x1: number, y1: number, color: number): void => {
        const a = P(x0, y0);
        const c = P(x1, y0);
        const d = P(x1, y1);
        const e = P(x0, y1);
        g.fillStyle(color, 1).fillTriangle(a.x, a.y, c.x, c.y, d.x, d.y).fillTriangle(a.x, a.y, d.x, d.y, e.x, e.y);
      };
      const foot = arena.px(b.x, 0, b.z);
      g.fillStyle(glow ? 0xffd84a : 0xc9b8ff, glow ? 0.4 : 0.22).fillEllipse(foot.x, foot.y, 70 * s, 34 * s);
      rect(-0.3, 0, 0.3, 0.5, 0x4a3322);
      rect(-0.32, 0.5, 0.32, 0.62, COVERS[b.slot % COVERS.length]!);
      rect(-0.28, 0.62, 0.3, 0.72, 0xfff1d0);
      rect(-0.32, 0.72, 0.32, 0.84, COVERS[b.slot % COVERS.length]!);
    }

    function startRound(ev: Extract<LibraryEvent, { type: 'roundStarted' }>): void {
      clearBooks();
      ev.books.forEach((spawn, slot) => {
        const gfx = scene.add.graphics().setDepth(depthOf(spawn.z, 0.3));
        arena.world.add(gfx);
        const label = tag(scene, spawn.term, 20, 0x3b2a66, 0xc9b8ff).setDepth(15_100);
        label.setInteractive({ useHandCursor: true });
        label.on('pointerdown', () => loop.dispatch({ type: 'goto', bookId: spawn.id }));
        books.set(spawn.id, { gfx, tag: label, x: spawn.x, z: spawn.z, slot, appear: 0, gone: false, state: '' });
      });
      panel.target(t('find'), ev.translation);
      arena.top = panel.bottom;
      drawHud();
    }

    function addSpirit(id: string, x: number, z: number): void {
      if (!edition.bindings['skeleton.idle']) return;
      const actor = new Actor2D(scene, edition, 'skeleton', PROJECTION, { dirs: 4, clips: clips('skeleton', SPIRIT_CLIPS_2D.skeleton!), walk: 'walk', stiffness: 10 }, arena.world);
      actor.placeAt(x, z);
      actor.face(1, 1);
      actor.tint(0xbfe3ff);
      actor.sprite.setAlpha(0.62);
      spirits.set(id, actor);
    }

    function drawHud(): void {
      const s = sim.state;
      const right = targetBookOf(s);
      for (const b of s.books) {
        const v = books.get(b.id);
        if (!v) continue;
        const state = b.spent ? 'spent' : s.helper && right?.id === b.id ? 'next' : 'idle';
        if (state === v.state) continue;
        v.state = state;
        recolorTag(v.tag, state === 'spent' ? 0x4a4a58 : state === 'next' ? 0x4a2f8f : 0x3b2a66, state === 'next' ? COLORS.gold : 0xc9b8ff);
        v.tag.setAlpha(state === 'spent' ? 0.5 : 1);
      }
      status.set(t('round', { round: Math.min(s.round + 1, s.roundCount), rounds: s.roundCount }), '❤'.repeat(s.courage) + '♡'.repeat(Math.max(0, s.maxCourage - s.courage)));
      const key = `${s.hero.charges}`;
      if (key !== shieldKey) {
        shieldKey = key;
        shieldBtn?.destroy();
        shieldBtn = button(scene, W - 90, H - 54, `${t('shield')} ${'●'.repeat(s.hero.charges)}`, () => loop.dispatch({ type: 'shield' }), 0x3b82f6, '#ffffff').setDepth(19_500);
      }
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const overHero = () => arena.at(sim.state.hero.x, 1.9, sim.state.hero.z);
    const overBook = (id: string) => {
      const b = books.get(id);
      return b ? arena.at(b.x, BOOK_TOP + 0.6, b.z) : overHero();
    };

    function handle(ev: LibraryEvent): void {
      switch (ev.type) {
        case 'roundStarted':
          startRound(ev);
          break;
        case 'bookCollected': {
          const b = books.get(ev.id);
          if (b) {
            b.gone = true;
            b.tag.setVisible(false);
            burst(b.x, BOOK_TOP, b.z, 0xffd98a, 16);
            const at = overBook(ev.id);
            popup(scene, at.x, at.y, t('got'), 'good');
          }
          audio.play('page');
          audio.play('correct');
          break;
        }
        case 'bookWrong': {
          const b = books.get(ev.id);
          if (b) {
            b.gone = true;
            b.tag.setVisible(false);
          }
          const at = overBook(ev.id);
          popup(scene, at.x, at.y, t('wrong'), 'miss');
          audio.play('wrong');
          break;
        }
        case 'shieldUp':
          audio.play('ward');
          break;
        case 'shieldBlocked': {
          const at = overHero();
          popup(scene, at.x, at.y, t('blocked'), 'good');
          void spirits.get(ev.spiritId)?.play('hit');
          audio.play('ward');
          break;
        }
        case 'spiritSpawned':
          addSpirit(ev.spirit.id, ev.spirit.x, ev.spirit.z);
          break;
        case 'heroHit': {
          void hero.play(hero.has('hit') ? 'hit' : 'idle');
          hero.flash(0xffffff);
          scene.cameras.main.shake(180, 0.004);
          void spirits.get(ev.spiritId)?.play('hit');
          const at = overHero();
          popup(scene, at.x, at.y, t('hit'), 'miss');
          audio.play('hit');
          audio.play('wail');
          break;
        }
        case 'courageChanged': {
          const at = overHero();
          popup(scene, at.x, at.y - 24, t('courageLost'), '');
          break;
        }
        case 'teamRested':
          void banner(scene, t('rested'), '', 1.2);
          hero.placeAt(HERO_START.x, HERO_START.z);
          loop.reset();
          break;
        case 'roundCleared':
          audio.play('victory');
          break;
        case 'visitComplete':
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
    const loop = createFixedStepLoop<LibraryState, LibraryCommand, LibraryEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      manual.run(time);
      if (!finished) joystick.update();
      const s = sim.state;
      hero.moveTo(s.hero.x, s.hero.z);
      hero.update(dt);
      for (const [id, a] of [...spirits]) {
        if (s.spirits.some((z) => z.id === id)) continue;
        a.destroy();
        spirits.delete(id);
      }
      for (const z of s.spirits) {
        const a = spirits.get(z.id);
        if (!a) continue;
        a.moveTo(z.x, z.z);
        a.update(dt);
      }
      const right = targetBookOf(s);
      for (const b of s.books) {
        const v = books.get(b.id);
        if (!v) continue;
        v.appear = v.gone || b.spent ? Math.max(0, v.appear - dt * 3) : Math.min(1, v.appear + dt * 3);
        const bob = Math.sin(time / 600 + v.slot * 1.7) * 0.05;
        drawBook(v, bob, s.helper && right?.id === b.id);
        if (!v.gone && !b.spent) arena.pin(v.tag, v.x, BOOK_TOP + 0.3 + bob, v.z, 40 * arena.scale);
      }
      shield.setVisible(s.hero.shieldMs > 0);
      if (s.hero.shieldMs > 0) {
        const p = arena.at(s.hero.x, 0.85, s.hero.z);
        shield.setPosition(p.x, p.y).setScale(arena.scale * (1 + 0.06 * Math.sin(time / 70)));
      }
      arena.follow(s.hero.x * 0.5, s.hero.z * 0.4, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: LibraryCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let k = 0; k < steps; k++) sim.tick().forEach(handle);
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
    audio.music('enchanted');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#171226',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'enchanted-library', preload, create, update },
  };
}
