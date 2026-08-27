import { existsSync, readdirSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import enMessages from "@/locales/en";
import thMessages from "@/locales/th";
import zhMessages from "@/locales/zh";
import { getScopedI18n } from "@/locales/server";
import { getBlogPost } from "@/lib/blog";
import { buildMarketingMetadata } from "@/lib/seo";
import type { BlogPost } from "@/types/blog";

vi.mock("@/lib/blog", async () => {
  const actual =
    await vi.importActual<typeof import("@/lib/blog")>("@/lib/blog");

  return {
    ...actual,
    getBlogPost: vi.fn(actual.getBlogPost),
  };
});

vi.mock("@/lib/seo", async () => {
  const actual = await vi.importActual<typeof import("@/lib/seo")>("@/lib/seo");

  return {
    ...actual,
    buildMarketingMetadata: vi.fn(actual.buildMarketingMetadata),
  };
});

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const BLOG_POSTS_ROOT = resolve(
  APP_ROOT,
  "src/app/[locale]/(marketing)/blog/posts",
);
const SITE_ORIGIN = "https://reading-advantage.com";
const OPEN_GRAPH_IMAGE = "/images/teacher-at-board.png";
const SUPPORTED_LOCALES = ["en", "th", "zh"] as const;
const BLOG_LOCALES = ["en", "th", "xx"] as const;
type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
type LocaleMessages = typeof enMessages | typeof thMessages | typeof zhMessages;
type Translator = Awaited<ReturnType<typeof getScopedI18n>>;
type MetadataRecord = {
  title?: unknown;
  description?: unknown;
  alternates?: unknown;
  openGraph?: unknown;
  twitter?: unknown;
};
type MetadataGenerator = (props: {
  params: Promise<Record<string, string>>;
}) => Promise<MetadataRecord>;

const getBlogPostMock = vi.mocked(getBlogPost);
const getScopedI18nMock = vi.mocked(getScopedI18n);
const helperMock = vi.mocked(buildMarketingMetadata);

function readLocaleMessage(
  messages: LocaleMessages,
  scope: string,
  key: string,
): string {
  let value: unknown = messages;

  for (const segment of `${scope}.${key}`.split(".")) {
    if (
      value === null ||
      typeof value !== "object" ||
      !Object.prototype.hasOwnProperty.call(value, segment)
    ) {
      throw new Error(`Missing locale message: ${scope}.${key}`);
    }

    value = (value as Record<string, unknown>)[segment];
  }

  if (typeof value !== "string") {
    throw new Error(`Locale message is not text: ${scope}.${key}`);
  }

  return value;
}

function mockLocaleDictionary(messages: LocaleMessages): void {
  getScopedI18nMock.mockImplementation((scope) => {
    const translator = ((key: string, values?: Record<string, unknown>) => {
      const message = readLocaleMessage(messages, String(scope), key);
      return message.replace(/\{(\w+)\}/g, (_, name: string) =>
        String(values?.[name] ?? `{${name}}`),
      );
    }) as Translator;

    return Promise.resolve(translator);
  });
}

function hasMarkdown(locale: SupportedLocale, slug: string): boolean {
  return existsSync(join(BLOG_POSTS_ROOT, locale, `${slug}.md`));
}

function localesWithMarkdown(slug?: string): SupportedLocale[] {
  return SUPPORTED_LOCALES.filter((locale) => {
    if (slug) return hasMarkdown(locale, slug);

    return (
      existsSync(join(BLOG_POSTS_ROOT, locale)) &&
      readdirSync(join(BLOG_POSTS_ROOT, locale)).some((file) =>
        file.endsWith(".md"),
      )
    );
  });
}

function expectedLanguages(locales: readonly SupportedLocale[], path: string) {
  return Object.fromEntries(
    locales.map((locale) => [locale, `${SITE_ORIGIN}/${locale}${path}`]),
  );
}

function effectiveLocale(
  requestedLocale: string,
  availableLocales: SupportedLocale[],
): SupportedLocale {
  return availableLocales.includes(requestedLocale as SupportedLocale)
    ? (requestedLocale as SupportedLocale)
    : "en";
}

function openGraphLocale(locale: SupportedLocale): string {
  return {
    en: "en_US",
    th: "th_TH",
    zh: "zh_CN",
  }[locale];
}

function imageList(
  metadata: MetadataRecord,
  channel: "openGraph" | "twitter",
): unknown {
  const value = metadata[channel];

  if (value === null || typeof value !== "object") return undefined;

  return (value as { images?: unknown }).images;
}

function getMetadataGenerator(routeModule: unknown): MetadataGenerator {
  const candidate = (routeModule as { generateMetadata?: unknown })
    .generateMetadata;

  expect(candidate).toEqual(expect.any(Function));
  return candidate as MetadataGenerator;
}

function assertMetadata(
  metadata: MetadataRecord,
  expected: {
    title: string;
    description: string;
    canonical: string;
    languages: Record<string, string>;
    openGraphLocale: string;
    image: string;
  },
): void {
  expect(metadata).toMatchObject({
    title: expected.title,
    description: expected.description,
    openGraph: {
      description: expected.description,
      locale: expected.openGraphLocale,
      url: expected.canonical,
      images: [expected.image],
    },
  });
  expect(metadata.alternates).toEqual({
    canonical: expected.canonical,
    languages: expected.languages,
  });
  expect(imageList(metadata, "openGraph")).toEqual([expected.image]);
  expect(imageList(metadata, "twitter")).toEqual([expected.image]);
}

function assertHelperCall(
  path: string,
  title: string,
  description: string,
): void {
  const call = helperMock.mock.calls.find(
    ([input]) =>
      input.path === path &&
      input.title === title &&
      input.description === description,
  );

  expect(call?.[0]).toEqual(
    expect.objectContaining({ path, title, description }),
  );
}

async function loadBlogIndex(): Promise<MetadataGenerator> {
  const routeModule = await import("@/app/[locale]/(marketing)/blog/page");

  return getMetadataGenerator(routeModule);
}

async function loadBlogPagination(): Promise<MetadataGenerator> {
  const routeModule =
    await import("@/app/[locale]/(marketing)/blog/page/[page]/page");

  return getMetadataGenerator(routeModule);
}

async function loadBlogArticle(): Promise<MetadataGenerator> {
  const routeModule =
    await import("@/app/[locale]/(marketing)/blog/[slug]/page");

  return getMetadataGenerator(routeModule);
}

describe("Wave 5 dynamic blog SEO metadata Red", () => {
  it("uses dictionary copy and real blog locales for the index", async () => {
    const generateMetadata = await loadBlogIndex();
    const realBlogLocales = localesWithMarkdown();
    helperMock.mockClear();

    for (const requestedLocale of BLOG_LOCALES) {
      const messages = requestedLocale === "th" ? thMessages : enMessages;
      mockLocaleDictionary(messages);
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: requestedLocale }),
      });
      const title = messages.pages.blog.title;
      const description = metadata.description;
      const locale = effectiveLocale(requestedLocale, realBlogLocales);
      const path = "/blog";
      const canonical = `${SITE_ORIGIN}/${locale}${path}`;

      expect(typeof description).toBe("string");
      expect(description).not.toBe("");
      assertMetadata(metadata, {
        title,
        description: description as string,
        canonical,
        languages: expectedLanguages(SUPPORTED_LOCALES, path),
        openGraphLocale: openGraphLocale(locale),
        image: OPEN_GRAPH_IMAGE,
      });
      assertHelperCall(path, title, description as string);
    }

    expect(helperMock).toHaveBeenCalledTimes(BLOG_LOCALES.length);
  });

  it("uses dictionary copy and page-aware metadata for valid pagination", async () => {
    const generateMetadata = await loadBlogPagination();
    helperMock.mockClear();

    for (const requestedLocale of SUPPORTED_LOCALES) {
      const messages = {
        en: enMessages,
        th: thMessages,
        zh: zhMessages,
      }[requestedLocale];
      mockLocaleDictionary(messages);
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: requestedLocale, page: "2" }),
      });
      const title = messages.pages.blog.numberedTitle.replace("{page}", "2");
      const description = messages.pages.blog.numberedDescription.replace(
        "{page}",
        "2",
      );
      const path = "/blog/page/2";
      const canonical = `${SITE_ORIGIN}/${requestedLocale}${path}`;

      assertMetadata(metadata, {
        title,
        description,
        canonical,
        languages: expectedLanguages(SUPPORTED_LOCALES, path),
        openGraphLocale: openGraphLocale(requestedLocale),
        image: OPEN_GRAPH_IMAGE,
      });
      assertHelperCall(path, title, description);
    }

    expect(helperMock).toHaveBeenCalledTimes(SUPPORTED_LOCALES.length);
  });

  it.each([
    {
      slug: "ai-slops-vs-authentic-content",
      locales: ["en", "th"] as const,
    },
    {
      slug: "ai-education-evolution",
      locales: ["en", "zh"] as const,
    },
    {
      slug: "the-forgetting-curve",
      locales: ["en", "zh"] as const,
    },
  ])(
    "derives article metadata and exact alternates for $slug",
    async ({ slug, locales }) => {
      const generateMetadata = await loadBlogArticle();
      const availableLocales = localesWithMarkdown(slug);
      helperMock.mockClear();

      for (const requestedLocale of locales) {
        const post = await getBlogPost(slug, requestedLocale);
        expect(post).not.toBeNull();
        if (!post) return;

        const locale = effectiveLocale(requestedLocale, availableLocales);
        const path = `/blog/${slug}`;
        const canonical = `${SITE_ORIGIN}/${locale}${path}`;
        const title = `${post.title} | Reading Advantage Blog`;
        const description = post.excerpt;

        const metadata = await generateMetadata({
          params: Promise.resolve({ locale: requestedLocale, slug }),
        });

        assertMetadata(metadata, {
          title,
          description,
          canonical,
          languages: expectedLanguages(availableLocales, path),
          openGraphLocale: openGraphLocale(locale),
          image: post.coverImage ?? OPEN_GRAPH_IMAGE,
        });
        assertHelperCall(path, title, description);

        if (requestedLocale === "zh") {
          expect(metadata.alternates).not.toHaveProperty("languages.zh");
          expect(post.title).toBe((await getBlogPost(slug, "en"))?.title);
        }
      }

      expect(helperMock).toHaveBeenCalledTimes(locales.length);
    },
  );

  it("does not accept hardcoded article copy", async () => {
    const generateMetadata = await loadBlogArticle();
    const source = await getBlogPost("ai-education-evolution", "en");
    expect(source).not.toBeNull();
    if (!source) return;

    const mutatedPost: BlogPost = {
      ...source,
      title: `${source.title} [fixture mutation]`,
      excerpt: `${source.excerpt} [fixture mutation]`,
    };
    getBlogPostMock.mockResolvedValueOnce(mutatedPost);
    helperMock.mockClear();

    const metadata = await generateMetadata({
      params: Promise.resolve({
        locale: "en",
        slug: "ai-education-evolution",
      }),
    });
    const title = `${mutatedPost.title} | Reading Advantage Blog`;
    const path = "/blog/ai-education-evolution";

    assertMetadata(metadata, {
      title,
      description: mutatedPost.excerpt,
      canonical: `${SITE_ORIGIN}/en${path}`,
      languages: expectedLanguages(["en"], path),
      openGraphLocale: "en_US",
      image: mutatedPost.coverImage ?? OPEN_GRAPH_IMAGE,
    });
    assertHelperCall(path, title, mutatedPost.excerpt);
  });

  it("uses the verified PNG fallback for missing or unsafe covers", async () => {
    const generateMetadata = await loadBlogArticle();
    const source = await getBlogPost("ai-education-evolution", "en");
    expect(source).not.toBeNull();
    if (!source) return;

    const variants: Array<BlogPost> = [
      { ...source, coverImage: undefined },
      { ...source, coverImage: "/blog/unsafe.svg" },
      { ...source, coverImage: "https://evil.example/cover.jpg" },
    ];
    helperMock.mockClear();

    for (const variant of variants) {
      getBlogPostMock.mockResolvedValueOnce(variant);
      const metadata = await generateMetadata({
        params: Promise.resolve({
          locale: "en",
          slug: "ai-education-evolution",
        }),
      });

      expect(imageList(metadata, "openGraph")).toEqual([OPEN_GRAPH_IMAGE]);
      expect(imageList(metadata, "twitter")).toEqual([OPEN_GRAPH_IMAGE]);
    }

    expect(helperMock).toHaveBeenCalledTimes(variants.length);
  });

  it("returns empty metadata for missing and unsafe slugs", async () => {
    const generateMetadata = await loadBlogArticle();
    helperMock.mockClear();

    for (const slug of ["", "../private"] as const) {
      getBlogPostMock.mockResolvedValueOnce(null);
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: "en", slug }),
      });

      expect(metadata).toEqual({});
    }

    expect(helperMock).not.toHaveBeenCalled();
  });

  it("returns empty metadata for invalid and out-of-range pages", async () => {
    const generateMetadata = await loadBlogPagination();
    helperMock.mockClear();

    for (const page of ["not-a-page", "999"] as const) {
      const metadata = await generateMetadata({
        params: Promise.resolve({ locale: "en", page }),
      });

      expect(metadata).toEqual({});
    }

    expect(helperMock).not.toHaveBeenCalled();
  });

  it("keeps the shared fallback image as a real PNG", () => {
    const signature = readFileSync(
      resolve(APP_ROOT, "public", OPEN_GRAPH_IMAGE.slice(1)),
    ).subarray(0, 8);

    expect([...signature]).toEqual([
      0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    ]);
  });
});
