/**
 * RPG Battle in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * The same core decides everything (../core) and the same driver plays the events (../view/driver.ts);
 * this view gives the driver a Phaser presentation: the baked vault hall with the forge sprites of
 * the `primary-chibi-2d` pack (the hall and the sprites of Monster Encounters), and the paper card
 * (`Card2D`) that holds the hand and the question. Nothing is timed. On a phone the battle is above
 * the card; on a wide screen, beside it.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { banner, Card2D, fitGameSize, popup, registerSheetAnimations, StatusBar2D, type CardAction, type Rect } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { BattleStage2D } from '../../shared/battle/stage2d.js';
import { createRpgBattle, HERO_OF, type ActionKind, type RpgBattleCommand, type RpgBattleInput } from '../core/index.js';
import { FILES_2D } from '../manifest.js';
import strings from '../strings.en.js';
import { RpgBattlePlayer, type Presentation, type Sfx } from '../view/driver.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

const SFX: Record<Sfx, string> = { pick: 'tap', correct: 'correct', wrong: 'wrong', heal: 'heal', hit: 'hit', defeat: 'defeat', victory: 'victory' };

const ACTION_LOOK: Record<ActionKind, { color: number; emoji: string }> = {
  slash: { color: 0xd9463b, emoji: '⚔️' },
  blaze: { color: 0x6a3fd1, emoji: '🔥' },
  mend: { color: 0x2f7fd8, emoji: '✨' },
};

const BACK = '__back';

export interface RpgBattle2DTest {
  state(): unknown;
  /** What the card waits for, and its tappable elements in game pixels (the QC driver taps them). */
  card(): { awaiting: 'hand' | 'question' | 'feedback' | null; targets: unknown[] };
  size(): { width: number; height: number };
  busy(): boolean;
  dispatch(command: unknown): void;
  tick(): void;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  if (Array.isArray(ctx.input)) throw new Error('RPG Battle needs a story input.');
  const story = ctx.input as StoryInput;
  const i18n = ctx.i18n ?? createI18n([strings]).scope('rpgBattle');
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
    if (ctx.host?.openStory) status.icon('📖', () => ctx.host?.openStory?.());
    let place = '';
    let hearts = '';
    const drawStatus = (): void => status.set(place, hearts);
    const card = new Card2D(scene, () => cardArea, () => audio.play('tap'), portrait ? 'bottom' : 'top');
    let awaiting: 'hand' | 'question' | 'feedback' | null = null;
    audio.defineSfx('whoosh', (s) => s.noise(0.2, 0.12, 1800));

    // ---------------------------------------------------------------- the game
    const sim = createRpgBattle(story as RpgBattleInput, { seed, helper: options.helper });
    let player: RpgBattlePlayer | null = null;
    let pending: Promise<void> = Promise.resolve();

    const presentation: Presentation = {
      setCourage: (v, max) => {
        hearts = '❤'.repeat(v) + '♡'.repeat(Math.max(0, max - v));
        drawStatus();
      },
      setPlace: (index, count, kind) => {
        place = t('progress', { index, count, name: i18n.t(`monsters.${kind}`) });
        drawStatus();
      },
      showHand(cards, pick) {
        card.begin();
        card.line(t('pickCard'), 16, '#6a5a8a', { bold: false });
        awaiting = 'hand';
        const labels = cards.map((c) => ({ id: c.id, text: `${ACTION_LOOK[c.action].emoji} ${c.term}${c.power === 'power' ? ' ★' : ''}` }));
        void card.choose(labels).then((id) => {
          awaiting = null;
          pick(id);
        });
      },
      showQuestion(q, c, answer, back) {
        const look = ACTION_LOOK[c.action];
        card.begin();
        card.pill(`${look.emoji} ${i18n.t(`actions.${c.action}`)} · ${i18n.t(`heroes.${HERO_OF[c.action]}`)}`, look.color, c.retry ? t('again') : t(c.power === 'power' ? 'power' : 'basic'));
        card.line(q.term, 30);
        card.line(t('whichMeaning'), 15, '#6a5a8a', { bold: false });
        awaiting = 'question';
        void card.choose([...q.options, { id: BACK, text: t('back') }]).then((id) => {
          awaiting = null;
          if (id === BACK) back();
          else answer(id);
        });
      },
      hideCard: () => card.hide(),
      async feedback(_q, optionId, correct, correctText) {
        card.markChoice(optionId, correct, correctText);
        if (correct) {
          await card.feedback(true, `<b>${t('right')}</b>`);
          await stage.wait(0.75);
          return;
        }
        awaiting = 'feedback';
        const actions: CardAction[] = [{ id: 'go', label: t('continue') }];
        await card.feedback(false, t('wrong', { answer: correctText }), actions);
        awaiting = null;
      },
      async spawn(m) {
        stage.setEnemies([]);
        audio.music(m.kind === 'dragon-fire' ? 'boss' : 'battle');
        audio.play(m.kind === 'dragon-fire' ? 'roar' : 'spawn');
        await Promise.all([banner(scene, i18n.t(`monsters.${m.kind}`), t('intro'), 2.2), stage.spawn([m])]);
        stage.setEnemies([m]);
      },
      setMonsterHp: (m) => stage.updateEnemy(m.id, m.hp, m.defeated),
      async heroStrike(hero, m, damage, _action, power) {
        audio.play('whoosh');
        const move = stage.heroAttack(hero, m.id, power === 'power' || hero === 'cleric' ? 'attack2' : 'attack');
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
      heal(hero, amount) {
        stage.heal(hero);
        const at = headOf(hero, 1.3);
        popup(scene, at.x, at.y, t('courageGained', { count: amount }), 'good', 17_800);
      },
      rest: () => banner(scene, t('rest.title'), t('rest.text'), 2.4),
      cardPopup: (value) => popup(scene, cardArea.x + cardArea.width / 2, cardArea.y + 40, value, 'good', 19_500),
      sfx: (name) => audio.play(SFX[name]),
      async victory() {
        audio.music('calm');
        await Promise.all([stage.victory(), banner(scene, t('victory.title'), t('victory.text'), 2.2)]);
      },
      settle: () => pending,
    };
    player = new RpgBattlePlayer({ sim, story, seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });

    // ---------------------------------------------------------------- frames and the QC hook
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      stage.update(dt);
    };
    const hook: RpgBattle2DTest = {
      state: () => sim.state,
      card: () => ({ awaiting, targets: card.targets }),
      size: () => ({ width: W, height: H }),
      busy: () => player?.isBusy ?? false,
      dispatch: (command) => void player?.play(sim.dispatch(command as RpgBattleCommand)),
      tick: () => undefined,
    };
    const qc = window as unknown as { __apk3dView2d?: RpgBattle2DTest };
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
    scene: { key: 'rpg-battle', preload, create, update },
  };
}
