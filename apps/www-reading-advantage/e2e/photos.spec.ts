/**
 * Photo checks for the www marketing pages.
 *
 * Track: www_products_photos_20261115 (task 1.1, AC-1).
 *
 * The owner complaint (2026-11-15): "There are two photos on that page there id
 * only one, and it's mostly covered by text". This spec asks the reader's
 * question: does a reader see the photos at every width?
 *
 * A photo is a raster image that passes these rules:
 * - an empty alt, `aria-hidden="true"`, or an ancestor with `aria-hidden="true"`
 *   marks a decorative image; it is not a photo (the home `texture-warm`
 *   background);
 * - an SVG file, a file under `/media/brand/` (brand logos), or an alt that
 *   names a logo, an icon, or a QR code marks a logo or an icon; it is not a
 *   photo;
 * - a rendered short side below 100 px marks a thumbnail; it is not a photo.
 *
 * The cover test walks a 5 x 5 grid over the image box, forces `pointer-events`
 * on every element, and asks `document.elementFromPoint` for the top element.
 * The image or its own wrapper must be the top element.
 *
 * Page set: the www marketing pages whose hero shows a content photo. The hero
 * of `/products/reading-advantage` shows a product logo and a full-bleed
 * background file under the section gradient (a tint, not a content photo), so
 * that page is not in the set (spec.md, AC-1).
 *
 * Red note: these tests fail at HEAD for the covered blended-learning photo,
 * the Tutor section with no picture, the squeezed program cards at 1024 px, and
 * the home hero. They fail at `8193625ca^` for the hidden hero container and for
 * the missing product pictures.
 */
import { test, expect, type Page, type TestInfo } from "@playwright/test";

const WIDTHS = [390, 980, 1024, 1280] as const;
const LOCALES = ["en", "th"] as const;

const GRID = 5;
const MAX_COVERED_PERCENT = 30;
const PHOTO_MIN_SHORT_SIDE_PX = 100;
const ASPECT_TOLERANCE = 0.05;
const VIEWPORT_HEIGHTS: Record<number, number> = {
  390: 844,
  980: 800,
  1024: 800,
  1280: 800,
};

interface PhotoTarget {
  name: string;
  path: string;
  /** A fragment of the hero file, when the page hero shows a content photo. */
  heroSrc?: string;
}

const PAGES: PhotoTarget[] = [
  {
    name: "home",
    path: "/",
    heroSrc: "workbook-tablet-cutaway",
  },
  {
    name: "products",
    path: "/products",
    heroSrc: "small-group.png",
  },
  {
    name: "services-blended-learning",
    path: "/services/blended-learning",
    heroSrc: "blended-learning.png",
  },
  {
    name: "services-managed-service",
    path: "/services/managed-service",
    heroSrc: "teacher-and-dashboard.png",
  },
  {
    name: "pricing",
    path: "/pricing",
    heroSrc: "app-on-desktop.png",
  },
  {
    name: "about",
    path: "/about",
    heroSrc: "teacher-at-board.png",
  },
];

/** The program cards of `/products` (task 1.1, AC-1: Storytime, Primary, Reading, Tutor). */
const PROGRAM_CARDS = [
  { name: "Storytime", testId: "program-card-storytime" },
  { name: "Primary", testId: "program-card-primary" },
  { name: "Reading", testId: "program-card-reading" },
  { name: "Tutor", testId: "program-card-tutor" },
] as const;

/** The product blocks of `/products` that carry a picture (task 1.1, AC-1). */
const PRODUCT_BLOCKS = [
  { name: "Storytime", testId: "product-block-storytimeAdvantage" },
  { name: "Primary", testId: "product-block-primaryAdvantage" },
  { name: "Reading", testId: "product-block-readingAdvantage" },
] as const;

const TUTOR_SECTION_LOGO_SELECTOR = 'img[src*="/square/tutor-advantage.svg"]';

interface PagePhoto {
  mark: string;
  src: string;
  alt: string;
  naturalWidth: number;
  naturalHeight: number;
  width: number;
  height: number;
  visible: boolean;
  blockTestId: string | null;
  inTutorSection: boolean;
}

interface MeasuredPhoto extends PagePhoto {
  loaded: boolean;
  covered: number;
  measuredPoints: number;
  coverageError: string | null;
}

/**
 * Marks every photo on the current page so later steps can find it again.
 * @param page The Playwright page.
 * @returns The photo descriptions, in DOM order.
 */
async function markPhotos(page: Page): Promise<PagePhoto[]> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-delay: 0s !important;
        animation-duration: 0s !important;
        transition: none !important;
        pointer-events: auto !important;
      }
      html, body { scroll-behavior: auto !important; }
    `,
  });

  return page.evaluate((tutorLogoSelector) => {
    const isPhotoElement = (img: HTMLImageElement): boolean => {
      const src = img.currentSrc || img.src || "";
      if (src === "") return false;
      const alt = (img.getAttribute("alt") ?? "").trim();
      if (alt === "") return false;
      if (img.getAttribute("aria-hidden") === "true") return false;
      if (img.closest('[aria-hidden="true"]') !== null) return false;
      if (/\.svg(\?|#|$)/i.test(src)) return false;
      if (/\/media\/brand\//.test(src)) return false;
      if (/\b(qr|logo|icon)\b/i.test(alt)) return false;
      if (/\/(qr|logo|icon)[^/]*\./i.test(src)) return false;
      return true;
    };

    const tutorSection = Array.from(document.querySelectorAll("section")).find(
      (section) => section.querySelector(tutorLogoSelector) !== null,
    );

    const photos: PagePhoto[] = [];
    let index = 0;
    for (const img of Array.from(document.images)) {
      if (!isPhotoElement(img)) continue;
      const mark = String(index);
      index += 1;
      img.setAttribute("data-photo-check", mark);
      const rect = img.getBoundingClientRect();
      const block = img.closest(
        '[data-testid^="program-card-"], [data-testid^="product-block-"]',
      ) as HTMLElement | null;
      photos.push({
        mark,
        src: img.currentSrc || img.src,
        alt: (img.getAttribute("alt") ?? "").trim(),
        naturalWidth: img.naturalWidth,
        naturalHeight: img.naturalHeight,
        width: rect.width,
        height: rect.height,
        visible: img.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }),
        blockTestId: block?.dataset.testid ?? null,
        inTutorSection: tutorSection?.contains(img) ?? false,
      });
    }
    return photos;
  }, TUTOR_SECTION_LOGO_SELECTOR);
}

/**
 * The measured state of one photo: load, final box, and covered share.
 * @param loaded True when the browser decoded the file.
 * @param visible True when the photo shows at this width.
 * @param width The rendered width in CSS pixels.
 * @param height The rendered height in CSS pixels.
 * @param naturalWidth The file width in pixels.
 * @param naturalHeight The file height in pixels.
 * @param covered The grid points where the photo is not the top element.
 * @param measuredPoints The grid points that could be measured.
 * @param coverageError A reason when the grid could not run.
 */
interface PhotoMeasurement {
  loaded: boolean;
  visible: boolean;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  covered: number;
  measuredPoints: number;
  coverageError: string | null;
}

/**
 * Scrolls one photo into view, waits for it to load, and measures its coverage.
 * @param page The Playwright page.
 * @param mark The `data-photo-check` mark of the photo.
 * @returns The load state, the final box, and the covered point count.
 */
async function measurePhoto(page: Page, mark: string): Promise<PhotoMeasurement> {
  const state = await page.evaluate(async (photoMark) => {
    const img = document.querySelector(
      `[data-photo-check="${photoMark}"]`,
    ) as HTMLImageElement | null;
    if (img === null) return { rendered: false, visible: false, loaded: false };
    img.scrollIntoView({ block: "center", inline: "center" });
    const frame = () =>
      new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
    await frame();
    await frame();
    const visible = img.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
    if (!visible) {
      return { rendered: false, visible: false, loaded: img.complete && img.naturalWidth > 0 };
    }
    for (let attempt = 0; attempt < 100; attempt += 1) {
      if (img.complete && img.naturalWidth > 0) break;
      await new Promise<void>((resolve) => setTimeout(resolve, 50));
    }
    await frame();
    return {
      rendered: true,
      visible: true,
      loaded: img.complete && img.naturalWidth > 0,
    };
  }, mark);

  const box = await page.evaluate((photoMark) => {
    const img = document.querySelector(
      `[data-photo-check="${photoMark}"]`,
    ) as HTMLImageElement | null;
    if (img === null) {
      return { width: 0, height: 0, naturalWidth: 0, naturalHeight: 0 };
    }
    const rect = img.getBoundingClientRect();
    return {
      width: rect.width,
      height: rect.height,
      naturalWidth: img.naturalWidth,
      naturalHeight: img.naturalHeight,
    };
  }, mark);

  if (!state.rendered) {
    return {
      ...box,
      loaded: state.loaded,
      visible: false,
      covered: 0,
      measuredPoints: 0,
      coverageError: "not rendered",
    };
  }

  const coverage = await page.evaluate(
    async ({ photoMark, grid }) => {
      const img = document.querySelector(
        `[data-photo-check="${photoMark}"]`,
      ) as HTMLImageElement | null;
      if (img === null) {
        return { covered: 0, measured: 0, error: "image not found" };
      }
      const frame = () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
      const isImageOrWrapper = (element: Element | null): boolean => {
        if (element === null) return false;
        if (element === img) return true;
        if (!element.contains(img)) return false;
        const text = (element.textContent ?? "").trim();
        return text === "" && element.querySelectorAll("img").length === 1;
      };
      const isFixedPageHeader = (element: Element | null): boolean => {
        if (element === null) return false;
        const header = element.closest("header");
        if (header === null) return false;
        return getComputedStyle(header).position === "fixed";
      };
      // A scaled image is clipped by an ancestor with overflow. The grid covers the
      // visible box only, because the clipped part shows no photo.
      const visibleBox = () => {
        const rect = img.getBoundingClientRect();
        let left = rect.left;
        let top = rect.top;
        let right = rect.right;
        let bottom = rect.bottom;
        let ancestor = img.parentElement;
        while (ancestor !== null && ancestor !== document.documentElement) {
          const style = getComputedStyle(ancestor);
          const box = ancestor.getBoundingClientRect();
          if (style.overflowX !== "visible") {
            left = Math.max(left, box.left);
            right = Math.min(right, box.right);
          }
          if (style.overflowY !== "visible") {
            top = Math.max(top, box.top);
            bottom = Math.min(bottom, box.bottom);
          }
          ancestor = ancestor.parentElement;
        }
        return {
          left,
          top,
          width: Math.max(0, right - left),
          height: Math.max(0, bottom - top),
        };
      };

      let covered = 0;
      let measured = 0;
      let offscreen = 0;
      let chrome = 0;
      for (let row = 0; row < grid; row += 1) {
        let box = visibleBox();
        if (box.width <= 0 || box.height <= 0) {
          return { covered: 0, measured: 0, error: "not rendered" };
        }
        const rowCenter = box.top + (box.height * (row + 0.5)) / grid;
        if (Math.abs(rowCenter - window.innerHeight / 2) > 4) {
          window.scrollBy(0, rowCenter - window.innerHeight / 2);
          await frame();
          await frame();
          box = visibleBox();
        }
        const y = box.top + (box.height * (row + 0.5)) / grid;
        for (let column = 0; column < grid; column += 1) {
          const x = box.left + (box.width * (column + 0.5)) / grid;
          if (y < 0 || y > window.innerHeight || x < 0 || x > window.innerWidth) {
            offscreen += 1;
            continue;
          }
          const top = document.elementFromPoint(x, y);
          if (isFixedPageHeader(top)) {
            chrome += 1;
            continue;
          }
          measured += 1;
          if (!isImageOrWrapper(top)) covered += 1;
        }
      }
      if (measured === 0) {
        return {
          covered: 0,
          measured: 0,
          error: `no measurable point (offscreen=${offscreen}, chrome=${chrome})`,
        };
      }
      return { covered, measured, error: null };
    },
    { photoMark: mark, grid: GRID },
  );

  return {
    ...box,
    loaded: state.loaded,
    visible: true,
    covered: coverage.covered,
    measuredPoints: coverage.measured,
    coverageError: coverage.error,
  };
}

/**
 * Measures every photo of the current page.
 * @param page The Playwright page.
 * @returns The photos with their load state, final box, and coverage.
 */
async function measureAllPhotos(page: Page): Promise<MeasuredPhoto[]> {
  const photos = await markPhotos(page);
  const measured: MeasuredPhoto[] = [];
  for (const photo of photos) {
    measured.push({ ...photo, ...(await measurePhoto(page, photo.mark)) });
  }
  return measured;
}

/**
 * Tells whether a photo has a rendered short side of at least 100 px.
 * @param photo The measured photo.
 * @returns True when the short side is at least 100 px.
 */
function isPhotoSize(photo: MeasuredPhoto): boolean {
  return (
    photo.visible &&
    Math.min(photo.width, photo.height) >= PHOTO_MIN_SHORT_SIDE_PX
  );
}

/**
 * Formats one photo for an assertion message.
 * @param photo The measured photo.
 * @returns A short label with the file name and the rendered size.
 */
function label(photo: MeasuredPhoto): string {
  const file = photo.src.split("/").pop() ?? photo.src;
  return `${file} ${Math.round(photo.width)}x${Math.round(photo.height)}`;
}

/**
 * Opens one page at one locale and width.
 * @param page The Playwright page.
 * @param locale The locale prefix.
 * @param target The page target.
 * @returns Nothing.
 */
async function openPage(
  page: Page,
  locale: (typeof LOCALES)[number],
  target: PhotoTarget,
): Promise<void> {
  const suffix = target.path === "/" ? "" : target.path;
  const response = await page.goto(`/${locale}${suffix}`, { waitUntil: "load" });
  expect.soft(response?.status(), `status of /${locale}${suffix}`).toBe(200);
}

/**
 * Formats one measured photo as a single report line.
 * @param photo The measured photo.
 * @returns The file, the natural size, the rendered size, the state, and the covered share.
 */
function photoRow(photo: MeasuredPhoto): string {
  const covered =
    photo.measuredPoints > 0
      ? `${((photo.covered / photo.measuredPoints) * 100).toFixed(0)}%`
      : "n/a";
  const parts = [
    `src=${photo.src.split("/").pop() ?? photo.src}`,
    `natural=${photo.naturalWidth}x${photo.naturalHeight}`,
    `rendered=${Math.round(photo.width)}x${Math.round(photo.height)}`,
    `loaded=${photo.loaded}`,
    `visible=${photo.visible}`,
    `covered=${covered}`,
  ];
  if (photo.coverageError !== null) parts.push(`coverageError=${photo.coverageError}`);
  if (photo.blockTestId !== null) parts.push(`block=${photo.blockTestId}`);
  if (photo.inTutorSection) parts.push("tutor-section");
  return parts.join(" ");
}

/**
 * Writes the photo report of a failing case to the run log and to the report.
 * @param where The page, locale, and width of the case.
 * @param photos Every measured photo of the page.
 * @param problems The named problems of the case.
 * @param testInfo The Playwright test info of the case.
 * @returns Nothing.
 */
async function reportProblems(
  where: { page: string; locale: string; width: number },
  photos: MeasuredPhoto[],
  problems: string[],
  testInfo: TestInfo,
): Promise<void> {
  const head = `photo report: ${where.page} ${where.locale} at ${where.width} px`;
  console.log(
    [
      head,
      ...problems.map((problem) => `  problem: ${problem}`),
      ...photos.map((photo) => `  ${photoRow(photo)}`),
    ].join("\n"),
  );
  await testInfo.attach(`photo-report-${where.page}-${where.locale}-${where.width}`, {
    body: JSON.stringify({ ...where, problems, photos }, null, 2),
    contentType: "application/json",
  });
}

test.describe("www marketing photos", () => {
  for (const width of WIDTHS) {
    test.describe(`${width} px`, () => {
      test.use({ viewport: { width, height: VIEWPORT_HEIGHTS[width] ?? 800 } });

      for (const locale of LOCALES) {
        for (const target of PAGES) {
          test(`${target.name} ${locale}: photos load, show, and stay uncovered`, async ({
            page,
          }, testInfo) => {
            test.setTimeout(120_000);
            await openPage(page, locale, target);
            const photos = await measureAllPhotos(page);
            const counted = photos.filter(isPhotoSize);
            const problems: string[] = [];

            for (const photo of photos) {
              if (!photo.visible) {
                problems.push(`${label(photo)} is not visible at this width`);
                continue;
              }
              if (!photo.loaded) {
                problems.push(`${label(photo)} is not loaded`);
              }
            }

            for (const photo of counted) {
              if (photo.coverageError !== null) {
                problems.push(
                  `${label(photo)} could not be measured: ${photo.coverageError}`,
                );
                continue;
              }
              const percent = (photo.covered / photo.measuredPoints) * 100;
              if (percent > MAX_COVERED_PERCENT) {
                problems.push(
                  `${label(photo)} is ${percent.toFixed(0)} percent covered (max ${MAX_COVERED_PERCENT})`,
                );
              }
            }

            if (target.heroSrc !== undefined) {
              const heroSrc = target.heroSrc;
              const hero = counted.filter((photo) => photo.src.includes(heroSrc));
              if (hero.length === 0) {
                problems.push(`the hero photo ${heroSrc} does not show at this width`);
              }
            }

            if (problems.length > 0) {
              await reportProblems(
                { page: target.path, locale, width },
                photos,
                problems,
                testInfo,
              );
            }
            expect(problems.length, problems.join("\n")).toBe(0);
          });
        }
      }
    });
  }
});

test.describe("www products photos", () => {
  for (const width of WIDTHS) {
    test.describe(`${width} px`, () => {
      test.use({ viewport: { width, height: VIEWPORT_HEIGHTS[width] ?? 800 } });

      for (const locale of LOCALES) {
        test(`products ${locale}: one photo in each program card and product block`, async ({
          page,
        }, testInfo) => {
          test.setTimeout(120_000);
          await openPage(page, locale, { name: "products", path: "/products" });
          const photos = await measureAllPhotos(page);
          const counted = photos.filter(isPhotoSize);
          const problems: string[] = [];

          for (const card of PROGRAM_CARDS) {
            const cardPhotos = counted.filter(
              (photo) => photo.blockTestId === card.testId,
            );
            if (cardPhotos.length === 0) {
              problems.push(`the ${card.name} program card shows no photo`);
            }
          }

          for (const block of PRODUCT_BLOCKS) {
            const blockPhotos = counted.filter(
              (photo) => photo.blockTestId === block.testId,
            );
            if (blockPhotos.length === 0) {
              problems.push(`the ${block.name} product block shows no photo`);
            }
          }

          const tutorPhotos = counted.filter((photo) => photo.inTutorSection);
          if (tutorPhotos.length === 0) {
            problems.push("the Tutor section shows no photo");
          }

          const productPictures = photos.filter(
            (photo) => photo.blockTestId !== null && photo.loaded,
          );
          for (const photo of productPictures) {
            const naturalAspect =
              photo.naturalWidth > 0 && photo.naturalHeight > 0
                ? photo.naturalWidth / photo.naturalHeight
                : 0;
            const renderedAspect = photo.height > 0 ? photo.width / photo.height : 0;
            const deviation =
              naturalAspect > 0
                ? Math.abs(renderedAspect - naturalAspect) / naturalAspect
                : 1;
            if (deviation > ASPECT_TOLERANCE) {
              problems.push(
                `${label(photo)} does not keep its natural aspect within 5 percent (deviation ${(deviation * 100).toFixed(1)} percent)`,
              );
            }
            if (Math.min(photo.width, photo.height) < PHOTO_MIN_SHORT_SIDE_PX) {
              problems.push(
                `${label(photo)} has a short side below ${PHOTO_MIN_SHORT_SIDE_PX} px`,
              );
            }
          }

          if (problems.length > 0) {
            await reportProblems(
              { page: "/products", locale, width },
              photos,
              problems,
              testInfo,
            );
          }
          expect(problems.length, problems.join("\n")).toBe(0);
        });
      }
    });
  }
});
