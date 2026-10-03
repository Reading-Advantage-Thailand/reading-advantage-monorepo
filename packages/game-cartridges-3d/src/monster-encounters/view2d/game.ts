/**
 * Monster Encounters in 2D (Phaser): the fallback for old phones and the renderer a player may
 * choose. The same core decides everything (../core); this view shows each event in order, as the
 * 3D view does (../view/game.ts), with the forge sprites of the `primary-chibi-2d` pack in the
 * vault hall baked from the 3D set, and asks the student on the Phaser challenge card (`Card2D`):
 * pick a meaning, fill a gap, answer a question, or tap the words of a sentence into order.
 * Nothing is timed. On a phone the battle is above the card; on a wide screen, beside it.
 */
import type * as Phaser from 'phaser';
import { practiceOf, preloadAssetBindings, toGameResults, type StoryGameEvidence, type StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { banner, Card2D, fitGameSize, popup, registerSheetAnimations, StatusBar2D, type CardAction, type Rect } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { BattleStage2D } from '../../shared/battle/stage2d.js';
import { createMonsterEncounters, type Challenge, type Feedback, type GameEvent, type HeroId, type QuestResults, type Response } from '../core/index.js';
import { FILES_2D } from '../manifest.js';
import strings from '../strings.en.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

const HERO_LOOK: Record<HeroId, { color: number; emoji: string }> = {
  knight: { color: 0xd9463b, emoji: '🛡️' },
  wizard: { color: 0x6a3fd1, emoji: '🔥' },
  cleric: { color: 0x2f7fd8, emoji: '✨' },
};

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  if (Array.isArray(ctx.input)) throw new Error('Monster Encounters needs a story input.');
  const story = ctx.input as StoryInput;
  const i18n = ctx.i18n ?? createI18n([strings]).scope('monsterEncounters');
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
    // Phaser calls create() with the scene as `this`.
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const scene = this;
    const { width: W, height: H } = scene.scale;
    const portrait = H > W;
    for (const id of needed) registerSheetAnimations(scene.anims, edition, id);

    // ---------------------------------------------------------------- layout: the battle and the card
    const top = 66;
    // A phone: the battle on top and the card as a bottom sheet (it covers the near floor when tall).
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
    const setCourage = (value: number, max: number): void => {
      hearts = '❤'.repeat(value) + '♡'.repeat(Math.max(0, max - value));
      drawStatus();
    };
    const card = new Card2D(scene, () => cardArea, () => audio.play('tap'), portrait ? 'bottom' : 'top');
    /** What the card waits for (the QC driver reads it). */
    let awaiting: 'choice' | 'order' | 'feedback' | null = null;

    // ---------------------------------------------------------------- sound
    audio.defineSfx('whoosh', (s) => s.noise(0.2, 0.12, 1800));

    let destroyed = false;
    const wait = (seconds: number): Promise<void> => stage.wait(seconds);

    // ---------------------------------------------------------------- the card
    const heroName = (hero: HeroId): string => i18n.t(`heroes.${hero}`);

    async function ask(hero: HeroId, c: Challenge): Promise<Response> {
      const look = HERO_LOOK[hero];
      card.begin();
      card.pill(`${look.emoji} ${t('turn', { name: heroName(hero) })}`, look.color, c.retry ? t('again') : '');
      if (c.kind === 'sentence') {
        card.line(t(`ask.${c.kind}`), 15, '#6a5a8a', { bold: false });
        awaiting = 'order';
        const tokenIds = await card.arrange(c.tokens, { empty: t('tray.empty'), clear: t('tray.clear'), check: t('tray.check') });
        awaiting = null;
        return { kind: 'order', tokenIds };
      }
      const long = c.prompt.length > 28;
      card.line(c.prompt.replace('___', '＿＿'), long ? 20 : 28);
      if ('hint' in c && c.hint) card.line(c.hint, 15, '#6a5a8a', { bold: false });
      card.line(t(`ask.${c.kind}`), 15, '#6a5a8a', { bold: false });
      awaiting = 'choice';
      const optionId = await card.choose(c.options);
      awaiting = null;
      return { kind: 'choice', optionId };
    }

    /**
     * Shows how the answer went. A right answer flashes green and moves on; a wrong one shows the
     * right answer and a kind explanation, and waits for "Continue" (or a look back at the story).
     */
    async function answer(f: Feedback, response: Response | null, challenge: Challenge | null): Promise<void> {
      if (challenge && challenge.kind !== 'sentence' && response?.kind === 'choice') card.markChoice(response.optionId, f.correct, f.correctText);
      if (f.correct) {
        audio.play('correct');
        await card.feedback(true, `<b>${t('right')}</b>`);
        await wait(0.75);
        card.hide();
        return;
      }
      audio.play('wrong');
      const canLook = f.paragraph !== undefined && !!ctx.host?.openStory;
      const actions: CardAction[] = [...(canLook ? [{ id: 'look', label: t('lookInStory'), soft: true }] : []), { id: 'go', label: t('continue') }];
      awaiting = 'feedback';
      let action = await card.feedback(false, `${t('wrong', { answer: f.correctText })}${f.explanation ? `\n${f.explanation}` : ''}`, actions);
      while (action === 'look') {
        // The story opens over the battle; the same feedback waits for "Continue" afterwards.
        ctx.host?.openStory?.(f.paragraph);
        action = await card.buttons(actions);
      }
      awaiting = null;
      card.hide();
    }

    // ---------------------------------------------------------------- the quest
    const quest = createMonsterEncounters(story, { seed, helper: options.helper });
    const startedAt = performance.now();
    let score = 0;

    const finish = (r: QuestResults): void => {
      const items = r.items.map((i) => {
        const source = [...story.sentences, ...story.fills, ...story.questions].find((x) => x.id === i.itemId);
        const paragraph = source && 'paragraph' in source ? source.paragraph : undefined;
        return { itemId: i.itemId, itemKind: i.kind, label: i.label, attempts: Math.max(1, i.attempts), correctFirstTry: i.correctFirstTry, solved: i.solved, ...(paragraph !== undefined ? { paragraph } : {}) };
      });
      const evidence: StoryGameEvidence = { schemaVersion: 1, kind: 'story-game', gameId: 'monster-encounters', storyId: story.id, level: story.level, seed, durationMs: Math.round(performance.now() - startedAt), items, practice: practiceOf(items) };
      ctx.complete(toGameResults(evidence, score), 'victory', evidence);
    };

    async function run(first: GameEvent[]): Promise<void> {
      const queue = [...first];
      let active: HeroId = 'knight';
      let challenge: Challenge | null = null;
      let response: Response | null = null;
      let pending: Promise<void> = Promise.resolve();
      const max = quest.state.maxCourage;
      setCourage(quest.state.courage, max);
      while (queue.length && !destroyed) {
        const ev = queue.shift()!;
        switch (ev.type) {
          case 'encounterStart': {
            await pending;
            const info = ev.encounter;
            const boss = info.enemies.some((e) => e.kind === 'dragon-fire');
            stage.setEnemies([]);
            place = t('progress', { index: info.index + 1, count: info.count, name: info.name });
            setCourage(quest.state.courage, max);
            audio.music(boss ? 'boss' : 'battle');
            audio.play(boss ? 'roar' : 'spawn');
            await Promise.all([banner(scene, info.name, info.intro, 2.6), stage.spawn(info.enemies)]);
            stage.setEnemies(info.enemies);
            break;
          }
          case 'turn':
            await pending;
            active = ev.hero;
            challenge = ev.challenge;
            response = await ask(ev.hero, ev.challenge);
            queue.push(...quest.dispatch({ type: 'answer', response }));
            break;
          case 'answer':
            await answer(ev.feedback, response, challenge);
            break;
          case 'heroAttack': {
            audio.play('whoosh');
            const move = stage.heroAttack(ev.hero, ev.target, ev.move);
            await move.hit;
            audio.play('hit');
            score += ev.damage;
            const at = headOf(ev.target);
            popup(scene, at.x, at.y, `-${ev.damage}`, '', 17_800);
            pending = move.done;
            break;
          }
          case 'enemyHit':
            stage.updateEnemy(ev.enemy, ev.hp);
            await stage.enemyHit(ev.enemy);
            break;
          case 'enemyDefeated':
            stage.updateEnemy(ev.enemy, 0, true);
            audio.play('defeat');
            await stage.enemyDefeated(ev.enemy);
            break;
          case 'heroMiss': {
            const at = headOf(ev.target);
            popup(scene, at.x, at.y, t('miss'), 'miss', 17_800);
            await stage.heroMiss(ev.hero, ev.target);
            break;
          }
          case 'enemyAttack': {
            await stage.enemyAttack(ev.enemy, active);
            setCourage(ev.courage, max);
            const at = headOf(active, 1.2);
            popup(scene, at.x, at.y, t('courageLost'), '', 17_800);
            break;
          }
          case 'heal': {
            stage.heal(ev.hero);
            audio.play('heal');
            setCourage(ev.courage, max);
            const at = headOf(ev.hero, 1.3);
            popup(scene, at.x, at.y, t('courageGained'), 'good', 17_800);
            break;
          }
          case 'rest':
            setCourage(ev.courage, max);
            await banner(scene, t('rest.title'), t('rest.text'), 2.4);
            break;
          case 'xp':
            // XP is the apps' rule, computed once for the results; no running XP in play.
            break;
          case 'encounterCleared':
            await pending;
            await wait(0.3);
            break;
          case 'victory':
            await pending;
            card.hide();
            audio.music('calm');
            audio.play('victory');
            await Promise.all([stage.victory(), banner(scene, t('victory.title'), t('victory.text'), 2.2)]);
            if (!destroyed) finish(ev.results);
            return;
        }
      }
    }

    // ---------------------------------------------------------------- frames
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      stage.update(dt);
    };

    const hook = {
      state: () => quest.state,
      /** What the card waits for, and its tappable elements in game pixels. */
      card: () => ({ awaiting, targets: card.targets }),
      size: () => ({ width: W, height: H }),
      dispatch: (command: Parameters<typeof quest.dispatch>[0]) => void quest.dispatch(command),
      tick: () => undefined,
    };
    const qc = window as unknown as { __apk3dView2d?: typeof hook };
    qc.__apk3dView2d = hook;
    const cleanup = (): void => {
      destroyed = true;
      frame = null;
      card.hide();
      if (qc.__apk3dView2d === hook) delete qc.__apk3dView2d;
      unlock?.();
    };
    scene.events.once('shutdown', cleanup);
    scene.events.once('destroy', cleanup);

    drawStatus();
    void run(quest.dispatch({ type: 'start' }));
  }

  function update(this: Phaser.Scene, time: number): void {
    frame?.(time);
  }

  return {
    width,
    height,
    backgroundColor: '#0c1118',
    render: { antialias: true, roundPixels: false },
    scene: { key: 'monster-encounters', preload, create, update },
  };
}
