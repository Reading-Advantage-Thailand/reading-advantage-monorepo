/**
 * Dragon Rider in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts). The 2D
 * camera is the one of every 2D view (elevation 45 degrees, 64 px/m) and follows the rider: the
 * student's hero sits on the dragon, the highland scrolls past in chunks (the 3D view's plan),
 * two gates wait ahead with their meanings on tags the student taps (or a swipe, or the arrow
 * keys), and the dark dragon hovers ahead for the duel.
 */
import type * as Phaser from 'phaser';
import { shownHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import { playerFigure } from '@reading-advantage/advantage-play-kit-3d/avatar/portrait-of';
import { preloadAssetBindings, toGameResults } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { animationKeyOf, banner, COLORS, depthOf, Figure2D, fitGameSize, popup, recolorTag, registerSheetAnimations, SPRITE_PPM, StatusBar2D, tag, textureKeyOf, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createDragonRider, evidenceOf, scoreOf, type DragonRiderCommand, type DragonRiderEvent, type DragonRiderState, type DragonRiderInput } from '../core/index.js';
import { evidenceStoryOf } from '../../shared/challenge.js';
import { manifest, FILES_2D, HEROES_2D } from '../manifest.js';
import { nextChoice } from '../qc/bot.js';
import strings from '../strings.en.js';
import { CHUNK, GATE_X, HIGHLAND, rng } from '../view/land-plan.js';

const PPM = 64;
const ELEVATION = 45;
const COS = Math.cos((ELEVATION * Math.PI) / 180);
const SIN = Math.sin((ELEVATION * Math.PI) / 180);
/** Sizes: the 2D camera is far above the path, so the dragons are bigger than in the 3D view. */
const DRAGON_SCALE = 1.5;
const FLOCK_SCALE = 0.6;
const BOSS_SCALE = 2.2;
const HERO_PX = 84;
/** The frame width of a hero sheet in pixels (the student's figure takes the same scale). */
const HERO_FRAME = 120;
const CRUISE_Y = 2.4;
const GATE_Y = 1.35;
const BOSS_Y = 3.2;
const BOSS_TINT = 0x8a6ac0;
const GATE_SCALE = 1.25;
const sideX = (r: () => number, big: boolean): number => (r() < 0.5 ? -1 : 1) * (big ? 5.6 + r() * 5 : 4.4 + r() * 4.5);

interface Prop {
  sprite: Phaser.GameObjects.Image;
  x: number;
  z: number;
}

interface Gate {
  arch: Phaser.GameObjects.Image | null;
  ring: Phaser.GameObjects.Graphics;
  tag: Phaser.GameObjects.Container;
  x: number;
  z: number;
}

interface Wing {
  sprite: Phaser.GameObjects.Sprite;
  shadow: Phaser.GameObjects.Ellipse;
  home: { x: number; y: number; z: number };
  resting: boolean;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  // A practice input, or a class challenge's APK vocabulary input.
  const input = ctx.input as DragonRiderInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('dragonRider')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = shownHero(HEROES_2D, options, 'knight');
  /** The student's own figure as the rider when the session has an avatar (it loads while the pack loads). */
  const figure = playerFigure(ctx);
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createDragonRider(input, { seed });
  const needed = FILES_2D.filter((id) => {
    const model = id.split('.')[0]!;
    return !(HEROES_2D as readonly string[]).includes(model) || model === heroId;
  }).filter((id) => edition.bindings[id]);
  const [width, height] = fitGameSize();
  const audio = ctx.audio ?? new AudioBus();
  const unlock = ctx.audio ? null : installAudioUnlock(audio);
  let frame: ((time: number) => void) | null = null;

  function preload(this: Phaser.Scene): void {
    preloadAssetBindings(this.load, edition, needed, ctx.resolveUrl);
  }

  function create(this: Phaser.Scene): void {
    const scene = this;
    const { width: W, height: H } = scene.scale;
    const portrait = H > W;
    const startedAt = performance.now();
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);
    const has = (id: string): boolean => !!edition.bindings[id];

    // ---------------------------------------------------------------- the 2D camera
    const s = portrait ? 0.66 : 0.62;
    const k = PPM * s;
    const anchorY = H * (portrait ? 0.8 : 0.84);
    let camZ = 0;
    const screen = (x: number, y: number, z: number) => ({ x: W / 2 + x * k, y: anchorY - (y * COS - (z - camZ) * SIN) * k });

    // ---------------------------------------------------------------- the land
    scene.cameras.main.setBackgroundColor('#6f8f5a');
    const groundKey = 'dragon-rider:ground';
    if (!scene.textures.exists(groundKey)) {
      const canvas = scene.textures.createCanvas(groundKey, 256, 256);
      const g = canvas?.getContext();
      if (g && canvas) {
        g.fillStyle = '#6f8f5a';
        g.fillRect(0, 0, 256, 256);
        const r = rng(11);
        for (let i = 0; i < 900; i++) {
          g.fillStyle = r() < 0.5 ? 'rgba(50, 80, 40, 0.35)' : 'rgba(190, 200, 150, 0.3)';
          g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 1 + r() * 2);
        }
        canvas.refresh();
      }
    }
    const ground = scene.add.tileSprite(0, 0, W, H, groundKey).setOrigin(0, 0).setDepth(-2e9);
    const path = scene.add.tileSprite(W / 2, 0, 8 * k, H, groundKey).setOrigin(0.5, 0).setDepth(-2e9 + 1).setTint(0xd0d6c4);

    const chunks = new Map<number, Prop[]>();
    function buildChunk(index: number): Prop[] {
      const r = rng(index * 7919 + 31);
      const list: Prop[] = [];
      for (const [name, count] of HIGHLAND) {
        const id = `prop.${name}`;
        if (!has(id)) continue;
        for (let i = 0; i < count; i++) {
          const big = /tree|rock-cluster/.test(name);
          const x = sideX(r, big);
          const z = -index * CHUNK - r() * CHUNK;
          const file = edition.pack.files[id]!;
          const sprite = scene.add.image(0, 0, textureKeyOf(edition, id), 0).setScale(s * (0.85 + r() * 0.3));
          if (file.origin) sprite.setOrigin(file.origin.x, file.origin.y);
          if (r() < 0.5) sprite.setFlipX(true);
          list.push({ sprite, x, z });
        }
      }
      return list;
    }
    function followLand(): void {
      const first = Math.floor(-camZ / CHUNK) - 1;
      for (let i = first; i < first + 3; i++) if (!chunks.has(i)) chunks.set(i, buildChunk(i));
      for (const [i, list] of chunks) {
        if (i >= first && i < first + 3) continue;
        list.forEach((p) => p.sprite.destroy());
        chunks.delete(i);
      }
      for (const list of chunks.values()) {
        for (const p of list) {
          const at = screen(p.x, 0, p.z);
          p.sprite.setPosition(at.x, at.y).setDepth(depthOf(p.z));
        }
      }
      const scroll = -camZ * SIN * k;
      ground.tilePositionY = -scroll;
      path.tilePositionY = -scroll;
    }

    // ---------------------------------------------------------------- dragons and the hero
    const dragonAnim = (clip: string, dir: string): string => animationKeyOf(edition, `dragon-fire.${clip}`, `${clip}.${dir}`);
    const flying = (sprite: Phaser.GameObjects.Sprite): void => {
      if (has('dragon-fire.fly')) sprite.play(dragonAnim('fly', 'n'));
    };
    const dragonFile = edition.pack.files['dragon-fire.fly'] ?? edition.pack.files['dragon-fire.idle'];
    function dragonSprite(scale: number): Phaser.GameObjects.Sprite {
      const sprite = scene.add.sprite(0, 0, dragonFile ? textureKeyOf(edition, dragonFile.id) : '__MISSING').setScale(scale * s);
      if (dragonFile?.origin) sprite.setOrigin(dragonFile.origin.x, dragonFile.origin.y);
      flying(sprite);
      return sprite;
    }
    const shadowOf = (scale: number) => scene.add.ellipse(0, 0, 1.6 * scale * k, 0.6 * scale * k, 0x1c3010, 0.28);
    const dragon = dragonSprite(DRAGON_SCALE);
    const dragonShadow = shadowOf(DRAGON_SCALE / 0.8);
    const heroFile = edition.pack.files[`${heroId}.idle`];
    const heroFigure = figure ? new Figure2D(scene, figure, SPRITE_PPM) : null;
    const hero = heroFigure ? heroFigure.sprite.setScale((HERO_PX * s) / HERO_FRAME) : scene.add.sprite(0, 0, heroFile ? textureKeyOf(edition, heroFile.id) : '__MISSING');
    if (!heroFigure) hero.setScale((HERO_PX * s) / Math.max(1, hero.width));
    if (!heroFigure && heroFile?.origin) hero.setOrigin(heroFile.origin.x, heroFile.origin.y);
    const heroPlay = (clip: string): void => {
      if (heroFigure) {
        if (clip !== 'idle') void heroFigure.play(clip);
        return;
      }
      const id = `${heroId}.${clip}`;
      if (has(id)) hero.play(animationKeyOf(edition, id, `${clip}.n`));
    };
    let heroBusyUntil = 0;
    const heroDo = (clip: string, ms: number): void => {
      heroPlay(clip);
      heroBusyUntil = performance.now() + ms;
    };

    const flock: Wing[] = [];
    const flockOffset = (n: number) => {
      const row = Math.floor(n / 2) + 1;
      const side = n % 2 ? 1 : -1;
      return { x: side * row * 1.2, y: 0.35 * row, z: row * 1.6 };
    };
    function addWing(): void {
      const n = flock.length;
      const to = flockOffset(n);
      const home = { x: (n % 2 ? 1 : -1) * 8, y: 4, z: 6 };
      flock.push({ sprite: dragonSprite(FLOCK_SCALE), shadow: shadowOf(FLOCK_SCALE / 0.8), home, resting: false });
      scene.tweens.add({ targets: home, ...to, duration: 900, ease: 'Sine.InOut' });
    }
    function removeWing(): void {
      const d = flock.pop();
      if (!d) return;
      scene.tweens.add({ targets: d.home, x: d.home.x < 0 ? -9 : 9, y: 6, z: 8, duration: 1000, onComplete: () => (d.sprite.destroy(), d.shadow.destroy()) });
    }

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const panel = new WordPanel2D(scene, 66);

    audio.defineMood('ride', { bpm: 108, chords: [[57, 60, 64], [62, 65, 69], [60, 64, 67], [64, 67, 71]], busy: true, drum: false });
    audio.defineSfx('flap', (sx) => sx.noise(0.25, 0.14, 700));
    audio.defineSfx('join', (sx) => [880, 1175, 1568].forEach((f, i) => sx.tone(f, 0.25, 'triangle', 0.14, i * 0.07)));

    // ---------------------------------------------------------------- gates
    const gates = new Map<string, Gate[]>();
    function choose(gate: number): void {
      const st = sim.state;
      if (st.round && st.round.chosen === null && gate >= 0 && gate < st.round.options.length) loop.dispatch({ type: 'choose', gate });
    }
    function drawRing(g: Phaser.GameObjects.Graphics, color: number, alpha: number): void {
      const rx = 1.0 * k;
      g.clear();
      g.lineStyle(Math.max(3, 0.12 * k), color, alpha).strokeEllipse(0, 0, rx * 2, rx * 2 * COS);
    }
    function raiseGates(roundId: string, opts: readonly { text: string }[], z: number): void {
      const list = opts.map((o, i): Gate => {
        const x = GATE_X[i] ?? 0;
        let arch: Phaser.GameObjects.Image | null = null;
        const file = edition.pack.files['prop.arch'];
        if (file && has('prop.arch')) {
          arch = scene.add.image(0, 0, textureKeyOf(edition, 'prop.arch'), 0).setScale(GATE_SCALE * s);
          if (file.origin) arch.setOrigin(file.origin.x, file.origin.y);
        }
        const ring = scene.add.graphics();
        drawRing(ring, 0xffe28a, 0.6);
        const label = tag(scene, o.text, 20).setDepth(16_000);
        label.setInteractive({ useHandCursor: true }).on('pointerup', () => choose(i));
        return { arch, ring, tag: label, x, z };
      });
      gates.set(roundId, list);
    }
    function lowerGates(roundId: string): void {
      for (const g of gates.get(roundId) ?? []) {
        g.arch?.destroy();
        g.ring.destroy();
        g.tag.destroy();
      }
      gates.delete(roundId);
    }

    // Swipes and keys (the tags take taps).
    let swipeX: number | null = null;
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => (swipeX = over.length ? null : p.x));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (swipeX === null) return;
      const dx = p.x - swipeX;
      swipeX = null;
      if (Math.abs(dx) > 50) choose(dx < 0 ? 0 : 1);
    });
    function readKeys(): void {
      const pressed = ctx.inputController.snapshot().pressed ?? [];
      for (const key of pressed) {
        if (key === 'ArrowLeft' || key === 'KeyA' || key === 'Digit1' || key === 'Numpad1') choose(0);
        if (key === 'ArrowRight' || key === 'KeyD' || key === 'Digit2' || key === 'Numpad2') choose(1);
      }
    }

    // ---------------------------------------------------------------- events
    let steerX = 0;
    let boss: { sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; z: number } | null = null;
    let finished = false;
    let shots = 0;
    const power = scene.add.text(W / 2, 0, '', { fontSize: '20px', fontStyle: 'bold', color: '#ffffff', backgroundColor: '#2b1d3a', padding: { x: 14, y: 6 } }).setOrigin(0.5, 0).setDepth(17_000).setVisible(false);
    const drawStatus = (st: DragonRiderState): void => {
      status.set(t('gate', { index: Math.min(st.roundIndex + 1, Math.max(1, st.total)), total: st.total }), `🐉 ${st.flock}`);
      if (st.phase !== 'riding') power.setText(t('power', { hp: st.bossHp, power: st.bossPower }));
    };
    const dragonTop = () => ({ x: dragon.x, y: dragon.y - 1.6 * k });
    const shooter = (n: number): Phaser.GameObjects.Sprite => (n === 0 ? dragon : (flock[(n - 1) % Math.max(1, flock.length)]?.sprite ?? dragon));

    function handle(ev: DragonRiderEvent): void {
      const st = sim.state;
      switch (ev.type) {
        case 'roundStarted':
          raiseGates(ev.roundId, ev.options, -(st.distance + st.round!.gap));
          panel.target(t('word'), ev.term);
          steerX = 0;
          break;
        case 'waiting':
          for (const g of gates.get(ev.roundId) ?? []) scene.tweens.add({ targets: g.tag, scale: { from: 1, to: 1.12 }, duration: 350, yoyo: true, repeat: -1 });
          break;
        case 'gateChosen': {
          const list = gates.get(ev.roundId) ?? [];
          list.forEach((g, i) => {
            scene.tweens.killTweensOf(g.tag);
            g.tag.setScale(1).disableInteractive();
            const right = i === ev.correctGate;
            const picked = i === ev.gate;
            recolorTag(g.tag, right ? COLORS.green : picked ? COLORS.red : 0x5a5a6a, 0xffffff);
            if (!right && !picked) g.tag.setAlpha(0.6);
            drawRing(g.ring, right ? 0x3ee07a : picked ? 0xff5a4a : 0x777777, 0.8);
          });
          steerX = GATE_X[ev.gate] ?? 0;
          audio.play(ev.correct ? 'correct' : 'wrong');
          audio.play('flap');
          panel.hide();
          heroDo(ev.correct ? 'victory' : 'hit', ev.correct ? 900 : 700);
          if (!ev.correct) {
            const at = dragonTop();
            popup(scene, at.x, at.y, t('again'), 'miss', 19_000);
          }
          break;
        }
        case 'flockGrew': {
          while (flock.length < ev.count - 1) addWing();
          audio.play('join');
          const at = dragonTop();
          popup(scene, at.x, at.y, t('joined'), 'good', 19_000);
          break;
        }
        case 'flockShrank': {
          while (flock.length > ev.count - 1) removeWing();
          const at = dragonTop();
          popup(scene, at.x, at.y, t('left'), 'miss', 19_000);
          break;
        }
        case 'wordReturns':
          break;
        case 'bossAppeared': {
          const sprite = dragonSprite(BOSS_SCALE).setTint(BOSS_TINT);
          if (has('dragon-fire.roar')) sprite.play(dragonAnim('roar', 's'));
          sprite.once('animationcomplete', () => has('dragon-fire.fly') && sprite.play(dragonAnim('fly', 's')));
          boss = { sprite, shadow: shadowOf(BOSS_SCALE / 0.8), z: -(st.distance + 15) };
          scene.cameras.main.shake(1200, 0.01);
          audio.play('roar');
          audio.music('boss');
          void banner(scene, t('boss.title'), t('boss.text', { power: ev.power }), 2.2);
          power.setVisible(true);
          steerX = 0;
          break;
        }
        case 'exchange': {
          if (!boss) break;
          const from = shooter(shots++);
          if (has('dragon-fire.attack')) {
            from.play(dragonAnim('attack', 'n'));
            from.once('animationcomplete', () => flying(from));
          }
          const target = boss.sprite;
          const ball = scene.add.circle(from.x, from.y - 0.8 * k, 0.28 * k, 0xff7a1a).setDepth(18_000).setStrokeStyle(4, 0xffd27a, 0.8);
          scene.tweens.add({
            targets: ball,
            x: target.x + (Math.random() - 0.5) * 1.2 * k,
            y: target.y - 1.2 * BOSS_SCALE * k,
            scale: 0.6,
            duration: 700,
            ease: 'Quad.In',
            onComplete: () => {
              ball.destroy();
              audio.play('hit');
              target.setTint(0xffffff).setTintMode(1);
              scene.time.delayedCall(120, () => target.setTintMode(0).setTint(BOSS_TINT));
            },
          });
          flock.forEach((w, n) => (w.resting = n >= ev.active - 1));
          if (ev.active < st.flock) {
            const at = dragonTop();
            popup(scene, at.x, at.y, t('tired'), 'miss', 19_000);
          }
          break;
        }
        case 'rally': {
          flock.forEach((w) => (w.resting = false));
          audio.play('join');
          const at = dragonTop();
          popup(scene, at.x, at.y, t('rally'), 'good', 19_000);
          break;
        }
        case 'rideComplete':
          void finish();
          break;
      }
      drawStatus(st);
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      loop.stop();
      if (boss) {
        const b = boss;
        await new Promise((resolve) => scene.time.delayedCall(500, resolve));
        for (let i = 0; i < 24; i++) {
          const dot = scene.add.circle(b.sprite.x, b.sprite.y - 1.5 * k, 4 + Math.random() * 4, 0xffb040).setDepth(18_000);
          const a = Math.random() * Math.PI * 2;
          scene.tweens.add({ targets: dot, x: dot.x + Math.cos(a) * 90, y: dot.y + Math.sin(a) * 70, alpha: 0, duration: 800, onComplete: () => dot.destroy() });
        }
        if (has('dragon-fire.death')) {
          b.sprite.play(dragonAnim('death', 's'));
          await new Promise((resolve) => b.sprite.once('animationcomplete', resolve));
        }
      }
      audio.music('calm');
      audio.play('victory');
      if (has('dragon-fire.roar')) dragon.play(dragonAnim('roar', 'n'));
      heroDo('victory', 3000);
      power.setVisible(false);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, evidenceStoryOf(input, manifest.levels), seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<DragonRiderState, DragonRiderCommand, DragonRiderEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    let shownX = 0;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const st = sim.state;
      if (!finished) readKeys();
      camZ += (-st.distance - camZ) * (1 - Math.exp(-dt * 18));
      shownX += (steerX - shownX) * (1 - Math.exp(-dt * 3.5));
      const through = st.round && st.round.chosen !== null ? Math.max(0, 1 - Math.abs(st.round.gap) / 8) : 0;
      const bob = Math.sin(time / 380) * (st.waiting ? 0.18 : 0.08);
      const y = CRUISE_Y - (CRUISE_Y - GATE_Y) * through + bob;
      followLand();
      const at = screen(shownX, y, camZ);
      const foot = screen(shownX, 0, camZ);
      dragon.setPosition(at.x, at.y).setDepth(depthOf(camZ, y));
      dragon.setRotation((steerX - shownX) * 0.05);
      dragonShadow.setPosition(foot.x, foot.y).setDepth(depthOf(camZ, 0) - 500);
      const seat = screen(shownX, y + 0.7, camZ);
      heroFigure?.face(steerX - shownX);
      const lift = heroFigure?.update(dt, false) ?? { x: 0, y: 0 };
      hero.setPosition(seat.x + lift.x, seat.y + lift.y).setDepth(depthOf(camZ, y) + 1);
      if (!heroFigure && performance.now() >= heroBusyUntil && has(`${heroId}.idle`) && hero.anims.currentAnim?.key !== animationKeyOf(edition, `${heroId}.idle`, 'idle.n')) heroPlay('idle');
      for (const d of flock) {
        const fy = y + d.home.y + Math.sin(time / 300 + d.home.x) * 0.1;
        const p = screen(shownX + d.home.x, fy, camZ + d.home.z);
        const f = screen(shownX + d.home.x, 0, camZ + d.home.z);
        d.sprite.setPosition(p.x, p.y).setDepth(depthOf(camZ + d.home.z, fy)).setAlpha(d.resting ? 0.45 : 1);
        d.shadow.setPosition(f.x, f.y).setDepth(depthOf(camZ + d.home.z, 0) - 500);
      }
      const top = panel.bottom + 26;
      for (const [roundId, list] of gates) {
        if (list[0] && list[0].z > camZ + 6) {
          lowerGates(roundId);
          continue;
        }
        for (const g of list) {
          const base = screen(g.x, 0, g.z);
          g.arch?.setPosition(base.x, base.y).setDepth(depthOf(g.z, 0.01));
          const ring = screen(g.x, GATE_Y + 0.25, g.z);
          g.ring.setPosition(ring.x, ring.y).setDepth(depthOf(g.z, 0.02));
          const over = screen(g.x, 3.4, g.z);
          g.tag.setPosition(over.x, Math.max(top, over.y));
        }
      }
      if (boss) {
        const by = BOSS_Y + Math.sin(time / 420) * 0.25;
        const b = screen(0, by, boss.z);
        const bf = screen(0, 0, boss.z);
        boss.sprite.setPosition(b.x, b.y).setDepth(depthOf(boss.z, by));
        boss.shadow.setPosition(bf.x, bf.y).setDepth(depthOf(boss.z, 0) - 500);
        power.setPosition(W / 2, panel.bottom + 6);
      }
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: DragonRiderCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let n = 0; n < steps; n++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextChoice(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
      /** Game-pixel points of the current gates' tags (for real taps). */
      points: () => ({ gates: [...gates.values()].at(-1)?.map((g) => ({ x: g.tag.x, y: g.tag.y })) ?? [] }),
      size: () => ({ width: W, height: H }),
    };
    const qc = window as unknown as { __apk3dView2d?: typeof hook };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      finished = true;
      loop.stop();
      frame = null;
      if (qc.__apk3dView2d === hook) delete qc.__apk3dView2d;
      unlock?.();
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    drawStatus(sim.state);
    audio.music('ride');
    heroPlay('idle');
    if (has('dragon-fire.roar')) {
      dragon.play(dragonAnim('roar', 'n'));
      dragon.once('animationcomplete', () => flying(dragon));
    }
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#6f8f5a',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'dragon-rider', preload, create, update },
  };
}
