import { gameResultsSchema } from "@reading-advantage/game-contracts";
import { describe, expect, it } from "vitest";

import {
  advanceGriffinRiders,
  createGriffinRidersState,
  GRIFFIN_COLLISION_LINE,
  moveGriffinLane,
} from "./systems";

const sentences = [
  { term: "The griffin flies", translation: "กริฟฟินบิน" },
  { term: "Reach golden gates", translation: "ไปถึงประตูสีทอง" },
] as const;
const crossingDelta = ((GRIFFIN_COLLISION_LINE - 100) / 95) * 1_000;

describe("Griffin Riders Escape systems", () => {
  it("creates one deterministic correct gate, decoy, and obstacle", () => {
    const first = createGriffinRidersState(sentences, 43);
    expect(first).toEqual(createGriffinRidersState(sentences, 43));
    expect(first.targets.map(({ lane }) => lane)).toEqual([0, 1, 2]);
    expect(first.targets.map(({ kind }) => kind).sort()).toEqual(
      ["correct", "decoy", "obstacle"].sort(),
    );
    expect(first.translation).toBe("กริฟฟินบิน");
  });

  it("moves through bounded lanes without wrapping", () => {
    let state = createGriffinRidersState(sentences, 7);
    state = moveGriffinLane(state, "left");
    state = moveGriffinLane(state, "left");
    expect(state.playerLane).toBe(0);
    state = moveGriffinLane(state, "right");
    expect(state.playerLane).toBe(1);
  });

  it("resolves an obstacle collision and respawns the same ordered target", () => {
    let state = createGriffinRidersState(sentences, 17);
    const obstacleLane = state.targets.find(({ kind }) => kind === "obstacle")!.lane;
    while (state.playerLane < obstacleLane) state = moveGriffinLane(state, "right");
    while (state.playerLane > obstacleLane) state = moveGriffinLane(state, "left");
    const collided = advanceGriffinRiders(state, crossingDelta);
    expect(collided).toMatchObject({
      targetIndex: 0,
      lives: 2,
      combo: 0,
      score: -20,
      totalAttempts: 1,
      lastOutcome: "obstacle",
    });
    expect(collided.targets[0]!.position).toBe(100);
  });

  it("clears ordered gates and emits the exact result ABI", () => {
    let state = createGriffinRidersState(sentences, 29);
    while (!state.complete) {
      const correctLane = state.targets.find(({ kind }) => kind === "correct")!.lane;
      while (state.playerLane < correctLane) state = moveGriffinLane(state, "right");
      while (state.playerLane > correctLane) state = moveGriffinLane(state, "left");
      state = advanceGriffinRiders(state, crossingDelta);
    }
    expect(state.victory).toBe(true);
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
    expect(() => createGriffinRidersState(input, 1)).toThrow();
  });
});
