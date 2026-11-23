/**
 * The blog loader must see symlinked Markdown posts. The phase-base suite and
 * blog.ts read them, so the merged validation must not skip them. A broken link
 * is surfaced as a violation reference instead of a crash or a silent skip.
 */
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  brokenPostRefs,
  listPostFiles,
  loadAllPosts,
} from "./fixtures/blog-posts-loader";

/** A valid post apart from its blank title. */
const BLANK_TITLE_POST = [
  "---",
  'title: ""',
  'date: "2026-11-20"',
  'excerpt: "An excerpt."',
  'author: "An author"',
  'tags: ["a-tag"]',
  "---",
  "",
  "Body text.",
  "",
].join("\n");

/** Creates an empty posts tree with one locale directory. */
function postsTree(): { base: string; localeDir: string } {
  const base = mkdtempSync(path.join(tmpdir(), "blog-loader-symlink-"));
  const localeDir = path.join(base, "en");
  mkdirSync(localeDir, { recursive: true });
  return { base, localeDir };
}

describe("blog post loader symlinks", () => {
  it("loads a symlinked .md post with a blank title", () => {
    const { base, localeDir } = postsTree();
    try {
      const target = path.join(base, "blank-title.md");
      writeFileSync(target, BLANK_TITLE_POST);
      symlinkSync(target, path.join(localeDir, "zz-symlink-probe.md"));

      expect(listPostFiles(base)).toContain("en/zz-symlink-probe.md");
      const post = loadAllPosts(base).find(
        (entry) => entry.slug === "zz-symlink-probe",
      );
      expect(post, "the symlinked post is loaded").toBeDefined();
      expect(post!.data.title, "the blank title rule can reject it").toBe("");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });

  it("flags a broken symlink instead of skipping it", () => {
    const { base, localeDir } = postsTree();
    try {
      symlinkSync(
        path.join(base, "missing-target.md"),
        path.join(localeDir, "zz-broken.md"),
      );
      expect(brokenPostRefs(base)).toContain("en/zz-broken.md");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
