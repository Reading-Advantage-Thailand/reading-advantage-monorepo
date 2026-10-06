/**
 * Hero vs. Zombie 3D as a cartridge game. The core (../core) runs the night in fixed steps; this
 * view builds the churchyard, walks the hero and the zombies to the core's positions, floats the
 * light orbs with their meanings (pinned to the screen edge when off screen), and plays the
 * Blast and the dawn. It never decides a rule. With an answer audio controller (Read to Select
 * Audio), the banner shows the meaning, the orbs carry numbers and play the English words, and a
 * row of "n 🔊" controls plays them from afar (../../shared/answer-audio.ts).
 */
import * as THREE from 'three';
import { toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, hasThai } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, isAvatarBody, playerBody, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import { correctOrbOf, createHeroVsZombie, evidenceOf, scoreOf, type HeroVsZombieCommand, type HeroVsZombieEvent, type HeroVsZombieState, type HeroVsZombieInput } from '../core/index.js';
import { manifest } from '../manifest.js';
import { createAnswerAudioDriver, type ChoiceAction } from '../../shared/answer-audio.js';
import { evidenceStoryOf } from '../../shared/challenge.js';
import { nextCommand } from '../qc/bot.js';
import { buildChurchyard, CHURCHYARD_MODELS } from './churchyard.js';
import hero_vs_zombieCss from './hero-vs-zombie.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('hero-vs-zombie', hero_vs_zombieCss);

const ORB_COLOR = 0xfff1a8;

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  // A practice input, or a class challenge's APK vocabulary input.
  const input = ctx.input as HeroVsZombieInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  // The student's avatar (or the fixed hero) loads with the scene; an avatar needs no hero model.
  const [, heroBody] = await Promise.all([
    stage.loader.preload([...CHURCHYARD_MODELS, ...(ctx.options.avatar ? [] : [heroId])].map((n) => stage.loader.modelPath(n))),
    playerBody(stage.loader, ctx.options.avatar, heroId, ctx.diagnostic),
  ]);
  const yard = buildChurchyard(stage);
  const answer = ctx.answerAudio ? createAnswerAudioDriver(ctx.answerAudio, ctx.diagnostic) : null;
  const sim = createHeroVsZombie(input, { seed: ctx.seed, helper: ctx.options.helper, answerAudio: !!answer });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const hero = new Walker(stage.addActor(new Actor(heroId, heroBody, stage.timeline)), 'run');
  hero.actor.placeAt(sim.state.hero.x, 0, sim.state.hero.z, 180);
  const look = isAvatarBody(heroBody) ? undefined : ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.actor.setMap(tex)).catch(() => undefined);
  // A soft light that follows the hero, so the hero never stands in the dark.
  const heroLight = new THREE.PointLight(0xfff0c8, 6, 6, 1.6);
  stage.scene.add(heroLight);
  // Answer audio: a bubble of light while the first clip of a round shields the hero.
  const shieldGeo = new THREE.SphereGeometry(0.9, 24, 16);
  const shield = new THREE.Mesh(shieldGeo, new THREE.MeshBasicMaterial({ color: 0xbfe8ff, transparent: true, opacity: 0, depthWrite: false }));
  stage.scene.add(shield);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 7.8, 6.2] : [0, 7.6, 7.6], [0, 0, -1.2], compact() ? 60 : 48, 5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 8, 10);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-round></span></div>
    <div class="meter">🪙<b data-coins>0</b></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const targetBox = document.createElement('div');
  targetBox.className = 'hvz-target hud-top';
  hud.el.append(targetBox);
  const blastButton = document.createElement('button');
  blastButton.className = 'blast-button';
  hud.el.append(blastButton);
  blastButton.addEventListener('click', () => loop.dispatch({ type: 'blast' }));
  const onKey = (e: KeyboardEvent): void => {
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      loop.dispatch({ type: 'blast' });
    }
  };
  window.addEventListener('keydown', onKey);
  const joystick = attachJoystick(hud.el, { hint: t('move'), change: (x, y) => loop.dispatch({ type: 'steer', x, z: y }) });
  // Answer audio: one "n 🔊" control per orb of the round, in the orbs' number order.
  const listenRow = document.createElement('div');
  listenRow.className = 'hvz-listen';
  if (answer) hud.el.append(listenRow);

  audio.defineMood('night', { bpm: 88, chords: [[57, 60, 64], [53, 57, 60], [52, 55, 59], [50, 53, 57]], busy: false, drum: true });
  audio.defineMood('dawn', { bpm: 96, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], busy: true, drum: false });
  audio.defineSfx('light', (s) => [880, 1319, 1760].forEach((f, i) => s.tone(f, 0.3, 'sine', 0.14, i * 0.05)));
  audio.defineSfx('boom', (s) => {
    s.tone(90, 0.6, 'sine', 0.6, 0, 0.5);
    s.noise(0.5, 0.35, 900);
  });
  audio.defineSfx('groan', (s) => s.tone(130, 0.7, 'sawtooth', 0.06, 0, 0.8));

  // ---------------------------------------------------------------- orbs and zombies
  const orbs = new Map<string, { mesh: THREE.Mesh; tag: HTMLElement }>();
  const zombies = new Map<string, Walker>();
  const orbGeo = new THREE.SphereGeometry(0.34, 24, 16);

  function clearOrbs(): void {
    for (const o of orbs.values()) {
      hud.unanchor(o.tag);
      o.mesh.removeFromParent();
      (o.mesh.material as THREE.Material).dispose();
    }
    orbs.clear();
  }

  function showRound(ev: Extract<HeroVsZombieEvent, { type: 'roundStarted' }>): void {
    clearOrbs();
    targetBox.innerHTML = answer
      ? `<small>${esc(t('findWord'))}</small><b class="${hasThai(ev.translation) ? 'th' : ''}">${esc(ev.translation)}</b>`
      : `<small>${esc(t('find'))}</small><b>${esc(ev.term)}</b>`;
    if (answer) {
      answer.question(ev.position, ev.orbs.map((o) => o.position));
      listenRow.replaceChildren(
        ...ev.orbs.map((o, i) => {
          const b = document.createElement('button');
          b.textContent = `${i + 1} 🔊`;
          b.setAttribute('aria-label', t('listen', { index: i + 1 }));
          b.dataset.orb = o.id;
          b.addEventListener('click', () => react(o.id, answer.listen(o.position)));
          return b;
        }),
      );
    }
    ev.orbs.forEach((o, i) => {
      const mesh = new THREE.Mesh(orbGeo, new THREE.MeshStandardMaterial({ color: ORB_COLOR, emissive: ORB_COLOR, emissiveIntensity: 0.9, transparent: true, opacity: 0.9 }));
      mesh.position.set(o.x, 0.75, o.z);
      stage.scene.add(mesh);
      const tag = document.createElement('div');
      const text = answer ? String(i + 1) : o.text;
      tag.className = `arena-tag ${hasThai(text) ? 'th' : ''}`;
      tag.textContent = text;
      hud.anchor(tag, () => stage.screenOfPoint(mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0))), { pin: true });
      orbs.set(o.id, { mesh, tag });
    });
    drawStatus();
    drawListen();
  }

  /** The look of each "n 🔊" control (the controller tells when a clip plays, is heard, or failed). */
  function drawListen(): void {
    if (!answer) return;
    for (const b of listenRow.querySelectorAll<HTMLButtonElement>('button')) {
      const orb = sim.state.orbs.find((o) => o.id === b.dataset.orb);
      b.dataset.look = orb ? answer.look(orb.position) : 'used';
    }
  }

  /** What a touch or a 🔊 press did: take the orb, shield the hero at a first clip, or ask for sound. */
  function react(orbId: string, action: ChoiceAction): void {
    if (action.kind === 'confirm') loop.dispatch({ type: 'take', orbId });
    else if (action.kind === 'play') loop.dispatch({ type: 'listen' });
    else if (action.kind === 'muted') hud.popup(heroTop(), t('soundOff'), 'miss');
    drawListen();
  }

  /** Answer audio: the hero entered an orb; the first touch plays it, a touch after its clip takes it. */
  function touchOrb(orbId: string): void {
    const orb = sim.state.orbs.find((o) => o.id === orbId);
    if (answer && orb) react(orbId, answer.touch(orb.position));
  }

  function addZombie(id: string, x: number, z: number): void {
    const old = zombies.get(id);
    if (old) stage.removeActor(old.actor);
    const actor = stage.addActor(new Actor('zombie', stage.loader.get(stage.loader.modelPath('zombie'))!, stage.timeline, { phase: Math.random() }));
    actor.placeAt(x, 0, z, 0);
    actor.hold('rise');
    void actor.play('rise', 0.5, 1.2);
    zombies.set(id, new Walker(actor, 'walk', 10));
  }

  function drawStatus(): void {
    const s = sim.state;
    status.querySelector('[data-round]')!.textContent = t('round', { index: Math.min(s.roundIndex + 1, Math.max(1, s.total)), total: s.total });
    status.querySelector('[data-coins]')!.textContent = String(s.coins);
    blastButton.innerHTML = `${esc(t('blast'))}<b>${'✦'.repeat(s.charges) || '·'}</b>`;
    blastButton.disabled = s.charges <= 0;
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const heroTop = (): { x: number; y: number; visible: boolean } => stage.screenOf(hero.actor, 1.4);

  function handle(ev: HeroVsZombieEvent): void {
    switch (ev.type) {
      case 'roundStarted':
        showRound(ev);
        break;
      case 'orbTouched':
        touchOrb(ev.id);
        break;
      case 'heroShielded':
        hud.popup(heroTop(), t('shield'), 'good');
        break;
      case 'orbTaken': {
        const o = orbs.get(ev.id);
        if (o) void burst(stage, o.mesh.position.clone(), ORB_COLOR, 16, 1.0);
        clearOrbs();
        audio.play('light');
        audio.play('correct');
        hud.popup(heroTop(), t('light'), 'good');
        break;
      }
      case 'orbWrong': {
        const o = orbs.get(ev.id);
        if (o) void burst(stage, o.mesh.position.clone(), 0x7788aa, 10, 0.6);
        audio.play('wrong');
        hud.popup(heroTop(), t('wrong'), 'miss');
        break;
      }
      case 'orbsMoved':
        for (const m of ev.orbs) {
          const o = orbs.get(m.id);
          if (!o) continue;
          const from = o.mesh.position.clone();
          const to = new THREE.Vector3(m.x, 0.75, m.z);
          void stage.timeline.tween(0.5, (u) => o.mesh.position.lerpVectors(from, to, u * u * (3 - 2 * u)));
        }
        break;
      case 'wordReturns':
        hud.popup(heroTop(), t('again'), 'miss');
        break;
      case 'zombieRose':
        addZombie(ev.zombieId, ev.x, ev.z);
        audio.play('groan');
        break;
      case 'heroBumped':
        hero.play('hit');
        zombies.get(ev.zombieId)?.play('attack');
        stage.shake(0.06, 0.3);
        audio.play('hit');
        hud.popup(heroTop(), t('bump'), 'miss');
        break;
      case 'blast': {
        hero.play('attack', 1.4);
        stage.shake(0.12, 0.5);
        audio.play('boom');
        const at = heroTop();
        const ring = document.createElement('div');
        ring.className = 'blast-ring';
        ring.style.left = `${at.x}px`;
        ring.style.top = `${at.y + 40}px`;
        hud.el.append(ring);
        void stage.timeline.wait(0.7).then(() => ring.remove());
        void burst(stage, hero.actor.root.position.clone().add(new THREE.Vector3(0, 0.6, 0)), 0xffe28a, 24, 3.5);
        for (const id of ev.knocked) zombies.get(id)?.play('death', 1.6);
        break;
      }
      case 'dawn':
        clearOrbs();
        targetBox.style.display = 'none';
        listenRow.remove();
        audio.music('dawn');
        void stage.timeline.tween(2.2, (u) => yard.setDawn(u));
        for (const z of zombies.values()) {
          z.play('death');
          const a = z.actor;
          void stage.timeline.wait(1.2).then(() => stage.timeline.tween(0.8, (u) => a.root.scale.setScalar(1 - u)));
        }
        void hud.banner.show(t('dawn.title'), t('dawn.text'), 2.0);
        break;
      case 'nightComplete':
        void finish();
        break;
    }
    drawStatus();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    joystick.dispose();
    audio.play('victory');
    hero.play('victory');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, evidenceStoryOf(input, manifest.levels), ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<HeroVsZombieState, HeroVsZombieCommand, HeroVsZombieEvent>(sim, { render: (events) => events.forEach(handle) }, clock);

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    hero.update(dt, s.hero.x, s.hero.z);
    heroLight.position.set(hero.actor.root.position.x, 2.2, hero.actor.root.position.z + 0.6);
    shield.position.set(hero.actor.root.position.x, 0.8, hero.actor.root.position.z);
    (shield.material as THREE.MeshBasicMaterial).opacity = s.hero.shieldMs > 0 ? 0.18 + 0.06 * Math.sin(stageMs / 120) : 0;
    target.set(s.hero.x * 0.6, 0, s.hero.z);
    for (const z of s.zombies) {
      const w = zombies.get(z.id);
      if (w && z.downMs <= 0) w.update(dt, z.x, z.z);
    }
    for (const o of s.orbs) {
      const view = orbs.get(o.id);
      if (view) view.mesh.position.y = 0.75 + Math.sin(stageMs / 420 + o.x) * 0.12;
    }
  });

  drawStatus();
  const stopListen = answer?.onChange(drawListen);

  return {
    start: () => {
      audio.music('night');
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
      stopListen?.();
      clearOrbs();
      orbGeo.dispose();
      shield.removeFromParent();
      shieldGeo.dispose();
      (shield.material as THREE.Material).dispose();
      listenRow.remove();
      status.remove();
      targetBox.remove();
      blastButton.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as HeroVsZombieCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach(handle);
      },
      auto: () => {
        if (answer && listenFirst()) return true;
        const command = nextCommand(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };

  /**
   * The QC bot in answer audio: it stands still and plays the right orb from afar with its 🔊
   * control until the clip was heard, then runs to the orb, and the touch takes it.
   */
  function listenFirst(): boolean {
    const orb = correctOrbOf(sim.state);
    if (!answer || !orb || sim.state.phase !== 'night') return false;
    // A take starts the next round in the core at once; the view opens its question a frame later.
    if (sim.state.round?.position !== answer.position()) return true;
    const look = answer.look(orb.position);
    if (look === 'heard') return false;
    loop.dispatch({ type: 'steer', x: 0, z: 0 });
    if (look !== 'playing') react(orb.id, answer.listen(orb.position));
    return true;
  }
}
