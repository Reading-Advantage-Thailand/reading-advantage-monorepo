import {
  BABEL_ARCHITECT_DIFFICULTY,
  completeBabelArchitectRun,
  createBabelArchitectState,
  getExpectedWord,
  placeBabelArchitectBlock,
  tickBabelArchitect,
} from "../babelArchitect";

const sentences = [
  { term: "The tower rises", translation: "หอคอยสูงขึ้น" },
  { term: "Stone blocks balance", translation: "ก้อนหินสมดุล" },
];

describe("babelArchitect logic", () => {
  it("splits the active sentence into ordered word blocks", () => {
    const state = createBabelArchitectState(sentences, { difficulty: "normal" });

    expect(state.blocks.map((block) => block.word)).toEqual(["The", "tower", "rises"]);
    expect(state.blocks.map((block) => block.order)).toEqual([0, 1, 2]);
    expect(getExpectedWord(state)).toBe("The");
    expect(state.targetTranslation).toBe("หอคอยสูงขึ้น");
  });

  it("advances progress and stabilizes the tower on correct placement", () => {
    const state = createBabelArchitectState(sentences, { difficulty: "normal" });
    const next = placeBabelArchitectBlock(state, state.blocks[0].id);

    expect(next.progressIndex).toBe(1);
    expect(next.correctAnswers).toBe(1);
    expect(next.totalAttempts).toBe(1);
    expect(next.stability).toBeGreaterThanOrEqual(state.stability);
    expect(next.placedBlocks).toHaveLength(1);
    expect(next.feedback).toMatchObject({ kind: "correct", word: "The" });
  });

  it("marks incorrect blocks unstable and reduces stability", () => {
    const state = createBabelArchitectState(sentences, { difficulty: "normal" });
    const wrong = state.blocks.find((block) => block.word === "tower");
    expect(wrong).toBeDefined();

    const next = placeBabelArchitectBlock(state, wrong!.id);

    expect(next.progressIndex).toBe(0);
    expect(next.correctAnswers).toBe(0);
    expect(next.totalAttempts).toBe(1);
    expect(next.errors).toBe(1);
    expect(next.stability).toBeLessThan(state.stability);
    expect(next.placedBlocks[0]).toMatchObject({ word: "tower", stable: false });
    expect(next.feedback).toMatchObject({ kind: "incorrect", expectedWord: "The", word: "tower" });
  });

  it("uses difficulty presets for timing, drop speed, and error tolerance", () => {
    expect(BABEL_ARCHITECT_DIFFICULTY.easy.dropSpeed).toBeLessThan(BABEL_ARCHITECT_DIFFICULTY.normal.dropSpeed);
    expect(BABEL_ARCHITECT_DIFFICULTY.hard.dropSpeed).toBeGreaterThan(BABEL_ARCHITECT_DIFFICULTY.normal.dropSpeed);
    expect(BABEL_ARCHITECT_DIFFICULTY.easy.maxErrors).toBeGreaterThan(BABEL_ARCHITECT_DIFFICULTY.hard.maxErrors);
    expect(BABEL_ARCHITECT_DIFFICULTY.hard.timeLimitMs).toBeLessThan(BABEL_ARCHITECT_DIFFICULTY.normal.timeLimitMs);
  });

  it("ticks time, degrades stability slowly, and defeats on timeout", () => {
    const state = createBabelArchitectState(sentences, { difficulty: "hard", nowMs: 1_000 });
    const ticked = tickBabelArchitect(state, 1_000);

    expect(ticked.elapsedMs).toBe(1_000);
    expect(ticked.stability).toBeLessThan(state.stability);
    expect(ticked.phase).toBe("playing");

    const defeated = tickBabelArchitect(state, BABEL_ARCHITECT_DIFFICULTY.hard.timeLimitMs + 1);
    expect(defeated.phase).toBe("defeat");
    expect(defeated.feedback?.kind).toBe("timeout");
  });

  it("advances to the next sentence and completes with summary inputs", () => {
    let state = createBabelArchitectState([{ term: "Build high", translation: "สร้างให้สูง" }], {
      difficulty: "easy",
      nowMs: 10_000,
    });

    for (const block of state.blocks) {
      state = placeBabelArchitectBlock(state, block.id, { nowMs: 20_000 });
    }

    expect(state.phase).toBe("victory");
    expect(state.score).toBeGreaterThan(0);

    const summary = completeBabelArchitectRun(state, { nowMs: 25_000 });
    expect(summary).toMatchObject({
      gameType: "babel-architect",
      difficulty: "easy",
      correctAnswers: 2,
      totalAttempts: 2,
      victory: true,
      accuracy: 1,
    });
    expect(summary.duration).toBe(15_000);
    expect(summary.idempotencyKey).toMatch(/[0-9a-f-]{36}/);
  });
});
