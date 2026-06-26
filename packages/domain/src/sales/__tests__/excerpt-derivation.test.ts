import { describe, it, expect } from "vitest";
import {
  extractCanonicalSourceExcerpts,
  getRoleplayEvaluationContext,
} from "../queries.js";
import { ScenarioNotFoundError } from "../errors.js";

/**
 * FR-4 (review_findings_followup_20260626): unit tests for the roleplay
 * excerpt-derivation logic. The prior track's route test mocked
 * getRoleplayEvaluationContext and only asserted the route passed excerpts
 * through — so if the derivation regressed to `[]` (the original FR-4 defect),
 * nothing would catch it. These tests pin the derivation itself.
 */

describe("extractCanonicalSourceExcerpts", () => {
  it("returns [] for empty or whitespace-only content", () => {
    expect(extractCanonicalSourceExcerpts("")).toEqual([]);
    expect(extractCanonicalSourceExcerpts("   \n\n   ")).toEqual([]);
  });

  it("splits on blank lines and trims each paragraph", () => {
    const content = "First paragraph.\n\n  Second paragraph.  \n\nThird.";
    expect(extractCanonicalSourceExcerpts(content)).toEqual([
      "First paragraph.",
      "Second paragraph.",
      "Third.",
    ]);
  });

  it("treats a single block (no blank lines) as one excerpt", () => {
    expect(extractCanonicalSourceExcerpts("One block only.")).toEqual([
      "One block only.",
    ]);
  });

  it("caps the result at maxExcerpts (default 8)", () => {
    const content = Array.from({ length: 20 }, (_, i) => `p${i}`).join("\n\n");
    expect(extractCanonicalSourceExcerpts(content)).toHaveLength(8);
    expect(extractCanonicalSourceExcerpts(content, 3)).toEqual(["p0", "p1", "p2"]);
  });

  it("drops empty paragraphs produced by runs of blank lines", () => {
    expect(extractCanonicalSourceExcerpts("a\n\n\n\nb")).toEqual(["a", "b"]);
  });
});

// ── getRoleplayEvaluationContext wiring ────────────────────────────────────

/** Build a mock rawDb whose select chain resolves to a queued sequence of rows. */
function mockDb(resultsInOrder: unknown[][]) {
  let call = 0;
  const chain = {
    select: () => chain,
    from: () => chain,
    where: () => chain,
    limit: () => Promise.resolve(resultsInOrder[call++] ?? []),
  };
  return chain as never;
}

const salesUser = { id: "rep-1", role: "SALES_REP", schoolId: "school-1" } as never;
const tenant = { schoolId: "school-1" } as never;

describe("getRoleplayEvaluationContext", () => {
  it("derives non-empty canonical excerpts from the lesson content", async () => {
    const db = mockDb([
      [{ id: "sc-1", rubricId: "rb-1", lessonId: "ls-1" }], // scenario
      [{ id: "rb-1", name: "Rubric" }], // rubric
      [{ content: "Para one.\n\nPara two." }], // lesson
    ]);

    const result = await getRoleplayEvaluationContext(
      { db, user: salesUser, tenant },
      { scenarioId: "sc-1" },
    );

    expect(result.scenario).toMatchObject({ id: "sc-1" });
    expect(result.rubric).toMatchObject({ id: "rb-1" });
    expect(result.canonicalSourceExcerpts).toEqual(["Para one.", "Para two."]);
  });

  it("returns [] excerpts when the lesson has no content (but still resolves)", async () => {
    const db = mockDb([
      [{ id: "sc-1", rubricId: "rb-1", lessonId: "ls-1" }],
      [{ id: "rb-1" }],
      [{ content: "" }],
    ]);

    const result = await getRoleplayEvaluationContext(
      { db, user: salesUser, tenant },
      { scenarioId: "sc-1" },
    );
    expect(result.canonicalSourceExcerpts).toEqual([]);
  });

  it("throws ScenarioNotFoundError when the scenario does not exist", async () => {
    const db = mockDb([[]]); // scenario query returns no rows

    await expect(
      getRoleplayEvaluationContext({ db, user: salesUser, tenant }, { scenarioId: "missing" }),
    ).rejects.toBeInstanceOf(ScenarioNotFoundError);
  });
});
