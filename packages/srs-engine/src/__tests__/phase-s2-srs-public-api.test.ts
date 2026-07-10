import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

import * as publicApi from "../index.js";

describe("Phase S2 SRS package contract", () => {
  it("deliberately identifies the breaking v3.2 runtime as contract v2", () => {
    expect(publicApi.SRS_CONTRACT_VERSION).toBe("srs.contract.v2");
  });

  it.each([
    "resolveRequestRetention",
    "classifyAbilityStratifiedCalibration",
    "aggregateObjectiveRetention",
    "computeCorrectedRetentionStrength",
    "capEvidenceConfidence",
    "fitFsrsParameters",
    "evaluateFsrsReplay",
    "interleaveReviewItems",
    "fuzzIntervalDays",
    "balanceDueDate",
  ])("exports %s from the supported package root", (name) => {
    expect((publicApi as Record<string, unknown>)[name]).toBeTypeOf("function");
  });

  it("declares supported ESM subpaths for new Phase S2 modules", () => {
    const packagePath = fileURLToPath(
      new URL("../../package.json", import.meta.url),
    );
    const manifest = JSON.parse(readFileSync(packagePath, "utf8")) as {
      exports: Record<string, unknown>;
    };
    expect(Object.keys(manifest.exports)).toEqual(
      expect.arrayContaining([
        "./proficiency",
        "./edge-calibration",
        "./fsrs-calibration",
        "./evaluation-harness",
        "./session-composition",
      ]),
    );
  });
});
