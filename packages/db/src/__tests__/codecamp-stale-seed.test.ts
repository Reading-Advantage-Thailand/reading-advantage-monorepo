import { describe, it, expect } from "vitest";
import { findStaleModuleSlugs } from "../seed/codecamp-seed.js";

describe("findStaleModuleSlugs", () => {
  it("identifies a slug in the DB but not in the canonical set as stale", () => {
    const canonical = new Set(["dev-environment", "git-github", "html-css"]);
    const dbSlugs = ["dev-environment", "git-github", "html-css", "old-module"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toEqual(["old-module"]);
  });

  it("does not mark a slug that exists in both DB and canonical set as stale", () => {
    const canonical = new Set(["dev-environment", "git-github"]);
    const dbSlugs = ["dev-environment", "git-github"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toHaveLength(0);
  });

  it("marks all DB slugs as stale when canonical set is empty", () => {
    const canonical = new Set<string>();
    const dbSlugs = ["module-a", "module-b", "module-c"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toEqual(["module-a", "module-b", "module-c"]);
  });

  it("returns nothing stale when DB slugs list is empty", () => {
    const canonical = new Set(["dev-environment", "git-github"]);
    const dbSlugs: string[] = [];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toHaveLength(0);
  });

  it("identifies multiple stale slugs correctly", () => {
    const canonical = new Set(["keep-a", "keep-b"]);
    const dbSlugs = ["keep-a", "stale-x", "keep-b", "stale-y", "stale-z"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toHaveLength(3);
    expect(stale).toContain("stale-x");
    expect(stale).toContain("stale-y");
    expect(stale).toContain("stale-z");
  });

  it("preserves order of stale slugs as they appear in the DB list", () => {
    const canonical = new Set(["b"]);
    const dbSlugs = ["a", "b", "c", "d"];

    const stale = findStaleModuleSlugs(canonical, dbSlugs);

    expect(stale).toEqual(["a", "c", "d"]);
  });
});
