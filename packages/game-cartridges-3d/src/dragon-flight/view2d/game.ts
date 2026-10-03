/**
 * Dragon Flight in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts). The 2D
 * camera is the one of every 2D view (elevation 45 degrees, 64 px/m) and follows the dragon: the
 * dragon flies up the screen with its shadow on the land below, the land scrolls past in chunks of
 * forest and village (the 3D view's plan, with forge prop sprites), the gates come from the top,
 * and their meanings wait on tags the student taps (or a swipe, or the keys 1-3 and the arrows).
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { animationKeyOf, banner, COLORS, depthOf, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, textureKeyOf, WordPanel2D } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createDragonFlight, evidenceOf, scoreOf, type DragonFlightCommand, type DragonFlightEvent, type DragonFlightState } from '../core/index.js';
import { DRAGON_CLIPS_2D, FILES_2D, LAND_PROPS_2D } from '../manifest.js';
import { nextChoice } from '../qc/bot.js';
import strings from '../strings.en.js';
import { CHUNK, FOREST, kindOf, rng, VILLAGE } from '../view/land-plan.js';

const PPM = 64;
const ELEVATION = 45;
const COS = Math.cos((ELEVATION * Math.PI) / 180);
const SIN = Math.sin((ELEVATION * Math.PI) / 180);
/**
 * Sizes: the 2D camera is far above the path, so the dragons are bigger than in the 3D view (a
 * chase camera just behind the dragon); the boss is smaller (no perspective shrinks it here).
 */
const DRAGON_SCALE = 1.5;
const FLOCK_SCALE = 0.6;
const BOSS_SCALE = 2.4;
const GATE_SCALE = 1.25;
const CRUISE_Y = 2.4;
const GATE_Y = 1.35;
const BOSS_TINT = 0x8a6ac0;
/** Gate x positions for 2 or 3 gates (as the 3D view). */
const gateX = (count: number, i: number): number => (count === 2 ? [-1.6, 1.6] : [-3.0, 0, 3.0])[i] ?? 0;
/** The 2D land keeps its props beside the gate corridor (|x| over 4.4 m), close enough to show on a phone. */
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

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as StoryInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('dragonFlight')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createDragonFlight(story, { seed, helper: options.helper });
  const needed = FILES_2D.filter((id) => edition.bindings[id]);
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
    /** Screen pixels per meter, and where the dragon's ground point sits on screen. */
    const s = portrait ? 0.66 : 0.62;
    const k = PPM * s;
    const anchorY = H * (portrait ? 0.8 : 0.84);
    /** The camera's position along the path (world z of the dragon's ground point). */
    let camZ = 0;
    const screen = (x: number, y: number, z: number) => ({ x: W / 2 + x * k, y: anchorY - (y * COS - (z - camZ) * SIN) * k });

    // ---------------------------------------------------------------- the land
    scene.cameras.main.setBackgroundColor('#7fb24e');
    const groundKey = 'dragon-flight:ground';
    if (!scene.textures.exists(groundKey)) {
      const canvas = scene.textures.createCanvas(groundKey, 256, 256);
      const g = canvas?.getContext();
      if (g && canvas) {
        g.fillStyle = '#7fb24e';
        g.fillRect(0, 0, 256, 256);
        const r = rng(7);
        for (let i = 0; i < 900; i++) {
          g.fillStyle = r() < 0.5 ? 'rgba(60, 110, 40, 0.35)' : 'rgba(180, 220, 120, 0.3)';
          g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 1 + r() * 2);
        }
        canvas.refresh();
      }
    }
    const ground = scene.add.tileSprite(0, 0, W, H, groundKey).setOrigin(0, 0).setDepth(-2e9);
    // The darker path down the corridor, under the gates (7 m wide).
    const path = scene.add.tileSprite(W / 2, 0, 7 * k, H, groundKey).setOrigin(0.5, 0).setDepth(-2e9 + 1).setTint(0xc4d8b0);

    const chunks = new Map<number, Prop[]>();
    function buildChunk(index: number): Prop[] {
      const r = rng(index * 7919 + 13);
      const list: Prop[] = [];
      for (const [name, count] of kindOf(index) === 'forest' ? FOREST : VILLAGE) {
        const id = `prop.${name}`;
        if (!has(id)) continue;
        for (let i = 0; i < count; i++) {
          const big = /tree|cottage|well/.test(name);
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

    // ---------------------------------------------------------------- dragons
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
    const flock: { sprite: Phaser.GameObjects.Sprite; shadow: Phaser.GameObjects.Ellipse; home: { x: number; y: number; z: number } }[] = [];
    /** V formation behind the dragon: slot k of the flock (as the 3D view). */
    const flockOffset = (n: number) => {
      const row = Math.floor(n / 2) + 1;
      const side = n % 2 ? 1 : -1;
      return { x: side * row * 1.2, y: 0.35 * row, z: row * 1.6 };
    };
    function addFlockDragon(): void {
      const n = flock.length;
      const to = flockOffset(n);
      const home = { x: (n % 2 ? 1 : -1) * 8, y: 4, z: 6 };
      flock.push({ sprite: dragonSprite(FLOCK_SCALE), shadow: shadowOf(FLOCK_SCALE / 0.8), home });
      scene.tweens.add({ targets: home, ...to, duration: 900, ease: 'Sine.InOut' });
    }
    function removeFlockDragon(): void {
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

    audio.defineMood('flight', { bpm: 112, chords: [[62, 66, 69], [67, 71, 74], [64, 67, 71], [69, 73, 76]], busy: true, drum: false });
    audio.defineSfx('flap', (sx) => sx.noise(0.25, 0.14, 700));
    audio.defineSfx('join', (sx) => [880, 1175, 1568].forEach((f, i) => sx.tone(f, 0.25, 'triangle', 0.14, i * 0.07)));

    // ---------------------------------------------------------------- gates
    const gates = new Map<string, Gate[]>();
    function choose(gate: number): void {
      const st = sim.state;
      if (st.round && st.round.chosen === null && gate >= 0 && gate < st.round.options.length) loop.dispatch({ type: 'choose', gate });
    }
    function raiseGates(roundId: string, opts: readonly { text: string }[], at: number): void {
      const list = opts.map((o, i): Gate => {
        const x = gateX(opts.length, i);
        let arch: Phaser.GameObjects.Image | null = null;
        const file = edition.pack.files['prop.arch'];
        if (file && has('prop.arch')) {
          arch = scene.add.image(0, 0, textureKeyOf(edition, 'prop.arch'), 0).setScale(GATE_SCALE * s);
          if (file.origin) arch.setOrigin(file.origin.x, file.origin.y);
        }
        const ring = scene.add.graphics();
        drawRing(ring, 0xffe28a, 0.6);
        const label = tag(scene, o.text, 19).setDepth(16_000);
        label.setInteractive({ useHandCursor: true }).on('pointerup', () => choose(i));
        return { arch, ring, tag: label, x, z: -at };
      });
      gates.set(roundId, list);
    }
    function drawRing(g: Phaser.GameObjects.Graphics, color: number, alpha: number): void {
      const rx = 1.05 * k;
      g.clear();
      g.lineStyle(Math.max(3, 0.12 * k), color, alpha).strokeEllipse(0, 0, rx * 2, rx * 2 * COS);
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
      const count = sim.state.round?.options.length ?? 0;
      if (Math.abs(dx) > 50 && count) choose(dx < 0 ? 0 : count - 1);
    });
    function readKeys(): void {
      const pressed = ctx.inputController.snapshot().pressed ?? [];
      const count = sim.state.round?.options.length ?? 0;
      if (!count) return;
      for (const key of pressed) {
        const digit = /^(?:Digit|Numpad)([1-3])$/.exec(key);
        if (digit && Number(digit[1]) <= count) choose(Number(digit[1]) - 1);
        if (key === 'ArrowLeft') choose(0);
        if (key === 'ArrowRight') choose(count - 1);
        if (key === 'ArrowUp' && count === 3) choose(1);
      }
    }

    // ---------------------------------------------------------------- events
    let steerX = 0;
    let boss: { sprite: Phaser.GameObjects.Sprite; z: number; hill: Phaser.GameObjects.Image[] } | null = null;
    let finished = false;
    const drawStatus = (st: DragonFlightState): void => status.set(t('gate', { index: Math.min(st.roundIndex + 1, Math.max(1, st.total)), total: st.total }), `🐉 ${st.flock}`);
    const dragonTop = () => ({ x: dragon.x, y: dragon.y - 1.4 * k });

    function handle(ev: DragonFlightEvent): void {
      const st = sim.state;
      switch (ev.type) {
        case 'roundStarted':
          raiseGates(ev.roundId, ev.options, ev.gatesAt);
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
          steerX = gateX(list.length, ev.gate);
          audio.play(ev.correct ? 'correct' : 'wrong');
          audio.play('flap');
          panel.hide();
          if (!ev.correct) {
            const at = dragonTop();
            popup(scene, at.x, at.y, t('again'), 'miss', 19_000);
          }
          break;
        }
        case 'flockGrew': {
          while (flock.length < ev.count - 1) addFlockDragon();
          audio.play('join');
          const at = dragonTop();
          popup(scene, at.x, at.y, t('joined'), 'good', 19_000);
          break;
        }
        case 'flockShrank': {
          while (flock.length > ev.count - 1) removeFlockDragon();
          const at = dragonTop();
          popup(scene, at.x, at.y, t('left'), 'miss', 19_000);
          break;
        }
        case 'wordReturns':
          break;
        case 'bossAppeared': {
          // The core flies the dragon to `bossAt` and stops; the dark dragon waits beyond it, on a hill.
          const z = -((st.bossAt ?? st.distance) + 11);
          const hill: Phaser.GameObjects.Image[] = [];
          for (const [name, dx, dz, sc] of [['rock-cluster', 0, 0.6, 2.6], ['boulder', -2.4, 1.0, 2.0], ['boulder', 2.5, 0.8, 1.8]] as [string, number, number, number][]) {
            const id = `prop.${name}`;
            const file = edition.pack.files[id];
            if (!file || !has(id)) continue;
            const img = scene.add.image(0, 0, textureKeyOf(edition, id), 0).setScale(sc * s);
            if (file.origin) img.setOrigin(file.origin.x, file.origin.y);
            img.setData('at', { x: dx, z: z + dz });
            hill.push(img);
          }
          const sprite = dragonSprite(BOSS_SCALE).setTint(BOSS_TINT);
          if (has('dragon-fire.roar')) sprite.play(dragonAnim('roar', 's'));
          sprite.once('animationcomplete', () => has('dragon-fire.idle') && sprite.play(dragonAnim('idle', 's')));
          boss = { sprite, z, hill };
          scene.cameras.main.shake(1200, 0.01);
          audio.play('roar');
          audio.music('boss');
          void banner(scene, t('boss.title'), t('boss.text'), 2.0);
          break;
        }
        case 'fireball': {
          if (!boss) break;
          const from = ev.index === 0 ? dragon : (flock[(ev.index - 1) % Math.max(1, flock.length)]?.sprite ?? dragon);
          if (has('dragon-fire.attack')) {
            from.play(dragonAnim('attack', 'n'));
            from.once('animationcomplete', () => flying(from));
          }
          const target = boss.sprite;
          const ball = scene.add.circle(from.x, from.y - 0.8 * k, 0.28 * k, 0xff7a1a).setDepth(18_000).setStrokeStyle(4, 0xffd27a, 0.8);
          scene.tweens.add({
            targets: ball,
            x: target.x + (Math.random() - 0.5) * 1.2 * k,
            y: target.y - 1.6 * BOSS_SCALE * k,
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
          break;
        }
        case 'flightComplete':
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
        await new Promise((resolve) => scene.time.delayedCall(800, resolve));
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
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<DragonFlightState, DragonFlightCommand, DragonFlightEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    let shownX = 0;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const st = sim.state;
      if (!finished) readKeys();
      // Smooth the 30 Hz core distance into the frame rate.
      camZ += (-st.distance - camZ) * (1 - Math.exp(-dt * 18));
      shownX += (steerX - shownX) * (1 - Math.exp(-dt * 3.5));
      const next = st.round ? st.round.gatesAt - st.distance : 99;
      const dip = st.round && st.round.chosen !== null ? Math.max(0, 1 - Math.abs(next) / 10) : 0;
      const bob = Math.sin(time / 380) * (st.waiting ? 0.18 : 0.08);
      const y = CRUISE_Y - (CRUISE_Y - GATE_Y) * dip + bob;
      followLand();
      const at = screen(shownX, y, camZ);
      const foot = screen(shownX, 0, camZ);
      dragon.setPosition(at.x, at.y).setDepth(depthOf(camZ, y));
      dragon.setRotation((steerX - shownX) * 0.05);
      dragonShadow.setPosition(foot.x, foot.y).setDepth(depthOf(camZ, 0) - 500);
      for (const d of flock) {
        const fy = y + d.home.y + Math.sin(time / 300 + d.home.x) * 0.1;
        const p = screen(shownX + d.home.x, fy, camZ + d.home.z);
        const f = screen(shownX + d.home.x, 0, camZ + d.home.z);
        d.sprite.setPosition(p.x, p.y).setDepth(depthOf(camZ + d.home.z, fy));
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
          // The tags wait under the word panel until their gate comes into view.
          const over = screen(g.x, 3.4, g.z);
          g.tag.setPosition(over.x, Math.max(top, over.y));
        }
      }
      if (boss) {
        const b = screen(0, 0, boss.z);
        boss.sprite.setPosition(b.x, b.y).setDepth(depthOf(boss.z, 0.5));
        for (const img of boss.hill) {
          const p = img.getData('at') as { x: number; z: number };
          const h = screen(p.x, 0, p.z);
          img.setPosition(h.x, h.y).setDepth(depthOf(p.z));
        }
      }
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: DragonFlightCommand) => loop.dispatch(command),
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
    audio.music('flight');
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
    backgroundColor: '#7fb24e',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'dragon-flight', preload, create, update },
  };
}
