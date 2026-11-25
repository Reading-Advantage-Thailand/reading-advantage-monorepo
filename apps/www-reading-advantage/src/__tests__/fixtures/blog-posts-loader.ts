/**
 * Loads on-disk blog post files for the merged validation test and its probes.
 * The file sweep is extension-agnostic, so a stray .mdx file is visible to the
 * rules instead of escaping them. Only .md files are parsed as posts. Regular
 * files and symlinks to regular files both count, as in the phase-base test
 * and in blog.ts. Broken links are reported by brokenPostRefs.
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
 * Lists the locale directories under the posts root.
 * @param base The posts root.
 * @returns One absolute path per locale directory.
 */
function localeDirectories(base: string): string[] {
  return fs
    .readdirSync(base, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(base, entry.name));
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
 * Lists every post-file entry in each locale directory, including dotfiles,
 * symlinks to regular files and non-Markdown files.
 * @param base The posts root, defaulting to the app's posts directory.
 * @returns One "<locale>/<file>" reference per entry.
 */
export function listPostFiles(base: string = POSTS_BASE): string[] {
  // blog.ts markdownSlugs filters only by the .md suffix; dot-prefixed names
  // are real posts there, so this sweep must not skip them either.
  const refs: string[] = [];
  for (const localeDir of localeDirectories(base)) {
    const locale = path.basename(localeDir);
    for (const entry of fs.readdirSync(localeDir, { withFileTypes: true })) {
      if (entry.isDirectory()) continue;
      const fullPath = path.join(localeDir, entry.name);
      if (entry.isFile()) {
        refs.push(`${locale}/${entry.name}`);
      } else if (entry.isSymbolicLink()) {
        try {
          if (fs.statSync(fullPath).isFile()) refs.push(`${locale}/${entry.name}`);
        } catch {
          // A broken link is reported by brokenPostRefs, not skipped silently.
        }
      }
    }
  }
  return refs;
}

/**
 * Finds .md entries that cannot be read as a regular file after following
 * links: broken links, symlinks to directories, sockets, fifos and directories
 * named .md. The phase-base suite and blog.ts call readFileSync on every .md
 * name, so each of these entries is a loud fault, not a file to skip.
 * @param base The posts root, defaulting to the app's posts directory.
 * @returns One "<locale>/<file>" reference per unreadable .md entry.
 */
export function brokenPostRefs(base: string = POSTS_BASE): string[] {
  const refs: string[] = [];
  for (const localeDir of localeDirectories(base)) {
    const locale = path.basename(localeDir);
    for (const entry of fs.readdirSync(localeDir, { withFileTypes: true })) {
      if (!/\.md$/i.test(entry.name)) continue;
      const fullPath = path.join(localeDir, entry.name);
      try {
        if (!fs.statSync(fullPath).isFile()) refs.push(`${locale}/${entry.name}`);
      } catch {
        refs.push(`${locale}/${entry.name}`);
      }
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
