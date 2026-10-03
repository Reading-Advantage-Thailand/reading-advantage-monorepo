/**
 * Alchemist's Synthesis 3D as a cartridge game. The core (../core) deals the formulas and the jars
 * in fixed steps; this view builds the lab, shows an ingredient on each pedestal under an HTML
 * word tag the student taps, flies the right jar into the cauldron, and animates the events. The
 * recipe card is HTML so Thai reads in every script. It never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { burst, ShotRig, smooth } from '@reading-advantage/advantage-play-kit-3d/stage';
import {
  createAlchemistsSynthesis,
  evidenceOf,
  scoreOf,
  type AlchemistsSynthesisCommand,
  type AlchemistsSynthesisEvent,
  type AlchemistsSynthesisState,
} from '../core/index.js';
import { nextChoice } from '../qc/bot.js';
import { BREW_FROM, BREW_TO, GLOW, INGREDIENT_SCALE, LAYOUT } from './layout.js';
import { buildLab, LAB_MODELS } from './lab.js';
import alchemists_synthesisCss from './alchemists-synthesis.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('alchemists-synthesis', alchemists_synthesisCss);

/** Seconds a right jar takes to fly into the cauldron (shorter than the core's pour). */
const FLY_SECONDS = 0.7;
const POUR_TO = new THREE.Vector3(LAYOUT.cauldron[0], 1.35, LAYOUT.cauldron[2]);

interface JarView {
  group: THREE.Group;
  halo: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  materials: THREE.MeshStandardMaterial[];
  tag: HTMLButtonElement;
  home: THREE.Vector3;
  /** Seconds since the jar started to fly into the cauldron; negative = still on its pedestal. */
  fly: number;
  /** 0..1 appear scale. */
  appear: number;
  bob: number;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'wizard';
  await stage.loader.preload([...LAB_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const lab = buildLab(stage, heroId);
  const hero = lab.alchemist;
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);
  const sim = createAlchemistsSynthesis(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- camera
  const shots = new ShotRig(0.05);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  shots.go(compact() ? LAYOUT.shots.portrait : LAYOUT.shots.landscape, 0, stage.pose);
  stage.setRig(shots);

  // ---------------------------------------------------------------- sound
  audio.defineMood('lab', { bpm: 88, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [57, 60, 64]], busy: false, drum: false });
  audio.defineSfx('pour', (s) => {
    s.noise(0.35, 0.12, 1800);
    s.tone(440, 0.3, 'sine', 0.14, 0, 1.8);
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
    <div class="place"><small>${esc(t('place'))}</small><span data-round></span></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const card = document.createElement('div');
  card.className = 'alch-formula';
  card.innerHTML = `<small>${esc(t('formula'))}</small><b data-meaning></b>`;
  hud.el.append(card);
  const meaning = card.querySelector<HTMLElement>('[data-meaning]')!;
  const roundEl = status.querySelector<HTMLElement>('[data-round]')!;
  const hint = document.createElement('div');
  hint.className = 'alch-hint';
  hint.textContent = t('aim');
  hud.el.append(hint);

  // ---------------------------------------------------------------- jars
  const jars = new Map<string, JarView>();

  function clearJars(): void {
    for (const j of jars.values()) {
      hud.unanchor(j.tag);
      j.group.removeFromParent();
      j.halo.geometry.dispose();
      j.halo.material.dispose();
      for (const m of j.materials) m.dispose();
    }
    jars.clear();
  }

  function startRound(ev: Extract<AlchemistsSynthesisEvent, { type: 'roundStarted' }>): void {
    clearJars();
    meaning.textContent = ev.translation;
    ev.jars.forEach((spawn, i) => {
      const spot = LAYOUT.jars[i % LAYOUT.jars.length]!;
      const home = new THREE.Vector3(spot[0], LAYOUT.pedestal, spot[2]);
      const group = new THREE.Group();
      const gltf = stage.loader.get(stage.loader.modelPath(spawn.kind));
      const materials: THREE.MeshStandardMaterial[] = [];
      if (gltf) {
        const model = gltf.scene.clone();
        model.traverse((n) => {
          const mesh = n as THREE.Mesh;
          if (!mesh.isMesh) return;
          mesh.castShadow = true;
          const own = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map((m) => {
            const copy = m.clone() as THREE.MeshStandardMaterial;
            if (copy.emissive) copy.emissive.setHex(GLOW.idle);
            copy.emissiveIntensity = 0.12;
            materials.push(copy);
            return copy;
          });
          mesh.material = Array.isArray(mesh.material) ? own : own[0]!;
        });
        model.scale.setScalar(INGREDIENT_SCALE[spawn.kind] ?? 1);
        group.add(model);
      }
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 20, 14),
        new THREE.MeshBasicMaterial({ color: GLOW.idle, transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      halo.position.y = 0.2;
      group.add(halo);
      group.position.copy(home);
      group.scale.setScalar(0.01);
      stage.scene.add(group);
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'arena-tag alch-tag';
      tag.textContent = spawn.term;
      tag.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loop.dispatch({ type: 'choose', jarId: spawn.id });
      });
      const at = new THREE.Vector3();
      hud.anchor(tag, () => stage.screenOfPoint(at.set(group.position.x, Math.max(group.position.y, home.y) + 0.75, group.position.z)), { pin: true });
      jars.set(spawn.id, { group, halo, materials, tag, home, fly: -1, appear: 0, bob: i * 1.7 });
    });
    drawHud();
  }

  function glow(j: JarView, hex: number, intensity: number, haloOpacity: number): void {
    j.halo.material.color.setHex(hex);
    j.halo.material.opacity = haloOpacity;
    for (const m of j.materials) {
      if (m.emissive) m.emissive.setHex(hex);
      m.emissiveIntensity = intensity;
    }
  }

  function drawHud(): void {
    const s = sim.state;
    roundEl.textContent = t('round', { round: Math.min(s.round + 1, s.rounds), rounds: s.rounds });
    const right = s.jars.find((j) => j.correct)?.id;
    for (const jar of s.jars) {
      const v = jars.get(jar.id);
      if (!v) continue;
      v.tag.classList.toggle('aimed', jar.id === s.aimId);
      v.tag.classList.toggle('dim', jar.dimMs > 0);
      v.tag.classList.toggle('done', s.pour?.jarId === jar.id);
      v.tag.classList.toggle('next', s.helper && right === jar.id);
    }
  }

  // ---------------------------------------------------------------- the brew
  const brewColor = new THREE.Color();
  const brewMix = (progress: number): void => {
    brewColor.setHex(BREW_FROM).lerp(new THREE.Color(BREW_TO), progress);
    lab.brew.emissive.copy(brewColor);
    lab.brew.color.copy(brewColor).multiplyScalar(0.55);
  };
  let bounce = 0;

  // ---------------------------------------------------------------- events
  let finished = false;
  const pointOf = (id: string): { x: number; y: number; visible: boolean } => {
    const v = jars.get(id);
    return v ? stage.screenOfPoint(new THREE.Vector3(v.home.x, v.home.y + 1.2, v.home.z)) : { x: 0, y: 0, visible: false };
  };

  function handle(ev: AlchemistsSynthesisEvent): void {
    switch (ev.type) {
      case 'roundStarted':
        startRound(ev);
        break;
      case 'aimed':
        break;
      case 'jarPoured': {
        hint.remove();
        const v = jars.get(ev.jarId);
        if (v) {
          v.fly = 0;
          glow(v, GLOW.right, 1.4, 0.4);
          hud.unanchor(v.tag, false);
          v.tag.classList.add('done');
          hud.popup(pointOf(ev.jarId), t('right'), 'good');
        }
        void hero.play(hero.has('attack') ? 'attack' : 'idle', 0.4);
        audio.play('pour');
        audio.play('correct');
        break;
      }
      case 'jarFizzled': {
        const v = jars.get(ev.jarId);
        if (v) {
          glow(v, GLOW.dim, 0.05, 0.05);
          hud.popup(pointOf(ev.jarId), t('dim'), 'miss');
        }
        stage.shake(0.03, 0.2);
        audio.play('fizz');
        audio.play('wrong');
        break;
      }
      case 'elixirBrewed': {
        bounce = 0.35;
        void burst(stage, POUR_TO.clone(), BREW_TO, 18, 1.1);
        hud.popup(stage.screenOfPoint(POUR_TO.clone().setY(2.1)), t('brewed'), 'good');
        audio.play('ding');
        break;
      }
      case 'synthesisComplete':
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
    const command: AlchemistsSynthesisCommand | null =
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
  const loop = createFixedStepLoop<AlchemistsSynthesisState, AlchemistsSynthesisCommand, AlchemistsSynthesisEvent>(sim, { render: (events) => events.forEach(handle) }, clock);
  brewMix(0);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    const progress = s.rounds === 0 ? 0 : s.brewed / s.rounds;
    brewMix(progress);
    lab.brew.emissiveIntensity = 0.7 + 0.9 * progress + (s.pour ? 0.5 * Math.sin(time * 14) : 0);
    bounce = Math.max(0, bounce - dt);
    lab.cauldron?.scale.setScalar(1.25 * (1 + 0.08 * Math.sin((bounce / 0.35) * Math.PI) * (bounce > 0 ? 1 : 0)));
    const right = s.jars.find((j) => j.correct)?.id;
    for (const jar of s.jars) {
      const v = jars.get(jar.id);
      if (!v) continue;
      if (v.fly >= 0) {
        v.fly += dt;
        const u = smooth(Math.min(1, v.fly / FLY_SECONDS));
        v.group.position.lerpVectors(v.home, POUR_TO, u);
        v.group.position.y += Math.sin(u * Math.PI) * 0.8;
        v.group.scale.setScalar(Math.max(0.01, 1 - 0.7 * u));
        v.group.rotation.y += dt * 6;
        continue;
      }
      v.appear = Math.min(1, v.appear + dt * 3);
      v.group.scale.setScalar(Math.max(0.01, v.appear));
      v.group.position.set(v.home.x, v.home.y + 0.03 + Math.sin(time * 1.8 + v.bob) * 0.03, v.home.z);
      v.group.rotation.y += dt * 0.5;
      if (jar.dimMs <= 0) {
        const aimed = jar.id === s.aimId;
        const next = s.helper && right === jar.id;
        glow(v, aimed || next ? GLOW.aimed : GLOW.idle, aimed ? 0.5 : 0.12, aimed ? 0.3 : 0.14 + (next ? 0.1 * Math.sin(time * 6) : 0));
      }
    }
  });

  return {
    start: () => {
      audio.music('lab');
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
      clearJars();
      status.remove();
      card.remove();
      hint.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as AlchemistsSynthesisCommand),
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
