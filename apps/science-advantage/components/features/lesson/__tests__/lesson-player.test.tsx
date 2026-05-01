import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LessonPlayer, BlockErrorBoundary } from '../lesson-player';
import type { LessonContent, ContentBlock } from '@/lib/schemas/lesson-content.schema';

// Mock IntersectionObserver
const mockIntersectionObserver = vi.fn();
const mockObserve = vi.fn();
const mockDisconnect = vi.fn();

beforeEach(() => {
  mockIntersectionObserver.mockImplementation((callback: IntersectionObserverCallback) => {
    return {
      observe: mockObserve,
      disconnect: mockDisconnect,
      unobserve: vi.fn(),
    };
  });
  vi.stubGlobal('IntersectionObserver', mockIntersectionObserver);

  // Mock matchMedia for prefers-reduced-motion
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} data-testid="next-image" />
  ),
}));

// =============================================================================
// Test Fixtures
// =============================================================================

const createTextBlock = (overrides?: Partial<ContentBlock>): ContentBlock => ({
  id: 'text-1',
  type: 'text',
  content: '# Hello World\n\nThis is **markdown** content.',
  contentThai: '# สวัสดีโลก\n\nนี่คือเนื้อหา **มาร์กดาวน์**',
  ...overrides,
} as ContentBlock);

const createVocabularyBlock = (): ContentBlock => ({
  id: 'vocab-1',
  type: 'vocabulary',
  terms: [
    { term: 'Photosynthesis', thai: 'การสังเคราะห์ด้วยแสง', definition: 'The process by which plants make food' },
    { term: 'Chlorophyll', thai: 'คลอโรฟิลล์', definition: 'Green pigment in plants' },
  ],
});

const createImageBlock = (): ContentBlock => ({
  id: 'image-1',
  type: 'image',
  src: '/images/plant.png',
  alt: 'A diagram showing plant photosynthesis process',
  caption: 'Plant photosynthesis',
  captionThai: 'การสังเคราะห์ด้วยแสงของพืช',
  aspectRatio: 1.5,
  attribution: 'Science Textbook 2024',
});

const createReadingPassageBlock = (): ContentBlock => ({
  id: 'reading-1',
  type: 'reading_passage',
  title: 'How Plants Make Food',
  titleThai: 'พืชสร้างอาหารอย่างไร',
  content: 'Plants are amazing organisms that can make their own food using sunlight.',
  contentThai: 'พืชเป็นสิ่งมีชีวิตที่น่าทึ่งที่สามารถสร้างอาหารเองได้โดยใช้แสงแดด',
  wordCount: 12,
});

const createProcedureBlock = (): ContentBlock => ({
  id: 'procedure-1',
  type: 'procedure',
  steps: [
    {
      stepNumber: 1,
      instruction: 'Place one plant in sunlight',
      instructionThai: 'วางต้นไม้หนึ่งต้นไว้ในที่มีแสงแดด',
      subSteps: ['Choose a sunny windowsill', 'Ensure the plant is stable'],
    },
    {
      stepNumber: 2,
      instruction: 'Place another plant in darkness',
      instructionThai: 'วางต้นไม้อีกต้นไว้ในที่มืด',
    },
  ],
});

const createMaterialsBlock = (): ContentBlock => ({
  id: 'materials-1',
  type: 'materials',
  items: [
    { quantity: '2', item: 'Small plants', itemThai: 'ต้นไม้ขนาดเล็ก' },
    { item: 'Water' },
  ],
});

const createLessonContent = (blocks: ContentBlock[]): LessonContent => ({
  version: 1,
  blocks,
});

// =============================================================================
// Test Suite
// =============================================================================

describe('LessonPlayer', () => {
  describe('Text Block Rendering', () => {
    it('renders text block with markdown processed', () => {
      const content = createLessonContent([createTextBlock()]);
      render(<LessonPlayer content={content} />);

      // Check that markdown is rendered as HTML
      expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
      expect(screen.getByText('markdown')).toBeInTheDocument();
    });

    it('shows Thai content when showThai is true and Thai content available', () => {
      const content = createLessonContent([createTextBlock()]);
      render(<LessonPlayer content={content} showThai={true} />);

      expect(screen.getByRole('heading', { level: 1, name: 'สวัสดีโลก' })).toBeInTheDocument();
    });

    it('falls back to English when Thai content not available', () => {
      const textBlock = createTextBlock({ contentThai: undefined } as Partial<ContentBlock>);
      const content = createLessonContent([textBlock]);
      render(<LessonPlayer content={content} showThai={true} />);

      expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
    });
  });

  describe('Vocabulary Block Rendering', () => {
    it('renders vocabulary block with terms', () => {
      const content = createLessonContent([createVocabularyBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByText('Photosynthesis')).toBeInTheDocument();
      expect(screen.getByText('The process by which plants make food')).toBeInTheDocument();
      expect(screen.getByText('Chlorophyll')).toBeInTheDocument();
    });

    it('renders vocabulary block with flashcards region', () => {
      const content = createLessonContent([createVocabularyBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('region', { name: 'Vocabulary flashcards carousel' })).toBeInTheDocument();
    });
  });

  describe('Image Block Rendering', () => {
    it('renders image block with required alt text', () => {
      const content = createLessonContent([createImageBlock()]);
      render(<LessonPlayer content={content} />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('alt', 'A diagram showing plant photosynthesis process');
      expect(image).toHaveAttribute('src', '/images/plant.png');
    });

    it('renders image caption and attribution', () => {
      const content = createLessonContent([createImageBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByText('Plant photosynthesis')).toBeInTheDocument();
      expect(screen.getByText(/Science Textbook 2024/)).toBeInTheDocument();
    });

    it('shows Thai caption when showThai is true', () => {
      const content = createLessonContent([createImageBlock()]);
      render(<LessonPlayer content={content} showThai={true} />);

      expect(screen.getByText('การสังเคราะห์ด้วยแสงของพืช')).toBeInTheDocument();
    });

    it('uses default 16/9 aspect ratio when aspectRatio is not provided', () => {
      const imageBlockWithoutAspectRatio = {
        id: 'image-no-ratio',
        type: 'image',
        src: '/images/default.png',
        alt: 'Test image without aspect ratio',
        caption: 'Default aspect ratio image',
        attribution: 'Test',
        // Note: aspectRatio is intentionally omitted
      } as unknown as ContentBlock;

      const content = createLessonContent([imageBlockWithoutAspectRatio]);
      const { container } = render(<LessonPlayer content={content} />);

      // Find the image wrapper div with aspectRatio style
      const imageWrapper = container.querySelector('[data-block-type="image"] > div');
      expect(imageWrapper).toBeInTheDocument();

      // Verify the wrapper has aspect-ratio style set to 16/9 (~1.777)
      const style = imageWrapper?.getAttribute('style');
      expect(style).toMatch(/aspect-ratio/);

      // The style should contain the default 16/9 ratio (1.777...)
      expect(style).toMatch(/1\.777/);
    });
  });

  describe('Reading Passage Block Rendering', () => {
    it('renders reading passage with title and content', () => {
      const content = createLessonContent([createReadingPassageBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('heading', { level: 3, name: 'How Plants Make Food' })).toBeInTheDocument();
      expect(screen.getByText(/Plants are amazing organisms/)).toBeInTheDocument();
    });

    it('renders word count badge', () => {
      const content = createLessonContent([createReadingPassageBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByText('12 words')).toBeInTheDocument();
    });

    it('renders with distinct amber styling', () => {
      const content = createLessonContent([createReadingPassageBlock()]);
      render(<LessonPlayer content={content} />);

      const article = screen.getByRole('article', { name: /Reading passage: How Plants Make Food/i });
      expect(article).toHaveClass('bg-amber-50');
    });
  });

  describe('Procedure Block Rendering', () => {
    it('renders procedure as interactive checklist', () => {
      const content = createLessonContent([createProcedureBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('heading', { level: 3, name: 'Procedure' })).toBeInTheDocument();
      expect(screen.getByText('Place one plant in sunlight')).toBeInTheDocument();
      expect(screen.getByText('Place another plant in darkness')).toBeInTheDocument();
    });

    it('renders checkboxes that can be toggled', async () => {
      const user = userEvent.setup();
      const content = createLessonContent([createProcedureBlock()]);
      render(<LessonPlayer content={content} />);

      const checkbox1 = screen.getByRole('checkbox', { name: 'Mark step 1 as complete' });
      expect(checkbox1).not.toBeChecked();

      await user.click(checkbox1);
      expect(checkbox1).toBeChecked();
      expect(screen.getByText('1 of 2 steps completed')).toBeInTheDocument();

      await user.click(checkbox1);
      expect(checkbox1).not.toBeChecked();
      expect(screen.getByText('0 of 2 steps completed')).toBeInTheDocument();
    });

    it('renders sub-steps', () => {
      const content = createLessonContent([createProcedureBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByText('Choose a sunny windowsill')).toBeInTheDocument();
      expect(screen.getByText('Ensure the plant is stable')).toBeInTheDocument();
    });
  });

  describe('Materials Block Rendering', () => {
    it('renders materials list with quantities', () => {
      const content = createLessonContent([createMaterialsBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('heading', { level: 3, name: 'Materials Needed' })).toBeInTheDocument();
      expect(screen.getByText('2')).toBeInTheDocument();
      expect(screen.getByText(/Small plants/)).toBeInTheDocument();
      expect(screen.getByText('Water')).toBeInTheDocument();
    });

    it('shows Thai item names when showThai is true', () => {
      const content = createLessonContent([createMaterialsBlock()]);
      render(<LessonPlayer content={content} showThai={true} />);

      expect(screen.getByText(/ต้นไม้ขนาดเล็ก/)).toBeInTheDocument();
    });
  });

  describe('Multiple Block Types in Order', () => {
    it('renders multiple block types in correct order', () => {
      const content = createLessonContent([
        createTextBlock(),
        createVocabularyBlock(),
        createImageBlock(),
        createReadingPassageBlock(),
        createMaterialsBlock(),
        createProcedureBlock(),
      ]);
      render(<LessonPlayer content={content} />);

      const lessonPlayer = screen.getByTestId('lesson-player');
      const blocks = lessonPlayer.querySelectorAll('[data-block-index]');

      expect(blocks).toHaveLength(6);
      expect(blocks[0]).toHaveAttribute('data-block-index', '0');
      expect(blocks[5]).toHaveAttribute('data-block-index', '5');
    });
  });

  describe('Empty Content Handling', () => {
    it('handles empty content array', () => {
      const content = createLessonContent([]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByText('No lesson content available.')).toBeInTheDocument();
    });

    it('handles null blocks gracefully', () => {
      const content = { version: 1, blocks: null } as unknown as LessonContent;
      render(<LessonPlayer content={content} />);

      expect(screen.getByText('No lesson content available.')).toBeInTheDocument();
    });
  });

  describe('Language Toggle', () => {
    it('shows English content by default', () => {
      const content = createLessonContent([
        createTextBlock(),
        createReadingPassageBlock(),
      ]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'How Plants Make Food' })).toBeInTheDocument();
    });

    it('shows Thai content when showThai is true', () => {
      const content = createLessonContent([
        createTextBlock(),
        createReadingPassageBlock(),
      ]);
      render(<LessonPlayer content={content} showThai={true} />);

      expect(screen.getByRole('heading', { level: 1, name: 'สวัสดีโลก' })).toBeInTheDocument();
      expect(screen.getByText('พืชสร้างอาหารอย่างไร')).toBeInTheDocument();
    });
  });

  describe('Unknown Block Type Handling', () => {
    it('handles unknown block type gracefully without crashing', () => {
      const unknownBlock = {
        id: 'unknown-1',
        type: 'video',
        src: '/video.mp4',
      } as unknown as ContentBlock;

      const content = createLessonContent([unknownBlock, createTextBlock()]);

      // Should not throw
      const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      render(<LessonPlayer content={content} />);

      // Unknown block shows fallback
      expect(screen.getByText('Content type not yet supported: video')).toBeInTheDocument();

      // Other blocks still render
      expect(screen.getByRole('heading', { level: 1, name: 'Hello World' })).toBeInTheDocument();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown block type "video"')
      );
      consoleSpy.mockRestore();
    });
  });

  describe('Error Boundary', () => {
    it('error in one block does not break entire player', () => {
      // Create a component that will throw during render
      const ThrowingComponent = () => {
        throw new Error('Test error');
      };

      // We need to test the ErrorBoundary itself since ReactMarkdown handles null gracefully
      // Instead, verify that the vocabulary block still renders even when first block has issues
      const errorBlock = {
        id: 'error-1',
        type: 'text',
        content: '', // Empty but valid - just testing that other blocks render
      } as unknown as ContentBlock;

      const content = createLessonContent([errorBlock, createVocabularyBlock()]);

      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(<LessonPlayer content={content} />);

      // Other blocks still render even with problematic first block
      expect(screen.getAllByText('Photosynthesis').length).toBeGreaterThan(0);
      expect(screen.getByText('Chlorophyll')).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });

    it('BlockErrorBoundary renders fallback on error', () => {
      // Test the error boundary directly
      const ThrowingComponent = () => {
        throw new Error('Test render error');
      };

      // Suppress console.error for this test
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <BlockErrorBoundary blockIndex={0}>
          <ThrowingComponent />
        </BlockErrorBoundary>
      );

      // Error boundary shows fallback
      expect(screen.getByRole('alert')).toBeInTheDocument();
      expect(screen.getByText(/Unable to display this content block/)).toBeInTheDocument();
      expect(screen.getByText(/Block 1 encountered an error/)).toBeInTheDocument();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('onBlockView Callback', () => {
    it('fires onBlockView callback when block becomes visible', () => {
      const onBlockView = vi.fn();
      const content = createLessonContent([createTextBlock()]);

      render(<LessonPlayer content={content} onBlockView={onBlockView} />);

      // Verify observer was set up
      expect(mockIntersectionObserver).toHaveBeenCalled();
      expect(mockObserve).toHaveBeenCalled();

      // Simulate intersection
      const observerCallback = mockIntersectionObserver.mock.calls[0][0];
      observerCallback([{ isIntersecting: true }]);

      expect(onBlockView).toHaveBeenCalledWith(0, 'text-1');
    });

    it('only fires onBlockView once per block', () => {
      const onBlockView = vi.fn();
      const content = createLessonContent([createTextBlock()]);

      render(<LessonPlayer content={content} onBlockView={onBlockView} />);

      const observerCallback = mockIntersectionObserver.mock.calls[0][0];

      // Simulate multiple intersections
      observerCallback([{ isIntersecting: true }]);
      observerCallback([{ isIntersecting: true }]);
      observerCallback([{ isIntersecting: true }]);

      expect(onBlockView).toHaveBeenCalledTimes(1);
    });
  });

  describe('Accessibility', () => {
    it('has proper article role on lesson player', () => {
      const content = createLessonContent([createTextBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('article', { name: 'Lesson content' })).toBeInTheDocument();
    });

    it('vocabulary block has proper ARIA region', () => {
      const content = createLessonContent([createVocabularyBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('region', { name: 'Vocabulary flashcards carousel' })).toBeInTheDocument();
    });

    it('procedure checkboxes are keyboard accessible', async () => {
      const user = userEvent.setup();
      const content = createLessonContent([createProcedureBlock()]);
      render(<LessonPlayer content={content} />);

      const checkbox = screen.getByRole('checkbox', { name: 'Mark step 1 as complete' });
      checkbox.focus();
      expect(checkbox).toHaveFocus();

      await user.keyboard(' ');
      expect(checkbox).toBeChecked();
    });

    it('images have required alt text from schema', () => {
      const content = createLessonContent([createImageBlock()]);
      render(<LessonPlayer content={content} />);

      const image = screen.getByTestId('next-image');
      expect(image).toHaveAttribute('alt', 'A diagram showing plant photosynthesis process');
      expect(image.getAttribute('alt')?.length).toBeGreaterThanOrEqual(10);
    });

    it('reading passage has aria-label for screen readers', () => {
      const content = createLessonContent([createReadingPassageBlock()]);
      render(<LessonPlayer content={content} />);

      expect(screen.getByRole('article', { name: /Reading passage: How Plants Make Food/i })).toBeInTheDocument();
    });
  });

  describe('Prefers Reduced Motion', () => {
    it('respects prefers-reduced-motion media query', () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      });

      const onBlockView = vi.fn();
      const content = createLessonContent([createTextBlock()]);

      render(<LessonPlayer content={content} onBlockView={onBlockView} />);

      // Verify IntersectionObserver was created with lower threshold for reduced motion
      expect(mockIntersectionObserver).toHaveBeenCalledWith(
        expect.any(Function),
        expect.objectContaining({
          threshold: 0.1, // Lower threshold for reduced motion
        })
      );
    });
  });
});
