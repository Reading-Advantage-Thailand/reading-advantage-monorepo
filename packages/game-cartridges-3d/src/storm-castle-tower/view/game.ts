/**
 * Storm Castle Tower 3D as a cartridge game. The core (../core) moves the climber and the falling
 * hazards in fixed steps; this view builds the tower, glides the climber to the core's cell,
 * shows a stone window with a word tag for each choice (tags pinned to the screen edge when off
 * screen), drops the oil and the rocks, and animates the events. It never decides a rule: every
 * window looks the same, so the look gives no hint.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { attachJoystick, esc, sentenceBar } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, FollowRig, isAvatarBody, playerBody } from '@reading-advantage/advantage-play-kit-3d/stage';
import {
  createStormCastleTower,
  evidenceOf,
  rightWindowsOf,
  scoreOf,
  type StormCastleTowerCommand,
  type StormCastleTowerEvent,
  type StormCastleTowerState,
} from '../core/index.js';
import { nextCommand } from '../qc/bot.js';
import { buildSky, buildTower, CLIMBER_Z, columnX, fitModel, materialsOf, rowY, TOWER_MODELS, WALL_Z, type FittedModel, type Tower } from './tower.js';
import storm_castle_towerCss from './storm-castle-tower.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('storm-castle-tower', storm_castle_towerCss);

/** The word tag floats this high over the cell of a window. */
const TAG_LIFT = 1.9;

interface WindowView {
  root: THREE.Group;
  materials: THREE.MeshStandardMaterial[];
  tag: HTMLElement | null;
  col: number;
  row: number;
}

interface HazardView {
  root: THREE.Group;
  type: 'oil' | 'rock';
  last: THREE.Vector3;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const audio = ctx.audio;
  const hud = ctx.hud;
  const heroId = ctx.options.hero || 'knight';
  // The student's avatar (or the fixed hero) loads with the scene; an avatar needs no hero model.
  const [, heroBody] = await Promise.all([
    stage.loader.preload([...TOWER_MODELS, ...(ctx.options.avatar ? [] : [heroId])].map((n) => stage.loader.modelPath(n))),
    playerBody(stage.loader, ctx.options.avatar, heroId, ctx.diagnostic),
  ]);
  const sky = buildSky(stage);
  const sim = createStormCastleTower(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();
  let tower: Tower = buildTower(stage, sim.state.summitRow);
  let towerId = sim.state.shift[sim.state.tower]?.towerId ?? '';

  // ---------------------------------------------------------------- the hero
  const hero = stage.addActor(new Actor(heroId, heroBody, stage.timeline));
  const spot = { x: columnX(sim.state.climber.col), y: rowY(sim.state.climber.row) };
  hero.placeAt(spot.x, spot.y, CLIMBER_Z, 0);
  const look = isAvatarBody(heroBody) ? undefined : ctx.options.looks[heroId];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(heroId, look)).then((tex) => hero.setMap(tex)).catch(() => undefined);
  let running = false;
  const lantern = new THREE.PointLight(0xffc27a, 6, 7, 1.7);
  stage.scene.add(lantern);

  // ---------------------------------------------------------------- camera
  const target = new THREE.Vector3(spot.x * 0.5, spot.y, 0);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  const rig = (): FollowRig => new FollowRig(() => target, compact() ? [0, 2.4, 13.5] : [0, 2.2, 9.6], [0, 1.9, 0], compact() ? 56 : 50, 5);
  stage.setRig(rig());
  stage.pose.pos.set(0, 4, 12);

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-tower></span></div>
    <div class="meter">${esc(t('courage'))}<b data-courage></b></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const towerEl = status.querySelector<HTMLElement>('[data-tower]')!;
  const courageEl = status.querySelector<HTMLElement>('[data-courage]')!;
  const bar = document.createElement('div');
  bar.className = 'sentence-bar';
  hud.el.append(bar);
  const gloss = document.createElement('div');
  gloss.className = 'tower-gloss';
  hud.el.append(gloss);
  const joystick = attachJoystick(hud.el, { hint: t('move'), change: (x, y) => loop.dispatch({ type: 'steer', x, z: y }) });

  audio.defineMood('storm', { bpm: 100, chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 56, 59]], busy: false, drum: true });
  audio.defineSfx('open', (s) => [659, 880, 1175].forEach((f, i) => s.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
  audio.defineSfx('rumble', (s) => s.noise(0.35, 0.1, 500));
  audio.defineSfx('crash', (s) => {
    s.noise(0.3, 0.2, 1200);
    s.tone(150, 0.3, 'square', 0.08, 0, 0.6);
  });
  audio.defineSfx('clank', (s) => {
    s.noise(0.3, 0.2, 1500);
    s.tone(180, 0.35, 'square', 0.08, 0, 0.7);
  });

  // ---------------------------------------------------------------- windows
  const windows = new Map<string, WindowView>();
  const litViews: WindowView[] = [];

  function disposeView(v: WindowView): void {
    if (v.tag) {
      hud.unanchor(v.tag);
      v.tag = null;
    }
    v.root.removeFromParent();
  }

  function clearWindows(): void {
    for (const v of windows.values()) disposeView(v);
    windows.clear();
    for (const v of litViews) disposeView(v);
    litViews.length = 0;
  }

  function glow(v: WindowView, color: number, strength: number): void {
    for (const m of v.materials) {
      m.emissive.setHex(color);
      m.emissiveIntensity = strength;
    }
  }

  function placeWindows(list: Extract<StormCastleTowerEvent, { type: 'windowsPlaced' }>['windows']): void {
    // The windows of the row before that are not lit leave the wall.
    for (const [id, v] of [...windows]) {
      disposeView(v);
      windows.delete(id);
    }
    for (const w of list) {
      const made: FittedModel | null = fitModel(stage, 'arch', { height: 1.45 });
      if (!made) continue;
      if (made.size.x > 1.55) made.root.scale.multiplyScalar(1.55 / made.size.x);
      made.root.position.set(columnX(w.col), rowY(w.row), WALL_Z + 0.2);
      stage.scene.add(made.root);
      const tag = document.createElement('div');
      tag.className = 'arena-tag tower-tag';
      tag.textContent = w.word;
      const at = new THREE.Vector3(columnX(w.col), rowY(w.row) + TAG_LIFT, CLIMBER_Z);
      hud.anchor(tag, () => stage.screenOfPoint(at), { pin: true });
      const view: WindowView = { root: made.root, materials: materialsOf(made.root), tag, col: w.col, row: w.row };
      glow(view, 0x7a5cff, 0.35);
      windows.set(w.id, view);
    }
    drawHud();
  }

  // ---------------------------------------------------------------- hazards and weather
  const hazards = new Map<string, HazardView>();
  const warn = [0, 1, 2, 3].map((col) => {
    const m = new THREE.Mesh(
      new THREE.PlaneGeometry(1.4, 12),
      new THREE.MeshBasicMaterial({ color: 0xff5a3c, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false }),
    );
    m.position.set(columnX(col), 0, WALL_Z + 0.35);
    stage.scene.add(m);
    return m;
  });
  const rainCount = 220;
  const rainGeo = new THREE.BufferGeometry();
  const rainPos = new Float32Array(rainCount * 3);
  for (let i = 0; i < rainCount; i++) rainPos.set([(Math.random() - 0.5) * 16, Math.random() * 14, (Math.random() - 0.3) * 8], i * 3);
  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
  const rain = new THREE.Points(rainGeo, new THREE.PointsMaterial({ color: 0xa8c4ff, size: 0.07, transparent: true, opacity: 0.55, depthWrite: false }));
  rain.frustumCulled = false;
  stage.scene.add(rain);
  let flash = 0;
  let nextFlash = 5 + Math.random() * 6;

  function addHazard(h: { id: string; type: 'oil' | 'rock'; col: number; y: number }): void {
    const made = fitModel(stage, h.type === 'oil' ? 'barrel' : 'boulder', { height: h.type === 'oil' ? 0.95 : 0.8 });
    if (!made) return;
    if (h.type === 'oil') for (const m of materialsOf(made.root)) (m.emissive.setHex(0xff7a1a), (m.emissiveIntensity = 0.45));
    made.root.position.set(columnX(h.col), rowY(h.y), CLIMBER_Z + 0.15);
    stage.scene.add(made.root);
    hazards.set(h.id, { root: made.root, type: h.type, last: made.root.position.clone() });
  }

  // ---------------------------------------------------------------- the view of the state
  function drawHud(): void {
    const s = sim.state;
    const tw = s.shift[s.tower];
    if (tw) sentenceBar(bar, tw.words, s.next, s.helper);
    gloss.textContent = tw?.translation ?? '';
    towerEl.textContent = t('tower', { tower: Math.min(s.tower + 1, s.towers), towers: s.towers });
    courageEl.textContent = '❤'.repeat(s.courage) + '♡'.repeat(Math.max(0, s.maxCourage - s.courage));
    const right = new Set(s.helper ? rightWindowsOf(s).map((w) => w.id) : []);
    for (const w of s.windows) {
      const v = windows.get(w.id);
      if (!v?.tag) continue;
      v.tag.classList.toggle('spent', w.spent);
      v.tag.classList.toggle('next', right.has(w.id));
    }
  }

  // ---------------------------------------------------------------- events
  let finished = false;
  /** True from the cleared tower until the next one shows: the core waits, so the climb does not move on unseen. */
  let transition = false;
  let covered = false;
  const overHero = (): { x: number; y: number; visible: boolean } => stage.screenOf(hero, 1.9);
  const point = new THREE.Vector3();
  const overWindow = (id: string): { x: number; y: number; visible: boolean } => {
    const v = windows.get(id);
    return v ? stage.screenOfPoint(point.set(columnX(v.col), rowY(v.row) + 1.1, CLIMBER_Z)) : overHero();
  };

  /** A black cover over the stage: 1 hides the tower, 0 shows it. */
  const cover = document.createElement('div');
  cover.style.cssText = 'position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;transition:opacity .25s;z-index:30';
  hud.el.append(cover);
  async function fade(to: number): Promise<void> {
    cover.style.opacity = String(to);
    await stage.timeline.wait(0.3);
  }

  const queue: StormCastleTowerEvent[] = [];
  let draining = false;
  async function drain(): Promise<void> {
    if (draining) return;
    draining = true;
    while (queue.length > 0) await handle(queue.shift()!);
    draining = false;
  }

  function startTower(ev: Extract<StormCastleTowerEvent, { type: 'towerStarted' }>): void {
    clearWindows();
    for (const h of hazards.values()) h.root.removeFromParent();
    hazards.clear();
    if (ev.towerId !== towerId) {
      tower.dispose();
      tower = buildTower(stage, ev.summitRow);
      towerId = ev.towerId;
    }
    const k = sim.state.climber;
    spot.x = columnX(k.col);
    spot.y = rowY(k.row);
    hero.placeAt(spot.x, spot.y, CLIMBER_Z, 0);
    hero.root.visible = true;
    hero.loop(hero.idle, 0);
    running = false;
    target.set(spot.x * 0.5, spot.y, 0);
    drawHud();
  }

  async function handle(ev: StormCastleTowerEvent): Promise<void> {
    switch (ev.type) {
      case 'towerStarted':
        startTower(ev);
        if (covered) {
          covered = false;
          await fade(0);
          loop.reset();
        }
        transition = false;
        break;
      case 'windowsPlaced':
        placeWindows(ev.windows);
        break;
      case 'windowOpened': {
        const v = windows.get(ev.id);
        if (v) {
          windows.delete(ev.id);
          if (v.tag) {
            hud.unanchor(v.tag);
            v.tag = null;
          }
          glow(v, 0xffd84a, 0.8);
          litViews.push(v);
          void burst(stage, new THREE.Vector3(columnX(v.col), rowY(v.row) + 0.8, CLIMBER_Z), 0xffe08a, 14, 0.9);
          hud.popup(stage.screenOfPoint(point.set(columnX(v.col), rowY(v.row) + 1.1, CLIMBER_Z)), t('opened'), 'good');
        }
        audio.play('open');
        audio.play('correct');
        break;
      }
      case 'windowShut': {
        const v = windows.get(ev.id);
        if (v) {
          glow(v, 0x000000, 0);
          for (const m of v.materials) m.color.multiplyScalar(0.45);
        }
        hud.popup(overWindow(ev.id), t('shut'), 'miss');
        audio.play('wrong');
        break;
      }
      case 'hazardFell':
        addHazard(ev.hazard);
        audio.play('rumble');
        break;
      case 'climberHit': {
        const h = hazards.get(ev.hazardId);
        if (h) {
          void burst(stage, h.last, h.type === 'oil' ? 0xff9a3c : 0xbdb6c8, 16, 1.1);
          h.root.removeFromParent();
          hazards.delete(ev.hazardId);
        }
        if (hero.has('hit')) void hero.play('hit');
        stage.shake(0.06, 0.3);
        hud.popup(overHero(), t('hit'), 'miss');
        audio.play('hit');
        audio.play('crash');
        break;
      }
      case 'courageChanged':
        hud.popup(overHero(), t('courageLost'), '');
        break;
      case 'teamRested': {
        void hud.banner.show(t('rested'), '', 1.2);
        const k = sim.state.climber;
        spot.x = columnX(k.col);
        spot.y = rowY(k.row);
        hero.placeAt(spot.x, spot.y, CLIMBER_Z, 0);
        for (const h of hazards.values()) h.root.removeFromParent();
        hazards.clear();
        loop.reset();
        break;
      }
      case 'summitOpened': {
        audio.play('clank');
        audio.play('correct');
        const gate = tower.gate;
        const from = gate ? gate.position.y : 0;
        if (gate) void stage.timeline.tween(1.0, (u) => (gate.position.y = from + u * 1.9));
        void stage.timeline.tween(1.0, (u) => (tower.glow.intensity = u * 10));
        void burst(stage, new THREE.Vector3(0, rowY(sim.state.summitRow) + 1, CLIMBER_Z), 0x9dffb0, 18, 1.2);
        void hud.banner.show(t('summit'), t('climbUp'), 1.6);
        break;
      }
      case 'towerCleared':
        audio.play('victory');
        if (sim.state.phase === 'playing') {
          transition = true;
          if (hero.has('victory')) void hero.play('victory');
          await stage.timeline.wait(1.2);
          covered = true;
          await fade(1);
        }
        break;
      case 'climbComplete':
        await finish();
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
    if (hero.has('victory')) void hero.play('victory');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = { now: () => stageMs, requestFrame: (cb) => ((nextFrame = cb), 1), cancelFrame: () => (nextFrame = null) };
  const loop = createFixedStepLoop<StormCastleTowerState, StormCastleTowerCommand, StormCastleTowerEvent>(
    sim,
    { render: (events) => (queue.push(...events), void drain()) },
    clock,
  );

  stage.onFrame((dt, time) => {
    stageMs += dt * 1000;
    if (!transition) {
      const cb = nextFrame;
      nextFrame = null;
      cb?.();
    }
    const s = sim.state;
    if (!transition) {
      const k = 1 - Math.exp(-14 * dt);
      const wantX = columnX(s.climber.col);
      const wantY = rowY(s.climber.row);
      const dx = wantX - spot.x;
      const dy = wantY - spot.y;
      spot.x += dx * k;
      spot.y += dy * k;
      const moving = Math.hypot(dx, dy) > 0.08;
      if (moving !== running) {
        running = moving;
        hero.loop(moving ? 'run' : hero.idle, 0.12);
      }
      if (moving) hero.yaw = Math.abs(dy) >= Math.abs(dx) ? (dy > 0 ? 180 : 0) : dx > 0 ? 90 : -90;
      else hero.yaw = 0;
      hero.root.position.set(spot.x, spot.y, CLIMBER_Z);
      hero.root.visible = s.climber.protectMs <= 0 || Math.floor(time * 12) % 2 === 0;
      target.set(spot.x * 0.5, spot.y, 0);
    }
    lantern.position.set(spot.x, spot.y + 2, CLIMBER_Z + 1.4);

    // Hazards fall to the core's rows; one that left the state is gone.
    for (const [id, v] of [...hazards]) {
      if (!s.hazards.some((h) => h.id === id)) {
        if (!transition) v.root.removeFromParent();
        hazards.delete(id);
      }
    }
    for (const h of s.hazards) {
      const v = hazards.get(h.id);
      if (!v) continue;
      v.root.position.set(columnX(h.col), rowY(h.y), CLIMBER_Z + 0.15);
      v.root.rotation.z = time * (v.type === 'rock' ? 4 : 2);
      v.last.copy(v.root.position).setY(v.root.position.y + 0.4);
    }
    warn.forEach((m, col) => {
      const falling = s.hazards.some((h) => h.col === col && h.y > s.climber.row - 0.5);
      const mat = m.material as THREE.MeshBasicMaterial;
      mat.opacity = falling ? 0.14 + 0.08 * Math.sin(time * 9) : 0;
      m.position.y = spot.y + 5;
    });

    for (const v of windows.values()) {
      const pulse = 0.35 + 0.12 * Math.sin(time * 3 + v.col);
      for (const m of v.materials) if (m.emissiveIntensity > 0) m.emissiveIntensity = pulse;
    }

    // Weather: rain around the camera target, and a flash of lightning now and then.
    const p = rainGeo.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < rainCount; i++) {
      let y = p.getY(i) - 14 * dt;
      if (y < -1) y += 14;
      p.setY(i, y);
    }
    p.needsUpdate = true;
    rain.position.set(0, spot.y - 2, 0);
    nextFlash -= dt;
    if (nextFlash <= 0) {
      flash = 1;
      nextFlash = 6 + Math.random() * 8;
    }
    flash = Math.max(0, flash - dt * 3);
    sky.hemi.intensity = 1.3 + flash * 1.4;
    tower.glow.intensity = sim.state.summitOpen ? tower.glow.intensity : 0;
  });

  drawHud();

  return {
    start: () => {
      audio.music('storm');
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
      clearWindows();
      for (const h of hazards.values()) h.root.removeFromParent();
      hazards.clear();
      tower.dispose();
      for (const m of warn) m.removeFromParent();
      rain.removeFromParent();
      lantern.removeFromParent();
      status.remove();
      bar.remove();
      gloss.remove();
      cover.remove();
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as StormCastleTowerCommand),
      tick: (steps) => {
        // QC fast-forward: no fade between towers (it needs frames), so a cleared tower is not played.
        for (let i = 0; i < steps; i++) sim.tick().forEach((ev) => void (ev.type === 'towerCleared' ? undefined : handle(ev)));
      },
      auto: () => {
        const command = nextCommand(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
