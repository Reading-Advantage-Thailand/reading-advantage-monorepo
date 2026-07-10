import { describe, expect, it } from "vitest";

type ProofModule = {
  runSyntheticCodecampProof: () => Promise<{
    compatibility: "pass";
    graphValid: true;
    initialObjective: string;
    initialReadiness: number;
    commitStatus: "applied";
    replayStatus: "replayed";
    cardRevision: number;
    stateRevision: number;
    persistedReviewRating: "again" | "hard" | "good" | "easy";
    persistedReviewBeforeState: "new" | "learning" | "review" | "relearning";
    persistedReviewAfterState: "new" | "learning" | "review" | "relearning";
    persistedMastery: number;
    nextObjective: string;
    importedAppCode: false;
  }>;
};

async function loadProof(): Promise<ProofModule | null> {
  try {
    const url = new URL("../codecamp-proof.js", import.meta.url).href;
    return (await import(url)) as ProofModule;
  } catch {
    return null;
  }
}

describe("synthetic Codecamp mastery consumer proof", () => {
  it("keeps the public engine packages available as a harness control", async () => {
    const [knowledge, practice, srs, persistence] = await Promise.all([
      import("../../../knowledge-space-core/src/index.js"),
      import("../../../practice-core/src/index.js"),
      import("../../../srs-engine/src/index.js"),
      import("../../../domain/src/mastery/adapters/memory.js"),
    ]);

    expect(typeof knowledge.validateKnowledgeSpace).toBe("function");
    expect(typeof practice.mapPracticeToSrsRating).toBe("function");
    expect(typeof srs.reviewCard).toBe("function");
    expect(typeof persistence.createInMemoryMasteryPersistence).toBe("function");
  });

  it("traverses compatibility, readiness, evidence, SRS, persistence, replay, and projection", async () => {
    const module = await loadProof();
    expect(module, "missing src/codecamp-proof.ts public consumer proof").not.toBeNull();
    if (!module) return;

    const result = await module.runSyntheticCodecampProof();
    expect(result).toMatchObject({
      compatibility: "pass",
      graphValid: true,
      initialObjective: "codecamp.git.commit",
      commitStatus: "applied",
      replayStatus: "replayed",
      cardRevision: 1,
      stateRevision: 1,
      persistedReviewRating: "good",
      persistedReviewBeforeState: "new",
      persistedMastery: 0.95,
      nextObjective: "codecamp.git.pull-request",
      importedAppCode: false,
    });
    expect(result.initialReadiness).toBeGreaterThanOrEqual(0);
    expect(result.initialReadiness).toBeLessThanOrEqual(1);
    expect(result.persistedReviewAfterState).not.toBe(
      result.persistedReviewBeforeState,
    );
  });
});
