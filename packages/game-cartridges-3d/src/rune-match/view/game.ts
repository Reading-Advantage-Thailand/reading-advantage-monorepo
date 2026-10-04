/**
 * Rune Match as a 3D cartridge game: the core decides everything; the driver (./driver.ts) plays
 * each event in order on the battle stage, the HTML rune board, and the HUD, and reports the
 * run once to the host (results, outcome, evidence).
 */
import type { PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { BattleStage } from '../../shared/battle/stage3d.js';
import { createRuneMatch, type RuneMatchCommand, type RuneMatchInput } from '../core/index.js';
import { RuneMatchPlayer, type Presentation, type Sfx } from './driver.js';
import { RuneHud } from './hud.js';

const PRESET_HEROES = ['knight', 'wizard', 'cleric'] as const;
const SFX: Record<Sfx, string> = { swap: 'tap', burst: 'correct', reject: 'wrong', heal: 'heal', shield: 'tap', hit: 'hit', defeat: 'defeat', victory: 'victory' };

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  if (Array.isArray(ctx.input)) throw new Error('Rune Match needs a practice input.');
  const story: PracticeInput = ctx.input;
  const stage = new BattleStage(ctx.stage);
  const hud = new RuneHud(ctx.hud, stage, ctx.i18n, ctx.audio, ctx.host);
  const audio = ctx.audio;
  const portrait = (): boolean => ctx.composition.profile === 'compact';
  await stage.load(() => undefined);
  for (const hero of PRESET_HEROES) {
    const look = ctx.options.looks[hero];
    if (look && look !== 'default') void stage.setPreset(hero, look);
  }
  stage.setLayout(portrait());
  stage.setFreeArea(true);

  const sim = createRuneMatch(story as RuneMatchInput, { seed: ctx.seed, helper: ctx.options.helper });
  let pending: Promise<void> = Promise.resolve();
  let player: RuneMatchPlayer | null = null;
  const board = hud.mountBoard(sim.state.rows, sim.state.cols, (a, b) => void player?.swap(a, b), () => audio.play('tap'));
  // The portrait card is tall (readable tiles): frame the battle in the part above it.
  const free = (): number => Math.min(0.55, Math.max(0.24, 1 - ctx.hud.card.el.offsetHeight / Math.max(1, ctx.hud.el.clientHeight)));
  stage.setFreeArea(true, free());

  const presentation: Presentation = {
    board,
    showTarget: (term) => hud.showTarget(term),
    setCourage: (v, max) => hud.setCourage(v, max),
    setShield: (on) => hud.setShield(on),
    setPlace: (index, count, kind) => hud.setPlace(index, count, hud.monsterName(kind)),
    async spawn(m) {
      hud.setMonster(null);
      audio.music(m.kind === 'dragon-fire' ? 'boss' : 'battle');
      audio.play(m.kind === 'dragon-fire' ? 'roar' : 'spawn');
      const spawn = stage.spawn([m]);
      await Promise.all([hud.banner(null, hud.monsterName(m.kind), hud.label('intro'), 2.2), spawn]);
      hud.setMonster(m);
    },
    setMonsterHp: (m) => hud.updateMonster(m),
    async heroStrike(hero, m, damage) {
      audio.play('whoosh');
      const move = stage.heroAttack(hero, m.id, 'attack');
      await move.hit;
      audio.play('hit');
      hud.popup(m.id, `-${damage}`);
      pending = move.done;
    },
    monsterHit: (m) => stage.enemyHit(m.id),
    monsterDefeated: (m) => stage.enemyDefeated(m.id),
    async monsterStrike(m, hero, blocked) {
      await stage.enemyAttack(m.id, hero);
      hud.popup(hero, blocked ? hud.label('blocked') : hud.label('courageLost'), blocked ? 'good' : '', 1.2);
    },
    heal(hero) {
      stage.heal(hero);
      hud.popup(hero, hud.label('courageGained'), 'good', 1.3);
    },
    rest: () => hud.banner('rest', '', '', 2.4),
    boardPopup: (text) => hud.popupOver(board.el, text),
    sfx: (name) => audio.play(SFX[name]),
    async victory() {
      audio.music('calm');
      await Promise.all([stage.victory(), hud.banner('victory', '', '', 2.2)]);
    },
    settle: () => pending,
  };

  player = new RuneMatchPlayer({ sim, story, seed: ctx.seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });
  (window as unknown as { __apk3dGame?: unknown }).__apk3dGame = { sim, story };

  return {
    start: () => void player?.start(),
    pause: () => undefined,
    resume: () => undefined,
    resize: () => undefined,
    recompose: (c) => {
      stage.setLayout(c.profile === 'compact');
      stage.setFreeArea(true, free());
    },
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      player?.destroy();
      board.destroy();
      hud.dispose();
      delete (window as unknown as { __apk3dGame?: unknown }).__apk3dGame;
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => void player?.play(sim.dispatch(command as RuneMatchCommand)),
      tick: () => undefined,
    },
  };
}
