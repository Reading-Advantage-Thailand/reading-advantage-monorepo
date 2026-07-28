import { describe, expect, it } from "vitest";

import {
  createLanguageTargetProgression,
} from "../language-target-progression.js";

describe("language target progression matcher", () => {
  it("starts at index zero with zero completed targets", () => {
    const progression = createLanguageTargetProgression(["cat", "dog", "bird"]);

    expect(progression.currentIndex).toBe(0);
    expect(progression.completedCount).toBe(0);
    expect(progression.isComplete).toBe(false);
    expect(progression.currentTarget).toBe("cat");
  });

  it("advances the ordered index only when the candidate matches the current target identity", () => {
    const progression = createLanguageTargetProgression(["cat", "dog", "bird"]);

    const wrong = progression.match("bird");
    expect(wrong.matched).toBe(false);
    expect(wrong.progressed).toBe(false);
    expect(progression.currentIndex).toBe(0);

    const right = progression.match("cat");
    expect(right.matched).toBe(true);
    expect(right.progressed).toBe(true);
    expect(progression.currentIndex).toBe(1);
    expect(progression.completedCount).toBe(1);
  });

  it("completes exactly when the last target is matched and stays terminal", () => {
    const progression = createLanguageTargetProgression(["cat", "dog"]);

    progression.match("cat");
    const final = progression.match("dog");

    expect(final.matched).toBe(true);
    expect(progression.isComplete).toBe(true);
    expect(progression.currentIndex).toBe(2);
    expect(progression.completedCount).toBe(2);

    const after = progression.match("dog");
    expect(after.matched).toBe(false);
    expect(after.progressed).toBe(false);
    expect(progression.completedCount).toBe(2);
  });

  it("treats identity comparison as stable and does not mutate the target list", () => {
    const targets = ["cat", "dog"];
    const progression = createLanguageTargetProgression(targets);

    progression.match("cat");
    expect(targets).toEqual(["cat", "dog"]);
  });

  it("rejects an empty target list at construction", () => {
    expect(() => createLanguageTargetProgression([])).toThrow(/empty/i);
  });

  it("rejects blank target identities", () => {
    expect(() => createLanguageTargetProgression(["cat", ""])).toThrow(/blank/i);
    expect(() => createLanguageTargetProgression(["cat", "  "])).toThrow(/blank/i);
  });

  it("exposes a pure snapshot that does not leak internal mutability", () => {
    const progression = createLanguageTargetProgression(["cat", "dog"]);
    progression.match("cat");
    const snapshot = progression.snapshot();

    expect(snapshot).toEqual({
      targets: ["cat", "dog"],
      currentIndex: 1,
      completedCount: 1,
      isComplete: false,
      currentTarget: "dog",
    });

    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.targets)).toBe(true);
  });

  it("resets the matcher to the initial index without reallocating targets", () => {
    const progression = createLanguageTargetProgression(["cat", "dog"]);
    progression.match("cat");
    progression.reset();

    expect(progression.currentIndex).toBe(0);
    expect(progression.completedCount).toBe(0);
    expect(progression.isComplete).toBe(false);
  });

  it("supports a custom identity function for non-string target identities", () => {
    type Token = { readonly id: number };
    const targets: readonly Token[] = [{ id: 1 }, { id: 2 }];
    const progression = createLanguageTargetProgression<Token, Token>(targets, {
      targetId: (target) => `token-${target.id}`,
      candidateId: (candidate) => `token-${candidate.id}`,
    });

    expect(progression.match({ id: 1 }).matched).toBe(true);
    expect(progression.currentIndex).toBe(1);
  });
});
