'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import type { TextBlock as TextBlockType } from '@/lib/schemas/lesson-content.schema';

interface TextBlockProps {
  block: TextBlockType;
  showThai?: boolean;
  displayPreference?: 'en' | 'th' | 'side-by-side';
  className?: string;
}

/**
 * TextBlock component renders markdown content with optional side-by-side Thai translation.
 * When showThai is true, English content is displayed first with Thai content below,
 * separated by a subtle divider. Thai content uses muted styling.
 */
export function TextBlock({ block, showThai = false, displayPreference, className }: TextBlockProps) {
  const hasThai = block.contentThai;
  const isThaiPrimary = displayPreference === 'th';
  const isEnglishOnly = displayPreference === 'en';

  // English-only mode: show only English
  if (isEnglishOnly || !showThai || !hasThai) {
    return (
      <div
        className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
        data-block-type="text"
        data-block-id={block.id}
        data-testid={`text-block-${block.id ?? 'unknown'}`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {block.content}
        </ReactMarkdown>
      </div>
    );
  }

  // Thai-primary mode: show Thai as primary, English as fallback note
  if (isThaiPrimary) {
    return (
      <div
        className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
        data-block-type="text"
        data-block-id={block.id}
        data-testid={`text-block-${block.id ?? 'unknown'}`}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {block.contentThai}
        </ReactMarkdown>
        {block.content && block.content !== block.contentThai && (
          <>
            <div
              className="my-3 border-t border-gray-200 dark:border-gray-700"
              data-bilingual-divider=""
              aria-hidden="true"
            />
            <div
              className="text-sm text-gray-500 dark:text-gray-400 prose prose-sm max-w-none dark:prose-invert"
              data-english-fallback=""
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {block.content}
              </ReactMarkdown>
            </div>
          </>
        )}
      </div>
    );
  }

  // Side-by-side mode: English primary, Thai secondary
  return (
    <div
      className={cn('prose prose-sm max-w-none dark:prose-invert', className)}
      data-block-type="text"
      data-block-id={block.id}
      data-testid={`text-block-${block.id ?? 'unknown'}`}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>
        {block.content}
      </ReactMarkdown>
      <div
        className="my-3 border-t border-gray-200 dark:border-gray-700"
        data-bilingual-divider=""
        aria-hidden="true"
      />
      <div
        className="text-sm text-gray-500 dark:text-gray-400 prose prose-sm max-w-none dark:prose-invert"
        data-thai-content=""
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {block.contentThai}
        </ReactMarkdown>
      </div>
    </div>
  );
}
