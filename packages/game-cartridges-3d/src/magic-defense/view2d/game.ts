/**
 * Magic Defense in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * The same core decides everything (../core) and the same driver plays the events (../view/driver.ts);
 * this view gives the driver a Phaser presentation: the baked vault hall with the forge sprites of
 * the `primary-chibi-2d` pack (the hall and the sprites of Monster Encounters), a missile label over
 * the casting enemy, and the paper card (`Card2D`) that holds the meaning and the spell buttons. Nothing is
 * timed. On a phone the battle is above the card; on a wide screen, beside it.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { banner, Card2D, COLORS, fitGameSize, popup, recolorTag, registerSheetAnimations, StatusBar2D, tag, type Rect } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { BattleStage2D } from '../../shared/battle/stage2d.js';
import { CASTER, createMagicDefense, type MagicDefenseCommand, type MagicDefenseInput, type HeroId, type Round } from '../core/index.js';
import { FILES_2D } from '../manifest.js';
import strings from '../strings.en.js';
import { MagicDefensePlayer, type Presentation, type Sfx } from '../view/driver.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

const SFX: Record<Sfx, string> = { pick: 'tap', correct: 'correct', wrong: 'wrong', hit: 'hit', defeat: 'defeat', victory: 'victory', storm: 'spawn' };

export interface MagicDefense2DTest {
  state(): unknown;
  /** What the card waits for, and its tappable elements in game pixels (the QC driver taps them). */
  card(): { awaiting: 'round' | null; targets: unknown[] };
  size(): { width: number; height: number };
  busy(): boolean;
  dispatch(command: unknown): void;
  tick(): void;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  if (Array.isArray(ctx.input)) throw new Error('Magic Defense needs a story input.');
  const story = ctx.input as StoryInput;
  const i18n = ctx.i18n ?? createI18n([strings]).scope('magicDefense');
  const t = i18n.scope('hud').t;
  const options = ctx.options ?? SESSION_OPTIONS_DEFAULT;
  const edition = ctx.edition;
  const seed = ctx.seed ?? Date.now() >>> 1;
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
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);

    // ---------------------------------------------------------------- layout: the battle and the card
    const top = 66;
    const battle: Rect = portrait ? { x: 0, y: top, width: W, height: H * 0.6 - top } : { x: 0, y: top, width: W * 0.56, height: H - top };
    const cardArea: Rect = portrait ? { x: 10, y: H * 0.5, width: W - 20, height: H * 0.5 - 10 } : { x: W * 0.56 + 6, y: top, width: W * 0.44 - 16, height: H - top - 8 };
    scene.cameras.main.setBackgroundColor('#0c1118');
    const stage = new BattleStage2D(scene, edition, PROJECTION, BACKGROUND_FILE, battle);
    const headOf = (id: string, lift = 1.4) => stage.headOf(id, lift);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    status.icon('⚡', () => {
      if (stormReady) void player?.storm();
    });
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    let place = '';
    let hearts = '';
    let manaText = '';
    const drawStatus = (): void => status.set(`${place} ${hearts}`, manaText);
    const card = new Card2D(scene, () => cardArea, () => audio.play('tap'), portrait ? 'bottom' : 'top');
    let awaiting: 'round' | null = null;
    audio.defineSfx('whoosh', (s) => s.noise(0.2, 0.12, 1800));

    // The missile label over the casting enemy, kept over its head every frame.
    const labels = new Map<string, Phaser.GameObjects.Container>();
    const clearLabels = (): void => {
      for (const s of labels.values()) s.destroy();
      labels.clear();
    };
    const setLabel = (round: Round): void => {
      clearLabels();
      labels.set(round.enemyId, tag(scene, round.prompt, 18, COLORS.tagFill, 0xb88cff).setDepth(17_000));
    };
    let round: Round | null = null;

    // ---------------------------------------------------------------- the game
    const sim = createMagicDefense(story as MagicDefenseInput, { seed, helper: options.helper });
    let player: MagicDefensePlayer | null = null;
    let stormReady = false;
    let pending: Promise<void> = Promise.resolve();

    const presentation: Presentation = {
      setCastles: (castles, max) => {
        hearts = castles.map((h) => `[${'❤'.repeat(h)}${'♡'.repeat(Math.max(0, max - h))}]`).join(' ');
        drawStatus();
      },
      setMana: (v, max) => {
        manaText = `⚡${v}/${max}`;
        stormReady = v >= max;
        drawStatus();
      },
      setProgress: (wave, count, done, size) => {
        place = t('progress', { wave, count, done, size });
        drawStatus();
      },
      async spawnWave(_wave, _count, enemies) {
        clearLabels();
        stage.setEnemies([]);
        audio.music('battle');
        audio.play('spawn');
        await Promise.all([banner(scene, t('intro'), '', 2.2), stage.spawn(enemies.map((e) => ({ id: e.id, kind: e.kind })))]);
      },
      showRound(r, cast) {
        round = r;
        setLabel(r);
        card.begin();
        card.line(t('castThe'), 16, '#6a5a8a', { bold: false });
        card.line(r.prompt, 30);
        awaiting = 'round';
        void card.choose(r.choices.filter((c) => !c.blocked).map((c) => ({ id: String(c.index), text: c.term }))).then((id) => {
          awaiting = null;
          cast(Number(id));
        });
      },
      hideRound: () => card.hide(),
      async markCast(choice, correct) {
        card.markChoice(String(choice), correct, '');
        const label = round ? labels.get(round.enemyId) : undefined;
        if (label) recolorTag(label, correct ? COLORS.green : 0x5a2a2a, correct ? 0xffffff : COLORS.red);
        if (correct) await card.feedback(true, `<b>${t('right')}</b>`);
        else await card.feedback(false, t('blocked'));
        await stage.wait(correct ? 0.5 : 0.8);
      },
      async castSpell(enemy, correct) {
        audio.play('whoosh');
        if (!correct) {
          await stage.heroMiss(CASTER, enemy.id);
          return;
        }
        const move = stage.heroAttack(CASTER, enemy.id, 'attack2');
        await move.hit;
        audio.play('hit');
        pending = move.done;
        await stage.enemyHit(enemy.id);
      },
      async castleHit(enemy, hero) {
        await stage.enemyAttack(enemy.id, hero as HeroId);
        const at = headOf(hero, 1.2);
        popup(scene, at.x, at.y, t('castleHit'), '', 17_800);
      },
      rest: () => banner(scene, t('rest.title'), t('rest.text'), 2.4),
      storm: () => banner(scene, t('storm.title'), t('storm.text'), 1.8),
      async clearWave(enemies) {
        await Promise.all(enemies.map((e) => stage.enemyDefeated(e.id)));
        clearLabels();
      },
      cardPopup: (value) => popup(scene, cardArea.x + cardArea.width / 2, cardArea.y + 40, value, 'good', 19_500),
      sfx: (name) => audio.play(SFX[name]),
      async victory() {
        audio.music('calm');
        await Promise.all([stage.victory(), banner(scene, t('victory.title'), t('victory.text'), 2.2)]);
      },
      settle: () => pending,
    };
    player = new MagicDefensePlayer({ sim, story, seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });

    // ---------------------------------------------------------------- frames and the QC hook
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      stage.update(dt);
      for (const [id, label] of labels) {
        const at = headOf(id, 1.3);
        label.setPosition(at.x, at.y - 18);
      }
    };
    const hook: MagicDefense2DTest = {
      state: () => sim.state,
      card: () => ({ awaiting, targets: card.targets }),
      size: () => ({ width: W, height: H }),
      busy: () => player?.isBusy ?? false,
      dispatch: (command) => void player?.play(sim.dispatch(command as MagicDefenseCommand)),
      tick: () => undefined,
    };
    const qc = window as unknown as { __apk3dView2d?: MagicDefense2DTest };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      player?.destroy();
      frame = null;
      clearLabels();
      card.hide();
      if (qc.__apk3dView2d === hook) delete qc.__apk3dView2d;
      unlock?.();
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    drawStatus();
    void player.start();
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#0c1118',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'magic-defense', preload, create, update },
  };
}
