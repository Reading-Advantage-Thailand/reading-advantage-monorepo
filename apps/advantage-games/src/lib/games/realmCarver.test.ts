import {
  createRealmCarverState,
  tickRealmCarver,
  calculateXP,
  type SentenceItem,
  type RealmCarverState,
} from "./realmCarver";

const mockSentences: SentenceItem[] = [
  { term: "The", translation: "The" },
  { term: "cat", translation: "cat" },
  { term: "sits", translation: "sits" },
];

describe("createRealmCarverState", () => {
  it("should create initial state with default medium difficulty", () => {
    const state = createRealmCarverState(mockSentences);
    expect(state.difficulty).toBe("medium");
    expect(state.status).toBe("playing");
    expect(state.targetWordIndex).toBe(0);
    expect(state.score).toBe(0);
    expect(state.gameTime).toBe(0);
    expect(state.player.hp).toBe(3);
    expect(state.player.maxHp).toBe(3);
    expect(state.player.x).toBe(0);
    expect(state.player.y).toBe(0);
    expect(state.fullSentence).toEqual(mockSentences);
    expect(state.currentSentence).toEqual(mockSentences[0]);
    expect(state.words.length).toBe(3);
    expect(state.monsters.length).toBe(2); // medium default
    expect(state.grid.length).toBe(100);
    expect(state.grid[0][0]).toBe("claimed");
    expect(state.grid[50][50]).toBe("wild");
  });

  it("should allow easy difficulty with more hp and fewer monsters", () => {
    const state = createRealmCarverState(mockSentences, { difficulty: "easy" });
    expect(state.difficulty).toBe("easy");
    expect(state.player.hp).toBe(5);
    expect(state.player.maxHp).toBe(5);
    expect(state.monsters.length).toBe(1);
  });

  it("should allow hard difficulty with less hp and more monsters", () => {
    const state = createRealmCarverState(mockSentences, { difficulty: "hard" });
    expect(state.difficulty).toBe("hard");
    expect(state.player.hp).toBe(2);
    expect(state.player.maxHp).toBe(2);
    expect(state.monsters.length).toBe(4);
  });

  it("should default to medium for invalid difficulty", () => {
    const state = createRealmCarverState(mockSentences, { difficulty: "extreme" as any });
    expect(state.difficulty).toBe("medium");
  });

  it("should place words on the grid", () => {
    const state = createRealmCarverState(mockSentences);
    expect(state.words.length).toBe(3);
    state.words.forEach((word) => {
      expect(word.x).toBeGreaterThanOrEqual(0);
      expect(word.x).toBeLessThan(100);
      expect(word.y).toBeGreaterThanOrEqual(0);
      expect(word.y).toBeLessThan(100);
    });
  });
});

describe("tickRealmCarver", () => {
  it("should return same state if not playing", () => {
    const state = createRealmCarverState(mockSentences);
    state.status = "victory";
    const next = tickRealmCarver(state, 16);
    expect(next).toBe(state);
  });

  it("should move player when velocity is set", () => {
    let state = createRealmCarverState(mockSentences);
    state.player.vx = 1;
    state.player.vy = 0;
    const next = tickRealmCarver(state, 100);
    expect(next.player.x).toBeGreaterThan(state.player.x);
  });

  it("should leave trail on wild cells", () => {
    let state = createRealmCarverState(mockSentences);
    state.player.x = 10;
    state.player.y = 10;
    state.player.vx = 1;
    state.player.vy = 0;
    const next = tickRealmCarver(state, 100);
    const gridX = Math.round(next.player.x);
    const gridY = Math.round(next.player.y);
    expect(next.grid[gridY][gridX]).toBe("trail");
  });

  it("should damage player on trail collision and reset", () => {
    let state = createRealmCarverState(mockSentences);
    state.player.x = 10;
    state.player.y = 10;
    state.player.vx = 1;
    state.player.vy = 0;
    state.grid[10][25] = "trail";
    const next = tickRealmCarver(state, 100);
    expect(next.player.hp).toBe(state.player.hp - 1);
    expect(next.player.x).toBe(0);
    expect(next.player.y).toBe(0);
  });

  it("should set defeat when hp reaches 0", () => {
    let state = createRealmCarverState(mockSentences);
    state.player.hp = 1;
    state.player.x = 10;
    state.player.y = 10;
    state.player.vx = 1;
    state.player.vy = 0;
    state.grid[10][25] = "trail";
    const next = tickRealmCarver(state, 100);
    expect(next.status).toBe("defeat");
  });

  it("should claim territory when returning to claimed area with trail", () => {
    let state = createRealmCarverState(mockSentences);
    state.player.x = 1;
    state.player.y = 1;
    state.player.vx = 1;
    state.player.vy = 0;
    // Manually create a trail
    state.grid[1][2] = "trail";
    const next = tickRealmCarver(state, 1000);
    // Should convert trail to claimed
    expect(next.grid[1][2]).toBe("claimed");
  });

  it("should capture target word when claimed", () => {
    let state = createRealmCarverState(mockSentences);
    state.player.x = 1;
    state.player.y = 1;
    state.player.vx = 1;
    state.player.vy = 0;
    // Remove monsters so fillTerritory claims everything
    state.monsters = [];
    // Place first word on a cell we'll claim
    const targetWord = state.words.find(w => w.term === "The")!;
    targetWord.x = 5;
    targetWord.y = 5;
    // Set up trail and move to claimed
    state.grid[1][2] = "trail";
    const next = tickRealmCarver(state, 1000);
    expect(next.targetWordIndex).toBeGreaterThanOrEqual(1);
    expect(next.score).toBeGreaterThan(0);
  });

  it("should detect monster-trail collision", () => {
    let state = createRealmCarverState(mockSentences);
    state.player.x = 10;
    state.player.y = 10;
    state.player.vx = 0;
    state.player.vy = 0;
    // Place monster directly on a trail cell, zero velocity so it stays
    state.monsters[0].x = 10;
    state.monsters[0].y = 10;
    state.monsters[0].vx = 0;
    state.monsters[0].vy = 0;
    state.grid[10][10] = "trail";
    const next = tickRealmCarver(state, 16);
    expect(next.player.hp).toBe(state.player.hp - 1);
  });

  it("should move monsters", () => {
    let state = createRealmCarverState(mockSentences);
    const initialX = state.monsters[0].x;
    const next = tickRealmCarver(state, 1000);
    expect(next.monsters[0].x).not.toBe(initialX);
  });

  it("should bounce monsters off walls", () => {
    let state = createRealmCarverState(mockSentences);
    state.monsters[0].x = 0.5;
    state.monsters[0].vx = -1;
    const next = tickRealmCarver(state, 100);
    expect(next.monsters[0].vx).toBe(1);
  });

  it("should increment gameTime", () => {
    let state = createRealmCarverState(mockSentences);
    const next = tickRealmCarver(state, 16);
    expect(next.gameTime).toBe(16);
  });
});

describe("calculateXP", () => {
  it("should return 0 for zero attempts", () => {
    const xp = calculateXP({ targetWordIndex: 0, fullSentenceLength: 0, hp: 3, maxHp: 3, gameTime: 0 });
    expect(xp).toBe(0);
  });

  it("should calculate base XP from progress", () => {
    const xp = calculateXP({ targetWordIndex: 2, fullSentenceLength: 5, hp: 1, maxHp: 3, gameTime: 60000 });
    expect(xp).toBe(2); // base only, no bonuses
  });

  it("should add perfect accuracy bonus", () => {
    const xp = calculateXP({ targetWordIndex: 3, fullSentenceLength: 3, hp: 3, maxHp: 3, gameTime: 60000 });
    expect(xp).toBe(6); // 3 + 2 perfect + 1 survival
  });

  it("should add survival bonus for high health", () => {
    const xp = calculateXP({ targetWordIndex: 2, fullSentenceLength: 3, hp: 3, maxHp: 3, gameTime: 60000 });
    expect(xp).toBe(3); // 2 + 1 survival (no perfect, no speed)
  });

  it("should add speed bonus for fast completion", () => {
    const xp = calculateXP({ targetWordIndex: 3, fullSentenceLength: 3, hp: 3, maxHp: 3, gameTime: 15000 });
    expect(xp).toBe(7); // 3 + 2 perfect + 1 survival + 1 speed
  });

  it("should cap at 10 XP", () => {
    const xp = calculateXP({ targetWordIndex: 10, fullSentenceLength: 10, hp: 5, maxHp: 5, gameTime: 1000 });
    expect(xp).toBe(10);
  });

  it("should not add speed bonus for slow games", () => {
    const xp = calculateXP({ targetWordIndex: 3, fullSentenceLength: 3, hp: 3, maxHp: 3, gameTime: 60000 });
    expect(xp).toBe(6); // 3 + 2 perfect + 1 survival, no speed
  });

  it("should not add survival bonus for low health", () => {
    const xp = calculateXP({ targetWordIndex: 3, fullSentenceLength: 3, hp: 1, maxHp: 3, gameTime: 60000 });
    expect(xp).toBe(5); // 3 + 2 perfect, no survival
  });
});
