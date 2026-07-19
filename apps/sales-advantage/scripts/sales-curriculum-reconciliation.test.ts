// @vitest-environment node
import { describe, expect, it } from "vitest";

import {
  SALES_CURRICULUM_APPROVED_GRAPH_SHA256,
  SALES_CURRICULUM_OWNER_APPROVAL_SHA256,
  SALES_CURRICULUM_PREDECESSOR_GRAPH_SHA256,
  assertApprovedSalesCurriculumGraph,
  buildSalesCurriculumReconciliationPlan,
  buildStaticSalesCurriculumRows,
} from "./static-seed";
import { PINNED_SALES_CURRICULUM_GRAPH_SHA256 } from "./verify-sales-curriculum";

const foundationModule = {
  id: "eb0a5e74-a145-5439-9f4a-84191bc58de7",
  slug: "foundations-discovery",
};
const predecessorQuiz = {
  id: "2452d8f8-5904-5ecc-a0bb-1adfb4475f37",
  moduleId: foundationModule.id,
  title: "Universal Discovery Quiz",
};
function validInput() {
  return {
    currentGraphSha256: SALES_CURRICULUM_PREDECESSOR_GRAPH_SHA256,
    currentModules: [foundationModule],
    currentLessons: [predecessorQuiz],
    progressLessonIds: [predecessorQuiz.id],
    activityCounts: { attempts: 0, conversations: 0, chatMessages: 0 },
    approvalSha256: SALES_CURRICULUM_OWNER_APPROVAL_SHA256,
  };
}

describe("Sales curriculum predecessor reconciliation", () => {
  it("maps progress by semantic lesson identity and preserves every other field", () => {
    const result = buildSalesCurriculumReconciliationPlan(validInput());

    expect(result.lessonRemaps).toEqual([{
      sourceLessonId: predecessorQuiz.id,
      targetLessonId: "3a356602-79ec-50ee-990c-9a3b800de598",
    }]);
  });

  it("rejects any approval anchor other than the exact owner evidence", () => {
    expect(() => buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      approvalSha256: "0".repeat(64),
    })).toThrow("SALES_CURRICULUM_RECONCILIATION_APPROVAL_MISMATCH");
  });

  it("rejects every graph except the exact predecessor", () => {
    expect(() => buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      currentGraphSha256: SALES_CURRICULUM_APPROVED_GRAPH_SHA256,
    })).toThrow(
      "SALES_CURRICULUM_RECONCILIATION_PREDECESSOR_DIGEST_MISMATCH",
    );
  });

  it.each([
    ["attempts", { attempts: 1, conversations: 0, chatMessages: 0 }],
    ["conversations", { attempts: 0, conversations: 1, chatMessages: 0 }],
    ["chat messages", { attempts: 0, conversations: 0, chatMessages: 1 }],
  ])("fails closed when %s cannot be safely mapped", (_label, activityCounts) => {
    expect(() => buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      activityCounts,
    })).toThrow("SALES_CURRICULUM_RECONCILIATION_ACTIVITY_PRESENT");
  });

  it("rejects progress whose current lesson has no semantic target", () => {
    expect(() => buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      currentLessons: [{ ...predecessorQuiz, title: "Unreviewed lesson" }],
    })).toThrow("SALES_CURRICULUM_RECONCILIATION_TARGET_LESSON_MISSING");
  });

  it("rejects progress whose current lesson row is absent", () => {
    expect(() => buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      currentLessons: [],
    })).toThrow("SALES_CURRICULUM_RECONCILIATION_CURRENT_LESSON_UNMAPPABLE");
  });

  it("rejects a current lesson whose module cannot be mapped", () => {
    expect(() => buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      currentModules: [],
    })).toThrow("SALES_CURRICULUM_RECONCILIATION_CURRENT_MODULE_UNMAPPABLE");
  });

  it("rejects ambiguous current semantic lesson identities", () => {
    expect(() => buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      currentLessons: [
        predecessorQuiz,
        { ...predecessorQuiz, id: "00000000-0000-4000-8000-000000000002" },
      ],
    })).toThrow("SALES_CURRICULUM_RECONCILIATION_SEMANTIC_LESSON_AMBIGUOUS");
  });

  it("pins and independently verifies the exact approved post-write graph", () => {
    expect(SALES_CURRICULUM_APPROVED_GRAPH_SHA256).toBe(
      PINNED_SALES_CURRICULUM_GRAPH_SHA256,
    );
    expect(assertApprovedSalesCurriculumGraph(
      buildStaticSalesCurriculumRows(),
    )).toBe(PINNED_SALES_CURRICULUM_GRAPH_SHA256);
    const changed = buildStaticSalesCurriculumRows();
    changed.lessons[0]!.title += " changed";
    expect(() => assertApprovedSalesCurriculumGraph(changed)).toThrow(
      "SALES_CURRICULUM_APPROVED_GRAPH_DIGEST_MISMATCH",
    );
  });

  it("deduplicates repeated source lessons without creating duplicate remaps", () => {
    const planned = buildSalesCurriculumReconciliationPlan({
      ...validInput(),
      progressLessonIds: [predecessorQuiz.id, predecessorQuiz.id],
    });
    expect(planned.lessonRemaps).toHaveLength(1);
  });
});
