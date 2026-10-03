/**
 * Griffin Riders Escape 3D as a cartridge game. The core (../core) moves the flight in fixed
 * steps; this view flies the griffin (the fire dragon, tinted, with the student's hero on its
 * back) over the land, raises the word gates and the bat storms ahead, and fills the sentence bar
 * as words are collected. It reads the core's state every frame and animates its events; it never
 * decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, hasThai, pips, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, type GLTF } from '@reading-advantage/advantage-play-kit-3d/stage';
import { TUNING, createGriffinRidersEscape, evidenceOf, laneX, scoreOf, type EscapeCommand, type EscapeEvent, type EscapeState, type GateInfo } from '../core/index.js';
import { nextChoice } from '../qc/bot.js';
import { FLIGHT_HEIGHT, GATE_COLORS, GRIFFIN_TINT, SIZES } from './land-plan.js';
import { ESCAPE_MODELS, buildLand } from './land.js';
import griffin_riders_escapeCss from './griffin-riders-escape.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('griffin-riders-escape', griffin_riders_escapeCss);

/** Where the rider sits on the griffin, as a share of the griffin's height. */
const RIDER_LIFT = 0.5;
const RING_RADIUS = 1.55;

/** A model scale that makes the model's longest side `meters` long. */
function fitScale(gltf: GLTF, meters: number): number {
  const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
  return meters / Math.max(0.01, size.x, size.y, size.z);
}

interface Gate3D {
  lane: number;
  ring: THREE.Mesh;
  tag: HTMLButtonElement;
}

interface Storm3D {
  lane: number;
  bats: Actor[];
  cloud: THREE.Mesh;
}

interface Wave3D {
  id: string;
  z: number;
  gates: Gate3D[];
  storms: Storm3D[];
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...ESCAPE_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const land = buildLand(stage);
  const sim = createGriffinRidersEscape(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the griffin and its rider
  const dragonGltf = stage.loader.get(stage.loader.modelPath('dragon-fire'))!;
  const griffinScale = fitScale(dragonGltf, SIZES.griffin);
  const griffin = stage.addActor(new Actor('dragon-fire', dragonGltf, stage.timeline, { idle: 'fly', scale: griffinScale }));
  for (const m of griffin.materials) m.color.setHex(GRIFFIN_TINT);
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const heroHeight = new THREE.Box3().setFromObject(heroGltf.scene).getSize(new THREE.Vector3()).y || 1;
  const rider = stage.addActor(new Actor(heroId, heroGltf, stage.timeline, { scale: SIZES.rider / heroHeight }));
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => rider.setMap(tex)).catch(() => undefined);
  const griffinHeight = new THREE.Box3().setFromObject(dragonGltf.scene).getSize(new THREE.Vector3()).y * griffinScale;
  griffin.placeAt(sim.state.griffin.x, FLIGHT_HEIGHT, 0, 180);
  rider.placeAt(0, 0, 0, 180);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3(0, FLIGHT_HEIGHT, 0);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 2.6, 7.6] : [0, 2.2, 6.6], [0, -0.6, -14], compact() ? 66 : 56, 4);
  stage.setRig(rig());
  stage.pose.pos.set(0, 6, 10);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-sentence></span></div>
    <div class="meter"><small>${esc(t('courage'))}</small><div class="courage-pips" data-courage></div></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const promptBox = document.createElement('div');
  promptBox.className = 'escape-prompt';
  hud.el.append(promptBox);
  const sentenceEl = status.querySelector<HTMLElement>('[data-sentence]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;

  function drawHud(): void {
    const s = sim.state;
    const sentence = s.sentences[Math.min(s.sentence, s.sentences.length - 1)];
    sentenceEl.textContent = t('sentence', { index: Math.min(s.sentence + 1, s.sentences.length), total: s.sentences.length });
    pips(courageEl, s.courage, TUNING.courage);
    if (!sentence) return;
    const prompt = sentence.translation ?? t('build');
    promptBox.innerHTML = `<small>${esc(t('next'))}</small><b class="${hasThai(prompt) ? 'th' : ''}">${esc(prompt)}</b><div class="sentence-bar" data-bar></div>`;
    sentenceBar(promptBox.querySelector<HTMLElement>('[data-bar]')!, sentence.words, s.word, s.helper);
  }

  // ---------------------------------------------------------------- sound
  audio.defineMood('escape', { bpm: 124, chords: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [60, 64, 67]], busy: true, drum: false });
  audio.defineSfx('whoosh', (s) => s.noise(0.14, 0.06, 1800));
  audio.defineSfx('collect', (s) => [784, 988, 1319].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
  audio.defineSfx('cast', (s) => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
  audio.defineSfx('fizzle', (s) => s.noise(0.3, 0.12, 500));

  // ---------------------------------------------------------------- waves
  const batGltf = stage.loader.get(stage.loader.modelPath('giant-bat'))!;
  const batScale = fitScale(batGltf, SIZES.bat);
  const waves = new Map<string, Wave3D>();

  function goTo(lane: number): void {
    if (sim.state.phase === 'flight') loop.dispatch({ type: 'lane', lane });
  }

  function raiseGates(wave: Wave3D, z: number, gates: readonly GateInfo[]): void {
    for (const info of gates) {
      const x = laneX(info.lane);
      const color = GATE_COLORS[info.lane % GATE_COLORS.length]!;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(RING_RADIUS, 0.16, 14, 40),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.8, roughness: 0.3, transparent: true, opacity: 0.95 }),
      );
      ring.position.set(x, FLIGHT_HEIGHT, z);
      stage.scene.add(ring);
      const tag = document.createElement('button');
      tag.className = `gate-tag ${hasThai(info.text) ? 'th' : ''}`;
      tag.dataset.lane = String(info.lane);
      tag.textContent = info.text;
      tag.addEventListener('click', () => goTo(info.lane));
      // Tags show when the gates come near (far away they would overlap).
      hud.anchor(tag, () => {
        const p = stage.screenOfPoint(new THREE.Vector3(x, FLIGHT_HEIGHT + RING_RADIUS + 0.2, z));
        return target.z - z > 44 || z > target.z + 2 ? { ...p, visible: false } : p;
      });
      wave.gates.push({ lane: info.lane, ring, tag });
    }
  }

  function raiseStorm(wave: Wave3D, z: number, lanes: readonly number[]): void {
    lanes.forEach((lane, n) => {
      const x = laneX(lane);
      const cloud = new THREE.Mesh(new THREE.SphereGeometry(2.0, 18, 12), new THREE.MeshBasicMaterial({ color: 0x4a4a68, transparent: true, opacity: 0.55, depthWrite: false }));
      cloud.scale.set(1.4, 0.9, 1);
      cloud.position.set(x, FLIGHT_HEIGHT + 0.2, z);
      stage.scene.add(cloud);
      const bats = [-0.9, 0.9].map((dx, k) => {
        const bat = stage.addActor(new Actor('giant-bat', batGltf, stage.timeline, { idle: 'fly', scale: batScale, phase: (n + k) * 0.37 }));
        bat.placeAt(x + dx, FLIGHT_HEIGHT + (k ? 0.5 : -0.3), z, 0);
        return bat;
      });
      wave.storms.push({ lane, bats, cloud });
    });
  }

  function lowerWave(id: string): void {
    const wave = waves.get(id);
    if (!wave) return;
    for (const g of wave.gates) {
      hud.unanchor(g.tag);
      g.ring.removeFromParent();
      g.ring.geometry.dispose();
      (g.ring.material as THREE.Material).dispose();
    }
    for (const s of wave.storms) {
      for (const bat of s.bats) stage.removeActor(bat);
      s.cloud.removeFromParent();
      s.cloud.geometry.dispose();
      (s.cloud.material as THREE.Material).dispose();
    }
    waves.delete(id);
  }

  // Keys: arrows or A D steer, 1-3 pick a lane. A tap on the screen picks the lane under it; a swipe steers.
  const onKey = (e: KeyboardEvent): void => {
    if (/^[1-3]$/.test(e.key)) goTo(Number(e.key) - 1);
    else if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') loop.dispatch({ type: 'steer', dir: -1 });
    else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') loop.dispatch({ type: 'steer', dir: 1 });
  };
  window.addEventListener('keydown', onKey);
  let downX: number | null = null;
  hud.el.addEventListener('pointerdown', (e) => (downX = e.clientX));
  hud.el.addEventListener('pointerup', (e) => {
    if (downX === null) return;
    const dx = e.clientX - downX;
    downX = null;
    if ((e.target as HTMLElement).closest('button')) return;
    if (Math.abs(dx) > 50) loop.dispatch({ type: 'steer', dir: dx < 0 ? -1 : 1 });
    else goTo(Math.min(sim.state.laneCount - 1, Math.max(0, Math.floor((e.clientX / Math.max(1, hud.el.clientWidth)) * sim.state.laneCount))));
  });

  // ---------------------------------------------------------------- events
  let finished = false;
  let busyUntil = 0;
  const griffinPoint = (lift = 2.4) => stage.screenOfPoint(griffin.root.position.clone().add(new THREE.Vector3(0, lift, 0)));

  function handle(ev: EscapeEvent): void {
    switch (ev.type) {
      case 'waveMade': {
        const wave: Wave3D = { id: ev.waveId, z: -ev.z, gates: [], storms: [] };
        waves.set(ev.waveId, wave);
        if (ev.kind === 'gates') raiseGates(wave, -ev.z, ev.gates);
        else raiseStorm(wave, -ev.z, ev.stormLanes);
        break;
      }
      case 'laneChanged':
        audio.play('whoosh');
        break;
      case 'gatePassed': {
        const wave = waves.get(ev.waveId);
        for (const g of wave?.gates ?? []) {
          g.tag.classList.add(g.lane === ev.lane ? (ev.correct ? 'right' : 'wrong') : 'dim');
          const mat = g.ring.material as THREE.MeshStandardMaterial;
          if (g.lane === ev.lane && !ev.correct) {
            mat.color.setHex(0x777777);
            mat.emissive.setHex(0x222222);
          } else if (g.lane !== ev.lane) mat.opacity = 0.35;
          if (g.lane === ev.lane && ev.correct) void burst(stage, g.ring.position.clone(), 0xffe27a, 16, 1.2);
        }
        audio.play(ev.correct ? 'correct' : 'fizzle');
        break;
      }
      case 'wordCollected':
        audio.play('collect');
        hud.popup(griffinPoint(), t('collected'), 'good');
        break;
      case 'stormHit': {
        const wave = waves.get(ev.waveId);
        for (const s of wave?.storms ?? []) if (s.lane === ev.lane) void burst(stage, s.cloud.position.clone(), 0x9aa0b4, 16, 1.4);
        void griffin.play('hit', 0.5);
        busyUntil = stageMs + 900;
        stage.shake(0.06, 0.3);
        audio.play('fizzle');
        hud.popup(griffinPoint(), t('stormed'), 'miss');
        break;
      }
      case 'stormDodged':
        audio.play('whoosh');
        break;
      case 'courageLost':
        if (ev.cause === 'gate') {
          void griffin.play('hit', 0.5);
          busyUntil = stageMs + 900;
          stage.shake(0.04, 0.2);
          hud.popup(griffinPoint(), t('again'), 'miss');
        }
        break;
      case 'rested':
        hud.popup(griffinPoint(), t('rested'), 'good');
        break;
      case 'sentenceCast':
        audio.play('cast');
        void rider.play('victory');
        void burst(stage, griffin.root.position.clone().add(new THREE.Vector3(0, 1.4, -1)), 0xc9a7ff, 24, 1.8);
        void hud.banner.show(t('cast.title'), t('cast.text'), 1.2);
        break;
      case 'escapeComplete':
        void finish();
        break;
    }
    drawHud();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    audio.music('calm');
    audio.play('victory');
    void griffin.play('roar');
    void rider.play('victory');
    void burst(stage, griffin.root.position.clone().add(new THREE.Vector3(0, 1.6, -1)), 0xffe27a, 30, 2.2);
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<EscapeState, EscapeCommand, EscapeEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
  let shownZ = 0;
  let shownX = sim.state.griffin.x;

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    // Smooth the 30 Hz core position into the frame rate; bob, bank into a lane change.
    shownZ += (-s.distance - shownZ) * (1 - Math.exp(-dt * 18));
    shownX += (s.griffin.x - shownX) * (1 - Math.exp(-dt * 14));
    const bob = Math.sin(stageMs / 340) * 0.12;
    griffin.root.position.set(shownX, FLIGHT_HEIGHT + bob, shownZ);
    griffin.yaw = 180;
    griffin.root.rotation.z = THREE.MathUtils.clamp((s.griffin.x - shownX) * -0.12, -0.35, 0.35);
    rider.root.position.set(shownX, FLIGHT_HEIGHT + bob + griffinHeight * RIDER_LIFT, shownZ);
    rider.yaw = 180;
    if (stageMs >= busyUntil && s.phase === 'flight') griffin.loop('fly', 0.2);
    target.set(shownX * 0.6, FLIGHT_HEIGHT, shownZ);
    for (const [id, wave] of waves) {
      for (const g of wave.gates) g.ring.rotation.z = stageMs / 900;
      for (const st of wave.storms) st.cloud.position.y = FLIGHT_HEIGHT + 0.2 + Math.sin(stageMs / 400 + st.lane) * 0.15;
      if (wave.z > shownZ + 8) lowerWave(id);
    }
    land.follow(shownZ);
  });

  drawHud();

  return {
    start: () => {
      audio.music('escape');
      void griffin.play('roar', 0.5);
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
      window.removeEventListener('keydown', onKey);
      for (const id of [...waves.keys()]) lowerWave(id);
      status.remove();
      promptBox.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as EscapeCommand),
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
