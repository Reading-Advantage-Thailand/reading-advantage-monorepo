import { describe, expect, it } from "vitest";

import {
  createInputActionNormalizer,
  INPUT_ACTION_IDS,
  type InputActionId,
} from "../input-actions.js";

describe("input action normalization adapter", () => {
  it("exposes a bounded semantic action vocabulary", () => {
    expect(INPUT_ACTION_IDS).toContain("move-left");
    expect(INPUT_ACTION_IDS).toContain("move-right");
    expect(INPUT_ACTION_IDS).toContain("confirm");
    expect(INPUT_ACTION_IDS).toContain("pause");
  });

  it("translates a keyboard descriptor into a bounded semantic action id", () => {
    const normalize = createInputActionNormalizer({
      keyboard: { ArrowLeft: "move-left", ArrowRight: "move-right", Space: "confirm", KeyP: "pause" },
    });

    expect(normalize({ modality: "keyboard", code: "ArrowLeft" })).toEqual([{ action: "move-left", edge: "press" }]);
    expect(normalize({ modality: "keyboard", code: "Space" })).toEqual([{ action: "confirm", edge: "press" }]);
  });

  it("returns an empty list for unmapped keyboard codes instead of an unknown action", () => {
    const normalize = createInputActionNormalizer({
      keyboard: { ArrowLeft: "move-left" },
    });

    expect(normalize({ modality: "keyboard", code: "KeyZ" })).toEqual([]);
  });

  it("translates a pointer tap descriptor into a confirm action with edge metadata", () => {
    const normalize = createInputActionNormalizer({
      keyboard: {},
      pointerTap: { action: "confirm" },
    });

    expect(normalize({ modality: "pointer", phase: "down", x: 10, y: 20 })).toEqual([
      { action: "confirm", edge: "press" },
    ]);
    expect(normalize({ modality: "pointer", phase: "up", x: 10, y: 20 })).toEqual([
      { action: "confirm", edge: "release" },
    ]);
  });

  it("translates directional pointer drag descriptors into move actions", () => {
    const normalize = createInputActionNormalizer({
      keyboard: {},
      pointerDrag: { leftAction: "move-left", rightAction: "move-right" },
    });

    expect(normalize({ modality: "pointer", phase: "drag", deltaX: -40, deltaY: 0 })).toEqual([
      { action: "move-left", edge: "press" },
    ]);
    expect(normalize({ modality: "pointer", phase: "drag", deltaX: 40, deltaY: 0 })).toEqual([
      { action: "move-right", edge: "press" },
    ]);
  });

  it("never depends on DOM, pointer, keyboard, touch, or engine event objects", () => {
    const normalize = createInputActionNormalizer({ keyboard: { KeyA: "move-left" } });

    expect(() => normalize({ modality: "keyboard", code: "KeyA" })).not.toThrow();
  });

  it("rejects a physical descriptor that references an unregistered semantic action", () => {
    expect(() =>
      createInputActionNormalizer({
        keyboard: { KeyA: "title-specific-dash" as InputActionId },
      }),
    ).toThrow(/accepted action/i);
  });

  it("ignores descriptors below the drag threshold so small movements do not fire actions", () => {
    const normalize = createInputActionNormalizer({
      keyboard: {},
      pointerDrag: { leftAction: "move-left", rightAction: "move-right", threshold: 30 },
    });

    expect(normalize({ modality: "pointer", phase: "drag", deltaX: -10, deltaY: 0 })).toEqual([]);
  });
});
