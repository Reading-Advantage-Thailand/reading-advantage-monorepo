'use client';

import { useEffect, useRef, Component, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  TextBlock,
  VocabularyBlock,
  ImageBlock,
  ReadingPassageBlock,
  ProcedureBlock,
  MaterialsBlock,
  ReviewBlock,
  QuizBlock,
} from './blocks';
import type {
  LessonContent,
  ContentBlock,
} from '@/lib/schemas/lesson-content.schema';

// =============================================================================
// Error Boundary Component
// =============================================================================

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  blockIndex: number;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary to catch rendering errors in individual blocks.
 * Prevents one broken block from crashing the entire lesson player.
 */
class BlockErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(
      `[LessonPlayer] Error in block ${this.props.blockIndex}:`,
      error,
      errorInfo.componentStack
    );
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div
          className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/30 dark:text-red-400"
          role="alert"
        >
          <p className="font-medium">Unable to display this content block.</p>
          <p className="mt-1 text-xs text-red-600 dark:text-red-500">
            Block {this.props.blockIndex + 1} encountered an error.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// =============================================================================
// Intersection Observer Hook
// =============================================================================

/**
 * Custom hook for observing when a block becomes visible in the viewport.
 * Respects prefers-reduced-motion for any potential animations.
 */
function useBlockVisibility(
  blockIndex: number,
  blockId: string | undefined,
  onBlockView?: (blockIndex: number, blockId?: string) => void
) {
  const ref = useRef<HTMLDivElement>(null);
  const hasBeenViewed = useRef(false);

  useEffect(() => {
    // Reset hasBeenViewed when block changes
    hasBeenViewed.current = false;

    if (!onBlockView) return;

    const element = ref.current;
    if (!element) return;

    // Check for reduced motion preference
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasBeenViewed.current) {
            hasBeenViewed.current = true;
            onBlockView(blockIndex, blockId);
          }
        });
      },
      {
        threshold: prefersReducedMotion ? 0.1 : 0.25,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [blockIndex, blockId, onBlockView]);

  return ref;
}

// =============================================================================
// Block Renderer Component
// =============================================================================

interface BlockRendererProps {
  block: ContentBlock;
  index: number;
  showThai: boolean;
  displayPreference?: 'en' | 'th' | 'side-by-side';
  onBlockView?: (blockIndex: number, blockId?: string) => void;
}

function BlockRenderer({ block, index, showThai, displayPreference, onBlockView }: BlockRendererProps) {
  const ref = useBlockVisibility(index, block.id, onBlockView);

  const renderBlock = () => {
    switch (block.type) {
      case 'text':
        return <TextBlock block={block} showThai={showThai} displayPreference={displayPreference} />;
      case 'vocabulary':
        return <VocabularyBlock block={block} showThai={showThai} displayPreference={displayPreference} />;
      case 'image':
        return <ImageBlock block={block} showThai={showThai} />;
      case 'reading_passage':
        return <ReadingPassageBlock block={block} showThai={showThai} />;
      case 'procedure':
        return <ProcedureBlock block={block} showThai={showThai} />;
      case 'materials':
        return <MaterialsBlock block={block} showThai={showThai} />;
      case 'review':
        return <ReviewBlock block={block} showThai={showThai} />;
      case 'quiz':
        return <QuizBlock block={block} showThai={showThai} />;
      default: {
        // Handle unknown block types gracefully
        const unknownBlock = block as { type: string };
        console.warn(
          `[LessonPlayer] Unknown block type "${unknownBlock.type}" at index ${index}`
        );
        return (
          <div
            className="rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-400"
            role="status"
          >
            <p>Content type not yet supported: {unknownBlock.type}</p>
          </div>
        );
      }
    }
  };

  return (
    <div ref={ref} data-block-index={index}>
      {renderBlock()}
    </div>
  );
}

// =============================================================================
// Main LessonPlayer Component
// =============================================================================

export interface LessonPlayerProps {
  /** The structured lesson content to render */
  content: LessonContent;
  /** Show Thai translations when available */
  showThai?: boolean;
  /** Display preference mode: 'en', 'th', or 'side-by-side' */
  displayPreference?: 'en' | 'th' | 'side-by-side';
  /** Callback fired when a block becomes visible in the viewport */
  onBlockView?: (blockIndex: number, blockId?: string) => void;
  /** Additional CSS classes for the container */
  className?: string;
}

/**
 * LessonPlayer component iterates through structured content blocks
 * and renders them using appropriate sub-components.
 *
 * Features:
 * - Supports multiple block types (text, vocabulary, image, reading_passage, procedure, materials)
 * - Error boundaries prevent single block failures from breaking the entire player
 * - IntersectionObserver tracks when blocks become visible
 * - Thai language support with fallback to English
 * - Respects prefers-reduced-motion for accessibility
 * - Handles unknown block types gracefully
 *
 * @example
 * ```tsx
 * <LessonPlayer
 *   content={lessonContent}
 *   showThai={false}
 *   onBlockView={(index, id) => console.log(`Block ${index} viewed`)}
 * />
 * ```
 */
export function LessonPlayer({
  content,
  showThai,
  displayPreference,
  onBlockView,
  className,
}: LessonPlayerProps) {
  // Derive showThai from displayPreference if provided, falling back to showThai prop
  const effectiveShowThai =
    displayPreference !== undefined
      ? displayPreference === 'th' || displayPreference === 'side-by-side'
      : showThai ?? false;
  // Handle null or empty content
  if (!content || !content.blocks || content.blocks.length === 0) {
    return (
      <div
        className={cn(
          'rounded-lg border border-dashed border-gray-300 bg-gray-50 p-8 text-center dark:border-gray-700 dark:bg-gray-900',
          className
        )}
        role="status"
        aria-label="No lesson content available"
      >
        <p className="text-gray-500 dark:text-gray-400">
          No lesson content available.
        </p>
      </div>
    );
  }

  return (
    <div
      className={cn('space-y-6', className)}
      data-testid="lesson-player"
      role="article"
      aria-label="Lesson content"
    >
      {content.blocks.map((block, index) => (
        <BlockErrorBoundary
          key={block.id || `block-${index}`}
          blockIndex={index}
        >
          <BlockRenderer
            block={block}
            index={index}
            showThai={effectiveShowThai}
            displayPreference={displayPreference}
            onBlockView={onBlockView}
          />
        </BlockErrorBoundary>
      ))}
    </div>
  );
}

// Also export the error boundary for testing
export { BlockErrorBoundary };
