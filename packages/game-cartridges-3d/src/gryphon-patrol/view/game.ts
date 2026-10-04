/**
 * Gryphon Patrol 3D as a cartridge game. The core (../core) moves the sky in fixed steps; this
 * view shows the gryphon (the fire dragon, tinted, with the student's hero on its back), the bats
 * with their word banners, the shot, and the word orb over a forest, and fills the sentence bar as
 * words are collected. It reads the core's state every frame and animates its events; it never
 * decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, hasThai, pips, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, type CameraPose, type CameraRig, type GLTF } from '@reading-advantage/advantage-play-kit-3d/stage';
import { SKY, TUNING, createGryphonPatrol, evidenceOf, scoreOf, type PatrolCommand, type PatrolEvent, type PatrolState } from '../core/index.js';
import { nextChoice } from '../qc/bot.js';
import { BAT_COLORS, GRYPHON_TINT, SIZES } from './sky-plan.js';
import { SKY_MODELS, buildSky } from './sky.js';
import gryphon_patrolCss from './gryphon-patrol.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('gryphon-patrol', gryphon_patrolCss);

/** Where the rider sits on the gryphon, as a share of the gryphon's height, and the rider's facing offset. */
const RIDER_LIFT = 0.5;
const SHOT_COLOR = 0xffa23a;

interface Bat {
  id: string;
  roundId: string;
  actor: Actor;
  tag: HTMLButtonElement;
  /** True once the bat flies away or falls; the frame loop leaves it alone. */
  leaving: boolean;
  shownX: number;
  shownY: number;
}

/** A model scale that makes the model's longest side `meters` long. */
function fitScale(gltf: GLTF, meters: number): number {
  const size = new THREE.Box3().setFromObject(gltf.scene).getSize(new THREE.Vector3());
  return meters / Math.max(0.01, size.x, size.y, size.z);
}

/** The camera looks at the whole sky from the front; a tall screen backs off to keep the sky wide. */
class SkyRig implements CameraRig {
  constructor(private readonly size: () => { width: number; height: number }, private readonly stretch: () => number) {}

  update(_dt: number, pose: CameraPose): void {
    const { width, height } = this.size();
    const aspect = Math.max(0.2, width / Math.max(1, height));
    const vfov = 50;
    const halfWidth = Math.tan((vfov * Math.PI) / 360) * aspect;
    const d = Math.max(13, (SKY.width / 2 + 1.6) / halfWidth);
    const mid = (SKY.height / 2 + 0.4) * this.stretch();
    pose.pos.set(0, mid + 1.2, d);
    pose.look.set(0, mid, 0);
    pose.fov = vfov;
  }
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...SKY_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const sky = buildSky(stage);
  const sim = createGryphonPatrol(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  /** Tall screens spread the sky out vertically (positions only; the models keep their shape). */
  const stretch = (): number => {
    const { width, height } = stage.size;
    return width / Math.max(1, height) < 1 ? 1.7 : 1;
  };
  const wx = (x: number): number => x - SKY.width / 2;
  const wy = (y: number): number => y * stretch();

  // ---------------------------------------------------------------- the gryphon and its rider
  const dragonGltf = stage.loader.get(stage.loader.modelPath('dragon-fire'))!;
  const gryphonScale = fitScale(dragonGltf, SIZES.gryphon);
  const gryphon = stage.addActor(new Actor('dragon-fire', dragonGltf, stage.timeline, { idle: 'fly', scale: gryphonScale }));
  for (const m of gryphon.materials) m.color.setHex(GRYPHON_TINT);
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const heroHeight = new THREE.Box3().setFromObject(heroGltf.scene).getSize(new THREE.Vector3()).y || 1;
  const rider = stage.addActor(new Actor(heroId, heroGltf, stage.timeline, { scale: SIZES.rider / heroHeight }));
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => rider.setMap(tex)).catch(() => undefined);
  const gryphonHeight = new THREE.Box3().setFromObject(dragonGltf.scene).getSize(new THREE.Vector3()).y * gryphonScale;
  gryphon.placeAt(wx(sim.state.gryphon.x), wy(sim.state.gryphon.y), 1, 90);
  rider.placeAt(0, 0, 1, 90);

  // ---------------------------------------------------------------- camera
  stage.setRig(new SkyRig(() => stage.size, stretch));
  stage.pose.pos.set(0, 8, 24);

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
  promptBox.className = 'patrol-prompt';
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
  audio.defineMood('patrol', { bpm: 112, chords: [[62, 66, 69], [67, 71, 74], [64, 67, 71], [69, 73, 76]], busy: true, drum: false });
  audio.defineSfx('shoot', (s) => s.noise(0.18, 0.12, 1400));
  audio.defineSfx('collect', (s) => [784, 988, 1319].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
  audio.defineSfx('cast', (s) => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
  audio.defineSfx('fizzle', (s) => s.noise(0.3, 0.12, 500));

  // ---------------------------------------------------------------- bats
  const batGltf = stage.loader.get(stage.loader.modelPath('giant-bat'))!;
  const batScale = fitScale(batGltf, SIZES.bat);
  const bats = new Map<string, Bat>();
  let orbMesh: THREE.Mesh | null = null;
  let shotMesh: THREE.Mesh | null = null;

  function shoot(enemy: string): void {
    const s = sim.state;
    if (s.round && s.round.stage === 'aim' && s.restMs <= 0) loop.dispatch({ type: 'shoot', enemy });
  }

  function raiseBats(roundId: string, enemies: readonly { id: string; text: string }[]): void {
    const round = sim.state.round;
    enemies.forEach((info, i) => {
      const core = round?.id === roundId ? round.enemies.find((e) => e.id === info.id) : undefined;
      const actor = stage.addActor(new Actor('giant-bat', batGltf, stage.timeline, { idle: 'fly', scale: batScale, phase: i * 0.37 }));
      const color = new THREE.Color(BAT_COLORS[i % BAT_COLORS.length]!);
      for (const m of actor.materials) m.color.lerp(color, 0.35);
      const x = wx(core?.x ?? 0);
      const y = wy(core?.y ?? 5);
      actor.placeAt(x, y, 0, 180);
      const tag = document.createElement('button');
      tag.className = `bat-tag ${hasThai(info.text) ? 'th' : ''}`;
      tag.dataset.enemy = info.id;
      tag.dataset.slot = String(i);
      tag.textContent = info.text;
      tag.addEventListener('click', () => shoot(info.id));
      const bat: Bat = { id: info.id, roundId, actor, tag, leaving: false, shownX: x, shownY: y };
      hud.anchor(tag, () => stage.screenOfPoint(new THREE.Vector3(actor.root.position.x, actor.root.position.y + 1.7, 0)));
      bats.set(`${roundId}:${info.id}`, bat);
    });
  }

  function dropBat(key: string): void {
    const bat = bats.get(key);
    if (!bat) return;
    hud.unanchor(bat.tag);
    stage.removeActor(bat.actor);
    bats.delete(key);
  }

  /** Sends a bat away (up and off to the side), then removes it. */
  function flee(key: string): void {
    const bat = bats.get(key);
    if (!bat || bat.leaving) return;
    bat.leaving = true;
    const from = bat.actor.root.position.clone();
    const side = from.x < 0 ? -1 : 1;
    bat.actor.yaw = side < 0 ? -90 : 90;
    void stage.timeline.tween(0.9, (u) => bat.actor.root.position.set(from.x + side * 7 * u, from.y + 5 * u, 0)).then(() => dropBat(key));
  }

  // Keys: 1-4 shoot the bat in that banner slot; arrows or WASD fly the gryphon.
  const onKey = (e: KeyboardEvent): void => {
    const s = sim.state;
    const round = s.round;
    if (/^[1-4]$/.test(e.key) && round && Number(e.key) <= round.enemies.length) {
      const enemy = round.enemies[Number(e.key) - 1]!;
      if (enemy.alive) shoot(enemy.id);
      return;
    }
    const dx = e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A' ? -1.5 : e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D' ? 1.5 : 0;
    const dy = e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W' ? 1.2 : e.key === 'ArrowDown' || e.key === 's' || e.key === 'S' ? -1.2 : 0;
    if (dx || dy) loop.dispatch({ type: 'moveTo', x: s.gryphon.toX + dx, y: s.gryphon.toY + dy });
  };
  window.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- events
  let finished = false;
  let busyUntil = 0;
  const gryphonPoint = (lift = 1.6) => stage.screenOfPoint(gryphon.root.position.clone().add(new THREE.Vector3(0, lift, 0)));
  const keyOf = (roundId: string, id: string): string => `${roundId}:${id}`;

  function handle(ev: PatrolEvent): void {
    switch (ev.type) {
      case 'roundStarted':
        for (const key of [...bats.keys()]) dropBat(key);
        raiseBats(ev.roundId, ev.enemies);
        break;
      case 'shotFired': {
        audio.play('shoot');
        void gryphon.play('attack', 0.4, 1.6);
        busyUntil = stageMs + 700;
        const mat = new THREE.MeshBasicMaterial({ color: SHOT_COLOR, transparent: true, opacity: 0.95 });
        shotMesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 16, 12), mat);
        const glow = new THREE.Mesh(new THREE.SphereGeometry(0.55, 16, 12), new THREE.MeshBasicMaterial({ color: SHOT_COLOR, transparent: true, opacity: 0.3, depthWrite: false }));
        shotMesh.add(glow);
        stage.scene.add(shotMesh);
        break;
      }
      case 'enemyHit': {
        if (shotMesh) {
          shotMesh.removeFromParent();
          shotMesh = null;
        }
        const pick = bats.get(keyOf(ev.roundId, ev.enemy));
        for (const [key, bat] of bats) {
          if (bat.roundId !== ev.roundId) continue;
          bat.tag.classList.remove('dim');
          bat.tag.classList.add(bat.id === ev.enemy ? (ev.correct ? 'right' : 'wrong') : 'dim');
          if (bat.id !== ev.enemy) flee(key);
        }
        if (pick) {
          void burst(stage, pick.actor.root.position.clone(), ev.correct ? 0xffe27a : 0x9aa0b4, 16, 1.4);
          pick.leaving = true;
          void pick.actor.play(ev.correct ? 'death' : 'hit');
          void stage.timeline.wait(0.8).then(() => dropBat(keyOf(ev.roundId, ev.enemy)));
        }
        audio.play(ev.correct ? 'correct' : 'fizzle');
        if (ev.correct) hud.popup(gryphonPoint(2.4), t('right'), 'good');
        break;
      }
      case 'orbDropped': {
        const mat = new THREE.MeshStandardMaterial({ color: 0xffd84a, emissive: 0xffc83e, emissiveIntensity: 1, roughness: 0.3, transparent: true, opacity: 0.95 });
        orbMesh = new THREE.Mesh(new THREE.SphereGeometry(0.5, 24, 16), mat);
        orbMesh.position.set(wx(ev.x), wy(ev.y), 0.4);
        stage.scene.add(orbMesh);
        break;
      }
      case 'wordCollected':
        if (orbMesh) {
          void burst(stage, orbMesh.position.clone(), 0xffe27a, 14, 1.2);
          orbMesh.removeFromParent();
          orbMesh.geometry.dispose();
          (orbMesh.material as THREE.Material).dispose();
          orbMesh = null;
        }
        audio.play('collect');
        hud.popup(gryphonPoint(), t('collected'), 'good');
        break;
      case 'courageLost':
        void gryphon.play('hit', 0.5);
        busyUntil = stageMs + 900;
        stage.shake(0.05, 0.25);
        hud.popup(gryphonPoint(), t('again'), 'miss');
        break;
      case 'rested':
        hud.popup(gryphonPoint(), t('rested'), 'good');
        break;
      case 'sentenceCast':
        audio.play('cast');
        void rider.play('victory');
        void burst(stage, gryphon.root.position.clone().add(new THREE.Vector3(0, 1.4, 1)), 0xc9a7ff, 24, 1.8);
        void hud.banner.show(t('cast.title'), t('cast.text'), 1.2);
        break;
      case 'patrolComplete':
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
    void gryphon.play('roar');
    void rider.play('victory');
    void burst(stage, gryphon.root.position.clone().add(new THREE.Vector3(0, 1.6, 1)), 0xffe27a, 30, 2.2);
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<PatrolState, PatrolCommand, PatrolEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
  let gx = wx(sim.state.gryphon.x);
  let gy = wy(sim.state.gryphon.y);

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    const ease = 1 - Math.exp(-dt * 14);
    // The gryphon: smooth the 30 Hz core position into the frame rate, bob, face its flight.
    gx += (wx(s.gryphon.x) - gx) * ease;
    gy += (wy(s.gryphon.y) - gy) * ease;
    const bob = Math.sin(stageMs / 340) * 0.12;
    gryphon.root.position.set(gx, gy + bob, 1);
    gryphon.yaw = s.gryphon.facing > 0 ? 90 : -90;
    gryphon.root.rotation.z = THREE.MathUtils.clamp((wx(s.gryphon.toX) - gx) * -0.04, -0.2, 0.2);
    rider.root.position.set(gx, gy + bob + gryphonHeight * RIDER_LIFT, 1);
    rider.yaw = gryphon.yaw;
    if (stageMs >= busyUntil && s.phase === 'patrol') gryphon.loop('fly', 0.2);
    // The bats: smooth to the core's loops (the bats of the open round only).
    const round = s.round;
    for (const bat of bats.values()) {
      if (bat.leaving) continue;
      const core = round && round.id === bat.roundId ? round.enemies.find((e) => e.id === bat.id) : undefined;
      if (!core) continue;
      const nx = wx(core.x);
      const ny = wy(core.y);
      bat.actor.yaw = nx < bat.shownX - 0.001 ? -90 : nx > bat.shownX + 0.001 ? 90 : bat.actor.yaw;
      bat.shownX += (nx - bat.shownX) * ease;
      bat.shownY += (ny - bat.shownY) * ease;
      bat.actor.root.position.set(bat.shownX, bat.shownY, 0);
    }
    if (shotMesh && s.shot) shotMesh.position.set(wx(s.shot.x), wy(s.shot.y), 0.6);
    if (orbMesh && s.orb) orbMesh.position.set(wx(s.orb.x), wy(s.orb.y) + Math.sin(stageMs / 260) * 0.12, 0.4);
    sky.drift(stageMs / 1000);
  });

  drawHud();

  return {
    start: () => {
      audio.music('patrol');
      void gryphon.play('roar', 0.5);
      loop.start();
    },
    pause: () => undefined,
    resume: () => loop.reset(),
    resize: () => undefined,
    recompose: () => stage.setRig(new SkyRig(() => stage.size, stretch)),
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      loop.stop();
      window.removeEventListener('keydown', onKey);
      for (const key of [...bats.keys()]) dropBat(key);
      shotMesh?.removeFromParent();
      orbMesh?.removeFromParent();
      status.remove();
      promptBox.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as PatrolCommand),
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
