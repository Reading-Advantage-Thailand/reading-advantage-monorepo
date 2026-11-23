/**
 * The blog loader must see dot-prefixed Markdown posts. Production blog.ts
 * discovers them by the .md suffix alone, so the validation loader must return
 * them for the slug rule to judge.
 */
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  listPostFiles,
  loadAllPosts,
} from "./fixtures/blog-posts-loader";

/** Minimal frontmatter shared by the two probe posts. */
const POST_TEXT = [
  "---",
  'title: "A valid title"',
  'date: "2026-11-20"',
  'excerpt: "An excerpt."',
  'author: "An author"',
  'tags: ["a-tag"]',
  "---",
  "",
  "Body text.",
  "",
].join("\n");

describe("blog post loader dotfiles", () => {
  it("lists and parses a dot-prefixed .md post", () => {
    const base = mkdtempSync(path.join(tmpdir(), "blog-loader-dotfile-"));
    try {
      mkdirSync(path.join(base, "en"), { recursive: true });
      writeFileSync(path.join(base, "en", "1-district-1-quality-school.md"), POST_TEXT);
      writeFileSync(path.join(base, "en", ".phase-three-probe.md"), POST_TEXT);

      expect(listPostFiles(base)).toContain("en/.phase-three-probe.md");
      expect(
        loadAllPosts(base).map((post) => post.slug),
      ).toContain(".phase-three-probe");
    } finally {
      rmSync(base, { recursive: true, force: true });
    }
  });
});
