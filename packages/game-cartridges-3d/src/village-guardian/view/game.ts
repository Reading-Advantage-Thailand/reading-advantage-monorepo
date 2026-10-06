/**
 * Village Guardian 3D as a cartridge game. The core (../core) moves everyone in fixed steps;
 * this view builds the village green, walks the hero, the villagers, and the threats to the core's
 * positions, keeps every word readable (tags pinned to the screen edge when off screen), and
 * animates the events. It never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, isAvatarBody, playerBody, Walker } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createVillageGuardian, evidenceOf, BARN_DOOR, GUARDIAN_START, scoreOf, type VillageGuardianCommand, type VillageGuardianEvent, type VillageGuardianState } from '../core/index.js';
import { nextSteer } from '../qc/bot.js';
import { buildVillage, VILLAGE_MODELS } from './village.js';

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  // The student's avatar (or the fixed hero) loads with the scene; an avatar needs no hero model.
  const [, heroBody] = await Promise.all([
    stage.loader.preload([...VILLAGE_MODELS, ...(ctx.options.avatar ? [] : [heroId])].map((n) => stage.loader.modelPath(n))),
    playerBody(stage.loader, ctx.options.avatar, heroId, ctx.diagnostic),
  ]);
  const village = buildVillage(stage);
  const sim = createVillageGuardian(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();

  // ---------------------------------------------------------------- the hero
  const hero = new Walker(stage.addActor(new Actor(heroId, heroBody, stage.timeline)), 'run');
  hero.actor.placeAt(GUARDIAN_START.x, 0, GUARDIAN_START.z, 180);
  const look = isAvatarBody(heroBody) ? undefined : ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.actor.setMap(tex)).catch(() => undefined);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3();
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 7.6, 6.4] : [0, 7.4, 7.8], [0, 0, -1.2], compact() ? 60 : 48, 5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 8, 10);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-village></span></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const villageEl = status.querySelector<HTMLElement>('[data-village]')!;
  const joystick = attachJoystick(hud.el, { hint: t('move'), change: (x, y) => loop.dispatch({ type: 'steer', x, z: y }) });

  audio.defineMood('village', { bpm: 104, chords: [[60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62]], busy: false, drum: true });
  audio.defineSfx('join', (s) => [784, 988, 1319].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
  audio.defineSfx('eek', (s) => s.tone(1200, 0.25, 'square', 0.06, 0, 1.5));
  audio.defineSfx('clank', (s) => {
    s.noise(0.3, 0.2, 1500);
    s.tone(180, 0.35, 'square', 0.08, 0, 0.7);
  });

  // ---------------------------------------------------------------- villagers and threats
  const villagers = new Map<string, { walker: Walker; tag: HTMLElement }>();
  const threats = new Map<string, Walker>();

  function clearVillage(): void {
    for (const v of villagers.values()) {
      hud.unanchor(v.tag);
      stage.removeActor(v.walker.actor);
    }
    villagers.clear();
    for (const s of threats.values()) stage.removeActor(s.actor);
    threats.clear();
  }

  function startVillage(ev: Extract<VillageGuardianEvent, { type: 'villageStarted' }>): void {
    clearVillage();
    for (const v of ev.villagers) {
      const g = stage.loader.get(stage.loader.modelPath(v.kind)) ?? stage.loader.get(stage.loader.modelPath('villager'))!;
      const actor = stage.addActor(new Actor(v.kind, g, stage.timeline, { phase: Math.random() }));
      actor.placeAt(v.x, 0, v.z, 0);
      const tag = document.createElement('div');
      tag.className = 'arena-tag';
      tag.textContent = v.word;
      hud.anchor(tag, () => stage.screenOf(actor, 1.25), { pin: true });
      villagers.set(v.id, { walker: new Walker(actor), tag });
    }
    for (const th of ev.threats) {
      const actor = stage.addActor(new Actor(th.kind, stage.loader.get(stage.loader.modelPath(th.kind))!, stage.timeline, { phase: Math.random() }));
      actor.placeAt(th.x, 0, th.z, 0);
      threats.set(th.id, new Walker(actor, 'walk', 10));
    }
    village.door.material.opacity = 0;
    village.glow.intensity = 0;
    drawBar();
  }

  function drawBar(): void {
    const s = sim.state;
    const sentence = s.shift[s.village];
    if (sentence) sentenceBar(bar, sentence.words, s.next, s.helper);
    for (const v of s.villagers) {
      const view = villagers.get(v.id);
      if (!view) continue;
      view.tag.classList.toggle('done', v.following);
      view.tag.classList.toggle('next', s.helper && v.index === s.next);
    }
    villageEl.textContent = t('village', { village: Math.min(s.village + 1, s.villages), villages: s.villages });
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  const at = (id: string): { x: number; y: number; visible: boolean } => {
    const v = villagers.get(id);
    return v ? stage.screenOf(v.walker.actor, 1.5) : { x: 0, y: 0, visible: false };
  };

  /** The guardian and the line walk to the open barn door and in, one after the other, then the screen fades. */
  const WALK_OUT = { speed: 2.4, gap: 0.45, beyond: 1.4 };
  async function fileOut(line: readonly string[]): Promise<void> {
    exiting = true;
    const gate = new THREE.Vector3(BARN_DOOR.x, 0, BARN_DOOR.z);
    const beyond = new THREE.Vector3(BARN_DOOR.x, 0, BARN_DOOR.z - WALK_OUT.beyond);
    // After the last village the guardian stays at the door and cheers; only the line goes in.
    const last = sim.state.phase === 'complete';
    const walkers = [...(last ? [] : [hero]), ...line.map((id) => villagers.get(id)?.walker).filter((w): w is Walker => !!w)];
    await Promise.all(
      walkers.map(async (w, i) => {
        await stage.timeline.wait(i * WALK_OUT.gap);
        const a = w.actor;
        a.loop(w === hero ? 'run' : 'walk', 0.1);
        const from = a.root.position.clone();
        const first = from.distanceTo(gate);
        const total = first + gate.distanceTo(beyond);
        await stage.timeline.tween(total / WALK_OUT.speed, (u) => {
          const d = u * total;
          const [p, q, k] = d < first ? [from, gate, d / Math.max(first, 1e-6)] : [gate, beyond, (d - first) / (total - first)];
          a.root.position.lerpVectors(p, q, k);
          a.yaw = THREE.MathUtils.radToDeg(Math.atan2(q.x - p.x, q.z - p.z));
        });
        a.root.visible = false;
        const entry = [...villagers.values()].find((v) => v.walker === w);
        if (entry) entry.tag.style.display = 'none';
      }),
    );
    if (last) return;
    await stage.timeline.wait(0.2);
    await fade(1);
  }

  /** A black cover over the stage: 1 hides the village, 0 shows it. */
  const cover = document.createElement('div');
  cover.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .25s;z-index:30';
  hud.el.append(cover);
  async function fade(to: number): Promise<void> {
    cover.style.opacity = String(to);
    await stage.timeline.wait(0.3);
  }

  // Events play one after another, so the walk in can finish before the next village appears.
  const queue: VillageGuardianEvent[] = [];
  let draining = false;
  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    while (queue.length > 0) await handle(queue.shift()!);
    draining = false;
  }
  let exiting = false;
  let lineBefore: string[] = [];

  async function handle(ev: VillageGuardianEvent): Promise<void> {
    switch (ev.type) {
      case 'villageStarted': {
        startVillage(ev);
        const k = sim.state.guardian;
        hero.actor.root.visible = true;
        hero.teleport(k.x, k.z, 180);
        if (exiting) {
          exiting = false;
          await fade(0);
          loop.reset();
        }
        break;
      }
      case 'villagerJoined': {
        const v = villagers.get(ev.id);
        if (v) v.walker.play(v.walker.actor.has('wave') ? 'wave' : 'salute');
        hud.popup(at(ev.id), t('joined'), 'good');
        audio.play('join');
        break;
      }
      case 'villagerRefused': {
        const v = villagers.get(ev.id);
        if (v) v.walker.play('talk');
        hud.popup(at(ev.id), t('notYet'), 'miss');
        audio.play('wrong');
        break;
      }
      case 'lineScared':
        for (const id of ev.ids) hud.popup(at(id), t('scared'), 'miss');
        audio.play('eek');
        break;
      case 'guardianBumped': {
        hero.play('hit');
        stage.shake(0.06, 0.3);
        const s = threats.get(ev.threatId);
        if (s) s.play(s.actor.has('attack') ? 'attack' : 'taunt');
        audio.play('hit');
        break;
      }
      case 'barnOpened': {
        audio.play('clank');
        audio.play('correct');
        void stage.timeline.tween(1.0, (u) => (village.door.material.opacity = u * 0.75));
        void stage.timeline.tween(1.0, (u) => (village.glow.intensity = u * 10));
        void burst(stage, new THREE.Vector3(BARN_DOOR.x, 1, BARN_DOOR.z - 0.2), 0xffe27a, 18, 1.2);
        void hud.banner.show(t('barn'), '', 1.6);
        break;
      }
      case 'villageSaved':
        audio.play('victory');
        await fileOut(lineBefore);
        break;
      case 'watchComplete':
        await finish();
        break;
    }
    drawBar();
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
  const loop = createFixedStepLoop<VillageGuardianState, VillageGuardianCommand, VillageGuardianEvent>(sim, { render: (events) => (queue.push(...events), void drain()) }, clock);

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    if (!exiting) {
      lineBefore = sim.state.line.slice();
      const cb = nextFrame;
      nextFrame = null;
      cb?.();
    }
    const s = sim.state;
    if (exiting) target.set(hero.actor.root.position.x * 0.6, 0, hero.actor.root.position.z);
    else {
      hero.update(dt, s.guardian.x, s.guardian.z);
      target.set(s.guardian.x * 0.6, 0, s.guardian.z);
      for (const v of s.villagers) villagers.get(v.id)?.walker.update(dt, v.x, v.z);
    }
    for (const k of s.threats) threats.get(k.id)?.update(dt, k.x, k.z);
  });

  return {
    start: () => {
      audio.music('village');
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
      clearVillage();
      status.remove();
      bar.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as VillageGuardianCommand),
      tick: (steps) => {
        // QC fast-forward: no walk out (it needs frames), so a saved village is not played.
        for (let i = 0; i < steps; i++) sim.tick().forEach((ev) => void (ev.type === 'villageSaved' ? undefined : handle(ev)));
      },
      auto: () => {
        const command = nextSteer(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
