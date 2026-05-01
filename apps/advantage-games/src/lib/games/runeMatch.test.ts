import {
  createRuneMatchState,
  type Rune,
  initializeGrid,
  swapRunes,
  findMatches,
  processMatches,
  initializeEmptyGrid,
  calculateMatchDamage,
  applyMatchResult,
  type VocabularyRune,
  advanceTime,
  applyGravity,
  shuffleGrid,
  freezeMonster,
  findPossibleMoves,
} from "./runeMatch";
import { RUNE_MATCH_CONFIG } from "./runeMatchConfig";
import type { VocabularyItem } from "@/store/useGameStore";

const SAMPLE_VOCAB: VocabularyItem[] = [
  { term: "สวัสดี", translation: "Hello" },
  { term: "แมว", translation: "Cat" },
  { term: "หมา", translation: "Dog" },
  { term: "น้ำ", translation: "Water" },
  { term: "ข้าว", translation: "Rice" },
  { term: "รัก", translation: "Love" },
  { term: "บ้าน", translation: "House" },
  { term: "ต้นไม้", translation: "Tree" },
  { term: "พระอาทิตย์", translation: "Sun" },
  { term: "พระจันทร์", translation: "Moon" },
];

describe("advanceTime", () => {
  it("decrements attack timer", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 10, xp: 3 };
    const newState = advanceTime(state, 1000);
    expect(newState.nextAttackTimer).toBe(2000); // 3000 - 1000
  });

  it("triggers monster attack when timer exceeds interval", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 10, xp: 3 };
    state.nextAttackTimer = 500;
    const newState = advanceTime(state, 1000);

    // After attack, timer resets to 3000-5000 range
    expect(newState.nextAttackTimer).toBeGreaterThanOrEqual(3000);
    expect(newState.player.hp).toBeLessThan(100);
    expect(newState.floatingTexts.some((ft) => ft.text.startsWith("-"))).toBe(
      true,
    );
  });

  it("shield blocks monster attack and shows text", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 10, xp: 3 };
    state.player.hasShield = true;
    state.nextAttackTimer = 500;

    const newState = advanceTime(state, 1000);

    expect(newState.player.hp).toBe(100);
    expect(newState.player.hasShield).toBe(false);
    expect(newState.floatingTexts).toContainEqual(
      expect.objectContaining({ text: "BLOCKED!" }),
    );
  });
});

describe("combat logic", () => {
  it("calculates damage for a basic 2-match", () => {
    const damage = calculateMatchDamage(2, false);
    expect(damage).toBe(3);
  });

  it("calculates damage for a 3-match", () => {
    const damage = calculateMatchDamage(3, false);
    expect(damage).toBe(RUNE_MATCH_CONFIG.combat.match3Damage);
  });

  it("applies power rune multiplier", () => {
    const damage = calculateMatchDamage(3, true);
    expect(damage).toBe(RUNE_MATCH_CONFIG.combat.match3Damage * RUNE_MATCH_CONFIG.combat.powerRuneMultiplier);
  });

  it("updates monster HP in state", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 2, xp: 3 };
    state.grid = initializeEmptyGrid(SAMPLE_VOCAB);

    const result = {
      grid: state.grid,
      cascades: 1,
      groups: [
        {
          coords: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          isSpecial: false,
          type: "vocabulary" as const,
          wordId: (state.grid[0][0] as VocabularyRune).wordId,
          cascadeIndex: 0,
        },
      ],
    };

    const newState = applyMatchResult(state, result);
    expect(newState.monster?.hp).toBe(47); // 50 - 3 (base 2-match)
  });

  it("processes power-ups (heal)", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.player.hp = 50;
    state.grid = initializeEmptyGrid(SAMPLE_VOCAB);

    const result = {
      grid: state.grid,
      cascades: 1,
      groups: [
        {
          coords: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          isSpecial: false,
          type: "heal" as const,
          cascadeIndex: 0,
        },
      ],
    };

    state.grid[0][0] = { id: "h1", type: "heal" };
    state.grid[0][1] = { id: "h2", type: "heal" };

    const newState = applyMatchResult(state, result);
    expect(newState.player.hp).toBe(60); // 50 + (2 * 5)
    expect(newState.floatingTexts).toContainEqual(
      expect.objectContaining({ text: "+10" }),
    );
  });

  it("generates floating texts for damage", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 2, xp: 3 };
    state.grid = initializeEmptyGrid(SAMPLE_VOCAB);

    const result = {
      grid: state.grid,
      cascades: 1,
      groups: [
        {
          coords: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          isSpecial: false,
          type: "vocabulary" as const,
          wordId: (state.grid[0][0] as VocabularyRune).wordId,
          cascadeIndex: 0,
        },
      ],
    };

    const newState = applyMatchResult(state, result);
    expect(newState.floatingTexts).toContainEqual(
      expect.objectContaining({ text: "3" }),
    );
  });
});

describe("advanceTime", () => {
  it("processes a single match and returns cascade count of 1", () => {
    const grid = initializeEmptyGrid(SAMPLE_VOCAB);
    const rune = {
      id: "test",
      type: "vocabulary",
      wordId: "Hello",
      text: "สวัสดี",
    } as Rune;
    grid[5][0] = rune;
    grid[5][1] = rune;

    const result = processMatches(grid, SAMPLE_VOCAB);
    expect(result.cascades).toBe(1);
    expect(findMatches(result.grid)).toHaveLength(0);
  });
});

describe("findMatches", () => {
  it("finds horizontal matches (2+ runes)", () => {
    const grid = initializeEmptyGrid(SAMPLE_VOCAB);
    const rune = {
      id: "test",
      type: "vocabulary",
      wordId: "Hello",
      text: "สวัสดี",
    } as Rune;
    grid[0][0] = rune;
    grid[0][1] = rune;

    const groups = findMatches(grid);
    expect(groups.length).toBe(1);
    expect(groups[0].coords).toHaveLength(2);
  });

  it("detects L-shapes as special matches if 5+ runes", () => {
    const grid = initializeEmptyGrid(SAMPLE_VOCAB);
    const rune = {
      id: "test",
      type: "vocabulary",
      wordId: "Hello",
      text: "สวัสดี",
    } as Rune;
    // Horizontal 3
    grid[0][0] = rune;
    grid[0][1] = rune;
    grid[0][2] = rune;
    // Vertical 3 (intersecting at 0,0)
    grid[1][0] = rune;
    grid[2][0] = rune;

    const groups = findMatches(grid);
    expect(groups.length).toBe(1);
    expect(groups[0].coords).toHaveLength(5);
    expect(groups[0].isSpecial).toBe(true);
  });
});

describe("swapRunes", () => {
  it("swaps two runes in the grid", () => {
    const grid = initializeGrid(SAMPLE_VOCAB);
    const r1 = grid[0][0];
    const r2 = grid[0][1];
    const newGrid = swapRunes(grid, { row: 0, col: 0 }, { row: 0, col: 1 });
    expect(newGrid[0][0]).toBe(r2);
    expect(newGrid[0][1]).toBe(r1);
  });
});

describe("initializeGrid", () => {
  it("creates a grid with correct dimensions", () => {
    const grid = initializeGrid(SAMPLE_VOCAB);
    expect(grid.length).toBe(RUNE_MATCH_CONFIG.grid.rows);
    expect(grid[0].length).toBe(RUNE_MATCH_CONFIG.grid.columns);
  });
});

describe("createRuneMatchState", () => {
  it("creates initial state in selection screen", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    expect(state.status).toBe("selection");
  });
});

describe("initializeEmptyGrid", () => {
  it("creates a grid with vocabulary items", () => {
    const grid = initializeEmptyGrid(SAMPLE_VOCAB);
    expect(grid.length).toBe(RUNE_MATCH_CONFIG.grid.rows);
    expect(grid[0].length).toBe(RUNE_MATCH_CONFIG.grid.columns);
    expect(grid[0][0].type).toBe("vocabulary");
  });
});

describe("applyGravity", () => {
  it("fills empty spaces after matches", () => {
    const grid = initializeEmptyGrid(SAMPLE_VOCAB);
    const matchedCoords = [{ row: 0, col: 0 }, { row: 0, col: 1 }];
    const newGrid = applyGravity(grid, matchedCoords, SAMPLE_VOCAB);
    expect(newGrid[0][0]).not.toBeNull();
    expect(newGrid[0][1]).not.toBeNull();
  });
});

describe("processMatches", () => {
  it("processes matches and applies gravity", () => {
    const grid = initializeEmptyGrid(SAMPLE_VOCAB);
    const rune = {
      id: "test",
      type: "vocabulary",
      wordId: "Hello",
      text: "สวัสดี",
    } as Rune;
    grid[5][0] = rune;
    grid[5][1] = rune;

    const result = processMatches(grid, SAMPLE_VOCAB);
    expect(result.cascades).toBe(1);
    expect(findMatches(result.grid)).toHaveLength(0);
  });
});

describe("shuffleGrid", () => {
  it("shuffles the grid when shuffle is available", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.specialMoves.shuffle = 1;
    const originalGrid = state.grid;
    const newState = shuffleGrid(state);
    expect(newState.specialMoves.shuffle).toBe(0);
    expect(newState.floatingTexts.some((ft) => ft.text === "SHUFFLE!")).toBe(true);
  });

  it("does nothing when no shuffle available", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.specialMoves.shuffle = 0;
    const newState = shuffleGrid(state);
    expect(newState).toBe(state);
  });
});

describe("freezeMonster", () => {
  it("freezes the monster when freeze is available", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.specialMoves.freeze = 1;
    const newState = freezeMonster(state);
    expect(newState.isFrozen).toBe(true);
    expect(newState.specialMoves.freeze).toBe(0);
    expect(newState.floatingTexts.some((ft) => ft.text === "FROZEN!")).toBe(true);
  });

  it("does nothing when no freeze available", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.specialMoves.freeze = 0;
    const newState = freezeMonster(state);
    expect(newState).toBe(state);
  });
});

describe("findPossibleMoves", () => {
  it("finds at least one possible move in a valid grid", () => {
    const grid = initializeGrid(SAMPLE_VOCAB);
    const moves = findPossibleMoves(grid);
    expect(moves.length).toBeGreaterThan(0);
  });
});

describe("calculateMatchDamage", () => {
  it("calculates damage for a 4-match", () => {
    const damage = calculateMatchDamage(4, false);
    expect(damage).toBe(RUNE_MATCH_CONFIG.combat.match4Damage);
  });

  it("calculates damage for a 5+ match", () => {
    const damage = calculateMatchDamage(5, false);
    expect(damage).toBe(RUNE_MATCH_CONFIG.combat.match5Damage);
  });
});

describe("applyMatchResult", () => {
  it("sets victory when monster hp reaches 0", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 3, maxHp: 50, attack: 2, xp: 3 };
    state.grid = initializeEmptyGrid(SAMPLE_VOCAB);

    const result = {
      grid: state.grid,
      cascades: 1,
      groups: [
        {
          coords: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          isSpecial: false,
          type: "vocabulary" as const,
          wordId: (state.grid[0][0] as VocabularyRune).wordId,
          cascadeIndex: 0,
        },
      ],
    };

    const newState = applyMatchResult(state, result);
    expect(newState.status).toBe("victory");
    expect(newState.monsterState).toBe("death");
  });

  it("awards shield power-up", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 2, xp: 3 };
    state.grid = initializeEmptyGrid(SAMPLE_VOCAB);

    const result = {
      grid: state.grid,
      cascades: 1,
      groups: [
        {
          coords: [
            { row: 0, col: 0 },
            { row: 0, col: 1 },
          ],
          isSpecial: false,
          type: "shield" as const,
          cascadeIndex: 0,
        },
      ],
    };

    state.grid[0][0] = { id: "s1", type: "shield" };
    state.grid[0][1] = { id: "s2", type: "shield" };

    const newState = applyMatchResult(state, result);
    expect(newState.player.hasShield).toBe(true);
    expect(newState.floatingTexts).toContainEqual(
      expect.objectContaining({ text: "SHIELD!" }),
    );
  });

  it("adds cascade bonus for multiple cascades", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 2, xp: 3 };
    state.grid = initializeEmptyGrid(SAMPLE_VOCAB);

    const result = {
      grid: state.grid,
      cascades: 2,
      groups: [
        {
          coords: [{ row: 0, col: 0 }, { row: 0, col: 1 }],
          isSpecial: false,
          type: "vocabulary" as const,
          wordId: (state.grid[0][0] as VocabularyRune).wordId,
          cascadeIndex: 0,
        },
        {
          coords: [{ row: 1, col: 0 }, { row: 1, col: 1 }],
          isSpecial: false,
          type: "vocabulary" as const,
          wordId: (state.grid[1][0] as VocabularyRune).wordId,
          cascadeIndex: 1,
        },
      ],
    };

    const newState = applyMatchResult(state, result);
    expect(newState.floatingTexts.some((ft) => ft.text.includes("COMBO"))).toBe(true);
  });
});

describe("advanceTime", () => {
  it("decays monster state timer", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 2, xp: 3 };
    state.monsterState = "attack";
    state.monsterStateTimer = 300;
    const newState = advanceTime(state, 500);
    expect(newState.monsterState).toBe("idle");
    expect(newState.monsterStateTimer).toBe(0);
  });

  it("updates floating texts", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.floatingTexts = [
      {
        id: "test",
        text: "TEST",
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0,
        color: "#fff",
        opacity: 1,
        scale: 1,
        duration: 1000,
        maxDuration: 1000,
      },
    ];
    const newState = advanceTime(state, 500);
    expect(newState.floatingTexts[0].duration).toBe(500);
    expect(newState.floatingTexts[0].offsetX).toBeGreaterThan(0);
  });

  it("removes expired floating texts", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.floatingTexts = [
      {
        id: "test",
        text: "TEST",
        x: 0,
        y: 0,
        offsetX: 0,
        offsetY: 0,
        color: "#fff",
        opacity: 1,
        scale: 1,
        duration: 100,
        maxDuration: 1000,
      },
    ];
    const newState = advanceTime(state, 500);
    expect(newState.floatingTexts).toHaveLength(0);
  });

  it("does not attack when frozen", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 10, xp: 3 };
    state.isFrozen = true;
    state.nextAttackTimer = 500;
    const newState = advanceTime(state, 1000);
    expect(newState.player.hp).toBe(100);
    // Timer should not decrement when frozen
    expect(newState.nextAttackTimer).toBe(500);
  });
});
