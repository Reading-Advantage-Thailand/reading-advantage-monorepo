import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import GithubSlugger from "github-slugger";
import { BlogPost, BlogListItem } from "@/types/blog";

const postsBaseDirectory = path.join(
  process.cwd(),
  "src/app/[locale]/(marketing)/blog/posts",
);

/** A locale with a blog content directory. */
export type SupportedLocale = "en" | "th" | "zh";

const SUPPORTED_LOCALES = [
  "en",
  "th",
  "zh",
] as const satisfies readonly SupportedLocale[];

/**
 * Resolves an unknown blog locale to the English fallback.
 * @param locale The requested blog locale.
 * @returns The supported locale used for blog content.
 */
export function normalizeBlogLocale(locale: string): SupportedLocale {
  return SUPPORTED_LOCALES.includes(locale as SupportedLocale)
    ? (locale as SupportedLocale)
    : "en";
}

/**
 * Checks whether a slug can safely address a Markdown file.
 * @param slug The requested blog slug.
 * @returns True when the slug uses the supported URL-safe format.
 */
export function isSafeBlogSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Lists locales with an on-disk Markdown post or blog content.
 * @param slug An optional slug to inspect across locale directories.
 * @returns The locales that contain the requested content.
 */
export function getBlogPostLocales(slug?: string): SupportedLocale[] {
  if (slug !== undefined && !isSafeBlogSlug(slug)) return [];

  return SUPPORTED_LOCALES.filter((locale) => {
    const directory = postsDirectory(locale);
    if (slug !== undefined) {
      return fs.existsSync(path.join(directory, `${slug}.md`));
    }

    try {
      return fs.readdirSync(directory).some((file) => file.endsWith(".md"));
    } catch {
      return false;
    }
  });
}

/**
 * Returns the Markdown directory for a supported blog locale.
 * @param locale The locale directory to resolve.
 * @returns The absolute blog content directory.
 */
export function postsDirectory(locale: SupportedLocale = "en"): string {
  return path.join(postsBaseDirectory, locale);
}

function markdownSlugs(locale: SupportedLocale): Set<string> {
  try {
    return new Set(
      fs
        .readdirSync(postsDirectory(locale))
        .filter((file) => file.endsWith(".md"))
        .map((file) => file.replace(/\.md$/, "")),
    );
  } catch {
    return new Set();
  }
}

function allBlogSlugs(locale: SupportedLocale): string[] {
  const resolvedLocale = normalizeBlogLocale(locale);
  const allSlugs = markdownSlugs("en");

  if (resolvedLocale !== "en") {
    for (const slug of markdownSlugs(resolvedLocale)) {
      allSlugs.add(slug);
    }
  }

  return [...allSlugs];
}

interface BlogFrontmatter {
  title: string;
  date: string;
  excerpt: string;
  author: string;
  tags: string[];
  readingTime?: number;
  coverImage?: string;
  product?: string;
}

function validateFrontmatter(data: unknown): BlogFrontmatter {
  if (!data || typeof data !== "object") {
    throw new Error("Invalid frontmatter data");
  }

  const d = data as Record<string, unknown>;

  if (!d.title || typeof d.title !== "string") {
    throw new Error("Invalid or missing title in frontmatter");
  }
  if (!d.date || typeof d.date !== "string") {
    throw new Error("Invalid or missing date in frontmatter");
  }
  if (!d.excerpt || typeof d.excerpt !== "string") {
    throw new Error("Invalid or missing excerpt in frontmatter");
  }
  if (!d.author || typeof d.author !== "string") {
    throw new Error("Invalid or missing author in frontmatter");
  }

  const tags = Array.isArray(d.tags) ? d.tags : [];

  return {
    title: d.title,
    date: d.date,
    excerpt: d.excerpt,
    author: d.author,
    tags: tags.map(String),
    readingTime: typeof d.readingTime === "number" ? d.readingTime : undefined,
    coverImage: typeof d.coverImage === "string" ? d.coverImage : undefined,
    product: typeof d.product === "string" ? d.product : undefined,
  };
}

async function parseBlogFile(
  fullPath: string,
  slug: string,
): Promise<BlogPost> {
  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  const frontmatter = validateFrontmatter(data);
  const processedContent = await unified()
    .use(remarkParse)
    .use(remarkGfm)
    .use(remarkHtml, { sanitize: false })
    .use(rehypeSlug)
    .use(rehypeAutolinkHeadings)
    .process(content);

  const htmlContent = processedContent.toString();
  const readingTime = frontmatter.readingTime ?? calculateReadingTime(content);

  return {
    slug,
    content: htmlContent,
    rawContent: content,
    title: frontmatter.title,
    date: frontmatter.date,
    excerpt: frontmatter.excerpt,
    author: frontmatter.author,
    tags: frontmatter.tags,
    readingTime,
    coverImage: frontmatter.coverImage,
    product: frontmatter.product,
  };
}

const parsedPostCache = new Map<string, Promise<BlogPost>>();

function parseCachedBlogFile(
  fullPath: string,
  slug: string,
): Promise<BlogPost> {
  const cached = parsedPostCache.get(fullPath);
  if (cached) return cached;

  const parsed = parseBlogFile(fullPath, slug).catch((error: unknown) => {
    parsedPostCache.delete(fullPath);
    throw error;
  });
  parsedPostCache.set(fullPath, parsed);
  return parsed;
}

/**
 * Loads a localized blog post with an English fallback.
 * @param slug The URL-safe post slug.
 * @param locale The requested locale.
 * @returns The parsed post or null when no post exists.
 */
export async function getBlogPost(
  slug: string,
  locale: SupportedLocale = "en",
): Promise<BlogPost | null> {
  if (!isSafeBlogSlug(slug)) return null;

  const resolvedLocale = normalizeBlogLocale(locale);

  try {
    const localePath = path.join(postsDirectory(resolvedLocale), `${slug}.md`);
    try {
      fs.readFileSync(localePath);
      return await parseCachedBlogFile(localePath, slug);
    } catch {
      if (resolvedLocale === "en") return null;
      const enPath = path.join(postsDirectory("en"), `${slug}.md`);
      return await parseCachedBlogFile(enPath, slug);
    }
  } catch (error) {
    console.error(`Error getting blog post ${slug}:`, error);
    return null;
  }
}

/**
 * Loads all blog posts for a locale with English slugs as the canonical set.
 * @param locale The requested locale.
 * @returns The sorted blog list items.
 */
export async function getAllBlogPosts(
  locale: SupportedLocale = "en",
): Promise<BlogListItem[]> {
  const resolvedLocale = normalizeBlogLocale(locale);
  const allSlugs = allBlogSlugs(resolvedLocale);

  const allPostsData = await Promise.all(
    allSlugs.map(async (slug) => {
      const post = await getBlogPost(slug, resolvedLocale);
      if (!post) throw new Error(`Failed to load post ${slug}`);
      return post;
    }),
  );

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

/**
 * Counts the available blog pages without parsing Markdown content.
 * @param locale The requested locale.
 * @param perPage The number of posts shown on each page.
 * @returns The number of available pages.
 */
export function getBlogPostTotalPages(
  locale: SupportedLocale = "en",
  perPage: number = 9,
): number {
  if (!Number.isInteger(perPage) || perPage < 1) return 0;
  return Math.ceil(allBlogSlugs(locale).length / perPage);
}

export async function getAllBlogTags(
  locale: SupportedLocale = "en",
): Promise<string[]> {
  const posts = await getAllBlogPosts(locale);
  const tags = new Set<string>();
  posts.forEach((post) => {
    post.tags.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags);
}

// Alias for getAllBlogPosts to maintain compatibility
export const getAllPosts = getAllBlogPosts;

export function calculateReadingTime(content: string): number {
  const wordsPerMinute = 200;
  const words = content.trim().split(/\s+/).length;
  return Math.ceil(words / wordsPerMinute);
}

export interface PaginatedPosts {
  posts: BlogListItem[];
  totalPages: number;
  currentPage: number;
}

export async function getPaginatedPosts(
  page: number,
  perPage: number = 9,
  allPosts?: BlogListItem[],
): Promise<PaginatedPosts> {
  const posts = allPosts ?? (await getAllBlogPosts());

  if (page < 1) {
    return {
      posts: [],
      totalPages: Math.ceil(posts.length / perPage),
      currentPage: page,
    };
  }

  const sortedPosts = [...posts].sort((a, b) => (a.date < b.date ? 1 : -1));
  const totalPages = Math.ceil(sortedPosts.length / perPage);
  const startIndex = (page - 1) * perPage;
  const endIndex = startIndex + perPage;
  const paginatedPosts = sortedPosts.slice(startIndex, endIndex);

  return {
    posts: paginatedPosts,
    totalPages,
    currentPage: page,
  };
}

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export function extractHeadings(content: string): Heading[] {
  const headings: Heading[] = [];
  const lines = content.split("\n");
  const slugger = new GithubSlugger();

  for (const line of lines) {
    const h2Match = line.match(/^## (.+)$/);
    const h3Match = line.match(/^### (.+)$/);

    if (h2Match) {
      const text = h2Match[1].trim();
      headings.push({ id: slugger.slug(text), text, level: 2 });
    } else if (h3Match) {
      const text = h3Match[1].trim();
      headings.push({ id: slugger.slug(text), text, level: 3 });
    }
  }

  return headings;
}

export function getRelatedPosts(
  currentSlug: string,
  currentTags: string[],
  allPosts: BlogListItem[],
  limit: number = 3,
): BlogListItem[] {
  const filteredPosts = allPosts.filter(
    (post) =>
      post.slug !== currentSlug &&
      post.tags.some((tag) => currentTags.includes(tag)),
  );

  if (filteredPosts.length > 0) {
    return filteredPosts.slice(0, limit);
  }

  const sortedPosts = [...allPosts]
    .filter((post) => post.slug !== currentSlug)
    .sort((a, b) => (a.date < b.date ? 1 : -1));

  return sortedPosts.slice(0, limit);
}
