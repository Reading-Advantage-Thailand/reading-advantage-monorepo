import { describe, expect, it, vi } from "vitest";

import { createRuntimeCartridge } from "../../testing/fixtures.js";
import {
  STANDARD_GAME_REQUIRED_CREDIT,
  hasStandardGameExperience,
  validateStandardGameExperienceDefinition,
} from "../standard-game-experience.js";

const validDefinition = {
  briefing: {
    title: "Word Gate",
    objective: "Choose each correct translation.",
    instructions: [
      { title: "Choose", description: "Select the matching gate." },
    ],
    learningPreview: { heading: "Words to learn" },
    controls: [
      { mode: "keyboard", label: "Arrows", action: "Choose a gate", keys: ["Left", "Right"] },
    ],
    labels: { startAction: "Start guided tutorial" },
    startPhase: "tutorial",
  },
  tutorial: {
    schemaVersion: 1,
    id: "word-gate-tutorial",
    title: "Word Gate tutorial",
    seed: 29,
    labels: {
      progress: "Tutorial progress",
      pause: "Pause tutorial",
      resume: "Resume tutorial",
      advance: "Next tutorial step",
      replay: "Replay tutorial",
      skip: "Skip tutorial",
    },
    targets: [{ id: "mechanic:gate", kind: "mechanic" }],
    actions: [{ id: "action:choose", deterministic: true, consequence: "correct" }],
    steps: [{
      id: "step:choose",
      title: "Choose the correct gate",
      explanation: "The safe preview chooses one matching translation.",
      targetId: "mechanic:gate",
      actionId: "action:choose",
      timing: { leadInMs: 0, demonstrationMs: 0, lingerMs: 0 },
    }],
    lifecycle: {
      pause: "freeze-current-step",
      advance: "sequential",
      replay: "restart-with-same-seed",
      skip: { enabled: true, to: "playing" },
      complete: { to: "playing" },
      productionEffects: {
        emitGameResults: false,
        persistProgress: false,
        awardAuthoritativeXp: false,
        writeLeaderboard: false,
        applyFailureConsequences: false,
      },
    },
  },
  debrief: {
    outcome: "complete",
    requiredCredit: STANDARD_GAME_REQUIRED_CREDIT,
    replayEntry: "briefing",
    exitDestination: "catalog",
  },
} as const;

describe("standard game experience", () => {
  it("validates the complete briefing, safe tutorial, and debrief contract", () => {
    expect(validateStandardGameExperienceDefinition(validDefinition)).toEqual(validDefinition);
    expect(validateStandardGameExperienceDefinition({
      ...validDefinition,
      debrief: { ...validDefinition.debrief, requiredCredit: "" },
    }).debrief.requiredCredit).toBe("");
  });

  it("rejects lifecycle definitions that bypass tutorial or scored gameplay", () => {
    expect(() => validateStandardGameExperienceDefinition({
      ...validDefinition,
      briefing: { ...validDefinition.briefing, startPhase: "playing" },
    })).toThrow(/must enter its guided tutorial/i);
    expect(() => validateStandardGameExperienceDefinition({
      ...validDefinition,
      tutorial: {
        ...validDefinition.tutorial,
        lifecycle: {
          ...validDefinition.tutorial.lifecycle,
          complete: { to: "countdown" },
        },
      },
    })).toThrow(/must continue to normal gameplay/i);
  });

  it("identifies only cartridges with a validated standard runtime", () => {
    const cartridge = createRuntimeCartridge();
    expect(hasStandardGameExperience(cartridge)).toBe(false);
    expect(hasStandardGameExperience({
      ...cartridge,
      standardExperience: {
        definition: validDefinition,
        createTutorialActionDriver: () => ({ execute: vi.fn() }),
      },
    })).toBe(true);
    expect(hasStandardGameExperience({
      ...cartridge,
      standardExperience: {
        definition: { ...validDefinition, debrief: undefined },
        createTutorialActionDriver: () => ({ execute: vi.fn() }),
      },
    } as never)).toBe(false);
  });
});
