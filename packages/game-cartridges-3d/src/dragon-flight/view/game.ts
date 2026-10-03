/**
 * Dragon Flight 3D as a cartridge game. The core (../core) moves the flight in fixed steps; this
 * view flies the dragon over a forest that scrolls past, raises the gates with their meanings,
 * grows and shrinks the flock, and stages the final fight. It reads the core's state every frame
 * and animates its events; it never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, hasThai } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, projectile } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createDragonFlight, evidenceOf, scoreOf, type DragonFlightCommand, type DragonFlightEvent, type DragonFlightState } from '../core/index.js';
import { nextChoice } from '../qc/bot.js';
import { buildLand, FLIGHT_MODELS } from './land.js';
import dragon_flightCss from './dragon-flight.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('dragon-flight', dragon_flightCss);

const DRAGON_SCALE = 0.8;
const FLOCK_SCALE = 0.34;
const BOSS_SCALE = 3.0;
const GATE_SCALE = 1.25;
/** Flight height, and the height through a gate's opening. */
const CRUISE_Y = 2.4;
const GATE_Y = 1.35;

/** Gate x positions for 2 or 3 gates (narrow enough for a portrait phone). */
const gateX = (count: number, i: number): number => (count === 2 ? [-1.6, 1.6] : [-3.0, 0, 3.0])[i] ?? 0;

interface Gate {
  obj: THREE.Object3D;
  ring: THREE.Mesh;
  tag: HTMLButtonElement;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  await stage.loader.preload(FLIGHT_MODELS.map((n) => stage.loader.modelPath(n)));
  const land = buildLand(stage);
  const sim = createDragonFlight(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- dragons
  const dragonGltf = stage.loader.get(stage.loader.modelPath('dragon-fire'))!;
  const dragon = stage.addActor(new Actor('dragon-fire', dragonGltf, stage.timeline, { idle: 'fly', scale: DRAGON_SCALE }));
  dragon.placeAt(0, CRUISE_Y, 0, 180);
  const flock: Actor[] = [];
  /** V formation behind the dragon: slot k of the flock. */
  const flockOffset = (k: number): THREE.Vector3 => {
    const row = Math.floor(k / 2) + 1;
    const side = k % 2 ? 1 : -1;
    return new THREE.Vector3(side * row * 0.95, 0.35 * row, row * 1.25);
  };
  function addFlockDragon(fromSide = true): void {
    const a = stage.addActor(new Actor('dragon-fire', dragonGltf, stage.timeline, { idle: 'fly', scale: FLOCK_SCALE, phase: Math.random() }));
    a.yaw = 180;
    a.root.rotation.y = Math.PI;
    const k = flock.length;
    flock.push(a);
    const to = flockOffset(k);
    const from = fromSide ? new THREE.Vector3((k % 2 ? 1 : -1) * 8, 4, 6) : to.clone();
    a.home.copy(from);
    void stage.timeline.tween(fromSide ? 0.9 : 0, (u) => a.home.lerpVectors(from, to, u * u * (3 - 2 * u)));
  }
  function removeFlockDragon(): void {
    const a = flock.pop();
    if (!a) return;
    const from = a.home.clone();
    const to = from.clone().add(new THREE.Vector3(from.x < 0 ? -9 : 9, 6, 8));
    void stage.timeline.tween(1.0, (u) => a.home.lerpVectors(from, to, u)).then(() => stage.removeActor(a));
  }
  // The flock count starts at 1: the student's own dragon, so no extra dragon shows yet.

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  // Low and close behind the dragon: the dragon is large in the lower third, the gates ahead.
  // A close chase camera: sky above, the gates in the middle, the dragon large near the bottom.
  let rig = new FollowRig(() => target, compact() ? [0, 3.2, 3.2] : [0, 3.0, 3.8], [0, 2.4, -14], compact() ? 60 : 50, 4);
  stage.setRig(rig);
  stage.pose.pos.set(0, 6, 10);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-gate></span></div>
    <div class="meter flock">🐉<b data-flock>1</b></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const wordBox = document.createElement('div');
  wordBox.className = 'flight-word';
  hud.el.append(wordBox);

  // ---------------------------------------------------------------- sound
  audio.defineMood('flight', { bpm: 112, chords: [[62, 66, 69], [67, 71, 74], [64, 67, 71], [69, 73, 76]], busy: true, drum: false });
  audio.defineSfx('flap', (s) => s.noise(0.25, 0.14, 700));
  audio.defineSfx('join', (s) => [880, 1175, 1568].forEach((f, i) => s.tone(f, 0.25, 'triangle', 0.14, i * 0.07)));

  // ---------------------------------------------------------------- gates
  const gates = new Map<string, Gate[]>();
  const archGltf = stage.loader.get(stage.loader.modelPath('arch'));

  function choose(gate: number): void {
    const s = sim.state;
    if (s.round && s.round.chosen === null) loop.dispatch({ type: 'choose', gate });
  }

  function raiseGates(roundId: string, options: readonly { id: string; text: string }[], at: number): void {
    const list = options.map((o, i) => {
      const obj = archGltf ? archGltf.scene.clone() : new THREE.Group();
      obj.scale.setScalar(GATE_SCALE);
      obj.position.set(gateX(options.length, i), 0, -at);
      obj.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = true) : undefined));
      stage.scene.add(obj);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.05, 0.08, 10, 40), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.55 }));
      ring.position.set(gateX(options.length, i), GATE_Y + 0.25, -at);
      stage.scene.add(ring);
      const tag = document.createElement('button');
      tag.className = `gate-tag ${hasThai(o.text) ? 'th' : ''}`;
      tag.dataset.gate = String(i);
      tag.textContent = o.text;
      tag.addEventListener('click', () => choose(i));
      // Tags show when the gates come near (far away they would overlap).
      hud.anchor(tag, () => {
        const p = stage.screenOfPoint(new THREE.Vector3(obj.position.x, 3.4, obj.position.z));
        return dragon.root.position.z - obj.position.z > 38 ? { ...p, visible: false } : p;
      });
      return { obj, ring, tag };
    });
    gates.set(roundId, list);
  }

  function lowerGates(roundId: string): void {
    for (const g of gates.get(roundId) ?? []) {
      hud.unanchor(g.tag);
      g.obj.removeFromParent();
      g.ring.removeFromParent();
      g.ring.geometry.dispose();
    }
    gates.delete(roundId);
  }

  // Swipes and keys.
  let swipeX: number | null = null;
  hud.el.addEventListener('pointerdown', (e) => (swipeX = e.clientX));
  hud.el.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    const count = sim.state.round?.options.length ?? 0;
    if (Math.abs(dx) > 60 && count) choose(dx < 0 ? 0 : count - 1);
  });
  const onKey = (e: KeyboardEvent): void => {
    const count = sim.state.round?.options.length ?? 0;
    if (!count) return;
    if (/^[1-3]$/.test(e.key) && Number(e.key) <= count) choose(Number(e.key) - 1);
    if (e.key === 'ArrowLeft') choose(0);
    if (e.key === 'ArrowRight') choose(count - 1);
    if (e.key === 'ArrowUp' && count === 3) choose(1);
  };
  window.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- events
  let steerX = 0;
  let boss: Actor | null = null;
  let finished = false;
  const gateEl = status.querySelector<HTMLElement>('[data-gate]')!;
  const flockEl = status.querySelector<HTMLElement>('[data-flock]')!;
  const drawStatus = (s: DragonFlightState): void => {
    gateEl.textContent = t('gate', { index: Math.min(s.roundIndex + 1, Math.max(1, s.total)), total: s.total });
    flockEl.textContent = String(s.flock);
  };
  const dragonPoint = (lift = 0.8) => stage.screenOfPoint(dragon.root.position.clone().add(new THREE.Vector3(0, lift, 0)));

  function handle(ev: DragonFlightEvent): void {
    const s = sim.state;
    switch (ev.type) {
      case 'roundStarted':
        raiseGates(ev.roundId, ev.options, ev.gatesAt);
        wordBox.innerHTML = `<small>${esc(t('word'))}</small><b>${esc(ev.term)}</b>`;
        wordBox.classList.add('on');
        steerX = 0;
        break;
      case 'waiting':
        for (const g of gates.get(ev.roundId) ?? []) g.tag.classList.add('pulse');
        break;
      case 'gateChosen': {
        const list = gates.get(ev.roundId) ?? [];
        list.forEach((g, i) => {
          g.tag.classList.remove('pulse');
          if (i === ev.correctGate) g.tag.classList.add('right');
          else if (i === ev.gate) g.tag.classList.add('wrong');
          else g.tag.classList.add('dim');
          (g.ring.material as THREE.MeshBasicMaterial).color.setHex(i === ev.correctGate ? 0x3ee07a : i === ev.gate ? 0xff5a4a : 0x777777);
        });
        steerX = gateX(list.length, ev.gate);
        audio.play(ev.correct ? 'correct' : 'wrong');
        audio.play('flap');
        wordBox.classList.remove('on');
        if (!ev.correct) hud.popup(dragonPoint(1.2), t('again'), 'miss');
        break;
      }
      case 'flockGrew':
        while (flock.length < ev.count - 1) addFlockDragon(true);
        audio.play('join');
        hud.popup(dragonPoint(1.4), t('joined'), 'good');
        break;
      case 'flockShrank':
        while (flock.length > ev.count - 1) removeFlockDragon();
        hud.popup(dragonPoint(1.4), t('left'), 'miss');
        break;
      case 'wordReturns':
        break;
      case 'bossAppeared': {
        const g = stage.loader.get(stage.loader.modelPath('dragon-fire'))!;
        boss = stage.addActor(new Actor('dragon-fire', g, stage.timeline, { scale: BOSS_SCALE }));
        // The core flies the dragon to `bossAt` and stops; the dark dragon waits 16 m beyond.
        const at = new THREE.Vector3(0, 0.3, -((s.bossAt ?? s.distance) + 12));
        boss.placeAt(at.x, at.y, at.z, 0);
        for (const m of boss.materials) m.color.setHex(0x5b3d8f);
        land.bossHill(at);
        void boss.play('roar', 0.3);
        stage.shake(0.12, 1.2);
        audio.play('roar');
        audio.music('boss');
        void hud.banner.show(t('boss.title'), t('boss.text'), 2.0);
        rig = new FollowRig(() => target, compact() ? [0, 3.4, 4.2] : [0, 3.2, 5.0], [0, 2.8, -12], compact() ? 62 : 50, 3);
        stage.setRig(rig);
        break;
      }
      case 'fireball': {
        if (!boss) break;
        const from = (ev.index === 0 ? dragon : flock[(ev.index - 1) % Math.max(1, flock.length)] ?? dragon).root.position.clone();
        void (ev.index === 0 ? dragon : flock[ev.index - 1] ?? dragon).play('attack', 0.5, 1.5);
        const to = boss.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.4, 0));
        void projectile(stage, from, to, 0xff7a1a, 0.55, 1.2).then(() => {
          audio.play('hit');
          if (boss) void boss.flash(0xffffff, 0.2);
        });
        break;
      }
      case 'flightComplete':
        void finish();
        break;
    }
    drawStatus(s);
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    if (boss) {
      await stage.timeline.wait(0.8);
      void burst(stage, boss.root.position.clone().add(new THREE.Vector3(0, 2, 0)), 0xffb040, 24, 2.2);
      await boss.play('death').done;
    }
    audio.music('calm');
    audio.play('victory');
    void dragon.play('roar');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<DragonFlightState, DragonFlightCommand, DragonFlightEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
  let shownZ = 0;
  let shownX = 0;

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    // Smooth the 30 Hz core distance into the frame rate.
    shownZ += (-s.distance - shownZ) * (1 - Math.exp(-dt * 18));
    shownX += (steerX - shownX) * (1 - Math.exp(-dt * 3.5));
    const next = s.round ? s.round.gatesAt - s.distance : 99;
    const dip = s.round && s.round.chosen !== null ? Math.max(0, 1 - Math.abs(next) / 10) : 0;
    const bob = Math.sin(stageMs / 380) * (s.waiting ? 0.18 : 0.08);
    dragon.root.position.set(shownX, CRUISE_Y - (CRUISE_Y - GATE_Y) * dip + bob, shownZ);
    dragon.root.rotation.z = (steerX - shownX) * -0.12;
    target.set(shownX * 0.5, 0.4, shownZ);
    for (const a of flock) {
      a.root.position.copy(dragon.root.position).add(a.home);
      a.root.position.y += Math.sin(stageMs / 300 + a.home.x) * 0.1;
    }
    // Gates behind the dragon go away.
    for (const [roundId, list] of gates) if (list[0] && list[0].obj.position.z > shownZ + 6) lowerGates(roundId);
    land.follow(shownZ);
  });

  drawStatus(sim.state);

  return {
    start: () => {
      audio.music('flight');
      void dragon.play('roar', 0.5);
      loop.start();
    },
    pause: () => undefined,
    resume: () => loop.reset(),
    resize: () => undefined,
    recompose: () => undefined,
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      loop.stop();
      window.removeEventListener('keydown', onKey);
      for (const id of [...gates.keys()]) lowerGates(id);
      status.remove();
      wordBox.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as DragonFlightCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextChoice(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
