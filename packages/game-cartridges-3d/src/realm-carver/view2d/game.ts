/**
 * Realm Carver in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts), with the
 * forge sprites of the `primary-chibi-2d` pack over a drawn board. The hero carves paths through
 * the wild to the glowing words (tags that stay on screen), monsters bounce over unclaimed land,
 * and a closed loop turns the wild into bright claimed land.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, COLORS, depthOf, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createRealmCarver, evidenceOf, scoreOf, START, type RealmCarverCommand, type RealmCarverEvent, type RealmCarverState } from '../core/index.js';
import { FILES_2D, HERO_CLIPS_2D, HEROES_2D, MONSTER_CLIPS_2D } from '../manifest.js';
import { nextSteer } from '../qc/bot.js';
import strings from '../strings.en.js';
import { worldOf } from '../view/geometry.js';
import { BoardLayer, GROUND_FILE, makeGround, PROJECTION } from './ground.js';

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as StoryInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('realmCarver')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createRealmCarver(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the board
    scene.cameras.main.setBackgroundColor('#5d9a46');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    // The whole board fits across the screen.
    const fit = Math.min(1.1, (W - 12) / (PROJECTION.width - 2 * 64));
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: fit, top: 66 });
    const board = new BoardLayer(scene, arena.world);
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, arena.world);
    const start = worldOf(START);
    hero.placeAt(start.x, start.z);
    hero.face(0, -1);
    arena.follow(0, 0, 0, true);

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

    audio.defineMood('realm', { bpm: 108, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]], busy: false, drum: true });
    audio.defineSfx('claim', (s) => [392, 523, 659].forEach((f, i) => s.tone(f, 0.18, 'triangle', 0.1, i * 0.05)));
    audio.defineSfx('fizzle', (s) => s.tone(300, 0.25, 'sawtooth', 0.07, 0, 0.5));

    function burst(x: number, y: number, z: number, color: number, n: number): void {
      const at = arena.at(x, y, z);
      for (let k = 0; k < n; k++) {
        const a = (k / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 22 + Math.random() * 30;
        const dot = scene.add.circle(at.x, at.y, 3 + Math.random() * 3, color).setDepth(17_000);
        scene.tweens.add({ targets: dot, x: at.x + Math.cos(a) * d, y: at.y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 550 + Math.random() * 200, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    // ---------------------------------------------------------------- beacons and monsters
    interface BeaconView {
      glow: Phaser.GameObjects.Graphics;
      tag: Phaser.GameObjects.Container;
      x: number;
      z: number;
    }
    const beacons = new Map<string, BeaconView>();
    const monsters = new Map<string, Actor2D>();
    const carved = new Set<string>();

    function addBeacon(b: { id: string; word: string; col: number; row: number }): void {
      const at = worldOf(b);
      const glow = scene.add.graphics();
      glow.fillStyle(0x4fc3ff, 0.35).fillEllipse(0, 0, 54, 34);
      glow.fillStyle(0x9fe8ff, 1).fillTriangle(0, -22, 13, -8, 0, 6).fillTriangle(0, -22, 0, 6, -13, -8);
      glow.lineStyle(2, 0xffffff, 0.9);
      for (const [x1, y1, x2, y2] of [[0, -22, 13, -8], [13, -8, 0, 6], [0, 6, -13, -8], [-13, -8, 0, -22]] as const) glow.lineBetween(x1, y1, x2, y2);
      const p = arena.px(at.x, 0, at.z);
      glow.setPosition(p.x, p.y).setDepth(depthOf(at.z, 2));
      arena.world.add(glow);
      beacons.set(b.id, { glow, tag: tag(scene, b.word, 18).setDepth(15_000), x: at.x, z: at.z });
    }
    function removeBeacon(id: string, view: BeaconView): void {
      if (carved.delete(id)) burst(view.x, 0.6, view.z, 0x9fe8ff, 14);
      view.glow.destroy();
      view.tag.destroy();
      beacons.delete(id);
    }
    function addMonster(m: { id: string; kind: string; col: number; row: number }): void {
      const model = edition.bindings[`${m.kind}.idle`] ? m.kind : 'slime';
      const actor = new Actor2D(scene, edition, model, PROJECTION, { dirs: 4, clips: clips(model, MONSTER_CLIPS_2D[model] ?? ['idle', 'walk']), stiffness: 10 }, arena.world);
      const at = worldOf(m);
      actor.placeAt(at.x, at.z);
      actor.face(0, 1);
      monsters.set(m.id, actor);
    }
    function clearAll(): void {
      for (const [id, view] of [...beacons]) removeBeacon(id, view);
      for (const m of monsters.values()) m.destroy();
      monsters.clear();
    }

    function reconcile(): void {
      const s = sim.state;
      for (const b of s.beacons) if (!beacons.has(b.id)) addBeacon(b);
      for (const [id, view] of [...beacons]) if (!s.beacons.some((b) => b.id === id)) removeBeacon(id, view);
      for (const m of s.monsters) if (!monsters.has(m.id)) addMonster(m);
      for (const b of s.beacons) {
        const view = beacons.get(b.id);
        if (!view) continue;
        const at = worldOf(b);
        view.x = at.x;
        view.z = at.z;
        const p = arena.px(at.x, 0, at.z);
        view.glow.setPosition(p.x, p.y).setDepth(depthOf(at.z, 2));
        const next = s.helper && b.index === s.next;
        recolorTag(view.tag, next ? COLORS.purple : COLORS.tagFill, next ? COLORS.gold : 0xffffff);
        arena.pin(view.tag, at.x, 1.1, at.z);
      }
    }

    function drawHud(): void {
      const s = sim.state;
      const sentence = s.shift[Math.min(s.realm, s.realms - 1)];
      if (sentence) panel.sentence(sentence.words, s.phase === 'complete' ? sentence.words.length : s.next, s.helper);
      arena.top = panel.bottom;
      status.set(t('realm', { realm: Math.min(s.realm + 1, s.realms), realms: s.realms }), `${t('courage')} ${'●'.repeat(s.courage)}${'○'.repeat(s.maxCourage - s.courage)}`);
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const overHero = () => arena.at(hero.x, 1.8, hero.z);
    const overBeacon = (id: string) => {
      const v = beacons.get(id);
      return v ? arena.at(v.x, 1.4, v.z) : overHero();
    };

    function handle(ev: RealmCarverEvent): void {
      switch (ev.type) {
        case 'realmStarted': {
          clearAll();
          for (const m of ev.monsters) addMonster(m);
          const c = worldOf(sim.state.carver);
          hero.placeAt(c.x, c.z);
          hero.face(0, -1);
          break;
        }
        case 'landClaimed':
          audio.play('claim');
          burst(hero.x, 0.6, hero.z, 0x9be07f, 12);
          break;
        case 'wordCarved': {
          carved.add(ev.id);
          const at = overBeacon(ev.id);
          popup(scene, at.x, at.y, t('carved'), 'good');
          audio.play('correct');
          void hero.play('victory');
          break;
        }
        case 'wordMissed': {
          const at = overBeacon(ev.id);
          popup(scene, at.x, at.y, t('notThat'), 'miss');
          audio.play('fizzle');
          break;
        }
        case 'setback': {
          void hero.play('hit');
          scene.cameras.main.shake(300, 0.006);
          const m = monsters.get(ev.monsterId);
          if (m) void m.play(m.has('attack') ? 'attack' : 'taunt');
          const at = overHero();
          popup(scene, at.x, at.y, t('oops'), 'miss');
          audio.play('hit');
          break;
        }
        case 'rested':
          void banner(scene, t('rested'), '', 1.5);
          break;
        case 'regrown':
          void banner(scene, t('regrown'), '', 1.3);
          break;
        case 'realmCleared': {
          audio.play('victory');
          const sentence = sim.state.shift.find((x) => x.realmId === ev.realmId);
          void banner(scene, t('cleared'), sentence?.text ?? '', 1.6);
          burst(hero.x, 1, hero.z, 0xffd84a, 18);
          break;
        }
        case 'campaignComplete':
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
    const loop = createFixedStepLoop<RealmCarverState, RealmCarverCommand, RealmCarverEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      manual.run(time);
      if (!finished) joystick.update();
      reconcile();
      board.draw(s.grid);
      const h = worldOf(s.carver);
      // A long jump of the core (a setback, a rest) snaps the hero.
      if (Math.hypot(h.x - hero.x, h.z - hero.z) > 1.6) hero.placeAt(h.x, h.z);
      hero.moveTo(h.x, h.z);
      hero.update(dt);
      for (const m of s.monsters) {
        const view = monsters.get(m.id);
        if (!view) continue;
        const p = worldOf(m);
        view.moveTo(p.x, p.z);
        view.update(dt);
      }
      arena.follow(0, 0, dt);
      arena.sort();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: RealmCarverCommand) => loop.dispatch(command),
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
      board.destroy();
      if (qc.__apk3dView2d === hook) delete qc.__apk3dView2d;
      unlock?.();
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    drawHud();
    audio.music('realm');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#5d9a46',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'realm-carver', preload, create, update },
  };
}
