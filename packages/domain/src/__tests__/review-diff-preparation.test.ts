import { describe, it, expect } from "vitest";
import {
  CodecampPrReviewContractError,
  prepareReviewDiff,
} from "../codecamp/review-exercise.js";

/**
 * Phase 2 (Red) tests for `prepareReviewDiff`.
 *
 * Behavior lands in Phase 3. The current stub throws "Not implemented",
 * so every assertion that exercises the contract is RED.
 */
describe("prepareReviewDiff", () => {
  it("strips a whole `diff --git` section for a `dist/` segment", () => {
    const input = [
      "diff --git a/src/app.ts b/src/app.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      "diff --git a/dist/bundle.js b/dist/bundle.js",
      "@@ -1 +1 @@",
      "-old bundle",
      "+new bundle",
      "",
    ].join("\n");

    const result = prepareReviewDiff(input);

    expect(result.diff).toContain("diff --git a/src/app.ts b/src/app.ts");
    expect(result.diff).toContain("+new");
    expect(result.diff).not.toContain("dist/bundle.js");
    expect(result.removedPaths).toEqual(["dist/bundle.js"]);
    expect(result.empty).toBe(false);
  });

  it("strips whole sections for build, .next, coverage, and node_modules segments", () => {
    const segments = ["build", ".next", "coverage", "node_modules"];
    const input = [
      "diff --git a/src/keep.ts b/src/keep.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new",
      ...segments.flatMap((segment) => ([
        `diff --git a/${segment}/out.js b/${segment}/out.js`,
        "@@ -1 +1 @@",
        "-x",
        "+y",
        "",
      ])),
    ].join("\n");

    const result = prepareReviewDiff(input);

    for (const segment of segments) {
      expect(result.removedPaths, `removedPaths must include ${segment}/out.js`).toContain(`${segment}/out.js`);
      expect(result.diff, `diff must not include ${segment} section`).not.toContain(`${segment}/out.js`);
    }
    expect(result.removedPaths).toHaveLength(segments.length);
  });

  it("strips .map, .min.js, and .min.css by file suffix", () => {
    const input = [
      "diff --git a/src/keep.ts b/src/keep.ts",
      "@@ -1 +1 @@",
      "-a",
      "+b",
      "diff --git a/public/app.js.map b/public/app.js.map",
      "@@ -1 +1 @@",
      "-x",
      "+y",
      "diff --git a/public/app.min.js b/public/app.min.js",
      "@@ -1 +1 @@",
      "-x",
      "+y",
      "diff --git a/public/app.min.css b/public/app.min.css",
      "@@ -1 +1 @@",
      "-x",
      "+y",
    ].join("\n");

    const result = prepareReviewDiff(input);

    expect(result.removedPaths).toEqual([
      "public/app.js.map",
      "public/app.min.js",
      "public/app.min.css",
    ]);
    expect(result.diff).not.toContain("public/app.js.map");
    expect(result.diff).not.toContain("public/app.min.js");
    expect(result.diff).not.toContain("public/app.min.css");
  });

  it("keeps a source file named `builder.ts` (segment match, not substring)", () => {
    const input = [
      "diff --git a/src/builder.ts b/src/builder.ts",
      "@@ -1 +1 @@",
      "-old",
      "+new",
    ].join("\n");

    const result = prepareReviewDiff(input);

    expect(result.removedPaths).toEqual([]);
    expect(result.diff).toContain("src/builder.ts");
    expect(result.diff).toContain("+new");
    expect(result.empty).toBe(false);
  });

  it("keeps a directory named `rebuild` (segment match, not substring of `build`)", () => {
    const input = [
      "diff --git a/rebuild/manifest.json b/rebuild/manifest.json",
      "@@ -1 +1 @@",
      "-old",
      "+new",
    ].join("\n");

    const result = prepareReviewDiff(input);

    expect(result.removedPaths).toEqual([]);
    expect(result.diff).toContain("rebuild/manifest.json");
    expect(result.diff).toContain("+new");
    expect(result.empty).toBe(false);
  });

  it("reports every removed path exactly once, in diff order", () => {
    const input = [
      "diff --git a/dist/a.js b/dist/a.js",
      "@@ -1 +1 @@",
      "-x",
      "+y",
      "diff --git a/src/keep.ts b/src/keep.ts",
      "@@ -1 +1 @@",
      "-x",
      "+y",
      "diff --git a/build/out.js b/build/out.js",
      "@@ -1 +1 @@",
      "-x",
      "+y",
      "diff --git a/public/app.js.map b/public/app.js.map",
      "@@ -1 +1 @@",
      "-x",
      "+y",
    ].join("\n");

    const result = prepareReviewDiff(input);

    expect(result.removedPaths).toEqual([
      "dist/a.js",
      "build/out.js",
      "public/app.js.map",
    ]);
  });

  it("returns empty:true when no reviewable source remains", () => {
    const input = [
      "diff --git a/dist/a.js b/dist/a.js",
      "@@ -1 +1 @@",
      "-x",
      "+y",
      "diff --git a/build/out.js b/build/out.js",
      "@@ -1 +1 @@",
      "-x",
      "+y",
    ].join("\n");

    const result = prepareReviewDiff(input);

    expect(result.empty).toBe(true);
    expect(result.diff).toBe("");
    expect(result.removedPaths).toEqual(["dist/a.js", "build/out.js"]);
  });

  it("applies the 200,000-character limit AFTER stripping (oversize-before but ok-after does not throw)", () => {
    const padding = "x".repeat(200_000);
    const input = [
      `diff --git a/dist/big.js b/dist/big.js`,
      "@@ -1 +1 @@",
      `-${padding}`,
      `+y`,
      "diff --git a/src/tiny.ts b/src/tiny.ts",
      "@@ -1 +1 @@",
      "-a",
      "+b",
    ].join("\n");

    // The full input is over 200,000 chars, but the stripped diff is small.
    expect(input.length, "fixture exceeds the raw limit").toBeGreaterThan(200_000);

    const result = prepareReviewDiff(input);

    expect(result.removedPaths).toContain("dist/big.js");
    expect(result.diff).toContain("src/tiny.ts");
    expect(result.empty).toBe(false);
  });

  it("still throws a CodecampPrReviewContractError on a secret pattern in the source that survives stripping", () => {
    const input = [
      "diff --git a/src/app.ts b/src/app.ts",
      "@@ -1 +1 @@",
      "+const token = 'ghp_123456789012345678901234567890123456';",
    ].join("\n");

    expect(() => prepareReviewDiff(input)).toThrow(CodecampPrReviewContractError);
  });

  it("still throws a CodecampPrReviewContractError on binary content in the source that survives stripping", () => {
    const input = [
      "diff --git a/src/image.png b/src/image.png",
      "GIT binary patch",
      "literal 4",
    ].join("\n");

    expect(() => prepareReviewDiff(input)).toThrow(CodecampPrReviewContractError);
  });
});
