/**
 * Alchemist's Synthesis in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack (the hero, the cauldron, the ingredients)
 * over a lab drawn at start. Each jar is an ingredient sprite under a word tag the student taps.
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
import { Actor2D, Arena2D, banner, COLORS, depthOf, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, textureKeyOf, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createAlchemistsSynthesis, evidenceOf, scoreOf, type AlchemistsSynthesisCommand, type AlchemistsSynthesisEvent, type AlchemistsSynthesisState } from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextChoice } from '../qc/bot.js';
import strings from '../strings.en.js';
import { BREW_FROM, BREW_TO, INGREDIENT_SCALE, LAYOUT } from '../view/layout.js';
import { GROUND_FILE, makeGround, PROJECTION } from './ground.js';

/** Props read a little bigger in 2D: the 2D camera is farther away. */
const PROP_BOOST = 1.1;
/** The cauldron is drawn at the same scale as in 3D. */
const CAULDRON_SCALE = 1.25;
/** The brew surface of the cauldron model (assets/cauldron.ts: rim at 0.513 m, radius 0.24 m). */
const BREW_Y = 0.52 * CAULDRON_SCALE;
const BREW_R = 0.21 * CAULDRON_SCALE;
const FLY_MS = 700;

interface JarView {
  sprite: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Container;
  home: { x: number; y: number };
  appear: number;
  flying: boolean;
  state: string;
}

const mix = (a: number, b: number, u: number): number => {
  const ch = (shift: number): number => Math.round(((a >> shift) & 255) * (1 - u) + ((b >> shift) & 255) * u);
  return (ch(16) << 16) | (ch(8) << 8) | ch(0);
};

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('alchemistsSynthesis')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = shownHero(HEROES_2D, options, 'wizard');
  /** The student's own figure for the hero when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition: RuntimeEdition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createAlchemistsSynthesis(story, { seed, helper: options.helper });
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
    const ppm = PROJECTION.ppm;
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);
    const clips = (model: string, list: readonly string[]) => list.filter((c) => edition.bindings[`${model}.${c}`]);

    // ---------------------------------------------------------------- the lab
    scene.cameras.main.setBackgroundColor('#1c1426');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    const zoom = Math.max(0.5, Math.min(1.6, W / (5 * ppm), (H - 140) / PROJECTION.height));
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: zoom, top: 66 });
    const alchemist = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, figure, clips: clips(heroId, HERO_CLIPS_2D), stiffness: 18 }, arena.world);
    alchemist.placeAt(LAYOUT.alchemist[0], LAYOUT.alchemist[2]);
    alchemist.face(0.94, 0.34);
    arena.follow(0, 0.4, 0, true);

    const potFile = edition.pack.files['prop.cauldron'];
    if (potFile && edition.bindings['prop.cauldron']) {
      const pot = scene.add.image(0, 0, textureKeyOf(edition, 'prop.cauldron'), 0).setScale(CAULDRON_SCALE);
      if (potFile.origin) pot.setOrigin(potFile.origin.x, potFile.origin.y);
      const at = arena.px(LAYOUT.cauldron[0], 0, LAYOUT.cauldron[2]);
      pot.setPosition(at.x, at.y).setDepth(depthOf(LAYOUT.cauldron[2]));
      arena.world.add(pot);
    }
    const brewGfx = scene.add.graphics().setDepth(depthOf(LAYOUT.cauldron[2], BREW_Y));
    const brewAt = arena.px(LAYOUT.cauldron[0], BREW_Y, LAYOUT.cauldron[2]);
    brewGfx.setPosition(brewAt.x, brewAt.y);
    arena.world.add(brewGfx);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());

    audio.defineMood('lab', { bpm: 88, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [57, 60, 64]], busy: false, drum: false });
    audio.defineSfx('pour', (s) => {
      s.noise(0.35, 0.12, 1800);
      s.tone(440, 0.3, 'sine', 0.14, 0, 1.8);
    });
    audio.defineSfx('fizz', (s) => {
      s.noise(0.4, 0.18, 3000);
      s.tone(220, 0.3, 'triangle', 0.1, 0, 0.6);
    });
    audio.defineSfx('ding', (s) => [1319, 1760].forEach((f, i) => s.tone(f, 0.5, 'sine', 0.16, i * 0.09)));

    function burst(x: number, y: number, color: number, n: number): void {
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 30;
        const dot = scene.add.circle(x, y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- jars
    const jars = new Map<string, JarView>();

    function clearJars(): void {
      for (const j of jars.values()) {
        j.sprite.destroy();
        j.tag.destroy();
      }
      jars.clear();
    }

    function startRound(ev: Extract<AlchemistsSynthesisEvent, { type: 'roundStarted' }>): void {
      clearJars();
      panel.target(t('formula'), ev.translation);
      arena.top = panel.bottom;
      ev.jars.forEach((spawn, i) => {
        const spot = LAYOUT.jars[i % LAYOUT.jars.length]!;
        const file = edition.pack.files[`prop.${spawn.kind}`];
        const sprite = scene.add.image(0, 0, textureKeyOf(edition, `prop.${spawn.kind}`), 0).setScale((INGREDIENT_SCALE[spawn.kind] ?? 1) * PROP_BOOST);
        if (file?.origin) sprite.setOrigin(file.origin.x, file.origin.y);
        const home = arena.px(spot[0], LAYOUT.pedestal, spot[2]);
        sprite.setPosition(home.x, home.y).setDepth(depthOf(spot[2], LAYOUT.pedestal)).setAlpha(0);
        arena.world.add(sprite);
        const label = tag(scene, spawn.term, 20, 0x3a2418, 0xffd9a0).setDepth(15_100);
        label.setInteractive({ useHandCursor: true });
        label.on('pointerdown', () => loop.dispatch({ type: 'choose', jarId: spawn.id }));
        jars.set(spawn.id, { sprite, tag: label, home, appear: 0, flying: false, state: '' });
      });
      drawHud();
    }

    function drawHud(): void {
      const s = sim.state;
      const right = s.jars.find((j) => j.correct)?.id;
      for (const jar of s.jars) {
        const v = jars.get(jar.id);
        if (!v) continue;
        const state = s.pour?.jarId === jar.id ? 'done' : jar.dimMs > 0 ? 'dim' : s.helper && right === jar.id ? 'next' : jar.id === s.aimId ? 'aimed' : 'idle';
        if (state === v.state) continue;
        v.state = state;
        recolorTag(v.tag, state === 'dim' ? 0x4a4a58 : 0x3a2418, state === 'aimed' || state === 'next' ? COLORS.gold : 0xffd9a0);
        v.tag.setAlpha(state === 'dim' ? 0.5 : 1);
        v.tag.setVisible(state !== 'done');
        v.sprite.setTint(state === 'dim' ? 0x777788 : 0xffffff);
      }
      status.set(t('round', { round: Math.min(s.round + 1, s.rounds), rounds: s.rounds }), '');
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    let bounce = 0;
    const potTop = (): { x: number; y: number } => arena.at(LAYOUT.cauldron[0], BREW_Y + 0.3, LAYOUT.cauldron[2]);
    const over = (id: string) => {
      const jar = sim.state.jars.findIndex((j) => j.id === id);
      const spot = LAYOUT.jars[Math.max(0, jar) % LAYOUT.jars.length]!;
      return arena.at(spot[0], 1.6, spot[2]);
    };

    function handle(ev: AlchemistsSynthesisEvent): void {
      switch (ev.type) {
        case 'roundStarted':
          startRound(ev);
          break;
        case 'aimed':
          break;
        case 'jarPoured': {
          const v = jars.get(ev.jarId);
          const at = over(ev.jarId);
          popup(scene, at.x, at.y, t('right'), 'good');
          if (v) {
            v.flying = true;
            v.tag.setVisible(false);
            const to = arena.px(LAYOUT.cauldron[0], BREW_Y + 0.4, LAYOUT.cauldron[2]);
            const base = v.sprite.scaleX;
            scene.tweens.addCounter({
              from: 0,
              to: 1,
              duration: FLY_MS,
              ease: 'Sine.InOut',
              onUpdate: (tw) => {
                const u = tw.getValue() ?? 0;
                v.sprite.setPosition(v.home.x + (to.x - v.home.x) * u, v.home.y + (to.y - v.home.y) * u - Math.sin(u * Math.PI) * 50);
                v.sprite.setScale(base * (1 - 0.6 * u));
                v.sprite.setAngle(u * 300);
              },
              onComplete: () => v.sprite.setVisible(false),
            });
          }
          alchemist.face(0.94, 0.34);
          void alchemist.play(alchemist.has('attack') ? 'attack' : 'idle');
          audio.play('pour');
          audio.play('correct');
          break;
        }
        case 'jarFizzled': {
          const at = over(ev.jarId);
          popup(scene, at.x, at.y, t('dim'), 'miss');
          scene.cameras.main.shake(180, 0.003);
          audio.play('fizz');
          audio.play('wrong');
          break;
        }
        case 'elixirBrewed': {
          bounce = 1;
          const p = potTop();
          burst(p.x, p.y, BREW_TO, 18);
          popup(scene, p.x, p.y - 30, t('brewed'), 'good');
          audio.play('ding');
          break;
        }
        case 'synthesisComplete':
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
      void alchemist.play('victory', 1, true);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<AlchemistsSynthesisState, AlchemistsSynthesisCommand, AlchemistsSynthesisEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    let held = new Set<string>();
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      manual.run(time);
      // Keyboard: the arrows move the cursor and Space or Enter picks (one command per key press).
      const keys = new Set(ctx.inputController.snapshot().keys);
      const press = (...codes: string[]) => codes.some((c) => keys.has(c) && !held.has(c));
      if (!finished) {
        if (press('ArrowLeft', 'ArrowUp', 'KeyA', 'KeyW')) loop.dispatch({ type: 'aim', dir: -1 });
        else if (press('ArrowRight', 'ArrowDown', 'KeyD', 'KeyS')) loop.dispatch({ type: 'aim', dir: 1 });
        if (press('Space', 'Enter')) loop.dispatch({ type: 'choose' });
      }
      held = keys;
      const s = sim.state;
      alchemist.update(dt);
      // The brew of the cauldron: a ring of color that fills as the formulas are brewed.
      const progress = s.rounds === 0 ? 0 : s.brewed / s.rounds;
      const rx = BREW_R * ppm;
      const ry = rx * Math.sin((PROJECTION.elevation * Math.PI) / 180);
      bounce = Math.max(0, bounce - dt * 3);
      const pulse = s.pour ? 0.2 * Math.sin(time / 90) : 0;
      brewGfx.clear();
      brewGfx.fillStyle(mix(BREW_FROM, BREW_TO, progress), Math.min(1, 0.55 + 0.4 * progress + pulse)).fillEllipse(0, -bounce * 4, rx * 2, ry * 2);
      brewGfx.fillStyle(0xffffff, 0.2 + pulse).fillEllipse(-rx * 0.25, -ry * 0.2 - bounce * 4, rx * 0.8, ry * 0.6);
      const right = s.jars.find((j) => j.correct)?.id;
      s.jars.forEach((jar, i) => {
        const v = jars.get(jar.id);
        if (!v) return;
        const spot = LAYOUT.jars[i % LAYOUT.jars.length]!;
        if (!v.flying) {
          v.appear = Math.min(1, v.appear + dt * 3);
          v.sprite.setAlpha(v.appear);
          v.sprite.y = v.home.y + Math.sin(time / 500 + i * 1.7) * 1.5;
        }
        if (v.tag.visible) arena.pin(v.tag, spot[0], LAYOUT.pedestal, spot[2], 56 * arena.scale);
        const aimed = jar.id === s.aimId || (s.helper && right === jar.id);
        if (!v.flying && jar.dimMs <= 0) v.sprite.setTint(aimed ? 0xfff0b0 : 0xffffff);
      });
      arena.follow(0, 0.4, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: AlchemistsSynthesisCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let k = 0; k < steps; k++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextChoice(sim.state);
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
    audio.music('lab');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#1c1426',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'alchemists-synthesis', preload, create, update },
  };
}
