/**
 * Validates every on-disk blog post markdown file across all locale directories.
 * Catches malformed frontmatter before it reaches production.
 * Uses real filesystem reads — no mocks.
 */
import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import matter from "gray-matter";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const POSTS_BASE = path.join(
  process.cwd(),
  "src/app/[locale]/(marketing)/blog/posts",
);

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const URL_SAFE_SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface PostEntry {
  locale: string;
  slug: string;
  filePath: string;
  raw: string;
  data: Record<string, unknown>;
  content: string;
}

function loadAllPosts(): PostEntry[] {
  const localeDirs = fs
    .readdirSync(POSTS_BASE, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const entries: PostEntry[] = [];

  for (const locale of localeDirs) {
    const localeDir = path.join(POSTS_BASE, locale);
    const files = fs
      .readdirSync(localeDir)
      .filter((f) => f.endsWith(".md"));

    for (const file of files) {
      const filePath = path.join(localeDir, file);
      const raw = fs.readFileSync(filePath, "utf8");
      const { data, content } = matter(raw);
      entries.push({
        locale,
        slug: file.replace(/\.md$/, ""),
        filePath,
        raw,
        data: data as Record<string, unknown>,
        content,
      });
    }
  }

  return entries;
}

const allPosts = loadAllPosts();

// ─── Required frontmatter ─────────────────────────────────────────────────────

describe("blog post frontmatter — required fields", () => {
  it("discovers at least one post in the en/ directory", () => {
    const enPosts = allPosts.filter((p) => p.locale === "en");
    expect(enPosts.length).toBeGreaterThan(0);
  });

  for (const post of allPosts) {
    const label = `[${post.locale}] ${post.slug}`;

    it(`${label}: title is a non-empty string`, () => {
      expect(typeof post.data.title).toBe("string");
      expect((post.data.title as string).trim().length).toBeGreaterThan(0);
    });

    it(`${label}: date is present and matches YYYY-MM-DD`, () => {
      expect(typeof post.data.date).toBe("string");
      expect(post.data.date).toMatch(ISO_DATE_RE);
    });

    it(`${label}: date is a valid calendar date`, () => {
      const d = new Date(post.data.date as string);
      expect(isNaN(d.getTime())).toBe(false);
    });

    it(`${label}: excerpt is a non-empty string`, () => {
      expect(typeof post.data.excerpt).toBe("string");
      expect((post.data.excerpt as string).trim().length).toBeGreaterThan(0);
    });

    it(`${label}: author is a non-empty string`, () => {
      expect(typeof post.data.author).toBe("string");
      expect((post.data.author as string).trim().length).toBeGreaterThan(0);
    });

    it(`${label}: tags is an array`, () => {
      expect(Array.isArray(post.data.tags)).toBe(true);
    });

    it(`${label}: every tag is a non-empty string`, () => {
      const tags = (post.data.tags ?? []) as unknown[];
      for (const tag of tags) {
        expect(typeof tag).toBe("string");
        expect((tag as string).trim().length).toBeGreaterThan(0);
      }
    });
  }
});

// ─── Optional frontmatter ─────────────────────────────────────────────────────

describe("blog post frontmatter — optional fields", () => {
  for (const post of allPosts) {
    const label = `[${post.locale}] ${post.slug}`;

    it(`${label}: readingTime if present must be a positive number`, () => {
      if (post.data.readingTime !== undefined) {
        expect(typeof post.data.readingTime).toBe("number");
        expect(post.data.readingTime as number).toBeGreaterThan(0);
      }
    });

    it(`${label}: coverImage if present must be an absolute path starting with /`, () => {
      if (post.data.coverImage !== undefined) {
        expect(typeof post.data.coverImage).toBe("string");
        expect(post.data.coverImage as string).toMatch(/^\//);
      }
    });

    it(`${label}: coverImage if present must exist on disk`, () => {
      if (post.data.coverImage !== undefined) {
        const imgPath = path.join(process.cwd(), "public", post.data.coverImage as string);
        expect(fs.existsSync(imgPath)).toBe(true);
      }
    });
  }
});

// ─── Content ──────────────────────────────────────────────────────────────────

describe("blog post content", () => {
  for (const post of allPosts) {
    const label = `[${post.locale}] ${post.slug}`;

    it(`${label}: has non-empty body content after frontmatter`, () => {
      expect(post.content.trim().length).toBeGreaterThan(0);
    });

    it(`${label}: does not accidentally embed raw frontmatter delimiters in body`, () => {
      const bodyLines = post.content.split("\n");
      // A bare "---" line in the body is usually a mistake (unclosed frontmatter)
      const bareDashes = bodyLines.filter((l) => l.trim() === "---");
      expect(bareDashes.length).toBe(0);
    });
  }
});

// ─── File / slug conventions ──────────────────────────────────────────────────

describe("blog post file naming", () => {
  for (const post of allPosts) {
    const label = `[${post.locale}] ${post.slug}`;

    it(`${label}: slug is URL-safe (lowercase, hyphens only)`, () => {
      expect(post.slug).toMatch(URL_SAFE_SLUG_RE);
    });

    it(`${label}: file uses .md extension (not .mdx or .markdown)`, () => {
      expect(post.filePath).toMatch(/\.md$/);
    });
  }
});

// ─── Cross-locale consistency ─────────────────────────────────────────────────

describe("cross-locale consistency", () => {
  const enSlugs = new Set(
    allPosts.filter((p) => p.locale === "en").map((p) => p.slug),
  );

  const nonEnPosts = allPosts.filter((p) => p.locale !== "en");

  it("en/ directory exists and is non-empty (canonical source)", () => {
    expect(enSlugs.size).toBeGreaterThan(0);
  });

  for (const post of nonEnPosts) {
    const label = `[${post.locale}] ${post.slug}`;

    it(`${label}: if slug matches an en/ post, date must not be older`, () => {
      if (!enSlugs.has(post.slug)) return; // locale-only post — skip
      const enPost = allPosts.find(
        (p) => p.locale === "en" && p.slug === post.slug,
      )!;
      const localeDate = new Date(post.data.date as string).getTime();
      const enDate = new Date(enPost.data.date as string).getTime();
      // Locale post date should be >= en/ date (translation can be newer, not older)
      expect(localeDate).toBeGreaterThanOrEqual(enDate);
    });
  }
});
