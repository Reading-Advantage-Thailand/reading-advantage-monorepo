/**
 * ADVERSARIAL probes for the merged blog validation loader.
 * Case 1 (closed): the loader once filtered f.endsWith(".md"), so a *.mdx
 * post escaped every rule. The shipped fixture now lists every non-hidden
 * file, and this case stays as regression armor.
 * Case 2 (ADV-11): an uppercase .MD post is never parsed (the parse filter
 * is case-sensitive) and never flagged (MARKDOWN_LIKE_RE omits a plain .md
 * stem, so it also misses .MD). A valid post saved as *.MD is invisible to
 * all 17 cases. This case fails until Green flags a case-insensitive .md
 * suffix that is not exactly ".md". Route-to-Green.
 */
import fs from "node:fs";
import { tmpdir } from "node:os";
import path from "path";
import { afterAll, describe, expect, it } from "vitest";
import matter from "gray-matter";
import {
  brokenPostRefs,
  listPostFiles,
  mislabelledPostRefs,
} from "./fixtures/blog-posts-loader";

const POSTS_BASE = path.join(
  process.cwd(),
  "src/app/[locale]/(marketing)/blog/posts",
);
const PROBE_PATH = path.join(POSTS_BASE, "en", "zz-adversarial-mdx-probe.mdx");

/** Uses the shipped extension-agnostic loader. */
function loadAllPosts() {
  return listPostFiles();
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

  it("flags an uppercase .MD post file as mislabelled (ADV-11)", () => {
    const probePath = path.join(POSTS_BASE, "en", "zz-adv-upper-probe.MD");
    const probeRef = "en/zz-adv-upper-probe.MD";
    fs.writeFileSync(
      probePath,
      '---\ntitle: "ZZ uppercase probe"\ndate: "2026-11-20"\nexcerpt: "probe"\nauthor: "Probe"\ntags: ["probe"]\n---\n\nBody text.\n',
    );
    try {
      const refs = listPostFiles();
      expect(refs, "the file sweep sees the probe").toContain(probeRef);
      const mislabelled = mislabelledPostRefs();
      expect(
        mislabelled,
        "an uppercase .MD post is not parsed and not flagged, so it escapes every rule",
      ).toContain(probeRef);
    } finally {
      fs.unlinkSync(probePath);
    }
  });

  it("surfaces a symlink to a directory named .md (ADV-22)", () => {
    const tempBase = fs.mkdtempSync(
      path.join(tmpdir(), "blog-loader-adversarial-"),
    );
    const localeDir = path.join(tempBase, "th");
    const dirTarget = path.join(localeDir, "zz-adv-dir-target");
    const linkPath = path.join(localeDir, "zz-adv-dirlink.md");
    fs.mkdirSync(dirTarget, { recursive: true });
    fs.symlinkSync("zz-adv-dir-target", linkPath);
    try {
      const listed = listPostFiles(tempBase);
      const broken = brokenPostRefs(tempBase);
      expect(
        [...listed, ...broken],
        "a symlink to a directory named .md must be surfaced, not skipped silently; the phase-base test and blog.ts crash with EISDIR on it",
      ).toContain("th/zz-adv-dirlink.md");
    } finally {
      fs.rmSync(tempBase, { recursive: true, force: true });
    }
  });
});
