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

type SupportedLocale = "en" | "th" | "zh";

export function postsDirectory(locale: SupportedLocale = "en"): string {
  return path.join(postsBaseDirectory, locale);
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

async function parseBlogFile(fullPath: string, slug: string): Promise<BlogPost> {
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

export async function getBlogPost(
  slug: string,
  locale: SupportedLocale = "en",
): Promise<BlogPost | null> {
  try {
    const localePath = path.join(postsDirectory(locale), `${slug}.md`);
    try {
      fs.readFileSync(localePath);
      return await parseBlogFile(localePath, slug);
    } catch {
      if (locale === "en") return null;
      const enPath = path.join(postsDirectory("en"), `${slug}.md`);
      return await parseBlogFile(enPath, slug);
    }
  } catch (error) {
    console.error(`Error getting blog post ${slug}:`, error);
    return null;
  }
}

export async function getAllBlogPosts(
  locale: SupportedLocale = "en",
): Promise<BlogListItem[]> {
  // Build a deduplicated slug set: canonical en/ list + any locale-only extras
  const enFiles = fs.readdirSync(postsDirectory("en")).filter((f) => f.endsWith(".md"));
  const enSlugs = new Set(enFiles.map((f) => f.replace(/\.md$/, "")));

  let localeOnlySlugs: Set<string> = new Set();
  if (locale !== "en") {
    try {
      const localeFiles = fs.readdirSync(postsDirectory(locale)).filter((f) => f.endsWith(".md"));
      localeOnlySlugs = new Set(
        localeFiles.map((f) => f.replace(/\.md$/, "")).filter((s) => !enSlugs.has(s)),
      );
    } catch {
      // locale directory doesn't exist — only en/ posts will be shown
    }
  }

  const allSlugs = [...enSlugs, ...localeOnlySlugs];

  const allPostsData = await Promise.all(
    allSlugs.map(async (slug) => {
      const post = await getBlogPost(slug, locale);
      if (!post) throw new Error(`Failed to load post ${slug}`);
      return post;
    }),
  );

  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
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
