/**
 * Rune Match in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * The same core decides everything (../core) and the same driver plays the events (../view/driver.ts);
 * this view gives the driver a Phaser presentation: the baked vault hall with the forge sprites
 * of the `primary-chibi-2d` pack (the hall and the sprites of Monster Encounters), the word, and
 * the rune board (`Board2D`). On a phone the battle is above the board; on a wide screen, beside it.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { banner, Board2D, fitGameSize, popup, registerSheetAnimations, StatusBar2D, text, type Rect } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { BattleStage2D } from '../../shared/battle/stage2d.js';
import { createRuneMatch, type RuneMatchCommand, type RuneMatchInput } from '../core/index.js';
import { FILES_2D } from '../manifest.js';
import strings from '../strings.en.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';
import { RuneMatchPlayer, type Presentation, type Sfx } from '../view/driver.js';

const SFX: Record<Sfx, string> = { swap: 'tap', burst: 'correct', reject: 'wrong', heal: 'heal', shield: 'tap', hit: 'hit', defeat: 'defeat', victory: 'victory' };

export interface RuneMatch2DTest {
  state(): unknown;
  /** The board tiles and their centers in game pixels (the QC driver taps them). */
  board(): { id: string; row: number; col: number; text: string; x: number; y: number }[];
  size(): { width: number; height: number };
  busy(): boolean;
  dispatch(command: unknown): void;
  tick(): void;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  if (Array.isArray(ctx.input)) throw new Error('Rune Match needs a practice input.');
  const story = ctx.input as PracticeInput;
  const i18n = ctx.i18n ?? createI18n([strings]).scope('runeMatch');
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

    // ---------------------------------------------------------------- layout: the battle, the word, the board
    const top = 66;
    const battle: Rect = portrait ? { x: 0, y: top, width: W, height: H * 0.4 - top } : { x: 0, y: top, width: W * 0.56, height: H - top };
    const findY = portrait ? H * 0.42 : top + 6;
    const findX = portrait ? W / 2 : W * 0.56 + (W * 0.44 - 10) / 2;
    const boardArea: Rect = portrait ? { x: 10, y: H * 0.42 + 56, width: W - 20, height: H * 0.58 - 66 } : { x: W * 0.56 + 6, y: top + 66, width: W * 0.44 - 16, height: H - top - 76 };
    scene.cameras.main.setBackgroundColor('#0c1118');
    const stage = new BattleStage2D(scene, edition, PROJECTION, BACKGROUND_FILE, battle);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    let place = '';
    let hearts = '';
    let shield = '';
    const drawStatus = (): void => status.set(place, `${hearts}${shield}`);
    text(scene, findX, findY, t('find'), 15, '#b8c4ee', false).setOrigin(0.5, 0).setScrollFactor(0).setDepth(18_100);
    const word = text(scene, findX, findY + 20, '', 30).setOrigin(0.5, 0).setScrollFactor(0).setDepth(18_100);

    // ---------------------------------------------------------------- the game
    const sim = createRuneMatch(story as RuneMatchInput, { seed, helper: options.helper });
    let player: RuneMatchPlayer | null = null;
    const board = new Board2D(scene, boardArea, sim.state.rows, sim.state.cols, (a, b) => void player?.swap(a, b), () => audio.play('tap'));
    let pending: Promise<void> = Promise.resolve();
    const headOf = (id: string, lift = 1.4) => stage.headOf(id, lift);

    const presentation: Presentation = {
      board,
      showTarget: (term) => word.setText(term),
      setCourage: (v, max) => {
        hearts = '❤'.repeat(v) + '♡'.repeat(Math.max(0, max - v));
        drawStatus();
      },
      setShield: (on) => {
        shield = on ? ` ${t('shield')}` : '';
        drawStatus();
      },
      setPlace: (index, count, kind) => {
        place = t('progress', { index, count, name: i18n.t(`monsters.${kind}`) });
        drawStatus();
      },
      async spawn(m) {
        stage.setEnemies([]);
        audio.music(m.kind === 'dragon-fire' ? 'boss' : 'battle');
        audio.play(m.kind === 'dragon-fire' ? 'roar' : 'spawn');
        await Promise.all([banner(scene, i18n.t(`monsters.${m.kind}`), t('intro'), 2.2), stage.spawn([m])]);
        stage.setEnemies([m]);
      },
      setMonsterHp: (m) => stage.updateEnemy(m.id, m.hp, m.defeated),
      async heroStrike(hero, m, damage) {
        audio.play('whoosh');
        const move = stage.heroAttack(hero, m.id, 'attack');
        await move.hit;
        audio.play('hit');
        const at = headOf(m.id);
        popup(scene, at.x, at.y, `-${damage}`, '', 17_800);
        pending = move.done;
      },
      monsterHit: (m) => stage.enemyHit(m.id),
      monsterDefeated: (m) => stage.enemyDefeated(m.id),
      async monsterStrike(m, hero, blocked) {
        await stage.enemyAttack(m.id, hero);
        const at = headOf(hero, 1.2);
        popup(scene, at.x, at.y, blocked ? t('blocked') : t('courageLost'), blocked ? 'good' : '', 17_800);
      },
      heal(hero) {
        stage.heal(hero);
        const at = headOf(hero, 1.3);
        popup(scene, at.x, at.y, t('courageGained'), 'good', 17_800);
      },
      rest: () => banner(scene, t('rest.title'), t('rest.text'), 2.4),
      boardPopup: (value) => popup(scene, boardArea.x + boardArea.width / 2, boardArea.y + boardArea.height / 2, value, 'good', 19_500),
      sfx: (name) => audio.play(SFX[name]),
      async victory() {
        audio.music('calm');
        await Promise.all([stage.victory(), banner(scene, t('victory.title'), t('victory.text'), 2.2)]);
      },
      settle: () => pending,
    };
    player = new RuneMatchPlayer({ sim, story, seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });

    // ---------------------------------------------------------------- frames and the QC hook
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      stage.update(dt);
    };
    const hook: RuneMatch2DTest = {
      state: () => sim.state,
      board: () => board.targets,
      size: () => ({ width: W, height: H }),
      busy: () => player?.isBusy ?? false,
      dispatch: (command) => void player?.play(sim.dispatch(command as RuneMatchCommand)),
      tick: () => undefined,
    };
    const qc = window as unknown as { __apk3dView2d?: RuneMatch2DTest };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      player?.destroy();
      frame = null;
      board.destroy();
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
    scene: { key: 'rune-match', preload, create, update },
  };
}
