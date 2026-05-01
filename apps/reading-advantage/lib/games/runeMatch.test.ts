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
  it("increments attack timer", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    const newState = advanceTime(state, 1000);
    expect(newState.nextAttackTimer).toBe(1000);
  });

  it("triggers monster attack when timer exceeds interval", () => {
    const state = createRuneMatchState(SAMPLE_VOCAB);
    state.status = "playing";
    state.monster = { type: "goblin", hp: 50, maxHp: 50, attack: 10, xp: 3 };
    state.nextAttackTimer = 4500;
    const newState = advanceTime(state, 1000);

    expect(newState.nextAttackTimer).toBe(500);
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
    state.nextAttackTimer = 4500;

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
    expect(damage).toBe(6);
  });

  it("applies power rune multiplier", () => {
    const damage = calculateMatchDamage(3, true);
    expect(damage).toBe(12); // 6 * 2
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
