// @vitest-environment node
import { describe, expect, it } from "vitest";

import { buildStaticSalesCurriculumRows } from "./static-seed";
import {
  assertCurriculumReleaseReady,
  buildCurriculumAutomatedReview,
  type CurriculumReleaseManifest,
} from "./curriculum-release";

const source = {
  repository: "advantage-pr" as const,
  commit: "8dd78171f1d57dd775fad2295d60e86fb267dad8",
  documents: [
    {
      path: "06-research-and-evidence/outcome-claims-policy.md",
      sha256: "a".repeat(64),
    },
  ],
};

function manifest(
  approval: CurriculumReleaseManifest["approval"],
): CurriculumReleaseManifest {
  const rows = buildStaticSalesCurriculumRows();
  return {
    schemaVersion: 1,
    curriculumId: "reading-advantage-sales-curriculum-v1",
    graphSha256:
      "b7582eb44adc176327f483147043fdb4aa6f02a292aeea189b7774483db25963",
    source,
    pedagogy: {
      reference: "apps/codecamp-advantage/measure/curriculum/course-spec.md",
      progression: ["learn", "practice", "evaluate", "reflect"],
      moduleOrder: rows.modules.map((row) => row.slug),
    },
    generation: {
      method: "hand-authored-reviewed-candidate",
      provider: null,
      requestedModel: null,
      promptVersion: "sales-curriculum-v2",
      artifactRef: "apps/sales-advantage/scripts/static-seed.ts",
    },
    automatedReview: buildCurriculumAutomatedReview(rows),
    approval,
  };
}

describe("Sales curriculum release contract", () => {
  it("proves progressive pedagogy, source-grounded rubrics, and canonical roleplay excerpts", () => {
    const review = buildCurriculumAutomatedReview(
      buildStaticSalesCurriculumRows(),
    );

    expect(review).toEqual({
      exactGraphVerified: true,
      progressiveModuleOrderVerified: true,
      honestClaimsLanguageReviewedByAutomation: true,
      rubricSourceRefsVerified: true,
      roleplayCanonicalExcerptsVerified: true,
    });
  });

  it("does not convert automated checks into human approval", () => {
    expect(() =>
      assertCurriculumReleaseReady(
        manifest({
          status: "awaiting_human_review",
          reviewer: null,
          reviewedAt: null,
          evidenceRef: null,
          checks: {
            pedagogy: false,
            sourceTraceability: false,
            honestClaims: false,
            roleplayRubrics: false,
          },
        }),
        buildStaticSalesCurriculumRows(),
      ),
    ).toThrow("SALES_CURRICULUM_HUMAN_APPROVAL_REQUIRED");
  });

  it("accepts a fully evidenced human approval for the pinned graph", () => {
    expect(() =>
      assertCurriculumReleaseReady(
        manifest({
          status: "approved",
          reviewer: "Daniel Bo",
          reviewedAt: "2026-07-18T00:00:00.000Z",
          evidenceRef:
            "measure/tracks/sales_advantage_golive_20260701/curriculum-approval.md",
          checks: {
            pedagogy: true,
            sourceTraceability: true,
            honestClaims: true,
            roleplayRubrics: true,
          },
        }),
        buildStaticSalesCurriculumRows(),
      ),
    ).not.toThrow();
  });
});
