import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  advanceDragonRiderTime,
  chooseDragonRiderGate,
  createDragonRiderState,
  getDragonRiderGateLabel,
  resolveDragonRiderBoss,
} from "./systems";

const vocabulary = [
  { term: "สวัสดี", translation: "Hello" },
  { term: "ขอบคุณ", translation: "Thank you" },
  { term: "หนังสือ", translation: "Book" },
  { term: "ดวงจันทร์", translation: "Moon" },
] as const;

describe("Dragon Rider systems", () => {
  it("builds stable two-gate rounds with one correct translation", () => {
    const first = createDragonRiderState(vocabulary, 41);
    const second = createDragonRiderState(vocabulary, 41);
    expect(first).toEqual(second);
    expect(first.rounds).toHaveLength(vocabulary.length);
    for (const round of first.rounds) {
      expect(round.gates).toHaveLength(2);
      expect(round.gates.filter(({ correct }) => correct)).toHaveLength(1);
      expect(round.gates.map(({ lane }) => lane)).toEqual([0, 1]);
      expect(getDragonRiderGateLabel(round, 0)).not.toBe("");
      expect(getDragonRiderGateLabel(round, 1)).not.toBe("");
    }
  });

  it("grows and shrinks the flight while advancing every resolved gate", () => {
    const initial = createDragonRiderState(vocabulary, 17);
    const firstRound = initial.rounds[0]!;
    const correctLane = firstRound.gates.find(({ correct }) => correct)!.lane;
    const wrongLane = firstRound.gates.find(({ correct }) => !correct)!.lane;
    const afterWrong = chooseDragonRiderGate(initial, wrongLane);
    expect(afterWrong).toMatchObject({
      roundIndex: 1,
      dragonCount: 1,
      score: -20,
      correctAnswers: 0,
      totalAttempts: 1,
      lastAnswerCorrect: false,
    });
    expect(chooseDragonRiderGate(initial, 99)).toBe(initial);
    const afterCorrect = chooseDragonRiderGate(initial, correctLane);
    expect(afterCorrect).toMatchObject({
      roundIndex: 1,
      dragonCount: 2,
      score: 100,
      correctAnswers: 1,
      totalAttempts: 1,
      lastAnswerCorrect: true,
    });
  });

  it("enters the boss phase and emits the exact five-field result once resolved", () => {
    let state = createDragonRiderState(vocabulary, 29);
    state = advanceDragonRiderTime(state, 1_250);
    while (state.phase === "running") {
      const round = state.rounds[state.roundIndex]!;
      const correctLane = round.gates.find(({ correct }) => correct)!.lane;
      state = chooseDragonRiderGate(state, correctLane);
    }
    expect(state.phase).toBe("boss");
    expect(state.elapsedMs).toBe(1_250);
    state = resolveDragonRiderBoss(state);
    expect(state.victory).toBe(true);
    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 1,
      xp: 40,
      score: 400,
      correctAnswers: 4,
      totalAttempts: 4,
    });
    expect(Object.keys(state.results!).sort()).toEqual(
      ["accuracy", "xp", "score", "correctAnswers", "totalAttempts"].sort(),
    );
    expect(resolveDragonRiderBoss(state)).toBe(state);
  });

  it.each([
    ["empty input", []],
    ["one item", [{ term: "one", translation: "uno" }]],
    ["blank term", [{ term: " ", translation: "one" }, { term: "two", translation: "two" }]],
    ["duplicate translations", [{ term: "one", translation: "same" }, { term: "two", translation: "same" }]],
  ])("rejects %s", (_label, input) => {
    expect(() => createDragonRiderState(input, 1)).toThrow();
  });
});
