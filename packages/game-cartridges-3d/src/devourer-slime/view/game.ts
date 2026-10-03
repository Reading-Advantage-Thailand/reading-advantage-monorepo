/**
 * Devourer Slime 3D as a cartridge game. The core (../core) moves everyone in fixed steps; this
 * view grows the slime, floats the word bubbles, walks the guards, keeps every word readable
 * (tags pinned to the screen edge when off screen), and animates the gulps. It never decides a
 * rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createDevourerSlime, evidenceOf, scoreOf, type DevourerSlimeCommand, type DevourerSlimeEvent, type DevourerSlimeState } from '../core/index.js';
import { nextSteer } from '../qc/bot.js';
import { buildClearing, CLEARING_MODELS } from './clearing.js';

/** Model scale per unit of `size` (the slime model is 0.8 m wide; the rules' radius is 0.45 m x size). */
const SLIME_SCALE = 1.13;
const BUBBLE_COLORS = [0x8b5cf6, 0x3b82f6, 0x22c55e, 0xf59e0b, 0xef4444, 0x14b8a6, 0xec4899];

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  await stage.loader.preload(CLEARING_MODELS.map((n) => stage.loader.modelPath(n)));
  buildClearing(stage);
  const sim = createDevourerSlime(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the slime
  const slime = new Walker(stage.addActor(new Actor('slime', stage.loader.get(stage.loader.modelPath('slime'))!, stage.timeline)), 'walk', 14);
  let shownSize = 1;

  // ---------------------------------------------------------------- camera: pulls back as the slime grows
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const offset: [number, number, number] = [0, 0, 0];
  const aim = (): void => {
    const k = 1 + (shownSize - 1) * 0.35;
    offset[0] = 0;
    offset[1] = (compact() ? 7.4 : 7.0) * k;
    offset[2] = (compact() ? 6.2 : 7.4) * k;
  };
  aim();
  stage.setRig(new FollowRig(() => target, offset, [0, 0, -1.2], compact() ? 60 : 48, 4));
  stage.pose.pos.set(0, 8, 10);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-sentence></span></div>
    <div class="meter">${esc(t('size'))}<b data-size>1.0</b></div>
    <div class="meter power" data-power hidden></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const joystick = attachJoystick(hud.el, { hint: t('move'), change: (x, y) => loop.dispatch({ type: 'steer', x, z: y }) });

  audio.defineMood('meadow', { bpm: 100, chords: [[60, 64, 67], [57, 60, 64], [65, 69, 72], [67, 71, 74]], busy: false, drum: false });
  audio.defineSfx('munch', (s) => {
    s.tone(300, 0.12, 'square', 0.1, 0, 0.6);
    s.tone(420, 0.1, 'sine', 0.16, 0.08, 1.4);
  });
  audio.defineSfx('spit', (s) => {
    s.noise(0.2, 0.18, 2200);
    s.tone(520, 0.2, 'triangle', 0.1, 0, 0.6);
  });
  audio.defineSfx('gulp', (s) => {
    s.tone(160, 0.5, 'sine', 0.4, 0, 0.4);
    s.noise(0.3, 0.1, 600, 0.1);
  });

  // ---------------------------------------------------------------- bubbles and guards
  const bubbles = new Map<string, { mesh: THREE.Mesh; tag: HTMLElement }>();
  const guards = new Map<string, Walker>();
  const bubbleGeo = new THREE.SphereGeometry(0.32, 24, 16);

  function clearBubbles(): void {
    for (const b of bubbles.values()) {
      hud.unanchor(b.tag);
      b.mesh.removeFromParent();
      (b.mesh.material as THREE.Material).dispose();
    }
    bubbles.clear();
  }

  function startSentence(ev: Extract<DevourerSlimeEvent, { type: 'sentenceStarted' }>): void {
    clearBubbles();
    for (const b of ev.bubbles) {
      const color = BUBBLE_COLORS[b.index % BUBBLE_COLORS.length]!;
      const mesh = new THREE.Mesh(bubbleGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.45, transparent: true, opacity: 0.85, roughness: 0.2 }));
      mesh.position.set(b.x, 0.7, b.z);
      mesh.castShadow = true;
      stage.scene.add(mesh);
      const tag = document.createElement('div');
      tag.className = 'arena-tag';
      tag.textContent = b.word;
      hud.anchor(tag, () => stage.screenOfPoint(mesh.position.clone().add(new THREE.Vector3(0, 0.45, 0))), { pin: true });
      bubbles.set(b.id, { mesh, tag });
    }
    drawBar();
  }

  function addGuard(id: string, kind: string, x: number, z: number): void {
    const g = stage.loader.get(stage.loader.modelPath(kind)) ?? stage.loader.get(stage.loader.modelPath('guard'))!;
    const actor = stage.addActor(new Actor(kind, g, stage.timeline, { phase: Math.random() }));
    actor.placeAt(x, 0, z, 0);
    guards.set(id, new Walker(actor, 'walk', 10));
  }
  for (const g of sim.state.guards) addGuard(g.id, g.kind, g.x, g.z);

  function drawBar(): void {
    const s = sim.state;
    const sentence = s.shift[s.sentence];
    if (sentence) sentenceBar(bar, sentence.words, s.next, s.helper);
    for (const b of s.bubbles) {
      const view = bubbles.get(b.id);
      if (!view) continue;
      view.tag.classList.toggle('done', b.eaten);
      view.tag.classList.toggle('next', s.helper && b.index === s.next);
    }
    status.querySelector('[data-sentence]')!.textContent = t('sentence', { index: Math.min(s.sentence + 1, s.sentences), total: s.sentences });
    status.querySelector('[data-size]')!.textContent = s.slime.size.toFixed(1);
  }

  /** The power-up countdown in the HUD, and a gold glow on the slime that blinks in the last two seconds. */
  const powerEl = status.querySelector<HTMLElement>('[data-power]')!;
  let glowing = false;
  function drawPower(): void {
    const ms = sim.state.slime.poweredMs;
    powerEl.hidden = ms === 0;
    if (ms > 0) powerEl.textContent = t('power', { seconds: Math.ceil(ms / 1000) });
    const on = ms > 0 && (ms >= 2000 || Math.floor(ms / 150) % 2 === 0);
    if (on === glowing) return;
    glowing = on;
    for (const m of slime.actor.materials) {
      m.emissive.setRGB(on ? 1 : 0, on ? 0.8 : 0, on ? 0.15 : 0);
      m.emissiveIntensity = on ? 0.6 : 0;
    }
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const slimeTop = (): { x: number; y: number; visible: boolean } => stage.screenOf(slime.actor, 0.9);

  function handle(ev: DevourerSlimeEvent): void {
    switch (ev.type) {
      case 'sentenceStarted':
        startSentence(ev);
        break;
      case 'wordEaten': {
        const b = bubbles.get(ev.id);
        if (b) {
          const from = b.mesh.position.clone();
          const color = (b.mesh.material as THREE.MeshStandardMaterial).color.getHex();
          void stage.timeline.tween(0.2, (u) => b.mesh.position.lerpVectors(from, slime.actor.root.position.clone().add(new THREE.Vector3(0, 0.4, 0)), u)).then(() => {
            b.mesh.visible = false;
            void burst(stage, slime.actor.root.position.clone().add(new THREE.Vector3(0, 0.5, 0)), color, 10, 0.6);
          });
        }
        slime.play('attack', 1.6);
        audio.play('munch');
        audio.play('correct');
        hud.popup(slimeTop(), t('yum'), 'good');
        break;
      }
      case 'wordSpat':
        slime.play('spit', 1.4);
        audio.play('spit');
        hud.popup(slimeTop(), t('bleh'), 'miss');
        break;
      case 'slimeBumped': {
        slime.play('hit');
        stage.shake(0.05, 0.25);
        audio.play('hit');
        hud.popup(slimeTop(), t('oof'), 'miss');
        guards.get(ev.guardId)?.play('attack');
        break;
      }
      case 'powerStarted':
        audio.play('victory');
        hud.popup(slimeTop(), t('powerUp'), 'good');
        break;
      case 'powerEnded':
        hud.popup(slimeTop(), t('powerDown'), 'miss');
        break;
      case 'guardEaten': {
        const g = guards.get(ev.guardId);
        if (g) {
          // The guard is back at once under the same id: take it off the map before it shrinks away.
          guards.delete(ev.guardId);
          const a = g.actor;
          const from = a.root.position.clone();
          void stage.timeline
            .tween(0.35, (u) => {
              a.root.position.lerpVectors(from, slime.actor.root.position, u);
              a.root.scale.setScalar(1 - u);
            })
            .then(() => stage.removeActor(a));
        }
        slime.play('attack', 1.2);
        stage.shake(0.08, 0.35);
        audio.play('gulp');
        hud.popup(slimeTop(), t('gulp', { coins: ev.coins }), 'good');
        break;
      }
      case 'guardReturned':
        addGuard(ev.guardId, ev.kind, ev.x, ev.z);
        break;
      case 'sentenceComplete':
        audio.play('victory');
        break;
      case 'shiftComplete':
        void finish();
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
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<DevourerSlimeState, DevourerSlimeCommand, DevourerSlimeEvent>(sim, { render: (events) => events.forEach(handle) }, clock);

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    slime.update(dt, s.slime.x, s.slime.z);
    shownSize += (s.slime.size - shownSize) * (1 - Math.exp(-dt * 6));
    // A soft squash while it moves, and its size.
    const wobble = 1 + Math.sin(stageMs / 140) * 0.03;
    slime.actor.root.scale.set(shownSize * SLIME_SCALE * wobble, shownSize * SLIME_SCALE / wobble, shownSize * SLIME_SCALE * wobble);
    target.set(s.slime.x * 0.7, 0, s.slime.z * 0.8);
    aim();
    for (const g of s.guards) guards.get(g.id)?.update(dt, g.x, g.z);
    drawPower();
    for (const b of s.bubbles) {
      const view = bubbles.get(b.id);
      if (!view || b.eaten) continue;
      view.mesh.position.x += (b.x - view.mesh.position.x) * Math.min(1, dt * 10);
      view.mesh.position.z += (b.z - view.mesh.position.z) * Math.min(1, dt * 10);
      view.mesh.position.y = 0.7 + Math.sin(stageMs / 500 + b.index) * 0.12;
    }
  });

  drawBar();

  return {
    start: () => {
      audio.music('meadow');
      loop.start();
    },
    pause: () => undefined,
    resume: () => loop.reset(),
    resize: () => undefined,
    recompose: () => aim(),
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      loop.stop();
      joystick.dispose();
      clearBubbles();
      bubbleGeo.dispose();
      status.remove();
      bar.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as DevourerSlimeCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextSteer(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
