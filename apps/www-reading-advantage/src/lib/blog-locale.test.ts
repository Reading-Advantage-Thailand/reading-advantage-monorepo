/**
 * Tests for locale-aware path resolution in blog.ts.
 * Avoids full fs mocking (unreliable with ESM in Vitest) and instead
 * tests the exported path builder directly.
 */
import { describe, it, expect } from "vitest";
import path from "path";
import { postsDirectory, calculateReadingTime } from "@/lib/blog";

describe("postsDirectory", () => {
  const baseDir = path.join(
    process.cwd(),
    "src/app/[locale]/(marketing)/blog/posts",
  );

  it("returns the en subdirectory by default", () => {
    expect(postsDirectory()).toBe(path.join(baseDir, "en"));
  });

  it("returns the correct locale subdirectory for th", () => {
    expect(postsDirectory("th")).toBe(path.join(baseDir, "th"));
  });

  it("returns the correct locale subdirectory for zh", () => {
    expect(postsDirectory("zh")).toBe(path.join(baseDir, "zh"));
  });

  it("returns the en directory when locale is en", () => {
    expect(postsDirectory("en")).toBe(path.join(baseDir, "en"));
  });

  it("th path differs from en path", () => {
    expect(postsDirectory("th")).not.toBe(postsDirectory("en"));
  });
});

describe("calculateReadingTime returns number", () => {
  it("returns a number type", () => {
    expect(typeof calculateReadingTime("some words here for a test")).toBe("number");
  });
});
