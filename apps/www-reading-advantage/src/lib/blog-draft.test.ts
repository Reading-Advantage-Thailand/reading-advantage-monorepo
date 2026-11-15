/**
 * Draft flag tests (track www_blog_rich_format_20261115).
 * Uses the real sample draft post on disk.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import {
  getAllBlogPosts,
  getBlogPost,
  getBlogPostTotalPages,
  getRelatedPosts,
  postsDirectory,
} from "@/lib/blog";

const DRAFT = "blog-format-sample";

function publishedEnglishCount(): number {
  return fs
    .readdirSync(postsDirectory("en"))
    .filter(
      (file) =>
        matter(fs.readFileSync(path.join(postsDirectory("en"), file), "utf8")).data.draft !== true,
    ).length;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("draft posts in production", () => {
  it("the sample post is a draft on disk", () => {
    const file = path.join(postsDirectory("en"), `${DRAFT}.md`);
    expect(matter(fs.readFileSync(file, "utf8")).data.draft).toBe(true);
  });

  it("leaves the draft out of the list in every locale", async () => {
    vi.stubEnv("NODE_ENV", "production");
    for (const locale of ["en", "th", "zh"] as const) {
      const slugs = (await getAllBlogPosts(locale)).map((post) => post.slug);
      expect(slugs).not.toContain(DRAFT);
    }
    expect(await getAllBlogPosts("en")).toHaveLength(publishedEnglishCount());
  });

  it("leaves the draft out of the page count and the related posts", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(getBlogPostTotalPages("en", 1)).toBe(publishedEnglishCount());
    const related = getRelatedPosts("x", ["Product Update"], await getAllBlogPosts("en"), 100);
    expect(related.map((post) => post.slug)).not.toContain(DRAFT);
  });

  it("gives no post for the draft URL in every locale", async () => {
    vi.stubEnv("NODE_ENV", "production");
    expect(await getBlogPost(DRAFT, "en")).toBeNull();
    expect(await getBlogPost(DRAFT, "th")).toBeNull();
  });
});

describe("draft posts in development", () => {
  it("renders the draft and lists it", async () => {
    vi.stubEnv("NODE_ENV", "development");
    const post = await getBlogPost(DRAFT, "en");
    expect(post?.draft).toBe(true);
    expect(post?.content).toContain('<figure class="blog-figure">');
    expect((await getAllBlogPosts("en")).map((item) => item.slug)).toContain(DRAFT);
    expect(getBlogPostTotalPages("en", 1)).toBe(publishedEnglishCount() + 1);
  });

  it("renders every post on disk without an error", async () => {
    vi.stubEnv("NODE_ENV", "development");
    for (const locale of ["en", "th", "zh"] as const) {
      await expect(getAllBlogPosts(locale)).resolves.not.toHaveLength(0);
    }
  });
});
