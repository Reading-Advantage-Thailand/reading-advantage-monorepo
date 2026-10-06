import { describe, expect, it } from "vitest";
import type { DB } from "@reading-advantage/db";
import { createMockDb } from "../../__tests__/mock-db.js";
import { getArticleObjectives, getArticleWordNodes, getQuestionObjectives } from "../queries.js";

const ART = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("objective tag read functions (FR-7)", () => {
  it("returns an article's objectives with their nodes and roles", async () => {
    const db = createMockDb({ selectResults: [{ shortId: "R12.1", nodeId: "n1", role: "target" }, { shortId: "L19.2", nodeId: "n2", role: "supporting" }] });
    const rows = await getArticleObjectives({ db: db as unknown as DB, articleId: ART });
    expect(rows).toEqual([{ shortId: "R12.1", nodeId: "n1", role: "target" }, { shortId: "L19.2", nodeId: "n2", role: "supporting" }]);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("returns the objectives of several questions grouped by question id, and nothing for an empty list", async () => {
    const db = createMockDb({ selectResults: [
      { questionId: "q1", questionType: "mcq", shortId: "L19.2", nodeId: "n2" },
      { questionId: "q2", questionType: "saq", shortId: "R12.1", nodeId: "n1" },
      { questionId: "q2", questionType: "saq", shortId: "R10.2", nodeId: "n0" },
    ] });
    const byQuestion = await getQuestionObjectives({ db: db as unknown as DB, questionIds: ["q1", "q2"] });
    expect(byQuestion.get("q1")).toEqual([{ questionType: "mcq", shortId: "L19.2", nodeId: "n2" }]);
    expect(byQuestion.get("q2")).toHaveLength(2);
    const empty = await getQuestionObjectives({ db: db as unknown as DB, questionIds: [] });
    expect(empty.size).toBe(0);
    expect(db.select).toHaveBeenCalledTimes(1);
  });

  it("returns an article's word nodes", async () => {
    const db = createMockDb({ selectResults: [{ word: "puppy", pos: "noun", nodeId: "english.vocabulary.skill.puppy.noun", role: "glossed" }] });
    const rows = await getArticleWordNodes({ db: db as unknown as DB, articleId: ART });
    expect(rows).toEqual([{ word: "puppy", pos: "noun", nodeId: "english.vocabulary.skill.puppy.noun", role: "glossed" }]);
  });
});
