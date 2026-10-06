import { describe, expect, it } from "vitest";
import { summarizeTagCoverage, tagCoverageToMarkdown, type TagCoverageInput } from "../coverage.js";

const A1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const A2 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2";
const A3 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3";

function input(): TagCoverageInput {
  return {
    articles: [
      { id: A1, level: 2 },
      { id: A2, level: 2 },
      { id: A3, level: 3 },
    ],
    articleObjectives: [
      { articleId: A1, shortId: "R12.1", role: "target" },
      { articleId: A1, shortId: "L19.2", role: "supporting" },
      { articleId: A2, shortId: "R12.1", role: "target" },
    ],
    questions: [
      { id: "q1", articleId: A1, type: "mcq" },
      { id: "q2", articleId: A1, type: "saq" },
      { id: "q3", articleId: A2, type: "mcq" },
    ],
    questionObjectives: [{ questionId: "q1", questionType: "mcq", shortId: "L19.2" }],
    glossary: [
      { articleId: A1, word: "puppy", pos: "noun" },
      { articleId: A1, word: "pets", pos: "verb" },
      { articleId: A1, word: "best", pos: "adjective" },
      { articleId: A2, word: "mud", pos: "noun" },
    ],
    wordNodes: [
      { articleId: A1, word: "puppy", pos: "noun", nodeId: "english.vocabulary.skill.puppy.noun" },
      { articleId: A1, word: "pet", pos: "noun", nodeId: "english.vocabulary.skill.pet.noun" },
      { articleId: A1, word: "best", pos: "adjective-adverb", nodeId: "english.vocabulary.skill.best.adjective-adverb" },
    ],
  };
}

describe("tag coverage report (FR-6)", () => {
  it("lists the objectives of the key no article targets, by skill", () => {
    const report = summarizeTagCoverage(input());
    expect(report.objectivesInKey).toBe(300);
    expect(report.objectivesTargeted).toBe(1);
    expect(report.objectivesNotTargeted.length).toBe(299);
    expect(report.objectivesNotTargeted.find((entry) => entry.shortId === "R10.2")).toMatchObject({ skill: "Reading", gse: 10 });
    expect(report.objectivesNotTargeted.find((entry) => entry.shortId === "R12.1")).toBeUndefined();
  });

  it("counts tagged and untagged articles per level and lists the untagged ones", () => {
    const report = summarizeTagCoverage(input());
    expect(report.articlesByLevel).toEqual([
      { level: 2, articles: 2, tagged: 2 },
      { level: 3, articles: 1, tagged: 0 },
    ]);
    expect(report.articlesWithoutTags).toEqual([{ id: A3, level: 3 }]);
  });

  it("counts questions without objectives", () => {
    const report = summarizeTagCoverage(input());
    expect(report.questions).toEqual({ total: 3, withObjectives: 1, withoutObjectives: 2 });
  });

  it("lists glossary words with no node and nodes whose part of speech differs from the glossary; a node of several parts of speech covers one of them", () => {
    const report = summarizeTagCoverage(input());
    expect(report.wordsWithoutNode).toEqual([{ articleId: A2, word: "mud", pos: "noun" }]);
    expect(report.wordPosMismatches).toEqual([{ articleId: A1, word: "pets", glossaryPos: "verb", nodeId: "english.vocabulary.skill.pet.noun" }]);
  });

  it("prints Markdown with the headline counts", () => {
    const markdown = tagCoverageToMarkdown(summarizeTagCoverage(input()));
    expect(markdown).toContain("# Primary tag coverage");
    expect(markdown).toContain("| 2 | 2 | 2 |");
    expect(markdown).toMatch(/Objectives targeted by at least one article: 1 of 300/);
    expect(markdown).toContain("R10.2");
  });
});
