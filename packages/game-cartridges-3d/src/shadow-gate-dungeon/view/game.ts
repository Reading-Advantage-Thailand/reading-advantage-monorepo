/**
 * Shadow Gate Dungeon 3D as a cartridge game. The core (../core) moves everyone in fixed steps;
 * this view builds the dungeon room, walks the hero and the shadows to the core's positions, floats
 * the word crystals with their words (tags pinned to the screen edge when off screen), and animates
 * the events. It never decides a rule: every crystal looks the same, so the look gives no hint.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createShadowGate, evidenceOf, GATE, HERO_START, rightCrystalsOf, scoreOf, type ShadowGateCommand, type ShadowGateEvent, type ShadowGateState } from '../core/index.js';
import { nextSteer } from '../qc/bot.js';
import { buildDungeon, DUNGEON_MODELS, makeCrystal } from './dungeon.js';

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...DUNGEON_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const dungeon = buildDungeon(stage);
  const sim = createShadowGate(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const hero = new Walker(stage.addActor(new Actor(heroId, heroGltf, stage.timeline)), 'run');
  hero.actor.placeAt(HERO_START.x, 0, HERO_START.z, 180);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.actor.setMap(tex)).catch(() => undefined);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 7.6, 6.4] : [0, 7.4, 7.8], [0, 0, -1.2], compact() ? 60 : 48, 5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 8, 10);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-room></span></div>
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
  const joystick = attachJoystick(hud.el, { hint: t('move'), change: (x, y) => loop.dispatch({ type: 'steer', x, z: y }) });

  audio.defineMood('vault', { bpm: 92, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], busy: false, drum: true });
  audio.defineSfx('join', (s) => [784, 988, 1319].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
  audio.defineSfx('eek', (s) => s.tone(1200, 0.25, 'square', 0.06, 0, 1.5));
  audio.defineSfx('clank', (s) => {
    s.noise(0.3, 0.2, 1500);
    s.tone(180, 0.35, 'square', 0.08, 0, 0.7);
  });

  // ---------------------------------------------------------------- crystals and shadows
  type CrystalView = { root: THREE.Group; model: THREE.Object3D; light: THREE.PointLight; tag: HTMLElement; x: number; z: number; phase: number };
  const crystals = new Map<string, CrystalView>();
  const shadows = new Map<string, Walker>();

  function clearCrystals(): void {
    for (const c of crystals.values()) {
      hud.unanchor(c.tag);
      stage.scene.remove(c.root);
    }
    crystals.clear();
  }

  function clearRoom(): void {
    clearCrystals();
    for (const s of shadows.values()) stage.removeActor(s.actor);
    shadows.clear();
  }

  function placeWave(list: Extract<ShadowGateEvent, { type: 'wavePlaced' }>['crystals']): void {
    clearCrystals();
    for (const c of list) {
      const made = makeCrystal(stage);
      if (!made) continue;
      made.root.position.set(c.x, 0, c.z);
      stage.scene.add(made.root);
      const tag = document.createElement('div');
      tag.className = 'arena-tag';
      tag.textContent = c.word;
      const spot = new THREE.Vector3(c.x, 1.55, c.z);
      hud.anchor(tag, () => stage.screenOfPoint(spot), { pin: true });
      crystals.set(c.id, { ...made, tag, x: c.x, z: c.z, phase: Math.random() * 6 });
    }
    drawBar();
  }

  function startRoom(ev: Extract<ShadowGateEvent, { type: 'roomStarted' }>): void {
    clearRoom();
    for (const s of ev.shadows) {
      const actor = stage.addActor(new Actor('skeleton', stage.loader.get(stage.loader.modelPath('skeleton'))!, stage.timeline, { phase: Math.random() }));
      actor.placeAt(s.x, 0, s.z, 0);
      actor.hold('rise');
      void actor.play('rise');
      shadows.set(s.id, new Walker(actor, 'walk', 10));
    }
    if (dungeon.portcullis) dungeon.portcullis.position.y = 0;
    dungeon.glow.intensity = 0;
    drawBar();
  }

  function drawBar(): void {
    const s = sim.state;
    const sentence = s.shift[s.room];
    if (sentence) sentenceBar(bar, sentence.words, s.next, s.helper);
    const right = new Set(s.helper ? rightCrystalsOf(s).map((c) => c.id) : []);
    for (const [id, view] of crystals) view.tag.classList.toggle('next', right.has(id));
    roomEl.textContent = t('room', { room: Math.min(s.room + 1, s.rooms), rooms: s.rooms });
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const above = (x: number, z: number): { x: number; y: number; visible: boolean } => stage.screenOfPoint(new THREE.Vector3(x, 1.6, z));
  const overCrystal = (id: string): { x: number; y: number; visible: boolean } => {
    const c = crystals.get(id);
    return c ? above(c.x, c.z) : above(hero.actor.root.position.x, hero.actor.root.position.z);
  };

  /** The hero walks out through the open gate, then the screen fades. */
  const WALK_OUT = { speed: 2.4, beyond: 2.2 };
  async function walkOut(): Promise<void> {
    exiting = true;
    const gate = new THREE.Vector3(GATE.x, 0, GATE.z);
    const beyond = new THREE.Vector3(GATE.x, 0, GATE.z - WALK_OUT.beyond);
    // After the last room the hero stays at the gate and cheers.
    if (sim.state.phase === 'complete') return;
    const a = hero.actor;
    a.loop('run', 0.1);
    const from = a.root.position.clone();
    const first = from.distanceTo(gate);
    const total = first + gate.distanceTo(beyond);
    await stage.timeline.tween(total / WALK_OUT.speed, (u) => {
      const d = u * total;
      const [p, q, k] = d < first ? [from, gate, d / Math.max(first, 1e-6)] : [gate, beyond, (d - first) / (total - first)];
      a.root.position.lerpVectors(p, q, k);
      a.yaw = THREE.MathUtils.radToDeg(Math.atan2(q.x - p.x, q.z - p.z));
    });
    a.root.visible = false;
    await stage.timeline.wait(0.2);
    await fade(1);
  }

  /** A black cover over the stage: 1 hides the room, 0 shows it. */
  const cover = document.createElement('div');
  cover.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .25s;z-index:30';
  hud.el.append(cover);
  async function fade(to: number): Promise<void> {
    cover.style.opacity = String(to);
    await stage.timeline.wait(0.3);
  }

  // Events play one after another, so the walk out can finish before the next room appears.
  const queue: ShadowGateEvent[] = [];
  let draining = false;
  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    while (queue.length > 0) await handle(queue.shift()!);
    draining = false;
  }
  let exiting = false;

  async function handle(ev: ShadowGateEvent): Promise<void> {
    switch (ev.type) {
      case 'roomStarted': {
        startRoom(ev);
        const k = sim.state.hero;
        hero.actor.root.visible = true;
        hero.teleport(k.x, k.z, 180);
        if (exiting) {
          exiting = false;
          await fade(0);
          loop.reset();
        }
        break;
      }
      case 'wavePlaced':
        placeWave(ev.crystals);
        break;
      case 'crystalTaken': {
        const c = crystals.get(ev.id);
        if (c) void burst(stage, new THREE.Vector3(c.x, 0.7, c.z), 0xb8a8ff, 14, 0.9);
        hud.popup(overCrystal(ev.id), t('taken'), 'good');
        audio.play('join');
        break;
      }
      case 'crystalRefused':
        hud.popup(overCrystal(ev.id), t('notYet'), 'miss');
        audio.play('wrong');
        break;
      case 'heroBumped': {
        hero.play('hit');
        stage.shake(0.06, 0.3);
        shadows.get(ev.shadowId)?.play('attack');
        hud.popup(above(hero.actor.root.position.x, hero.actor.root.position.z), t('bumped'), 'miss');
        audio.play('eek');
        audio.play('hit');
        break;
      }
      case 'gateOpened': {
        clearCrystals();
        audio.play('clank');
        audio.play('correct');
        const p = dungeon.portcullis;
        if (p) void stage.timeline.tween(1.0, (u) => (p.position.y = u * 1.6));
        void stage.timeline.tween(1.0, (u) => (dungeon.glow.intensity = u * 10));
        void burst(stage, new THREE.Vector3(0, 1, -4.6), 0x9dffb0, 18, 1.2);
        void hud.banner.show(t('gate'), '', 1.6);
        break;
      }
      case 'roomCleared':
        audio.play('victory');
        await walkOut();
        break;
      case 'delveComplete':
        await finish();
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
  const loop = createFixedStepLoop<ShadowGateState, ShadowGateCommand, ShadowGateEvent>(sim, { render: (events) => (queue.push(...events), void drain()) }, clock);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    if (!exiting) {
      const cb = nextFrame;
      nextFrame = null;
      cb?.();
    }
    const s = sim.state;
    if (exiting) target.set(hero.actor.root.position.x * 0.6, 0, hero.actor.root.position.z);
    else {
      hero.update(dt, s.hero.x, s.hero.z);
      target.set(s.hero.x * 0.6, 0, s.hero.z);
      for (const k of s.shadows) shadows.get(k.id)?.update(dt, k.x, k.z);
    }
    for (const c of crystals.values()) {
      c.model.rotation.y = time * 0.9 + c.phase;
      c.root.position.y = 0.12 + 0.07 * Math.sin(time * 2 + c.phase);
      c.light.intensity = 3 + 0.8 * Math.sin(time * 3 + c.phase);
    }
  });

  return {
    start: () => {
      audio.music('vault');
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
      clearRoom();
      status.remove();
      bar.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as ShadowGateCommand),
      tick: (steps) => {
        // QC fast-forward: no walk out (it needs frames), so a cleared room is not played.
        for (let i = 0; i < steps; i++) sim.tick().forEach((ev) => void (ev.type === 'roomCleared' ? undefined : handle(ev)));
      },
      auto: () => {
        const command = nextSteer(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
