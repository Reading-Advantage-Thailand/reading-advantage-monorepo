/**
 * Sorcerer's Ziggurat in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprite of the chosen hero on a ziggurat drawn live: stone columns with a top
 * face, one per cube, and a summit with a crystal. Each word sits on a tag that stays on screen
 * and takes a tap. The core is turn-based, so there is no loop: events play in order.
 */
import type * as Phaser from 'phaser';
import { shownHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import { playerFigure } from '@reading-advantage/advantage-play-kit-3d/avatar/portrait-of';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { Actor2D, Arena2D, banner, COLORS, depthOf, fitGameSize, popup, registerSheetAnimations, StatusBar2D, tag, text, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import {
  createSorcererZiggurat,
  evidenceOf,
  openingEvents,
  scoreOf,
  type CubeSpawn,
  type Lane,
  type ZigguratCommand,
  type ZigguratEvent,
} from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextStep } from '../qc/bot.js';
import strings from '../strings.en.js';
import { CUBE_WIDTH, GROUND_FILE, makeGround, PROJECTION, tierPoint } from './ground.js';

type CubeState = 'idle' | 'spent' | 'stood' | 'dim';

interface CubeView {
  gfx: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Container | null;
  lane: Lane;
  tier: number;
  appear: number;
  state: CubeState;
}

const TOP: Record<CubeState, number> = { idle: 0x8a6fb0, spent: 0x4a4a58, stood: 0xa98cd6, dim: 0x4c4268 };
const FRONT: Record<CubeState, number> = { idle: 0x5d4a80, spent: 0x34303f, stood: 0x6d5a94, dim: 0x352d4d };
const KEY_LANES: ReadonlyArray<readonly [Lane, readonly string[]]> = [
  ['left', ['ArrowLeft', 'KeyA']],
  ['forward', ['ArrowUp', 'KeyW']],
  ['right', ['ArrowRight', 'KeyD']],
];

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('sorcererZiggurat')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = shownHero(HEROES_2D, options, 'wizard');
  /** The student's own figure for the hero when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createSorcererZiggurat(story, { seed, helper: options.helper });
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
    const ppm = PROJECTION.ppm;

    // ---------------------------------------------------------------- the plain and the hero
    scene.cameras.main.setBackgroundColor('#0d0b24');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: Math.max(0.5, Math.min(H > W ? 1.3 : 1.1, W / 600)), top: 66 });
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, figure, clips: clips(heroId, HERO_CLIPS_2D), stiffness: 18 }, arena.world);
    const foot = tierPoint(0, 'forward');
    hero.placeAt(foot.x, foot.z + 0.4);
    hero.face(0, -1);
    const follow = (dt: number, snap = false) => arena.follow(hero.x, hero.z - hero.lift, dt, snap);
    follow(0, true);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const promptText = text(scene, W / 2, 0, '', 16, '#ffffff').setOrigin(0.5, 0).setScrollFactor(0).setDepth(19_000).setStroke('#2b1d3a', 4);

    audio.defineMood('ziggurat', { bpm: 88, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], busy: false, drum: false });
    audio.defineSfx('hop', (s) => s.tone(420, 0.2, 'triangle', 0.12, 0, 1.6));
    audio.defineSfx('crumble', (s) => s.tone(160, 0.35, 'sawtooth', 0.06, 0, 0.5));
    audio.defineSfx('chime', (s) => [880, 1175, 1568].forEach((f, i) => s.tone(f, 0.25, 'sine', 0.1, i * 0.07)));

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + k * 0.37;
        const d = 22 + (k % 4) * 9;
        const dot = scene.add.circle(at.x, at.y, 3 + (k % 3), color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 600, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }
    const tween = (ms: number, step: (u: number) => void): Promise<void> =>
      new Promise((resolve) => {
        scene.tweens.addCounter({ from: 0, to: 1, duration: ms, onUpdate: (c) => step(c.getValue() ?? 0), onComplete: () => (step(1), resolve()) });
      });

    // ---------------------------------------------------------------- cubes and the summit
    const cubes = new Map<string, CubeView>();
    const summit = scene.add.graphics();
    arena.world.add(summit);
    let summitTiers = 0;
    let crystalGlow = 0.35;
    const shown = { ritual: 0, found: 0, courage: sim.state.courage };

    function clearCubes(): void {
      for (const c of cubes.values()) {
        c.gfx.destroy();
        c.tag?.destroy();
      }
      cubes.clear();
    }

    /** One column with a top face, drawn in background pixels inside the world container. */
    function drawCube(v: CubeView): void {
      const g = v.gfx;
      g.clear();
      if (v.appear <= 0.02) return;
      const top = tierPoint(v.tier, v.lane);
      const c = arena.px(top.x, top.y, top.z);
      const w = CUBE_WIDTH * ppm;
      const h = CUBE_WIDTH * Math.SQRT1_2 * ppm;
      const drop = (v.state === 'spent' ? 14 : 0) + (1 - v.appear) * 40;
      const column = top.y * Math.SQRT1_2 * ppm;
      g.setAlpha(v.appear);
      g.fillStyle(FRONT[v.state], 1).fillRect(c.x - w / 2, c.y + h / 2 + drop, w, column);
      g.fillStyle(TOP[v.state], 1).fillRect(c.x - w / 2, c.y - h / 2 + drop, w, h);
      g.lineStyle(2, 0xd2bad4, 0.8).strokeRect(c.x - w / 2, c.y - h / 2 + drop, w, h);
      if (v.state === 'idle' || v.state === 'stood') g.lineStyle(2, 0xb69cff, 0.9).strokeEllipse(c.x, c.y + drop, w * 0.5, h * 0.5);
      g.setDepth(depthOf(top.z) - 500);
    }

    function drawSummit(): void {
      summit.clear();
      if (summitTiers <= 0) return;
      const top = tierPoint(summitTiers + 1, 'forward');
      const c = arena.px(top.x, top.y, top.z);
      const w = 2.2 * ppm;
      const h = 2.2 * Math.SQRT1_2 * ppm;
      summit.fillStyle(0x5d4a80, 1).fillRect(c.x - w / 2, c.y + h / 2, w, top.y * Math.SQRT1_2 * ppm);
      summit.fillStyle(0x8a6fb0, 1).fillRect(c.x - w / 2, c.y - h / 2, w, h);
      summit.lineStyle(2, 0xd6a75d, 0.9).strokeRect(c.x - w / 2, c.y - h / 2, w, h);
      summit.fillStyle(0x4b4562, 1).fillRect(c.x - 16, c.y - 14, 32, 22);
      const r = 22;
      const cy = c.y - 40;
      summit.fillStyle(0xffe08a, 0.12 + crystalGlow * 0.18).fillCircle(c.x, cy, r * 2.2);
      summit.fillStyle(0x9b7bff, 0.95).fillTriangle(c.x, cy - r * 1.3, c.x - r * 0.8, cy, c.x + r * 0.8, cy);
      summit.fillStyle(0xffffff, 0.35).fillTriangle(c.x, cy - r * 1.3, c.x - r * 0.8, cy, c.x, cy);
      summit.fillStyle(0x9b7bff, 0.7).fillTriangle(c.x, cy + r * 1.1, c.x - r * 0.8, cy, c.x + r * 0.8, cy);
      summit.setDepth(depthOf(top.z) - 500);
    }

    function addCube(spawn: CubeSpawn, tier: number): void {
      const gfx = scene.add.graphics();
      arena.world.add(gfx);
      const label = tag(scene, spawn.word, 21, 0x2a1b5c, spawn.correct && sim.state.helper ? COLORS.gold : 0xc9b8ff).setDepth(15_100);
      label.setInteractive({ useHandCursor: true });
      label.on('pointerdown', () => send({ type: 'step', cubeId: spawn.id }));
      const view: CubeView = { gfx, tag: label, lane: spawn.lane, tier, appear: 0, state: 'idle' };
      cubes.set(spawn.id, view);
    }

    function drawHud(): void {
      const s = sim.state;
      const ritual = s.climb[shown.ritual];
      if (ritual) panel.sentence(ritual.words, shown.found, s.helper);
      arena.top = panel.bottom;
      promptText.setY(panel.bottom + 6);
      status.set(t('ritual', { ritual: Math.min(shown.ritual + 1, s.rituals), rituals: s.rituals }), '❤'.repeat(shown.courage) + '♡'.repeat(Math.max(0, s.maxCourage - shown.courage)));
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const overHero = () => arena.at(hero.x, hero.lift + 1.9, hero.z);

    async function hop(to: { x: number; y: number; z: number }): Promise<void> {
      const from = { x: hero.x, y: hero.lift, z: hero.z };
      hero.face(0, -1);
      hero.loop(hero.has('run') ? 'run' : 'idle');
      audio.play('hop');
      await tween(500, (u) => {
        hero.lift = from.y + (to.y - from.y) * u + Math.sin(Math.PI * u) * 0.7;
        hero.placeAt(from.x + (to.x - from.x) * u, from.z + (to.z - from.z) * u);
      });
      hero.lift = to.y;
      hero.placeAt(to.x, to.z);
      hero.loop('idle');
    }

    async function handle(ev: ZigguratEvent): Promise<void> {
      switch (ev.type) {
        case 'ritualStarted': {
          clearCubes();
          shown.ritual = sim.state.climb.findIndex((r) => r.ritualId === ev.ritualId);
          shown.found = 0;
          summitTiers = ev.words.length;
          crystalGlow = 0.35;
          hero.lift = 0;
          hero.placeAt(foot.x, foot.z + 0.4);
          promptText.setText(ev.translation ?? '');
          break;
        }
        case 'tierOffered':
          ev.cubes.forEach((c) => addCube(c, ev.tier + 1));
          break;
        case 'stepped': {
          const chosen = cubes.get(ev.cubeId);
          for (const [id, c] of cubes) {
            c.tag?.destroy();
            c.tag = null;
            c.state = id === ev.cubeId ? 'stood' : 'dim';
          }
          const at = overHero();
          popup(scene, at.x, at.y, t('stepped'), 'good');
          audio.play('correct');
          if (chosen) await hop(tierPoint(chosen.tier, chosen.lane));
          shown.found = ev.tier;
          break;
        }
        case 'cubeCrumbled': {
          const c = cubes.get(ev.id);
          if (c) {
            c.state = 'spent';
            c.tag?.setAlpha(0.4).disableInteractive();
            const top = tierPoint(c.tier, c.lane);
            const at = arena.at(top.x, top.y + 1.2, top.z);
            popup(scene, at.x, at.y, t('crumbled'), 'miss');
            burst(top.x, top.y, top.z, 0x9a8fb8, 10);
          }
          scene.cameras.main.shake(180, 0.003);
          audio.play('crumble');
          audio.play('wrong');
          break;
        }
        case 'courageChanged':
          shown.courage = ev.courage;
          if (ev.courage > 0) {
            const at = overHero();
            popup(scene, at.x, at.y - 24, t('courageLost'), '', 17_800);
          }
          break;
        case 'teamRested': {
          shown.courage = ev.courage;
          for (const id of ev.restored) {
            const c = cubes.get(id);
            if (!c) continue;
            c.state = 'idle';
            c.tag?.setAlpha(1).setInteractive({ useHandCursor: true });
          }
          void hero.play('hit');
          await banner(scene, t('rested'), '', 1.1);
          break;
        }
        case 'ritualCleared': {
          for (const c of cubes.values()) {
            c.tag?.destroy();
            c.tag = null;
          }
          const words = sim.state.climb.find((r) => r.ritualId === ev.ritualId)?.words.length ?? 1;
          const top = tierPoint(words + 1, 'forward');
          await hop({ x: top.x, y: top.y, z: top.z + 0.7 });
          crystalGlow = 1.8;
          burst(top.x, top.y + 1.6, top.z, 0xffe08a, 20);
          void hero.play('victory');
          audio.play('chime');
          audio.play('victory');
          if (sim.state.phase !== 'complete') await banner(scene, t('cleared'), '', 1.2);
          break;
        }
        case 'climbComplete':
          await finish();
          break;
      }
      drawHud();
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      audio.music('calm');
      void hero.play('victory', 1, true);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    let queue: Promise<void> = Promise.resolve();
    function play(events: readonly ZigguratEvent[]): void {
      for (const ev of events) queue = queue.then(() => handle(ev)).catch(() => undefined);
    }
    function send(command: ZigguratCommand): void {
      if (finished) return;
      play(sim.dispatch(command));
    }

    // ---------------------------------------------------------------- Phaser's frames
    let last = 0;
    let held = new Set<string>();
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      // Keyboard: left, forward, right (one command per key press).
      const keys = new Set(ctx.inputController.snapshot().keys);
      if (!finished) {
        for (const [lane, codes] of KEY_LANES) if (codes.some((c) => keys.has(c) && !held.has(c))) send({ type: 'step', lane });
      }
      held = keys;
      hero.update(dt);
      for (const v of cubes.values()) {
        v.appear = Math.min(1, v.appear + dt * 3);
        drawCube(v);
        if (v.tag) {
          const top = tierPoint(v.tier, v.lane);
          v.tag.setVisible(v.appear >= 1);
          arena.pin(v.tag, top.x, top.y, top.z, 46 * arena.scale);
        }
      }
      drawSummit();
      follow(dt);
      arena.sort();
    };

    const hook = {
      state: () => sim.state,
      dispatch: (command: ZigguratCommand) => send(command),
      tick: () => undefined,
      auto: () => {
        const command = nextStep(sim.state);
        if (command) send(command);
        return !!command;
      },
      size: () => ({ width: W, height: H }),
    };
    const qc = window as unknown as { __apk3dView2d?: typeof hook };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      finished = true;
      frame = null;
      if (qc.__apk3dView2d === hook) delete qc.__apk3dView2d;
      unlock?.();
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    drawHud();
    audio.music('ziggurat');
    play(openingEvents(sim.state));
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#0d0b24',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'sorcerer-ziggurat', preload, create, update },
  };
}
