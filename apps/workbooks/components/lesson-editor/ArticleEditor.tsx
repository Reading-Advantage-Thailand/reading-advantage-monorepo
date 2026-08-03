"use client";

import type { ArticleEditorProps } from "./types";

/**
 * Edits the article body of a workbook lesson as a JSON array of numbered
 * paragraphs. Article URL, caption, and image management are excluded in this
 * phase: URLs are rejected as canonical asset keys by the domain contract, and
 * image generation/upload routes through @reading-advantage/ai as proposal-only
 * work (FR-11) outside S4b.
 *
 * @param props - Current paragraph values plus an onChange callback; see ArticleEditorProps.
 * @returns The Article section.
 */
export function ArticleEditor({
  article_paragraphs,
  onChange,
}: ArticleEditorProps) {
  const handleParagraphsChange = (value: string) => {
    try {
      const parsed: unknown = JSON.parse(value);
      onChange("article_paragraphs", parsed as { number: number; text: string }[]);
    } catch {
      // Invalid JSON is not propagated; the editor keeps its last valid value.
    }
  };

  return (
    <section aria-labelledby="article-heading">
      <h2 id="article-heading">Article</h2>
      <p>
        Article URL, caption, and image management are deferred to later phases
        (image features are proposal-only via @reading-advantage/ai).
      </p>
      <div>
        <label htmlFor="article_paragraphs">Article Paragraphs</label>
        <textarea
          id="article_paragraphs"
          value={JSON.stringify(article_paragraphs || [], null, 2)}
          onChange={(event) => handleParagraphsChange(event.target.value)}
          rows={8}
          className="font-mono"
          placeholder='[{"number": 1, "text": "..."}]'
        />
        <p>Enter as JSON array</p>
      </div>
    </section>
  );
}
