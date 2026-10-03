/**
 * The Labyrinth of the Goblin King in 2D (Phaser): the fallback for old phones and the renderer a
 * player may choose. It runs the same core, rules, catalog, and evidence as the 3D view
 * (../view/game.ts), with the forge sprites of the `primary-chibi-2d` pack over the maze baked
 * from the 3D set (one background per maze). The view reads the orbs and goblins from the state
 * each frame, glides the sprites to the core's positions, and never decides a rule.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, COLORS, depthOf, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createLabyrinth, evidenceOf, positionOf, rightOrbOf, scoreOf, type LabyrinthCommand, type LabyrinthEvent, type LabyrinthState, type Mover } from '../core/index.js';
import { backgroundOf, FILES_2D, GOBLIN_CLIPS_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextTurn } from '../qc/bot.js';
import strings from '../strings.en.js';
import { dirOfStick, edgePoint, heldTurn, worldOf, worldOfCell } from '../view/geometry.js';
import { PROJECTIONS } from './projections.gen.js';

/** A jump longer than this (meters) is a teleport of the core, not a walk. */
const SNAP_M = 1.5;
const ORB_Y = 0.75;

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as StoryInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('labyrinth')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createLabyrinth(story, { seed, helper: options.helper });
  const maze = sim.state.maze;
  const background = backgroundOf(maze.id);
  const projection = PROJECTIONS[maze.id]!;
  const needed = FILES_2D.filter((id) => {
    const model = id.split('.')[0]!;
    if (model === 'background') return id === background;
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
    // Phaser calls create() with the scene as `this`.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const scene = this;
    const { width: W, height: H } = scene.scale;
    const startedAt = performance.now();
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);
    const clips = (model: string, list: readonly string[]) => list.filter((c) => edition.bindings[`${model}.${c}`]);
    const world = (m: Mover): { x: number; z: number } => worldOf(maze, positionOf(m));

    // ---------------------------------------------------------------- the maze
    scene.cameras.main.setBackgroundColor('#0b0d14');
    const panel = new WordPanel2D(scene, 66);
    const arena = new Arena2D(scene, edition, projection, background, { scale: 0.5, top: 66 });
    const start = worldOfCell(maze, maze.start);
    const hero = new Actor2D(scene, edition, heroId, projection, { dirs: 8, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, arena.world);
    hero.placeAt(start.x, start.z);
    hero.face(0, 1);
    arena.follow(start.x, start.z, 0, true);
    // The golden aura on the ground under the hero.
    const aura = scene.add.ellipse(0, 0, 150, 78, 0xffd84a, 0.5).setBlendMode('ADD').setAlpha(0);
    arena.world.add(aura);
    // A bright ring under the hero keeps it easy to find in the whole-maze view.
    const marker = scene.add.ellipse(0, 0, 84, 44).setStrokeStyle(5, 0xffffff, 0.9);
    arena.world.add(marker);
    // The open gate: a green glow in the arch.
    const gateAt = edgePoint(maze, maze.gate, maze.gateSide);
    const arch = arena.px(gateAt.x, 0.9, gateAt.z);
    const glow = scene.add.graphics().setPosition(arch.x, arch.y).setDepth(depthOf(gateAt.z, 3)).setBlendMode('ADD').setAlpha(0);
    for (const [r, a] of [[60, 0.18], [42, 0.3], [26, 0.45]] as const) glow.fillStyle(0x9dffb0, a).fillEllipse(0, 0, r * 2, r * 2.2);
    arena.world.add(glow);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    let held: ReturnType<typeof dirOfStick> = null;
    const joystick = new Joystick2D(scene, {
      hint: t('move'),
      top: 66,
      keys: () => ctx.inputController.snapshot().keys,
      change: (x, z) => {
        held = dirOfStick(x, z);
        if (held) loop.dispatch({ type: 'turn', dir: held });
      },
    });

    audio.defineMood('labyrinth', { bpm: 100, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], busy: false, drum: true });
    audio.defineSfx('fizzle', (s) => s.tone(300, 0.25, 'sawtooth', 0.07, 0, 0.5));
    audio.defineSfx('clank', (s) => {
      s.noise(0.3, 0.2, 1500);
      s.tone(180, 0.35, 'square', 0.08, 0, 0.7);
    });
    audio.defineSfx('aura', (s) => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.25, 'triangle', 0.12, i * 0.07)));

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 30;
        const dot = scene.add.circle(at.x, at.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- orbs and goblins
    interface OrbView {
      node: Phaser.GameObjects.Container;
      ring: Phaser.GameObjects.Arc;
      tag: Phaser.GameObjects.Container;
      x: number;
      z: number;
    }
    const orbs = new Map<string, OrbView>();
    const taken = new Set<string>();
    const goblins = new Map<string, { actor: Actor2D; fleeing: boolean }>();

    function addOrb(o: LabyrinthState['orbs'][number]): void {
      const at = worldOfCell(maze, o.cell);
      const halo = scene.add.circle(0, 0, 40, 0x7fd8ff, 0.3).setBlendMode('ADD');
      const core = scene.add.circle(0, 0, 22, 0x9fe8ff, 1).setStrokeStyle(4, 0xffffff, 0.95);
      const ring = scene.add.circle(0, 0, 36).setStrokeStyle(5, 0xffd84a, 1).setVisible(false);
      const node = scene.add.container(0, 0, [halo, core, ring]);
      arena.world.add(node);
      orbs.set(o.id, { node, ring, tag: tag(scene, o.word, 18).setDepth(15_000), x: at.x, z: at.z });
    }
    function removeOrb(id: string, view: OrbView): void {
      if (taken.delete(id)) burst(view.x, ORB_Y, view.z, 0x9fe8ff, 14);
      view.node.destroy();
      view.tag.destroy();
      orbs.delete(id);
    }
    function addGoblin(g: LabyrinthState['goblins'][number]): void {
      const p = world(g);
      const actor = new Actor2D(scene, edition, 'goblin-warrior', projection, { dirs: 4, clips: clips('goblin-warrior', GOBLIN_CLIPS_2D), stiffness: 12 }, arena.world);
      actor.placeAt(p.x, p.z);
      actor.face(0, 1);
      goblins.set(g.id, { actor, fleeing: false });
    }
    function clearAll(): void {
      for (const [id, view] of [...orbs]) removeOrb(id, view);
      for (const g of goblins.values()) g.actor.destroy();
      goblins.clear();
    }

    /** Makes the views match the state: new orbs and goblins appear, gone ones leave. */
    function reconcile(time: number): void {
      const s = sim.state;
      for (const o of s.orbs) if (!orbs.has(o.id)) addOrb(o);
      for (const [id, view] of [...orbs]) if (!s.orbs.some((o) => o.id === id)) removeOrb(id, view);
      for (const g of s.goblins) if (!goblins.has(g.id)) addGoblin(g);
      const right = s.helper ? rightOrbOf(s) : null;
      for (const o of s.orbs) {
        const view = orbs.get(o.id);
        if (!view) continue;
        const at = worldOfCell(maze, o.cell);
        view.x += (at.x - view.x) * 0.25;
        view.z += (at.z - view.z) * 0.25;
        const p = arena.px(view.x, ORB_Y + Math.sin(time / 400 + view.x) * 0.06, view.z);
        view.node.setPosition(p.x, p.y).setDepth(depthOf(view.z, 1));
        view.ring.setVisible(right?.id === o.id);
        recolorTag(view.tag, right?.id === o.id ? COLORS.purple : COLORS.tagFill, right?.id === o.id ? COLORS.gold : 0xffffff);
        arena.pin(view.tag, view.x, ORB_Y, view.z, 34);
      }
    }

    /** Zooms the baked maze to fit the free area, so the whole labyrinth is in view. */
    function fit(): void {
      const free = { w: W - 8, h: H - arena.top - 12 };
      const scale = Math.min(free.w / projection.width, free.h / projection.height);
      if (Math.abs(scale - arena.scale) > 0.002) arena.zoom(scale);
    }

    function drawHud(): void {
      const s = sim.state;
      const sentence = s.shift[s.sentence];
      if (sentence) {
        const found = s.gateOpen ? sentence.words.length : s.next;
        panel.sentence(
          sentence.words.map((w, i) => (i < found ? w : '_'.repeat(Math.min(6, Math.max(3, w.length))))),
          found,
          s.helper,
        );
      }
      arena.top = panel.bottom;
      fit();
      status.set(t('sentence', { n: Math.min(s.sentence + 1, s.sentences), total: s.sentences }), t('coins', { coins: s.coins }));
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const overHero = () => arena.at(hero.x, 1.8, hero.z);
    const overGoblin = (id: string) => {
      const g = goblins.get(id)?.actor;
      return g ? arena.at(g.x, 1.5, g.z) : overHero();
    };
    const overOrb = (id: string) => {
      const o = orbs.get(id);
      return o ? arena.at(o.x, ORB_Y + 0.5, o.z) : overHero();
    };

    function handle(ev: LabyrinthEvent): void {
      switch (ev.type) {
        case 'orbTaken': {
          taken.add(ev.id);
          const at = overHero();
          popup(scene, at.x, at.y, t('right'), 'good');
          audio.play('correct');
          break;
        }
        case 'orbWrong': {
          const at = overOrb(ev.id);
          popup(scene, at.x, at.y, t('wrong'), 'miss');
          audio.play('fizzle');
          break;
        }
        case 'orbsMoved':
          audio.play('tap');
          break;
        case 'heroBumped': {
          void hero.play('hit');
          hero.flash(0xff6a5a);
          scene.cameras.main.shake(300, 0.006);
          const at = overHero();
          popup(scene, at.x, at.y, t('bump'), 'miss');
          audio.play('hit');
          break;
        }
        case 'sentenceComplete': {
          audio.play('aura');
          const s = sim.state.shift.find((x) => x.id === ev.sentenceId);
          if (!sim.state.gateOpen) void banner(scene, t('built'), s?.text ?? '', 1.6);
          burst(hero.x, 1, hero.z, 0xffd84a, 18);
          break;
        }
        case 'goblinCaught': {
          const g = goblins.get(ev.goblinId)?.actor;
          const at = overGoblin(ev.goblinId);
          popup(scene, at.x, at.y, `+${ev.coins} ${t('caught')}`, 'good');
          if (g) burst(g.x, 1, g.z, 0xffd84a, 14);
          audio.play('correct');
          break;
        }
        case 'gateOpened':
          audio.play('clank');
          scene.tweens.add({ targets: glow, alpha: 1, duration: 1000 });
          scene.tweens.add({ targets: glow, scale: { from: 0.94, to: 1.06 }, duration: 600, yoyo: true, repeat: -1 });
          burst(gateAt.x, 0.9, gateAt.z, 0x9dffb0, 18);
          void banner(scene, t('gate'), '', 2.0);
          break;
        case 'shiftComplete':
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
    const loop = createFixedStepLoop<LabyrinthState, LabyrinthCommand, LabyrinthEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    const glide = (actor: Actor2D, p: { x: number; z: number }): void => {
      if (Math.hypot(p.x - actor.x, p.z - actor.z) > SNAP_M) actor.placeAt(p.x, p.z);
      actor.moveTo(p.x, p.z);
    };
    let last = 0;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      if (!finished) joystick.update();
      const owed = heldTurn(held, s.hero);
      if (owed && !finished) loop.dispatch(owed);
      reconcile(time);
      glide(hero, world(s.hero));
      hero.update(dt);
      for (const g of s.goblins) {
        const view = goblins.get(g.id);
        if (!view) continue;
        glide(view.actor, world(g));
        if (view.fleeing !== g.fleeing) {
          view.fleeing = g.fleeing;
          view.actor.tint(g.fleeing ? 0x8fa8ff : 0xffffff);
        }
        view.actor.update(dt);
      }
      const p = arena.px(hero.x, 0, hero.z);
      aura.setPosition(p.x, p.y).setDepth(depthOf(hero.z, -0.5));
      marker.setPosition(p.x, p.y).setDepth(depthOf(hero.z, -0.4));
      const want = s.auraMs > 0 ? 0.55 + 0.25 * Math.sin(time / 120) : 0;
      aura.setAlpha(aura.alpha + (want - aura.alpha) * Math.min(1, dt * 8));
      arena.follow(hero.x, hero.z, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: LabyrinthCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let k = 0; k < steps; k++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextTurn(sim.state);
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
    arena.follow(start.x, start.z, 0, true);
    audio.music('labyrinth');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#0b0d14',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'labyrinth', preload, create, update },
  };
}
