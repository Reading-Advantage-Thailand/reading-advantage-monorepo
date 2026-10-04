/**
 * Enchanted Library 3D as a cartridge game. The core (../core) moves the hero and the spirits in
 * fixed steps; this view builds the hall, walks the hero and the spirits to the core's positions,
 * shows a book with a tappable word tag for each choice, the Thai prompt in HTML, and animates the
 * events. It never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import {
  HERO_START,
  createEnchantedLibrary,
  evidenceOf,
  scoreOf,
  targetBookOf,
  type LibraryCommand,
  type LibraryEvent,
  type LibraryState,
} from '../core/index.js';
import { nextCommand } from '../qc/bot.js';
import { buildBook, buildHall, HALL_MODELS, type BookView } from './hall.js';
import enchanted_libraryCss from './enchanted-library.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('enchanted-library', enchanted_libraryCss);

/** A spirit is a see-through, bluish skeleton. */
function ghostify(actor: Actor): void {
  for (const m of actor.materials) {
    m.transparent = true;
    m.opacity = 0.62;
    m.depthWrite = false;
    m.color.multiply(new THREE.Color(0.75, 0.9, 1.25));
    m.emissive.setRGB(0.05, 0.12, 0.22);
    m.emissiveIntensity = 0.6;
  }
}

/** The height of a book's top, and of its word tag, in meters. */
const BOOK_TOP = 1.0;

interface BookEntry {
  view: BookView;
  tag: HTMLButtonElement;
  x: number;
  z: number;
  /** 1 when standing, shrinking to 0 once the book is spent or collected. */
  appear: number;
  gone: boolean;
  phase: number;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'wizard';
  await stage.loader.preload([...HALL_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const hall = buildHall(stage);
  const sim = createEnchantedLibrary(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const hero = new Walker(stage.addActor(new Actor(heroId, heroGltf, stage.timeline)), 'run');
  hero.actor.placeAt(HERO_START.x, 0, HERO_START.z, 180);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.actor.setMap(tex)).catch(() => undefined);
  const shieldBall = new THREE.Mesh(
    new THREE.SphereGeometry(0.95, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0x7dd3ff, transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false }),
  );
  shieldBall.visible = false;
  stage.scene.add(shieldBall);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 8.2, 8.6] : [0, 7.2, 8.8], [0, 0.3, -1.6], compact() ? 62 : 50, 5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 8, 11);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-round></span></div>
    <div class="meter">${esc(t('courage'))}<b data-courage></b></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const roundEl = status.querySelector<HTMLElement>('[data-round]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;
  const prompt = document.createElement('div');
  prompt.className = 'lib-prompt';
  prompt.innerHTML = `<small>${esc(t('find'))}</small><b data-word></b>`;
  hud.el.append(prompt);
  const wordEl = prompt.querySelector<HTMLElement>('[data-word]')!;
  const actions = document.createElement('div');
  actions.className = 'lib-actions';
  actions.innerHTML = `<button data-shield></button>`;
  hud.el.append(actions);
  const shieldBtn = actions.querySelector<HTMLButtonElement>('[data-shield]')!;
  shieldBtn.addEventListener('click', () => loop.dispatch({ type: 'shield' }));
  const onKey = (e: KeyboardEvent): void => {
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      loop.dispatch({ type: 'shield' });
    }
  };
  window.addEventListener('keydown', onKey);
  const joystick = attachJoystick(hud.el, { hint: t('move'), change: (x, y) => loop.dispatch({ type: 'steer', x, z: y }) });

  audio.defineMood('enchanted', { bpm: 88, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]], busy: false, drum: false });
  audio.defineSfx('page', (s) => {
    s.noise(0.2, 0.12, 2400);
    s.tone(660, 0.2, 'triangle', 0.1, 0.05, 1.6);
  });
  audio.defineSfx('ward', (s) => s.tone(760, 0.35, 'sine', 0.14, 0, 1.8));
  audio.defineSfx('wail', (s) => s.tone(520, 0.4, 'triangle', 0.08, 0, 0.5));

  // ---------------------------------------------------------------- books and spirits
  const books = new Map<string, BookEntry>();
  const spirits = new Map<string, Walker>();

  function clearBooks(): void {
    for (const b of books.values()) {
      hud.unanchor(b.tag);
      b.view.dispose();
    }
    books.clear();
  }

  function startRound(ev: Extract<LibraryEvent, { type: 'roundStarted' }>): void {
    clearBooks();
    ev.books.forEach((spawn, slot) => {
      const view = buildBook(slot);
      view.group.position.set(spawn.x, 0, spawn.z);
      view.group.scale.setScalar(0.01);
      stage.scene.add(view.group);
      const tag = document.createElement('button');
      tag.type = 'button';
      tag.className = 'arena-tag lib-tag';
      tag.textContent = spawn.term;
      tag.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        e.stopPropagation();
        loop.dispatch({ type: 'goto', bookId: spawn.id });
      });
      const at = new THREE.Vector3(spawn.x, BOOK_TOP + 0.35, spawn.z);
      hud.anchor(tag, () => stage.screenOfPoint(at), { pin: true });
      books.set(spawn.id, { view, tag, x: spawn.x, z: spawn.z, appear: 0, gone: false, phase: slot * 1.7 });
    });
    wordEl.textContent = ev.translation;
    drawHud();
  }

  function addSpirit(id: string, x: number, z: number): void {
    const g = stage.loader.get(stage.loader.modelPath('skeleton'));
    if (!g) return;
    const actor = stage.addActor(new Actor('skeleton', g, stage.timeline, { phase: id.length * 0.37 }));
    ghostify(actor);
    actor.placeAt(x, 0, z, 0);
    spirits.set(id, new Walker(actor, 'walk', 10));
  }

  function drawHud(): void {
    const s = sim.state;
    roundEl.textContent = t('round', { round: Math.min(s.round + 1, s.roundCount), rounds: s.roundCount });
    courageEl.textContent = '❤'.repeat(s.courage) + '♡'.repeat(Math.max(0, s.maxCourage - s.courage));
    shieldBtn.textContent = `${t('shield')} ${'●'.repeat(s.hero.charges)}`;
    shieldBtn.disabled = s.hero.charges === 0 || s.hero.shieldMs > 0;
    const right = targetBookOf(s);
    for (const b of s.books) {
      const view = books.get(b.id);
      if (!view) continue;
      view.tag.classList.toggle('spent', b.spent);
      view.tag.classList.toggle('next', s.helper && right?.id === b.id);
    }
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const overHero = (): { x: number; y: number; visible: boolean } => stage.screenOf(hero.actor, 1.6);
  const point = new THREE.Vector3();
  const overBook = (id: string): { x: number; y: number; visible: boolean } => {
    const b = books.get(id);
    return b ? stage.screenOfPoint(point.set(b.x, BOOK_TOP + 0.5, b.z)) : overHero();
  };

  function handle(ev: LibraryEvent): void {
    switch (ev.type) {
      case 'roundStarted':
        startRound(ev);
        break;
      case 'bookCollected': {
        const b = books.get(ev.id);
        if (b) {
          b.gone = true;
          hud.unanchor(b.tag);
          b.tag.remove();
          void burst(stage, new THREE.Vector3(b.x, BOOK_TOP, b.z), 0xffd98a, 16, 1.0);
          hud.popup(overBook(ev.id), t('got'), 'good');
        }
        audio.play('page');
        audio.play('correct');
        break;
      }
      case 'bookWrong': {
        const b = books.get(ev.id);
        if (b) b.gone = true;
        hud.popup(overBook(ev.id), t('wrong'), 'miss');
        audio.play('wrong');
        break;
      }
      case 'shieldUp':
        audio.play('ward');
        break;
      case 'shieldBlocked': {
        const w = spirits.get(ev.spiritId);
        w?.play('hit');
        hud.popup(overHero(), t('blocked'), 'good');
        audio.play('ward');
        break;
      }
      case 'spiritSpawned':
        addSpirit(ev.spirit.id, ev.spirit.x, ev.spirit.z);
        break;
      case 'heroHit': {
        hero.play('hit');
        stage.shake(0.06, 0.3);
        spirits.get(ev.spiritId)?.play('hit');
        hud.popup(overHero(), t('hit'), 'miss');
        audio.play('hit');
        audio.play('wail');
        break;
      }
      case 'courageChanged':
        hud.popup(overHero(), t('courageLost'), '');
        break;
      case 'teamRested':
        void hud.banner.show(t('rested'), '', 1.2);
        hero.teleport(HERO_START.x, HERO_START.z, 180);
        loop.reset();
        break;
      case 'roundCleared':
        audio.play('victory');
        break;
      case 'visitComplete':
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
    hero.play('victory');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<LibraryState, LibraryCommand, LibraryEvent>(sim, { render: (events) => events.forEach(handle) }, clock);

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    const s = sim.state;
    hero.update(dt, s.hero.x, s.hero.z);
    target.set(s.hero.x * 0.6, 0, s.hero.z * 0.5);
    // Spirits that the core removed (a rest) leave the hall.
    for (const [id, w] of [...spirits]) {
      if (s.spirits.some((z) => z.id === id)) continue;
      stage.removeActor(w.actor);
      spirits.delete(id);
    }
    for (const z of s.spirits) spirits.get(z.id)?.update(dt, z.x, z.z, 0.15 + Math.sin(time * 2 + z.x) * 0.08);
    const right = targetBookOf(s);
    for (const b of s.books) {
      const v = books.get(b.id);
      if (!v) continue;
      v.appear = v.gone || b.spent ? Math.max(0, v.appear - dt * 3) : Math.min(1, v.appear + dt * 3);
      v.view.group.scale.setScalar(Math.max(0.01, v.appear));
      v.view.group.position.y = Math.sin(time * 1.6 + v.phase) * 0.06;
      v.view.halo.material.color.setHex(s.helper && right?.id === b.id ? 0xffd84a : 0xc9b8ff);
      v.view.halo.material.opacity = s.helper && right?.id === b.id ? 0.4 + 0.15 * Math.sin(time * 6) : 0.22;
    }
    shieldBall.visible = s.hero.shieldMs > 0;
    if (shieldBall.visible) {
      shieldBall.position.set(s.hero.x, 0.85, s.hero.z);
      shieldBall.scale.setScalar(1 + 0.06 * Math.sin(time * 14));
    }
    hall.ring.material.opacity = 0.4 + 0.15 * Math.sin(time * 1.4);
    hall.ring.rotation.z += dt * 0.2;
  });

  drawHud();

  return {
    start: () => {
      audio.music('enchanted');
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
      clearBooks();
      shieldBall.removeFromParent();
      status.remove();
      prompt.remove();
      actions.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as LibraryCommand),
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
