/**
 * Potion Rush 3D as a cartridge game. The core (../core) runs the shop in fixed steps; this view
 * shows it: words ride the conveyor under HTML tags the student drags into cauldrons, customers
 * walk in and order, potions glow, and coins fly. The view reads the core's state every frame and
 * animates its events; it never decides a rule.
 */
import * as THREE from 'three';
import { toGameResults, type PracticeInput } from '@reading-advantage/advantage-play-kit-3d/contracts';
import type { Game3DContext, Game3DInstance } from '@reading-advantage/advantage-play-kit-3d/factory';
import { esc, hit, makeDraggable } from '@reading-advantage/advantage-play-kit-3d/hud';
import { createFixedStepLoop, type LoopClock } from '@reading-advantage/advantage-play-kit-3d/sim';
import { Actor, burst, isAvatarBody, playerBody, ShotRig, smooth } from '@reading-advantage/advantage-play-kit-3d/stage';
import { createPotionRush, evidenceOf, scoreOf, targetFor, type PotionRushCommand, type PotionRushEvent, type PotionRushState } from '../core/index.js';
import { nextDrop } from '../qc/bot.js';
import { BREW, INGREDIENT_SCALE } from './layout.js';
import { beltX, buildShop, LAYOUT, SHOP_MODELS } from './shop.js';
import potion_rushCss from './potion-rush.css.js';
import { installCss } from '@reading-advantage/advantage-play-kit-3d/hud';
installCss('potion-rush', potion_rushCss);

const MOOD_ICON = { happy: '😊', waiting: '😐', grumpy: '😤' } as const;
/** Clip a customer plays for each mood (a missing clip is skipped). */
const MOOD_CLIP = { happy: 'talk', waiting: 'idle', grumpy: 'taunt' } as const;

interface Item {
  obj: THREE.Object3D;
  tag: HTMLButtonElement;
  /** An invisible area over the 3D ingredient: grabbing the object also drags its word. */
  grab: HTMLElement;
  flying: boolean;
  undrag: () => void;
}

interface Customer {
  actor: Actor;
  bubble: HTMLElement;
  slot: number;
  leaving: boolean;
}

export async function createGame(ctx: Game3DContext): Promise<Game3DInstance> {
  const story = ctx.input as PracticeInput;
  const stage = ctx.stage;
  const t = ctx.i18n.scope('hud').t;
  const hero = ctx.options.hero || 'wizard';
  // The student's avatar (or the fixed hero) loads with the scene; an avatar needs no hero model.
  const [, heroBody] = await Promise.all([
    stage.loader.preload([...SHOP_MODELS, ...(ctx.options.avatar ? [] : [hero])].map((n) => stage.loader.modelPath(n))),
    playerBody(stage.loader, ctx.options.avatar, hero, ctx.diagnostic),
  ]);
  const built = buildShop(stage, hero, heroBody);
  const shop = { ...built, alchemist: built.alchemist! };
  const look = isAvatarBody(heroBody) ? undefined : ctx.options.looks[hero];
  if (look && look !== 'default') void stage.loader.texture(stage.loader.presetPath(hero, look)).then((tex) => shop.alchemist.setMap(tex)).catch(() => undefined);
  /** The teal brew of an idle cauldron. */
  const baseBrew = shop.brews[0]!.clone();
  const shots = new ShotRig(0.06);
  const compact = (): boolean => ctx.composition.profile === 'compact';
  shots.go(compact() ? LAYOUT.shots.portrait : LAYOUT.shots.landscape, 0, stage.pose);
  stage.setRig(shots);
  const sim = createPotionRush(story, { seed: ctx.seed, helper: ctx.options.helper });
  const startedAt = performance.now();
  const hud = ctx.hud;

  // ---------------------------------------------------------------- sound
  const audio = ctx.audio;
  audio.defineMood('shop', { bpm: 96, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]], busy: false, drum: false });
  audio.defineMood('rush', { bpm: 124, chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [62, 65, 69]], busy: true, drum: true });
  let combo = 0;
  audio.defineSfx('plop', (s) => {
    const f = 420 * Math.pow(1.06, Math.min(combo, 12));
    s.tone(f, 0.14, 'sine', 0.3, 0, 1.6);
    s.noise(0.08, 0.08, 1400);
  });
  audio.defineSfx('fizz', (s) => {
    s.noise(0.5, 0.2, 3000);
    s.tone(220, 0.3, 'triangle', 0.12, 0, 0.6);
  });
  audio.defineSfx('ding', (s) => [1319, 1760].forEach((f, i) => s.tone(f, 0.5, 'sine', 0.16, i * 0.09)));
  audio.defineSfx('coins', (s) => [1568, 2093, 2637].forEach((f, i) => s.tone(f, 0.12, 'square', 0.05, i * 0.05)));
  audio.defineSfx('bell', (s) => [1047, 1319].forEach((f, i) => s.tone(f, 0.6, 'triangle', 0.1, i * 0.12)));

  // ---------------------------------------------------------------- HUD
  const status = document.createElement('div');
  status.className = 'status';
  status.innerHTML = `
    <div class="place"><small>${esc(t('place'))}</small><span data-served></span></div>
    <div class="meter coins">🪙<b data-coins>0</b></div>
    ${ctx.host.openStory ? `<button class="book" data-story>${esc(t('story'))}</button>` : ''}
    ${ctx.host.toggleMute ? `<button class="book" data-mute aria-label="Sound">🔊</button>` : ''}`;
  hud.el.prepend(status);
  status.querySelector('[data-story]')?.addEventListener('click', () => ctx.host.openStory?.());
  const mute = status.querySelector<HTMLButtonElement>('[data-mute]');
  mute?.addEventListener('click', () => (mute.textContent = ctx.host.toggleMute?.() ? '🔇' : '🔊'));
  const rushSign = document.createElement('div');
  rushSign.className = 'rush-sign';
  rushSign.textContent = t('rush');
  hud.el.append(rushSign);

  const cauldronPoint = (i: number, lift: number) => () => stage.screenOfPoint(new THREE.Vector3(LAYOUT.cauldrons[i]![0], lift, LAYOUT.cauldrons[i]![2]));
  const zones = LAYOUT.cauldrons.map((_, i) => {
    const z = document.createElement('button');
    z.className = 'drop-zone';
    z.dataset.cauldron = String(i);
    z.innerHTML = `<span class="count"></span><span class="serve">${esc(t('serve'))}</span>`;
    z.addEventListener('click', () => {
      if (held) {
        const itemId = held;
        release();
        loop.dispatch({ type: 'drop', itemId, cauldron: i });
      } else if (sim.state.cauldrons[i]?.ready) loop.dispatch({ type: 'serve', cauldron: i });
    });
    return hud.anchor(z, cauldronPoint(i, 0.55));
  });

  // ---------------------------------------------------------------- the conveyor
  const items = new Map<string, Item>();
  /** Click-then-click: a word the student picked up by a click, waiting for a cauldron click. */
  let held: string | null = null;
  const release = (): void => {
    if (held) items.get(held)?.tag.classList.remove('held');
    held = null;
    hud.el.classList.remove('dragging-word');
  };
  const ingredient = (kind: string): THREE.Object3D => {
    const g = stage.loader.get(stage.loader.modelPath(kind));
    const obj = g ? g.scene.clone() : new THREE.Mesh(new THREE.SphereGeometry(0.12), new THREE.MeshStandardMaterial({ color: 0xcccccc }));
    obj.scale.setScalar(INGREDIENT_SCALE[kind] ?? 1);
    obj.traverse((n) => ((n as THREE.Mesh).isMesh ? (n.castShadow = true) : undefined));
    return obj;
  };
  const beltPoint = (x: number, lift = 0): THREE.Vector3 => new THREE.Vector3(x, LAYOUT.belt.y + lift, LAYOUT.belt.z);

  function dropAt(itemId: string, x: number, y: number): void {
    const i = zones.findIndex((z) => hit(z, x, y, 24));
    if (i >= 0) loop.dispatch({ type: 'drop', itemId, cauldron: i });
  }

  function spawnItem(itemId: string, word: string, kind: string): void {
    const obj = ingredient(kind);
    stage.scene.add(obj);
    const tag = document.createElement('button');
    tag.className = 'word-tag';
    tag.dataset.item = itemId;
    tag.textContent = word;
    const grab = document.createElement('div');
    grab.className = 'grab';
    const it: Item = { obj, tag, grab, flying: false, undrag: () => undefined };
    hud.anchor(grab, () => stage.screenOfPoint(obj.position.clone().add(new THREE.Vector3(0, 0.12, 0))));
    hud.anchor(tag, () => stage.screenOfPoint(obj.position.clone().add(new THREE.Vector3(0, 0.34, 0))), { spread: true });
    it.undrag = makeDraggable(
      tag,
      {
        tap: () => {
          // One cauldron needs this word: it flies there. Otherwise the word waits in the hand
          // until the student clicks a cauldron (click-then-click, for mouse users too).
          const target = targetFor(sim.state, itemId);
          if (target !== null) {
            release();
            loop.dispatch({ type: 'drop', itemId, cauldron: target });
            return;
          }
          const same = held === itemId;
          release();
          if (same) return;
          held = itemId;
          tag.classList.add('held');
          hud.el.classList.add('dragging-word');
          audio.play('tap');
        },
        start: () => {
          release();
          hud.el.classList.add('dragging-word');
          audio.play('tap');
        },
        drop: (x, y) => {
          hud.el.classList.remove('dragging-word');
          dropAt(itemId, x, y);
        },
      },
      [grab],
    );
    items.set(itemId, it);
  }

  function removeItem(itemId: string): void {
    const it = items.get(itemId);
    if (!it) return;
    if (held === itemId) release();
    it.undrag();
    hud.unanchor(it.tag);
    hud.unanchor(it.grab);
    it.obj.removeFromParent();
    items.delete(itemId);
  }

  /** The item flies in an arc into cauldron `i`, then disappears with a splash. */
  function flyIntoCauldron(itemId: string, i: number): void {
    const it = items.get(itemId);
    if (!it) return;
    it.flying = true;
    it.tag.classList.add('gone');
    it.grab.remove();
    const from = it.obj.position.clone();
    const to = new THREE.Vector3(LAYOUT.cauldrons[i]![0], 0.75, LAYOUT.cauldrons[i]![2]);
    void stage.timeline
      .tween(0.35, (u) => {
        it.obj.position.lerpVectors(from, to, smooth(u));
        it.obj.position.y += Math.sin(u * Math.PI) * 0.7;
        it.obj.rotation.z = u * 4;
      })
      .then(() => {
        removeItem(itemId);
        void burst(stage, to, BREW[i]!, 10, 0.5);
      });
  }

  /** A wrong word: the item hops toward the cauldron, puffs smoke, and lands back on the belt. */
  function bounce(itemId: string, i: number): void {
    const it = items.get(itemId);
    if (!it) return;
    it.flying = true;
    const start = it.obj.position.clone();
    const top = new THREE.Vector3((start.x + LAYOUT.cauldrons[i]![0]) / 2, 1.2, (start.z + LAYOUT.cauldrons[i]![2]) / 2);
    it.tag.classList.add('wrong');
    void stage.timeline
      .tween(0.45, (u) => {
        const back = beltPoint(beltX(sim.state.belt.find((b) => b.id === itemId)?.position ?? 0.5));
        const a = u < 0.5 ? smooth(u * 2) : 1 - smooth((u - 0.5) * 2);
        it.obj.position.lerpVectors(u < 0.5 ? start : back, top, a);
      })
      .then(() => {
        it.flying = false;
        it.tag.classList.remove('wrong');
      });
    void burst(stage, new THREE.Vector3(LAYOUT.cauldrons[i]![0], 0.8, LAYOUT.cauldrons[i]![2]), 0x9ca3af, 12, 0.6);
  }

  // ---------------------------------------------------------------- customers
  const customers = new Map<string, Customer>();
  const slotPos = (slot: number): THREE.Vector3 => new THREE.Vector3(...LAYOUT.slots[slot]!);

  function walk(actor: Actor, to: THREE.Vector3, speed = 1.6): Promise<void> {
    const from = actor.root.position.clone();
    const dist = from.distanceTo(to);
    actor.yaw = THREE.MathUtils.radToDeg(Math.atan2(to.x - from.x, to.z - from.z));
    actor.loop('walk');
    return stage.timeline
      .tween(Math.max(0.2, dist / speed), (u) => actor.root.position.lerpVectors(from, to, u))
      .then(() => {
        actor.home.copy(to);
        actor.loop(actor.idle);
      });
  }

  function orderHtml(state: PotionRushState, slot: number): string {
    const s = state.slots[slot];
    if (!s) return '';
    const order = state.orders.find((o) => o.id === s.orderId);
    if (!order) return '';
    const done = state.cauldrons[slot]?.orderId === order.id ? (state.cauldrons[slot]?.words.length ?? 0) : 0;
    const words = order.words
      .map((w, k) => `<span class="${k < done ? 'done' : k === done && state.helper ? 'next' : ''}">${esc(w)}</span>`)
      .join(' ');
    return `<span class="mood">${MOOD_ICON[s.mood]}</span><span class="words">${words}</span><i class="patience"><b></b></i>`;
  }

  async function arrive(slot: number, customerId: string, kind: string, from: THREE.Vector3): Promise<void> {
    const g = await stage.loader.load(stage.loader.modelPath(kind)).catch(() => stage.loader.load(stage.loader.modelPath('villager')));
    const actor = stage.addActor(new Actor(kind, g, stage.timeline, { phase: Math.random() }));
    actor.placeAt(from.x, from.y, from.z);
    const bubble = document.createElement('div');
    bubble.className = 'order-bubble';
    const c: Customer = { actor, bubble, slot, leaving: false };
    customers.set(customerId, c);
    audio.play('bell');
    await walk(actor, slotPos(slot));
    if (c.leaving) return;
    actor.yaw = 0;
    if (actor.has('talk')) void actor.play('talk');
    hud.anchor(bubble, () => stage.screenOf(actor, 1.2), { spread: true });
    bubble.innerHTML = orderHtml(sim.state, slot);
    bubble.classList.add('on');
  }

  function leave(customerId: string, to: THREE.Vector3, remove: boolean): Promise<void> {
    const c = customers.get(customerId);
    if (!c) return Promise.resolve();
    c.leaving = true;
    hud.unanchor(c.bubble);
    return walk(c.actor, to).then(() => {
      if (remove) {
        stage.removeActor(c.actor);
        customers.delete(customerId);
      }
    });
  }

  // ---------------------------------------------------------------- events
  const coinsEl = status.querySelector<HTMLElement>('[data-coins]')!;
  const servedEl = status.querySelector<HTMLElement>('[data-served]')!;
  const drawStatus = (s: PotionRushState): void => {
    servedEl.textContent = t('served', { served: s.served, total: s.total });
    coinsEl.textContent = String(s.coins);
  };
  let finished = false;

  function refreshBubble(slot: number): void {
    for (const c of customers.values()) if (c.slot === slot && !c.leaving && c.bubble.classList.contains('on')) c.bubble.innerHTML = orderHtml(sim.state, slot);
  }

  function handle(ev: PotionRushEvent): void {
    const s = sim.state;
    switch (ev.type) {
      case 'itemSpawned':
        spawnItem(ev.itemId, ev.word, ev.kind);
        break;
      case 'itemLeft':
        removeItem(ev.itemId);
        break;
      case 'customerArrived':
        void arrive(ev.slot, ev.customerId, ev.kind, new THREE.Vector3(...LAYOUT.door));
        break;
      case 'customerReturned': {
        const seated = customers.get(ev.customerId);
        const from = seated ? seated.actor.root.position.clone() : new THREE.Vector3(...LAYOUT.door);
        if (seated) {
          stage.removeActor(seated.actor);
          customers.delete(ev.customerId);
        }
        void arrive(ev.slot, ev.customerId, ev.kind, from);
        break;
      }
      case 'customerSatDown': {
        const c = customers.get(ev.customerId);
        if (c) {
          hud.popup(stage.screenOf(c.actor, 1.3), t('waitHere'));
          void leave(ev.customerId, new THREE.Vector3(...LAYOUT.seats[ev.slot % LAYOUT.seats.length]!), false);
        }
        break;
      }
      case 'moodChanged': {
        refreshBubble(ev.slot);
        const c = [...customers.values()].find((x) => x.slot === ev.slot && !x.leaving);
        const clip = MOOD_CLIP[ev.mood];
        if (c && c.actor.has(clip) && clip !== 'idle') void c.actor.play(clip);
        break;
      }
      case 'wordAccepted': {
        combo = ev.combo;
        flyIntoCauldron(ev.itemId, ev.cauldron);
        audio.play('plop');
        const target = LAYOUT.cauldrons[ev.cauldron]!;
        shop.alchemist.yaw = THREE.MathUtils.radToDeg(Math.atan2(target[0] - LAYOUT.alchemist[0], target[2] - LAYOUT.alchemist[2]));
        void shop.alchemist.play('attack2', 0.5, 1.6);
        const brew = shop.brews[ev.cauldron]!;
        brew.color.setHex(BREW[ev.cauldron]!);
        brew.emissive.setHex(BREW[ev.cauldron]!);
        brew.emissiveIntensity = 0.5 + 0.12 * ev.index;
        refreshBubble(ev.cauldron);
        if (ev.combo >= 3) hud.popup(cauldronPoint(ev.cauldron, 1.1)(), `×${ev.combo}`, 'good');
        break;
      }
      case 'wordRejected':
        combo = 0;
        bounce(ev.itemId, ev.cauldron);
        audio.play('fizz');
        break;
      case 'potionReady':
        zones[ev.cauldron]!.classList.add('ready');
        audio.play('ding');
        break;
      case 'potionServed': {
        zones[ev.cauldron]!.classList.remove('ready');
        const brew = shop.brews[ev.cauldron]!;
        brew.color.copy(baseBrew.color);
        brew.emissive.copy(baseBrew.emissive);
        brew.emissiveIntensity = baseBrew.emissiveIntensity;
        const c = customers.get(ev.customerId);
        if (c) {
          const thanks = ['victory', 'salute', 'wave'].find((k) => c.actor.has(k));
          const at = stage.screenOf(c.actor, 1.4);
          hud.popup(at, t('coinsGained', { coins: ev.coins }), 'good');
          if (ev.tip) void stage.timeline.wait(0.25).then(() => hud.popup({ ...at, y: at.y - 28 }, t('tip', { tip: ev.tip }), 'good'));
          audio.play('coins');
          const finish = thanks ? c.actor.play(thanks).done : Promise.resolve();
          hud.unanchor(c.bubble);
          void finish.then(() => leave(ev.customerId, new THREE.Vector3(...LAYOUT.door), true));
        }
        audio.play('correct');
        break;
      }
      case 'rushStarted':
        rushSign.classList.add('on');
        audio.music('rush');
        break;
      case 'rushEnded':
        rushSign.classList.remove('on');
        audio.music('shop');
        break;
      case 'shiftComplete':
        void finish();
        break;
    }
    drawStatus(s);
  }

  async function finish(): Promise<void> {
    if (finished) return;
    finished = true;
    loop.stop();
    audio.music('calm');
    audio.play('victory');
    void shop.alchemist.play('victory');
    await hud.banner.show(t('done.title'), t('done.text'), 2.2);
    const evidence = evidenceOf(sim.state, story, ctx.seed, Math.round(performance.now() - startedAt));
    ctx.complete(toGameResults(evidence, scoreOf(sim.state)), 'victory', evidence);
  }

  // ---------------------------------------------------------------- the loop, on the stage's frames
  let stageMs = 0;
  let nextFrame: (() => void) | null = null;
  const clock: LoopClock = {
    now: () => stageMs,
    requestFrame: (cb) => {
      nextFrame = cb;
      return 1;
    },
    cancelFrame: () => (nextFrame = null),
  };
  const loop = createFixedStepLoop<PotionRushState, PotionRushCommand, PotionRushEvent>(sim, { render: (events) => events.forEach(handle) }, clock);

  stage.onFrame((dt) => {
    stageMs += dt * 1000;
    const cb = nextFrame;
    nextFrame = null;
    cb?.();
    // Belt items follow the core's positions (with a small bob); flying items animate themselves.
    const s = sim.state;
    for (const b of s.belt) {
      const it = items.get(b.id);
      if (!it || it.flying) continue;
      it.obj.position.set(beltX(b.position), LAYOUT.belt.y + 0.02 + Math.abs(Math.sin(stageMs / 260 + b.position * 20)) * 0.03, LAYOUT.belt.z);
      it.obj.rotation.y = stageMs / 900 + b.position * 9;
    }
    shop.runes.offset.x = (shop.runes.offset.x + dt * s.beltSpeed * 6) % 1;
    // Patience meters and cauldron counts.
    for (const c of customers.values()) {
      const slot = s.slots[c.slot];
      const bar = c.bubble.querySelector<HTMLElement>('.patience b');
      if (bar && slot) bar.style.width = `${Math.max(0, (slot.patienceMs / slot.maxPatienceMs) * 100).toFixed(1)}%`;
    }
    s.cauldrons.forEach((cd, i) => {
      const order = cd.orderId ? s.orders.find((o) => o.id === cd.orderId) : null;
      const count = zones[i]!.querySelector('.count')!;
      const text = order ? `${cd.words.length}/${order.words.length}` : '';
      if (count.textContent !== text) count.textContent = text;
      if (cd.ready) shop.brews[i]!.emissiveIntensity = 1.4 + 0.6 * Math.sin(stageMs / 150);
    });
  });

  drawStatus(sim.state);

  return {
    start: () => {
      audio.music('shop');
      loop.start();
    },
    pause: () => undefined,
    resume: () => loop.reset(),
    resize: () => undefined,
    recompose: (c) => shots.go(c.profile === 'compact' ? LAYOUT.shots.portrait : LAYOUT.shots.landscape, 0.6, stage.pose),
    captureResponsiveState: () => null,
    restoreResponsiveState: () => undefined,
    setMuted: () => undefined,
    destroy: async () => {
      finished = true;
      loop.stop();
      for (const id of [...items.keys()]) removeItem(id);
      for (const c of customers.values()) hud.unanchor(c.bubble);
      status.remove();
      rushSign.remove();
      for (const z of zones) hud.unanchor(z);
    },
    test: {
      state: () => sim.state,
      dispatch: (command) => loop.dispatch(command as PotionRushCommand),
      tick: (steps) => {
        for (let i = 0; i < steps; i++) sim.tick().forEach(handle);
      },
      auto: () => {
        const command = nextDrop(sim.state);
        if (command) loop.dispatch(command);
        return !!command;
      },
    },
  };
}
