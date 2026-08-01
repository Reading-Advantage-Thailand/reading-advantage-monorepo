import { describe, expect, it, vi } from "vitest";

import { buildAlchemistsSynthesisPuzzleCartridge } from "./alchemists-synthesis-cartridge.js";

describe("Alchemist's Synthesis puzzle cartridge", () => {
  it("runs the deterministic five-round easy learning loop and returns the exact source result policy with claim IDs", () => {
    const complete = vi.fn();
    const session = buildAlchemistsSynthesisPuzzleCartridge().createSession([
      { term: "moon", translation: "luna" },
      { term: "sun", translation: "sol" },
    ], "easy", complete);

    session.answer("moon");
    session.answer("wrong");
    session.answer("moon");
    session.answer("wrong");
    expect(session.answer("moon")).toMatchObject({ status: "victory", round: 5, correctAnswers: 3 });
    expect(session.resultPolicy).toEqual({
      claimIds: ["AS-TRANS-002", "AS-RESULT-001"],
      formula: "floor(correctAnswers * accuracy)",
    });
    expect(session.results()).toEqual({ accuracy: 3 / 5, xp: 1, score: 30, correctAnswers: 3, totalAttempts: 5 });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(session.dispatchPhysicalInput({ modality: "keyboard", code: "Enter" })).toEqual(["confirm"]);
  });
});
