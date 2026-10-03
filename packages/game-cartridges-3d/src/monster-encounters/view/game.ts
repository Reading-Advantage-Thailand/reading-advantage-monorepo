/**
 * Monster Encounters as a 3D cartridge game: the core decides everything; this view shows each
 * event in order on the battle stage and the HUD, asks the student, and reports the run once to
 * the host (results, outcome, evidence).
 */
import {
  practiceOf,
  toGameResults,
  type StoryGameEvidence,
  type StoryInput,
} from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import {
  createMonsterEncounters,
  type Challenge,
  type GameEvent,
  type HeroId,
  type MonsterEncountersSim,
  type QuestResults,
  type Response,
} from '../core/index.js';
import { BattleStage } from '../../shared/battle/stage3d.js';
import { BattleHud } from './hud.js';

const PRESET_HEROES: HeroId[] = ['knight', 'wizard', 'cleric'];

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  if (Array.isArray(ctx.input)) throw new Error('Monster Encounters needs a story input.');
  const story: StoryInput = ctx.input;
  const stage = new BattleStage(ctx.stage);
  const hud = new BattleHud(ctx.hud, stage, ctx.i18n, ctx.audio, ctx.host);
  const portrait = (): boolean => ctx.composition.profile === 'compact';
  await stage.load(() => undefined);
  for (const hero of PRESET_HEROES) {
    const look = ctx.options.looks[hero];
    if (look && look !== 'default') void stage.setPreset(hero, look);
  }
  stage.setLayout(portrait());
  stage.setFreeArea(true);
  // The core: `quest.state` is the snapshot the HUD reads; commands go through `dispatch`.
  const quest: MonsterEncountersSim = createMonsterEncounters(story, {
    seed: ctx.seed,
    helper: ctx.options.helper,
  });
  const startedAt = performance.now();
  let score = 0;
  let destroyed = false;
  (window as unknown as { __apk3dGame?: unknown }).__apk3dGame = { quest, story };

  const finish = (r: QuestResults): void => {
    const items = r.items.map((i) => {
      const source = [...story.sentences, ...story.fills, ...story.questions].find((x) => x.id === i.itemId);
      const paragraph = source && 'paragraph' in source ? source.paragraph : undefined;
      return {
        itemId: i.itemId,
        itemKind: i.kind,
        label: i.label,
        attempts: Math.max(1, i.attempts),
        correctFirstTry: i.correctFirstTry,
        solved: i.solved,
        ...(paragraph !== undefined ? { paragraph } : {}),
      };
    });
    const evidence: StoryGameEvidence = {
      schemaVersion: 1,
      kind: 'story-game',
      gameId: 'monster-encounters',
      storyId: story.id,
      level: story.level,
      seed: ctx.seed,
      durationMs: Math.round(performance.now() - startedAt),
      items,
      practice: practiceOf(items),
    };
    ctx.complete(toGameResults(evidence, score), 'victory', evidence);
  };

  async function run(first: GameEvent[]): Promise<void> {
    const queue = [...first];
    let active: HeroId = 'knight';
    let challenge: Challenge | null = null;
    let response: Response | null = null;
    let pending: Promise<void> = Promise.resolve();
    const max = quest.state.maxCourage;
    const wait = (s: number): Promise<void> => ctx.stage.timeline.wait(s);
    hud.setCourage(quest.state.courage, max);
    while (queue.length && !destroyed) {
      const ev = queue.shift()!;
      switch (ev.type) {
        case 'encounterStart': {
          await pending;
          const info = ev.encounter;
          const boss = info.enemies.some((e) => e.kind === 'dragon-fire');
          hud.setEnemies([]);
          if (info.index > 0) stage.setStage(info.index, false);
          hud.setEncounter(info);
          hud.setCourage(quest.state.courage, max);
          ctx.audio.music(boss ? 'boss' : 'battle');
          ctx.audio.play(boss ? 'roar' : 'spawn');
          const spawn = stage.spawn(info.enemies);
          await Promise.all([hud.banner(null, info.name, info.intro, 2.6), spawn]);
          hud.setEnemies(info.enemies);
          break;
        }
        case 'turn':
          await pending;
          active = ev.hero;
          challenge = ev.challenge;
          response = await hud.ask(ev.hero, ev.challenge);
          queue.push(...quest.dispatch({ type: 'answer', response }));
          break;
        case 'answer':
          await hud.answer(ev.feedback, response, challenge);
          break;
        case 'heroAttack': {
          ctx.audio.play('whoosh');
          const move = stage.heroAttack(ev.hero, ev.target, ev.move);
          await move.hit;
          ctx.audio.play('hit');
          score += ev.damage;
          hud.popup(ev.target, `-${ev.damage}`);
          pending = move.done;
          break;
        }
        case 'enemyHit':
          hud.updateEnemy(ev.enemy, ev.hp);
          await stage.enemyHit(ev.enemy);
          break;
        case 'enemyDefeated':
          hud.updateEnemy(ev.enemy, 0, true);
          ctx.audio.play('defeat');
          await stage.enemyDefeated(ev.enemy);
          break;
        case 'heroMiss':
          hud.popup(ev.target, hud.label('miss'), 'miss');
          await stage.heroMiss(ev.hero, ev.target);
          break;
        case 'enemyAttack':
          await stage.enemyAttack(ev.enemy, active);
          hud.setCourage(ev.courage, max);
          hud.popup(active, hud.label('courageLost'), '', 1.2);
          break;
        case 'heal':
          stage.heal(ev.hero);
          ctx.audio.play('heal');
          hud.setCourage(ev.courage, max);
          hud.popup(ev.hero, hud.label('courageGained'), 'good', 1.3);
          break;
        case 'rest':
          hud.setCourage(ev.courage, max);
          await hud.banner('rest', '', '', 2.4);
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
          hud.hideCard();
          ctx.audio.music('calm');
          ctx.audio.play('victory');
          await Promise.all([stage.victory(), hud.banner('victory', '', '', 2.2)]);
          if (!destroyed) finish(ev.results);
          return;
      }
    }
  }

  return {
    start: () => void run(quest.dispatch({ type: 'start' })),
    pause: () => undefined,
    resume: () => undefined,
    resize: () => undefined,
    recompose: (c) => {
      stage.setLayout(c.profile === 'compact');
      stage.setFreeArea(true);
    },
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      destroyed = true;
      hud.dispose();
      delete (window as unknown as { __apk3dGame?: unknown }).__apk3dGame;
    },
    test: {
      state: () => quest.state,
      dispatch: (command) => void quest.dispatch(command as never),
      tick: () => undefined,
    },
  };
}
