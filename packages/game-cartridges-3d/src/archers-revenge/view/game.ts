/**
 * Archer's Revenge as a 3D cartridge game: the core decides everything; the driver (./driver.ts)
 * plays each event in order on the battle stage and the HUD, the HTML card holds the meaning and
 * the lane buttons, and the run is reported once to the host (results, outcome, evidence).
 */
import type { PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { BattleStage } from '../../shared/battle/stage3d.js';
import { ARCHER, createArchersRevenge, type ArchersRevengeCommand, type ArchersRevengeInput, type Round } from '../core/index.js';
import { ArchersRevengePlayer, type Presentation, type Sfx } from './driver.js';
import { ArchersHud } from './hud.js';

const PRESET_HEROES = ['knight', 'wizard', 'cleric'] as const;
const SFX: Record<Sfx, string> = { pick: 'tap', correct: 'correct', wrong: 'wrong', hit: 'hit', defeat: 'defeat', victory: 'victory' };

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  if (Array.isArray(ctx.input)) throw new Error('Archer’s Revenge needs a story input.');
  const story: PracticeInput = ctx.input;
  const stage = new BattleStage(ctx.stage);
  const hud = new ArchersHud(ctx.hud, stage, ctx.i18n, ctx.audio, ctx.host);
  const audio = ctx.audio;
  const portrait = (): boolean => ctx.composition.profile === 'compact';
  await stage.load(() => undefined);
  for (const hero of PRESET_HEROES) {
    const look = ctx.options.looks[hero];
    if (look && look !== 'default') void stage.setPreset(hero, look);
  }
  stage.setLayout(portrait());
  stage.setFreeArea(true);

  const sim = createArchersRevenge(story as ArchersRevengeInput, { seed: ctx.seed, helper: ctx.options.helper });
  let pending: Promise<void> = Promise.resolve();
  let player: ArchersRevengePlayer | null = null;
  let round: Round | null = null;

  const presentation: Presentation = {
    setCourage: (v, max) => hud.setCourage(v, max),
    setProgress: (wave, count, done, size) => hud.setProgress(wave, count, done, size),
    async spawnWave(_wave, _count, enemies) {
      hud.clearShields();
      audio.music('battle');
      audio.play('spawn');
      const spawn = stage.spawn(enemies.map((e) => ({ id: e.id, kind: e.kind, hp: 1, maxHp: 1, defeated: false })));
      await Promise.all([hud.banner(null, hud.label('intro'), '', 2.2), spawn]);
    },
    showRound(r, fire) {
      round = r;
      hud.showRound(r, fire);
    },
    hideRound: () => hud.hideCard(),
    markShot(lane, correct) {
      const enemyId = round?.lanes.find((l) => l.lane === lane)?.enemyId ?? '';
      return hud.markShot(lane, enemyId, correct);
    },
    async shoot(enemy, correct) {
      audio.play('whoosh');
      if (!correct) {
        await stage.heroMiss(ARCHER, enemy.id);
        return;
      }
      const move = stage.heroAttack(ARCHER, enemy.id, 'attack');
      await move.hit;
      audio.play('hit');
      pending = move.done;
      await stage.enemyHit(enemy.id);
    },
    async enemyStrike(enemy, hero) {
      await stage.enemyAttack(enemy.id, hero as 'knight' | 'wizard' | 'cleric');
      hud.popup(hero, hud.label('courageLost'), '', 1.2);
    },
    rest: () => hud.banner('rest', '', '', 2.4),
    async clearWave(enemies) {
      await Promise.all(enemies.map((e) => stage.enemyDefeated(e.id)));
      hud.clearShields();
    },
    cardPopup: (text) => hud.popupOver(text),
    sfx: (name) => audio.play(SFX[name]),
    async victory() {
      audio.music('calm');
      await Promise.all([stage.victory(), hud.banner('victory', '', '', 2.2)]);
    },
    settle: () => pending,
  };

  player = new ArchersRevengePlayer({ sim, story, seed: ctx.seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });
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
      dispatch: (command) => void player?.play(sim.dispatch(command as ArchersRevengeCommand)),
      tick: () => undefined,
    },
  };
}
