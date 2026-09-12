import { describe, expect, it } from "vitest";

import {
  normalizePrimaryAdvantageSource,
  type PrimaryAdvantageSourceInput,
} from "../workbooks/primary-advantage-normalizer.js";
import {
  normalizeReadingAdvantageSource,
  type ReadingAdvantageSourceInput,
} from "../workbooks/reading-advantage-normalizer.js";
import { workbookSourceRecordSchema } from "../workbooks/contracts.js";
import { WorkbookCatalogError } from "../workbooks/content-catalog-port.js";

const BASE_INPUT: PrimaryAdvantageSourceInput = {
  article: {
    id: "pa-7",
    title: "Shared Story",
    passage: "One.\n\n\n\n  Two.  \n\nThree.",
    cefrLevel: "A2",
    raLevel: 3,
    published: true,
    isApproved: true,
    isDraft: false,
    isPublic: false,
    type: "fiction",
    genre: "adventure",
    imageDescription: "x",
  },
  mcq: [{ question: "Which?", options: ["a", "b"] }],
  sourceRevision: "rev-2",
};

const READING_ADVANTAGE_INPUT: ReadingAdvantageSourceInput = {
  article: {
    id: "ra-1",
    title: "Shared Story",
    passage: "One.\n\nTwo.\n\nThree.",
    cefr_level: "A2",
    ra_level: 3,
  },
  wordList: [],
  mcq: [{ question: "Which?", options: ["a", "b"] }],
  sourceRevision: "rev-2",
};

/**
 * Creates a shape-valid Primary Advantage source payload for normalization.
 * @param articleOverrides Optional partial article merged over the base fixture.
 * @returns A raw source input valid under primaryAdvantageSourceInputSchema.
 */
function createInput(
  articleOverrides: Partial<PrimaryAdvantageSourceInput["article"]> = {},
): PrimaryAdvantageSourceInput {
  return {
    ...BASE_INPUT,
    article: { ...BASE_INPUT.article, ...articleOverrides },
  };
}

describe("primary advantage normalizer / success", () => {
  it("returns a record that satisfies workbookSourceRecordSchema", () => {
    const record = normalizePrimaryAdvantageSource(createInput());
    expect(workbookSourceRecordSchema.safeParse(record).success).toBe(true);
  });

  it("sets identity.sourceApp to primary-advantage and sourceId to pa-7", () => {
    const record = normalizePrimaryAdvantageSource(createInput());
    expect(record.identity.sourceApp).toBe("primary-advantage");
    expect(record.identity.sourceId).toBe("pa-7");
  });

  it("maps the camelCase cefrLevel onto content.cefrLevel", () => {
    const record = normalizePrimaryAdvantageSource(createInput());
    expect(record.content.cefrLevel).toBe("A2");
  });

  it("drops blank paragraphs so exactly 3 remain with orders 0, 1, 2", () => {
    const record = normalizePrimaryAdvantageSource(createInput());
    expect(record.content.paragraphs).toHaveLength(3);
    expect(record.content.paragraphs.map((paragraph) => paragraph.order)).toEqual([0, 1, 2]);
  });

  it("trims paragraph text so the second paragraph is exactly Two.", () => {
    const record = normalizePrimaryAdvantageSource(createInput());
    expect(record.content.paragraphs[1].text).toBe("Two.");
  });

  it("emits an empty assets array", () => {
    const record = normalizePrimaryAdvantageSource(createInput());
    expect(record.content.assets).toEqual([]);
  });

  it("leaks no http URLs in the serialized record", () => {
    const record = normalizePrimaryAdvantageSource(createInput());
    expect(JSON.stringify(record)).not.toContain("http");
  });
});

describe("primary advantage normalizer / eligibility fails closed", () => {
  it("fails closed when published is false", () => {
    const input = createInput({ published: false });
    expect(() => normalizePrimaryAdvantageSource(input)).toThrow(WorkbookCatalogError);
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("SOURCE_NOT_ELIGIBLE");
    expect(caught?.issues.some((issue) => issue.path === "article.published")).toBe(true);
  });

  it("fails closed when isApproved is false", () => {
    const input = createInput({ isApproved: false });
    expect(() => normalizePrimaryAdvantageSource(input)).toThrow(WorkbookCatalogError);
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("SOURCE_NOT_ELIGIBLE");
    expect(caught?.issues.some((issue) => issue.path === "article.isApproved")).toBe(true);
  });

  it("fails closed when isDraft is true", () => {
    const input = createInput({ isDraft: true });
    expect(() => normalizePrimaryAdvantageSource(input)).toThrow(WorkbookCatalogError);
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("SOURCE_NOT_ELIGIBLE");
    expect(caught?.issues.some((issue) => issue.path === "article.isDraft")).toBe(true);
  });

  it("reports exactly 3 issues when every condition fails at once", () => {
    const input = createInput({ published: false, isApproved: false, isDraft: true });
    expect.hasAssertions();
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("SOURCE_NOT_ELIGIBLE");
    expect(caught?.issues).toHaveLength(3);
    expect(caught?.issues.map((issue) => issue.path)).toEqual([
      "article.published",
      "article.isApproved",
      "article.isDraft",
    ]);
  });

  it("does not leak source content into the thrown error", () => {
    const input = createInput({
      title: "TOP-SECRET-TITLE",
      passage: "SECRET-BODY One.\n\nTwo.\n\nThree.",
      published: false,
    });
    expect.hasAssertions();
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("SOURCE_NOT_ELIGIBLE");
    const serializedIssues = JSON.stringify(caught?.issues ?? []);
    expect(caught?.message).not.toContain("TOP-SECRET-TITLE");
    expect(caught?.message).not.toContain("SECRET-BODY");
    expect(serializedIssues).not.toContain("TOP-SECRET-TITLE");
    expect(serializedIssues).not.toContain("SECRET-BODY");
  });

  it("does not block eligibility when isPublic is false", () => {
    const record = normalizePrimaryAdvantageSource(createInput({ isPublic: false }));
    expect(workbookSourceRecordSchema.safeParse(record).success).toBe(true);
  });

  it("still returns a valid record when isPublic is true", () => {
    const record = normalizePrimaryAdvantageSource(createInput({ isPublic: true }));
    expect(workbookSourceRecordSchema.safeParse(record).success).toBe(true);
  });
});

describe("primary advantage normalizer / malformed shapes fail closed", () => {
  it("throws INCOMPATIBLE_SOURCE_SHAPE with issues when `article` is omitted", () => {
    const { article: _omitted, ...withoutArticle } = createInput();
    expect(() => normalizePrimaryAdvantageSource(withoutArticle)).toThrow(
      WorkbookCatalogError,
    );
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(withoutArticle);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("INCOMPATIBLE_SOURCE_SHAPE");
    expect(caught?.issues.length).toBeGreaterThan(0);
  });

  it("rejects a passage of only whitespace at article.passage", () => {
    const input = createInput({ passage: "   \n\n\n\n  " });
    expect(() => normalizePrimaryAdvantageSource(input)).toThrow(
      WorkbookCatalogError,
    );
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("INCOMPATIBLE_SOURCE_SHAPE");
    expect(caught?.issues.some((issue) => issue.path === "article.passage")).toBe(true);
  });

  it("rejects an mcq entry with a numeric question and a string options", () => {
    const input = {
      ...createInput(),
      mcq: [
        { question: 42, options: "light" },
      ] as unknown as PrimaryAdvantageSourceInput["mcq"],
    };
    expect(() => normalizePrimaryAdvantageSource(input)).toThrow(
      WorkbookCatalogError,
    );
    let caught: WorkbookCatalogError | undefined;
    try {
      normalizePrimaryAdvantageSource(input);
    } catch (error) {
      caught = error as WorkbookCatalogError;
    }
    expect(caught).toBeInstanceOf(WorkbookCatalogError);
    expect(caught?.code).toBe("INCOMPATIBLE_SOURCE_SHAPE");
    expect(caught?.issues.length).toBeGreaterThan(0);
  });
});

describe("cross-app contract parity", () => {
  it("normalizes a Reading Advantage source with equivalent content", () => {
    const record = normalizeReadingAdvantageSource(READING_ADVANTAGE_INPUT);
    expect(workbookSourceRecordSchema.safeParse(record).success).toBe(true);
  });

  it("produces the same contentHash across both source shapes", () => {
    const primaryRecord = normalizePrimaryAdvantageSource(createInput());
    const readingRecord = normalizeReadingAdvantageSource(READING_ADVANTAGE_INPUT);
    expect(readingRecord.identity.contentHash).toBe(primaryRecord.identity.contentHash);
  });
});
