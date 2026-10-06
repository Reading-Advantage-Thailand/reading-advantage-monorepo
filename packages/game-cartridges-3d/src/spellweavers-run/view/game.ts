/**
 * Spellweaver's Run 3D as a cartridge game. The core (../core) moves the run in fixed steps; this
 * view runs the wizard down a road through the forest, raises the arches with the word orbs,
 * fills the sentence bar as words are collected, and opens a portal at the end. It reads the
 * core's state every frame and animates its events; it never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, hasThai, pips, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createSpellweaversRun, evidenceOf, scoreOf, TUNING, type SpellweaversCommand, type SpellweaversEvent, type SpellweaversState } from '../core/index.js';
import { nextChoice } from '../qc/bot.js';
import { buildLand, RUN_MODELS } from './land.js';
import { laneX, ORB_COLORS } from './land-plan.js';
import spellweavers_runCss from './spellweavers-run.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('spellweavers-run', spellweavers_runCss);

const ARCH_SCALE = 1.25;
const ORB_Y = 1.15;

interface Orb {
  arch: THREE.Object3D;
  ball: THREE.Mesh;
  tag: HTMLElement;
  x: number;
  z: number;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'wizard';
  await stage.loader.preload([...RUN_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const land = buildLand(stage);
  const sim = createSpellweaversRun(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const hero = stage.addActor(new Actor(heroId, heroGltf, stage.timeline));
  hero.placeAt(0, 0, 0, 180);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);
  let clip = '';
  let busyUntil = 0;
  const heroLoop = (name: string): void => {
    if (clip === name) return;
    clip = name;
    hero.loop(name, 0.15);
  };
  const heroPlay = (name: string, speed = 1): void => {
    if (!hero.has(name)) return;
    void hero.play(name, 0.5, speed);
    clip = '';
    busyUntil = stageMs + 900;
  };

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 3.9, 5.6] : [0, 3.5, 5.0], [0, 1.2, -9], compact() ? 62 : 52, 4);
  stage.setRig(rig());
  stage.pose.pos.set(0, 6, 10);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-spell></span></div>
    <div class="meter"><small>${esc(t('courage'))}</small><div class="courage-pips" data-courage></div></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const promptBox = document.createElement('div');
  promptBox.className = 'run-prompt hud-top';
  hud.el.append(promptBox);
  const spellEl = status.querySelector<HTMLElement>('[data-spell]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;

  function drawHud(): void {
    const s = sim.state;
    const sentence = s.sentences[Math.min(s.sentence, s.sentences.length - 1)];
    spellEl.textContent = t('sentence', { index: Math.min(s.sentence + 1, s.sentences.length), total: s.sentences.length });
    pips(courageEl, s.courage, TUNING.courage);
    if (!sentence) return;
    const prompt = sentence.translation ?? t('build');
    promptBox.innerHTML = `<small>${esc(t('next'))}</small><b class="${hasThai(prompt) ? 'th' : ''}">${esc(prompt)}</b><div class="sentence-bar" data-bar></div>`;
    sentenceBar(promptBox.querySelector<HTMLElement>('[data-bar]')!, sentence.words, s.word, s.helper);
  }

  // ---------------------------------------------------------------- sound
  audio.defineMood('run', { bpm: 116, chords: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [60, 64, 67]], busy: true, drum: false });
  audio.defineSfx('collect', (s) => [784, 988, 1319].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
  audio.defineSfx('cast', (s) => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
  audio.defineSfx('fizzle', (s) => s.noise(0.3, 0.12, 500));

  // ---------------------------------------------------------------- orbs
  const rows = new Map<string, Orb[]>();
  const archGltf = stage.loader.get(stage.loader.modelPath('arch'));

  function choose(lane: number): void {
    const s = sim.state;
    if (s.round && s.round.chosen === null && s.restMs <= 0 && lane >= 0 && lane < s.round.options.length) loop.dispatch({ type: 'choose', lane });
  }

  function raiseOrbs(roundId: string, options: readonly { text: string }[], at: number): void {
    const list = options.map((o, i): Orb => {
      const x = laneX(options.length, i);
      const arch = archGltf ? archGltf.scene.clone() : new THREE.Group();
      arch.scale.setScalar(ARCH_SCALE);
      arch.position.set(x, 0, -at);
      arch.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = true) : undefined));
      stage.scene.add(arch);
      const color = ORB_COLORS[i % ORB_COLORS.length]!;
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 24, 16),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 0.9, roughness: 0.3, transparent: true, opacity: 0.95 }),
      );
      ball.position.set(x, ORB_Y, -at);
      stage.scene.add(ball);
      const tag = document.createElement('button');
      tag.className = 'orb-tag';
      tag.dataset.lane = String(i);
      tag.textContent = o.text;
      tag.addEventListener('click', () => choose(i));
      // Tags show when the orbs come near (far away they would overlap).
      hud.anchor(tag, () => {
        const p = stage.screenOfPoint(new THREE.Vector3(x, 3.3, -at));
        return hero.root.position.z - -at > 38 ? { ...p, visible: false } : p;
      }, { keepX: true, spread: true });
      return { arch, ball, tag, x, z: -at };
    });
    rows.set(roundId, list);
  }

  function lowerOrbs(roundId: string): void {
    for (const o of rows.get(roundId) ?? []) {
      hud.unanchor(o.tag);
      o.arch.removeFromParent();
      o.ball.removeFromParent();
      o.ball.geometry.dispose();
      (o.ball.material as THREE.Material).dispose();
    }
    rows.delete(roundId);
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
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') choose(0);
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') choose(count - 1);
    if ((e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') && count === 3) choose(1);
  };
  window.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- events
  let steerX = 0;
  let finished = false;
  let portalDisc: THREE.Mesh | null = null;
  const heroPoint = (lift = 2.0) => stage.screenOfPoint(hero.root.position.clone().add(new THREE.Vector3(0, lift, 0)));

  function handle(ev: SpellweaversEvent): void {
    switch (ev.type) {
      case 'roundStarted':
        for (const id of [...rows.keys()]) if (id !== ev.roundId && (rows.get(id)?.[0]?.z ?? 0) === -ev.orbsAt) lowerOrbs(id);
        raiseOrbs(ev.roundId, ev.options, ev.orbsAt);
        steerX = 0;
        break;
      case 'waiting':
        for (const o of rows.get(ev.roundId) ?? []) o.tag.classList.add('pulse');
        break;
      case 'laneChosen': {
        const list = rows.get(ev.roundId) ?? [];
        list.forEach((o, i) => {
          o.tag.classList.remove('pulse');
          o.tag.classList.add(i === ev.correctLane && ev.correct ? 'right' : i === ev.lane ? 'wrong' : 'dim');
          const mat = o.ball.material as THREE.MeshStandardMaterial;
          if (i === ev.lane && !ev.correct) {
            mat.color.setHex(0x777777);
            mat.emissive.setHex(0x222222);
          }
          if (i !== ev.lane) mat.opacity = 0.35;
        });
        steerX = laneX(list.length, ev.lane);
        if (ev.correct) audio.play('correct');
        else {
          audio.play('fizzle');
          heroPlay('hit');
          stage.shake(0.05, 0.25);
          hud.popup(heroPoint(), t('again'), 'miss');
        }
        break;
      }
      case 'wordCollected': {
        const list = [...rows.values()].at(-1) ?? [];
        const orb = list.find((o) => Math.abs(o.x - steerX) < 0.1);
        if (orb) {
          void burst(stage, new THREE.Vector3(orb.x, ORB_Y, orb.z), 0xffe27a, 14, 1.0);
          orb.ball.visible = false;
        }
        audio.play('collect');
        hud.popup(heroPoint(), t('collected'), 'good');
        break;
      }
      case 'courageLost':
        break;
      case 'rested':
        hud.popup(heroPoint(), t('rested'), 'good');
        break;
      case 'sentenceCast':
        audio.play('cast');
        heroPlay('victory');
        void burst(stage, hero.root.position.clone().add(new THREE.Vector3(0, 1.4, -1)), 0xc9a7ff, 24, 1.8);
        void hud.banner.show(t('cast.title'), t('cast.text'), 1.2);
        break;
      case 'portalAppeared':
        portalDisc = land.portal(new THREE.Vector3(0, 0, -ev.at));
        void stage.timeline.tween(1.2, (u) => ((portalDisc!.material as THREE.MeshBasicMaterial).opacity = u * 0.85));
        void hud.banner.show(t('portal'), '', 1.4);
        break;
      case 'runComplete':
        void finish();
        break;
    }
    drawHud();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    heroLoop('idle');
    audio.music('calm');
    audio.play('victory');
    heroPlay('victory');
    void burst(stage, hero.root.position.clone().add(new THREE.Vector3(0, 1.6, -1)), 0xffe27a, 30, 2.2);
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<SpellweaversState, SpellweaversCommand, SpellweaversEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
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
    shownX += (steerX - shownX) * (1 - Math.exp(-dt * 6));
    hero.root.position.set(shownX, 0, shownZ);
    hero.yaw = 180 + (steerX - shownX) * -8;
    if (stageMs >= busyUntil) heroLoop(s.speed > 0.1 && !finished ? 'run' : 'idle');
    target.set(shownX * 0.5, 0, shownZ);
    // Orbs bob; rows behind the wizard go away.
    for (const [roundId, list] of rows) {
      for (const o of list) o.ball.position.y = ORB_Y + Math.sin(stageMs / 320 + o.x) * 0.08;
      if (list[0] && list[0].z > shownZ + 6) lowerOrbs(roundId);
    }
    land.follow(shownZ);
  });

  drawHud();

  return {
    start: () => {
      audio.music('run');
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
      for (const id of [...rows.keys()]) lowerOrbs(id);
      status.remove();
      promptBox.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as SpellweaversCommand),
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
