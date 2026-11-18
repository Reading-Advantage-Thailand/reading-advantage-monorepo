/**
 * A-63 Phase 3 adversarial controls: gallery render wiring and manifest use.
 * The i18n mock returns key paths, so copy assertions are per-slot path checks.
 * No test in this file reads production source as text.
 */
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";
import { tutorScreens } from "@/lib/product-pictures";

const SCREENS = "pages.products.tutorAdvantage.screens.items";
const SLOTS = [
  "guidedWriting",
  "shortAnswer",
  "feedback",
  "selfReflection",
  "classRecord",
] as const;

afterEach(() => {
  cleanup();
});

/** Decodes a next/image optimizer URL back to the manifest path. */
function decodeSrc(src: string | null): string | null {
  if (!src) return src;
  if (!src.startsWith("/_next/image")) return src;
  const encoded = new URL(src, "http://localhost").searchParams.get("url");
  return encoded ? decodeURIComponent(encoded) : src;
}

/** Renders the async route in jsdom. */
async function renderPage(): Promise<void> {
  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
  render(jsx);
}

describe("tutor screens gallery adversarial controls", () => {
  it("ADV-G1 every rendered screen card has a non-empty alt", async () => {
    await renderPage();
    const section = document.querySelector("[data-testid='tutor-screens']");
    expect(section).toBeInTheDocument();
    const imgs = section!.querySelectorAll("img");
    expect(imgs.length).toBe(5);
    for (const img of imgs) {
      const alt = img.getAttribute("alt");
      expect(alt).toBeTruthy();
      expect(alt!.length).toBeGreaterThan(0);
    }
  });

  it("ADV-G2 each card alt and caption match its own slot with no swap", async () => {
    await renderPage();
    const section = document.querySelector("[data-testid='tutor-screens']");
    const cards = section!.querySelectorAll("li");
    expect(cards.length).toBe(5);
    for (let i = 0; i < 5; i += 1) {
      const card = cards[i]!;
      const img = card.querySelector("img");
      const cap = card.querySelector("figcaption");
      expect(img).toBeInTheDocument();
      expect(cap).toBeInTheDocument();
      expect(img!.getAttribute("alt")).toBe(`${SCREENS}.${i}.alt`);
      const capText = cap!.textContent ?? "";
      expect(capText).toContain(`${SCREENS}.${i}.caption`);
      expect(img!.getAttribute("alt")).not.toContain(".caption");
      expect(capText).not.toContain(".alt");
      for (let j = 0; j < 5; j += 1) {
        if (j !== i) expect(capText).not.toContain(`${SCREENS}.${j}.caption`);
      }
    }
  });

  it("ADV-G3 sections render in the required order", async () => {
    await renderPage();
    const nodes = [
      document.querySelector("#become-a-tutor"),
      document.querySelector("[data-testid='tutor-screens']"),
      document.querySelector("[data-testid='tutor-calculator']"),
      document.querySelector("[data-testid='tutor-commitments']"),
    ];
    for (const node of nodes) expect(node).toBeInTheDocument();
    for (let i = 0; i < nodes.length - 1; i += 1) {
      expect(
        nodes[i]!.compareDocumentPosition(nodes[i + 1]!) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("ADV-G4 the gallery renders exactly five cards and no sixth", async () => {
    await renderPage();
    const sections = document.querySelectorAll("[data-testid='tutor-screens']");
    expect(sections.length).toBe(1);
    const cards = sections[0]!.querySelectorAll("li");
    expect(cards.length).toBe(5);
    expect(sections[0]!.textContent).not.toContain(`${SCREENS}.5.`);
  });

  it("ADV-G5 the five rendered images use the manifest srcs in slot order", async () => {
    await renderPage();
    const section = document.querySelector("[data-testid='tutor-screens']");
    const imgs = Array.from(section!.querySelectorAll("img"));
    expect(Object.keys(tutorScreens)).toEqual([...SLOTS]);
    const expected = SLOTS.map((slot) => tutorScreens[slot].src);
    expect(imgs.map((img) => decodeSrc(img.getAttribute("src")))).toEqual(expected);
    for (const src of expected) {
      expect(src.startsWith("/images/products/tutor-advantage/student-mobile/")).toBe(true);
      expect(src).not.toContain("tutor-desktop");
    }
  });
});
