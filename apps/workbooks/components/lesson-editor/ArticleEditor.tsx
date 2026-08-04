"use client";

import type { ArticleEditorProps } from "./types";
import { useJsonField } from "./use-json-field";

/**
 * Edits the article body of a workbook lesson as a JSON array of numbered
 * paragraphs. Article URL, caption, and image management are excluded in this
 * phase: URLs are rejected as canonical asset keys by the domain contract, and
 * image generation/upload routes through @reading-advantage/ai as proposal-only
 * work (FR-11) outside S4b.
 *
 * The JSON field keeps its raw text in local state so intermediate invalid
 * fragments remain typeable; only successful parses propagate upward, and
 * invalid input surfaces an inline parse error.
 * @param props - Current paragraph values plus an onChange callback; see ArticleEditorProps.
 * @returns The Article section.
 */
export function ArticleEditor({
  article_paragraphs,
  onChange,
}: ArticleEditorProps) {
  const paragraphsField = useJsonField(
    article_paragraphs,
    (value) => JSON.stringify(value ?? [], null, 2),
    (parsed) =>
      onChange(
        "article_paragraphs",
        parsed as { number: number; text: string }[],
      ),
  );

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
          value={paragraphsField.value}
          onChange={(event) => paragraphsField.handleChange(event.target.value)}
          rows={8}
          className="font-mono"
          placeholder='[{"number": 1, "text": "..."}]'
          aria-describedby="article_paragraphs-hint"
        />
        {paragraphsField.error && (
          <p id="article_paragraphs-error" role="alert">
            {paragraphsField.error}
          </p>
        )}
        <p id="article_paragraphs-hint">Enter as JSON array</p>
      </div>
    </section>
  );
}
