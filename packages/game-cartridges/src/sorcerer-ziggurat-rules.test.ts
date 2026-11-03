import { describe, expect, it, vi } from "vitest";

import {
  chooseZigguratDirectionFromPointer,
  createSorcererZigguratController,
  type ZigguratDirection,
} from "./sorcerer-ziggurat.js";

const SENTENCES = [
  { term: "Climb the stairs", translation: "Sube las escaleras" },
  { term: "Rise up", translation: "Levantate" },
];

/**
 * Returns the correct direction for the current controller step.
 * @param controller Controller under test.
 * @returns The direction that carries the expected word.
 */
function correct(controller: ReturnType<typeof createSorcererZigguratController>): ZigguratDirection {
  return controller.snapshot().runes.correctDirection;
}

/**
 * Returns one direction that is not the current correct direction.
 * @param controller Controller under test.
 * @returns A decoy direction.
 */
function wrong(controller: ReturnType<typeof createSorcererZigguratController>): ZigguratDirection {
  return correct(controller) === "left" ? "right" : "left";
}

describe("Sorcerer's Ziggurat word choice", () => {
  it("cycles the correct direction from the seed, sentence, and word", () => {
    const controller = createSorcererZigguratController(SENTENCES, vi.fn(), 0);
    const directions: ZigguratDirection[] = [];
    for (let step = 0; step < 5; step += 1) {
      directions.push(correct(controller));
      controller.step(correct(controller));
    }
    expect(directions).toEqual(["left", "right", "forward", "forward", "left"]);
  });

  it("normalizes a negative fractional seed to its truncated absolute value", () => {
    const a = createSorcererZigguratController(SENTENCES, vi.fn(), -4.9);
    const b = createSorcererZigguratController(SENTENCES, vi.fn(), 4);
    expect(a.snapshot().runes).toEqual(b.snapshot().runes);
    expect(correct(b)).toBe("forward");
  });

  it.each([Number.NaN, Number.POSITIVE_INFINITY])("rejects the seed %s", (seed) => {
    expect(() => createSorcererZigguratController(SENTENCES, vi.fn(), seed)).toThrow("seed must be finite");
  });

  it("labels the correct rune with the expected word and decoys with the next words", () => {
    const runes = createSorcererZigguratController(SENTENCES, vi.fn(), 0).snapshot().runes;
    expect(runes).toEqual({ left: "Climb", forward: "the", right: "stairs", correctDirection: "left" });
  });

  it("wraps decoy labels around to the first word on the last step", () => {
    const controller = createSorcererZigguratController(SENTENCES, vi.fn(), 0);
    for (let step = 0; step < 4; step += 1) controller.step(correct(controller));
    expect(controller.snapshot().runes).toEqual({ left: "up", forward: "Climb", right: "the", correctDirection: "left" });
  });

  it("maps pointer thirds to left, forward, and right", () => {
    expect(chooseZigguratDirectionFromPointer(319, 960)).toBe("left");
    expect(chooseZigguratDirectionFromPointer(320, 960)).toBe("forward");
    expect(chooseZigguratDirectionFromPointer(640, 960)).toBe("forward");
    expect(chooseZigguratDirectionFromPointer(641, 960)).toBe("right");
  });
});

describe("Sorcerer's Ziggurat scoring and end state", () => {
  it("counts a wrong rune as an attempt without score or climb", () => {
    const controller = createSorcererZigguratController(SENTENCES, vi.fn(), 0);
    expect(controller.step(wrong(controller))).toMatchObject({ accepted: true, correct: false, progressed: false });
    expect(controller.snapshot()).toMatchObject({ wordIndex: 0, score: 0, totalAttempts: 1, lastOutcome: "incorrect" });
  });

  it("delivers one result with xp after both rituals", () => {
    const deliver = vi.fn();
    const controller = createSorcererZigguratController(SENTENCES, deliver, 0);
    controller.step(wrong(controller));
    controller.step(correct(controller));
    controller.step(correct(controller));
    expect(controller.step(correct(controller))).toMatchObject({ ritualCompleted: true, completed: false, snapshot: { sentenceIndex: 1 } });
    controller.step(correct(controller));
    const last = controller.step(correct(controller));
    expect(last).toMatchObject({ completed: true, result: { correctAnswers: 5, totalAttempts: 6, score: 500, xp: 108 } });
    expect(last.snapshot).toMatchObject({ phase: "complete", sentenceIndex: 2, wordIndex: 0, prompt: "Levantate" });
    expect(controller.step("left")).toMatchObject({ accepted: false, completed: true });
    expect(deliver).toHaveBeenCalledTimes(1);
  });

  it("ignores steps after destroy and never delivers", () => {
    const deliver = vi.fn();
    const controller = createSorcererZigguratController([{ term: "Go", translation: "Ve" }], deliver, 0);
    controller.destroy();
    controller.destroy();
    expect(controller.step("left")).toMatchObject({ accepted: false, completed: false });
    expect(deliver).not.toHaveBeenCalled();
  });
});

describe("Sorcerer's Ziggurat restore", () => {
  it("restores progress and finishes with the restored counters", () => {
    const deliver = vi.fn();
    const source = createSorcererZigguratController(SENTENCES, vi.fn(), 0);
    source.step(wrong(source));
    for (let step = 0; step < 3; step += 1) source.step(correct(source));
    const target = createSorcererZigguratController(SENTENCES, deliver, 0);
    target.restore(source.capture());
    expect(target.snapshot()).toMatchObject({ sentenceIndex: 1, wordIndex: 0, correctAnswers: 3, totalAttempts: 4, score: 300 });
    target.step(correct(target));
    target.step(correct(target));
    expect(deliver).toHaveBeenCalledWith(expect.objectContaining({ correctAnswers: 5, totalAttempts: 6, score: 500 }));
  });

  it("restores a complete state without delivering again", () => {
    const deliver = vi.fn();
    const source = createSorcererZigguratController(SENTENCES, vi.fn(), 0);
    for (let step = 0; step < 5; step += 1) source.step(correct(source));
    const target = createSorcererZigguratController(SENTENCES, deliver, 0);
    target.restore(source.capture());
    expect(target.snapshot()).toMatchObject({ phase: "complete", score: 500 });
    expect(deliver).not.toHaveBeenCalled();
  });

  it.each([
    ["a sentence past the end", { sentenceIndex: 2 }],
    ["a negative word", { wordIndex: -1 }],
    ["a complete phase with an open sentence", { phase: "complete" }],
    ["a non-numeric word", { wordIndex: Number.NaN }],
  ])("rejects %s as invalid ritual progress", (_label, patch) => {
    const controller = createSorcererZigguratController(SENTENCES, vi.fn(), 0);
    expect(() => controller.restore({ ...controller.capture(), ...patch } as never)).toThrow("invalid ritual progress");
  });

  it.each([
    ["missing correct answers", { wordIndex: 1, totalAttempts: 1, score: 100 }],
    ["fewer attempts than progress", { wordIndex: 1, correctAnswers: 1, score: 100 }],
    ["a score that does not match progress", { score: 100 }],
  ])("rejects %s as invalid counters", (_label, patch) => {
    const controller = createSorcererZigguratController(SENTENCES, vi.fn(), 0);
    expect(() => controller.restore({ ...controller.capture(), ...patch })).toThrow("invalid result counters");
  });

  it("seals delivery when a destroyed state is restored", () => {
    const deliver = vi.fn();
    const controller = createSorcererZigguratController([{ term: "Go", translation: "Ve" }], deliver, 0);
    controller.restore({ ...controller.capture(), destroyed: true });
    controller.restore({ ...controller.capture(), destroyed: false });
    expect(controller.step(correct(controller)).accepted).toBe(false);
    expect(controller.snapshot().destroyed).toBe(true);
    expect(deliver).not.toHaveBeenCalled();
  });
});
