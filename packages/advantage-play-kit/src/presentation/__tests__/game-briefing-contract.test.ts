import { describe, expect, it } from "vitest";

import {
  gameBriefingControlHintSchema,
  gameBriefingInstructionSchema,
  gameBriefingLabelsSchema,
  gameBriefingLearningPreviewSchema,
  gameBriefingSchema,
  gameLifecycleTransitionSchema,
  resolveGameBriefingStartPhase,
} from "../game-briefing-contract.js";

const validBriefing = {
  title: "Temple Word Quest",
  objective: "Match each Thai word with its English translation.",
  instructions: [
    { title: "Choose a path", description: "Select the answer that matches the learning word." },
  ],
  learningPreview: { heading: "Words to learn" },
  controls: [{ mode: "touch", label: "Tap", action: "Choose an answer" }],
} as const;

const { title: _title, ...briefingWithoutTitle } = validBriefing;
const { objective: _objective, ...briefingWithoutObjective } = validBriefing;
const { instructions: _instructions, ...briefingWithoutInstructions } = validBriefing;
const { controls: _controls, ...briefingWithoutControls } = validBriefing;

describe("standard game briefing contracts", () => {
  it("runtime-validates standardized instructions, learning previews, controls, and overridable labels", () => {
    expect(gameBriefingInstructionSchema.safeParse(validBriefing.instructions[0]).success).toBe(true);
    expect(gameBriefingLearningPreviewSchema.safeParse(validBriefing.learningPreview).success).toBe(true);
    expect(gameBriefingControlHintSchema.safeParse(validBriefing.controls[0]).success).toBe(true);
    expect(gameBriefingLabelsSchema.safeParse({
      objectiveHeading: "Your mission",
      instructionsHeading: "How to play",
      learningPreviewHeading: "Preview vocabulary",
      controlsHeading: "Choose your controls",
      startAction: "Begin quest",
    }).success).toBe(true);
    expect(gameBriefingSchema.safeParse(validBriefing).success).toBe(true);
  });

  it.each([
    ["title", { ...validBriefing, title: "   " }],
    ["objective", { ...validBriefing, objective: "\t" }],
    ["instruction title", { ...validBriefing, instructions: [{ title: " ", description: "Choose carefully." }] }],
    ["instruction description", { ...validBriefing, instructions: [{ title: "Choose", description: "\n" }] }],
    ["instructions", { ...validBriefing, instructions: [] }],
    ["learning-preview heading", { ...validBriefing, learningPreview: { heading: "  " } }],
    ["control label", { ...validBriefing, controls: [{ mode: "touch", label: " ", action: "Choose" }] }],
    ["control action", { ...validBriefing, controls: [{ mode: "touch", label: "Tap", action: "" }] }],
    ["controls", { ...validBriefing, controls: [] }],
  ])("rejects an unusable %s", (_field, value) => {
    expect(gameBriefingSchema.safeParse(value).success).toBe(false);
  });

  it("accepts optional subtitle, tip, label overrides, and a configured Start phase", () => {
    expect(gameBriefingSchema.safeParse({
      ...validBriefing,
      subtitle: "A vocabulary adventure",
      tip: "Read every word before starting.",
      labels: { startAction: "Begin quest" },
      startPhase: "tutorial",
    }).success).toBe(true);
    expect(resolveGameBriefingStartPhase({ startPhase: "tutorial" })).toBe("tutorial");
    expect(resolveGameBriefingStartPhase({})).toBe("playing");
  });

  it.each([
    ["title", briefingWithoutTitle],
    ["objective", briefingWithoutObjective],
    ["instructions", briefingWithoutInstructions],
    ["controls", briefingWithoutControls],
  ])("rejects a briefing without its required %s", (_field, value) => {
    expect(gameBriefingSchema.safeParse(value).success).toBe(false);
  });

  it("accepts already-resolved Thai text without localization callbacks or message keys", () => {
    expect(gameBriefingSchema.safeParse({
      title: "ภารกิจคำศัพท์",
      objective: "จับคู่คำศัพท์ภาษาไทยกับคำแปลภาษาอังกฤษ",
      instructions: [{ title: "เลือกคำตอบ", description: "แตะคำตอบที่ตรงกับคำศัพท์" }],
      learningPreview: { heading: "คำศัพท์ที่ต้องเรียนรู้" },
      controls: [{ mode: "touch", label: "แตะหน้าจอ", action: "เลือกคำตอบ" }],
      labels: { startAction: "เริ่มเกม" },
    }).success).toBe(true);
  });

  it("fails closed on arbitrary callback content or unbounded extension keys", () => {
    expect(gameBriefingSchema.safeParse({
      ...validBriefing,
      onStart: () => undefined,
    }).success).toBe(false);
    expect(gameBriefingSchema.safeParse({
      ...validBriefing,
      labels: { startAction: "Begin quest", customRenderer: "not permitted" },
    }).success).toBe(false);
  });

  it("permits only an explicit Start transition from briefing to a configured nonterminal phase", () => {
    for (const to of ["tutorial", "demo", "countdown", "playing"] as const) {
      expect(gameLifecycleTransitionSchema.safeParse({
        from: "briefing",
        event: "start",
        to,
      }).success).toBe(true);
    }

    for (const value of [
      { from: "briefing", event: "start", to: "results" },
      { from: "playing", event: "start", to: "tutorial" },
      { from: "results", event: "start", to: "playing" },
      { from: "briefing", event: "complete", to: "playing" },
    ]) {
      expect(gameLifecycleTransitionSchema.safeParse(value).success).toBe(false);
    }
  });

  it.each([
    { from: "tutorial", event: "tutorial-complete", to: "countdown" },
    { from: "tutorial", event: "tutorial-complete", to: "playing" },
    { from: "tutorial", event: "tutorial-skip", to: "countdown" },
    { from: "tutorial", event: "tutorial-skip", to: "playing" },
    { from: "demo", event: "demo-complete", to: "tutorial" },
    { from: "demo", event: "demo-complete", to: "countdown" },
    { from: "countdown", event: "countdown-complete", to: "playing" },
    { from: "playing", event: "game-complete", to: "results" },
    { from: "results", event: "replay", to: "briefing" },
    { from: "results", event: "replay", to: "tutorial" },
  ])("validates the ordered optional lifecycle transition $from/$event -> $to", (transition) => {
    expect(gameLifecycleTransitionSchema.safeParse(transition).success).toBe(true);
  });

  it.each([
    { from: "tutorial", event: "tutorial-complete", to: "demo" },
    { from: "tutorial", event: "tutorial-skip", to: "results" },
    { from: "playing", event: "tutorial-skip", to: "countdown" },
    { from: "demo", event: "demo-complete", to: "results" },
    { from: "countdown", event: "countdown-complete", to: "tutorial" },
    { from: "playing", event: "game-complete", to: "briefing" },
  ])("rejects the out-of-order lifecycle transition $from/$event -> $to", (transition) => {
    expect(gameLifecycleTransitionSchema.safeParse(transition).success).toBe(false);
  });
});
