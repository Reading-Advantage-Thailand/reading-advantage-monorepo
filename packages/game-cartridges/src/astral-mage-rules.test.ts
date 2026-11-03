import { describe, expect, it, vi } from "vitest";

import {
  chooseAstralMageCrystalFromPointer,
  createAstralMageController,
  getAstralMageCrystalPoints,
} from "./astral-mage.js";

const SENTENCES = [
  { term: "Stars guide", translation: "Estrellas guian" },
  { term: "Runes", translation: "Runas" },
];

describe("Astral Mage shot rules", () => {
  it("adds one echo decoy that borrows the next sentence word", () => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    expect(controller.snapshot().crystals).toEqual([
      { id: "word:0:0", label: "Stars" },
      { id: "word:0:1", label: "guide" },
      { id: "echo:0", label: "Runes" },
    ]);
  });

  it("wraps the last echo label back to the first word", () => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    controller.shoot("word:0:0");
    controller.shoot("word:0:1");
    expect(controller.snapshot().crystals.at(-1)).toEqual({ id: "echo:1", label: "Stars" });
  });

  it("rejects an unknown crystal without counting an attempt", () => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    const result = controller.shoot("word:1:0");
    expect(result).toMatchObject({ accepted: false, correct: false, completed: false });
    expect(controller.snapshot().totalAttempts).toBe(0);
  });

  it("counts a decoy and an out-of-order word as wrong attempts", () => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    expect(controller.shoot("echo:0")).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(controller.shoot("word:0:1")).toMatchObject({ accepted: true, correct: false });
    expect(controller.snapshot()).toMatchObject({ wordIndex: 0, score: 0, totalAttempts: 2, lastOutcome: "incorrect", nextCrystalId: "word:0:0" });
  });

  it("reports the ritual end, then the final result with xp", () => {
    const deliver = vi.fn();
    const controller = createAstralMageController(SENTENCES, deliver);
    controller.shoot("echo:0");
    expect(controller.shoot("word:0:0")).toMatchObject({ ritualCompleted: false, progressed: true });
    expect(controller.shoot("word:0:1")).toMatchObject({ ritualCompleted: true, completed: false, snapshot: { sentenceIndex: 1, wordIndex: 0 } });
    const last = controller.shoot("word:1:0");
    expect(last).toMatchObject({ ritualCompleted: true, completed: true, result: { correctAnswers: 3, totalAttempts: 4, score: 300, xp: 67 } });
    expect(deliver).toHaveBeenCalledTimes(1);
    expect(last.snapshot).toMatchObject({ phase: "complete", sentenceIndex: 2, prompt: "Runas" });
    expect(last.snapshot).not.toHaveProperty("nextCrystalId");
    expect(controller.shoot("word:1:0")).toMatchObject({ accepted: false, completed: true });
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("rejects shots after destroy and never delivers", () => {
    const deliver = vi.fn();
    const controller = createAstralMageController([SENTENCES[1]!], deliver);
    controller.destroy();
    controller.destroy();
    expect(controller.shoot("word:0:0")).toMatchObject({ accepted: false, completed: false });
    expect(deliver).not.toHaveBeenCalled();
    expect(controller.snapshot().destroyed).toBe(true);
  });

  it("rejects empty and blank sentence input", () => {
    expect(() => createAstralMageController([], vi.fn())).toThrow();
    expect(() => createAstralMageController([{ term: "   ", translation: "x" }], vi.fn())).toThrow();
  });
});

describe("Astral Mage restore", () => {
  it("restores mid-sentence progress and completes from it", () => {
    const deliver = vi.fn();
    const source = createAstralMageController(SENTENCES, vi.fn());
    source.shoot("echo:0");
    source.shoot("word:0:0");
    const target = createAstralMageController(SENTENCES, deliver);
    target.restore(source.capture());
    expect(target.snapshot()).toMatchObject({ sentenceIndex: 0, wordIndex: 1, correctAnswers: 1, totalAttempts: 2, score: 100, lastOutcome: "correct" });
    target.shoot("word:0:1");
    target.shoot("word:1:0");
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 3, totalAttempts: 4, score: 300 }));
  });

  it("restores a complete state without a second delivery", () => {
    const deliver = vi.fn();
    const source = createAstralMageController(SENTENCES, vi.fn());
    for (const id of ["word:0:0", "word:0:1", "word:1:0"]) source.shoot(id);
    const target = createAstralMageController(SENTENCES, deliver);
    target.restore(source.capture());
    expect(target.snapshot()).toMatchObject({ phase: "complete", sentenceIndex: 2, score: 300 });
    expect(target.shoot("word:1:0").accepted).toBe(false);
    expect(deliver).not.toHaveBeenCalled();
  });

  it.each([
    ["a negative sentence", { sentenceIndex: -1 }],
    ["a word past the sentence end", { wordIndex: 2 }],
    ["a complete phase with an open sentence", { phase: "complete" }],
    ["a complete phase with a word index", { phase: "complete", sentenceIndex: 2, wordIndex: 1 }],
    ["a non-numeric sentence", { sentenceIndex: Number.NaN }],
  ])("rejects %s as invalid progress", (_label, patch) => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    expect(() => controller.restore({ ...controller.capture(), ...patch } as never)).toThrow("invalid sentence progress");
  });

  it.each([
    ["inflated correct answers", { correctAnswers: 1 }],
    ["fewer attempts than progress", { wordIndex: 1, correctAnswers: 1, score: 100, totalAttempts: 0 }],
    ["a score that does not match progress", { score: 50 }],
  ])("rejects %s as invalid counters", (_label, patch) => {
    const controller = createAstralMageController(SENTENCES, vi.fn());
    expect(() => controller.restore({ ...controller.capture(), ...patch })).toThrow("invalid result counters");
  });

  it("seals delivery when a destroyed state is restored and ignores later restores", () => {
    const deliver = vi.fn();
    const controller = createAstralMageController([SENTENCES[1]!], deliver);
    controller.restore({ ...controller.capture(), destroyed: true });
    controller.restore({ ...controller.capture(), destroyed: false });
    expect(controller.snapshot().destroyed).toBe(true);
    expect(controller.shoot("word:0:0").accepted).toBe(false);
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe("Astral Mage arena geometry", () => {
  it("returns no points for no crystals", () => {
    expect(getAstralMageCrystalPoints([], 960, 540)).toEqual([]);
  });

  it("places the first crystal straight above the arena center", () => {
    const [first] = getAstralMageCrystalPoints([{ id: "a", label: "A" }, { id: "b", label: "B" }], 960, 540);
    expect(first!.x).toBeCloseTo(480);
    expect(first!.y).toBeCloseTo(540 * 0.51 - 540 * 0.29);
  });

  it("picks the nearest crystal inside the hit radius and nothing outside it", () => {
    const crystals = [{ id: "a", label: "A" }, { id: "b", label: "B" }];
    const [, second] = getAstralMageCrystalPoints(crystals, 960, 540);
    expect(chooseAstralMageCrystalFromPointer(second!.x + 30, second!.y, crystals, 960, 540)).toBe("b");
    expect(chooseAstralMageCrystalFromPointer(480, 275.4, crystals, 960, 540)).toBeUndefined();
    expect(chooseAstralMageCrystalFromPointer(0, 0, [], 960, 540)).toBeUndefined();
  });
});
