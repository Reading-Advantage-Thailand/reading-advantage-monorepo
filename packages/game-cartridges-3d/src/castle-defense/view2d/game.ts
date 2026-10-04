/**
 * Castle Defense in 2D (Phaser): the fallback for old phones and the renderer a player may choose.
 * The same core decides everything (../core) and the same driver plays the events (../view/driver.ts);
 * this view gives the driver a Phaser presentation: the baked vault hall with the forge sprites of
 * the `primary-chibi-2d` pack (the hall and the sprites of Monster Encounters), hit pips over the
 * attackers, and the paper card (`Card2D`) that holds the meaning, the sentence, and the word (or
 * post) buttons. Nothing is timed. On a phone the battle is above the card; on a wide screen, beside it.
 */
import type * as Phaser from 'phaser';
import { preloadAssetBindings, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import { AudioBus, installAudioUnlock } from '@reading-advantage/advantage-play-kit-3d/audio';
import { SESSION_OPTIONS_DEFAULT, type Game2DContext } from '@reading-advantage/advantage-play-kit-3d/factory';
import { createI18n } from '@reading-advantage/advantage-play-kit-3d/i18n';
import { banner, Card2D, fitGameSize, popup, registerSheetAnimations, StatusBar2D, type Rect } from '@reading-advantage/advantage-play-kit-3d/view2d';
import { BattleStage2D } from '../../shared/battle/stage2d.js';
import { createCastleDefense, type CastleDefenseCommand, type CastleDefenseInput, type HeroId } from '../core/index.js';
import { FILES_2D } from '../manifest.js';
import strings from '../strings.en.js';
import { CastleDefensePlayer, type Presentation, type Sfx } from '../view/driver.js';
import { BACKGROUND_FILE, PROJECTION } from './projection.gen.js';

const SFX: Record<Sfx, string> = { pick: 'tap', correct: 'correct', wrong: 'wrong', hit: 'hit', defeat: 'defeat', victory: 'victory', tower: 'spawn' };

export interface CastleDefense2DTest {
  state(): unknown;
  /** What the card waits for, and its tappable elements in game pixels (the QC driver taps them). */
  card(): { awaiting: 'step' | 'posts' | null; targets: unknown[] };
  size(): { width: number; height: number };
  busy(): boolean;
  dispatch(command: unknown): void;
  tick(): void;
}

export function createGameConfig(ctx: Game2DContext): Readonly<Record<string, unknown>> {
  if (Array.isArray(ctx.input)) throw new Error('Castle Defense needs a practice input.');
  const story = ctx.input as PracticeInput;
  const i18n = ctx.i18n ?? createI18n([strings]).scope('castleDefense');
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
    const drawStatus = (): void => status.set(`${place}`, hearts);
    const card = new Card2D(scene, () => cardArea, () => audio.play('tap'), portrait ? 'bottom' : 'top');
    let awaiting: 'step' | 'posts' | null = null;

    // ---------------------------------------------------------------- the game
    const sim = createCastleDefense(story as CastleDefenseInput, { seed, helper: options.helper });
    let player: CastleDefensePlayer | null = null;
    let pending: Promise<void> = Promise.resolve();

    const presentation: Presentation = {
      setHearts: (h, max) => {
        hearts = `${'❤'.repeat(h)}${'♡'.repeat(Math.max(0, max - h))}`;
        drawStatus();
      },
      setProgress: (wave, count, done, size) => {
        place = t('progress', { wave, count, done, size });
        drawStatus();
      },
      async spawnWave(_wave, _count, attackers) {
        stage.setEnemies(attackers.map((a) => ({ id: a.id, kind: a.kind, hp: a.hits, maxHp: a.maxHits, defeated: false })));
        audio.music('battle');
        audio.play('spawn');
        await Promise.all([banner(scene, t('intro'), '', 2.2), stage.spawn(attackers.map((a) => ({ id: a.id, kind: a.kind })))]);
      },
      showStep(shown, pick) {
        card.begin();
        card.line(t('buildThe'), 16, '#6a5a8a', { bold: false });
        if (shown.translation) card.line(shown.translation, 26);
        const blanks = Array.from({ length: shown.total - shown.built.length }, () => t('blank'));
        card.line([...shown.built, ...blanks].join(' '), 22);
        awaiting = 'step';
        void card.choose(shown.step.choices.filter((c) => !c.blocked).map((c) => ({ id: String(c.index), text: c.word }))).then((id) => {
          awaiting = null;
          pick(Number(id));
        });
      },
      hideStep: () => card.hide(),
      async markPick(choice, correct) {
        card.markChoice(String(choice), correct, '');
        if (correct) await card.feedback(true, `<b>${t('right')}</b>`);
        else await card.feedback(false, t('blocked'));
        await stage.wait(correct ? 0.4 : 0.8);
      },
      async strike(attacker, hero) {
        await stage.enemyAttack(attacker.id, hero as HeroId);
        const at = headOf(hero, 1.2);
        popup(scene, at.x, at.y, t('castleHit'), '', 17_800);
      },
      rest: () => banner(scene, t('rest.title'), t('rest.text'), 2.4),
      showPosts(posts, build) {
        card.begin();
        card.line(t('placeThe'), 20);
        awaiting = 'posts';
        void card
          .choose(posts.map((p) => ({ id: String(p.post), text: `${t('post', { hero: i18n.t(`heroes.${p.hero}`) })} · ${p.level > 0 ? t('level', { level: p.level }) : t('empty')}` })))
          .then((id) => {
            awaiting = null;
            build(Number(id));
          });
      },
      hidePosts: () => card.hide(),
      async towerBuilt(_post, hero) {
        stage.heal(hero as HeroId);
        const at = headOf(hero, 1.6);
        popup(scene, at.x, at.y, t('towerBuilt'), 'good', 17_800);
        await stage.wait(0.7);
      },
      async volley(shots) {
        const runs = shots.map((s) => {
          const move = stage.heroAttack(s.hero as HeroId, s.attacker.id, 'attack2');
          const landed = move.hit.then(async () => {
            audio.play('hit');
            stage.updateEnemy(s.attacker.id, s.attacker.hits, s.fell);
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
        for (const a of attackers) stage.updateEnemy(a.id, 0, true);
      },
      cardPopup: (value) => popup(scene, cardArea.x + cardArea.width / 2, cardArea.y + 40, value, 'good', 19_500),
      sfx: (name) => audio.play(SFX[name]),
      async victory() {
        audio.music('calm');
        await Promise.all([stage.victory(), banner(scene, t('victory.title'), t('victory.text'), 2.2)]);
      },
      settle: () => pending,
    };
    player = new CastleDefensePlayer({ sim, story, seed, presentation, complete: (r, o, e) => ctx.complete(r, o, e) });

    // ---------------------------------------------------------------- frames and the QC hook
    let last = 0;
    frame = (time: number) => {
      const dt = Math.min(0.1, last ? (time - last) / 1000 : 0);
      last = time;
      stage.update(dt);
    };
    const hook: CastleDefense2DTest = {
      state: () => sim.state,
      card: () => ({ awaiting, targets: card.targets }),
      size: () => ({ width: W, height: H }),
      busy: () => player?.isBusy ?? false,
      dispatch: (command) => void player?.play(sim.dispatch(command as CastleDefenseCommand)),
      tick: () => undefined,
    };
    const qc = window as unknown as { __apk3dView2d?: CastleDefense2DTest };
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
    scene: { key: 'castle-defense', preload, create, update },
  };
}
