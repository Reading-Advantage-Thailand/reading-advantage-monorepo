/**
 * Shadow Gate Dungeon in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack over the baked dungeon room. The hero
 * touches word crystals (their words on tags that stay on screen) to build the sentence, a dark
 * skeleton shadow follows, and the gate glows open when the sentence is complete.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, COLORS, depthOf, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, textureKeyOf, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createShadowGate, evidenceOf, GATE, HERO_START, rightCrystalsOf, scoreOf, type ShadowGateCommand, type ShadowGateEvent, type ShadowGateState } from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D, SHADOW_CLIPS_2D } from '../manifest.js';
import { nextSteer } from '../qc/bot.js';
import strings from '../strings.en.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.js';

/** The arch of the gate in the north wall (the 3D set's gate stands at z = -5.2). */
const ARCH = { x: GATE.x, y: 1.0, z: -5.2 };
/** The crystal sprite is 48 px; this scale makes it about a meter tall on the floor. */
const CRYSTAL_SCALE = 1.5;
const CRYSTAL_FILE = 'prop.crystal-cluster';
const SHADOW_TINT = 0x6b5a9e;

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('shadowGateDungeon')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createShadowGate(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the dungeon room
    scene.cameras.main.setBackgroundColor('#141018');
    const panel = new WordPanel2D(scene, 66);
    const arena = new Arena2D(scene, edition, PROJECTION, BACKGROUND_FILE, { scale: H > W ? 1.3 : 1.1, top: 66 });
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, arena.world);
    hero.placeAt(HERO_START.x, HERO_START.z);
    hero.face(0, -1);
    arena.follow(HERO_START.x, HERO_START.z, 0, true);
    // The open gate: a green glow in the arch.
    const arch = arena.px(ARCH.x, ARCH.y, ARCH.z);
    const glow = scene.add.graphics().setPosition(arch.x, arch.y).setDepth(depthOf(ARCH.z, 3)).setBlendMode('ADD').setAlpha(0);
    for (const [r, a] of [[70, 0.18], [48, 0.3], [30, 0.45]] as const) glow.fillStyle(0x9dffb0, a).fillEllipse(0, 0, r * 2, r * 2.4);
    arena.world.add(glow);

    // ---------------------------------------------------------------- HUD
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

    audio.defineMood('vault', { bpm: 92, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], busy: false, drum: true });
    audio.defineSfx('join', (s) => [784, 988, 1319].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
    audio.defineSfx('eek', (s) => s.tone(1200, 0.25, 'square', 0.06, 0, 1.5));
    audio.defineSfx('clank', (s) => {
      s.noise(0.3, 0.2, 1500);
      s.tone(180, 0.35, 'square', 0.08, 0, 0.7);
    });

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 30;
        const dot = scene.add.circle(at.x, at.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- crystals and shadows
    type CrystalView = { sprite: Phaser.GameObjects.Image; tag: Phaser.GameObjects.Container; x: number; z: number };
    const crystals = new Map<string, CrystalView>();
    const shadows = new Map<string, Actor2D>();
    const crystalFile = edition.pack.files[CRYSTAL_FILE];

    function clearCrystals(): void {
      for (const c of crystals.values()) {
        scene.tweens.killTweensOf(c.sprite);
        c.sprite.destroy();
        c.tag.destroy();
      }
      crystals.clear();
    }

    function clearRoom(): void {
      clearCrystals();
      for (const s of shadows.values()) s.destroy();
      shadows.clear();
    }

    function placeWave(list: Extract<ShadowGateEvent, { type: 'wavePlaced' }>['crystals']): void {
      clearCrystals();
      for (const c of list) {
        const p = arena.px(c.x, 0, c.z);
        const sprite = scene.add.image(p.x, p.y, textureKeyOf(edition, CRYSTAL_FILE), 0).setScale(CRYSTAL_SCALE).setDepth(depthOf(c.z, 1));
        if (crystalFile?.origin) sprite.setOrigin(crystalFile.origin.x, crystalFile.origin.y);
        arena.world.add(sprite);
        scene.tweens.add({ targets: sprite, scale: { from: CRYSTAL_SCALE * 0.93, to: CRYSTAL_SCALE * 1.05 }, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.InOut' });
        crystals.set(c.id, { sprite, tag: tag(scene, c.word, 18).setDepth(15_000), x: c.x, z: c.z });
      }
      drawHud();
    }

    function startRoom(ev: Extract<ShadowGateEvent, { type: 'roomStarted' }>): void {
      clearRoom();
      for (const s of ev.shadows) {
        const actor = new Actor2D(scene, edition, 'skeleton', PROJECTION, { dirs: 4, clips: clips('skeleton', SHADOW_CLIPS_2D), stiffness: 12 }, arena.world);
        actor.placeAt(s.x, s.z);
        actor.face(0, 1);
        actor.tint(SHADOW_TINT);
        void actor.play('rise');
        shadows.set(s.id, actor);
      }
      glow.setAlpha(0);
      scene.tweens.killTweensOf(glow);
    }

    function drawHud(): void {
      const s = sim.state;
      const sentence = s.shift[s.room];
      if (sentence) panel.sentence(sentence.words, s.next, s.helper);
      arena.top = panel.bottom;
      const right = new Set(s.helper ? rightCrystalsOf(s).map((c) => c.id) : []);
      for (const [id, view] of crystals) {
        const next = right.has(id);
        recolorTag(view.tag, next ? COLORS.purple : COLORS.tagFill, next ? COLORS.gold : 0xffffff);
      }
      status.set(t('room', { room: Math.min(s.room + 1, s.rooms), rooms: s.rooms }), '');
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const overCrystal = (id: string) => {
      const c = crystals.get(id);
      return c ? arena.at(c.x, 1.3, c.z) : arena.at(hero.x, 1.5, hero.z);
    };

    // The hero walks out through the open gate; then the screen fades.
    const WALK_OUT = { speed: 2.4, beyond: 2.2 };
    let exit: { from: { x: number; z: number }; time: number; done: () => void } | null = null;
    /** True from the walk out until the next room shows: the core waits, so the room does not move on unseen. */
    let hold = false;
    let faded = false;

    function walkOut(): Promise<void> {
      const last = sim.state.phase === 'complete';
      if (last) return Promise.resolve();
      hold = true;
      return new Promise((resolve) => {
        exit = {
          from: { x: hero.x, z: hero.z },
          time: 0,
          done: () => {
            exit = null;
            faded = true;
            scene.cameras.main.fadeOut(250, 0, 0, 0);
            scene.cameras.main.once('camerafadeoutcomplete', () => resolve());
          },
        };
      });
    }

    const queue: ShadowGateEvent[] = [];
    let draining = false;
    async function drain(): Promise<void> {
      if (draining) return;
      draining = true;
      while (queue.length > 0) await handle(queue.shift()!);
      draining = false;
    }

    async function handle(ev: ShadowGateEvent): Promise<void> {
      switch (ev.type) {
        case 'roomStarted': {
          startRoom(ev);
          hero.placeAt(sim.state.hero.x, sim.state.hero.z);
          hero.sprite.setVisible(true);
          hero.face(0, -1);
          arena.follow(sim.state.hero.x, sim.state.hero.z, 0, true);
          if (faded) {
            faded = false;
            scene.cameras.main.fadeIn(250, 0, 0, 0);
            await new Promise<void>((r) => scene.cameras.main.once('camerafadeincomplete', () => r()));
          }
          hold = false;
          loop.reset();
          break;
        }
        case 'wavePlaced':
          placeWave(ev.crystals);
          break;
        case 'crystalTaken': {
          const c = crystals.get(ev.id);
          if (c) burst(c.x, 0.7, c.z, 0xb8a8ff, 14);
          const at = overCrystal(ev.id);
          popup(scene, at.x, at.y, t('taken'), 'good');
          audio.play('join');
          break;
        }
        case 'crystalRefused': {
          const at = overCrystal(ev.id);
          popup(scene, at.x, at.y, t('notYet'), 'miss');
          audio.play('wrong');
          break;
        }
        case 'heroBumped': {
          void hero.play('hit');
          scene.cameras.main.shake(300, 0.006);
          void shadows.get(ev.shadowId)?.play('attack');
          const at = arena.at(hero.x, 1.5, hero.z);
          popup(scene, at.x, at.y, t('bumped'), 'miss');
          audio.play('eek');
          audio.play('hit');
          break;
        }
        case 'gateOpened':
          clearCrystals();
          audio.play('clank');
          audio.play('correct');
          scene.tweens.add({ targets: glow, alpha: 1, duration: 1000 });
          scene.tweens.add({ targets: glow, scale: { from: 0.94, to: 1.06 }, duration: 600, yoyo: true, repeat: -1 });
          burst(ARCH.x, ARCH.y, ARCH.z, 0x9dffb0, 18);
          void banner(scene, t('gate'), '', 1.6);
          break;
        case 'roomCleared':
          audio.play('victory');
          await walkOut();
          break;
        case 'delveComplete':
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
    const loop = createFixedStepLoop<ShadowGateState, ShadowGateCommand, ShadowGateEvent>(sim, { render: (events) => (queue.push(...events), void drain()) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      if (exit) {
        // The walk out replaces the core's positions: the hero follows a point along its way.
        exit.time += dt;
        const first = Math.hypot(GATE.x - exit.from.x, GATE.z - exit.from.z);
        const total = first + WALK_OUT.beyond;
        const d = exit.time * WALK_OUT.speed;
        const k = Math.min(d, first) / Math.max(first, 1e-6);
        const p = d < first ? { x: exit.from.x + (GATE.x - exit.from.x) * k, z: exit.from.z + (GATE.z - exit.from.z) * k } : { x: GATE.x, z: GATE.z - (Math.min(d, total) - first) };
        hero.moveTo(p.x, p.z);
        hero.update(dt);
        arena.follow(hero.x, hero.z, dt);
        arena.sort();
        if (d >= total + 0.4) {
          hero.sprite.setVisible(false);
          exit.done();
        }
        return;
      }
      if (hold) return;
      manual.run(time);
      if (!finished) joystick.update();
      hero.moveTo(s.hero.x, s.hero.z);
      hero.update(dt);
      for (const view of crystals.values()) arena.pin(view.tag, view.x, 1.3, view.z);
      for (const k of s.shadows) {
        const view = shadows.get(k.id);
        if (!view) continue;
        view.moveTo(k.x, k.z);
        view.update(dt);
      }
      arena.follow(s.hero.x, s.hero.z, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: ShadowGateCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        // QC fast-forward: no walk out (it needs frames), so a cleared room is not played.
        for (let k = 0; k < steps; k++) sim.tick().forEach((ev) => void (ev.type === 'roomCleared' ? undefined : handle(ev)));
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
    audio.music('vault');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#141018',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'shadow-gate-dungeon', preload, create, update },
  };
}
