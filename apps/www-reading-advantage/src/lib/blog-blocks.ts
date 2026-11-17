import fs from "fs";
import path from "path";
import * as blogMessages from "@/locales/pages/blog";

/**
 * Rich blog blocks: fenced code blocks with a fixed language name hold `key: value` lines.
 * The renderer builds the HTML from validated fields only. The syntax is in
 * docs/blog-post-format.md (track www_blog_rich_format_20261115).
 */

/** A locale with callout labels. */
type BlockLocale = "en" | "th" | "zh";

/** Options of one block render. */
export interface BlogBlockOptions {
  /** The locale of the post, for the callout labels. */
  locale?: BlockLocale;
  /** The folder that holds the public files. Tests set it. */
  publicRoot?: string;
}

const MB = 1024 * 1024;
const IMAGE_PATH = /^\/blog\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.(?:jpe?g|png|webp|avif)$/;
const VIDEO_PATH = /^\/blog\/[a-z0-9_-]+(?:\/[a-z0-9_-]+)*\.(mp4|webm)$/;
const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const CALLOUT_TYPES = ["note", "tip", "warning"] as const;

type Fields = Map<string, string[]>;

interface BlockSpec {
  keys: readonly string[];
  render: (fields: Fields, options: BlogBlockOptions) => string;
}

/** A fence language that names a rich block. */
export type BlogBlockName = "figure" | "youtube" | "video" | "gallery" | "pullquote" | "callout";

const BLOCKS: Record<BlogBlockName, BlockSpec> = {
  figure: { keys: ["src", "alt", "caption"], render: renderFigure },
  youtube: { keys: ["id", "title", "caption"], render: renderYoutube },
  video: { keys: ["src", "poster", "title", "caption"], render: renderVideo },
  gallery: { keys: ["image", "caption"], render: renderGallery },
  pullquote: { keys: ["text", "cite"], render: renderPullquote },
  callout: { keys: ["type", "title", "text"], render: renderCallout },
};

/**
 * Checks whether a fence language names a rich block.
 * @param lang The language of a fenced code block.
 * @returns True when the language is a rich block name.
 */
export function isBlogBlock(lang: string | null | undefined): lang is BlogBlockName {
  return typeof lang === "string" && Object.keys(BLOCKS).includes(lang);
}

/**
 * Renders one rich block to HTML.
 * @param name The block name, the language of the fence.
 * @param body The `key: value` lines inside the fence.
 * @param options The post locale and the public root.
 * @returns The HTML of the block.
 * @throws When a line, a key, a path, a file, or a value is not valid.
 */
export function renderBlogBlock(
  name: BlogBlockName,
  body: string,
  options: BlogBlockOptions = {},
): string {
  const block = BLOCKS[name];
  const fields: Fields = new Map();
  body.split("\n").forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const match = /^([a-z]+):\s*(.*)$/.exec(line);
    if (!match) fail(name, `line ${index + 1} is not "key: value"`);
    const [, key, value] = match;
    if (!block.keys.includes(key)) fail(name, `the key "${key}" is not known`);
    if (fields.has(key) && key !== "image") fail(name, `the key "${key}" occurs two times`);
    fields.set(key, [...(fields.get(key) ?? []), value.trim()]);
  });
  return block.render(fields, options);
}

/**
 * Makes a remark step that replaces rich block fences with their HTML.
 * @param options The post locale.
 * @returns The remark attacher.
 */
export function remarkBlogBlocks(options: BlogBlockOptions = {}) {
  return () => (tree: MdNode) => replaceBlocks(tree, options);
}

interface MdNode {
  type: string;
  lang?: string | null;
  value?: string;
  children?: MdNode[];
}

function replaceBlocks(node: MdNode, options: BlogBlockOptions): void {
  node.children?.forEach((child, index, children) => {
    if (child.type === "code" && isBlogBlock(child.lang)) {
      children[index] = { type: "html", value: renderBlogBlock(child.lang, child.value ?? "", options) };
    } else {
      replaceBlocks(child, options);
    }
  });
}

function fail(name: string, reason: string): never {
  throw new Error(`Blog block "${name}": ${reason}.`);
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function optional(fields: Fields, key: string): string | undefined {
  return fields.get(key)?.[0] || undefined;
}

function required(name: string, fields: Fields, key: string): string {
  return optional(fields, key) ?? fail(name, `the key "${key}" is missing or empty`);
}

function caption(text: string | undefined): string {
  return text ? `<figcaption>${escapeHtml(text)}</figcaption>` : "";
}

function localFile(
  name: string,
  key: string,
  value: string,
  pattern: RegExp,
  maxMb: number,
  options: BlogBlockOptions,
): string {
  if (!pattern.test(value)) fail(name, `the ${key} "${value}" is not a valid /blog/ file path`);
  const file = path.join(options.publicRoot ?? path.join(process.cwd(), "public"), value);
  if (!fs.existsSync(file)) fail(name, `the ${key} file "${value}" does not exist in public/`);
  if (fs.statSync(file).size > maxMb * MB) fail(name, `the ${key} file "${value}" is larger than ${maxMb} MB`);
  return value;
}

function image(name: string, src: string, alt: string, options: BlogBlockOptions): string {
  const safeSrc = localFile(name, "src", src, IMAGE_PATH, 1, options);
  return `<img src="${safeSrc}" alt="${escapeHtml(alt)}" loading="lazy" decoding="async">`;
}

function renderFigure(fields: Fields, options: BlogBlockOptions): string {
  const img = image("figure", required("figure", fields, "src"), required("figure", fields, "alt"), options);
  return `<figure class="blog-figure">${img}${caption(optional(fields, "caption"))}</figure>`;
}

function renderYoutube(fields: Fields): string {
  const id = required("youtube", fields, "id");
  if (!YOUTUBE_ID.test(id)) fail("youtube", `the id "${id}" is not an 11-character YouTube video id`);
  const title = escapeHtml(required("youtube", fields, "title"));
  return (
    `<figure class="blog-embed"><div class="blog-embed-frame">` +
    `<iframe src="https://www.youtube-nocookie.com/embed/${id}" title="${title}" loading="lazy" ` +
    `allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" ` +
    `referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>` +
    `${caption(optional(fields, "caption"))}</figure>`
  );
}

function renderVideo(fields: Fields, options: BlogBlockOptions): string {
  const src = localFile("video", "src", required("video", fields, "src"), VIDEO_PATH, 10, options);
  const poster = localFile("video", "poster", required("video", fields, "poster"), IMAGE_PATH, 1, options);
  const title = escapeHtml(required("video", fields, "title"));
  const type = src.endsWith(".webm") ? "video/webm" : "video/mp4";
  return (
    `<figure class="blog-video">` +
    `<video controls preload="none" playsinline poster="${poster}" aria-label="${title}">` +
    `<source src="${src}" type="${type}"></video>${caption(optional(fields, "caption"))}</figure>`
  );
}

function renderGallery(fields: Fields, options: BlogBlockOptions): string {
  const lines = fields.get("image") ?? [];
  if (lines.length < 2 || lines.length > 6) fail("gallery", `a gallery needs 2 to 6 images, not ${lines.length}`);
  const images = lines.map((line) => {
    const [src = "", alt = ""] = line.split("|").map((part) => part.trim());
    if (!alt) fail("gallery", `the image "${src}" has no alt text after "|"`);
    return image("gallery", src, alt, options);
  });
  return (
    `<figure class="blog-gallery" data-count="${images.length}">` +
    `<div class="blog-gallery-grid">${images.join("")}</div>` +
    `${caption(optional(fields, "caption"))}</figure>`
  );
}

function renderPullquote(fields: Fields): string {
  const text = escapeHtml(required("pullquote", fields, "text"));
  return (
    `<figure class="blog-pullquote"><blockquote><p>${text}</p></blockquote>` +
    `${caption(optional(fields, "cite"))}</figure>`
  );
}

function renderCallout(fields: Fields, options: BlogBlockOptions): string {
  const type = required("callout", fields, "type");
  if (!CALLOUT_TYPES.includes(type as (typeof CALLOUT_TYPES)[number])) {
    fail("callout", `the type "${type}" is not one of ${CALLOUT_TYPES.join(", ")}`);
  }
  const labels = blogMessages[options.locale ?? "en"];
  const label = { note: labels.calloutNote, tip: labels.calloutTip, warning: labels.calloutWarning }[
    type as (typeof CALLOUT_TYPES)[number]
  ];
  const title = optional(fields, "title");
  return (
    `<aside class="blog-callout" data-type="${type}"><p class="blog-callout-label">${label}</p>` +
    `${title ? `<p><strong>${escapeHtml(title)}</strong></p>` : ""}` +
    `<p>${escapeHtml(required("callout", fields, "text"))}</p></aside>`
  );
}
