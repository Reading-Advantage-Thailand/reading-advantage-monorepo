import { describe, expect, it } from "vitest";
import {
  runMasteryPersistenceContract,
  type MasteryPersistenceTestHarness,
  type MasteryPersistenceTestPort,
} from "./mastery-persistence.contract.js";

type PublicMasteryModule = Record<string, unknown>;

async function loadMasteryModule(): Promise<PublicMasteryModule> {
  return import("../mastery/index.js") as Promise<PublicMasteryModule>;
}

describe("mastery persistence public contracts", () => {
  it("exports all versioned Zod records and command schemas", async () => {
    const mastery = await loadMasteryModule();
    const schemaNames = [
      "masteryCardRecordSchema",
      "masteryReviewRecordSchema",
      "masteryEvidenceRecordSchema",
      "masteryStateRecordSchema",
      "masteryPlacementRecordSchema",
      "masteryCalibrationRecordSchema",
      "masteryCommitRecordSchema",
      "commitMasteryEvidenceInputSchema",
      "commitMasteryEvidenceResultSchema",
    ];

    for (const name of schemaNames) {
      expect.soft(
        typeof (mastery[name] as { safeParse?: unknown } | undefined)?.safeParse,
        `missing public Zod schema ${name}`,
      ).toBe("function");
    }
    expect.soft(
      mastery.MASTERY_PERSISTENCE_CONTRACT_VERSION,
      "missing public persistence contract version",
    ).toBe("mastery.persistence.v1");
  });

  it("exports the in-memory adapter factory through the mastery barrel", async () => {
    const mastery = await loadMasteryModule();
    expect(
      typeof mastery.createInMemoryMasteryPersistence,
      "missing public createInMemoryMasteryPersistence",
    ).toBe("function");
  });
});

async function createInMemoryHarness(): Promise<MasteryPersistenceTestHarness> {
  const mastery = await loadMasteryModule();
  const createAdapter = mastery.createInMemoryMasteryPersistence;
  if (typeof createAdapter !== "function") {
    throw new Error(
      "RED: missing public createInMemoryMasteryPersistence adapter factory",
    );
  }

  let adapter = await Promise.resolve(
    createAdapter() as MasteryPersistenceTestPort,
  );
  return {
    adapter: () => adapter,
    reset: async () => {
      adapter = await Promise.resolve(
        createAdapter() as MasteryPersistenceTestPort,
      );
    },
    close: async () => {},
  };
}

runMasteryPersistenceContract("in-memory", createInMemoryHarness);

