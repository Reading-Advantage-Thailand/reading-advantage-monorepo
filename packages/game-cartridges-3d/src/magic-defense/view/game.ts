/**
 * Magic Defense as a 3D cartridge game: the core decides everything; the driver (./driver.ts)
 * plays each event in order on the battle stage and the HUD, the HTML card holds the meaning and
 * the spell buttons, and the run is reported once to the host (results, outcome, evidence).
 */
import type { StoryInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { BattleStage } from '../../shared/battle/stage3d.js';
import { CASTER, createMagicDefense, type MagicDefenseCommand, type MagicDefenseInput } from '../core/index.js';
import { MagicDefensePlayer, type Presentation, type Sfx } from './driver.js';
import { MagicHud } from './hud.js';

const PRESET_HEROES = ['knight', 'wizard', 'cleric'] as const;
const SFX: Record<Sfx, string> = { pick: 'tap', correct: 'correct', wrong: 'wrong', hit: 'hit', defeat: 'defeat', victory: 'victory', storm: 'spawn' };

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  if (Array.isArray(ctx.input)) throw new Error('Magic Defense needs a story input.');
  const story: StoryInput = ctx.input;
  const stage = new BattleStage(ctx.stage);
  const hud = new MagicHud(ctx.hud, stage, ctx.i18n, ctx.audio, ctx.host);
  const audio = ctx.audio;
  const portrait = (): boolean => ctx.composition.profile === 'compact';
  await stage.load(() => undefined);
  for (const hero of PRESET_HEROES) {
    const look = ctx.options.looks[hero];
    if (look && look !== 'default') void stage.setPreset(hero, look);
  }
  stage.setLayout(portrait());
  stage.setFreeArea(true);

  const sim = createMagicDefense(story as MagicDefenseInput, { seed: ctx.seed, helper: ctx.options.helper });
  let pending: Promise<void> = Promise.resolve();
  let player: MagicDefensePlayer | null = null;

  const presentation: Presentation = {
    setCastles: (c, max) => hud.setCastles(c, max),
    setMana: (v, max) => hud.setMana(v, max),
    setProgress: (wave, count, done, size) => hud.setProgress(wave, count, done, size),
    async spawnWave(_wave, _count, enemies) {
      hud.clearMissile();
      audio.music('battle');
      audio.play('spawn');
      const spawn = stage.spawn(enemies.map((e) => ({ id: e.id, kind: e.kind, hp: 1, maxHp: 1, defeated: false })));
      await Promise.all([hud.banner(null, hud.label('intro'), '', 2.2), spawn]);
    },
    showRound(r, cast) {
      hud.showRound(r, cast);
    },
    hideRound: () => hud.hideCard(),
    markCast: (choice, correct) => hud.markCast(choice, correct),
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
      await stage.enemyAttack(enemy.id, hero as 'knight' | 'wizard' | 'cleric');
      hud.popup(hero, hud.label('castleHit'), '', 1.2);
    },
    rest: () => hud.banner('rest', '', '', 2.4),
    storm: () => hud.banner('storm', '', '', 1.8),
    async clearWave(enemies) {
      await Promise.all(enemies.map((e) => stage.enemyDefeated(e.id)));
      hud.clearMissile();
    },
    cardPopup: (text) => hud.popupOver(text),
    sfx: (name) => audio.play(SFX[name]),
    async victory() {
      audio.music('calm');
      await Promise.all([stage.victory(), hud.banner('victory', '', '', 2.2)]);
    },
    settle: () => pending,
  };

  player = new MagicDefensePlayer({ sim, story, seed: ctx.seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });
  hud.onStorm = () => void player?.storm();
  (window as unknown as { __apk3dGame?: unknown }).__apk3dGame = { sim, story };

  return {
    start: () => void player?.start(),
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
      player?.destroy();
      hud.dispose();
      delete (window as unknown as { __apk3dGame?: unknown }).__apk3dGame;
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => void player?.play(sim.dispatch(command as MagicDefenseCommand)),
      tick: () => undefined,
    },
  };
}
