import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  advanceStormCastle,
  collectStormWindow,
  createStormCastleState,
  moveStormPlayer,
} from "./systems";

const sentences = [
  { term: "The bird flies", translation: "นกบิน" },
  { term: "Sun shines bright", translation: "ดวงอาทิตย์ส่องแสง" },
] as const;

function moveToWindow(state: ReturnType<typeof createStormCastleState>, wordIndex: number) {
  const window = state.windows.find((candidate) => candidate.wordIndex === wordIndex)!;
  while (state.player.column < window.column) state = moveStormPlayer(state, "right");
  while (state.player.column > window.column) state = moveStormPlayer(state, "left");
  while (state.player.row < window.row) state = moveStormPlayer(state, "up");
  while (state.player.row > window.row) state = moveStormPlayer(state, "down");
  return state;
}

describe("Storm Castle Tower systems", () => {
  it("creates deterministic ordered windows with stable meaning", () => {
    const first = createStormCastleState(sentences, 47);
    expect(first).toEqual(createStormCastleState(sentences, 47));
    expect(first.windows.map(({ row }) => row)).toEqual([2, 5, 8]);
    expect(first.translation).toBe("นกบิน");
  });

  it("moves on a bounded four-column vertical grid", () => {
    let state = createStormCastleState(sentences, 11);
    state = moveStormPlayer(state, "left");
    state = moveStormPlayer(state, "left");
    expect(state.player.column).toBe(0);
    state = moveStormPlayer(state, "down");
    expect(state.player.row).toBe(0);
    state = moveStormPlayer(state, "up");
    expect(state.player.row).toBe(1);
  });

  it("closes a wrong window and advances only the ordered target", () => {
    let state = createStormCastleState(sentences, 23);
    state = moveToWindow(state, 1);
    state = collectStormWindow(state);
    expect(state).toMatchObject({
      targetIndex: 0,
      lives: 2,
      score: -20,
      totalAttempts: 1,
      lastOutcome: "incorrect",
    });
    expect(state.windows.find(({ wordIndex }) => wordIndex === 1)?.state).toBe("closed");
  });

  it("spawns deterministic hazards and resolves a falling collision", () => {
    let state = createStormCastleState(sentences, 31);
    state = advanceStormCastle(state, 2_000);
    expect(state.hazards).toHaveLength(1);
    const hazard = state.hazards[0]!;
    while (state.player.column < hazard.column) state = moveStormPlayer(state, "right");
    while (state.player.column > hazard.column) state = moveStormPlayer(state, "left");
    state = advanceStormCastle(state, 4_000);
    expect(state.lives).toBe(2);
    expect(state.lastOutcome).toBe("hazard");
  });

  it("collects both sentence towers and emits the exact result ABI", () => {
    let state = createStormCastleState(sentences, 37);
    while (!state.complete) {
      state = moveToWindow(state, state.targetIndex);
      state = collectStormWindow(state);
    }
    expect(state.victory).toBe(true);
    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 1,
      xp: 60,
      score: 600,
      correctAnswers: 6,
      totalAttempts: 6,
    });
  });

  it.each([
    ["empty", []],
    ["blank term", [{ term: " ", translation: "meaning" }]],
    ["blank translation", [{ term: "Valid words", translation: " " }]],
  ])("rejects %s input", (_label, input) => {
    expect(() => createStormCastleState(input, 1)).toThrow();
  });
});
