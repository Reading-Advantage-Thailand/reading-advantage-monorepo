'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import type { VocabularyTerm } from '@/lib/schemas/lesson-content.schema';

// =============================================================================
// Types
// =============================================================================

export interface VocabularyFlashcardsProps {
  terms: VocabularyTerm[];
  showThai?: boolean;
  displayPreference?: 'en' | 'th' | 'side-by-side';
  mode?: 'carousel' | 'grid';
  onTermReviewed?: (term: string, recalled: 'easy' | 'hard') => void;
  className?: string;
}

interface FlashcardProps {
  term: VocabularyTerm;
  showThai: boolean;
  displayPreference?: 'en' | 'th' | 'side-by-side';
  isFlipped: boolean;
  onFlip: () => void;
  onAssess?: (recalled: 'easy' | 'hard') => void;
  prefersReducedMotion: boolean;
  index: number;
  total: number;
}

// =============================================================================
// Custom Hook: Reduced Motion Detection
// =============================================================================

function usePrefersReducedMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };

    // Feature detection for addEventListener (Safari < 14 only has addListener)
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler);
      return () => mediaQuery.removeEventListener('change', handler);
    } else {
      // Fallback for older browsers that only support addListener
      mediaQuery.addListener(handler);
      return () => mediaQuery.removeListener(handler);
    }
  }, []);

  return prefersReducedMotion;
}

// =============================================================================
// Flashcard Component
// =============================================================================

function Flashcard({
  term,
  showThai,
  displayPreference,
  isFlipped,
  onFlip,
  onAssess,
  prefersReducedMotion,
  index,
  total,
}: FlashcardProps) {
  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        onFlip();
      }
    },
    [onFlip]
  );

  const handleAssess = useCallback(
    (recalled: 'easy' | 'hard') => {
      onAssess?.(recalled);
    },
    [onAssess]
  );

  return (
    <div
      className={cn(
        'relative w-full',
        prefersReducedMotion ? '' : 'perspective-1000'
      )}
      style={prefersReducedMotion ? {} : { perspective: '1000px' }}
    >
      <div
        className={cn(
          'relative w-full min-h-[200px] cursor-pointer',
          prefersReducedMotion
            ? '' // No 3D transform for reduced motion
            : 'transform-style-preserve-3d transition-transform duration-500'
        )}
        style={
          prefersReducedMotion
            ? {}
            : {
                transformStyle: 'preserve-3d',
                transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
              }
        }
        onClick={onFlip}
        onKeyDown={handleKeyDown}
        role="button"
        tabIndex={0}
        aria-label={`Flashcard ${index + 1} of ${total}: ${term.term}. ${isFlipped ? 'Showing definition' : 'Click or press Enter to reveal definition'}`}
        aria-pressed={isFlipped}
        data-testid="flashcard"
      >
        {/* Front of card - Term */}
        <Card
          aria-hidden={isFlipped}
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center p-6',
            prefersReducedMotion
              ? isFlipped
                ? 'hidden'
                : 'block'
              : 'backface-hidden'
          )}
          style={
            prefersReducedMotion
              ? {}
              : {
                  backfaceVisibility: 'hidden',
                }
          }
          data-testid="flashcard-front"
        >
          {displayPreference === 'th' && term.thai ? (
            <>
              <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
                {term.thai}
              </h3>
              <p className="mt-2 text-base text-gray-500 dark:text-gray-400 text-center">
                {term.term}
              </p>
            </>
          ) : (
            <>
              <h3 className="text-2xl font-bold text-center text-gray-900 dark:text-gray-100">
                {term.term}
              </h3>
              {showThai && term.thai && (
                <p className="mt-2 text-lg text-gray-600 dark:text-gray-400 text-center">
                  {term.thai}
                </p>
              )}
            </>
          )}
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-500">
            Click to reveal definition
          </p>
        </Card>

        {/* Back of card - Definition */}
        <Card
          aria-hidden={!isFlipped}
          className={cn(
            'absolute inset-0 flex flex-col items-center justify-center p-6',
            prefersReducedMotion
              ? isFlipped
                ? 'block'
                : 'hidden'
              : 'backface-hidden rotate-y-180'
          )}
          style={
            prefersReducedMotion
              ? {}
              : {
                  backfaceVisibility: 'hidden',
                  transform: 'rotateY(180deg)',
                }
          }
          data-testid="flashcard-back"
        >
          <h3 className="text-xl font-semibold text-center text-gray-900 dark:text-gray-100 mb-2">
            {term.term}
          </h3>
          <p className="text-base text-gray-700 dark:text-gray-300 text-center">
            {term.definition}
          </p>

          {/* Self-assessment buttons */}
          {isFlipped && onAssess && (
            <div
              className="flex gap-3 mt-6"
              onClick={(e) => e.stopPropagation()}
              data-testid="assessment-buttons"
            >
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleAssess('hard')}
                aria-label="Mark as need practice"
                data-testid="btn-hard"
              >
                Need practice
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={() => handleAssess('easy')}
                aria-label="Mark as I knew it"
                data-testid="btn-easy"
              >
                I knew it
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

// =============================================================================
// Navigation Icons
// =============================================================================

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

// =============================================================================
// Empty State Component
// =============================================================================

function EmptyState({ className }: { className?: string }) {
  return (
    <div
      className={cn('text-center text-gray-500 py-8', className)}
      role="status"
      aria-label="No vocabulary terms available"
      data-testid="empty-terms"
    >
      No vocabulary terms available.
    </div>
  );
}

// =============================================================================
// Main Component
// =============================================================================

export function VocabularyFlashcards({
  terms,
  showThai = false,
  displayPreference,
  mode = 'carousel',
  onTermReviewed,
  className,
}: VocabularyFlashcardsProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flippedCards, setFlippedCards] = useState<Set<number>>(new Set());
  const [reviewedTerms, setReviewedTerms] = useState<Set<string>>(new Set());
  const prefersReducedMotion = usePrefersReducedMotion();

  // Memoize safe terms length to use in hooks
  const termsLength = terms?.length ?? 0;
  const hasTerms = termsLength > 0;

  const handleFlip = useCallback((index: number) => {
    setFlippedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const handleAssess = useCallback(
    (index: number, recalled: 'easy' | 'hard') => {
      if (!hasTerms) return;
      const term = terms[index];
      if (!term) return;

      setReviewedTerms((prev) => new Set(prev).add(term.term));
      onTermReviewed?.(term.term, recalled);

      // In carousel mode, auto-advance to next card after assessment
      if (mode === 'carousel' && index < termsLength - 1) {
        // Unflip current card and move to next
        setFlippedCards((prev) => {
          const next = new Set(prev);
          next.delete(index);
          return next;
        });
        setCurrentIndex(index + 1);
      }
    },
    [terms, hasTerms, mode, onTermReviewed, termsLength]
  );

  const goToPrevious = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = Math.max(0, prev - 1);
      // Unflip when navigating
      setFlippedCards((prevFlipped) => {
        const next = new Set(prevFlipped);
        next.delete(prev);
        return next;
      });
      return newIndex;
    });
  }, []);

  const goToNext = useCallback(() => {
    setCurrentIndex((prev) => {
      const newIndex = Math.min(termsLength - 1, prev + 1);
      // Unflip when navigating
      setFlippedCards((prevFlipped) => {
        const next = new Set(prevFlipped);
        next.delete(prev);
        return next;
      });
      return newIndex;
    });
  }, [termsLength]);

  // Keyboard navigation for carousel mode
  useEffect(() => {
    if (mode !== 'carousel' || !hasTerms) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        event.preventDefault();
        goToPrevious();
      } else if (event.key === 'ArrowRight') {
        event.preventDefault();
        goToNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, hasTerms, goToPrevious, goToNext]);

  // Progress calculation
  const progress = useMemo(() => {
    return {
      current: currentIndex + 1,
      total: termsLength,
      reviewed: reviewedTerms.size,
    };
  }, [currentIndex, termsLength, reviewedTerms.size]);

  // Handle empty terms array - AFTER all hooks
  if (!hasTerms) {
    return <EmptyState className={className} />;
  }

  // Carousel Mode
  if (mode === 'carousel') {
    const currentTerm = terms[currentIndex];
    const isFlipped = flippedCards.has(currentIndex);

    return (
      <div
        className={cn('space-y-4', className)}
        data-testid="vocabulary-flashcards"
        data-mode="carousel"
        role="region"
        aria-label="Vocabulary flashcards carousel"
      >
        {/* Progress Indicator */}
        <div
          className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400"
          data-testid="progress-indicator"
        >
          <span>
            {progress.current} of {progress.total}
          </span>
          {progress.reviewed > 0 && (
            <span className="text-green-600 dark:text-green-400">
              {progress.reviewed} reviewed
            </span>
          )}
        </div>

        {/* Flashcard */}
        <div className="relative min-h-[200px]">
          <Flashcard
            term={currentTerm}
            showThai={showThai}
            displayPreference={displayPreference}
            isFlipped={isFlipped}
            onFlip={() => handleFlip(currentIndex)}
            onAssess={(recalled) => handleAssess(currentIndex, recalled)}
            prefersReducedMotion={prefersReducedMotion}
            index={currentIndex}
            total={termsLength}
          />
        </div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={goToPrevious}
            disabled={currentIndex === 0}
            aria-label="Previous card"
            data-testid="btn-previous"
          >
            <ChevronLeftIcon className="size-5" />
          </Button>

          {/* Dot indicators */}
          <div className="flex gap-1.5" role="tablist" aria-label="Card navigation">
            {terms.map((_, index) => (
              <button
                key={index}
                className={cn(
                  'size-2 rounded-full transition-colors',
                  index === currentIndex
                    ? 'bg-primary'
                    : reviewedTerms.has(terms[index].term)
                      ? 'bg-green-400'
                      : 'bg-gray-300 dark:bg-gray-600'
                )}
                onClick={() => {
                  setFlippedCards((prev) => {
                    const next = new Set(prev);
                    next.delete(currentIndex);
                    return next;
                  });
                  setCurrentIndex(index);
                }}
                role="tab"
                aria-selected={index === currentIndex}
                aria-label={`Go to card ${index + 1}`}
                data-testid={`dot-${index}`}
              />
            ))}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={goToNext}
            disabled={currentIndex === termsLength - 1}
            aria-label="Next card"
            data-testid="btn-next"
          >
            <ChevronRightIcon className="size-5" />
          </Button>
        </div>
      </div>
    );
  }

  // Grid Mode
  return (
    <div
      className={cn('space-y-4', className)}
      data-testid="vocabulary-flashcards"
      data-mode="grid"
      role="region"
      aria-label="Vocabulary flashcards grid"
    >
      {/* Progress Indicator */}
      {reviewedTerms.size > 0 && (
        <div
          className="text-sm text-green-600 dark:text-green-400 text-right"
          data-testid="progress-indicator"
        >
          {reviewedTerms.size} of {termsLength} reviewed
        </div>
      )}

      {/* Grid of Flashcards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {terms.map((term, index) => (
          <div key={`${term.term}-${index}`} className="min-h-[200px]">
            <Flashcard
              term={term}
              showThai={showThai}
              displayPreference={displayPreference}
              isFlipped={flippedCards.has(index)}
              onFlip={() => handleFlip(index)}
              onAssess={(recalled) => handleAssess(index, recalled)}
              prefersReducedMotion={prefersReducedMotion}
              index={index}
              total={termsLength}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
