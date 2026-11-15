/**
 * Render tests for the rich blog blocks (track www_blog_rich_format_20261115).
 * Uses real files in public/blog/ and a temporary public root for the size rules.
 */
import { afterAll, describe, expect, it } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";
import matter from "gray-matter";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkHtml from "remark-html";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import { renderBlogBlock } from "@/lib/blog-blocks";
import { postsDirectory, renderBlogMarkdown } from "@/lib/blog";

const IMAGE = "/blog/the-forgetting-curve.webp";
const IMAGE_2 = "/blog/future-education-ai.webp";
const CLIP = "/blog/format-sample-clip.mp4";
const POSTER = "/blog/format-sample-clip-poster.jpg";

function fence(lang: string, body: string): string {
  return `Intro text.\n\n\`\`\`${lang}\n${body}\n\`\`\`\n\nOutro text.\n`;
}

describe("figure block", () => {
  it("renders an image with alt text and a caption", async () => {
    const html = await renderBlogMarkdown(
      fence("figure", `src: ${IMAGE}\nalt: A curve that falls\ncaption: The forgetting curve.`),
    );
    expect(html).toContain('<figure class="blog-figure">');
    expect(html).toContain(`<img src="${IMAGE}" alt="A curve that falls" loading="lazy" decoding="async">`);
    expect(html).toContain("<figcaption>The forgetting curve.</figcaption>");
    expect(html).toContain("<p>Intro text.</p>");
    expect(html).not.toContain("<pre>");
  });

  it("renders no figcaption without a caption", async () => {
    const html = await renderBlogMarkdown(fence("figure", `src: ${IMAGE}\nalt: A curve`));
    expect(html).not.toContain("<figcaption>");
  });

  it("escapes the alt text and the caption", () => {
    const html = renderBlogBlock(
      "figure",
      `src: ${IMAGE}\nalt: "><script>alert(1)</script>\ncaption: <b>bold</b> & more`,
    );
    expect(html).not.toContain("<script>");
    expect(html).not.toContain("<b>");
    expect(html).toContain('alt="&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt;"');
    expect(html).toContain("<figcaption>&lt;b&gt;bold&lt;/b&gt; &amp; more</figcaption>");
  });

  it("rejects a remote image, a path with .., a missing file, and a missing alt", () => {
    expect(() => renderBlogBlock("figure", "src: https://x.test/a.jpg\nalt: A")).toThrow(/src/);
    expect(() => renderBlogBlock("figure", "src: /blog/../secret.jpg\nalt: A")).toThrow(/src/);
    expect(() => renderBlogBlock("figure", "src: /blog/no-such-file.jpg\nalt: A")).toThrow(
      /does not exist/,
    );
    expect(() => renderBlogBlock("figure", `src: ${IMAGE}`)).toThrow(/alt/);
  });

  it("rejects an unknown key and a line that is not key: value", () => {
    expect(() => renderBlogBlock("figure", `src: ${IMAGE}\nalt: A\ncapton: B`)).toThrow(/capton/);
    expect(() => renderBlogBlock("figure", `src: ${IMAGE}\nalt: A\njust text`)).toThrow(/line 3/);
  });
});

describe("youtube block", () => {
  it("renders a privacy-enhanced, lazy, titled 16:9 embed", async () => {
    const html = await renderBlogMarkdown(
      fence("youtube", "id: dQw4w9WgXcQ\ntitle: How the graph works\ncaption: A short tour."),
    );
    expect(html).toContain('<div class="blog-embed-frame">');
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ"');
    expect(html).toContain('title="How the graph works"');
    expect(html).toContain('loading="lazy"');
    expect(html).toContain("allowfullscreen");
    expect(html).toContain("<figcaption>A short tour.</figcaption>");
  });

  it("rejects a bad id, a URL, and a missing title", () => {
    expect(() => renderBlogBlock("youtube", "id: short\ntitle: T")).toThrow(/id/);
    expect(() => renderBlogBlock("youtube", 'id: dQw4w9WgXc"\ntitle: T')).toThrow(/id/);
    expect(() =>
      renderBlogBlock("youtube", "id: https://youtu.be/dQw4w9WgXcQ\ntitle: T"),
    ).toThrow(/id/);
    expect(() => renderBlogBlock("youtube", "id: dQw4w9WgXcQ")).toThrow(/title/);
  });
});

describe("video block", () => {
  it("renders a local video with a poster, controls, preload none, and playsinline", async () => {
    const html = await renderBlogMarkdown(
      fence("video", `src: ${CLIP}\nposter: ${POSTER}\ntitle: A student smiles\ncaption: Clip.`),
    );
    expect(html).toContain(
      `<video controls preload="none" playsinline poster="${POSTER}" aria-label="A student smiles">`,
    );
    expect(html).toContain(`<source src="${CLIP}" type="video/mp4">`);
    expect(html).toContain("<figcaption>Clip.</figcaption>");
  });

  it("rejects a non-local video path, a wrong format, and a missing poster", () => {
    expect(() =>
      renderBlogBlock("video", `src: https://cdn.test/a.mp4\nposter: ${POSTER}\ntitle: T`),
    ).toThrow(/src/);
    expect(() =>
      renderBlogBlock("video", `src: /videos/day05-beyond-the-backpacker-en.mp4\nposter: ${POSTER}\ntitle: T`),
    ).toThrow(/src/);
    expect(() =>
      renderBlogBlock("video", `src: /blog/clip.mov\nposter: ${POSTER}\ntitle: T`),
    ).toThrow(/src/);
    expect(() => renderBlogBlock("video", `src: ${CLIP}\ntitle: T`)).toThrow(/poster/);
  });
});

describe("gallery block", () => {
  it("renders an image pair with the count and a caption", async () => {
    const html = await renderBlogMarkdown(
      fence("gallery", `image: ${IMAGE} | A curve\nimage: ${IMAGE_2} | A robot\ncaption: Two views.`),
    );
    expect(html).toContain('<figure class="blog-gallery" data-count="2">');
    expect(html).toContain(`<img src="${IMAGE}" alt="A curve" loading="lazy" decoding="async">`);
    expect(html).toContain(`<img src="${IMAGE_2}" alt="A robot" loading="lazy" decoding="async">`);
    expect(html).toContain("<figcaption>Two views.</figcaption>");
  });

  it("accepts 6 images and rejects 1 or 7 images and an image without alt text", () => {
    const line = `image: ${IMAGE} | A curve`;
    expect(renderBlogBlock("gallery", Array(6).fill(line).join("\n"))).toContain('data-count="6"');
    expect(() => renderBlogBlock("gallery", line)).toThrow(/2 to 6/);
    expect(() => renderBlogBlock("gallery", Array(7).fill(line).join("\n"))).toThrow(/2 to 6/);
    expect(() => renderBlogBlock("gallery", `image: ${IMAGE}\n${line}`)).toThrow(/alt/);
  });
});

describe("pullquote block", () => {
  it("renders a quote and its source", async () => {
    const html = await renderBlogMarkdown(
      fence("pullquote", "text: Reading is a skill.\ncite: A Grade 5 teacher"),
    );
    expect(html).toContain(
      '<figure class="blog-pullquote"><blockquote><p>Reading is a skill.</p></blockquote>' +
        "<figcaption>A Grade 5 teacher</figcaption></figure>",
    );
  });

  it("rejects a quote without text", () => {
    expect(() => renderBlogBlock("pullquote", "cite: Someone")).toThrow(/text/);
  });
});

describe("callout block", () => {
  it("renders each type with the label from the locale files", async () => {
    const note = await renderBlogMarkdown(fence("callout", "type: note\ntext: Read this."));
    const tip = await renderBlogMarkdown(fence("callout", "type: tip\ntitle: Short\ntext: Do this."));
    const warning = await renderBlogMarkdown(
      fence("callout", "type: warning\ntext: Not that."),
      "th",
    );
    expect(note).toContain(
      '<aside class="blog-callout" data-type="note"><p class="blog-callout-label">Note</p>' +
        "<p>Read this.</p></aside>",
    );
    expect(tip).toContain('<p class="blog-callout-label">Tip</p><p><strong>Short</strong></p>');
    expect(warning).toContain('<p class="blog-callout-label">คำเตือน</p>');
  });

  it("rejects an unknown type", () => {
    expect(() => renderBlogBlock("callout", "type: danger\ntext: X")).toThrow(/type/);
  });
});

describe("file size rules", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "blog-blocks-"));
  fs.mkdirSync(path.join(root, "blog"));
  fs.writeFileSync(path.join(root, "blog/big.jpg"), "");
  fs.truncateSync(path.join(root, "blog/big.jpg"), 1024 * 1024 + 1);
  fs.writeFileSync(path.join(root, "blog/big.mp4"), "");
  fs.truncateSync(path.join(root, "blog/big.mp4"), 10 * 1024 * 1024 + 1);
  fs.writeFileSync(path.join(root, "blog/ok.jpg"), "x");
  afterAll(() => fs.rmSync(root, { recursive: true, force: true }));

  it("rejects an image larger than 1 MB and a video larger than 10 MB", () => {
    expect(() =>
      renderBlogBlock("figure", "src: /blog/big.jpg\nalt: A", { publicRoot: root }),
    ).toThrow(/1 MB/);
    expect(() =>
      renderBlogBlock("video", "src: /blog/big.mp4\nposter: /blog/ok.jpg\ntitle: T", {
        publicRoot: root,
      }),
    ).toThrow(/10 MB/);
  });
});

describe("plain Markdown", () => {
  const baseline = (markdown: string) =>
    unified()
      .use(remarkParse)
      .use(remarkGfm)
      .use(remarkHtml, { sanitize: false })
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings)
      .process(markdown)
      .then(String);

  it("renders every existing post the same as the old pipeline", async () => {
    let checked = 0;
    for (const locale of ["en", "th"] as const) {
      for (const file of fs.readdirSync(postsDirectory(locale))) {
        const { data, content } = matter(
          fs.readFileSync(path.join(postsDirectory(locale), file), "utf8"),
        );
        if (data.draft === true) continue;
        expect(await renderBlogMarkdown(content, locale), file).toBe(await baseline(content));
        checked++;
      }
    }
    expect(checked).toBeGreaterThan(50);
  });

  it("keeps a code fence with another language as code", async () => {
    const html = await renderBlogMarkdown("```js\nconst a = 1;\n```\n");
    expect(html).toContain('<pre><code class="language-js">const a = 1;');
  });
});
