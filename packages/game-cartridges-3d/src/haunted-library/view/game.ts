/**
 * Haunted Library 3D as a cartridge game. The core (../core) moves the hero, the ghosts, and the
 * bats in fixed steps; this view builds the four-floor library, walks the hero and the haunts to
 * the core's positions, keeps every word readable (tags pinned to the screen edge when off
 * screen), and animates the events. It never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import {
  FLOOR_HEIGHT,
  TUNING,
  createHauntedLibrary,
  evidenceOf,
  scoreOf,
  type HazardSpawn,
  type LibraryCommand,
  type LibraryEvent,
  type LibraryState,
} from '../core/index.js';
import { nextCommand } from '../qc/bot.js';
import { buildDoor, buildLibrary, DEPTH, DOOR_TOP, floorY, LIBRARY_MODELS, type DoorView } from './library.js';
import haunted_libraryCss from './haunted-library.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('haunted-library', haunted_libraryCss);

/** A ghost is a see-through, bluish skeleton. */
function ghostify(actor: Actor): void {
  for (const m of actor.materials) {
    m.transparent = true;
    m.opacity = 0.62;
    m.depthWrite = false;
    m.color.multiply(new THREE.Color(0.75, 0.9, 1.25));
    m.emissive.setRGB(0.05, 0.12, 0.22);
    m.emissiveIntensity = 0.6;
  }
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...LIBRARY_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const library = buildLibrary(stage);
  const sim = createHauntedLibrary(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const hero = new Walker(stage.addActor(new Actor(heroId, heroGltf, stage.timeline)), 'run');
  hero.actor.placeAt(sim.state.hero.x, 0, DEPTH.hero, 0);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.actor.setMap(tex)).catch(() => undefined);
  /** The smoothed height of the hero (the core gives the floor and the progress of a bounce). */
  let heroY = 0;

  /** The height the core says the hero is at: a floor, or a point on a bounce or a drop. */
  const heroTargetY = (s: LibraryState): number => {
    const h = s.hero;
    if (h.travelMs <= 0) return floorY(h.floor);
    const rising = h.toFloor > h.floor;
    const p = 1 - h.travelMs / (rising ? TUNING.riseMs : TUNING.dropMs);
    const e = p * p * (3 - 2 * p);
    return floorY(h.floor) + (floorY(h.toFloor) - floorY(h.floor)) * e + (rising ? Math.sin(Math.PI * p) * 0.9 : 0);
  };

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 0.6, 15] : [0, 0.6, 13.5], [0, 0, 0], compact() ? 58 : 44, 4);
  stage.setRig(rig());
  stage.pose.pos.set(0, 1.5, 15);
  stage.pose.look.set(0, 1.3, 0);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-room></span></div>
    <div class="meter">${esc(t('courage'))}<b data-courage></b></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const roomEl = status.querySelector<HTMLElement>('[data-room]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;
  const actions = document.createElement('div');
  actions.className = 'lib-actions';
  actions.innerHTML = `<button class="open" data-open>${esc(t('open'))}</button><button class="down" data-down>${esc(t('down'))} ⬇</button>`;
  hud.el.append(actions);
  const openBtn = actions.querySelector<HTMLButtonElement>('[data-open]')!;
  openBtn.addEventListener('click', () => loop.dispatch({ type: 'open' }));
  actions.querySelector('[data-down]')!.addEventListener('click', () => loop.dispatch({ type: 'drop' }));
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      loop.dispatch({ type: 'open' });
    }
  };
  window.addEventListener('keydown', onKey);
  let downHeld = false;
  const joystick = attachJoystick(hud.el, {
    hint: t('move'),
    change: (x, y) => {
      loop.dispatch({ type: 'move', dir: Math.abs(x) > 0.25 && Math.abs(x) >= Math.abs(y) * 0.6 ? Math.sign(x) : 0 });
      const down = y > 0.7 && Math.abs(y) > Math.abs(x);
      if (down && !downHeld) loop.dispatch({ type: 'drop' });
      downHeld = down;
    },
  });

  audio.defineMood('library', { bpm: 84, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], busy: false, drum: false });
  audio.defineSfx('creak', (s) => {
    s.noise(0.35, 0.12, 900);
    s.tone(140, 0.4, 'sawtooth', 0.05, 0, 1.6);
  });
  audio.defineSfx('boing', (s) => s.tone(300, 0.35, 'sine', 0.16, 0, 3));
  audio.defineSfx('wail', (s) => s.tone(520, 0.4, 'triangle', 0.08, 0, 0.5));

  // ---------------------------------------------------------------- doors and haunts
  const doors = new Map<string, { view: DoorView | null; tag: HTMLElement; x: number; floor: number }>();
  const haunts = new Map<string, { walker: Walker; kind: 'ghost' | 'bat'; floor: number }>();

  function clearRoom(): void {
    for (const d of doors.values()) {
      hud.unanchor(d.tag);
      d.view?.dispose();
    }
    doors.clear();
    for (const id of [...haunts.keys()]) removeHaunt(id);
  }

  function addHaunt(z: HazardSpawn): void {
    const model = z.kind === 'ghost' ? 'skeleton' : 'giant-bat';
    const g = stage.loader.get(stage.loader.modelPath(model));
    if (!g) return;
    const actor = stage.addActor(new Actor(model, g, stage.timeline, { phase: Math.random() }));
    if (z.kind === 'ghost') ghostify(actor);
    const y = floorY(z.floor) + (z.kind === 'bat' ? 1.2 : 0);
    actor.placeAt(z.x, y, z.kind === 'ghost' ? DEPTH.ghost : DEPTH.bat, 0);
    haunts.set(z.id, { walker: new Walker(actor, z.kind === 'bat' ? 'fly' : 'walk', 10), kind: z.kind, floor: z.floor });
  }

  function removeHaunt(id: string): void {
    const h = haunts.get(id);
    if (!h) return;
    stage.removeActor(h.walker.actor);
    haunts.delete(id);
  }

  function startRoom(ev: Extract<LibraryEvent, { type: 'roomStarted' }>): void {
    clearRoom();
    for (const d of ev.doors) {
      const tag = document.createElement('div');
      tag.className = 'arena-tag';
      tag.textContent = d.word;
      const point = new THREE.Vector3(d.x, floorY(d.floor) + DOOR_TOP, DEPTH.door);
      hud.anchor(tag, () => stage.screenOfPoint(point), { pin: true });
      doors.set(d.id, { view: buildDoor(stage, d.x, d.floor), tag, x: d.x, floor: d.floor });
    }
    for (const z of ev.hazards) addHaunt(z);
    drawBar();
  }

  function drawBar(): void {
    const s = sim.state;
    const sentence = s.shift[s.room];
    if (sentence) sentenceBar(bar, sentence.words, s.next, s.helper);
    for (const d of s.doors) {
      const view = doors.get(d.id);
      if (!view) continue;
      view.tag.classList.toggle('done', d.open);
      view.tag.classList.toggle('next', s.helper && d.index === s.next);
    }
    roomEl.textContent = t('room', { room: Math.min(s.room + 1, s.rooms), rooms: s.rooms });
    courageEl.textContent = '❤'.repeat(s.courage) + '♡'.repeat(Math.max(0, s.maxCourage - s.courage));
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const overHero = (): { x: number; y: number; visible: boolean } => stage.screenOf(hero.actor, 1.6);
  const point = new THREE.Vector3();
  const overDoor = (id: string): { x: number; y: number; visible: boolean } => {
    const d = doors.get(id);
    return d ? stage.screenOfPoint(point.set(d.x, floorY(d.floor) + DOOR_TOP, DEPTH.door)) : overHero();
  };

  /** A black cover over the stage: 1 hides the library, 0 shows it. */
  const cover = document.createElement('div');
  cover.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .25s;z-index:30';
  hud.el.append(cover);
  async function fade(to: number): Promise<void> {
    cover.style.opacity = String(to);
    await stage.timeline.wait(0.3);
  }

  // Events play one after another.
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
        void d?.view?.open();
        audio.play('creak');
        audio.play('correct');
        hud.popup(overDoor(ev.id), t('opened'), 'good');
        if (d) void burst(stage, new THREE.Vector3(d.x, floorY(d.floor) + 1.1, DEPTH.door + 0.2), 0xffd98a, 14, 0.9);
        for (const id of ev.stunned) {
          const h = haunts.get(id);
          if (!h) continue;
          h.walker.play('hit');
          void h.walker.actor.flash(0xffffff, 0.5, 0.9);
        }
        break;
      }
      case 'doorWrong': {
        hud.popup(overDoor(ev.id), t('wrong'), 'miss');
        audio.play('wrong');
        if (ev.removed) removeHaunt(ev.removed);
        if (ev.bat) addHaunt(ev.bat);
        audio.play('wail');
        break;
      }
      case 'bounced':
        audio.play('boing');
        void burst(stage, new THREE.Vector3(hero.actor.root.position.x, floorY(sim.state.hero.floor) + 0.2, DEPTH.hero), 0x9dffc4, 10, 0.8);
        break;
      case 'heroHit': {
        hero.play('hit');
        stage.shake(0.06, 0.3);
        const h = haunts.get(ev.hazardId);
        if (h) h.walker.play(h.walker.actor.has('attack') ? 'attack' : 'hit');
        hud.popup(overHero(), t('hit'), 'miss');
        audio.play('hit');
        break;
      }
      case 'courageChanged':
        hud.popup(overHero(), t('courageLost'), '');
        break;
      case 'teamRested':
        await hud.banner.show(t('rested'), '', 1.1);
        await fade(1);
        hero.teleport(sim.state.hero.x, DEPTH.hero, 0);
        heroY = floorY(sim.state.hero.floor);
        for (const [id, h] of [...haunts]) if (h.kind === 'bat') removeHaunt(id);
        await fade(0);
        loop.reset();
        break;
      case 'roomCleared':
        audio.play('victory');
        void hud.banner.show(t('cleared'), '', 1.2);
        break;
      case 'visitComplete':
        await finish();
        break;
      default:
        break;
    }
    drawBar();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    joystick.dispose();
    audio.music('calm');
    audio.play('victory');
    hero.play('victory');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<LibraryState, LibraryCommand, LibraryEvent>(sim, { render: (events) => (queue.push(...events), void drain()) }, clock);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    heroY += (heroTargetY(s) - heroY) * (1 - Math.exp(-18 * dt));
    hero.update(dt, s.hero.x, DEPTH.hero, heroY);
    for (const z of s.hazards) {
      const h = haunts.get(z.id);
      if (!h) continue;
      const bob = z.kind === 'bat' ? 1.2 + Math.sin(time * 5 + z.x) * 0.12 : 0;
      h.walker.update(dt, z.x, z.kind === 'ghost' ? DEPTH.ghost : DEPTH.bat, floorY(z.floor) + bob);
    }
    target.set(hero.actor.root.position.x * 0.85, heroY + 1.4 + FLOOR_HEIGHT * 0.15, 0);
    library.update(time);
    // The Open button glows when a door is in reach.
    const near = s.doors.some((d) => !d.open && d.floor === s.hero.floor && s.hero.travelMs === 0 && Math.abs(d.x - s.hero.x) <= TUNING.openRange);
    openBtn.classList.toggle('ready', near);
  });

  return {
    start: () => {
      audio.music('library');
      loop.start();
    },
    pause: () => undefined,
    resume: () => loop.reset(),
    resize: () => undefined,
    recompose: () => stage.setRig(rig()),
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      loop.stop();
      joystick.dispose();
      window.removeEventListener('keydown', onKey);
      clearRoom();
      status.remove();
      bar.remove();
      actions.remove();
      cover.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as LibraryCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach((ev) => void handle(ev));
      },
      auto: () => {
        const command = nextCommand(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
