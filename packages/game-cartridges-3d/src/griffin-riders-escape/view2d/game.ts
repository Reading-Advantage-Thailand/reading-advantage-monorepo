/**
 * Griffin Riders Escape in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. It runs the same core, rules, catalog, and evidence as the 3D view (../view/game.ts).
 * The camera looks down the flight from above and behind: the land scrolls under the griffin (the
 * griffin sprite, with its rider), the word gates and the bat storms come from the top
 * in three lanes, and the student taps a lane (or a gate tag, or swipes, or uses the keys).
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { createFixedStepLoop, createManualClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { animationKeyOf, banner, COLORS, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, textureKeyOf } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { TUNING, createGriffinRidersEscape, evidenceOf, laneX, scoreOf, type EscapeCommand, type EscapeEvent, type EscapeState, type GateInfo } from '../core/index.js';
import { FILES_2D, HEROES_2D } from '../manifest.js';
import { nextChoice } from '../qc/bot.js';
import strings from '../strings.en.js';
import { CHUNK, GATE_COLORS, SIZES, chunkLayout, rng } from '../view/land-plan.js';
import { PromptPanel2D } from './prompt.js';

/** Frame widths of the sheets in pixels, to size a sprite in meters. */
const FRAME = { griffin: 156, bat: 112, rider: 120 } as const;
/** The meters of flight the screen shows ahead of the griffin. */
const AHEAD = 44;

interface Gate2D {
  lane: number;
  ring: Phaser.GameObjects.Ellipse;
  tag: Phaser.GameObjects.Container;
}

interface Storm2D {
  lane: number;
  bats: Phaser.GameObjects.Sprite[];
  cloud: Phaser.GameObjects.Ellipse;
}

interface Wave2D {
  id: string;
  z: number;
  gates: Gate2D[];
  storms: Storm2D[];
}

interface Prop {
  sprite: Phaser.GameObjects.Image;
  x: number;
  z: number;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  const story = ctx.input as PracticeInput;
  const t = (ctx.i18n ?? createI18n([strings]).scope('griffinRidersEscape')).scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const heroId = (HEROES_2D as readonly string[]).includes(options.hero) ? options.hero : 'knight';
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
  const sim = createGriffinRidersEscape(story, { seed, helper: options.helper });
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
    const startedAt = performance.now();
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);
    const has = (id: string): boolean => !!edition.bindings[id];

    // ---------------------------------------------------------------- the camera from above
    /** Pixels per meter across and along the flight, and the screen y of the griffin. */
    const kx = Math.min(W / 12.5, 64);
    const anchorY = H * 0.8;
    const kz = (anchorY - H * 0.3) / AHEAD;
    let distance = 0;
    /** The screen point of lane-space x and the world z (negative ahead). */
    const screen = (x: number, z: number) => ({ x: W / 2 + x * kx, y: anchorY - (-z - distance) * kz });
    const scaleOf = (fileId: string, meters: number, frameWidth: number): number => (has(fileId) ? (meters * kx) / frameWidth : 1);

    // ---------------------------------------------------------------- the land
    scene.cameras.main.setBackgroundColor('#74ad4c');
    const groundKey = 'griffin-riders-escape:ground';
    if (!scene.textures.exists(groundKey)) {
      const canvas = scene.textures.createCanvas(groundKey, 256, 256);
      const g = canvas?.getContext();
      if (g && canvas) {
        g.fillStyle = '#74ad4c';
        g.fillRect(0, 0, 256, 256);
        const r = rng(17);
        for (let i = 0; i < 900; i++) {
          g.fillStyle = r() < 0.5 ? 'rgba(50, 100, 40, 0.35)' : 'rgba(190, 225, 130, 0.3)';
          g.fillRect(r() * 256, r() * 256, 2 + r() * 3, 1 + r() * 2);
        }
        canvas.refresh();
      }
    }
    const ground = scene.add.tileSprite(0, 0, W, H, groundKey).setOrigin(0, 0).setDepth(-2e9);
    scene.add.tileSprite(W / 2, 0, 11 * kx * 0.5, H, groundKey).setOrigin(0.5, 0).setDepth(-2e9 + 1).setTint(0xcfe8a0).setAlpha(0.6);
    // Lane lines.
    for (const x of [-1.8, 1.8]) scene.add.rectangle(W / 2 + x * kx, H / 2, 3, H, 0xffffff, 0.35).setDepth(-2e9 + 2);

    const chunks = new Map<number, Prop[]>();
    function buildChunk(index: number): Prop[] {
      const list: Prop[] = [];
      for (const p of chunkLayout(index)) {
        const id = `prop.${p.name}`;
        if (!has(id)) continue;
        const file = edition.pack.files[id]!;
        const sprite = scene.add.image(0, 0, textureKeyOf(edition, id), 0).setScale((kx / 64) * p.scale * (/tree|cottage/.test(p.name) ? 1.3 : 1));
        if (file.origin) sprite.setOrigin(file.origin.x, file.origin.y);
        if (p.turn > 3.1) sprite.setFlipX(true);
        list.push({ sprite, x: p.x, z: p.z });
      }
      return list;
    }
    function followLand(): void {
      const first = Math.floor(distance / CHUNK) - 1;
      for (let i = first; i < first + 3; i++) if (!chunks.has(i)) chunks.set(i, buildChunk(i));
      for (const [i, list] of chunks) {
        if (i >= first && i < first + 3) continue;
        list.forEach((p) => p.sprite.destroy());
        chunks.delete(i);
      }
      for (const list of chunks.values()) {
        for (const p of list) {
          const at = screen(p.x, p.z);
          p.sprite.setPosition(at.x, at.y).setDepth(-1000 + at.y * 0.1);
        }
      }
      ground.tilePositionY = -distance * kz;
    }

    // ---------------------------------------------------------------- the griffin and its rider
    const griffinFile = edition.pack.files['griffin.fly'];
    const griffin = scene.add.sprite(0, 0, griffinFile ? textureKeyOf(edition, griffinFile.id) : '__MISSING').setScale(scaleOf('griffin.fly', SIZES.griffin * 1.3, FRAME.griffin));
    if (griffinFile?.origin) griffin.setOrigin(griffinFile.origin.x, griffinFile.origin.y);
    const shadow = scene.add.ellipse(0, 0, 2.2 * kx, 0.9 * kx, 0x1c3010, 0.3);
    const riderFile = edition.pack.files[`${heroId}.idle`];
    const rider = scene.add.sprite(0, 0, riderFile ? textureKeyOf(edition, riderFile.id) : '__MISSING').setScale(scaleOf(`${heroId}.idle`, SIZES.rider, FRAME.rider));
    if (riderFile?.origin) rider.setOrigin(riderFile.origin.x, riderFile.origin.y);
    let griffinClip = '';
    let busyUntil = 0;
    const griffinLoop = (): void => {
      if (griffinClip === 'fly.n' || !has('griffin.fly')) return;
      griffinClip = 'fly.n';
      griffin.play(animationKeyOf(edition, 'griffin.fly', 'fly.n'));
    };
    const griffinPlay = (file: string): void => {
      if (!has(`griffin.${file}`)) return;
      griffinClip = '';
      busyUntil = performance.now() + 900;
      griffin.play(animationKeyOf(edition, `griffin.${file}`, `${file}.n`));
    };
    let riderClip = '';
    const riderPlay = (name: 'idle' | 'victory' | 'hit'): void => {
      const key = `${name}.n`;
      if (riderClip === key || !has(`${heroId}.${name}`)) return;
      riderClip = key;
      rider.play(animationKeyOf(edition, `${heroId}.${name}`, key));
    };

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    const panel = new PromptPanel2D(scene, 66);

    audio.defineMood('escape', { bpm: 124, chords: [[57, 60, 64], [62, 65, 69], [55, 59, 62], [60, 64, 67]], busy: true, drum: false });
    audio.defineSfx('whoosh', (sx) => sx.noise(0.14, 0.06, 1800));
    audio.defineSfx('collect', (sx) => [784, 988, 1319].forEach((f, i) => sx.tone(f, 0.22, 'triangle', 0.14, i * 0.06)));
    audio.defineSfx('cast', (sx) => [523, 659, 784, 1047].forEach((f, i) => sx.tone(f, 0.3, 'triangle', 0.14, i * 0.08)));
    audio.defineSfx('fizzle', (sx) => sx.noise(0.3, 0.12, 500));

    function drawHud(): void {
      const st = sim.state;
      const sentence = st.sentences[Math.min(st.sentence, st.sentences.length - 1)];
      status.set(t('sentence', { index: Math.min(st.sentence + 1, st.sentences.length), total: st.sentences.length }), '●'.repeat(st.courage) + '○'.repeat(Math.max(0, TUNING.courage - st.courage)));
      if (sentence) panel.set(t('next'), sentence.translation ?? t('build'), sentence.words, st.word, st.helper);
    }

    // ---------------------------------------------------------------- waves
    const waves = new Map<string, Wave2D>();
    function goTo(lane: number): void {
      if (!finished && sim.state.phase === 'flight') loop.dispatch({ type: 'lane', lane });
    }
    function raiseGates(wave: Wave2D, gates: readonly GateInfo[]): void {
      for (const info of gates) {
        const color = GATE_COLORS[info.lane % GATE_COLORS.length]!;
        const ring = scene.add.ellipse(0, 0, 2.6 * kx, 2.6 * kx, color, 0.18).setStrokeStyle(6, color, 0.95);
        const label = tag(scene, info.text, 20).setDepth(16_000);
        label.setInteractive({ useHandCursor: true }).on('pointerup', () => goTo(info.lane));
        wave.gates.push({ lane: info.lane, ring, tag: label });
      }
    }
    function raiseStorm(wave: Wave2D, lanes: readonly number[]): void {
      const file = edition.pack.files['giant-bat.fly'];
      for (const lane of lanes) {
        const cloud = scene.add.ellipse(0, 0, 3.2 * kx, 2.2 * kx, 0x4a4a68, 0.5);
        const bats = [-0.8, 0.8].map(() => {
          const sprite = scene.add.sprite(0, 0, file ? textureKeyOf(edition, file.id) : '__MISSING').setScale(scaleOf('giant-bat.fly', SIZES.bat * 1.1, FRAME.bat));
          if (file?.origin) sprite.setOrigin(file.origin.x, file.origin.y);
          if (has('giant-bat.fly')) sprite.play(animationKeyOf(edition, 'giant-bat.fly', 'fly.s'));
          return sprite;
        });
        wave.storms.push({ lane, bats, cloud });
      }
    }
    function lowerWave(id: string): void {
      const wave = waves.get(id);
      if (!wave) return;
      for (const g of wave.gates) {
        g.ring.destroy();
        g.tag.destroy();
      }
      for (const s of wave.storms) {
        s.cloud.destroy();
        s.bats.forEach((b) => b.destroy());
      }
      waves.delete(id);
    }

    // Taps on the screen pick the lane under them; swipes steer; keys 1-3 or A D steer.
    let downX: number | null = null;
    scene.input.on('pointerdown', (p: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => (downX = over.length ? null : p.x));
    scene.input.on('pointerup', (p: Phaser.Input.Pointer) => {
      if (downX === null || finished) return;
      const dx = p.x - downX;
      downX = null;
      if (Math.abs(dx) > 50) loop.dispatch({ type: 'steer', dir: dx < 0 ? -1 : 1 });
      else {
        const lanes = sim.state.laneCount;
        goTo(Math.min(lanes - 1, Math.max(0, Math.floor(((p.x - W / 2) / kx + (lanes * 3.6) / 2) / 3.6))));
      }
    });
    const held = new Set<string>();
    function readKeys(): void {
      const pressed = ctx.inputController.snapshot().pressed ?? [];
      for (const key of pressed) {
        if (held.has(key)) continue;
        const digit = /^(?:Digit|Numpad)([1-3])$/.exec(key);
        if (digit) goTo(Number(digit[1]) - 1);
        if (key === 'ArrowLeft' || key === 'KeyA') loop.dispatch({ type: 'steer', dir: -1 });
        if (key === 'ArrowRight' || key === 'KeyD') loop.dispatch({ type: 'steer', dir: 1 });
      }
      held.clear();
      for (const key of pressed) held.add(key);
    }

    // ---------------------------------------------------------------- events
    let finished = false;
    const griffinTop = () => ({ x: griffin.x, y: griffin.y - SIZES.griffin * kx * 0.6 });

    function burst(x: number, y: number, color: number, n: number): void {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2 + 0.3 * i;
        const d = 24 + (i % 4) * 9;
        const dot = scene.add.circle(x, y, 3 + (i % 3), color).setDepth(18_000);
        scene.tweens.add({ targets: dot, x: x + Math.cos(a) * d, y: y + Math.sin(a) * d * 0.7 - 12, alpha: 0, scale: 0.3, duration: 600, ease: 'Cubic.Out', onComplete: () => dot.destroy() });
      }
    }

    function handle(ev: EscapeEvent): void {
      switch (ev.type) {
        case 'waveMade': {
          const wave: Wave2D = { id: ev.waveId, z: -ev.z, gates: [], storms: [] };
          waves.set(ev.waveId, wave);
          if (ev.kind === 'gates') raiseGates(wave, ev.gates);
          else raiseStorm(wave, ev.stormLanes);
          break;
        }
        case 'laneChanged':
          audio.play('whoosh');
          break;
        case 'gatePassed': {
          const wave = waves.get(ev.waveId);
          for (const g of wave?.gates ?? []) {
            g.tag.disableInteractive();
            if (g.lane === ev.lane) {
              recolorTag(g.tag, ev.correct ? COLORS.green : COLORS.red, 0xffffff);
              if (ev.correct) burst(g.ring.x, g.ring.y, 0xffe27a, 16);
              else g.ring.setFillStyle(0x777777, 0.4);
            } else {
              g.tag.setAlpha(0.45);
              g.ring.setAlpha(0.35);
            }
          }
          audio.play(ev.correct ? 'correct' : 'fizzle');
          break;
        }
        case 'wordCollected': {
          audio.play('collect');
          const at = griffinTop();
          popup(scene, at.x, at.y, t('collected'), 'good', 19_000);
          break;
        }
        case 'stormHit': {
          const wave = waves.get(ev.waveId);
          for (const s of wave?.storms ?? []) if (s.lane === ev.lane) burst(s.cloud.x, s.cloud.y, 0x9aa0b4, 16);
          audio.play('fizzle');
          griffinPlay('hit');
          scene.cameras.main.shake(250, 0.005);
          const at = griffinTop();
          popup(scene, at.x, at.y, t('stormed'), 'miss', 19_000);
          break;
        }
        case 'stormDodged':
          audio.play('whoosh');
          break;
        case 'courageLost':
          if (ev.cause === 'gate') {
            griffinPlay('hit');
            scene.cameras.main.shake(200, 0.004);
            const at = griffinTop();
            popup(scene, at.x, at.y, t('again'), 'miss', 19_000);
          }
          break;
        case 'rested': {
          const at = griffinTop();
          popup(scene, at.x, at.y, t('rested'), 'good', 19_000);
          break;
        }
        case 'sentenceCast':
          audio.play('cast');
          riderPlay('victory');
          burst(griffin.x, griffin.y - 40, 0xc9a7ff, 24);
          void banner(scene, t('cast.title'), t('cast.text'), 1.2);
          break;
        case 'escapeComplete':
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
      audio.music('calm');
      audio.play('victory');
      griffinPlay('roar');
      riderPlay('victory');
      burst(griffin.x, griffin.y - 50, 0xffe27a, 30);
      await banner(scene, t('done.title'), t('done.text'), 2.2);
      const evidence = evidenceOf(sim.state, story, seed, Math.round(performance.now() - startedAt));
      ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
    }

    // ---------------------------------------------------------------- the loop, on Phaser's frames
    const manual = createManualClock();
    const loop = createFixedStepLoop<EscapeState, EscapeCommand, EscapeEvent>(sim, { render: (events) => events.forEach(handle) }, manual.clock);
    let last = 0;
    let gx = sim.state.griffin.x;
    frame = (time: number) => {
      manual.run(time);
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      const st = sim.state;
      if (!finished) readKeys();
      distance += (st.distance - distance) * (1 - Math.exp(-dt * 18));
      gx += (st.griffin.x - gx) * (1 - Math.exp(-dt * 14));
      const bob = Math.sin(time / 340) * 4;
      griffin.setPosition(W / 2 + gx * kx, anchorY + bob).setDepth(3000);
      shadow.setPosition(griffin.x, anchorY + 0.7 * kx).setDepth(2999);
      rider.setPosition(griffin.x, anchorY + bob - SIZES.griffin * kx * 0.28).setDepth(3001);
      if (performance.now() >= busyUntil) griffinLoop();
      if (!finished) riderPlay('idle');
      for (const [id, wave] of waves) {
        const ahead = -wave.z - distance;
        if (ahead < -6) {
          lowerWave(id);
          continue;
        }
        const visible = ahead < AHEAD;
        const depth = 2000 - ahead * 10;
        for (const g of wave.gates) {
          const p = screen(laneX(g.lane), wave.z);
          g.ring.setPosition(p.x, p.y).setVisible(visible).setDepth(depth);
          g.tag.setPosition(p.x, Math.max(panel.bottom + 26, p.y - 1.5 * kx)).setVisible(visible);
        }
        for (const s of wave.storms) {
          const p = screen(laneX(s.lane), wave.z);
          s.cloud.setPosition(p.x, p.y).setVisible(visible).setDepth(depth);
          s.bats.forEach((b, k) => b.setPosition(p.x + (k ? 0.8 : -0.8) * kx, p.y + Math.sin(time / 300 + k * 2 + s.lane) * 6).setVisible(visible).setDepth(depth + 1));
        }
      }
      followLand();
    };

    scene.events.on('resume', () => loop.reset());
    const hook = {
      state: () => sim.state,
      dispatch: (command: EscapeCommand) => loop.dispatch(command),
      tick: (steps: number) => {
        for (let n = 0; n < steps; n++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextChoice(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
      /** Game-pixel points of the current gate tags (for real taps). */
      points: () => ({ gates: [...waves.values()].flatMap((w) => w.gates.filter((g) => g.tag.visible && g.tag.input?.enabled).map((g) => ({ x: g.tag.x, y: g.tag.y }))) }),
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
    audio.music('escape');
    griffinLoop();
    riderPlay('idle');
    loop.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#74ad4c',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'griffin-riders-escape', preload, create, update },
  };
}
