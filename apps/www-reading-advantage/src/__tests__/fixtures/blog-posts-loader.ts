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
 * Lists every non-hidden regular file in each locale directory.
 * @returns One "<locale>/<file>" reference per file, including non-Markdown files.
 */
export function listPostFiles(): string[] {
  const localeDirs = fs
    .readdirSync(POSTS_BASE, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name);

  const refs: string[] = [];
  for (const locale of localeDirs) {
    const entries = fs.readdirSync(path.join(POSTS_BASE, locale), {
      withFileTypes: true,
    });
    for (const entry of entries) {
      if (!entry.isFile() || entry.name.startsWith(".")) continue;
      refs.push(`${locale}/${entry.name}`);
    }
  }
  return refs;
}

/**
 * Parses the Markdown posts. Non-Markdown files are skipped, never parsed.
 * @returns One parsed entry per .md file across all locales.
 */
export function loadAllPosts(): PostEntry[] {
  const entries: PostEntry[] = [];
  for (const ref of listPostFiles()) {
    const separator = ref.indexOf("/");
    const locale = ref.slice(0, separator);
    const file = ref.slice(separator + 1);
    if (!file.endsWith(".md")) continue;
    const filePath = path.join(POSTS_BASE, locale, file);
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
