import { describe, expect, it } from "vitest";

import {
  APKLearningBlueprintSchema,
  apkLearningBlueprint,
  buildAPKBlueprintReport,
  validateAPKLearningBlueprint,
} from "../index.js";
import { codeKnowledgeGraph } from "../data.js";

function issueCodes(input: unknown): string[] {
  return validateAPKLearningBlueprint(input, codeKnowledgeGraph).issues.map(
    (issue) => issue.code,
  );
}

describe("APKLearningBlueprintSchema", () => {
  it("accepts the authored strict blueprint", () => {
    expect(APKLearningBlueprintSchema.safeParse(apkLearningBlueprint).success).toBe(true);
  });

  it("rejects unknown fields at blueprint, ABI, objective, and practice boundaries", () => {
    const mutations = [
      (input: typeof apkLearningBlueprint) => Object.assign(input, { surprise: true }),
      (input: typeof apkLearningBlueprint) => Object.assign(input.abi, { surprise: true }),
      (input: typeof apkLearningBlueprint) => Object.assign(input.objectives[0]!, { surprise: true }),
      (input: typeof apkLearningBlueprint) => Object.assign(input.objectives[0]!.workedExample, { surprise: true }),
    ];
    for (const mutate of mutations) {
      const input = structuredClone(apkLearningBlueprint);
      mutate(input);
      expect(issueCodes(input)).toContain("APK_BLUEPRINT_SCHEMA_INVALID");
    }
  });
});

describe("validateAPKLearningBlueprint", () => {
  it("validates the reviewed game-development branch end to end", () => {
    expect(validateAPKLearningBlueprint(apkLearningBlueprint, codeKnowledgeGraph)).toEqual({
      valid: true,
      issues: [],
    });
  });

  it("requires every active APK objective exactly once and rejects technology duplication", () => {
    const missing = structuredClone(apkLearningBlueprint);
    missing.objectives.pop();
    expect(issueCodes(missing)).toContain("APK_OBJECTIVE_COVERAGE_MISMATCH");

    const duplicate = structuredClone(apkLearningBlueprint);
    duplicate.objectives[0]!.objectiveId = "codecamp.foundation.skill.typescript-contracts";
    expect(issueCodes(duplicate)).toContain("NON_APK_OBJECTIVE_DUPLICATION");
  });

  it("requires JavaScript, TypeScript, React, testing, and Git graph ancestry", () => {
    const graph = structuredClone(codeKnowledgeGraph);
    graph.knowledgeSpace.edges = graph.knowledgeSpace.edges.filter(
      (edge) => edge.sourceId !== "codecamp.workflow.skill.git-branches",
    );
    expect(
      validateAPKLearningBlueprint(apkLearningBlueprint, graph).issues.map(
        (issue) => issue.code,
      ),
    ).toContain("MISSING_PREREQUISITE_PATH");
  });

  it("preserves manifest, educational I/O, host ownership, editions, and client isolation", () => {
    const cases: Array<[string, (input: typeof apkLearningBlueprint) => void]> = [
      ["APK_ABI_MANIFEST_MISMATCH", (input) => { input.abi.cartridgeManifestFields.pop(); }],
      ["APK_ABI_INPUT_MISMATCH", (input) => { input.abi.educationalInputModes = ["vocabulary"]; }],
      ["APK_ABI_RESULT_MISMATCH", (input) => { input.abi.educationalResultFields.pop(); }],
      ["APK_HOST_RESPONSIBILITY_MISMATCH", (input) => { input.abi.hostResponsibilities.pop(); }],
      ["APK_EDITION_CONTRACT_MISMATCH", (input) => { input.abi.editionResponsibilities.pop(); }],
      ["APK_ISOLATION_MISMATCH", (input) => { input.abi.isolation.phaser = "server-safe" as never; }],
    ];
    for (const [code, mutate] of cases) {
      const input = structuredClone(apkLearningBlueprint);
      mutate(input);
      expect(issueCodes(input)).toContain(code);
    }
  });

  it("requires distinct worked, guided, and independent evidence families", () => {
    const input = structuredClone(apkLearningBlueprint);
    input.objectives[0]!.guidedPractice.variantFamily =
      input.objectives[0]!.workedExample.variantFamily;
    expect(issueCodes(input)).toContain("PRACTICE_VARIANTS_NOT_DISTINCT");
  });

  it("requires grading, hints, reveal policy, misconceptions, and remediation", () => {
    const cases: Array<[string, (input: typeof apkLearningBlueprint) => void]> = [
      ["APK_BLUEPRINT_SCHEMA_INVALID", (input) => { input.objectives[0]!.guidedPractice.checks = []; }],
      ["APK_BLUEPRINT_SCHEMA_INVALID", (input) => { input.objectives[0]!.workedExample.hints = []; }],
      ["APK_BLUEPRINT_SCHEMA_INVALID", (input) => { input.objectives[0]!.misconceptions = []; }],
      ["REMEDIATION_NOT_GRAPH_LINKED", (input) => { input.objectives[0]!.misconceptions[0]!.remediationRefs = ["video:generic"]; }],
      ["GRADING_OBJECTIVE_MISMATCH", (input) => { input.objectives[0]!.grading.objectiveId = "codecamp.game-development.skill.physics"; }],
    ];
    for (const [code, mutate] of cases) {
      const input = structuredClone(apkLearningBlueprint);
      mutate(input);
      expect(issueCodes(input)).toContain(code);
    }
  });
});

describe("APK blueprint report", () => {
  it("reports eleven objectives and three materially distinct stages each", () => {
    expect(buildAPKBlueprintReport(apkLearningBlueprint)).toEqual({
      objectiveCount: 11,
      practiceCount: 33,
      misconceptionCount: 11,
      byArtifactKind: {
        "code-reading-debugging": 11,
        "guided-extension": 11,
        "independent-construction": 11,
      },
      prerequisiteRoles: ["git", "javascript", "react", "testing", "typescript"],
    });
  });
});
