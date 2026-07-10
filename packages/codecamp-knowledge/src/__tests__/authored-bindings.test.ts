import { describe, expect, it } from "vitest";

import {
  buildBindingCoverageReport,
  countIndependentEvidenceByObjective,
  curriculumBindings,
  curriculumSourceInventory,
  curriculumSourceProvenance,
  projectMasteryEvidence,
  validateCurriculumBindings,
} from "../index.js";
import { codeKnowledgeGraph } from "../data.js";

describe("authored source-backed Codecamp curriculum bindings", () => {
  it("validates the complete protected-source snapshot rather than self-declared totals", () => {
    expect(
      validateCurriculumBindings(
        curriculumBindings,
        codeKnowledgeGraph,
        curriculumSourceInventory,
      ),
    ).toEqual({ valid: true, issues: [] });
    expect(curriculumBindings.inventory).toEqual(curriculumSourceInventory.totals);
    expect(curriculumBindings.provenance).toMatchObject({
      sourceRevision: curriculumSourceProvenance.sourceRevision,
      sourceDigest: curriculumSourceProvenance.sourceDigest,
      inventoryDigest: curriculumSourceProvenance.snapshotDigest,
    });
  });

  it("binds all 19 modules and every source activity kind", () => {
    expect(curriculumBindings.modules).toHaveLength(19);
    expect(curriculumBindings.rubrics).toHaveLength(4);
    expect(new Set(curriculumBindings.bindings.flatMap((binding) => binding.rubricRefs))).toEqual(
      new Set(curriculumBindings.rubrics.map((rubric) => rubric.rubricId)),
    );
    expect(curriculumBindings.bindings).toHaveLength(209);
    const report = buildBindingCoverageReport(curriculumBindings);
    expect(report).toMatchObject({
      totalBindings: 209,
      exposureBindings: 88,
      assessedBindings: 121,
      byActivityKind: {
        lesson: 88,
        question: 85,
        exercise: 16,
        repository: 16,
        portfolio: 4,
      },
      byPracticeMode: {
        assessment: 85,
        exposure: 88,
        guided: 16,
        independent: 20,
      },
      byEvidenceSource: {
        "exercise-check": 16,
        "lesson-view": 88,
        "portfolio-review": 4,
        "pull-request": 16,
        "quiz-response": 85,
      },
    });
    expect(Object.keys(report.byModule)).toHaveLength(19);
    expect(Object.keys(report.byObjective).length).toBeGreaterThanOrEqual(19);
  });

  it("proves one Git and GitHub vertical slice end to end", () => {
    const slice = curriculumBindings.bindings.filter(
      (binding) => binding.source.moduleSlug === "git-github",
    );
    expect(slice).toHaveLength(11);
    expect(slice.filter((binding) => binding.activityKind === "lesson")).toHaveLength(4);
    expect(slice.filter((binding) => binding.activityKind === "question")).toHaveLength(5);
    expect(slice.filter((binding) => binding.activityKind === "exercise")).toHaveLength(1);
    expect(slice.filter((binding) => binding.activityKind === "repository")).toHaveLength(1);
    expect(new Set(slice.flatMap((binding) => binding.objectiveIds))).toEqual(
      new Set(["codecamp.workflow.skill.git-branches"]),
    );
  });

  it("projects no exposure and counts repeated quiz formats once per objective family", () => {
    const evidence = projectMasteryEvidence(curriculumBindings);
    expect(evidence).toHaveLength(121);
    expect(evidence.every((entry) => entry.evidenceWeight > 0)).toBe(true);
    expect(evidence.some((entry) => String(entry.evidenceSource) === "lesson-view")).toBe(false);
    const independent = countIndependentEvidenceByObjective(curriculumBindings);
    expect(independent["codecamp.workflow.skill.git-branches"]).toBe(3);
    expect(independent["codecamp.frontend.skill.semantic-html-css"]).toBe(4);
  });
});
