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
 * An app capture with art direction: the phone capture in a phone frame on phones, and the
 * desktop capture in a screen frame from 768 px, so a phone never gets the small desktop capture.
 * @param props.phone The phone capture.
 * @param props.desktop The desktop capture of the same page.
 * @param props.alt The alt text, true for both captures.
 * @param props.className Extra classes.
 * @returns The framed capture.
 */
export function ResponsiveShot({ phone, desktop, alt, className }: { phone: LandingPicture; desktop: LandingPicture; alt: string; className?: string }) {
  return (
    <div className={cn("cq-shot mx-auto w-full max-w-48 md:max-w-none", className)}>
      <picture>
        <source media="(min-width: 768px)" srcSet={desktop.src} width={desktop.width} height={desktop.height} />
        <img src={phone.src} alt={alt} width={phone.width} height={phone.height} loading="lazy" decoding="async" />
      </picture>
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
