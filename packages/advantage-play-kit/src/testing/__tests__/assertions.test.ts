import { describe, expect, it } from "vitest";

import {
  assertAttributionRegistered,
  assertExactlyOnceCompletion,
  assertNoDirectAssetPaths,
  assertSelectedUnionOnly,
} from "../assertions.js";

describe("deterministic assertion helpers", () => {
  it("asserts exactly-once completion for a latch", () => {
    expect(() =>
      assertExactlyOnceCompletion({ hasCompleted: true }, { hasCompleted: true }),
    ).not.toThrow();
    expect(() =>
      assertExactlyOnceCompletion({ hasCompleted: false }, { hasCompleted: true }),
    ).toThrow(/exactly once/i);
  });

  it("asserts attribution registration requires the ElvGames credit", () => {
    expect(() =>
      assertAttributionRegistered({
        requiredCredit: "Pixel art assets by ElvGames",
        placement: "end-screen",
      }),
    ).not.toThrow();
    expect(() =>
      assertAttributionRegistered({
        requiredCredit: "Other",
        placement: "end-screen",
      }),
    ).toThrow(/ElvGames/i);
  });

  it("asserts no direct asset paths are present in source", () => {
    expect(() => assertNoDirectAssetPaths("import { x } from './systems';")).not.toThrow();
    expect(() => assertNoDirectAssetPaths("load('ui/16x16/icons/coin.png')")).toThrow(
      /physical asset path/i,
    );
    expect(() => assertNoDirectAssetPaths("fetch('/assets/apk/legacy/edition.png')")).toThrow(
      /physical asset path|edition|theme|private pack/i,
    );
  });

  it("asserts selected-union-only materialization", () => {
    expect(() =>
      assertSelectedUnionOnly("accepted-cartridge-selected-union-only"),
    ).not.toThrow();
    expect(() => assertSelectedUnionOnly("full-catalog-load")).toThrow(/selected-union/i);
  });
});
