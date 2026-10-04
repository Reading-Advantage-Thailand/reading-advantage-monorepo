/**
 * Abyssal Well as a 3D cartridge game. The core (../core) decides everything and answers each
 * command with events; this view builds the well, puts the archer on the rim and a creature with
 * a word tag in each lane, plays the events of a command in order (nothing is timed), and reports
 * the run once to the host.
 */
import * as THREE from 'three';
import type { PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { Actor, burst, FollowRig, projectile } from '@reading-advantage/advantage-play-kit-3d/stage';
import {
  angleDelta,
  archerPoint,
  createAbyssalWell,
  laneAngle,
  lanePoint,
  nextEnemyOf,
  resultsOf,
  type AbyssalWellCommand,
  type AbyssalWellEvent,
  type AbyssalWellInput,
  type EnemyShown,
} from '../core/index.js';
import { nextCommand } from '../qc/bot.js';
import { buildWell, WELL_MODELS } from './well.js';
import abyssal_wellCss from './abyssal-well.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('abyssal-well', abyssal_wellCss);

const BODY_Y = 0.85;

interface EnemyView {
  data: EnemyShown;
  actor: Actor;
  tag: HTMLElement;
  at: THREE.Vector3;
  /** The depth now (it glides toward `data.depth`). */
  depth: number;
  /** 0..1 appear scale; shrinks to 0 when the enemy is gone. */
  appear: number;
  gone: boolean;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  if (Array.isArray(ctx.input)) throw new Error('Abyssal Well needs a story input.');
  const story: PracticeInput = ctx.input;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'wizard';
  await stage.loader.preload([...WELL_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const well = buildWell(stage);
  const sim = createAbyssalWell(story as AbyssalWellInput, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the archer
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const hero = stage.addActor(new Actor(heroId, heroGltf, stage.timeline));
  let angle = laneAngle(sim.state.lane);
  /** The heading toward the well's middle; it grows with the angle, so the archer never spins the long way. */
  const faceCenter = (a: number): number => (a * 180) / Math.PI + 180;
  {
    const p = archerPoint(angle);
    hero.placeAt(p.x, 0, p.z, faceCenter(angle));
  }
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3(0, 0, 0.6);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 15.5, 8.6] : [0, 12.4, 9.8], [0, 0, -0.4], compact() ? 60 : 50, 5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 13, 12);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-descent></span></div>
    <div class="meter">${esc(t('courage'))}<b data-courage></b></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const translation = document.createElement('div');
  translation.className = 'well-translation';
  hud.el.append(translation);
  const hint = document.createElement('div');
  hint.className = 'well-hint';
  hint.textContent = t('aim');
  hud.el.append(hint);
  const descentEl = status.querySelector<HTMLElement>('[data-descent]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;
  const setCourage = (value: number): void => {
    courageEl.textContent = '❤'.repeat(value) + '♡'.repeat(Math.max(0, sim.state.maxCourage - value));
  };
  setCourage(sim.state.courage);

  audio.defineMood('well', { bpm: 84, chords: [[50, 53, 57], [46, 50, 53], [43, 46, 50], [45, 49, 52]], busy: false, drum: false });
  audio.defineSfx('arrow', (s) => s.noise(0.18, 0.1, 1900));
  audio.defineSfx('thud', (s) => s.tone(160, 0.25, 'triangle', 0.14, 0, 0.5));

  // ---------------------------------------------------------------- the creatures
  const enemies = new Map<string, EnemyView>();
  let words: string[] = [];

  const positionOf = (v: EnemyView): THREE.Vector3 => {
    const p = lanePoint(v.data.lane, v.depth);
    return v.at.set(p.x, 0, p.z);
  };

  function addEnemy(data: EnemyShown): void {
    const gltf = stage.loader.get(stage.loader.modelPath(data.creature))!;
    const actor = stage.addActor(new Actor(data.creature, gltf, stage.timeline, { phase: (data.lane * 0.37) % 1 }));
    const p = lanePoint(data.lane, data.depth);
    actor.placeAt(p.x, 0, p.z, laneAngle(data.lane) * (180 / Math.PI));
    actor.root.scale.setScalar(0.01);
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'arena-tag well-tag';
    tag.textContent = data.word;
    tag.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      command({ type: 'fire', lane: data.lane });
    });
    const at = new THREE.Vector3();
    const view: EnemyView = { data: { ...data }, actor, tag, at, depth: data.depth, appear: 0, gone: false };
    hud.anchor(tag, () => stage.screenOfPoint(at.set(actor.root.position.x, BODY_Y + 1.15, actor.root.position.z)), { pin: true });
    enemies.set(data.id, view);
  }

  function removeEnemy(id: string): void {
    const v = enemies.get(id);
    if (!v) return;
    hud.unanchor(v.tag);
    stage.removeActor(v.actor);
    v.actor.root.removeFromParent();
    v.actor.dispose();
    enemies.delete(id);
  }

  function clearEnemies(): void {
    for (const id of [...enemies.keys()]) removeEnemy(id);
  }

  function drawBar(): void {
    const s = sim.state;
    const d = s.descents[s.descent];
    if (d) sentenceBar(bar, words, s.next, s.helper);
    descentEl.textContent = t('descent', { descent: Math.min(s.descent + 1, s.descentCount), descents: s.descentCount });
    const nextEnemy = nextEnemyOf(s);
    for (const v of enemies.values()) {
      v.tag.classList.toggle('aimed', v.data.lane === s.lane);
      v.tag.classList.toggle('next', s.helper && nextEnemy?.id === v.data.id);
    }
  }

  const pointOf = (id: string): { x: number; y: number; visible: boolean } => {
    const v = enemies.get(id);
    return v ? stage.screenOfPoint(new THREE.Vector3(v.actor.root.position.x, BODY_Y + 1.5, v.actor.root.position.z)) : { x: 0, y: 0, visible: false };
  };
  const heroPoint = (): { x: number; y: number; visible: boolean } => stage.screenOfPoint(new THREE.Vector3(hero.root.position.x, 2.2, hero.root.position.z));

  // ---------------------------------------------------------------- events, one command at a time
  let busy = false;
  let finished = false;
  let angleTarget = angle;

  async function show(ev: AbyssalWellEvent): Promise<void> {
    switch (ev.type) {
      case 'descentStarted': {
        clearEnemies();
        words = ev.words;
        translation.textContent = ev.translation ?? '';
        for (const e of ev.enemies) addEnemy(e);
        audio.play('spawn');
        drawBar();
        await stage.timeline.wait(0.7);
        break;
      }
      case 'moved':
        angleTarget = angle + angleDelta(angle, laneAngle(ev.lane));
        drawBar();
        await stage.timeline.wait(0.3);
        break;
      case 'fired': {
        hint.remove();
        const v = enemies.get(ev.enemyId);
        void hero.play(hero.has('attack') ? 'attack' : 'idle', 0.4);
        audio.play('arrow');
        if (v) {
          const from = new THREE.Vector3(hero.root.position.x, 1.0, hero.root.position.z);
          const to = new THREE.Vector3(v.actor.root.position.x, BODY_Y, v.actor.root.position.z);
          await projectile(stage, from, to, ev.correct ? 0x7dffb0 : 0xff8a6a, 0.4, 0.5);
        }
        break;
      }
      case 'struck': {
        const v = enemies.get(ev.enemyId);
        if (v) {
          v.gone = true;
          void burst(stage, new THREE.Vector3(v.actor.root.position.x, BODY_Y, v.actor.root.position.z), 0x7dffb0, 16, 1.1);
          hud.popup(pointOf(ev.enemyId), t('struck'), 'good');
          hud.unanchor(v.tag);
          void v.actor.flash(0x7dffb0, 0.3, 1);
          v.tag.classList.add('done');
        }
        audio.play('correct');
        await stage.timeline.wait(0.35);
        removeEnemy(ev.enemyId);
        drawBar();
        break;
      }
      case 'repelled': {
        const v = enemies.get(ev.enemyId);
        if (v) {
          void v.actor.flash(0xff4a3a, 0.35, 1);
          void v.actor.play(v.actor.has('hit') ? 'hit' : 'idle', 0.4);
          v.tag.classList.add('bounced');
          hud.popup(pointOf(ev.enemyId), t('bounced'), 'miss');
        }
        stage.shake(0.04, 0.25);
        audio.play('wrong');
        await stage.timeline.wait(0.45);
        break;
      }
      case 'courageLost':
        setCourage(ev.courage);
        hud.popup(heroPoint(), t('courageLost'), 'miss');
        void hero.flash(0xff4a3a, 0.3, 0.8);
        break;
      case 'rest':
        setCourage(ev.courage);
        await hud.banner.show(t('rest.title'), t('rest.text'), 2.2);
        break;
      case 'climbed': {
        const moves = ev.moves.map((m) => ({ v: enemies.get(m.id), to: m.depth })).filter((m): m is { v: EnemyView; to: number } => !!m.v);
        for (const m of moves) {
          m.v.data.depth = m.to;
          if (m.to > m.v.depth) m.v.actor.loop(m.v.actor.has('walk') ? 'walk' : 'idle', 0.1);
        }
        const from = moves.map((m) => m.v.depth);
        await stage.timeline.tween(0.5, (u) => moves.forEach((m, i) => (m.v.depth = from[i]! + (m.to - from[i]!) * u)));
        for (const m of moves) m.v.actor.loop('idle', 0.2);
        for (const v of enemies.values()) v.tag.classList.remove('bounced');
        drawBar();
        break;
      }
      case 'spawned':
        addEnemy(ev.enemy);
        drawBar();
        await stage.timeline.wait(0.25);
        break;
      case 'descentCleared':
        audio.play('victory');
        void hero.play(hero.has('attack2') ? 'attack2' : 'idle', 0.4);
        await stage.timeline.wait(0.6);
        break;
      case 'wellComplete':
        await finish();
        break;
      case 'rejected':
        break;
    }
  }

  async function play(events: readonly AbyssalWellEvent[]): Promise<void> {
    busy = true;
    try {
      for (const ev of events) {
        if (finished && ev.type !== 'wellComplete') break;
        await show(ev);
      }
    } finally {
      busy = false;
    }
    drawBar();
  }

  function command(c: AbyssalWellCommand): void {
    if (busy || finished) return;
    void play(sim.dispatch(c));
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    audio.music('calm');
    audio.play('victory');
    void hero.play(hero.has('victory') ? 'victory' : 'idle', 0.4);
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const { results, outcome, evidence } = resultsOf(sim.state, story, ctx.seed, performance.now() - startedAt);
    ctx.complete(results, outcome, evidence);
  }

  // ---------------------------------------------------------------- keyboard: arrows turn, Space shoots
  const onKey = (e: KeyboardEvent): void => {
    if (finished || e.repeat) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const c: AbyssalWellCommand | null =
      e.key === 'ArrowLeft' || e.key === 'a' ? { type: 'rotate', dir: -1 }
      : e.key === 'ArrowRight' || e.key === 'd' ? { type: 'rotate', dir: 1 }
      : e.key === ' ' || e.key === 'Enter' ? { type: 'fire' }
      : null;
    if (!c) return;
    e.preventDefault();
    command(c);
  };
  window.addEventListener('keydown', onKey);

  stage.onFrame((dt, time) => {
    angle += (angleTarget - angle) * Math.min(1, dt * 9);
    const p = archerPoint(angle);
    hero.root.position.set(p.x, 0, p.z);
    hero.yaw = faceCenter(angle);
    for (const v of enemies.values()) {
      v.appear = v.gone ? Math.max(0, v.appear - dt * 4) : Math.min(1, v.appear + dt * 3);
      const q = lanePoint(v.data.lane, v.depth);
      v.actor.root.position.set(q.x, Math.sin(time * 2 + v.data.lane) * 0.02, q.z);
      v.actor.root.scale.setScalar(Math.max(0.01, v.appear));
    }
    well.ring.material.opacity = 0.4 + 0.15 * Math.sin(time * 1.4);
  });

  (window as unknown as { __apk3dGame?: unknown }).__apk3dGame = { sim, story };

  return {
    start: () => {
      audio.music('well');
      command({ type: 'start' });
    },
    pause: () => undefined,
    resume: () => undefined,
    resize: () => undefined,
    recompose: () => stage.setRig(rig()),
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      window.removeEventListener('keydown', onKey);
      clearEnemies();
      status.remove();
      bar.remove();
      translation.remove();
      hint.remove();
      delete (window as unknown as { __apk3dGame?: unknown }).__apk3dGame;
    },
    test: {
      state: () => sim.state,
      dispatch: (c) => void play(sim.dispatch(c as AbyssalWellCommand)),
      tick: () => undefined,
      auto: () => {
        const c = busy ? null : nextCommand(sim.state);
        if (c) command(c);
        return !!c;
      },
    },
  };
}
