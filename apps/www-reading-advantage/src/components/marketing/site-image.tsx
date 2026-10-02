import type { SiteImage } from "@/lib/site-assets";

type SiteImageProps = {
  image: SiteImage;
  alt: string;
  sizes?: string;
  priority?: boolean;
  className?: string;
};

/**
 * Renders a site image with its 800 and 1600 pixel files. Image optimization is
 * off in next.config.ts, so the browser picks the file from `srcSet`.
 * @param props The manifest entry, the localized alt text, and layout hints.
 * @returns A responsive img element. Pass alt="" only for decorative images.
 */
export function SiteImageView({ image, alt, sizes = "100vw", priority, className }: SiteImageProps) {
  return (
    <img
      src={image.lg}
      srcSet={`${image.sm} 800w, ${image.lg} 1600w`}
      sizes={sizes}
      width={image.width}
      height={image.height}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={className}
    />
  );
}
