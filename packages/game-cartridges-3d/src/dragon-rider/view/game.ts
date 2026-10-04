/**
 * Dragon Rider 3D as a cartridge game. The core (../core) moves the ride in fixed steps; this view
 * flies the student's hero on a dragon over a highland, stands two stone gates in front of it
 * with their meanings, grows and shrinks the flock, and stages the duel with the dark dragon
 * (tired dragons rest and rally). It reads the core's state every frame and animates its events;
 * it never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, hasThai } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, projectile } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createDragonRider, evidenceOf, scoreOf, type DragonRiderCommand, type DragonRiderEvent, type DragonRiderState } from '../core/index.js';
import { nextChoice } from '../qc/bot.js';
import { GATE_X } from './land-plan.js';
import { buildLand, RIDER_MODELS } from './land.js';
import dragon_riderCss from './dragon-rider.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('dragon-rider', dragon_riderCss);

const DRAGON_SCALE = 0.8;
const FLOCK_SCALE = 0.34;
const BOSS_SCALE = 2.4;
const HERO_SCALE = 0.5;
/** Where the hero sits on the dragon's back, in meters. */
const SEAT: readonly [number, number, number] = [0, 0.62, 0.1];
const CRUISE_Y = 2.4;
const GATE_Y = 1.35;
const BOSS_Y = 3.2;
const BOSS_TINT = 0x5b3d8f;

interface Gate {
  obj: THREE.Group;
  ring: THREE.Mesh;
  tag: HTMLButtonElement;
}

/** A stone gate built from boxes: two pillars and a lintel, 2.4 m wide. */
function stoneGate(): THREE.Group {
  const stone = new THREE.MeshStandardMaterial({ color: 0x9a948a, roughness: 0.95 });
  const g = new THREE.Group();
  for (const x of [-1.15, 1.15]) {
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.4, 2.6, 0.5), stone);
    pillar.position.set(x, 1.3, 0);
    pillar.castShadow = true;
    g.add(pillar);
  }
  const lintel = new THREE.Mesh(new THREE.BoxGeometry(2.9, 0.45, 0.6), stone);
  lintel.position.set(0, 2.75, 0);
  lintel.castShadow = true;
  g.add(lintel);
  return g;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...RIDER_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const land = buildLand(stage);
  const sim = createDragonRider(story, { seed: ctx.seed });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- dragons and the hero
  const dragonGltf = stage.loader.get(stage.loader.modelPath('dragon-fire'))!;
  const dragon = stage.addActor(new Actor('dragon-fire', dragonGltf, stage.timeline, { idle: 'fly', scale: DRAGON_SCALE }));
  dragon.placeAt(0, CRUISE_Y, 0, 180);
  const hero = stage.addActor(new Actor(heroId, stage.loader.get(stage.loader.modelPath(heroId))!, stage.timeline, { scale: HERO_SCALE }));
  hero.placeAt(0, CRUISE_Y + SEAT[1], 0, 180);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);

  interface Wing {
    actor: Actor;
    resting: boolean;
  }
  const flock: Wing[] = [];
  /** V formation behind the rider: slot n of the flock. */
  const flockOffset = (n: number): THREE.Vector3 => {
    const row = Math.floor(n / 2) + 1;
    const side = n % 2 ? 1 : -1;
    return new THREE.Vector3(side * row * 0.95, 0.35 * row, row * 1.25);
  };
  function addWing(): void {
    const a = stage.addActor(new Actor('dragon-fire', dragonGltf, stage.timeline, { idle: 'fly', scale: FLOCK_SCALE, phase: flock.length * 0.37 }));
    a.yaw = 180;
    a.root.rotation.y = Math.PI;
    const n = flock.length;
    flock.push({ actor: a, resting: false });
    const to = flockOffset(n);
    const from = new THREE.Vector3((n % 2 ? 1 : -1) * 8, 4, 6);
    a.home.copy(from);
    void stage.timeline.tween(0.9, (u) => a.home.lerpVectors(from, to, u * u * (3 - 2 * u)));
  }
  function removeWing(): void {
    const w = flock.pop();
    if (!w) return;
    const a = w.actor;
    const from = a.home.clone();
    const to = from.clone().add(new THREE.Vector3(from.x < 0 ? -9 : 9, 6, 8));
    void stage.timeline.tween(1.0, (u) => a.home.lerpVectors(from, to, u)).then(() => stage.removeActor(a));
  }

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  stage.setRig(new FollowRig(() => target, compact() ? [0, 3.2, 3.4] : [0, 3.0, 4.0], [0, 2.4, -14], compact() ? 60 : 50, 4));
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
  wordBox.className = 'rider-word';
  const powerBox = document.createElement('div');
  powerBox.className = 'rider-power';
  hud.el.append(wordBox, powerBox);

  // ---------------------------------------------------------------- sound
  audio.defineMood('ride', { bpm: 108, chords: [[57, 60, 64], [62, 65, 69], [60, 64, 67], [64, 67, 71]], busy: true, drum: false });
  audio.defineSfx('flap', (s) => s.noise(0.25, 0.14, 700));
  audio.defineSfx('join', (s) => [880, 1175, 1568].forEach((f, i) => s.tone(f, 0.25, 'triangle', 0.14, i * 0.07)));

  // ---------------------------------------------------------------- gates
  const gates = new Map<string, Gate[]>();
  function choose(gate: number): void {
    const s = sim.state;
    if (s.round && s.round.chosen === null) loop.dispatch({ type: 'choose', gate });
  }

  function raiseGates(roundId: string, options: readonly { id: string; text: string }[], z: number): void {
    const list = options.map((o, i) => {
      const x = GATE_X[i] ?? 0;
      const obj = stoneGate();
      obj.position.set(x, 0, z);
      stage.scene.add(obj);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.08, 10, 40), new THREE.MeshBasicMaterial({ color: 0xffe28a, transparent: true, opacity: 0.55 }));
      ring.position.set(x, GATE_Y + 0.25, z);
      stage.scene.add(ring);
      const tag = document.createElement('button');
      tag.className = `gate-tag ${hasThai(o.text) ? 'th' : ''}`;
      tag.dataset.gate = String(i);
      tag.textContent = o.text;
      tag.addEventListener('click', () => choose(i));
      hud.anchor(tag, () => {
        const p = stage.screenOfPoint(new THREE.Vector3(x, 3.6, z));
        return dragon.root.position.z - z > 40 ? { ...p, visible: false } : p;
      });
      return { obj, ring, tag };
    });
    gates.set(roundId, list);
  }

  function lowerGates(roundId: string): void {
    for (const g of gates.get(roundId) ?? []) {
      hud.unanchor(g.tag);
      g.obj.removeFromParent();
      g.obj.traverse((n) => {
        const m = n as THREE.Mesh;
        if (m.isMesh) m.geometry.dispose();
      });
      g.ring.removeFromParent();
      g.ring.geometry.dispose();
    }
    gates.delete(roundId);
  }

  // Swipes and keys: two gates, so left and right.
  let swipeX: number | null = null;
  hud.el.addEventListener('pointerdown', (e) => (swipeX = e.clientX));
  hud.el.addEventListener('pointerup', (e) => {
    if (swipeX === null) return;
    const dx = e.clientX - swipeX;
    swipeX = null;
    if (Math.abs(dx) > 60) choose(dx < 0 ? 0 : 1);
  });
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'a' || e.key === '1') choose(0);
    if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'd' || e.key === '2') choose(1);
  };
  window.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- events
  let steerX = 0;
  let boss: Actor | null = null;
  let finished = false;
  const gateEl = status.querySelector<HTMLElement>('[data-gate]')!;
  const flockEl = status.querySelector<HTMLElement>('[data-flock]')!;
  const drawStatus = (s: DragonRiderState): void => {
    gateEl.textContent = t('gate', { index: Math.min(s.roundIndex + 1, Math.max(1, s.total)), total: s.total });
    flockEl.textContent = String(s.flock);
    if (s.phase !== 'riding') powerBox.textContent = t('power', { hp: s.bossHp, power: s.bossPower });
  };
  const dragonPoint = (lift = 0.8) => stage.screenOfPoint(dragon.root.position.clone().add(new THREE.Vector3(0, lift, 0)));
  /** The dragon that fires the n-th shot: the rider first, then the flock in turn. */
  const shooter = (n: number): Actor => (n === 0 ? dragon : (flock[(n - 1) % Math.max(1, flock.length)]?.actor ?? dragon));
  let shots = 0;

  function handle(ev: DragonRiderEvent): void {
    const s = sim.state;
    switch (ev.type) {
      case 'roundStarted':
        raiseGates(ev.roundId, ev.options, -(s.distance + s.round!.gap));
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
          g.tag.classList.add(i === ev.correctGate ? 'right' : i === ev.gate ? 'wrong' : 'dim');
          (g.ring.material as THREE.MeshBasicMaterial).color.setHex(i === ev.correctGate ? 0x3ee07a : i === ev.gate ? 0xff5a4a : 0x777777);
        });
        steerX = GATE_X[ev.gate] ?? 0;
        audio.play(ev.correct ? 'correct' : 'wrong');
        audio.play('flap');
        wordBox.classList.remove('on');
        void hero.play(ev.correct ? 'victory' : 'hit', 0.4, 1.4);
        if (!ev.correct) hud.popup(dragonPoint(1.4), t('again'), 'miss');
        break;
      }
      case 'flockGrew':
        while (flock.length < ev.count - 1) addWing();
        audio.play('join');
        hud.popup(dragonPoint(1.5), t('joined'), 'good');
        break;
      case 'flockShrank':
        while (flock.length > ev.count - 1) removeWing();
        hud.popup(dragonPoint(1.5), t('left'), 'miss');
        break;
      case 'wordReturns':
        break;
      case 'bossAppeared': {
        boss = stage.addActor(new Actor('dragon-fire', dragonGltf, stage.timeline, { idle: 'fly', scale: BOSS_SCALE }));
        boss.placeAt(0, BOSS_Y, -(s.distance + 15), 0);
        for (const m of boss.materials) m.color.setHex(BOSS_TINT);
        void boss.play('roar', 0.3);
        stage.shake(0.12, 1.2);
        audio.play('roar');
        audio.music('boss');
        void hud.banner.show(t('boss.title'), t('boss.text', { power: ev.power }), 2.2);
        powerBox.textContent = t('power', { hp: s.bossHp, power: s.bossPower });
        powerBox.classList.add('on');
        steerX = 0;
        break;
      }
      case 'exchange': {
        if (!boss) break;
        const from = shooter(shots++);
        void from.play('attack', 0.5, 1.5);
        const to = boss.root.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 1.5, 2.0, 0));
        void projectile(stage, from.root.position.clone(), to, 0xff7a1a, 0.55, 1.1).then(() => {
          audio.play('hit');
          if (boss) void boss.flash(0xffffff, 0.2);
        });
        // Dragons beyond the active count rest (the rider and the first active wings fight).
        flock.forEach((w, n) => (w.resting = n >= ev.active - 1));
        if (ev.active < s.flock) hud.popup(dragonPoint(1.5), t('tired'), 'miss');
        break;
      }
      case 'rally':
        flock.forEach((w) => (w.resting = false));
        audio.play('join');
        hud.popup(dragonPoint(1.5), t('rally'), 'good');
        break;
      case 'rideComplete':
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
      await stage.timeline.wait(0.5);
      void burst(stage, boss.root.position.clone().add(new THREE.Vector3(0, 1.5, 0)), 0xffb040, 24, 2.2);
      await boss.play('death').done;
    }
    audio.music('calm');
    audio.play('victory');
    void dragon.play('roar');
    void hero.play('victory');
    powerBox.classList.remove('on');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<DragonRiderState, DragonRiderCommand, DragonRiderEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
  let shownZ = 0;
  let shownX = 0;

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    shownZ += (-s.distance - shownZ) * (1 - Math.exp(-dt * 18));
    shownX += (steerX - shownX) * (1 - Math.exp(-dt * 3.5));
    const through = s.round && s.round.chosen !== null ? Math.max(0, 1 - Math.abs(s.round.gap) / 8) : 0;
    const bob = Math.sin(stageMs / 380) * (s.waiting ? 0.18 : 0.08);
    const y = CRUISE_Y - (CRUISE_Y - GATE_Y) * through + bob;
    dragon.root.position.set(shownX, y, shownZ);
    dragon.root.rotation.z = (steerX - shownX) * -0.12;
    hero.root.position.set(shownX + SEAT[0], y + SEAT[1], shownZ + SEAT[2]);
    hero.yaw = 180;
    target.set(shownX * 0.5, 0.4, shownZ);
    for (const [n, w] of flock.entries()) {
      w.actor.root.position.copy(dragon.root.position).add(w.actor.home);
      w.actor.root.position.y += Math.sin(stageMs / 300 + n) * 0.1 - (w.resting ? 1.3 : 0);
    }
    if (boss) boss.root.position.y = BOSS_Y + Math.sin(stageMs / 420) * 0.25;
    for (const [roundId, list] of gates) if (list[0] && list[0].obj.position.z > shownZ + 6) lowerGates(roundId);
    land.follow(shownZ);
  });

  drawStatus(sim.state);

  return {
    start: () => {
      audio.music('ride');
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
      powerBox.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as DragonRiderCommand),
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
