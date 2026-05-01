'use client';

import NextImage from 'next/image';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type TouchEvent,
} from 'react';

import { cn } from '@/lib/utils';
import type { ImageBlock } from '@/lib/schemas/lesson-content.schema';

export type ImageGalleryLayout = 'single' | 'grid' | 'carousel';

export interface ImageGalleryProps {
  images: ImageBlock[];
  showThai?: boolean;
  layout?: ImageGalleryLayout;
  className?: string;
}

type ActiveLayout = ImageGalleryLayout;

function usePrefersReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(media.matches);

    onChange();
    media.addEventListener('change', onChange);

    return () => media.removeEventListener('change', onChange);
  }, []);

  return reducedMotion;
}

function useTouchNavigation(onSwipeLeft: () => void, onSwipeRight: () => void) {
  const startXRef = useRef<number | null>(null);

  const onTouchStart = (event: TouchEvent) => {
    startXRef.current = event.touches[0]?.clientX ?? null;
  };

  const onTouchEnd = (event: TouchEvent) => {
    if (startXRef.current === null) return;
    const endX = event.changedTouches[0]?.clientX ?? startXRef.current;
    const delta = endX - startXRef.current;

    if (Math.abs(delta) > 40) {
      if (delta < 0) onSwipeLeft();
      else onSwipeRight();
    }

    startXRef.current = null;
  };

  return { onTouchStart, onTouchEnd };
}

function getCaption(image: ImageBlock, showThai?: boolean) {
  return showThai && image.captionThai ? image.captionThai : image.caption;
}

function getAspectStyle(image: ImageBlock) {
  return { aspectRatio: image.aspectRatio ?? 4 / 3 };
}

function buildBlurPlaceholder() {
  // Simple neutral blur placeholder to avoid CLS flash before load
  return (
    <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-slate-200 via-slate-100 to-slate-200" />
  );
}

function Lightbox({
  images,
  activeIndex,
  onClose,
  onNavigate,
  showThai,
}: {
  images: ImageBlock[];
  activeIndex: number;
  onClose: () => void;
  onNavigate: (direction: 'prev' | 'next') => void;
  showThai?: boolean;
}) {
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    previousFocusRef.current = document.activeElement as HTMLElement;
    closeButtonRef.current?.focus();

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowRight') {
        onNavigate('next');
      }
      if (event.key === 'ArrowLeft') {
        onNavigate('prev');
      }
      if (event.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'button, [href], [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (focusable.length === 0) return;

        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKey);

    return () => {
      document.removeEventListener('keydown', handleKey);
      if (previousFocusRef.current) {
        previousFocusRef.current.focus();
      }
    };
  }, [onClose, onNavigate]);

  useEffect(() => {
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => {
      body.style.overflow = prevOverflow;
    };
  }, []);

  const image = images[activeIndex];
  const caption = getCaption(image, showThai);

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      data-testid="lightbox"
      onClick={onClose}
    >
      <button
        ref={closeButtonRef}
        aria-label="Close"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 px-3 py-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
      >
        ✕
      </button>

      <div
        className={cn(
          'relative flex h-full w-full max-w-5xl flex-col items-center justify-center gap-3 rounded-xl bg-gray-950/30 p-4 shadow-2xl',
          reducedMotion ? '' : 'transition'
        )}
        onClick={(event) => event.stopPropagation()}
        ref={dialogRef}
      >
        <div
          className="relative w-full overflow-hidden rounded-lg bg-gray-900"
          style={getAspectStyle(image)}
        >
          <NextImage
            src={image.src}
            alt={image.alt}
            fill
            className="object-contain"
            sizes="100vw"
            priority
          />
        </div>

        {(caption || image.attribution) && (
          <div className="w-full text-center text-sm text-gray-100">
            {caption && <p>{caption}</p>}
            {image.attribution && (
              <p className="mt-1 text-xs text-gray-300">
                Source: {image.attribution}
              </p>
            )}
          </div>
        )}

        {images.length > 1 && (
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('prev')}
              className="rounded-full bg-white/10 px-3 py-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Previous image"
            >
              ←
            </button>
            <button
              onClick={() => onNavigate('next')}
              className="rounded-full bg-white/10 px-3 py-2 text-white transition hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-white"
              aria-label="Next image"
            >
              →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ImageGallery({
  images,
  showThai = false,
  layout = 'single',
  className,
}: ImageGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [failedImages, setFailedImages] = useState<Set<number>>(new Set());
  const [loadedImages, setLoadedImages] = useState<Set<number>>(new Set());
  const reducedMotion = usePrefersReducedMotion();

  const handleNavigate = useCallback(
    (direction: 'next' | 'prev') => {
      setActiveIndex((current) => {
        if (direction === 'next') {
          return (current + 1) % images.length;
        }
        return (current - 1 + images.length) % images.length;
      });
    },
    [images.length]
  );

  const touchNav = useTouchNavigation(
    () => handleNavigate('next'),
    () => handleNavigate('prev')
  );

  const activeLayout: ActiveLayout = useMemo(() => {
    if (layout) return layout;
    return images.length > 1 ? 'grid' : 'single';
  }, [images.length, layout]);

  useEffect(() => {
    if (images.length <= 1) return;
    const preloadIndices = [activeIndex - 1, activeIndex + 1].filter(
      (i) => i >= 0 && i < images.length
    );
    preloadIndices.forEach((i) => {
      if (typeof window === 'undefined' || typeof window.Image === 'undefined')
        return;
      const img = new window.Image();
      img.src = images[i]?.src ?? '';
    });
  }, [activeIndex, images]);

  if (!images?.length) return null;

  const captionFor = (image: ImageBlock) => getCaption(image, showThai);

  function handleImageError(index: number) {
    setFailedImages((prev) => new Set(prev).add(index));
    // Avoid broken icon flash by logging and swapping to placeholder
    console.warn('Image failed to load', { src: images[index]?.src });
  }

  function handleImageLoad(index: number) {
    setLoadedImages((prev) => new Set(prev).add(index));
  }

  function openLightbox(index: number) {
    setActiveIndex(index);
    setLightboxOpen(true);
  }

  function renderCaption(image: ImageBlock) {
    const caption = captionFor(image);
    if (!caption && !image.attribution) return null;

    return (
      <figcaption className="mt-2 text-center text-sm text-gray-700 dark:text-gray-300">
        {caption && <p>{caption}</p>}
        {image.attribution && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Source: {image.attribution}
          </p>
        )}
      </figcaption>
    );
  }

  function renderPlaceholder() {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-lg bg-gray-100 text-sm text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Image unavailable
      </div>
    );
  }

  function renderImage(
    image: ImageBlock,
    index: number,
    variant: 'thumb' | 'full'
  ) {
    const isFailed = failedImages.has(index);
    const isLoaded = loadedImages.has(index);

    const sizes =
      variant === 'thumb'
        ? '(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 300px'
        : '(max-width: 768px) 100vw, (max-width: 1200px) 75vw, 900px';

    return (
      <div
        key={image.id ?? image.src ?? index}
        className={cn(
          'relative w-full overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900',
          variant === 'thumb' ? 'cursor-zoom-in' : 'cursor-default'
        )}
        style={getAspectStyle(image)}
        data-testid="gallery-image"
        onClick={variant === 'thumb' ? () => openLightbox(index) : undefined}
        onKeyDown={
          variant === 'thumb'
            ? (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  openLightbox(index);
                }
              }
            : undefined
        }
        role={variant === 'thumb' ? 'button' : undefined}
        tabIndex={variant === 'thumb' ? 0 : undefined}
      >
        {!isLoaded && !isFailed && buildBlurPlaceholder()}

        {isFailed ? (
          renderPlaceholder()
        ) : (
          <NextImage
            src={image.src}
            alt={image.alt}
            fill
            className={cn('object-contain', !isLoaded && 'opacity-0')}
            sizes={sizes}
            onError={() => handleImageError(index)}
            onLoad={() => handleImageLoad(index)}
          />
        )}
      </div>
    );
  }

  function renderSingle() {
    const image = images[0];
    return (
      <figure className={cn('flex flex-col items-center gap-2', className)}>
        {renderImage(image, 0, 'full')}
        {renderCaption(image)}
      </figure>
    );
  }

  function renderGrid() {
    return (
      <div className={cn('flex flex-col gap-3', className)}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-4">
          {images.map((image, index) => (
            <div key={image.id ?? index}>
              {renderImage(image, index, 'thumb')}
              <div className="mt-2 text-center text-xs text-gray-600 dark:text-gray-400">
                {getCaption(image, showThai)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  function renderCarousel() {
    const current = images[activeIndex];

    return (
      <div
        className={cn('flex flex-col gap-3', className)}
        {...touchNav}
        data-reduced-motion={reducedMotion ? 'true' : 'false'}
      >
        <figure className="flex flex-col items-center gap-2">
          <div
            className={cn(
              'relative w-full overflow-hidden rounded-lg bg-gray-50 dark:bg-gray-900',
              reducedMotion ? '' : 'transition'
            )}
            style={getAspectStyle(current)}
            data-testid="carousel-active"
            data-reduced-motion={reducedMotion ? 'true' : 'false'}
          >
            {renderImage(current, activeIndex, 'full')}
          </div>
          {renderCaption(current)}
        </figure>

        {images.length > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleNavigate('prev')}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                aria-label="Previous"
              >
                Prev
              </button>
              <button
                type="button"
                onClick={() => handleNavigate('next')}
                className="rounded-md border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:border-gray-700 dark:text-gray-100 dark:hover:bg-gray-800"
                aria-label="Next"
              >
                Next
              </button>
            </div>

            <div
              className="flex items-center gap-2"
              aria-label="Slide indicators"
            >
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setActiveIndex(index)}
                  aria-label={`Go to slide ${index + 1}`}
                  className={cn(
                    'h-2 w-2 rounded-full transition',
                    activeIndex === index
                      ? 'bg-blue-600 dark:bg-blue-400'
                      : 'bg-gray-300 dark:bg-gray-700'
                  )}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      {activeLayout === 'single' && renderSingle()}
      {activeLayout === 'grid' && renderGrid()}
      {activeLayout === 'carousel' && renderCarousel()}

      {lightboxOpen && (
        <Lightbox
          images={images}
          activeIndex={activeIndex}
          onClose={() => setLightboxOpen(false)}
          onNavigate={handleNavigate}
          showThai={showThai}
        />
      )}
    </>
  );
}
