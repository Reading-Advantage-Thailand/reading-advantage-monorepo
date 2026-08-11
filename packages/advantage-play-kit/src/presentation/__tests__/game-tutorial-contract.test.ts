import { describe, expect, it } from "vitest";

import * as presentation from "../index.js";
import {
  gameTutorialActionConsequenceSchema,
  gameTutorialActionSchema,
  gameTutorialCommandSchema,
  gameTutorialDefinitionSchema,
  gameTutorialLabelsSchema,
  gameTutorialLifecyclePolicySchema,
  gameTutorialProgressSchema,
  gameTutorialStepSchema,
  gameTutorialStepTimingSchema,
  gameTutorialTargetKindSchema,
  gameTutorialTargetSchema,
  tutorialSemanticIdSchema,
  validateGameTutorialDefinition,
} from "../game-tutorial-contract.js";

const validTutorial = {
  schemaVersion: 1,
  id: "temple-word-quest-tutorial",
  title: "Temple Word Quest tutorial",
  seed: 4_294_967_295,
  labels: {
    progress: "Tutorial progress",
    pause: "Pause tutorial",
    resume: "Resume tutorial",
    advance: "Next step",
    replay: "Replay tutorial",
    skip: "Skip tutorial",
  },
  targets: [
    { id: "control:answer-choice", kind: "control" },
    { id: "learning-item:river", kind: "learning-item" },
    { id: "feedback:incorrect-choice", kind: "feedback" },
  ],
  actions: [
    { id: "action:highlight-answer", deterministic: true, consequence: "neutral" },
    { id: "action:select-correct-answer", deterministic: true, consequence: "correct" },
    { id: "action:show-incorrect-feedback", deterministic: true, consequence: "incorrect" },
  ],
  steps: [
    {
      id: "step:notice-answer",
      title: "Find the answer controls",
      explanation: "Notice the answer choices before making a selection.",
      targetId: "control:answer-choice",
      actionId: "action:highlight-answer",
      timing: { leadInMs: 0, demonstrationMs: 800, lingerMs: 250 },
    },
    {
      id: "step:choose-river",
      title: "Choose the matching word",
      explanation: "The English word river matches the Thai learning item.",
      targetId: "learning-item:river",
      actionId: "action:select-correct-answer",
      timing: { leadInMs: 100, demonstrationMs: 1_000, lingerMs: 500 },
    },
    {
      id: "step:review-feedback",
      title: "Review the feedback",
      explanation: "Incorrect feedback safely explains why the selected answer does not match.",
      targetId: "feedback:incorrect-choice",
      actionId: "action:show-incorrect-feedback",
      timing: { leadInMs: 120_000, demonstrationMs: 0, lingerMs: 120_000 },
    },
  ],
  lifecycle: {
    pause: "freeze-current-step",
    advance: "sequential",
    replay: "restart-with-same-seed",
    skip: { enabled: true, to: "countdown" },
    complete: { to: "playing" },
    productionEffects: {
      emitGameResults: false,
      persistProgress: false,
      awardAuthoritativeXp: false,
      writeLeaderboard: false,
      applyFailureConsequences: false,
    },
  },
} as const;

describe("guided gameplay tutorial contracts", () => {
  it("exports the tutorial contract surface through the public presentation barrel", () => {
    expect(presentation.tutorialSemanticIdSchema).toBe(tutorialSemanticIdSchema);
    expect(presentation.gameTutorialDefinitionSchema).toBe(gameTutorialDefinitionSchema);
    expect(presentation.gameTutorialProgressSchema).toBe(gameTutorialProgressSchema);
    expect(presentation.gameTutorialCommandSchema).toBe(gameTutorialCommandSchema);
    expect(presentation.validateGameTutorialDefinition).toBe(validateGameTutorialDefinition);
  });

  it("accepts a complete deterministic tutorial with resolved Thai text and preserves ordered steps", () => {
    const thaiTutorial = {
      ...validTutorial,
      title: "บทเรียนเกมภารกิจคำศัพท์",
      labels: { ...validTutorial.labels, progress: "ความคืบหน้าบทเรียน", advance: "ขั้นตอนถัดไป" },
      steps: [
        {
          ...validTutorial.steps[0],
          title: "หาปุ่มเลือกคำตอบ",
          explanation: "สังเกตตัวเลือกคำตอบก่อนเลือกคำศัพท์ที่ตรงกัน",
        },
        ...validTutorial.steps.slice(1),
      ],
    };

    expect(tutorialSemanticIdSchema.safeParse("control:answer-choice").success).toBe(true);
    expect(gameTutorialTargetSchema.safeParse(validTutorial.targets[0]).success).toBe(true);
    expect(gameTutorialActionSchema.safeParse(validTutorial.actions[0]).success).toBe(true);
    expect(gameTutorialStepTimingSchema.safeParse(validTutorial.steps[0].timing).success).toBe(true);
    expect(gameTutorialStepSchema.safeParse(validTutorial.steps[0]).success).toBe(true);
    expect(gameTutorialLabelsSchema.safeParse(validTutorial.labels).success).toBe(true);
    expect(gameTutorialLifecyclePolicySchema.safeParse(validTutorial.lifecycle).success).toBe(true);
    expect(gameTutorialDefinitionSchema.safeParse(thaiTutorial).success).toBe(true);

    const parsed = validateGameTutorialDefinition(thaiTutorial);
    expect(parsed.seed).toBe(4_294_967_295);
    expect(parsed.steps.map((step) => step.id)).toEqual([
      "step:notice-answer",
      "step:choose-river",
      "step:review-feedback",
    ]);
    expect(parsed.steps.map((step) => step.targetId)).toEqual([
      "control:answer-choice",
      "learning-item:river",
      "feedback:incorrect-choice",
    ]);
  });

  it.each(["control", "mechanic", "learning-item", "feedback"] as const)(
    "accepts the %s semantic target kind",
    (kind) => {
      expect(gameTutorialTargetKindSchema.safeParse(kind).success).toBe(true);
      expect(gameTutorialTargetSchema.safeParse({ id: `target:${kind}`, kind }).success).toBe(true);
    },
  );

  it.each(["neutral", "correct", "incorrect"] as const)(
    "accepts the %s deterministic action consequence",
    (consequence) => {
      expect(gameTutorialActionConsequenceSchema.safeParse(consequence).success).toBe(true);
      expect(gameTutorialActionSchema.safeParse({
        id: `action:${consequence}`,
        deterministic: true,
        consequence,
      }).success).toBe(true);
    },
  );

  it.each([
    ["blank semantic id", ""],
    ["whitespace semantic id", "control:answer choice"],
    ["DOM selector", "#answer-choice"],
    ["DOM descendant selector", "canvas .answer-choice"],
    ["attribute selector", "[data-target='answer-choice']"],
    ["physical keyboard code", "KeyA"],
  ])("rejects a %s where a semantic id is required", (_label, value) => {
    expect(tutorialSemanticIdSchema.safeParse(value).success).toBe(false);
  });

  it.each([
    ["empty targets", { ...validTutorial, targets: [] }],
    ["empty actions", { ...validTutorial, actions: [] }],
    ["empty steps", { ...validTutorial, steps: [] }],
    [
      "duplicate target ids",
      {
        ...validTutorial,
        targets: [...validTutorial.targets, validTutorial.targets[0]],
      },
    ],
    [
      "duplicate action ids",
      {
        ...validTutorial,
        actions: [...validTutorial.actions, validTutorial.actions[0]],
      },
    ],
    [
      "duplicate step ids",
      {
        ...validTutorial,
        steps: [...validTutorial.steps, validTutorial.steps[0]],
      },
    ],
    [
      "a missing target reference",
      {
        ...validTutorial,
        steps: [{ ...validTutorial.steps[0], targetId: "control:missing" }, ...validTutorial.steps.slice(1)],
      },
    ],
    [
      "a missing action reference",
      {
        ...validTutorial,
        steps: [{ ...validTutorial.steps[0], actionId: "action:missing" }, ...validTutorial.steps.slice(1)],
      },
    ],
    [
      "an unused semantic target declaration",
      {
        ...validTutorial,
        targets: [...validTutorial.targets, { id: "mechanic:unused", kind: "mechanic" }],
      },
    ],
    [
      "an unused deterministic action declaration",
      {
        ...validTutorial,
        actions: [
          ...validTutorial.actions,
          { id: "action:unused", deterministic: true, consequence: "neutral" },
        ],
      },
    ],
  ])("rejects %s", (_label, value) => {
    expect(gameTutorialDefinitionSchema.safeParse(value).success).toBe(false);
  });

  it("uses array position as the only tutorial order and rejects graph/order declarations", () => {
    for (const step of [
      { ...validTutorial.steps[0], order: 1 },
      { ...validTutorial.steps[0], nextStepId: "step:choose-river" },
      { ...validTutorial.steps[0], branch: "correct" },
      { ...validTutorial.steps[0], condition: "answer-is-correct" },
    ]) {
      expect(gameTutorialStepSchema.safeParse(step).success).toBe(false);
    }
  });

  it.each([
    ["lead-in below zero", "leadInMs", -1],
    ["demonstration beyond the maximum", "demonstrationMs", 120_001],
    ["fractional linger", "lingerMs", 1.5],
    ["non-finite lead-in", "leadInMs", Number.POSITIVE_INFINITY],
  ] as const)("rejects %s", (_label, field, value) => {
    expect(gameTutorialStepTimingSchema.safeParse({
      ...validTutorial.steps[0].timing,
      [field]: value,
    }).success).toBe(false);
  });

  it("requires each bounded timing field and accepts both timing boundaries", () => {
    const { leadInMs: _leadInMs, ...timingWithoutLeadIn } = validTutorial.steps[0].timing;

    expect(gameTutorialStepTimingSchema.safeParse(timingWithoutLeadIn).success).toBe(false);
    expect(gameTutorialStepTimingSchema.safeParse({
      leadInMs: 0,
      demonstrationMs: 120_000,
      lingerMs: 0,
    }).success).toBe(true);
  });

  it.each([
    ["progress", { ...validTutorial.labels, progress: " " }],
    ["pause", { ...validTutorial.labels, pause: "" }],
    ["resume", { ...validTutorial.labels, resume: "\t" }],
    ["advance", { ...validTutorial.labels, advance: "\n" }],
    ["replay", { ...validTutorial.labels, replay: "  " }],
    ["skip", { ...validTutorial.labels, skip: "" }],
  ])("rejects a blank %s label", (_label, labels) => {
    expect(gameTutorialLabelsSchema.safeParse(labels).success).toBe(false);
  });

  it("validates derived progress bounds and only the five supported tutorial commands", () => {
    expect(gameTutorialProgressSchema.safeParse({ completed: 0, total: 3 }).success).toBe(true);
    expect(gameTutorialProgressSchema.safeParse({ completed: 3, total: 3 }).success).toBe(true);

    for (const progress of [
      { completed: -1, total: 3 },
      { completed: 4, total: 3 },
      { completed: 0, total: 0 },
      { completed: 0.5, total: 3 },
      { completed: 0, total: Number.POSITIVE_INFINITY },
      { completed: 0, total: 3, current: 0 },
    ]) {
      expect(gameTutorialProgressSchema.safeParse(progress).success).toBe(false);
    }

    for (const command of ["pause", "resume", "advance", "replay", "skip"] as const) {
      expect(gameTutorialCommandSchema.safeParse(command).success).toBe(true);
    }
    expect(gameTutorialCommandSchema.safeParse("tutorial-complete").success).toBe(false);
    expect(gameTutorialCommandSchema.safeParse({ command: "advance" }).success).toBe(false);
  });

  it.each([
    ["negative", -1],
    ["above uint32", 4_294_967_296],
    ["fractional", 1.5],
    ["non-finite", Number.NaN],
    ["string", "42"],
  ])("rejects a %s deterministic seed", (_label, seed) => {
    expect(gameTutorialDefinitionSchema.safeParse({ ...validTutorial, seed }).success).toBe(false);
  });

  it("requires exact lifecycle controls, safe exits, and literal production-effect suppression", () => {
    expect(gameTutorialLifecyclePolicySchema.safeParse({
      ...validTutorial.lifecycle,
      skip: { enabled: false },
    }).success).toBe(true);

    for (const lifecycle of [
      { ...validTutorial.lifecycle, pause: "pause-current-step" },
      { ...validTutorial.lifecycle, advance: "any-step" },
      { ...validTutorial.lifecycle, replay: "restart-with-new-seed" },
      { ...validTutorial.lifecycle, skip: { enabled: true, to: "results" } },
      { ...validTutorial.lifecycle, skip: { enabled: false, to: "playing" } },
      { ...validTutorial.lifecycle, complete: { to: "results" } },
    ]) {
      expect(gameTutorialLifecyclePolicySchema.safeParse(lifecycle).success).toBe(false);
    }

    for (const effect of [
      "emitGameResults",
      "persistProgress",
      "awardAuthoritativeXp",
      "writeLeaderboard",
      "applyFailureConsequences",
    ] as const) {
      expect(gameTutorialLifecyclePolicySchema.safeParse({
        ...validTutorial.lifecycle,
        productionEffects: { ...validTutorial.lifecycle.productionEffects, [effect]: true },
      }).success).toBe(false);
    }
  });

  it("fails closed on selectors, coordinates, callbacks, locale maps, and unknown keys at every contract boundary", () => {
    const invalidDefinitions = [
      { ...validTutorial, onAdvance: () => undefined },
      { ...validTutorial, locale: { en: validTutorial.title, th: "บทเรียน" } },
      { ...validTutorial, labels: { ...validTutorial.labels, customRenderer: "not permitted" } },
      {
        ...validTutorial,
        targets: [{ ...validTutorial.targets[0], selector: "#answer-choice" }, ...validTutorial.targets.slice(1)],
      },
      {
        ...validTutorial,
        targets: [{ ...validTutorial.targets[0], x: 240, y: 160 }, ...validTutorial.targets.slice(1)],
      },
      {
        ...validTutorial,
        targets: [{ ...validTutorial.targets[0], bounds: { left: 0, top: 0, width: 10, height: 10 } }, ...validTutorial.targets.slice(1)],
      },
      {
        ...validTutorial,
        targets: [{ ...validTutorial.targets[0], rect: { x: 0, y: 0, width: 10, height: 10 } }, ...validTutorial.targets.slice(1)],
      },
      {
        ...validTutorial,
        actions: [{ ...validTutorial.actions[0], callback: () => undefined }, ...validTutorial.actions.slice(1)],
      },
      {
        ...validTutorial,
        actions: [{ ...validTutorial.actions[0], deterministic: false }, ...validTutorial.actions.slice(1)],
      },
      {
        ...validTutorial,
        steps: [{ ...validTutorial.steps[0], onComplete: () => undefined }, ...validTutorial.steps.slice(1)],
      },
      {
        ...validTutorial,
        steps: [{ ...validTutorial.steps[0], timing: { ...validTutorial.steps[0].timing, delayMs: 50 } }, ...validTutorial.steps.slice(1)],
      },
      {
        ...validTutorial,
        lifecycle: { ...validTutorial.lifecycle, onPersist: () => undefined },
      },
    ];

    for (const definition of invalidDefinitions) {
      expect(gameTutorialDefinitionSchema.safeParse(definition).success).toBe(false);
    }
  });

  it("throws one stable, path-bearing validation error instead of returning a partial tutorial", () => {
    expect(() => validateGameTutorialDefinition({
      ...validTutorial,
      labels: { ...validTutorial.labels, progress: " " },
    })).toThrow(/tutorial definition validation failed: labels\.progress:/i);
  });
});
