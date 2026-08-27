import type { AnchorHTMLAttributes, ReactNode } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import BlogPage from "@/app/[locale]/(marketing)/blog/page";
import BlogPaginatedPage, {
  generateMetadata as generateBlogPaginationMetadata,
  generateStaticParams,
} from "@/app/[locale]/(marketing)/blog/page/[page]/page";
import { notFound, permanentRedirect } from "next/navigation";
import { getAllPosts, getBlogPostTotalPages } from "@/lib/blog";
import type { BlogListItem } from "@/types/blog";

const localeState = vi.hoisted(() => ({ current: "en" }));

vi.mock("@/lib/blog", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/blog")>("@/lib/blog");

  return {
    ...actual,
    getAllPosts: vi.fn(),
    getBlogPostTotalPages: vi.fn(() => 3),
  };
});

type MockLinkProps = Omit<
  AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
> & {
  children: ReactNode;
  href: string;
  scroll?: boolean;
};

vi.mock("@/locales/navigation", () => ({
  Link: ({ href, children, scroll: _scroll, ...props }: MockLinkProps) => (
    <a href={`/${localeState.current}${href}`} {...props}>
      {children}
    </a>
  ),
}));

vi.mock("@/components/blog/blog-card", () => ({
  BlogCard: ({ post }: { post: BlogListItem }) => <article>{post.title}</article>,
}));

vi.mock("@/components/marketing/hero-section", () => ({
  default: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

const mockPosts: BlogListItem[] = Array.from({ length: 19 }, (_, index) => ({
  slug: `post-${index + 1}`,
  title: `Post ${index + 1}`,
  date: `2024-01-${String(19 - index).padStart(2, "0")}`,
  excerpt: `Excerpt ${index + 1}`,
  author: "Author",
  tags: ["reading"],
  readingTime: 1,
}));

const getAllPostsMock = vi.mocked(getAllPosts);
const getBlogPostTotalPagesMock = vi.mocked(getBlogPostTotalPages);
const notFoundMock = vi.mocked(notFound);
const permanentRedirectMock = vi.mocked(permanentRedirect);

beforeEach(() => {
  localeState.current = "en";
  getAllPostsMock.mockResolvedValue(mockPosts);
  getBlogPostTotalPagesMock.mockReturnValue(3);
  notFoundMock.mockReset();
  permanentRedirectMock.mockReset();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("blog pagination routes", () => {
  it("uses locale-aware links for root, middle, and last pages", async () => {
    localeState.current = "th";
    const root = render(
      await BlogPage({ params: Promise.resolve({ locale: "th" }) }),
    );

    for (let postNumber = 1; postNumber <= 9; postNumber += 1) {
      expect(root.getByText(`Post ${postNumber}`)).toBeDefined();
    }
    expect(root.queryByText("Post 10")).toBeNull();
    expect(root.getByRole("heading", { name: "pages.blog.title" })).toBeDefined();
    expect(
      root.getByRole("navigation", { name: "components.pagination.page" }),
    ).toBeDefined();
    expect(root.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/th/blog",
    );
    expect(root.getByRole("link", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(root.getByRole("link", { name: "components.pagination.next" })).toHaveAttribute(
      "href",
      "/th/blog/page/2",
    );

    cleanup();
    localeState.current = "en";

    const pageTwo = render(
      await BlogPaginatedPage({
        params: Promise.resolve({ locale: "en", page: "2" }),
      }),
    );

    for (let postNumber = 10; postNumber <= 18; postNumber += 1) {
      expect(pageTwo.getByText(`Post ${postNumber}`)).toBeDefined();
    }
    expect(pageTwo.queryByText("Post 9")).toBeNull();
    expect(pageTwo.queryByText("Post 19")).toBeNull();
    expect(pageTwo.getByRole("heading", { name: "Blog - Page 2" })).toBeDefined();
    expect(
      pageTwo.getByRole("navigation", { name: "components.pagination.page" }),
    ).toBeDefined();
    expect(
      pageTwo.getByRole("link", { name: "components.pagination.previous" }),
    ).toHaveAttribute("href", "/en/blog");
    expect(
      pageTwo.getByRole("link", { name: "components.pagination.next" }),
    ).toHaveAttribute("href", "/en/blog/page/3");
    expect(pageTwo.getByRole("link", { name: "2" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    cleanup();

    const lastPage = render(
      await BlogPaginatedPage({
        params: Promise.resolve({ locale: "en", page: "3" }),
      }),
    );

    expect(lastPage.getByText("Post 19")).toBeDefined();
    expect(lastPage.queryByText("Post 18")).toBeNull();
    expect(lastPage.getByRole("heading", { name: "Blog - Page 3" })).toBeDefined();
    expect(
      lastPage.getByRole("link", { name: "components.pagination.previous" }),
    ).toHaveAttribute("href", "/en/blog/page/2");
    expect(lastPage.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/en/blog",
    );
    expect(
      lastPage.queryByRole("link", { name: "components.pagination.next" }),
    ).toBeNull();
    expect(lastPage.getByText("components.pagination.next")).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  it("permanently redirects page one to the locale-aware blog root", async () => {
    const redirectError = new Error("NEXT_REDIRECT");
    permanentRedirectMock.mockImplementation(() => {
      throw redirectError;
    });

    await expect(
      BlogPaginatedPage({
        params: Promise.resolve({ locale: "zh", page: "1" }),
      }),
    ).rejects.toBe(redirectError);
    expect(permanentRedirectMock).toHaveBeenCalledWith("/zh/blog");
  });

  it("excludes page one from metadata and static parameters", async () => {
    await expect(
      generateBlogPaginationMetadata({
        params: Promise.resolve({ locale: "en", page: "1" }),
      }),
    ).resolves.toEqual({});
    await expect(generateStaticParams()).resolves.toEqual([
      { page: "2" },
      { page: "3" },
    ]);
  });

  it("not-founds page zero and out-of-range pages", async () => {
    const notFoundError = new Error("NEXT_NOT_FOUND");
    notFoundMock.mockImplementation(() => {
      throw notFoundError;
    });

    await expect(
      BlogPaginatedPage({
        params: Promise.resolve({ locale: "en", page: "0" }),
      }),
    ).rejects.toBe(notFoundError);
    await expect(
      BlogPaginatedPage({
        params: Promise.resolve({ locale: "en", page: "4" }),
      }),
    ).rejects.toBe(notFoundError);
    expect(notFoundMock).toHaveBeenCalledTimes(2);
  });
});
