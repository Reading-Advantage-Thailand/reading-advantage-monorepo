/**
 * Devourer Slime in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack over the clearing baked from the 3D set.
 * The slime grows and the view pulls back; word bubbles float with tags that stay on screen; the
 * sentence panel shows the words eaten so far; a slime that grows big is powered for a countdown and swallows guards.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, COLORS, depthOf, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, text, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createDevourerSlime, evidenceOf, scoreOf, TUNING, type DevourerSlimeCommand, type DevourerSlimeEvent, type DevourerSlimeState } from '../core/index.js';
import { FILES_2D, GUARD_CLIPS_2D, SLIME_CLIPS_2D } from '../manifest.js';
import { nextSteer } from '../qc/bot.js';
import strings from '../strings.en.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

/** Sprite scale per unit of `size` (as the 3D view's model scale). */
const SLIME_SCALE = 1.13;
const BUBBLE_COLORS = [0x8b5cf6, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xef4444, 0x14b8a6, 0xec4899];

interface BubbleView {
  glow: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Container;
  color: number;
  x: number;
  z: number;
  gone: boolean;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as StoryInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('devourerSlime')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createDevourerSlime(story, { seed, helper: options.helper });
  const needed = FILES_2D.filter((id) => edition.bindings[id]);
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

    // ---------------------------------------------------------------- the clearing
    scene.cameras.main.setBackgroundColor('#1d3a24');
    const panel = new WordPanel2D(scene, 66);
    const baseScale = H > W ? 1.25 : 1.1;
    const arena = new Arena2D(scene, edition, PROJECTION, BACKGROUND_FILE, { scale: baseScale, top: 66 });
    const ppm = PROJECTION.ppm;
    const slime = new Actor2D(scene, edition, 'slime', PROJECTION, { dirs: 4, clips: clips('slime', SLIME_CLIPS_2D), stiffness: 16 }, arena.world);
    slime.placeAt(sim.state.slime.x, sim.state.slime.z);
    let shownSize = 1;
    arena.follow(sim.state.slime.x, sim.state.slime.z, 0, true);

    // ---------------------------------------------------------------- HUD
    // The power-up: a big countdown badge with a draining bar under the word panel, and a pulsing frame
    // around the screen (red in the last 2 s).
    const powerFrame = scene.add.graphics().setScrollFactor(0).setDepth(19_000).setVisible(false);
    const powerBox = scene.add.graphics();
    const powerLabel = text(scene, 0, -10, '', 28, '#2b1d3a').setOrigin(0.5);
    const powerBadge = scene.add.container(W / 2, 150, [powerBox, powerLabel]).setScrollFactor(0).setDepth(19_500).setVisible(false);
    const drawPower = (ms: number, time: number): void => {
      const powered = ms > 0;
      powerFrame.setVisible(powered);
      powerBadge.setVisible(powered);
      if (!powered) return;
      const low = ms < 2000;
      const blink = low ? (Math.floor(time / 125) % 2 === 0 ? 1 : 0.55) : 0.75 + 0.25 * Math.sin(time / 110);
      const color = low ? 0xff5a4a : 0xffd84a;
      powerFrame.clear().lineStyle(14, color, blink).strokeRect(7, 7, W - 14, H - 14).setAlpha(1);
      const w = Math.min(W - 32, 270);
      powerBox.clear();
      powerBox.fillStyle(0xffffff, 1).fillRoundedRect(-w / 2 - 4, -34, w + 8, 76, 26);
      powerBox.fillStyle(color, 1).fillRoundedRect(-w / 2, -30, w, 68, 22);
      powerBox.fillStyle(low ? 0xffffff : 0x2b1d3a, 0.35).fillRoundedRect(-w / 2 + 14, 20, w - 28, 10, 5);
      powerBox.fillStyle(low ? 0xffffff : 0x2b1d3a, 1).fillRoundedRect(-w / 2 + 14, 20, Math.max(8, (w - 28) * Math.min(1, ms / TUNING.powerMs)), 10, 5);
      powerLabel.setText(t('power', { seconds: Math.ceil(ms / 1000) })).setColor(low ? '#ffffff' : '#2b1d3a');
      powerBadge.setPosition(W / 2, panel.bottom + 46).setScale(1 + 0.04 * Math.sin(time / 130));
    };
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const joystick = new Joystick2D(scene, {
      hint: t('move'),
      top: 66,
      keys: () => ctx.inputController.snapshot().keys,
      change: (x, z) => loop.dispatch({ type: 'steer', x, z }),
    });

    audio.defineMood('meadow', { bpm: 100, chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], busy: false, drum: false });
    audio.defineSfx('munch', (s) => {
      s.tone(300, 0.12, 'square', 0.1, 0, 0.6);
      s.tone(420, 0.1, 'sine', 0.16, 0.08, 1.4);
    });
    audio.defineSfx('spit', (s) => {
      s.noise(0.2, 0.18, 2200);
      s.tone(520, 0.2, 'triangle', 0.1, 0, 0.6);
    });
    audio.defineSfx('gulp', (s) => {
      s.tone(160, 0.5, 'sine', 0.4, 0, 0.4);
      s.noise(0.3, 0.1, 600, 0.1);
    });

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 18 + Math.random() * 24;
        const dot = scene.add.circle(at.x, at.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 10, alpha: 0, scale: 0.3, duration: 450 + Math.random() * 150, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- bubbles and guards
    const bubbles = new Map<string, BubbleView>();
    const guards = new Map<string, Actor2D>();

    function bubbleGraphic(color: number): Phaser.GameObjects.Graphics {
      const g = scene.add.graphics();
      const r = 0.3 * ppm;
      g.fillStyle(0x000000, 0.22).fillEllipse(0, 0.7 * ppm * Math.cos(Math.PI / 4), r * 1.5, r * 0.6);
      g.fillStyle(color, 0.35).fillCircle(0, 0, r * 1.25);
      g.fillStyle(color, 0.85).fillCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.7).fillCircle(-r * 0.35, -r * 0.35, r * 0.3);
      arena.world.add(g);
      return g;
    }

    function clearBubbles(): void {
      for (const b of bubbles.values()) {
        b.glow.destroy();
        b.tag.destroy();
      }
      bubbles.clear();
    }

    function startSentence(ev: Extract<DevourerSlimeEvent, { type: 'sentenceStarted' }>): void {
      clearBubbles();
      for (const b of ev.bubbles) {
        const color = BUBBLE_COLORS[b.index % BUBBLE_COLORS.length]!;
        bubbles.set(b.id, { glow: bubbleGraphic(color), tag: tag(scene, b.word, 18).setDepth(15_000), color, x: b.x, z: b.z, gone: false });
      }
    }

    function addGuard(id: string, kind: string, x: number, z: number): void {
      guards.get(id)?.destroy();
      const model = edition.bindings[`${kind}.idle`] ? kind : 'guard';
      const actor = new Actor2D(scene, edition, model, PROJECTION, { dirs: 4, clips: clips(model, GUARD_CLIPS_2D[model] ?? ['idle', 'walk']), stiffness: 12 }, arena.world);
      actor.placeAt(x, z);
      guards.set(id, actor);
    }
    for (const g of sim.state.guards) addGuard(g.id, g.kind, g.x, g.z);

    function drawHud(): void {
      const s = sim.state;
      const sentence = s.shift[s.sentence];
      if (sentence) panel.sentence(sentence.words, s.next, s.helper);
      arena.top = panel.bottom;
      for (const b of s.bubbles) {
        const view = bubbles.get(b.id);
        if (!view) continue;
        const next = s.helper && b.index === s.next && !b.eaten;
        recolorTag(view.tag, next ? COLORS.purple : COLORS.tagFill, next ? COLORS.gold : 0xffffff);
      }
      status.set(t('sentence', { index: Math.min(s.sentence + 1, s.sentences), total: s.sentences }), `${t('size')} ${s.slime.size.toFixed(1)}`);
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const slimeTop = () => arena.at(slime.x, 0.9 * shownSize, slime.z);

    function handle(ev: DevourerSlimeEvent): void {
      switch (ev.type) {
        case 'sentenceStarted':
          startSentence(ev);
          break;
        case 'wordEaten': {
          const b = bubbles.get(ev.id);
          if (b) {
            b.gone = true;
            b.tag.setVisible(false);
            scene.tweens.add({
              targets: b,
              x: slime.x,
              z: slime.z,
              duration: 200,
              onComplete: () => {
                b.glow.setVisible(false);
                burst(slime.x, 0.5, slime.z, b.color, 10);
              },
            });
          }
          void slime.play('attack', 1.6);
          audio.play('munch');
          audio.play('correct');
          const at = slimeTop();
          popup(scene, at.x, at.y, t('yum'), 'good');
          break;
        }
        case 'wordSpat': {
          void slime.play('spit', 1.4);
          audio.play('spit');
          const at = slimeTop();
          popup(scene, at.x, at.y, t('bleh'), 'miss');
          break;
        }
        case 'slimeBumped': {
          void slime.play('hit');
          scene.cameras.main.shake(250, 0.005);
          audio.play('hit');
          const at = slimeTop();
          popup(scene, at.x, at.y, t('oof'), 'miss');
          void guards.get(ev.guardId)?.play('attack');
          break;
        }
        case 'powerStarted': {
          audio.play('victory');
          void banner(scene, t('powerBannerTitle'), t('powerBannerText'), 2.4);
          scene.cameras.main.shake(300, 0.006);
          const at = slimeTop();
          popup(scene, at.x, at.y, t('powerUp'), 'good');
          break;
        }
        case 'powerEnded': {
          const at = slimeTop();
          popup(scene, at.x, at.y, t('powerDown'), 'miss');
          break;
        }
        case 'guardEaten': {
          const g = guards.get(ev.guardId);
          if (g) {
            guards.delete(ev.guardId);
            const from = { x: g.x, z: g.z, s: 1 };
            scene.tweens.add({
              targets: from,
              x: slime.x,
              z: slime.z,
              s: 0,
              duration: 350,
              onUpdate: () => {
                g.placeAt(from.x, from.z);
                g.sprite.setScale(from.s);
              },
              onComplete: () => g.destroy(),
            });
          }
          void slime.play('attack', 1.2);
          scene.cameras.main.shake(350, 0.008);
          audio.play('gulp');
          const at = slimeTop();
          popup(scene, at.x, at.y, t('gulp', { coins: ev.coins }), 'good');
          break;
        }
        case 'guardReturned':
          addGuard(ev.guardId, ev.kind, ev.x, ev.z);
          break;
        case 'sentenceComplete':
          audio.play('victory');
          break;
        case 'shiftComplete':
          void finish();
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
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<DevourerSlimeState, DevourerSlimeCommand, DevourerSlimeEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      if (!finished) joystick.update();
      slime.moveTo(s.slime.x, s.slime.z);
      slime.update(dt);
      // The slime's size, with a soft squash, and the view pulling back as it grows.
      shownSize += (s.slime.size - shownSize) * (1 - Math.exp(-dt * 6));
      const wobble = 1 + Math.sin(time / 140) * 0.03;
      slime.sprite.setScale(shownSize * SLIME_SCALE * wobble, (shownSize * SLIME_SCALE) / wobble);
      arena.zoom(baseScale / (1 + (shownSize - 1) * 0.35));
      for (const g of s.guards) guards.get(g.id)?.moveTo(g.x, g.z);
      // Powered: a gold tint that blinks in the last two seconds. The status text counts down once a second.
      const ms = s.slime.poweredMs;
      const glow = ms > 0 && (ms >= 2000 || Math.floor(ms / 150) % 2 === 0);
      if (glow) slime.sprite.setTint(0xffe27a);
      else slime.sprite.clearTint();
      drawPower(ms, time);
      // Every guard pulses cyan while it can be eaten.
      for (const g of guards.values()) {
        if (ms > 0 && Math.floor(time / 180) % 2 === 0) g.sprite.setTint(0x7ff3ff);
        else g.sprite.clearTint();
      }
      for (const g of guards.values()) g.update(dt);
      for (const b of s.bubbles) {
        const view = bubbles.get(b.id);
        if (!view || view.gone) continue;
        view.x += (b.x - view.x) * Math.min(1, dt * 10);
        view.z += (b.z - view.z) * Math.min(1, dt * 10);
      }
      for (const view of bubbles.values()) {
        if (!view.glow.visible) continue;
        const bob = Math.sin(time / 500 + view.x) * 0.12;
        const p = arena.px(view.x, 0.7 + bob, view.z);
        view.glow.setPosition(p.x, p.y).setDepth(depthOf(view.z, 0.7));
        if (!view.gone) arena.pin(view.tag, view.x, 1.2 + bob, view.z);
      }
      arena.follow(s.slime.x, s.slime.z, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: DevourerSlimeCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let k = 0; k < steps; k++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextSteer(sim.state);
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
    audio.music('meadow');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#1d3a24',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'devourer-slime', preload, create, update },
  };
}
