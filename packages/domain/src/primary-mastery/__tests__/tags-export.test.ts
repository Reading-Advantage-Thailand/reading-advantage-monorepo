import { describe, expect, it } from "vitest";
import { tagsExportSchema, tagsPackageSchema } from "../contracts.js";
import { parseTagsExport } from "../objective-key.js";
import { sampleTagsExport, sampleTagsPackage } from "./fixtures.js";

describe("tags export contract (FR-2)", () => {
  it("parses a valid export with a workbook package and a bank package", () => {
    const parsed = parseTagsExport(sampleTagsExport());
    expect(parsed.packages).toHaveLength(2);
    expect(parsed.graphRelease.gse.commit).toBe("7344a27");
    expect(parsed.packages[0]).toMatchObject({ key: "o2/1", role: "workbook", legacy: { articleId: "cmlegacyart" } });
    expect(parsed.packages[1]).toMatchObject({ key: "bank-1/1", role: "bank", legacy: null });
  });

  it("accepts the glossary form as a string, null, or absent", () => {
    const parsed = parseTagsExport(sampleTagsExport());
    expect(parsed.packages[0].vocabulary.map((entry) => entry.glossaryWord)).toEqual(["puppies", null]);
    expect(parsed.packages[1].vocabulary[0].glossaryWord).toBeUndefined();
  });

  it("keeps both sense nodes of one word and part of speech", () => {
    const pkg = tagsPackageSchema.parse(sampleTagsPackage({ vocabulary: [
      { word: "bat", pos: "noun", nodeId: "english.vocabulary.skill.bat.noun", role: "glossed" },
      { word: "bat", pos: "noun", nodeId: "english.vocabulary.skill.bat-as-sports-equipment.noun", role: "glossed" },
    ] }));
    expect(pkg.vocabulary).toHaveLength(2);
  });

  it("fails on a short id missing from the header key, naming the package and the id", () => {
    const bad = sampleTagsExport();
    bad.packages[1].questions[0].objectives = ["R99.9"];
    const result = tagsExportSchema.safeParse(bad);
    expect(result.success).toBe(false);
    const message = result.success ? "" : result.error.issues.map((issue) => issue.message).join("\n");
    expect(message).toContain("bank-1/1");
    expect(message).toContain("R99.9");
  });

  it("fails on an article objective whose short id is unknown", () => {
    const bad = sampleTagsExport();
    bad.packages[0].articleObjectives.push({ shortId: "L77.1", role: "target" });
    expect(tagsExportSchema.safeParse(bad).success).toBe(false);
  });

  it("reports header nodes that differ from the key in code", () => {
    const drift = sampleTagsExport();
    drift.objectiveKey["R10.2"].nodeId = "english.gse.skill.young.reading.10.something-else";
    const parsed = parseTagsExport(drift);
    expect(parsed.keyDrift).toEqual([{ shortId: "R10.2", exportNodeId: "english.gse.skill.young.reading.10.something-else", codeNodeId: "english.gse.skill.young.reading.10.can-recognise-the-use-of-a-question-mark" }]);
    expect(parseTagsExport(sampleTagsExport()).keyDrift).toEqual([]);
  });

  it("passes the extra graph fields through unread and rejects an unknown role", () => {
    const parsed = parseTagsExport(sampleTagsExport());
    expect(parsed.graphRelease.gse).toEqual({ file: "mastery-advantage/english/gse-knowledge-space.json", commit: "7344a27", schemaVersion: "v1" });
    const bad = sampleTagsExport();
    (bad.packages[0] as { role: string }).role = "print";
    expect(tagsExportSchema.safeParse(bad).success).toBe(false);
  });
});
