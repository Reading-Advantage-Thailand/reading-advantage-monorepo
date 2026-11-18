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
  textOverlapShare: number;
  textOverlapLabels: string[];
}
/** The share of the photo area that visible text boxes may cover (task 1.1, R1). */
const MAX_TEXT_OVERLAP_PERCENT = 10;

/**
 * Product picture files that sit in a product area but live outside `/images/products/`.
 * The report-results card of `/products` shows this file (b2b-solutions.tsx).
 */
const PRODUCT_EXTRA_PICTURE_FILES = ["/images/blended-learning.png"];

/**
 * Marks every photo on the current page so later steps can find it again.
 * @param page The Playwright page.
 * @returns The photo descriptions and the broken images of the page main content.
 */
async function markPhotos(
  page: Page,
): Promise<{ photos: PagePhoto[]; brokenImages: string[] }> {
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
      // A badge file needs both signals: a file name that starts with qr, logo, or
      // icon, and an alt that names a logo, an icon, or a QR code.
      const fileName = src.split("/").pop() ?? "";
      const startsWithBadge = /^(qr|logo|icon)([-_.]|$)/i.test(fileName);
      const altNamesBadge = /\b(qr|logo|icon)\b/i.test(alt);
      if (startsWithBadge && altNamesBadge) return false;
      return true;
    };

    const tutorSection = Array.from(document.querySelectorAll("section")).find(
      (section) => section.querySelector(tutorLogoSelector) !== null,
    );

    // An image in the page main content with no src never loads, and a reader sees
    // nothing. That was the original bug, so it fails the test and is not skipped.
    const brokenImages: string[] = [];
    for (const img of Array.from(document.querySelectorAll<HTMLImageElement>("main img"))) {
      const src = img.currentSrc || img.src || "";
      if (src !== "") continue;
      const alt = (img.getAttribute("alt") ?? "").trim();
      brokenImages.push(
        `an image in the main content has no src (alt="${alt}", class="${img.getAttribute("class") ?? ""}")`,
      );
    }

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
    return { photos, brokenImages };
  }, TUTOR_SECTION_LOGO_SELECTOR);
}

/** The measured state of one photo. */
type PhotoMeasurement = {
  loaded: boolean;
  visible: boolean;
  width: number;
  height: number;
  naturalWidth: number;
  naturalHeight: number;
  covered: number;
  measuredPoints: number;
  coverageError: string | null;
  textOverlapShare: number;
  textOverlapLabels: string[];
};

/**
 * Scrolls one photo into view, waits for it to load, and measures its coverage.
 * @param page The Playwright page.
 * @param mark The `data-photo-check` mark of the photo.
 * @returns The load state, the final box, the covered point count, and the text share.
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
      textOverlapShare: 0,
      textOverlapLabels: [],
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

  const text = await measureTextOverlap(page, mark);

  return {
    ...box,
    loaded: state.loaded,
    visible: true,
    covered: coverage.covered,
    measuredPoints: coverage.measured,
    coverageError: coverage.error,
    textOverlapShare: text.share,
    textOverlapLabels: text.labels,
  };
}

/**
 * Measures the share of the photo area that visible text boxes cover.
 *
 * A text box is an element with non-empty own text. The measure skips the photo's
 * own ancestors and a figcaption that sits below the photo. The share is the area
 * of the union of the clipped text boxes, over the visible photo area.
 *
 * @param page The Playwright page.
 * @param mark The `data-photo-check` mark of the photo.
 * @returns The union share and up to three labels of the boxes that overlap.
 */
async function measureTextOverlap(
  page: Page,
  mark: string,
): Promise<{ share: number; labels: string[] }> {
  return page.evaluate((photoMark) => {
    const img = document.querySelector(
      `[data-photo-check="${photoMark}"]`,
    ) as HTMLImageElement | null;
    if (img === null) return { share: 0, labels: [] as string[] };

    const rect = img.getBoundingClientRect();
    let left = rect.left;
    let top = rect.top;
    let right = rect.right;
    let bottom = rect.bottom;
    let ancestor = img.parentElement;
    while (ancestor !== null && ancestor !== document.documentElement) {
      const style = getComputedStyle(ancestor);
      const ancestorBox = ancestor.getBoundingClientRect();
      if (style.overflowX !== "visible") {
        left = Math.max(left, ancestorBox.left);
        right = Math.min(right, ancestorBox.right);
      }
      if (style.overflowY !== "visible") {
        top = Math.max(top, ancestorBox.top);
        bottom = Math.min(bottom, ancestorBox.bottom);
      }
      ancestor = ancestor.parentElement;
    }
    const box = {
      left,
      top,
      right,
      bottom,
      width: Math.max(0, right - left),
      height: Math.max(0, bottom - top),
    };
    if (box.width <= 0 || box.height <= 0) return { share: 0, labels: [] as string[] };

    const hasOwnText = (element: Element): boolean => {
      for (const node of Array.from(element.childNodes)) {
        if (node.nodeType === Node.TEXT_NODE && (node.textContent ?? "").trim() !== "") {
          return true;
        }
      }
      return false;
    };

    const boxes: { left: number; top: number; right: number; bottom: number }[] = [];
    const labels: string[] = [];
    for (const element of Array.from(document.body.querySelectorAll("*"))) {
      if (!hasOwnText(element)) continue;
      if (element === img || element.contains(img)) continue;
      if (!element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      const elementBox = element.getBoundingClientRect();
      if (elementBox.width <= 0 || elementBox.height <= 0) continue;
      const caption = element.closest("figcaption");
      if (caption !== null && caption.getBoundingClientRect().top >= box.bottom) continue;
      const clipLeft = Math.max(elementBox.left, box.left);
      const clipTop = Math.max(elementBox.top, box.top);
      const clipRight = Math.min(elementBox.right, box.right);
      const clipBottom = Math.min(elementBox.bottom, box.bottom);
      if (clipRight <= clipLeft || clipBottom <= clipTop) continue;
      boxes.push({ left: clipLeft, top: clipTop, right: clipRight, bottom: clipBottom });
      if (labels.length < 3) {
        const own = Array.from(element.childNodes)
          .filter((node) => node.nodeType === Node.TEXT_NODE)
          .map((node) => (node.textContent ?? "").trim())
          .filter((text) => text !== "")
          .join(" ");
        labels.push(
          `${element.tagName.toLowerCase()} "${own.slice(0, 24)}" ${Math.round(elementBox.width)}x${Math.round(elementBox.height)}`,
        );
      }
    }
    if (boxes.length === 0) return { share: 0, labels: [] as string[] };

    const xs = Array.from(new Set(boxes.flatMap((item) => [item.left, item.right]))).sort(
      (a, b) => a - b,
    );
    const ys = Array.from(new Set(boxes.flatMap((item) => [item.top, item.bottom]))).sort(
      (a, b) => a - b,
    );
    let area = 0;
    for (let i = 0; i < xs.length - 1; i += 1) {
      for (let j = 0; j < ys.length - 1; j += 1) {
        const centreX = (xs[i] + xs[i + 1]) / 2;
        const centreY = (ys[j] + ys[j + 1]) / 2;
        const inside = boxes.some(
          (item) =>
            centreX > item.left &&
            centreX < item.right &&
            centreY > item.top &&
            centreY < item.bottom,
        );
        if (inside) area += (xs[i + 1] - xs[i]) * (ys[j + 1] - ys[j]);
      }
    }
    return { share: area / (box.width * box.height), labels };
  }, mark);
}

/**
 * Measures every photo of the current page.
 * @param page The Playwright page.
 * @returns The measured photos and the broken images of the page main content.
 */
async function measurePagePhotos(
  page: Page,
): Promise<{ photos: MeasuredPhoto[]; brokenImages: string[] }> {
  const { photos, brokenImages } = await markPhotos(page);
  const measured: MeasuredPhoto[] = [];
  for (const photo of photos) {
    measured.push({ ...photo, ...(await measurePhoto(page, photo.mark)) });
  }
  return { photos: measured, brokenImages };
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
 * Formats one measured photo as a single report line.
 * @param photo The measured photo.
 * @returns The file, the sizes, the state, the covered share, and the text share.
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
    `textOverlap=${(photo.textOverlapShare * 100).toFixed(0)}%`,
  ];
  if (photo.coverageError !== null) parts.push(`coverageError=${photo.coverageError}`);
  if (photo.textOverlapLabels.length > 0) {
    parts.push(`textBoxes=[${photo.textOverlapLabels.join("; ")}]`);
  }
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

/**
 * Builds the load, cover, and text problems of a page.
 * @param photos Every measured photo of the page.
 * @param counted The photos that count at this width.
 * @returns The named problems.
 */
function photoProblems(photos: MeasuredPhoto[], counted: MeasuredPhoto[]): string[] {
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
      problems.push(`${label(photo)} could not be measured: ${photo.coverageError}`);
      continue;
    }
    const percent = (photo.covered / photo.measuredPoints) * 100;
    if (percent > MAX_COVERED_PERCENT) {
      problems.push(
        `${label(photo)} is ${percent.toFixed(0)} percent covered (max ${MAX_COVERED_PERCENT})`,
      );
    }
    const textPercent = photo.textOverlapShare * 100;
    if (textPercent > MAX_TEXT_OVERLAP_PERCENT) {
      problems.push(
        `${label(photo)} is ${textPercent.toFixed(0)} percent covered by text (max ${MAX_TEXT_OVERLAP_PERCENT}): ${photo.textOverlapLabels.join("; ")}`,
      );
    }
  }
  return problems;
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
 * Checks that the home Mastery card sits under the photo at 390 px.
 *
 * The card is centred (its centre within 10 percent of the viewport centre) or it
 * is full width (at least 90 percent of the photo width).
 *
 * @param page The Playwright page.
 * @param counted The photos that count at this width.
 * @returns The named problems.
 */
async function masteryCardProblems(
  page: Page,
  counted: MeasuredPhoto[],
): Promise<string[]> {
  const problems: string[] = [];
  const card = page.locator("figure").first();
  const cards = await page.locator("figure").count();
  if (cards === 0) {
    problems.push("the home Mastery card is missing (no figure element)");
    return problems;
  }
  const cardBox = await card.boundingBox();
  const photo = counted.find((item) => item.src.includes("workbook-tablet-cutaway"));
  if (cardBox === null) {
    problems.push("the home Mastery card has no box");
    return problems;
  }
  if (photo === undefined) {
    problems.push("the home hero photo does not count at 390 px");
    return problems;
  }
  const viewportWidth = page.viewportSize()?.width ?? 390;
  const centreDelta =
    Math.abs(cardBox.x + cardBox.width / 2 - viewportWidth / 2) / viewportWidth;
  const widthShare = cardBox.width / photo.width;
  if (centreDelta > 0.1 && widthShare < 0.9) {
    problems.push(
      `the home Mastery card sits ${(centreDelta * 100).toFixed(0)} percent from the viewport centre and is ${(widthShare * 100).toFixed(0)} percent of the photo width (centred or 90 percent width required)`,
    );
  }
  return problems;
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
            test.setTimeout(150_000);
            await openPage(page, locale, target);
            const { photos, brokenImages } = await measurePagePhotos(page);
            const counted = photos.filter(isPhotoSize);
            const problems = [...brokenImages, ...photoProblems(photos, counted)];

            if (photos.length === 0) {
              problems.push("the page shows no photo at all");
            }

            if (target.heroSrc !== undefined) {
              const heroSrc = target.heroSrc;
              const hero = counted.filter((photo) => photo.src.includes(heroSrc));
              if (hero.length === 0) {
                problems.push(`the hero photo ${heroSrc} does not show at this width`);
              }
            }

            if (target.name === "home" && width === 390) {
              problems.push(...(await masteryCardProblems(page, counted)));
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
          test.setTimeout(150_000);
          await openPage(page, locale, { name: "products", path: "/products" });
          const { photos, brokenImages } = await measurePagePhotos(page);
          const counted = photos.filter(isPhotoSize);
          const problems = [...brokenImages, ...photoProblems(photos, counted)];

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
            (photo) =>
              photo.loaded &&
              (photo.blockTestId !== null ||
                photo.src.includes("/images/products/") ||
                PRODUCT_EXTRA_PICTURE_FILES.some((file) => photo.src.includes(file))),
          );
          if (productPictures.length === 0) {
            problems.push("the products page shows no product picture");
          }
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
