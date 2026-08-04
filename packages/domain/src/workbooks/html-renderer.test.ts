import { describe, expect, it } from "vitest";

import type { WorkbookNormalizedContent, WorkbookSourceRecord } from "./contracts.js";
import { computeWorkbookDigest } from "./digest.js";
import type { WorkbookEdition } from "./edition-contracts.js";
import {
  escapeWorkbookHtml,
  renderEditionHtml,
  renderWorkbookContentHtml,
} from "./html-renderer.js";

function makeContent(
  overrides: Partial<WorkbookNormalizedContent> = {},
): WorkbookNormalizedContent {
  return {
    title: "Lighthouse",
    cefrLevel: "A2",
    paragraphs: [{ order: 0, text: "One." }],
    questions: [],
    assets: [],
    ...overrides,
  };
}

function makeEdition(
  contentOverrides: Partial<WorkbookNormalizedContent> = {},
  version = 1,
): WorkbookEdition {
  const content = makeContent(contentOverrides);
  const record: WorkbookSourceRecord = {
    identity: {
      sourceApp: "reading-advantage",
      sourceId: "src-1",
      sourceRevision: "rev-1",
      contentHash: computeWorkbookDigest(content),
    },
    content,
  };
  return {
    editionId: "edition-1",
    draftId: "draft-1",
    tenantId: "tenant-1",
    version,
    snapshot: record,
    contentHash: computeWorkbookDigest(content),
    publishedAt: "2026-08-03T00:00:00.000Z",
    publishedBy: "actor-1",
    idempotencyKey: "idem-1",
    supersededByEditionId: null,
    revokedAt: null,
  };
}

describe("renderWorkbookContentHtml", () => {
  it("renders a complete self-contained HTML document", () => {
    const html = renderWorkbookContentHtml(makeContent());
    expect(html.startsWith("<!doctype html><html lang=\"en\">")).toBe(true);
    expect(html).toContain("<meta charset=\"utf-8\">");
    expect(html).toContain("</body></html>");
  });

  it("renders the title as both the document title and the h1 heading", () => {
    const html = renderWorkbookContentHtml(makeContent({ title: "The Lighthouse" }));
    expect(html).toContain("<title>The Lighthouse</title>");
    expect(html).toContain("<h1>The Lighthouse</h1>");
  });

  it("renders the CEFR level line without the edition-version suffix", () => {
    const html = renderWorkbookContentHtml(makeContent({ cefrLevel: "B1" }));
    expect(html).toContain("<p>CEFR: B1</p>");
    expect(html).not.toContain("· Edition");
  });

  it("renders paragraphs in ascending order", () => {
    const html = renderWorkbookContentHtml(
      makeContent({
        paragraphs: [
          { order: 2, text: "Third." },
          { order: 0, text: "First." },
          { order: 1, text: "Second." },
        ],
      }),
    );
    expect(html.indexOf("First.")).toBeLessThan(html.indexOf("Second."));
    expect(html.indexOf("Second.")).toBeLessThan(html.indexOf("Third."));
  });

  it("renders questions with their choices as an ordered list", () => {
    const html = renderWorkbookContentHtml(
      makeContent({
        questions: [
          {
            questionId: "q-1",
            prompt: "What is a lighthouse?",
            questionType: "multiple-choice",
            choices: ["A building", "A boat"],
          },
        ],
      }),
    );
    expect(html).toContain("<ol>");
    expect(html).toContain("<li>What is a lighthouse?<ul>");
    expect(html).toContain("<li>A building</li>");
    expect(html).toContain("<li>A boat</li>");
    expect(html).toContain("</ol>");
  });

  it("omits the questions list when there are no questions", () => {
    const html = renderWorkbookContentHtml(makeContent({ questions: [] }));
    expect(html).not.toContain("<ol>");
  });

  it("escapes html in the title, cefr level, paragraphs, questions and choices", () => {
    const html = renderWorkbookContentHtml(
      makeContent({
        title: "A <b>title</b> & more",
        cefrLevel: "A1 & <x>",
        paragraphs: [{ order: 0, text: "<script>alert(\"x\")</script>" }],
        questions: [
          {
            questionId: "q-1",
            prompt: "5 < 6?",
            questionType: "multiple-choice",
            choices: ["yes & no"],
          },
        ],
      }),
    );
    expect(html).toContain(escapeWorkbookHtml("A <b>title</b> & more"));
    expect(html).not.toContain("<b>title</b>");
    expect(html).toContain(escapeWorkbookHtml("A1 & <x>"));
    expect(html).toContain(escapeWorkbookHtml("<script>alert(\"x\")</script>"));
    expect(html).not.toContain("<script>alert");
    expect(html).toContain(escapeWorkbookHtml("5 < 6?"));
    expect(html).toContain(escapeWorkbookHtml("yes & no"));
  });
});

describe("renderEditionHtml", () => {
  it("appends the edition-version suffix to the CEFR line", () => {
    const html = renderEditionHtml(makeEdition({ cefrLevel: "B1" }, 2));
    expect(html).toContain("<p>CEFR: B1 · Edition v2</p>");
  });

  it("renders the same body content as renderWorkbookContentHtml plus the version suffix", () => {
    const content = makeContent({ title: "Night Light", cefrLevel: "B1" });
    const editionHtml = renderEditionHtml(makeEdition({ title: "Night Light", cefrLevel: "B1" }, 2));
    const plainHtml = renderWorkbookContentHtml(content);
    expect(editionHtml.replace(" · Edition v2", "")).toBe(plainHtml);
  });
});

describe("print bridge listener", () => {
  it("injects the workbook:print listener into the draft shell before </body>", () => {
    const html = renderWorkbookContentHtml(makeContent());

    const bridgeIdx = html.indexOf("workbook:print");
    const bodyIdx = html.lastIndexOf("</body>");
    expect(bridgeIdx).toBeGreaterThanOrEqual(0);
    expect(bodyIdx).toBeGreaterThan(bridgeIdx);
    expect(html).toContain("window.print()");
    expect(html).toContain(
      "typeof event.data === 'string' && event.data === 'workbook:print'",
    );
  });

  it("injects the workbook:print listener into the edition shell before </body>", () => {
    const html = renderEditionHtml(makeEdition());

    const bridgeIdx = html.indexOf("workbook:print");
    const bodyIdx = html.lastIndexOf("</body>");
    expect(bridgeIdx).toBeGreaterThanOrEqual(0);
    expect(bodyIdx).toBeGreaterThan(bridgeIdx);
  });
});
