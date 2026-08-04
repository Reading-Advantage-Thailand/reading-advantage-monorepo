import { describe, expect, it } from "vitest";

import { getTranslations } from "./i18n/index.js";
import { generateEndMatter } from "./end-matter.js";

const data = { seriesName: "Reading Advantage Quest", seriesLevel: "Level 1" };

describe("generateEndMatter", () => {
  it("renders the three end sections", () => {
    const t = getTranslations("en");
    const html = generateEndMatter(data);
    expect(html).toContain('<div class="tm-section tm-end-section">');
    expect(html).toContain(t.endMatter.selfAssessment.heading);
    expect(html).toContain(t.endMatter.certificate.heading);
    expect(html).toContain(t.endMatter.troubleshooting.heading);
  });

  it("renders the self-assessment callout and certificate sayings", () => {
    const t = getTranslations("en");
    const html = generateEndMatter(data);
    expect(html).toContain('<div class="tm-callout">');
    expect(html).toContain(t.endMatter.selfAssessment.beforeHeading);
    expect(html).toContain(t.endMatter.certificate.whatToSayHeading);
    expect(html).toContain(`<li>${t.endMatter.certificate.sayings[0]}</li>`);
  });

  it("renders the five troubleshooting blocks", () => {
    const t = getTranslations("en");
    const html = generateEndMatter(data);
    expect(html).toContain(t.endMatter.troubleshooting.pacingTitle);
    expect(html).toContain(t.endMatter.troubleshooting.appTitle);
    expect(html).toContain(t.endMatter.troubleshooting.writingTitle);
    expect(html).toContain(t.endMatter.troubleshooting.engagementTitle);
    expect(html).toContain(t.endMatter.troubleshooting.aiTitle);
  });

  it("uses the supplied primary theme color", () => {
    const html = generateEndMatter(data, { primary: "#be123c" });
    expect(html).toContain("color: #be123c;");
    expect(html).not.toContain("color: #1e40af;");
  });

  it("does not interpolate the series metadata (accepted but unused)", () => {
    const base = generateEndMatter(data);
    const other = generateEndMatter({ seriesName: "Other Series", seriesLevel: "Level 9" });
    expect(base).toEqual(other);
    expect(base).not.toContain("Reading Advantage Quest");
  });

  it("renders Thai strings when lang is th", () => {
    const th = getTranslations("th");
    const html = generateEndMatter(data, undefined, "th");
    expect(html).toContain(th.endMatter.selfAssessment.heading);
    expect(html).toContain(th.endMatter.certificate.heading);
    expect(html).toContain(th.endMatter.troubleshooting.heading);
  });
});
