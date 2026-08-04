import { describe, expect, it } from "vitest";

import type { TeacherManualOptions } from "./types.js";
import { wrapTeacherManualDocument } from "./document-wrapper.js";

describe("Teacher Manual Document Wrapper", () => {
  const defaultOptions: TeacherManualOptions = {
    seriesName: "Origins",
    seriesLevel: "2",
    cefrLevel: "A0",
    type: "primary",
    lang: "en",
  };

  const frontMatterHtml = '<div class="tm-title-page"><h1>Title</h1></div><div class="tm-section tm-preface"><h2>Preface</h2></div>';
  const lessonPlansHtml = '<div class="tm-lesson-plan" id="lesson-1"><div class="tm-step-block"><div class="step-insert" data-step="1"></div></div></div>';
  const endMatterHtml = '<div class="tm-section tm-end-section"><h2>End</h2></div>';

  describe("wrapTeacherManualDocument", () => {
    it("should generate a complete HTML document", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("<html");
      expect(html).toContain("</html>");
      expect(html).toContain("<body>");
    });

    it("should include the Paged.js polyfill", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      expect(html).toMatch(/paged\.polyfill\.js/);
    });

    it("should inject the rAF resilience shim before the Paged.js polyfill", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      const shimIdx = html.indexOf("requestAnimationFrame");
      const polyfillIdx = html.indexOf("paged.polyfill.js");
      expect(shimIdx).toBeGreaterThanOrEqual(0);
      expect(polyfillIdx).toBeGreaterThan(shimIdx);
      expect(html).toContain("visibilityState");
    });

    it("should arm a setTimeout(0) fallback alongside rAF so progress survives frame starvation", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      // The visible path must not depend on native rAF: a callback is wrapped
      // so whichever of rAF / setTimeout(0) fires first runs it once.
      expect(html).toContain("nativeRaf(wrapped)");
      expect(html).toContain("wrapped(performance.now())");
      expect(html).toContain("setTimeout(function () {");
    });

    it("should flush the hidden-queue on visibilitychange so a hidden tab resumes on show", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      expect(html).toContain("addEventListener('visibilitychange'");
      expect(html).toContain("flushPending()");
      expect(html).toContain("nativeCancelRaf");
    });

    it("should not apply overflow:hidden to the title page", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      const titlePageRule = html.match(/\.tm-title-page \{[^}]*\}/)?.[0] ?? "";
      expect(titlePageRule).toContain("break-after: page");
      expect(titlePageRule).not.toContain("overflow");
    });

    it("should not mark the full step block as unbreakable", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      const stepBlockRule = html.match(/\.tm-step-block \{[^}]*\}/)?.[0] ?? "";
      expect(stepBlockRule).toContain("margin-bottom");
      expect(stepBlockRule).not.toContain("break-inside");
    });

    it("should keep the student-view insert unbreakable (Task 3.3 intent)", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      expect(html).toMatch(/\.step-insert \{[\s\S]*?break-inside:\s*avoid/);
    });

    it("should include front matter, lesson plans, and end matter in the body", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      expect(html).toContain("tm-title-page");
      expect(html).toContain("tm-lesson-plan");
      expect(html).toContain("tm-end-section");
    });

    it("should interpolate the series theme colors into the styles", () => {
      // Origins resolves to the green/brown palette in getThemeColors.
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      expect(html).toContain("#228b22");
      expect(html).toContain("#8b4513");
    });

    it("should set the html lang attribute to en by default", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, defaultOptions);

      expect(html).toContain('<html lang="en">');
      expect(html).not.toContain('<html lang="th">');
    });

    it("should set the html lang attribute to th when lang is th", () => {
      const html = wrapTeacherManualDocument(frontMatterHtml, lessonPlansHtml, endMatterHtml, {
        ...defaultOptions,
        lang: "th",
      });

      expect(html).toContain('<html lang="th">');
      expect(html).not.toContain('<html lang="en">');
    });
  });
});
