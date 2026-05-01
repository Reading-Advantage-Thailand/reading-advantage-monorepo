import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ImageGallery } from '../image-gallery';
import type { ImageBlock } from '@/lib/schemas/lesson-content.schema';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string }) => {
    const { fill: _fill, priority: _priority, ...rest } = props as Record<string, unknown>;
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} data-testid="next-image" {...rest} />;
  },
}));

const baseImage = (overrides?: Partial<ImageBlock>): ImageBlock => ({
  id: `img-${Math.random()}`,
  type: 'image',
  src: '/images/sample.png',
  alt: 'A helpful science diagram about plants',
  caption: 'English caption',
  captionThai: 'คำบรรยายภาษาไทย',
  aspectRatio: 4 / 3,
  attribution: 'Science Source',
  ...overrides,
});

beforeEach(() => {
  // Mock matchMedia
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: query.includes('prefers-reduced-motion') ? false : false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });

  // Stub global Image for preload calls
  // @ts-expect-error - jsdom Image stub
  global.Image = class {
    src = '';
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('ImageGallery', () => {
  it('renders a single image with caption and attribution', () => {
    render(<ImageGallery images={[baseImage()]} layout="single" />);

    expect(screen.getByAltText(/helpful science diagram/i)).toBeInTheDocument();
    expect(screen.getByText('English caption')).toBeInTheDocument();
    expect(screen.getByText(/Science Source/)).toBeInTheDocument();
  });

  it('shows Thai caption when showThai is true', () => {
    render(<ImageGallery images={[baseImage()]} layout="single" showThai />);
    expect(screen.getByText('คำบรรยายภาษาไทย')).toBeInTheDocument();
  });

  it('renders a grid for multiple images and opens lightbox on click', async () => {
    const user = userEvent.setup();
    render(<ImageGallery images={[baseImage(), baseImage({ alt: 'Second image' })]} layout="grid" />);

    expect(screen.getAllByTestId('gallery-image')).toHaveLength(2);

    await user.click(screen.getAllByTestId('gallery-image')[0]);
    expect(screen.getByTestId('lightbox')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('lightbox')).getByAltText(/helpful science diagram/i)
    ).toBeInTheDocument();
  });

  it('closes lightbox on Escape and navigates with arrow keys', async () => {
    const user = userEvent.setup();
    render(
      <ImageGallery
        images={[baseImage({ alt: 'First' }), baseImage({ alt: 'Second image in lightbox' })]}
        layout="grid"
      />
    );

    await user.click(screen.getAllByTestId('gallery-image')[0]);
    expect(screen.getByTestId('lightbox')).toBeInTheDocument();

    await user.keyboard('{ArrowRight}');
    expect(
      within(screen.getByTestId('lightbox')).getByAltText('Second image in lightbox')
    ).toBeInTheDocument();

    await user.keyboard('{Escape}');
    expect(screen.queryByTestId('lightbox')).not.toBeInTheDocument();
  });

  it('renders carousel with navigation controls and respects reduced motion', async () => {
    const user = userEvent.setup();

    // Force reduced motion
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query.includes('prefers-reduced-motion'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    });

    render(<ImageGallery images={[baseImage(), baseImage({ alt: 'Second slide' })]} layout="carousel" />);

    expect(screen.getByTestId('carousel-active').dataset.reducedMotion).toBe('true');

    await user.click(screen.getByRole('button', { name: /next/i }));
    expect(screen.getByAltText('Second slide')).toBeInTheDocument();
  });

  it('shows a fallback placeholder when an image fails to load', () => {
    render(<ImageGallery images={[baseImage({ src: '/broken.png' })]} layout="single" />);

    const image = screen.getByTestId('next-image');
    fireEvent.error(image);

    expect(screen.getByText(/Image unavailable/i)).toBeInTheDocument();
  });

  it('uses aspect ratio to prevent layout shift', () => {
    render(<ImageGallery images={[baseImage({ aspectRatio: undefined })]} layout="single" />);

    const figure = screen.getByTestId('gallery-image');
    expect(Number(figure.style.aspectRatio)).toBeCloseTo(4 / 3, 2);
  });
});
