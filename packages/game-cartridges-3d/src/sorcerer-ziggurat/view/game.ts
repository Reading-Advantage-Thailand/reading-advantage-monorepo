/**
 * Sorcerer's Ziggurat 3D as a cartridge game. The core (../core) is turn-based: every answer is
 * decided at once and returns events. This view plays the events in order (a hop up, a crumbling
 * cube, a rest), builds the ziggurat tier by tier, keeps every word readable and tappable (HTML
 * tags over the cubes, pinned to the screen edge when off screen), and never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { smooth } from '@reading-advantage/advantage-play-kit-3d/stage';
import { Actor, burst, FollowRig } from '@reading-advantage/advantage-play-kit-3d/stage';
import {
  createSorcererZiggurat,
  evidenceOf,
  openingEvents,
  scoreOf,
  type CubeSpawn,
  type Lane,
  type ZigguratCommand,
  type ZigguratEvent,
} from '../core/index.js';
import { nextStep } from '../qc/bot.js';
import { summitPoint, tierPoint, ZIGGURAT_MODELS, ZigguratScene, type CubeView } from './ziggurat.js';
import sorcerer_zigguratCss from './sorcerer-ziggurat.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('sorcerer-ziggurat', sorcerer_zigguratCss);

const KEY_LANES: Readonly<Record<string, Lane>> = { ArrowLeft: 'left', a: 'left', ArrowUp: 'forward', w: 'forward', ArrowRight: 'right', d: 'right' };

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as StoryInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'wizard';
  await stage.loader.preload([...ZIGGURAT_MODELS, heroId].map((n) => stage.loader.modelPath(n)));
  const world = new ZigguratScene(stage);
  const sim = createSorcererZiggurat(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const heroGltf = stage.loader.get(stage.loader.modelPath(heroId))!;
  const hero = stage.addActor(new Actor(heroId, heroGltf, stage.timeline));
  const foot = tierPoint(0, 'forward');
  hero.placeAt(foot.x, foot.y, foot.z, 180);
  const look = ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3().copy(foot);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 4.6, 7.6] : [0, 4.0, 6.6], [0, 0.8, -3.4], compact() ? 62 : 52, 3.5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 5.2, 8.4);
  stage.pose.look.set(0, 1, -2);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-ritual></span></div>
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
  const prompt = document.createElement('div');
  prompt.className = 'zig-prompt';
  hud.el.append(prompt);
  const hint = document.createElement('div');
  hint.className = 'zig-hint';
  hint.textContent = t('aim');
  hud.el.append(hint);
  const ritualEl = status.querySelector<HTMLElement>('[data-ritual]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;

  audio.defineMood('ziggurat', { bpm: 88, chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]], busy: false, drum: false });
  audio.defineSfx('hop', (s) => s.tone(420, 0.2, 'triangle', 0.12, 0, 1.6));
  audio.defineSfx('crumble', (s) => s.tone(160, 0.35, 'sawtooth', 0.06, 0, 0.5));
  audio.defineSfx('chime', (s) => [880, 1175, 1568].forEach((f, i) => s.tone(f, 0.25, 'sine', 0.1, i * 0.07)));

  // ---------------------------------------------------------------- what the view shows
  /** The view runs behind the core while it plays events, so the HUD reads these, not the state. */
  const shown = { ritual: 0, found: 0, courage: sim.state.courage };
  const cubes = new Map<string, { view: CubeView; tag: HTMLButtonElement }>();
  const point = new THREE.Vector3();

  function drawHud(): void {
    const s = sim.state;
    const ritual = s.climb[shown.ritual];
    if (ritual) sentenceBar(bar, ritual.words, shown.found, s.helper);
    ritualEl.textContent = t('ritual', { ritual: Math.min(shown.ritual + 1, s.rituals), rituals: s.rituals });
    courageEl.textContent = '❤'.repeat(shown.courage) + '♡'.repeat(Math.max(0, s.maxCourage - shown.courage));
  }

  function clearCubes(): void {
    for (const c of cubes.values()) hud.unanchor(c.tag);
    cubes.clear();
  }

  function addCube(spawn: CubeSpawn, tier: number): void {
    const view = world.addCube(spawn.id, spawn.lane, tier);
    const tag = document.createElement('button');
    tag.type = 'button';
    tag.className = 'arena-tag zig-tag';
    if (sim.state.helper && spawn.correct) tag.classList.add('next');
    tag.textContent = spawn.word;
    tag.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      send({ type: 'step', cubeId: spawn.id });
    });
    const at = new THREE.Vector3();
    hud.anchor(tag, () => stage.screenOfPoint(at.set(view.top.x, view.top.y + view.group.position.y + 0.7, view.top.z)), { pin: true });
    cubes.set(spawn.id, { view, tag });
    // The cube rises out of the ground.
    view.group.position.y = -view.top.y - 0.4;
    tag.style.visibility = 'hidden';
    void stage.timeline
      .tween(0.45, (u) => (view.group.position.y = (-view.top.y - 0.4) * (1 - smooth(u))))
      .then(() => {
        view.group.position.y = 0;
        tag.style.visibility = '';
      });
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const overHero = () => stage.screenOf(hero, 1.5);

  async function hop(to: THREE.Vector3): Promise<void> {
    const from = hero.root.position.clone();
    hero.yaw = 180;
    hero.loop(hero.has('run') ? 'run' : 'idle', 0.1);
    audio.play('hop');
    await stage.timeline.tween(0.5, (u) => {
      const k = smooth(u);
      hero.root.position.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k + Math.sin(Math.PI * u) * 0.7, from.z + (to.z - from.z) * k);
    });
    hero.placeAt(to.x, to.y, to.z, 180);
    hero.loop('idle', 0.15);
  }

  async function handle(ev: ZigguratEvent): Promise<void> {
    switch (ev.type) {
      case 'ritualStarted': {
        clearCubes();
        shown.ritual = sim.state.climb.findIndex((r) => r.ritualId === ev.ritualId);
        shown.found = 0;
        world.startRitual(ev.words.length);
        world.glowCrystal(0.35);
        hero.placeAt(foot.x, foot.y, foot.z, 180);
        target.copy(foot);
        prompt.textContent = ev.translation ?? '';
        break;
      }
      case 'tierOffered':
        ev.cubes.forEach((c) => addCube(c, ev.tier + 1));
        break;
      case 'stepped': {
        const chosen = cubes.get(ev.cubeId);
        for (const [id, c] of cubes) {
          hud.unanchor(c.tag);
          if (id !== ev.cubeId) world.settle(c.view, false);
        }
        cubes.clear();
        hud.popup(overHero(), t('stepped'), 'good');
        audio.play('correct');
        if (chosen) await hop(chosen.view.top);
        shown.found = ev.tier;
        break;
      }
      case 'cubeCrumbled': {
        const c = cubes.get(ev.id);
        if (c) {
          c.tag.classList.add('spent');
          world.setCrumbled(c.view, true);
          hud.popup(stage.screenOfPoint(point.set(c.view.top.x, c.view.top.y + 0.9, c.view.top.z)), t('crumbled'), 'miss');
          void burst(stage, new THREE.Vector3(c.view.top.x, c.view.top.y, c.view.top.z), 0x9a8fb8, 10, 0.9);
          const g = c.view.group;
          void stage.timeline.tween(0.3, (u) => (g.position.y = -0.4 * smooth(u)));
        }
        stage.shake(0.04, 0.2);
        audio.play('crumble');
        audio.play('wrong');
        break;
      }
      case 'courageChanged':
        shown.courage = ev.courage;
        if (ev.courage > 0) hud.popup(overHero(), t('courageLost'), '');
        break;
      case 'teamRested': {
        shown.courage = ev.courage;
        for (const id of ev.restored) {
          const c = cubes.get(id);
          if (!c) continue;
          c.tag.classList.remove('spent');
          world.setCrumbled(c.view, false);
          const g = c.view.group;
          void stage.timeline.tween(0.3, (u) => (g.position.y = -0.4 * (1 - smooth(u))));
        }
        void hero.play(hero.has('hit') ? 'hit' : 'idle', 0.4);
        await hud.banner.show(t('rested'), '', 1.1);
        break;
      }
      case 'ritualCleared': {
        for (const c of cubes.values()) hud.unanchor(c.tag);
        cubes.clear();
        await hop(summitPoint(sim.state.climb.find((r) => r.ritualId === ev.ritualId)?.words.length ?? 1).add(new THREE.Vector3(0, 0, 1.0)));
        world.glowCrystal(1.8);
        void burst(stage, hero.root.position.clone().add(new THREE.Vector3(0, 1, 0)), 0xffe08a, 20, 1.3);
        void hero.play(hero.has('victory') ? 'victory' : 'idle', 0.4);
        audio.play('chime');
        audio.play('victory');
        if (sim.state.phase !== 'complete') await hud.banner.show(t('cleared'), '', 1.2);
        break;
      }
      case 'climbComplete':
        await finish();
        break;
    }
    drawHud();
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    audio.music('calm');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  /** Events play one after another, in order; a tap during an animation waits its turn. */
  let queue: Promise<void> = Promise.resolve();
  function play(events: readonly ZigguratEvent[]): void {
    for (const ev of events) queue = queue.then(() => handle(ev)).catch(() => undefined);
  }
  function send(command: ZigguratCommand): void {
    if (finished) return;
    hint.remove();
    play(sim.dispatch(command));
  }

  // ---------------------------------------------------------------- keyboard: left, forward, right
  const onKey = (e: KeyboardEvent): void => {
    if (finished || e.repeat) return;
    const tag = (e.target as HTMLElement | null)?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;
    const lane = KEY_LANES[e.key];
    if (!lane) return;
    e.preventDefault();
    send({ type: 'step', lane });
  };
  window.addEventListener('keydown', onKey);

  const removeFrame = stage.onFrame((_dt, time) => {
    world.frame(time);
    target.lerp(hero.root.position, 0.12);
  });

  return {
    start: () => {
      audio.music('ziggurat');
      play(openingEvents(sim.state));
      drawHud();
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
      removeFrame();
      window.removeEventListener('keydown', onKey);
      clearCubes();
      world.dispose();
      status.remove();
      bar.remove();
      prompt.remove();
      hint.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => send(command as ZigguratCommand),
      tick: () => undefined,
      auto: () => {
        const command = nextStep(sim.state);
        if (command) send(command);
        return !!command;
      },
    },
  };
}
