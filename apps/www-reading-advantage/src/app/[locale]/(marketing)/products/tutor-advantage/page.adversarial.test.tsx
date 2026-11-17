/**
 * A-63 Phase 2 adversarial controls: gallery render wiring and consumer scope.
 * The i18n mock returns key paths, so copy assertions are per-slot path checks.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { render, cleanup } from "@testing-library/react";
import TutorAdvantage from "@/app/[locale]/(marketing)/products/tutor-advantage/page";

const SCREENS = "pages.products.tutorAdvantage.screens.items";

afterEach(() => {
  cleanup();
});

/** Renders the async route in jsdom. */
async function renderPage(): Promise<void> {
  const jsx = await TutorAdvantage({ params: Promise.resolve({ locale: "en" }) });
  render(jsx);
}

/**
 * Lists repo-relative TypeScript source files below a directory.
 * @param dir The directory to walk.
 * @returns Relative paths of .ts and .tsx files.
 */
function sourceFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...sourceFiles(full));
    else if (entry.isFile() && /\.(ts|tsx)$/.test(entry.name)) {
      out.push(relative(process.cwd(), full));
    }
  }
  return out;
}

describe("tutor screens gallery adversarial controls", () => {
  it("ADV-G1 every rendered screen card has a non-empty alt", async () => {
    await renderPage();
    const section = document.querySelector("[data-testid='tutor-screens']");
    expect(section).toBeInTheDocument();
    const imgs = section!.querySelectorAll("img");
    expect(imgs.length).toBe(3);
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
    expect(cards.length).toBe(3);
    for (let i = 0; i < 3; i += 1) {
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
      for (let j = 0; j < 3; j += 1) {
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

  it("ADV-G4 the gallery renders exactly three cards and no fourth", async () => {
    await renderPage();
    const sections = document.querySelectorAll("[data-testid='tutor-screens']");
    expect(sections.length).toBe(1);
    const cards = sections[0]!.querySelectorAll("li");
    expect(cards.length).toBe(3);
    expect(sections[0]!.textContent).not.toContain(`${SCREENS}.3.`);
  });

  it("ADV-G5 tutorScreens is consumed only by the manifest and the tutor page in production source", () => {
    const consumers = sourceFiles(join(process.cwd(), "src"))
      .filter((rel) => {
        const isTest = rel.includes("__tests__") || /\.test\.(ts|tsx)$/.test(rel);
        if (isTest) return false;
        return readFileSync(join(process.cwd(), rel), "utf8").includes("tutorScreens");
      })
      .sort();
    expect(consumers).toEqual([
      "src/app/[locale]/(marketing)/products/tutor-advantage/page.tsx",
      "src/lib/product-pictures.ts",
    ]);
  });
});
