import { describe, expect, it, vi } from "vitest";

import { buildPotionRushPuzzleCartridge } from "./potion-rush-cartridge.js";

describe("Potion Rush puzzle cartridge", () => {
  it("binds the cauldron to its indexed customer, consumes ordered words, and serves remaining patience", () => {
    const complete = vi.fn();
    const session = buildPotionRushPuzzleCartridge().createSession([
      { term: "red potion", translation: "pocion roja" },
    ], complete);

    expect(session.snapshot()).toMatchObject({
      cauldrons: [{ status: "idle", customerIndex: 0 }],
      customers: [{ status: "waiting", patience: 60 }],
      claimIds: ["PR-CUR-005", "PR-CUR-008", "PR-CUR-010", "PR-CUR-011", "PR-CUR-013", "PR-CUR-014"],
    });
    expect(session.drop("potion")).toMatchObject({ status: "warning", wordIndex: 1 });
    expect(session.dump()).toMatchObject({ status: "idle", wordIndex: 0 });
    expect(session.drop("red")).toMatchObject({ status: "brewing", wordIndex: 1 });
    expect(session.drop("potion")).toMatchObject({ status: "completed", wordIndex: 2 });
    expect(session.serve()).toMatchObject({ status: "served", completedSentences: 1, score: 60 });
    expect(session.results()).toEqual({ accuracy: 2 / 3, xp: 5, score: 60, correctAnswers: 2, totalAttempts: 3 });
    expect(complete).toHaveBeenCalledTimes(1);
    expect(session.dispatchPhysicalInput({ modality: "pointer", phase: "drag", x: 0, y: 0, deltaX: 32 })).toEqual(["move-right"]);
  });

  it("expires waiting customers at zero patience, lowers reputation, and resets their cauldron", () => {
    const session = buildPotionRushPuzzleCartridge().createSession([
      { term: "red potion", translation: "pocion roja" },
    ]);

    session.drop("red");
    const expired = session.advancePatience(60);

    expect(expired).toMatchObject({
      reputation: 75,
      angryCustomers: 1,
      cauldrons: [{ status: "idle", customerIndex: 0 }],
      customers: [{ status: "leaving-angry", patience: 0 }],
      claimId: "PR-CUR-010",
    });
  });
});
