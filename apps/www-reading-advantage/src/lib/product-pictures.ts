/**
 * A real product picture shown on the products page.
 * The files live in `public/images/products/`. Each file comes from a current
 * screenshot set or a printed cover; the hand-off MANIFEST names the source.
 */
export interface ProductPictureFile {
  /** Public path of the optimized web file. */
  src: string;
  /** Pixel width of the file. */
  width: number;
  /** Pixel height of the file. */
  height: number;
  /** True for a tall picture (a book cover or a phone screen). */
  portrait: boolean;
}

export const productPictures = {
  storytimeCard: {
    src: "/images/products/storytime-reader-card.webp",
    width: 534,
    height: 360,
    portrait: false,
  },
  storytimeSound: {
    src: "/images/products/storytime-sound-card.webp",
    width: 544,
    height: 600,
    portrait: false,
  },
  primaryCover: {
    src: "/images/products/primary-origins-2-cover.webp",
    width: 480,
    height: 651,
    portrait: true,
  },
  primaryLesson: {
    src: "/images/products/primary-lesson-intro.webp",
    width: 944,
    height: 502,
    portrait: false,
  },
  readingCover: {
    src: "/images/products/reading-origins-2-cover.webp",
    width: 480,
    height: 651,
    portrait: true,
  },
  tutorFlashcard: {
    src: "/images/products/tutor-flashcard.webp",
    width: 520,
    height: 647,
    portrait: true,
  },
} as const satisfies Record<string, ProductPictureFile>;
