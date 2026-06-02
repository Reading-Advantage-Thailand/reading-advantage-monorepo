import { describe, it, expect } from "vitest";
import { getModulesWithExerciseRepos, getExerciseLessonData } from "../seed/codecamp-backfill-exercises.js";
import { MODULE_REPO_MAP } from "../seed/codecamp-curriculum-data.js";

describe("getModulesWithExerciseRepos", () => {
  it("returns all slugs from MODULE_REPO_MAP", () => {
    const slugs = getModulesWithExerciseRepos();
    expect(slugs).toEqual(new Set(Object.keys(MODULE_REPO_MAP)));
  });

  it("includes modules with exercise repos", () => {
    const slugs = getModulesWithExerciseRepos();
    expect(slugs.has("git-github")).toBe(true);
    expect(slugs.has("html-css")).toBe(true);
    expect(slugs.has("react")).toBe(true);
  });

  it("excludes dev-environment (no exercise repo)", () => {
    const slugs = getModulesWithExerciseRepos();
    expect(slugs.has("dev-environment")).toBe(false);
  });

  it("excludes monorepo-packages (uses live monorepo, no repo in MODULE_REPO_MAP)", () => {
    const slugs = getModulesWithExerciseRepos();
    expect(slugs.has("monorepo-packages")).toBe(false);
  });
});

describe("getExerciseLessonData", () => {
  it("returns exercise data for modules with combined Exercise + Quiz lessons", () => {
    const data = getExerciseLessonData("html-css");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("HTML & CSS Exercise");
    expect(data!.exercises).toHaveLength(1);
    expect(data!.contentJson).toHaveProperty("instructions");
  });

  it("strips ' Exercise + Quiz' suffix from title", () => {
    const data = getExerciseLessonData("javascript");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("JavaScript Exercise");
  });

  it("returns exercise data for git-github (standalone exercise)", () => {
    const data = getExerciseLessonData("git-github");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("Branching, Forking, Pull Requests");
    expect(data!.exercises).toHaveLength(1);
  });

  it("returns fallback exercise for real-world-practice (no curriculum exercises)", () => {
    const data = getExerciseLessonData("real-world-practice");
    expect(data).not.toBeNull();
    expect(data!.title).toBe("Real-World Practice Exercise");
    expect(data!.exercises).toHaveLength(1);
    expect(data!.exercises[0].title).toBe("Complete Real-World Practice exercises");
  });

  it("returns null for unknown module slugs", () => {
    const data = getExerciseLessonData("nonexistent-module");
    expect(data).toBeNull();
  });

  it("returns exercise data for all modules in MODULE_REPO_MAP", () => {
    for (const slug of Object.keys(MODULE_REPO_MAP)) {
      const data = getExerciseLessonData(slug);
      expect(data).not.toBeNull();
      expect(data!.exercises.length).toBeGreaterThan(0);
    }
  });

  it("includes hints for exercises", () => {
    const data = getExerciseLessonData("html-css");
    expect(data!.exercises[0].hintsJson.length).toBeGreaterThan(0);
  });
});
