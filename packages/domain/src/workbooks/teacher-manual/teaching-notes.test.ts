import { describe, expect, it } from "vitest";

import { getTranslations } from "./i18n/index.js";
import { getTeachingNotes, renderTeachingNotes } from "./teaching-notes.js";

describe("getTeachingNotes", () => {
  it("returns bundled note content for steps 1-13", () => {
    for (const stepNumber of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]) {
      const note = getTeachingNotes(stepNumber);
      expect(Array.isArray(note.teacherActions)).toBe(true);
      expect(Array.isArray(note.teacherLanguage)).toBe(true);
      expect(Array.isArray(note.studentActions)).toBe(true);
      expect(Array.isArray(note.watchFor)).toBe(true);
    }
  });

  it("returns empty arrays for steps without bundled notes", () => {
    const note = getTeachingNotes(99);
    expect(note).toEqual({
      teacherActions: [],
      teacherLanguage: [],
      studentActions: [],
      watchFor: [],
    });
  });

  it("returns Thai notes for lang th", () => {
    const th = getTranslations("th");
    expect(getTeachingNotes(1, undefined, "th")).toEqual({
      teacherActions: th.teachingNotesContent[1].teacherActions,
      teacherLanguage: th.teachingNotesContent[1].teacherLanguage,
      studentActions: th.teachingNotesContent[1].studentActions,
      watchFor: th.teachingNotesContent[1].watchFor,
    });
  });
});

describe("renderTeachingNotes", () => {
  it("renders the four note sections with their headers", () => {
    const headers = getTranslations("en").teachingNotes;
    const html = renderTeachingNotes(getTeachingNotes(1));
    expect(html).toContain('<div class="tm-teaching-notes">');
    expect(html).toContain(headers.teacherActions);
    expect(html).toContain(headers.teacherLanguage);
    expect(html).toContain(headers.studentActions);
    expect(html).toContain(headers.watchFor);
  });

  it("renders the bundled note content", () => {
    const note = getTeachingNotes(1);
    const html = renderTeachingNotes(note);
    for (const action of note.teacherActions) {
      expect(html).toContain(`<li>${action}</li>`);
    }
  });

  it("escapes note content before interpolation", () => {
    const html = renderTeachingNotes({
      teacherActions: ['Say "<hello>" & goodbye'],
      teacherLanguage: [],
      studentActions: [],
      watchFor: [],
    });
    expect(html).toContain("<li>Say &quot;&lt;hello&gt;&quot; &amp; goodbye</li>");
    expect(html).not.toContain('<li>Say "<hello>" & goodbye</li>');
  });

  it("uses the supplied primary theme color", () => {
    const html = renderTeachingNotes(getTeachingNotes(1), { primary: "#228b22" });
    expect(html).toContain("color: #228b22;");
  });

  it("renders empty note sections without emitting undefined", () => {
    const html = renderTeachingNotes({
      teacherActions: [],
      teacherLanguage: [],
      studentActions: [],
      watchFor: [],
    });
    expect(html).not.toContain("undefined");
    expect(html).not.toContain("[object Object]");
    expect(html).toContain('<div class="tm-teaching-notes">');
  });
});
