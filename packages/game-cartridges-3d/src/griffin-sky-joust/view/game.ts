/**
 * Griffin Sky-Joust 3D as a cartridge game. The core (../core) moves the griffin and the riders
 * in fixed steps on a flat arena; this view seats that arena on a side-on stage with a sky, clouds,
 * and hills. The student's hero rides the griffin, every rider is a giant bat with its word on an
 * HTML tag, and the sentence fills in as the words are struck. It reads the core's state every
 * frame and animates its events; it never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, hasThai, pips, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig } from '@reading-advantage/advantage-play-kit-3d/stage';
import { ARENA, TUNING, createGriffinSkyJoust, evidenceOf, isTarget, scoreOf, type JoustCommand, type JoustEvent, type JoustState } from '../core/index.js';
import { nextCommand } from '../qc/bot.js';
import { GRIFFIN_MODEL, GRIFFIN_SEAT } from '../../shared/griffin.js';
import { buildSky, SCENE_MODELS, WORLD_H, worldX, worldY } from './scene.js';
import griffin_sky_joustCss from './griffin-sky-joust.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('griffin-sky-joust', griffin_sky_joustCss);

/** Model scales (the models are normalized; QC tunes these against the arena radii). */
const GRIFFIN_SCALE = 0.5;
const RIDER_SCALE = 0.8;
const HERO_SCALE = 0.34;
/** Where the hero stands on the griffin's back, in meters: [along the facing, up]. */
const SEAT: readonly [number, number] = [GRIFFIN_SEAT.forward * GRIFFIN_SCALE, GRIFFIN_SEAT.up * GRIFFIN_SCALE];
const FOV = 45;

interface RiderView {
  actor: Actor;
  tag: HTMLElement;
  x: number;
  y: number;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...SCENE_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const sky = buildSky(stage);
  const sim = createGriffinSkyJoust(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the griffin and its rider
  const griffin = stage.addActor(new Actor(GRIFFIN_MODEL, stage.loader.get(stage.loader.modelPath(GRIFFIN_MODEL))!, stage.timeline, { idle: 'fly', scale: GRIFFIN_SCALE }));
  griffin.placeAt(worldX(sim.state.griffin.x), worldY(sim.state.griffin.y), 0, 90);
  const hero = stage.addActor(new Actor(heroId, stage.loader.get(stage.loader.modelPath(heroId))!, stage.timeline, { scale: HERO_SCALE }));
  hero.placeAt(0, 0, 0, 90);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);
  let facing: 1 | -1 = 1;

  // ---------------------------------------------------------------- camera: the whole arena, side-on
  const target = new THREE.Vector3(0, WORLD_H / 2, 0);
  const rig = (): FollowRig => {
    const { width, height } = stage.size;
    const aspect = Math.max(0.3, width / Math.max(1, height));
    const tan = Math.tan((FOV * Math.PI) / 360);
    const need = Math.max((WORLD_H + 1.5) / (2 * tan), (ARENA.width / 40 + 1) / (2 * tan * aspect));
    return new FollowRig(() => target, [0, 0, need], [0, 0, 0], FOV, 8);
  };
  stage.setRig(rig());
  stage.pose.pos.set(0, WORLD_H / 2, 20);

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
  promptBox.className = 'joust-prompt hud-top';
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
    sentenceBar(promptBox.querySelector<HTMLElement>('[data-bar]')!, sentence.words, sentence.cleared ? sentence.words.length : s.word, s.helper);
  }

  // ---------------------------------------------------------------- sound
  audio.defineMood('joust', { bpm: 124, chords: [[60, 64, 67], [65, 69, 72], [62, 65, 69], [67, 71, 74]], busy: true, drum: false });
  audio.defineSfx('flap', (s) => s.noise(0.18, 0.1, 900));
  audio.defineSfx('strike', (s) => [660, 880, 1320].forEach((f, i) => s.tone(f, 0.2, 'triangle', 0.14, i * 0.05)));
  audio.defineSfx('cast', (s) => [523, 659, 784, 1047].forEach((f, i) => s.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
  audio.defineSfx('bump', (s) => s.noise(0.25, 0.14, 400));

  // ---------------------------------------------------------------- riders
  const riders = new Map<string, RiderView>();
  const batGltf = stage.loader.get(stage.loader.modelPath('giant-bat'))!;
  const struck = new Set<string>();

  function addRider(r: JoustState['riders'][number]): void {
    const actor = stage.addActor(new Actor('giant-bat', batGltf, stage.timeline, { idle: 'fly', scale: RIDER_SCALE, phase: Math.random() }));
    const x = worldX(r.x);
    const y = worldY(r.y);
    actor.placeAt(x, y, 0, r.vx > 0 ? 90 : -90);
    const tag = document.createElement('div');
    tag.className = 'rider-tag';
    tag.textContent = r.text;
    const view: RiderView = { actor, tag, x, y };
    hud.anchor(tag, () => stage.screenOfPoint(new THREE.Vector3(view.x, view.y + 1.0, 0)), { keepX: true, spread: true });
    riders.set(r.id, view);
  }

  function removeRider(id: string): void {
    const view = riders.get(id);
    if (!view) return;
    riders.delete(id);
    hud.unanchor(view.tag);
    if (struck.delete(id)) {
      void view.actor.play('death').done.then(() => stage.removeActor(view.actor));
      return;
    }
    stage.removeActor(view.actor);
  }

  function syncRiders(): void {
    const live = new Set(sim.state.riders.map((r) => r.id));
    for (const r of sim.state.riders) if (!riders.has(r.id)) addRider(r);
    for (const id of [...riders.keys()]) if (!live.has(id)) removeRider(id);
  }

  // ---------------------------------------------------------------- input: taps and keys
  function send(command: JoustCommand): void {
    if (sim.state.phase === 'playing' && sim.state.restMs <= 0) loop.dispatch(command);
  }
  // A tap flaps; the left or right third of the screen also slides that way.
  hud.el.addEventListener('pointerdown', (e) => {
    if ((e.target as HTMLElement).closest('button')) return;
    const box = hud.el.getBoundingClientRect();
    const u = (e.clientX - box.left) / Math.max(1, box.width);
    send({ type: 'flap', dir: u < 0.33 ? -1 : u > 0.67 ? 1 : 0 });
  });
  const held = new Set<string>();
  const dirOfHeld = (): -1 | 0 | 1 => ((held.has('ArrowRight') || held.has('d') ? 1 : 0) - (held.has('ArrowLeft') || held.has('a') ? 1 : 0)) as -1 | 0 | 1;
  const onKeyDown = (e: KeyboardEvent): void => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    held.add(key);
    if (e.repeat) return;
    if (key === ' ' || key === 'ArrowUp' || key === 'w') {
      e.preventDefault();
      send({ type: 'flap', dir: dirOfHeld() });
    }
  };
  const onKeyUp = (e: KeyboardEvent): void => void held.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key);
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);

  // ---------------------------------------------------------------- events
  let finished = false;
  let stageMs = 0;
  const griffinPoint = (lift = 1.0) => stage.screenOfPoint(new THREE.Vector3(griffin.root.position.x, griffin.root.position.y + lift, 0));

  function handle(ev: JoustEvent): void {
    switch (ev.type) {
      case 'sentenceStarted':
        syncRiders();
        break;
      case 'flapped':
        if (ev.dir !== 0) facing = ev.dir;
        audio.play('flap');
        break;
      case 'wordStruck': {
        struck.add(ev.riderId);
        void burst(stage, new THREE.Vector3(worldX(ev.x), worldY(ev.y), 0.3), 0xffe27a, 14, 1.0);
        audio.play('strike');
        void hero.play('victory', 0.5, 1.6);
        hud.popup(griffinPoint(1.4), t('struck'), 'good');
        break;
      }
      case 'bumped':
        audio.play('bump');
        void hero.play('hit', 0.5, 1.4);
        void griffin.play('hit', 0.5, 1.4);
        void griffin.flash(0xff4a3a, 0.4);
        stage.shake(0.06, 0.25);
        hud.popup(griffinPoint(1.4), ev.courage === 0 ? t('resting') : ev.strike ? t('wrong') : t('bump'), 'miss');
        break;
      case 'rested':
        hud.popup(griffinPoint(1.4), t('rested'), 'good');
        break;
      case 'sentenceDone':
        audio.play('cast');
        void burst(stage, griffin.root.position.clone().add(new THREE.Vector3(0, 0.6, 0.4)), 0xc9a7ff, 24, 1.8);
        void hud.banner.show(t('done.title'), t('done.text'), 1.1);
        break;
      case 'joustComplete':
        void finish();
        break;
    }
    syncRiders();
    drawHud();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    audio.music('calm');
    audio.play('victory');
    void hero.play('victory');
    void griffin.play('roar');
    void burst(stage, griffin.root.position.clone().add(new THREE.Vector3(0, 0.8, 0.4)), 0xffe27a, 30, 2.2);
    await hud.banner.show(t('finish.title'), t('finish.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<JoustState, JoustCommand, JoustEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
  let lastDriftMs = 0;
  const shown = { x: griffin.root.position.x, y: griffin.root.position.y };

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    // Slide-keys held: keep sliding (the core damps the speed).
    const d = dirOfHeld();
    if (d !== 0 && !finished && s.restMs <= 0 && stageMs - lastDriftMs >= 66) {
      lastDriftMs = stageMs;
      loop.dispatch({ type: 'drift', dir: d });
    }
    // Smooth the 30 Hz core into the frame rate; a wrap or a rest snaps.
    const gx = worldX(s.griffin.x);
    const gy = worldY(s.griffin.y);
    const k = 1 - Math.exp(-dt * 24);
    if (Math.abs(gx - shown.x) > 8 || s.restMs > 0) shown.x = gx;
    else shown.x += (gx - shown.x) * k;
    shown.y += (gy - shown.y) * k;
    if (Math.abs(s.griffin.vx) > 20) facing = s.griffin.vx > 0 ? 1 : -1;
    const bob = Math.sin(stageMs / 260) * 0.05;
    griffin.root.position.set(shown.x, shown.y + bob, 0);
    griffin.yaw = facing * 90;
    hero.root.position.set(shown.x + SEAT[0] * facing, shown.y + SEAT[1] + bob, 0);
    hero.yaw = facing * 90;
    // The griffin blinks while it is safe after a bump, and hides while it rests.
    griffin.root.visible = hero.root.visible = s.restMs > 0 ? Math.floor(stageMs / 200) % 2 === 0 : s.griffin.safeMs > 0 ? Math.floor(stageMs / 120) % 2 === 0 : true;
    for (const r of s.riders) {
      const view = riders.get(r.id);
      if (!view) continue;
      view.x += (worldX(r.x) - view.x) * k;
      view.y = worldY(r.y);
      view.actor.root.position.set(view.x, view.y, 0);
      view.actor.yaw = r.vx > 0 ? 90 : -90;
      view.tag.classList.toggle('next', s.helper && isTarget(s, r));
    }
    sky.update(dt);
  });

  drawHud();

  return {
    start: () => {
      audio.music('joust');
      loop.start();
    },
    pause: () => undefined,
    resume: () => loop.reset(),
    resize: () => stage.setRig(rig()),
    recompose: () => stage.setRig(rig()),
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      loop.stop();
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      for (const id of [...riders.keys()]) removeRider(id);
      status.remove();
      promptBox.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as JoustCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextCommand(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
