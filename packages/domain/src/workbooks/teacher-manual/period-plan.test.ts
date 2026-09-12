import { describe, expect, it } from "vitest";

import { getTranslations } from "./i18n/index.js";
import { buildPeriodPlan, renderPeriodPlan } from "./period-plan.js";
import { makeFullLesson, makeMinimalLesson } from "./lesson-fixture.js";

const full = makeFullLesson();

describe("buildPeriodPlan", () => {
  it("groups steps per the 4-period model (1:[1-4], 2:[5-7], 3:[8-10], 4:[11-13])", () => {
    expect(buildPeriodPlan(1, full, 0).steps.map(s => s.stepNumber)).toEqual([1, 2, 3, 4]);
    expect(buildPeriodPlan(2, full, 0).steps.map(s => s.stepNumber)).toEqual([5, 6, 7]);
    expect(buildPeriodPlan(3, full, 0).steps.map(s => s.stepNumber)).toEqual([8, 9, 10]);
    expect(buildPeriodPlan(4, full, 0).steps.map(s => s.stepNumber)).toEqual([11, 12, 13]);
  });

  it("labels each period with its translation title", () => {
    const pp = getTranslations("en").periodPlan;
    expect(buildPeriodPlan(1, full, 0).title).toBe(pp.launchVocabulary);
    expect(buildPeriodPlan(2, full, 0).title).toBe(pp.deepReadingComprehension);
    expect(buildPeriodPlan(3, full, 0).title).toBe(pp.responsePractice);
    expect(buildPeriodPlan(4, full, 0).title).toBe(pp.writingReflection);
  });

  it("sets a flashcard cut-out bell-ringer for period 1", () => {
    const plan = buildPeriodPlan(1, full, 0);
    expect(plan.bellRinger?.type).toBe("flashcard-cutout");
    expect(plan.bellRinger?.duration).toBe(getTranslations("en").periodPlan.fiveMinutes);
    expect(plan.bellRinger?.instructions.length).toBeGreaterThan(0);
    expect(plan.bellRinger?.gameVariations).toBeUndefined();
  });

  it("sets a flashcard-game bell-ringer with variations for periods 2-4", () => {
    for (const pn of [2, 3, 4]) {
      const plan = buildPeriodPlan(pn, full, 0);
      expect(plan.bellRinger?.type).toBe("flashcard-game");
      expect(plan.bellRinger?.gameVariations).toHaveLength(4);
    }
  });

  it("assigns the trace/write/cover-write spelling activities to periods 2-4", () => {
    expect(buildPeriodPlan(1, full, 0).spellingActivity).toBeUndefined();
    expect(buildPeriodPlan(2, full, 0).spellingActivity?.type).toBe("trace");
    expect(buildPeriodPlan(3, full, 0).spellingActivity?.type).toBe("write");
    expect(buildPeriodPlan(4, full, 0).spellingActivity?.type).toBe("cover-write");
  });

  it("maps online components per period", () => {
    const pp = getTranslations("en").periodPlan;
    expect(buildPeriodPlan(1, full, 0).onlineComponents).toEqual([pp.onlineReading]);
    expect(buildPeriodPlan(2, full, 0).onlineComponents).toEqual([pp.extensiveReading]);
    expect(buildPeriodPlan(3, full, 0).onlineComponents).toEqual([pp.vocabReview]);
    expect(buildPeriodPlan(4, full, 0).onlineComponents).toEqual([pp.aiFeedback, pp.progressTracker]);
  });

  it("stores teaching notes for every step in the period", () => {
    for (const pn of [1, 2, 3, 4]) {
      const plan = buildPeriodPlan(pn, full, 0);
      for (const step of plan.steps) {
        const note = plan.teachingNotes.get(step.stepNumber);
        expect(note).toBeDefined();
        expect(Array.isArray(note?.teacherActions)).toBe(true);
      }
    }
  });
});

describe("renderPeriodPlan", () => {
  it("emits the period wrapper with its data-period attribute", () => {
    const html = renderPeriodPlan(buildPeriodPlan(1, full, 0), 0);
    expect(html).toContain('<div class="tm-period" data-period="1">');
    expect(html).toContain("Period 1:");
  });

  it("renders the bell-ringer block with instructions", () => {
    const html = renderPeriodPlan(buildPeriodPlan(1, full, 0), 0);
    expect(html).toContain('<div class="tm-bell-ringer">');
    expect(html).toContain("🔔");
    expect(html).toContain("(5 minutes)");
    expect(html).toContain('<ul class="tm-br-list">');
  });

  it("renders game variations for period 2", () => {
    const html = renderPeriodPlan(buildPeriodPlan(2, full, 0), 0);
    expect(html).toContain('<div class="tm-br-variations">');
    expect(html).toContain("Memory Match");
  });

  it("renders the spelling activity block for periods 2-4", () => {
    for (const pn of [2, 3, 4]) {
      const html = renderPeriodPlan(buildPeriodPlan(pn, full, 0), 0);
      expect(html).toContain('<div class="tm-spelling">');
    }
    expect(renderPeriodPlan(buildPeriodPlan(1, full, 0), 0)).not.toContain('<div class="tm-spelling">');
  });

  it("renders the online components block", () => {
    const html = renderPeriodPlan(buildPeriodPlan(4, full, 0), 0);
    expect(html).toContain('<div class="tm-online">');
    expect(html).toContain("AI writing feedback");
    expect(html).toContain("Progress tracker");
  });

  it("places one step block and teaching notes per step", () => {
    const plan = buildPeriodPlan(2, full, 0);
    const html = renderPeriodPlan(plan, 0);
    expect((html.match(/<div class="tm-step-block">/g) ?? []).length).toBe(3);
    expect((html.match(/<div class="tm-teaching-notes">/g) ?? []).length).toBe(3);
    expect(html).toContain('data-step="5"');
    expect(html).toContain('data-step="6"');
    expect(html).toContain('data-step="7"');
  });

  it("renders lesson data inside the step inserts", () => {
    const period2 = renderPeriodPlan(buildPeriodPlan(2, full, 0), 0);
    expect(period2).toContain("What color is the sky?");
    expect(period2).toContain("P1:");
    expect(period2).toContain("P5:");

    const period3 = renderPeriodPlan(buildPeriodPlan(3, full, 0), 0);
    expect(period3).toContain("Why is the sky blue?");
    expect(period3).toContain("1. orbit");

    const period4 = renderPeriodPlan(buildPeriodPlan(4, full, 0), 0);
    expect(period4).toContain("Describe your favorite star.");
  });

  it("emits no undefined strings for a partial lesson", () => {
    const html = renderPeriodPlan(buildPeriodPlan(3, makeMinimalLesson(), 0), 0);
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
  });

  it("renders Thai strings when lang is th", () => {
    const th = getTranslations("th");
    const html = renderPeriodPlan(buildPeriodPlan(1, full, 0, undefined, "th"), 0, undefined, "th");
    expect(html).toContain(th.periodPlan.period);
  });
});
