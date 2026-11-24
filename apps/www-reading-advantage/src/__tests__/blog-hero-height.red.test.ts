import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import HeroSection from "@/components/marketing/hero-section";
import BlogPage from "@/app/[locale]/(marketing)/blog/page";
import BlogPaginatedPage from "@/app/[locale]/(marketing)/blog/page/[page]/page";
import BlogSlugPage from "@/app/[locale]/(marketing)/blog/[slug]/page";

/*
 * Behavior tests for A-59: the blog post hero must not render an ~800 px empty
 * band. Each case applies the real stylesheet utility to a probe or renders the
 * real pages, then reads the computed min-height from the DOM. No source module
 * text and no rendered class names are asserted.
 */
const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const css = readFileSync(join(APP_ROOT, "src/app/[locale]/globals.css"), "utf8");

/** The real min-height declarations extracted from the stylesheet utilities. */
const UTILITY_CSS = ["min-h-hero", "min-h-hero-sm", "min-h-hero-compact"]
  .map((name) => {
    const match = new RegExp(`@utility\\s+${name}\\s*\\{([^}]*)\\}`).exec(css);
    return match ? `.${name} { ${match[1]} }` : "";
  })
  .join("\n");

/** Injects the real utility declarations as testable classes. */
function installUtilities(): void {
  const style = document.createElement("style");
  style.setAttribute("data-testid", "hero-utilities");
  style.textContent = UTILITY_CSS;
  document.head.appendChild(style);
}

/** Reads the computed min-height of the first section in a container. */
function heroMinHeight(container: HTMLElement): string {
  const section = container.querySelector("section");
  expect(section, "a hero section must render").not.toBeNull();
  return window.getComputedStyle(section as HTMLElement).minHeight;
}

const mockPost = {
  slug: "sample",
  title: "Sample post",
  date: "2024-01-01",
  excerpt: "Excerpt",
  author: "Author",
  tags: ["reading"],
  readingTime: 1,
  locale: "en",
  rawContent: "# Heading\n\nBody text.",
  coverImage: "/images/teacher-at-board.png",
};

vi.mock("@/lib/blog", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog")>("@/lib/blog");
  return {
    ...actual,
    getAllPosts: vi.fn(async () => []),
    getPaginatedPosts: vi.fn(async () => ({ posts: [], totalPages: 1 })),
    getBlogPostTotalPages: vi.fn(() => 1),
    getBlogPost: vi.fn(async () => mockPost),
    extractHeadings: vi.fn(() => []),
    getBlogPostLocales: vi.fn(() => ["en"]),
    getRelatedPosts: vi.fn(() => []),
    isSafeBlogSlug: vi.fn(() => true),
    normalizeBlogLocale: vi.fn(() => "en"),
  };
});

vi.mock("@/components/blog/blog-header", () => ({
  BlogHeader: () => createElement("header", null, "header"),
}));
vi.mock("@/components/blog/blog-breadcrumbs", () => ({
  BlogBreadcrumbs: () => createElement("nav", null, "breadcrumbs"),
}));
vi.mock("@/components/blog/blog-tags", () => ({
  BlogTags: () => createElement("div", null, "tags"),
}));
vi.mock("@/components/blog/table-of-contents", () => ({
  TableOfContents: () => createElement("nav", null, "toc"),
}));
vi.mock("@/components/blog/related-posts", () => ({
  RelatedPosts: () => createElement("div", null, "related"),
}));
vi.mock("@/components/blog/product-cta", () => ({
  ProductCTA: () => createElement("div", null, "product-cta"),
}));
vi.mock("@/components/blog/contact-cta", () => ({
  ContactCTA: () => createElement("div", null, "contact-cta"),
}));

afterEach(() => {
  cleanup();
  document
    .querySelectorAll('[data-testid="hero-utilities"]')
    .forEach((node) => node.remove());
});

describe("blog post hero compact height (A-59, computed behavior)", () => {
  it("declares a content-sized compact utility in the real stylesheet", () => {
    installUtilities();
    const probe = document.createElement("div");
    probe.className = "min-h-hero-compact";
    document.body.appendChild(probe);
    expect(window.getComputedStyle(probe).minHeight).toBe("auto");
    document.body.removeChild(probe);
  });

  it("renders a compact hero without the default tall band", () => {
    installUtilities();
    const compact = render(
      createElement(HeroSection, {
        title: "Post",
        description: "Intro",
        height: "compact",
      }),
    );
    expect(heroMinHeight(compact.container)).toBe("auto");
    cleanup();

    const medium = render(
      createElement(HeroSection, { title: "Post", description: "Intro" }),
    );
    expect(heroMinHeight(medium.container)).toBe("70vh");
  });

  it("uses the compact hero on every blog route", async () => {
    installUtilities();
    const main = render(
      await BlogPage({ params: Promise.resolve({ locale: "en" }) }),
    );
    expect(heroMinHeight(main.container)).toBe("auto");
    cleanup();

    const paginated = render(
      await BlogPaginatedPage({
        params: Promise.resolve({ locale: "en", page: "1" }),
      }),
    );
    expect(heroMinHeight(paginated.container)).toBe("auto");
    cleanup();

    const slug = render(
      await BlogSlugPage({
        params: Promise.resolve({ locale: "en", slug: "sample" }),
      }),
    );
    expect(heroMinHeight(slug.container)).toBe("auto");
  });
});
