import Image from "next/image";
import type { ProductPictureFile } from "@/lib/product-pictures";

interface ProductPictureProps {
  picture: ProductPictureFile;
  alt: string;
  /** Loads the picture eagerly for the largest above-the-fold image. */
  priority?: boolean;
}

/**
 * Renders one real product picture at its own proportions, so no crop hides the content.
 * @param props The picture file, its localized alt text, and the optional eager load.
 * @returns The picture element.
 */
export default function ProductPicture({ picture, alt, priority }: ProductPictureProps) {
  return (
    <Image
      src={picture.src}
      alt={alt}
      width={picture.width}
      height={picture.height}
      priority={priority}
      loading={priority ? "eager" : undefined}
      sizes={picture.portrait ? "12rem" : "(min-width: 1024px) 25vw, 100vw"}
      className={
        picture.portrait
          ? "mx-auto h-auto w-full max-w-48 rounded-lg shadow-md"
          : "h-auto w-full rounded-xl shadow-md"
      }
    />
  );
}
