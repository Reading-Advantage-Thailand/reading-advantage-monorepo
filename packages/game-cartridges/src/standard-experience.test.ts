import { describe, expect, it, vi } from "vitest";

import {
  STANDARD_DEBRIEF_CREDIT,
  STANDARD_POINTER_TOUCH_ACTION,
  createCartridgeStandardExperience,
} from "./standard-experience.js";

const KEYBOARD_INSTRUCTION = "Move left or right to choose a translation gate.";

function createExperience(
  executeTutorialAction: (actionId: string) => void = vi.fn(),
  requiredCredit?: string,
) {
  return createCartridgeStandardExperience({
    id: "gate-runner",
    title: "Gate Runner",
    description: "Choose the matching translation gate.",
    inputMode: "vocabulary",
    objective: "Guide the learner through each matching gate.",
    mechanicInstruction: KEYBOARD_INSTRUCTION,
    keyboardKeys: ["A", "Left Arrow", "D", "Right Arrow"],
    executeTutorialAction,
    requiredCredit,
  });
}

describe("createCartridgeStandardExperience", () => {
  it("describes pointer and touch controls in device terms instead of the keyboard sentence", () => {
    const { definition } = createExperience();
    const keyboard = definition.briefing.controls.find((control) => control.mode === "keyboard");
    const pointer = definition.briefing.controls.find((control) => control.mode === "pointer");
    const touch = definition.briefing.controls.find((control) => control.mode === "touch");

    expect(keyboard).toMatchObject({
      label: "Keyboard",
      action: KEYBOARD_INSTRUCTION,
      keys: ["A", "Left Arrow", "D", "Right Arrow"],
    });
    expect(pointer).toEqual({
      mode: "pointer",
      label: "Click",
      action: STANDARD_POINTER_TOUCH_ACTION,
    });
    expect(touch).toEqual({
      mode: "touch",
      label: "Tap",
      action: STANDARD_POINTER_TOUCH_ACTION,
    });
    expect(STANDARD_POINTER_TOUCH_ACTION).toBe(
      "Tap or click to perform the action shown in the game.",
    );
    expect(pointer?.action).not.toBe(KEYBOARD_INSTRUCTION);
    expect(touch?.action).not.toBe(KEYBOARD_INSTRUCTION);
  });

  it("shows the ElvGames pixel-art credit in every cartridge debrief", () => {
    const defaultExperience = createExperience();
    const creditedExperience = createExperience(vi.fn(), "Pixel art assets by ElvGames");

    expect(STANDARD_DEBRIEF_CREDIT).toBe("Pixel art assets by ElvGames");
    expect(defaultExperience.definition.debrief.requiredCredit).toBe(
      "Pixel art assets by ElvGames",
    );
    expect(creditedExperience.definition.debrief.requiredCredit).toBe(
      "Pixel art assets by ElvGames",
    );
  });

  it("executes the active mechanic through the isolated tutorial driver", () => {
    const executeTutorialAction = vi.fn();
    const runtime = createExperience(executeTutorialAction);
    const step = runtime.definition.tutorial.steps[0];

    runtime.createTutorialActionDriver().execute({
      tutorial: runtime.definition.tutorial,
      step,
      seed: runtime.definition.tutorial.seed,
      mode: "tutorial",
      diagnostics: { report: vi.fn() },
    });

    expect(executeTutorialAction).toHaveBeenCalledWith(step.actionId);
  });
});
