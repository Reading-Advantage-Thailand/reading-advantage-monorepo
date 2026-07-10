import { describe, expect, it } from "vitest";

import {
  CurriculumBindingReleaseSchema,
  buildBindingCoverageReport,
  parseCurriculumBindingRelease,
  projectMasteryEvidence,
  countIndependentEvidenceByObjective,
  sha256,
  validateCurriculumBindings,
} from "../index.js";
import { codeKnowledgeGraph } from "../data.js";

function representativeInventory() {
  return {
    schemaVersion: "codecamp-curriculum-inventory.v1" as const,
    totals: {
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
        status: "published" as const,
        lessonOrders: [],
        questionCoordinates: ["git-github:4:1"],
        exerciseCoordinates: [],
        hasRepository: false,
      },
    ],
    activityIds: ["question:git-github:4:1"],
  };
}

function inventoryDigest(): string {
  return sha256(new TextEncoder().encode(JSON.stringify(representativeInventory())));
}

function representativeProvenance() {
  return {
    schemaVersion: "codecamp-curriculum-source.v1" as const,
    sourcePath: "packages/db/src/seed/codecamp-curriculum-data.ts" as const,
    originBaseRevision: "0123456789abcdef0123456789abcdef01234567",
    originBaseDigest: "c".repeat(64),
    sourceDigest: "a".repeat(64),
    sourceArtifact: "source-snapshots/codecamp-curriculum-aaaaaaaaaaaaaaaa.ts",
    sourceDirty: true as const,
    snapshotDigest: inventoryDigest(),
  };
}

function validate(
  input: unknown,
  graph = codeKnowledgeGraph,
  inventory = representativeInventory(),
  provenance = representativeProvenance(),
) {
  return validateCurriculumBindings(input, graph, inventory, provenance);
}

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
      originBaseRevision: "0123456789abcdef0123456789abcdef01234567",
      originBaseDigest: "c".repeat(64),
      sourceDigest: "a".repeat(64),
      sourceArtifact: "source-snapshots/codecamp-curriculum-aaaaaaaaaaaaaaaa.ts",
      sourceDirty: true as const,
      inventoryDigest: inventoryDigest(),
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
    rubrics: [
      {
        rubricId: "codecamp.quiz.v1",
        objectiveIds: ["codecamp.workflow.skill.git-branches"],
        appliesToKinds: ["question"],
        scoringDimensions: ["conceptual accuracy"],
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
    expect(validate(release())).toEqual({ valid: true, issues: [] });
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
    expect(validate(input).issues.map((issue) => issue.code)).toContain(code);
  });

  it("rejects draft and retired objectives with actionable source coordinates", () => {
    for (const lifecycle of ["draft", "retired"] as const) {
      const graph = structuredClone(codeKnowledgeGraph);
      graph.knowledgeSpace.nodes.find(
        (entry) => entry.id === "codecamp.workflow.skill.git-branches",
      )!.metadata.lifecycle = lifecycle;
      const issue = validate(release(), graph).issues.find(
        (entry) => entry.code === `${lifecycle.toUpperCase()}_OBJECTIVE`,
      );
      expect(issue?.entityId).toBe("codecamp.git-github.quiz.q1");
      expect(issue?.message).toContain("git-github/lesson-4/item-1");
    }
  });

  it("rejects invalid source coordinates for lessons, questions, exercises, and repositories", () => {
    const cases = [
      binding({ activityKind: "question", source: { moduleSlug: "git-github", lessonOrder: 4 } }),
      binding({ activityKind: "exercise", source: { moduleSlug: "git-github", itemOrder: 1 } }),
      binding({ activityKind: "lesson", source: { moduleSlug: "git-github", itemOrder: 1 } }),
      binding({ activityKind: "repository", source: { moduleSlug: "git-github", lessonOrder: 1 } }),
    ];
    for (const candidate of cases) {
      const input = release();
      input.bindings[0] = candidate;
      expect(validate(input).issues.map((issue) => issue.code)).toContain(
        "SOURCE_COORDINATE_INVALID",
      );
    }
  });

  it("rejects resource syntax, kind mismatch, dangling lesson refs, and duplicate objectives", () => {
    const cases: Array<[string, ReturnType<typeof binding>]> = [
      ["BINDING_SCHEMA_INVALID", binding({ resourceRefs: ["not a resource"] })],
      ["RESOURCE_KIND_MISMATCH", binding({ activityKind: "repository", resourceRefs: ["lesson:git-github:4"] })],
      ["DANGLING_RESOURCE", binding({ activityKind: "lesson", evidenceMode: "exposure", practiceMode: "exposure", evidenceWeight: 0, evidenceSource: "lesson-view", variantId: null, variantFamily: null, misconceptionTags: [], rubricRefs: [], resourceRefs: ["lesson:git-github:99"] })],
      ["BINDING_SCHEMA_INVALID", binding({ objectiveIds: ["codecamp.workflow.skill.git-branches", "codecamp.workflow.skill.git-branches"] })],
    ];
    for (const [code, candidate] of cases) {
      const input = release();
      input.bindings[0] = candidate;
      expect(validate(input).issues.map((issue) => issue.code)).toContain(code);
    }
  });

  it("rejects out-of-range weights and activity/evidence-source mismatches", () => {
    const overweight = release();
    overweight.bindings[0]!.evidenceWeight = 1.01;
    expect(validate(overweight).issues.map((issue) => issue.code)).toContain("BINDING_SCHEMA_INVALID");
    const mismatch = release();
    mismatch.bindings[0]!.evidenceSource = "pull-request";
    expect(validate(mismatch).issues.map((issue) => issue.code)).toContain("EVIDENCE_SOURCE_KIND_MISMATCH");
  });

  it("rejects dangling rubric references and unknown rubric objectives", () => {
    const dangling = release();
    dangling.bindings[0]!.rubricRefs = ["codecamp.missing.v1"];
    expect(validate(dangling).issues.map((issue) => issue.code)).toContain("DANGLING_RUBRIC");
    const unknown = release();
    unknown.rubrics[0]!.objectiveIds = ["codecamp.missing.skill"];
    expect(validate(unknown).issues.map((issue) => issue.code)).toContain("UNKNOWN_OBJECTIVE");
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
    expect(validate(input).issues.map((issue) => issue.code)).toContain("EXPOSURE_MUTATES_MASTERY");
  });

  it("rejects exposure carrying assessed-only variant, misconception, or rubric metadata", () => {
    const input = release();
    input.bindings[0] = binding({
      activityKind: "lesson",
      source: { moduleSlug: "git-github", lessonOrder: 1 },
      practiceMode: "exposure",
      evidenceMode: "exposure",
      evidenceWeight: 0,
      evidenceSource: "lesson-view",
      resourceRefs: ["lesson:git-github:1"],
    });
    expect(validate(input).issues.map((issue) => issue.code)).toContain(
      "EXPOSURE_METADATA_FORBIDDEN",
    );
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
    expect(validate(input).issues.map((issue) => issue.code)).toContain("ASSESSED_EVIDENCE_INCOMPLETE");
  });

  it("joins release provenance to the content-addressed source manifest", () => {
    const input = release();
    input.provenance.sourceDigest = "f".repeat(64);
    expect(validate(input).issues.map((issue) => issue.code)).toContain("SOURCE_PROVENANCE_MISMATCH");
  });

  it("rejects self-consistent fake module summaries and totals that disagree with source", () => {
    const input = release();
    input.modules = [{ ...input.modules[0]!, slug: "fake-module" }];
    input.bindings[0]!.source.moduleSlug = "fake-module";
    expect(validate(input).issues.map((issue) => issue.code)).toContain("SOURCE_MODULES_MISMATCH");
  });

  it("enforces rubric kind and objective applicability", () => {
    const wrongKind = release();
    wrongKind.rubrics[0]!.appliesToKinds = ["exercise"];
    expect(validate(wrongKind).issues.map((issue) => issue.code)).toContain("RUBRIC_KIND_MISMATCH");

    const wrongObjective = release();
    wrongObjective.rubrics[0]!.objectiveIds = ["codecamp.frontend.skill.semantic-html-css"];
    expect(validate(wrongObjective).issues.map((issue) => issue.code)).toContain("RUBRIC_OBJECTIVE_MISMATCH");
  });

  it("rejects repository resources attached to question evidence", () => {
    const input = release();
    input.bindings[0] = binding({ resourceRefs: ["repo:git-github"] });
    expect(validate(input).issues.map((issue) => issue.code)).toContain("RESOURCE_KIND_MISMATCH");
  });
});

describe("binding projections and reports", () => {
  it("projects only assessed activities into mastery evidence", () => {
    const validation = validate(release());
    if (!validation.valid) throw new Error("Representative release must validate.");
    const evidence = projectMasteryEvidence(validation.release);
    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toEqual({
      activityId: "codecamp.git-github.quiz.q1",
      objectiveId: "codecamp.workflow.skill.git-branches",
      practiceMode: "assessment",
      evidenceWeight: 0.3,
      evidenceSource: "quiz-response",
      variantId: "git-github-quiz-q1",
      variantFamily: "git-github-quiz",
      misconceptionTags: ["git-history-confusion"],
      rubricRefs: ["codecamp.quiz.v1"],
    });
  });

  it("fails closed when a merely schema-parsed release is projected", () => {
    expect(() => projectMasteryEvidence(parseCurriculumBindingRelease(release()) as never)).toThrow(
      "requires a successfully validated binding release",
    );
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
    expect(report.byObjective).toEqual({ "codecamp.workflow.skill.git-branches": 2 });
    expect(report.byActivityKind).toEqual({ question: 2 });
    expect(report.byEvidenceSource).toEqual({ "quiz-response": 2 });
    expect(countIndependentEvidenceByObjective(parseCurriculumBindingRelease(input))).toEqual({
      "codecamp.workflow.skill.git-branches": 1,
    });
  });

  it("supports exercise, repository, and portfolio bindings without conflating their evidence", () => {
    const input = release();
    input.bindings = [
      binding({ activityId: "codecamp.git-github.exercise.1", activityKind: "exercise", evidenceSource: "exercise-check", practiceMode: "guided", variantId: "git-exercise-1", variantFamily: "git-guided", rubricRefs: ["codecamp.exercise.v1"] }),
      binding({ activityId: "codecamp.git-github.repository", activityKind: "repository", source: { moduleSlug: "git-github" }, evidenceSource: "pull-request", practiceMode: "independent", variantId: "git-repo", variantFamily: "git-independent", rubricRefs: ["codecamp.pr.v1"], resourceRefs: ["repo:git-github"] }),
      binding({ activityId: "codecamp.git-github.portfolio", activityKind: "portfolio", source: { moduleSlug: "git-github" }, evidenceSource: "portfolio-review", practiceMode: "independent", variantId: "git-portfolio", variantFamily: "git-portfolio", rubricRefs: ["codecamp.portfolio.v1"], resourceRefs: ["portfolio:phase-a"] }),
    ];
    input.rubrics = ["exercise", "pr", "portfolio"].map((kind) => ({
      rubricId: `codecamp.${kind}.v1`,
      objectiveIds: ["codecamp.workflow.skill.git-branches"],
      appliesToKinds: [kind === "exercise" ? "exercise" : kind === "pr" ? "repository" : "portfolio"] as Array<"exercise" | "repository" | "portfolio">,
      scoringDimensions: ["quality"],
    }));
    input.inventory = { publishedModules: 1, lessons: 0, questions: 0, exercises: 1, repositories: 1, portfolios: 1 };
    input.modules[0] = { ...input.modules[0]!, lessonCount: 0, questionCount: 0, exerciseCount: 1, repositoryCount: 1 };
    const sourceInventory = {
      ...representativeInventory(),
      totals: { publishedModules: 1, lessons: 0, questions: 0, exercises: 1, repositories: 1, portfolios: 1 },
      modules: [{ slug: "git-github", order: 2, status: "published" as const, lessonOrders: [], questionCoordinates: [], exerciseCoordinates: ["git-github:4:1"], hasRepository: true }],
      activityIds: ["exercise:git-github:4:1", "repo:git-github", "portfolio:phase-a"],
    };
    input.provenance.inventoryDigest = sha256(new TextEncoder().encode(JSON.stringify(sourceInventory)));
    const provenance = {
      ...representativeProvenance(),
      snapshotDigest: input.provenance.inventoryDigest,
    };
    const validation = validateCurriculumBindings(input, codeKnowledgeGraph, sourceInventory, provenance);
    expect(validation).toEqual({ valid: true, issues: [] });
    if (!validation.valid) throw new Error("Representative multi-kind release must validate.");
    expect(projectMasteryEvidence(validation.release).map((entry) => entry.evidenceSource)).toEqual([
      "exercise-check",
      "pull-request",
      "portfolio-review",
    ]);
  });
});
