/**
 * Loads on-disk blog post files for the merged validation test and its probes.
 * The file sweep is extension-agnostic, so a stray .mdx file is visible to the
 * rules instead of escaping them. Only .md files are parsed as posts.
 */
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

/** The root of the per-locale post directories. */
export const POSTS_BASE = path.join(
  process.cwd(),
  "src/app/[locale]/(marketing)/blog/posts",
);

/** One parsed Markdown post. */
export interface PostEntry {
  readonly locale: string;
  readonly slug: string;
  readonly filePath: string;
  readonly raw: string;
  readonly data: Record<string, unknown>;
  readonly content: string;
}

/**
 * Finds post files whose name does not use the exact .md suffix.
 * A case-insensitive .md match that is not exactly .md is mislabelled, as are
 * other Markdown-like extensions and files with no extension. Data companions
 * such as -segments.json do not match and stay ignored.
 * @param base The posts root, defaulting to the app's posts directory.
 * @returns One "<locale>/<file>" reference per mislabelled post file.
 */
export function mislabelledPostRefs(base?: string): string[] {
  return listPostFiles(base).filter((ref) => {
    if (/\.md$/i.test(ref)) return !ref.endsWith(".md");
    if (/\.(?:mdx|markdown|mdown|mkd)$/i.test(ref)) return true;
    return !ref.includes(".");
  });
}

/**
 * Lists every regular file in each locale directory, including dotfiles.
 * @param base The posts root, defaulting to the app's posts directory.
 * @returns One "<locale>/<file>" reference per file, including non-Markdown files.
 */
export function listPostFiles(base: string = POSTS_BASE): string[] {
  // blog.ts markdownSlugs filters only by the .md suffix; dot-prefixed names
  // are real posts there, so this sweep must not skip them either.
  const localeDirs = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name);

  const refs: string[] = [];
  for (const locale of localeDirs) {
    const entries = fs.readdirSync(path.join(base, locale), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile()) continue;
      refs.push(`${locale}/${entry.name}`);
    }
  }
  return refs;
}

/**
 * Parses the Markdown posts. Non-Markdown files are skipped, never parsed.
 * @param base The posts root, defaulting to the app's posts directory.
 * @returns One parsed entry per .md file across all locales.
 */
export function loadAllPosts(base: string = POSTS_BASE): PostEntry[] {
  const entries: PostEntry[] = [];
  for (const ref of listPostFiles(base)) {
    const separator = ref.indexOf("/");
    const locale = ref.slice(0, separator);
    const file = ref.slice(separator + 1);
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(base, locale, file);
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
  return entries;
}
