import { describe, expect, it } from "vitest";

import { getTranslations } from "./i18n/index.js";
import { generateFrontMatter } from "./front-matter.js";

const data = { seriesName: "Reading Advantage Quest", seriesLevel: "Level 1", cefrLevel: "A1" };

describe("generateFrontMatter", () => {
  it("renders the title page block", () => {
    const html = generateFrontMatter(data);
    expect(html).toContain('<div class="tm-title-page">');
    expect(html).toContain('<div class="tm-title-content" style="border-color: #1e40af;">');
    expect(html).toContain('<div class="tm-title-badge">');
    expect(html).toContain('<h1 class="tm-title-series"');
  });

  it("interpolates series name, level, and CEFR into the title page", () => {
    const html = generateFrontMatter(data);
    expect(html).toContain("Reading Advantage Quest");
    expect(html).toContain("Level 1");
    expect(html).toContain("A1");
  });

  it("uses the supplied theme colors when provided", () => {
    const html = generateFrontMatter(data, { primary: "#228b22", secondary: "#8b4513" });
    expect(html).toContain("border-color: #228b22;");
    expect(html).toContain("color: #8b4513;");
    expect(html).not.toContain("border-color: #1e40af;");
  });

  it("escapes series metadata interpolated into the title page", () => {
    const html = generateFrontMatter({
      seriesName: '<script>alert("x")</script> & Sons',
      seriesLevel: "Level <b>1</b>",
      cefrLevel: "A&1",
    });
    expect(html).toContain("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; Sons");
    expect(html).toContain("Level &lt;b&gt;1&lt;/b&gt;");
    expect(html).toContain("A&amp;1");

    const titlePage = html.slice(
      html.indexOf('<div class="tm-title-page">'),
      html.indexOf('<div class="tm-section tm-preface">'),
    );
    expect(titlePage).not.toContain("<script>alert");
    expect(titlePage).not.toContain("<b>1</b>");
  });

  it("renders the preface, structure, pedagogy, games, spelling, and goals sections", () => {
    const t = getTranslations("en");
    const html = generateFrontMatter(data);
    expect(html).toContain('<div class="tm-section tm-preface">');
    expect(html).toContain(t.preface.heading);
    expect(html).toContain(t.lessonPlanStructure.heading);
    expect(html).toContain(t.pedagogy.heading);
    expect(html).toContain(t.flashcardGames.heading);
    expect(html).toContain(t.spellingRoutine.heading);
    expect(html).toContain(t.goalSetting.heading);
  });

  it("interpolates series metadata into the preface welcome", () => {
    const html = generateFrontMatter(data);
    expect(html).toContain(`<strong>Reading Advantage Quest Level 1</strong>`);
  });

  it("renders English strings by default", () => {
    const en = getTranslations("en");
    const html = generateFrontMatter(data);
    expect(html).toContain(en.titlePage.badge);
    expect(html).not.toContain(getTranslations("th").titlePage.badge);
  });

  it("renders Thai strings when lang is th", () => {
    const th = getTranslations("th");
    const html = generateFrontMatter(data, undefined, "th");
    expect(html).toContain(th.titlePage.badge);
    expect(html).not.toContain(getTranslations("en").titlePage.badge);
  });
});
