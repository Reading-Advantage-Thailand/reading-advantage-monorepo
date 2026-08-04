import { describe, expect, it } from "vitest";

import { getTranslations } from "./i18n/index.js";
import { renderStepInsert } from "./step-insert.js";
import { makeFullLesson, makeMinimalLesson } from "./lesson-fixture.js";

const full = makeFullLesson();
const minimal = makeMinimalLesson();

describe("renderStepInsert", () => {
  it("renders a wrapper with the data-step attribute for steps 1-13", () => {
    for (const stepNumber of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
      const html = renderStepInsert(stepNumber, full);
      expect(html).toContain(`<div class="step-insert" data-step="${stepNumber}">`);
      expect(html).toContain('<div class="si-content">');
    }
  });

  it("returns an empty string for unknown steps", () => {
    expect(renderStepInsert(14, full)).toBe("");
    expect(renderStepInsert(0, full)).toBe("");
  });

  it("renders the step badge and student-view label", () => {
    const html = renderStepInsert(3, full);
    expect(html).toContain('<span class="si-step-badge">Step 3</span>');
    expect(html).toContain("Student View");
  });

  it("step 1 renders the lesson title, genre, interest stars, and hero image", () => {
    const html = renderStepInsert(1, full);
    expect(html).toContain("The Night Sky");
    expect(html).toContain('<span class="si-meta">science</span>');
    expect((html.match(/<span class="si-star">☆<\/span>/g) ?? []).length).toBe(5);
    expect(html).toContain('<img src="https://cdn.example.com/hero.png"');
  });

  it("step 2 renders the vocabulary table with word, phonetic, and definition", () => {
    const html = renderStepInsert(2, full);
    expect(html).toContain('<table class="si-vocab-table">');
    expect(html).toContain("<td class=\"si-vocab-word\">orbit</td>");
    expect(html).toContain("<td class=\"si-vocab-phonetic\">/ˈɔːbɪt/</td>");
    expect(html).toContain("<td class=\"si-vocab-def\">The path a planet takes around a star.</td>");
    expect(html).toContain("<td class=\"si-vocab-word\">gravity</td>");
  });

  it("step 3 renders paragraphs with truncation and the total count", () => {
    const html = renderStepInsert(3, full);
    expect(html).toContain('<p class="si-para">The night sky is full of stars.</p>');
    expect(html).toContain("... (5 paragraphs total)");
    const paraCount = (html.match(/<p class="si-para">/g) ?? []).length;
    expect(paraCount).toBe(3);
  });

  it("step 5 renders a note row per paragraph", () => {
    const html = renderStepInsert(5, full);
    expect((html.match(/class="si-note-para"/g) ?? []).length).toBe(5);
  });

  it("step 7 renders comprehension questions with lettered options", () => {
    const html = renderStepInsert(7, full);
    expect(html).toContain("What color is the sky?");
    expect(html).toContain("<label class=\"si-option\">A. Blue</label>");
    expect(html).toContain("<label class=\"si-option\">C. Red</label>");
  });

  it("step 8 renders the short-answer question, hint, and sentence starters", () => {
    const html = renderStepInsert(8, full);
    expect(html).toContain("Why is the sky blue?");
    expect(html).toContain("Think about light.");
    expect(html).toContain("• I think that");
    expect(html).toContain("• The sky is");
  });

  it("step 9 renders vocab match items and fill-in-the-blank sentences", () => {
    const html = renderStepInsert(9, full);
    expect(html).toContain("<span>1. orbit</span>");
    expect(html).toContain("a. The path a planet takes around a star.");
    expect(html).toContain("The moon ___ the earth.");
  });

  it("step 10 renders word-order and sentence-completion items", () => {
    const html = renderStepInsert(10, full);
    expect(html).toContain("The / sky / is / blue");
    expect(html).toContain("The sky is ___");
  });

  it("step 11 renders the writing prompt, plan prompts, and sentence frames", () => {
    const html = renderStepInsert(11, full);
    expect(html).toContain("Describe your favorite star.");
    expect(html).toContain("• What is your star?");
    expect(html).toContain("• My favorite star is ___.");
  });

  it("step 13 renders the reflection focus", () => {
    const html = renderStepInsert(13, full);
    expect(html).toContain("What did you learn about stars?");
    expect(html).toContain("I understood:");
  });

  it("degrades gracefully for a partial lesson across all steps", () => {
    const htmls = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]
      .map(stepNumber => renderStepInsert(stepNumber, minimal))
      .join("");
    expect(htmls).not.toContain("undefined");
    expect(htmls).not.toContain("[object Object]");
  });

  it("step 2 shows the empty vocabulary message when the lesson has none", () => {
    const html = renderStepInsert(2, minimal);
    expect(html).toContain('<p class="si-empty">');
    expect(html).toContain(getTranslations("en").stepInsert.noVocab);
    expect(html).not.toContain("undefined");
  });

  it("renders Thai strings when lang is th", () => {
    const th = getTranslations("th");
    const html = renderStepInsert(1, full, "th");
    expect(html).toContain(th.stepInsert.studentView);
  });
});
