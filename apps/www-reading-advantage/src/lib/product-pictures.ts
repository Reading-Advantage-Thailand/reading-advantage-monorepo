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

/**
 * The five Tutor Advantage student screens of the gallery (spec 6.2, task 3.4).
 * Source set: `advantage-pr/assets/screenshots/tutor-advantage/dev-2026-11-16/`,
 * version 2.0, 2026-11-17. Each file is a webp at its delivered size, made by
 * `scripts/blur-tutor-screens.py`. The keys follow the gallery slot order of
 * PR section 2. No tutor screen ships.
 */
export const tutorScreens = {
  guidedWriting: {
    src: "/images/products/tutor-advantage/student-mobile/040-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  shortAnswer: {
    src: "/images/products/tutor-advantage/student-mobile/002-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  feedback: {
    src: "/images/products/tutor-advantage/student-mobile/004-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  selfReflection: {
    src: "/images/products/tutor-advantage/student-mobile/052-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
  classRecord: {
    src: "/images/products/tutor-advantage/student-mobile/064-screen.webp",
    width: 520,
    height: 1125,
    portrait: false,
  },
} as const satisfies Record<string, ProductPictureFile>;
