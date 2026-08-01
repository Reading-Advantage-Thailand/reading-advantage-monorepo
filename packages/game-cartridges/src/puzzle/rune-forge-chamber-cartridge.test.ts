import { describe, expect, it, vi } from "vitest";

import { buildRuneForgeChamberPuzzleCartridge } from "./rune-forge-chamber-cartridge.js";

describe("Rune Forge Chamber puzzle cartridge", () => {
  it("starts at source-bound health 100, applies damage 15 on mismatch, and reports one defeat result", () => {
    const complete = vi.fn();
    const session = buildRuneForgeChamberPuzzleCartridge().createSession([
      { term: "moon sun", translation: "luna sol" },
    ], complete);

    expect(session.snapshot()).toMatchObject({ health: 100, damagePerMismatch: 15, claimIds: ["RFC-CUR-011", "RFC-CUR-012", "RFC-CUR-013"] });
    expect(session.selectRune("moon")).toMatchObject({ status: "playing", targetIndex: 1 });
    expect(session.selectRune("sun")).toMatchObject({ status: "playing", level: 2, targetIndex: 0 });
    expect(session.selectRune("wrong")).toMatchObject({ status: "playing", health: 85 });
    session.selectRune("wrong");
    session.selectRune("wrong");
    session.selectRune("wrong");
    session.selectRune("wrong");
    session.selectRune("wrong");
    expect(session.selectRune("wrong")).toMatchObject({ status: "defeat", health: 0 });
    expect(session.results()).toEqual({ accuracy: 2 / 9, xp: 3, score: 20, correctAnswers: 2, totalAttempts: 9 });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(session.dispatchPhysicalInput({ modality: "pointer", phase: "down", x: 0, y: 0 })).toEqual(["confirm"]);
  });
});
