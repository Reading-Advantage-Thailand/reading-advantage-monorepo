/**
 * Validates every on-disk blog post markdown file across all locale directories.
 * Catches malformed frontmatter before it reaches production.
 * Uses real filesystem reads — no mocks.
 *
 * Each rule has one case. The case walks every post and collects one line per
 * broken post, so a failure names every offending locale and slug.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import {
  listPostFiles,
  loadAllPosts,
  type PostEntry,
} from "@/__tests__/fixtures/blog-posts-loader";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_SAFE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** Extensions that mark a file as a post written in Markdown. */
const MARKDOWN_LIKE_RE = /\.(?:mdx|markdown|mdown|mkd)$/i;

/**
 * Finds post files that use a Markdown-like extension other than .md.
 * Files with data extensions such as .json are not posts.
 * @returns One "<locale>/<file>" reference per mislabelled post.
 */
function nonMarkdownRefs(): string[] {
  return listPostFiles().filter(
    (ref) => MARKDOWN_LIKE_RE.test(ref) || !ref.includes("."),
  );
}

const allPosts = loadAllPosts();
const enPosts = allPosts.filter((p) => p.locale === "en");
const enSlugs = new Set(enPosts.map((p) => p.slug));

/**
 * Collects one violation line for every post that breaks one rule.
 * @param posts The posts to check.
 * @param rule The rule name printed in each violation.
 * @param holds True when a post satisfies the rule.
 * @returns One "<locale>/<slug>: <rule>" line per broken post.
 */
function violationsFor(
  posts: readonly PostEntry[],
  rule: string,
  holds: (post: PostEntry) => boolean,
): string[] {
  const violations: string[] = [];
  for (const post of posts) {
    if (!holds(post)) {
      violations.push(`${post.locale}/${post.slug}: ${rule}`);
    }
  }
  return violations;
}

/** True when a frontmatter value is a non-empty string. */
function isNonEmptyString(value: unknown): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

// ─── Required frontmatter ─────────────────────────────────────────────────────

describe("blog post frontmatter — required fields", () => {
  it("discovers at least one post in the en/ directory", () => {
    expect(enPosts.length).toBeGreaterThan(0);
    expect(nonMarkdownRefs(), "every discovered post file is Markdown").toEqual(
      [],
    );
  });

  it("title is a non-empty string on every post", () => {
    expect(
      violationsFor(allPosts, "title is a non-empty string", (post) =>
        isNonEmptyString(post.data.title),
      ),
    ).toEqual([]);
  });

  it("date is present and matches YYYY-MM-DD on every post", () => {
    expect(
      violationsFor(allPosts, "date matches YYYY-MM-DD", (post) =>
        typeof post.data.date === "string" && ISO_DATE_RE.test(post.data.date),
      ),
    ).toEqual([]);
  });

  it("date is a valid calendar date on every post", () => {
    expect(
      violationsFor(allPosts, "date is a valid calendar date", (post) =>
        !isNaN(new Date(post.data.date as string).getTime()),
      ),
    ).toEqual([]);
  });

  it("excerpt is a non-empty string on every post", () => {
    expect(
      violationsFor(allPosts, "excerpt is a non-empty string", (post) =>
        isNonEmptyString(post.data.excerpt),
      ),
    ).toEqual([]);
  });

  it("author is a non-empty string on every post", () => {
    expect(
      violationsFor(allPosts, "author is a non-empty string", (post) =>
        isNonEmptyString(post.data.author),
      ),
    ).toEqual([]);
  });

  it("tags is an array on every post", () => {
    expect(
      violationsFor(allPosts, "tags is an array", (post) =>
        Array.isArray(post.data.tags),
      ),
    ).toEqual([]);
  });

  it("every tag is a non-empty string on every post", () => {
    expect(
      violationsFor(allPosts, "every tag is a non-empty string", (post) => {
        for (const tag of (post.data.tags ?? []) as unknown[]) {
          if (!isNonEmptyString(tag)) return false;
        }
        return true;
      }),
    ).toEqual([]);
  });
});

// ─── Optional frontmatter ─────────────────────────────────────────────────────

describe("blog post frontmatter — optional fields", () => {
  it("readingTime if present is a positive number on every post", () => {
    expect(
      violationsFor(
        allPosts,
        "readingTime is a positive number",
        (post) =>
          post.data.readingTime === undefined ||
          (typeof post.data.readingTime === "number" &&
            post.data.readingTime > 0),
      ),
    ).toEqual([]);
  });

  it("coverImage if present is an absolute path starting with / on every post", () => {
    expect(
      violationsFor(
        allPosts,
        "coverImage is an absolute path",
        (post) =>
          post.data.coverImage === undefined ||
          (typeof post.data.coverImage === "string" &&
            post.data.coverImage.startsWith("/")),
      ),
    ).toEqual([]);
  });

  it("coverImage if present exists on disk on every post", () => {
    expect(
      violationsFor(
        allPosts,
        "coverImage exists on disk",
        (post) =>
          post.data.coverImage === undefined ||
          (typeof post.data.coverImage === "string" &&
            fs.existsSync(
              path.join(process.cwd(), "public", post.data.coverImage),
            )),
      ),
    ).toEqual([]);
  });
});

// ─── Content ──────────────────────────────────────────────────────────────────

describe("blog post content", () => {
  it("has a non-empty body after frontmatter on every post", () => {
    expect(
      violationsFor(allPosts, "body is non-empty", (post) =>
        post.content.trim().length > 0,
      ),
    ).toEqual([]);
  });

  it("does not embed raw frontmatter delimiters in any body", () => {
    expect(
      violationsFor(allPosts, "no raw frontmatter delimiter in body", (post) =>
        post.content
          .split("\n")
          .every((line) => line.trim() !== "---"),
      ),
    ).toEqual([]);
  });
});

// ─── File / slug conventions ──────────────────────────────────────────────────

describe("blog post file naming", () => {
  it("slug is URL-safe on every post", () => {
    expect(
      violationsFor(allPosts, "slug is URL-safe", (post) =>
        URL_SAFE_SLUG_RE.test(post.slug),
      ),
    ).toEqual([]);
  });

  it("file uses the .md extension on every post", () => {
    const violations = nonMarkdownRefs().map(
      (ref) => `${ref}: file uses .md extension`,
    );
    expect(violations).toEqual([]);
  });
});

// ─── Cross-locale consistency ─────────────────────────────────────────────────

describe("cross-locale consistency", () => {
  it("en/ directory exists and is non-empty (canonical source)", () => {
    expect(enSlugs.size).toBeGreaterThan(0);
    expect(nonMarkdownRefs(), "no non-Markdown post file in any locale").toEqual(
      [],
    );
  });

  it("a matching non-en post is never older than its en post", () => {
    const nonEnPosts = allPosts.filter(
      (post) => post.locale !== "en" && enSlugs.has(post.slug),
    );
    expect(
      violationsFor(
        nonEnPosts,
        "date is not older than en post",
        (post) => {
          const enPost = allPosts.find(
            (candidate) =>
              candidate.locale === "en" && candidate.slug === post.slug,
          );
          if (!enPost) return true;
          return (
            new Date(post.data.date as string).getTime() >=
            new Date(enPost.data.date as string).getTime()
          );
        },
      ),
    ).toEqual([]);
  });
});
