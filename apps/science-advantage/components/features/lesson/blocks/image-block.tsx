'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';
import type { ImageBlock as ImageBlockType } from '@/lib/schemas/lesson-content.schema';

interface ImageBlockProps {
  block: ImageBlockType;
  showThai?: boolean;
  className?: string;
}

/**
 * ImageBlock component renders an image with caption and attribution.
 * PLACEHOLDER: Will be enhanced with lightbox functionality in #148.
 * Uses aspectRatio if provided to prevent CLS (Cumulative Layout Shift).
 */
export function ImageBlock({ block, showThai = false, className }: ImageBlockProps) {
  const caption = showThai && block.captionThai ? block.captionThai : block.caption;

  // Calculate aspect ratio styles to prevent CLS
  // Use 16/9 as default aspect ratio if not provided
  const aspectStyles = { aspectRatio: block.aspectRatio ?? 16 / 9 };

  return (
    <figure
      className={cn('flex flex-col items-center gap-2', className)}
      data-block-type="image"
      data-block-id={block.id}
    >
      <div
        className="relative w-full max-w-2xl overflow-hidden rounded-lg bg-gray-100 dark:bg-gray-800"
        style={aspectStyles}
      >
        <Image
          src={block.src}
          alt={block.alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 672px"
        />
      </div>
      {(caption || block.attribution) && (
        <figcaption className="text-center text-sm text-gray-600 dark:text-gray-400">
          {caption && <p>{caption}</p>}
          {block.attribution && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-500">
              Source: {block.attribution}
            </p>
          )}
        </figcaption>
      )}
    </figure>
  );
}
