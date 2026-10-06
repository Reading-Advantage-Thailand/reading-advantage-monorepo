/**
 * Hero vs. Zombie in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack over the churchyard baked from the 3D set.
 * The camera follows the hero; orbs glow with their meanings on tags that stay on screen; the
 * floating joystick (or the arrow keys) steers, and the Blast button (or Space) knocks the zombies
 * flat. At dawn the light warms and the zombies crumble.
 */
import type * as Phaser from 'phaser';
import { shownHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import { playerFigure } from '@reading-advantage/advantage-play-kit-3d/avatar/portrait-of';
import { preloadAssetBindings, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, button, depthOf, fitGameSize, Joystick2D, popup, registerSheetAnimations, StatusBar2D, tag, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createHeroVsZombie, evidenceOf, scoreOf, TUNING, type HeroVsZombieCommand, type HeroVsZombieEvent, type HeroVsZombieState, type HeroVsZombieInput } from '../core/index.js';
import { evidenceStoryOf } from '../../shared/challenge.js';
import { manifest, FILES_2D, HERO_CLIPS_2D, HEROES_2D, ZOMBIE_CLIPS_2D } from '../manifest.js';
import { nextCommand } from '../qc/bot.js';
import strings from '../strings.en.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

const ORB_COLOR = 0xfff1a8;
/** Characters are lit like day in the forge; a cool tint puts them in the moonlit yard. */
const NIGHT_TINT = 0xb4c0ff;

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  // A practice input, or a class challenge's APK vocabulary input.
  const input = ctx.input as HeroVsZombieInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('heroVsZombie')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = shownHero(HEROES_2D, options, 'knight');
  /** The student's own figure for the hero when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createHeroVsZombie(input, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the yard
    scene.cameras.main.setBackgroundColor('#0b1224');
    const panel = new WordPanel2D(scene, 66);
    const arena = new Arena2D(scene, edition, PROJECTION, BACKGROUND_FILE, { scale: H > W ? 1.25 : 1.1, top: 66, bottom: 100 });
    const ppm = PROJECTION.ppm;
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, figure, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, arena.world);
    hero.placeAt(sim.state.hero.x, sim.state.hero.z);
    hero.sprite.setTint(NIGHT_TINT);
    arena.follow(sim.state.hero.x, sim.state.hero.z, 0, true);
    // The dawn: a warm light over the yard, added over the night colors.
    const dawnLight = scene.add.rectangle(0, 0, W, H, 0xffb070, 0).setOrigin(0, 0).setScrollFactor(0).setDepth(9_000).setBlendMode('ADD');

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const blast = button(scene, W - 84, H - 64, `${t('blast')} ✦✦✦`, () => loop.dispatch({ type: 'blast' }), 0xffd84a).setDepth(19_450);
    const blastLabel = blast.list[1] as Phaser.GameObjects.Text;
    const joystick = new Joystick2D(scene, {
      hint: t('move'),
      top: 66,
      keys: () => ctx.inputController.snapshot().keys,
      change: (x, z) => loop.dispatch({ type: 'steer', x, z }),
    });

    function drawStatus(): void {
      const s = sim.state;
      status.set(t('round', { index: Math.min(s.roundIndex + 1, Math.max(1, s.total)), total: s.total }), `🪙 ${s.coins}`);
      blastLabel.setText(`${t('blast')} ${'✦'.repeat(s.charges) || '·'}`);
      blast.setAlpha(s.charges > 0 ? 1 : 0.55);
    }

    audio.defineMood('night', { bpm: 88, chords: [[57, 60, 64], [53, 57, 60], [52, 55, 59], [50, 53, 57]], busy: false, drum: true });
    audio.defineMood('dawn', { bpm: 96, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], busy: true, drum: false });
    audio.defineSfx('light', (s) => [880, 1319, 1760].forEach((f, i) => s.tone(f, 0.3, 'sine', 0.14, i * 0.05)));
    audio.defineSfx('boom', (s) => {
      s.tone(90, 0.6, 'sine', 0.6, 0, 0.5);
      s.noise(0.5, 0.35, 900);
    });
    audio.defineSfx('groan', (s) => s.tone(130, 0.7, 'sawtooth', 0.06, 0, 0.8));

    /** Little bursts of light at a world point. */
    function burst(x: number, y: number, z: number, color: number, n: number, spread = 1): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = (20 + Math.random() * 26) * spread;
        const dot = scene.add.circle(at.x, at.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 500 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- orbs and zombies
    const orbs = new Map<string, { glow: Phaser.GameObjects.Graphics; tag: Phaser.GameObjects.Container; x: number; z: number }>();
    const zombies = new Map<string, Actor2D>();

    function orbGraphic(): Phaser.GameObjects.Graphics {
      const g = scene.add.graphics();
      const r = 0.3 * ppm;
      g.fillStyle(0x000000, 0.25).fillEllipse(0, 0.75 * ppm * Math.cos(Math.PI / 4), r * 1.6, r * 0.7);
      g.fillStyle(ORB_COLOR, 0.22).fillCircle(0, 0, r * 1.6);
      g.fillStyle(ORB_COLOR, 0.45).fillCircle(0, 0, r * 1.2);
      g.fillStyle(ORB_COLOR, 0.95).fillCircle(0, 0, r);
      g.fillStyle(0xffffff, 0.8).fillCircle(-r * 0.3, -r * 0.3, r * 0.35);
      arena.world.add(g);
      return g;
    }

    function clearOrbs(): void {
      for (const o of orbs.values()) {
        o.glow.destroy();
        o.tag.destroy();
      }
      orbs.clear();
    }

    function showRound(ev: Extract<HeroVsZombieEvent, { type: 'roundStarted' }>): void {
      clearOrbs();
      panel.target(t('find'), ev.term);
      arena.top = panel.bottom;
      for (const o of ev.orbs) orbs.set(o.id, { glow: orbGraphic(), tag: tag(scene, o.text, 18).setDepth(15_000), x: o.x, z: o.z });
    }

    function addZombie(id: string, x: number, z: number): void {
      let zombie = zombies.get(id);
      if (!zombie) {
        zombie = new Actor2D(scene, edition, 'zombie', PROJECTION, { dirs: 4, clips: clips('zombie', ZOMBIE_CLIPS_2D), stiffness: 12 }, arena.world);
        zombie.sprite.setTint(NIGHT_TINT);
        zombies.set(id, zombie);
      }
      zombie.placeAt(x, z);
      zombie.face(0, 1);
      void zombie.play('rise', 0.8);
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const heroTop = () => arena.at(hero.x, 1.4, hero.z);

    function handle(ev: HeroVsZombieEvent): void {
      switch (ev.type) {
        case 'roundStarted':
          showRound(ev);
          break;
        case 'orbTaken': {
          const o = orbs.get(ev.id);
          if (o) burst(o.x, 0.75, o.z, ORB_COLOR, 16, 1.4);
          clearOrbs();
          audio.play('light');
          audio.play('correct');
          const at = heroTop();
          popup(scene, at.x, at.y, t('light'), 'good');
          break;
        }
        case 'orbWrong': {
          const o = orbs.get(ev.id);
          if (o) burst(o.x, 0.75, o.z, 0x7788aa, 10);
          audio.play('wrong');
          const at = heroTop();
          popup(scene, at.x, at.y, t('wrong'), 'miss');
          break;
        }
        case 'orbsMoved':
          for (const m of ev.orbs) {
            const o = orbs.get(m.id);
            if (!o) continue;
            scene.tweens.add({ targets: o, x: m.x, z: m.z, duration: 500, ease: 'Sine.InOut' });
          }
          break;
        case 'wordReturns': {
          const at = heroTop();
          popup(scene, at.x, at.y, t('again'), 'miss');
          break;
        }
        case 'zombieRose':
          addZombie(ev.zombieId, ev.x, ev.z);
          audio.play('groan');
          break;
        case 'heroBumped': {
          void hero.play('hit');
          void zombies.get(ev.zombieId)?.play('attack');
          scene.cameras.main.shake(300, 0.006);
          audio.play('hit');
          const at = heroTop();
          popup(scene, at.x, at.y, t('bump'), 'miss');
          break;
        }
        case 'blast': {
          void hero.play('attack', 1.4);
          scene.cameras.main.shake(500, 0.01);
          audio.play('boom');
          // A ring of light on the ground, as far as the Blast reaches.
          const p = arena.px(hero.x, 0.05, hero.z);
          const ring = scene.add.graphics().setPosition(p.x, p.y).setDepth(depthOf(hero.z) - 1);
          const rx = TUNING.blastRadius * ppm;
          ring.lineStyle(10, 0xffe28a, 0.9).strokeEllipse(0, 0, rx * 2, rx * 2 * Math.sin(Math.PI / 4));
          ring.fillStyle(0xffe28a, 0.18).fillEllipse(0, 0, rx * 2, rx * 2 * Math.sin(Math.PI / 4));
          arena.world.add(ring);
          ring.setScale(0.15);
          scene.tweens.add({ targets: ring, scale: 1, alpha: 0, duration: 650, ease: 'Cubic.Out', onComplete: () => ring.destroy() });
          burst(hero.x, 0.6, hero.z, 0xffe28a, 24, 2.2);
          for (const id of ev.knocked) void zombies.get(id)?.play('death', 1.6, true);
          break;
        }
        case 'dawn':
          clearOrbs();
          panel.hide();
          arena.top = 66;
          audio.music('dawn');
          scene.tweens.add({ targets: dawnLight, fillAlpha: 0.2, duration: 2200 });
          scene.tweens.addCounter({ from: 0, to: 1, duration: 2200, onUpdate: (tw) => {
            const u = tw.getValue() ?? 0;
            const tint = mix(NIGHT_TINT, 0xffffff, u);
            hero.sprite.setTint(tint);
            for (const z of zombies.values()) z.sprite.setTint(tint);
          } });
          for (const z of zombies.values()) {
            void z.play('death', 1, true);
            scene.tweens.add({ targets: z.sprite, alpha: 0, scale: 0.4, delay: 1200, duration: 800 });
          }
          void banner(scene, t('dawn.title'), t('dawn.text'), 2.0);
          break;
        case 'nightComplete':
          void finish();
          break;
      }
      drawStatus();
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      loop.stop();
      joystick.destroy();
      blast.setVisible(false);
      audio.play('victory');
      void hero.play('victory', 1, true);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, evidenceStoryOf(input, manifest.levels), seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<HeroVsZombieState, HeroVsZombieCommand, HeroVsZombieEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      if (!finished) {
        joystick.update();
        if (ctx.inputController.snapshot().pressed?.some((k) => k === 'Space' || k === 'Enter')) loop.dispatch({ type: 'blast' });
      }
      hero.moveTo(s.hero.x, s.hero.z);
      hero.update(dt);
      for (const z of s.zombies) {
        const view = zombies.get(z.id);
        if (!view) continue;
        if (z.downMs <= 0 && !z.rising) view.moveTo(z.x, z.z);
        view.update(dt);
      }
      for (const [id, o] of orbs) {
        const bob = Math.sin(time / 420 + o.x) * 0.12;
        const p = arena.px(o.x, 0.75 + bob, o.z);
        o.glow.setPosition(p.x, p.y).setDepth(depthOf(o.z, 0.75));
        arena.pin(o.tag, o.x, 1.3 + bob, o.z);
        const orb = s.orbs.find((x) => x.id === id);
        if (orb && (Math.abs(orb.x - o.x) > 0.01 || Math.abs(orb.z - o.z) > 0.01) && !scene.tweens.isTweening(o)) {
          o.x = orb.x;
          o.z = orb.z;
        }
      }
      arena.follow(s.hero.x, s.hero.z, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: HeroVsZombieCommand) => loop.dispatch(command),
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

    drawStatus();
    audio.music('night');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#0b1224',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'hero-vs-zombie', preload, create, update },
  };
}

/** A color between two colors (0 = a, 1 = b). */
function mix(a: number, b: number, u: number): number {
  const ch = (c: number, s: number) => (c >> s) & 255;
  const m = (s: number) => Math.round(ch(a, s) + (ch(b, s) - ch(a, s)) * u) << s;
  return m(16) | m(8) | m(0);
}
