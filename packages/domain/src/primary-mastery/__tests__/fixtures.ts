import type { TagsExportInput, TagsPackageInput } from "../contracts.js";

/** A small header key: the short ids the fixtures use, with their real nodes. */
const KEY: TagsExportInput["objectiveKey"] = {
  "R10.2": { nodeId: "english.gse.skill.young.reading.10.can-recognise-the-use-of-a-question-mark", gse: 10, skill: "Reading", text: "Can recognise the use of a question mark to signal a question." },
  "R12.1": { nodeId: "english.gse.skill.young.reading.12.can-read-cardinal-numbers-up-to-ten-writ", gse: 12, skill: "Reading", text: "Can recognise some familiar words." },
  "L19.2": { nodeId: "english.gse.skill.young.listening.19.can-identify-everyday-objects-people-or", gse: 19, skill: "Listening", text: "Can understand basic questions about familiar things." },
};

/**
 * One tags export package in the shape of `content/primary/tags.json`.
 * @param overrides Fields to replace.
 * @returns A workbook package with a legacy article and two questions.
 */
export function sampleTagsPackage(overrides: Partial<TagsPackageInput> = {}): TagsPackageInput {
  return {
    key: "o2/1",
    book: "origins-2",
    lesson: "L01",
    title: "Pip the Puppy",
    role: "workbook",
    level: 2,
    legacy: { articleId: "cmlegacyart", questions: { p1: "cmlegacyq1", s1: "cmlegacys1" } },
    articleObjectives: [
      { shortId: "R12.1", role: "target" },
      { shortId: "L19.2", role: "supporting" },
    ],
    vocabulary: [
      { word: "puppy", pos: "noun", nodeId: "english.vocabulary.skill.puppy.noun", role: "glossed" },
      { word: "run", pos: "verb", nodeId: "english.vocabulary.skill.run.verb", role: "recycled" },
    ],
    questions: [
      { id: "p1", type: "mcq", objectives: ["L19.2"] },
      { id: "s1", type: "saq", objectives: ["R12.1", "R10.2"] },
      { id: "l1", type: "laq", objectives: [] },
    ],
    ...overrides,
  };
}

/**
 * A whole export: the header, one workbook package with legacy ids, one bank package without.
 * @returns The export value as JSON would give it.
 */
export function sampleTagsExport(): TagsExportInput {
  return {
    version: 1,
    generatedAt: "2026-10-06T10:00:00.000Z",
    source: "workbooks dashboard/scripts/export-tags.ts",
    graphs: {
      gse: { file: "mastery-advantage/english/gse-knowledge-space.json", commit: "7344a27", commitDate: "2026-05-20", sha256: "0123456789abcdef", schemaVersion: "v1" },
      vocabulary: { file: "mastery-advantage/english/cefr-vocabulary/cefr-vocabulary-knowledge-space.json", commit: "2daf568", commitDate: "2026-08-11", sha256: "fedcba9876543210", schemaVersion: "english-vocabulary.v1" },
    },
    objectiveKey: structuredClone(KEY),
    packages: [
      sampleTagsPackage(),
      sampleTagsPackage({
        key: "bank-1/1",
        book: "bank-1",
        lesson: "B001",
        title: "Lily's Toy Box",
        role: "bank",
        level: 1,
        legacy: null,
        articleObjectives: [{ shortId: "R10.2", role: "target" }],
        vocabulary: [{ word: "toy", pos: "noun", nodeId: "english.vocabulary.skill.toy.noun", role: "glossed" }],
        questions: [{ id: "p1", type: "mcq", objectives: ["R10.2"] }],
      }),
    ],
  };
}
