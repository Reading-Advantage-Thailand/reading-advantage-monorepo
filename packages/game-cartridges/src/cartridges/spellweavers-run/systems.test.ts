import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  advanceSpellweaversRun,
  collectSpellweaverLane,
  createSpellweaversRunState,
  SPELLWEAVER_COLLECTION_START,
} from "./systems";

const sentences = [
  { term: "The cat sits", translation: "แมวนั่ง" },
  { term: "We play together", translation: "พวกเราเล่นด้วยกัน" },
] as const;

function readyState(seed = 11) {
  let state = createSpellweaversRunState(sentences, seed);
  state = advanceSpellweaversRun(
    state,
    ((SPELLWEAVER_COLLECTION_START - state.orb.position) / 110) * 1_000,
  );
  return state;
}

describe("Spellweavers Run systems", () => {
  it("creates a deterministic orb lane and preserves the meaning prompt", () => {
    expect(createSpellweaversRunState(sentences, 19)).toEqual(
      createSpellweaversRunState(sentences, 19),
    );
    const state = createSpellweaversRunState(sentences, 19);
    expect(state.translation).toBe("แมวนั่ง");
    expect(state.orb.word).toBe("The");
    expect(state.orb.lane).toBeGreaterThanOrEqual(0);
    expect(state.orb.lane).toBeLessThanOrEqual(2);
  });

  it("ignores early input and penalizes a wrong lane in the zone", () => {
    const initial = createSpellweaversRunState(sentences, 23);
    expect(collectSpellweaverLane(initial, initial.orb.lane)).toBe(initial);
    const ready = readyState(23);
    const wrongLane = (ready.orb.lane + 1) % 3;
    expect(collectSpellweaverLane(ready, wrongLane)).toMatchObject({
      targetIndex: 0,
      mana: 75,
      combo: 0,
      score: -20,
      totalAttempts: 1,
      lastOutcome: "incorrect",
    });
  });

  it("counts a missed crossing and respawns the same ordered word", () => {
    const initial = createSpellweaversRunState(sentences, 31);
    const missed = advanceSpellweaversRun(initial, 4_000);
    expect(missed).toMatchObject({
      targetIndex: 0,
      mana: 90,
      totalAttempts: 1,
      lastOutcome: "missed",
    });
    expect(missed.orb.word).toBe(initial.orb.word);
    expect(initial.orb.position).toBe(120);
  });

  it("builds both sentences in order and emits the exact result ABI", () => {
    let state = createSpellweaversRunState(sentences, 37);
    while (!state.complete) {
      state = advanceSpellweaversRun(
        state,
        ((SPELLWEAVER_COLLECTION_START - state.orb.position) / 110) * 1_000,
      );
      state = collectSpellweaverLane(state, state.orb.lane);
    }
    expect(state.victory).toBe(true);
    expect(state.correctAnswers).toBe(6);
    expect(gameResultsSchema.parse(state.results)).toEqual({
      accuracy: 1,
      xp: 97,
      score: 975,
      correctAnswers: 6,
      totalAttempts: 6,
    });
  });

  it.each([
    ["empty", []],
    ["blank term", [{ term: " ", translation: "meaning" }]],
    ["blank translation", [{ term: "Valid words", translation: " " }]],
  ])("rejects %s input", (_label, input) => {
    expect(() => createSpellweaversRunState(input, 1)).toThrow();
  });
});
