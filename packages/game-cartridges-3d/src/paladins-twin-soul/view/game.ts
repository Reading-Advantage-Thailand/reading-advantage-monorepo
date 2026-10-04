/**
 * Paladin's Twin Soul as a 3D cartridge game: the core decides everything; the driver
 * (./driver.ts) plays each event in order on the shared battle stage and the HUD, and reports
 * the run once to the host (results, outcome, evidence).
 */
import type { PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { BattleStage } from '../../shared/battle/stage3d.js';
import { createTwinSoul, type TwinSoulCommand, type TwinSoulInput } from '../core/index.js';
import { TwinSoulPlayer, type Presentation, type Sfx } from './driver.js';
import { TwinSoulHud } from './hud.js';

const PRESET_HEROES = ['knight', 'wizard', 'cleric'] as const;
const SFX: Record<Sfx, string> = { reject: 'wrong', freed: 'correct', hit: 'hit', defeat: 'defeat', victory: 'victory', spawn: 'spawn' };

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  if (Array.isArray(ctx.input)) throw new Error('Paladin’s Twin Soul needs a story input.');
  const story: PracticeInput = ctx.input;
  const stage = new BattleStage(ctx.stage);
  const hud = new TwinSoulHud(ctx.hud, stage, ctx.i18n, ctx.audio, ctx.host);
  const audio = ctx.audio;
  const portrait = (): boolean => ctx.composition.profile === 'compact';
  await stage.load(() => undefined);
  for (const hero of PRESET_HEROES) {
    const look = ctx.options.looks[hero];
    if (look && look !== 'default') void stage.setPreset(hero, look);
  }
  stage.setLayout(portrait());
  stage.setFreeArea(true);

  const sim = createTwinSoul(story as TwinSoulInput, { seed: ctx.seed, helper: ctx.options.helper });
  let pending: Promise<void> = Promise.resolve();
  let player: TwinSoulPlayer | null = null;

  const presentation: Presentation = {
    ask: (wave) => hud.ask(wave),
    setCourage: (v, max) => hud.setCourage(v, max),
    setTwins: (freed, count) => hud.setTwins(freed, count),
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
    captured: () => hud.popup('knight', hud.label('captured'), '', 1.6),
    shadeFell: (shade) => hud.mark(shade, 'wrong', 0.7),
    async soulFreed(shade, _points, firstTry) {
      hud.popup('knight', hud.label(firstTry ? 'freedFirst' : 'freed'), 'good', 1.6);
      await hud.mark(shade, 'right', 0.8);
    },
    async scatter() {
      hud.hideCard();
    },
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
    async monsterStrike(m, hero) {
      await stage.enemyAttack(m.id, hero);
      hud.popup(hero, hud.label('courageLost'), '', 1.2);
    },
    rest: () => hud.banner('rest', '', '', 2.4),
    sfx: (name) => audio.play(SFX[name]),
    async victory() {
      audio.music('calm');
      await Promise.all([stage.victory(), hud.banner('victory', '', '', 2.2)]);
    },
    settle: () => pending,
  };

  player = new TwinSoulPlayer({ sim, story, seed: ctx.seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });
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
      dispatch: (command) => void sim.dispatch(command as TwinSoulCommand),
      tick: () => undefined,
    },
  };
}
