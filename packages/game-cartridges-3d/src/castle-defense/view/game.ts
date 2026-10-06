/**
 * Castle Defense as a 3D cartridge game: the core decides everything; the driver (./driver.ts)
 * plays each event in order on the battle stage and the HUD, the HTML card holds the meaning, the
 * sentence, and the word buttons (then the posts), and the run is reported once to the host
 * (results, outcome, evidence).
 */
import type { PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { roleHero } from '@reading-advantage/advantage-play-kit-3d/avatar/launch';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { playerBody } from '@reading-advantage/advantage-play-kit-3d/stage';
import { BattleStage } from '../../shared/battle/stage3d.js';
import { createCastleDefense, type CastleDefenseCommand, type CastleDefenseInput } from '../core/index.js';
import { CastleDefensePlayer, type Presentation, type Sfx } from './driver.js';
import { CastleHud } from './hud.js';

const PRESET_HEROES = ['knight', 'wizard', 'cleric'] as const;
const SFX: Record<Sfx, string> = { pick: 'tap', correct: 'correct', wrong: 'wrong', hit: 'hit', defeat: 'defeat', victory: 'victory', tower: 'spawn' };

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  if (Array.isArray(ctx.input)) throw new Error('Castle Defense needs a practice input.');
  const story: PracticeInput = ctx.input;
  const stage = new BattleStage(ctx.stage);
  const hud = new CastleHud(ctx.hud, stage, ctx.i18n, ctx.audio, ctx.host);
  const audio = ctx.audio;
  // The student's avatar takes the party place of its class's role; the other two stay heroes.
  const avatar = ctx.options.avatar;
  const place = avatar ? roleHero(avatar.classId) : null;
  await stage.load(() => undefined, avatar && place ? { place, body: playerBody(ctx.stage.loader, avatar, place, ctx.diagnostic) } : undefined);
  hud.player = place;
  for (const hero of PRESET_HEROES) {
    if (hero === place) continue;
    const look = ctx.options.looks[hero];
    if (look && look !== 'default') void stage.setPreset(hero, look);
  }
  stage.setLayout(ctx.composition.profile === 'compact');
  stage.setFreeArea(true);

  const sim = createCastleDefense(story as CastleDefenseInput, { seed: ctx.seed, helper: ctx.options.helper });
  let pending: Promise<void> = Promise.resolve();
  let player: CastleDefensePlayer | null = null;

  const presentation: Presentation = {
    setHearts: (h, max) => hud.setHearts(h, max),
    setProgress: (wave, count, done, size) => hud.setProgress(wave, count, done, size),
    async spawnWave(_wave, _count, attackers) {
      hud.clearPips();
      audio.music('battle');
      audio.play('spawn');
      const spawn = stage.spawn(attackers.map((a) => ({ id: a.id, kind: a.kind, hp: a.hits, maxHp: a.maxHits, defeated: false })));
      await Promise.all([hud.banner(null, hud.label('intro'), '', 2.2), spawn]);
      hud.setAttackers(attackers);
    },
    showStep: (shown, pick) => hud.showStep(shown, pick),
    hideStep: () => hud.hideCard(),
    markPick: (choice, correct) => hud.markPick(choice, correct),
    async strike(attacker, hero) {
      await stage.enemyAttack(attacker.id, hero);
      hud.popup(hero, hud.label('castleHit'), '', 1.2);
    },
    rest: () => hud.banner('rest', '', '', 2.4),
    showPosts: (posts, build) => hud.showPosts(posts, build),
    hidePosts: () => hud.hideCard(),
    async towerBuilt(_post, hero) {
      stage.heal(hero);
      hud.popup(hero, hud.label('towerBuilt'), 'good', 1.4);
      await stage.kit.timeline.wait(0.7);
    },
    async volley(shots) {
      const runs = shots.map((s) => {
        const move = stage.heroAttack(s.hero, s.attacker.id, 'attack2');
        const landed = move.hit.then(async () => {
          audio.play('hit');
          hud.setHits(s.attacker.id, s.attacker.hits, s.attacker.maxHits);
          await stage.enemyHit(s.attacker.id);
          if (s.fell) await stage.enemyDefeated(s.attacker.id);
        });
        return { landed, done: move.done };
      });
      pending = Promise.all(runs.map((r) => r.done)).then(() => undefined);
      await Promise.all(runs.map((r) => r.landed));
    },
    async clearWave(attackers) {
      await Promise.all(attackers.map((a) => stage.enemyDefeated(a.id)));
      hud.clearPips();
    },
    cardPopup: (text) => hud.popupOver(text),
    sfx: (name) => audio.play(SFX[name]),
    async victory() {
      audio.music('calm');
      await Promise.all([stage.victory(), hud.banner('victory', '', '', 2.2)]);
    },
    settle: () => pending,
  };

  player = new CastleDefensePlayer({ sim, story, seed: ctx.seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });
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
      dispatch: (command) => void player?.play(sim.dispatch(command as CastleDefenseCommand)),
      tick: () => undefined,
    },
  };
}
