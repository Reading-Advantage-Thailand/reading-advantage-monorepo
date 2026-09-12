import { describe, expect, it } from "vitest";

import {
  normalizeReadingAdvantageSource,
  type ReadingAdvantageSourceInput,
} from "../workbooks/reading-advantage-normalizer.js";
import { workbookSourceRecordSchema } from "../workbooks/contracts.js";
import { WorkbookCatalogError } from "../workbooks/content-catalog-port.js";
import { computeWorkbookDigest } from "../workbooks/digest.js";

const BASE_INPUT = {
  article: {
    id: "art-42",
    title: "The Lighthouse",
    passage: "First para.\n\n\n\n  Second para.  \n\nThird para.",
    cefr_level: "A2",
    ra_level: 3,
    type: "fiction",
    genre: "adventure",
    image_description: "a lighthouse",
  },
  wordList: [{ vocabulary: "beam", definition: { en: "a ray of light" } }],
  mcq: [
    { question: "What turned?", options: ["light", "boat"] },
    { question: "Who came home?", options: ["sailor", "dog"] },
  ],
  sourceRevision: "rev-7",
};

/**
 * Creates a shape-valid Reading Advantage source payload for normalization.
 * @param overrides Optional partial payload merged over the base fixture.
 * @returns A raw source input valid under readingAdvantageSourceInputSchema.
 */
function createInput(
  overrides: Partial<ReadingAdvantageSourceInput> = {},
): ReadingAdvantageSourceInput {
  return {
    ...BASE_INPUT,
    ...overrides,
    article: { ...BASE_INPUT.article, ...(overrides.article ?? {}) },
  };
}

describe("reading advantage normalizer / success", () => {
  it("returns a record that satisfies workbookSourceRecordSchema", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(workbookSourceRecordSchema.safeParse(record).success).toBe(true);
  });

  it("sets identity.sourceApp, sourceId, and sourceRevision", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.identity.sourceApp).toBe("reading-advantage");
    expect(record.identity.sourceId).toBe("art-42");
    expect(record.identity.sourceRevision).toBe("rev-7");
  });

  it("hashes the content with computeWorkbookDigest", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.identity.contentHash).toBe(computeWorkbookDigest(record.content));
  });

  it("produces a sha256 hex content hash", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.identity.contentHash).toMatch(/^sha256:[0-9a-f]{64}$/);
  });

  it("drops blank paragraphs so exactly 3 remain", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.content.paragraphs).toHaveLength(3);
  });

  it("assigns ascending order values 0, 1, 2", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.content.paragraphs.map((paragraph) => paragraph.order)).toEqual([0, 1, 2]);
  });

  it("trims paragraph text", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.content.paragraphs[1].text).toBe("Second para.");
  });

  it("produces two multiple-choice questions with the expected first question", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.content.questions).toHaveLength(2);
    const first = record.content.questions[0];
    expect(first.questionId).toBe("q-1");
    expect(first.questionType).toBe("multiple-choice");
    expect(first.choices).toEqual(["light", "boat"]);
  });

  it("never invents a correctChoiceIndex", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    for (const question of record.content.questions) {
      expect(question.correctChoiceIndex).toBeUndefined();
    }
  });

  it("emits an empty assets array", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    expect(record.content.assets).toEqual([]);
  });

  it("leaks no public URLs in the serialized record", () => {
    const record = normalizeReadingAdvantageSource(createInput());
    const serialized = JSON.stringify(record);
    expect(serialized).not.toContain("https://");
    expect(serialized).not.toContain("storage.googleapis");
  });

  it("normalizing the same input twice yields the same contentHash", () => {
    const first = normalizeReadingAdvantageSource(createInput());
    const second = normalizeReadingAdvantageSource(createInput());
    expect(first.identity.contentHash).toBe(second.identity.contentHash);
  });
});

describe("reading advantage normalizer / failure", () => {
  it("throws INCOMPATIBLE_SOURCE_SHAPE with issues when `article` is omitted", () => {
    const { article: _omitted, ...withoutArticle } = createInput();
    expect(() => normalizeReadingAdvantageSource(withoutArticle)).toThrow(
      WorkbookCatalogError,
    );
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizeReadingAdvantageSource(withoutArticle);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("INCOMPATIBLE_SOURCE_SHAPE");
    expect(caught?.issues.length).toBeGreaterThan(0);
  });

  it("rejects a passage of only whitespace at article.passage", () => {
    const input = createInput({
      article: { passage: "   \n\n\n\n  " },
    });
    expect(() => normalizeReadingAdvantageSource(input)).toThrow(WorkbookCatalogError);
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizeReadingAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught?.issues.some((issue) => issue.path === "article.passage")).toBe(true);
  });

  it("rejects an mcq entry with a numeric question and a string options", () => {
    const input = createInput({
      mcq: [
        { question: 42, options: "light" },
      ] as unknown as ReadingAdvantageSourceInput["mcq"],
    });
    expect(() => normalizeReadingAdvantageSource(input)).toThrow(WorkbookCatalogError);
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizeReadingAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("INCOMPATIBLE_SOURCE_SHAPE");
    expect(caught?.issues.length).toBeGreaterThan(0);
  });
});
