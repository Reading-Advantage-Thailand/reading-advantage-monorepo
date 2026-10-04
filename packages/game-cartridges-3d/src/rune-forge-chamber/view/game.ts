/**
 * Rune Forge Chamber 3D as a cartridge game. The core (../core) turns the orbit and deals the runes
 * in fixed steps; this view builds the forge, shows a glowing crystal rune per word under an HTML
 * word tag the student taps, flies the right rune into the blade on the anvil, and animates the
 * events. The sentence is an HTML bar so every script reads. It never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { burst, ShotRig, smooth } from '@reading-advantage/advantage-play-kit-3d/stage';
import {
  createRuneForgeChamber,
  evidenceOf,
  isRight,
  scoreOf,
  type RuneForgeChamberCommand,
  type RuneForgeChamberEvent,
  type RuneForgeChamberState,
} from '../core/index.js';
import { nextChoice } from '../qc/bot.js';
import { BLADE_FROM, BLADE_TO, GLOW, LAYOUT } from './layout.js';
import { buildForge, FORGE_MODELS } from './forge.js';
import rune_forge_chamberCss from './rune-forge-chamber.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('rune-forge-chamber', rune_forge_chamberCss);

/** Seconds a right rune takes to fly into the blade (shorter than the core's strike). */
const FLY_SECONDS = 0.55;
const STRIKE_TO = new THREE.Vector3(LAYOUT.anvil[0], LAYOUT.anvilTop + 0.2, LAYOUT.anvil[2]);

interface RuneView {
  group: THREE.Group;
  halo: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  materials: THREE.MeshStandardMaterial[];
  tag: HTMLButtonElement;
  /** Seconds since the rune started to fly into the blade; negative = still on the orbit. */
  fly: number;
  /** 0..1 appear scale. */
  appear: number;
  bob: number;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'wizard';
  await stage.loader.preload([...FORGE_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const forge = buildForge(stage, heroId);
  const hero = forge.smith;
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);
  const sim = createRuneForgeChamber(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- camera
  const shots = new ShotRig(0.05);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  shots.go(compact() ? LAYOUT.shots.portrait : LAYOUT.shots.landscape, 0, stage.pose);
  stage.setRig(shots);

  // ---------------------------------------------------------------- sound
  audio.defineMood('forge', { bpm: 84, chords: [[50, 53, 57], [48, 52, 55], [53, 57, 60], [50, 53, 57]], busy: false, drum: false });
  audio.defineSfx('clang', (s) => {
    s.noise(0.12, 0.14, 4200);
    [1568, 2093].forEach((f, i) => s.tone(f, 0.4, 'triangle', 0.12, i * 0.03));
  });
  audio.defineSfx('fizz', (s) => {
    s.noise(0.4, 0.18, 3000);
    s.tone(220, 0.3, 'triangle', 0.1, 0, 0.6);
  });
  audio.defineSfx('ding', (s) => [1319, 1760].forEach((f, i) => s.tone(f, 0.5, 'sine', 0.16, i * 0.09)));

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-blade></span></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const hint = document.createElement('div');
  hint.className = 'rune-hint';
  hint.textContent = t('aim');
  hud.el.append(hint);
  const bladeEl = status.querySelector<HTMLElement>('[data-blade]')!;

  // ---------------------------------------------------------------- runes
  const runes = new Map<string, RuneView>();
  const runeGltf = stage.loader.get(stage.loader.modelPath('crystal-cluster'))!;
  /** The size of one rune model in meters (measured once), to fit it to a height of 0.75 m. */
  const box = new THREE.Box3().setFromObject(runeGltf.scene);
  const fit = 0.75 / Math.max(0.1, box.max.y - box.min.y);
  const lift = -box.min.y * fit;

  function clearRunes(): void {
    for (const r of runes.values()) {
      hud.unanchor(r.tag);
      r.group.removeFromParent();
      r.halo.geometry.dispose();
      r.halo.material.dispose();
      for (const m of r.materials) m.dispose();
    }
    runes.clear();
  }

  function startWave(ev: Extract<RuneForgeChamberEvent, { type: 'waveStarted' }>): void {
    clearRunes();
    ev.runes.forEach((spawn, i) => {
      const group = new THREE.Group();
      const model = runeGltf.scene.clone();
      const materials: THREE.MeshStandardMaterial[] = [];
      model.traverse((n) => {
        const mesh = n as THREE.Mesh;
        if (!mesh.isMesh) return;
        mesh.castShadow = true;
        const own = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
          const copy = m.clone() as THREE.MeshStandardMaterial;
          if (copy.emissive) copy.emissive.setHex(GLOW.idle);
          copy.emissiveIntensity = 0.6;
          materials.push(copy);
          return copy;
        });
        mesh.material = Array.isArray(mesh.material) ? own : own[0]!;
      });
      model.scale.setScalar(fit);
      model.position.y = lift - 0.375;
      group.add(model);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.55, 20, 14),
        new THREE.MeshBasicMaterial({ color: GLOW.idle, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      group.add(halo);
      group.position.set(spawn.x, LAYOUT.runeY, spawn.z);
      group.scale.setScalar(0.01);
      stage.scene.add(group);
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'arena-tag rune-tag';
      tag.textContent = spawn.word;
      tag.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loop.dispatch({ type: 'choose', runeId: spawn.id });
      });
      const at = new THREE.Vector3();
      hud.anchor(tag, () => stage.screenOfPoint(at.set(group.position.x, group.position.y + 0.7, group.position.z)), { pin: true });
      runes.set(spawn.id, { group, halo, materials, tag, fly: -1, appear: 0, bob: i * 1.7 });
    });
    drawHud();
  }

  function glow(r: RuneView, hex: number, intensity: number, haloOpacity: number): void {
    r.halo.material.color.setHex(hex);
    r.halo.material.opacity = haloOpacity;
    for (const m of r.materials) {
      if (m.emissive) m.emissive.setHex(hex);
      m.emissiveIntensity = intensity;
    }
  }

  function drawHud(): void {
    const s = sim.state;
    const blade = s.forge[s.sentence];
    if (blade) sentenceBar(bar, blade.words, s.next, s.helper);
    bladeEl.textContent = t('blade', { blade: Math.min(s.sentence + 1, s.sentences), blades: s.sentences });
    const right = s.runes.find((r) => isRight(s, r))?.id;
    for (const rune of s.runes) {
      const v = runes.get(rune.id);
      if (!v) continue;
      v.tag.classList.toggle('aimed', rune.id === s.aimId);
      v.tag.classList.toggle('dim', rune.dimMs > 0);
      v.tag.classList.toggle('done', s.strike?.runeId === rune.id);
      v.tag.classList.toggle('next', s.helper && right === rune.id);
    }
  }

  // ---------------------------------------------------------------- the blade
  const bladeColor = new THREE.Color();
  const bladeMix = (progress: number): void => {
    bladeColor.setHex(BLADE_FROM).lerp(new THREE.Color(BLADE_TO), progress);
    forge.blade.material.color.copy(bladeColor);
    forge.blade.material.emissive.setHex(BLADE_TO);
    forge.blade.material.emissiveIntensity = 1.6 * progress;
    const length = Math.max(0.04, progress);
    forge.blade.scale.x = length;
    forge.blade.position.x = LAYOUT.anvil[0] - 0.65 + 0.65 * length;
  };
  let bounce = 0;

  // ---------------------------------------------------------------- events
  let finished = false;
  const pointOf = (id: string): { x: number; y: number; visible: boolean } => {
    const v = runes.get(id);
    return v ? stage.screenOfPoint(new THREE.Vector3(v.group.position.x, v.group.position.y + 1.1, v.group.position.z)) : { x: 0, y: 0, visible: false };
  };

  function handle(ev: RuneForgeChamberEvent): void {
    switch (ev.type) {
      case 'sentenceStarted':
        break;
      case 'waveStarted':
        startWave(ev);
        break;
      case 'aimed':
        break;
      case 'runeStruck': {
        hint.remove();
        const v = runes.get(ev.runeId);
        if (v) {
          v.fly = 0;
          glow(v, GLOW.hit, 1.5, 0.45);
          hud.unanchor(v.tag, false);
          v.tag.classList.add('done');
          hud.popup(pointOf(ev.runeId), t('right'), 'good');
        }
        void hero.play(hero.has('attack') ? 'attack' : 'idle', 0.4);
        audio.play('clang');
        audio.play('correct');
        break;
      }
      case 'runeFizzled': {
        const v = runes.get(ev.runeId);
        if (v) {
          glow(v, GLOW.dim, 0.05, 0.05);
          hud.popup(pointOf(ev.runeId), t('dim'), 'miss');
        }
        stage.shake(0.03, 0.2);
        audio.play('fizz');
        audio.play('wrong');
        break;
      }
      case 'sentenceForged':
        bounce = 0.35;
        void burst(stage, STRIKE_TO.clone(), BLADE_TO, 22, 1.2);
        void hero.play(hero.has('attack2') ? 'attack2' : 'idle', 0.4);
        audio.play('ding');
        break;
      case 'forgeComplete':
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
    void hero.play(hero.has('victory') ? 'victory' : 'idle', 0.4);
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- keyboard: arrows aim, Space picks
  const onKey = (e: KeyboardEvent): void => {
    if (finished || e.repeat) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const command: RuneForgeChamberCommand | null =
      e.key === 'ArrowLeft' || e.key === 'ArrowUp' || e.key === 'a' || e.key === 'w' ? { type: 'aim', dir: -1 }
      : e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'd' || e.key === 's' ? { type: 'aim', dir: 1 }
      : e.key === ' ' || e.key === 'Enter' ? { type: 'choose' }
      : null;
    if (!command) return;
    e.preventDefault();
    loop.dispatch(command);
  };
  window.addEventListener('keydown', onKey);

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<RuneForgeChamberState, RuneForgeChamberCommand, RuneForgeChamberEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
  bladeMix(0);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    const blade = s.forge[s.sentence];
    const progress = blade ? s.next / Math.max(1, blade.words.length) : 1;
    bladeMix(progress);
    bounce = Math.max(0, bounce - dt);
    forge.anvil?.scale.setScalar(1.25 * (1 + 0.06 * Math.sin((bounce / 0.35) * Math.PI) * (bounce > 0 ? 1 : 0)));
    const right = s.runes.find((r) => isRight(s, r))?.id;
    for (const rune of s.runes) {
      const v = runes.get(rune.id);
      if (!v) continue;
      if (v.fly >= 0) {
        v.fly += dt;
        const u = smooth(Math.min(1, v.fly / FLY_SECONDS));
        v.group.position.set(rune.x, LAYOUT.runeY, rune.z).lerp(STRIKE_TO, u);
        v.group.scale.setScalar(Math.max(0.01, 1 - 0.8 * u));
        v.group.rotation.y += dt * 8;
        continue;
      }
      v.appear = Math.min(1, v.appear + dt * 3);
      v.group.scale.setScalar(Math.max(0.01, v.appear));
      v.group.position.set(rune.x, LAYOUT.runeY + Math.sin(time * 1.8 + v.bob) * 0.06, rune.z);
      v.group.rotation.y += dt * 0.8;
      if (rune.dimMs <= 0) {
        const aimed = rune.id === s.aimId;
        const next = s.helper && right === rune.id;
        glow(v, aimed || next ? GLOW.aimed : GLOW.idle, aimed ? 1.1 : 0.6, aimed ? 0.32 : 0.2 + (next ? 0.1 * Math.sin(time * 6) : 0));
      }
    }
  });

  return {
    start: () => {
      audio.music('forge');
      loop.start();
    },
    pause: () => undefined,
    resume: () => loop.reset(),
    resize: () => undefined,
    recompose: () => shots.go(compact() ? LAYOUT.shots.portrait : LAYOUT.shots.landscape, 0, stage.pose),
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      loop.stop();
      window.removeEventListener('keydown', onKey);
      clearRunes();
      forge.blade.removeFromParent();
      status.remove();
      bar.remove();
      hint.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as RuneForgeChamberCommand),
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
