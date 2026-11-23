import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement, type ReactElement } from "react";
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import en from "@/locales/en";
import th from "@/locales/th";
import zh from "@/locales/zh";
import HomePage from "@/app/[locale]/(marketing)/(home)/page";
import AboutPage from "@/app/[locale]/(marketing)/about/page";
import CaseStudiesPage from "@/app/[locale]/(marketing)/case-studies/page";
import ContactPage from "@/app/[locale]/(marketing)/contact/page";
import FeaturesPage from "@/app/[locale]/(marketing)/features/page";
import MasteryPage from "@/app/[locale]/(marketing)/mastery-advantage/page";
import PricingPage from "@/app/[locale]/(marketing)/pricing/page";
import ProductsPage from "@/app/[locale]/(marketing)/products/page";
import ServicesPage from "@/app/[locale]/(marketing)/services/page";
import MathPage from "@/app/[locale]/(marketing)/products/math-advantage/page";
import PrimaryPage from "@/app/[locale]/(marketing)/products/primary-advantage/page";
import ReadingProductPage from "@/app/[locale]/(marketing)/products/reading-advantage/page";
import SciencePage from "@/app/[locale]/(marketing)/products/science-advantage/page";
import CodeCampPage from "@/app/[locale]/(marketing)/products/codecamp-advantage/page";
import StemPage from "@/app/[locale]/(marketing)/products/stem-advantage/page";
import StorytimePage from "@/app/[locale]/(marketing)/products/storytime-advantage/page";
import TutorPage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";
import ZhongwenPage from "@/app/[locale]/(marketing)/products/zhongwen-advantage/page";
import ManagedServicePage from "@/app/[locale]/(marketing)/services/managed-service/page";
import BlendedLearningPage from "@/app/[locale]/(marketing)/services/blended-learning/page";
import BlogPage from "@/app/[locale]/(marketing)/blog/page";
import BlogPaginatedPage from "@/app/[locale]/(marketing)/blog/page/[page]/page";
import BlogSlugPage from "@/app/[locale]/(marketing)/blog/[slug]/page";

const benignPost = {
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

vi.mock("@/locales/server", async () => {
  const { default: en } = await vi.importActual<typeof import("@/locales/en")>(
    "@/locales/en",
  );
  const readPath = (root: unknown, path: string): unknown =>
    path.split(".").reduce<unknown>((value, part) => {
      if (value === null || typeof value !== "object") return undefined;
      return (value as Record<string, unknown>)[part];
    }, root);
  const translate = (scope: string) => {
    const fn = (key: string) => {
      const value = readPath(en, scope ? `${scope}.${key}` : key);
      return typeof value === "string"
        ? value
        : (readPath(en, `${scope}.${key}`) ?? `${scope}.${key}`);
    };
    fn.raw = (key: string) => readPath(en, scope ? `${scope}.${key}` : key);
    return fn;
  };
  return {
    getI18n: vi.fn(() => Promise.resolve(translate(""))),
    getScopedI18n: vi.fn((scope: string) => Promise.resolve(translate(scope))),
    getStaticParams: vi.fn(() => []),
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

/*
 * The Products route renders three solution sections. Two of them are async
 * server components, so a client render of the route cannot show them.
 * Each section is swept on its own below.
 */
vi.mock("@/components/products/b2b-solutions", () => ({ default: () => null }));
vi.mock("@/components/products/b2c-solutions", () => ({ default: () => null }));
vi.mock("@/components/products/tutor-advantage", () => ({ default: () => null }));

vi.mock("@/lib/blog", async () => {
  const actual = await vi.importActual<typeof import("@/lib/blog")>("@/lib/blog");
  return {
    ...actual,
    getAllPosts: vi.fn(async () => []),
    getPaginatedPosts: vi.fn(async () => ({ posts: [], totalPages: 1 })),
    getBlogPostTotalPages: vi.fn(() => 1),
    getBlogPost: vi.fn(async () => benignPost),
    extractHeadings: vi.fn(() => []),
    getBlogPostLocales: vi.fn(() => ["en"]),
    getRelatedPosts: vi.fn(() => []),
    isSafeBlogSlug: vi.fn(() => true),
    normalizeBlogLocale: vi.fn(() => "en"),
  };
});

/*
 * www customer copy names CEFR only. The PM final-check gate of 2026-11-16
 * said: "GSE leaves all customer copy (CEFR only)". These cases read the real
 * shipped surfaces: locale message data, blog markdown files, SVG mockups, and
 * rendered page copy. No TypeScript or TSX source text is read.
 */

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

/** A blocked term and the pattern that finds it as a word. */
const TERMS = [
  { label: "GSE", pattern: /\bGSE\b/ },
  { label: "Global Scale of English", pattern: /Global Scale of English/i },
  { label: "Pearson", pattern: /\bPearson\b/i },
  { label: "YLE", pattern: /\bYLE\b/ },
] as const;

/** A hit the PM must decide. It does not fail the test. */
const PENDING = [
  {
    file: "src/app/[locale]/(marketing)/blog/posts/en/the-advantage-engine-kst-srs.md",
    snippet: "Global Scale of English (GSE)",
    reason:
      "The PM decision of 2026-11-16 sends the CEFR sentence for this blog post. This track edits no blog post.",
  },
  {
    file: "src/app/[locale]/(marketing)/blog/posts/th/the-advantage-engine-kst-srs.md",
    snippet: "Global Scale of English (GSE)",
    reason:
      "The Thai text of the same blog post needs the PM sentence before an edit. This track edits no blog post.",
  },
] as const;

/** One blocked-term hit in one customer-copy line. */
interface Hit {
  file: string;
  line: number;
  term: string;
  text: string;
}

/** Collects every string leaf of a locale message object. */
function stringLeaves(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(stringLeaves);
  if (value !== null && typeof value !== "object") return [];
  return Object.values(value as Record<string, unknown>).flatMap(stringLeaves);
}

/**
 * Lists content files of a shipped kind under one directory.
 * @param dir Directory relative to the app root.
 * @param extensions The file extensions to keep.
 * @returns The file paths relative to the app root.
 */
function listContentFiles(
  dir: string,
  extensions: readonly string[],
): string[] {
  const absolute = join(APP_ROOT, dir);
  if (!statSync(absolute).isDirectory()) return [];
  const files: string[] = [];
  for (const entry of readdirSync(absolute, { withFileTypes: true })) {
    const child = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", ".turbo", "assets"].includes(entry.name)) {
        continue;
      }
      files.push(...listContentFiles(child, extensions));
      continue;
    }
    if (!extensions.includes(extname(entry.name))) continue;
    files.push(child);
  }
  return files;
}

/** Builds a hit from one line of one shipped content file. */
function hitFromLine(file: string, text: string, index: number): Hit[] {
  return TERMS.flatMap((term) =>
    term.pattern.test(text)
      ? [{ file, line: index + 1, term: term.label, text: text.trim() }]
      : [],
  );
}

/** Collects blocked-term hits over all shipped customer-copy surfaces. */
function collectHits(): Hit[] {
  const files = [
    ...listContentFiles("src/app/[locale]/(marketing)/blog/posts", [
      ".md",
      ".mdx",
    ]),
    ...listContentFiles("public", [".svg"]),
  ];
  const hits: Hit[] = [];
  for (const file of files) {
    const lines = readFileSync(join(APP_ROOT, file), "utf8").split("\n");
    lines.forEach((text, index) => hits.push(...hitFromLine(file, text, index)));
  }
  for (const messages of [en, th, zh]) {
    stringLeaves(messages).forEach((text, index) =>
      hits.push(...hitFromLine("locale messages", text, index)),
    );
  }
  return hits;
}

/** Tells whether a PENDING entry covers a hit. */
function isPending(hit: Hit): boolean {
  return PENDING.some(
    (entry) => entry.file === hit.file && hit.text.includes(entry.snippet),
  );
}

/** Formats a hit for the failure message. */
function formatHit(hit: Hit): string {
  return `${hit.file}:${hit.line}: ${hit.term} -> ${hit.text}`;
}

const hits = collectHits();

describe("www customer copy holds no GSE, Pearson, or YLE", () => {
  it("holds no blocked term outside the pending list", () => {
    const failures = hits.filter((hit) => !isPending(hit)).map(formatHit);
    expect(
      failures,
      `Blocked terms in customer copy:\n${failures.join("\n")}`,
    ).toEqual([]);
  });

  it("keeps each pending entry tied to a live hit", () => {
    const stale = PENDING.filter(
      (entry) =>
        !hits.some(
          (hit) => hit.file === entry.file && hit.text.includes(entry.snippet),
        ),
    ).map(
      (entry) =>
        `${entry.file} no longer holds "${entry.snippet}"; remove the pending entry`,
    );
    expect(stale, `Stale pending entries:\n${stale.join("\n")}`).toEqual([]);
  });

  it("gives every pending entry a reason", () => {
    for (const entry of PENDING) {
      expect(entry.reason.trim().length, `${entry.file} needs a reason`).toBeGreaterThan(20);
    }
  });

  it("prints the pending hits for the PM", () => {
    const pending = hits.filter(isPending).map(formatHit);
    expect(pending.length).toBeGreaterThanOrEqual(PENDING.length);
    if (pending.length > 0) console.info(`PENDING for the PM:\n${pending.join("\n")}`);
  });
});

/** The customer routes that render copy into the browser. */
const CUSTOMER_PAGES: ReadonlyArray<readonly [string, () => Promise<ReactElement>]> = [
  ["home", async () => (await HomePage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["about", async () => (await AboutPage()) as ReactElement],
  ["case studies", async () => (await CaseStudiesPage()) as ReactElement],
  ["contact", async () => (await ContactPage()) as ReactElement],
  ["features", async () => (await FeaturesPage()) as ReactElement],
  ["mastery", async () => (await MasteryPage()) as ReactElement],
  ["pricing", async () => (await PricingPage()) as ReactElement],
  ["products", async () => (await ProductsPage()) as ReactElement],
  ["services", async () => (await ServicesPage()) as ReactElement],
  ["math", async () => (await MathPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["primary", async () => (await PrimaryPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["reading product", async () => (await ReadingProductPage()) as ReactElement],
  ["science", async () => (await SciencePage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["codecamp", async () => (await CodeCampPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["stem", async () => (await StemPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["storytime", async () => (await StorytimePage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["tutor", async () => (await TutorPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["zhongwen", async () => (await ZhongwenPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["managed service", async () => (await ManagedServicePage()) as ReactElement],
  ["blended learning", async () => (await BlendedLearningPage()) as ReactElement],
  ["blog index", async () => (await BlogPage({ params: Promise.resolve({ locale: "en" }) })) as ReactElement],
  ["blog page 1", async () => (await BlogPaginatedPage({ params: Promise.resolve({ locale: "en", page: "1" }) })) as ReactElement],
  ["blog article", async () => (await BlogSlugPage({ params: Promise.resolve({ locale: "en", slug: "sample" }) })) as ReactElement],
  ["b2b solutions section", async () => {
    const actual = await vi.importActual<typeof import("@/components/products/b2b-solutions")>(
      "@/components/products/b2b-solutions",
    );
    return (await actual.default()) as ReactElement;
  }],
  ["b2c solutions section", async () => {
    const actual = await vi.importActual<typeof import("@/components/products/b2c-solutions")>(
      "@/components/products/b2c-solutions",
    );
    return (await actual.default()) as ReactElement;
  }],
  ["tutor advantage section", async () => {
    const actual = await vi.importActual<typeof import("@/components/products/tutor-advantage")>(
      "@/components/products/tutor-advantage",
    );
    return (await actual.default()) as ReactElement;
  }],
];

beforeAll(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
      takeRecords() {
        return [];
      }
    },
  );
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({
      matches: true,
      media: "",
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
});

afterEach(() => cleanup());

/** Joins rendered text nodes with spaces so an isolated element stays a word. */
function visibleText(container: HTMLElement): string {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  const parts: string[] = [];
  let node = walker.nextNode();
  while (node) {
    parts.push(node.textContent ?? "");
    node = walker.nextNode();
  }
  return parts.join(" ");
}

describe("www rendered customer pages hold no blocked term", () => {
  it("renders every customer route and sweeps its visible copy", async () => {
    const failures: string[] = [];
    for (const [route, load] of CUSTOMER_PAGES) {
      const rendered = render(await load());
      const text = visibleText(rendered.container);
      expect(text.trim().length, `${route} renders visible copy`).toBeGreaterThan(0);
      for (const term of TERMS) {
        if (term.pattern.test(text)) {
          failures.push(`${route}: ${term.label} -> ${text.slice(0, 160)}`);
        }
      }
      cleanup();
    }
    expect(failures, `Blocked terms on rendered pages:\n${failures.join("\n")}`).toEqual([]);
  });
});
