'use client';

import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import type { ReadingPassageBlock as ReadingPassageBlockType } from '@/lib/schemas/lesson-content.schema';

interface ReadingPassageBlockProps {
  block: ReadingPassageBlockType;
  showThai?: boolean;
  displayPreference?: 'en' | 'th' | 'side-by-side';
  className?: string;
}

/**
 * ReadingPassageBlock component displays longer text content with distinct styling.
 * Supports English-only, Thai-primary, and side-by-side display modes.
 */
export function ReadingPassageBlock({ block, showThai = false, displayPreference, className }: ReadingPassageBlockProps) {
  const hasThaiTitle = block.titleThai;
  const isThaiPrimary = displayPreference === 'th';

  return (
    <article
      className={cn(
        'rounded-lg bg-amber-50 p-6 dark:bg-amber-950/30',
        className
      )}
      data-block-type="reading_passage"
      data-block-id={block.id}
      data-testid={`reading-passage-block-${block.id ?? 'unknown'}`}
      aria-label={`Reading passage: ${isThaiPrimary && hasThaiTitle ? block.titleThai : block.title}`}
    >
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          {isThaiPrimary && hasThaiTitle ? (
            <>
              <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                {block.titleThai}
              </h3>
              <p className="mt-1 text-base text-gray-500 dark:text-gray-400">
                {block.title}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-xl font-semibold text-amber-900 dark:text-amber-100">
                {block.title}
              </h3>
              {showThai && hasThaiTitle && (
                <p
                  className="mt-1 text-base text-gray-500 dark:text-gray-400"
                  data-thai-title=""
                >
                  {block.titleThai}
                </p>
              )}
            </>
          )}
        </div>
        <Badge
          variant="secondary"
          className="shrink-0 bg-amber-200 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
        >
          {block.wordCount} words
        </Badge>
      </header>
      <div className="prose prose-sm max-w-none text-amber-900 dark:prose-invert dark:text-amber-100">
        <p className="whitespace-pre-wrap">{block.content}</p>
      </div>
    </article>
  );
}
