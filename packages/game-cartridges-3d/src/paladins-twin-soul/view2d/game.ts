/**
 * Paladin's Twin Soul in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. The same core decides everything (../core) and the same driver plays the events
 * (../view/driver.ts); this view gives the driver a Phaser presentation: the baked vault hall with
 * the forge sprites of the `primary-chibi-2d` pack, and the meaning with its shades on the
 * Phaser card (`Card2D`). On a phone the battle is above the card; on a wide screen, beside it.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { banner, Card2D, COLORS, fitGameSize, popup, registerSheetAnimations, StatusBar2D, type Rect } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { BattleStage2D } from '../../shared/battle/stage2d.js';
import { createTwinSoul, type TwinSoulCommand, type TwinSoulInput } from '../core/index.js';
import { FILES_2D } from '../manifest.js';
import strings from '../strings.en.js';
import { TwinSoulPlayer, type Presentation, type Sfx } from '../view/driver.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

const SFX: Record<Sfx, string> = { reject: 'wrong', freed: 'correct', hit: 'hit', defeat: 'defeat', victory: 'victory', spawn: 'spawn' };

export interface TwinSoul2DTest {
  state(): unknown;
  /** The shades on the card and their centers in game pixels (the QC driver taps them). */
  card(): { awaiting: boolean; targets: { kind: string; id: string; x: number; y: number }[] };
  size(): { width: number; height: number };
  dispatch(command: unknown): void;
  tick(): void;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  if (Array.isArray(ctx.input)) throw new Error('Paladin’s Twin Soul needs a story input.');
  const story = ctx.input as StoryInput;
  const i18n = ctx.i18n ?? createI18n([strings]).scope('paladinsTwinSoul');
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
    const battle: Rect = portrait ? { x: 0, y: top, width: W, height: H * 0.5 - top } : { x: 0, y: top, width: W * 0.56, height: H - top };
    const cardArea: Rect = portrait ? { x: 10, y: H * 0.42, width: W - 20, height: H * 0.58 - 10 } : { x: W * 0.56 + 6, y: top, width: W * 0.44 - 16, height: H - top - 8 };
    scene.cameras.main.setBackgroundColor('#0c1118');
    const stage = new BattleStage2D(scene, edition, PROJECTION, BACKGROUND_FILE, battle);
    const headOf = (id: string, lift = 1.4) => stage.headOf(id, lift);

    // ---------------------------------------------------------------- HUD
    const status = new StatusBar2D(scene, t('place'));
    if (ctx.host?.toggleMute) {
      const icon = status.icon('🔊', () => icon.setText(ctx.host?.toggleMute?.() ? '🔇' : '🔊'));
    }
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    let place = '';
    let hearts = '';
    let twins = '';
    const drawStatus = (): void => status.set(place, `${hearts} ${twins}`);
    const card = new Card2D(scene, () => cardArea, () => audio.play('tap'), portrait ? 'bottom' : 'top');
    let awaiting = false;
    let shown: { translation: string; shades: { id: string; term: string }[]; retry: boolean } | null = null;
    audio.defineSfx('whoosh', (s) => s.noise(0.2, 0.12, 1800));

    // ---------------------------------------------------------------- the game
    const sim = createTwinSoul(story as TwinSoulInput, { seed, helper: options.helper });
    let player: TwinSoulPlayer | null = null;
    let pending: Promise<void> = Promise.resolve();

    /** Draws the card with the meaning, the shades, and (when `mark` is set) the verdict on one shade. */
    const drawCard = (mark: { id: string; good: boolean } | null): Promise<string> | null => {
      if (!shown) return null;
      card.begin();
      card.pill(`✦ ${t('twins')}`, COLORS.purple, shown.retry ? t('again') : '');
      card.line(t('find'), 15, '#6a5a8a', { bold: false });
      card.line(shown.translation, 28);
      const choice = card.choose(shown.shades.map((s) => ({ id: s.id, text: `👻 ${s.term}` })));
      if (mark) card.markChoice(mark.id, mark.good, `👻 ${shown.shades.find((s) => s.id === mark.id)?.term ?? ''}`);
      return choice;
    };

    const presentation: Presentation = {
      async ask(wave) {
        shown = wave;
        awaiting = true;
        const id = await drawCard(null)!;
        awaiting = false;
        return id;
      },
      setCourage: (v, max) => {
        hearts = '❤'.repeat(v) + '♡'.repeat(Math.max(0, max - v));
        drawStatus();
      },
      setTwins: (freed, count) => {
        twins = `✦ ${t('twinCount', { freed, count })}`;
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
      captured: () => {
        const at = headOf('knight', 1.6);
        popup(scene, at.x, at.y, t('captured'), '', 17_800);
      },
      async shadeFell(id) {
        if (shown) {
          // Draw the card again with the wrong shade marked; the choice promise is not awaited.
          void drawCard({ id, good: false });
        }
        await stage.wait(0.7);
        if (shown) shown = { ...shown, shades: shown.shades.filter((s) => s.id !== id), retry: true };
      },
      async soulFreed(id, _points, firstTry) {
        void drawCard({ id, good: true });
        const at = headOf('knight', 1.6);
        popup(scene, at.x, at.y, t(firstTry ? 'freedFirst' : 'freed'), 'good', 17_800);
        await stage.wait(0.8);
      },
      async scatter() {
        card.hide();
        shown = null;
      },
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
      async monsterStrike(m, hero) {
        await stage.enemyAttack(m.id, hero);
        const at = headOf(hero, 1.2);
        popup(scene, at.x, at.y, t('courageLost'), '', 17_800);
      },
      rest: () => banner(scene, t('rest.title'), t('rest.text'), 2.4),
      sfx: (name) => audio.play(SFX[name]),
      async victory() {
        audio.music('calm');
        await Promise.all([stage.victory(), banner(scene, t('victory.title'), t('victory.text'), 2.2)]);
      },
      settle: () => pending,
    };
    player = new TwinSoulPlayer({ sim, story, seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });

    // ---------------------------------------------------------------- frames and the QC hook
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      stage.update(dt);
    };
    const hook: TwinSoul2DTest = {
      state: () => sim.state,
      card: () => ({ awaiting, targets: card.targets }),
      size: () => ({ width: W, height: H }),
      dispatch: (command) => void sim.dispatch(command as TwinSoulCommand),
      tick: () => undefined,
    };
    const qc = window as unknown as { __apk3dView2d?: TwinSoul2DTest };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      player?.destroy();
      frame = null;
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
    scene: { key: 'paladins-twin-soul', preload, create, update },
  };
}
