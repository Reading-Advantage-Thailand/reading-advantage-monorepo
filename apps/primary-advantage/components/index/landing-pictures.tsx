import type { LandingPicture } from "@/configs/landing";
import { cn } from "@/lib/utils";

type PictureProps = { picture: LandingPicture; alt: string; className?: string; eager?: boolean };

/**
 * The image of a public page picture at its own size; the first picture of a page loads at once.
 * @param props.picture The picture.
 * @param props.alt The alt text.
 * @param props.eager True for the first picture of the page.
 * @returns The image.
 */
function Picture({ picture, alt, eager }: Omit<PictureProps, "className">) {
  return (
    <img
      src={picture.src}
      alt={alt}
      width={picture.width}
      height={picture.height}
      loading={eager ? "eager" : "lazy"}
      fetchPriority={eager ? "high" : undefined}
      decoding="async"
    />
  );
}

/**
 * An app capture in a phone frame.
 * @param props.picture The phone capture.
 * @param props.alt The alt text.
 * @param props.className Extra classes (the width).
 * @param props.eager True for the first picture of the page.
 * @returns The framed capture.
 */
export function PhoneShot({ className, ...picture }: PictureProps) {
  return (
    <div className={cn("cq-phone mx-auto w-full max-w-64", className)}>
      <Picture {...picture} />
    </div>
  );
}

/**
 * An app capture in a desktop screen frame.
 * @param props.picture The desktop capture.
 * @param props.alt The alt text.
 * @param props.className Extra classes (the width).
 * @returns The framed capture.
 */
export function ScreenShot({ className, ...picture }: PictureProps) {
  return (
    <div className={cn("cq-screen w-full", className)}>
      <Picture {...picture} />
    </div>
  );
}

/**
 * A printed workbook as a book: the flat front cover with a spine crease, the page block, and a
 * shadow (spec PP-5).
 * @param props.picture The flat front cover.
 * @param props.alt The alt text, which names the book in the picture.
 * @param props.className Extra classes (the width).
 * @returns The book.
 */
export function BookMockup({ className, ...picture }: PictureProps) {
  return (
    <div className={cn("cq-book mx-auto w-full max-w-60", className)}>
      <div>
        <Picture {...picture} />
      </div>
    </div>
  );
}
