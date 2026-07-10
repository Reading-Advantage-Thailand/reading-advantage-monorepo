import { describe, expect, it } from "vitest";

import {
  CurriculumBindingReleaseSchema,
  buildBindingCoverageReport,
  parseCurriculumBindingRelease,
  projectMasteryEvidence,
  validateCurriculumBindings,
} from "../index.js";
import { codeKnowledgeGraph } from "../data.js";

function binding(overrides: Record<string, unknown> = {}) {
  return {
    activityId: "codecamp.git-github.quiz.q1",
    activityKind: "question",
    source: { moduleSlug: "git-github", lessonOrder: 4, itemOrder: 1 },
    objectiveIds: ["codecamp.workflow.skill.git-branches"],
    practiceMode: "assessment",
    evidenceMode: "assessed",
    evidenceWeight: 0.3,
    evidenceSource: "quiz-response",
    variantId: "git-github-quiz-q1",
    variantFamily: "git-github-quiz",
    misconceptionTags: ["git-history-confusion"],
    rubricRefs: ["codecamp.quiz.v1"],
    resourceRefs: [],
    ...overrides,
  };
}

function release() {
  return {
    schemaVersion: "codecamp-curriculum-bindings.v1",
    releaseId: "codecamp-curriculum-2026-07",
    graphVersion: codeKnowledgeGraph.version,
    curriculumVersion: "19-modules.88-lessons.v1",
    provenance: {
      sourcePath: "packages/db/src/seed/codecamp-curriculum-data.ts",
      generatedAt: "2026-07-10T17:30:00.000Z",
      reviewedBy: "Codecamp curriculum owner",
    },
    inventory: {
      publishedModules: 1,
      lessons: 0,
      questions: 1,
      exercises: 0,
      repositories: 0,
      portfolios: 0,
    },
    modules: [
      {
        slug: "git-github",
        order: 2,
        status: "published",
        lessonCount: 0,
        questionCount: 1,
        exerciseCount: 0,
        repositoryCount: 0,
      },
    ],
    bindings: [binding()],
  };
}

describe("CurriculumBindingReleaseSchema", () => {
  it("accepts a strict representative assessed binding", () => {
    expect(CurriculumBindingReleaseSchema.safeParse(release()).success).toBe(true);
  });

  it("rejects unknown release, module, activity, source, and provenance fields", () => {
    const mutations = [
      (input: ReturnType<typeof release>) => Object.assign(input, { surprise: true }),
      (input: ReturnType<typeof release>) => Object.assign(input.modules[0]!, { surprise: true }),
      (input: ReturnType<typeof release>) => Object.assign(input.bindings[0]!, { surprise: true }),
      (input: ReturnType<typeof release>) => Object.assign(input.bindings[0]!.source, { surprise: true }),
      (input: ReturnType<typeof release>) => Object.assign(input.provenance, { surprise: true }),
    ];
    for (const mutate of mutations) {
      const input = release();
      mutate(input);
      expect(CurriculumBindingReleaseSchema.safeParse(input).success).toBe(false);
    }
  });
});

describe("validateCurriculumBindings", () => {
  it("passes a representative binding release", () => {
    expect(validateCurriculumBindings(release(), codeKnowledgeGraph)).toEqual({ valid: true, issues: [] });
  });

  it.each([
    ["GRAPH_VERSION_MISMATCH", (input: ReturnType<typeof release>) => { input.graphVersion = "0.0.1"; }],
    ["UNKNOWN_OBJECTIVE", (input: ReturnType<typeof release>) => { input.bindings[0]!.objectiveIds = ["codecamp.missing.skill"]; }],
    ["DUPLICATE_ACTIVITY_ID", (input: ReturnType<typeof release>) => { input.bindings.push(structuredClone(input.bindings[0]!)); }],
    ["DUPLICATE_VARIANT_EVIDENCE", (input: ReturnType<typeof release>) => { input.bindings.push(binding({ activityId: "codecamp.git-github.quiz.q2" })); input.inventory.questions = 2; input.modules[0]!.questionCount = 2; }],
    ["INVENTORY_COVERAGE_MISMATCH", (input: ReturnType<typeof release>) => { input.inventory.questions = 2; input.modules[0]!.questionCount = 2; }],
  ])("rejects %s", (code, mutate) => {
    const input = release();
    mutate(input);
    expect(validateCurriculumBindings(input, codeKnowledgeGraph).issues.map((issue) => issue.code)).toContain(code);
  });

  it("rejects exposure that can mutate mastery", () => {
    const input = release();
    input.bindings[0] = binding({
      activityId: "codecamp.git-github.lesson.1",
      activityKind: "lesson",
      practiceMode: "exposure",
      evidenceMode: "exposure",
      evidenceWeight: 0.2,
      evidenceSource: "lesson-view",
      variantId: null,
      variantFamily: null,
      misconceptionTags: [],
      rubricRefs: [],
      resourceRefs: ["lesson:git-github:1"],
    });
    expect(validateCurriculumBindings(input, codeKnowledgeGraph).issues.map((issue) => issue.code)).toContain("EXPOSURE_MUTATES_MASTERY");
  });

  it("rejects assessed evidence without variant, misconception, rubric, or positive weight", () => {
    const input = release();
    input.bindings[0] = binding({
      evidenceWeight: 0,
      variantId: null,
      variantFamily: null,
      misconceptionTags: [],
      rubricRefs: [],
    });
    expect(validateCurriculumBindings(input, codeKnowledgeGraph).issues.map((issue) => issue.code)).toContain("ASSESSED_EVIDENCE_INCOMPLETE");
  });
});

describe("binding projections and reports", () => {
  it("projects only assessed activities into mastery evidence", () => {
    const input = release();
    input.bindings.push(binding({
      activityId: "codecamp.git-github.lesson.1",
      activityKind: "lesson",
      practiceMode: "exposure",
      evidenceMode: "exposure",
      evidenceWeight: 0,
      evidenceSource: "lesson-view",
      variantId: null,
      variantFamily: null,
      misconceptionTags: [],
      rubricRefs: [],
      resourceRefs: ["lesson:git-github:1"],
    }));
    const evidence = projectMasteryEvidence(parseCurriculumBindingRelease(input));
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({ activityId: "codecamp.git-github.quiz.q1", evidenceWeight: 0.3 });
  });

  it("reports unique variant families rather than inflating repeated questions", () => {
    const input = release();
    input.bindings.push(binding({
      activityId: "codecamp.git-github.quiz.q2",
      variantId: "git-github-quiz-q2",
    }));
    input.inventory.questions = 2;
    input.modules[0]!.questionCount = 2;
    const report = buildBindingCoverageReport(parseCurriculumBindingRelease(input));
    expect(report.totalBindings).toBe(2);
    expect(report.uniqueVariantFamilies).toBe(1);
    expect(report.byModule).toEqual({ "git-github": 2 });
    expect(report.byPracticeMode).toEqual({ assessment: 2 });
  });
});
