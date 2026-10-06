/**
 * Rune Forge Chamber in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack (the hero and the crystal runes) over a
 * forge drawn at start. Each rune is a crystal sprite under a word tag the student taps.
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
import { createRuneForgeChamber, evidenceOf, isRight, scoreOf, type RuneForgeChamberCommand, type RuneForgeChamberEvent, type RuneForgeChamberState } from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextChoice } from '../qc/bot.js';
import strings from '../strings.en.js';
import { BLADE_FROM, BLADE_TO, LAYOUT } from '../view/layout.js';
import { GROUND_FILE, makeGround, PROJECTION } from './ground.js';

/** The rune sprite scale (the crystal reads a little bigger in 2D: the camera is farther away). */
const RUNE_SCALE = 0.95;
const FLY_MS = 550;

interface RuneView {
  sprite: Phaser.GameObjects.Image;
  tag: Phaser.GameObjects.Container;
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
  const t = (ctx.i18n ?? createI18n([strings]).scope('runeForgeChamber')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = shownHero(HEROES_2D, options, 'wizard');
  /** The student's own figure for the hero when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition: RuntimeEdition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createRuneForgeChamber(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the forge
    scene.cameras.main.setBackgroundColor('#1a1520');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    const zoom = Math.max(0.5, Math.min(1.6, W / (5 * ppm), (H - 140) / PROJECTION.height));
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: zoom, top: 66 });
    const smith = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, figure, clips: clips(heroId, HERO_CLIPS_2D), stiffness: 18 }, arena.world);
    smith.placeAt(LAYOUT.smith[0], LAYOUT.smith[2]);
    smith.face(0.94, -0.3);
    arena.follow(0, 0.2, 0, true);
    const bladeGfx = scene.add.graphics().setDepth(depthOf(LAYOUT.anvil[2] + 0.2, LAYOUT.anvilTop));
    const bladeAt = arena.px(LAYOUT.anvil[0], LAYOUT.anvilTop + 0.04, LAYOUT.anvil[2]);
    bladeGfx.setPosition(bladeAt.x, bladeAt.y);
    arena.world.add(bladeGfx);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());

    audio.defineMood('forge', { bpm: 84, chords: [[50, 53, 57], [48, 52, 55], [53, 57, 60], [50, 53, 57]], busy: false, drum: false });
    audio.defineSfx('clang', (s) => {
      s.noise(0.12, 0.14, 4200);
      [1568, 2093].forEach((f, i) => s.tone(f, 0.4, 'triangle', 0.12, i * 0.03));
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

    // ---------------------------------------------------------------- runes
    const runes = new Map<string, RuneView>();
    const runeFile = edition.pack.files['prop.crystal-cluster'];
    const RUNE_Y = LAYOUT.runeY - 0.4;

    function clearRunes(): void {
      for (const r of runes.values()) {
        r.sprite.destroy();
        r.tag.destroy();
      }
      runes.clear();
    }

    function startWave(ev: Extract<RuneForgeChamberEvent, { type: 'waveStarted' }>): void {
      clearRunes();
      for (const spawn of ev.runes) {
        const sprite = scene.add.image(0, 0, textureKeyOf(edition, 'prop.crystal-cluster'), 0).setScale(RUNE_SCALE).setAlpha(0);
        if (runeFile?.origin) sprite.setOrigin(runeFile.origin.x, runeFile.origin.y);
        arena.world.add(sprite);
        const label = tag(scene, spawn.word, 20, 0x1d3350, 0xa9d8ff).setDepth(15_100);
        label.setInteractive({ useHandCursor: true });
        label.on('pointerdown', () => loop.dispatch({ type: 'choose', runeId: spawn.id }));
        runes.set(spawn.id, { sprite, tag: label, appear: 0, flying: false, state: '' });
      }
      drawHud();
    }

    function drawHud(): void {
      const s = sim.state;
      const blade = s.forge[s.sentence];
      if (blade) panel.sentence(blade.words, s.next, s.helper);
      arena.top = panel.bottom;
      const right = s.runes.find((r) => isRight(s, r))?.id;
      for (const rune of s.runes) {
        const v = runes.get(rune.id);
        if (!v) continue;
        const state = s.strike?.runeId === rune.id ? 'done' : rune.dimMs > 0 ? 'dim' : s.helper && right === rune.id ? 'next' : rune.id === s.aimId ? 'aimed' : 'idle';
        if (state === v.state) continue;
        v.state = state;
        recolorTag(v.tag, state === 'dim' ? 0x4a4a58 : 0x1d3350, state === 'aimed' || state === 'next' ? COLORS.gold : 0xa9d8ff);
        v.tag.setAlpha(state === 'dim' ? 0.5 : 1);
        v.tag.setVisible(state !== 'done');
        v.sprite.setTint(state === 'dim' ? 0x777788 : 0xffffff);
      }
      status.set(t('blade', { blade: Math.min(s.sentence + 1, s.sentences), blades: s.sentences }), '');
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    let bounce = 0;
    const anvilTop = (): { x: number; y: number } => arena.at(LAYOUT.anvil[0], LAYOUT.anvilTop + 0.3, LAYOUT.anvil[2]);
    const over = (id: string) => {
      const r = sim.state.runes.find((k) => k.id === id);
      return r ? arena.at(r.x, 1.9, r.z) : anvilTop();
    };

    function handle(ev: RuneForgeChamberEvent): void {
      switch (ev.type) {
        case 'sentenceStarted':
          break;
        case 'waveStarted':
          startWave(ev);
          break;
        case 'aimed':
          break;
        case 'runeStruck': {
          const v = runes.get(ev.runeId);
          const at = over(ev.runeId);
          popup(scene, at.x, at.y, t('right'), 'good');
          if (v) {
            v.flying = true;
            v.tag.setVisible(false);
            const from = { x: v.sprite.x, y: v.sprite.y };
            const to = arena.px(LAYOUT.anvil[0], LAYOUT.anvilTop + 0.3, LAYOUT.anvil[2]);
            const base = v.sprite.scaleX;
            scene.tweens.addCounter({
              from: 0,
              to: 1,
              duration: FLY_MS,
              ease: 'Sine.InOut',
              onUpdate: (tw) => {
                const u = tw.getValue() ?? 0;
                v.sprite.setPosition(from.x + (to.x - from.x) * u, from.y + (to.y - from.y) * u - Math.sin(u * Math.PI) * 40);
                v.sprite.setScale(base * (1 - 0.7 * u));
                v.sprite.setAngle(u * 300);
              },
              onComplete: () => v.sprite.setVisible(false),
            });
          }
          smith.face(0.94, -0.3);
          void smith.play(smith.has('attack') ? 'attack' : 'idle');
          audio.play('clang');
          audio.play('correct');
          break;
        }
        case 'runeFizzled': {
          const at = over(ev.runeId);
          popup(scene, at.x, at.y, t('dim'), 'miss');
          scene.cameras.main.shake(180, 0.003);
          audio.play('fizz');
          audio.play('wrong');
          break;
        }
        case 'sentenceForged': {
          bounce = 1;
          const p = anvilTop();
          burst(p.x, p.y, BLADE_TO, 22);
          void smith.play(smith.has('attack2') ? 'attack2' : 'idle');
          audio.play('ding');
          break;
        }
        case 'forgeComplete':
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
      void smith.play('victory', 1, true);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<RuneForgeChamberState, RuneForgeChamberCommand, RuneForgeChamberEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
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
      smith.update(dt);
      // The blade on the anvil: a bar that grows and heats as the words are forged.
      const blade = s.forge[s.sentence];
      const progress = blade ? s.next / Math.max(1, blade.words.length) : 1;
      bounce = Math.max(0, bounce - dt * 3);
      const len = Math.max(0.04, progress) * 1.3 * ppm;
      bladeGfx.clear();
      bladeGfx.fillStyle(mix(BLADE_FROM, BLADE_TO, progress), 1).fillRect(-0.65 * ppm, -4 - bounce * 4, len, 8);
      bladeGfx.fillStyle(0xffffff, 0.25).fillRect(-0.65 * ppm, -4 - bounce * 4, len, 3);
      const right = s.runes.find((r) => isRight(s, r))?.id;
      s.runes.forEach((rune, i) => {
        const v = runes.get(rune.id);
        if (!v) return;
        if (!v.flying) {
          v.appear = Math.min(1, v.appear + dt * 3);
          v.sprite.setAlpha(v.appear);
          const at = arena.px(rune.x, RUNE_Y + Math.sin(time / 500 + i * 1.7) * 0.05, rune.z);
          v.sprite.setPosition(at.x, at.y).setDepth(depthOf(rune.z, RUNE_Y));
        }
        if (v.tag.visible) arena.pin(v.tag, rune.x, LAYOUT.runeY, rune.z, 56 * arena.scale);
        const aimed = rune.id === s.aimId || (s.helper && right === rune.id);
        if (!v.flying && rune.dimMs <= 0) v.sprite.setTint(aimed ? 0xfff0b0 : 0xffffff);
      });
      arena.follow(0, 0.2, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: RuneForgeChamberCommand) => loop.dispatch(command),
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
    audio.music('forge');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#1a1520',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'rune-forge-chamber', preload, create, update },
  };
}
