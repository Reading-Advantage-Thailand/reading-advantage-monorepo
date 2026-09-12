import type {
  APKInputController,
  APKPointerState,
  APKInputSnapshot,
  CartridgeGameConfigContext,
} from "@reading-advantage/advantage-play-kit";
import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it, vi } from "vitest";

import {
  areRuneCellsAdjacent,
  chooseRuneMatchCellFromPointer,
  createRuneMatchCartridge,
  createRuneMatchController,
  calculateMatchDamage,
  findPossibleMoves,
  findRuneMatchMove,
  findRuneMatchGroups,
  getRuneMatchBoardLayout,
  initializeGrid,
  initializeEmptyGrid,
  processMatches,
  RUNE_MATCH_ATTACK_INTERVAL_MS,
  swapRunes,
  RUNE_MATCH_AVAILABLE_ACTIONS,
  type RuneMatchRune,
} from "./rune-match.js";

const INPUT = [
  { term: "swift", translation: "fast" },
  { term: "brave", translation: "courageous" },
];

const MAXIMUM_INPUT = Array.from({ length: 50 }, (_value, index) => ({
  term: `term-${index}`,
  translation: `translation-${index}`,
}));

function vocabularyRune(wordId: string, index: number): RuneMatchRune {
  const item = INPUT.find((candidate) => candidate.term === wordId);
  if (!item) throw new Error(`Missing fixture word: ${wordId}`);
  return {
    id: `${wordId}-${index}`,
    type: "vocabulary",
    wordId,
    term: item.term,
    translation: item.translation,
  };
}

function targetMatchGrid(): readonly (readonly RuneMatchRune[])[] {
  return [
    [vocabularyRune("swift", 0), vocabularyRune("brave", 1), vocabularyRune("swift", 2)],
    [vocabularyRune("brave", 3), vocabularyRune("swift", 4), vocabularyRune("brave", 5)],
  ];
}

function nonTargetMatchGrid(): readonly (readonly RuneMatchRune[])[] {
  return [
    [vocabularyRune("brave", 0), vocabularyRune("swift", 1), vocabularyRune("brave", 2)],
    [{ id: "heal", type: "heal" }, vocabularyRune("brave", 3), { id: "shield", type: "shield" }],
  ];
}

function invalidGrid(): readonly (readonly RuneMatchRune[])[] {
  return [
    [vocabularyRune("swift", 0), vocabularyRune("brave", 1)],
    [{ id: "heal", type: "heal" }, { id: "shield", type: "shield" }],
  ];
}

function powerGrid(type: "heal" | "shield"): readonly (readonly RuneMatchRune[])[] {
  const other = type === "heal" ? "shield" : "heal";
  return [
    [{ id: `${type}-one`, type }, vocabularyRune("brave", 1)],
    [{ id: `${other}-middle`, type: other }, vocabularyRune("swift", 2)],
    [{ id: `${type}-two`, type }, vocabularyRune("brave", 3)],
  ];
}

function selectPair(
  controller: ReturnType<typeof createRuneMatchController>,
  first: { row: number; col: number },
  second: { row: number; col: number },
) {
  controller.selectCell(first);
  return controller.selectCell(second);
}

function inputSnapshot(overrides: Omit<Partial<APKInputSnapshot>, "pointer"> & {
  pointer?: Partial<APKPointerState>;
} = {}): APKInputSnapshot {
  return {
    keys: overrides.keys ?? [],
    pressed: overrides.pressed ?? [],
    destroyed: overrides.destroyed ?? false,
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
  };
}

function mutableInput(): APKInputController & { setSnapshot(snapshot: APKInputSnapshot): void } {
  let current = inputSnapshot();
  return {
    snapshot: vi.fn(() => current),
    cancelActiveGesture: vi.fn(),
    destroy: vi.fn(),
    setSnapshot(snapshot): void {
      current = snapshot;
    },
  };
}

function sceneHost(renderedWidth = 960, logicalWidth = 960, logicalHeight = 540) {
  const graphics = {
    clear: vi.fn(),
    fillStyle: vi.fn(),
    fillRect: vi.fn(),
    fillCircle: vi.fn(),
    fillRoundedRect: vi.fn(),
    lineStyle: vi.fn(),
    strokeRoundedRect: vi.fn(),
    destroy: vi.fn(),
  };
  for (const method of [
    graphics.clear,
    graphics.fillStyle,
    graphics.fillRect,
    graphics.fillCircle,
    graphics.fillRoundedRect,
    graphics.lineStyle,
    graphics.strokeRoundedRect,
  ]) method.mockReturnValue(graphics);
  const texts: Array<{ setPosition: ReturnType<typeof vi.fn>; setText: ReturnType<typeof vi.fn>; setFontSize: ReturnType<typeof vi.fn>; setWordWrapWidth: ReturnType<typeof vi.fn>; destroy: ReturnType<typeof vi.fn> }> = [];
  const createText = () => {
    const text = { setPosition: vi.fn(), setText: vi.fn(), setFontSize: vi.fn(), setWordWrapWidth: vi.fn(), destroy: vi.fn() };
    text.setPosition.mockReturnValue(text);
    text.setText.mockReturnValue(text);
    text.setFontSize.mockReturnValue(text);
    text.setWordWrapWidth.mockReturnValue(text);
    texts.push(text);
    return text;
  };
  const listeners = new Map<string, () => void>();
  const host = {
    add: { graphics: vi.fn(() => graphics), text: vi.fn(() => createText()) },
    events: { once: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)) },
    game: { canvas: { getBoundingClientRect: () => ({ left: 0, top: 0, width: renderedWidth, height: renderedWidth * 9 / 16 }) } },
    scale: { width: logicalWidth, height: logicalHeight },
  };
  return {
    host,
    graphics,
    texts,
    emit(event: string): void {
      listeners.get(event)?.();
    },
  };
}

describe("Rune Match rules", () => {
  it("uses edge adjacency and cursor movement without recording an attempt", () => {
    expect(areRuneCellsAdjacent({ row: 0, col: 0 }, { row: 0, col: 1 })).toBe(true);
    expect(areRuneCellsAdjacent({ row: 0, col: 0 }, { row: 1, col: 1 })).toBe(false);

    const controller = createRuneMatchController(INPUT, vi.fn(), { grid: targetMatchGrid() });
    const moved = controller.choose("move-right");
    expect(moved.snapshot.cursor).toEqual({ row: 0, col: 1 });
    expect(moved.snapshot.totalAttempts).toBe(0);
  });

  it("shows the target translation while vocabulary runes show source terms", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), { grid: targetMatchGrid() });
    const snapshot = controller.snapshot();

    expect(snapshot.prompt).toBe("fast");
    expect(snapshot.answer).toBe("swift");
    expect(snapshot.grid[0]![0]).toMatchObject({ term: "swift", translation: "fast" });
  });

  it("exposes the shared snapshot contract and deterministic no-match seeded board", () => {
    const first = initializeGrid(INPUT, { seed: 17 });
    const second = initializeGrid(INPUT, { seed: 17 });
    expect(first).toEqual(second);
    expect(findRuneMatchGroups(first)).toHaveLength(0);
    for (const seed of [0, 1, 41, 999]) {
      expect(findRuneMatchGroups(initializeGrid(INPUT, { seed }))).toHaveLength(0);
    }
    for (let count = 1; count <= INPUT.length; count += 1) {
      const vocabulary = INPUT.slice(0, count);
      expect(findRuneMatchGroups(initializeGrid(vocabulary, { seed: count }))).toHaveLength(0);
      expect(createRuneMatchController(vocabulary, vi.fn(), { seed: count }).findValidMove()).toBeDefined();
    }

    const snapshot = createRuneMatchController(INPUT, vi.fn(), { seed: 17 }).snapshot();
    expect(snapshot).toMatchObject({
      phase: "playing",
      status: "playing",
      seed: 17,
      mechanic: "adjacent-rune-monster-match",
      correctAction: "confirm",
      availableActions: RUNE_MATCH_AVAILABLE_ACTIONS,
      lives: 100,
      energy: 100,
      targetIndex: 0,
      targetCount: INPUT.length,
      score: 0,
      correctAnswers: 0,
      totalAttempts: 0,
      destroyed: false,
    });
  });

  it("validates board construction, swaps, and combat configuration", () => {
    expect(() => initializeGrid([], { rows: 2, columns: 2 })).toThrow(/vocabulary/i);
    expect(() => initializeEmptyGrid([])).toThrow(/vocabulary/i);
    expect(() => initializeGrid(INPUT, { rows: 0 })).toThrow(/positive/i);
    expect(() => initializeGrid(INPUT, { columns: 0 })).toThrow(/positive/i);
    expect(() => createRuneMatchController(INPUT, vi.fn(), { playerHealth: 10, playerMaxHealth: 5 })).toThrow(/maximum/i);
    expect(() => createRuneMatchController(INPUT, vi.fn(), { monsterAttack: -1 })).toThrow(/nonnegative/i);
    expect(() => createRuneMatchController(INPUT, vi.fn(), { invalidSwapDamage: -1 })).toThrow(/nonnegative/i);
    expect(() => createRuneMatchController(INPUT, vi.fn(), { healAmount: 0 })).toThrow(/positive/i);
    expect(() => createRuneMatchController(INPUT, vi.fn(), { seed: Number.NaN })).toThrow(/seed/i);

    expect(() => swapRunes([], { row: 0, col: 0 }, { row: 0, col: 1 })).toThrow(/grid/i);
    expect(() => swapRunes([[{ id: "heal", type: "heal" }]], { row: 0, col: 0 }, { row: 0, col: 1 })).toThrow(/outside/i);
    expect(() => swapRunes([[{ id: "heal", type: "heal" }], []], { row: 0, col: 0 }, { row: 1, col: 0 })).toThrow(/rectangular/i);
    expect(() => swapRunes([[{ id: "bad", type: "vocabulary" } as RuneMatchRune]], { row: 0, col: 0 }, { row: 0, col: 0 })).toThrow(/language/i);
    expect(() => swapRunes([[{ id: "bad", type: "unknown" } as unknown as RuneMatchRune]], { row: 0, col: 0 }, { row: 0, col: 0 })).toThrow(/unsupported/i);
    expect(findRuneMatchMove(targetMatchGrid())).toBeDefined();
    expect(calculateMatchDamage(2, false)).toBe(3);
    expect(calculateMatchDamage(4, false)).toBe(20);
    expect(calculateMatchDamage(5, false)).toBe(30);
  });

  it("selects one cell first and resolves only adjacent pairs", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), { grid: targetMatchGrid() });
    const first = controller.selectCell({ row: 0, col: 1 });
    expect(first.snapshot.selectedCell).toEqual({ row: 0, col: 1 });
    expect(first.snapshot.totalAttempts).toBe(0);

    const nonAdjacent = controller.selectCell({ row: 1, col: 2 });
    expect(nonAdjacent.snapshot.selectedCell).toEqual({ row: 1, col: 2 });
    expect(nonAdjacent.snapshot.totalAttempts).toBe(0);
  });

  it("covers cursor edges, repeated selection, and semantic action fallbacks", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), { grid: targetMatchGrid() });
    expect(controller.choose("move-left").snapshot.cursor).toEqual({ row: 0, col: 0 });
    expect(controller.choose("move-down").snapshot.cursor).toEqual({ row: 1, col: 0 });
    expect(controller.choose("move-up").snapshot.cursor).toEqual({ row: 0, col: 0 });
    expect(controller.choose("move-right").snapshot.cursor).toEqual({ row: 0, col: 1 });
    expect(controller.choose("unknown-action" as never)).toMatchObject({ accepted: false, turnCompleted: false });
    expect(controller.selectCell({ row: -1, col: 0 })).toMatchObject({ accepted: false, turnCompleted: false });
    expect(controller.selectCell({ row: 0, col: 0 })).toMatchObject({ accepted: true, outcome: "selected" });
    expect(controller.selectCell({ row: 0, col: 0 })).toMatchObject({ accepted: true, turnCompleted: false });
    expect(() => controller.advanceTime(-1)).toThrow(/delta/i);
  });

  it("finds a target group, removes it, damages the monster, and advances language progress", () => {
    const deliver = vi.fn();
    const controller = createRuneMatchController(INPUT, deliver, {
      grid: targetMatchGrid(),
      monsterHealth: 100,
      monsterAttack: 0,
    });
    const result = selectPair(controller, { row: 0, col: 1 }, { row: 1, col: 1 });

    expect(result).toMatchObject({ accepted: true, correct: true, progressed: true, turnCompleted: true });
    expect(result.snapshot.targetIndex).toBe(1);
    expect(result.snapshot.totalAttempts).toBe(1);
    expect(result.snapshot.correctAnswers).toBe(1);
    expect(result.snapshot.monster.health).toBeLessThan(100);
    expect(result.snapshot.lastRemovedCells.length).toBeGreaterThanOrEqual(2);
    expect(deliver).not.toHaveBeenCalled();
  });

  it("processes deterministic cascades and leaves no board matches", () => {
    const first = createRuneMatchController(INPUT, vi.fn(), {
      grid: targetMatchGrid(),
      monsterHealth: 100,
      monsterAttack: 0,
      seed: 9,
    });
    const second = createRuneMatchController(INPUT, vi.fn(), {
      grid: targetMatchGrid(),
      monsterHealth: 100,
      monsterAttack: 0,
      seed: 9,
    });

    const firstResult = selectPair(first, { row: 0, col: 1 }, { row: 1, col: 1 });
    const secondResult = selectPair(second, { row: 0, col: 1 }, { row: 1, col: 1 });
    expect(firstResult.snapshot.grid).toEqual(secondResult.snapshot.grid);
    expect(firstResult.snapshot.cascades).toBeGreaterThan(0);
    expect(findRuneMatchGroups(firstResult.snapshot.grid)).toHaveLength(0);
    expect(processMatches(swapRunes(targetMatchGrid(), { row: 0, col: 1 }, { row: 1, col: 1 }), INPUT, { seed: 9 }).cascades).toBeGreaterThan(0);
    expect(calculateMatchDamage(3, false)).toBe(10);
    expect(calculateMatchDamage(3, true)).toBe(20);
    expect(findPossibleMoves(firstResult.snapshot.grid)).toBeDefined();
  });

  it("keeps a generated session playable for each ordered target", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), { seed: 23, monsterAttack: 0 });
    for (let turn = 0; turn < INPUT.length; turn += 1) {
      const move = controller.findValidMove();
      expect(move).toBeDefined();
      if (!move) return;
      const result = selectPair(controller, move[0], move[1]);
      expect(result.correct).toBe(true);
    }
    expect(controller.snapshot().phase).toBe("victory");
  });

  it("varies four seeded target placements while preserving deterministic solvability", () => {
    const vocabulary = [
      { term: "bridge", translation: "สะพาน" },
      { term: "forest", translation: "ป่า" },
      { term: "river", translation: "แม่น้ำ" },
      { term: "lantern", translation: "โคมไฟ" },
    ];
    const playPlacements = (seed: number): readonly string[] => {
      const controller = createRuneMatchController(vocabulary, vi.fn(), { seed, monsterAttack: 0 });
      const placements: string[] = [];
      for (let target = 0; target < vocabulary.length; target += 1) {
        const state = controller.snapshot();
        placements.push(state.grid.flatMap((row, rowIndex) => row.flatMap((rune, colIndex) => (
          rune.type === "vocabulary" && rune.term === state.answer ? [`${rowIndex}:${colIndex}`] : []
        ))).join("|"));
        const move = controller.findValidMove();
        expect(move).toBeDefined();
        if (!move) throw new Error(`Missing seeded move for target ${target}`);
        expect(selectPair(controller, move[0], move[1])).toMatchObject({ correct: true, progressed: true });
      }
      expect(controller.snapshot().phase).toBe("victory");
      return placements;
    };

    const seedFour = playPlacements(4);
    expect(playPlacements(4)).toEqual(seedFour);
    const placementSets = [seedFour, playPlacements(9), playPlacements(17)].map((placements) => placements.join("/"));
    expect(new Set(placementSets).size).toBeGreaterThan(1);
    expect(new Set(seedFour).size).toBeGreaterThan(1);
  });

  it("completes all 50 vocabulary targets with deterministic progression", () => {
    const deliver = vi.fn();
    const controller = createRuneMatchController(MAXIMUM_INPUT, deliver, { seed: 23, monsterAttack: 0 });

    for (let targetIndex = 0; targetIndex < MAXIMUM_INPUT.length; targetIndex += 1) {
      const move = controller.findValidMove();
      expect(move, `target ${targetIndex} must have a valid move`).toBeDefined();
      if (!move) throw new Error(`Missing valid move for target ${targetIndex}`);

      const result = selectPair(controller, move[0], move[1]);
      expect(result).toMatchObject({ correct: true, progressed: true, turnCompleted: true });
      expect(result.snapshot.targetIndex).toBe(targetIndex + 1);
      expect(findRuneMatchGroups(result.snapshot.grid)).toHaveLength(0);
    }

    const snapshot = controller.snapshot();
    const result = gameResultsSchema.parse(snapshot.result);
    expect(snapshot).toMatchObject({
      phase: "victory",
      targetIndex: 50,
      targetCount: 50,
      correctAnswers: 50,
      totalAttempts: 50,
    });
    expect(result).toMatchObject({ correctAnswers: 50, totalAttempts: 50, accuracy: 1 });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("keeps a nonmatching swap and damage outside language accuracy", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), {
      grid: invalidGrid(),
      monsterAttack: 0,
    });
    const result = selectPair(controller, { row: 0, col: 0 }, { row: 0, col: 1 });

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, outcome: "invalid-swap" });
    expect(result.snapshot.player.health).toBe(99);
    expect(result.snapshot.totalAttempts).toBe(0);
    expect(result.snapshot.correctAnswers).toBe(0);
    expect(findRuneMatchGroups(result.snapshot.grid)).toHaveLength(0);
  });

  it("counts a direct non-target English match as one incorrect language attempt", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), {
      grid: nonTargetMatchGrid(),
      monsterHealth: 100,
      monsterAttack: 0,
    });
    const result = selectPair(controller, { row: 0, col: 0 }, { row: 0, col: 1 });

    expect(result).toMatchObject({ accepted: true, correct: false, progressed: false, outcome: "match" });
    expect(result.snapshot.monster.health).toBe(100);
    expect(result.snapshot.player.health).toBe(99);
    expect(result.snapshot.targetIndex).toBe(0);
    expect(result.snapshot.totalAttempts).toBe(1);
    expect(result.snapshot.correctAnswers).toBe(0);
  });

  it("applies power rune effects without recording language attempts", () => {
    const healController = createRuneMatchController(INPUT, vi.fn(), {
      grid: powerGrid("heal"),
      playerHealth: 50,
      monsterAttack: 0,
    });
    const healed = selectPair(healController, { row: 0, col: 0 }, { row: 1, col: 0 });
    expect(healed.snapshot.player.health).toBe(59);
    expect(healed.snapshot.correctAnswers).toBe(0);
    expect(healed.snapshot.totalAttempts).toBe(0);

    const shieldController = createRuneMatchController(INPUT, vi.fn(), {
      grid: powerGrid("shield"),
      playerHealth: 50,
      monsterAttack: 4,
    });
    const shielded = selectPair(shieldController, { row: 0, col: 0 }, { row: 1, col: 0 });
    expect(shielded.snapshot.player.health).toBe(49);
    expect(shielded.snapshot.player.hasShield).toBe(true);
    expect(shielded.snapshot.lastOutcome).toBe("shield");
    expect(shielded.outcome).toBe("shield");
    expect(shielded.snapshot.totalAttempts).toBe(0);
  });

  it("counterattacks after a turn and consumes a shield when it blocks", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), {
      grid: targetMatchGrid(),
      monsterHealth: 100,
      monsterAttack: 4,
    });
    const attacked = controller.advanceTurn();
    expect(attacked.snapshot.player.health).toBe(96);
    expect(attacked.snapshot.totalAttempts).toBe(0);
    expect(attacked.outcome).toBe("counterattack");

    const shielded = createRuneMatchController(INPUT, vi.fn(), {
      grid: targetMatchGrid(),
      monsterHealth: 100,
      monsterAttack: 4,
    });
    shielded.restore({
      ...shielded.capture(),
      player: { ...shielded.snapshot().player, hasShield: true },
    });
    expect(shielded.advanceTurn()).toMatchObject({ accepted: true, outcome: "blocked" });
    expect(shielded.snapshot().player.hasShield).toBe(false);
  });

  it("emits one validated victory result and rejects later turns", () => {
    const deliver = vi.fn();
    const controller = createRuneMatchController(INPUT.slice(0, 1), deliver, {
      grid: targetMatchGrid(),
      monsterHealth: 3,
      monsterAttack: 0,
    });
    const terminal = selectPair(controller, { row: 0, col: 1 }, { row: 1, col: 1 });
    const result = gameResultsSchema.parse(terminal.result);

    expect(terminal).toMatchObject({ terminal: true, completed: true, correct: true });
    expect(terminal.snapshot.phase).toBe("victory");
    expect(terminal.snapshot.result).toEqual(result);
    expect(result).toMatchObject({ accuracy: 1, correctAnswers: 1, totalAttempts: 1, score: 100 });
    expect(deliver).toHaveBeenCalledOnce();
    expect(controller.advanceTurn()).toMatchObject({ accepted: false, terminal: false, completed: false });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("requires every input target even when the monster reaches zero first", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), {
      grid: targetMatchGrid(),
      monsterHealth: 1,
      monsterAttack: 0,
    });
    const first = selectPair(controller, { row: 0, col: 1 }, { row: 1, col: 1 });
    expect(first.snapshot).toMatchObject({ phase: "playing", targetIndex: 1, monsterHealth: 0 });

    const move = controller.findValidMove();
    expect(move).toBeDefined();
    if (!move) return;
    const second = selectPair(controller, move[0], move[1]);
    expect(second.snapshot).toMatchObject({ phase: "victory", targetIndex: INPUT.length });
  });

  it("emits defeat from an invalid swap without a language attempt", () => {
    const deliver = vi.fn();
    const controller = createRuneMatchController(INPUT, deliver, {
      grid: invalidGrid(),
      playerHealth: 1,
      monsterAttack: 0,
    });
    const terminal = selectPair(controller, { row: 0, col: 0 }, { row: 0, col: 1 });
    const result = gameResultsSchema.parse(terminal.result);

    expect(terminal.snapshot).toMatchObject({ phase: "defeat", totalAttempts: 0, correctAnswers: 0 });
    expect(result).toMatchObject({ accuracy: 0, correctAnswers: 0, totalAttempts: 0, score: 0 });
    expect(deliver).toHaveBeenCalledOnce();
  });

  it("captures and restores responsive board state", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), { grid: targetMatchGrid() });
    controller.selectCell({ row: 0, col: 1 });
    const captured = controller.capture();
    controller.moveCursor("down");
    controller.restore(captured);

    expect(controller.snapshot()).toEqual(captured);
    expect(() => controller.restore({ ...captured, phase: "victory" })).toThrow(/status|victory|unfinished/i);
  });

  it("rejects forged responsive fields without changing the active board", () => {
    const controller = createRuneMatchController(INPUT, vi.fn(), { grid: targetMatchGrid(), seed: 4 });
    const captured = controller.capture();
    const invalidStates: Array<Partial<ReturnType<typeof controller.capture>>> = [
      { phase: "paused" as ReturnType<typeof controller.capture>["phase"] },
      { status: "victory" },
      { seed: 5 },
      { mechanic: "forged" },
      { grid: [[...captured.grid[0]!]] },
      {
        grid: [
          [vocabularyRune("swift", 0), vocabularyRune("swift", 1), vocabularyRune("swift", 2)],
          [...captured.grid[1]!],
        ],
      },
      { cursor: { row: 99, col: 0 } },
      { selectedCell: { row: 99, col: 0 } },
      { targetIndex: 99 },
      { targetCount: 99 },
      { prompt: "forged" },
      { correctAction: "move-left" },
      { availableActions: [] },
      { attackTimerMs: -1 },
      { correctAnswers: 1 },
      { totalAttempts: -1 },
      { score: 1 },
      { turns: -1 },
      { cascades: -1 },
      { refillIndex: -1 },
      { player: { ...captured.player, health: -1 } },
      { monster: { ...captured.monster, health: -1 } },
      { lastOutcome: "forged" as ReturnType<typeof controller.capture>["lastOutcome"] },
      { lastRemovedCells: [{ row: 99, col: 0 }] },
      { destroyed: "no" as unknown as boolean },
      { result: { accuracy: 0, xp: 0, score: 0, correctAnswers: 0, totalAttempts: 0 } },
    ];

    for (const invalid of invalidStates) {
      expect(() => controller.restore({ ...captured, ...invalid })).toThrow();
    }
    expect(controller.snapshot()).toEqual(captured);
  });

  it("rejects inconsistent terminal results and seals destroyed state", () => {
    const controller = createRuneMatchController(INPUT.slice(0, 1), vi.fn(), {
      grid: targetMatchGrid(),
      monsterHealth: 100,
      monsterAttack: 0,
    });
    selectPair(controller, { row: 0, col: 1 }, { row: 1, col: 1 });
    const terminal = controller.capture();
    expect(terminal.phase).toBe("victory");
    expect(() => controller.restore({ ...terminal, result: undefined })).toThrow(/result/i);
    expect(() => controller.restore({ ...terminal, result: { ...terminal.result!, xp: terminal.result!.xp + 1 } })).toThrow(/inconsistent/i);

    const destroyed = createRuneMatchController(INPUT, vi.fn(), { grid: targetMatchGrid() });
    destroyed.destroy();
    destroyed.destroy();
    const destroyedState = destroyed.capture();
    expect(destroyedState.destroyed).toBe(true);
    destroyed.restore(destroyedState);
    expect(destroyed.advanceTime(1)).toMatchObject({ accepted: false, turnCompleted: false });
  });

  it("maps pointer cells across compact and wide layouts", () => {
    const compact = getRuneMatchBoardLayout(390, 844, 8, 6);
    const wide = getRuneMatchBoardLayout(960, 540, 8, 6);
    expect(chooseRuneMatchCellFromPointer(compact.x + compact.cellSize / 2, compact.y + compact.cellSize / 2, compact)).toEqual({ row: 0, col: 0 });
    expect(chooseRuneMatchCellFromPointer(wide.x + wide.cellSize * 5.5, wide.y + wide.cellSize * 7.5, wide)).toEqual({ row: 7, col: 5 });
    expect(chooseRuneMatchCellFromPointer(0, 0, compact)).toBeUndefined();
  });

  it("accepts keyboard and touch scene input and cleans every scene resource", () => {
    const inputController = mutableInput();
    const complete = vi.fn();
    const diagnostic = vi.fn();
    const context = {
      input: INPUT,
      edition: { id: "primary-chibi" },
      complete,
      diagnostic,
      inputController,
      sessionMode: "playing",
      seed: 4,
    } as unknown as CartridgeGameConfigContext;
    const config = createRuneMatchCartridge().createGameConfig(context);
    const scene = config.scene as {
      create(this: unknown): void;
      update(this: unknown, time?: number, delta?: number): void;
      extend: {
        apkCaptureResponsiveState(): unknown;
        apkRestoreResponsiveState(state: unknown): void;
      };
    };
    const host = sceneHost();
    scene.create.call(host.host);

    inputController.setSnapshot(inputSnapshot({ pressed: ["ArrowRight"] }));
    scene.update.call(host.host, 0, 16);
    expect((scene.extend.apkCaptureResponsiveState() as { cursor: { col: number } }).cursor.col).toBe(1);

    const layout = getRuneMatchBoardLayout(960, 540, 8, 6);
    inputController.setSnapshot(inputSnapshot({
      pointer: {
        released: true,
        cancelled: true,
        x: layout.x + layout.cellSize / 2,
        y: layout.y + layout.cellSize / 2,
      },
    }));
    scene.update.call(host.host, 16, 16);
    expect((scene.extend.apkCaptureResponsiveState() as { selectedCell?: unknown }).selectedCell).toBeUndefined();

    inputController.setSnapshot(inputSnapshot({
      pointer: {
        released: true,
        x: layout.x + layout.cellSize / 2,
        y: layout.y + layout.cellSize / 2,
      },
    }));
    scene.update.call(host.host, 16, 16);
    expect((scene.extend.apkCaptureResponsiveState() as { selectedCell?: { row: number; col: number } }).selectedCell).toEqual({ row: 0, col: 0 });

    const captured = scene.extend.apkCaptureResponsiveState();
    scene.extend.apkRestoreResponsiveState(captured);
    host.emit("shutdown");
    expect(host.graphics.destroy).toHaveBeenCalledOnce();
    expect(host.texts.every((text) => text.destroy.mock.calls.length === 1)).toBe(true);
    expect((scene.extend.apkCaptureResponsiveState() as { destroyed: boolean }).destroyed).toBe(true);
    expect(complete).not.toHaveBeenCalled();
  });

  it("renders a prominent Thai target with readable English runes and no live instructions", () => {
    const inputController = mutableInput();
    const config = createRuneMatchCartridge().createGameConfig({
      input: [
        { term: "bridge", translation: "สะพาน" },
        { term: "forest", translation: "ป่า" },
        { term: "river", translation: "แม่น้ำ" },
      ],
      edition: { id: "compact" },
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      seed: 4,
    } as unknown as CartridgeGameConfigContext);
    const scene = config.scene as { create(this: unknown): void; extend: { apkCaptureResponsiveState(): { prompt: string; answer: string } } };
    const host = sceneHost(336);
    scene.create.call(host.host);

    expect(scene.extend.apkCaptureResponsiveState()).toMatchObject({ prompt: "สะพาน", answer: "bridge" });
    expect(host.texts[0]?.setText).toHaveBeenLastCalledWith("");
    expect(host.texts[1]?.setText).toHaveBeenLastCalledWith("สะพาน");
    expect(host.texts[1]?.setFontSize).toHaveBeenLastCalledWith(52);
    expect(host.texts[1]?.setWordWrapWidth).toHaveBeenLastCalledWith(900, true);
    const runeLabels = host.texts.slice(5).flatMap((text) => text.setText.mock.calls.map(([value]) => value));
    expect(runeLabels.some((value) => ["bridge", "forest", "river"].includes(String(value)))).toBe(true);
    for (const text of host.texts.slice(5)) expect(text.setFontSize).toHaveBeenLastCalledWith(35);
    const liveText = host.texts.flatMap((text) => text.setText.mock.calls.map(([value]) => String(value))).join(" ");
    expect(liveText).not.toMatch(/RUNE MATCH|Match the rune|Keyboard|WASD|Tap two adjacent/iu);
    expect(host.texts[4]?.setText).toHaveBeenLastCalledWith("");
  });

  it("omits compact actor decoration when the rune board has no side reserve", () => {
    const config = createRuneMatchCartridge().createGameConfig({
      input: INPUT,
      edition: { id: "compact" },
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController: mutableInput(),
      sessionMode: "playing",
      seed: 4,
      composition: { profile: "compact", width: 336, height: 733 },
    } as unknown as CartridgeGameConfigContext);
    const scene = config.scene as { create(this: unknown): void };
    const host = sceneHost(336, 336, 733);
    scene.create.call(host.host);

    const layout = getRuneMatchBoardLayout(336, 733, 8, 6);
    expect(layout.x - 18).toBeLessThan(120);
    expect(host.graphics.fillCircle).not.toHaveBeenCalled();
    expect(host.graphics.fillRoundedRect).toHaveBeenCalled();
    expect(host.texts[3]?.setText).toHaveBeenLastCalledWith(expect.stringContaining("♥"));
  });

  it("keeps tutorial actions outside production result delivery", () => {
    const complete = vi.fn();
    const cartridge = createRuneMatchCartridge();
    const inputController = mutableInput();
    cartridge.createGameConfig({
      input: INPUT,
      edition: {} as never,
      complete,
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "tutorial",
      seed: 7,
    });
    const step = cartridge.standardExperience.definition.tutorial.steps[1];
    if (!step) throw new Error("Expected a correct Rune Match tutorial step");

    cartridge.standardExperience.createTutorialActionDriver().execute({
      tutorial: cartridge.standardExperience.definition.tutorial,
      step,
      seed: cartridge.standardExperience.definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });

    expect(complete).not.toHaveBeenCalled();
  });

  it("damages the player during idle scene ticks", () => {
    const inputController = mutableInput();
    const context = {
      input: INPUT,
      edition: { id: "primary-chibi" },
      complete: vi.fn(),
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing",
      seed: 4,
    } as unknown as CartridgeGameConfigContext;
    const config = createRuneMatchCartridge().createGameConfig(context);
    const scene = config.scene as {
      create(this: unknown): void;
      update(this: unknown, time?: number, delta?: number): void;
      extend: { apkCaptureResponsiveState(): unknown };
    };
    const host = sceneHost();
    scene.create.call(host.host);

    scene.update.call(host.host, 0, 5000);

    expect((scene.extend.apkCaptureResponsiveState() as { player: { health: number } }).player.health).toBe(98);
    host.emit("shutdown");
  });

  it("delivers explicit victory and defeat outcomes through the cartridge context", () => {
    const createContext = (
      complete: ReturnType<typeof vi.fn>,
      inputController: APKInputController,
    ) => ({
      input: INPUT.slice(0, 1),
      edition: { id: "primary-chibi" },
      complete,
      diagnostic: vi.fn(),
      inputController,
      sessionMode: "playing" as const,
      seed: 11,
    }) as unknown as CartridgeGameConfigContext;
    const click = (
      scene: { update(this: unknown, time?: number, delta?: number): void },
      host: ReturnType<typeof sceneHost>,
      inputController: APKInputController & { setSnapshot(snapshot: APKInputSnapshot): void },
      cell: { row: number; col: number },
    ): void => {
      const layout = getRuneMatchBoardLayout(960, 540, 8, 6);
      inputController.setSnapshot(inputSnapshot({
        pointer: {
          released: true,
          x: layout.x + (cell.col + 0.5) * layout.cellSize,
          y: layout.y + (cell.row + 0.5) * layout.cellSize,
        },
      }));
      scene.update.call(host.host, 0, 16);
    };

    const victoryComplete = vi.fn();
    const victoryInput = mutableInput();
    const victoryConfig = createRuneMatchCartridge().createGameConfig(createContext(victoryComplete, victoryInput));
    const victoryScene = victoryConfig.scene as {
      create(this: unknown): void;
      update(this: unknown, time?: number, delta?: number): void;
      extend: { apkCaptureResponsiveState(): unknown };
    };
    const victoryHost = sceneHost();
    victoryScene.create.call(victoryHost.host);
    const victorySnapshot = victoryScene.extend.apkCaptureResponsiveState() as {
      grid: readonly (readonly RuneMatchRune[])[];
    };
    const targetRune = victorySnapshot.grid.flat().find((rune) => rune.type === "vocabulary");
    if (!targetRune || targetRune.type !== "vocabulary") throw new Error("Expected a vocabulary target rune");
    const victoryMove = findRuneMatchMove(victorySnapshot.grid, targetRune.wordId);
    if (!victoryMove) throw new Error("Expected a victory move");
    click(victoryScene, victoryHost, victoryInput, victoryMove[0]);
    click(victoryScene, victoryHost, victoryInput, victoryMove[1]);
    expect(victoryComplete).toHaveBeenCalledWith(expect.any(Object), "victory");
    victoryHost.emit("shutdown");

    const defeatComplete = vi.fn();
    const defeatInput = mutableInput();
    const defeatConfig = createRuneMatchCartridge().createGameConfig(createContext(defeatComplete, defeatInput));
    const defeatScene = defeatConfig.scene as {
      create(this: unknown): void;
      update(this: unknown, time?: number, delta?: number): void;
    };
    const defeatHost = sceneHost();
    defeatScene.create.call(defeatHost.host);
    for (let attack = 0; attack < 50; attack += 1) {
      defeatScene.update.call(defeatHost.host, attack * RUNE_MATCH_ATTACK_INTERVAL_MS, RUNE_MATCH_ATTACK_INTERVAL_MS);
    }
    expect(defeatComplete).toHaveBeenCalledWith(expect.any(Object), "defeat");
    defeatHost.emit("shutdown");
  });
});
