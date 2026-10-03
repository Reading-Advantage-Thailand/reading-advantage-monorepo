/**
 * The Labyrinth of the Goblin King in 3D as a cartridge game. The core (../core) moves the hero
 * and the goblins cell to cell in fixed steps; this view builds the maze, glides the characters
 * to the core's positions (a long jump, such as a bump back to a crossing, snaps), keeps every
 * orb word readable (tags pinned to the screen edge when off screen), and animates the events.
 * It reads the orbs and goblins from the state each frame and never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createLabyrinth, evidenceOf, positionOf, rightOrbOf, scoreOf, type LabyrinthCommand, type LabyrinthEvent, type LabyrinthState, type Mover } from '../core/index.js';
import { nextTurn } from '../qc/bot.js';
import { dirOfStick, fitCamera, heldTurn, worldOf, worldOfCell } from './geometry.js';
import { buildMaze, MAZE_MODELS } from './maze.js';

/** A jump longer than this (meters) is a teleport of the core, not a walk. */
const SNAP_M = 1.5;
const ORB_Y = 0.8;
/** The whole maze is in view, so characters are drawn larger than life to stay readable. */
const CHARACTER_SCALE = 1.45;

interface Body {
  actor: Actor;
  walker: Walker;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...MAZE_MODELS, heroId, 'goblin-warrior'].map((n) => stage.loader.modelPath(n)));
  const sim = createLabyrinth(story, { seed: ctx.seed, helper: ctx.options.helper });
  const maze = sim.state.maze;
  const world = (m: Mover): { x: number; z: number } => worldOf(maze, positionOf(m));
  const mazeSet = buildMaze(stage, maze, { light: 1.7 });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const body = (kind: string, walk: string, stiffness: number, at: { x: number; z: number }, phase = 0): Body => {
    const actor = stage.addActor(new Actor(kind, stage.loader.get(stage.loader.modelPath(kind))!, stage.timeline, { phase, scale: CHARACTER_SCALE }));
    actor.placeAt(at.x, 0, at.z, 180);
    return { actor, walker: new Walker(actor, walk, stiffness) };
  };
  /** Glides a body to a point; a core teleport (a bump, a catch) snaps it and restarts its walker. */
  const glide = (b: Body, dt: number, x: number, z: number, walk: string, stiffness: number): void => {
    const p = b.actor.root.position;
    if (Math.hypot(x - p.x, z - p.z) > SNAP_M) {
      b.actor.placeAt(x, 0, z, b.actor.yaw);
      b.walker = new Walker(b.actor, walk, stiffness);
    }
    b.walker.update(dt, x, z);
  };
  const start = worldOfCell(maze, maze.start);
  const hero = body(heroId, 'run', 18, start);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.actor.setMap(tex)).catch(() => undefined);
  // The golden aura under the hero.
  const auraMat = new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
  const aura = new THREE.Mesh(new THREE.CircleGeometry(1.15, 32), auraMat);
  aura.rotation.x = -Math.PI / 2;
  aura.position.y = 0.05;
  hero.actor.root.add(aura);
  // A bright ring under the hero keeps it easy to find in the whole-maze view.
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.72, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.06;
  hero.actor.root.add(marker);
  const heroLight = new THREE.PointLight(0xffc98a, 6, 6, 1.6);
  heroLight.position.set(0, 1.8, 0.3);
  hero.actor.root.add(heroLight);

  // ---------------------------------------------------------------- camera
  // The whole maze stays in view: the student must see every corridor to plan the way.
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => {
    const fov = compact() ? 52 : 44;
    const fit = fitCamera(maze, stage.camera.aspect || 1, fov, compact() ? 70 : 66);
    target.set(fit.target.x, 0, fit.target.z);
    stage.pose.pos.set(target.x + fit.offset[0], fit.offset[1], target.z + fit.offset[2]);
    return new FollowRig(() => target, fit.offset, [0, 0, 0], fov, 6);
  };
  stage.setRig(rig());

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-sentence></span></div>
    <div class="meter" data-coins></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const sentenceEl = status.querySelector<HTMLElement>('[data-sentence]')!;
  const coinsEl = status.querySelector<HTMLElement>('[data-coins]')!;
  let held: ReturnType<typeof dirOfStick> = null;
  const joystick = attachJoystick(hud.el, {
    hint: t('move'),
    change: (x, y) => {
      held = dirOfStick(x, y);
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

  // ---------------------------------------------------------------- orbs and goblins
  const orbGeometry = new THREE.SphereGeometry(0.38, 20, 14);
  const haloGeometry = new THREE.SphereGeometry(0.62, 16, 12);
  const ringGeometry = new THREE.TorusGeometry(0.7, 0.07, 8, 28);
  interface OrbView {
    group: THREE.Group;
    tag: HTMLElement;
    ring: THREE.Mesh;
    word: string;
  }
  const orbs = new Map<string, OrbView>();
  const taken = new Set<string>();
  const goblins = new Map<string, Body>();

  const orbAt = (view: OrbView): THREE.Vector3 => view.group.position.clone();
  function addOrb(o: LabyrinthState['orbs'][number]): void {
    const at = worldOfCell(maze, o.cell);
    const group = new THREE.Group();
    group.position.set(at.x, ORB_Y, at.z);
    const core = new THREE.Mesh(orbGeometry, new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x4fc3ff, emissiveIntensity: 1.6, roughness: 0.2 }));
    const halo = new THREE.Mesh(haloGeometry, new THREE.MeshBasicMaterial({ color: 0x7fd8ff, transparent: true, opacity: 0.22, blending: THREE.AdditiveBlending, depthWrite: false }));
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9 }));
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    group.add(core, halo, ring);
    stage.scene.add(group);
    const tag = document.createElement('div');
    tag.className = 'arena-tag';
    tag.textContent = o.word;
    hud.anchor(tag, () => stage.screenOfPoint(group.position.clone().setY(ORB_Y + 0.6)), { pin: true });
    orbs.set(o.id, { group, tag, ring, word: o.word });
  }
  function removeOrb(id: string, view: OrbView): void {
    if (taken.delete(id)) void burst(stage, orbAt(view), 0x9fe8ff, 14, 1.0);
    stage.scene.remove(view.group);
    view.group.traverse((n) => {
      if (n instanceof THREE.Mesh) (n.material as THREE.Material).dispose();
    });
    hud.unanchor(view.tag);
    orbs.delete(id);
  }
  function addGoblin(g: LabyrinthState['goblins'][number]): void {
    goblins.set(g.id, body('goblin-warrior', 'walk', 14, world(g), Math.random()));
  }
  function clearAll(): void {
    for (const [id, view] of [...orbs]) removeOrb(id, view);
    for (const g of goblins.values()) stage.removeActor(g.actor);
    goblins.clear();
  }

  /** Makes the views match the state: new orbs and goblins appear, gone ones leave. */
  function reconcile(): void {
    const s = sim.state;
    for (const o of s.orbs) if (!orbs.has(o.id)) addOrb(o);
    for (const [id, view] of [...orbs]) if (!s.orbs.some((o) => o.id === id)) removeOrb(id, view);
    for (const g of s.goblins) if (!goblins.has(g.id)) addGoblin(g);
    const right = s.helper ? rightOrbOf(s) : null;
    for (const o of s.orbs) {
      const view = orbs.get(o.id);
      if (!view) continue;
      const at = worldOfCell(maze, o.cell);
      view.group.position.x += (at.x - view.group.position.x) * 0.25;
      view.group.position.z += (at.z - view.group.position.z) * 0.25;
      view.ring.visible = right?.id === o.id;
      view.tag.classList.toggle('next', right?.id === o.id);
    }
  }

  function drawHud(): void {
    const s = sim.state;
    const sentence = s.shift[s.gateOpen ? s.sentences - 1 : s.sentence];
    if (sentence) sentenceBar(bar, sentence.words, s.gateOpen ? sentence.words.length : s.next, s.helper);
    sentenceEl.textContent = t('sentence', { n: Math.min(s.sentence + 1, s.sentences), total: s.sentences });
    coinsEl.textContent = t('coins', { coins: s.coins });
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const heroScreen = (lift = 1.7): { x: number; y: number; visible: boolean } => stage.screenOf(hero.actor, lift);
  const goblinScreen = (id: string): { x: number; y: number; visible: boolean } => {
    const g = goblins.get(id);
    return g ? stage.screenOf(g.actor, 1.5) : heroScreen();
  };
  const orbScreen = (id: string): { x: number; y: number; visible: boolean } => {
    const v = orbs.get(id);
    return v ? stage.screenOfPoint(v.group.position.clone().setY(ORB_Y + 0.5)) : heroScreen();
  };

  function handle(ev: LabyrinthEvent): void {
    switch (ev.type) {
      case 'orbTaken':
        taken.add(ev.id);
        hud.popup(heroScreen(), t('right'), 'good');
        audio.play('correct');
        break;
      case 'orbWrong':
        hud.popup(orbScreen(ev.id), t('wrong'), 'miss');
        audio.play('fizzle');
        break;
      case 'orbsMoved':
        audio.play('tap');
        break;
      case 'heroBumped':
        hero.walker.play('hit');
        goblins.get(ev.goblinId)?.walker.play('attack');
        stage.shake(0.07, 0.3);
        hud.popup(heroScreen(), t('bump'), 'miss');
        audio.play('hit');
        break;
      case 'sentenceComplete': {
        audio.play('aura');
        const s = sim.state.shift.find((x) => x.id === ev.sentenceId);
        if (!sim.state.gateOpen) void hud.banner.show(t('built'), s?.text ?? '', 1.6);
        void burst(stage, hero.actor.root.position.clone().setY(1), 0xffd84a, 18, 1.3);
        break;
      }
      case 'goblinCaught':
        hud.popup(goblinScreen(ev.goblinId), `+${ev.coins} ${t('caught')}`, 'good');
        goblins.get(ev.goblinId)?.walker.play('hit');
        void burst(stage, (goblins.get(ev.goblinId)?.actor.root.position ?? hero.actor.root.position).clone().setY(1), 0xffd84a, 14, 1.0);
        audio.play('correct');
        break;
      case 'gateOpened': {
        audio.play('clank');
        const p = mazeSet.portcullis;
        if (p) void stage.timeline.tween(1.0, (u) => (p.position.y = u * 1.6));
        void stage.timeline.tween(1.0, (u) => (mazeSet.glow.intensity = u * 12));
        void hud.banner.show(t('gate'), '', 2.0);
        break;
      }
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
    joystick.dispose();
    audio.music('calm');
    audio.play('victory');
    hero.walker.play('victory');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<LabyrinthState, LabyrinthCommand, LabyrinthEvent>(sim, { render: (events) => events.forEach(handle) }, clock);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    reconcile();
    const owed = heldTurn(held, s.hero);
    if (owed && !finished) loop.dispatch(owed);
    const h = world(s.hero);
    glide(hero, dt, h.x, h.z, 'run', 18);
    for (const g of s.goblins) {
      const view = goblins.get(g.id);
      if (!view) continue;
      const p = world(g);
      glide(view, dt, p.x, p.z, 'walk', 14);
    }
    for (const view of orbs.values()) {
      view.group.position.y = ORB_Y + Math.sin(time * 2.4 + view.group.position.x) * 0.08;
      view.group.rotation.y = time;
    }
    const glow = s.auraMs > 0 ? 0.55 + 0.25 * Math.sin(time * 8) : 0;
    auraMat.opacity += (glow - auraMat.opacity) * Math.min(1, dt * 8);
    heroLight.color.set(s.auraMs > 0 ? 0xffd84a : 0xffc98a);
    heroLight.intensity = s.auraMs > 0 ? 14 : 6;
  });

  return {
    start: () => {
      audio.music('labyrinth');
      drawHud();
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
      clearAll();
      stage.removeActor(hero.actor);
      status.remove();
      bar.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as LabyrinthCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextTurn(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
