'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { ReviewBlock as ReviewBlockType } from '@/lib/schemas/lesson-content.schema';

interface ReviewBlockProps {
  block: ReviewBlockType;
  showThai?: boolean;
  className?: string;
}

/**
 * ReviewBlock component displays review questions with reveal-on-click functionality.
 * Users can click to reveal answers for each question.
 */
export function ReviewBlock({ block, showThai = false, className }: ReviewBlockProps) {
  const [revealedQuestions, setRevealedQuestions] = useState<Set<number>>(new Set());

  const toggleReveal = (index: number) => {
    setRevealedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const title = showThai && block.titleThai ? block.titleThai : block.title;

  return (
    <section
      className={cn('space-y-4', className)}
      data-block-type="review"
      data-block-id={block.id}
      aria-label={`Review: ${title}`}
    >
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        {title}
      </h3>
      <div className="space-y-3">
        {block.questions.map((question, index) => {
          const questionText = showThai && question.textThai ? question.textThai : question.text;
          const isRevealed = revealedQuestions.has(index);

          return (
            <div
              key={question.questionId || index}
              className={cn(
                'rounded-lg border p-4 transition-colors',
                isRevealed
                  ? 'border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30'
                  : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-900'
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <p className="font-medium text-gray-900 dark:text-gray-100">
                    <span className="mr-2 text-sm text-gray-500 dark:text-gray-400">
                      Q{index + 1}.
                    </span>
                    {questionText}
                  </p>
                  {isRevealed && (
                    <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                      Click to hide answer
                    </p>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleReveal(index)}
                  aria-label={isRevealed ? `Hide answer for question ${index + 1}` : `Reveal answer for question ${index + 1}`}
                  className={cn(
                    'shrink-0',
                    isRevealed && 'border-green-300 text-green-700 hover:bg-green-100 dark:border-green-700 dark:text-green-300'
                  )}
                >
                  {isRevealed ? 'Hide' : 'Reveal'}
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {revealedQuestions.size} of {block.questions.length} answers revealed
      </p>
    </section>
  );
}
