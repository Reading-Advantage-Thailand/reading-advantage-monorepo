import { describe, it, expect } from "vitest";
import {
  calculateReadingTime,
  getPaginatedPosts,
  extractHeadings,
  getRelatedPosts,
} from "@/lib/blog";

// ─── calculateReadingTime (now returns number) ────────────────────────────────

describe("calculateReadingTime", () => {
  it("returns 1 for short content", () => {
    const shortContent =
      "This is a short blog post with only fifty words here and there to read.";
    const result = calculateReadingTime(shortContent);
    expect(result).toBe(1);
  });

  it("returns 5 for 1000-word content", () => {
    const words = Array(1000).fill("word").join(" ");
    const result = calculateReadingTime(words);
    expect(result).toBe(5);
  });

  it("handles empty string", () => {
    const result = calculateReadingTime("");
    expect(result).toBe(1);
  });

  it("handles content with extra whitespace", () => {
    const contentWithWhitespace = "  word   word   word  ";
    const result = calculateReadingTime(contentWithWhitespace);
    expect(result).toBe(1);
  });

  it("returns a number, not a string", () => {
    const result = calculateReadingTime("some words here");
    expect(typeof result).toBe("number");
  });
});

// ─── getPaginatedPosts ────────────────────────────────────────────────────────

describe("getPaginatedPosts", () => {
  const mockPosts = [
    { slug: "post-1", title: "Post 1", date: "2024-01-01", excerpt: "Excerpt 1", author: "Author 1", tags: ["tag1"], readingTime: 5 },
    { slug: "post-2", title: "Post 2", date: "2024-01-02", excerpt: "Excerpt 2", author: "Author 2", tags: ["tag1", "tag2"], readingTime: 3 },
    { slug: "post-3", title: "Post 3", date: "2024-01-03", excerpt: "Excerpt 3", author: "Author 3", tags: ["tag2"], readingTime: 7 },
    { slug: "post-4", title: "Post 4", date: "2024-01-04", excerpt: "Excerpt 4", author: "Author 4", tags: ["tag3"], readingTime: 4 },
    { slug: "post-5", title: "Post 5", date: "2024-01-05", excerpt: "Excerpt 5", author: "Author 5", tags: ["tag1"], readingTime: 6 },
    { slug: "post-6", title: "Post 6", date: "2024-01-06", excerpt: "Excerpt 6", author: "Author 6", tags: ["tag2"], readingTime: 5 },
    { slug: "post-7", title: "Post 7", date: "2024-01-07", excerpt: "Excerpt 7", author: "Author 7", tags: ["tag3"], readingTime: 8 },
    { slug: "post-8", title: "Post 8", date: "2024-01-08", excerpt: "Excerpt 8", author: "Author 8", tags: ["tag1"], readingTime: 3 },
    { slug: "post-9", title: "Post 9", date: "2024-01-09", excerpt: "Excerpt 9", author: "Author 9", tags: ["tag2"], readingTime: 6 },
    { slug: "post-10", title: "Post 10", date: "2024-01-10", excerpt: "Excerpt 10", author: "Author 10", tags: ["tag3"], readingTime: 4 },
  ];

  it("returns the correct slice of posts for page 1 with default perPage (9)", async () => {
    const result = await getPaginatedPosts(1, 9, mockPosts);
    expect(result.posts).toHaveLength(9);
    expect(result.posts[0].slug).toBe("post-10");
    expect(result.posts[8].slug).toBe("post-2");
    expect(result.currentPage).toBe(1);
    expect(result.totalPages).toBe(2);
  });

  it("returns the correct slice of posts for page 2", async () => {
    const result = await getPaginatedPosts(2, 9, mockPosts);
    expect(result.posts).toHaveLength(1);
    expect(result.posts[0].slug).toBe("post-1");
    expect(result.currentPage).toBe(2);
    expect(result.totalPages).toBe(2);
  });

  it("returns total page count correctly", async () => {
    const result = await getPaginatedPosts(1, 3, mockPosts);
    expect(result.totalPages).toBe(4);
  });

  it("returns empty array for page numbers beyond total", async () => {
    const result = await getPaginatedPosts(3, 9, mockPosts);
    expect(result.posts).toHaveLength(0);
    expect(result.currentPage).toBe(3);
    expect(result.totalPages).toBe(2);
  });

  it("returns empty array for page 0 or negative", async () => {
    const result = await getPaginatedPosts(0, 9, mockPosts);
    expect(result.posts).toHaveLength(0);
  });

  it("handles custom perPage values", async () => {
    const result = await getPaginatedPosts(1, 5, mockPosts);
    expect(result.posts).toHaveLength(5);
    expect(result.totalPages).toBe(2);
  });
});

// ─── extractHeadings ──────────────────────────────────────────────────────────

describe("extractHeadings", () => {
  it("extracts H2 headings from MDX content", () => {
    const content =
      "# Main Title\n\n## Section One\n\nSome text\n\n## Section Two\n\nMore text";
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(2);
    expect(headings[0].text).toBe("Section One");
    expect(headings[0].level).toBe(2);
    expect(headings[1].text).toBe("Section Two");
    expect(headings[1].level).toBe(2);
  });

  it("extracts H3 headings from MDX content", () => {
    const content = "### Subsection\n\nText here";
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(1);
    expect(headings[0].text).toBe("Subsection");
    expect(headings[0].level).toBe(3);
  });

  it("extracts both H2 and H3 headings", () => {
    const content =
      "## First Section\n\n### Subsection One\n\n### Subsection Two\n\n## Second Section";
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(4);
    expect(headings[0]).toEqual({ text: "First Section", level: 2, id: "first-section" });
    expect(headings[1]).toEqual({ text: "Subsection One", level: 3, id: "subsection-one" });
    expect(headings[2]).toEqual({ text: "Subsection Two", level: 3, id: "subsection-two" });
    expect(headings[3]).toEqual({ text: "Second Section", level: 2, id: "second-section" });
  });

  it("ignores H1 headings", () => {
    const content = "# Main Title\n\n## Section\n\n### Subsection";
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(2);
    expect(headings[0].level).toBe(2);
    expect(headings[1].level).toBe(3);
  });

  it("ignores H4 and higher headings", () => {
    const content = "## Section\n\n#### Not extracted\n\n##### Also not extracted";
    const headings = extractHeadings(content);
    expect(headings).toHaveLength(1);
  });

  it("generates slug IDs from heading text", () => {
    const content = "## Hello World Section";
    const headings = extractHeadings(content);
    expect(headings[0].id).toBe("hello-world-section");
  });

  it("handles empty content", () => {
    const headings = extractHeadings("");
    expect(headings).toHaveLength(0);
  });
});

// ─── getRelatedPosts ──────────────────────────────────────────────────────────

describe("getRelatedPosts", () => {
  const mockPosts = [
    { slug: "post-1", title: "Post 1", date: "2024-01-01", excerpt: "Excerpt 1", author: "Author 1", tags: ["tag1", "tag2"], readingTime: 5 },
    { slug: "post-2", title: "Post 2", date: "2024-01-02", excerpt: "Excerpt 2", author: "Author 2", tags: ["tag1"], readingTime: 3 },
    { slug: "post-3", title: "Post 3", date: "2024-01-03", excerpt: "Excerpt 3", author: "Author 3", tags: ["tag2"], readingTime: 7 },
    { slug: "post-4", title: "Post 4", date: "2024-01-04", excerpt: "Excerpt 4", author: "Author 4", tags: ["tag3"], readingTime: 4 },
  ];

  it("returns posts sharing at least one tag", () => {
    const result = getRelatedPosts("post-1", ["tag1", "tag2"], mockPosts, 3);
    expect(result).toHaveLength(2);
    expect(result.map((p) => p.slug)).toContain("post-2");
    expect(result.map((p) => p.slug)).toContain("post-3");
  });

  it("excludes the current post", () => {
    const result = getRelatedPosts("post-1", ["tag1"], mockPosts, 3);
    expect(result.map((p) => p.slug)).not.toContain("post-1");
  });

  it("respects the limit", () => {
    const result = getRelatedPosts("post-1", ["tag1", "tag2"], mockPosts, 1);
    expect(result).toHaveLength(1);
  });

  it("returns empty array when only current post matches", () => {
    const result = getRelatedPosts("post-1", ["unique-tag"], [mockPosts[0]], 3);
    expect(result).toHaveLength(0);
  });

  it("falls back to most recent posts when no tag matches", () => {
    const result = getRelatedPosts("post-4", ["nonexistent"], mockPosts, 2);
    expect(result).toHaveLength(2);
    expect(result[0].slug).toBe("post-3");
    expect(result[1].slug).toBe("post-2");
  });
});

