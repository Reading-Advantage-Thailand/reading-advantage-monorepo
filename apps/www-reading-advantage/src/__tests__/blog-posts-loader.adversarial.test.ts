/**
 * ADVERSARIAL: the merged blog validation never loads a non-.md post.
 * blog-posts-validation.test.ts filters files with f.endsWith(".md"), so a
 * post named *.mdx escapes all 15 rules and the discovery cases, and the
 * "file uses the .md extension" rule can never fail (every loaded post is
 * .md by construction). This test writes a temporary .mdx probe with broken
 * frontmatter and asserts the validation load sees it. It fails until Green
 * makes the shipped loader extension-agnostic (or rejects non-.md files).
 * Route-to-Green.
 */
import fs from "node:fs";
import path from "path";
import { afterAll, describe, expect, it } from "vitest";
import matter from "gray-matter";

const POSTS_BASE = path.join(
  process.cwd(),
  "src/app/[locale]/(marketing)/blog/posts",
);
const PROBE_PATH = path.join(POSTS_BASE, "en", "zz-adversarial-mdx-probe.mdx");

/** Copies the shipped loader of blog-posts-validation.test.ts. */
function loadAllPosts() {
  const localeDirs = fs
    .readdirSync(POSTS_BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
  const entries: string[] = [];
  for (const locale of localeDirs) {
    const files = fs
      .readdirSync(path.join(POSTS_BASE, locale))
      .filter((f) => f.endsWith(".md"));
    for (const file of files) {
      entries.push(`${locale}/${file}`);
    }
  }
  return entries;
}

describe("blog post validation must see every post file", () => {
  afterAll(() => {
    if (fs.existsSync(PROBE_PATH)) fs.unlinkSync(PROBE_PATH);
  });

  it("loads a .mdx post file so the rules can judge it", () => {
    fs.writeFileSync(
      PROBE_PATH,
      '---\ndate: "2026-11-20"\nexcerpt: "probe"\nauthor: "Probe"\ntags: ["probe"]\n---\n\nBody text.\n',
    );
    const { data } = matter(fs.readFileSync(PROBE_PATH, "utf8"));
    expect(
      data.title,
      "the probe post has no title, so a loader that sees it fails the title rule",
    ).toBeUndefined();
    const loaded = loadAllPosts();
    expect(
      loaded,
      "the shipped loader skips .mdx files, so a .mdx post escapes every rule",
    ).toContain("en/zz-adversarial-mdx-probe.mdx");
  });
});
