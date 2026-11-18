/**
 * A-62: the products page must show real product pictures.
 * The page had 2 photos; the 4 program cards and the product blocks showed no
 * product picture, and the hero photo was hidden below 1280 px.
 */
import { existsSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import HeroSection from "@/components/marketing/hero-section";
import ProductsPage from "@/app/[locale]/(marketing)/products/page";
import { productPictures } from "@/lib/product-pictures";
import { en as overviewEn, th as overviewTh, zh as overviewZh } from "@/locales/pages/products/overview";
import * as b2b from "@/locales/components/products/b2b-solutions";

vi.mock("@/components/products/b2b-solutions", () => ({ default: () => null }));
vi.mock("@/components/products/b2c-solutions", () => ({ default: () => null }));
vi.mock("@/components/products/tutor-advantage", () => ({ default: () => null }));

/**
 * Loads the real async B2B section; the page test mocks it because React cannot render it inline.
 * @returns The rendered section element.
 */
async function renderB2B() {
  const actual = await vi.importActual<typeof import("@/components/products/b2b-solutions")>(
    "@/components/products/b2b-solutions",
  );
  return actual.default();
}

const APP_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

afterEach(cleanup);

/**
 * Returns the decoded source path of an image, from the Next image URL or a plain src.
 * @param img The image element.
 * @returns The public path of the file.
 */
function publicPath(img: HTMLImageElement): string {
  const src = img.getAttribute("src") ?? "";
  const url = new URL(src, "http://localhost");
  return url.searchParams.get("url") ?? url.pathname;
}

/**
 * Lists the product pictures of one element.
 * @param root The element to search.
 * @returns The image elements that point into /images/products/.
 */
function productImages(root: Element): HTMLImageElement[] {
  return Array.from(root.querySelectorAll("img")).filter((img) =>
    publicPath(img).startsWith("/images/products/"),
  );
}

describe("product picture files", () => {
  for (const [name, picture] of Object.entries(productPictures)) {
    it(`${name} exists in public and is 1 MB or less`, () => {
      const file = join(APP_ROOT, "public", picture.src);
      expect(existsSync(file)).toBe(true);
      expect(statSync(file).size).toBeLessThanOrEqual(1_000_000);
    });
  }

  it("does not use the retired Storytime set", () => {
    // Spec D-2 of www_tutor_followups_20261118 puts the date on the tutor hero as a file suffix (tutor-advantage-hero-2026-11-06.webp), so the guard rejects only the retired Storytime set: a directory segment ending in 2026-11-06 (the storytime-cover-options-2026-11-06 handoff set) or a storytime cover file stamped with that date.
    for (const picture of Object.values(productPictures)) {
      expect(picture.src).not.toMatch(/2026-11-06\//);
      expect(picture.src).not.toMatch(/storytime.*2026-11-06|cover-options-2026-11-06/);
    }
  });
});

describe("products page program cards", () => {
  for (const key of ["storytime", "primary", "reading", "tutor"]) {
    it(`the ${key} card renders a product picture with a real src and alt text`, async () => {
      const { container } = render(await ProductsPage());
      const card = container.querySelector(`[data-testid="program-card-${key}"]`);
      expect(card, `program card ${key}`).not.toBeNull();
      const images = productImages(card as Element);
      expect(images).toHaveLength(1);
      expect(images[0].getAttribute("src")).toBeTruthy();
      expect(images[0].getAttribute("alt")?.length).toBeGreaterThan(10);
    });
  }
});

describe("products page product blocks", () => {
  for (const key of ["readingAdvantage", "primaryAdvantage", "storytimeAdvantage"]) {
    it(`the ${key} block renders a product picture with a real src and alt text`, async () => {
      const { container } = render(await renderB2B());
      const block = container.querySelector(`[data-testid="product-block-${key}"]`);
      expect(block, `product block ${key}`).not.toBeNull();
      const images = productImages(block as Element);
      expect(images).toHaveLength(1);
      expect(images[0].getAttribute("src")).toBeTruthy();
      expect(images[0].getAttribute("alt")?.length).toBeGreaterThan(10);
    });
  }

  it("keeps the logo tile for the products that are not built yet", async () => {
    const { container } = render(await renderB2B());
    for (const key of ["scienceAdvantage", "mathAdvantage", "zhongwenAdvantage", "stemAdvantage"]) {
      const block = container.querySelector(`[data-testid="product-block-${key}"]`);
      expect(productImages(block as Element)).toHaveLength(0);
      expect((block as Element).querySelectorAll("img").length).toBeGreaterThan(0);
    }
  });
});

describe("alt text in every locale", () => {
  it("has an imageAlt for each program card in en, th, and zh", () => {
    for (const messages of [overviewEn, overviewTh, overviewZh]) {
      for (const key of ["storytime", "primary", "reading", "tutor"] as const) {
        expect(messages.gradeBands[key].imageAlt.length).toBeGreaterThan(10);
      }
    }
  });

  it("has an imageAlt for each pictured product block in en, th, and zh", () => {
    for (const messages of [b2b.en, b2b.th, b2b.zh]) {
      for (const key of ["readingAdvantage", "primaryAdvantage", "storytimeAdvantage"] as const) {
        expect(messages.products[key].imageAlt.length).toBeGreaterThan(10);
      }
    }
  });
});

describe("hero photo at phone width", () => {
  /**
   * Finds any ancestor that hides the element below a breakpoint.
   * @param el The element to start from.
   * @returns The class names of ancestors that use a bare `hidden` class.
   */
  function hidingAncestors(el: Element): string[] {
    const found: string[] = [];
    for (let node = el.parentElement; node; node = node.parentElement) {
      if (node.className.split(/\s+/).includes("hidden")) found.push(node.className);
    }
    return found;
  }

  it("does not hide the floating image below the xl breakpoint", () => {
    const { container } = render(
      <HeroSection
        title="Title"
        description="Description"
        alignment="left"
        floatingImage={{ src: "/images/small-group.png", alt: "Group of students" }}
      />,
    );
    const img = container.querySelector('img[alt="Group of students"]') as HTMLImageElement;
    expect(img.getAttribute("src")).toBeTruthy();
    expect(hidingAncestors(img)).toEqual([]);
  });

  it("renders the products hero photo with a src and no hiding ancestor", async () => {
    const { container } = render(await ProductsPage());
    const img = Array.from(container.querySelectorAll("img")).find((i) =>
      publicPath(i).endsWith("/images/small-group.png"),
    ) as HTMLImageElement;
    expect(img, "hero photo").toBeDefined();
    expect(img.getAttribute("src")).toBeTruthy();
    expect(hidingAncestors(img)).toEqual([]);
  });
});
