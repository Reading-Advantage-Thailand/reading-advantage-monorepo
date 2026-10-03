/**
 * Astral Mage 3D as a cartridge game. The core (../core) drifts the crystals and flies the bolt in
 * fixed steps; this view builds the spell circle, shows the mage and a glowing crystal per word,
 * keeps every word readable and tappable (HTML tags pinned to the screen edge when off screen),
 * and animates the events. It never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createAstralMage, evidenceOf, MAGE_START, scoreOf, type AstralMageCommand, type AstralMageEvent, type AstralMageState } from '../core/index.js';
import { nextCast } from '../qc/bot.js';
import { buildCircle, CIRCLE_MODELS } from './circle.js';
import astral_mageCss from './astral-mage.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('astral-mage', astral_mageCss);

/** The height of a crystal's centre over the floor, in meters, and the height of its word tag. */
const CRYSTAL_Y = 0.95;
const BOLT_Y = 1.0;

/** The glow colors by state. */
const GLOW = { idle: 0x9b7bff, aimed: 0xffd84a, dim: 0x66667a, hit: 0x7dffb0 } as const;

interface CrystalView {
  group: THREE.Group;
  halo: THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>;
  materials: THREE.MeshStandardMaterial[];
  tag: HTMLElement;
  at: THREE.Vector3;
  bob: number;
  /** 0..1 appear scale; shrinks to 0 when the crystal is struck. */
  appear: number;
  gone: boolean;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'wizard';
  await stage.loader.preload([...CIRCLE_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const circle = buildCircle(stage);
  const sim = createAstralMage(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the mage
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const hero = stage.addActor(new Actor(heroId, heroGltf, stage.timeline));
  hero.placeAt(MAGE_START.x, 0, MAGE_START.z, 180);
  hero.yaw = 180;
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3(0, 0, 0.2);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 7.2, 8.4] : [0, 6.4, 8.8], [0, 0.3, -1.8], compact() ? 62 : 50, 5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 7, 11);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-ritual></span></div>
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
  hint.className = 'astral-hint';
  hint.textContent = t('aim');
  hud.el.append(hint);
  const ritualEl = status.querySelector<HTMLElement>('[data-ritual]')!;

  audio.defineMood('astral', { bpm: 92, chords: [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]], busy: false, drum: false });
  audio.defineSfx('bolt', (s) => s.tone(520, 0.3, 'sine', 0.12, 0, 2.2));
  audio.defineSfx('shatter', (s) => [988, 1319, 1760].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.12, i * 0.05)));
  audio.defineSfx('fizzle', (s) => s.tone(220, 0.3, 'sawtooth', 0.05, 0, 0.6));

  // ---------------------------------------------------------------- crystals
  const crystals = new Map<string, CrystalView>();
  const crystalGltf = stage.loader.get(stage.loader.modelPath('crystal-cluster'))!;
  /** The size of one crystal model in meters (measured once), to fit it to a height of 0.9 m. */
  const box = new THREE.Box3().setFromObject(crystalGltf.scene);
  const fit = 0.9 / Math.max(0.1, box.max.y - box.min.y);
  const lift = -box.min.y * fit;

  function clearCrystals(): void {
    for (const c of crystals.values()) {
      hud.unanchor(c.tag);
      c.group.removeFromParent();
      c.halo.geometry.dispose();
      c.halo.material.dispose();
      for (const m of c.materials) m.dispose();
    }
    crystals.clear();
  }

  function startRitual(ev: Extract<AstralMageEvent, { type: 'ritualStarted' }>): void {
    clearCrystals();
    for (const spawn of ev.crystals) {
      const group = new THREE.Group();
      const model = crystalGltf.scene.clone();
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
      model.position.y = lift - 0.45;
      group.add(model);
      const halo = new THREE.Mesh(
        new THREE.SphereGeometry(0.62, 20, 14),
        new THREE.MeshBasicMaterial({ color: GLOW.idle, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false }),
      );
      group.add(halo);
      group.position.set(spawn.x, CRYSTAL_Y, spawn.z);
      group.scale.setScalar(0.01);
      stage.scene.add(group);
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'arena-tag astral-tag';
      tag.textContent = spawn.word;
      tag.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loop.dispatch({ type: 'cast', crystalId: spawn.id });
      });
      const at = new THREE.Vector3();
      hud.anchor(tag, () => stage.screenOfPoint(at.set(group.position.x, group.position.y + 0.75, group.position.z)), { pin: true });
      crystals.set(spawn.id, { group, halo, materials, tag, at, bob: spawn.x * 1.3 + spawn.z, appear: 0, gone: false });
    }
    drawBar();
  }

  function glow(c: CrystalView, hex: number, intensity: number, haloOpacity: number): void {
    c.halo.material.color.setHex(hex);
    c.halo.material.opacity = haloOpacity;
    for (const m of c.materials) {
      if (m.emissive) m.emissive.setHex(hex);
      m.emissiveIntensity = intensity;
    }
  }

  function drawBar(): void {
    const s = sim.state;
    const ritual = s.casting[s.ritual];
    if (ritual) sentenceBar(bar, ritual.words, s.next, s.helper);
    ritualEl.textContent = t('ritual', { ritual: Math.min(s.ritual + 1, s.rituals), rituals: s.rituals });
    const nextCrystal = s.crystals.find((c) => c.kind === 'word' && c.index === s.next && !c.struck);
    for (const c of s.crystals) {
      const view = crystals.get(c.id);
      if (!view) continue;
      view.tag.classList.toggle('done', c.struck);
      view.tag.classList.toggle('aimed', c.id === s.aimId);
      view.tag.classList.toggle('dim', c.dimMs > 0);
      view.tag.classList.toggle('next', s.helper && nextCrystal?.id === c.id);
    }
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const pointOf = (id: string): { x: number; y: number; visible: boolean } => {
    const v = crystals.get(id);
    return v ? stage.screenOfPoint(new THREE.Vector3(v.group.position.x, v.group.position.y + 1.1, v.group.position.z)) : { x: 0, y: 0, visible: false };
  };

  function handle(ev: AstralMageEvent): void {
    switch (ev.type) {
      case 'ritualStarted':
        startRitual(ev);
        break;
      case 'aimed':
        break;
      case 'boltCast':
        hint.remove();
        void hero.play(hero.has('attack') ? 'attack' : 'idle', 0.4);
        audio.play('bolt');
        break;
      case 'crystalStruck': {
        const v = crystals.get(ev.id);
        if (v) {
          v.gone = true;
          glow(v, GLOW.hit, 1.6, 0.5);
          void burst(stage, v.group.position.clone(), GLOW.hit, 16, 1.1);
          hud.popup(pointOf(ev.id), t('struck'), 'good');
          hud.unanchor(v.tag);
        }
        audio.play('shatter');
        audio.play('correct');
        break;
      }
      case 'crystalFizzled': {
        const v = crystals.get(ev.id);
        if (v) {
          glow(v, GLOW.dim, 0.1, 0.06);
          hud.popup(pointOf(ev.id), t('dim'), 'miss');
        }
        stage.shake(0.03, 0.2);
        audio.play('fizzle');
        audio.play('wrong');
        break;
      }
      case 'ritualCleared':
        audio.play('victory');
        void hero.play(hero.has('attack2') ? 'attack2' : 'idle', 0.4);
        break;
      case 'castingComplete':
        void finish();
        break;
    }
    drawBar();
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

  // ---------------------------------------------------------------- keyboard: arrows aim, Space casts
  const onKey = (e: KeyboardEvent): void => {
    if (finished || e.repeat) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const command: AstralMageCommand | null =
      e.key === 'ArrowLeft' || e.key === 'a' ? { type: 'aim', dir: -1 }
      : e.key === 'ArrowRight' || e.key === 'd' ? { type: 'aim', dir: 1 }
      : e.key === ' ' || e.key === 'Enter' ? { type: 'cast' }
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
  const loop = createFixedStepLoop<AstralMageState, AstralMageCommand, AstralMageEvent>(sim, { render: (events) => events.forEach(handle) }, clock);

  const bolt = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff1a8, transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  bolt.visible = false;
  stage.scene.add(bolt);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    hero.yaw = s.mage.facing;
    for (const c of s.crystals) {
      const v = crystals.get(c.id);
      if (!v) continue;
      v.appear = v.gone ? Math.max(0, v.appear - dt * 4) : Math.min(1, v.appear + dt * 3);
      v.group.scale.setScalar(Math.max(0.01, v.appear));
      v.group.position.set(c.x, CRYSTAL_Y + Math.sin(time * 1.6 + v.bob) * 0.08, c.z);
      v.group.rotation.y += dt * 0.8;
      if (!v.gone && c.dimMs <= 0) {
        const aimed = c.id === s.aimId;
        const next = s.helper && s.crystals.find((k) => k.kind === 'word' && k.index === s.next && !k.struck)?.id === c.id;
        glow(v, aimed || next ? GLOW.aimed : GLOW.idle, aimed ? 1.1 : 0.6, aimed ? 0.34 : 0.2 + (next ? 0.08 * Math.sin(time * 6) : 0));
      }
    }
    if (s.bolt) {
      bolt.visible = true;
      bolt.position.set(s.bolt.x, BOLT_Y, s.bolt.z);
      bolt.scale.setScalar(1 + 0.25 * Math.sin(time * 40));
    } else bolt.visible = false;
    circle.ring.material.opacity = 0.45 + 0.15 * Math.sin(time * 1.4);
    circle.ring.rotation.z += dt * 0.15;
  });

  return {
    start: () => {
      audio.music('astral');
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
      clearCrystals();
      bolt.removeFromParent();
      status.remove();
      bar.remove();
      hint.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as AstralMageCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextCast(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
