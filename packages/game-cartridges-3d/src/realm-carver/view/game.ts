/**
 * Realm Carver 3D as a cartridge game. The core (../core) moves the carver cell by cell and the
 * monsters on the diagonal in fixed steps; this view builds the realm, glides the characters to
 * the core's cells (a long jump, such as a setback to the border, snaps), shows every word on a
 * glowing beacon with a tag that stays on screen, and animates the events. It never decides a rule.
 */
import realm_carverCss from './realm-carver.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('realm-carver', realm_carverCss);
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, pips, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createRealmCarver, evidenceOf, scoreOf, START, type Beacon, type RealmCarverCommand, type RealmCarverEvent, type RealmCarverState } from '../core/index.js';
import { nextSteer } from '../qc/bot.js';
import { fitCamera, worldOf } from './geometry.js';
import { buildRealm, REALM_MODELS } from './realm.js';

/** A jump longer than this (meters) is a teleport of the core, not a walk. */
const SNAP_M = 1.6;
const BEACON_Y = 0.85;
/** The whole board is in view, so characters are drawn larger than life to stay readable. */
const CHARACTER_SCALE = 1.3;

interface Body {
  actor: Actor;
  walker: Walker;
}

interface BeaconView {
  group: THREE.Group;
  crystal: THREE.Mesh<THREE.OctahedronGeometry, THREE.MeshStandardMaterial>;
  ring: THREE.Mesh;
  tag: HTMLElement;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  await stage.loader.preload([...REALM_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const realm = buildRealm(stage);
  const sim = createRealmCarver(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const body = (kind: string, walk: string, stiffness: number, at: { x: number; z: number }, phase = 0): Body => {
    const gltf = stage.loader.get(stage.loader.modelPath(kind)) ?? stage.loader.get(stage.loader.modelPath('slime'))!;
    const actor = stage.addActor(new Actor(kind, gltf, stage.timeline, { phase, scale: CHARACTER_SCALE }));
    actor.placeAt(at.x, 0, at.z, 180);
    return { actor, walker: new Walker(actor, walk, stiffness) };
  };
  /** Glides a body to a point; a core teleport (a setback, a rest) snaps it and restarts its walker. */
  const glide = (b: Body, dt: number, x: number, z: number, walk: string, stiffness: number): void => {
    const p = b.actor.root.position;
    if (Math.hypot(x - p.x, z - p.z) > SNAP_M) {
      b.actor.placeAt(x, 0, z, b.actor.yaw);
      b.walker = new Walker(b.actor, walk, stiffness);
    }
    b.walker.update(dt, x, z);
  };
  const hero = body(heroId, 'run', 16, worldOf(START));
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.actor.setMap(tex)).catch(() => undefined);
  // A bright ring under the hero keeps it easy to find in the whole-board view.
  const marker = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.66, 32), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false }));
  marker.rotation.x = -Math.PI / 2;
  marker.position.y = 0.07;
  hero.actor.root.add(marker);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => {
    const fov = compact() ? 52 : 44;
    const fit = fitCamera(stage.camera.aspect || 1, fov, compact() ? 68 : 62);
    target.set(fit.target.x, 0, fit.target.z);
    stage.pose.pos.set(target.x + fit.offset[0], fit.offset[1], target.z + fit.offset[2]);
    return new FollowRig(() => target, fit.offset, [0, 0, 0], fov, 6);
  };
  stage.setRig(rig());

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-realm></span></div>
    <div class="meter"><small>${esc(t('courage'))}</small><div class="courage-pips" data-courage></div></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const realmEl = status.querySelector<HTMLElement>('[data-realm]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;
  const joystick = attachJoystick(hud.el, { hint: t('move'), change: (x, y) => loop.dispatch({ type: 'steer', x, z: y }) });

  audio.defineMood('realm', { bpm: 108, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [55, 59, 62]], busy: false, drum: true });
  audio.defineSfx('claim', (s) => [392, 523, 659].forEach((f, i) => s.tone(f, 0.18, 'triangle', 0.1, i * 0.05)));
  audio.defineSfx('fizzle', (s) => s.tone(300, 0.25, 'sawtooth', 0.07, 0, 0.5));

  // ---------------------------------------------------------------- beacons and monsters
  const crystalGeometry = new THREE.OctahedronGeometry(0.34, 0);
  const ringGeometry = new THREE.TorusGeometry(0.55, 0.06, 8, 28);
  const beacons = new Map<string, BeaconView>();
  const carved = new Set<string>();
  const monsters = new Map<string, Body>();

  const beaconPoint = (id: string): THREE.Vector3 | null => beacons.get(id)?.group.position.clone() ?? null;

  function addBeacon(b: Pick<Beacon, 'id' | 'word' | 'col' | 'row'>): void {
    const at = worldOf(b);
    const group = new THREE.Group();
    group.position.set(at.x, BEACON_Y, at.z);
    const crystal = new THREE.Mesh(crystalGeometry, new THREE.MeshStandardMaterial({ color: 0x9fe8ff, emissive: 0x4fc3ff, emissiveIntensity: 1.4, roughness: 0.2 }));
    const ring = new THREE.Mesh(ringGeometry, new THREE.MeshBasicMaterial({ color: 0xffd84a, transparent: true, opacity: 0.9 }));
    ring.rotation.x = Math.PI / 2;
    ring.visible = false;
    group.add(crystal, ring);
    stage.scene.add(group);
    const tag = document.createElement('div');
    tag.className = 'arena-tag';
    tag.textContent = b.word;
    hud.anchor(tag, () => stage.screenOfPoint(group.position.clone().setY(BEACON_Y + 0.7)), { pin: true });
    beacons.set(b.id, { group, crystal, ring, tag });
  }
  function removeBeacon(id: string, view: BeaconView): void {
    if (carved.delete(id)) void burst(stage, view.group.position.clone(), 0x9fe8ff, 14, 1.0);
    stage.scene.remove(view.group);
    view.crystal.material.dispose();
    (view.ring.material as THREE.Material).dispose();
    hud.unanchor(view.tag);
    beacons.delete(id);
  }
  function addMonster(m: { id: string; kind: string; col: number; row: number }): void {
    monsters.set(m.id, body(m.kind, 'walk', 10, worldOf(m), Math.random()));
  }
  function clearAll(): void {
    for (const [id, view] of [...beacons]) removeBeacon(id, view);
    for (const m of monsters.values()) stage.removeActor(m.actor);
    monsters.clear();
  }

  /** Makes the views match the state: new beacons and monsters appear, gone ones leave. */
  function reconcile(dt: number): void {
    const s = sim.state;
    for (const b of s.beacons) if (!beacons.has(b.id)) addBeacon(b);
    for (const [id, view] of [...beacons]) if (!s.beacons.some((b) => b.id === id)) removeBeacon(id, view);
    for (const m of s.monsters) if (!monsters.has(m.id)) addMonster(m);
    const next = s.beacons.find((b) => b.index === s.next);
    for (const b of s.beacons) {
      const view = beacons.get(b.id);
      if (!view) continue;
      const at = worldOf(b);
      const k = Math.min(1, dt * 12);
      view.group.position.x += (at.x - view.group.position.x) * k;
      view.group.position.z += (at.z - view.group.position.z) * k;
      const isNext = next?.id === b.id;
      view.ring.visible = s.helper && isNext;
      view.tag.classList.toggle('next', s.helper && isNext);
    }
  }

  function drawHud(): void {
    const s = sim.state;
    const sentence = s.shift[Math.min(s.realm, s.realms - 1)];
    if (sentence) sentenceBar(bar, sentence.words, s.phase === 'complete' ? sentence.words.length : s.next, s.helper);
    realmEl.textContent = t('realm', { realm: Math.min(s.realm + 1, s.realms), realms: s.realms });
    pips(courageEl, s.courage, s.maxCourage);
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const heroScreen = (lift = 1.9): { x: number; y: number; visible: boolean } => stage.screenOf(hero.actor, lift);
  const beaconScreen = (id: string): { x: number; y: number; visible: boolean } => {
    const p = beaconPoint(id);
    return p ? stage.screenOfPoint(p.setY(BEACON_Y + 0.6)) : heroScreen();
  };

  function handle(ev: RealmCarverEvent): void {
    switch (ev.type) {
      case 'realmStarted': {
        clearAll();
        for (const m of ev.monsters) addMonster(m);
        const c = worldOf(sim.state.carver);
        hero.actor.placeAt(c.x, 0, c.z, 180);
        hero.walker = new Walker(hero.actor, 'run', 16);
        break;
      }
      case 'landClaimed':
        realm.pop(ev.cells);
        audio.play('claim');
        void burst(stage, hero.actor.root.position.clone().setY(0.6), 0x86d36f, 12, 1.1);
        break;
      case 'wordCarved':
        carved.add(ev.id);
        hud.popup(beaconScreen(ev.id), t('carved'), 'good');
        audio.play('correct');
        hero.walker.play('victory');
        break;
      case 'wordMissed':
        hud.popup(beaconScreen(ev.id), t('notThat'), 'miss');
        audio.play('fizzle');
        break;
      case 'setback': {
        hero.walker.play('hit');
        monsters.get(ev.monsterId)?.walker.play(monsters.get(ev.monsterId)!.actor.has('attack') ? 'attack' : 'taunt');
        stage.shake(0.07, 0.3);
        hud.popup(heroScreen(), t('oops'), 'miss');
        audio.play('hit');
        break;
      }
      case 'rested':
        void hud.banner.show(t('rested'), '', 1.5);
        break;
      case 'regrown':
        void hud.banner.show(t('regrown'), '', 1.3);
        break;
      case 'realmCleared': {
        audio.play('victory');
        const sentence = sim.state.shift.find((x) => x.realmId === ev.realmId);
        void hud.banner.show(t('cleared'), sentence?.text ?? '', 1.6);
        void burst(stage, hero.actor.root.position.clone().setY(1), 0xffd84a, 18, 1.3);
        break;
      }
      case 'campaignComplete':
        void finish();
        break;
      default:
        break;
    }
    drawHud();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    joystick.dispose();
    audio.music('calm');
    audio.play('victory');
    hero.walker.play('victory');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<RealmCarverState, RealmCarverCommand, RealmCarverEvent>(sim, { render: (events) => events.forEach(handle) }, clock);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    reconcile(dt);
    realm.sync(s.grid, dt);
    const h = worldOf(s.carver);
    glide(hero, dt, h.x, h.z, 'run', 16);
    for (const m of s.monsters) {
      const view = monsters.get(m.id);
      if (!view) continue;
      const p = worldOf(m);
      glide(view, dt, p.x, p.z, 'walk', 10);
    }
    for (const view of beacons.values()) {
      view.group.position.y = BEACON_Y + Math.sin(time * 2.4 + view.group.position.x) * 0.08;
      view.crystal.rotation.y = time * 1.4;
    }
  });

  return {
    start: () => {
      audio.music('realm');
      drawHud();
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
      clearAll();
      realm.dispose();
      stage.removeActor(hero.actor);
      status.remove();
      bar.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as RealmCarverCommand),
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
