/**
 * Dungeon Liberator in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack over the vault room baked from the 3D set.
 * The hero frees the villagers in sentence order (their words on tags that stay on screen), the
 * freed line follows, skeletons patrol, and the gate glows open when the sentence is complete.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, COLORS, depthOf, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createDungeonLiberator, evidenceOf, GATE, KNIGHT_START, scoreOf, type DungeonLiberatorCommand, type DungeonLiberatorEvent, type DungeonLiberatorState } from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D, SKELETON_CLIPS_2D, VILLAGER_CLIPS_2D } from '../manifest.js';
import { nextSteer } from '../qc/bot.js';
import strings from '../strings.en.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

/** The arch of the gate in the north wall (the 3D set's portcullis stands at z = -5.2). */
const ARCH = { x: GATE.x, y: 1.0, z: -5.2 };

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('dungeonLiberator')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createDungeonLiberator(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the vault room
    scene.cameras.main.setBackgroundColor('#141018');
    const panel = new WordPanel2D(scene, 66);
    const arena = new Arena2D(scene, edition, PROJECTION, BACKGROUND_FILE, { scale: H > W ? 1.3 : 1.1, top: 66 });
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, arena.world);
    hero.placeAt(KNIGHT_START.x, KNIGHT_START.z);
    hero.face(0, -1);
    arena.follow(KNIGHT_START.x, KNIGHT_START.z, 0, true);
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

    // ---------------------------------------------------------------- villagers and skeletons
    const villagers = new Map<string, { actor: Actor2D; tag: Phaser.GameObjects.Container }>();
    const skeletons = new Map<string, Actor2D>();

    function clearRoom(): void {
      for (const v of villagers.values()) {
        v.actor.destroy();
        v.tag.destroy();
      }
      villagers.clear();
      for (const s of skeletons.values()) s.destroy();
      skeletons.clear();
    }

    function startRoom(ev: Extract<DungeonLiberatorEvent, { type: 'roomStarted' }>): void {
      clearRoom();
      for (const v of ev.villagers) {
        const model = edition.bindings[`${v.kind}.idle`] ? v.kind : 'villager';
        const actor = new Actor2D(scene, edition, model, PROJECTION, { dirs: 4, clips: clips(model, VILLAGER_CLIPS_2D[model] ?? ['idle', 'walk']), stiffness: 12 }, arena.world);
        actor.placeAt(v.x, v.z);
        actor.face(0, 1);
        villagers.set(v.id, { actor, tag: tag(scene, v.word, 18).setDepth(15_000) });
      }
      for (const s of ev.skeletons) {
        const actor = new Actor2D(scene, edition, 'skeleton', PROJECTION, { dirs: 4, clips: clips('skeleton', SKELETON_CLIPS_2D), stiffness: 12 }, arena.world);
        actor.placeAt(s.x, s.z);
        actor.face(0, 1);
        void actor.play('rise');
        skeletons.set(s.id, actor);
      }
      glow.setAlpha(0);
      scene.tweens.killTweensOf(glow);
    }

    function drawHud(): void {
      const s = sim.state;
      const sentence = s.shift[s.room];
      if (sentence) panel.sentence(sentence.words, s.next, s.helper);
      arena.top = panel.bottom;
      for (const v of s.villagers) {
        const view = villagers.get(v.id);
        if (!view) continue;
        const next = s.helper && v.index === s.next && !v.following;
        recolorTag(view.tag, v.following ? COLORS.green : next ? COLORS.purple : COLORS.tagFill, next ? COLORS.gold : 0xffffff);
      }
      status.set(t('room', { room: Math.min(s.room + 1, s.rooms), rooms: s.rooms }), '');
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const over = (id: string) => {
      const v = villagers.get(id)?.actor;
      return v ? arena.at(v.x, 1.5, v.z) : arena.at(hero.x, 1.5, hero.z);
    };

    // The Knight and the freed line walk out through the open gate, one after the other; then the screen fades.
    const WALK_OUT = { speed: 2.4, gap: 0.45, beyond: 2.2 };
    type Exit = { actor: Actor2D; from: { x: number; z: number }; delay: number };
    let exit: { walkers: Exit[]; time: number; total: (e: Exit) => number; done: () => void } | null = null;
    let lineBefore: string[] = [];
    /** True from the walk out until the next room shows: the core waits, so the room does not move on unseen. */
    let hold = false;
    let faded = false;

    function fileOut(line: readonly string[]): Promise<void> {
      const last = sim.state.phase === 'complete';
      const actors = [...(last ? [] : [hero]), ...line.map((id) => villagers.get(id)?.actor).filter((a): a is Actor2D => !!a)];
      hold = true;
      for (const id of line) villagers.get(id)?.tag.setVisible(false);
      return new Promise((resolve) => {
        const first = (e: Exit): number => Math.hypot(GATE.x - e.from.x, GATE.z - e.from.z);
        exit = {
          walkers: actors.map((actor, i) => ({ actor, from: { x: actor.x, z: actor.z }, delay: i * WALK_OUT.gap })),
          time: 0,
          total: (e) => first(e) + WALK_OUT.beyond,
          done: () => {
            exit = null;
            if (last) return resolve();
            faded = true;
            scene.cameras.main.fadeOut(250, 0, 0, 0);
            scene.cameras.main.once('camerafadeoutcomplete', () => resolve());
          },
        };
      });
    }

    /** Where a walker is after `d` meters of its way: to the gate, then on through the gate. */
    function along(e: Exit, d: number): { x: number; z: number } {
      const first = Math.hypot(GATE.x - e.from.x, GATE.z - e.from.z);
      if (d < first) {
        const k = d / Math.max(first, 1e-6);
        return { x: e.from.x + (GATE.x - e.from.x) * k, z: e.from.z + (GATE.z - e.from.z) * k };
      }
      return { x: GATE.x, z: GATE.z - (d - first) };
    }

    const queue: DungeonLiberatorEvent[] = [];
    let draining = false;
    async function drain(): Promise<void> {
      if (draining) return;
      draining = true;
      while (queue.length > 0) await handle(queue.shift()!);
      draining = false;
    }

    async function handle(ev: DungeonLiberatorEvent): Promise<void> {
      switch (ev.type) {
        case 'roomStarted': {
          startRoom(ev);
          hero.placeAt(sim.state.knight.x, sim.state.knight.z);
          hero.sprite.setVisible(true);
          hero.face(0, -1);
          arena.follow(sim.state.knight.x, sim.state.knight.z, 0, true);
          if (faded) {
            faded = false;
            scene.cameras.main.fadeIn(250, 0, 0, 0);
            await new Promise<void>((r) => scene.cameras.main.once('camerafadeincomplete', () => r()));
          }
          hold = false;
          loop.reset();
          break;
        }
        case 'villagerFreed': {
          const v = villagers.get(ev.id)?.actor;
          if (v) void v.play(v.has('wave') ? 'wave' : v.has('salute') ? 'salute' : 'victory');
          const at = over(ev.id);
          popup(scene, at.x, at.y, t('freed'), 'good');
          audio.play('join');
          break;
        }
        case 'villagerRefused': {
          void villagers.get(ev.id)?.actor.play('talk');
          const at = over(ev.id);
          popup(scene, at.x, at.y, t('notYet'), 'miss');
          audio.play('wrong');
          break;
        }
        case 'lineScattered':
          for (const id of ev.ids) {
            const at = over(id);
            popup(scene, at.x, at.y, t('scared'), 'miss');
          }
          audio.play('eek');
          break;
        case 'knightBumped':
          void hero.play('hit');
          scene.cameras.main.shake(300, 0.006);
          void skeletons.get(ev.skeletonId)?.play('attack');
          audio.play('hit');
          break;
        case 'gateOpened':
          audio.play('clank');
          audio.play('correct');
          scene.tweens.add({ targets: glow, alpha: 1, duration: 1000 });
          scene.tweens.add({ targets: glow, scale: { from: 0.94, to: 1.06 }, duration: 600, yoyo: true, repeat: -1 });
          burst(ARCH.x, ARCH.y, ARCH.z, 0x9dffb0, 18);
          void banner(scene, t('gate'), '', 1.6);
          break;
        case 'roomCleared':
          audio.play('victory');
          await fileOut(lineBefore);
          break;
        case 'shiftComplete':
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
    const loop = createFixedStepLoop<DungeonLiberatorState, DungeonLiberatorCommand, DungeonLiberatorEvent>(sim, { render: (events) => (queue.push(...events), void drain()) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      if (exit) {
        // The walk out replaces the core's positions: each walker follows a point along its way.
        exit.time += dt;
        let allOut = true;
        for (const e of exit.walkers) {
          const d = Math.max(0, exit.time - e.delay) * WALK_OUT.speed;
          const p = along(e, Math.min(d, exit.total(e)));
          e.actor.moveTo(p.x, p.z);
          e.actor.update(dt);
          if (d < exit.total(e) + 0.4) allOut = false;
          else e.actor.sprite.setVisible(false);
        }
        arena.follow(hero.x, hero.z, dt);
        arena.sort();
        if (allOut) exit.done();
        return;
      }
      if (hold) return;
      lineBefore = s.line.slice();
      manual.run(time);
      if (!finished) joystick.update();
      hero.moveTo(s.knight.x, s.knight.z);
      hero.update(dt);
      for (const v of s.villagers) {
        const view = villagers.get(v.id);
        if (!view) continue;
        view.actor.moveTo(v.x, v.z);
        view.actor.update(dt);
        arena.pin(view.tag, view.actor.x, 1.35, view.actor.z);
      }
      for (const k of s.skeletons) {
        const view = skeletons.get(k.id);
        if (!view) continue;
        view.moveTo(k.x, k.z);
        view.update(dt);
      }
      arena.follow(s.knight.x, s.knight.z, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: DungeonLiberatorCommand) => loop.dispatch(command),
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
    scene: { key: 'dungeon-liberator', preload, create, update },
  };
}
