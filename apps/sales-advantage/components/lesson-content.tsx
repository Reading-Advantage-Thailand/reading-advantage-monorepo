import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Properties for safe learner lesson rendering. */
export interface LessonContentProps {
  /** Human-reviewed Markdown curriculum content. */
  content: string;
}

/**
 * Renders curriculum Markdown with GFM tables while dropping embedded raw HTML.
 * @param props Learner lesson content.
 * @returns Safe semantic React content for the lesson page.
 */
export function LessonContent({ content }: LessonContentProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml>
      {content}
    </ReactMarkdown>
  );
}
