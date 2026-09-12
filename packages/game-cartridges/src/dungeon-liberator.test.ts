import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import { PHASE3_RUNTIME_EDITION } from "./legacy-traversal-phase3-test-helpers.js";
import {
  DUNGEON_LIBERATOR_KEYBOARD_BINDINGS,
  INVULNERABILITY_DURATION,
  createDungeonLiberatorCartridge,
  createDungeonLiberatorController,
  dungeonDirectionFromPointer,
  getDungeonLiberatorDpadButtons,
  type DungeonDirection,
  type DungeonLiberatorSnapshot,
} from "./dungeon-liberator.js";
import { createCatalogStandardEdition } from "./catalog-standard-art.js";

const SENTENCES = [
  { term: "silver doors open", translation: "quiet doors" },
  { term: "bright lanterns guide", translation: "steady lanterns" },
] as const;

const PUBLIC_SENTENCES = [
  { term: "The dragon crosses the bridge", translation: "มังกรข้ามสะพาน" },
  { term: "A lantern glows in the forest", translation: "โคมไฟส่องแสงในป่า" },
] as const;

function completeSentence(controller: ReturnType<typeof createDungeonLiberatorController>): void {
  for (const prisoner of controller.snapshot().prisoners) controller.moveTo(prisoner);
  controller.moveTo(controller.snapshot().portal);
}

function expireInvulnerability(controller: ReturnType<typeof createDungeonLiberatorController>): void {
  for (let elapsed = 0; elapsed < INVULNERABILITY_DURATION; elapsed += 50) controller.tick(50);
}

function chooseSafeMovement(snapshot: DungeonLiberatorSnapshot): DungeonDirection {
  const target = snapshot.prisoners.find((prisoner) => prisoner.orderIndex === snapshot.wordIndex);
  if (!target) return "move-right";
  const moves = [
    { action: "move-left" as const, x: -24, y: 0 },
    { action: "move-right" as const, x: 24, y: 0 },
    { action: "move-up" as const, x: 0, y: -24 },
    { action: "move-down" as const, x: 0, y: 24 },
  ];
  return moves.map((move) => {
    const x = Math.max(24, Math.min(936, snapshot.player.x + move.x));
    const y = Math.max(24, Math.min(516, snapshot.player.y + move.y));
    const targetDistance = Math.hypot(target.x - x, target.y - y);
    const monsterDistance = Math.min(
      ...snapshot.monsters.map((monster) => Math.hypot(monster.x - x, monster.y - y) - monster.radius),
      Number.POSITIVE_INFINITY,
    );
    return { action: move.action, score: targetDistance + Math.max(0, 150 - monsterDistance) * 12 };
  }).sort((left, right) => left.score - right.score)[0]!.action;
}

function directionToTarget(player: { readonly x: number; readonly y: number }, target: { readonly x: number; readonly y: number }): DungeonDirection {
  const horizontal = target.x - player.x;
  const vertical = target.y - player.y;
  if (Math.abs(horizontal) >= Math.abs(vertical) && horizontal !== 0) return horizontal > 0 ? "move-right" : "move-left";
  return vertical >= 0 ? "move-down" : "move-up";
}

function inputSnapshot(overrides: Partial<{
  keys: readonly string[];
  pressed: readonly string[];
  pointer: Partial<{
    released: boolean;
    cancelled: boolean;
    x: number;
    y: number;
  }>;
}> = {}) {
  return {
    keys: overrides.keys ?? [],
    pressed: overrides.pressed ?? [],
    pointer: {
      down: false,
      released: false,
      cancelled: false,
      id: null,
      kind: null,
      startX: 0,
      startY: 0,
      x: 0,
      y: 0,
      ...overrides.pointer,
    },
    destroyed: false,
  };
}

function createFakeInputController() {
  let next = inputSnapshot();
  return {
    set(snapshot: ReturnType<typeof inputSnapshot>) {
      next = snapshot;
    },
    snapshot: vi.fn(() => {
      const current = next;
      next = inputSnapshot();
      return current;
    }),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
  };
}

function createFakeScene(width = 960, height = 540, renderedWidth = width) {
  const destroyedGraphics: ReturnType<typeof vi.fn>[] = [];
  const destroyedText: ReturnType<typeof vi.fn>[] = [];
  const textObjects: Array<{
    value: string;
    x: number;
    y: number;
    fontSize?: number;
    backgroundColor?: string;
    wrapWidth?: number;
    originX?: number;
  }> = [];
  const listeners = new Map<string, () => void>();
  const spriteObjects: Array<{
    key: string;
    x: number;
    y: number;
    displayWidth?: number;
    displayHeight?: number;
    originX?: number;
    originY?: number;
  }> = [];
  const graphics = {
    clear: () => graphics,
    fillStyle: () => graphics,
    fillRect: () => graphics,
    fillCircle: () => graphics,
    fillRoundedRect: () => graphics,
    lineStyle: () => graphics,
    strokeRoundedRect: () => graphics,
    destroy: vi.fn(),
  };
  const sprite = (x: number, y: number, key: string) => {
    const resource = {
      key,
      x,
      y,
      displayWidth: undefined as number | undefined,
      displayHeight: undefined as number | undefined,
      originX: undefined as number | undefined,
      originY: undefined as number | undefined,
      setOrigin: (originX: number, originY: number) => {
        resource.originX = originX;
        resource.originY = originY;
        return resource;
      },
      setPosition: (nextX: number, nextY: number) => {
        resource.x = nextX;
        resource.y = nextY;
        return resource;
      },
      setDisplaySize: (nextWidth: number, nextHeight: number) => {
        resource.displayWidth = nextWidth;
        resource.displayHeight = nextHeight;
        return resource;
      },
      setDepth: () => resource,
      setVisible: () => resource,
      destroy: vi.fn(),
    };
    spriteObjects.push(resource);
    return resource;
  };
  const text = (initialX = 0, initialY = 0, initialValue = "") => {
    const resource = {
      value: initialValue,
      x: initialX,
      y: initialY,
      fontSize: undefined as number | undefined,
      backgroundColor: undefined as string | undefined,
      wrapWidth: undefined as number | undefined,
      originX: undefined as number | undefined,
      setPosition: (x: number, y: number) => {
        resource.x = x;
        resource.y = y;
        return resource;
      },
      setText: (value: string) => {
        resource.value = value;
        return resource;
      },
      setFontSize: (value: number) => {
        resource.fontSize = value;
        return resource;
      },
      setBackgroundColor: (value: string) => {
        resource.backgroundColor = value;
        return resource;
      },
      setPadding: () => resource,
      setOrigin: (x: number) => {
        resource.originX = x;
        return resource;
      },
      setWordWrapWidth: (value: number) => {
        resource.wrapWidth = value;
        return resource;
      },
      destroy: vi.fn(),
    };
    textObjects.push(resource);
    destroyedText.push(resource.destroy);
    return resource;
  };
  destroyedGraphics.push(graphics.destroy);
  return {
    scale: { width, height },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: renderedWidth, height }) } },
    add: { graphics: () => graphics, text, image: sprite, sprite, tileSprite: (x: number, y: number, _width: number, _height: number, key: string) => sprite(x, y, key) },
    load: { image: vi.fn(), spritesheet: vi.fn() },
    events: { once: (event: string, listener: () => void) => listeners.set(event, listener) },
    shutdown: () => listeners.get("shutdown")?.(),
    destroy: () => listeners.get("destroy")?.(),
    destroyedGraphics,
    destroyedText,
    textObjects,
    spriteObjects,
  };
}

function createSceneInputHarness(
  sentences: readonly { readonly term: string; readonly translation: string }[] = SENTENCES,
  fakeScene = createFakeScene(),
) {
  const input = createFakeInputController();
  const config = createDungeonLiberatorCartridge().createGameConfig({
    input: [...sentences],
    edition: PHASE3_RUNTIME_EDITION,
    complete: vi.fn(),
    diagnostic: vi.fn(),
    inputController: input,
    sessionMode: "playing",
    seed: 31,
  });
  const scene = config.scene as {
    create: (this: ReturnType<typeof createFakeScene>) => void;
    update: (this: ReturnType<typeof createFakeScene>, time: number, delta: number) => void;
    extend: {
      apkCaptureResponsiveState: () => DungeonLiberatorSnapshot;
      apkRestoreResponsiveState: (state: unknown) => void;
    };
  };
  scene.create.call(fakeScene);
  return { input, scene, fakeScene };
}

describe("Dungeon Liberator bespoke rescue cartridge", () => {
  it("counts any reachable prisoner with the visible expected English word as correct", () => {
    const controller = createDungeonLiberatorController(
      [{ term: "echo echo opens", translation: "เสียงสะท้อนเปิด" }],
      vi.fn(),
      { monsterCount: 0, seed: 17 },
    );
    const duplicate = controller.snapshot().prisoners[1];
    if (!duplicate) throw new Error("The test needs the second duplicate prisoner");

    const first = controller.collidePrisoner(duplicate.id);
    expect(first).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(first.snapshot).toMatchObject({ wordIndex: 1, correctAnswers: 1, totalAttempts: 1 });
    expect(first.snapshot.trail).toEqual([
      expect.objectContaining({ id: `trail:${duplicate.id}`, word: "echo", orderIndex: 0 }),
    ]);

    const restored = createDungeonLiberatorController(
      [{ term: "echo echo opens", translation: "เสียงสะท้อนเปิด" }],
      vi.fn(),
      { monsterCount: 0, seed: 17 },
    );
    restored.restore(first.snapshot);
    expect(restored.snapshot()).toEqual(first.snapshot);
    const remainingDuplicate = restored.snapshot().prisoners.find((prisoner) => prisoner.word === "echo" && !prisoner.collected);
    if (!remainingDuplicate) throw new Error("The test needs the remaining duplicate prisoner");
    expect(restored.collidePrisoner(remainingDuplicate.id)).toMatchObject({ correct: true, progressed: true });
  });

  it("shows the bare Thai target and concise numeric state without live prose", () => {
    const sentences = [{ term: "silver doors open", translation: "ประตูสีเงินเปิด" }];
    const { fakeScene } = createSceneInputHarness(sentences, createFakeScene(336, 733));
    const values = fakeScene.textObjects.map(({ value }) => value);
    const prompt = fakeScene.textObjects.find(({ value }) => value === sentences[0]!.translation);

    expect(prompt).toMatchObject({ fontSize: 26, x: 168, originX: 0.5 });
    expect(values).toContain("1/1  1/3  ♥ 3");
    expect(values.join(" ")).not.toMatch(/DUNGEON LIBERATOR|Rescue in order|Sentence|Word|Lives|Keyboard|Reach the glowing|dungeon/i);
  });

  it("keeps complete English prisoner labels inside the compact viewport", () => {
    const words = ["environmental", "conservation", "guides", "travelers"];
    const { fakeScene } = createSceneInputHarness(
      [{ term: words.join(" "), translation: "การอนุรักษ์สิ่งแวดล้อมนำทางนักเดินทาง" }],
      createFakeScene(336, 733),
    );

    for (const word of words) {
      const label = fakeScene.textObjects.find(({ value }) => value === word);
      expect(label).toMatchObject({
        value: word,
        fontSize: 16,
        backgroundColor: "rgba(15, 23, 42, 0.92)",
        originX: 0.5,
      });
      expect(label?.wrapWidth).toBeGreaterThanOrEqual(72);
      expect(label?.x).toBeGreaterThanOrEqual((label?.wrapWidth ?? 0) / 2);
      expect(label?.x).toBeLessThanOrEqual(336 - (label?.wrapWidth ?? 0) / 2);
      expect(label?.y).toBeGreaterThanOrEqual(18);
      expect(label?.y).toBeLessThanOrEqual(733 - 18);
    }
  });

  it("keeps catalog player and goblin footprints visible on a CSS-scaled canvas", () => {
    const displayScale = 336 / 960;
    const edition = createCatalogStandardEdition([], "/assets/apk/standard-pack-qc/", "dungeon-liberator");
    const config = createDungeonLiberatorCartridge().createGameConfig({
      input: [...PUBLIC_SENTENCES],
      edition,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: createFakeInputController(),
      sessionMode: "playing",
      seed: 31,
    });
    const scene = config.scene as {
      preload: (this: ReturnType<typeof createFakeScene>) => void;
      create: (this: ReturnType<typeof createFakeScene>) => void;
    };
    const fakeScene = createFakeScene(960, 540, 336);

    scene.preload.call(fakeScene);
    scene.create.call(fakeScene);

    const player = fakeScene.spriteObjects.find(({ key }) => key.includes("labyrinth-player-idle"));
    const goblin = fakeScene.spriteObjects.find(({ key }) => key.includes("labyrinth-goblin-static"));
    expect(player).toMatchObject({
      displayWidth: 48 / displayScale,
      displayHeight: 48 / displayScale,
      originX: 12 / 24,
      originY: 14.5 / 24,
    });
    expect((player?.displayWidth ?? 0) * displayScale * 12 / 24).toBeCloseTo(24);
    expect(goblin).toMatchObject({
      displayWidth: 70.4 / displayScale,
      displayHeight: 70.4 / displayScale,
      originX: 17 / 32,
      originY: 24 / 32,
    });
    expect((goblin?.displayWidth ?? 0) * displayScale * 10 / 32).toBeCloseTo(22);
  });

  it("uses deterministic four-way movement and positioned prisoner collisions", () => {
    const first = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 17 });
    const second = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 17 });
    const initial = first.snapshot();

    expect(initial).toMatchObject({
      seed: 17,
      answer: "silver",
      energy: 3,
      correctAction: expect.any(String),
      availableActions: ["move-left", "move-right", "move-up", "move-down"],
      result: undefined,
    });
    expect(initial.player).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    expect(initial.prisoners.map(({ x, y }) => ({ x, y }))).toEqual(
      second.snapshot().prisoners.map(({ x, y }) => ({ x, y })),
    );
    expect(DUNGEON_LIBERATOR_KEYBOARD_BINDINGS).toMatchObject({
      ArrowLeft: "move-left",
      ArrowRight: "move-right",
      ArrowUp: "move-up",
      ArrowDown: "move-down",
    });

    first.choose("move-right");
    first.move("move-down");
    expect(first.snapshot().player.x).toBeGreaterThan(initial.player.x);
    expect(first.snapshot().player.y).toBeGreaterThan(initial.player.y);

    const target = first.snapshot().prisoners[0];
    if (!target) throw new Error("The test needs a positioned prisoner");
    const collision = first.moveTo(target);
    expect(collision).toMatchObject({ accepted: true, correct: true, progressed: true });
    expect(collision.snapshot.trail.map(({ word }) => word)).toEqual(["silver"]);
    expect(collision.snapshot.targetIndex).toBe(1);
  });

  it("moves rescued trail segments behind the player at a fixed spacing", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 17 });
    const first = controller.snapshot().prisoners[0];
    if (!first) throw new Error("The test needs a positioned prisoner");

    controller.moveTo(first);
    const destination = { x: Math.min(800, first.x + 220), y: first.y };
    controller.moveTo(destination);

    const segment = controller.snapshot().trail[0];
    if (!segment) throw new Error("The test needs a rescued trail segment");
    expect(Math.hypot(controller.snapshot().player.x - segment.x, controller.snapshot().player.y - segment.y)).toBeCloseTo(72);
  });

  it("keeps the rescue trail in sentence order and resets it when a wrong prisoner flees", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 3 });
    const [first, second, wrong] = controller.snapshot().prisoners;
    if (!first || !second || !wrong) throw new Error("The test needs three prisoners");

    controller.moveTo(first);
    expect(controller.snapshot().trail.map(({ word }) => word)).toEqual(["silver"]);

    const result = controller.moveTo(wrong);
    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(result.snapshot).toMatchObject({ targetIndex: 0, wordIndex: 0, lastOutcome: "incorrect" });
    expect(result.snapshot.trail).toEqual([]);
    expect(result.snapshot.answer).toBe("silver");
    expect(result.snapshot.score).toBe(100);
    expect(result.snapshot.prisoners[0]).toMatchObject({ collected: false });
    expect(result.snapshot.prisoners[2]).toMatchObject({ fleeing: true });

    for (let tick = 0; tick < 15; tick += 1) controller.tick(50);
    expect(controller.snapshot().prisoners[2]).toMatchObject({ fleeing: false });
  });

  it("resets the entire current sentence trail on a player-monster collision", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 5 });
    const [first, second, third] = controller.snapshot().prisoners;
    const monster = controller.snapshot().monsters[0];
    if (!first || !second || !third || !monster) throw new Error("The test needs three prisoners and a monster");

    controller.moveTo(first);
    controller.moveTo(second);
    controller.moveTo(third);
    expect(controller.snapshot()).toMatchObject({ wordIndex: 3, targetIndex: 3, lives: 3 });
    expect(controller.snapshot().trail).toHaveLength(3);

    const trailHit = controller.collideMonster(monster.id);
    expect(trailHit).toMatchObject({ accepted: true, progressed: false });
    expect(trailHit.snapshot.trail).toEqual([]);
    expect(trailHit.snapshot).toMatchObject({ wordIndex: 0, targetIndex: 0, lives: 3, answer: "silver" });
    expect(trailHit.snapshot.prisoners.every(({ collected }) => !collected)).toBe(true);
    expect(trailHit.snapshot.lives).toBe(3);
    expect(trailHit.snapshot.lastOutcome).toBe("hazard");
    expect(trailHit.snapshot.player.invulnerabilityTime).toBe(INVULNERABILITY_DURATION);

    expireInvulnerability(controller);
    const lifeHit = controller.collideMonster(monster.id);
    expect(lifeHit.snapshot.lives).toBe(2);
    expect(lifeHit.snapshot.phase).toBe("playing");
  });

  it("does not grant score or XP again after chain loss and responsive restore", () => {
    const sentence = [{ term: "silver doors open", translation: "ประตูสีเงินเปิด" }];
    const finish = (controller: ReturnType<typeof createDungeonLiberatorController>) => {
      for (const prisoner of controller.snapshot().prisoners) controller.collidePrisoner(prisoner.id);
      controller.moveTo(controller.snapshot().portal);
      return controller.snapshot().result;
    };
    const clean = createDungeonLiberatorController(sentence, vi.fn(), { monsterCount: 1, seed: 41 });
    const cleanResult = finish(clean);

    const farmed = createDungeonLiberatorController(sentence, vi.fn(), { monsterCount: 1, seed: 41 });
    for (const prisoner of farmed.snapshot().prisoners) farmed.collidePrisoner(prisoner.id);
    expect(farmed.snapshot()).toMatchObject({ correctAnswers: 3, totalAttempts: 3, score: 300 });
    const completeChain = farmed.capture();
    const beforePortal = createDungeonLiberatorController(sentence, vi.fn(), { monsterCount: 1, seed: 41 });
    beforePortal.restore(completeChain);
    expect(beforePortal.snapshot()).toEqual(completeChain);
    expect(beforePortal.snapshot().phase).toBe("playing");

    beforePortal.collideMonster(beforePortal.snapshot().monsters[0]!.id);
    const disrupted = beforePortal.capture();
    expect(disrupted).toMatchObject({ wordIndex: 0, trail: [], rewardedWordIds: [
      "sentence:0:word:0",
      "sentence:0:word:1",
      "sentence:0:word:2",
    ] });

    const restored = createDungeonLiberatorController(sentence, vi.fn(), { monsterCount: 1, seed: 41 });
    expect(() => restored.restore({ ...disrupted, totalAttempts: Number.MAX_SAFE_INTEGER + 1 })).toThrow("result counters are invalid");
    restored.restore(disrupted);
    const repeatedResult = finish(restored);

    expect(restored.snapshot()).toMatchObject({ correctAnswers: 6, totalAttempts: 6, score: 300 });
    expect(cleanResult).toMatchObject({ correctAnswers: 3, totalAttempts: 3, score: 300, xp: 70 });
    expect(repeatedResult).toMatchObject({ correctAnswers: 6, totalAttempts: 6, score: 300, xp: 70 });
  });

  it("rescatter every rescued word from the trail segment hit by a monster", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 5 });
    const [first, second] = controller.snapshot().prisoners;
    const monster = controller.snapshot().monsters[0];
    if (!first || !second || !monster) throw new Error("The test needs two prisoners and a monster");

    controller.moveTo(first);
    controller.moveTo(second);
    const captured = controller.capture();
    controller.restore({
      ...captured,
      monsters: [
        { ...monster, x: captured.trail[0]!.x, y: captured.trail[0]!.y },
        ...captured.monsters.slice(1),
      ],
    });
    const disrupted = controller.tick(0);

    expect(disrupted).toMatchObject({ phase: "playing" });
    expect(disrupted.trail).toEqual([]);
    expect(disrupted.targetIndex).toBe(0);
    expect(disrupted.prisoners.filter(({ collected }) => collected)).toHaveLength(0);
    expect(disrupted.prisoners.find(({ id }) => id === second.id)).toMatchObject({ collected: false });
    expect(disrupted.player.invulnerabilityTime).toBe(INVULNERABILITY_DURATION);
  });

  it("ignores repeated player-monster overlap before the invulnerability boundary", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 29 });
    const monster = controller.snapshot().monsters[0];
    if (!monster) throw new Error("The test needs a monster");

    const firstHit = controller.collideMonster(monster.id);
    expect(firstHit.snapshot.player).toMatchObject({ lives: 2, invulnerabilityTime: INVULNERABILITY_DURATION });

    const repeatedHit = controller.collideMonster(monster.id);
    expect(repeatedHit).toMatchObject({ accepted: false, terminal: false, completed: false });
    expect(repeatedHit.snapshot.player).toMatchObject({ lives: 2, invulnerabilityTime: INVULNERABILITY_DURATION });

    controller.tick(100);
    expect(controller.snapshot().player.invulnerabilityTime).toBe(INVULNERABILITY_DURATION - 50);
    expect(controller.collideMonster(monster.id).snapshot.player.lives).toBe(2);
  });

  it("allows player-monster overlap again after 1000 bounded milliseconds", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 29 });
    const monster = controller.snapshot().monsters[0];
    if (!monster) throw new Error("The test needs a monster");

    controller.collideMonster(monster.id);
    expireInvulnerability(controller);
    expect(controller.snapshot().player.invulnerabilityTime).toBe(0);

    const secondHit = controller.collideMonster(monster.id);
    expect(secondHit).toMatchObject({ accepted: true, terminal: false, completed: false });
    expect(secondHit.snapshot.player).toMatchObject({ lives: 1, invulnerabilityTime: INVULNERABILITY_DURATION });
  });

  it("requires the complete chain at the portal before moving between sentences", () => {
    const deliver = vi.fn();
    const controller = createDungeonLiberatorController(SENTENCES, deliver, { seed: 11 });

    const blocked = controller.reachPortal();
    expect(blocked).toMatchObject({ accepted: true, progressed: false, terminal: false });
    expect(blocked.snapshot.sentenceIndex).toBe(0);

    for (const prisoner of controller.snapshot().prisoners) controller.moveTo(prisoner);
    const fullChainAwayFromPortal = controller.reachPortal();
    expect(fullChainAwayFromPortal).toMatchObject({ progressed: false, terminal: false });
    controller.moveTo(controller.snapshot().portal);
    expect(controller.snapshot()).toMatchObject({ phase: "playing", sentenceIndex: 1, wordIndex: 0 });
    expect(deliver).not.toHaveBeenCalled();

    completeSentence(controller);
    expect(controller.snapshot()).toMatchObject({ phase: "victory", sentenceIndex: 2, targetIndex: 6 });
    expect(deliver).toHaveBeenCalledOnce();
    expect(gameResultsSchema.parse(deliver.mock.calls[0]?.[0])).toMatchObject({
      accuracy: 1,
      score: 600,
      correctAnswers: 6,
      totalAttempts: 6,
    });
  });

  it("defeats at zero lives and emits one result", () => {
    const deliver = vi.fn();
    const controller = createDungeonLiberatorController(SENTENCES, deliver, { lives: 1 });
    const monster = controller.snapshot().monsters[0];
    if (!monster) throw new Error("The test needs a monster");

    const defeat = controller.collideMonster(monster.id);
    expect(defeat).toMatchObject({ terminal: true, completed: true });
    expect(defeat.snapshot).toMatchObject({ phase: "defeat", lives: 0 });
    expect(gameResultsSchema.parse(defeat.result)).toMatchObject({
      accuracy: 0,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
    });
    controller.reachPortal();
    expect(deliver).toHaveBeenCalledOnce();
    expect(deliver).toHaveBeenCalledWith(expect.any(Object), "defeat");
  });

  it("reaches the first public seed-29 prisoner through semantic actions without instant defeat", () => {
    const controller = createDungeonLiberatorController(PUBLIC_SENTENCES, vi.fn(), { seed: 29 });

    for (let step = 0; step < 300 && controller.snapshot().targetIndex === 0; step += 1) {
      const before = controller.snapshot();
      const action = chooseSafeMovement(before);
      expect(controller.choose(action)).toMatchObject({ accepted: true });
      controller.tick(20);
      expect(controller.snapshot().phase).not.toBe("defeat");
    }

    expect(controller.snapshot()).toMatchObject({ phase: "playing", targetIndex: 1, wordIndex: 1 });
  });

  it("preserves full responsive state and rejects mutation after cleanup", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 23 });
    const first = controller.snapshot().prisoners[0];
    if (!first) throw new Error("The test needs a prisoner");
    controller.moveTo(first);
    const captured = controller.capture();
    controller.move("move-right");
    controller.restore(captured);
    expect(controller.snapshot()).toEqual(captured);

    controller.destroy();
    expect(controller.snapshot()).toMatchObject({ destroyed: true });
    expect(controller.move("move-left")).toMatchObject({ accepted: false });
  });

  it("captures and restores the active player invulnerability timer", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 29 });
    const monster = controller.snapshot().monsters[0];
    if (!monster) throw new Error("The test needs a monster");

    controller.collideMonster(monster.id);
    const captured = controller.capture();
    controller.tick(50);
    controller.restore(captured);

    expect(controller.snapshot()).toEqual(captured);
  });

  it("rejects responsive snapshots whose entities do not match ordered target progress", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 23 });
    const captured = controller.capture();

    expect(() => controller.restore({ ...captured, targetIndex: 2 })).toThrow(/target index/i);
    expect(() => controller.restore({ ...captured, answer: "wrong" })).toThrow(/answer/i);
    expect(() => controller.restore({ ...captured, prisoners: [] })).toThrow(/prisoner/i);
    expect(() => controller.restore({
      ...captured,
      player: { ...captured.player, invulnerabilityTime: Number.NaN },
    })).toThrow(/lifecycle|player/i);
    expect(() => controller.restore({
      ...captured,
      player: { ...captured.player, invulnerabilityTime: INVULNERABILITY_DURATION + 1 },
    })).toThrow(/lifecycle|player/i);
  });

  it("accepts keyboard and D-pad pointer input, responsive capture, and scene cleanup", () => {
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const input = createFakeInputController();
    const config = createDungeonLiberatorCartridge().createGameConfig({
      input: [...SENTENCES],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic,
      inputController: input,
      sessionMode: "playing",
      seed: 31,
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createFakeScene>) => void;
      update: (this: ReturnType<typeof createFakeScene>, time: number, delta: number) => void;
      extend: {
        apkCaptureResponsiveState: () => { readonly player: { readonly x: number } };
        apkRestoreResponsiveState: (state: unknown) => void;
        apkRecompose: (composition: unknown) => void;
      };
    };
    const fakeScene = createFakeScene();
    scene.create.call(fakeScene);
    const before = scene.extend.apkCaptureResponsiveState();

    input.set(inputSnapshot({ keys: ["ArrowRight"], pressed: ["ArrowRight"] }));
    scene.update.call(fakeScene, 0, 16);
    const afterKeyboard = scene.extend.apkCaptureResponsiveState();
    expect(afterKeyboard.player.x).toBeGreaterThan(before.player.x);

    const rightButton = getDungeonLiberatorDpadButtons(960, 540).find(({ action }) => action === "move-right");
    if (!rightButton) throw new Error("The test needs a right D-pad button");
    expect(dungeonDirectionFromPointer(
      rightButton.x + rightButton.width / 2,
      rightButton.y + rightButton.height / 2,
      960,
      540,
    )).toBe("move-right");
    expect(dungeonDirectionFromPointer(0, 0, 960, 540)).toBeUndefined();
    input.set(inputSnapshot({
      pointer: {
        released: true,
        x: rightButton.x + rightButton.width / 2,
        y: rightButton.y + rightButton.height / 2,
      },
    }));
    scene.update.call(fakeScene, 0, 16);
    expect(scene.extend.apkCaptureResponsiveState().player.x).toBeGreaterThan(afterKeyboard.player.x);

    const responsive = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRecompose({ profile: "compact" });
    scene.extend.apkRestoreResponsiveState(responsive);
    expect(scene.extend.apkCaptureResponsiveState()).toEqual(responsive);
    expect(complete).not.toHaveBeenCalled();

    fakeScene.shutdown();
    fakeScene.destroy();
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ destroyed: true });
    expect(input.cancelActiveGesture).toHaveBeenCalledOnce();
    expect(fakeScene.destroyedText.some((destroy) => destroy.mock.calls.length > 0)).toBe(true);
    scene.update.call(fakeScene, 0, 16);
    expect(() => scene.extend.apkRestoreResponsiveState(null)).toThrow(/responsive/i);
    scene.extend.apkRecompose({ profile: "compact" });
  });

  it("uses one fixed step for a keydown present in both keys and pressed", () => {
    const { input, scene, fakeScene } = createSceneInputHarness();
    const before = scene.extend.apkCaptureResponsiveState();

    input.set(inputSnapshot({ keys: ["ArrowRight"], pressed: ["ArrowRight"] }));
    scene.update.call(fakeScene, 0, 16);

    expect(scene.extend.apkCaptureResponsiveState().player.x).toBe(before.player.x + 24);
  });

  it("uses one fixed step for a short released tap", () => {
    const { input, scene, fakeScene } = createSceneInputHarness();
    const before = scene.extend.apkCaptureResponsiveState();

    input.set(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(fakeScene, 0, 16);

    expect(scene.extend.apkCaptureResponsiveState().player.x).toBe(before.player.x + 24);
  });

  it("uses bounded speed only for held-only movement", () => {
    const { input, scene, fakeScene } = createSceneInputHarness();
    const before = scene.extend.apkCaptureResponsiveState();

    input.set(inputSnapshot({ keys: ["ArrowRight"] }));
    scene.update.call(fakeScene, 0, 200);

    expect(scene.extend.apkCaptureResponsiveState().player.x).toBeCloseTo(before.player.x + 220 * 0.05);
  });

  it("deduplicates semantic actions and applies one movement per frame", () => {
    const { input, scene, fakeScene } = createSceneInputHarness();
    const before = scene.extend.apkCaptureResponsiveState();

    input.set(inputSnapshot({
      keys: ["ArrowRight", "KeyD", "ArrowDown"],
      pressed: ["ArrowRight", "KeyD", "ArrowDown"],
    }));
    scene.update.call(fakeScene, 0, 16);

    expect(scene.extend.apkCaptureResponsiveState().player).toMatchObject({
      x: before.player.x + 24,
      y: before.player.y,
    });
  });

  it("advances monsters and fleeing prisoners once per bounded scene frame", () => {
    const input = createFakeInputController();
    const config = createDungeonLiberatorCartridge().createGameConfig({
      input: [...SENTENCES],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
      seed: 31,
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createFakeScene>) => void;
      update: (this: ReturnType<typeof createFakeScene>, time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => DungeonLiberatorSnapshot; apkRestoreResponsiveState: (state: unknown) => void };
    };
    const fakeScene = createFakeScene();
    scene.create.call(fakeScene);
    const before = scene.extend.apkCaptureResponsiveState();
    const monster = before.monsters[0];
    const wrongPrisoner = before.prisoners[1];
    if (!monster || !wrongPrisoner) throw new Error("The scene test needs a monster and a wrong prisoner");

    scene.extend.apkRestoreResponsiveState({
      ...before,
      player: { ...before.player, x: wrongPrisoner.x, y: wrongPrisoner.y },
      correctAction: directionToTarget(wrongPrisoner, before.prisoners[0]!),
    });
    scene.update.call(fakeScene, 0, 0);
    const fleeing = scene.extend.apkCaptureResponsiveState().prisoners.find(({ id }) => id === wrongPrisoner.id);
    if (!fleeing) throw new Error("The scene test needs a fleeing prisoner");
    expect(fleeing).toMatchObject({ fleeing: true, fleeTimer: 750 });

    scene.update.call(fakeScene, 0, 200);
    const after = scene.extend.apkCaptureResponsiveState();
    const movedMonster = after.monsters.find(({ id }) => id === monster.id);
    const movedPrisoner = after.prisoners.find(({ id }) => id === wrongPrisoner.id);
    if (!movedMonster || !movedPrisoner) throw new Error("The scene test needs moving entities");
    expect(after.gameTime).toBe(50);
    expect(movedMonster.x).toBeCloseTo(monster.x + monster.velocityX * monster.speed * 0.05);
    expect(movedMonster.y).toBeCloseTo(monster.y + monster.velocityY * monster.speed * 0.05);
    expect(movedPrisoner.fleeTimer).toBe(700);
    expect(movedPrisoner.x).not.toBe(fleeing.x);
  });

  it("counts down invulnerability through the bounded scene tick", () => {
    const input = createFakeInputController();
    const config = createDungeonLiberatorCartridge().createGameConfig({
      input: [...SENTENCES],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
      seed: 31,
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createFakeScene>) => void;
      update: (this: ReturnType<typeof createFakeScene>, time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => DungeonLiberatorSnapshot; apkRestoreResponsiveState: (state: unknown) => void };
    };
    const fakeScene = createFakeScene();
    scene.create.call(fakeScene);
    const before = scene.extend.apkCaptureResponsiveState();
    const monster = before.monsters[0];
    if (!monster) throw new Error("The scene test needs a monster");

    scene.extend.apkRestoreResponsiveState({
      ...before,
      player: { ...before.player, x: monster.x, y: monster.y },
      correctAction: directionToTarget(monster, before.prisoners[0]!),
    });
    scene.update.call(fakeScene, 0, 0);
    expect(scene.extend.apkCaptureResponsiveState().player).toMatchObject({
      lives: before.player.lives - 1,
      invulnerabilityTime: INVULNERABILITY_DURATION,
    });

    scene.update.call(fakeScene, 0, 200);
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({
      gameTime: 50,
      player: { invulnerabilityTime: INVULNERABILITY_DURATION - 50 },
    });
  });

  it("delivers one terminal result when scene ticks resolve the final portal collision", () => {
    const complete = vi.fn();
    const input = createFakeInputController();
    const config = createDungeonLiberatorCartridge().createGameConfig({
      input: [
        { term: "alone", translation: "single" },
        { term: "again", translation: "once more" },
      ],
      edition: PHASE3_RUNTIME_EDITION,
      complete,
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
      seed: 31,
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createFakeScene>) => void;
      update: (this: ReturnType<typeof createFakeScene>, time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => DungeonLiberatorSnapshot; apkRestoreResponsiveState: (state: unknown) => void };
    };
    const fakeScene = createFakeScene();
    scene.create.call(fakeScene);
    const initial = scene.extend.apkCaptureResponsiveState();
    const prisoner = initial.prisoners[0];
    if (!prisoner) throw new Error("The scene test needs a prisoner");

    scene.extend.apkRestoreResponsiveState({
      ...initial,
      player: { ...initial.player, x: prisoner.x, y: prisoner.y },
      correctAction: "move-down",
    });
    scene.update.call(fakeScene, 0, 0);
    const rescued = scene.extend.apkCaptureResponsiveState();
    expect(rescued.wordIndex).toBe(1);

    scene.extend.apkRestoreResponsiveState({
      ...rescued,
      player: { ...rescued.player, x: rescued.portal.x, y: rescued.portal.y },
    });
    scene.update.call(fakeScene, 0, 0);
    const secondSentence = scene.extend.apkCaptureResponsiveState();
    const secondPrisoner = secondSentence.prisoners[0];
    if (!secondPrisoner) throw new Error("The scene test needs the second sentence prisoner");
    scene.extend.apkRestoreResponsiveState({
      ...secondSentence,
      player: { ...secondSentence.player, x: secondPrisoner.x, y: secondPrisoner.y },
      correctAction: "move-down",
      monsters: secondSentence.monsters.map((monster, index) => ({
        ...monster,
        x: 100 + index * 100,
        y: 480,
        velocityX: 0,
        velocityY: 0,
      })),
    });
    scene.update.call(fakeScene, 0, 0);
    const finalRescue = scene.extend.apkCaptureResponsiveState();
    expect(finalRescue).toMatchObject({ phase: "playing", targetIndex: 2 });

    for (let index = 0; index < 100 && scene.extend.apkCaptureResponsiveState().phase === "playing"; index += 1) {
      input.set(inputSnapshot({ keys: ["ArrowRight"] }));
      scene.update.call(fakeScene, 0, 200);
    }
    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ phase: "victory", result: expect.any(Object) });
    expect(complete).toHaveBeenCalledOnce();

    scene.update.call(fakeScene, 0, 200);
    expect(complete).toHaveBeenCalledOnce();
  });

  it("hides a rescued prisoner's label while keeping the trail word in state", () => {
    const input = createFakeInputController();
    const config = createDungeonLiberatorCartridge().createGameConfig({
      input: [{ term: "single", translation: "one" }],
      edition: PHASE3_RUNTIME_EDITION,
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: input,
      sessionMode: "playing",
      seed: 41,
    });
    const scene = config.scene as {
      create: (this: ReturnType<typeof createFakeScene>) => void;
      update: (this: ReturnType<typeof createFakeScene>, time: number, delta: number) => void;
      extend: { apkCaptureResponsiveState: () => DungeonLiberatorSnapshot };
    };
    const fakeScene = createFakeScene();
    scene.create.call(fakeScene);
    const target = scene.extend.apkCaptureResponsiveState().prisoners[0];
    if (!target) throw new Error("The test needs a prisoner");

    for (let index = 0; index < 300 && !scene.extend.apkCaptureResponsiveState().prisoners[0]?.collected; index += 1) {
      const state = scene.extend.apkCaptureResponsiveState();
      const code = Math.abs(target.x - state.player.x) >= Math.abs(target.y - state.player.y)
        ? target.x > state.player.x ? "ArrowRight" : "ArrowLeft"
        : target.y > state.player.y ? "ArrowDown" : "ArrowUp";
      input.set(inputSnapshot({ keys: [code], pressed: [code] }));
      scene.update.call(fakeScene, index * 16, 16);
    }

    const rescued = scene.extend.apkCaptureResponsiveState();
    expect(rescued.trail[0]?.word).toBe("single");
    expect(fakeScene.textObjects.some((text) => text.value === target.word)).toBe(false);
  });

  it("keeps the bespoke source independent from shared legacy catalog factories", async () => {
    const source = await import("node:fs").then(({ readFileSync }) =>
      readFileSync(new URL("./dungeon-liberator.ts", import.meta.url), "utf8"),
    );
    expect(source).not.toMatch(/legacy-catalog-core/u);
    expect(source).not.toMatch(/from\s+["']phaser["']/u);
  });

  it("exposes all four direction action types", () => {
    const directions: DungeonDirection[] = ["move-left", "move-right", "move-up", "move-down"];
    expect(directions.every((direction) => DUNGEON_LIBERATOR_KEYBOARD_BINDINGS[{
      "move-left": "ArrowLeft",
      "move-right": "ArrowRight",
      "move-up": "ArrowUp",
      "move-down": "ArrowDown",
    }[direction]] === direction)).toBe(true);
  });

  it("keeps every D-pad button inside the current canvas", () => {
    for (const button of getDungeonLiberatorDpadButtons(390, 844)) {
      expect(button.x).toBeGreaterThanOrEqual(0);
      expect(button.x + button.width).toBeLessThanOrEqual(390);
      expect(button.y).toBeGreaterThanOrEqual(0);
      expect(button.y + button.height).toBeLessThanOrEqual(844);
    }
  });

  it("rejects invalid controller settings and inactive movement inputs", () => {
    expect(() => createDungeonLiberatorController([], vi.fn())).toThrow(/empty/i);
    expect(() => createDungeonLiberatorController(SENTENCES, vi.fn(), { lives: 0 })).toThrow(/lives/i);
    expect(() => createDungeonLiberatorController(SENTENCES, vi.fn(), { monsterCount: -1 })).toThrow(/monster/i);

    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { monsterCount: 0 });
    expect(controller.applyHazard()).toMatchObject({ accepted: false, terminal: false });
    expect(controller.collideMonster("missing")).toMatchObject({ accepted: false, terminal: false });
    expect(controller.collidePrisoner("missing")).toMatchObject({ accepted: false, terminal: false });
    expect(controller.choose("invalid" as never)).toMatchObject({ accepted: false });
    expect(controller.move("move-right", -1)).toMatchObject({ accepted: false });
    expect(controller.moveTo({ x: Number.NaN, y: 10 })).toMatchObject({ accepted: false });
    expect(() => controller.tick(Number.NaN)).toThrow(/tick/i);

    controller.destroy();
    controller.destroy();
    expect(controller.applyHazard()).toMatchObject({ accepted: false });
  });

  it("rejects inconsistent responsive identity, progress, and entity state", () => {
    const controller = createDungeonLiberatorController(SENTENCES, vi.fn(), { seed: 23 });
    const captured = controller.capture();

    expect(() => controller.restore(null as never)).toThrow(/invalid/i);
    expect(() => controller.restore({ ...captured, phase: "invalid" as never })).toThrow(/phase/i);
    expect(() => controller.restore({ ...captured, seed: 24 })).toThrow(/identity/i);
    expect(() => controller.restore({ ...captured, sentenceCount: 99 })).toThrow(/identity/i);
    expect(() => controller.restore({ ...captured, targetCount: 99 })).toThrow(/identity/i);
    expect(() => controller.restore({ ...captured, sentenceIndex: -1 })).toThrow(/sentence index/i);
    expect(() => controller.restore({ ...captured, targetIndex: 1 })).toThrow(/target index/i);
    expect(() => controller.restore({ ...captured, wordIndex: -1 })).toThrow(/word index/i);
    expect(() => controller.restore({ ...captured, prompt: "tampered" })).toThrow(/sentence/i);
    expect(() => controller.restore({ ...captured, sentence: "tampered" })).toThrow(/sentence/i);
    expect(() => controller.restore({ ...captured, words: ["tampered"] })).toThrow(/sentence/i);
    expect(() => controller.restore({ ...captured, lives: 0, energy: 0, player: { ...captured.player, lives: 0 } })).toThrow(/playing|resources/i);
    expect(() => controller.restore({ ...captured, energy: 99 })).toThrow(/resources/i);
    expect(() => controller.restore({ ...captured, correctAnswers: 1 })).toThrow(/counters/i);
    expect(() => controller.restore({ ...captured, totalAttempts: -1 })).toThrow(/counters/i);
    expect(() => controller.restore({ ...captured, score: 1 })).toThrow(/counters/i);
    expect(() => controller.restore({ ...captured, gameTime: Number.NaN })).toThrow(/lifecycle/i);
    expect(() => controller.restore({ ...captured, player: { ...captured.player, x: 0 } })).toThrow(/player/i);
    expect(() => controller.restore({ ...captured, portal: { ...captured.portal, x: 1 } })).toThrow(/portal/i);
    expect(() => controller.restore({ ...captured, prisoners: [] })).toThrow(/prisoner/i);
    expect(() => controller.restore({
      ...captured,
      prisoners: captured.prisoners.map((prisoner) => ({ ...prisoner, word: "tampered" })),
    })).toThrow(/prisoner entity/i);
    expect(() => controller.restore({ ...captured, trail: [{ ...captured.trail[0]!, id: "trail:missing" }] })).toThrow(/trail/i);
    expect(() => controller.restore({ ...captured, monsters: [] })).toThrow(/monster/i);
    expect(() => controller.restore({ ...captured, availableActions: ["confirm"] as never })).toThrow(/action contract/i);
    expect(() => controller.restore({ ...captured, correctAction: "move-left" })).toThrow(/correct action/i);
    expect(() => controller.restore({
      ...captured,
      result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 },
    })).toThrow(/active|result/i);
  });

  it("runs real wrong and correct tutorial actions for one-word terms without delivery", () => {
    for (const sessionMode of ["tutorial", "demo"] as const) {
      const complete = vi.fn();
      const cartridge = createDungeonLiberatorCartridge();
      const input = createFakeInputController();
      const config = cartridge.createGameConfig({
        input: [{ term: "alone", translation: "single" }],
        edition: PHASE3_RUNTIME_EDITION,
        complete,
        diagnostic: vi.fn(),
        inputController: input,
        sessionMode,
        seed: 37,
      });
      const definition = cartridge.standardExperience.definition;
      const driver = cartridge.standardExperience.createTutorialActionDriver();
      const runStep = (stepIndex: number): void => {
        const step = definition.tutorial.steps[stepIndex]!;
        driver.execute({
          tutorial: definition.tutorial,
          step,
          seed: definition.tutorial.seed,
          mode: "tutorial",
          diagnostics: { report: vi.fn() },
        });
      };
      runStep(0);

      const incorrect = (config.scene as {
        extend: {
          apkCaptureResponsiveState: () => {
            readonly prisoners: readonly { readonly id: string; readonly fleeing: boolean; readonly word: string }[];
            readonly totalAttempts: number;
            readonly correctAnswers: number;
            readonly targetIndex: number;
            readonly trail: readonly unknown[];
            readonly lastOutcome?: string;
          };
        };
      }).extend.apkCaptureResponsiveState();
      expect(incorrect).toMatchObject({
        totalAttempts: 1,
        correctAnswers: 0,
        targetIndex: 0,
        trail: [],
        lastOutcome: "incorrect",
      });
      expect(incorrect.prisoners).toEqual(expect.arrayContaining([
        expect.objectContaining({ id: "tutorial-decoy:0", fleeing: true, word: "alone" }),
      ]));
      expect(incorrect.prisoners.every((prisoner) => prisoner.word !== "tutorial decoy")).toBe(true);

      runStep(1);

      const state = (config.scene as {
        extend: {
          apkCaptureResponsiveState: () => {
            readonly totalAttempts: number;
            readonly correctAnswers: number;
            readonly targetIndex: number;
          };
        };
      }).extend.apkCaptureResponsiveState();
      expect(state.totalAttempts).toBe(2);
      expect(state.correctAnswers).toBe(1);
      expect(state.targetIndex).toBe(1);
      expect(complete).not.toHaveBeenCalled();
    }
  });
});
