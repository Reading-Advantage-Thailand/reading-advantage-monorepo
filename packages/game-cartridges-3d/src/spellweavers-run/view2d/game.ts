/**
 * Spellweaver's Run in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts).
 * The 2D camera is the one of every 2D view (elevation 45 degrees, 64 px/m) and follows the
 * wizard: the wizard runs up the screen with a shadow on the road, the land scrolls past in chunks
 * of forest and meadow (the 3D view's plan, with forge prop sprites), the arches with their word
 * orbs come from the top, and the words wait on tags the student taps (or a swipe, or the keys).
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { animationKeyOf, banner, COLORS, depthOf, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, textureKeyOf } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { createSpellweaversRun, evidenceOf, scoreOf, TUNING, type SpellweaversCommand, type SpellweaversEvent, type SpellweaversState } from '../core/index.js';
import { FILES_2D, HEROES_2D } from '../manifest.js';
import { nextChoice } from '../qc/bot.js';
import strings from '../strings.en.js';
import { CHUNK, FOREST, kindOf, laneX, MEADOW, ORB_COLORS, rng } from '../view/land-plan.js';
import { PromptPanel2D } from './prompt.js';

const PPM = 64;
const ELEVATION = 45;
const COS = Math.cos((ELEVATION * Math.PI) / 180);
const SIN = Math.sin((ELEVATION * Math.PI) / 180);
/** The wizard is a little larger than life so it reads on a phone; arches as in the 3D view. */
const HERO_SCALE = 1.35;
const ARCH_SCALE = 1.25;
const ORB_Y = 1.15;
/** The 2D land keeps its props beside the road corridor (|x| over 4.6 m). */
const sideX = (r: () => number, big: boolean): number => (r() < 0.5 ? -1 : 1) * (big ? 5.8 + r() * 5 : 4.6 + r() * 4.5);

interface Prop {
  sprite: Phaser.GameObjects.Image;
  x: number;
  z: number;
}

interface Orb2D {
  arch: Phaser.GameObjects.Image | null;
  ball: Phaser.GameObjects.Arc;
  tag: Phaser.GameObjects.Container;
  x: number;
  z: number;
  color: number;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as StoryInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('spellweaversRun')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'wizard';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createSpellweaversRun(story, { seed, helper: options.helper });
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
    /** Screen pixels per meter, and where the wizard's ground point sits on screen. */
    const s = portrait ? 0.66 : 0.62;
    const k = PPM * s;
    const anchorY = H * (portrait ? 0.8 : 0.84);
    /** The camera's position along the road (world z of the wizard's ground point). */
    let camZ = 0;
    const screen = (x: number, y: number, z: number) => ({ x: W / 2 + x * k, y: anchorY - (y * COS - (z - camZ) * SIN) * k });

    // ---------------------------------------------------------------- the land
    scene.cameras.main.setBackgroundColor('#6fae52');
    const groundKey = 'spellweavers-run:ground';
    if (!scene.textures.exists(groundKey)) {
      const canvas = scene.textures.createCanvas(groundKey, 256, 256);
      const g = canvas?.getContext();
      if (g && canvas) {
        g.fillStyle = '#6fae52';
        g.fillRect(0, 0, 256, 256);
        const r = rng(11);
        for (let i = 0; i < 900; i++) {
          g.fillStyle = r() < 0.5 ? 'rgba(50, 100, 40, 0.35)' : 'rgba(190, 225, 130, 0.3)';
          g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 1 + r() * 2);
        }
        canvas.refresh();
      }
    }
    const ground = scene.add.tileSprite(0, 0, W, H, groundKey).setOrigin(0, 0).setDepth(-2e9);
    // The road down the corridor, under the arches (8 m wide).
    const road = scene.add.tileSprite(W / 2, 0, 8 * k, H, groundKey).setOrigin(0.5, 0).setDepth(-2e9 + 1).setTint(0xe6c690);

    const chunks = new Map<number, Prop[]>();
    function buildChunk(index: number): Prop[] {
      const r = rng(index * 7919 + 31);
      const list: Prop[] = [];
      for (const [name, count] of kindOf(index) === 'forest' ? FOREST : MEADOW) {
        const id = `prop.${name}`;
        if (!has(id)) continue;
        for (let i = 0; i < count; i++) {
          const big = /tree/.test(name);
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
      road.tilePositionY = -scroll;
    }

    // ---------------------------------------------------------------- the wizard
    const heroKey = (name: string, dir: string): string => animationKeyOf(edition, `${heroId}.${name}`, `${name}.${dir}`);
    const heroFile = edition.pack.files[`${heroId}.run`] ?? edition.pack.files[`${heroId}.idle`];
    const hero = scene.add.sprite(0, 0, heroFile ? textureKeyOf(edition, heroFile.id) : '__MISSING').setScale(HERO_SCALE * s);
    if (heroFile?.origin) hero.setOrigin(heroFile.origin.x, heroFile.origin.y);
    const heroShadow = scene.add.ellipse(0, 0, 1.0 * k, 0.4 * k, 0x1c3010, 0.3);
    let clip = '';
    let busyUntil = 0;
    const heroLoop = (name: string): void => {
      if (clip === name || !has(`${heroId}.${name}`)) return;
      clip = name;
      hero.play(heroKey(name, 'n'));
    };
    const heroPlay = (name: string, dir = 'n'): void => {
      if (!has(`${heroId}.${name}`)) return;
      clip = '';
      busyUntil = performance.now() + 900;
      hero.play(heroKey(name, dir));
    };

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const panel = new PromptPanel2D(scene, 66);

    audio.defineMood('run', { bpm: 116, chords: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [60, 64, 67]], busy: true, drum: false });
    audio.defineSfx('collect', (sx) => [784, 988, 1319].forEach((f, i) => sx.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
    audio.defineSfx('cast', (sx) => [523, 659, 784, 1047].forEach((f, i) => sx.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
    audio.defineSfx('fizzle', (sx) => sx.noise(0.3, 0.12, 500));

    function drawHud(): void {
      const st = sim.state;
      const sentence = st.sentences[Math.min(st.sentence, st.sentences.length - 1)];
      status.set(t('sentence', { index: Math.min(st.sentence + 1, st.sentences.length), total: st.sentences.length }), '●'.repeat(st.courage) + '○'.repeat(Math.max(0, TUNING.courage - st.courage)));
      if (sentence) panel.set(t('next'), sentence.translation ?? t('build'), sentence.words, st.word, st.helper);
    }

    // ---------------------------------------------------------------- orbs
    const rows = new Map<string, Orb2D[]>();
    function choose(lane: number): void {
      const st = sim.state;
      if (st.round && st.round.chosen === null && st.restMs <= 0 && lane >= 0 && lane < st.round.options.length) loop.dispatch({ type: 'choose', lane });
    }
    function drawBall(o: Orb2D, color: number, alpha: number): void {
      o.color = color;
      o.ball.setFillStyle(color, alpha).setStrokeStyle(4, 0xffffff, 0.7);
    }
    function raiseOrbs(roundId: string, opts: readonly { text: string }[], at: number): void {
      const list = opts.map((o, i): Orb2D => {
        const x = laneX(opts.length, i);
        let arch: Phaser.GameObjects.Image | null = null;
        const file = edition.pack.files['prop.arch'];
        if (file && has('prop.arch')) {
          arch = scene.add.image(0, 0, textureKeyOf(edition, 'prop.arch'), 0).setScale(ARCH_SCALE * s);
          if (file.origin) arch.setOrigin(file.origin.x, file.origin.y);
        }
        const color = ORB_COLORS[i % ORB_COLORS.length]!;
        const ball = scene.add.circle(0, 0, 0.42 * k, color, 0.95).setStrokeStyle(4, 0xffffff, 0.7);
        const label = tag(scene, o.text, 20).setDepth(16_000);
        label.setInteractive({ useHandCursor: true }).on('pointerup', () => choose(i));
        return { arch, ball, tag: label, x, z: -at, color };
      });
      rows.set(roundId, list);
    }
    function lowerOrbs(roundId: string): void {
      for (const o of rows.get(roundId) ?? []) {
        o.arch?.destroy();
        o.ball.destroy();
        o.tag.destroy();
      }
      rows.delete(roundId);
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
        if (key === 'ArrowLeft' || key === 'KeyA') choose(0);
        if (key === 'ArrowRight' || key === 'KeyD') choose(count - 1);
        if ((key === 'ArrowDown' || key === 'KeyS') && count === 3) choose(1);
      }
    }

    // ---------------------------------------------------------------- events
    let steerX = 0;
    let finished = false;
    let portal: { arch: Phaser.GameObjects.Image | null; glow: Phaser.GameObjects.Ellipse; z: number } | null = null;
    const heroTop = () => ({ x: hero.x, y: hero.y - 1.6 * k });

    function burst(x: number, y: number, color: number, n: number): void {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + Math.random() * 0.5;
        const d = 24 + Math.random() * 34;
        const dot = scene.add.circle(x, y, 3 + Math.random() * 3, color).setDepth(18_000);
        scene.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 600, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    function handle(ev: SpellweaversEvent): void {
      switch (ev.type) {
        case 'roundStarted':
          for (const id of [...rows.keys()]) if (id !== ev.roundId && (rows.get(id)?.[0]?.z ?? 0) === -ev.orbsAt) lowerOrbs(id);
          raiseOrbs(ev.roundId, ev.options, ev.orbsAt);
          steerX = 0;
          break;
        case 'waiting':
          for (const o of rows.get(ev.roundId) ?? []) scene.tweens.add({ targets: o.tag, scale: { from: 1, to: 1.12 }, duration: 350, yoyo: true, repeat: -1 });
          break;
        case 'laneChosen': {
          const list = rows.get(ev.roundId) ?? [];
          list.forEach((o, i) => {
            scene.tweens.killTweensOf(o.tag);
            o.tag.setScale(1).disableInteractive();
            const right = i === ev.correctLane && ev.correct;
            const picked = i === ev.lane;
            recolorTag(o.tag, right ? COLORS.green : picked ? COLORS.red : 0x5a5a6a, 0xffffff);
            if (!right && !picked) o.tag.setAlpha(0.6);
            if (picked && !ev.correct) drawBall(o, 0x777777, 0.9);
            else if (!picked) o.ball.setAlpha(0.35);
          });
          steerX = laneX(list.length, ev.lane);
          if (ev.correct) audio.play('correct');
          else {
            audio.play('fizzle');
            heroPlay('hit');
            scene.cameras.main.shake(250, 0.005);
            const at = heroTop();
            popup(scene, at.x, at.y, t('again'), 'miss', 19_000);
          }
          break;
        }
        case 'wordCollected': {
          const list = [...rows.values()].at(-1) ?? [];
          const orb = list.find((o) => Math.abs(o.x - steerX) < 0.1);
          if (orb) {
            burst(orb.ball.x, orb.ball.y, 0xffe27a, 14);
            orb.ball.setVisible(false);
          }
          audio.play('collect');
          const at = heroTop();
          popup(scene, at.x, at.y, t('collected'), 'good', 19_000);
          break;
        }
        case 'courageLost':
          break;
        case 'rested': {
          const at = heroTop();
          popup(scene, at.x, at.y, t('rested'), 'good', 19_000);
          break;
        }
        case 'sentenceCast': {
          audio.play('cast');
          heroPlay('victory', 's');
          burst(hero.x, hero.y - 1.2 * k, 0xc9a7ff, 24);
          void banner(scene, t('cast.title'), t('cast.text'), 1.2);
          break;
        }
        case 'portalAppeared': {
          const z = -ev.at;
          const file = edition.pack.files['prop.arch'];
          let arch: Phaser.GameObjects.Image | null = null;
          if (file && has('prop.arch')) {
            arch = scene.add.image(0, 0, textureKeyOf(edition, 'prop.arch'), 0).setScale(2.2 * s);
            if (file.origin) arch.setOrigin(file.origin.x, file.origin.y);
          }
          const glow = scene.add.ellipse(0, 0, 3.4 * k, 4.2 * k, 0xc9a7ff, 0).setBlendMode('ADD');
          scene.tweens.add({ targets: glow, fillAlpha: 0.7, duration: 1200 });
          portal = { arch, glow, z };
          void banner(scene, t('portal'), '', 1.4);
          break;
        }
        case 'runComplete':
          void finish();
          break;
      }
      drawHud();
    }

    async function finish(): Promise<void> {
      if (finished) return;
      finished = true;
      loop.stop();
      heroLoop('idle');
      audio.music('calm');
      audio.play('victory');
      heroPlay('victory', 's');
      burst(hero.x, hero.y - 1.4 * k, 0xffe27a, 30);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<SpellweaversState, SpellweaversCommand, SpellweaversEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
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
      shownX += (steerX - shownX) * (1 - Math.exp(-dt * 6));
      followLand();
      const at = screen(shownX, 0, camZ);
      hero.setPosition(at.x, at.y).setDepth(depthOf(camZ, 0.05));
      heroShadow.setPosition(at.x, at.y).setDepth(depthOf(camZ, 0) - 500);
      if (performance.now() >= busyUntil) heroLoop(st.speed > 0.1 && !finished ? 'run' : 'idle');
      const top = panel.bottom + 26;
      for (const [roundId, list] of rows) {
        if (list[0] && list[0].z > camZ + 6) {
          lowerOrbs(roundId);
          continue;
        }
        for (const o of list) {
          const base = screen(o.x, 0, o.z);
          o.arch?.setPosition(base.x, base.y).setDepth(depthOf(o.z, 0.01));
          const ball = screen(o.x, ORB_Y + Math.sin(time / 320 + o.x) * 0.08, o.z);
          o.ball.setPosition(ball.x, ball.y).setDepth(depthOf(o.z, 0.02));
          // The tags wait under the prompt panel until their orbs come into view.
          const over = screen(o.x, 3.3, o.z);
          o.tag.setPosition(over.x, Math.max(top, over.y));
        }
      }
      if (portal) {
        const base = screen(0, 0, portal.z);
        portal.arch?.setPosition(base.x, base.y).setDepth(depthOf(portal.z, 0.01));
        const mid = screen(0, 2.0, portal.z);
        portal.glow.setPosition(mid.x, mid.y).setDepth(depthOf(portal.z, 0.02));
      }
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: SpellweaversCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let n = 0; n < steps; n++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextChoice(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
      /** Game-pixel points of the current orbs' tags (for real taps). */
      points: () => ({ gates: [...rows.values()].at(-1)?.map((o) => ({ x: o.tag.x, y: o.tag.y })) ?? [] }),
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

    drawHud();
    audio.music('run');
    heroLoop('idle');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#6fae52',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'spellweavers-run', preload, create, update },
  };
}
