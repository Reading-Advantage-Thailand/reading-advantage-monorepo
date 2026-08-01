import { describe, expect, it, vi } from "vitest";

import { buildRuneMatchPuzzleCartridge } from "./rune-match-cartridge.js";

describe("Rune Match puzzle cartridge", () => {
  it("initializes the source-bound six-by-eight grid and records the matched-group learning loop", () => {
    const complete = vi.fn();
    const session = buildRuneMatchPuzzleCartridge().createSession([
      { term: "moon", translation: "luna" },
      { term: "sun", translation: "sol" },
    ], complete);
    const initial = buildRuneMatchPuzzleCartridge().createSession([
      { term: "moon", translation: "luna" },
      { term: "sun", translation: "sol" },
      { term: "star", translation: "estrella" },
    ]).snapshot();
    expect(initial.grid).toHaveLength(8);
    expect(initial.grid.every((row) => row.length === 6)).toBe(true);
    expect(initial.claimIds).toEqual(["RM-CONFIG-001", "RM-MECH-002", "RM-MECH-003", "RM-MECH-004"]);

    expect(session.resolveGroup("moon", 1)).toMatchObject({ status: "playing", targetIndex: 0 });
    expect(session.resolveGroup("sun", 2)).toMatchObject({ status: "playing", targetIndex: 0 });
    expect(session.resolveGroup("moon", 2)).toMatchObject({ status: "playing", targetIndex: 1 });
    expect(session.resolveGroup("sun", 3)).toMatchObject({ status: "victory", targetIndex: 2 });
    expect(session.results()).toEqual({ accuracy: 2 / 4, xp: 7, score: 50, correctAnswers: 2, totalAttempts: 4 });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(session.dispatchPhysicalInput({ modality: "pointer", phase: "down", x: 0, y: 0 })).toEqual(["confirm"]);
  });

  it("resolves source-shaped matches with gravity and records each cascade", () => {
    const session = buildRuneMatchPuzzleCartridge().createSession([
      { term: "moon", translation: "luna" },
      { term: "sun", translation: "sol" },
      { term: "star", translation: "estrella" },
    ]);
    const board = Array.from({ length: 8 }, (_, row) => Array.from(
      { length: 6 },
      (_, column) => ["moon", "sun", "star"][(row + column) % 3]!,
    ));
    board[0]![0] = "moon";
    board[0]![1] = "moon";

    const cascade = session.resolveCascade(board);

    expect(cascade.cascades).toBeGreaterThanOrEqual(1);
    expect(cascade.groups[0]).toMatchObject({ cascadeIndex: 0, size: 2, claimId: "RM-MECH-003" });
    expect(cascade.claimId).toBe("RM-MECH-004");
    expect(cascade.grid).toHaveLength(8);
  });
});
