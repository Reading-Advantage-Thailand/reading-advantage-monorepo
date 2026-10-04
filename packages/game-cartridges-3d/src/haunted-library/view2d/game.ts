/**
 * Haunted Library in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts),
 * with the forge sprites of the `primary-chibi-2d` pack over a library drawn at start: four
 * floors seen from the 2D camera, the nearest floor at the bottom. The hero opens the doors in
 * sentence order (their words on tags that stay on screen), bounces up on the green pads, drops
 * down on command, and keeps away from ghosts and bats.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor2D, Arena2D, banner, button, COLORS, depthOf, fitGameSize, Joystick2D, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { TUNING, createHauntedLibrary, evidenceOf, scoreOf, type HazardSpawn, type LibraryCommand, type LibraryEvent, type LibraryState } from '../core/index.js';
import { FILES_2D, HAZARD_CLIPS_2D, HERO_CLIPS_2D, HEROES_2D } from '../manifest.js';
import { nextCommand } from '../qc/bot.js';
import strings from '../strings.en.js';
import { DOOR_HALF_WIDTH, DOOR_HEIGHT, GROUND_FILE, laneZ, makeGround, PROJECTION, wallZ } from './ground.js';

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('hauntedLibrary')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createHauntedLibrary(story, { seed, helper: options.helper });
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

    // ---------------------------------------------------------------- the library
    scene.cameras.main.setBackgroundColor('#171226');
    const panel = new WordPanel2D(scene, 66);
    makeGround(scene, edition);
    const arena = new Arena2D(scene, edition, PROJECTION, GROUND_FILE, { scale: H > W ? 1.15 : 1, top: 66, bottom: 70 });
    const hero = new Actor2D(scene, edition, heroId, PROJECTION, { dirs: 8, clips: clips(heroId, HERO_CLIPS_2D), walk: 'run', stiffness: 18 }, arena.world);
    hero.placeAt(sim.state.hero.x, laneZ(0));
    hero.face(0, 1);
    arena.follow(sim.state.hero.x, laneZ(0), 0, true);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    let downHeld = false;
    const joystick = new Joystick2D(scene, {
      hint: t('move'),
      top: 66,
      keys: () => ctx.inputController.snapshot().keys,
      change: (x, z) => {
        loop.dispatch({ type: 'move', dir: Math.abs(x) > 0.25 && Math.abs(x) >= Math.abs(z) * 0.6 ? Math.sign(x) : 0 });
        const down = z > 0.7 && Math.abs(z) > Math.abs(x);
        if (down && !downHeld) loop.dispatch({ type: 'drop' });
        downHeld = down;
      },
    });
    const openBtn = button(scene, W - 80, H - 54, t('open'), () => loop.dispatch({ type: 'open' })).setDepth(19_500);
    const downBtn = button(scene, W - 80, H - 118, `${t('down')} ⬇`, () => loop.dispatch({ type: 'drop' }), COLORS.purple, '#ffffff').setDepth(19_500);
    scene.input.keyboard?.on('keydown-SPACE', () => loop.dispatch({ type: 'open' }));
    scene.input.keyboard?.on('keydown-ENTER', () => loop.dispatch({ type: 'open' }));

    audio.defineMood('library', { bpm: 84, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], busy: false, drum: false });
    audio.defineSfx('creak', (s) => {
      s.noise(0.35, 0.12, 900);
      s.tone(140, 0.4, 'sawtooth', 0.05, 0, 1.6);
    });
    audio.defineSfx('boing', (s) => s.tone(300, 0.35, 'sine', 0.16, 0, 3));
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

    // ---------------------------------------------------------------- doors and haunts
    interface DoorView {
      gfx: Phaser.GameObjects.Graphics;
      tag: Phaser.GameObjects.Container;
      x: number;
      floor: number;
    }
    const doors = new Map<string, DoorView>();
    const haunts = new Map<string, { actor: Actor2D; kind: 'ghost' | 'bat' }>();

    /** A door drawn on its wall: wood and a knob, or open with warm light behind it. */
    function drawDoor(d: DoorView, open: boolean): void {
      const z = wallZ(d.floor);
      const P = (dx: number, y: number) => arena.px(d.x + dx, y, z + 0.02);
      const rect = (x0: number, y0: number, x1: number, y1: number, color: number, alpha = 1): void => {
        const a = P(x0, y0);
        const b = P(x1, y0);
        const c = P(x1, y1);
        const e = P(x0, y1);
        d.gfx.fillStyle(color, alpha).fillTriangle(a.x, a.y, b.x, b.y, c.x, c.y).fillTriangle(a.x, a.y, c.x, c.y, e.x, e.y);
      };
      d.gfx.clear();
      const w = DOOR_HALF_WIDTH;
      rect(-w - 0.06, 0, w + 0.06, DOOR_HEIGHT + 0.06, 0x3a2416);
      if (open) {
        rect(-w, 0, w, DOOR_HEIGHT, 0xffd98a);
        rect(-w, 0, -w + 0.22, DOOR_HEIGHT, 0x6b4328);
      } else {
        rect(-w, 0, w, DOOR_HEIGHT, 0x8b5a33);
        rect(-w + 0.12, 0.12, -0.06, DOOR_HEIGHT - 0.12, 0x9c6a3e);
        rect(0.06, 0.12, w - 0.12, DOOR_HEIGHT - 0.12, 0x9c6a3e);
        rect(w - 0.28, 0.7, w - 0.16, 0.82, 0xffd84a);
      }
    }

    function clearRoom(): void {
      for (const d of doors.values()) {
        d.gfx.destroy();
        d.tag.destroy();
      }
      doors.clear();
      for (const id of [...haunts.keys()]) removeHaunt(id);
    }

    function addHaunt(z: HazardSpawn): void {
      const model = z.kind === 'ghost' ? 'skeleton' : 'giant-bat';
      if (!edition.bindings[`${model}.idle`]) return;
      const actor = new Actor2D(scene, edition, model, PROJECTION, { dirs: 4, clips: clips(model, HAZARD_CLIPS_2D[model] ?? ['idle']), walk: z.kind === 'bat' ? 'fly' : 'walk', stiffness: 10 }, arena.world);
      actor.placeAt(z.x, laneZ(z.floor) + 0.35);
      actor.lift = z.kind === 'bat' ? 1.1 : 0;
      actor.face(1, 1);
      if (z.kind === 'ghost') {
        actor.tint(0xbfe3ff);
        actor.sprite.setAlpha(0.62);
      }
      haunts.set(z.id, { actor, kind: z.kind });
    }

    function removeHaunt(id: string): void {
      haunts.get(id)?.actor.destroy();
      haunts.delete(id);
    }

    function startRoom(ev: Extract<LibraryEvent, { type: 'roomStarted' }>): void {
      clearRoom();
      for (const d of ev.doors) {
        const gfx = scene.add.graphics().setDepth(depthOf(wallZ(d.floor), 0.2));
        arena.world.add(gfx);
        const view: DoorView = { gfx, tag: tag(scene, d.word, 18).setDepth(15_000), x: d.x, floor: d.floor };
        drawDoor(view, false);
        doors.set(d.id, view);
      }
      for (const z of ev.hazards) addHaunt(z);
    }

    function drawHud(): void {
      const s = sim.state;
      const sentence = s.shift[s.room];
      if (sentence) panel.sentence(sentence.words, s.next, s.helper);
      arena.top = panel.bottom;
      for (const d of s.doors) {
        const view = doors.get(d.id);
        if (!view) continue;
        const next = s.helper && d.index === s.next && !d.open;
        recolorTag(view.tag, d.open ? COLORS.green : next ? COLORS.purple : COLORS.tagFill, next ? COLORS.gold : 0xffffff);
      }
      status.set(t('room', { room: Math.min(s.room + 1, s.rooms), rooms: s.rooms }), '❤'.repeat(s.courage) + '♡'.repeat(Math.max(0, s.maxCourage - s.courage)));
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const overHero = () => arena.at(hero.x, 1.6 + hero.lift, hero.z);
    const overDoor = (id: string) => {
      const d = doors.get(id);
      return d ? arena.at(d.x, DOOR_HEIGHT + 0.3, wallZ(d.floor)) : overHero();
    };

    const queue: LibraryEvent[] = [];
    let draining = false;
    async function drain(): Promise<void> {
      if (draining) return;
      draining = true;
      while (queue.length > 0) await handle(queue.shift()!);
      draining = false;
    }

    async function handle(ev: LibraryEvent): Promise<void> {
      switch (ev.type) {
        case 'roomStarted':
          startRoom(ev);
          break;
        case 'doorOpened': {
          const d = doors.get(ev.id);
          if (d) {
            drawDoor(d, true);
            burst(d.x, 1, wallZ(d.floor) + 0.2, 0xffd98a, 14);
          }
          audio.play('creak');
          audio.play('correct');
          const at = overDoor(ev.id);
          popup(scene, at.x, at.y, t('opened'), 'good');
          for (const id of ev.stunned) {
            const h = haunts.get(id);
            if (h) {
              void h.actor.play('hit');
              h.actor.flash(0xffffff, 300);
            }
          }
          break;
        }
        case 'doorWrong': {
          const at = overDoor(ev.id);
          popup(scene, at.x, at.y, t('wrong'), 'miss');
          audio.play('wrong');
          if (ev.removed) removeHaunt(ev.removed);
          if (ev.bat) addHaunt(ev.bat);
          audio.play('wail');
          break;
        }
        case 'bounced':
          audio.play('boing');
          burst(hero.x, 0.2, hero.z, 0x9dffc4, 10);
          break;
        case 'heroHit': {
          void hero.play('hit');
          scene.cameras.main.shake(300, 0.006);
          const at = overHero();
          popup(scene, at.x, at.y, t('hit'), 'miss', 17_800);
          audio.play('hit');
          break;
        }
        case 'courageChanged': {
          const at = overHero();
          popup(scene, at.x, at.y - 24, t('courageLost'), '', 17_800);
          break;
        }
        case 'teamRested': {
          await banner(scene, t('rested'), '', 1.1);
          scene.cameras.main.fadeOut(250, 0, 0, 0);
          await new Promise<void>((r) => scene.cameras.main.once('camerafadeoutcomplete', () => r()));
          hero.placeAt(sim.state.hero.x, laneZ(sim.state.hero.floor));
          arena.follow(hero.x, hero.z, 0, true);
          for (const [id, h] of [...haunts]) if (h.kind === 'bat') removeHaunt(id);
          scene.cameras.main.fadeIn(250, 0, 0, 0);
          await new Promise<void>((r) => scene.cameras.main.once('camerafadeincomplete', () => r()));
          loop.reset();
          break;
        }
        case 'roomCleared':
          audio.play('victory');
          void banner(scene, t('cleared'), '', 1.2);
          break;
        case 'visitComplete':
          await finish();
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
    const loop = createFixedStepLoop<LibraryState, LibraryCommand, LibraryEvent>(sim, { render: (events) => (queue.push(...events), void drain()) }, manual.clock);
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const s = sim.state;
      manual.run(time);
      if (!finished) joystick.update();
      // The hero's lane: a floor, or a point between two lanes on a bounce or a drop (with a hop).
      const h = s.hero;
      let z = laneZ(h.floor);
      let lift = 0;
      if (h.travelMs > 0) {
        const rising = h.toFloor > h.floor;
        const p = 1 - h.travelMs / (rising ? TUNING.riseMs : TUNING.dropMs);
        z = laneZ(h.floor) + (laneZ(h.toFloor) - laneZ(h.floor)) * p;
        lift = rising ? Math.sin(Math.PI * p) * 1.1 : 0;
      }
      hero.lift = lift;
      hero.moveTo(h.x, z);
      hero.update(dt);
      for (const k of s.hazards) {
        const view = haunts.get(k.id);
        if (!view) continue;
        view.actor.moveTo(k.x, laneZ(k.floor) + 0.35);
        view.actor.update(dt);
      }
      for (const d of s.doors) {
        const view = doors.get(d.id);
        if (view) arena.pin(view.tag, view.x, DOOR_HEIGHT + 0.25, wallZ(view.floor));
      }
      arena.follow(h.x, z, dt);
      arena.sort();
      const near = s.doors.some((d) => !d.open && d.floor === h.floor && h.travelMs === 0 && Math.abs(d.x - h.x) <= TUNING.openRange);
      openBtn.setScale(near ? 1.08 : 1).setAlpha(near ? 1 : 0.75);
      downBtn.setAlpha(h.floor > 0 ? 1 : 0.5);
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: LibraryCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let k = 0; k < steps; k++) sim.tick().forEach((ev) => void handle(ev));
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
    audio.music('library');
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
    scene: { key: 'haunted-library', preload, create, update },
  };
}
