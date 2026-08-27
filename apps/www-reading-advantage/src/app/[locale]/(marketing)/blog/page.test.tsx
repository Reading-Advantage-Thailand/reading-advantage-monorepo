import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BlogPage from "@/app/[locale]/(marketing)/blog/page";
import BlogPaginatedPage from "@/app/[locale]/(marketing)/blog/page/[page]/page";
import { getAllPosts } from "@/lib/blog";
import type { BlogListItem } from "@/types/blog";

vi.mock("@/lib/blog", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/blog")>("@/lib/blog");

  return {
    ...actual,
    getAllPosts: vi.fn(),
  };
});

vi.mock("@/components/blog/blog-card", () => ({
  BlogCard: ({ post }: { post: BlogListItem }) => <article>{post.title}</article>,
}));

vi.mock("@/components/marketing/hero-section", () => ({
  default: () => <div data-testid="hero" />,
}));

const mockPosts: BlogListItem[] = Array.from({ length: 19 }, (_, index) => ({
  slug: `post-${index + 1}`,
  title: `Post ${index + 1}`,
  date: "2024-01-01",
  excerpt: `Excerpt ${index + 1}`,
  author: "Author",
  tags: ["reading"],
  readingTime: 1,
}));

const getAllPostsMock = vi.mocked(getAllPosts);

beforeEach(() => {
  getAllPostsMock.mockResolvedValue(mockPosts);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("blog pagination routes", () => {
  it("links the root and numbered pages to adjacent blog pages", async () => {
    const root = render(
      await BlogPage({ params: Promise.resolve({ locale: "en" }) }),
    );

    expect(root.getByRole("navigation", { name: "Pagination" })).toBeDefined();
    expect(root.getByRole("link", { name: "components.pagination.next" })).toHaveAttribute(
      "href",
      "/blog/page/2",
    );

    cleanup();

    const pageTwo = render(
      await BlogPaginatedPage({
        params: Promise.resolve({ locale: "en", page: "2" }),
      }),
    );

    expect(pageTwo.getByRole("navigation", { name: "Pagination" })).toBeDefined();
    expect(
      pageTwo.getByRole("link", { name: "components.pagination.previous" }),
    ).toHaveAttribute("href", "/blog/page/1");
    expect(
      pageTwo.getByRole("link", { name: "components.pagination.next" }),
    ).toHaveAttribute("href", "/blog/page/3");
  });
});
